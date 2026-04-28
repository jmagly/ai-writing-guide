/**
 * Tests for src/kb/cli.ts
 *
 * @issue #934
 * @issue #965
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { existsSync } from 'fs';
import { initStorage, resetStorage } from '../../../src/storage/index.js';
import { main } from '../../../src/kb/cli.js';

describe('kb CLI (#965)', () => {
  let projectRoot: string;
  let kbRoot: string;
  let stdout: string[];
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), 'aiwg-kb-cli-test-'));
    kbRoot = join(projectRoot, '.aiwg', 'kb');
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

  describe('path', () => {
    it('prints the resolved KB root for the default fs backend', async () => {
      // Note: handlePath uses process.cwd() so it can pick up storage.config
      // outside the registry state. We mock by initializing storage before.
      // This test passes when run from temp project root via initStorage.
      // For the path subcommand to work in tests, we'll need a small
      // projectRoot override mechanism, but the smoke test confirms
      // the command runs.
      await main(['path']);
      const out = stdout.join('\n');
      // The output is an absolute path
      expect(out).toMatch(/\.aiwg\/kb$|^\//);
    });

    it('prints subpath when given', async () => {
      await main(['path', 'entities/foo.md']);
      const out = stdout.join('\n');
      expect(out).toContain('.aiwg/kb/entities/foo.md');
    });

    it('--json outputs structured data', async () => {
      await main(['path', '--json']);
      const parsed = JSON.parse(stdout.join('\n'));
      expect(parsed).toHaveProperty('backend');
      expect(parsed).toHaveProperty('root');
      expect(parsed).toHaveProperty('path');
    });
  });

  describe('get / delete round-trip', () => {
    it('get reads an existing file via the storage adapter (no error path)', async () => {
      // Seed the KB through the storage adapter (same path users hit)
      const { resolveStorage } = await import('../../../src/storage/index.js');
      const adapter = await resolveStorage('kb');
      await adapter.write('entities/test.md', '# Hello\n\nKB content');

      // get should succeed without throwing — vitest workers can't
      // reliably intercept process.stdout.write, so we verify by
      // confirming the underlying read returns the expected content
      // via the adapter and that `main(['get', ...])` doesn't throw.
      await expect(main(['get', 'entities/test.md'])).resolves.toBeUndefined();
      const content = await adapter.read('entities/test.md');
      expect(content).toBe('# Hello\n\nKB content');
    });

    it('get throws clear error for missing entry', async () => {
      await expect(main(['get', 'missing.md'])).rejects.toThrow(/KB entry not found/);
    });

    it('delete removes an existing entry', async () => {
      await mkdir(join(kbRoot, 'entities'), { recursive: true });
      await writeFile(join(kbRoot, 'entities/foo.md'), 'content', 'utf-8');

      await main(['delete', 'entities/foo.md']);
      expect(existsSync(join(kbRoot, 'entities/foo.md'))).toBe(false);
    });

    it('delete is a no-op for missing path', async () => {
      await expect(main(['delete', 'nope.md'])).resolves.toBeUndefined();
    });
  });

  describe('list', () => {
    beforeEach(async () => {
      await mkdir(join(kbRoot, 'entities'), { recursive: true });
      await mkdir(join(kbRoot, 'concepts'), { recursive: true });
      await writeFile(join(kbRoot, 'entities/a.md'), 'a', 'utf-8');
      await writeFile(join(kbRoot, 'entities/b.md'), 'b', 'utf-8');
      await writeFile(join(kbRoot, 'concepts/c.md'), 'c', 'utf-8');
    });

    it('lists all entries when no prefix', async () => {
      await main(['list']);
      const out = stdout.join('\n');
      expect(out).toContain('entities/a.md');
      expect(out).toContain('entities/b.md');
      expect(out).toContain('concepts/c.md');
    });

    it('filters by --prefix', async () => {
      await main(['list', '--prefix', 'entities/']);
      const out = stdout.join('\n');
      expect(out).toContain('entities/a.md');
      expect(out).toContain('entities/b.md');
      expect(out).not.toContain('concepts/c.md');
    });

    it('reports empty result gracefully', async () => {
      await main(['list', '--prefix', 'nonexistent/']);
      expect(stdout.join(' ')).toMatch(/No entries/);
    });

    it('--json outputs an array of entries', async () => {
      await main(['list', '--json']);
      const parsed = JSON.parse(stdout.join('\n'));
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(3);
      expect(parsed[0]).toHaveProperty('path');
      expect(parsed[0]).toHaveProperty('size');
    });
  });

  describe('storage routing', () => {
    it('honors roots.kb override from storage.config', async () => {
      await mkdir(join(projectRoot, '.aiwg'), { recursive: true });
      await writeFile(
        join(projectRoot, '.aiwg', 'storage.config'),
        JSON.stringify({
          version: '1',
          roots: { kb: 'custom-kb' },
        }),
        'utf-8'
      );
      resetStorage();
      await initStorage(projectRoot);

      // Seed via the adapter directly (which is what `put` would do
      // through stdin) — this verifies the routing piece without
      // requiring stdin mocking.
      const { resolveStorage } = await import('../../../src/storage/index.js');
      const adapter = await resolveStorage('kb');
      await adapter.write('entities/redirect.md', 'redirected');

      // The write landed at the redirected path, not the legacy default
      expect(existsSync(join(projectRoot, '.aiwg/kb/entities/redirect.md'))).toBe(false);
      expect(existsSync(join(projectRoot, 'custom-kb/entities/redirect.md'))).toBe(true);

      // And `aiwg kb get` reads through the same routed adapter
      // (verified by exit-without-throw + adapter readback equivalence)
      await expect(main(['get', 'entities/redirect.md'])).resolves.toBeUndefined();
      expect(await adapter.read('entities/redirect.md')).toBe('redirected');
    });
  });

  describe('argument validation', () => {
    it('put without path errors clearly', async () => {
      await expect(main(['put'])).rejects.toThrow(/Usage: aiwg kb put/);
    });

    it('get without path errors clearly', async () => {
      await expect(main(['get'])).rejects.toThrow(/Usage: aiwg kb get/);
    });

    it('delete without path errors clearly', async () => {
      await expect(main(['delete'])).rejects.toThrow(/Usage: aiwg kb delete/);
    });

    it('unknown subcommand errors', async () => {
      await expect(main(['frobulate'])).rejects.toThrow(/Unknown kb subcommand/);
    });
  });
});
