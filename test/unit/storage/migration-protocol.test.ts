import { describe, expect, it } from 'vitest';
import type { AtomicMutation, BatchReceipt, VersionedRecord } from '../../../src/storage/backend-contract.js';
import {
  MigrationProtocolError,
  StorageMigrationCoordinator,
  approvalDigest,
  type MigrationChangePage,
  type MigrationEndpoint,
  type MigrationEndpointIdentity,
  type MigrationBoundaryReceipt,
  type MigrationManifest,
  type MigrationManifestStore,
  type MigrationRoutingControl,
  type MigrationSafetyControl,
  type MigrationSemanticDimension,
  type MigrationSemanticVerification,
  type MigrationVerifierContext,
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
  externalRetryableFor = 0;
  permanentFailure = false;
  failOnAttempt?: number;
  commitThenFailOnce = false;
  corruptReceipt = false;
  omitReceipt = false;
  reverseReceipts = false;
  private readonly durableReceipts = new Map<string, BatchReceipt>();

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
    const replayKey = mutations.map(item => item.idempotencyKey).join('\0');
    const replay = this.durableReceipts.get(replayKey);
    if (replay) return structuredClone(replay);
    if (this.failOnAttempt === this.attempts) throw new Error('process stopped before commit');
    if (this.permanentFailure) throw Object.assign(new Error('schema mismatch'), { retryable: false });
    if (this.attempts <= this.externalRetryableFor) {
      throw Object.assign(new Error('backend lock or rate limit'), { retryable: true });
    }
    if (this.attempts <= this.failFor) {
      throw new MigrationProtocolError('TEST_TRANSIENT', 'temporary lock', true);
    }
    for (const mutation of mutations) {
      const current = this.records.get(mutation.record.identity.path);
      if (mutation.expectedRevision !== undefined && current?.sourceRevision !== mutation.expectedRevision) {
        throw new MigrationProtocolError('TEST_REVISION_CONFLICT', 'destination revision changed');
      }
      this.records.set(mutation.record.identity.path, structuredClone(mutation.record));
    }
    let receipts = mutations.map(mutation => ({
      identity: mutation.record.identity,
      sourceRevision: mutation.record.sourceRevision,
      digest: this.corruptReceipt ? 'corrupt' : mutation.record.digest,
    }));
    if (this.omitReceipt) receipts = receipts.slice(1);
    if (this.reverseReceipts) receipts.reverse();
    const receipt = { batchId: `batch-${this.attempts}`, committed: true, highWaterMark: `dest-${this.attempts}`, recordReceipts: receipts };
    this.durableReceipts.set(replayKey, structuredClone(receipt));
    if (this.commitThenFailOnce) {
      this.commitThenFailOnce = false;
      throw new MigrationProtocolError('TEST_ACK_LOST', 'commit acknowledgement lost', true);
    }
    return receipt;
  }

  async readAll() { return [...this.records.values()].map(item => structuredClone(item)); }
}

class MemoryStore implements MigrationManifestStore {
  saves: MigrationManifest[] = [];
  attempts = 0;
  failFromSave?: number;
  async save(manifest: MigrationManifest) {
    this.attempts += 1;
    if (this.failFromSave !== undefined && this.attempts >= this.failFromSave) throw new Error('checkpoint store unavailable');
    this.saves.push(structuredClone(manifest));
  }
}

class MemoryRouting implements MigrationRoutingControl {
  events: string[] = [];
  failSwitch = false;
  async switchAtomically() {
    this.events.push('atomic-switch');
    if (this.failSwitch) throw new Error('routing rejected');
    return {
      switchId: 'switch-1', previousTarget: 'json-filesystem', activeTarget: 'fortemi-server',
      committedAt: '2026-08-24T12:00:00.000Z',
    };
  }
  async restoreSource() { this.events.push('restore'); }
}

class MemorySafety implements MigrationSafetyControl {
  events: string[] = [];
  initialState: MigrationBoundaryReceipt['state'] | undefined;
  finalState: MigrationBoundaryReceipt['state'] = 'quiesced';

  async prepare(mode: 'offline' | 'online') {
    const state = this.initialState ?? (mode === 'offline' ? 'quiesced' : 'tracking');
    this.events.push(`prepare:${state}`);
    return boundary('initial', state);
  }

