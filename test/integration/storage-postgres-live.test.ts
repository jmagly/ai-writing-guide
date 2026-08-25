import { describe, expect, it } from 'vitest';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { PostgresStorageBackend } from '../../src/storage/backends/postgres.js';
import { StorageMigrationCoordinator, type MigrationManifest } from '../../src/storage/migration-protocol.js';
import type { AtomicMutation, BatchReceipt, VersionedRecord } from '../../src/storage/backend-contract.js';

const live = process.env.AIWG_POSTGRES_LIVE_URL;
const describeLive = live ? describe : describe.skip;

describeLive('direct PostgreSQL live qualification (#2195)', () => {
  it('proves atomic replay, updates, tombstones, snapshots, cursors, query, traversal, and health', async () => {
    const tenant = `qualification-${randomUUID()}`;
    process.env.AIWG_POSTGRES_QUALIFICATION_URL = live;
    const backend = new PostgresStorageBackend<{ kind: string; text: string }>({
      tenant,
      subsystem: 'memory',
      connectionStringEnv: 'AIWG_POSTGRES_QUALIFICATION_URL',
      ssl: 'disable',
      maxConnections: 4,
      statementTimeoutMs: 5_000,
      lockTimeoutMs: 1_000,
      idleTransactionTimeoutMs: 5_000,
      applicationName: 'aiwg-postgres-live-qualification',
      schemaMode: 'migrate',
    });
    await backend.init();
    try {
      const first = mutation(tenant, 'a.md', '1', 'alpha');
      const receipt = await backend.commitBatch([first]);
      expect(await backend.commitBatch([first])).toEqual(receipt);
      expect(await backend.get('a.md')).toMatchObject({ value: { text: 'alpha' } });

      const sameKeyRace = await Promise.all(Array.from({ length: 8 }, () => backend.commitBatch([first])));
      expect(new Set(sameKeyRace.map(item => item.batchId)).size).toBe(1);

      await backend.commitBatch([mutation(tenant, 'a.md', '2', 'updated', '1')]);
      await backend.commitBatch([mutation(tenant, 'b.md', '1', 'beta')]);
      const snapshot = await backend.snapshot();
      expect(snapshot.records).toHaveLength(2);
      expect(Number(snapshot.highWaterMark)).toBeGreaterThan(0);

      await backend.commitBatch([tombstone(tenant, 'b.md', '2', '1')]);
      const changes = await backend.changes(snapshot.cursor);
      expect(changes.records).toEqual(expect.arrayContaining([
        expect.objectContaining({ identity: expect.objectContaining({ path: 'b.md' }), tombstone: expect.any(Object) }),
      ]));

      await expect(backend.query({ kind: 'note' }, 1)).resolves.toMatchObject({
        records: [expect.objectContaining({ identity: expect.objectContaining({ path: 'a.md' }) })],
      });
      await backend.replaceEdges('a.md', [{ targetPath: 'b.md', type: 'depends-on' }]);
      await expect(backend.traverse('a.md', 'out', 5, 'depends-on')).resolves.toEqual([{ path: 'b.md', depth: 1 }]);
      await expect(backend.setOperation('intersection', ['a.md', 'b.md'], ['b.md', 'c.md'])).resolves.toEqual(['b.md']);
      await expect(backend.health()).resolves.toMatchObject({ healthy: true, ready: true, schemaVersion: '1' });
      expect(backend.metrics().total).toBeLessThanOrEqual(4);
    } finally {
      await backend.close();
      delete process.env.AIWG_POSTGRES_QUALIFICATION_URL;
    }
  }, 30_000);

  it.skipIf(process.env.AIWG_POSTGRES_BACKUP_LIVE !== '1')(
    'round-trips schema, records, receipts, and tombstones through pg_dump/pg_restore',
    async () => {
      const sourceUrl = new URL(live!);
      const sourceDb = sourceUrl.pathname.slice(1);
      const restoredDb = `aiwg_restore_${randomUUID().replaceAll('-', '_')}`;
      const root = mkdtempSync(join(tmpdir(), 'aiwg-postgres-backup-'));
      const dump = join(root, 'storage.dump');
      const pgEnv = {
        ...process.env,
        PGHOST: sourceUrl.hostname,
        PGPORT: sourceUrl.port || '5432',
        PGUSER: decodeURIComponent(sourceUrl.username),
        PGPASSWORD: decodeURIComponent(sourceUrl.password),
      };
      const tenant = `backup-${randomUUID()}`;
      process.env.AIWG_POSTGRES_BACKUP_SOURCE = live;
      const source = new PostgresStorageBackend<{ kind: string; text: string }>({
        tenant, subsystem: 'memory', connectionStringEnv: 'AIWG_POSTGRES_BACKUP_SOURCE',
        ssl: 'disable', schemaMode: 'migrate',
      });
      await source.init();
      await source.commitBatch([mutation(tenant, 'kept.md', '1', 'kept')]);
      await source.commitBatch([mutation(tenant, 'deleted.md', '1', 'before-delete')]);
      await source.commitBatch([tombstone(tenant, 'deleted.md', '2', '1')]);
      const before = await source.readAll();
      await source.close();
      try {
        execFileSync('pg_dump', ['--format=custom', '--file', dump, '--dbname', sourceDb], { env: pgEnv, stdio: 'pipe' });
        execFileSync('createdb', [restoredDb], { env: pgEnv, stdio: 'pipe' });
        execFileSync('pg_restore', ['--single-transaction', '--dbname', restoredDb, dump], { env: pgEnv, stdio: 'pipe' });

        const restoredUrl = new URL(live!);
        restoredUrl.pathname = `/${restoredDb}`;
        process.env.AIWG_POSTGRES_BACKUP_RESTORED = restoredUrl.toString();
        const restored = new PostgresStorageBackend<{ kind: string; text: string }>({
          tenant, subsystem: 'memory', connectionStringEnv: 'AIWG_POSTGRES_BACKUP_RESTORED', ssl: 'disable',
        });
        await restored.init();
        const after = await restored.readAll();
        await restored.close();
        expect(after).toEqual(before);
        expect(after.filter(record => record.tombstone)).toHaveLength(1);
      } finally {
        try { execFileSync('dropdb', ['--if-exists', restoredDb], { env: pgEnv, stdio: 'pipe' }); } catch { /* disposable qualification cleanup */ }
        delete process.env.AIWG_POSTGRES_BACKUP_SOURCE;
        delete process.env.AIWG_POSTGRES_BACKUP_RESTORED;
        rmSync(root, { recursive: true, force: true });
      }
    },
    30_000,
  );

  it('passes the filesystem-shaped offline migration and approval-bound cutover gate', async () => {
    const tenant = `migration-${randomUUID()}`;
    process.env.AIWG_POSTGRES_MIGRATION_URL = live;
    const destination = new PostgresStorageBackend<{ kind: string; text: string }>({
      tenant, subsystem: 'memory', connectionStringEnv: 'AIWG_POSTGRES_MIGRATION_URL',
      ssl: 'disable', schemaMode: 'migrate',
    });
    await destination.init();
    const records = [versioned(tenant, 'a.md', '1', 'alpha'), versioned(tenant, 'b.md', '1', 'beta')];
    const source = new MemorySource(tenant, records);
    const manifests: MigrationManifest[] = [];
    const routing: string[] = [];
    const coordinator = new StorageMigrationCoordinator(source, destination, {
      async save(manifest) { manifests.push(structuredClone(manifest)); },
    }, {
      async switchReads() { routing.push('reads'); },
      async switchWrites() { routing.push('writes'); },
      async restoreSource() { routing.push('restore'); },
    }, { mode: 'offline', toolVersion: 'live-qualification', batchSize: 1, concurrency: 2 });
    try {
      const applied = await coordinator.apply(await coordinator.preview());
      expect(applied).toMatchObject({ state: 'awaiting-approval', counts: { committed: 2 } });
      const cutover = await coordinator.cutover(applied, applied.digests.approval!);
      expect(cutover.state).toBe('observing');
      expect(routing).toEqual(['reads', 'writes']);
      expect(manifests.at(-1)?.state).toBe('observing');
    } finally {
      await destination.close();
      delete process.env.AIWG_POSTGRES_MIGRATION_URL;
    }
  }, 30_000);
});

