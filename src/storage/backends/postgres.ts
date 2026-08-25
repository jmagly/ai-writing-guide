import { createHash } from 'node:crypto';
import { loadFeaturePackage } from '../../features/runtime.js';
import {
  STORAGE_BACKEND_CONTRACT,
  type AtomicMutation,
  type BatchReceipt,
  type StorageBackendDescriptor,
  type VersionedRecord,
} from '../backend-contract.js';
import type {
  MigrationChangePage,
  MigrationEndpoint,
  MigrationEndpointIdentity,
  MigrationSnapshot,
} from '../migration-protocol.js';

const SCHEMA_VERSION = '1';
const DEFAULT_POOL_MAX = 10;
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_LOCK_TIMEOUT_MS = 5_000;
const DEFAULT_IDLE_TRANSACTION_TIMEOUT_MS = 30_000;

export interface PostgresQueryResult<Row = Record<string, unknown>> {
  rows: Row[];
  rowCount: number | null;
}

export interface PostgresClientLike {
  query<Row = Record<string, unknown>>(text: string, values?: readonly unknown[]): Promise<PostgresQueryResult<Row>>;
  release(error?: boolean): void;
}

export interface PostgresPoolLike {
  connect(): Promise<PostgresClientLike>;
  query<Row = Record<string, unknown>>(text: string, values?: readonly unknown[]): Promise<PostgresQueryResult<Row>>;
  end(): Promise<void>;
  totalCount?: number;
  idleCount?: number;
  waitingCount?: number;
}

export interface PostgresBackendOptions {
  tenant: string;
  subsystem: string;
  instance?: string;
  pool?: PostgresPoolLike;
  connectionStringEnv?: string;
  ssl?: 'disable' | 'require' | 'verify-full';
  maxConnections?: number;
  connectionTimeoutMs?: number;
  statementTimeoutMs?: number;
  lockTimeoutMs?: number;
  idleTransactionTimeoutMs?: number;
  applicationName?: string;
  schemaMode?: 'verify' | 'migrate';
}

export interface PostgresPage<T> {
  records: VersionedRecord<T>[];
  nextCursor?: string;
  snapshot?: string;
}

export interface PostgresHealth {
  healthy: boolean;
  ready: boolean;
  serverVersion: string;
  schemaVersion: string;
  highWaterMark: string;
}

export interface PostgresSnapshotLease<T> {
  id: string;
  highWaterMark: string;
  cursor: string;
  readPage(cursor?: string, limit?: number): Promise<PostgresPage<T>>;
  close(): Promise<void>;
}

interface RecordRow {
  tenant: string;
  subsystem: string;
  path: string;
  source_revision: string;
  digest: string;
  value: unknown;
  tombstone: boolean;
  deleted_at: Date | string | null;
  delete_reason: string | null;
  change_seq: string | number;
}

interface ReceiptRow {
  payload_digest: string;
  receipt: BatchReceipt;
}

export class PostgresBackendError extends Error {
  constructor(readonly code: string, message: string, readonly retryable = false) {
    super(message);
    this.name = 'PostgresBackendError';
  }
}

/**
 * Advanced canonical backend for aiwg.storage-backend/v1.
 *
 * A checked-out client owns every transaction. Record effects, the durable
 * idempotency receipt, and its high-water mark commit together. The class is
 * asynchronous by design and does not implement the legacy synchronous
 * GraphBackend interface.
 */
export class PostgresStorageBackend<T = unknown> implements MigrationEndpoint<T> {
  readonly descriptor: StorageBackendDescriptor = {
    contract: STORAGE_BACKEND_CONTRACT,
    backend: 'postgres-direct',
    implementationVersion: '1.0.0',
    schemaVersion: SCHEMA_VERSION,
    maturity: 'advanced',
    capabilities: [
      'read', 'atomic-batch', 'consistent-snapshot', 'change-cursor',
      'tombstones', 'idempotency-keys', 'recursive-traversal', 'set-operations',
      'filtered-query', 'cursor-pagination', 'health', 'readiness', 'telemetry',
      'tenant-isolation', 'subsystem-isolation', 'tls',
    ],
    durability: 'replicated',
    availability: 'remote-service',
    isolation: 'serializable',
    dataClass: 'canonical',
  };

