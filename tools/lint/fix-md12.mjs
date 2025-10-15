#!/usr/bin/env node
/**
 * Fix MD012: Collapse multiple consecutive blank lines to a single blank line.
 * - Skips YAML frontmatter and fenced code blocks.
 *
 * Usage:
 *   node tools/lint/fix-md12.mjs [--target <path>|.] [--write]
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
  let changed = false;
  const out = [];
  let blankStreak = 0;
  let inFence = false;
  let i = 0;
  // We allow frontmatter without collapsing
  let inFront = i === 0 && lines[0]?.trim() === '---';

  while (i < lines.length) {
    const line = lines[i];
    if (inFront) {
      out.push(line);
      if (line.trim() === '---' && i !== 0) inFront = false;
      i++;
      continue;
    }
    if (line.trim().startsWith('```')) inFence = !inFence;
    if (inFence) { out.push(line); i++; continue; }

    if (line.trim() === '') {
      blankStreak++;
      if (blankStreak === 1) out.push(line);
      else changed = true;
    } else {
      blankStreak = 0;
      out.push(line);
    }
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
