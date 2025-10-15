#!/usr/bin/env node
/**
 * Fix MD026: Remove trailing punctuation from headings.
 * - Punctuation removed: . , ; : ! ? (configurable via regex)
 * - Skips fenced code blocks and YAML frontmatter.
 *
 * Usage:
 *   node tools/lint/fix-md26-headpunct.mjs [--target <path>|.] [--write]
 */
import fs from 'fs';
import path from 'path';

const PUNCT_RE = /[\.,;:!?]+$/;

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
    if (i === 0 && line.trim() === '---') { inFront = true; out.push(line); continue; }
    if (inFront) { out.push(line); if (line.trim() === '---') inFront = false; continue; }
    const t = line.trim();
    if (t.startsWith('```')) { inFence = !inFence; out.push(line); continue; }
    if (inFence) { out.push(line); continue; }
    if (/^#{1,6}\s+/.test(t)) {
      const prefix = line.match(/^[\s#]+/)[0];
      const content = line.slice(prefix.length);
      const newContent = content.replace(PUNCT_RE, '');
      if (newContent !== content) { out.push(prefix + newContent); changed = true; }
      else out.push(line);
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
  let count = 0;
  for (const f of files) { if (fixFile(f, write)) { count++; console.log(`${write ? 'fixed' : 'would-fix'} ${path.relative(process.cwd(), f)}`); } }
  console.log(`${write ? 'Fixed' : 'Would fix'} ${count} file(s).`);
})();

