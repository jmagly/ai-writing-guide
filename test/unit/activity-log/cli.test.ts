/**
 * Tests for src/activity-log/cli.ts — exercise show / append / stats
 * against a real fs backend resolved through resolveStorage(), which is
 * the same path users hit at runtime.
 *
 * @issue #934
 * @issue #964
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { existsSync } from 'fs';
import { initStorage, resetStorage } from '../../../src/storage/index.js';
import { main } from '../../../src/activity-log/cli.js';

describe('activity-log CLI', () => {
  let projectRoot: string;
  let logPath: string;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let stdout: string[];

  beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), 'aiwg-activity-log-test-'));
    logPath = join(projectRoot, '.aiwg', 'activity.log');
    resetStorage();
    await initStorage(projectRoot);

    stdout = [];
    logSpy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      stdout.push(args.map((a) => String(a)).join(' '));
    });
  });

  afterEach(async () => {
    logSpy.mockRestore();
    resetStorage();
    await rm(projectRoot, { recursive: true, force: true });
  });

  describe('append', () => {
    it('writes a line in the canonical wire format and creates the log file', async () => {
      await main(['append', 'create', '.aiwg/requirements/UC-007.md']);
      expect(existsSync(logPath)).toBe(true);
      const content = await readFile(logPath, 'utf-8');
      expect(content).toMatch(/^## \[\d{4}-\d{2}-\d{2} \d{2}:\d{2}\] create \| \.aiwg\/requirements\/UC-007\.md\n$/);
    });

    it('appends without overwriting existing history', async () => {
      // Pre-seed the log with an existing entry (legacy format)
      await mkdir(join(projectRoot, '.aiwg'), { recursive: true });
      await writeFile(logPath, '## [2026-04-01 10:00] deploy | sdlc to copilot\n', 'utf-8');

      await main(['append', 'update', 'tweaked thing']);

      const content = await readFile(logPath, 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines).toHaveLength(2);
      expect(lines[0]).toBe('## [2026-04-01 10:00] deploy | sdlc to copilot');
      expect(lines[1]).toMatch(/update \| tweaked thing$/);
    });

    it('rejects unknown operation tokens', async () => {
      await expect(main(['append', 'refactor', 'something'])).rejects.toThrow(
        /Invalid operation "refactor"/
      );
    });

    it('rejects empty summary', async () => {
      await expect(main(['append', 'create', ''])).rejects.toThrow(/non-empty/);
    });

    it('rejects when no summary is provided', async () => {
      await expect(main(['append', 'create'])).rejects.toThrow(/Usage:/);
    });

    it('handles existing log with no trailing newline', async () => {
      await mkdir(join(projectRoot, '.aiwg'), { recursive: true });
      await writeFile(logPath, '## [2026-04-01 10:00] deploy | sdlc to copilot', 'utf-8');
      await main(['append', 'update', 'second entry']);
      const content = await readFile(logPath, 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines).toHaveLength(2);
    });
  });

  describe('show', () => {
    beforeEach(async () => {
      await mkdir(join(projectRoot, '.aiwg'), { recursive: true });
      await writeFile(
        logPath,
        [
          '## [2026-04-01 10:00] deploy | sdlc to copilot',
          '## [2026-04-15 12:00] create | UC-007.md',
          '## [2026-04-20 09:30] update | foo.md',
          '## [2026-04-25 14:00] deploy | research to claude',
          '',
        ].join('\n'),
        'utf-8'
      );
    });

    it('prints all entries newest-first by default', async () => {
      await main(['show']);
      // Newest should be deploy/research to claude on 2026-04-25
      expect(stdout[0]).toContain('research to claude');
      expect(stdout[stdout.length - 1]).toContain('sdlc to copilot');
    });

    it('respects --limit', async () => {
      await main(['show', '--limit', '2']);
      expect(stdout).toHaveLength(2);
    });

    it('filters by --operation', async () => {
      await main(['show', '--operation', 'deploy']);
      expect(stdout).toHaveLength(2);
      expect(stdout.every((l) => l.includes('deploy'))).toBe(true);
    });

    it('filters by --since (inclusive)', async () => {
      await main(['show', '--since', '2026-04-15']);
      expect(stdout).toHaveLength(3);
    });

    it('combines filters', async () => {
      await main(['show', '--since', '2026-04-15', '--operation', 'deploy']);
      expect(stdout).toHaveLength(1);
      expect(stdout[0]).toContain('research to claude');
    });

    it('reports no matches gracefully', async () => {
      await main(['show', '--since', '2030-01-01']);
      expect(stdout.join(' ')).toMatch(/No activity log entries match/);
    });

    it('rejects malformed --since', async () => {
      await expect(main(['show', '--since', '2026/04/01'])).rejects.toThrow(/--since must be YYYY-MM-DD/);
    });

    it('rejects unknown --operation', async () => {
      await expect(main(['show', '--operation', 'bogus'])).rejects.toThrow(/--operation must be one of/);
    });
  });

  describe('show — empty log', () => {
    it('reports gracefully when no log file exists', async () => {
      await main(['show']);
      expect(stdout.join(' ')).toMatch(/No activity log entries/);
    });
  });

  describe('stats', () => {
    it('reports empty log gracefully', async () => {
      await main(['stats']);
      expect(stdout.join(' ')).toMatch(/empty/);
    });

    it('summarizes counts and date range', async () => {
      await mkdir(join(projectRoot, '.aiwg'), { recursive: true });
      await writeFile(
        logPath,
        [
          '## [2026-04-01 10:00] deploy | a',
          '## [2026-04-15 12:00] create | b',
          '## [2026-04-15 13:00] create | c',
          '## [2026-04-20 09:30] update | d',
          '',
        ].join('\n'),
        'utf-8'
      );
      await main(['stats']);
      const out = stdout.join('\n');
      expect(out).toContain('Total entries: 4');
      expect(out).toContain('Date range: 2026-04-01 → 2026-04-20');
      expect(out).toMatch(/create\s+2/);
      expect(out).toMatch(/deploy\s+1/);
      expect(out).toMatch(/update\s+1/);
    });
  });

  describe('AIWG_SKIP_ACTIVITY_LOG (#975)', () => {
    const originalEnv = process.env.AIWG_SKIP_ACTIVITY_LOG;

    afterEach(() => {
      if (originalEnv === undefined) {
        delete process.env.AIWG_SKIP_ACTIVITY_LOG;
      } else {
        process.env.AIWG_SKIP_ACTIVITY_LOG = originalEnv;
      }
    });

    it('skips append when AIWG_SKIP_ACTIVITY_LOG=1', async () => {
      process.env.AIWG_SKIP_ACTIVITY_LOG = '1';
      await main(['append', 'create', 'should not appear']);
      expect(existsSync(logPath)).toBe(false);
    });

    it('skips append when AIWG_SKIP_ACTIVITY_LOG=true (case insensitive)', async () => {
      process.env.AIWG_SKIP_ACTIVITY_LOG = 'TRUE';
      await main(['append', 'create', 'nope']);
      expect(existsSync(logPath)).toBe(false);
    });

    it('does NOT skip when AIWG_SKIP_ACTIVITY_LOG=0', async () => {
      process.env.AIWG_SKIP_ACTIVITY_LOG = '0';
      await main(['append', 'create', 'this should appear']);
      expect(existsSync(logPath)).toBe(true);
    });

    it('does NOT skip when AIWG_SKIP_ACTIVITY_LOG=false', async () => {
      process.env.AIWG_SKIP_ACTIVITY_LOG = 'false';
      await main(['append', 'create', 'visible']);
      expect(existsSync(logPath)).toBe(true);
    });

    it('does NOT skip when AIWG_SKIP_ACTIVITY_LOG is unset', async () => {
      delete process.env.AIWG_SKIP_ACTIVITY_LOG;
      await main(['append', 'create', 'visible']);
      expect(existsSync(logPath)).toBe(true);
    });
  });

  describe('concurrent append atomicity (#976)', () => {
    it('does not lose entries under 10 parallel appends', async () => {
      const calls: Promise<void>[] = [];
      for (let i = 0; i < 10; i++) {
        calls.push(main(['append', 'create', `parallel-entry-${i}`]));
      }
      await Promise.all(calls);

      const content = await readFile(logPath, 'utf-8');
      const lines = content.split('\n').filter((l) => l.length > 0);
      // Every entry must be present
      expect(lines).toHaveLength(10);
      for (let i = 0; i < 10; i++) {
        expect(content).toContain(`parallel-entry-${i}`);
      }
    });
  });

  describe('storage routing', () => {
    it('honors roots.activity_log override from storage.config', async () => {
      // Configure activity_log to live in a non-default location
      await mkdir(join(projectRoot, '.aiwg'), { recursive: true });
      await writeFile(
        join(projectRoot, '.aiwg', 'storage.config'),
        JSON.stringify({
          version: '1',
          roots: { activity_log: 'audit-trail' },
        }),
        'utf-8'
      );
      resetStorage();
      await initStorage(projectRoot);

      await main(['append', 'create', 'redirected entry']);

      // Default path must NOT exist, custom path must
      expect(existsSync(logPath)).toBe(false);
      const customPath = join(projectRoot, 'audit-trail', 'activity.log');
      expect(existsSync(customPath)).toBe(true);
      const content = await readFile(customPath, 'utf-8');
      expect(content).toContain('redirected entry');
    });
  });
});
