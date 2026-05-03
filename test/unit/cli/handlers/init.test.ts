/**
 * Unit tests for aiwg init handler
 *
 * @source @src/cli/handlers/init.ts
 * @implements #621
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import type { HandlerContext } from '../../../../src/cli/handlers/types.js';

vi.mock('../../../../src/cli/ui.js', () => ({
  blank: vi.fn(),
  rule: vi.fn(),
  info: vi.fn(),
  success: vi.fn(),
  warn: vi.fn(),
  dim: vi.fn(),
  dimText: vi.fn((s: string) => s),
  bold: vi.fn((s: string) => s),
  brandMark: vi.fn(() => '◆'),
}));

// Mock readline to avoid interactive prompts in tests
vi.mock('readline', () => ({
  default: {
    createInterface: vi.fn(() => ({
      question: vi.fn(),
      close: vi.fn(),
    })),
  },
}));

function makeTmpDir(): string {
  const dir = join(tmpdir(), `aiwg-init-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function makeCtx(tmpDir: string, args: string[] = []): HandlerContext {
  return {
    args,
    rawArgs: ['init', ...args],
    cwd: tmpDir,
    frameworkRoot: tmpDir,
  };
}

describe('initHandler', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  describe('handler metadata', () => {
    it('has correct id and category', async () => {
      const { initHandler } = await import('../../../../src/cli/handlers/init.js');
      expect(initHandler.id).toBe('init');
      expect(initHandler.category).toBe('project');
    });
  });

  describe('--non-interactive mode', () => {
    it('creates config with default claude provider and default scripts', async () => {
      const { initHandler } = await import('../../../../src/cli/handlers/init.js');
      const ctx = makeCtx(tmpDir, ['--non-interactive']);

      const result = await initHandler.execute(ctx);
      expect(result.exitCode).toBe(0);

      // Verify config was written
      const { readAiwgConfig } = await import('../../../../src/config/aiwg-config.js');
      const cfg = await readAiwgConfig(tmpDir);
      expect(cfg).not.toBeNull();
      expect(cfg!.providers).toEqual(['claude']);
      expect(cfg!.scripts['deploy']).toBe('aiwg use all');
      expect(cfg!.scripts['doctor']).toBe('aiwg doctor');
      expect(cfg!.scripts['sync']).toBe('aiwg sync');
    });

    it('--yes is an alias for --non-interactive', async () => {
      const { initHandler } = await import('../../../../src/cli/handlers/init.js');
      const ctx = makeCtx(tmpDir, ['--yes']);

      const result = await initHandler.execute(ctx);
      expect(result.exitCode).toBe(0);

      const { readAiwgConfig } = await import('../../../../src/config/aiwg-config.js');
      const cfg = await readAiwgConfig(tmpDir);
      expect(cfg).not.toBeNull();
    });
  });

  describe('existing config', () => {
    it('exits 0 and reports existing config without overwriting', async () => {
      const { initHandler } = await import('../../../../src/cli/handlers/init.js');

      // First init
      const ctx = makeCtx(tmpDir, ['--non-interactive']);
      await initHandler.execute(ctx);

      // Second init without --force
      const result = await initHandler.execute(ctx);
      expect(result.exitCode).toBe(0);

      // Config should still have the original content
      const { readAiwgConfig } = await import('../../../../src/config/aiwg-config.js');
      const cfg = await readAiwgConfig(tmpDir);
      expect(cfg!.providers).toEqual(['claude']);
    });

    it('--force overwrites existing config', async () => {
      const { initHandler } = await import('../../../../src/cli/handlers/init.js');

      // First init
      await initHandler.execute(makeCtx(tmpDir, ['--non-interactive']));

      // Second init with --force
      const result = await initHandler.execute(makeCtx(tmpDir, ['--non-interactive', '--force']));
      expect(result.exitCode).toBe(0);
    });
  });
});
