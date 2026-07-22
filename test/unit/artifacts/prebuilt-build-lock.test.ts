import { describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { acquireDirectoryLock } from '../../../src/artifacts/prebuilt-build-lock.js';

describe('prebuilt package build lock', () => {
  it('serializes concurrent package readers and builders', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'aiwg-prebuilt-lock-'));
    const lockPath = path.join(root, '.framework-build.lock');
    try {
      const releaseFirst = await acquireDirectoryLock(lockPath);
      let secondAcquired = false;
      const second = acquireDirectoryLock(lockPath, { timeoutMs: 2_000, pollMs: 10 })
        .then((release) => {
          secondAcquired = true;
          return release;
        });

      await new Promise((resolve) => setTimeout(resolve, 40));
      expect(secondAcquired).toBe(false);
      await releaseFirst();

      const releaseSecond = await second;
      expect(secondAcquired).toBe(true);
      await releaseSecond();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('times out without deleting another process owner lock', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'aiwg-prebuilt-lock-timeout-'));
    const lockPath = path.join(root, '.framework-build.lock');
    try {
      const release = await acquireDirectoryLock(lockPath);
      await expect(acquireDirectoryLock(lockPath, { timeoutMs: 30, pollMs: 5 }))
        .rejects.toThrow(/timed out waiting for build lock/);
      await release();
      const releaseAfter = await acquireDirectoryLock(lockPath, { timeoutMs: 30, pollMs: 5 });
      await releaseAfter();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
