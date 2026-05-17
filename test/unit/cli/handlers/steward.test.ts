/**
 * Unit tests for steward.ts handler
 *
 * @issue #691
 * @parent #684
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { HandlerContext } from '../../../../src/cli/handlers/types.js';

// ── Mock fs and js-yaml ───────────────────────────────────────

const sampleMatrix = {
  version: '1.0',
  updated: '2026-04-01',
  baseline: 'claude-code',
  features: {
    scheduler: {
      description: 'Native task scheduling',
      aiwg_fallback: 'aiwg ralph',
    },
    'mission-control': {
      description: 'Multi-loop orchestration',
      aiwg_fallback: 'aiwg mc',
    },
  },
  providers: {
    'claude-code': {
      display_name: 'Claude Code',
      capabilities: {
        scheduler: {
          native: true,
          native_tool: 'TodoWrite',
          aiwg_command: null,
          routing: 'Use TodoWrite directly',
        },
        'mission-control': {
          native: false,
          native_tool: null,
          aiwg_command: 'aiwg mc',
          routing: 'Use aiwg mc',
        },
      },
    },
    codex: {
      display_name: 'Codex',
      capabilities: {
        scheduler: {
          native: false,
          native_tool: null,
          aiwg_command: 'aiwg ralph',
          routing: 'Use aiwg ralph for task loops',
        },
      },
    },
  },
};

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue('mocked-yaml'),
}));

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
];

const savedProviderEnv = new Map<string, string | undefined>();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readAiwgConfig).mockResolvedValue(null);
  for (const key of providerEnvKeys) {
    savedProviderEnv.set(key, process.env[key]);
    delete process.env[key];
  }
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

function makeCtx(args: string[] = []): HandlerContext {
  return {
    args,
    rawArgs: ['steward', ...args],
    cwd: '/mock/cwd',
    frameworkRoot: '/mock/framework/root',
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
    const result = await stewardHandler.execute(makeCtx(['capabilities', '--feature', 'scheduler']));
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
    const result = await stewardHandler.execute(makeCtx(['find', '--capability', 'scheduler']));
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
