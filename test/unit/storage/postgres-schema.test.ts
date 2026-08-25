import { describe, expect, it } from 'vitest';
import {
  postgresLeastPrivilegeSql,
  rollbackPostgresSchemaV1,
  upgradePostgresSchemaV1,
} from '../../../src/storage/backends/postgres-schema.js';
import type { PostgresClientLike, PostgresQueryResult } from '../../../src/storage/backends/postgres.js';

describe('PostgreSQL schema lifecycle (#2195)', () => {
  it('upgrades v0 to v1 under one advisory-locked transaction', async () => {
    const client = new SchemaClient([0, 1]);
    await expect(upgradePostgresSchemaV1(client)).resolves.toMatchObject({ version: 1 });
    expect(client.queries[0]).toBe('BEGIN');
    expect(client.queries.some(sql => sql.includes('pg_advisory_xact_lock'))).toBe(true);
    expect(client.queries.some(sql => sql.includes('CREATE TABLE IF NOT EXISTS aiwg_storage_records'))).toBe(true);
    expect(client.queries.at(-1)).toBe('COMMIT');
  });

  it('makes upgrade idempotent when v1 already exists', async () => {
    const client = new SchemaClient([1]);
    await expect(upgradePostgresSchemaV1(client)).resolves.toMatchObject({ version: 1, records: 2 });
    expect(client.queries.some(sql => sql.includes('CREATE TABLE'))).toBe(false);
  });

  it('requires exact version, data-loss, and observed-count approval before rollback', async () => {
    const client = new SchemaClient([1, 0]);
    await expect(rollbackPostgresSchemaV1(client, {
      expectedVersion: 1, allowDataLoss: true, expectedCounts: { records: 2, receipts: 1, edges: 3 },
    })).resolves.toEqual({ version: 0, records: 0, receipts: 0, edges: 0 });
    expect(client.queries.filter(sql => sql.startsWith('DROP FUNCTION'))).toHaveLength(8);
    expect(client.queries.some(sql => sql.startsWith('DROP TABLE'))).toBe(true);
    expect(client.queries.at(-1)).toBe('COMMIT');

    const changed = new SchemaClient([1]);
    await expect(rollbackPostgresSchemaV1(changed, {
      expectedVersion: 1, allowDataLoss: true, expectedCounts: { records: 99, receipts: 1, edges: 3 },
    })).rejects.toThrow(/does not match/);
    expect(changed.queries.at(-1)).toBe('ROLLBACK');
  });

  it('generates quoted least-privilege grants and rejects unsafe role identifiers', () => {
    const sql = postgresLeastPrivilegeSql('aiwg-runtime');
    expect(sql).toContain('TO "aiwg-runtime"');
    expect(sql).toContain('REVOKE ALL');
    expect(sql).not.toContain('CREATE ROLE');
    expect(() => postgresLeastPrivilegeSql('bad\nrole')).toThrow(/printable/);
    expect(postgresLeastPrivilegeSql('role"quoted')).toContain('"role""quoted"');
  });
});

class SchemaClient implements PostgresClientLike {
  queries: string[] = [];
  constructor(private readonly versions: Array<0 | 1>) {}
  async query<Row>(sql: string): Promise<PostgresQueryResult<Row>> {
    this.queries.push(sql);
    if (sql.includes("to_regclass('public.aiwg_storage_schema')")) {
      return { rows: [{ exists: this.versions[0] === 1 }] as Row[], rowCount: 1 };
    }
    if (sql.includes('(SELECT count(*) FROM aiwg_storage_records)')) {
      this.versions.shift();
      return { rows: [{ schema_version: 1, records: '2', receipts: '1', edges: '3' }] as Row[], rowCount: 1 };
    }
    if (sql.includes('CREATE TABLE IF NOT EXISTS aiwg_storage_schema')) this.versions[0] = 1;
    if (sql.startsWith('DROP TABLE')) this.versions[0] = 0;
    return { rows: [], rowCount: 0 };
  }
  release() {}
}
