import { afterEach, describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { closeGraphBackend, configuredGraphBackend, openGraphBackend } from '../../../src/artifacts/backend-runtime.js';
import { getGraphIndexDir } from '../../../src/artifacts/types.js';

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });

async function project(index: Record<string, unknown>) {
  const root = await mkdtemp(join(tmpdir(), 'aiwg-backend-runtime-'));
  roots.push(root);
  await mkdir(join(root, '.aiwg'), { recursive: true });
  await writeFile(join(root, '.aiwg', 'aiwg.config'), JSON.stringify({ index }));
  return root;
}

describe('production graph backend resolution (#2188)', () => {
  it('uses JSON when no default or override is configured', async () => {
    const root = await project({ graphs: { sample: { scanDirs: ['docs'] } } });
    expect(configuredGraphBackend(root, 'sample')).toBe('json');
  });

  it('applies per-graph override before the project default', async () => {
    const root = await project({
      graphBackend: 'graphology',
      graphs: { sample: { scanDirs: ['docs'], graphBackend: 'json' } },
    });
    expect(configuredGraphBackend(root, 'sample')).toBe('json');
    expect(configuredGraphBackend(root, 'project')).toBe('graphology');
  });

  it('opens SQLite at the deterministic persistent graph path and seeds compatibility JSON', async () => {
    let available = true;
    try { await import('better-sqlite3'); } catch { available = false; }
    if (!available) return;
    const root = await project({ graphBackend: 'sqlite' });
    const indexDir = getGraphIndexDir(root, 'project');
    await mkdir(indexDir, { recursive: true });
    await writeFile(join(indexDir, 'dependencies.json'), JSON.stringify({
      A: { upstream: [], downstream: [{ path: 'B', type: 'depends-on' }] },
      B: { upstream: [{ path: 'A', type: 'depends-on' }], downstream: [] },
    }));
    const active = await openGraphBackend(root, 'project');
    try {
      expect(active.type).toBe('sqlite');
      expect(active.persistentPath).toBe(join(indexDir, 'graph.db'));
      expect(active.backend.hasEdge('A', 'B')).toBe(true);
    } finally {
      await closeGraphBackend(active);
    }
    expect(existsSync(join(indexDir, 'graph.db'))).toBe(true);
  });
});
