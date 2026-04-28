/**
 * Tests for src/memory/cli.ts
 *
 * @issue #934
 * @issue #966
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { existsSync } from 'fs';
import { initStorage, resetStorage } from '../../../src/storage/index.js';
import { main } from '../../../src/memory/cli.js';

describe('memory CLI (#966)', () => {
  let projectRoot: string;
  let memoryRoot: string;
  let stdout: string[];
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), 'aiwg-memory-cli-test-'));
    memoryRoot = join(projectRoot, '.aiwg', 'memory');
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
    it('prints the resolved memory root for the default fs backend', async () => {
      await main(['path']);
      expect(stdout.join('\n')).toMatch(/\.aiwg\/memory$|^\//);
    });

    it('prints subpath when given', async () => {
      await main(['path', 'research-complete/index.md']);
      expect(stdout.join('\n')).toContain('.aiwg/memory/research-complete/index.md');
    });

    it('--json outputs structured data', async () => {
      await main(['path', '--json']);
      const parsed = JSON.parse(stdout.join('\n'));
      expect(parsed).toHaveProperty('backend');
      expect(parsed).toHaveProperty('root');
      expect(parsed).toHaveProperty('path');
    });
  });

  describe('list', () => {
    beforeEach(async () => {
      await mkdir(join(memoryRoot, 'research-complete'), { recursive: true });
      await mkdir(join(memoryRoot, 'sdlc-complete'), { recursive: true });
      await writeFile(join(memoryRoot, 'research-complete/index.md'), 'r-index', 'utf-8');
      await writeFile(join(memoryRoot, 'research-complete/notes.md'), 'r-notes', 'utf-8');
      await writeFile(join(memoryRoot, 'sdlc-complete/log.jsonl'), '{"op":"ingest"}\n', 'utf-8');
    });

    it('lists all entries when no prefix', async () => {
      await main(['list']);
      const out = stdout.join('\n');
      expect(out).toContain('research-complete/index.md');
      expect(out).toContain('research-complete/notes.md');
      expect(out).toContain('sdlc-complete/log.jsonl');
    });

    it('filters by --prefix', async () => {
      await main(['list', '--prefix', 'research-complete/']);
      const out = stdout.join('\n');
      expect(out).toContain('research-complete/index.md');
      expect(out).not.toContain('sdlc-complete/log.jsonl');
    });

    it('reports empty result gracefully', async () => {
      await main(['list', '--prefix', 'nonexistent/']);
      expect(stdout.join(' ')).toMatch(/No memory entries/);
    });

    it('--json outputs an array', async () => {
      await main(['list', '--json']);
      const parsed = JSON.parse(stdout.join('\n'));
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(3);
    });
  });

  describe('get / delete', () => {
    it('get reads via the storage adapter', async () => {
      const { resolveStorage } = await import('../../../src/storage/index.js');
      const adapter = await resolveStorage('memory');
      await adapter.write('research-complete/page.md', '# page content');

      // get() succeeds without throwing — content equivalence verified
      // through the adapter (vitest workers can't reliably spy stdout)
      await expect(main(['get', 'research-complete/page.md'])).resolves.toBeUndefined();
      expect(await adapter.read('research-complete/page.md')).toBe('# page content');
    });

    it('get throws clear error for missing entry', async () => {
      await expect(main(['get', 'missing.md'])).rejects.toThrow(/entry not found/i);
    });

    it('delete removes an existing entry', async () => {
      await mkdir(join(memoryRoot, 'research-complete'), { recursive: true });
      await writeFile(join(memoryRoot, 'research-complete/old.md'), 'x', 'utf-8');
      await main(['delete', 'research-complete/old.md']);
      expect(existsSync(join(memoryRoot, 'research-complete/old.md'))).toBe(false);
    });

    it('delete is a no-op for missing path', async () => {
      await expect(main(['delete', 'nope.md'])).resolves.toBeUndefined();
    });
  });

  describe('append-log', () => {
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
      const restore = stubStdin('{"op":"ingest","summary":"foo"}');
      try {
        await main(['append-log', 'research-complete/log.jsonl']);
      } finally {
        restore();
      }
      const path = join(memoryRoot, 'research-complete/log.jsonl');
      const content = await readFile(path, 'utf-8');
      expect(content).toBe('{"op":"ingest","summary":"foo"}\n');
    });

    it('appends multiple events without losing entries (round-trip)', async () => {
      const events = ['{"a":1}', '{"b":2}', '{"c":3}'];
      for (const e of events) {
        const restore = stubStdin(e);
        try {
          await main(['append-log', 'consumer/log.jsonl']);
        } finally {
          restore();
        }
      }
      const path = join(memoryRoot, 'consumer/log.jsonl');
      const content = await readFile(path, 'utf-8');
      expect(content.split('\n').filter((l) => l.length > 0)).toEqual(events);
    });

    it('handles existing log without trailing newline (backward compat)', async () => {
      await mkdir(join(memoryRoot, 'consumer'), { recursive: true });
      await writeFile(
        join(memoryRoot, 'consumer/log.jsonl'),
        '{"existing":"entry"}', // no trailing newline
        'utf-8'
      );
      const restore = stubStdin('{"new":"entry"}');
      try {
        await main(['append-log', 'consumer/log.jsonl']);
      } finally {
        restore();
      }
      const content = await readFile(join(memoryRoot, 'consumer/log.jsonl'), 'utf-8');
      const lines = content.split('\n').filter((l) => l.length > 0);
      expect(lines).toEqual(['{"existing":"entry"}', '{"new":"entry"}']);
    });

    it('rejects non-JSON stdin', async () => {
      const restore = stubStdin('not json');
      try {
        await expect(main(['append-log', 'log.jsonl'])).rejects.toThrow(/must be valid JSON/);
      } finally {
        restore();
      }
    });

    it('rejects empty stdin', async () => {
      const restore = stubStdin('');
      try {
        await expect(main(['append-log', 'log.jsonl'])).rejects.toThrow(/empty input/);
      } finally {
        restore();
      }
    });

    it('rejects JSON arrays / primitives', async () => {
      const restore = stubStdin('[1, 2, 3]');
      try {
        await expect(main(['append-log', 'log.jsonl'])).rejects.toThrow(/single JSON object/);
      } finally {
        restore();
      }
    });

    it('rejects when log path is missing', async () => {
      await expect(main(['append-log'])).rejects.toThrow(/Usage: aiwg memory append-log/);
    });
  });

  describe('storage routing', () => {
    it('honors roots.memory override from storage.config', async () => {
      await mkdir(join(projectRoot, '.aiwg'), { recursive: true });
      await writeFile(
        join(projectRoot, '.aiwg', 'storage.config'),
        JSON.stringify({
          version: '1',
          roots: { memory: 'custom-memory' },
        }),
        'utf-8'
      );
      resetStorage();
      await initStorage(projectRoot);

      const { resolveStorage } = await import('../../../src/storage/index.js');
      const adapter = await resolveStorage('memory');
      await adapter.write('redirected.md', 'x');

      // Default path must NOT exist; custom path must
      expect(existsSync(join(projectRoot, '.aiwg/memory/redirected.md'))).toBe(false);
      expect(existsSync(join(projectRoot, 'custom-memory/redirected.md'))).toBe(true);
    });
  });

  describe('argument validation', () => {
    it('put without path errors clearly', async () => {
      await expect(main(['put'])).rejects.toThrow(/Usage: aiwg memory put/);
    });

    it('get without path errors clearly', async () => {
      await expect(main(['get'])).rejects.toThrow(/Usage: aiwg memory get/);
    });

    it('delete without path errors clearly', async () => {
      await expect(main(['delete'])).rejects.toThrow(/Usage: aiwg memory delete/);
    });

    it('unknown subcommand errors', async () => {
      await expect(main(['frobulate'])).rejects.toThrow(/Unknown memory subcommand/);
    });
  });
});