  readonly identity: MigrationEndpointIdentity;
  private pool?: PostgresPoolLike;
  private readonly ownsPool: boolean;
  private readonly statementTimeoutMs: number;
  private readonly lockTimeoutMs: number;
  private readonly idleTransactionTimeoutMs: number;

  constructor(private readonly options: PostgresBackendOptions) {
    validateIdentity(options.tenant, 'tenant');
    validateIdentity(options.subsystem, 'subsystem');
    this.pool = options.pool;
    this.ownsPool = !options.pool;
    this.statementTimeoutMs = bounded(options.statementTimeoutMs, DEFAULT_TIMEOUT_MS, 1, 600_000, 'statementTimeoutMs');
    this.lockTimeoutMs = bounded(options.lockTimeoutMs, DEFAULT_LOCK_TIMEOUT_MS, 1, 600_000, 'lockTimeoutMs');
    this.idleTransactionTimeoutMs = bounded(
      options.idleTransactionTimeoutMs,
      DEFAULT_IDLE_TRANSACTION_TIMEOUT_MS,
      1,
      600_000,
      'idleTransactionTimeoutMs',
    );
    this.identity = {
      backend: 'postgres-direct',
      instance: options.instance ?? 'default',
      tenant: options.tenant,
      subsystem: options.subsystem,
      schemaVersion: SCHEMA_VERSION,
    };
  }

