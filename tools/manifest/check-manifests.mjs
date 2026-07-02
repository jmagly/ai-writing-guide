#!/usr/bin/env node
/**
 * Manifest Linter
 *
 * Ensures supported directory manifests include every non-hidden file in that directory.
 *
 * This checker only understands opt-in directory-manifest schemas where
 * `files` is an array of same-directory file names. Other AIWG manifests use
 * catalog schemas (`skills`, `agents`, nested component paths, web search
 * indexes, etc.) and are intentionally skipped so this drift gate does not
 * report false positives.
 *
 * Schema (manifest.json):
 * {
 *   "name": "Directory name",
 *   "path": "relative/path",
 *   "schema": "directory-file-list/v1",
 *   "files": ["README.md", "example.md"],
 *   "ignore": [".DS_Store", "Thumbs.db"]
 * }
 *
 * Usage:
 *   node tools/manifest/check-manifests.mjs [root=.] [--fix]
 */

import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
let root = process.cwd();
let fix = false;
let verbose = false;
for (const a of args) {
  if (a === '--fix') fix = true;
  else if (a === '--verbose') verbose = true;
  else root = path.resolve(a);
}

const SKIP_DIRS = new Set([
  '.aiwg',
  '.git',
  '.rlm-prep',
  'coverage',
  'dist',
  'node_modules',
  'test-results',
]);

const SUPPORTED_SCHEMAS = new Set([
  'directory-file-list/v1',
  'https://aiwg.io/schemas/directory-file-list.v1.json',
]);

function findManifestFiles(startDir) {
  const results = [];
  function walk(dir, isRoot = false) {
    const base = path.basename(dir);
    if (!isRoot && (SKIP_DIRS.has(base) || base.startsWith('.'))) return;

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.isFile() && entry.name === 'manifest.json') results.push(p);
    }
  }
  walk(startDir, true);
  return results;
}

function listFiles(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isFile() && !d.name.startsWith('.'))
    .map(d => d.name)
    .sort();
}

function isStringArray(value) {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

function isSameDirectoryFileName(value) {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value !== 'manifest.json' &&
    !value.includes('/') &&
    !value.includes('\\')
  );
}

function isSupportedDirectoryManifest(json) {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return false;
  if (!SUPPORTED_SCHEMAS.has(json.schema)) return false;
  if (!isStringArray(json.files)) return false;
  if (!json.files.every(isSameDirectoryFileName)) return false;
  if (json.ignore !== undefined && !isStringArray(json.ignore)) return false;
  if (json.name !== undefined && typeof json.name !== 'string') return false;
  if (json.path !== undefined && typeof json.path !== 'string') return false;
  return true;
}

function main() {
  const manifests = findManifestFiles(root);
  let errors = 0;
  let checked = 0;
  let skipped = 0;
  for (const mf of manifests) {
    const dir = path.dirname(mf);
    const relDir = path.relative(process.cwd(), dir) || '.';
    let json;
    try {
      json = JSON.parse(fs.readFileSync(mf, 'utf8'));
    } catch (e) {
      console.error(`Invalid JSON: ${relDir}/manifest.json`);
      errors++;
      continue;
    }
    if (!isSupportedDirectoryManifest(json)) {
      skipped++;
      if (verbose) console.log(`Skipping unsupported manifest format: ${relDir}/manifest.json`);
      continue;
    }
    checked++;
    const ignore = new Set([...(json.ignore || []), 'manifest.json']);
    const actual = listFiles(dir).filter(f => !ignore.has(f));
    const declared = new Set(json.files || []);
    const missing = actual.filter(f => !declared.has(f));
    const extra = [...declared].filter(f => !ignore.has(f) && !actual.includes(f));

    if (missing.length || extra.length) {
      console.log(`Manifest drift in ${relDir}`);
      if (missing.length) console.log(`  Missing: ${missing.join(', ')}`);
      if (extra.length) console.log(`  Extra:   ${extra.join(', ')}`);
      errors++;

      if (fix) {
        const next = Array.from(new Set([...json.files || [], ...missing])).sort();
        const fixed = {
          ...json,
          name: json.name || path.basename(dir),
          path: relDir,
          files: next,
          ignore: Array.from(ignore),
        };
        fs.writeFileSync(mf, JSON.stringify(fixed, null, 2) + '\n', 'utf8');
        console.log(`  Fixed ${relDir}/manifest.json`);
        errors--;
      }
    }
  }

  if (verbose) {
    console.log(`Checked ${checked} supported manifest(s); skipped ${skipped} unsupported manifest(s).`);
  }
  if (errors) process.exit(1);
}

main();
