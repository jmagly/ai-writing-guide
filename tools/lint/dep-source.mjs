#!/usr/bin/env node
/**
 * dep-source.mjs — A20 / #1300
 *
 * Scans package.json (direct + dev + optional + peer deps) and package-lock.json
 * (transitive `resolved` URLs) for dependency sources that match a forbidden
 * pattern set:
 *
 *   - git+*                              (any git scheme prefix in a version spec)
 *   - git://                             (raw git scheme)
 *   - github:owner/repo                  (GitHub shorthand)
 *   - file:                              (local filesystem path)
 *   - link:                              (workspace symlink)
 *   - https?://*.tgz | https?://*.tar.gz from a non-registry host
 *
 * Allowlist: ci/dep-source-allowlist.yaml. Each entry permits a single dep with
 * an otherwise-policy-violating source. Adding an entry is a security-relevant
 * change and must be reviewed.
 *
 * Exits non-zero on violation. Designed for CI; safe to run locally.
 *
 * See:
 *   - .aiwg/architecture/adr-dep-source-policy.md
 *   - docs/contributing/dependency-sources.md
 *   - Threat model: Mini Shai-Hulud / control C22 / scenario S5 (dep-injection variant)
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import yaml from 'js-yaml';

// ---------------------------------------------------------------------------
// CLI flag parsing
// ---------------------------------------------------------------------------

const { values: args } = parseArgs({
  options: {
    allowlist: { type: 'string', default: 'ci/dep-source-allowlist.yaml' },
    manifest: { type: 'string', default: 'package.json' },
    lockfile: { type: 'string', default: 'package-lock.json' },
    quiet: { type: 'boolean', default: false },
    help: { type: 'boolean', default: false },
  },
});

if (args.help) {
  console.log(`Usage: node tools/lint/dep-source.mjs [options]

Options:
  --allowlist <path>   Path to allowlist YAML (default: ci/dep-source-allowlist.yaml)
  --manifest <path>    Path to package.json (default: package.json)
  --lockfile <path>    Path to package-lock.json (default: package-lock.json)
  --quiet              Suppress success output (failures still print)
  --help               Show this help

Exits 0 on success, non-zero on policy violation or fatal error.
See docs/contributing/dependency-sources.md for the contributor guide.
`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Pattern detection
// ---------------------------------------------------------------------------

/**
 * Known npm registries whose tarball URLs are normal/expected. A `resolved`
 * URL pointing here is just the standard npm tarball location, not an exotic
 * dep source. Anything else is suspicious.
 */
const KNOWN_REGISTRIES = [
  /^https?:\/\/registry\.npmjs\.org\//,
  /^https?:\/\/registry\.yarnpkg\.com\//,
  /^https?:\/\/npm\.pkg\.github\.com\//,
];

function isKnownRegistry(url) {
  return KNOWN_REGISTRIES.some((re) => re.test(url));
}

/**
 * Classify a dep source. Returns { pattern, label } for forbidden sources or
 * null for permitted ones.
 *
 * `source` is either:
 *   - a version spec from package.json (e.g. "^4.1.0", "git+ssh://...", "file:./foo")
 *   - a `resolved` URL from package-lock.json
 */
