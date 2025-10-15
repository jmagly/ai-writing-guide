#!/usr/bin/env node
/**
 * Fix MD047: Ensure files end with a single trailing newline.
 *
 * Usage:
 *  node tools/lint/fix-md47-finalnewline.mjs [--target <path>|.] [--write]
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
  const buf = fs.readFileSync(file);
  if (buf.length === 0) {
    if (write) fs.writeFileSync(file, '\n');
    return true;
  }
  const text = buf.toString('utf8');
  if (!text.endsWith('\n')) {
    if (write) fs.writeFileSync(file, text + '\n', 'utf8');
    return true;
  }
  // Ensure only one trailing newline
  const trimmed = text.replace(/\n+$/,'\n');
  if (trimmed !== text) {
    if (write) fs.writeFileSync(file, trimmed, 'utf8');
    return true;
  }
  return false;
}

(function main(){
  const { target, write } = parseArgs();
  const files = listMdFiles(target);
  let changed = 0;
  for (const f of files) {
    if (fixFile(f, write)) { changed++; console.log(`${write ? 'fixed' : 'would-fix'} ${path.relative(process.cwd(), f)}`); }
  }
  console.log(`${write ? 'Fixed' : 'Would fix'} ${changed} file(s).`);
})();

