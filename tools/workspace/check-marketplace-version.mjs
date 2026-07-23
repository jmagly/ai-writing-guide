#!/usr/bin/env node
/**
 * Verify release version metadata matches package.json version.
 *
 * PUW-038 (#1139): package-lock.json, separately published packages, and the
 * marketplace manifest's top-level metadata.version must move in lockstep
 * with package.json on every release; otherwise installs and plugin surfaces
 * can report stale versions while npm ships the new one.
 *
 * Exits 0 when versions match. For marketplace metadata only, pre-release
 * suffixes may differ when `--allow-prerelease-mismatch` is passed; package
 * lockfiles must always match package.json exactly.
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

function readJson(root, relativePath) {
  return JSON.parse(readFileSync(resolve(root, relativePath), 'utf8'));
}

export function checkVersionLockstep(
  root = REPO_ROOT,
  { allowPrereleaseMismatch = false } = {},
) {
  const pkg = readJson(root, 'package.json');
  const lock = readJson(root, 'package-lock.json');
  const cli = readJson(root, 'packages/cli/package.json');
  const marketplace = JSON.parse(
    readFileSync(resolve(root, '.claude-plugin/marketplace.json'), 'utf8'),
  );

  const pkgVersion = pkg.version;
  const lockVersion = lock.version;
  const lockRootVersion = lock?.packages?.['']?.version;
  const marketplaceVersion = marketplace?.metadata?.version;
  const cliVersion = cli?.version;

  if (!pkgVersion) {
    return {
      ok: false,
      message: 'FAIL: package.json has no version field',
    };
  }
  if (!lockVersion) {
    return {
      ok: false,
      message: 'FAIL: package-lock.json has no top-level version field',
    };
  }
  if (!lockRootVersion) {
    return {
      ok: false,
      message: 'FAIL: package-lock.json packages[""].version missing',
    };
  }
  if (!marketplaceVersion) {
    return {
      ok: false,
      message: 'FAIL: .claude-plugin/marketplace.json metadata.version missing',
    };
  }
  if (!cliVersion) {
    return {
      ok: false,
      message: 'FAIL: packages/cli/package.json has no version field',
    };
  }

  if (cliVersion !== pkgVersion) {
    return {
      ok: false,
      message:
        `FAIL: @aiwg/cli version (${cliVersion}) does not match ` +
        `package.json (${pkgVersion}).`,
      fix: `Fix: update packages/cli/package.json version to ${pkgVersion}.`,
    };
  }

  if (lockVersion !== pkgVersion) {
    return {
      ok: false,
      message:
        `FAIL: package-lock.json version (${lockVersion}) does not match ` +
        `package.json (${pkgVersion}).`,
      fix: `Fix: update package-lock.json version to ${pkgVersion}.`,
    };
  }

  if (lockRootVersion !== pkgVersion) {
    return {
      ok: false,
      message:
        `FAIL: package-lock.json packages[""].version (${lockRootVersion}) does not match ` +
        `package.json (${pkgVersion}).`,
      fix: `Fix: update package-lock.json packages[""].version to ${pkgVersion}.`,
    };
  }

  const exactMatch = pkgVersion === marketplaceVersion;
  const stableMatch = strip(pkgVersion) === strip(marketplaceVersion);

  if (exactMatch) {
    return {
      ok: true,
      message:
        `OK package-lock.json, @aiwg/cli, and marketplace metadata.version ` +
        `(${marketplaceVersion}) match package.json (${pkgVersion})`,
    };
  }

  if (allowPrereleaseMismatch && stableMatch) {
    return {
      ok: true,
      message:
        `OK package-lock.json matches package.json (${pkgVersion}); ` +
        `marketplace metadata.version (${marketplaceVersion}) matches stable line ` +
        'with pre-release suffix difference allowed by --allow-prerelease-mismatch',
    };
  }

  return {
    ok: false,
    message:
      `FAIL: marketplace metadata.version (${marketplaceVersion}) does not match ` +
      `package.json (${pkgVersion}). PUW-038 (#1139) requires lockstep bumps.`,
    fix: `Fix: update .claude-plugin/marketplace.json metadata.version to ${pkgVersion}.`,
  };
}

function main() {
  const args = process.argv.slice(2);
  const allowPrereleaseMismatch = args.includes('--allow-prerelease-mismatch');
  const result = checkVersionLockstep(REPO_ROOT, { allowPrereleaseMismatch });

  if (result.ok) {
    console.log(result.message);
    process.exit(0);
  }

  console.error(result.message);
  if (result.fix) {
    console.error('');
    console.error(result.fix);
  }
  process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
