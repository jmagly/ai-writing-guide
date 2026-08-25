import { afterEach, describe, expect, it, vi } from 'vitest';
import { PostgrestBackendError, PostgrestStorageBackend } from '../../../src/storage/backends/postgrest.js';
import { installPostgrestSchemaV1, postgrestLeastPrivilegeSql, POSTGREST_SCHEMA_V1_SQL } from '../../../src/storage/backends/postgrest-schema.js';
import type { PostgresClientLike, PostgresQueryResult } from '../../../src/storage/backends/postgres.js';

const identity = { tenant: 'tenant-a', subsystem: 'memory', path: 'a.md' };
const mutation = {
  operation: 'upsert' as const, idempotencyKey: 'stable-key',
  record: { identity, sourceRevision: '1', digest: 'sha256:a', value: { kind: 'note' } },
};

function json(value: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' }, ...init });
}

function backend(fetchImpl: typeof fetch, options: Record<string, unknown> = {}) {
  return new PostgrestStorageBackend({
    baseUrl: 'https://storage.example.test/api/', tenant: 'tenant-a', subsystem: 'memory',
    fetch: fetchImpl, ...options,
  });
}

afterEach(() => { delete process.env.AIWG_POSTGREST_TEST_AUTH; });

describe('PostgREST PostgreSQL access mode (#2196)', () => {
  it('models PostgREST as a PostgreSQL transport and verifies schema readiness', async () => {
    const request = vi.fn(async () => json({ healthy: true, ready: true, schemaVersion: '1', highWaterMark: '0', accessMode: 'postgrest', engine: 'postgres' }));
    const store = backend(request as typeof fetch);
    expect(store.descriptor.backend).toBe('postgres-postgrest');
    await store.init();
    expect(request.mock.calls[0][0]).toBe('https://storage.example.test/api/rpc/aiwg_health_v1');
  });

  it('sends one deterministic RPC request for an atomic batch', async () => {
    const request = vi.fn(async () => json({ batchId: 'id', committed: true, highWaterMark: '1', recordReceipts: [] }));
    const store = backend(request as typeof fetch);
    await store.commitBatch([mutation]);
    await store.commitBatch([mutation]);
    const first = request.mock.calls[0];
    const second = request.mock.calls[1];
    expect(first[0]).toBe('https://storage.example.test/api/rpc/aiwg_commit_batch_v1');
    expect((first[1] as RequestInit).method).toBe('POST');
    expect((first[1] as RequestInit).body).toBe((second[1] as RequestInit).body);
    expect(JSON.parse((first[1] as RequestInit).body as string)).toMatchObject({
      p_tenant: 'tenant-a', p_subsystem: 'memory', p_mutations: [mutation],
    });
    expect(((first[1] as RequestInit).headers as Record<string, string>).Prefer).toBe('return=representation');
  });

  it('supports bounded native JSON and CSV bootstrap with an explicit unique conflict target', async () => {
    const request = vi.fn(async () => json([]));
    const store = backend(request as typeof fetch);
    const row = {
      tenant: 'tenant-a', subsystem: 'memory', path: 'a.md', source_revision: '1',
      digest: 'sha256:a', value: { kind: 'note' }, tombstone: false, idempotency_key: 'bootstrap:a:1',
    };
    await store.bulkBootstrapJson([row]);
    const jsonCall = request.mock.calls[0];
    expect(jsonCall[0]).toBe('https://storage.example.test/api/aiwg_storage_records?on_conflict=tenant%2Csubsystem%2Cpath');
    expect((jsonCall[1] as RequestInit).headers).toMatchObject({ Prefer: 'resolution=merge-duplicates,return=representation', 'Content-Type': 'application/json' });

    const csv = 'tenant,subsystem,path,source_revision,digest,value,tombstone,idempotency_key\r\ntenant-a,memory,a.md,1,sha256:a,"{""kind"":""note""}",false,bootstrap:a:1\r\n';
    await store.bulkBootstrapCsv(csv);
    const csvCall = request.mock.calls[1];
    expect((csvCall[1] as RequestInit).headers).toMatchObject({ 'Content-Type': 'text/csv' });
    expect((csvCall[1] as RequestInit).body).toBe(csv);

    await expect(store.bulkBootstrapJson([{ ...row, tenant: 'other' }])).rejects.toMatchObject({ code: 'AIWG_POSTGREST_IDENTITY_MISMATCH' });
    await expect(store.bulkBootstrapCsv('tenant,path\ntenant-a,a.md')).rejects.toMatchObject({ code: 'AIWG_POSTGREST_CSV_INVALID' });
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('maps get, paged query, snapshot, changes, health, and cache reload RPCs', async () => {
    const replies = [
      null,
      { records: [], nextCursor: 'b.md' },
      { snapshot_id: '7', high_water_mark: '9', records: [] },
      { high_water_mark: '10', next_cursor: '10', records: [] },
      { healthy: true, ready: true, schemaVersion: '1', highWaterMark: '10', accessMode: 'postgrest', engine: 'postgres' },
      undefined,
    ];
    const request = vi.fn(async () => replies[0] === undefined
      ? (replies.shift(), new Response(null, { status: 204 }))
      : json(replies.shift()));
    const store = backend(request as typeof fetch);
    await expect(store.get('a.md')).resolves.toBeNull();
    await expect(store.query({ kind: 'note' }, 4, 'a.md')).resolves.toMatchObject({ nextCursor: 'b.md' });
    await expect(store.snapshot()).resolves.toMatchObject({ id: '7', highWaterMark: '9', cursor: '9' });
    await expect(store.changes('9')).resolves.toMatchObject({ highWaterMark: '10', nextCursor: '10' });
    await expect(store.health()).resolves.toMatchObject({ engine: 'postgres', accessMode: 'postgrest' });
    await store.reloadSchemaCache();
    expect(request.mock.calls.map(call => String(call[0]).split('/rpc/')[1])).toEqual([
      'aiwg_get_record_v1', 'aiwg_query_records_v1', 'aiwg_snapshot_v1',
      'aiwg_changes_v1', 'aiwg_health_v1', 'aiwg_reload_schema_v1',
    ]);
  });

  it('keeps authorization in a named environment locator and out of URLs/errors', async () => {
    process.env.AIWG_POSTGREST_TEST_AUTH = 'Bearer secret-value';
    const request = vi.fn(async () => json(null));
    const store = backend(request as typeof fetch, { authorizationEnv: 'AIWG_POSTGREST_TEST_AUTH' });
    await store.get('a.md');
    const [url, init] = request.mock.calls[0];
    expect(String(url)).not.toContain('secret-value');
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer secret-value' });
    delete process.env.AIWG_POSTGREST_TEST_AUTH;
    await expect(store.get('a.md')).rejects.toMatchObject({ code: 'AIWG_POSTGREST_CREDENTIAL_UNAVAILABLE' });
  });

  it('requires remote TLS and rejects credentials or parameters embedded in the URL', () => {
    const noop = vi.fn() as unknown as typeof fetch;
    expect(() => backend(noop, { baseUrl: 'http://remote.example.test' })).toThrowError(PostgrestBackendError);
    expect(() => backend(noop, { baseUrl: 'https://user:pass@remote.example.test' })).toThrowError(/cannot contain credentials/);
    expect(() => backend(noop, { baseUrl: 'https://remote.example.test?a=b' })).toThrowError(/cannot contain credentials/);
    expect(() => backend(noop, { baseUrl: 'http://127.0.0.1:3000' })).not.toThrow();
  });

  it('enforces batch, request, page, cursor, and response ceilings', async () => {
    const large = backend(vi.fn(async () => json(null)) as typeof fetch, { maxBatchSize: 1, maxPayloadBytes: 1024, maxPageSize: 2 });
    await expect(large.commitBatch([mutation, mutation])).rejects.toMatchObject({ code: 'AIWG_POSTGREST_BATCH_TOO_LARGE' });
    await expect(large.query({}, 3)).rejects.toMatchObject({ code: 'AIWG_POSTGREST_OPTION_INVALID' });
    await expect(large.changes('-1')).rejects.toMatchObject({ code: 'AIWG_POSTGREST_CURSOR_INVALID' });
    const hugeValue = { ...mutation, record: { ...mutation.record, value: { text: 'x'.repeat(2000) } } };
    await expect(large.commitBatch([hugeValue])).rejects.toMatchObject({ code: 'AIWG_POSTGREST_PAYLOAD_TOO_LARGE' });
    const response = backend(vi.fn(async () => json({ text: 'x'.repeat(2000) })) as typeof fetch, { maxResponseBytes: 1024 });
    await expect(response.get('a.md')).rejects.toMatchObject({ code: 'AIWG_POSTGREST_RESPONSE_TOO_LARGE' });
  });

  it('classifies partial transport failures and Retry-After responses for stable replay', async () => {
    const failed = backend(vi.fn(async () => { throw new TypeError('socket closed'); }) as typeof fetch);
    await expect(failed.commitBatch([mutation])).rejects.toMatchObject({ code: 'AIWG_POSTGREST_TRANSPORT_FAILED', retryable: true });
    const throttled = backend(vi.fn(async () => new Response('{}', { status: 503, headers: { 'retry-after': '2' } })) as typeof fetch);
    await expect(throttled.commitBatch([mutation])).rejects.toMatchObject({ code: 'AIWG_POSTGREST_RETRYABLE', retryable: true, retryAfterMs: 2000 });
    const raised = backend(vi.fn(async () => json({ code: '40001', message: 'AIWG_POSTGREST_REVISION_CONFLICT', details: 'not exposed' }, { status: 500 })) as typeof fetch);
    await expect(raised.commitBatch([mutation])).rejects.toMatchObject({ code: 'AIWG_POSTGREST_REVISION_CONFLICT', retryable: true });
  });

  it('rejects cross-tenant mutations before transport', async () => {
    const request = vi.fn(async () => json(null));
    const store = backend(request as typeof fetch);
    const foreign = { ...mutation, record: { ...mutation.record, identity: { ...identity, tenant: 'other' } } };
    await expect(store.commitBatch([foreign])).rejects.toMatchObject({ code: 'AIWG_POSTGREST_IDENTITY_MISMATCH' });
    expect(request).not.toHaveBeenCalled();
  });

  it('defines versioned atomic, guarded, idempotent, paged, and schema-cache SQL functions', () => {
    expect(POSTGREST_SCHEMA_V1_SQL).toContain('FUNCTION aiwg_commit_batch_v1');
    expect(POSTGREST_SCHEMA_V1_SQL).toContain('ON CONFLICT (tenant,subsystem,path)');
    expect(POSTGREST_SCHEMA_V1_SQL).toContain('pg_advisory_xact_lock');
    expect(POSTGREST_SCHEMA_V1_SQL).toContain('AIWG_POSTGREST_REVISION_CONFLICT');
    expect(POSTGREST_SCHEMA_V1_SQL).toContain("pg_notify('pgrst','reload schema')");
    expect(POSTGREST_SCHEMA_V1_SQL).toContain('SECURITY INVOKER');
  });

  it('installs schema transactionally, reloads cache after commit, and rolls back errors', async () => {
    const client = new SchemaClient();
    await installPostgrestSchemaV1(client);
    expect(client.queries[0]).toBe('BEGIN');
    expect(client.queries.at(-2)).toBe('COMMIT');
    expect(client.queries.at(-1)).toContain('reload schema');
    const broken = new SchemaClient(true);
    await expect(installPostgrestSchemaV1(broken)).rejects.toThrow('install failed');
    expect(broken.queries.at(-1)).toBe('ROLLBACK');
  });

  it('generates fail-closed requester grants and JWT tenant/subsystem RLS policies', () => {
    const sql = postgrestLeastPrivilegeSql('aiwg-requester');
    expect(sql).toContain('TO "aiwg-requester"');
    expect(sql).toContain('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC');
    expect(sql).toContain('FORCE ROW LEVEL SECURITY');
    expect(sql).toContain("current_setting('request.jwt.claims',true)");
    expect(sql).toContain('WITH CHECK');
    expect(() => postgrestLeastPrivilegeSql('bad\nrole')).toThrow(/printable/);
  });
});

class SchemaClient implements PostgresClientLike {
  queries: string[] = [];
  constructor(private readonly failSchema = false) {}
  async query<Row>(sql: string): Promise<PostgresQueryResult<Row>> {
    this.queries.push(sql);
    if (this.failSchema && sql.includes('CREATE OR REPLACE')) throw new Error('install failed');
    return { rows: [], rowCount: 0 };
  }
  release() {}
}
