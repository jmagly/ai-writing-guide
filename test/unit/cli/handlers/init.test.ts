/**
 * Unit tests for aiwg init handler
 *
 * @source @src/cli/handlers/init.ts
 * @implements #621
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import type { HandlerContext } from '../../../../src/cli/handlers/types.js';
import { PROJECT_AIWG_LOCATION_FILE } from '../../../../src/config/project-artifacts.js';

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

const ARTIFACT_ENV_KEYS = [
  'AIWG_ARTIFACTS_PATH',
  'AIWG_PROJECT_ARTIFACTS_PATH',
  'AIWG_PROJECT_AIWG_DIR',
] as const;

function clearArtifactEnv(): Record<typeof ARTIFACT_ENV_KEYS[number], string | undefined> {
  const previous = Object.fromEntries(
    ARTIFACT_ENV_KEYS.map((key) => [key, process.env[key]]),
  ) as Record<typeof ARTIFACT_ENV_KEYS[number], string | undefined>;
  for (const key of ARTIFACT_ENV_KEYS) delete process.env[key];
  return previous;
}

function restoreArtifactEnv(previous: Record<typeof ARTIFACT_ENV_KEYS[number], string | undefined>): void {
  for (const key of ARTIFACT_ENV_KEYS) {
    const value = previous[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
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

      const normalizedPath = join(tmpDir, '.aiwg', 'AIWG.md');
      expect(existsSync(normalizedPath)).toBe(true);
      const normalized = readFileSync(normalizedPath, 'utf8');
      expect(normalized).toContain('## Context Finalization');
      expect(normalized).toContain('aiwg discover');
    });

    it('honors AIWG_ARTIFACTS_PATH for config and normalized context output', async () => {
      const { initHandler } = await import('../../../../src/cli/handlers/init.js');
      const previousArtifactsPath = process.env['AIWG_ARTIFACTS_PATH'];
      const externalRoot = makeTmpDir();
      const artifactDir = join(externalRoot, 'corpus', '.aiwg');

      process.env['AIWG_ARTIFACTS_PATH'] = artifactDir;
      try {
        const result = await initHandler.execute(makeCtx(tmpDir, ['--non-interactive']));
        expect(result.exitCode).toBe(0);

        const { readAiwgConfig } = await import('../../../../src/config/aiwg-config.js');
        const cfg = await readAiwgConfig(tmpDir);
        expect(cfg).not.toBeNull();
        expect(cfg!.providers).toEqual(['claude']);

        expect(existsSync(join(artifactDir, 'aiwg.config'))).toBe(true);
        const normalizedPath = join(artifactDir, 'AIWG.md');
        expect(existsSync(normalizedPath)).toBe(true);
        expect(readFileSync(normalizedPath, 'utf8')).toContain(`Normalized project context: \`${normalizedPath}\``);

        expect(existsSync(join(tmpDir, '.aiwg', 'aiwg.config'))).toBe(false);
        expect(existsSync(join(tmpDir, '.aiwg', 'AIWG.md'))).toBe(false);
      } finally {
        if (previousArtifactsPath === undefined) delete process.env['AIWG_ARTIFACTS_PATH'];
        else process.env['AIWG_ARTIFACTS_PATH'] = previousArtifactsPath;
        rmSync(externalRoot, { recursive: true, force: true });
      }
    });

    it('honors .aiwg-location for config and normalized context output', async () => {
      const { initHandler } = await import('../../../../src/cli/handlers/init.js');
      const previousEnv = clearArtifactEnv();
      const externalRoot = makeTmpDir();
      const artifactDir = join(externalRoot, 'corpus', 'renamed-aiwg-store');

      writeFileSync(join(tmpDir, PROJECT_AIWG_LOCATION_FILE), `${artifactDir}\n`, 'utf-8');
      try {
        const result = await initHandler.execute(makeCtx(tmpDir, ['--non-interactive']));
        expect(result.exitCode).toBe(0);

        const { readAiwgConfig } = await import('../../../../src/config/aiwg-config.js');
        const cfg = await readAiwgConfig(tmpDir);
        expect(cfg).not.toBeNull();
        expect(cfg!.providers).toEqual(['claude']);

        expect(existsSync(join(artifactDir, 'aiwg.config'))).toBe(true);
        const normalizedPath = join(artifactDir, 'AIWG.md');
        expect(existsSync(normalizedPath)).toBe(true);
        expect(readFileSync(normalizedPath, 'utf8')).toContain(`Normalized project context: \`${normalizedPath}\``);

        expect(existsSync(join(tmpDir, '.aiwg', 'aiwg.config'))).toBe(false);
        expect(existsSync(join(tmpDir, '.aiwg', 'AIWG.md'))).toBe(false);
      } finally {
        restoreArtifactEnv(previousEnv);
        rmSync(externalRoot, { recursive: true, force: true });
      }
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

    it('repairs missing .aiwg/AIWG.md when config already exists', async () => {
      const { initHandler } = await import('../../../../src/cli/handlers/init.js');

      await initHandler.execute(makeCtx(tmpDir, ['--non-interactive']));
      rmSync(join(tmpDir, '.aiwg', 'AIWG.md'), { force: true });

      const result = await initHandler.execute(makeCtx(tmpDir, ['--non-interactive']));
      expect(result.exitCode).toBe(0);

      const normalizedPath = join(tmpDir, '.aiwg', 'AIWG.md');
      expect(existsSync(normalizedPath)).toBe(true);
      expect(readFileSync(normalizedPath, 'utf8')).toContain('## Context Finalization');
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
