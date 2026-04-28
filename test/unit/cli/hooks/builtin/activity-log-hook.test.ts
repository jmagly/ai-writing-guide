/**
 * Tests for src/cli/hooks/builtin/activity-log-hook.ts
 *
 * @issue #978
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { existsSync } from 'fs';
import {
  activityLogPostCommandHook,
  HOOKED_COMMANDS,
} from '../../../../../src/cli/hooks/builtin/activity-log-hook.js';
import { initStorage, resetStorage } from '../../../../../src/storage/index.js';
import type { HookContext } from '../../../../../src/cli/hooks/types.js';

describe('activity-log auto-append hook (#978)', () => {
  let projectRoot: string;
  let logPath: string;
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let originalSkipEnv: string | undefined;

  beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), 'aiwg-activity-hook-test-'));
    logPath = join(projectRoot, '.aiwg', 'activity.log');
    resetStorage();
    // Initialize the storage state explicitly against the temp project
    // root. The hook calls resolveStorage() which honors this state and
    // does not consult process.cwd() — important because vitest runs
    // tests in workers where process.chdir() is forbidden.
    await initStorage(projectRoot);

    originalSkipEnv = process.env.AIWG_SKIP_ACTIVITY_LOG;
    delete process.env.AIWG_SKIP_ACTIVITY_LOG;

    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(async () => {
    stderrSpy.mockRestore();
    if (originalSkipEnv === undefined) delete process.env.AIWG_SKIP_ACTIVITY_LOG;
    else process.env.AIWG_SKIP_ACTIVITY_LOG = originalSkipEnv;
    resetStorage();
    await rm(projectRoot, { recursive: true, force: true });
  });

  function makeCtx(command: string, args: string[] = [], data?: Record<string, unknown>): HookContext {
    const ctx: HookContext = {
      event: 'post-command',
      command,
      args,
      cwd: projectRoot,
      frameworkRoot: projectRoot,
    };
    if (data !== undefined) ctx.data = data;
    return ctx;
  }

  describe('filter coverage', () => {
    it('exposes the expected hooked-command list', () => {
      expect(HOOKED_COMMANDS).toEqual(
        expect.arrayContaining(['use', 'remove', 'refresh', 'add-agent', 'add-command', 'add-skill', 'add-template', 'add-behavior', 'validate-metadata', 'index', 'ops'])
      );
    });

    it('only registers itself for post-command event with filtered commands', () => {
      expect(activityLogPostCommandHook.event).toBe('post-command');
      expect(activityLogPostCommandHook.filter?.commands).toEqual(HOOKED_COMMANDS);
    });
  });

  describe('append behavior', () => {
    it('appends a deploy entry for `aiwg use sdlc`', async () => {
      const result = await activityLogPostCommandHook.execute(
        makeCtx('use', ['sdlc'], { exitCode: 0 })
      );

      expect(result.action).toBe('continue');
      expect(existsSync(logPath)).toBe(true);
      const content = await readFile(logPath, 'utf-8');
      expect(content).toMatch(/deploy \| aiwg use sdlc/);
    });

    it('appends a delete entry for `aiwg remove sdlc`', async () => {
      await activityLogPostCommandHook.execute(makeCtx('remove', ['sdlc'], { exitCode: 0 }));
      const content = await readFile(logPath, 'utf-8');
      expect(content).toMatch(/delete \| aiwg remove sdlc/);
    });

    it('appends a create entry for scaffolding commands', async () => {
      await activityLogPostCommandHook.execute(
        makeCtx('add-skill', ['my-skill', '--addon', 'foo'], { exitCode: 0 })
      );
      const content = await readFile(logPath, 'utf-8');
      expect(content).toMatch(/create \| aiwg add-skill my-skill --addon foo/);
    });

    it('appends a lint entry for validate-metadata', async () => {
      await activityLogPostCommandHook.execute(makeCtx('validate-metadata', [], { exitCode: 0 }));
      const content = await readFile(logPath, 'utf-8');
      expect(content).toMatch(/lint \| aiwg validate-metadata/);
    });

    it('handles commands without args', async () => {
      await activityLogPostCommandHook.execute(makeCtx('refresh', [], { exitCode: 0 }));
      const content = await readFile(logPath, 'utf-8');
      expect(content).toMatch(/deploy \| aiwg refresh\b/);
    });

    it('truncates summaries that exceed 120 chars', async () => {
      const longArg = 'x'.repeat(200);
      await activityLogPostCommandHook.execute(makeCtx('use', [longArg], { exitCode: 0 }));
      const content = await readFile(logPath, 'utf-8');
      const match = content.match(/\| (aiwg use .*)/);
      expect(match).not.toBeNull();
      expect(match![1].length).toBeLessThanOrEqual(120);
      expect(match![1].endsWith('...')).toBe(true);
    });
  });

  describe('skip conditions', () => {
    it('skips when AIWG_SKIP_ACTIVITY_LOG=1', async () => {
      process.env.AIWG_SKIP_ACTIVITY_LOG = '1';
      await activityLogPostCommandHook.execute(makeCtx('use', ['sdlc'], { exitCode: 0 }));
      expect(existsSync(logPath)).toBe(false);
    });

    it('skips when AIWG_SKIP_ACTIVITY_LOG=true (case-insensitive)', async () => {
      process.env.AIWG_SKIP_ACTIVITY_LOG = 'TRUE';
      await activityLogPostCommandHook.execute(makeCtx('use', ['sdlc'], { exitCode: 0 }));
      expect(existsSync(logPath)).toBe(false);
    });

    it('does not skip when AIWG_SKIP_ACTIVITY_LOG=0', async () => {
      process.env.AIWG_SKIP_ACTIVITY_LOG = '0';
      await activityLogPostCommandHook.execute(makeCtx('use', ['sdlc'], { exitCode: 0 }));
      expect(existsSync(logPath)).toBe(true);
    });

    it('skips when the primary command failed (non-zero exitCode)', async () => {
      await activityLogPostCommandHook.execute(makeCtx('use', ['sdlc'], { exitCode: 1 }));
      expect(existsSync(logPath)).toBe(false);
    });

    it('appends when exitCode is undefined (defensive default)', async () => {
      await activityLogPostCommandHook.execute(makeCtx('use', ['sdlc']));
      expect(existsSync(logPath)).toBe(true);
    });

    it('skips for commands not in the operation map', async () => {
      // Even though the filter would prevent this, test the defensive
      // early-return inside execute().
      await activityLogPostCommandHook.execute(makeCtx('help', [], { exitCode: 0 }));
      expect(existsSync(logPath)).toBe(false);
    });
  });

  describe('failure handling', () => {
    it('is non-blocking on storage failure (logs to stderr, returns continue)', async () => {
      // Force resolveStorage to fail by configuring a backend that
      // doesn't have an implementation yet (notion is still planned)
      const { writeFile, mkdir } = await import('fs/promises');
      await mkdir(join(projectRoot, '.aiwg'), { recursive: true });
      await writeFile(
        join(projectRoot, '.aiwg', 'storage.config'),
        JSON.stringify({
          version: '1',
          backends: {
            activity_log: { type: 'notion', parent: { pageId: 'abc-123' } },
          },
        }),
        'utf-8'
      );
      resetStorage();
      await initStorage(projectRoot);

      const result = await activityLogPostCommandHook.execute(
        makeCtx('use', ['sdlc'], { exitCode: 0 })
      );
      expect(result.action).toBe('continue');
      expect(stderrSpy).toHaveBeenCalled();
      const stderrCalls = stderrSpy.mock.calls.map((c) => String(c[0])).join(' ');
      expect(stderrCalls).toMatch(/activity-log auto-append failed/);
    });
  });

  describe('atomic-append usage', () => {
    it('uses adapter.append when available (fs backend)', async () => {
      // Run the hook 5 times concurrently to confirm no entries are dropped
      const calls: Promise<unknown>[] = [];
      for (let i = 0; i < 5; i++) {
        calls.push(
          activityLogPostCommandHook.execute(
            makeCtx('use', [`framework-${i}`], { exitCode: 0 })
          )
        );
      }
      await Promise.all(calls);

      const content = await readFile(logPath, 'utf-8');
      const lines = content.split('\n').filter((l) => l.length > 0);
      expect(lines).toHaveLength(5);
      for (let i = 0; i < 5; i++) {
        expect(content).toContain(`framework-${i}`);
      }
    });
  });
});
