#!/usr/bin/env node
/**
 * Fix MD031/MD040: Ensure fenced code blocks have surrounding blank lines and a language.
 *
 * Usage:
 *   node tools/lint/fix-md-codefences.mjs [--target <path>|.] [--write]
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

function shouldBeMermaidBlock(lines, startIndex, endIndex) {
  // Heuristic: if any line inside looks like mermaid graph keywords
  for (let i = startIndex + 1; i < endIndex && i < lines.length; i++) {
    const t = lines[i].trim();
    if (/^(graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram)\b/.test(t)) return true;
  }
  return false;
}

function fixFile(file, write) {
  const orig = fs.readFileSync(file, 'utf8');
  const lines = orig.split(/\r?\n/);
  let changed = false;
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const fenceMatch = line.match(/^(\s*)```(.*)$/);
    if (fenceMatch) {
      // Determine fence block end
      let j = i + 1;
      const indent = fenceMatch[1] || '';
      while (j < lines.length && !lines[j].startsWith(indent + '```')) j++;
      const endIndex = j < lines.length ? j : lines.length - 1;

      // Ensure language
      let lang = (fenceMatch[2] || '').trim();
      let newStart = indent + '```' + lang;
      if (!lang) {
        // Guess mermaid else default to text
        const isMermaid = shouldBeMermaidBlock(lines, i, endIndex);
        lang = isMermaid ? 'mermaid' : 'text';
        newStart = indent + '```' + lang;
        changed = true;
      }

      // Ensure blank line before
      const prev = out.length > 0 ? out[out.length - 1] : null;
      if (prev !== null && prev.trim() !== '') {
        out.push('');
        changed = true;
      }
      out.push(newStart);
      // Copy inner block
      for (let k = i + 1; k < endIndex; k++) out.push(lines[k]);
      // Add closing fence
      out.push(indent + '```');
      // Ensure blank line after
      const next = endIndex + 1 < lines.length ? lines[endIndex + 1] : '';
      if (next !== undefined && next.trim() !== '') {
        out.push('');
        changed = true;
      }
      i = endIndex + 1;
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
