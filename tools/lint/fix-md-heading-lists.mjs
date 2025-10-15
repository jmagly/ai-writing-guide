#!/usr/bin/env node
/**
 * Fix MD022/MD032: Ensure headings and lists are surrounded by blank lines.
 * - Skips YAML frontmatter and fenced code blocks.
 *
 * Usage:
 *   node tools/lint/fix-md-heading-lists.mjs [--target <path>|.] [--write]
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

function isHeading(line) {
  const t = line.trim();
  return /^#{1,6} /.test(t);
}

function isList(line) {
  const t = line;
  return /^\s*[-*+]\s+/.test(t) || /^\s*\d+\.\s+/.test(t);
}

function fixFile(file, write) {
  const orig = fs.readFileSync(file, 'utf8');
  const lines = orig.split(/\r?\n/);
  let changed = false;
  const out = [];
  let i = 0;
  let inFence = false;
  let inFront = false;
  while (i < lines.length) {
    let line = lines[i];

    // YAML frontmatter detection only at top
    if (i === 0 && line.trim() === '---') { inFront = true; out.push(line); i++; continue; }
    if (inFront) {
      out.push(line);
      if (line.trim() === '---') inFront = false;
      i++;
      continue;
    }

    // Fence toggle
    if (line.trim().startsWith('```')) inFence = !inFence;
    if (inFence) { out.push(line); i++; continue; }

    // Headings: ensure blank line before and after
    if (isHeading(line)) {
      const prev = out.length > 0 ? out[out.length - 1] : null;
      if (prev !== null && prev.trim() !== '') { out.push(''); changed = true; }
      out.push(line);
      const next = i + 1 < lines.length ? lines[i + 1] : '';
      if (next !== undefined && next.trim() !== '') { out.push(''); changed = true; }
      i++;
      continue;
    }

    // Lists: handle contiguous block, ensure blank lines around (idempotent)
    if (isList(line)) {
      const prevOut = out.length > 0 ? out[out.length - 1] : null;
      const prevOrig = i > 0 ? lines[i - 1] : null;
      const origHadBlankBefore = prevOrig !== null && prevOrig.trim() === '';
      if (prevOut !== null && prevOut.trim() !== '') {
        out.push('');
        if (!origHadBlankBefore) changed = true; // only mark drift if not already blank in source
      }
      // Emit contiguous list block; track if we saw trailing blank(s)
      let j = i;
      let hadTrailingBlank = false;
      while (j < lines.length && (isList(lines[j]) || lines[j].trim() === '' || /^\s{2,}\S/.test(lines[j]))) {
        if (lines[j].trim() === '') hadTrailingBlank = true;
        out.push(lines[j]);
        j++;
      }
      const next = j < lines.length ? lines[j] : '';
      if (next !== undefined && next.trim() !== '' && !hadTrailingBlank) {
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
