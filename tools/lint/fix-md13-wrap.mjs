#!/usr/bin/env node
/**
 * Fix MD013: Reflow paragraph lines to a maximum length.
 * - Skips YAML frontmatter and fenced code blocks.
 * - Skips tables (lines containing '|'), headings, blockquotes, and list items.
 * - Only reflows top-level paragraphs (no leading spaces).
 * - Does NOT split tokens; if a single token exceeds the limit, it stays on its own line.
 *
 * Usage:
 *   node tools/lint/fix-md13-wrap.mjs [--target <path>|.] [--write] [--limit 120]
 */
import fs from 'fs';
import path from 'path';

function parseArgs() {
  const args = process.argv.slice(2);
  let target = process.cwd();
  let write = false;
  let limit = 120;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--target' && args[i + 1]) target = path.resolve(args[++i]);
    else if (a === '--write') write = true;
    else if (a === '--limit' && args[i + 1]) limit = parseInt(args[++i], 10) || limit;
  }
  return { target, write, limit };
}

function listMdFiles(dir) {
  const out = [];
  function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === '.git' || e.name === '.claude' || e.name === 'dist' || e.name === 'build') continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile() && e.name.toLowerCase().endsWith('.md')) out.push(p);
    }
  }
  walk(dir);
  return out;
}

function isParaStart(line) {
  if (!line) return false;
  if (/^\s/.test(line)) return false; // only top-level paragraphs
  if (/^\s*#/.test(line)) return false; // heading
  if (/^\s*[>]/.test(line)) return false; // blockquote
  if (/^\s*[-*+]\s+/.test(line)) return false; // list
  if (/^\s*\d+\.\s+/.test(line)) return false; // ordered list
  if (line.includes('|')) return false; // table rows
  return true;
}

function reflow(tokens, limit) {
  const out = [];
  let line = '';
  for (const tok of tokens) {
    if (line.length === 0) {
      line = tok;
      continue;
    }
    if ((line.length + 1 + tok.length) <= limit) {
      line += ' ' + tok;
    } else {
      out.push(line);
      line = tok;
    }
  }
  if (line.length) out.push(line);
  return out;
}

function fixFile(file, write, limit) {
  const orig = fs.readFileSync(file, 'utf8');
  const lines = orig.split(/\r?\n/);
  let changed = false;
  const out = [];
  let i = 0;
  let inFront = false;
  let inFence = false;
  const fenceRe = /^```/;

  // Handle YAML frontmatter
  if (lines[0]?.trim() === '---') {
    inFront = true;
    out.push(lines[i++]);
    while (i < lines.length) {
      out.push(lines[i]);
      if (lines[i].trim() === '---') { i++; break; }
      i++;
    }
  }

  function isAnyListItem(s) {
    return (/^\s*[-*+]\s+/.test(s) || /^\s*\d+\.\s+/.test(s));
  }
  function isTopBlockquote(s) {
    return (/^>+\s+/.test(s));
  }

  function shouldWrapLine(s) {
    if (s.trim() === '') return false;
    if (s.includes('|')) return false;
    if (/^\s/.test(s)) return false; // paragraph only; lists handled separately
    if (/^#/.test(s)) return false;
    if (/^[>]/.test(s)) return false; // handled separately
    if (isAnyListItem(s)) return false; // handled separately
    return true;
  }

  while (i < lines.length) {
    const t = lines[i];
    if (fenceRe.test(t.trim())) { inFence = !inFence; out.push(t); i++; continue; }
    if (inFence) { out.push(t); i++; continue; }

    // List item wrap (any indent)
    if (isAnyListItem(t)) {
      const m = t.match(/^(\s*)(?:([-*+])\s+|(\d+)\.\s+)(.*)$/);
      if (m) {
        const lead = m[1] || '';
        const marker = (m[2] ? m[2] : m[3] + '.');
        const content = m[4] || '';
        const prefixFirst = lead + marker + ' ';
        const hang = lead + ' '.repeat(marker.length + 1);
        const tokens = content.split(/\s+/);
        const wrapped = reflow(tokens, Math.max(10, limit - prefixFirst.length));
        // emit first line with marker
        if (wrapped.length > 0) {
          out.push(prefixFirst + wrapped[0]);
          for (let wi = 1; wi < wrapped.length; wi++) out.push(hang + wrapped[wi]);
        } else {
          out.push(prefixFirst.trimEnd());
        }
        changed = true;
        i++;
        continue;
      }
    }

    // Top-level blockquote wrap
    if (isTopBlockquote(t)) {
      const m = t.match(/^(>+)\s+(.*)$/);
      if (m) {
        const arrows = m[1];
        const content = m[2] || '';
        const prefix = arrows + ' ';
        const tokens = content.split(/\s+/);
        const wrapped = reflow(tokens, Math.max(10, limit - prefix.length));
        if (wrapped.length > 0) {
          out.push(prefix + wrapped[0]);
          for (let wi = 1; wi < wrapped.length; wi++) out.push(prefix + wrapped[wi]);
        } else {
          out.push(prefix.trimEnd());
        }
        changed = true;
        i++;
        continue;
      }
    }

    if (shouldWrapLine(t)) {
      // Accumulate paragraph
      const buf = [];
      while (i < lines.length && shouldWrapLine(lines[i])) {
        buf.push(lines[i].trim());
        i++;
      }
      const text = buf.join(' ');
      const tokens = text.split(/\s+/);
      const wrapped = reflow(tokens, limit);
      if (wrapped.join('\n') !== buf.join('\n')) changed = true;
      for (const w of wrapped) out.push(w);
      // Preserve the break between this paragraph and the next block
      if (i < lines.length && lines[i].trim() === '') { out.push(lines[i]); i++; }
      continue;
    }

    out.push(t);
    i++;
  }

  const result = out.join('\n');
  if (changed && write) fs.writeFileSync(file, result.endsWith('\n') ? result : result + '\n', 'utf8');
  return changed;
}

(function main(){
  const { target, write, limit } = parseArgs();
  const files = listMdFiles(target);
  let cnt = 0;
  for (const f of files) {
    if (fixFile(f, write, limit)) { cnt++; console.log(`${write ? 'fixed' : 'would-fix'} ${path.relative(process.cwd(), f)}`); }
  }
  console.log(`${write ? 'Fixed' : 'Would fix'} ${cnt} file(s).`);
})();
