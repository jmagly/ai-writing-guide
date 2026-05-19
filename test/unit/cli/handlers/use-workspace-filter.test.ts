import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import os from 'os';
import path from 'path';

const mockRun = vi.fn(async () => ({ exitCode: 0, message: '' }));

vi.mock('../../../../src/cli/handlers/script-runner.js', () => ({
  createScriptRunner: vi.fn(() => ({ run: mockRun })),
}));

vi.mock('../../../../src/channel/manager.mjs', () => ({
  getFrameworkRoot: vi.fn(async () => '/mock/aiwg'),
  getVersionInfo: vi.fn(async () => ({ version: '2026.5.8', channel: 'stable', devMode: false })),
}));

vi.mock('../../../../src/cli/project-isolation/index.js', () => ({
  maybeWarnProjectIsolation: vi.fn(async () => ({ cancelled: false })),
}));

describe('UseHandler workspace-aware filtering (#1380)', () => {
  let tmpDir: string;

  beforeEach(async () => {
    mockRun.mockClear();
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'aiwg-use-filter-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('deploys selected source directories directly instead of recursing through full framework use flow', async () => {
    const { UseHandler } = await import('../../../../src/cli/handlers/use.js');
    const handler = new UseHandler();

    const result = await handler.execute({
      args: ['--profile', 'forensics', '--target', tmpDir, '--dry-run', '--provider', 'claude', '--no-project-local'],
      rawArgs: [],
      cwd: tmpDir,
      frameworkRoot: '/mock/aiwg',
    });

    expect(result.exitCode).toBe(0);
    expect(mockRun).toHaveBeenCalledTimes(3);

    const calls = mockRun.mock.calls.map(([, args]) => args as string[]);
    expect(calls.map((args) => args[args.indexOf('--source') + 1])).toEqual([
      '/mock/aiwg/agentic/code/frameworks/sdlc-complete',
      '/mock/aiwg/agentic/code/frameworks/forensics-complete',
      '/mock/aiwg/agentic/code/addons/aiwg-utils',
    ]);
    for (const args of calls) {
      expect(args).not.toContain('--mode');
      expect(args).toContain('--dry-run');
      expect(args).toContain('--target');
      expect(args).toContain(tmpDir);
    }
  });

  it('keeps explicit use all on the full deployment path', async () => {
    const { UseHandler } = await import('../../../../src/cli/handlers/use.js');
    const handler = new UseHandler();

    const result = await handler.execute({
      args: ['all', '--target', tmpDir, '--dry-run', '--provider', 'claude', '--no-utils', '--no-project-local'],
      rawArgs: [],
      cwd: tmpDir,
      frameworkRoot: '/mock/aiwg',
    });

    expect(result.exitCode).toBe(0);
    expect(mockRun).toHaveBeenCalledTimes(1);

    const args = mockRun.mock.calls[0][1] as string[];
    expect(args).toContain('--mode');
    expect(args[args.indexOf('--mode') + 1]).toBe('all');
    expect(args).not.toContain('--source');
  });
});
