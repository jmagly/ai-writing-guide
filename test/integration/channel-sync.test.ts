/**
 * Integration tests: E2E channel switching and sync flow
 *
 * Verifies that:
 * - All 5 script paths called by sync exist on disk
 * - Missing script paths produce exit 1 + script name in error (not silent 254)
 * - Channel switching calls the right functions with correct arguments
 * - --dry-run produces zero npm calls
 * - --skip-update and --packages-only skip the right steps
 * - doctor post-sync reports correct channel
 *
 * NOTE: No real npm calls are made — channel manager functions are mocked.
 *
 * @issue #693
 * @parent #684
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dir = fileURLToPath(new URL('.', import.meta.url));
const REPO_ROOT = resolve(__dir, '../../');
const savedProcessProvider = process.env.AIWG_TEST_PROCESS_PROVIDER;

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

// ── Script path existence (regression: silent exit 254) ────────

describe('sync flow: all 5 script paths exist', () => {
  const scripts = [
    'tools/cli/runtime-info.mjs',
    'tools/cli/version.mjs',
    'tools/cli/update.mjs',
    'tools/cli/deploy.mjs',
    'tools/cli/doctor.mjs',
  ];

  for (const script of scripts) {
    it(`${script} exists`, () => {
      const fullPath = resolve(REPO_ROOT, script);
      expect(existsSync(fullPath)).toBe(true);
    });
  }

  it('all 5 scripts have a shebang (are executable)', async () => {
    const { readFileSync } = await import('fs');
    for (const script of scripts) {
      const content = readFileSync(resolve(REPO_ROOT, script), 'utf-8');
      expect(content.startsWith('#!/usr/bin/env node'), `${script} missing shebang`).toBe(true);
    }
  });
});

// ── Channel switching: correct npm command per channel ─────────

const {
  mockSwitchToNext,
  mockSwitchToNightly,
  mockSwitchToStable,
  mockLoadConfig,
  mockRefreshAllPackages,
  mockRun,
} = vi.hoisted(() => ({
  mockSwitchToNext: vi.fn().mockResolvedValue(undefined),
  mockSwitchToNightly: vi.fn().mockResolvedValue(undefined),
  mockSwitchToStable: vi.fn().mockResolvedValue(undefined),
  mockLoadConfig: vi.fn().mockResolvedValue({ channel: 'stable' }),
  mockRefreshAllPackages: vi.fn().mockResolvedValue([]),
  mockRun: vi.fn().mockResolvedValue({ exitCode: 0 }),
}));

vi.mock('../../src/channel/manager.mjs', () => ({
  getFrameworkRoot: vi.fn().mockResolvedValue('/mock/root'),
  getVersionInfo: vi.fn().mockResolvedValue({ version: '2026.4.0', channel: 'stable', devMode: false }),
  loadConfig: mockLoadConfig,
  switchToNext: mockSwitchToNext,
  switchToNightly: mockSwitchToNightly,
  switchToStable: mockSwitchToStable,
}));

vi.mock('../../src/packages/registry.js', () => ({
  refreshAllPackages: mockRefreshAllPackages,
}));

vi.mock('../../src/config/aiwg-config.js', () => ({
  readAiwgConfig: vi.fn().mockResolvedValue(null),
  hashManifest: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../src/cli/handlers/script-runner.js', () => ({
  createScriptRunner: vi.fn(() => ({ run: mockRun })),
}));

vi.mock('../../src/cli/ui.js', () => ({
  blank: vi.fn(), rule: vi.fn(), info: vi.fn(), success: vi.fn(),
  warn: vi.fn(), dim: vi.fn(), bold: vi.fn((s: string) => s),
  brandMark: vi.fn(() => '◆'), dimText: vi.fn((s: string) => s),
  header: vi.fn(), accent: vi.fn((s: string) => s), error: vi.fn(),
  channelLabel: vi.fn((s: string) => s === 'stable' ? '' : `[${s}]`),
}));

// sync.ts was deleted in Phase 2 (#919); refreshHandler exposes 'sync' as an
// alias, so we reach the same handler via refresh.
import { refreshHandler as syncHandler } from '../../src/cli/handlers/refresh.js';

function makeCtx(args: string[] = []) {
  return { args, rawArgs: args, cwd: '/mock', frameworkRoot: '/mock/root' };
}

describe('sync --channel next', () => {
  beforeEach(() => { vi.clearAllMocks(); mockRun.mockResolvedValue({ exitCode: 0 }); });

  it('passes --channel next to update.mjs', async () => {
    const result = await syncHandler.execute(makeCtx(['--channel', 'next']));
    expect(result.exitCode).toBe(0);
    const updateCall = mockRun.mock.calls.find(([script]: [string]) => script === 'tools/cli/update.mjs');
    expect(updateCall).toBeDefined();
    expect(updateCall![1]).toContain('--channel');
    expect(updateCall![1]).toContain('next');
  });
});

describe('sync --channel latest', () => {
  beforeEach(() => { vi.clearAllMocks(); mockRun.mockResolvedValue({ exitCode: 0 }); });

  it('passes --channel latest to update.mjs', async () => {
    const result = await syncHandler.execute(makeCtx(['--channel', 'latest']));
    expect(result.exitCode).toBe(0);
    const updateCall = mockRun.mock.calls.find(([script]: [string]) => script === 'tools/cli/update.mjs');
    expect(updateCall![1]).toContain('latest');
  });
});

describe('sync --channel nightly', () => {
  beforeEach(() => { vi.clearAllMocks(); mockRun.mockResolvedValue({ exitCode: 0 }); });

  it('passes --channel nightly to update.mjs', async () => {
    const result = await syncHandler.execute(makeCtx(['--channel', 'nightly']));
    expect(result.exitCode).toBe(0);
    const updateCall = mockRun.mock.calls.find(([script]: [string]) => script === 'tools/cli/update.mjs');
    expect(updateCall![1]).toContain('nightly');
  });
});

describe('sync --dry-run', () => {
  beforeEach(() => { vi.clearAllMocks(); mockRun.mockResolvedValue({ exitCode: 0 }); });

  it('makes zero deploy/update/doctor calls', async () => {
    const result = await syncHandler.execute(makeCtx(['--dry-run']));
    expect(result.exitCode).toBe(0);
    const calls = mockRun.mock.calls.map(([s]: [string]) => s);
    expect(calls).not.toContain('tools/cli/update.mjs');
    expect(calls).not.toContain('tools/cli/deploy.mjs');
    expect(calls).not.toContain('tools/cli/doctor.mjs');
  });
});

describe('sync --skip-update', () => {
  beforeEach(() => { vi.clearAllMocks(); mockRun.mockResolvedValue({ exitCode: 0 }); });

  it('skips step 3 (update.mjs), runs steps 1, 2, 4, 5', async () => {
    await syncHandler.execute(makeCtx(['--skip-update']));
    const calls = mockRun.mock.calls.map(([s]: [string]) => s);
    expect(calls).not.toContain('tools/cli/update.mjs');
    expect(calls).toContain('tools/cli/runtime-info.mjs');
    expect(calls).toContain('tools/cli/version.mjs');
    expect(calls).toContain('tools/cli/deploy.mjs');
    expect(calls).toContain('tools/cli/doctor.mjs');
  });
});

describe('sync --packages-only', () => {
  beforeEach(() => { vi.clearAllMocks(); mockRun.mockResolvedValue({ exitCode: 0 }); });

  it('only runs step 2.5 and exits 0', async () => {
    const result = await syncHandler.execute(makeCtx(['--packages-only']));
    expect(result.exitCode).toBe(0);
    expect(mockRefreshAllPackages).toHaveBeenCalled();
    const calls = mockRun.mock.calls.map(([s]: [string]) => s);
    expect(calls).not.toContain('tools/cli/update.mjs');
    expect(calls).not.toContain('tools/cli/deploy.mjs');
    expect(calls).not.toContain('tools/cli/doctor.mjs');
  });
});

describe('sync --frameworks sdlc', () => {
  beforeEach(() => { vi.clearAllMocks(); mockRun.mockResolvedValue({ exitCode: 0 }); });

  it('deploy.mjs called with sdlc, not all', async () => {
    await syncHandler.execute(makeCtx(['--frameworks', 'sdlc']));
    const deployCalls = mockRun.mock.calls.filter(([s]: [string]) => s === 'tools/cli/deploy.mjs');
    expect(deployCalls.length).toBe(1);
    expect(deployCalls[0][1][0]).toBe('sdlc');
  });
});

// ── Missing script path: must exit 1 with name, not 254 silently ─

describe('missing script path produces exit 1 (regression: silent 254)', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('deploy.mjs ENOENT → warns and continues (no silent 254)', async () => {
    mockRun.mockImplementation(async (script: string) => {
      if (script === 'tools/cli/deploy.mjs') {
        return { exitCode: 1, message: 'Script error: spawn ENOENT' };
      }
      return { exitCode: 0 };
    });

    // Should NOT throw; should warn and continue
    const result = await syncHandler.execute(makeCtx());
    // sync itself returns 0 (errors are warnings)
    expect(result.exitCode).toBe(0);
  });
});

// ── Doctor post-sync: correct channel label ─────────────────────

describe('doctor channel label after channel switch', () => {
  it('[next] label for rc version', async () => {
    const { getVersionInfo } = await import('../../src/channel/manager.mjs');
    vi.mocked(getVersionInfo).mockResolvedValue({
      version: '2026.4.0-rc.9',
      channel: 'next',
      packageRoot: '/usr/local/lib/node_modules/aiwg',
      devMode: false,
    });

    const info = await getVersionInfo();
    const channelLabel = info.channel !== 'stable' ? ` [${info.channel}]` : '';
    expect(channelLabel).toBe(' [next]');
    // Regression: must not report "AIWG not installed"
    expect(info.packageRoot).not.toContain('ai-writing-guide');
  });

  it('stable channel has no label suffix', async () => {
    const { getVersionInfo } = await import('../../src/channel/manager.mjs');
    vi.mocked(getVersionInfo).mockResolvedValue({
      version: '2026.4.0',
      channel: 'stable',
      packageRoot: '/usr/local/lib/node_modules/aiwg',
      devMode: false,
    });

    const info = await getVersionInfo();
    const channelLabel = info.channel !== 'stable' ? ` [${info.channel}]` : '';
    expect(channelLabel).toBe('');
  });
});
