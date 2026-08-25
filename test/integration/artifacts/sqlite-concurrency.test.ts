import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';
import { SqliteGraphBackend } from '../../../src/artifacts/backends/sqlite-backend.js';

const execFileAsync = promisify(execFile);
const roots: string[] = [];
const tsxImportUrl = import.meta.resolve('tsx');
const backendUrl = pathToFileURL(
  fileURLToPath(new URL('../../../src/artifacts/backends/sqlite-backend.ts', import.meta.url)),
).href;

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('SQLite same-host concurrency and crash recovery (#2189)', () => {
  it('serializes multiple processes, deduplicates same-key races, and reopens committed WAL writes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aiwg-sqlite-concurrency-'));
    roots.push(root);
    const dbPath = join(root, 'graph.db');
    const worker = `
      const { SqliteGraphBackend } = await import(${JSON.stringify(backendUrl)});
      const db = new SqliteGraphBackend(process.argv[1], { busyTimeoutMs: 10000 });
      const worker = process.argv[2];
      for (let i = 0; i < 20; i++) {
        db.addNode('shared', { worker, iteration: i });
        db.addEdge('worker-' + worker, 'node-' + worker + '-' + i, 'emits');
      }
      if (worker !== 'crash') db.close();
    `;
    const run = (workerId: string) => execFileAsync(process.execPath, [
      '--import', tsxImportUrl,
      '--input-type=module',
      '--eval', worker,
      dbPath,
      workerId,
    ]);

    await Promise.all(['a', 'b', 'c', 'crash'].map(run));

    const reopened = new SqliteGraphBackend(dbPath);
    try {
      expect(reopened.nodes().filter(id => id === 'shared')).toEqual(['shared']);
      expect(reopened.edgeCount()).toBe(80);
      for (const workerId of ['a', 'b', 'c', 'crash']) {
        expect(reopened.hasEdge(`worker-${workerId}`, `node-${workerId}-19`, 'emits')).toBe(true);
      }
    } finally {
      reopened.close();
    }
  }, 30_000);
});
