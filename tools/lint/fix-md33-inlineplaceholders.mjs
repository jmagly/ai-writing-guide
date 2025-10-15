#!/usr/bin/env node
/**
 * Fix MD033: Replace inline angle-bracket placeholders with code spans.
 * Examples:
 *   <Project Name> -> `Project Name`
 *   <dd/mmm/yy> -> `dd/mmm/yy`
 *   <name> -> `name`
 * Skips:
 *   - Autolinks like <https://...> or <mailto:...>
 *   - YAML frontmatter and fenced code blocks
 *
 * Usage:
 *   node tools/lint/fix-md33-inlineplaceholders.mjs [--target <path>|.] [--write]
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

// Common HTML tags whitelist (lowercase)
const HTML_TAGS = new Set([
  'a','abbr','address','area','article','aside','audio','b','base','bdi','bdo','blockquote','body','br','button','canvas','caption','cite','code','col','colgroup','data','datalist','dd','del','details','dfn','dialog','div','dl','dt','em','embed','fieldset','figcaption','figure','footer','form','h1','h2','h3','h4','h5','h6','head','header','hr','html','i','iframe','img','input','ins','kbd','label','legend','li','link','main','map','mark','meta','meter','nav','noscript','object','ol','optgroup','option','output','p','param','picture','pre','progress','q','rp','rt','ruby','s','samp','script','section','select','small','source','span','strong','style','sub','summary','sup','table','tbody','td','template','textarea','tfoot','th','thead','time','title','tr','track','u','ul','var','video','wbr'
]);

function replaceAnglePlaceholders(text) {
  return text.replace(/<([^>]+)>/g, (m, inner) => {
    const t = inner.trim();
    const lower = t.toLowerCase();
    // Keep autolinks
    if (lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('mailto:')) return m;
    // Keep closing tags
    if (t.startsWith('/')) return m;
    // If looks like an HTML tag name (first token) then keep
    const tagName = lower.split(/[\s>/]/)[0];
    if (HTML_TAGS.has(tagName)) return m;
    // Otherwise, treat as placeholder
    return '`' + t + '`';
  });
}

function fixLine(line) {
  // Skip replacements inside inline code spans
  let inCode = false;
  let buf = '';
  let segment = '';
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '`') {
      // Flush current segment with appropriate processing
      if (!inCode) buf += replaceAnglePlaceholders(segment);
      else buf += segment;
      segment = '';
      inCode = !inCode;
      buf += ch; // keep backtick
    } else {
      segment += ch;
    }
  }
  // Flush remainder
  if (!inCode) buf += replaceAnglePlaceholders(segment);
  else buf += segment;
  return buf;
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
