#!/usr/bin/env node
/**
 * Deterministically migrate the canonical agent/skill corpus to cheap-first
 * provider-neutral model policy. Duplicate names receive identical policy.
 * @implements #1806
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { globSync } from 'glob';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const allowlist = JSON.parse(fs.readFileSync(
  path.join(repoRoot, 'agentic/code/providers/premium-model-allowlist.v1.json'),
  'utf8',
));
const write = process.argv.includes('--write');
const STANDARD_AGENT = /(?:implement|engineer|developer|debug|research|orchestrat|investigat|recovery|reviewer|requirements-analyst|system-analyst|technical-researcher|test-engineer)/;
const STANDARD_SKILL = /(?:^flow-|implement|debug|research-|induct-|investigat|acquire|architecture|analysis|generate|execute|orchestrat)/;

function policy(kind, name) {
  const rationale = allowlist[`${kind}s`]?.[name];
  if (rationale) return { role: 'reasoning', tier: 'premium', model: 'opus', rationale };
  const standard = kind === 'agent' ? STANDARD_AGENT.test(name) : STANDARD_SKILL.test(name);
  return standard
    ? { role: 'coding', tier: 'standard', model: 'sonnet' }
    : { role: 'efficiency', tier: 'economy', model: 'haiku' };
}
function upsertTopLevel(frontmatter, key, value) {
  const line = new RegExp(`^${key}:.*$`, 'm');
  if (value === undefined) return frontmatter.replace(new RegExp(`^${key}:.*\\n?`, 'm'), '');
  return line.test(frontmatter)
    ? frontmatter.replace(line, `${key}: ${value}`)
    : `${frontmatter}\n${key}: ${value}`;
}
function upsertHint(frontmatter, key, value) {
  const block = /^commandHint:\s*$/m;
  if (!block.test(frontmatter)) frontmatter += '\ncommandHint:';
  const line = new RegExp(`^\\s+${key}:.*$`, 'm');
  if (value === undefined) return frontmatter.replace(new RegExp(`^\\s+${key}:.*\\n?`, 'm'), '');
  if (line.test(frontmatter)) return frontmatter.replace(line, `  ${key}: ${value}`);
  const lines = frontmatter.split('\n');
  const start = lines.findIndex(item => block.test(item));
  let end = start + 1;
  while (end < lines.length && /^\s+/.test(lines[end])) end++;
  lines.splice(end, 0, `  ${key}: ${value}`);
  return lines.join('\n');
}
function migrate(file, kind) {
  const raw = fs.readFileSync(file, 'utf8');
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  const name = kind === 'agent'
    ? path.basename(file, '.md')
    : path.basename(path.dirname(file));
  if (!match) {
    const rationale = allowlist.exemptions?.[`${kind}s`]?.[name];
    if (!rationale) throw new Error(`${path.relative(repoRoot, file)}: missing frontmatter`);
    return { kind, name, exempt: true, rationale, changed: false };
  }
  const selected = policy(kind, name);
  let frontmatter = match[1];
  if (kind === 'agent') {
    frontmatter = upsertTopLevel(frontmatter, 'model', selected.model);
    frontmatter = upsertTopLevel(frontmatter, 'model-role', selected.role);
    frontmatter = upsertTopLevel(frontmatter, 'model-tier', selected.tier);
    frontmatter = upsertTopLevel(frontmatter, 'model-rationale', selected.rationale);
  } else {
    frontmatter = upsertHint(frontmatter, 'model', selected.model);
    frontmatter = upsertHint(frontmatter, 'modelRole', selected.role);
    frontmatter = upsertHint(frontmatter, 'modelTier', selected.tier);
    frontmatter = upsertHint(frontmatter, 'modelRationale', selected.rationale);
  }
  const output = `---\n${frontmatter.replace(/\n{3,}/g, '\n\n')}\n---\n${match[2]}`;
  if (write && output !== raw) fs.writeFileSync(file, output);
  return { kind, name, ...selected, changed: output !== raw };
}

const agentFiles = globSync(
  [
    'agentic/code/{frameworks,addons,extensions}/*/agents/*.md',
    'agentic/code/frameworks/*/extensions/*/agents/*.md',
    'agentic/code/plugins/*/agents/*.md',
  ],
  { cwd: repoRoot, absolute: true, nodir: true },
).filter(file => !file.endsWith('.soul.md'));
const skillFiles = globSync(
  [
    'agentic/code/{frameworks,addons,extensions}/*/skills/*/SKILL.md',
    'agentic/code/frameworks/*/extensions/*/skills/*/SKILL.md',
    'agentic/code/plugins/*/skills/*/SKILL.md',
  ],
  { cwd: repoRoot, absolute: true, nodir: true },
).filter(file => /^\s+model:/m.test(fs.readFileSync(file, 'utf8')));
const results = [
  ...agentFiles.map(file => migrate(file, 'agent')),
  ...skillFiles.map(file => migrate(file, 'skill')),
];
const unique = new Map();
for (const result of results) unique.set(`${result.kind}:${result.name}`, result);
const values = [...unique.values()];
const counts = Object.fromEntries(['economy', 'standard', 'premium'].map(tier => [
  tier, values.filter(item => item.tier === tier).length,
]));
const governed = values.filter(item => !item.exempt);
const economyShare = counts.economy / governed.length;
console.log(JSON.stringify({
  mode: write ? 'write' : 'check',
  files: results.length,
  uniqueArtifacts: values.length,
  exemptions: values.filter(item => item.exempt).length,
  changed: results.filter(item => item.changed).length,
  counts,
  economyShare: Number(economyShare.toFixed(4)),
}, null, 2));
if (economyShare < 0.6) process.exitCode = 2;
