#!/usr/bin/env node
/**
 * audit-signatures.mjs — A12 / #1288
 *
 * Runs `npm audit signatures` and fails when any non-waived package has
 * a missing or invalid signature. Catches upstream-package tampering and
 * the unsigned-package supply-chain surface in one gate.
 *
 * Waivers live in ci/npm-audit-signatures-waivers.yaml. Each waiver has
 * a hard `expires` date — once expired, the waiver no longer applies
 * and the package must be re-evaluated. This prevents permanent waivers
 * from silently accumulating into a regression-by-default state.
 *
 * Two failure modes:
 *   - "invalid"  : the package has a signature, but it does not verify.
 *                  Hard stop. NEVER waiveable. This is the tampering
 *                  signal we MUST surface.
 *   - "missing"  : the package has no signature at all. Waiveable when
 *                  the package predates npm's signature infrastructure
 *                  AND the waiver has a non-expired entry in the
 *                  waiver file.
 *
 * Exit codes:
 *   0  → all packages either verified or have non-expired waivers
 *   1  → policy violation (unsigned non-waived, invalid, expired waiver, ...)
 *   2  → fatal error (waiver file unparseable, npm audit failed, ...)
 *
 * See:
 *   - ci/npm-audit-signatures-waivers.yaml
 *   - .aiwg/architecture/adr-publish-time-evidence.md
 */

import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');

// ---------------------------------------------------------------------------
// CLI flag parsing
// ---------------------------------------------------------------------------

const { values: args } = parseArgs({
  options: {
    waivers: { type: 'string', default: 'ci/npm-audit-signatures-waivers.yaml' },
    quiet: { type: 'boolean', default: false },
    help: { type: 'boolean', default: false },
  },
});

if (args.help) {
  console.log(`Usage: node tools/lint/audit-signatures.mjs [options]

Options:
  --waivers <path>     Path to waiver YAML (default: ci/npm-audit-signatures-waivers.yaml)
  --quiet              Suppress success output (failures still print)
  --help               Show this help

Exits 0 when all non-waived packages have verified signatures.
Exits 1 on policy violation (unsigned non-waived, invalid sig, expired waiver).
Exits 2 on fatal error (waiver file unparseable, npm audit failed, ...).
`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Load waivers
// ---------------------------------------------------------------------------

const waiversPath = resolve(REPO_ROOT, args.waivers);
if (!existsSync(waiversPath)) {
  console.error(`✗ Waiver file not found: ${waiversPath}`);
  process.exit(2);
}

let waivers;
try {
  const parsed = yaml.load(readFileSync(waiversPath, 'utf8'));
  waivers = Array.isArray(parsed?.waivers) ? parsed.waivers : [];
} catch (err) {
  console.error(`✗ Could not parse waiver YAML: ${err.message}`);
  process.exit(2);
}

const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

const activeWaivers = new Map(); // key: "name@version" → waiver
const expiredWaivers = [];
for (const w of waivers) {
  if (!w?.name || !w?.version || !w?.expires) {
    console.error(`✗ Waiver entry missing required field (name/version/expires): ${JSON.stringify(w)}`);
    process.exit(2);
  }
  const key = `${w.name}@${w.version}`;
  if (w.expires < today) {
    expiredWaivers.push({ ...w, key });
    continue;
  }
  activeWaivers.set(key, w);
}

// ---------------------------------------------------------------------------
// Run `npm audit signatures --json`
// ---------------------------------------------------------------------------

if (!args.quiet) {
  console.log(`Running \`npm audit signatures\` (waivers: ${activeWaivers.size} active, ${expiredWaivers.length} expired)…`);
}

const result = spawnSync('npm', ['audit', 'signatures', '--json'], {
  cwd: REPO_ROOT,
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
});

// `npm audit signatures` returns non-zero on signature failures. We need
// to parse the JSON either way to distinguish failure modes.
let auditJson;
try {
  auditJson = JSON.parse(result.stdout);
} catch (err) {
  // If stdout isn't JSON, treat it as fatal — we can't make a policy
  // decision without parseable output.
  console.error(`✗ Could not parse \`npm audit signatures --json\` output: ${err.message}`);
  if (result.stderr) console.error(result.stderr);
  if (result.stdout) console.error(result.stdout.slice(0, 2000));
  process.exit(2);
}

// `npm audit signatures --json` shape (npm 9+):
//   { invalid: [...], missing: [...], ... }
// Each invalid/missing entry has { name, version, ... }.
const invalid = Array.isArray(auditJson.invalid) ? auditJson.invalid : [];
const missing = Array.isArray(auditJson.missing) ? auditJson.missing : [];

// ---------------------------------------------------------------------------
// Apply waiver policy
// ---------------------------------------------------------------------------

const violations = [];

// INVALID signatures are never waiveable. This is the tampering signal.
for (const pkg of invalid) {
  violations.push({
    kind: 'invalid',
    name: pkg.name,
    version: pkg.version,
    message: `Signature INVALID (signature exists but does not verify) — tampering signal, not waiveable`,
  });
}

// MISSING signatures are waiveable if an active (non-expired) waiver covers them.
for (const pkg of missing) {
  const key = `${pkg.name}@${pkg.version}`;
  if (activeWaivers.has(key)) {
    if (!args.quiet) {
      console.log(`  · waived: ${key} (expires ${activeWaivers.get(key).expires})`);
    }
    continue;
  }
  violations.push({
    kind: 'missing',
    name: pkg.name,
    version: pkg.version,
    message: `No registry signature, no active waiver`,
  });
}

// Expired waivers are themselves violations — they force re-evaluation.
for (const w of expiredWaivers) {
  violations.push({
    kind: 'expired-waiver',
    name: w.name,
    version: w.version,
    message: `Waiver expired ${w.expires} (today ${today}); re-evaluate per the procedure in ci/npm-audit-signatures-waivers.yaml`,
  });
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

if (violations.length === 0) {
  if (!args.quiet) {
    const verifiedTotal =
      (Array.isArray(auditJson.verified) ? auditJson.verified.length : 0) ||
      (typeof auditJson.auditCount === 'number' ? auditJson.auditCount : 0);
    if (verifiedTotal > 0) {
      console.log(`✓ All ${verifiedTotal} packages have verified registry signatures (waivers: ${activeWaivers.size})`);
    } else {
      console.log(`✓ npm audit signatures passed (waivers: ${activeWaivers.size})`);
    }
  }
  process.exit(0);
}

console.error(`✗ npm audit signatures policy violations (${violations.length}):`);
for (const v of violations) {
  console.error(`    [${v.kind}] ${v.name}@${v.version} — ${v.message}`);
}
console.error('');
console.error('Remediation:');
console.error('  - "invalid": HARD STOP. A signed package failed verification.');
console.error('               Treat as a supply-chain incident. Do NOT publish.');
console.error('  - "missing": Either (a) bump the dep to a version with a signed');
console.error('               release if one exists, or (b) add a time-bounded');
console.error('               waiver to ci/npm-audit-signatures-waivers.yaml.');
console.error('  - "expired-waiver": re-evaluate per the procedure documented at');
console.error('               the top of ci/npm-audit-signatures-waivers.yaml.');
console.error('  See .aiwg/architecture/adr-publish-time-evidence.md for context.');
process.exit(1);
