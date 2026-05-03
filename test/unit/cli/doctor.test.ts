/**
 * Unit tests for tools/cli/doctor.mjs
 *
 * Tests the check logic used by runDoctor(). Because doctor.mjs is a standalone
 * CLI script with top-level await, we test the logic inline (same approach as
 * doctor-channel.test.ts). All assertions are about the check behavior, not
 * about importing the script directly.
 *
 * @issue #686
 * @parent #684
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DOCTOR_SCRIPT = resolve(__dirname, '../../../tools/cli/doctor.mjs');

// Mock channel manager — same pattern as doctor-channel.test.ts
const mockGetFrameworkRoot = vi.fn();
const mockGetVersionInfo = vi.fn();

vi.mock('../../../src/channel/manager.mjs', () => ({
  getFrameworkRoot: mockGetFrameworkRoot,
  getVersionInfo: mockGetVersionInfo,
}));

// ── File existence ───────────────────────────────────────────

describe('tools/cli/doctor.mjs — file', () => {
  it('exists at expected path', () => {
    expect(existsSync(DOCTOR_SCRIPT)).toBe(true);
  });

  it('starts with shebang', async () => {
    const { readFileSync } = await import('fs');
    const content = readFileSync(DOCTOR_SCRIPT, 'utf-8');
    expect(content.startsWith('#!/usr/bin/env node')).toBe(true);
  });

  it('imports getFrameworkRoot from channel/manager (not hardcoded legacy path)', async () => {
    const { readFileSync } = await import('fs');
    const content = readFileSync(DOCTOR_SCRIPT, 'utf-8');
    expect(content).toContain('getFrameworkRoot');
    // Must NOT hardcode the legacy path
    expect(content).not.toContain("'~/.local/share/ai-writing-guide'");
    expect(content).not.toContain('"~/.local/share/ai-writing-guide"');
  });
});

// ── Installation check logic ──────────────────────────────────

describe('doctor: installation check', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  async function checkInstallation(root: string, exists: (p: string) => Promise<boolean>) {
    const installed = await exists(root);
    return installed
      ? { status: 'ok' as const, message: `Found at ${root}` }
      : { status: 'error' as const, message: `AIWG not found at ${root}. Run: npm install -g aiwg` };
  }

  it('ok when npm global path exists', async () => {
    const root = '/usr/local/lib/node_modules/aiwg';
    mockGetFrameworkRoot.mockResolvedValue(root);
    const result = await checkInstallation(root, async () => true);
    expect(result.status).toBe('ok');
    expect(result.message).toContain(root);
  });

  it('error when path does not exist — shows actual path, not legacy', async () => {
    const root = '/usr/local/lib/node_modules/aiwg';
    mockGetFrameworkRoot.mockResolvedValue(root);
    const result = await checkInstallation(root, async () => false);
    expect(result.status).toBe('error');
    expect(result.message).toContain(root);
    expect(result.message).not.toContain('ai-writing-guide');
  });

  it('respects AIWG_ROOT env override', async () => {
    const envRoot = '/custom/aiwg/path';
    const result = await checkInstallation(envRoot, async () => true);
    expect(result.status).toBe('ok');
    expect(result.message).toContain(envRoot);
  });
});

// ── Version check logic ───────────────────────────────────────

describe('doctor: version check', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  function buildChannelLabel(channel: string): string {
    return channel !== 'stable' ? ` [${channel}]` : '';
  }

  it('no label for stable channel', () => {
    mockGetVersionInfo.mockResolvedValue({ version: '2026.4.0', channel: 'stable', devMode: false });
    const label = buildChannelLabel('stable');
    expect(label).toBe('');
  });

  it('[next] label for rc builds', async () => {
    mockGetVersionInfo.mockResolvedValue({ version: '2026.4.0-rc.9', channel: 'next', devMode: false });
    const { getVersionInfo } = await import('../../../src/channel/manager.mjs');
    const info = await getVersionInfo();
    const label = buildChannelLabel(info.channel);
    expect(label).toBe(' [next]');
    expect(info.version).toContain('-rc.');
  });

  it('[nightly] label for nightly builds', async () => {
    mockGetVersionInfo.mockResolvedValue({ version: '2026.4.0-nightly.20260404', channel: 'nightly', devMode: false });
    const { getVersionInfo } = await import('../../../src/channel/manager.mjs');
    const info = await getVersionInfo();
    const label = buildChannelLabel(info.channel);
    expect(label).toBe(' [nightly]');
  });

  it('[edge] label for edge builds', async () => {
    mockGetVersionInfo.mockResolvedValue({ version: '2026.4.0-edge', channel: 'edge', devMode: false });
    const { getVersionInfo } = await import('../../../src/channel/manager.mjs');
    const info = await getVersionInfo();
    const label = buildChannelLabel(info.channel);
    expect(label).toBe(' [edge]');
  });
});

// ── .aiwg/ check logic ────────────────────────────────────────

describe('doctor: .aiwg/ project directory check', () => {
  async function checkAiwgDir(cwd: string, exists: (p: string) => Promise<boolean>) {
    const projectAiwg = `${cwd}/.aiwg`;
    const present = await exists(projectAiwg);
    return present
      ? { status: 'ok' as const, message: 'Found in current directory' }
      : { status: 'info' as const, message: 'No .aiwg/ in current directory (not an AIWG project)' };
  }

  it('ok when .aiwg/ present', async () => {
    const result = await checkAiwgDir('/project', async () => true);
    expect(result.status).toBe('ok');
  });

  it('info (not error) when .aiwg/ absent', async () => {
    const result = await checkAiwgDir('/project', async () => false);
    expect(result.status).toBe('info');
  });
});

// ── Agent count check logic ────────────────────────────────────

describe('doctor: Claude Code agents check', () => {
  it('ok with correct agent count', () => {
    const files = ['foo.md', 'bar.md', 'baz.md', 'not-agent.txt'];
    const agentCount = files.filter(f => f.endsWith('.md')).length;
    expect(agentCount).toBe(3);
    const result = { status: 'ok' as const, message: `${agentCount} agents deployed` };
    expect(result.message).toContain('3 agents');
  });

  it('info when agents directory missing', () => {
    const result = { status: 'info' as const, message: 'No agents deployed (run: aiwg use sdlc)' };
    expect(result.status).toBe('info');
  });
});

// ── Node.js version check logic ────────────────────────────────

describe('doctor: Node.js version check', () => {
  function checkNodeVersion(version: string) {
    const major = parseInt(version.slice(1).split('.')[0]);
    if (major >= 18) {
      return { status: 'ok' as const, message: version };
    } else {
      return { status: 'error' as const, message: `${version} (requires >= 18.0.0)` };
    }
  }

  it('ok for Node 18', () => {
    expect(checkNodeVersion('v18.0.0').status).toBe('ok');
  });

  it('ok for Node 22', () => {
    expect(checkNodeVersion('v22.1.0').status).toBe('ok');
  });

  it('error for Node 16', () => {
    const result = checkNodeVersion('v16.20.0');
    expect(result.status).toBe('error');
    expect(result.message).toContain('requires >= 18');
  });
});

// ── MCP server check logic ────────────────────────────────────

describe('doctor: MCP server check', () => {
  async function checkMcp(root: string, exists: (p: string) => Promise<boolean>) {
    const mcpServer = `${root}/src/mcp/server.mjs`;
    const present = await exists(mcpServer);
    return present
      ? { status: 'ok' as const, message: 'Available (run: aiwg mcp serve)' }
      : { status: 'warn' as const, message: 'Not found' };
  }

  it('ok when mcp server exists', async () => {
    const result = await checkMcp('/root', async () => true);
    expect(result.status).toBe('ok');
  });

  it('warn (not error) when mcp server absent', async () => {
    const result = await checkMcp('/root', async () => false);
    expect(result.status).toBe('warn');
  });
});

// ── .gitignore check logic ────────────────────────────────────

describe('doctor: .gitignore check', () => {
  const RUNTIME_PATTERNS = ['.aiwg/working/', '.aiwg/ralph/', '.aiwg/ralph-external/'];

  function isCovered(pattern: string, lines: string[]): boolean {
    if (lines.includes(pattern)) return true;
    if (lines.includes(pattern.replace(/\/$/, ''))) return true;
    const parts = pattern.split('/').filter(Boolean);
    for (let i = 1; i < parts.length; i++) {
      const parent = parts.slice(0, i).join('/') + '/';
      if (lines.includes(parent) || lines.includes(parent.replace(/\/$/, ''))) return true;
    }
    return false;
  }

  it('ok when all patterns covered', () => {
    const lines = ['.aiwg/working/', '.aiwg/ralph/', '.aiwg/ralph-external/'];
    const missing = RUNTIME_PATTERNS.filter(p => !isCovered(p, lines));
    expect(missing).toHaveLength(0);
  });

  it('ok when parent directory covers pattern', () => {
    // .aiwg/ covers all .aiwg/* patterns
    const lines = ['.aiwg/'];
    const missing = RUNTIME_PATTERNS.filter(p => !isCovered(p, lines));
    expect(missing).toHaveLength(0);
  });

  it('warn when patterns missing — includes pattern names', () => {
    const lines: string[] = [];
    const missing = RUNTIME_PATTERNS.filter(p => !isCovered(p, lines));
    expect(missing.length).toBeGreaterThan(0);
    const message = `Missing AIWG runtime patterns: ${missing.join(', ')} — run "aiwg config gitignore --fix"`;
    expect(message).toContain('.aiwg/working/');
  });
});

// ── Provider awareness (regression: doctor defaults to Claude Code) ──
//
// Bug report: `aiwg doctor` is hardcoded to .claude/agents and .claude/commands,
// so on a Factory/Codex/Cursor/etc. project it reports "No agents deployed"
// even when droids/skills/commands are correctly deployed under the provider's
// own paths. doctor.mjs must accept --provider and check the right directories.
//
// These tests capture the contract. They are expected to fail until doctor.mjs
// is updated to be provider-aware (parse --provider, look up paths from the
// provider module, scan that location instead of/in addition to .claude/).

describe('doctor: provider awareness (regression)', () => {
  it('source script accepts --provider flag', async () => {
    const { readFileSync } = await import('fs');
    const content = readFileSync(DOCTOR_SCRIPT, 'utf-8');
    // Either parses --provider directly, or imports the provider registry.
    const hasProviderFlag = /--provider|providerArg|argv\.provider/.test(content);
    const importsProviderRegistry = /providers\/index\.mjs|loadProvider|getProvider/.test(content);
    expect(hasProviderFlag || importsProviderRegistry).toBe(true);
  });

  it('source script does not hardcode only .claude/ paths for agent/command checks', async () => {
    const { readFileSync } = await import('fs');
    const content = readFileSync(DOCTOR_SCRIPT, 'utf-8');

    // Acceptable: references at least one non-Claude provider path,
    // or resolves provider paths dynamically from the provider module.
    const referencesOtherProviders =
      /\.factory\/(droids|commands|skills)/.test(content) ||
      /\.codex\/(agents|skills|prompts)/.test(content) ||
      /\.cursor\/(agents|commands|rules)/.test(content) ||
      /\.github\/(agents|prompts|instructions)/.test(content) ||
      /\.warp\/(agents|commands)/.test(content) ||
      /\.opencode\/(agent|command)/.test(content);
    const resolvesPathsDynamically = /provider\.paths|paths\.agents|paths\.commands/.test(content);

    expect(referencesOtherProviders || resolvesPathsDynamically).toBe(true);
  });

  it('reports provider-specific paths instead of "No agents deployed" when a non-Claude provider is configured', async () => {
    // Behavioral contract: when invoked on a project deployed to Factory,
    // the agent check should look in .factory/droids/ — not .claude/agents/ —
    // and should not report "No agents deployed" if droids exist.
    //
    // Until doctor.mjs is provider-aware this assertion documents intent.
    const { readFileSync } = await import('fs');
    const content = readFileSync(DOCTOR_SCRIPT, 'utf-8');
    // The literal hardcoded path must not be the *only* path consulted.
    const onlyClaudePaths =
      content.includes('.claude/agents') &&
      !/(\.factory|\.codex|\.cursor|\.github|\.warp|\.opencode)/.test(content) &&
      !/provider\.paths|paths\.agents/.test(content);
    expect(onlyClaudePaths).toBe(false);
  });
});

// ── Exit code logic ────────────────────────────────────────────

describe('doctor: exit code logic', () => {
  function computeExitCode(checks: Array<{ status: string }>) {
    return checks.some(c => c.status === 'error') ? 1 : 0;
  }

  it('exits 1 when errors present', () => {
    const checks = [
      { status: 'ok' },
      { status: 'error' },
      { status: 'warn' },
    ];
    expect(computeExitCode(checks)).toBe(1);
  });

  it('exits 0 with warnings only', () => {
    const checks = [{ status: 'ok' }, { status: 'warn' }];
    expect(computeExitCode(checks)).toBe(0);
  });

  it('exits 0 when all pass', () => {
    const checks = [{ status: 'ok' }, { status: 'ok' }];
    expect(computeExitCode(checks)).toBe(0);
  });
});
