#!/usr/bin/env node
/**
 * tarball-audit.mjs — A11 / #1288
 *
 * Runs `npm pack --dry-run --json`, extracts the unique top-level entries
 * (anything before the first `/` in each file path), and diffs them against
 * the allowlist at ci/expected-tarball-top-level.txt.
 *
 * Catches the Mini Shai-Hulud injection class: an attacker adds a new file
 * at the tarball root (router_init.js, prepare.sh, etc.) that gets picked
 * up by npm install on the consumer side. Deep-tree changes inside
 * agentic/** are normal and out-of-scope — they would create an exact-
 * manifest with thousands of entries that churns on every doc edit.
 *
 * Exits non-zero on any unexpected entry, with a clear remediation
 * procedure printed inline.
 *
 * See:
 *   - ci/expected-tarball-top-level.txt
 *   - .aiwg/architecture/adr-publish-time-evidence.md
 *   - Mini Shai-Hulud Aikido report (Sept 2025)
 */

import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');

// ---------------------------------------------------------------------------
// CLI flag parsing
// ---------------------------------------------------------------------------

const { values: args } = parseArgs({
  options: {
    allowlist: { type: 'string', default: 'ci/expected-tarball-top-level.txt' },
    quiet: { type: 'boolean', default: false },
    help: { type: 'boolean', default: false },
  },
});

if (args.help) {
  console.log(`Usage: node tools/lint/tarball-audit.mjs [options]

Options:
  --allowlist <path>   Path to allowlist (default: ci/expected-tarball-top-level.txt)
  --quiet              Suppress success output (failures still print)
  --help               Show this help

Exits 0 when tarball top-level entries match the allowlist exactly.
Exits 1 on policy violation (unexpected entries or missing expected entries).
Exits 2 on fatal error (npm pack failure, missing allowlist, etc.).
`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Load allowlist
// ---------------------------------------------------------------------------

const allowlistPath = resolve(REPO_ROOT, args.allowlist);
if (!existsSync(allowlistPath)) {
  console.error(`✗ Allowlist not found: ${allowlistPath}`);
  process.exit(2);
}

const allowlist = new Set(
  readFileSync(allowlistPath, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
);

if (allowlist.size === 0) {
  console.error(`✗ Allowlist ${args.allowlist} contains no entries`);
  process.exit(2);
}

// ---------------------------------------------------------------------------
// Run `npm pack --dry-run --json`
// ---------------------------------------------------------------------------

if (!args.quiet) {
  console.log(`Auditing tarball top-level entries against ${args.allowlist}…`);
}

const result = spawnSync('npm', ['pack', '--dry-run', '--json'], {
  cwd: REPO_ROOT,
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024, // pack JSON can be large on big trees
});

if (result.status !== 0) {
  console.error(`✗ \`npm pack --dry-run --json\` exited with status ${result.status}`);
  if (result.stderr) console.error(result.stderr);
  process.exit(2);
}

let packJson;
try {
  packJson = JSON.parse(result.stdout);
} catch (err) {
  console.error(`✗ Could not parse \`npm pack\` JSON output: ${err.message}`);
  process.exit(2);
}

if (!Array.isArray(packJson) || packJson.length === 0 || !Array.isArray(packJson[0].files)) {
  console.error(`✗ Unexpected \`npm pack\` JSON shape (expected [{files: [...]}])`);
  process.exit(2);
}

// Extract unique top-level entries: anything before the first `/` in each
// file path. Paths from `npm pack --dry-run --json` use forward slashes
// regardless of platform.
const topLevel = new Set();
for (const file of packJson[0].files) {
  if (!file.path) continue;
  const first = file.path.split('/')[0];
  if (first) topLevel.add(first);
}

// ---------------------------------------------------------------------------
// Compare
// ---------------------------------------------------------------------------

const unexpected = [...topLevel].filter((e) => !allowlist.has(e)).sort();
const missing = [...allowlist].filter((e) => !topLevel.has(e)).sort();

if (unexpected.length === 0 && missing.length === 0) {
  if (!args.quiet) {
    console.log(`✓ Tarball top-level entries match allowlist (${topLevel.size} entries scanned)`);
  }
  process.exit(0);
}

// Report failures.
if (unexpected.length > 0) {
  console.error(`✗ Unexpected tarball top-level entries (${unexpected.length}):`);
  for (const entry of unexpected) {
    console.error(`    + ${entry}`);
  }
}

if (missing.length > 0) {
  console.error(`✗ Expected tarball top-level entries missing from npm pack output (${missing.length}):`);
  for (const entry of missing) {
    console.error(`    - ${entry}`);
  }
}

console.error('');
console.error('Remediation:');
console.error('  1. Verify each unexpected entry is INTENTIONAL.');
console.error('     - If yes: add a row to ci/expected-tarball-top-level.txt and');
console.error('       commit the change alongside whatever introduced the entry.');
console.error('     - If no: this is the Mini Shai-Hulud signal — an unexpected');
console.error('       file/directory at the tarball root. STOP. Treat as a');
console.error('       supply-chain incident. See .aiwg/architecture/');
console.error('       adr-publish-time-evidence.md for the response procedure.');
console.error('  2. For missing entries: confirm package.json `files` or .npmignore');
console.error('     changes are intentional, then remove the row from the allowlist.');
console.error('  3. Re-run `npm run lint:tarball` to confirm the audit passes.');
process.exit(1);
