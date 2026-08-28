import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { AtomicMutation, BatchReceipt, VersionedRecord } from '../../src/storage/backend-contract.js';
import type { MigrationChangePage, MigrationSnapshot } from '../../src/storage/migration-protocol.js';
import {
  assertCurrentStorageEvidence,
  qualifyStorageBackend,
  StorageQualificationError,
  verifyExactRecords,
} from '../../src/storage/qualification.js';

const records = [
  record('ascii.md', { title: 'Alpha', optional: null }),
  record('Béta.md', { title: 'Béta', order: 2 }),
  record('東京.md', { title: '東京', order: 3 }),
  { ...record('deleted.md', undefined), tombstone: { deletedAt: '2026-08-25T00:00:00.000Z', reason: 'fixture' } },
];

describe('storage qualification evidence (#2191)', () => {
  it('records exact declared/observed scope, latency distribution, resources, retry rates, and side effects', async () => {
    const endpoint = new MemoryEndpoint();
    endpoint.failOnce.add('Béta.md');
    const report = await qualifyStorageBackend(endpoint, {
      scope: { backend: 'memory-fixture', branch: 'main', commit: 'abc123', datasetId: 'qualification-v1', declaredRecords: 4, readers: 3, writers: 2, operations: 7 },
      records,
      now: clock(),
      resourceObservation: async () => ({ databaseBytes: 4096, walBytes: 512, writeAmplification: 1.2, lockWaits: 0, poolSaturation: 0.5, migrationMs: 12, recoveryMs: 4, transportOverheadMs: 2 }),
    });
    expect(report).toMatchObject({
      schemaVersion: 'aiwg.storage-qualification/v1',
      scope: { declaredRecords: 4, observedRecords: 4, readers: 3, writers: 2, operations: 7, observedOperations: 7 },
      verification: { valid: true, missing: [], unexpected: [], corrupt: [] },
      errors: 1, retries: 1,
      resources: { databaseBytes: 4096, walBytes: 512, lockWaits: 0, transportOverheadMs: 2 },
    });
    expect(report.latencyMs.p99).toBeGreaterThanOrEqual(report.latencyMs.p50);
    expect(report.throughputPerSecond).toBeGreaterThan(0);
    expect(report.sideEffects).toHaveLength(7);
    expect(report.sideEffects.filter(item => item.operation.startsWith('read:'))).toHaveLength(3);
    expect(new Set(report.sideEffects.filter(item => item.operation.startsWith('write:')).map(item => item.operation)).size).toBe(4);
    expect(() => assertCurrentStorageEvidence(report, 'abc123')).not.toThrow();
    expect(() => assertCurrentStorageEvidence(report, 'new-head')).toThrow(/stale/);
  });

  it('invalidates deliberately omitted, unexpected, and corrupt record controls before performance claims', async () => {
    const omitted = new MemoryEndpoint('omit');
    await expect(qualifyStorageBackend(omitted, { scope: scope(), records })).rejects.toBeInstanceOf(StorageQualificationError);
    const unexpected = verifyExactRecords(records, [...records, record('extra.md', { bad: true })]);
    expect(unexpected).toMatchObject({ valid: false, unexpected: [expect.stringContaining('extra.md')] });
    const corrupt = verifyExactRecords(records, records.map(item => item.identity.path === 'ascii.md' ? { ...item, digest: 'corrupt' } : item));
    expect(corrupt).toMatchObject({ valid: false, corrupt: [expect.stringContaining('ascii.md')] });
  });

  it('rejects a run whose declared corpus scope differs from observed input', async () => {
    await expect(qualifyStorageBackend(new MemoryEndpoint(), {
      scope: { ...scope(), declaredRecords: 99 }, records,
    })).rejects.toThrow(/declared record scope/);
    await expect(qualifyStorageBackend(new MemoryEndpoint(), {
      scope: { ...scope(), operations: 99 }, records,
    })).rejects.toThrow(/declared operation scope/);
  });

  it('reports unavailable resource dimensions explicitly and rejects invalid observations', async () => {
    const report = await qualifyStorageBackend(new MemoryEndpoint(), { scope: scope(), records });
    expect(report.resources).toMatchObject({
      databaseBytes: null,
      writeAmplification: null,
      walBytes: null,
      lockWaits: null,
      poolSaturation: null,
      migrationMs: null,
      recoveryMs: null,
      transportOverheadMs: null,
    });
    await expect(qualifyStorageBackend(new MemoryEndpoint(), {
      scope: scope(), records, resourceObservation: () => ({ lockWaits: -1 }),
    })).rejects.toThrow(/lockWaits must be a finite non-negative number/);
  });
});

class MemoryEndpoint {
  readonly identity = { backend: 'memory', instance: 'test', tenant: 'qualification', subsystem: 'memory', schemaVersion: '1' };
  readonly failOnce = new Set<string>();
  private readonly data = new Map<string, VersionedRecord<unknown>>();
  constructor(private readonly control?: 'omit') {}
  async snapshot(): Promise<MigrationSnapshot<unknown>> { return { id: 'snapshot', highWaterMark: String(this.data.size), records: await this.readAll() }; }
  async changes(): Promise<MigrationChangePage<unknown>> { return { highWaterMark: String(this.data.size), records: [] }; }
  async commitBatch(mutations: readonly AtomicMutation<unknown>[]): Promise<BatchReceipt> {
    const path = mutations[0].record.identity.path;
    if (this.failOnce.delete(path)) throw Object.assign(new Error('retry'), { retryable: true });
    for (const mutation of mutations) this.data.set(mutation.record.identity.path, structuredClone(mutation.record));
    return { batchId: createHash('sha256').update(mutations.map(item => item.idempotencyKey).join()).digest('hex'), committed: true, highWaterMark: String(this.data.size), recordReceipts: mutations.map(item => ({ identity: item.record.identity, sourceRevision: item.record.sourceRevision, digest: item.record.digest })) };
  }
  async readAll() {
    const result = [...this.data.values()].sort((a, b) => a.identity.path.localeCompare(b.identity.path));
    return this.control === 'omit' ? result.slice(1) : result;
  }
}

function record(path: string, value: unknown): VersionedRecord<unknown> {
  return { identity: { tenant: 'qualification', subsystem: 'memory', path }, sourceRevision: '1', digest: createHash('sha256').update(JSON.stringify(value) ?? 'undefined').digest('hex'), ...(value === undefined ? {} : { value }) };
}

function scope() {
  return { backend: 'memory-fixture', branch: 'main', commit: 'abc123', datasetId: 'qualification-v1', declaredRecords: 4, readers: 1, writers: 1, operations: 5 };
}

function clock() {
  let second = 0;
  return () => new Date(Date.UTC(2026, 7, 25, 0, 0, second++));
}
