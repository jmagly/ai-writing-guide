#!/usr/bin/env node
/**
 * Sync Manifests
 *
 * Combine generation and lint/fix for manifests. Works on a single target directory or the full
 * repository. Creates/updates manifest.json.
 *
 * Usage:
 *   node tools/manifest/sync-manifests.mjs [--target <path>|.] [--create] [--fix]
 *
 * Defaults:
 *   --target .      # current repo
 *   --fix           # reconcile files in existing manifests
 *   (omit --create to avoid creating new manifests everywhere)
 *
 * Note: manifest.md generation has been deprecated - manifest.json serves the same purpose.
 */

import fs from 'fs';
import path from 'path';

function parseArgs() {
  const args = process.argv.slice(2);
  let target = process.cwd();
  let create = false;
  let fix = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--target' && args[i + 1]) {
      target = path.resolve(args[++i]);
    } else if (a === '--create') {
      create = true;
    } else if (a === '--fix') {
      fix = true;
    }
  }
  // Defaults for convenience
  if (!create) create = false;
  if (!fix) fix = true;
  return { target, create, fix };
}

function listDirs(start, { includeAll }) {
  const out = new Set();
  function walk(d) {
    // Skip hidden directories except .claude and .github
    const base = path.basename(d);
    if (base.startsWith('.') && base !== '.claude' && base !== '.github') return;
    let hasManifest = false;
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      if (entry.name === 'node_modules') continue;
      const p = path.join(d, entry.name);
      if (entry.isFile() && entry.name === 'manifest.json') hasManifest = true;
    }
    if (hasManifest || includeAll) out.add(d);
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        walk(path.join(d, entry.name));
      }
    }
  }
  walk(start);
  return Array.from(out);
}

function listFiles(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isFile() && !d.name.startsWith('.'))
    .map(d => d.name)
    .sort();
}

function syncDir(dir, { create, fix }) {
  const manifestPath = path.join(dir, 'manifest.json');
  const files = listFiles(dir);
  let json;
  if (fs.existsSync(manifestPath)) {
    try {
      json = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch {
      json = { name: path.basename(dir), path: path.relative(process.cwd(), dir) || '.', files: [], ignore: ['manifest.json'] };
    }
  } else if (create) {
    json = { name: path.basename(dir), path: path.relative(process.cwd(), dir) || '.', files: [], ignore: ['manifest.json'] };
  } else {
    return { dir, created: false, updated: false };
  }

  const ignore = new Set([...(json.ignore || []), 'manifest.json']);
  const current = new Set(json.files || []);
  let updated = false;

  if (fix) {
    // Add missing files
    for (const f of files) {
      if (!ignore.has(f) && !current.has(f)) {
        current.add(f);
        updated = true;
      }
    }
    // Remove extras that no longer exist
    for (const f of Array.from(current)) {
      if (!ignore.has(f) && !files.includes(f)) {
        current.delete(f);
        updated = true;
      }
    }
  }

  const next = Array.from(current).sort();
  const manifest = {
    name: json.name || path.basename(dir),
    path: path.relative(process.cwd(), dir) || '.',
    files: next,
    ignore: Array.from(ignore)
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  return { dir, created: !fs.existsSync(manifestPath) && !!create, updated };
}

(function main() {
  const { target, create, fix } = parseArgs();
  if (!fs.existsSync(target)) {
    console.error('Target not found:', target);
    process.exit(1);
  }
  const includeAll = !!create;
  const dirs = listDirs(target, { includeAll });
  let count = 0;
  for (const d of dirs) {
    const res = syncDir(d, { create, fix });
    if (res.updated || res.created) count++;
  }
  console.log(`Processed ${dirs.length} directories; updated ${count}.`);
})();
