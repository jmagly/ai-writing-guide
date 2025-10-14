#!/usr/bin/env node
/**
 * Manifest Linter
 *
 * Ensures each directory with a manifest.json includes every non-hidden file in that directory.
 *
 * Schema (manifest.json):
 * {
 *   "name": "Directory name",
 *   "path": "relative/path",
 *   "files": ["README.md", "example.md", "manifest.json"],
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
for (const a of args) {
  if (a === '--fix') fix = true;
  else root = path.resolve(a);
}

function findManifestFiles(startDir) {
  const results = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.git')) continue;
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.isFile() && entry.name === 'manifest.json') results.push(p);
    }
  }
  walk(startDir);
  return results;
}

function listFiles(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isFile() && !d.name.startsWith('.'))
    .map(d => d.name)
    .sort();
}

function main() {
  const manifests = findManifestFiles(root);
  let errors = 0;
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
        const fixed = { name: json.name || path.basename(dir), path: relDir, files: next, ignore: Array.from(ignore) };
        fs.writeFileSync(mf, JSON.stringify(fixed, null, 2) + '\n', 'utf8');
        console.log(`  Fixed ${relDir}/manifest.json`);
        errors--;
      }
    }
  }

  if (errors) process.exit(1);
}

main();

