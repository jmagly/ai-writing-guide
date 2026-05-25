#!/usr/bin/env node
/**
 * AIWG Runtime Info Script
 *
 * Detects the current runtime environment (provider, platform, tools).
 * Called by `aiwg sync` to gather environment context before syncing.
 *
 * @issue #685
 */

import os from 'os';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

const args = process.argv.slice(2);
const json = args.includes('--json');

function detectProviderFromProcessTree(pid = process.pid) {
  let current = pid;
  const seen = new Set();
  for (let depth = 0; depth < 12 && current > 1 && !seen.has(current); depth += 1) {
    seen.add(current);
    try {
      const stat = readFileSync(`/proc/${current}/stat`, 'utf8');
      const end = stat.lastIndexOf(')');
      const fields = stat.slice(end + 2).split(' ');
      const ppid = Number(fields[1]);
      const cmdline = readFileSync(`/proc/${current}/cmdline`, 'utf8').replace(/\0/g, ' ').toLowerCase();
      if (cmdline.includes('@openai/codex') || /(?:^|[\/\s])codex(?:$|[\s\/])/.test(cmdline)) return 'codex';
      if (cmdline.includes('claude-code') || /(?:^|[\/\s])claude(?:$|[\s\/])/.test(cmdline)) return 'claude';
      current = Number.isFinite(ppid) ? ppid : 0;
    } catch {
      return null;
    }
  }
  return null;
}

function detectProvider() {
  const explicit = process.env.AIWG_PROVIDER || process.env.CLAUDECODE_PROVIDER;
  if (explicit === 'openai') return 'codex';
  if (explicit === 'claude-code') return 'claude';
  if (explicit) return explicit;
  if (process.env.CODEX_SANDBOX || process.env.CODEX_HOME || process.env.CODEX_API_KEY || process.env.OPENAI_API_KEY) return 'codex';
  if (process.env.CURSOR_TRACE_ID || process.env.CURSOR_VERSION) return 'cursor';
  if (process.env.WINDSURF_VERSION) return 'windsurf';
  if (process.env.WARP_SESSION_ID || process.env.WARP_TERMINAL) return 'warp';
  if (process.env.COPILOT_AGENT || process.env.GITHUB_COPILOT_TOKEN) return 'copilot';
  if (process.env.FACTORY_AGENT_ID) return 'factory';
  if (process.env.OPENCODE_VERSION) return 'opencode';
  if (process.env.OPENCLAW_VERSION) return 'openclaw';
  if (process.env.CLAUDE_CODE_VERSION || process.env.ANTHROPIC_API_KEY) return 'claude';
  return detectProviderFromProcessTree() || 'unknown';
}
function getNodeVersion() {
  return process.version;
}

function getNpmVersion() {
  try {
    return execSync('npm --version', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return 'unknown';
  }
}

const info = {
  provider: detectProvider(),
  platform: os.platform(),
  arch: os.arch(),
  node: getNodeVersion(),
  npm: getNpmVersion(),
  cwd: process.cwd(),
};

if (json) {
  console.log(JSON.stringify(info, null, 2));
} else {
  console.log(`  Provider: ${info.provider}`);
  console.log(`  Platform: ${info.platform}/${info.arch}`);
  console.log(`  Node:     ${info.node}`);
  console.log(`  npm:      ${info.npm}`);
}
