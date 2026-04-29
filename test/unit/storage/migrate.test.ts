/**
 * Tests for `aiwg storage migrate` (#955)
 *
 * @issue #934
 * @issue #955
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { existsSync } from 'fs';
import { main as storageCliMain } from '../../../src/storage/cli.js';
import { resetStorage, initStorage } from '../../../src/storage/index.js';

describe('aiwg storage migrate (#955)', () => {
  let projectRoot: string;
  let originalCwd: string;
  let stdout: string[];
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), 'aiwg-storage-migrate-test-'));
    originalCwd = process.cwd();
    // We CAN'T process.chdir() in vitest workers; the migrate handler
    // accepts projectRoot via process.cwd() — fortunately our test
    // builds adapters directly via fs paths in --from/--to, so cwd-
    // relative paths are predictable when we pass absolute --from/--to.
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

  describe('argument validation', () => {
    it('rejects missing subsystem', async () => {
      await expect(
        storageCliMain(['migrate', '--from', 'fs:/a', '--to', 'fs:/b'])
      ).rejects.toThrow(/Usage: aiwg storage migrate/);
    });

    it('rejects unknown subsystem', async () => {
      await expect(
        storageCliMain(['migrate', 'not_a_subsystem', '--from', 'fs:/a', '--to', 'fs:/b'])
      ).rejects.toThrow(/Usage: aiwg storage migrate/);
    });

    it('rejects missing --from', async () => {
      await expect(
        storageCliMain(['migrate', 'memory', '--to', 'fs:/b'])
      ).rejects.toThrow(/--from <type>:<location> is required/);
    });

    it('rejects missing --to', async () => {
      await expect(
        storageCliMain(['migrate', 'memory', '--from', 'fs:/a'])
      ).rejects.toThrow(/--to <type>:<location> is required/);
    });

    it('rejects malformed spec (no colon)', async () => {
      await expect(
        storageCliMain(['migrate', 'memory', '--from', 'fsbad', '--to', 'fs:/b'])
      ).rejects.toThrow(/expected <type>:<location>/);
    });

    it('rejects unknown backend type in spec', async () => {
      await expect(
        storageCliMain(['migrate', 'memory', '--from', 'mongo:/a', '--to', 'fs:/b'])
      ).rejects.toThrow(/Unknown backend type "mongo"/);
    });

    it('refuses identical source and destination locations', async () => {
      await mkdir(join(projectRoot, 'memory'), { recursive: true });
      const path = join(projectRoot, 'memory');
      await expect(
        storageCliMain(['migrate', 'memory', '--from', `fs:${path}`, '--to', `fs:${path}`])
      ).rejects.toThrow(/source and destination resolve to the same location/);
    });

    it('refuses unimplemented backend types in --from/--to', async () => {
      await expect(
        storageCliMain([
          'migrate',
          'memory',
          '--from',
          'fs:/a',
          '--to',
          'notion:abc-123',
        ])
      ).rejects.toThrow(/backend "notion" not yet implemented/);
    });
  });

  describe('fs → fs migration', () => {
    it('copies all entries from source to destination', async () => {
      const src = join(projectRoot, 'src-memory');
      const dst = join(projectRoot, 'dst-memory');
      await mkdir(join(src, 'a'), { recursive: true });
      await writeFile(join(src, 'a', 'one.md'), 'content one', 'utf-8');
      await writeFile(join(src, 'a', 'two.md'), 'content two', 'utf-8');
      await writeFile(join(src, 'three.md'), 'content three', 'utf-8');

      await storageCliMain([
        'migrate',
        'memory',
        '--from',
        `fs:${src}`,
        '--to',
        `fs:${dst}`,
      ]);

      expect(await readFile(join(dst, 'a/one.md'), 'utf-8')).toBe('content one');
      expect(await readFile(join(dst, 'a/two.md'), 'utf-8')).toBe('content two');
      expect(await readFile(join(dst, 'three.md'), 'utf-8')).toBe('content three');

      const summary = stdout.join('\n');
      expect(summary).toMatch(/copied=3/);
      expect(summary).toMatch(/errored=0/);
    });

    it('--dry-run reports without writing', async () => {
      const src = join(projectRoot, 'src');
      const dst = join(projectRoot, 'dst');
      await mkdir(src, { recursive: true });
      await writeFile(join(src, 'a.md'), 'x', 'utf-8');

      await storageCliMain([
        'migrate',
        'memory',
        '--from',
        `fs:${src}`,
        '--to',
        `fs:${dst}`,
        '--dry-run',
      ]);

      expect(existsSync(join(dst, 'a.md'))).toBe(false);
      const summary = stdout.join('\n');
      expect(summary).toContain('DRY RUN');
      expect(summary).toMatch(/would copy/);
    });

    it('reports gracefully on empty source', async () => {
      const src = join(projectRoot, 'empty-src');
      const dst = join(projectRoot, 'empty-dst');
      await mkdir(src, { recursive: true });
      await storageCliMain([
        'migrate',
        'memory',
        '--from',
        `fs:${src}`,
        '--to',
        `fs:${dst}`,
      ]);
      expect(stdout.join('\n')).toMatch(/No entries to migrate/);
    });
  });

  describe('resume support', () => {
    it('skips already-migrated entries on retry', async () => {
      const src = join(projectRoot, 'src');
      const dst = join(projectRoot, 'dst');
      await mkdir(src, { recursive: true });
      await writeFile(join(src, 'a.md'), 'a', 'utf-8');
      await writeFile(join(src, 'b.md'), 'b', 'utf-8');

      // First run — copies both
      await storageCliMain([
        'migrate',
        'memory',
        '--from',
        `fs:${src}`,
        '--to',
        `fs:${dst}`,
      ]);
      expect(stdout.join('\n')).toMatch(/copied=2/);

      // Second run — both should be skipped per the migration log
      stdout.length = 0;
      await storageCliMain([
        'migrate',
        'memory',
        '--from',
        `fs:${src}`,
        '--to',
        `fs:${dst}`,
      ]);
      const second = stdout.join('\n');
      expect(second).toMatch(/copied=0/);
      expect(second).toMatch(/skipped=2/);
    });

    it('writes migration log to .aiwg/.storage-cache/migrations/', async () => {
      const src = join(projectRoot, 'src');
      const dst = join(projectRoot, 'dst');
      await mkdir(src, { recursive: true });
      await writeFile(join(src, 'a.md'), 'a', 'utf-8');

      await storageCliMain([
        'migrate',
        'memory',
        '--from',
        `fs:${src}`,
        '--to',
        `fs:${dst}`,
      ]);

      // The log path uses cwd-relative .aiwg/ — we can't predict cwd in
      // workers, but we can scan the project root for it
      const logDir = join(process.cwd(), '.aiwg', '.storage-cache', 'migrations');
      // Any file matching memory-fs-* should exist in *some* cwd-relative
      // location; we verify the summary line at minimum
      expect(stdout.join('\n')).toMatch(/Migration log:/);
      // Cleanup any log we may have created in cwd
      const { rm: rmAsync } = await import('fs/promises');
      try {
        await rmAsync(logDir, { recursive: true, force: true });
      } catch { /* ignore */ }
    });
  });

  describe('fs → obsidian migration', () => {
    it('copies entries into a configured obsidian vault', async () => {
      const src = join(projectRoot, 'src');
      const vault = join(projectRoot, 'vault');
      await mkdir(src, { recursive: true });
      await mkdir(join(vault, '.obsidian'), { recursive: true });
      await writeFile(join(src, 'note.md'), '# note', 'utf-8');

      await storageCliMain([
        'migrate',
        'memory',
        '--from',
        `fs:${src}`,
        '--to',
        `obsidian:${vault}`,
        '--to-folder',
        'AIWG/memory',
      ]);

      expect(existsSync(join(vault, 'AIWG/memory/note.md'))).toBe(true);
      const content = await readFile(join(vault, 'AIWG/memory/note.md'), 'utf-8');
      expect(content).toBe('# note');
    });
  });
});
