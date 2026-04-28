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

  describe('rotate (#977)', () => {
    async function seed(lines: string[]): Promise<void> {
      await mkdir(join(projectRoot, '.aiwg'), { recursive: true });
      await writeFile(logPath, lines.join('\n') + '\n', 'utf-8');
    }

    it('refuses to rotate an empty log', async () => {
      await expect(main(['rotate'])).rejects.toThrow(/Nothing to rotate/);
    });

    it('archives everything by default and leaves only the rotate-record entry', async () => {
      await seed([
        '## [2026-01-01 10:00] create | one',
        '## [2026-02-01 10:00] update | two',
        '## [2026-03-01 10:00] deploy | three',
      ]);

      await main(['rotate']);

      const live = await readFile(logPath, 'utf-8');
      const liveLines = live.trim().split('\n');
      expect(liveLines).toHaveLength(1);
      expect(liveLines[0]).toMatch(/archive \| activity-log rotated, archived 3 entries to archive\/activity-log\/.*\.log$/);

      // Find the archive
      const archiveDir = join(projectRoot, '.aiwg', 'archive', 'activity-log');
      const { readdirSync } = await import('fs');
      const archives = readdirSync(archiveDir);
      expect(archives).toHaveLength(1);

      const archive = await readFile(join(archiveDir, archives[0]), 'utf-8');
      const archiveLines = archive.trim().split('\n');
      expect(archiveLines).toHaveLength(3);
      expect(archiveLines[0]).toContain('one');
      expect(archiveLines[2]).toContain('three');
    });

    it('--keep-last N retains the tail inline and archives the head', async () => {
      await seed([
        '## [2026-01-01 10:00] create | one',
        '## [2026-02-01 10:00] update | two',
        '## [2026-03-01 10:00] deploy | three',
        '## [2026-04-01 10:00] update | four',
        '## [2026-04-15 10:00] deploy | five',
      ]);

      await main(['rotate', '--keep-last', '2']);

      const live = await readFile(logPath, 'utf-8');
      const liveLines = live.trim().split('\n');
      // 2 retained + 1 rotate-record entry
      expect(liveLines).toHaveLength(3);
      expect(liveLines[0]).toContain('four');
      expect(liveLines[1]).toContain('five');
      expect(liveLines[2]).toMatch(/archive \| activity-log rotated, archived 3 entries/);
    });

    it('--keep-last <Nd> retains entries newer than N days', async () => {
      const now = Date.now();
      const dayMs = 86_400_000;
      const fmt = (ms: number) => {
        const d = new Date(ms);
        const yyyy = d.getUTCFullYear();
        const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(d.getUTCDate()).padStart(2, '0');
        const HH = String(d.getUTCHours()).padStart(2, '0');
        const MM = String(d.getUTCMinutes()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd} ${HH}:${MM}`;
      };

      await seed([
        `## [${fmt(now - 100 * dayMs)}] create | old1`,
        `## [${fmt(now - 80 * dayMs)}] update | old2`,
        `## [${fmt(now - 30 * dayMs)}] deploy | recent1`,
        `## [${fmt(now - 5 * dayMs)}] update | recent2`,
      ]);

      await main(['rotate', '--keep-last', '60d']);

      const live = await readFile(logPath, 'utf-8');
      expect(live).toContain('recent1');
      expect(live).toContain('recent2');
      expect(live).not.toContain('old1');
      expect(live).not.toContain('old2');

      const archiveDir = join(projectRoot, '.aiwg', 'archive', 'activity-log');
      const { readdirSync } = await import('fs');
      const archives = readdirSync(archiveDir);
      const archive = await readFile(join(archiveDir, archives[0]), 'utf-8');
      expect(archive).toContain('old1');
      expect(archive).toContain('old2');
      expect(archive).not.toContain('recent1');
    });

    it('refuses when --keep-last would retain everything', async () => {
      await seed([
        '## [2026-04-01 10:00] create | one',
        '## [2026-04-02 10:00] update | two',
      ]);
      await expect(main(['rotate', '--keep-last', '10'])).rejects.toThrow(/Nothing to archive/);
    });

    it('--to <path> writes archive to the explicit destination', async () => {
      await seed([
        '## [2026-04-01 10:00] create | one',
        '## [2026-04-02 10:00] update | two',
      ]);

      await main(['rotate', '--to', 'custom-archives/april.log']);

      const customPath = join(projectRoot, '.aiwg', 'custom-archives', 'april.log');
      expect(existsSync(customPath)).toBe(true);
      const archive = await readFile(customPath, 'utf-8');
      expect(archive).toContain('one');
      expect(archive).toContain('two');
    });

    it('refuses to overwrite an existing archive', async () => {
      await seed(['## [2026-04-01 10:00] create | one']);
      await main(['rotate', '--to', 'existing.log']);

      // Re-seed and try to rotate to the same destination
      await seed(['## [2026-04-02 10:00] update | two']);
      await expect(main(['rotate', '--to', 'existing.log'])).rejects.toThrow(/Refusing to overwrite/);
    });

    it('rejects malformed --keep-last', async () => {
      await seed(['## [2026-04-01 10:00] create | one']);
      await expect(main(['rotate', '--keep-last', '90days'])).rejects.toThrow(/--keep-last must be/);
      await expect(main(['rotate', '--keep-last', '0'])).rejects.toThrow(/positive/);
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