  async freeze() {
    this.events.push(`freeze:${this.finalState}`);
    return boundary('final', this.finalState);
  }

  async release(_boundary: MigrationBoundaryReceipt, outcome: 'cutover' | 'rollback' | 'failed') {
    this.events.push(`release:${outcome}`);
  }
}

class MemoryVerifier {
  fail?: MigrationSemanticDimension;
  revision = 1;

  async verify(context: MigrationVerifierContext<Value>): Promise<MigrationSemanticVerification> {
    const sourceCounts = typeCounts(context.sourceRecords);
    const destinationCounts = typeCounts(context.destinationRecords);
    const result = passingSemantic(sourceCounts, destinationCounts, this.revision);
    if (this.fail) result[this.fail] = { ...result[this.fail], valid: false, failures: [`${this.fail} mismatch`] };
    return result;
  }
}

function setup(sourceRecords = [record('a', '1', 'alpha'), record('b', '1', 'beta')], mode: 'offline' | 'online' = 'offline') {
  const source = new MemoryEndpoint('json-filesystem', sourceRecords);
  const destination = new MemoryEndpoint('fortemi-server');
  const store = new MemoryStore();
  const routing = new MemoryRouting();
  const safety = new MemorySafety();
  const verifier = new MemoryVerifier();
  const coordinator = new StorageMigrationCoordinator(source, destination, store, routing, {
    mode, toolVersion: 'test', batchSize: 1, concurrency: 2, maxRetries: 2, baseBackoffMs: 1,
    random: () => 0, now: () => new Date('2026-08-24T12:00:00.000Z'), safety, verifier,
    ...(mode === 'online' ? { compareSourceRevisions: numericRevisionOrder } : {}),
  });
  return { source, destination, store, routing, safety, verifier, coordinator };
}

