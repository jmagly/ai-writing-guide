/**
 * Tests for src/storage/backends/logseq.ts
 *
 * @issue #934
 * @issue #958
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { existsSync } from 'fs';
import { LogseqAdapter } from '../../../src/storage/backends/logseq.js';

describe('storage/backends/logseq', () => {
  let graph: string;
  let adapter: LogseqAdapter;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    graph = await mkdtemp(join(tmpdir(), 'aiwg-logseq-test-'));
    await mkdir(join(graph, 'logseq'), { recursive: true });
    await mkdir(join(graph, 'pages'), { recursive: true });
    await mkdir(join(graph, 'journals'), { recursive: true });
    await writeFile(join(graph, 'logseq', 'config.edn'), '{}', 'utf-8');

    adapter = new LogseqAdapter({ type: 'logseq', graph, useApi: false });
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(async () => {
    stderrSpy.mockRestore();
    await rm(graph, { recursive: true, force: true });
  });

  describe('write / read', () => {
    it('writes and reads pages/<title>.md', async () => {
      await adapter.write('pages/foo.md', '- block 1\n- block 2\n');
      const content = await adapter.read('pages/foo.md');
      expect(content).toBe('- block 1\n- block 2\n');
    });

    it('writes and reads journals/YYYY_MM_DD.md', async () => {
      await adapter.write('journals/2026_04_28.md', '- daily entry\n');
      expect(existsSync(join(graph, 'journals/2026_04_28.md'))).toBe(true);
    });

    it('returns null for missing files', async () => {
      expect(await adapter.read('pages/missing.md')).toBeNull();
    });
  });

  describe('frontmatter → page-property transform', () => {
    it('strips YAML frontmatter and emits Logseq page properties', async () => {
      const content = '---\ntags: [ai, note]\ncreated: 2026-04-28\n---\n\n- body block';
      await adapter.write('pages/foo.md', content);
      const out = await adapter.read('pages/foo.md');
      expect(out).not.toContain('---');
      expect(out).toContain('tags:: ai, note');
      expect(out).toContain('created:: 2026-04-28');
      expect(out).toContain('- body block');
    });

    it('renders WriteMeta.frontmatter as page properties when content has none', async () => {
      await adapter.write('pages/foo.md', '- body', {
        frontmatter: { tags: ['ai'], priority: 1 },
      });
      const out = await adapter.read('pages/foo.md');
      expect(out).toContain('tags:: ai');
      expect(out).toContain('priority:: 1');
      expect(out).toContain('- body');
    });

    it('merges WriteMeta.frontmatter on top of YAML frontmatter (meta wins)', async () => {
      const content = '---\ntags: [original]\n---\n\n- body';
      await adapter.write('pages/foo.md', content, {
        frontmatter: { tags: ['override'], extra: 'yes' },
      });
      const out = await adapter.read('pages/foo.md');
      expect(out).toContain('tags:: override');
      expect(out).not.toContain('tags:: original');
      expect(out).toContain('extra:: yes');
    });

    it('strips id:: lines that the caller smuggles in', async () => {
      await adapter.write('pages/foo.md', 'id:: abc-123\n- block content\n');
      const out = await adapter.read('pages/foo.md');
      expect(out).not.toContain('id::');
      expect(out).toContain('- block content');
    });
  });

  describe('logseq/ guard', () => {
    it('refuses to write into logseq/', async () => {
      await expect(adapter.write('logseq/config.edn', 'x')).rejects.toThrow(
        /refusing to operate on logseq\//
      );
    });

    it('refuses to read from logseq/', async () => {
      await expect(adapter.read('logseq/config.edn')).rejects.toThrow(
        /refusing to operate on logseq\//
      );
    });

    it('refuses to delete from logseq/', async () => {
      await expect(adapter.delete('logseq/config.edn')).rejects.toThrow(
        /refusing to operate on logseq\//
      );
    });

    it('skips logseq/ when listing', async () => {
      await adapter.write('pages/foo.md', '- block');
      const entries = await adapter.list('');
      const paths = entries.map((e) => e.path);
      expect(paths).toContain('pages/foo.md');
      expect(paths.some((p) => p.startsWith('logseq/'))).toBe(false);
    });
  });

  describe('path traversal rejection', () => {
    it('rejects ".." segments', async () => {
      await expect(adapter.read('../escape.md')).rejects.toThrow(/".." traversal/);
    });

    it('rejects absolute paths', async () => {
      await expect(adapter.read('/etc/passwd')).rejects.toThrow(/absolute paths not allowed/);
    });

    it('rejects backslash in paths', async () => {
      await expect(adapter.read('a\\b.md')).rejects.toThrow(/backslash not allowed/);
    });
  });

  describe('list', () => {
    it('lists pages and journals recursively', async () => {
      await adapter.write('pages/a.md', '- a');
      await adapter.write('pages/b.md', '- b');
      await adapter.write('journals/2026_04_28.md', '- j');
      const entries = await adapter.list('');
      const paths = entries.map((e) => e.path).sort();
      expect(paths).toEqual(['journals/2026_04_28.md', 'pages/a.md', 'pages/b.md']);
    });

    it('filters by prefix', async () => {
      await adapter.write('pages/a.md', '- a');
      await adapter.write('journals/2026_04_28.md', '- j');
      const entries = await adapter.list('pages/');
      expect(entries.map((e) => e.path)).toEqual(['pages/a.md']);
    });

    it('reports size and modifiedAt', async () => {
      await adapter.write('pages/foo.md', '- block');
      const entries = await adapter.list('pages/');
      expect(entries[0].size).toBeGreaterThan(0);
      expect(entries[0].modifiedAt).toBeInstanceOf(Date);
    });
  });

  describe('init', () => {
    it('throws when the graph does not exist', async () => {
      const ghost = new LogseqAdapter({
        type: 'logseq',
        graph: '/tmp/this-graph-definitely-does-not-exist-12345',
        useApi: false,
      });
      await expect(ghost.init()).rejects.toThrow(/graph does not exist/);
    });

    it('does not throw when graph exists and useApi is false', async () => {
      await expect(adapter.init()).resolves.toBeUndefined();
    });

    it('warns when useApi is true but LOGSEQ_API_TOKEN is unset', async () => {
      const originalToken = process.env.LOGSEQ_API_TOKEN;
      delete process.env.LOGSEQ_API_TOKEN;
      try {
        const apiAdapter = new LogseqAdapter({ type: 'logseq', graph, useApi: true });
        await apiAdapter.init();
        const warned = stderrSpy.mock.calls.some((c) =>
          String(c[0]).includes('LOGSEQ_API_TOKEN')
        );
        expect(warned).toBe(true);
      } finally {
        if (originalToken === undefined) delete process.env.LOGSEQ_API_TOKEN;
        else process.env.LOGSEQ_API_TOKEN = originalToken;
      }
    });
  });

  describe('delete', () => {
    it('removes a file', async () => {
      await adapter.write('pages/foo.md', '- x');
      await adapter.delete('pages/foo.md');
      expect(await adapter.read('pages/foo.md')).toBeNull();
    });

    it('is a no-op for missing paths', async () => {
      await expect(adapter.delete('pages/nope.md')).resolves.toBeUndefined();
    });
  });

  describe('integration with resolveStorage', () => {
    it('routes writes through LogseqAdapter when configured', async () => {
      const projectRoot = await mkdtemp(join(tmpdir(), 'aiwg-logseq-integration-'));
      try {
        await mkdir(join(projectRoot, '.aiwg'), { recursive: true });
        await writeFile(
          join(projectRoot, '.aiwg', 'storage.config'),
          JSON.stringify({
            version: '1',
            backends: {
              kb: { type: 'logseq', graph, useApi: false },
            },
          }),
          'utf-8'
        );

        const { resolveStorage, resetStorage, initStorage } = await import(
          '../../../src/storage/index.js'
        );
        resetStorage();
        await initStorage(projectRoot);

        const kb = await resolveStorage('kb');
        await kb.write('pages/test-routed.md', '- routed via storage.config\n', {
          frontmatter: { source: 'aiwg' },
        });

        const written = await readFile(join(graph, 'pages/test-routed.md'), 'utf-8');
        expect(written).toContain('source:: aiwg');
        expect(written).toContain('- routed via storage.config');
      } finally {
        await rm(projectRoot, { recursive: true, force: true });
      }
    });
  });
});
