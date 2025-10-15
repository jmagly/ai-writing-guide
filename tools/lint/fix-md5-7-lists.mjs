#!/usr/bin/env node
/**
 * Fix MD005/MD007 (list indentation): normalize stray single-space indents
 * for top-level list items. Conservative:
 * - Only fixes lines that start with exactly one space followed by a list
 *   marker ("- ", "* ", "+ ", or "1. ").
 * - Skips YAML frontmatter and fenced code blocks.
 * - Does not modify nested lists (which typically have >= 2 spaces indent).
 *
 * Usage:
 *   node tools/lint/fix-md5-7-lists.mjs [--target <path>|.] [--write]
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
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const t = line.trim();
    if (i === 0 && t === '---') { inFront = true; out.push(line); continue; }
    if (inFront) { out.push(line); if (t === '---') inFront = false; continue; }
    if (t.startsWith('```')) { inFence = !inFence; out.push(line); continue; }
    if (inFence) { out.push(line); continue; }
    // Only adjust exactly one leading space before a list marker
    if (/^ [-*+]\s+/.test(line) || /^ \d+\.\s+/.test(line)) {
      line = line.slice(1);
      changed = true;
    }
    out.push(line);
  }
  if (changed && write) fs.writeFileSync(file, out.join('\n') + '\n', 'utf8');
  return changed;
}

(function main(){
  const { target, write } = parseArgs();
  const files = listMdFiles(target);
  let cnt = 0;
  for (const f of files) {
    if (fixFile(f, write)) { cnt++; console.log(`${write ? 'fixed' : 'would-fix'} ${path.relative(process.cwd(), f)}`); }
  }
  console.log(`${write ? 'Fixed' : 'Would fix'} ${cnt} file(s).`);
})();

