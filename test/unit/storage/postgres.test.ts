import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import {
  PostgresBackendError,
  PostgresStorageBackend,
  type PostgresClientLike,
  type PostgresPoolLike,
  type PostgresQueryResult,
} from '../../../src/storage/backends/postgres.js';
import { STORAGE_BACKEND_MATRIX } from '../../../src/storage/backend-contract.js';
import { getFeature } from '../../../src/features/catalog.js';

type Handler = (sql: string, values: readonly unknown[]) => PostgresQueryResult;

class FakeClient implements PostgresClientLike {
  queries: Array<{ sql: string; values: readonly unknown[] }> = [];
  released: boolean | undefined;
  constructor(private readonly handler: Handler) {}
  async query<Row>(sql: string, values: readonly unknown[] = []): Promise<PostgresQueryResult<Row>> {
    this.queries.push({ sql, values });
    return this.handler(sql, values) as PostgresQueryResult<Row>;
  }
  release(error?: boolean) { this.released = error; }
}

class FakePool implements PostgresPoolLike {
  readonly client: FakeClient;
  totalCount = 7;
  idleCount = 4;
  waitingCount = 2;
  ended = false;
  constructor(handler: Handler) { this.client = new FakeClient(handler); }
  async connect() { return this.client; }
  async query<Row>(sql: string, values: readonly unknown[] = []) {
    return this.client.query<Row>(sql, values);
  }
  async end() { this.ended = true; }
}

const identity = { tenant: 'tenant-a', subsystem: 'memory', path: 'a.md' };
const mutation = {
  operation: 'upsert' as const,
  idempotencyKey: 'migration:a:1',
  record: { identity, sourceRevision: '1', digest: 'sha256:a', value: { kind: 'note', text: 'a' } },
};

function backend(handler: Handler) {
  const pool = new FakePool(handler);
  return { pool, backend: new PostgresStorageBackend({ tenant: 'tenant-a', subsystem: 'memory', pool }) };
}

