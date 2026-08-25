import { createHash, randomUUID } from 'node:crypto';
import type {
  AtomicMutation,
  BatchReceipt,
  LogicalRecordIdentity,
  VersionedRecord,
} from './backend-contract.js';

export const STORAGE_MIGRATION_PROTOCOL = 'aiwg.storage-migration/v1' as const;

export type MigrationMode = 'offline' | 'online';
export type MigrationState =
  | 'preview'
  | 'copying'
  | 'replaying'
  | 'verifying'
  | 'awaiting-approval'
  | 'cutover'
  | 'observing'
  | 'completed'
  | 'rolled-back'
  | 'failed';

export interface MigrationEndpointIdentity {
  backend: string;
  instance: string;
  tenant: string;
  subsystem: string;
  schemaVersion: string;
}

export interface MigrationRecordReceipt {
  identity: LogicalRecordIdentity;
  sourceRevision: string;
  contentDigest: string;
  destinationRevision: string;
  tombstone: boolean;
  idempotencyKey: string;
  batchId: string;
  committedAt: string;
}

export interface MigrationManifest {
  protocol: typeof STORAGE_MIGRATION_PROTOCOL;
  migrationId: string;
  mode: MigrationMode;
  state: MigrationState;
  source: MigrationEndpointIdentity;
  destination: MigrationEndpointIdentity;
  toolVersion: string;
  createdAt: string;
  updatedAt: string;
  snapshot: { id: string; highWaterMark: string; cursor?: string };
  checkpoint: { cursor?: string; highWaterMark: string; committedBatches: number; drained?: boolean };
  counts: { source: number; upserts: number; tombstones: number; committed: number };
  digests: { source: string; destination?: string; approval?: string };
  records: MigrationRecordReceipt[];
  rollbackWindowEndsAt?: string;
  failure?: { stage: string; message: string };
}

export interface MigrationSnapshot<T> {
  id: string;
  highWaterMark: string;
  cursor?: string;
  records: readonly VersionedRecord<T>[];
}

export interface MigrationChangePage<T> {
  records: readonly VersionedRecord<T>[];
  nextCursor?: string;
  highWaterMark: string;
}

export interface MigrationEndpoint<T> {
  identity: MigrationEndpointIdentity;
  snapshot(signal?: AbortSignal): Promise<MigrationSnapshot<T>>;
  changes?(cursor: string | undefined, signal?: AbortSignal): Promise<MigrationChangePage<T>>;
  commitBatch(mutations: readonly AtomicMutation<T>[], signal?: AbortSignal): Promise<BatchReceipt>;
  readAll(signal?: AbortSignal): Promise<readonly VersionedRecord<T>[]>;
}

export interface MigrationManifestStore {
  save(manifest: MigrationManifest): Promise<void>;
}

export interface MigrationRoutingControl {
  switchReads(manifest: MigrationManifest): Promise<void>;
  switchWrites(manifest: MigrationManifest): Promise<void>;
  restoreSource(manifest: MigrationManifest): Promise<void>;
}

export interface MigrationRunOptions {
  mode: MigrationMode;
  toolVersion: string;
  batchSize?: number;
  concurrency?: number;
  maxRetries?: number;
  baseBackoffMs?: number;
  rollbackWindowMs?: number;
  signal?: AbortSignal;
  now?: () => Date;
  random?: () => number;
}

export interface MigrationVerification {
  valid: boolean;
  sourceCount: number;
  destinationCount: number;
  sourceDigest: string;
  destinationDigest: string;
  missing: string[];
  unexpected: string[];
  corrupt: string[];
  lag: number;
}

export class MigrationProtocolError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly retryable = false,
  ) {
    super(message);
    this.name = 'MigrationProtocolError';
  }
}

