#!/usr/bin/env node
/**
 * Fix MD041: Ensure the first content line (after optional YAML frontmatter) is a top-level heading.
 * - Skips fenced code blocks.
 * - Adds an H1 only if there is no existing H1 outside fences (to avoid MD025).
 * - Derives title:
 *   - If file is under docs/agents/, derive from filename (hyphens -> Title Case words).
 *   - Else, use first H2 (##) text if present; otherwise derive from filename.
 *
 * Usage:
 *   node tools/lint/fix-md41-firsth1.mjs [--target <path>|.] [--write]
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

function toTitleCase(s) {
  return s
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(w => w ? w[0].toUpperCase() + w.slice(1) : w)
    .join(' ');
}

function deriveTitle(file, lines) {
  const rel = file.replace(/\\/g, '/');
  const base = path.basename(file, path.extname(file));
  // Prefer first H2 text if present
  let inFence = false;
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('```')) inFence = !inFence;
    if (inFence) continue;
    if (/^##\s+/.test(t)) return t.replace(/^##\s+/, '').trim();
  }
  if (rel.includes('/docs/agents/')) return toTitleCase(base);
  return toTitleCase(base);
}

function fixFile(file, write) {
  const orig = fs.readFileSync(file, 'utf8');
  const lines = orig.split(/\r?\n/);
  let i = 0;
  let inFront = false;
  let inFence = false;

  if (lines[0]?.trim() === '---') {
    inFront = true;
    // find the closing frontmatter line
    i = 1;
    while (i < lines.length && lines[i].trim() !== '---') i++;
    if (i < lines.length) i++; // move past closing '---'
    else i = 0; // malformed, ignore
  }

  // Detect first non-blank non-fence line index
  let firstContent = i;
  while (firstContent < lines.length) {
    const t = lines[firstContent].trim();
    if (t.startsWith('```')) {
      // skip fence block
      firstContent++;
      inFence = true;
      while (firstContent < lines.length) {
        const tt = lines[firstContent].trim();
        if (tt.startsWith('```')) { inFence = false; firstContent++; break; }
        firstContent++;
      }
      continue;
    }
    if (t !== '') break;
    firstContent++;
  }

  // Check if any H1 exists outside fences
  let hasH1 = false;
  inFence = false;
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('```')) { inFence = !inFence; continue; }
    if (inFence) continue;
    if (/^#\s+/.test(t)) { hasH1 = true; break; }
  }

  // If first content line is H1 already or any H1 exists, do not add new one (avoid MD025)
  if (firstContent < lines.length) {
    const t = lines[firstContent].trim();
    if (/^#\s+/.test(t) || hasH1) {
      return false; // no change
    }
  }

  // Insert H1 at firstContent
  const title = deriveTitle(file, lines);
  const out = [];
  for (let k = 0; k < firstContent; k++) out.push(lines[k]);
  out.push(`# ${title}`);
  if (lines[firstContent]?.trim() !== '') out.push('');
  for (let k = firstContent; k < lines.length; k++) out.push(lines[k]);
  const result = out.join('\n');
  if (write) fs.writeFileSync(file, result.endsWith('\n') ? result : result + '\n', 'utf8');
  return true;
}

(function main() {
  const { target, write } = parseArgs();
  const files = listMdFiles(target);
  let changed = 0;
  for (const f of files) {
    const c = fixFile(f, write);
    if (c) { changed++; console.log(`${write ? 'fixed' : 'would-fix'} ${path.relative(process.cwd(), f)}`); }
  }
  console.log(`${write ? 'Fixed' : 'Would fix'} ${changed} file(s).`);
})();