describe('storage migration protocol (#2190)', () => {
  it('previews and atomically receipts bounded concurrent batches', async () => {
    const { coordinator, destination, safety, store } = setup();
    destination.reverseReceipts = true;
    const manifest = await coordinator.apply(await coordinator.preview());
    expect(manifest.state).toBe('awaiting-approval');
    expect(manifest.records).toHaveLength(2);
    expect(new Set(manifest.records.map(item => item.identity.path))).toEqual(new Set(['a', 'b']));
    expect(manifest.digests.approval).toBe(approvalDigest(manifest));
    expect(manifest.digests.verification).toMatch(/^[0-9a-f]{64}$/);
    expect(manifest.verification).toMatchObject({
      valid: true,
      chunks: { valid: true },
      semantic: {
        schema: { valid: true }, constraints: { valid: true }, countsByType: { valid: true },
        edgeIntegrity: { valid: true }, queryParity: { valid: true }, traversalParity: { valid: true },
      },
    });
    expect(manifest.boundaries).toMatchObject({
      initial: { state: 'quiesced' }, final: { state: 'quiesced' },
    });
    expect(safety.events).toEqual(['prepare:quiesced', 'freeze:quiesced']);
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
    expect(manifest.checkpoint.cursor).toBe('hwm-final');
    expect(manifest.boundaries).toMatchObject({
      initial: { state: 'tracking' }, final: { state: 'quiesced' },
    });
    expect(env.destination.records.get('a')?.value?.text).toBe('updated');
    expect(env.destination.records.get('b')?.tombstone).toBeTruthy();
  });

  it('requires an ordering rule and collapses duplicate/out-of-order online delivery', async () => {
    const base = setup([record('a', '1', 'alpha')]);
    expect(() => new StorageMigrationCoordinator(base.source, base.destination, base.store, base.routing, {
      mode: 'online', toolVersion: 'test', safety: base.safety, verifier: base.verifier,
    })).toThrowError(expect.objectContaining({ code: 'AIWG_MIGRATION_REVISION_ORDER_REQUIRED' }));

    const env = setup([record('a', '1', 'alpha')], 'online');
    env.source.pages = [{
      records: [record('a', '3', 'newest'), record('a', '2', 'stale'), record('a', '3', 'newest')],
      highWaterMark: 'hwm-3',
    }];
    const manifest = await env.coordinator.apply(await env.coordinator.preview());
    expect(env.destination.records.get('a')).toMatchObject({ sourceRevision: '3', value: { text: 'newest' } });
    expect(manifest.records.filter(item => item.identity.path === 'a')).toHaveLength(2);

    const conflicting = setup([record('a', '1', 'alpha')], 'online');
    conflicting.source.pages = [{
      records: [record('a', '2', 'first'), record('a', '2', 'conflict')], highWaterMark: 'hwm-2',
    }];
    await expect(conflicting.coordinator.apply(await conflicting.coordinator.preview())).rejects.toMatchObject({
      code: 'AIWG_MIGRATION_REVISION_CONFLICT',
    });
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

  it('honors backend retry classification for lock, deadlock, timeout, and rate-limit adapters', async () => {
    const transient = setup([record('a', '1', 'alpha')]);
    transient.destination.externalRetryableFor = 1;
    await expect(transient.coordinator.apply(await transient.coordinator.preview())).resolves.toMatchObject({
      state: 'awaiting-approval',
    });
    expect(transient.destination.attempts).toBe(2);

    const permanent = setup([record('a', '1', 'alpha')]);
    permanent.destination.permanentFailure = true;
    await expect(permanent.coordinator.apply(await permanent.coordinator.preview())).rejects.toThrow('schema mismatch');
    expect(permanent.destination.attempts).toBe(1);
    expect(permanent.destination.records.size).toBe(0);
    expect(permanent.safety.events.at(-1)).toBe('release:failed');
  });

  it('replays idempotently when acknowledgement is lost after commit', async () => {
    const env = setup([record('a', '1', 'alpha')]);
    env.destination.commitThenFailOnce = true;
    const manifest = await env.coordinator.apply(await env.coordinator.preview());
    expect(env.destination.attempts).toBe(2);
    expect(env.destination.records.size).toBe(1);
    expect(manifest.records).toHaveLength(1);
  });

  it('recovers after commit/checkpoint failure with a fresh coordinator and durable idempotency receipt', async () => {
    const env = setup([record('a', '1', 'alpha')]);
    const preview = await env.coordinator.preview();
    env.store.failFromSave = 3;
    await expect(env.coordinator.apply(preview)).rejects.toThrow('checkpoint store unavailable');
    expect(env.destination.records.get('a')).toMatchObject({ sourceRevision: '1' });
    const durable = structuredClone(env.store.saves.at(-1)!);
    expect(durable.records).toHaveLength(0);

    env.store.failFromSave = undefined;
    const resumed = new StorageMigrationCoordinator(env.source, env.destination, env.store, env.routing, {
      mode: 'offline', toolVersion: 'test', batchSize: 1, concurrency: 1,
      maxRetries: 2, baseBackoffMs: 1, random: () => 0,
      now: () => new Date('2026-08-24T12:00:00.000Z'), safety: env.safety, verifier: env.verifier,
    });
    const completed = await resumed.apply(durable);
    expect(completed).toMatchObject({ state: 'awaiting-approval', counts: { committed: 1 } });
    expect(env.destination.records.size).toBe(1);
    expect(env.destination.attempts).toBe(2);
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

  it('fails closed when any required semantic verification dimension is invalid or incomplete', async () => {
    for (const dimension of [
      'schema', 'constraints', 'countsByType', 'edgeIntegrity', 'queryParity', 'traversalParity',
    ] as const) {
      const env = setup();
      env.verifier.fail = dimension;
      await expect(env.coordinator.apply(await env.coordinator.preview())).rejects.toMatchObject({
        code: 'AIWG_MIGRATION_PARITY_FAILED',
      });
    }

    const incomplete = setup();
    incomplete.verifier.verify = async () => ({ schema: semanticCheck(1) }) as MigrationSemanticVerification;
    await expect(incomplete.coordinator.apply(await incomplete.coordinator.preview())).rejects.toMatchObject({
      code: 'AIWG_MIGRATION_SEMANTIC_VERIFICATION_INVALID',
    });
  });

  it('invalidates approval when a still-valid semantic result changes before cutover', async () => {
    const env = setup();
    const manifest = await env.coordinator.apply(await env.coordinator.preview());
    env.verifier.revision = 2;
    await expect(env.coordinator.cutover(manifest, manifest.digests.approval!)).rejects.toMatchObject({
      code: 'AIWG_MIGRATION_VERIFICATION_CHANGED',
    });
  });

  it('binds approval to the verified manifest and restores source on atomic cutover failure', async () => {
    const env = setup();
    const manifest = await env.coordinator.apply(await env.coordinator.preview());
    await expect(env.coordinator.cutover(manifest, 'wrong')).rejects.toMatchObject({ code: 'AIWG_MIGRATION_APPROVAL_MISMATCH' });
    env.routing.failSwitch = true;
    await expect(env.coordinator.cutover(manifest, manifest.digests.approval!)).rejects.toMatchObject({ code: 'AIWG_MIGRATION_CUTOVER_FAILED' });
    expect(env.routing.events).toEqual(['atomic-switch', 'restore']);
    expect(env.safety.events.at(-1)).toBe('release:failed');
    expect(manifest.state).toBe('failed');
  });

  it('requires durable offline quiescence and online tracking/final-freeze receipts', async () => {
    const offline = setup();
    offline.safety.initialState = 'tracking';
    await expect(offline.coordinator.preview()).rejects.toMatchObject({ code: 'AIWG_MIGRATION_BOUNDARY_INVALID' });
    expect(offline.safety.events).toEqual(['prepare:tracking', 'release:failed']);

    const online = setup([record('a', '1', 'alpha')], 'online');
    online.safety.finalState = 'tracking';
    await expect(online.coordinator.apply(await online.coordinator.preview())).rejects.toMatchObject({
      code: 'AIWG_MIGRATION_BOUNDARY_INVALID',
    });
    expect(online.safety.events).toEqual(['prepare:tracking', 'freeze:tracking', 'release:failed']);
  });

  it('records one atomic routing receipt before releasing the source boundary', async () => {
    const env = setup();
    const manifest = await env.coordinator.apply(await env.coordinator.preview());
    const cutover = await env.coordinator.cutover(manifest, manifest.digests.approval!);
    expect(env.routing.events).toEqual(['atomic-switch']);
    expect(env.safety.events.at(-1)).toBe('release:cutover');
    expect(cutover.routingSwitch).toMatchObject({
      switchId: 'switch-1', previousTarget: 'json-filesystem', activeTarget: 'fortemi-server',
    });
  });

  it('honors cancellation before mutating the destination', async () => {
    const controller = new AbortController();
    const env = setup();
    const coordinator = new StorageMigrationCoordinator(env.source, env.destination, env.store, env.routing, {
      mode: 'offline', toolVersion: 'test', signal: controller.signal, safety: env.safety, verifier: env.verifier,
    });
    controller.abort();
    await expect(coordinator.preview()).rejects.toMatchObject({ code: 'AIWG_MIGRATION_CANCELLED' });
    expect(env.destination.attempts).toBe(0);
  });
});

function passingSemantic(
  sourceCounts: Record<string, number>,
  destinationCounts: Record<string, number>,
  revision: number,
): MigrationSemanticVerification {
  const countsValid = JSON.stringify(sourceCounts) === JSON.stringify(destinationCounts);
  return {
    schema: { ...semanticCheck(2), evidenceDigest: `semantic-${revision}` },
    constraints: semanticCheck(1),
    countsByType: {
      valid: countsValid,
      declared: Object.keys(sourceCounts).length,
      checked: Object.keys(sourceCounts).length,
      failures: countsValid ? [] : ['record type counts differ'],
      sourceCounts,
      destinationCounts,
    },
    edgeIntegrity: semanticCheck(0),
    queryParity: semanticCheck(2),
    traversalParity: semanticCheck(0),
  };
}

function semanticCheck(declared: number) {
  return { valid: true, declared, checked: declared, failures: [] };
}

function typeCounts(records: readonly VersionedRecord<Value>[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of records) {
    const type = item.tombstone ? 'tombstone' : 'note';
    counts[type] = (counts[type] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function numericRevisionOrder(left: string, right: string): number {
  return Number(left) - Number(right);
}

function boundary(id: string, state: MigrationBoundaryReceipt['state']): MigrationBoundaryReceipt {
  return {
    boundaryId: id,
    state,
    establishedAt: '2026-08-24T12:00:00.000Z',
    highWaterMark: 'hwm-1',
  };
}