  async init(): Promise<void> {
    if (!this.pool) this.pool = await createPool(this.options);
    if (this.options.schemaMode !== 'migrate') {
      const schema = await this.requiredPool().query<{ schema_version: number }>(
        'SELECT schema_version FROM aiwg_storage_schema WHERE singleton = true',
      );
      if (Number(schema.rows[0]?.schema_version) !== 1) {
        throw new PostgresBackendError(
          'AIWG_POSTGRES_SCHEMA_UNAVAILABLE',
          'PostgreSQL storage schema v1 is unavailable; initialize it with the separate migration role',
        );
      }
      return;
    }
    await this.withTransaction(async client => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS aiwg_storage_schema (
          singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
          schema_version integer NOT NULL
        );
        INSERT INTO aiwg_storage_schema(singleton, schema_version)
        VALUES (true, 1) ON CONFLICT (singleton) DO NOTHING;
        CREATE TABLE IF NOT EXISTS aiwg_storage_records (
          tenant text NOT NULL,
          subsystem text NOT NULL,
          path text NOT NULL,
          source_revision text NOT NULL,
          digest text NOT NULL,
          value jsonb,
          tombstone boolean NOT NULL DEFAULT false,
          deleted_at timestamptz,
          delete_reason text,
          idempotency_key text NOT NULL,
          change_seq bigserial NOT NULL,
          updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
          PRIMARY KEY (tenant, subsystem, path),
          UNIQUE (tenant, subsystem, idempotency_key)
        );
        CREATE INDEX IF NOT EXISTS aiwg_storage_records_change
          ON aiwg_storage_records(tenant, subsystem, change_seq, path);
        CREATE TABLE IF NOT EXISTS aiwg_storage_batch_receipts (
          tenant text NOT NULL,
          subsystem text NOT NULL,
          batch_id uuid NOT NULL,
          payload_digest text NOT NULL,
          high_water_mark bigint NOT NULL,
          receipt jsonb NOT NULL,
          committed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
          PRIMARY KEY (tenant, subsystem, batch_id)
        );
        CREATE TABLE IF NOT EXISTS aiwg_storage_edges (
          tenant text NOT NULL,
          subsystem text NOT NULL,
          source_path text NOT NULL,
          target_path text NOT NULL,
          edge_type text NOT NULL,
          PRIMARY KEY (tenant, subsystem, source_path, target_path, edge_type)
        );
        CREATE INDEX IF NOT EXISTS aiwg_storage_edges_target
          ON aiwg_storage_edges(tenant, subsystem, target_path, edge_type);
      `);
      const schema = await client.query<{ schema_version: number }>(
        'SELECT schema_version FROM aiwg_storage_schema WHERE singleton = true',
      );
      if (Number(schema.rows[0]?.schema_version) !== 1) {
        throw new PostgresBackendError('AIWG_POSTGRES_SCHEMA_UNSUPPORTED', 'PostgreSQL storage schema is not version 1');
      }
    });
  }

  async commitBatch(mutations: readonly AtomicMutation<T>[]): Promise<BatchReceipt> {
    if (mutations.length === 0) throw new PostgresBackendError('AIWG_POSTGRES_EMPTY_BATCH', 'batch must contain at least one mutation');
    const batchId = postgresBatchId(mutations);
    const payloadDigest = postgresPayloadDigest(mutations);
    return this.withTransaction(async client => {
      const prior = await client.query<ReceiptRow>(
        `SELECT payload_digest, receipt FROM aiwg_storage_batch_receipts
         WHERE tenant=$1 AND subsystem=$2 AND batch_id=$3`,
        [this.options.tenant, this.options.subsystem, batchId],
      );
      if (prior.rows[0]) {
        if (prior.rows[0].payload_digest !== payloadDigest) {
          throw new PostgresBackendError('AIWG_POSTGRES_IDEMPOTENCY_CONFLICT', 'batch id was reused with different mutations');
        }
        return prior.rows[0].receipt;
      }

      const recordReceipts: BatchReceipt['recordReceipts'][number][] = [];
      let highWaterMark = '0';
      for (const mutation of mutations) {
        this.assertMutationIdentity(mutation);
        const tombstone = mutation.operation === 'delete' || Boolean(mutation.record.tombstone);
        const result = await client.query<RecordRow>(
          `INSERT INTO aiwg_storage_records
             (tenant, subsystem, path, source_revision, digest, value, tombstone,
              deleted_at, delete_reason, idempotency_key)
           VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10)
           ON CONFLICT (tenant, subsystem, path) DO UPDATE SET
             source_revision=EXCLUDED.source_revision, digest=EXCLUDED.digest,
             value=EXCLUDED.value, tombstone=EXCLUDED.tombstone,
             deleted_at=EXCLUDED.deleted_at, delete_reason=EXCLUDED.delete_reason,
             idempotency_key=EXCLUDED.idempotency_key,
             change_seq=nextval(pg_get_serial_sequence('aiwg_storage_records','change_seq')),
             updated_at=clock_timestamp()
           WHERE $11::text IS NULL OR aiwg_storage_records.source_revision=$11
           RETURNING tenant, subsystem, path, source_revision, digest, value,
                     tombstone, deleted_at, delete_reason, change_seq`,
          [
            this.options.tenant, this.options.subsystem, mutation.record.identity.path,
            mutation.record.sourceRevision, mutation.record.digest,
            JSON.stringify(mutation.record.value ?? null), tombstone,
            mutation.record.tombstone?.deletedAt ?? null,
            mutation.record.tombstone?.reason ?? null, mutation.idempotencyKey,
            mutation.expectedRevision ?? null,
          ],
        );
        if (result.rowCount !== 1 || !result.rows[0]) {
          throw new PostgresBackendError('AIWG_POSTGRES_REVISION_CONFLICT', `revision conflict for ${mutation.record.identity.path}`, true);
        }
        highWaterMark = String(result.rows[0].change_seq);
        recordReceipts.push({
          identity: mutation.record.identity,
          sourceRevision: mutation.record.sourceRevision,
          digest: mutation.record.digest,
        });
      }
      const receipt: BatchReceipt = { batchId, committed: true, highWaterMark, recordReceipts };
      await client.query(
        `INSERT INTO aiwg_storage_batch_receipts
           (tenant, subsystem, batch_id, payload_digest, high_water_mark, receipt)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb)`,
        [this.options.tenant, this.options.subsystem, batchId, payloadDigest, highWaterMark, JSON.stringify(receipt)],
      );
      return receipt;
    });
  }

  async get(path: string): Promise<VersionedRecord<T> | null> {
    const result = await this.requiredPool().query<RecordRow>(
      `SELECT tenant, subsystem, path, source_revision, digest, value,
              tombstone, deleted_at, delete_reason, change_seq
       FROM aiwg_storage_records WHERE tenant=$1 AND subsystem=$2 AND path=$3`,
      [this.options.tenant, this.options.subsystem, path],
    );
    return result.rows[0] ? recordFromRow<T>(result.rows[0]) : null;
  }

  async readAll(): Promise<readonly VersionedRecord<T>[]> {
    const result = await this.requiredPool().query<RecordRow>(
      `SELECT tenant, subsystem, path, source_revision, digest, value,
              tombstone, deleted_at, delete_reason, change_seq
       FROM aiwg_storage_records WHERE tenant=$1 AND subsystem=$2 ORDER BY path`,
      [this.options.tenant, this.options.subsystem],
    );
    return result.rows.map(recordFromRow<T>);
  }

  async query(filters: Record<string, unknown>, limit = 100, cursor?: string): Promise<PostgresPage<T>> {
    const boundedLimit = bounded(limit, 100, 1, 10_000, 'limit');
    const result = await this.requiredPool().query<RecordRow>(
      `SELECT tenant, subsystem, path, source_revision, digest, value,
              tombstone, deleted_at, delete_reason, change_seq
       FROM aiwg_storage_records
       WHERE tenant=$1 AND subsystem=$2 AND tombstone=false
         AND value @> $3::jsonb AND ($4::text IS NULL OR path > $4)
       ORDER BY path LIMIT $5`,
      [this.options.tenant, this.options.subsystem, JSON.stringify(filters), cursor ?? null, boundedLimit + 1],
    );
    const hasMore = result.rows.length > boundedLimit;
    const rows = result.rows.slice(0, boundedLimit);
    return {
      records: rows.map(recordFromRow<T>),
      ...(hasMore ? { nextCursor: rows.at(-1)?.path } : {}),
    };
  }

  async snapshot(): Promise<MigrationSnapshot<T>> {
    const lease = await this.openSnapshotLease();
    try {
      const records: VersionedRecord<T>[] = [];
      let cursor: string | undefined;
      do {
        const page = await lease.readPage(cursor, 10_000);
        records.push(...page.records);
        cursor = page.nextCursor;
      } while (cursor);
      return { id: lease.id, highWaterMark: lease.highWaterMark, cursor: lease.cursor, records };
    } finally {
      await lease.close();
    }
  }

  /** Hold an exported PostgreSQL snapshot open while parallel consumers page it. */
  async openSnapshotLease(): Promise<PostgresSnapshotLease<T>> {
    const exporter = await this.requiredPool().connect();
    let closed = false;
    try {
      await exporter.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const snapshot = await exporter.query<{ snapshot: string }>('SELECT pg_export_snapshot() AS snapshot');
      const highWater = await exporter.query<{ high_water_mark: string }>(
        `SELECT COALESCE(MAX(change_seq),0)::text AS high_water_mark FROM aiwg_storage_records
         WHERE tenant=$1 AND subsystem=$2`,
        [this.options.tenant, this.options.subsystem],
      );
      const id = snapshot.rows[0].snapshot;
      const highWaterMark = highWater.rows[0].high_water_mark;
      return {
        id,
        highWaterMark,
        cursor: highWaterMark,
        readPage: (cursor, limit) => this.readSnapshotPage(id, cursor, limit),
        close: async () => {
          if (closed) return;
          closed = true;
          try { await exporter.query('COMMIT'); } finally { exporter.release(false); }
        },
      };
    } catch (error) {
      try { await exporter.query('ROLLBACK'); } catch { /* preserve original error */ }
      exporter.release(true);
      throw classifyPostgresError(error);
    }
  }

  private async readSnapshotPage(snapshotId: string, cursor?: string, limit = 1000): Promise<PostgresPage<T>> {
    if (!/^[0-9A-Fa-f-]+$/.test(snapshotId)) {
      throw new PostgresBackendError('AIWG_POSTGRES_SNAPSHOT_INVALID', 'exported snapshot identifier is malformed');
    }
    const boundedLimit = bounded(limit, 1000, 1, 10_000, 'limit');
    const client = await this.requiredPool().connect();
    let failed = false;
    try {
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      await client.query(`SET TRANSACTION SNAPSHOT '${snapshotId}'`);
      const result = await client.query<RecordRow>(
        `SELECT tenant, subsystem, path, source_revision, digest, value,
                tombstone, deleted_at, delete_reason, change_seq
         FROM aiwg_storage_records
         WHERE tenant=$1 AND subsystem=$2 AND ($3::text IS NULL OR path > $3)
         ORDER BY path LIMIT $4`,
        [this.options.tenant, this.options.subsystem, cursor ?? null, boundedLimit + 1],
      );
      await client.query('COMMIT');
      const hasMore = result.rows.length > boundedLimit;
      const rows = result.rows.slice(0, boundedLimit);
      return { records: rows.map(recordFromRow<T>), ...(hasMore ? { nextCursor: rows.at(-1)?.path } : {}), snapshot: snapshotId };
    } catch (error) {
      failed = true;
      try { await client.query('ROLLBACK'); } catch { /* preserve original error */ }
      throw classifyPostgresError(error);
    } finally {
      client.release(failed);
    }
  }

  async changes(cursor: string | undefined): Promise<MigrationChangePage<T>> {
    const after = parseCursor(cursor);
    const result = await this.requiredPool().query<RecordRow>(
      `SELECT tenant, subsystem, path, source_revision, digest, value,
              tombstone, deleted_at, delete_reason, change_seq
       FROM aiwg_storage_records
       WHERE tenant=$1 AND subsystem=$2 AND change_seq > $3
       ORDER BY change_seq, path LIMIT 1001`,
      [this.options.tenant, this.options.subsystem, after],
    );
    const page = result.rows.slice(0, 1000);
    const highWaterMark = String(page.at(-1)?.change_seq ?? after);
    return {
      records: page.map(recordFromRow<T>),
      ...(result.rows.length > 1000 ? { nextCursor: highWaterMark } : {}),
      highWaterMark,
    };
  }

  async replaceEdges(sourcePath: string, edges: readonly { targetPath: string; type: string }[]): Promise<void> {
    await this.withTransaction(async client => {
      await client.query(
        'DELETE FROM aiwg_storage_edges WHERE tenant=$1 AND subsystem=$2 AND source_path=$3',
        [this.options.tenant, this.options.subsystem, sourcePath],
      );
      for (const edge of [...edges].sort((a, b) => `${a.type}\0${a.targetPath}`.localeCompare(`${b.type}\0${b.targetPath}`))) {
        await client.query(
          `INSERT INTO aiwg_storage_edges(tenant,subsystem,source_path,target_path,edge_type)
           VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
          [this.options.tenant, this.options.subsystem, sourcePath, edge.targetPath, edge.type],
        );
      }
    });
  }

  async traverse(path: string, direction: 'in' | 'out', maxDepth: number, edgeType?: string): Promise<Array<{ path: string; depth: number }>> {
    const depth = bounded(maxDepth, 10, 1, 100, 'maxDepth');
    const from = direction === 'out' ? 'source_path' : 'target_path';
    const to = direction === 'out' ? 'target_path' : 'source_path';
    const result = await this.requiredPool().query<{ path: string; depth: number }>(`
      WITH RECURSIVE walk(path, depth, visited) AS (
        SELECT $3::text, 0, ARRAY[$3::text]
        UNION ALL
        SELECT edge.${to}, walk.depth + 1, walk.visited || edge.${to}
        FROM walk JOIN aiwg_storage_edges edge
          ON edge.tenant=$1 AND edge.subsystem=$2 AND edge.${from}=walk.path
        WHERE walk.depth < $4 AND ($5::text IS NULL OR edge.edge_type=$5)
          AND NOT edge.${to}=ANY(walk.visited)
      )
      SELECT path, MIN(depth)::int AS depth FROM walk WHERE depth > 0
      GROUP BY path ORDER BY depth, path`,
      [this.options.tenant, this.options.subsystem, path, depth, edgeType ?? null],
    );
    return result.rows;
  }

  async setOperation(operation: 'union' | 'intersection' | 'difference', left: readonly string[], right: readonly string[]): Promise<string[]> {
    const sqlOperation = operation === 'union' ? 'UNION' : operation === 'intersection' ? 'INTERSECT' : 'EXCEPT';
    const result = await this.requiredPool().query<{ path: string }>(
      `SELECT unnest($1::text[]) AS path ${sqlOperation} SELECT unnest($2::text[]) AS path ORDER BY path`,
      [left, right],
    );
    return result.rows.map(row => row.path);
  }

  async health(): Promise<PostgresHealth> {
    const result = await this.requiredPool().query<{ server_version: string; schema_version: number; high_water_mark: string }>(`
      SELECT current_setting('server_version') AS server_version,
             (SELECT schema_version FROM aiwg_storage_schema WHERE singleton=true) AS schema_version,
             COALESCE((SELECT MAX(change_seq) FROM aiwg_storage_records WHERE tenant=$1 AND subsystem=$2),0)::text AS high_water_mark`,
      [this.options.tenant, this.options.subsystem],
    );
    const row = result.rows[0];
    return { healthy: true, ready: Number(row.schema_version) === 1, serverVersion: row.server_version, schemaVersion: String(row.schema_version), highWaterMark: row.high_water_mark };
  }

  metrics(): { total: number; idle: number; waiting: number } {
    const pool = this.requiredPool();
    return { total: pool.totalCount ?? 0, idle: pool.idleCount ?? 0, waiting: pool.waitingCount ?? 0 };
  }

  async withMigrationLock<R>(operation: () => Promise<R>): Promise<R> {
    return this.withTransaction(async client => {
      const key = advisoryKey(this.options.tenant, this.options.subsystem);
      await client.query('SELECT pg_advisory_xact_lock($1)', [key]);
      return operation();
    });
  }

  async close(): Promise<void> {
    if (this.ownsPool && this.pool) await this.pool.end();
    this.pool = undefined;
  }

  private async withTransaction<R>(operation: (client: PostgresClientLike) => Promise<R>, isolation = 'SERIALIZABLE'): Promise<R> {
    const client = await this.requiredPool().connect();
    let failed = false;
    try {
      await client.query(`BEGIN ISOLATION LEVEL ${isolation}`);
      await client.query(`SET LOCAL statement_timeout = '${this.statementTimeoutMs}ms'`);
      await client.query(`SET LOCAL lock_timeout = '${this.lockTimeoutMs}ms'`);
      await client.query(`SET LOCAL idle_in_transaction_session_timeout = '${this.idleTransactionTimeoutMs}ms'`);
      const result = await operation(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      failed = true;
      try { await client.query('ROLLBACK'); } catch { /* preserve original error */ }
      throw classifyPostgresError(error);
    } finally {
      client.release(failed);
    }
  }

  private assertMutationIdentity(mutation: AtomicMutation<T>): void {
    const identity = mutation.record.identity;
    if (identity.tenant !== this.options.tenant || identity.subsystem !== this.options.subsystem) {
      throw new PostgresBackendError('AIWG_POSTGRES_IDENTITY_MISMATCH', 'mutation identity is outside this backend tenant/subsystem');
    }
  }

  private requiredPool(): PostgresPoolLike {
    if (!this.pool) throw new PostgresBackendError('AIWG_POSTGRES_NOT_INITIALIZED', 'call init() before using the PostgreSQL backend');
    return this.pool;
  }
}

