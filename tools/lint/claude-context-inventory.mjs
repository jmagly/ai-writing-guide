#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import YAML from 'yaml';

export const DEFAULT_SKILL_CEILING_BYTES = 24 * 1024;
export const DEFAULT_AGENT_CEILING_BYTES = 16 * 1024;

export const DEFAULT_SKILL_GLOBS = [
  'agentic/code/**/skills/**/SKILL.md',
  'plugins/**/.claude-plugin/**/skills/**/SKILL.md',
  '.claude/skills/**/SKILL.md',
  '.github/skills/**/SKILL.md',
];

export const DEFAULT_AGENT_DIRS = [
  'agentic/code',
  'plugins',
  '.claude/agents',
  '.github/agents',
];

const SKILL_RE = /(?:^|\/)skills\/[^/]+\/SKILL\.md$/;
const AGENT_RE = /(?:^|\/)(?:agents?|droids?)\/[^/]+\.md$/;

async function listFiles(rootDir) {
  const files = [];
  async function walk(dir) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(abs);
      } else if (entry.isFile()) {
        files.push(abs);
      }
    }
  }
  await walk(rootDir);
  return files;
}

function parseFrontmatter(text) {
  if (!text.startsWith('---\n')) return {};
  const end = text.indexOf('\n---', 4);
  if (end === -1) return {};
  try {
    return YAML.parse(text.slice(4, end)) ?? {};
  } catch {
    return {};
  }
}

function approxTokens(text) {
  return Math.ceil(text.length / 4);
}

function toRel(rootDir, absPath) {
  return path.relative(rootDir, absPath).split(path.sep).join('/');
}

function isClaudeFacing(relPath) {
  return (
    relPath.startsWith('agentic/code/') ||
    relPath.startsWith('plugins/') ||
    relPath.startsWith('.claude/') ||
    relPath.startsWith('.github/')
  );
}

export async function scanClaudeContextInventory(options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const skillCeilingBytes = options.skillCeilingBytes ?? DEFAULT_SKILL_CEILING_BYTES;
  const agentCeilingBytes = options.agentCeilingBytes ?? DEFAULT_AGENT_CEILING_BYTES;
  const allFiles = await listFiles(rootDir);
  const records = [];

  for (const absPath of allFiles) {
    const relPath = toRel(rootDir, absPath);
    if (!isClaudeFacing(relPath)) continue;
    if (!SKILL_RE.test(relPath) && !AGENT_RE.test(relPath)) continue;

    const text = await fs.readFile(absPath, 'utf8');
    const stat = await fs.stat(absPath);
    const frontmatter = parseFrontmatter(text);
    const kind = SKILL_RE.test(relPath) ? 'skill' : 'agent';
    const hasSkillsPreload = Array.isArray(frontmatter.skills)
      ? frontmatter.skills.length > 0
      : typeof frontmatter.skills === 'string' && frontmatter.skills.trim().length > 0;
    const explicitFork = frontmatter.context === 'fork' || frontmatter['context'] === 'fork';

    records.push({
      kind,
      path: relPath,
      name: String(frontmatter.name ?? path.basename(path.dirname(absPath))),
      description: String(frontmatter.description ?? ''),
      bytes: stat.size,
      approxTokens: approxTokens(text),
      startupBehavior: kind === 'skill'
        ? 'listed by name/description; full body loads when invoked'
        : hasSkillsPreload
          ? 'custom subagent; skills preload at startup'
          : 'custom subagent; project memory/git status at startup',
      hasSkillsPreload,
      explicitFork,
      riskyPatterns: [
        stat.size > (kind === 'skill' ? skillCeilingBytes : agentCeilingBytes) ? 'oversized-body' : null,
        hasSkillsPreload ? 'skills-preload' : null,
        kind === 'skill' && /Dispatch\s+\d+\s+domain-specific auditor agents|parallel-dispatch/i.test(text) ? 'broad-parallel-dispatch' : null,
        kind === 'skill' && /outputs? (?:a |the )?(?:detailed|comprehensive)|detailed per-file|full scan/i.test(text) ? 'unbounded-output-risk' : null,
      ].filter(Boolean),
    });
  }

  records.sort((a, b) => b.bytes - a.bytes || a.path.localeCompare(b.path));
  return {
    skillCeilingBytes,
    agentCeilingBytes,
    records,
    violations: records.filter((record) => record.riskyPatterns.length > 0),
  };
}

function formatKb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

export function formatClaudeContextInventory(result, options = {}) {
  const limit = options.limit ?? 25;
  const lines = [];
  const skills = result.records.filter((record) => record.kind === 'skill');
  const agents = result.records.filter((record) => record.kind === 'agent');
  lines.push(`Scanned ${skills.length} skill(s) and ${agents.length} agent/subagent definition(s).`);
  lines.push(`Skill ceiling: ${formatKb(result.skillCeilingBytes)}; agent ceiling: ${formatKb(result.agentCeilingBytes)}.`);
  lines.push('');
  lines.push(`Top ${Math.min(limit, result.records.length)} largest Claude-facing artifacts:`);
  for (const record of result.records.slice(0, limit)) {
    const flags = record.riskyPatterns.length > 0 ? ` [${record.riskyPatterns.join(', ')}]` : '';
    lines.push(`  - ${record.path}: ${formatKb(record.bytes)}, ~${record.approxTokens} tokens, ${record.startupBehavior}${flags}`);
  }
  if (result.violations.length > 0) {
    lines.push('');
    lines.push('Flagged context risks:');
    for (const record of result.violations.slice(0, limit)) {
      lines.push(`  - ${record.path}: ${record.riskyPatterns.join(', ')}`);
    }
  }
  return lines.join('\n');
}

export async function main(argv = process.argv.slice(2)) {
  let rootDir = process.cwd();
  let strict = false;
  let limit = 25;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--root' && argv[i + 1]) {
      rootDir = path.resolve(argv[i + 1]);
      i += 1;
    } else if (arg.startsWith('--root=')) {
      rootDir = path.resolve(arg.slice('--root='.length));
    } else if (arg === '--limit' && argv[i + 1]) {
      limit = Number(argv[i + 1]);
      i += 1;
    } else if (arg.startsWith('--limit=')) {
      limit = Number(arg.slice('--limit='.length));
    } else if (arg === '--strict') {
      strict = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log('Usage: node tools/lint/claude-context-inventory.mjs [--root <repo>] [--limit N] [--strict]');
      return 0;
    }
  }

  const result = await scanClaudeContextInventory({ rootDir });
  const report = formatClaudeContextInventory(result, { limit });
  if (strict && result.violations.length > 0) {
    console.error(report);
    return 1;
  }
  console.log(report);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const code = await main();
  process.exitCode = code;
}
