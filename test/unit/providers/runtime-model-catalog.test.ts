import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadRuntimeModelCatalog } from '../../../tools/agents/providers/base.mjs';

const roots: string[] = [];
afterEach(async () => {
  vi.useRealTimers();
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('deployment runtime model catalog', () => {
  it('uses a fresh dynamic cache and falls back when stale', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aiwg-runtime-model-catalog-'));
    roots.push(root);
    const cacheFile = join(root, 'model-catalog.v1.json');
    await mkdir(root, { recursive: true });
    await writeFile(cacheFile, JSON.stringify({
      version: 'dynamic',
      providers: { codex: { roles: {} } },
      discovery: { fetchedAt: '2026-07-20T12:00:00.000Z' },
    }));
    const fallback = { version: 'static', providers: {} };

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-20T13:00:00.000Z'));
    expect(loadRuntimeModelCatalog(fallback, { cacheFile }).version).toBe('dynamic');

    vi.setSystemTime(new Date('2026-07-22T13:00:00.000Z'));
    expect(loadRuntimeModelCatalog(fallback, { cacheFile }).version).toBe('static');
  });
});
