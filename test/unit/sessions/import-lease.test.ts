import {
  mkdir, mkdtemp, readFile, rm, writeFile,
} from 'node:fs/promises';
import { hostname, tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  acquireImportLease,
  importLeasePath,
  SessionRepository,
} from '../../../src/sessions/index.js';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('session import lease', () => {
  it('reports the active owner after a bounded wait and leaves readers unconstrained', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aiwg-session-lease-'));
    roots.push(root);
    const database = join(root, 'catalog.sqlite');
    const first = await acquireImportLease(database, 'run-first', {
      waitMs: 10,
      heartbeatMs: 5,
    });
    await expect(acquireImportLease(database, 'run-second', {
      waitMs: 10,
      pollMs: 2,
    })).rejects.toMatchObject({
      code: 'IMPORT_LOCKED',
      owner: {
        runId: 'run-first',
        pid: process.pid,
        host: hostname(),
      },
      waitMs: 10,
    });
    const owner = JSON.parse(await readFile(
      join(importLeasePath(database), 'owner.json'),
      'utf8',
    ));
    expect(owner).toMatchObject({
      contractVersion: '1.0.0',
      runId: 'run-first',
      startedAt: expect.any(String),
      heartbeatAt: expect.any(String),
    });
    await first.release();
    const second = await acquireImportLease(database, 'run-second', { waitMs: 0 });
    await second.release();
  });

  it('recovers a confirmed stale owner but never breaks a live local owner', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aiwg-session-stale-lease-'));
    roots.push(root);
    const database = join(root, 'catalog.sqlite');
    const lock = importLeasePath(database);
    await mkdir(lock, { recursive: true });
    await writeFile(join(lock, 'owner.json'), JSON.stringify({
      contractVersion: '1.0.0',
      runId: 'stale-run',
      pid: 424242,
      host: hostname(),
      startedAt: '2000-01-01T00:00:00.000Z',
      heartbeatAt: '2000-01-01T00:00:00.000Z',
    }));
    const recovered = await acquireImportLease(database, 'recovered-run', {
      waitMs: 0,
      staleMs: 1,
      processAlive: () => false,
    });
    expect(recovered.owner.runId).toBe('recovered-run');
    await recovered.release();
  });

  it('does not auto-recover an unverifiable foreign-host lease', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aiwg-session-foreign-lease-'));
    roots.push(root);
    const database = join(root, 'catalog.sqlite');
    const lock = importLeasePath(database);
    await mkdir(lock, { recursive: true });
    await writeFile(join(lock, 'owner.json'), JSON.stringify({
      contractVersion: '1.0.0',
      runId: 'foreign-run',
      pid: 424242,
      host: 'remote-host.example.test',
      startedAt: '2000-01-01T00:00:00.000Z',
      heartbeatAt: '2000-01-01T00:00:00.000Z',
    }));
    await expect(acquireImportLease(database, 'local-run', {
      waitMs: 0,
      staleMs: 1,
      processAlive: () => false,
    })).rejects.toMatchObject({
      code: 'IMPORT_LOCKED',
      owner: { runId: 'foreign-run', host: 'remote-host.example.test' },
    });
  });

  it('keeps catalog readers available while an application import lease is held', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aiwg-session-reader-lease-'));
    roots.push(root);
    const database = join(root, 'catalog.sqlite');
    const initialized = new SessionRepository(database);
    initialized.close();
    const lease = await acquireImportLease(database, 'writer-run');
    try {
      const reader = new SessionRepository(database);
      expect(reader.listSessions({ workspaceId: 'workspace', limit: 10 })).toMatchObject({
        total: 0,
        items: [],
      });
      reader.close();
    } finally {
      await lease.release();
    }
  });
});
