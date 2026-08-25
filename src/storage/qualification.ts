import { createHash } from 'node:crypto';
import type { AtomicMutation, VersionedRecord } from './backend-contract.js';
import { digestRecords, type MigrationEndpoint } from './migration-protocol.js';

export const STORAGE_QUALIFICATION_REPORT = 'aiwg.storage-qualification/v1' as const;

export interface StorageQualificationScope {
  backend: string;
  branch: string;
  commit: string;
  datasetId: string;
  declaredRecords: number;
  readers: number;
  writers: number;
  operations: number;
}

export interface StorageResourceObservation {
  cpuUserMicros: number;
  cpuSystemMicros: number;
  rssBytes: number;
  databaseBytes?: number;
  writeAmplification?: number;
  walBytes?: number;
  lockWaits?: number;
  poolSaturation?: number;
  migrationMs?: number;
  recoveryMs?: number;
  transportOverheadMs?: number;
}

export interface StorageQualificationReport {
  schemaVersion: typeof STORAGE_QUALIFICATION_REPORT;
  runId: string;
  startedAt: string;
  completedAt: string;
  scope: StorageQualificationScope & { observedRecords: number };
  verification: {
    valid: boolean;
    expectedDigest: string;
    observedDigest: string;
    missing: string[];
    unexpected: string[];
    corrupt: string[];
  };
  latencyMs: { p50: number; p95: number; p99: number };
  throughputPerSecond: number;
  errors: number;
  retries: number;
  errorRate: number;
  retryRate: number;
  resources: StorageResourceObservation;
  sideEffects: Array<{ operation: string; outcome: 'committed' | 'replayed' | 'failed'; batchId?: string }>;
}

export interface QualifiableStorageEndpoint<T> extends MigrationEndpoint<T> {
  get?(path: string): Promise<VersionedRecord<T> | null>;
}

export interface QualificationOptions<T> {
  scope: StorageQualificationScope;
  records: readonly VersionedRecord<T>[];
  now?: () => Date;
  resourceObservation?: () => Partial<StorageResourceObservation>;
}

/**
 * Evidence-producing common gate. Correctness is evaluated before latency is
 * reported, so an incomplete or corrupt run can never become a benchmark.
 */
export async function qualifyStorageBackend<T>(
  endpoint: QualifiableStorageEndpoint<T>,
  options: QualificationOptions<T>,
): Promise<StorageQualificationReport> {
  if (options.records.length !== options.scope.declaredRecords) {
    throw new Error('declared record scope does not match the qualification corpus');
  }
  const now = options.now ?? (() => new Date());
  const startedAt = now().toISOString();
  const cpuBefore = process.cpuUsage();
  const rssBefore = process.memoryUsage().rss;
  const start = performance.now();
  const latencies: number[] = [];
  const sideEffects: StorageQualificationReport['sideEffects'] = [];
  let errors = 0;
  let retries = 0;

  const batches = distribute(options.records, options.scope.writers);
  await Promise.all(batches.map(async (records, writer) => {
    for (const record of records) {
      const mutation = mutationFor(record, `qualification:${writer}:${record.identity.path}:${record.sourceRevision}`);
      const operationStart = performance.now();
      try {
        const receipt = await endpoint.commitBatch([mutation]);
        latencies.push(performance.now() - operationStart);
        sideEffects.push({ operation: `write:${record.identity.path}`, outcome: 'committed', batchId: receipt.batchId });
      } catch (error) {
        errors += 1;
        if (isRetryable(error)) {
          retries += 1;
          const receipt = await endpoint.commitBatch([mutation]);
          latencies.push(performance.now() - operationStart);
          sideEffects.push({ operation: `write:${record.identity.path}`, outcome: 'replayed', batchId: receipt.batchId });
        } else {
          sideEffects.push({ operation: `write:${record.identity.path}`, outcome: 'failed' });
          throw error;
        }
      }
    }
  }));

  const expectedDigest = digestRecords(options.records);
  const observed = [...await endpoint.readAll()];
  const verification = verifyExactRecords(options.records, observed);
  const durationMs = Math.max(performance.now() - start, 0.001);
  const cpu = process.cpuUsage(cpuBefore);
  const supplied = options.resourceObservation?.() ?? {};
  const operations = options.records.length + options.scope.readers;
  const report: StorageQualificationReport = {
    schemaVersion: STORAGE_QUALIFICATION_REPORT,
    runId: createHash('sha256').update(`${options.scope.commit}\0${options.scope.backend}\0${startedAt}`).digest('hex'),
    startedAt,
    completedAt: now().toISOString(),
    scope: { ...options.scope, observedRecords: observed.length },
    verification: { ...verification, expectedDigest, observedDigest: digestRecords(observed) },
    latencyMs: percentiles(latencies),
    throughputPerSecond: operations / (durationMs / 1000),
    errors,
    retries,
    errorRate: errors / Math.max(operations, 1),
    retryRate: retries / Math.max(operations, 1),
    resources: {
      cpuUserMicros: cpu.user, cpuSystemMicros: cpu.system,
      rssBytes: Math.max(process.memoryUsage().rss, rssBefore),
      ...supplied,
    },
    sideEffects: sideEffects.sort((a, b) => a.operation.localeCompare(b.operation)),
  };
  if (!report.verification.valid) throw new StorageQualificationError('AIWG_STORAGE_QUALIFICATION_PARITY_FAILED', report);
  return report;
}

