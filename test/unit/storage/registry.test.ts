/**
 * Tests for src/storage/index.ts (resolveStorage registry)
 *
 * @source @src/storage/index.ts
 * @issue #934
 * @issue #953
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  initStorage,
  resetStorage,
  resolveStorage,
  getLoadedConfig,
  FilesystemAdapter,
} from '../../../src/storage/index.js';

describe('storage/index resolveStorage', () => {
  let projectRoot: string;

  beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), 'aiwg-storage-registry-test-'));
    resetStorage();
  });

  afterEach(async () => {
    resetStorage();
    await rm(projectRoot, { recursive: true, force: true });
  });

  it('returns an fs adapter when no storage.config exists', async () => {
    await initStorage(projectRoot);
    const a = await resolveStorage('activity_log');
    expect(a).toBeInstanceOf(FilesystemAdapter);
  });

  it('memoizes one adapter instance per subsystem', async () => {
    await initStorage(projectRoot);
    const a1 = await resolveStorage('memory');
    const a2 = await resolveStorage('memory');
    expect(a1).toBe(a2);
  });

  it('returns different adapters for different subsystems', async () => {
    await initStorage(projectRoot);
    const m = await resolveStorage('memory');
    const a = await resolveStorage('activity_log');
    expect(m).not.toBe(a);
  });

  it('writes via fs adapter land in the default subsystem path', async () => {
    await initStorage(projectRoot);
    const adapter = await resolveStorage('activity_log');
    await adapter.write('test.txt', 'hello');
    const got = await adapter.read('test.txt');
    expect(got).toBe('hello');
  });

  it('honors storage.config roots overrides', async () => {
    await mkdir(join(projectRoot, '.aiwg'), { recursive: true });
    await writeFile(
      join(projectRoot, '.aiwg', 'storage.config'),
      JSON.stringify({
        version: '1',
        roots: { memory: 'custom/memory-dir' },
      }),
      'utf-8'
    );
    await initStorage(projectRoot);
    const adapter = await resolveStorage('memory');
    await adapter.write('foo.md', 'x');

    // Verify it landed under custom/memory-dir, not .aiwg/memory
    const { existsSync } = await import('fs');
    expect(existsSync(join(projectRoot, 'custom/memory-dir/foo.md'))).toBe(true);
    expect(existsSync(join(projectRoot, '.aiwg/memory/foo.md'))).toBe(false);
  });

  it('throws a clear error for unimplemented backends', async () => {
    await mkdir(join(projectRoot, '.aiwg'), { recursive: true });
    await writeFile(
      join(projectRoot, '.aiwg', 'storage.config'),
      JSON.stringify({
        version: '1',
        backends: { memory: { type: 'notion', parent: { pageId: 'abc-123' } } },
      }),
      'utf-8'
    );
    await initStorage(projectRoot);
    await expect(resolveStorage('memory')).rejects.toThrow(/not yet implemented/);
  });

  it.each([
    ['notion', '#959', { type: 'notion', parent: { pageId: 'abc' } }],
    ['anythingllm', '#960', { type: 'anythingllm', baseUrl: 'http://x', workspace: 'w' }],
    ['s3', '#962', { type: 's3', bucket: 'b', region: 'us-east-1' }],
    ['webdav', '#963', { type: 'webdav', url: 'http://x', basePath: '/' }],
  ] as const)('stub backend %s error points at tracking issue %s (#1087)', async (_type, expectedIssue, backendCfg) => {
    await mkdir(join(projectRoot, '.aiwg'), { recursive: true });
    await writeFile(
      join(projectRoot, '.aiwg', 'storage.config'),
      JSON.stringify({ version: '1', backends: { memory: backendCfg } }),
      'utf-8'
    );
    await initStorage(projectRoot);
    const escaped = expectedIssue.replace('#', '\\#');
    await expect(resolveStorage('memory')).rejects.toThrow(new RegExp(`Tracked at ${escaped}`));
  });

  it('getLoadedConfig returns null when no storage.config', async () => {
    const cfg = await getLoadedConfig(projectRoot);
    expect(cfg).toBeNull();
  });
});
