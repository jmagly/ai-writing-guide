/**
 * Tests for src/reflections/cli.ts (and indirectly src/storage/subsystem-cli.ts)
 *
 * The reflections CLI is a thin wrapper around runSubsystemCli, which
 * is also exercised by the memory CLI (#966). These tests cover the
 * reflections-specific routing + a handful of behaviors to confirm the
 * wrapper delegates correctly.
 *
 * @issue #934
 * @issue #967
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { existsSync } from 'fs';
import { initStorage, resetStorage } from '../../../src/storage/index.js';
import { main } from '../../../src/reflections/cli.js';

describe('reflections CLI (#967)', () => {
  let projectRoot: string;
  let reflectionsRoot: string;
  let stdout: string[];
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), 'aiwg-reflections-cli-test-'));
    reflectionsRoot = join(projectRoot, '.aiwg', 'reflections');
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
    it('prints the resolved reflections root', async () => {
      await main(['path']);
      expect(stdout.join('\n')).toMatch(/\.aiwg\/reflections$/);
    });

    it('--json includes backend and root', async () => {
      await main(['path', '--json']);
      const parsed = JSON.parse(stdout.join('\n'));
      expect(parsed.backend).toBe('fs');
      expect(parsed.root).toContain('.aiwg/reflections');
    });
  });

  describe('list / get / put / delete via the storage adapter', () => {
    it('writes go to the reflections subsystem root', async () => {
      const { resolveStorage } = await import('../../../src/storage/index.js');
      const adapter = await resolveStorage('reflections');
      await adapter.write('session/note.md', 'hello reflections');

      expect(existsSync(join(reflectionsRoot, 'session/note.md'))).toBe(true);

      // get does not throw
      await expect(main(['get', 'session/note.md'])).resolves.toBeUndefined();
    });

    it('list filters by prefix', async () => {
      await mkdir(join(reflectionsRoot, 'session'), { recursive: true });
      await writeFile(join(reflectionsRoot, 'session/a.md'), 'a', 'utf-8');
      await writeFile(join(reflectionsRoot, 'session/b.md'), 'b', 'utf-8');
      await mkdir(join(reflectionsRoot, 'other'), { recursive: true });
      await writeFile(join(reflectionsRoot, 'other/c.md'), 'c', 'utf-8');

      await main(['list', '--prefix', 'session/']);
      const out = stdout.join('\n');
      expect(out).toContain('session/a.md');
      expect(out).toContain('session/b.md');
      expect(out).not.toContain('other/c.md');
    });

    it('delete removes an entry', async () => {
      await mkdir(join(reflectionsRoot, 'session'), { recursive: true });
      await writeFile(join(reflectionsRoot, 'session/old.md'), 'x', 'utf-8');
      await main(['delete', 'session/old.md']);
      expect(existsSync(join(reflectionsRoot, 'session/old.md'))).toBe(false);
    });
  });

  describe('append-log JSONL semantics', () => {
    function stubStdin(content: string): () => void {
      const originalStdin = process.stdin;
      const mockStdin = {
        async *[Symbol.asyncIterator]() {
          yield content;
        },
      };
      Object.defineProperty(process, 'stdin', { value: mockStdin, configurable: true });
      return () => {
        Object.defineProperty(process, 'stdin', { value: originalStdin, configurable: true });
      };
    }

    it('appends a JSON object as a single JSONL line', async () => {
      const restore = stubStdin('{"event":"reflect","summary":"foo"}');
      try {
        await main(['append-log', 'sessions/log.jsonl']);
      } finally {
        restore();
      }
      const path = join(reflectionsRoot, 'sessions/log.jsonl');
      const content = await readFile(path, 'utf-8');
      expect(content).toBe('{"event":"reflect","summary":"foo"}\n');
    });

    it('appends multiple events without losing entries', async () => {
      const events = ['{"a":1}', '{"b":2}'];
      for (const e of events) {
        const restore = stubStdin(e);
        try {
          await main(['append-log', 'sessions/log.jsonl']);
        } finally {
          restore();
        }
      }
      const content = await readFile(join(reflectionsRoot, 'sessions/log.jsonl'), 'utf-8');
      expect(content.split('\n').filter((l) => l.length > 0)).toEqual(events);
    });

    it('rejects non-JSON stdin', async () => {
      const restore = stubStdin('not json');
      try {
        await expect(main(['append-log', 'log.jsonl'])).rejects.toThrow(/must be valid JSON/);
      } finally {
        restore();
      }
    });
  });

  describe('storage routing override', () => {
    it('honors roots.reflections override from storage.config', async () => {
      await mkdir(join(projectRoot, '.aiwg'), { recursive: true });
      await writeFile(
        join(projectRoot, '.aiwg', 'storage.config'),
        JSON.stringify({
          version: '1',
          roots: { reflections: 'custom-reflections' },
        }),
        'utf-8'
      );
      resetStorage();
      await initStorage(projectRoot);

      const { resolveStorage } = await import('../../../src/storage/index.js');
      const adapter = await resolveStorage('reflections');
      await adapter.write('redirected.md', 'x');

      expect(existsSync(join(projectRoot, '.aiwg/reflections/redirected.md'))).toBe(false);
      expect(existsSync(join(projectRoot, 'custom-reflections/redirected.md'))).toBe(true);
    });
  });

  describe('subsystem-cli identity', () => {
    it('uses memory CLI exposes the same surface (regression check)', async () => {
      // Confirm that the refactor of memory/cli.ts to runSubsystemCli
      // didn't break it — call an unknown subcommand, expect the same
      // error shape as reflections.
      const { main: memoryMain } = await import('../../../src/memory/cli.js');
      await expect(memoryMain(['frobulate'])).rejects.toThrow(/Unknown memory subcommand/);
      await expect(main(['frobulate'])).rejects.toThrow(/Unknown reflections subcommand/);
    });
  });
});
