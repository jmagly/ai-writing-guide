/**
 * Tests for src/storage/backends/fs.ts
 *
 * @source @src/storage/backends/fs.ts
 * @issue #934
 * @issue #956
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { existsSync } from 'fs';
import { FilesystemAdapter } from '../../../src/storage/backends/fs.js';

describe('storage/backends/fs', () => {
  let root: string;
  let adapter: FilesystemAdapter;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'aiwg-storage-fs-test-'));
    adapter = new FilesystemAdapter(root);
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  describe('write/read', () => {
    it('writes and reads back a file', async () => {
      await adapter.write('foo.md', 'hello');
      const out = await adapter.read('foo.md');
      expect(out).toBe('hello');
    });

    it('creates parent directories on write', async () => {
      await adapter.write('a/b/c/note.md', 'nested');
      const out = await adapter.read('a/b/c/note.md');
      expect(out).toBe('nested');
    });

    it('overwrites on second write (idempotent)', async () => {
      await adapter.write('foo.md', 'one');
      await adapter.write('foo.md', 'two');
      const out = await adapter.read('foo.md');
      expect(out).toBe('two');
    });

    it('returns null for missing path (does not throw)', async () => {
      const out = await adapter.read('nope.md');
      expect(out).toBeNull();
    });

    it('reads byte-identically (no trailing transforms)', async () => {
      // Activity-log migration depends on byte-identical fs behavior on the default backend
      const content = '## [2026-04-28 03:48] commit | feat: foo\n## [2026-04-28 04:00] commit | feat: bar\n';
      await adapter.write('activity.log', content);
      const got = await adapter.read('activity.log');
      expect(got).toBe(content);
    });
  });

  describe('list', () => {
    it('returns empty array on empty subsystem root', async () => {
      const out = await adapter.list('');
      expect(out).toEqual([]);
    });

    it('lists files recursively when prefix is empty', async () => {
      await adapter.write('a.md', '1');
      await adapter.write('sub/b.md', '2');
      await adapter.write('sub/deeper/c.md', '3');
      const out = await adapter.list('');
      const paths = out.map((e) => e.path).sort();
      expect(paths).toEqual(['a.md', 'sub/b.md', 'sub/deeper/c.md']);
    });

    it('filters by prefix', async () => {
      await adapter.write('a/x.md', '1');
      await adapter.write('b/y.md', '2');
      const out = await adapter.list('a/');
      expect(out.map((e) => e.path)).toEqual(['a/x.md']);
    });

    it('returns size and modifiedAt', async () => {
      await adapter.write('foo.md', 'hello');
      const out = await adapter.list('foo');
      expect(out).toHaveLength(1);
      expect(out[0].size).toBeGreaterThan(0);
      expect(out[0].modifiedAt).toBeInstanceOf(Date);
    });
  });

  describe('delete', () => {
    it('removes a file', async () => {
      await adapter.write('foo.md', 'hello');
      await adapter.delete('foo.md');
      expect(await adapter.read('foo.md')).toBeNull();
    });

    it('is a no-op for missing paths', async () => {
      await expect(adapter.delete('nope.md')).resolves.toBeUndefined();
    });
  });

  describe('path traversal rejection', () => {
    it('rejects ".." segments', async () => {
      await expect(adapter.read('../escape.md')).rejects.toThrow(/".." traversal/);
      await expect(adapter.write('../escape.md', 'x')).rejects.toThrow(/".." traversal/);
      await expect(adapter.delete('../escape.md')).rejects.toThrow(/".." traversal/);
    });

    it('rejects absolute paths', async () => {
      await expect(adapter.read('/etc/passwd')).rejects.toThrow(/absolute paths not allowed/);
    });

    it('rejects ~ paths', async () => {
      await expect(adapter.read('~/secrets.md')).rejects.toThrow(/absolute paths not allowed/);
    });

    it('rejects backslash in paths', async () => {
      await expect(adapter.read('a\\b.md')).rejects.toThrow(/backslash not allowed/);
    });

    it('rejects empty paths', async () => {
      await expect(adapter.read('')).rejects.toThrow(/non-empty string/);
    });
  });

  describe('honors arbitrary root from constructor', () => {
    it('writes go to the configured root, not cwd', async () => {
      const elsewhere = await mkdtemp(join(tmpdir(), 'aiwg-storage-fs-elsewhere-'));
      try {
        const a = new FilesystemAdapter(elsewhere);
        await a.write('foo.md', 'x');
        expect(existsSync(join(elsewhere, 'foo.md'))).toBe(true);
        // Pre-existing different root is unchanged
        expect(existsSync(join(root, 'foo.md'))).toBe(false);
      } finally {
        await rm(elsewhere, { recursive: true, force: true });
      }
    });
  });
});
