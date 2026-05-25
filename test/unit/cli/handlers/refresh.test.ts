/**
 * Unit tests for refresh.ts handler (formerly sync)
 *
 * @issue #685, #694
 * @parent #684
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import type { HandlerContext } from '../../../../src/cli/handlers/types.js';

// ── Mocks ────────────────────────────────────────────────────

const { mockRun, mockRefreshAllPackages, mockReadAiwgConfig, mockHashManifest } = vi.hoisted(() => ({
  mockRun: vi.fn().mockResolvedValue({ exitCode: 0 }),
  mockRefreshAllPackages: vi.fn().mockResolvedValue([]),
  mockReadAiwgConfig: vi.fn().mockResolvedValue(null),
  mockHashManifest: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../../../src/cli/handlers/script-runner.js', () => ({
  createScriptRunner: vi.fn(() => ({ run: mockRun })),
}));

vi.mock('../../../../src/channel/manager.mjs', () => ({
  getFrameworkRoot: vi.fn().mockResolvedValue('/mock/framework/root'),
}));

vi.mock('../../../../src/packages/registry.js', () => ({
  refreshAllPackages: mockRefreshAllPackages,
}));

vi.mock('../../../../src/config/aiwg-config.js', () => ({
  readAiwgConfig: mockReadAiwgConfig,
  hashManifest: mockHashManifest,
}));

vi.mock('../../../../src/cli/ui.js', () => ({
  blank: vi.fn(),
  rule: vi.fn(),
  info: vi.fn(),
  success: vi.fn(),
  warn: vi.fn(),
  dim: vi.fn(),
  bold: vi.fn((s: string) => s),
  brandMark: vi.fn(() => '◆'),
  dimText: vi.fn((s: string) => s),
  header: vi.fn(),
  accent: vi.fn((s: string) => s),
  error: vi.fn(),
  channelLabel: vi.fn((s: string) => `[${s}]`),
}));

import { refreshHandler, pruneStaleManagedAgentFiles } from '../../../../src/cli/handlers/refresh.js';
// Backward-compat alias for existing test references
const syncHandler = refreshHandler;

const savedProcessProvider = process.env.AIWG_TEST_PROCESS_PROVIDER;

// ── Helpers ───────────────────────────────────────────────────

function makeCtx(args: string[] = []): HandlerContext {
  return {
    args,
    rawArgs: ['sync', ...args],
    cwd: '/mock/cwd',
    frameworkRoot: '/mock/framework/root',
  };
}

// ── Tests ─────────────────────────────────────────────────────

beforeEach(() => {
  process.env.AIWG_TEST_PROCESS_PROVIDER = 'codex';
});

afterEach(() => {
  if (savedProcessProvider === undefined) {
    delete process.env.AIWG_TEST_PROCESS_PROVIDER;
  } else {
    process.env.AIWG_TEST_PROCESS_PROVIDER = savedProcessProvider;
  }
});

describe('refreshHandler metadata', () => {
  it('has correct id, category, and description', () => {
    expect(syncHandler.id).toBe('refresh');
    expect(syncHandler.category).toBe('maintenance');
    expect(syncHandler.description).toMatch(/refresh/i);
    expect(typeof syncHandler.execute).toBe('function');
  });

  it('has sync as a deprecated alias', () => {
    expect(syncHandler.aliases).toContain('sync');
    expect(syncHandler.aliases).toContain('--sync');
  });
});

describe('syncHandler.execute — default run (no flags)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRun.mockResolvedValue({ exitCode: 0 });
  });

  it('exits 0 and runs all 5 scripts in order', async () => {
    const result = await syncHandler.execute(makeCtx());
    expect(result.exitCode).toBe(0);

    const calls = mockRun.mock.calls.map(([script]: [string]) => script);
    expect(calls).toContain('tools/cli/runtime-info.mjs');
    expect(calls).toContain('tools/cli/version.mjs');
    expect(calls).toContain('tools/cli/update.mjs');
    expect(calls).toContain('tools/cli/deploy.mjs');
    expect(calls).toContain('tools/cli/doctor.mjs');
  });

  it('calls refreshAllPackages', async () => {
    await syncHandler.execute(makeCtx());
    expect(mockRefreshAllPackages).toHaveBeenCalled();
  });
});

describe('syncHandler.execute — --dry-run', () => {
  beforeEach(() => { vi.clearAllMocks(); mockRun.mockResolvedValue({ exitCode: 0 }); });

  it('does not spawn update, deploy, or doctor scripts', async () => {
    const result = await syncHandler.execute(makeCtx(['--dry-run']));
    expect(result.exitCode).toBe(0);

    const calls = mockRun.mock.calls.map(([script]: [string]) => script);
    // runtime-info and version are still called (read-only)
    expect(calls).toContain('tools/cli/runtime-info.mjs');
    expect(calls).toContain('tools/cli/version.mjs');
    // destructive scripts must not run in dry-run
    expect(calls).not.toContain('tools/cli/update.mjs');
    expect(calls).not.toContain('tools/cli/deploy.mjs');
    expect(calls).not.toContain('tools/cli/doctor.mjs');
  });

  it('does not call refreshAllPackages in dry-run', async () => {
    await syncHandler.execute(makeCtx(['--dry-run']));
    expect(mockRefreshAllPackages).not.toHaveBeenCalled();
  });
});

describe('syncHandler.execute — --skip-update', () => {
  beforeEach(() => { vi.clearAllMocks(); mockRun.mockResolvedValue({ exitCode: 0 }); });

  it('does not call update.mjs', async () => {
    await syncHandler.execute(makeCtx(['--skip-update']));
    const calls = mockRun.mock.calls.map(([script]: [string]) => script);
    expect(calls).not.toContain('tools/cli/update.mjs');
    // but deploy and doctor still run
    expect(calls).toContain('tools/cli/deploy.mjs');
    expect(calls).toContain('tools/cli/doctor.mjs');
  });
});

describe('syncHandler.execute — --packages-only', () => {
  beforeEach(() => { vi.clearAllMocks(); mockRun.mockResolvedValue({ exitCode: 0 }); });

  it('only refreshes packages, does not run deploy or doctor', async () => {
    const result = await syncHandler.execute(makeCtx(['--packages-only']));
    expect(result.exitCode).toBe(0);
    expect(mockRefreshAllPackages).toHaveBeenCalled();

    const calls = mockRun.mock.calls.map(([script]: [string]) => script);
    expect(calls).not.toContain('tools/cli/update.mjs');
    expect(calls).not.toContain('tools/cli/deploy.mjs');
    expect(calls).not.toContain('tools/cli/doctor.mjs');
  });
});

describe('syncHandler.execute — --channel', () => {
  beforeEach(() => { vi.clearAllMocks(); mockRun.mockResolvedValue({ exitCode: 0 }); });

  it('passes --channel next to update.mjs', async () => {
    await syncHandler.execute(makeCtx(['--channel', 'next']));
    const updateCall = mockRun.mock.calls.find(([script]: [string]) => script === 'tools/cli/update.mjs');
    expect(updateCall).toBeDefined();
    expect(updateCall![1]).toContain('--channel');
    expect(updateCall![1]).toContain('next');
  });

  it('passes no channel args when no --channel flag', async () => {
    await syncHandler.execute(makeCtx());
    const updateCall = mockRun.mock.calls.find(([script]: [string]) => script === 'tools/cli/update.mjs');
    expect(updateCall).toBeDefined();
    expect(updateCall![1]).toEqual([]);
  });
});

describe('syncHandler.execute — --provider', () => {
  beforeEach(() => { vi.clearAllMocks(); mockRun.mockResolvedValue({ exitCode: 0 }); });

  it('passes --provider copilot to deploy.mjs', async () => {
    await syncHandler.execute(makeCtx(['--provider', 'copilot']));
    const deployCalls = mockRun.mock.calls.filter(([script]: [string]) => script === 'tools/cli/deploy.mjs');
    expect(deployCalls.length).toBeGreaterThan(0);
    const deployArgs = deployCalls[0][1];
    expect(deployArgs).toContain('--provider');
    expect(deployArgs).toContain('copilot');
  });
});

describe('syncHandler.execute — --frameworks', () => {
  beforeEach(() => { vi.clearAllMocks(); mockRun.mockResolvedValue({ exitCode: 0 }); });

  it('calls deploy.mjs once per framework when --frameworks sdlc,research', async () => {
    await syncHandler.execute(makeCtx(['--frameworks', 'sdlc,research']));
    const deployCalls = mockRun.mock.calls.filter(([script]: [string]) => script === 'tools/cli/deploy.mjs');
    // Should deploy sdlc and research separately
    expect(deployCalls.length).toBe(2);
    const deployTargets = deployCalls.map(([, args]: [string, string[]]) => args[0]);
    expect(deployTargets).toContain('sdlc');
    expect(deployTargets).toContain('research');
  });

  it('calls deploy.mjs with "all" when no --frameworks flag', async () => {
    await syncHandler.execute(makeCtx());
    const deployCalls = mockRun.mock.calls.filter(([script]: [string]) => script === 'tools/cli/deploy.mjs');
    expect(deployCalls.length).toBe(1);
    expect(deployCalls[0][1][0]).toBe('all');
  });
});

describe('syncHandler.execute — --quiet', () => {
  beforeEach(() => { vi.clearAllMocks(); mockRun.mockResolvedValue({ exitCode: 0 }); });

  it('writes JSON to stdout and exits 0', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const result = await syncHandler.execute(makeCtx(['--quiet']));
      expect(result.exitCode).toBe(0);
      // JSON output: last console.log call should be parseable JSON
      const jsonCalls = consoleSpy.mock.calls.filter(([arg]) => {
        try { JSON.parse(arg); return true; } catch { return false; }
      });
      expect(jsonCalls.length).toBeGreaterThan(0);
      const parsed = JSON.parse(jsonCalls[0][0]);
      expect(parsed).toHaveProperty('status');
      expect(parsed).toHaveProperty('provider');
    } finally {
      consoleSpy.mockRestore();
    }
  });
});

describe('syncHandler.execute — missing deploy.mjs resilience', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('warns and continues when deploy.mjs returns non-zero (not silent exit 254)', async () => {
    mockRun.mockImplementation(async (script: string) => {
      if (script === 'tools/cli/deploy.mjs') return { exitCode: 1 };
      return { exitCode: 0 };
    });

    const result = await syncHandler.execute(makeCtx());
    // sync should complete, not crash
    expect(result.exitCode).toBe(0);
  });

  it('warns and continues when update.mjs returns non-zero', async () => {
    mockRun.mockImplementation(async (script: string) => {
      if (script === 'tools/cli/update.mjs') return { exitCode: 1 };
      return { exitCode: 0 };
    });

    const result = await syncHandler.execute(makeCtx());
    expect(result.exitCode).toBe(0);
  });

  it('warns but returns exit 0 when doctor reports issues', async () => {
    mockRun.mockImplementation(async (script: string) => {
      if (script === 'tools/cli/doctor.mjs') return { exitCode: 1 };
      return { exitCode: 0 };
    });

    const result = await syncHandler.execute(makeCtx());
    expect(result.exitCode).toBe(0);
  });
});

describe('syncHandler.execute — stale deployment detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRun.mockResolvedValue({ exitCode: 0 });
    mockRefreshAllPackages.mockResolvedValue([]);
  });

  it('skips stale check when no aiwg.config present', async () => {
    mockReadAiwgConfig.mockResolvedValue(null);
    const result = await syncHandler.execute(makeCtx());
    expect(result.exitCode).toBe(0);
    // hashManifest should not be called if config is null
    expect(mockHashManifest).not.toHaveBeenCalled();
  });

  it('detects stale frameworks when manifest hash differs (exits 0, stale is non-fatal)', async () => {
    mockReadAiwgConfig.mockResolvedValue({
      installed: {
        sdlc: { manifestHash: 'old-hash' },
      },
    });
    mockHashManifest.mockResolvedValue('new-hash');

    // Stale detection is non-fatal — sync still exits 0 regardless of stale detection result
    const result = await syncHandler.execute(makeCtx());
    expect(result.exitCode).toBe(0);
  });

  it('reports all up to date when hashes match', async () => {
    mockReadAiwgConfig.mockResolvedValue({
      installed: {
        sdlc: { manifestHash: 'same-hash' },
      },
    });
    mockHashManifest.mockResolvedValue('same-hash');

    const result = await syncHandler.execute(makeCtx());
    expect(result.exitCode).toBe(0);
  });
});

describe('refreshHandler stale AIWG-managed agent cleanup (#1460)', () => {
  it('removes bundled managed agent files that no longer exist in current sources', async () => {
    const root = mkdtempSync(join(tmpdir(), 'aiwg-refresh-orphan-'));
    try {
      const frameworkRoot = join(root, 'framework-root');
      const projectRoot = join(root, 'project');
      mkdirSync(join(frameworkRoot, 'agentic/code/frameworks/forensics-complete/agents'), { recursive: true });
      mkdirSync(join(projectRoot, '.claude/agents'), { recursive: true });

      writeFileSync(
        join(frameworkRoot, 'agentic/code/frameworks/forensics-complete/agents/forensic-acquisition-agent.md'),
        '---\nname: Forensic Acquisition Agent\nmodel: claude-sonnet-4-6\n---\n',
      );
      writeFileSync(
        join(projectRoot, '.claude/agents/forensic-acquisition-agent.md'),
        '---\n# aiwg:managed v2026.5.10 bundled\nname: Forensic Acquisition Agent\nmodel: claude-sonnet-4-6\n---\n',
      );
      writeFileSync(
        join(projectRoot, '.claude/agents/acquisition-agent.md'),
        '---\n# aiwg:managed v2026.5.0-rc.7 bundled\nname: Acquisition Agent\nmodel: sonnet\n---\n',
      );
      writeFileSync(
        join(projectRoot, '.claude/agents/operator-agent.md'),
        '---\nname: Operator Agent\nmodel: sonnet\n---\n',
      );

      const removed = await pruneStaleManagedAgentFiles({ projectRoot, frameworkRoot, provider: 'claude' });

      expect(removed).toEqual(['.claude/agents/acquisition-agent.md']);
      expect(existsSync(join(projectRoot, '.claude/agents/acquisition-agent.md'))).toBe(false);
      expect(existsSync(join(projectRoot, '.claude/agents/forensic-acquisition-agent.md'))).toBe(true);
      expect(existsSync(join(projectRoot, '.claude/agents/operator-agent.md'))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('reports stale bundled agent files in dry-run without deleting them', async () => {
    const root = mkdtempSync(join(tmpdir(), 'aiwg-refresh-orphan-dry-'));
    try {
      const frameworkRoot = join(root, 'framework-root');
      const projectRoot = join(root, 'project');
      mkdirSync(join(frameworkRoot, 'agentic/code/frameworks/sdlc-complete/agents'), { recursive: true });
      mkdirSync(join(projectRoot, '.claude/agents'), { recursive: true });
      writeFileSync(join(frameworkRoot, 'agentic/code/frameworks/sdlc-complete/agents/current-agent.md'), '---\nname: Current\n---\n');
      writeFileSync(
        join(projectRoot, '.claude/agents/old-agent.md'),
        '---\n# aiwg:managed v2026.5.0-rc.7 bundled\nname: Old\nmodel: sonnet\n---\n',
      );

      const removed = await pruneStaleManagedAgentFiles({ projectRoot, frameworkRoot, provider: 'claude', dryRun: true });

      expect(removed).toEqual(['.claude/agents/old-agent.md']);
      expect(existsSync(join(projectRoot, '.claude/agents/old-agent.md'))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('sync integration: all 5 script paths exist on disk', () => {
  // Derive repo root from this file's location: test/unit/cli/handlers/ → 4 levels up
  const REPO_ROOT = resolve(new URL('.', import.meta.url).pathname, '../../../../');

  it('runtime-info.mjs exists', () => {
    expect(existsSync(resolve(REPO_ROOT, 'tools/cli/runtime-info.mjs'))).toBe(true);
  });

  it('version.mjs exists', () => {
    expect(existsSync(resolve(REPO_ROOT, 'tools/cli/version.mjs'))).toBe(true);
  });

  it('update.mjs exists', () => {
    expect(existsSync(resolve(REPO_ROOT, 'tools/cli/update.mjs'))).toBe(true);
  });

  it('deploy.mjs exists', () => {
    expect(existsSync(resolve(REPO_ROOT, 'tools/cli/deploy.mjs'))).toBe(true);
  });

  it('doctor.mjs exists', () => {
    expect(existsSync(resolve(REPO_ROOT, 'tools/cli/doctor.mjs'))).toBe(true);
  });
});