describe('direct PostgreSQL storage backend (#2195)', () => {
  it('is an exact registry-pinned optional feature with explicit advanced capabilities', () => {
    expect(getFeature('postgres')?.packageSpecs).toEqual({ pg: '8.23.0' });
    expect(STORAGE_BACKEND_MATRIX['postgres-direct']).toMatchObject({
      maturity: 'advanced',
      isolation: 'serializable',
      dataClass: 'canonical',
    });
    expect(STORAGE_BACKEND_MATRIX['postgres-direct'].capabilities).toEqual(
      expect.arrayContaining(['atomic-batch', 'consistent-snapshot', 'change-cursor', 'tls']),
    );
  });

  it('keeps runtime schema verification separate from migration-role DDL', async () => {
    const verify = backend((sql) => sql.includes('SELECT schema_version')
      ? { rows: [{ schema_version: 1 }], rowCount: 1 }
      : { rows: [], rowCount: 0 });
    await verify.backend.init();
    expect(verify.pool.client.queries).toHaveLength(1);
    expect(verify.pool.client.queries[0].sql).toContain('SELECT schema_version');

    const pool = new FakePool((sql) => sql.includes('SELECT schema_version')
      ? { rows: [{ schema_version: 1 }], rowCount: 1 }
      : { rows: [], rowCount: 1 });
    const migrate = new PostgresStorageBackend({ tenant: 'tenant-a', subsystem: 'memory', pool, schemaMode: 'migrate' });
    await migrate.init();
    expect(pool.client.queries.some(query => query.sql.includes('CREATE TABLE IF NOT EXISTS aiwg_storage_records'))).toBe(true);
    expect(pool.client.queries.at(-1)?.sql).toBe('COMMIT');
  });

  it('fails closed when the runtime schema is absent or incompatible', async () => {
    const { backend: store } = backend(() => ({ rows: [{ schema_version: 2 }], rowCount: 1 }));
    await expect(store.init()).rejects.toMatchObject({ code: 'AIWG_POSTGRES_SCHEMA_UNAVAILABLE' });
  });

  it('commits record effects and the durable receipt on one checked-out transaction', async () => {
    const { pool, backend: store } = backend((sql) => {
      if (sql.includes('SELECT payload_digest')) return { rows: [], rowCount: 0 };
      if (sql.includes('RETURNING tenant')) return {
        rows: [{ ...row(), change_seq: '7' }], rowCount: 1,
      };
      return { rows: [], rowCount: 1 };
    });
    const receipt = await store.commitBatch([mutation]);
    expect(receipt).toMatchObject({ committed: true, highWaterMark: '7' });
    expect(pool.client.queries[0].sql).toContain('BEGIN ISOLATION LEVEL SERIALIZABLE');
    expect(pool.client.queries.some(query => query.sql.includes('ON CONFLICT (tenant, subsystem, path)'))).toBe(true);
    expect(pool.client.queries.some(query => query.sql.includes('INSERT INTO aiwg_storage_batch_receipts'))).toBe(true);
    expect(pool.client.queries.at(-1)?.sql).toBe('COMMIT');
    expect(pool.client.released).toBe(false);
  });

  it('returns an existing receipt for exact replay and rejects divergent replay', async () => {
    const original = { batchId: 'same', committed: true, highWaterMark: '4', recordReceipts: [] };
    const exact = backend((sql) => sql.includes('SELECT payload_digest')
      ? { rows: [{ payload_digest: digestOf([mutation]), receipt: original }], rowCount: 1 }
      : { rows: [], rowCount: 1 });
    await expect(exact.backend.commitBatch([mutation])).resolves.toEqual(original);
    expect(exact.pool.client.queries.some(query => query.sql.includes('INSERT INTO aiwg_storage_records'))).toBe(false);

    const divergent = backend((sql) => sql.includes('SELECT payload_digest')
      ? { rows: [{ payload_digest: 'different', receipt: original }], rowCount: 1 }
      : { rows: [], rowCount: 1 });
    await expect(divergent.backend.commitBatch([mutation])).rejects.toMatchObject({ code: 'AIWG_POSTGRES_IDEMPOTENCY_CONFLICT' });
    expect(divergent.pool.client.queries.at(-1)?.sql).toBe('ROLLBACK');
  });

  it('rolls back, classifies deadlocks as retryable, and releases in finally', async () => {
    const failure = Object.assign(new Error('deadlock'), { code: '40P01' });
    const { pool, backend: store } = backend((sql) => {
      if (sql.includes('SELECT payload_digest')) throw failure;
      return { rows: [], rowCount: 1 };
    });
    await expect(store.commitBatch([mutation])).rejects.toMatchObject({
      code: 'AIWG_POSTGRES_RETRYABLE', retryable: true,
    });
    expect(pool.client.queries.at(-1)?.sql).toBe('ROLLBACK');
    expect(pool.client.released).toBe(true);
  });

  it.each(['40001', '40P01', '55P03', '57014', '57P01', '57P02', '57P03', '08000', '08003', '08006', '08001'])(
    'classifies PostgreSQL fault %s for bounded retry',
    async (code) => {
      const failure = Object.assign(new Error('injected fault'), { code });
      const { backend: store } = backend((sql) => {
        if (sql.includes('SELECT payload_digest')) throw failure;
        return { rows: [], rowCount: 1 };
      });
      await expect(store.commitBatch([mutation])).rejects.toMatchObject({
        code: 'AIWG_POSTGRES_RETRYABLE', retryable: true,
      });
    },
  );

  it('classifies connection loss on non-transactional reads for caller reconnect/retry', async () => {
    const failure = Object.assign(new Error('connection terminated'), { code: '08006' });
    const { backend: store } = backend((sql) => {
      if (sql.includes('WHERE tenant=$1 AND subsystem=$2 AND path=$3')) throw failure;
      return { rows: [], rowCount: 0 };
    });
    await expect(store.get('a.md')).rejects.toMatchObject({ code: 'AIWG_POSTGRES_RETRYABLE', retryable: true });
  });

  it('resolves an ambiguous commit by reading the durable receipt on replay', async () => {
    const durable = { batchId: 'durable', committed: true, highWaterMark: '8', recordReceipts: [] };
    const ambiguous = Object.assign(new Error('connection lost after commit'), { code: '08006' });
    const first = backend((sql) => {
      if (sql.includes('SELECT payload_digest')) return { rows: [], rowCount: 0 };
      if (sql.includes('RETURNING tenant')) return { rows: [{ ...row(), change_seq: '8' }], rowCount: 1 };
      if (sql === 'COMMIT') throw ambiguous;
      return { rows: [], rowCount: 1 };
    });
    await expect(first.backend.commitBatch([mutation])).rejects.toMatchObject({ code: 'AIWG_POSTGRES_RETRYABLE' });

    const replay = backend((sql) => sql.includes('SELECT payload_digest')
      ? { rows: [{ payload_digest: digestOf([mutation]), receipt: durable }], rowCount: 1 }
      : { rows: [], rowCount: 1 });
    await expect(replay.backend.commitBatch([mutation])).resolves.toEqual(durable);
  });

  it('fails a compare-and-set revision conflict without committing', async () => {
    const expected = { ...mutation, expectedRevision: 'old' };
    const { pool, backend: store } = backend((sql) => {
      if (sql.includes('SELECT payload_digest')) return { rows: [], rowCount: 0 };
      if (sql.includes('RETURNING tenant')) return { rows: [], rowCount: 0 };
      return { rows: [], rowCount: 1 };
    });
    await expect(store.commitBatch([expected])).rejects.toMatchObject({ code: 'AIWG_POSTGRES_REVISION_CONFLICT' });
    expect(pool.client.queries.at(-1)?.sql).toBe('ROLLBACK');
  });

  it('captures an exported repeatable-read snapshot and exact high-water cursor', async () => {
    const { pool, backend: store } = backend((sql) => {
      if (sql.includes('pg_export_snapshot')) return { rows: [{ snapshot: '0001-1' }], rowCount: 1 };
      if (sql.includes('MAX(change_seq)')) return { rows: [{ high_water_mark: '9' }], rowCount: 1 };
      if (sql.includes('FROM aiwg_storage_records')) return { rows: [row()], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    });
    await expect(store.snapshot()).resolves.toMatchObject({ id: '0001-1', highWaterMark: '9', cursor: '9' });
    expect(pool.client.queries[0].sql).toContain('REPEATABLE READ READ ONLY');
  });

  it('keeps an exported snapshot valid until its idempotent lease close', async () => {
    const { pool, backend: store } = backend((sql) => {
      if (sql.includes('pg_export_snapshot')) return { rows: [{ snapshot: '0001-1' }], rowCount: 1 };
      if (sql.includes('MAX(change_seq)')) return { rows: [{ high_water_mark: '9' }], rowCount: 1 };
      if (sql.includes('FROM aiwg_storage_records')) return { rows: [row()], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    });
    const lease = await store.openSnapshotLease();
    await expect(lease.readPage()).resolves.toMatchObject({ snapshot: '0001-1', records: [expect.any(Object)] });
    await lease.close();
    await lease.close();
    expect(pool.client.queries.filter(query => query.sql === 'COMMIT')).toHaveLength(2);
  });

  it('replays ordered updates and tombstones from a validated cursor', async () => {
    const { backend: store } = backend((sql) => sql.includes('change_seq >') ? {
      rows: [{ ...row(), tombstone: true, value: null, deleted_at: '2026-08-25T00:00:00.000Z', delete_reason: 'removed', change_seq: '12' }],
      rowCount: 1,
    } : { rows: [], rowCount: 0 });
    await expect(store.changes('11')).resolves.toMatchObject({
      highWaterMark: '12', records: [{ tombstone: { reason: 'removed' } }],
    });
    await expect(store.changes('not-a-cursor')).rejects.toMatchObject({ code: 'AIWG_POSTGRES_CURSOR_INVALID' });
  });

  it('uses deterministic keyset pagination, JSON filters, pool metrics, and bounded traversal', async () => {
    const { pool, backend: store } = backend((sql) => {
      if (sql.includes('value @>')) return { rows: [row('a.md'), row('b.md'), row('c.md')], rowCount: 3 };
      if (sql.includes('WITH RECURSIVE')) return { rows: [{ path: 'b.md', depth: 1 }], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    });
    await expect(store.query({ kind: 'note' }, 2, 'before.md')).resolves.toMatchObject({
      records: [{ identity: { path: 'a.md' } }, { identity: { path: 'b.md' } }], nextCursor: 'b.md',
    });
    expect(pool.client.queries.at(-1)?.sql).toContain('ORDER BY path LIMIT');
    await expect(store.traverse('a.md', 'out', 5)).resolves.toEqual([{ path: 'b.md', depth: 1 }]);
    expect(store.metrics()).toEqual({ total: 7, idle: 4, waiting: 2 });
  });

  it('uses transaction-scoped advisory coordination and bounded timeout settings', async () => {
    const { pool, backend: store } = backend(() => ({ rows: [], rowCount: 1 }));
    await expect(store.withMigrationLock(async () => 'done')).resolves.toBe('done');
    expect(pool.client.queries.some(query => query.sql.includes('pg_advisory_xact_lock'))).toBe(true);
    expect(pool.client.queries.some(query => query.sql.includes('statement_timeout'))).toBe(true);
    expect(pool.client.queries.some(query => query.sql.includes('lock_timeout'))).toBe(true);
    expect(pool.client.queries.at(-1)?.sql).toBe('COMMIT');
  });

  it('rejects cross-tenant mutations before persistence', async () => {
    const { backend: store } = backend(() => ({ rows: [], rowCount: 0 }));
    const foreign = { ...mutation, record: { ...mutation.record, identity: { ...identity, tenant: 'other' } } };
    await expect(store.commitBatch([foreign])).rejects.toMatchObject({ code: 'AIWG_POSTGRES_IDENTITY_MISMATCH' });
  });

  it('requires explicit TLS and limits plaintext development to loopback', async () => {
    const envName = 'AIWG_POSTGRES_TEST_URL';
    process.env[envName] = 'postgresql://example.invalid/database';
    try {
      const missingTls = new PostgresStorageBackend({ tenant: 'tenant-a', subsystem: 'memory', connectionStringEnv: envName });
      await expect(missingTls.init()).rejects.toMatchObject({ code: 'AIWG_POSTGRES_TLS_REQUIRED' });
      const remotePlaintext = new PostgresStorageBackend({ tenant: 'tenant-a', subsystem: 'memory', connectionStringEnv: envName, ssl: 'disable' });
      await expect(remotePlaintext.init()).rejects.toMatchObject({ code: 'AIWG_POSTGRES_TLS_REQUIRED' });
    } finally {
      delete process.env[envName];
    }
  });
});

function row(path = 'a.md') {
  return {
    tenant: 'tenant-a', subsystem: 'memory', path, source_revision: '1',
    digest: `sha256:${path}`, value: { kind: 'note', text: path }, tombstone: false,
    deleted_at: null, delete_reason: null, change_seq: '1',
  };
}

function digestOf(value: unknown): string {
  // Mirrors the backend's intentionally simple canonical input digest for the fixture.
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, child]) => child !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${stableStringify(child)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}
