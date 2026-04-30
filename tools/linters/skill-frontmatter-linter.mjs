#!/usr/bin/env node
// Validates SKILL.md frontmatter across the repo. Closes #1014 — the
// existing MetadataValidator's recursive walker only picks up manifest.md
// and BEHAVIOR.md, so SKILL.md frontmatter bugs (invalid YAML, missing
// required fields) reach main without CI catching them.
//
// Checks per file:
//   1. Frontmatter delimiters present
//   2. YAML parses in strict mode
//   3. Required fields present: name, namespace, description, platforms
//
// Usage:
//   node tools/linters/skill-frontmatter-linter.mjs [path...]
//   (default paths: agentic/code, .claude)

import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import yaml from 'js-yaml';

const REQUIRED = ['name', 'namespace', 'description', 'platforms'];
const DEFAULT_ROOTS = ['agentic/code', '.claude'];

async function* walk(root) {
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name.startsWith('.git')) continue;
    const p = join(root, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.isFile() && e.name === 'SKILL.md') yield p;
  }
}

function extractFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  return m ? m[1] : null;
}

async function check(file) {
  const text = await readFile(file, 'utf8');
  const fmText = extractFrontmatter(text);
  if (!fmText) return [{ field: '<frontmatter>', msg: 'missing or malformed --- delimiters' }];
  let fm;
  try {
    fm = yaml.load(fmText, { schema: yaml.DEFAULT_SCHEMA });
  } catch (e) {
    return [{ field: '<yaml>', msg: `parse error: ${e.message.split('\n')[0]}` }];
  }
  if (!fm || typeof fm !== 'object') return [{ field: '<yaml>', msg: 'frontmatter is not an object' }];
  const errs = [];
  for (const k of REQUIRED) {
    if (fm[k] === undefined || fm[k] === null || fm[k] === '') {
      errs.push({ field: k, msg: 'missing required field' });
    }
  }
  return errs;
}

async function main() {
  const roots = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_ROOTS;
  const cwd = process.cwd();

  const files = [];
  for (const r of roots) {
    try {
      const s = await stat(r);
      if (s.isFile() && r.endsWith('SKILL.md')) files.push(r);
      else if (s.isDirectory()) for await (const f of walk(r)) files.push(f);
    } catch {
      console.error(`warn: cannot access ${r}`);
    }
  }

  let failed = 0;
  for (const f of files) {
    const errs = await check(f);
    if (errs.length) {
      failed++;
      console.error(`✗ ${relative(cwd, f)}`);
      for (const e of errs) console.error(`    [${e.field}] ${e.msg}`);
    }
  }

  console.log(`\nSKILL.md frontmatter check: ${files.length} file(s), ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error('linter crashed:', e);
  process.exit(2);
});
