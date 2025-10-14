#!/usr/bin/env node
/**
 * Fix MD058: Ensure tables are surrounded by blank lines.
 *
 * Scans Markdown files under a target directory and inserts a blank line
 * before and after contiguous table blocks (lines starting with '|').
 *
 * Usage:
 *   node tools/lint/fix-md58.mjs [--target <path>|.] [--write]
 *
 * By default, runs in dry-run mode. Pass --write to apply changes.
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

function isTableLine(line) {
  const t = line.trim();
  if (t.startsWith('```')) return false; // code fences
  return t.startsWith('|') && t.includes('|');
}

function fixFile(file, write) {
  const orig = fs.readFileSync(file, 'utf8');
  const lines = orig.split(/\r?\n/);
  let changed = false;
  const out = [];
  for (let i = 0; i < lines.length; ) {
    const line = lines[i];
    if (isTableLine(line)) {
      // Determine start of table block
      const atStart = out.length === 0;
      const prevBlank = !atStart && out[out.length - 1].trim() === '';
      if (!prevBlank) {
        out.push('');
        changed = true;
      }
      // Emit all contiguous table lines
      let j = i;
      while (j < lines.length && isTableLine(lines[j])) {
        out.push(lines[j]);
        j++;
      }
      // Ensure a blank line after table block
      const next = j < lines.length ? lines[j] : '';
      if (next !== undefined && next.trim() !== '') {
        out.push('');
        changed = true;
      }
      i = j;
      continue;
    }
    out.push(line);
    i++;
  }
  const result = out.join('\n');
  if (changed && write) fs.writeFileSync(file, result.endsWith('\n') ? result : result + '\n', 'utf8');
  return changed;
}

(function main() {
  const { target, write } = parseArgs();
  const files = listMdFiles(target);
  let changedCount = 0;
  for (const f of files) {
    const changed = fixFile(f, write);
    if (changed) {
      changedCount++;
      console.log(`${write ? 'fixed' : 'would-fix'} ${path.relative(process.cwd(), f)}`);
    }
  }
  console.log(`${write ? 'Fixed' : 'Would fix'} ${changedCount} file(s).`);
})();

