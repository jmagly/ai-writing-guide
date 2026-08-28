import { describe, expect, it } from 'vitest';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { PostgresStorageBackend, type PostgresPoolLike } from '../../src/storage/backends/postgres.js';
import { inspectPostgresSchema, rollbackPostgresSchemaV1 } from '../../src/storage/backends/postgres-schema.js';
import { loadFeaturePackage } from '../../src/features/runtime.js';
import { StorageMigrationCoordinator, type MigrationManifest } from '../../src/storage/migration-protocol.js';
import { assertCurrentStorageEvidence, qualifyStorageBackend } from '../../src/storage/qualification.js';
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

      const disjoint = await Promise.all(Array.from({ length: 32 }, (_, index) =>
        retryPostgres(() => backend.commitBatch([mutation(tenant, `disjoint-${index}.md`, '1', `value-${index}`)]))));
      expect(disjoint).toHaveLength(32);

      let releaseLock!: () => void;
      const held = new Promise<void>(resolve => { releaseLock = resolve; });
      const holder = backend.withMigrationLock(() => held);
      await waitFor(() => backend.metrics().total >= 1);
      const contenders = Array.from({ length: 5 }, () => backend.withMigrationLock(async () => undefined));
      await waitFor(() => backend.metrics().total === 4 && backend.metrics().waiting >= 1);
      expect(backend.metrics().waiting).toBeGreaterThanOrEqual(1);
      releaseLock();
      await Promise.all([holder, ...contenders]);

      await backend.commitBatch([mutation(tenant, 'a.md', '2', 'updated', '1')]);
      await backend.commitBatch([mutation(tenant, 'b.md', '1', 'beta')]);
      const snapshot = await backend.snapshot();
      expect(snapshot.records).toHaveLength(34);
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
    const sourceBoundary: string[] = [];
    const coordinator = new StorageMigrationCoordinator(source, destination, {
      async save(manifest) { manifests.push(structuredClone(manifest)); },
    }, {
      async switchAtomically() {
        routing.push('atomic-switch');
        return {
          switchId: 'postgres-live-switch', previousTarget: 'filesystem', activeTarget: 'postgres-direct',
          committedAt: new Date().toISOString(),
        };
      },
      async restoreSource() { routing.push('restore'); },
    }, {
      mode: 'offline', toolVersion: 'live-qualification', batchSize: 1, concurrency: 2,
      safety: {
        async prepare() {
          sourceBoundary.push('quiesced');
          return { boundaryId: 'postgres-live-offline', state: 'quiesced', establishedAt: new Date().toISOString() };
        },
        async freeze() {
          sourceBoundary.push('frozen');
          return { boundaryId: 'postgres-live-final', state: 'quiesced', establishedAt: new Date().toISOString() };
        },
        async release(_boundary, outcome) { sourceBoundary.push(`released:${outcome}`); },
      },
    });
    try {
      const applied = await coordinator.apply(await coordinator.preview());
      expect(applied).toMatchObject({ state: 'awaiting-approval', counts: { committed: 2 } });
      const cutover = await coordinator.cutover(applied, applied.digests.approval!);
      expect(cutover.state).toBe('observing');
      expect(routing).toEqual(['atomic-switch']);
      expect(sourceBoundary).toEqual(['quiesced', 'frozen', 'released:cutover']);
      expect(manifests.at(-1)?.state).toBe('observing');
    } finally {
      await destination.close();
      delete process.env.AIWG_POSTGRES_MIGRATION_URL;
    }
  }, 30_000);

  it('upgrades and explicitly rolls back an isolated schema with exact-count approval', async () => {
    const sourceUrl = new URL(live!);
    const database = `aiwg_schema_${randomUUID().replaceAll('-', '_')}`;
    const pgEnv = {
      ...process.env,
      PGHOST: sourceUrl.hostname,
      PGPORT: sourceUrl.port || '5432',
      PGUSER: decodeURIComponent(sourceUrl.username),
      PGPASSWORD: decodeURIComponent(sourceUrl.password),
    };
    execFileSync('createdb', [database], { env: pgEnv, stdio: 'pipe' });
    const isolated = new URL(live!);
    isolated.pathname = `/${database}`;
    process.env.AIWG_POSTGRES_SCHEMA_LIVE = isolated.toString();
    const store = new PostgresStorageBackend({
      tenant: 'schema', subsystem: 'memory', connectionStringEnv: 'AIWG_POSTGRES_SCHEMA_LIVE',
      ssl: 'disable', schemaMode: 'migrate',
    });
    try {
      await store.init();
      await store.commitBatch([mutation('schema', 'preserved-until-approval.md', '1', 'data')]);
      await store.close();
      const pg = await loadFeaturePackage('pg');
      const exports = (pg.default ?? pg) as { Pool: new (options: Record<string, unknown>) => PostgresPoolLike };
      const pool = new exports.Pool({ connectionString: isolated.toString() });
      const client = await pool.connect();
      try {
        const before = await inspectPostgresSchema(client);
        expect(before).toMatchObject({ version: 1, records: 1, receipts: 1 });
        await expect(rollbackPostgresSchemaV1(client, {
          expectedVersion: 1, allowDataLoss: true,
          expectedCounts: { records: 0, receipts: 0, edges: 0 },
        })).rejects.toThrow(/does not match/);
        await expect(rollbackPostgresSchemaV1(client, {
          expectedVersion: 1, allowDataLoss: true,
          expectedCounts: { records: before.records, receipts: before.receipts, edges: before.edges },
        })).resolves.toEqual({ version: 0, records: 0, receipts: 0, edges: 0 });
      } finally {
        client.release();
        await pool.end();
      }
    } finally {
      try { await store.close(); } catch { /* isolated cleanup */ }
      try { execFileSync('dropdb', ['--if-exists', database], { env: pgEnv, stdio: 'pipe' }); } catch { /* disposable qualification cleanup */ }
      delete process.env.AIWG_POSTGRES_SCHEMA_LIVE;
    }
  }, 30_000);

  it('emits a correctness-qualified direct-server operating-envelope record', async () => {
    const tenant = `envelope-${randomUUID()}`;
    process.env.AIWG_POSTGRES_ENVELOPE_URL = live;
    const backend = new PostgresStorageBackend<{ kind: string; text: string }>({
      tenant, subsystem: 'memory', connectionStringEnv: 'AIWG_POSTGRES_ENVELOPE_URL',
      ssl: 'disable', schemaMode: 'migrate', maxConnections: 4,
    });
    await backend.init();
    try {
      const corpus = Array.from({ length: 128 }, (_, index) => versioned(tenant, `record-${String(index).padStart(4, '0')}.md`, '1', `value-${index}`));
      const report = await qualifyStorageBackend(backend, {
        scope: { backend: 'postgres-direct', branch: 'qualification', commit: 'live', datasetId: 'postgres-envelope-v1', declaredRecords: corpus.length, readers: 4, writers: 4, operations: corpus.length + 4 },
        records: corpus,
        resourceObservation: () => ({ poolSaturation: backend.metrics().total / 4 }),
        maxRetries: 20,
        baseBackoffMs: 1,
      });
      expect(report).toMatchObject({ verification: { valid: true }, scope: { observedRecords: 128 } });
      expect(report.latencyMs.p95).toBeGreaterThanOrEqual(report.latencyMs.p50);
      expect(report.throughputPerSecond).toBeGreaterThan(0);
      expect(() => assertCurrentStorageEvidence(report, 'live')).not.toThrow();
    } finally {
      await backend.close();
      delete process.env.AIWG_POSTGRES_ENVELOPE_URL;
    }
  }, 30_000);

  it('reconnects after PostgreSQL terminates an established pooled session', async () => {
    const tenant = `reconnect-${randomUUID()}`;
    const applicationName = `aiwg-reconnect-${randomUUID()}`;
    process.env.AIWG_POSTGRES_RECONNECT_URL = live;
    const backend = new PostgresStorageBackend<{ kind: string; text: string }>({
      tenant, subsystem: 'memory', connectionStringEnv: 'AIWG_POSTGRES_RECONNECT_URL',
      ssl: 'disable', schemaMode: 'migrate', applicationName,
    });
    await backend.init();
    await backend.commitBatch([mutation(tenant, 'survives.md', '1', 'survives')]);
    const pg = await loadFeaturePackage('pg');
    const exports = (pg.default ?? pg) as { Pool: new (options: Record<string, unknown>) => PostgresPoolLike };
    const admin = new exports.Pool({ connectionString: live });
    try {
      await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE application_name=$1', [applicationName]);
      await expect(retryPostgres(() => backend.get('survives.md'))).resolves.toMatchObject({ value: { text: 'survives' } });
    } finally {
      await admin.end();
      await backend.close();
      delete process.env.AIWG_POSTGRES_RECONNECT_URL;
    }
  }, 30_000);
});

async function waitFor(predicate: () => boolean, timeoutMs = 5_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error('timed out waiting for pool state');
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}

async function retryPostgres<R>(operation: () => Promise<R>, attempts = 8): Promise<R> {
  let last: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try { return await operation(); } catch (error) {
      last = error;
      if (!(typeof error === 'object' && error !== null && 'retryable' in error && error.retryable === true)) throw error;
      await new Promise(resolve => setTimeout(resolve, attempt + 1));
    }
  }
  throw last;
}

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