async function createPool(options: PostgresBackendOptions): Promise<PostgresPoolLike> {
  const envName = options.connectionStringEnv ?? 'AIWG_POSTGRES_URL';
  const connectionString = process.env[envName];
  if (!connectionString) {
    throw new PostgresBackendError('AIWG_POSTGRES_CREDENTIAL_UNAVAILABLE', `PostgreSQL connection locator ${envName} is not set`);
  }
  if (options.ssl === undefined) {
    throw new PostgresBackendError('AIWG_POSTGRES_TLS_REQUIRED', 'PostgreSQL remote connections require explicit ssl=require or ssl=verify-full');
  }
  if (options.ssl === 'disable' && !isLoopbackPostgresUrl(connectionString)) {
    throw new PostgresBackendError('AIWG_POSTGRES_TLS_REQUIRED', 'ssl=disable is limited to explicit loopback development endpoints');
  }
  const pg = await loadFeaturePackage('pg');
  const defaultExport = pg.default as Record<string, unknown> | undefined;
  const Pool = (pg.Pool ?? defaultExport?.Pool) as new (config: Record<string, unknown>) => PostgresPoolLike;
  if (!Pool) throw new PostgresBackendError('AIWG_POSTGRES_DRIVER_INVALID', 'optional pg package does not export Pool');
  return new Pool({
    connectionString,
    max: bounded(options.maxConnections, DEFAULT_POOL_MAX, 1, 100, 'maxConnections'),
    connectionTimeoutMillis: bounded(options.connectionTimeoutMs, DEFAULT_TIMEOUT_MS, 1, 600_000, 'connectionTimeoutMs'),
    statement_timeout: bounded(options.statementTimeoutMs, DEFAULT_TIMEOUT_MS, 1, 600_000, 'statementTimeoutMs'),
    application_name: options.applicationName ?? 'aiwg',
    ssl: options.ssl === 'disable' ? false : { rejectUnauthorized: options.ssl === 'verify-full' },
  });
}

