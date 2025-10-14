#!/usr/bin/env node
/**
 * Generate a manifest.json (and optional manifest.md) for a directory.
 *
 * Usage:
 *   node tools/manifest/generate-manifest.mjs <dir> [--write-md]
 */

import fs from 'fs';
import path from 'path';

const dirArg = process.argv[2];
const writeMd = process.argv.includes('--write-md');
if (!dirArg) {
  console.error('Usage: node tools/manifest/generate-manifest.mjs <dir> [--write-md]');
  process.exit(1);
}

const dir = path.resolve(dirArg);
if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
  console.error('Not a directory:', dir);
  process.exit(1);
}

const files = fs
  .readdirSync(dir, { withFileTypes: true })
  .filter(d => d.isFile() && !d.name.startsWith('.'))
  .map(d => d.name)
  .sort();

const manifest = {
  name: path.basename(dir),
  path: path.relative(process.cwd(), dir) || '.',
  files,
  ignore: ["manifest.json"]
};

const manifestPath = path.join(dir, 'manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log('Wrote', manifestPath);

if (writeMd) {
  const md = [
    '# Directory Manifest',
    '',
    '## Files',
    ...files.map(f => `- ${f}`),
    ''
  ].join('\n');
  const mdPath = path.join(dir, 'manifest.md');
  fs.writeFileSync(mdPath, md + '\n', 'utf8');
  console.log('Wrote', mdPath);
}

