import { describe, expect, it } from 'vitest';
import type { AtomicMutation, BatchReceipt, VersionedRecord } from '../../../src/storage/backend-contract.js';
import {
  MigrationProtocolError,
  StorageMigrationCoordinator,
  approvalDigest,
  type MigrationChangePage,
  type MigrationEndpoint,
  type MigrationEndpointIdentity,
  type MigrationManifest,
  type MigrationManifestStore,
  type MigrationRoutingControl,
} from '../../../src/storage/migration-protocol.js';

type Value = { text: string };

const identity = (backend: string): MigrationEndpointIdentity => ({
  backend, instance: `${backend}-1`, tenant: 'tenant-a', subsystem: 'artifacts', schemaVersion: '1',
});

const record = (path: string, revision: string, text: string, deleted = false): VersionedRecord<Value> => ({
  identity: { tenant: 'tenant-a', subsystem: 'artifacts', path },
  sourceRevision: revision,
  digest: `digest-${revision}-${text}`,
  ...(deleted
    ? { tombstone: { deletedAt: '2026-08-24T00:00:00.000Z', reason: text } }
    : { value: { text } }),
});

class MemoryEndpoint implements MigrationEndpoint<Value> {
  readonly identity: MigrationEndpointIdentity;
  records = new Map<string, VersionedRecord<Value>>();
  snapshotRecords: VersionedRecord<Value>[];
  pages: MigrationChangePage<Value>[] = [];
  attempts = 0;
  failFor = 0;
  commitThenFailOnce = false;
  corruptReceipt = false;
  omitReceipt = false;
  reverseReceipts = false;

  constructor(backend: string, records: VersionedRecord<Value>[] = []) {
    this.identity = identity(backend);
    this.snapshotRecords = structuredClone(records);
    for (const item of records) this.records.set(item.identity.path, structuredClone(item));
  }

  async snapshot() {
    return { id: 'snapshot-1', highWaterMark: 'hwm-1', cursor: 'cursor-1', records: structuredClone(this.snapshotRecords) };
  }

  async changes(): Promise<MigrationChangePage<Value>> {
    const page = this.pages.shift() ?? { records: [], highWaterMark: 'hwm-final' };
    for (const item of page.records) this.records.set(item.identity.path, structuredClone(item));
    return structuredClone(page);
  }

  async commitBatch(mutations: readonly AtomicMutation<Value>[]): Promise<BatchReceipt> {
    this.attempts += 1;
    if (this.attempts <= this.failFor) {
      throw new MigrationProtocolError('TEST_TRANSIENT', 'temporary lock', true);
    }
    for (const mutation of mutations) this.records.set(mutation.record.identity.path, structuredClone(mutation.record));
    if (this.commitThenFailOnce) {
      this.commitThenFailOnce = false;
      throw new MigrationProtocolError('TEST_ACK_LOST', 'commit acknowledgement lost', true);
    }
    let receipts = mutations.map(mutation => ({
      identity: mutation.record.identity,
      sourceRevision: `dest-${mutation.record.sourceRevision}`,
      digest: this.corruptReceipt ? 'corrupt' : mutation.record.digest,
    }));
    if (this.omitReceipt) receipts = receipts.slice(1);
    if (this.reverseReceipts) receipts.reverse();
    return { batchId: `batch-${this.attempts}`, committed: true, highWaterMark: `dest-${this.attempts}`, recordReceipts: receipts };
  }

  async readAll() { return [...this.records.values()].map(item => structuredClone(item)); }
}

class MemoryStore implements MigrationManifestStore {
  saves: MigrationManifest[] = [];
  async save(manifest: MigrationManifest) { this.saves.push(structuredClone(manifest)); }
}

class MemoryRouting implements MigrationRoutingControl {
  events: string[] = [];
  failWrites = false;
  async switchReads() { this.events.push('reads'); }
  async switchWrites() {
    this.events.push('writes');
    if (this.failWrites) throw new Error('routing rejected');
  }
  async restoreSource() { this.events.push('restore'); }
}

function setup(sourceRecords = [record('a', '1', 'alpha'), record('b', '1', 'beta')], mode: 'offline' | 'online' = 'offline') {
  const source = new MemoryEndpoint('json-filesystem', sourceRecords);
  const destination = new MemoryEndpoint('fortemi-server');
  const store = new MemoryStore();
  const routing = new MemoryRouting();
  const coordinator = new StorageMigrationCoordinator(source, destination, store, routing, {
    mode, toolVersion: 'test', batchSize: 1, concurrency: 2, maxRetries: 2, baseBackoffMs: 1,
    random: () => 0, now: () => new Date('2026-08-24T12:00:00.000Z'),
  });
  return { source, destination, store, routing, coordinator };
}

