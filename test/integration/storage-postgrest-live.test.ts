import { createHash, randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { PostgrestStorageBackend } from '../../src/storage/backends/postgrest.js';

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