function classify(source) {
  if (typeof source !== 'string' || source.length === 0) return null;

  if (/^git\+/.test(source)) return { pattern: 'git+*', label: 'git+ scheme prefix' };
  if (/^git:\/\//.test(source)) return { pattern: 'git://', label: 'raw git:// scheme' };
  if (/^github:/.test(source)) return { pattern: 'github:owner/repo', label: 'GitHub shorthand' };
  if (/^file:/.test(source)) return { pattern: 'file:', label: 'local filesystem path' };
  if (/^link:/.test(source)) return { pattern: 'link:', label: 'workspace symlink' };

  // Direct tarball URL from a non-registry host. Registry-hosted tarballs
  // (registry.npmjs.org/.../foo.tgz) are normal and allowed.
  const tarballMatch = /^https?:\/\/[^\s]+?\.(tgz|tar\.gz)(\?|$|#)/.test(source);
  if (tarballMatch && !isKnownRegistry(source)) {
    return { pattern: 'direct-tarball', label: 'tarball URL from non-registry host' };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Allowlist
// ---------------------------------------------------------------------------

function loadAllowlist(path) {
  if (!existsSync(path)) {
    return { entries: [], path };
  }
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (err) {
    throw new Error(`Failed to read allowlist ${path}: ${err.message}`);
  }
  let doc;
  try {
    doc = yaml.load(raw);
  } catch (err) {
    throw new Error(`Failed to parse allowlist ${path} as YAML: ${err.message}`);
  }
  if (doc == null) return { entries: [], path };
  if (!doc.allowlist) return { entries: [], path };
  if (!Array.isArray(doc.allowlist)) {
    throw new Error(`Allowlist ${path}: top-level 'allowlist' must be a list`);
  }

  // Validate entry shape.
  const entries = doc.allowlist.map((entry, i) => {
    if (entry == null || typeof entry !== 'object') {
      throw new Error(`Allowlist ${path}: entry ${i} is not an object`);
    }
    const required = ['name', 'source-pattern', 'rationale', 'last-reviewed-date'];
    for (const field of required) {
      if (!entry[field]) {
        throw new Error(
          `Allowlist ${path}: entry ${i} ("${entry.name || '?'}") missing required field "${field}"`,
        );
      }
    }
    return entry;
  });

  return { entries, path };
}

function matchesAllowlist(name, source, allowlist) {
  for (const entry of allowlist.entries) {
    if (entry.name !== name) continue;
    // source-pattern can be an exact string match OR a regex (when wrapped in /.../)
    const pattern = entry['source-pattern'];
    if (typeof pattern === 'string') {
      if (pattern === source) return entry;
      // Allow regex form: /.../flags
      const re = /^\/(.+)\/([gimsuy]*)$/.exec(pattern);
      if (re) {
        try {
          const compiled = new RegExp(re[1], re[2]);
          if (compiled.test(source)) return entry;
        } catch {
          // bad regex — fall through to false
        }
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Scan: package.json direct/dev/optional/peer deps
// ---------------------------------------------------------------------------

function scanManifest(manifestPath, allowlist) {
  const violations = [];
  if (!existsSync(manifestPath)) {
    throw new Error(`Manifest not found: ${manifestPath}`);
  }
  const pkg = JSON.parse(readFileSync(manifestPath, 'utf8'));

  const buckets = [
    ['dependencies', pkg.dependencies],
    ['devDependencies', pkg.devDependencies],
    ['optionalDependencies', pkg.optionalDependencies],
    ['peerDependencies', pkg.peerDependencies],
  ];

  let scanned = 0;
  for (const [bucketName, deps] of buckets) {
    if (!deps || typeof deps !== 'object') continue;
    for (const [name, version] of Object.entries(deps)) {
      scanned++;
      const classification = classify(version);
      if (!classification) continue;
      const allowed = matchesAllowlist(name, version, allowlist);
      if (allowed) continue;
      violations.push({
        location: `${manifestPath} > ${bucketName} > "${name}"`,
        name,
        source: version,
        pattern: classification.pattern,
        label: classification.label,
      });
    }
  }
  return { violations, scanned };
}

// ---------------------------------------------------------------------------
// Scan: package-lock.json transitive resolved URLs
// ---------------------------------------------------------------------------

function scanLockfile(lockfilePath, allowlist) {
  const violations = [];
  if (!existsSync(lockfilePath)) {
    // Not fatal — some projects don't commit lockfiles. Report but continue.
    return { violations, scanned: 0, present: false };
  }
  const lf = JSON.parse(readFileSync(lockfilePath, 'utf8'));

  // lockfileVersion 2 / 3: entries live under `packages`. Each key is a path
  // like "node_modules/foo" or "" (root). The package name comes from the key
  // (last `node_modules/` segment) or from entry.name.
  const packages = lf.packages || {};
  let scanned = 0;
  for (const [path, entry] of Object.entries(packages)) {
    if (path === '') continue; // root package; covered by manifest scan
    if (!entry || !entry.resolved) continue;
    scanned++;
    const classification = classify(entry.resolved);
    if (!classification) continue;
    const name = extractPackageName(path, entry);
    const allowed = matchesAllowlist(name, entry.resolved, allowlist);
    if (allowed) continue;
    violations.push({
      location: `${lockfilePath} > ${path}`,
      name,
      source: entry.resolved,
      pattern: classification.pattern,
      label: classification.label,
    });
  }
  return { violations, scanned, present: true };
}

function extractPackageName(path, entry) {
  if (entry.name) return entry.name;
  // Path like "node_modules/foo" or "node_modules/@scope/bar" or
  // "node_modules/foo/node_modules/bar" — take last segment after the last
  // `node_modules/`.
  const idx = path.lastIndexOf('node_modules/');
  if (idx === -1) return path;
  return path.slice(idx + 'node_modules/'.length);
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

function formatViolation(v) {
  return [
    `  ${v.location}`,
    `    source: ${v.source}`,
    `    pattern: ${v.pattern} (${v.label})`,
    `    fix: swap to a registry version, or allowlist it in`,
    `         ci/dep-source-allowlist.yaml with name, source-pattern,`,
    `         rationale, last-reviewed-date`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const cwd = process.cwd();
  const manifestPath = resolve(cwd, args.manifest);
  const lockfilePath = resolve(cwd, args.lockfile);
  const allowlistPath = resolve(cwd, args.allowlist);

  let allowlist;
  try {
    allowlist = loadAllowlist(allowlistPath);
  } catch (err) {
    console.error(`✗ ${err.message}`);
    process.exit(2);
  }

  let manifestResult, lockfileResult;
  try {
    manifestResult = scanManifest(manifestPath, allowlist);
    lockfileResult = scanLockfile(lockfilePath, allowlist);
  } catch (err) {
    console.error(`✗ Scan failed: ${err.message}`);
    process.exit(2);
  }

  const allViolations = [...manifestResult.violations, ...lockfileResult.violations];

  if (allViolations.length > 0) {
    console.error(
      `✗ Dependency source policy violation: ${allViolations.length} issue${
        allViolations.length === 1 ? '' : 's'
      }`,
    );
    console.error('');
    for (const v of allViolations) {
      console.error(formatViolation(v));
      console.error('');
    }
    console.error('See docs/contributing/dependency-sources.md for the policy rationale.');
    console.error('Allowlist file: ci/dep-source-allowlist.yaml');
    process.exit(1);
  }

  if (!args.quiet) {
    const lockNote = lockfileResult.present
      ? `, ${args.lockfile} (${lockfileResult.scanned} locked entries)`
      : `, ${args.lockfile} (not present, skipped)`;
    console.log(`✓ Dependency source policy: 0 violations`);
    console.log(
      `  scanned: ${args.manifest} (${manifestResult.scanned} direct entries)${lockNote}`,
    );
    console.log(`  allowlist: ${allowlist.entries.length} entries (${args.allowlist})`);
  }
  process.exit(0);
}

main();