describe('storage migration protocol (#2190)', () => {
  it('previews and atomically receipts bounded concurrent batches', async () => {
    const { coordinator, destination, store } = setup();
    destination.reverseReceipts = true;
    const manifest = await coordinator.apply(await coordinator.preview());
    expect(manifest.state).toBe('awaiting-approval');
    expect(manifest.records).toHaveLength(2);
    expect(new Set(manifest.records.map(item => item.identity.path))).toEqual(new Set(['a', 'b']));
    expect(manifest.digests.approval).toBe(approvalDigest(manifest));
    expect(store.saves.at(-1)).toEqual(manifest);
  });

  it('resumes exactly and recopies a changed revision or digest', async () => {
    const { coordinator, destination } = setup();
    const manifest = await coordinator.apply(await coordinator.preview());
    const attempts = destination.attempts;
    manifest.state = 'preview';
    await coordinator.apply(manifest);
    expect(destination.attempts).toBe(attempts);

    const changed = record('a', '2', 'changed');
    const next = setup([changed, record('b', '1', 'beta')]);
    next.destination.records = new Map(
      [...destination.records.entries()].map(([path, item]) => [path, structuredClone(item)]),
    );
    const preview = await next.coordinator.preview();
    preview.records = manifest.records;
    await next.coordinator.apply(preview);
    expect(next.destination.records.get('a')?.sourceRevision).toBe('2');
  });

  it('replays online updates and tombstones and records a drained cursor', async () => {
    const env = setup([record('a', '1', 'alpha')], 'online');
    env.source.pages = [{
      records: [record('a', '2', 'updated'), record('b', '2', 'removed', true)],
      highWaterMark: 'hwm-2',
    }];
    const manifest = await env.coordinator.apply(await env.coordinator.preview());
    expect(manifest.checkpoint.drained).toBe(true);
    expect(env.destination.records.get('a')?.value?.text).toBe('updated');
    expect(env.destination.records.get('b')?.tombstone).toBeTruthy();
  });

  it('retries classified transient faults and bounds exhaustion', async () => {
    const recovered = setup([record('a', '1', 'alpha')]);
    recovered.destination.failFor = 2;
    await expect(recovered.coordinator.apply(await recovered.coordinator.preview())).resolves.toMatchObject({ state: 'awaiting-approval' });
    expect(recovered.destination.attempts).toBe(3);

    const exhausted = setup([record('a', '1', 'alpha')]);
    exhausted.destination.failFor = 3;
    await expect(exhausted.coordinator.apply(await exhausted.coordinator.preview())).rejects.toMatchObject({
      code: 'AIWG_MIGRATION_RETRY_EXHAUSTED',
    });
  });

  it('replays idempotently when acknowledgement is lost after commit', async () => {
    const env = setup([record('a', '1', 'alpha')]);
    env.destination.commitThenFailOnce = true;
    const manifest = await env.coordinator.apply(await env.coordinator.preview());
    expect(env.destination.attempts).toBe(2);
    expect(env.destination.records.size).toBe(1);
    expect(manifest.records).toHaveLength(1);
  });

  it('fails closed for omitted and corrupt destination receipts', async () => {
    const omitted = setup();
    omitted.destination.omitReceipt = true;
    await expect(omitted.coordinator.apply(await omitted.coordinator.preview())).rejects.toMatchObject({ code: 'AIWG_MIGRATION_INVALID_RECEIPT' });

    const corrupt = setup([record('a', '1', 'alpha')]);
    corrupt.destination.corruptReceipt = true;
    await expect(corrupt.coordinator.apply(await corrupt.coordinator.preview())).rejects.toMatchObject({ code: 'AIWG_MIGRATION_CORRUPT_RECEIPT' });
  });

  it('detects missing, unexpected, and corrupt parity controls', async () => {
    const env = setup();
    const manifest = await env.coordinator.preview();
    env.destination.records.set('a', record('a', '1', 'wrong'));
    env.destination.records.set('extra', record('extra', '1', 'extra'));
    const verification = await env.coordinator.verify(manifest);
    expect(verification.valid).toBe(false);
    expect(verification.missing).toHaveLength(1);
    expect(verification.unexpected).toHaveLength(1);
    expect(verification.corrupt).toHaveLength(1);
  });

  it('binds approval to the verified manifest and restores source on cutover failure', async () => {
    const env = setup();
    const manifest = await env.coordinator.apply(await env.coordinator.preview());
    await expect(env.coordinator.cutover(manifest, 'wrong')).rejects.toMatchObject({ code: 'AIWG_MIGRATION_APPROVAL_MISMATCH' });
    env.routing.failWrites = true;
    await expect(env.coordinator.cutover(manifest, manifest.digests.approval!)).rejects.toMatchObject({ code: 'AIWG_MIGRATION_CUTOVER_FAILED' });
    expect(env.routing.events).toEqual(['reads', 'writes', 'restore']);
    expect(manifest.state).toBe('failed');
  });

  it('honors cancellation before mutating the destination', async () => {
    const controller = new AbortController();
    const env = setup();
    const coordinator = new StorageMigrationCoordinator(env.source, env.destination, env.store, env.routing, {
      mode: 'offline', toolVersion: 'test', signal: controller.signal,
    });
    controller.abort();
    await expect(coordinator.preview()).rejects.toMatchObject({ code: 'AIWG_MIGRATION_CANCELLED' });
    expect(env.destination.attempts).toBe(0);
  });
});
