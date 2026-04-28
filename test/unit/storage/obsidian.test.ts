/**
 * Tests for src/storage/backends/obsidian.ts
 *
 * @issue #934
 * @issue #957
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { existsSync } from 'fs';
import { ObsidianAdapter } from '../../../src/storage/backends/obsidian.js';

describe('storage/backends/obsidian', () => {
  let vault: string;
  let adapter: ObsidianAdapter;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vault = await mkdtemp(join(tmpdir(), 'aiwg-obsidian-test-'));
    // Seed the vault config dir to mirror real layout
    await mkdir(join(vault, '.obsidian'), { recursive: true });
    await writeFile(join(vault, '.obsidian', 'app.json'), '{}', 'utf-8');

    // Construct adapter with useCli: false to skip the CLI probe in tests
    adapter = new ObsidianAdapter({ type: 'obsidian', vault, useCli: false });
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(async () => {
    stderrSpy.mockRestore();
    await rm(vault, { recursive: true, force: true });
  });

  describe('write / read', () => {
    it('writes and reads a markdown file at the vault root', async () => {
      await adapter.write('foo.md', '# Foo\n');
      const out = await adapter.read('foo.md');
      expect(out).toBe('# Foo\n');
      expect(existsSync(join(vault, 'foo.md'))).toBe(true);
    });

    it('honors `folder` config to scope writes', async () => {
      const scoped = new ObsidianAdapter({
        type: 'obsidian',
        vault,
        folder: 'AIWG/memory',
        useCli: false,
      });
      await scoped.init();
      await scoped.write('note.md', 'hello');
      expect(existsSync(join(vault, 'AIWG', 'memory', 'note.md'))).toBe(true);
      // Outside the folder scope
      expect(existsSync(join(vault, 'note.md'))).toBe(false);
    });

    it('returns null for missing files', async () => {
      expect(await adapter.read('nope.md')).toBeNull();
    });

    it('overwrites on second write', async () => {
      await adapter.write('foo.md', 'one');
      await adapter.write('foo.md', 'two');
      expect(await adapter.read('foo.md')).toBe('two');
    });
  });

  describe('frontmatter merging', () => {
    it('prepends YAML frontmatter when WriteMeta.frontmatter is provided and content has none', async () => {
      await adapter.write('foo.md', 'body content', {
        frontmatter: { tags: ['ai', 'note'], created: '2026-04-28' },
      });
      const content = await adapter.read('foo.md');
      expect(content).toMatch(/^---\n/);
      expect(content).toContain('tags: [ai, note]');
      expect(content).toContain('created: 2026-04-28');
      expect(content).toContain('body content');
    });

    it('does not overwrite existing frontmatter', async () => {
      const original = '---\ntitle: Existing\n---\n\nbody';
      await adapter.write('foo.md', original, { frontmatter: { tags: ['ignored'] } });
      const content = await adapter.read('foo.md');
      expect(content).toBe(original);
      expect(content).not.toContain('ignored');
    });

    it('quotes YAML scalars with special characters', async () => {
      await adapter.write('foo.md', 'body', {
        frontmatter: { title: 'Has: a colon', desc: 'plain text' },
      });
      const content = await adapter.read('foo.md');
      expect(content).toContain('title: "Has: a colon"');
      expect(content).toContain('desc: plain text');
    });
  });

  describe('.obsidian/ guard', () => {
    it('refuses to write into .obsidian/', async () => {
      await expect(adapter.write('.obsidian/app.json', 'leaked')).rejects.toThrow(
        /refusing to operate on \.obsidian\//
      );
    });

    it('refuses to read from .obsidian/', async () => {
      await expect(adapter.read('.obsidian/app.json')).rejects.toThrow(
        /refusing to operate on \.obsidian\//
      );
    });

    it('refuses to delete from .obsidian/', async () => {
      await expect(adapter.delete('.obsidian/app.json')).rejects.toThrow(
        /refusing to operate on \.obsidian\//
      );
    });

    it('skips .obsidian/ when listing', async () => {
      // Seed both real content and a .obsidian config file
      await adapter.write('note.md', 'hello');
      await writeFile(join(vault, '.obsidian', 'workspace.json'), '{}', 'utf-8');

      const entries = await adapter.list('');
      const paths = entries.map((e) => e.path);
      expect(paths).toContain('note.md');
      expect(paths.some((p) => p.startsWith('.obsidian'))).toBe(false);
    });
  });

  describe('path traversal rejection', () => {
    it('rejects ".." segments', async () => {
      await expect(adapter.read('../escape.md')).rejects.toThrow(/".." traversal/);
      await expect(adapter.write('../escape.md', 'x')).rejects.toThrow(/".." traversal/);
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
  });

  describe('list', () => {
    it('lists files recursively', async () => {
      await adapter.write('a.md', '1');
      await adapter.write('sub/b.md', '2');
      await adapter.write('sub/deeper/c.md', '3');
      const entries = await adapter.list('');
      const paths = entries.map((e) => e.path).sort();
      expect(paths).toEqual(['a.md', 'sub/b.md', 'sub/deeper/c.md']);
    });

    it('filters by prefix', async () => {
      await adapter.write('a/x.md', '1');
      await adapter.write('b/y.md', '2');
      const entries = await adapter.list('a/');
      expect(entries.map((e) => e.path)).toEqual(['a/x.md']);
    });

    it('reports size and modifiedAt', async () => {
      await adapter.write('foo.md', 'hello');
      const entries = await adapter.list('foo');
      expect(entries[0].size).toBeGreaterThan(0);
      expect(entries[0].modifiedAt).toBeInstanceOf(Date);
    });
  });

  describe('init', () => {
    it('throws when the vault does not exist', async () => {
      const ghost = new ObsidianAdapter({
        type: 'obsidian',
        vault: '/tmp/this-vault-definitely-does-not-exist-12345',
        useCli: false,
      });
      await expect(ghost.init()).rejects.toThrow(/vault does not exist/);
    });

    it('does not throw when the vault exists', async () => {
      await expect(adapter.init()).resolves.toBeUndefined();
    });

    it('emits a one-time stderr warning when useCli is true and CLI is missing', async () => {
      // Force PATH to a location with no `obsidian` binary
      const originalPath = process.env.PATH;
      process.env.PATH = '/nonexistent';
      try {
        const cliAdapter = new ObsidianAdapter({ type: 'obsidian', vault, useCli: true });
        await cliAdapter.init();
        const warned = stderrSpy.mock.calls.some((c) =>
          String(c[0]).includes('CLI requested')
        );
        expect(warned).toBe(true);

        // Second init should not warn again (cached)
        stderrSpy.mockClear();
        await cliAdapter.init();
        const warnedAgain = stderrSpy.mock.calls.some((c) =>
          String(c[0]).includes('CLI requested')
        );
        expect(warnedAgain).toBe(false);
      } finally {
        process.env.PATH = originalPath;
      }
    });
  });

  describe('delete', () => {
    it('removes a file', async () => {
      await adapter.write('foo.md', 'x');
      await adapter.delete('foo.md');
      expect(await adapter.read('foo.md')).toBeNull();
    });

    it('is a no-op for missing paths', async () => {
      await expect(adapter.delete('nope.md')).resolves.toBeUndefined();
    });
  });

  describe('integration with resolveStorage', () => {
    it('routes writes through ObsidianAdapter when configured', async () => {
      const projectRoot = await mkdtemp(join(tmpdir(), 'aiwg-obsidian-integration-'));
      try {
        await mkdir(join(projectRoot, '.aiwg'), { recursive: true });
        await writeFile(
          join(projectRoot, '.aiwg', 'storage.config'),
          JSON.stringify({
            version: '1',
            backends: {
              memory: { type: 'obsidian', vault, folder: 'AIWG/memory', useCli: false },
            },
          }),
          'utf-8'
        );

        const { resolveStorage, resetStorage, initStorage } = await import(
          '../../../src/storage/index.js'
        );
        resetStorage();
        await initStorage(projectRoot);

        const memory = await resolveStorage('memory');
        await memory.write('test-note.md', '# Routed via storage.config');

        // Landed at the vault, not under .aiwg/memory/
        expect(existsSync(join(vault, 'AIWG', 'memory', 'test-note.md'))).toBe(true);
        expect(existsSync(join(projectRoot, '.aiwg', 'memory', 'test-note.md'))).toBe(false);

        const got = await readFile(join(vault, 'AIWG', 'memory', 'test-note.md'), 'utf-8');
        expect(got).toBe('# Routed via storage.config');
      } finally {
        await rm(projectRoot, { recursive: true, force: true });
      }
    });
  });
});