function mutation(tenant: string, path: string, revision: string, text: string, expectedRevision?: string) {
  return {
    operation: 'upsert' as const,
    idempotencyKey: `${path}:${revision}`,
    ...(expectedRevision ? { expectedRevision } : {}),
    record: {
      identity: { tenant, subsystem: 'memory', path },
      sourceRevision: revision,
      digest: createHash('sha256').update(text).digest('hex'),
      value: { kind: 'note', text },
    },
  };
}

function tombstone(tenant: string, path: string, revision: string, expectedRevision?: string) {
  const deletedAt = '2026-08-25T00:00:00.000Z';
  return {
    operation: 'delete' as const,
    idempotencyKey: `${path}:${revision}:delete`,
    ...(expectedRevision ? { expectedRevision } : {}),
    record: {
      identity: { tenant, subsystem: 'memory', path },
      sourceRevision: revision,
      digest: createHash('sha256').update(`${path}:${revision}:deleted`).digest('hex'),
      tombstone: { deletedAt, reason: 'qualification' },
    },
  };
}

function versioned(tenant: string, path: string, revision: string, text: string): VersionedRecord<{ kind: string; text: string }> {
  return {
    identity: { tenant, subsystem: 'memory', path }, sourceRevision: revision,
    digest: createHash('sha256').update(text).digest('hex'), value: { kind: 'note', text },
  };
}

class MemorySource {
  readonly identity;
  constructor(tenant: string, private readonly records: VersionedRecord<{ kind: string; text: string }>[]) {
    this.identity = { backend: 'json-filesystem', instance: 'fixture', tenant, subsystem: 'memory', schemaVersion: '1' };
  }
  async snapshot() { return { id: 'fixture-snapshot', highWaterMark: '1', records: structuredClone(this.records) }; }
  async readAll() { return structuredClone(this.records); }
  async commitBatch(_mutations: readonly AtomicMutation<{ kind: string; text: string }>[]): Promise<BatchReceipt> {
    throw new Error('source is read-only');
  }
}