export class StorageMigrationCoordinator<T> {
  private readonly batchSize: number;
  private readonly concurrency: number;
  private readonly maxRetries: number;
  private readonly baseBackoffMs: number;
  private readonly rollbackWindowMs: number;
  private readonly now: () => Date;
  private readonly random: () => number;
  private persistChain: Promise<void> = Promise.resolve();

  constructor(
    private readonly source: MigrationEndpoint<T>,
    private readonly destination: MigrationEndpoint<T>,
    private readonly store: MigrationManifestStore,
    private readonly routing: MigrationRoutingControl,
    private readonly options: MigrationRunOptions,
  ) {
    this.batchSize = boundedInteger(options.batchSize, 100, 1, 10_000, 'batchSize');
    this.concurrency = boundedInteger(options.concurrency, 4, 1, 32, 'concurrency');
    this.maxRetries = boundedInteger(options.maxRetries, 5, 0, 20, 'maxRetries');
    this.baseBackoffMs = boundedInteger(options.baseBackoffMs, 25, 1, 60_000, 'baseBackoffMs');
    this.rollbackWindowMs = boundedInteger(options.rollbackWindowMs, 86_400_000, 1, 31_536_000_000, 'rollbackWindowMs');
    this.now = options.now ?? (() => new Date());
    this.random = options.random ?? Math.random;
  }

  async preview(): Promise<MigrationManifest> {
    this.throwIfAborted();
    const snapshot = await this.source.snapshot(this.options.signal);
    const createdAt = this.now().toISOString();
    const sourceDigest = digestRecords(snapshot.records);
    const manifest: MigrationManifest = {
      protocol: STORAGE_MIGRATION_PROTOCOL,
      migrationId: randomUUID(),
      mode: this.options.mode,
      state: 'preview',
      source: this.source.identity,
      destination: this.destination.identity,
      toolVersion: this.options.toolVersion,
      createdAt,
      updatedAt: createdAt,
      snapshot: {
        id: snapshot.id,
        highWaterMark: snapshot.highWaterMark,
        ...(snapshot.cursor === undefined ? {} : { cursor: snapshot.cursor }),
      },
      checkpoint: { highWaterMark: snapshot.highWaterMark, committedBatches: 0 },
      counts: {
        source: snapshot.records.length,
        upserts: snapshot.records.filter(record => !record.tombstone).length,
        tombstones: snapshot.records.filter(record => record.tombstone).length,
        committed: 0,
      },
      digests: { source: sourceDigest },
      records: [],
    };
    await this.store.save(manifest);
    return manifest;
  }

  async apply(manifest: MigrationManifest): Promise<MigrationManifest> {
    validateManifest(manifest, this.source.identity, this.destination.identity);
    const snapshot = await this.source.snapshot(this.options.signal);
    if (snapshot.id !== manifest.snapshot.id || digestRecords(snapshot.records) !== manifest.digests.source) {
      throw new MigrationProtocolError(
        'AIWG_MIGRATION_SNAPSHOT_CHANGED',
        'source snapshot no longer matches the preview; create a new preview',
      );
    }
    manifest.state = 'copying';
    await this.persist(manifest);
    await this.copyRecords(snapshot.records, manifest);

    if (manifest.mode === 'online') {
      if (!this.source.changes) {
        throw new MigrationProtocolError(
          'AIWG_MIGRATION_CURSOR_UNAVAILABLE',
          'online migration requires a source change cursor',
        );
      }
      manifest.state = 'replaying';
      await this.persist(manifest);
      let cursor = manifest.snapshot.cursor;
      for (;;) {
        this.throwIfAborted();
        const page = await this.source.changes(cursor, this.options.signal);
        await this.copyRecords(page.records, manifest);
        cursor = page.nextCursor;
        manifest.checkpoint = {
          ...manifest.checkpoint,
          ...(cursor === undefined ? {} : { cursor }),
          highWaterMark: page.highWaterMark,
          drained: page.records.length === 0 || cursor === undefined,
        };
        await this.persist(manifest);
        if (page.records.length === 0 || cursor === undefined) break;
      }
    }

    manifest.state = 'verifying';
    await this.persist(manifest);
    const verification = await this.verify(manifest);
    if (!verification.valid) {
      manifest.state = 'failed';
      manifest.failure = { stage: 'verify', message: summarizeVerificationFailure(verification) };
      await this.persist(manifest);
      throw new MigrationProtocolError('AIWG_MIGRATION_PARITY_FAILED', manifest.failure.message);
    }
    manifest.digests.destination = verification.destinationDigest;
    manifest.state = 'awaiting-approval';
    manifest.updatedAt = this.now().toISOString();
    manifest.digests.approval = approvalDigest(manifest);
    await this.save(manifest);
    return manifest;
  }

