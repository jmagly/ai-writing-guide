#!/usr/bin/env node
/**
 * Fix MD024: Ensure headings are unique within a file by appending numeric suffixes to duplicates.
 * - Skips YAML frontmatter and fenced code blocks.
 * - Only modifies H2–H6 (leaves H1 unchanged).
 * - Appends " (2)", " (3)", ... to subsequent duplicates of the same text.
 *
 * Usage:
 *   node tools/lint/fix-md24-unique-headings.mjs [--target <path>|.] [--write]
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

function listMdFiles(dir) {
  const out = [];
  function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === '.git' || e.name === '.claude') continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile() && e.name.toLowerCase().endsWith('.md')) out.push(p);
    }
  }
  walk(dir);
  return out;
}

function fixFile(file, write) {
  const orig = fs.readFileSync(file, 'utf8');
  const lines = orig.split(/\r?\n/);
  let inFront = false;
  let inFence = false;
  let changed = false;
  const seen = new Map(); // key: normalized heading text, value: count
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (i === 0 && line.trim() === '---') { inFront = true; out.push(line); continue; }
    if (inFront) { out.push(line); if (line.trim() === '---') inFront = false; continue; }
    const t = line.trim();
    if (t.startsWith('```')) { inFence = !inFence; out.push(line); continue; }
    if (inFence) { out.push(line); continue; }
    const m = line.match(/^(\s*)(#{1,6})\s+(.*)$/);
    if (m) {
      const indent = m[1];
      const hashes = m[2];
      let text = m[3].trim();
      if (hashes.length === 1) { out.push(line); continue; } // don't touch H1
      const norm = text.toLowerCase();
      const count = seen.get(norm) || 0;
      if (count > 0) {
        text = `${text} (${count + 1})`;
        changed = true;
      }
      seen.set(norm, count + 1);
      out.push(`${indent}${hashes} ${text}`);
    } else {
      out.push(line);
    }
  }
  if (changed && write) fs.writeFileSync(file, out.join('\n') + '\n', 'utf8');
  return changed;
}

(function main(){
  const { target, write } = parseArgs();
  const files = listMdFiles(target);
  let changed = 0;
  for (const f of files) {
    const c = fixFile(f, write);
    if (c) { changed++; console.log(`${write ? 'fixed' : 'would-fix'} ${path.relative(process.cwd(), f)}`); }
  }
  console.log(`${write ? 'Fixed' : 'Would fix'} ${changed} file(s).`);
})();

