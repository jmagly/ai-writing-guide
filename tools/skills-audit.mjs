#!/usr/bin/env node
// Audit skill description lengths across the AIWG corpus (#1148).
// Walks agentic/code/**/skills/**/SKILL.md, parses YAML frontmatter,
// reports per-framework stats and global worst-offenders.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = 'agentic/code';
const TARGET_AVG = 150;
const TARGET_P95 = 250;
const TOKEN_BUDGET_PCT_OF_2M = 0.01;
const TOKENS_PER_CHAR = 0.25;

function* walk(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const s = statSync(p);
    if (s.isDirectory()) yield* walk(p);
    else if (e === 'SKILL.md') yield p;
  }
}

function parseDescription(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fm = m[1];
  // Block-scalar (>, |) or plain. Capture until next top-level key or end.
  const dm = fm.match(/^description:\s*([>|][-+]?)?\s*(.*?)(?=\n[a-zA-Z_][\w-]*:|\n*$)/ms);
  if (!dm) return null;
  let body = dm[2] ?? '';
  if (dm[1]) {
    body = body.split('\n').map(l => l.replace(/^\s+/, '')).join(' ').trim();
  } else {
    body = body.replace(/^["']|["']$/g, '').trim();
  }
  return body;
}

function bucketOf(path) {
  const parts = path.split(sep);
  const i = parts.indexOf('code');
  if (i < 0) return 'unknown';
  const kind = parts[i + 1];
  const name = parts[i + 2];
  return `${kind}/${name}`;
}

function pct(arr, p) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * p))];
}

const results = [];
for (const path of walk(ROOT)) {
  const raw = readFileSync(path, 'utf8');
  const desc = parseDescription(raw);
  if (desc == null) continue;
  results.push({ path: relative('.', path), bucket: bucketOf(path), desc, len: desc.length });
}

const buckets = new Map();
for (const r of results) {
  if (!buckets.has(r.bucket)) buckets.set(r.bucket, []);
  buckets.get(r.bucket).push(r);
}

console.log('# Skill Description Audit (#1148)\n');
console.log(`Total skills surveyed: ${results.length}\n`);

console.log('## Per-bucket stats\n');
console.log('| Bucket | Count | Avg | p50 | p95 | Max | Over 250 |');
console.log('|--------|-------|-----|-----|-----|-----|----------|');
const bucketRows = [];
for (const [bucket, items] of [...buckets.entries()].sort()) {
  const lens = items.map(i => i.len);
  const avg = Math.round(lens.reduce((a, b) => a + b, 0) / lens.length);
  const p50 = pct(lens, 0.5);
  const p95 = pct(lens, 0.95);
  const mx = Math.max(...lens);
  const over = items.filter(i => i.len > TARGET_P95).length;
  bucketRows.push({ bucket, count: items.length, avg, p50, p95, mx, over });
  console.log(`| ${bucket} | ${items.length} | ${avg} | ${p50} | ${p95} | ${mx} | ${over} |`);
}

console.log('\n## Global stats\n');
const allLens = results.map(r => r.len);
const totalChars = allLens.reduce((a, b) => a + b, 0);
const tokenEstimate = Math.round(totalChars * TOKENS_PER_CHAR);
const pctOf2M = (tokenEstimate / 2_000_000 * 100).toFixed(2);
const avg = Math.round(totalChars / allLens.length);
console.log(`- Total skills: ${results.length}`);
console.log(`- Avg description length: ${avg} chars (target ≤${TARGET_AVG})`);
console.log(`- p50: ${pct(allLens, 0.5)} chars`);
console.log(`- p95: ${pct(allLens, 0.95)} chars (target ≤${TARGET_P95})`);
console.log(`- Max: ${Math.max(...allLens)} chars`);
console.log(`- Total chars: ${totalChars.toLocaleString()}`);
console.log(`- Estimated tokens: ${tokenEstimate.toLocaleString()} (${pctOf2M}% of 2M frame; target ≤1%)`);
console.log(`- Skills exceeding 250-char target: ${results.filter(r => r.len > TARGET_P95).length}/${results.length}`);

console.log('\n## Top 25 worst offenders\n');
const worst = [...results].sort((a, b) => b.len - a.len).slice(0, 25);
console.log('| Length | Path |');
console.log('|--------|------|');
for (const r of worst) {
  console.log(`| ${r.len} | ${r.path} |`);
}

console.log('\n## Reduction needed to hit 1% budget\n');
const targetTokens = Math.round(2_000_000 * TOKEN_BUDGET_PCT_OF_2M);
const targetChars = targetTokens / TOKENS_PER_CHAR;
const targetAvgPerSkill = Math.floor(targetChars / results.length);
const reductionPct = Math.round((1 - targetAvgPerSkill / avg) * 100);
console.log(`- Current avg: ${avg} chars`);
console.log(`- Target avg to fit 1% of 2M frame: ≤${targetAvgPerSkill} chars`);
console.log(`- Reduction required: ~${reductionPct}%`);