  async verify(manifest: MigrationManifest): Promise<MigrationVerification> {
    const [sourceRecords, destinationRecords] = await Promise.all([
      this.source.readAll(this.options.signal),
      this.destination.readAll(this.options.signal),
    ]);
    const sourceMap = recordMap(sourceRecords);
    const destinationMap = recordMap(destinationRecords);
    const missing = [...sourceMap.keys()].filter(key => !destinationMap.has(key)).sort();
    const unexpected = [...destinationMap.keys()].filter(key => !sourceMap.has(key)).sort();
    const corrupt = [...sourceMap.entries()]
      .filter(([key, record]) => {
        const destination = destinationMap.get(key);
        return destination !== undefined && (
          destination.digest !== record.digest ||
          Boolean(destination.tombstone) !== Boolean(record.tombstone)
        );
      })
      .map(([key]) => key)
      .sort();
    const lag = manifest.mode === 'online' ? Number(!manifest.checkpoint.drained) : 0;
    const sourceDigest = digestRecords(sourceRecords);
    const destinationDigest = digestRecords(destinationRecords);
    return {
      valid: missing.length === 0 && unexpected.length === 0 && corrupt.length === 0 && lag === 0,
      sourceCount: sourceRecords.length,
      destinationCount: destinationRecords.length,
      sourceDigest,
      destinationDigest,
      missing,
      unexpected,
      corrupt,
      lag,
    };
  }

  async cutover(manifest: MigrationManifest, approval: string): Promise<MigrationManifest> {
    validateManifest(manifest, this.source.identity, this.destination.identity);
    if (manifest.state !== 'awaiting-approval') {
      throw new MigrationProtocolError('AIWG_MIGRATION_NOT_READY', 'migration is not awaiting cutover approval');
    }
    const expected = approvalDigest(manifest);
    if (approval !== expected || manifest.digests.approval !== expected) {
      throw new MigrationProtocolError('AIWG_MIGRATION_APPROVAL_MISMATCH', 'cutover approval is not bound to this verified manifest');
    }
    const verification = await this.verify(manifest);
    if (!verification.valid) {
      throw new MigrationProtocolError('AIWG_MIGRATION_PARITY_FAILED', summarizeVerificationFailure(verification));
    }
    manifest.state = 'cutover';
    await this.persist(manifest);
    try {
      await this.routing.switchReads(manifest);
      await this.routing.switchWrites(manifest);
    } catch (error) {
      await this.routing.restoreSource(manifest);
      manifest.state = 'failed';
      manifest.failure = { stage: 'cutover', message: errorMessage(error) };
      await this.persist(manifest);
      throw new MigrationProtocolError('AIWG_MIGRATION_CUTOVER_FAILED', manifest.failure.message);
    }
    manifest.state = 'observing';
    manifest.rollbackWindowEndsAt = new Date(this.now().getTime() + this.rollbackWindowMs).toISOString();
    await this.persist(manifest);
    return manifest;
  }

  async complete(manifest: MigrationManifest): Promise<MigrationManifest> {
    if (manifest.state !== 'observing') {
      throw new MigrationProtocolError('AIWG_MIGRATION_NOT_OBSERVING', 'migration is not in its rollback window');
    }
    manifest.state = 'completed';
    await this.persist(manifest);
    return manifest;
  }

