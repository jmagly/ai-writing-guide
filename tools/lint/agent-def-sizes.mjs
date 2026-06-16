#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const AGENT_DEF_CEILING_BYTES = 16 * 1024;

export const DEPLOYED_AGENT_DIRS = [
  '.claude/agents',
  '.codex/agents',
  '.cursor/agents',
  '.factory/droids',
  '.github/agents',
  '.opencode/agent',
  '.warp/agents',
  '.windsurf/agents',
];

export const AGENT_DEF_SIZE_ALLOWLIST = {
  'security-auditor': 'Documented #1587 gate-dense outlier; keep under review while CI blocks all other regrowth.',
};

const AGENT_FILE_RE = /\.(?:agent\.md|soul\.md|md)$/;

export function agentIdFromFilename(filename) {
  return filename
    .replace(/\.agent\.md$/, '')
    .replace(/\.soul\.md$/, '')
    .replace(/\.md$/, '');
}

async function maybeStat(filePath) {
  try {
    return await fs.stat(filePath);
  } catch {
    return null;
  }
}

async function listAgentFiles(rootDir, relDir) {
  const dir = path.join(rootDir, relDir);
  const stat = await maybeStat(dir);
  if (!stat?.isDirectory()) return [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && AGENT_FILE_RE.test(entry.name))
    .map((entry) => path.join(dir, entry.name));
}

export async function scanDeployedAgentDefSizes(options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const ceilingBytes = options.ceilingBytes ?? AGENT_DEF_CEILING_BYTES;
  const deployedAgentDirs = options.deployedAgentDirs ?? DEPLOYED_AGENT_DIRS;
  const allowlist = options.allowlist ?? AGENT_DEF_SIZE_ALLOWLIST;

  const scanned = [];
  const violations = [];
  const allowedOversized = [];

  for (const relDir of deployedAgentDirs) {
    const files = await listAgentFiles(rootDir, relDir);
    for (const filePath of files) {
      const stat = await maybeStat(filePath);
      if (!stat?.isFile()) continue;
      const relPath = path.relative(rootDir, filePath);
      const filename = path.basename(filePath);
      const agentId = agentIdFromFilename(filename);
      const record = {
        agentId,
        path: relPath,
        size: stat.size,
      };
      scanned.push(record);
      if (stat.size <= ceilingBytes) continue;
      if (allowlist[agentId]) {
        allowedOversized.push({ ...record, rationale: allowlist[agentId] });
      } else {
        violations.push(record);
      }
    }
  }

  return {
    ceilingBytes,
    scanned,
    violations,
    allowedOversized,
  };
}

function formatKb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

export function formatAgentDefSizeReport(result) {
  const lines = [];
  lines.push(`Scanned ${result.scanned.length} deployed agent definition(s); ceiling ${formatKb(result.ceilingBytes)}.`);
  if (result.allowedOversized.length > 0) {
    lines.push('');
    lines.push('Allowed oversized definitions:');
    for (const item of result.allowedOversized.sort((a, b) => b.size - a.size)) {
      lines.push(`  - ${item.path} (${formatKb(item.size)}) — ${item.rationale}`);
    }
  }
  if (result.violations.length > 0) {
    lines.push('');
    lines.push('Oversized deployed agent definitions:');
    for (const item of result.violations.sort((a, b) => b.size - a.size)) {
      lines.push(`  - ${item.path} (${formatKb(item.size)})`);
    }
    lines.push('');
    lines.push('Externalize worked examples or repeated rule boilerplate to the discoverable examples catalog, then redeploy.');
  }
  return lines.join('\n');
}

export async function main(argv = process.argv.slice(2)) {
  let rootDir = process.cwd();
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--root' && argv[i + 1]) {
      rootDir = path.resolve(argv[i + 1]);
      i += 1;
    } else if (arg.startsWith('--root=')) {
      rootDir = path.resolve(arg.slice('--root='.length));
    } else if (arg === '--help' || arg === '-h') {
      console.log('Usage: node tools/lint/agent-def-sizes.mjs [--root <repo>]');
      return 0;
    }
  }

  const result = await scanDeployedAgentDefSizes({ rootDir });
  const report = formatAgentDefSizeReport(result);
  if (result.violations.length > 0) {
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