function isLoopbackPostgresUrl(connectionString: string): boolean {
  try {
    const host = new URL(connectionString).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  } catch {
    return false;
  }
}

function recordFromRow<T>(row: RecordRow): VersionedRecord<T> {
  return {
    identity: { tenant: row.tenant, subsystem: row.subsystem, path: row.path },
    sourceRevision: row.source_revision,
    digest: row.digest,
    ...(row.tombstone
      ? { tombstone: { deletedAt: new Date(row.deleted_at ?? 0).toISOString(), ...(row.delete_reason ? { reason: row.delete_reason } : {}) } }
      : { value: row.value as T }),
  };
}

export function postgresBatchId<T>(mutations: readonly AtomicMutation<T>[]): string {
  const digest = createHash('sha256').update(mutations.map(item => item.idempotencyKey).join('\0')).digest('hex');
  return `${digest.slice(0, 8)}-${digest.slice(8, 12)}-4${digest.slice(13, 16)}-8${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
}

export function postgresPayloadDigest(value: unknown): string {
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

function advisoryKey(tenant: string, subsystem: string): string {
  return BigInt.asIntN(64, BigInt(`0x${createHash('sha256').update(`${tenant}\0${subsystem}`).digest('hex').slice(0, 16)}`)).toString();
}

function parseCursor(cursor: string | undefined): string {
  if (cursor === undefined) return '0';
  if (!/^\d+$/.test(cursor)) throw new PostgresBackendError('AIWG_POSTGRES_CURSOR_INVALID', 'change cursor must be an unsigned integer');
  return cursor;
}

function validateIdentity(value: string, label: string): void {
  if (!value || value.length > 200 || /[\u0000-\u001f]/.test(value)) {
    throw new PostgresBackendError('AIWG_POSTGRES_IDENTITY_INVALID', `${label} must be a non-empty printable identifier`);
  }
}

function bounded(value: number | undefined, fallback: number, min: number, max: number, label: string): number {
  const resolved = value ?? fallback;
  if (!Number.isInteger(resolved) || resolved < min || resolved > max) {
    throw new PostgresBackendError('AIWG_POSTGRES_OPTION_INVALID', `${label} must be an integer from ${min} through ${max}`);
  }
  return resolved;
}

function classifyPostgresError(error: unknown): Error {
  if (error instanceof PostgresBackendError) return error;
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  if (['40001', '40P01', '55P03', '57014', '08000', '08003', '08006', '08001'].includes(code)) {
    return new PostgresBackendError('AIWG_POSTGRES_RETRYABLE', `retryable PostgreSQL failure (${code})`, true);
  }
  return error instanceof Error ? error : new Error(String(error));
}