  async rollback(manifest: MigrationManifest): Promise<MigrationManifest> {
    if (!['cutover', 'observing', 'failed'].includes(manifest.state)) {
      throw new MigrationProtocolError('AIWG_MIGRATION_NOT_ROLLBACKABLE', `cannot roll back state ${manifest.state}`);
    }
    await this.routing.restoreSource(manifest);
    manifest.state = 'rolled-back';
    await this.persist(manifest);
    return manifest;
  }

  private async copyRecords(records: readonly VersionedRecord<T>[], manifest: MigrationManifest): Promise<void> {
    const completed = new Set(manifest.records.map(receiptKey));
    const pending = records.filter(record => !completed.has(recordKey(record)));
    const batches = chunk(pending, this.batchSize);
    let next = 0;
    const workers = Array.from({ length: Math.min(this.concurrency, batches.length) }, async () => {
      for (;;) {
        const index = next++;
        if (index >= batches.length) return;
        const batch = batches[index];
        const mutations = batch.map(record => mutationFor(manifest.migrationId, record));
        const receipt = await this.retry(
          () => this.destination.commitBatch(mutations, this.options.signal),
          `batch ${index}`,
        );
        if (!receipt.committed || receipt.recordReceipts.length !== batch.length) {
          throw new MigrationProtocolError('AIWG_MIGRATION_INVALID_RECEIPT', `destination returned an invalid receipt for batch ${index}`);
        }
        const committedAt = this.now().toISOString();
        const committedByIdentity = new Map(
          receipt.recordReceipts.map(recordReceipt => [identityKey(recordReceipt.identity), recordReceipt]),
        );
        for (let recordIndex = 0; recordIndex < batch.length; recordIndex++) {
          const record = batch[recordIndex];
          const committed = committedByIdentity.get(identityKey(record.identity));
          if (!committed || committed.digest !== record.digest) {
            throw new MigrationProtocolError('AIWG_MIGRATION_CORRUPT_RECEIPT', `destination receipt diverged for ${identityKey(record.identity)}`);
          }
          manifest.records.push({
            identity: record.identity,
            sourceRevision: record.sourceRevision,
            contentDigest: record.digest,
            destinationRevision: committed.sourceRevision,
            tombstone: Boolean(record.tombstone),
            idempotencyKey: mutations[recordIndex].idempotencyKey,
            batchId: receipt.batchId,
            committedAt,
          });
        }
        manifest.counts.committed = manifest.records.length;
        manifest.checkpoint.committedBatches += 1;
        manifest.checkpoint.highWaterMark = receipt.highWaterMark;
        await this.persist(manifest);
      }
    });
    await Promise.all(workers);
  }

  private async retry<R>(operation: () => Promise<R>, label: string): Promise<R> {
    let attempt = 0;
    for (;;) {
      this.throwIfAborted();
      try {
        return await operation();
      } catch (error) {
        const retryable = error instanceof MigrationProtocolError && error.retryable;
        if (!retryable) throw error;
        if (attempt >= this.maxRetries) {
          throw new MigrationProtocolError(
            'AIWG_MIGRATION_RETRY_EXHAUSTED',
            `${label} failed after ${attempt + 1} attempt(s): ${errorMessage(error)}`,
          );
        }
        const exponential = this.baseBackoffMs * 2 ** attempt;
        const jitter = Math.floor(exponential * 0.25 * this.random());
        await abortableDelay(Math.min(exponential + jitter, 60_000), this.options.signal);
        attempt += 1;
      }
    }
  }

  private async persist(manifest: MigrationManifest): Promise<void> {
    manifest.updatedAt = this.now().toISOString();
    await this.save(manifest);
  }

  private async save(manifest: MigrationManifest): Promise<void> {
    const snapshot = structuredClone(manifest);
    const save = this.persistChain.then(() => this.store.save(snapshot));
    this.persistChain = save.catch(() => undefined);
    await save;
  }

