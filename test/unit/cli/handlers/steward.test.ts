/**
 * Unit tests for steward.ts handler
 *
 * @issue #691
 * @parent #684
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import type { HandlerContext } from '../../../../src/cli/handlers/types.js';

// ── Mock fs and js-yaml ───────────────────────────────────────

const sampleMatrix = {
  version: '1.0',
  updated: '2026-04-01',
  baseline: 'claude-code',
  features: {
    cron: {
      description: 'Native task scheduling',
      native_example: 'CronCreate',
      emulation_strategies: { 'aiwg-schedule': 'Use AIWG scheduled tasks' },
    },
    mission_control: {
      description: 'Multi-loop orchestration',
      native_example: null,
      emulation_strategies: { 'aiwg-mc': 'Use AIWG mission control' },
    },
    daemon: {
      description: 'Background execution',
      native_example: 'daemon start',
      emulation_strategies: { 'aiwg-daemon': 'Use AIWG daemon' },
    },
  },
  providers: {
    'claude-code': {
      display_name: 'Claude Code',
      aliases: ['claude'],
      status: 'stable',
      daemon_tier: 'pty-adapter',
      daemon_pty_adapter: true,
      artifact_paths: {},
      native_features: { cron: true, mission_control: false, daemon: false },
      emulation: { cron: 'native', mission_control: 'aiwg-mc', daemon: 'aiwg-daemon' },
      hook_wiring: { at_link_support: true, context_file: 'CLAUDE.md' },
      deploy_target: 'project',
      aggregated_output: false,
    },
    codex: {
      display_name: 'Codex',
      status: 'stable',
      daemon_tier: 'native',
      daemon_pty_adapter: false,
      artifact_paths: {},
      native_features: { cron: false, mission_control: false, daemon: true },
      emulation: { cron: 'aiwg-schedule', mission_control: 'aiwg-mc', daemon: 'native' },
      hook_wiring: { at_link_support: false, context_file: 'AGENTS.md' },
      deploy_target: 'project',
      aggregated_output: false,
    },
  },
};

vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
  return actual;
});

vi.mock('js-yaml', () => ({
  default: { load: vi.fn(() => sampleMatrix) },
  load: vi.fn(() => sampleMatrix),
}));

vi.mock('../../../../src/config/aiwg-config.js', () => ({
  getProjectDir: vi.fn((ctx: { cwd?: string }) => ctx.cwd || process.cwd()),
  readAiwgConfig: vi.fn().mockResolvedValue(null),
}));

import { stewardHandler } from '../../../../src/cli/handlers/steward.js';
import { readAiwgConfig } from '../../../../src/config/aiwg-config.js';

// ── Helpers ───────────────────────────────────────────────────

const providerEnvKeys = [
  'CLAUDE_CODE_VERSION',
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'CURSOR_TRACE_ID',
  'CURSOR_VERSION',
  'WINDSURF_VERSION',
  'WARP_TERMINAL',
  'OPENCLAW_VERSION',
  'FACTORY_AGENT_ID',
  'OPENCODE_VERSION',
  'AIWG_DISABLE_PROCESS_PROVIDER_DETECTION',
];

const savedProviderEnv = new Map<string, string | undefined>();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readAiwgConfig).mockResolvedValue(null);
  for (const key of providerEnvKeys) {
    savedProviderEnv.set(key, process.env[key]);
    delete process.env[key];
  }
  process.env.AIWG_DISABLE_PROCESS_PROVIDER_DETECTION = '1';
});

afterEach(() => {
  for (const key of providerEnvKeys) {
    const value = savedProviderEnv.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  savedProviderEnv.clear();
  vi.restoreAllMocks();
});

function makeCtx(args: string[] = [], cwd = '/mock/cwd'): HandlerContext {
  return {
    args,
    rawArgs: ['steward', ...args],
    cwd,
    frameworkRoot: '/mock/framework/root',
  };
}

function makeTmpDir(): string {
  const dir = join(tmpdir(), `aiwg-steward-provider-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writeProviderBundle(projectDir: string, manifest: Record<string, unknown>): void {
  const bundleDir = join(projectDir, '.aiwg', 'providers', String(manifest.id));
  mkdirSync(bundleDir, { recursive: true });
  writeFileSync(join(bundleDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
}

function validProviderManifest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'custom-codex',
    type: 'provider',
    name: 'Custom Codex',
    version: '1.0.0',
    description: 'Custom provider for steward tests',
    manifestVersion: '1',
    platforms: { codex: 'full' },
    keywords: ['test'],
    deployment: { pathTemplate: '.codex/{id}.md' },
    providerConfig: { extends: 'codex', displayName: 'Custom Codex' },
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────

describe('stewardHandler metadata', () => {
  it('has correct id and category', () => {
    expect(stewardHandler.id).toBe('steward');
    expect(stewardHandler.category).toBe('maintenance');
    expect(typeof stewardHandler.execute).toBe('function');
  });
});

describe('steward (no subcommand / help)', () => {
  it('exits 0 and prints help', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const result = await stewardHandler.execute(makeCtx([]));
    expect(result.exitCode).toBe(0);
    const output = consoleSpy.mock.calls.map(([s]) => String(s)).join('\n');
    expect(output).toMatch(/steward/i);
    consoleSpy.mockRestore();
  });
});

describe('steward capabilities --provider', () => {
  it('exits 0 for known provider', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const result = await stewardHandler.execute(makeCtx(['capabilities', '--provider', 'claude-code']));
    expect(result.exitCode).toBe(0);
    consoleSpy.mockRestore();
  });

  it('exits 2 (USAGE) for unknown provider', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const result = await stewardHandler.execute(makeCtx(['capabilities', '--provider', 'unknown-xyz']));
    expect(result.exitCode).toBe(2);
    consoleSpy.mockRestore();
  });

  it('exits 2 (USAGE) when --provider flag has no value', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const result = await stewardHandler.execute(makeCtx(['capabilities', '--provider']));
    expect(result.exitCode).toBe(2);
    consoleSpy.mockRestore();
  });

  it('overlays project-local provider capability overrides on its base adapter', async () => {
    const tmpDir = makeTmpDir();
    writeProviderBundle(tmpDir, validProviderManifest({
      id: 'custom-codex',
      providerConfig: {
        extends: 'codex',
        displayName: 'Custom Codex',
        aliases: ['custom-code'],
        capabilities: {
          nativeFeatures: { cron: true },
          emulation: { mission_control: null },
        },
      },
    }));
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    try {
      const result = await stewardHandler.execute(makeCtx(['capabilities', '--provider', 'custom-code'], tmpDir));

      expect(result.exitCode).toBe(0);
      const output = consoleSpy.mock.calls.map(([s]) => String(s)).join('\n');
      expect(output).toContain('Provider: Custom Codex (custom-codex)');
      expect(output).toContain('Project-local: yes');
      expect(output).toContain('Base adapter:   codex');
      expect(output).toContain('cron — ✓ native');
      expect(output).toContain('mission_control — - not supported');
    } finally {
      consoleSpy.mockRestore();
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('steward capabilities provider detection', () => {
  it('uses .aiwg/aiwg.config providers[0] when no provider flag or env signal is present', async () => {
    vi.mocked(readAiwgConfig).mockResolvedValue({
      version: '1',
      providers: ['codex'],
      installed: {},
      scripts: {},
    });
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = await stewardHandler.execute(makeCtx(['capabilities']));

    expect(result.exitCode).toBe(0);
    const output = consoleSpy.mock.calls.map(([s]) => String(s)).join('\n');
    expect(output).toContain('(Detected provider: codex)');
    consoleSpy.mockRestore();
  });

  it('normalizes claude workspace provider to the capability matrix claude-code id', async () => {
    vi.mocked(readAiwgConfig).mockResolvedValue({
      version: '1',
      providers: ['claude'],
      installed: {},
      scripts: {},
    });
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = await stewardHandler.execute(makeCtx(['capabilities']));

    expect(result.exitCode).toBe(0);
    const output = consoleSpy.mock.calls.map(([s]) => String(s)).join('\n');
    expect(output).toContain('(Detected provider: claude-code)');
    consoleSpy.mockRestore();
  });
});

describe('steward capabilities --feature', () => {
  it('exits 0 for known feature', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const result = await stewardHandler.execute(makeCtx(['capabilities', '--feature', 'cron']));
    expect(result.exitCode).toBe(0);
    consoleSpy.mockRestore();
  });

  it('exits 2 (USAGE) for unknown feature', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const result = await stewardHandler.execute(makeCtx(['capabilities', '--feature', 'nonexistent-feature']));
    expect(result.exitCode).toBe(2);
    consoleSpy.mockRestore();
  });
});

describe('steward capabilities --all', () => {
  it('exits 0 and prints matrix', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const result = await stewardHandler.execute(makeCtx(['capabilities', '--all']));
    expect(result.exitCode).toBe(0);
    consoleSpy.mockRestore();
  });
});

describe('steward find --capability', () => {
  it('exits 0 for known capability', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const result = await stewardHandler.execute(makeCtx(['find', '--capability', 'cron']));
    expect(result.exitCode).toBe(0);
    consoleSpy.mockRestore();
  });

  it('exits 2 (USAGE) for unknown capability', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const result = await stewardHandler.execute(makeCtx(['find', '--capability', 'nonexistent']));
    expect(result.exitCode).toBe(2);
    consoleSpy.mockRestore();
  });

  it('exits 2 (USAGE) when --capability flag is missing', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const result = await stewardHandler.execute(makeCtx(['find']));
    expect(result.exitCode).toBe(2);
    consoleSpy.mockRestore();
  });
});

describe('steward unknown subcommand', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('exits 2 (USAGE)', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const result = await stewardHandler.execute(makeCtx(['bogus']));
    expect(result.exitCode).toBe(2);
    consoleSpy.mockRestore();
  });
});
