import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PostgrestStorageBackend } from '../../src/storage/backends/postgrest.js';
import { assertCurrentStorageEvidence, qualifyStorageBackend, type StorageQualificationReport } from '../../src/storage/qualification.js';

const live = process.env.AIWG_POSTGREST_LIVE_URL;
const describeLive = live ? describe : describe.skip;

describeLive('PostgREST transport live qualification (#2196)', () => {
  it('proves duplicate delivery, reads, snapshots, changes, reconnect, and database rollback', async () => {
    const tenant = `postgrest-${randomUUID()}`;
    const authorizationEnv = process.env.AIWG_POSTGREST_AUTHORIZATION ? 'AIWG_POSTGREST_AUTHORIZATION' : undefined;
    const options = { baseUrl: live!, tenant, subsystem: 'memory', authorizationEnv };
    const store = new PostgrestStorageBackend<{ kind: string; text: string }>(options);
    await store.init();
    const first = mutation(tenant, 'a.md', '1', 'alpha');
    const deliveries = await Promise.all(Array.from({ length: 8 }, () => store.commitBatch([first])));
    expect(new Set(deliveries.map(receipt => receipt.batchId)).size).toBe(1);
    expect(await store.get('a.md')).toMatchObject({ value: { text: 'alpha' } });
    expect(await store.snapshot()).toMatchObject({ records: [expect.any(Object)] });
    expect(await store.changes('0')).toMatchObject({ records: [expect.any(Object)] });

    const reconnect = new PostgrestStorageBackend<{ kind: string; text: string }>(options);
    await expect(reconnect.commitBatch([first])).resolves.toEqual(deliveries[0]);

    const invalid = [
      mutation(tenant, 'b.md', '1', 'beta'),
      mutation(tenant, 'a.md', '2', 'must-rollback', 'wrong-revision'),
    ];
    await expect(store.commitBatch(invalid)).rejects.toMatchObject({ code: 'AIWG_POSTGREST_REVISION_CONFLICT' });
    await expect(store.get('b.md')).resolves.toBeNull();
  }, 30_000);

  it('retries an ambiguous transport outcome with an identical request and one logical commit', async () => {
    const tenant = `postgrest-fault-${randomUUID()}`;
    const authorization = process.env.AIWG_POSTGREST_AUTHORIZATION;
    let interrupted = false;
    const bodies: string[] = [];
    const partialFetch: typeof fetch = async (input, init) => {
      bodies.push(String(init?.body));
      const response = await fetch(input, {
        ...init,
        headers: { ...(init?.headers as Record<string, string>), ...(authorization ? { Authorization: authorization } : {}) },
      });
      if (!interrupted && String(input).includes('aiwg_commit_batch_v1') && response.ok) {
        interrupted = true;
        await response.arrayBuffer();
        throw new TypeError('injected disconnect after server commit');
      }
      return response;
    };
    const store = new PostgrestStorageBackend({ baseUrl: live!, tenant, subsystem: 'memory', fetch: partialFetch });
    const record = mutation(tenant, 'ambiguous.md', '1', 'once');
    await expect(store.commitBatch([record])).rejects.toMatchObject({ retryable: true });
    await expect(store.commitBatch([record])).resolves.toMatchObject({ committed: true });
    expect(bodies[0]).toBe(bodies[1]);
    expect(await store.readAll()).toHaveLength(1);
  }, 30_000);

  it.skipIf(!process.env.AIWG_POSTGREST_RLS_FOREIGN_TENANT)(
    'enforces requester-role tenant isolation through RLS',
    async () => {
      const tenant = process.env.AIWG_POSTGREST_RLS_TENANT!;
      const foreignTenant = process.env.AIWG_POSTGREST_RLS_FOREIGN_TENANT!;
      const authorizationEnv = 'AIWG_POSTGREST_AUTHORIZATION';
      const allowed = new PostgrestStorageBackend({ baseUrl: live!, tenant, subsystem: 'memory', authorizationEnv });
      const foreign = new PostgrestStorageBackend({ baseUrl: live!, tenant: foreignTenant, subsystem: 'memory', authorizationEnv });
      const path = `rls-${randomUUID()}.md`;
      await allowed.commitBatch([mutation(tenant, path, '1', 'visible')]);
      await expect(allowed.get(path)).resolves.toMatchObject({ identity: { tenant } });
      await expect(foreign.get(path)).resolves.toBeNull();
      await expect(foreign.commitBatch([mutation(foreignTenant, path, '1', 'denied')]))
        .rejects.toMatchObject({ code: 'AIWG_POSTGREST_REQUEST_FAILED' });
    },
    30_000,
  );

  it('emits a correctness-qualified HTTP operating-envelope record', async () => {
    const tenant = `postgrest-envelope-${randomUUID()}`;
    const authorizationEnv = process.env.AIWG_POSTGREST_AUTHORIZATION ? 'AIWG_POSTGREST_AUTHORIZATION' : undefined;
    let transportMs = 0;
    let transportRequests = 0;
    const measuredFetch: typeof fetch = async (input, init) => {
      const startedAt = performance.now();
      try { return await fetch(input, init); }
      finally {
        transportMs += performance.now() - startedAt;
        transportRequests += 1;
      }
    };
    const store = new PostgrestStorageBackend<{ kind: string; text: string }>({
      baseUrl: live!, tenant, subsystem: 'memory', authorizationEnv, maxBatchSize: 1000, fetch: measuredFetch,
    });
    await store.init();
    const corpus = Array.from({ length: 64 }, (_, index) => ({
      identity: { tenant, subsystem: 'memory', path: `record-${String(index).padStart(4, '0')}.md` },
      sourceRevision: '1', digest: createHash('sha256').update(`value-${index}`).digest('hex'),
      value: { kind: 'note', text: `value-${index}` },
    }));
    const report = await qualifyStorageBackend(store, {
      scope: { backend: 'postgres-postgrest', branch: qualificationBranch(), commit: qualificationCommit(), datasetId: 'postgrest-envelope-v1', declaredRecords: corpus.length, readers: 4, writers: 4, operations: corpus.length + 4 },
      records: corpus,
      resourceObservation: () => ({ transportOverheadMs: transportMs / Math.max(transportRequests, 1) }),
    });
    expect(report).toMatchObject({ verification: { valid: true }, scope: { observedRecords: 64 } });
    expect(report.latencyMs.p95).toBeGreaterThanOrEqual(report.latencyMs.p50);
    expect(report.throughputPerSecond).toBeGreaterThan(0);
    expect(() => assertCurrentStorageEvidence(report, qualificationCommit())).not.toThrow();
    persistQualificationEvidence(report);
  }, 30_000);

  it('accepts native JSON and CSV bootstrap rows through the fixed conflict target', async () => {
    const tenant = `postgrest-bootstrap-${randomUUID()}`;
    const authorizationEnv = process.env.AIWG_POSTGREST_AUTHORIZATION ? 'AIWG_POSTGREST_AUTHORIZATION' : undefined;
    const store = new PostgrestStorageBackend({ baseUrl: live!, tenant, subsystem: 'memory', authorizationEnv });
    await store.init();
    await store.bulkBootstrapJson([{
      tenant, subsystem: 'memory', path: 'json.md', source_revision: '1', digest: 'sha256:json',
      value: { kind: 'note', text: 'json' }, tombstone: false, idempotency_key: 'bootstrap:json:1',
    }]);
    const csv = [
      'tenant,subsystem,path,source_revision,digest,value,tombstone,idempotency_key',
      `${tenant},memory,csv.md,1,sha256:csv,"{""kind"":""note"",""text"":""csv""}",false,bootstrap:csv:1`,
      '',
    ].join('\r\n');
    await store.bulkBootstrapCsv(csv);
    await expect(store.get('json.md')).resolves.toMatchObject({ value: { text: 'json' } });
    await expect(store.get('csv.md')).resolves.toMatchObject({ value: '{"kind":"note","text":"csv"}' });
  }, 30_000);
});

function mutation(tenant: string, path: string, revision: string, text: string, expectedRevision?: string) {
  return {
    operation: 'upsert' as const,
    idempotencyKey: `${path}:${revision}`,
    ...(expectedRevision ? { expectedRevision } : {}),
    record: {
      identity: { tenant, subsystem: 'memory', path }, sourceRevision: revision,
      digest: createHash('sha256').update(text).digest('hex'), value: { kind: 'note', text },
    },
  };
}

function qualificationCommit(): string {
  return process.env.AIWG_STORAGE_QUALIFICATION_COMMIT ?? 'live';
}

function qualificationBranch(): string {
  return process.env.AIWG_STORAGE_QUALIFICATION_BRANCH ?? 'qualification';
}

function persistQualificationEvidence(report: StorageQualificationReport): void {
  const directory = process.env.AIWG_STORAGE_EVIDENCE_DIR;
  if (!directory) return;
  if (!/^[0-9a-f]{64}$/.test(report.runId)) throw new Error('qualification run id is unsafe for an evidence filename');
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, `${report.scope.backend}-${report.runId}.json`), `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
}