  private throwIfAborted(): void {
    if (this.options.signal?.aborted) {
      throw new MigrationProtocolError('AIWG_MIGRATION_CANCELLED', 'migration cancelled by operator');
    }
  }
}

export function digestRecords<T>(records: readonly VersionedRecord<T>[]): string {
  const normalized = [...records]
    .map(record => ({
      identity: record.identity,
      sourceRevision: record.sourceRevision,
      digest: record.digest,
      tombstone: record.tombstone ?? null,
    }))
    .sort((left, right) => identityKey(left.identity).localeCompare(identityKey(right.identity)));
  return sha256(stableStringify(normalized));
}

export function approvalDigest(manifest: MigrationManifest): string {
  const copy = structuredClone(manifest);
  delete copy.digests.approval;
  return sha256(stableStringify(copy));
}

export function validateManifest(
  manifest: MigrationManifest,
  source?: MigrationEndpointIdentity,
  destination?: MigrationEndpointIdentity,
): void {
  if (manifest.protocol !== STORAGE_MIGRATION_PROTOCOL) {
    throw new MigrationProtocolError('AIWG_MIGRATION_PROTOCOL_UNSUPPORTED', `unsupported migration protocol ${String(manifest.protocol)}`);
  }
  if (!manifest.migrationId || !manifest.snapshot?.id || !manifest.digests?.source) {
    throw new MigrationProtocolError('AIWG_MIGRATION_MANIFEST_CORRUPT', 'migration manifest is missing required identity or digest fields');
  }
  if (source && stableStringify(manifest.source) !== stableStringify(source)) {
    throw new MigrationProtocolError('AIWG_MIGRATION_SOURCE_MISMATCH', 'manifest source does not match the active source');
  }
  if (destination && stableStringify(manifest.destination) !== stableStringify(destination)) {
    throw new MigrationProtocolError('AIWG_MIGRATION_DESTINATION_MISMATCH', 'manifest destination does not match the active destination');
  }
}

function mutationFor<T>(migrationId: string, record: VersionedRecord<T>): AtomicMutation<T> {
  return {
    operation: record.tombstone ? 'delete' : 'upsert',
    record,
    idempotencyKey: sha256(`${migrationId}\0${recordKey(record)}`),
  };
}

function recordMap<T>(records: readonly VersionedRecord<T>[]): Map<string, VersionedRecord<T>> {
  return new Map(records.map(record => [identityKey(record.identity), record]));
}

function identityKey(identity: LogicalRecordIdentity): string {
  return `${identity.tenant}\0${identity.subsystem}\0${identity.path}`;
}

function recordKey<T>(record: VersionedRecord<T>): string {
  return `${identityKey(record.identity)}\0${record.sourceRevision}\0${record.digest}`;
}

function receiptKey(receipt: MigrationRecordReceipt): string {
  return `${identityKey(receipt.identity)}\0${receipt.sourceRevision}\0${receipt.contentDigest}`;
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
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

function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}

function boundedInteger(raw: number | undefined, fallback: number, min: number, max: number, label: string): number {
  const value = raw ?? fallback;
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new MigrationProtocolError('AIWG_MIGRATION_INVALID_OPTION', `${label} must be an integer from ${min} through ${max}`);
  }
  return value;
}

function summarizeVerificationFailure(verification: MigrationVerification): string {
  return `migration parity failed: missing=${verification.missing.length} unexpected=${verification.unexpected.length} corrupt=${verification.corrupt.length} lag=${verification.lag}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function abortableDelay(ms: number, signal?: AbortSignal): Promise<void> {
  if (!signal) {
    await new Promise(resolve => setTimeout(resolve, ms));
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new MigrationProtocolError('AIWG_MIGRATION_CANCELLED', 'migration cancelled by operator'));
    }, { once: true });
  });
}
