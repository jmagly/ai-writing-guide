#!/usr/bin/env node
/**
 * Verify .claude-plugin/marketplace.json metadata.version matches package.json version.
 *
 * PUW-038 (#1139): the marketplace manifest's top-level metadata.version
 * must move in lockstep with package.json on every release; otherwise the
 * Claude Code plugin marketplace UI shows a stale version while npm ships
 * the new one.
 *
 * Exits 0 when versions match (ignoring pre-release suffixes when
 * `--allow-prerelease-mismatch` is passed; release tags should match
 * exactly). Exits 1 otherwise with a diagnostic.
 *
 * Usage:
 *   node tools/workspace/check-marketplace-version.mjs
 *   node tools/workspace/check-marketplace-version.mjs --allow-prerelease-mismatch
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');

function strip(version) {
  // Drop pre-release/build suffix (-rc.1, -alpha.2, +build.42, etc.)
  return version.replace(/[-+].*$/, '');
}

function main() {
  const args = process.argv.slice(2);
  const allowPrereleaseMismatch = args.includes('--allow-prerelease-mismatch');

  const pkg = JSON.parse(readFileSync(resolve(REPO_ROOT, 'package.json'), 'utf8'));
  const marketplace = JSON.parse(
    readFileSync(resolve(REPO_ROOT, '.claude-plugin/marketplace.json'), 'utf8'),
  );

  const pkgVersion = pkg.version;
  const marketplaceVersion = marketplace?.metadata?.version;

  if (!pkgVersion) {
    console.error('FAIL: package.json has no version field');
    process.exit(1);
  }
  if (!marketplaceVersion) {
    console.error('FAIL: .claude-plugin/marketplace.json metadata.version missing');
    process.exit(1);
  }

  const exactMatch = pkgVersion === marketplaceVersion;
  const stableMatch = strip(pkgVersion) === strip(marketplaceVersion);

  if (exactMatch) {
    console.log(`OK marketplace metadata.version (${marketplaceVersion}) matches package.json`);
    process.exit(0);
  }

  if (allowPrereleaseMismatch && stableMatch) {
    console.log(
      `OK marketplace metadata.version (${marketplaceVersion}) matches package.json stable line ` +
      `(${pkgVersion}) — pre-release suffix differs but allowed by --allow-prerelease-mismatch`,
    );
    process.exit(0);
  }

  console.error(
    `FAIL: marketplace metadata.version (${marketplaceVersion}) does not match ` +
    `package.json (${pkgVersion}). PUW-038 (#1139) requires lockstep bumps.`,
  );
  console.error('');
  console.error(`Fix: update .claude-plugin/marketplace.json metadata.version to ${pkgVersion}.`);
  process.exit(1);
}

main();
