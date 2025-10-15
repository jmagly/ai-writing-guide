#!/usr/bin/env node
/**
 * Fix MD038: Remove spaces inside code spans like `Version ` -> `Version`.
 * - Skips fenced code blocks and YAML frontmatter.
 *
 * Usage:
 *   node tools/lint/fix-md38-codespace.mjs [--target <path>|.] [--write]
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

function fixLine(line) {
  // Replace backtick code spans with trimmed inner content
  return line.replace(/`([^`]+)`/g, (m, inner) => {
    const trimmed = inner.replace(/^\s+|\s+$/g, '');
    return '`' + trimmed + '`';
  });
}

function fixFile(file, write) {
  const orig = fs.readFileSync(file, 'utf8');
  const lines = orig.split(/\r?\n/);
  let changed = false;
  const out = [];
  let inFence = false;
  let inFront = false;
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (i === 0 && line.trim() === '---') { inFront = true; out.push(line); continue; }
    if (inFront) { out.push(line); if (line.trim() === '---') inFront = false; continue; }
    if (line.trim().startsWith('```')) { inFence = !inFence; out.push(line); continue; }
    if (inFence) { out.push(line); continue; }
    const fixed = fixLine(line);
    if (fixed !== line) changed = true;
    out.push(fixed);
  }
  if (changed && write) fs.writeFileSync(file, out.join('\n') + '\n', 'utf8');
  return changed;
}

(function main() {
  const { target, write } = parseArgs();
  const files = listMdFiles(target);
  let changedCount = 0;
  for (const f of files) {
    const c = fixFile(f, write);
    if (c) { changedCount++; console.log(`${write ? 'fixed' : 'would-fix'} ${path.relative(process.cwd(), f)}`); }
  }
  console.log(`${write ? 'Fixed' : 'Would fix'} ${changedCount} file(s).`);
})();

