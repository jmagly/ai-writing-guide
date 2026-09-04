/**
 * Unit tests for aiwg run handler
 *
 * @source @src/cli/handlers/run.ts
 * @implements #621
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, rmSync } from 'fs';
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

function makeTmpDir(): string {
  const dir = join(tmpdir(), `aiwg-run-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function makeCtx(tmpDir: string, args: string[] = []): HandlerContext {
  return {
    args,
    rawArgs: ['run', ...args],
    cwd: tmpDir,
    frameworkRoot: tmpDir,
  };
}

/** Write a minimal aiwg.config into tmpDir/.aiwg/ */
async function writeConfig(tmpDir: string, scripts: Record<string, string>): Promise<void> {
  const { writeAiwgConfig, emptyConfig } = await import('../../../../src/config/aiwg-config.js');
  const cfg = emptyConfig(['claude']);
  cfg.scripts = scripts;
  await writeAiwgConfig(tmpDir, cfg);
}

describe('runHandler', () => {
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
      const { runHandler } = await import('../../../../src/cli/handlers/run.js');
      expect(runHandler.id).toBe('run');
      expect(runHandler.category).toBe('utility');
    });
  });

  describe('output-mode arguments', () => {
    it('extracts wrapper modes but preserves flags after the forwarding separator', async () => {
      const { extractOutputModes } = await import('../../../../src/cli/handlers/run.js');
      expect(extractOutputModes(['skill', 'example', '--output-mode', 'asd-ste', '--', '--output-mode', 'child-mode'])).toEqual({
        args: ['skill', 'example', '--', '--output-mode', 'child-mode'],
        modes: ['asd-ste'],
      });
    });

    it('clears inherited output-mode variables when the effective stack is unaltered', async () => {
      const outFile = join(tmpDir, 'mode_env.txt');
      await writeConfig(tmpDir, { checkmode: `printf '%s|%s' "$AIWG_OUTPUT_MODES" "$AIWG_OUTPUT_MODES_JSON" > "${outFile}"` });
      process.env.AIWG_OUTPUT_MODES = 'stale-parent-mode';
      process.env.AIWG_OUTPUT_MODES_JSON = '[{"id":"stale-parent-mode"}]';
      try {
        const { runHandler } = await import('../../../../src/cli/handlers/run.js');
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const result = await runHandler.execute(makeCtx(tmpDir, ['checkmode']));
        expect(result.exitCode).toBe(0);
        const { readFileSync } = await import('fs');
        expect(readFileSync(outFile, 'utf8')).toBe('|[]');
      } finally {
        delete process.env.AIWG_OUTPUT_MODES;
        delete process.env.AIWG_OUTPUT_MODES_JSON;
      }
    });
  });

  describe('no config', () => {
    it('returns exitCode 1 with helpful error when no config exists', async () => {
      const { runHandler } = await import('../../../../src/cli/handlers/run.js');
      const result = await runHandler.execute(makeCtx(tmpDir, ['deploy']));

      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('aiwg.config');
      expect(result.message).toContain('aiwg init');
    });
  });

  describe('no script name (list mode)', () => {
    it('exits 0 when no scripts defined', async () => {
      await writeConfig(tmpDir, {});
      const { runHandler } = await import('../../../../src/cli/handlers/run.js');

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const result = await runHandler.execute(makeCtx(tmpDir, []));

      expect(result.exitCode).toBe(0);
      consoleSpy.mockRestore();
    });

    it('prints available scripts when no script name given', async () => {
      await writeConfig(tmpDir, { deploy: 'aiwg use all', doctor: 'aiwg doctor' });
      const { runHandler } = await import('../../../../src/cli/handlers/run.js');

      const lines: string[] = [];
      vi.spyOn(console, 'log').mockImplementation((...args) => lines.push(args.join(' ')));

      await runHandler.execute(makeCtx(tmpDir, []));

      const output = lines.join('\n');
      expect(output).toContain('deploy');
      expect(output).toContain('doctor');
    });
  });

  describe('unknown script', () => {
    it('returns exitCode 1 with helpful message for unknown script', async () => {
      await writeConfig(tmpDir, { deploy: 'aiwg use all' });
      const { runHandler } = await import('../../../../src/cli/handlers/run.js');

      const result = await runHandler.execute(makeCtx(tmpDir, ['nonexistent']));

      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('nonexistent');
      expect(result.message).toContain('deploy');
    });
  });

  describe('script execution', () => {
    it('runs a simple echo script and exits 0', async () => {
      await writeConfig(tmpDir, { greet: 'echo "hello from aiwg"' });
      const { runHandler } = await import('../../../../src/cli/handlers/run.js');

      vi.spyOn(console, 'log').mockImplementation(() => {});
      const result = await runHandler.execute(makeCtx(tmpDir, ['greet']));

      expect(result.exitCode).toBe(0);
    });

    it('returns non-zero exit code for a failing script', async () => {
      await writeConfig(tmpDir, { fail: 'exit 42' });
      const { runHandler } = await import('../../../../src/cli/handlers/run.js');

      vi.spyOn(console, 'log').mockImplementation(() => {});
      const result = await runHandler.execute(makeCtx(tmpDir, ['fail']));

      expect(result.exitCode).toBe(42);
    });

    it('provides AIWG_PROJECT env var to scripts', async () => {
      // Write a script that writes the env var to a temp file we can read
      const outFile = join(tmpDir, 'env_out.txt');
      await writeConfig(tmpDir, { checkenv: `echo "$AIWG_PROJECT" > "${outFile}"` });
      const { runHandler } = await import('../../../../src/cli/handlers/run.js');

      vi.spyOn(console, 'log').mockImplementation(() => {});
      await runHandler.execute(makeCtx(tmpDir, ['checkenv']));

      const { readFileSync } = await import('fs');
      const written = readFileSync(outFile, 'utf-8').trim();
      expect(written).toBe(tmpDir);
    });
  });
});