export class StorageQualificationError extends Error {
  constructor(readonly code: string, readonly report: StorageQualificationReport) {
    super(`${code}: correctness parity failed; benchmark evidence is invalid`);
    this.name = 'StorageQualificationError';
  }
}

export function verifyExactRecords<T>(expected: readonly VersionedRecord<T>[], observed: readonly VersionedRecord<T>[]) {
  const key = (record: VersionedRecord<T>) => `${record.identity.tenant}\0${record.identity.subsystem}\0${record.identity.path}`;
  const expectedByKey = new Map(expected.map(record => [key(record), record]));
  const observedByKey = new Map(observed.map(record => [key(record), record]));
  const missing = [...expectedByKey.keys()].filter(item => !observedByKey.has(item)).sort();
  const unexpected = [...observedByKey.keys()].filter(item => !expectedByKey.has(item)).sort();
  const corrupt = [...expectedByKey].filter(([item, record]) => {
    const candidate = observedByKey.get(item);
    return candidate !== undefined && digestRecords([record]) !== digestRecords([candidate]);
  }).map(([item]) => item).sort();
  return { valid: missing.length === 0 && unexpected.length === 0 && corrupt.length === 0, missing, unexpected, corrupt };
}

export function assertCurrentStorageEvidence(report: StorageQualificationReport, commit: string): void {
  if (report.schemaVersion !== STORAGE_QUALIFICATION_REPORT || !report.verification.valid) {
    throw new Error('storage performance claim lacks a valid qualification record');
  }
  if (report.scope.commit !== commit) throw new Error('storage qualification record is stale for the requested commit');
  if (report.scope.declaredRecords !== report.scope.observedRecords) throw new Error('storage qualification scope is incomplete');
}

function mutationFor<T>(record: VersionedRecord<T>, idempotencyKey: string): AtomicMutation<T> {
  return { operation: record.tombstone ? 'delete' : 'upsert', record, idempotencyKey };
}

function distribute<T>(records: readonly T[], workers: number): T[][] {
  if (!Number.isInteger(workers) || workers < 1 || workers > 32) throw new Error('writers must be an integer from 1 through 32');
  const buckets = Array.from({ length: workers }, () => [] as T[]);
  records.forEach((record, index) => buckets[index % workers].push(record));
  return buckets;
}

function percentiles(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (percentile: number) => sorted[Math.min(Math.ceil(percentile * sorted.length) - 1, sorted.length - 1)] ?? 0;
  return { p50: at(0.5), p95: at(0.95), p99: at(0.99) };
}

function isRetryable(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'retryable' in error && error.retryable === true;
}
