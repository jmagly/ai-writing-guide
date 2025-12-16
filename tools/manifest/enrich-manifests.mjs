#!/usr/bin/env node
/**
 * Enrich manifest.json files with per-file descriptions.
 *
 * - Walks target tree, finds directories containing manifest.json
 * - Adds/updates a `descriptions` object keyed by filename
 * - Skips hidden directories; ignores files listed under `ignore`
 *
 * Usage:
 *   node tools/manifest/enrich-manifests.mjs [--target <path>|.] [--write]
 *
 * Note: manifest.md generation has been deprecated - manifest.json serves the same purpose.
 */
import fs from 'fs';
import path from 'path';

function parseArgs() {
  const args = process.argv.slice(2);
  let target = process.cwd();
  let write = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--target' && args[i + 1]) target = path.resolve(args[++i]);
    else if (a === '--write') write = true;
  }
  return { target, write };
}

function listManifestDirs(root) {
  const out = [];
  function walk(d) {
    const base = path.basename(d);
    if (base.startsWith('.') && base !== '.github' && base !== '.claude') return;
    const entries = fs.readdirSync(d, { withFileTypes: true });
    const hasManifest = entries.some(e => e.isFile() && e.name === 'manifest.json');
    if (hasManifest) out.push(d);
    for (const e of entries) {
      if (e.isDirectory() && e.name !== 'node_modules' && e.name !== 'dist' && e.name !== 'build') {
        walk(path.join(d, e.name));
      }
    }
  }
  walk(root);
  return out;
}

function readText(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return ''; }
}

function summarizeMarkdown(absPath) {
  const text = readText(absPath);
  if (!text) return '';
  const lines = text.split(/\r?\n/);
  let i = 0;
  // Skip frontmatter
  if (lines[0]?.trim() === '---') {
    i = 1;
    while (i < lines.length && lines[i].trim() !== '---') i++;
    if (i < lines.length) i++;
  }
  // find first non-empty line
  while (i < lines.length && lines[i].trim() === '') i++;
  if (i >= lines.length) return '';
  const first = lines[i].trim();
  // prefer H1 or H2 text
  if (/^#{1,2}\s+/.test(first)) {
    const t = first.replace(/^#{1,6}\s+/, '').trim();
    // Try to grab the next paragraph if exists for more context
    let j = i + 1;
    while (j < lines.length && lines[j].trim() === '') j++;
    let second = '';
    if (j < lines.length && !/^#/.test(lines[j].trim())) {
      second = lines[j].trim();
    }
    const combined = second ? `${t} — ${second}` : t;
    return combined.length > 220 ? combined.slice(0, 217) + '...' : combined;
  }
  // otherwise use first paragraph
  const para = first;
  return para.length > 220 ? para.slice(0, 217) + '...' : para;
}

function summarizeCode(absPath) {
  const text = readText(absPath);
  if (!text) return '';
  // Look for leading block comment
  const block = text.match(/^\s*\/\*\*?[\s\S]*?\*\//);
  if (block) {
    const body = block[0].replace(/^\s*\/\*+/, '').replace(/\*+\/\s*$/, '');
    const lines = body.split(/\r?\n/).map(l => l.replace(/^\s*\*\s?/, '').trim()).filter(Boolean);
    const s = lines[0] || '';
    if (s) return s.length > 220 ? s.slice(0, 217) + '...' : s;
  }
  // Fallback: first non-empty line comment
  const line = text.split(/\r?\n/).map(l => l.trim()).find(l => l.startsWith('//'));
  if (line) return line.replace(/^\/\//, '').trim();
  return '';
}

function humanizeFilename(name) {
  const base = name.replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ') 
    .trim();
  return base ? base[0].toUpperCase() + base.slice(1) : name;
}

function deriveDescription(dir, file) {
  const abs = path.join(dir, file);
  const ext = path.extname(file).toLowerCase();
  if (ext === '.md') {
    const s = summarizeMarkdown(abs);
    if (s) return s;
    return `Markdown: ${humanizeFilename(file)}`;
  }
  if (ext === '.mjs' || ext === '.js' || ext === '.ts') {
    const s = summarizeCode(abs);
    if (s) return s;
    return `Script: ${humanizeFilename(file)}`;
  }
  return `${ext.slice(1).toUpperCase()} file: ${file}`;
}

function enrichManifest(dir, write) {
  const manifestPath = path.join(dir, 'manifest.json');
  let json;
  try {
    json = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch {
    return { dir, updated: false, reason: 'invalid json' };
  }
  const ignore = new Set([...(json.ignore || []), 'manifest.json']);
  const files = (json.files || []).filter(f => !ignore.has(f));
  const descriptions = { ...(json.descriptions || {}) };
  let changed = false;
  for (const f of files) {
    const cur = descriptions[f];
    const next = deriveDescription(dir, f);
    if (!cur || (typeof cur === 'string' && cur.trim().length === 0)) {
      descriptions[f] = next;
      changed = true;
    }
  }
  if (changed) json.descriptions = descriptions;
  if (write && changed) {
    fs.writeFileSync(manifestPath, JSON.stringify(json, null, 2) + '\n', 'utf8');
  }
  return { dir, updated: write && changed, changed };
}

(function main(){
  const { target, write } = parseArgs();
  const dirs = listManifestDirs(target);
  let updated = 0;
  for (const d of dirs) {
    const { updated: u, changed } = enrichManifest(d, write);
    if (u) updated++;
    if (!write && changed) console.log(`would-enrich ${path.relative(process.cwd(), d)}`);
    if (write && u) console.log(`enriched ${path.relative(process.cwd(), d)}`);
  }
  console.log(`${write ? 'Enriched' : 'Would enrich'} ${updated} manifest(s).`);
})();
