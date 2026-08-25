import type { PostgresClientLike } from './postgres.js';

export const POSTGRES_SCHEMA_VERSION = 1 as const;

export const POSTGRES_SCHEMA_V1_SQL = `
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
`;

const POSTGREST_FUNCTIONS = [
  'aiwg_reload_schema_v1()',
  'aiwg_health_v1(text,text)',
  'aiwg_changes_v1(text,text,bigint,integer)',
  'aiwg_snapshot_v1(text,text,integer)',
  'aiwg_query_records_v1(text,text,jsonb,text,integer,boolean)',
  'aiwg_get_record_v1(text,text,text)',
  'aiwg_commit_batch_v1(text,text,uuid,text,jsonb)',
  'aiwg_record_v1(aiwg_storage_records)',
] as const;

export interface PostgresSchemaInspection {
  version: 0 | 1;
  records: number;
  receipts: number;
  edges: number;
}

export interface PostgresSchemaRollbackApproval {
  expectedVersion: 1;
  allowDataLoss: true;
  expectedCounts: { records: number; receipts: number; edges: number };
}

export async function inspectPostgresSchema(client: PostgresClientLike): Promise<PostgresSchemaInspection> {
  const exists = await client.query<{ exists: boolean }>("SELECT to_regclass('public.aiwg_storage_schema') IS NOT NULL AS exists");
  if (!exists.rows[0]?.exists) return { version: 0, records: 0, receipts: 0, edges: 0 };
  const result = await client.query<{ schema_version: number; records: string | number; receipts: string | number; edges: string | number }>(`
    SELECT schema_version,
      (SELECT count(*) FROM aiwg_storage_records) AS records,
      (SELECT count(*) FROM aiwg_storage_batch_receipts) AS receipts,
      (SELECT count(*) FROM aiwg_storage_edges) AS edges
    FROM aiwg_storage_schema WHERE singleton=true`);
  const row = result.rows[0];
  if (Number(row?.schema_version) !== 1) throw new Error(`unsupported PostgreSQL storage schema ${String(row?.schema_version)}`);
  return { version: 1, records: Number(row.records), receipts: Number(row.receipts), edges: Number(row.edges) };
}

/** Upgrade an empty database to v1 under a dedicated migration-role connection. */
export async function upgradePostgresSchemaV1(client: PostgresClientLike): Promise<PostgresSchemaInspection> {
  await client.query('BEGIN');
  try {
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended('aiwg-storage-schema',0))");
    const before = await inspectPostgresSchema(client);
    if (before.version === 1) {
      await client.query('COMMIT');
      return before;
    }
    await client.query(POSTGRES_SCHEMA_V1_SQL);
    const after = await inspectPostgresSchema(client);
    if (after.version !== 1) throw new Error('PostgreSQL schema upgrade did not reach v1');
    await client.query('COMMIT');
    return after;
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { /* preserve upgrade error */ }
    throw error;
  }
}

/**
 * Roll v1 back to an empty schema. This is intentionally impossible without
 * exact version and observed-count acknowledgements from a prior inspection.
 */
export async function rollbackPostgresSchemaV1(
  client: PostgresClientLike,
  approval: PostgresSchemaRollbackApproval,
): Promise<PostgresSchemaInspection> {
  if (approval.expectedVersion !== 1 || approval.allowDataLoss !== true) throw new Error('explicit v1 data-loss approval is required');
  await client.query('BEGIN');
  try {
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended('aiwg-storage-schema',0))");
    const before = await inspectPostgresSchema(client);
    const observed = { records: before.records, receipts: before.receipts, edges: before.edges };
    if (before.version !== 1 || JSON.stringify(observed) !== JSON.stringify(approval.expectedCounts)) {
      throw new Error('schema rollback approval does not match current version/counts');
    }
    for (const signature of POSTGREST_FUNCTIONS) await client.query(`DROP FUNCTION IF EXISTS ${signature}`);
    await client.query('DROP TABLE aiwg_storage_edges, aiwg_storage_batch_receipts, aiwg_storage_records, aiwg_storage_schema');
    const after = await inspectPostgresSchema(client);
    if (after.version !== 0) throw new Error('PostgreSQL schema rollback did not reach v0');
    await client.query('COMMIT');
    return after;
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { /* preserve rollback error */ }
    throw error;
  }
}

export function postgresLeastPrivilegeSql(runtimeRole: string): string {
  const role = quoteIdentifier(runtimeRole);
  return `REVOKE ALL ON aiwg_storage_records, aiwg_storage_batch_receipts, aiwg_storage_edges FROM PUBLIC;
REVOKE ALL ON aiwg_storage_schema FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO ${role};
GRANT SELECT, INSERT, UPDATE, DELETE ON aiwg_storage_records, aiwg_storage_batch_receipts, aiwg_storage_edges TO ${role};
GRANT SELECT ON aiwg_storage_schema TO ${role};
GRANT USAGE, SELECT ON SEQUENCE aiwg_storage_records_change_seq_seq TO ${role};`;
}

function quoteIdentifier(value: string): string {
  if (!value || value.length > 63 || /[\u0000-\u001f]/.test(value)) throw new Error('runtime role must be a printable PostgreSQL identifier up to 63 characters');
  return `"${value.replaceAll('"', '""')}"`;
}
