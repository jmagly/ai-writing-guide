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
  digests: { source: string; destination?: string; verification?: string; approval?: string };
  records: MigrationRecordReceipt[];
  boundaries: {
    initial: MigrationBoundaryReceipt;
    final?: MigrationBoundaryReceipt;
  };
  routingSwitch?: MigrationRoutingReceipt;
  verification?: MigrationVerification;
  rollbackWindowEndsAt?: string;
  failure?: { stage: string; message: string };
}

export type MigrationBoundaryState = 'tracking' | 'quiesced';

export interface MigrationBoundaryReceipt {
  boundaryId: string;
  state: MigrationBoundaryState;
  establishedAt: string;
  highWaterMark?: string;
}

export interface MigrationRoutingReceipt {
  switchId: string;
  previousTarget: string;
  activeTarget: string;
  committedAt: string;
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

export interface MigrationSafetyControl {
  prepare(
    mode: MigrationMode,
    source: MigrationEndpointIdentity,
    signal?: AbortSignal,
  ): Promise<MigrationBoundaryReceipt>;
  freeze(manifest: MigrationManifest, signal?: AbortSignal): Promise<MigrationBoundaryReceipt>;
  release(
    boundary: MigrationBoundaryReceipt,
    outcome: 'cutover' | 'rollback' | 'failed',
  ): Promise<void>;
}

export interface MigrationRoutingControl {
  switchAtomically(manifest: MigrationManifest): Promise<MigrationRoutingReceipt>;
  restoreSource(manifest: MigrationManifest): Promise<void>;
}

export type MigrationSemanticDimension =
  | 'schema'
  | 'constraints'
  | 'countsByType'
  | 'edgeIntegrity'
  | 'queryParity'
  | 'traversalParity';

export interface MigrationSemanticCheck {
  valid: boolean;
  declared: number;
  checked: number;
  failures: string[];
  evidenceDigest?: string;
  sourceCounts?: Record<string, number>;
  destinationCounts?: Record<string, number>;
}

export type MigrationSemanticVerification = Record<MigrationSemanticDimension, MigrationSemanticCheck>;

export interface MigrationVerifierContext<T> {
  manifest: MigrationManifest;
  source: MigrationEndpoint<T>;
  destination: MigrationEndpoint<T>;
  sourceRecords: readonly VersionedRecord<T>[];
  destinationRecords: readonly VersionedRecord<T>[];
  signal?: AbortSignal;
}

export interface MigrationSemanticVerifier<T> {
  verify(context: MigrationVerifierContext<T>): Promise<MigrationSemanticVerification>;
}

export interface MigrationRunOptions<T = unknown> {
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
  safety: MigrationSafetyControl;
  verifier: MigrationSemanticVerifier<T>;
  /** Required for online mode because source revisions are backend-defined opaque values. */
  compareSourceRevisions?: (left: string, right: string) => number;
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
  chunks: { valid: boolean; source: string[]; destination: string[] };
  semantic: MigrationSemanticVerification;
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
    private readonly options: MigrationRunOptions<T>,
  ) {
    this.batchSize = boundedInteger(options.batchSize, 100, 1, 10_000, 'batchSize');
    this.concurrency = boundedInteger(options.concurrency, 4, 1, 32, 'concurrency');
    this.maxRetries = boundedInteger(options.maxRetries, 5, 0, 20, 'maxRetries');
    this.baseBackoffMs = boundedInteger(options.baseBackoffMs, 25, 1, 60_000, 'baseBackoffMs');
    this.rollbackWindowMs = boundedInteger(options.rollbackWindowMs, 86_400_000, 1, 31_536_000_000, 'rollbackWindowMs');
    this.now = options.now ?? (() => new Date());
    this.random = options.random ?? Math.random;
    if (options.mode === 'online' && !options.compareSourceRevisions) {
      throw new MigrationProtocolError(
        'AIWG_MIGRATION_REVISION_ORDER_REQUIRED',
        'online migration requires a source-revision comparator',
      );
    }
  }

  async preview(): Promise<MigrationManifest> {
    this.throwIfAborted();
    const boundary = await this.options.safety.prepare(
      this.options.mode,
      this.source.identity,
      this.options.signal,
    );
    try {
      assertBoundaryState(boundary, this.options.mode === 'offline' ? 'quiesced' : 'tracking', 'initial');
    } catch (error) {
      await this.options.safety.release(boundary, 'failed');
      throw error;
    }
    let snapshot: MigrationSnapshot<T>;
    try {
      snapshot = await this.source.snapshot(this.options.signal);
    } catch (error) {
      await this.options.safety.release(boundary, 'failed');
      throw error;
    }
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
      boundaries: { initial: boundary },
    };
    try {
      await this.store.save(manifest);
    } catch (error) {
      await this.options.safety.release(boundary, 'failed');
      throw error;
    }
    return manifest;
  }

  async apply(manifest: MigrationManifest): Promise<MigrationManifest> {
    validateManifest(manifest, this.source.identity, this.destination.identity);
    try {
      const snapshot = await this.source.snapshot(this.options.signal);
      if (digestRecords(snapshot.records) !== manifest.digests.source) {
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
        await this.replayChanges(manifest);
      }

      const finalBoundary = await this.options.safety.freeze(manifest, this.options.signal);
      manifest.boundaries.final = finalBoundary;
      assertBoundaryState(finalBoundary, 'quiesced', 'final');
      await this.persist(manifest);
      if (manifest.mode === 'online') await this.replayChanges(manifest);

      manifest.state = 'verifying';
      await this.persist(manifest);
      const verification = await this.verify(manifest);
      if (!verification.valid) {
        throw new MigrationProtocolError('AIWG_MIGRATION_PARITY_FAILED', summarizeVerificationFailure(verification));
      }
      manifest.digests.destination = verification.destinationDigest;
      manifest.verification = verification;
      manifest.digests.verification = sha256(stableStringify(verification));
      manifest.state = 'awaiting-approval';
      manifest.updatedAt = this.now().toISOString();
      manifest.digests.approval = approvalDigest(manifest);
      await this.save(manifest);
      return manifest;
    } catch (error) {
      const stage = manifest.state;
      manifest.state = 'failed';
      manifest.failure = { stage, message: errorMessage(error) };
      try {
        await this.persist(manifest);
      } catch {
        // Preserve the triggering failure; the manifest store error is already observable at its source.
      }
      await this.options.safety.release(
        manifest.boundaries.final ?? manifest.boundaries.initial,
        'failed',
      );
      throw error;
    }
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
          destination.sourceRevision !== record.sourceRevision ||
          destination.digest !== record.digest ||
          Boolean(destination.tombstone) !== Boolean(record.tombstone)
        );
      })
      .map(([key]) => key)
      .sort();
    const boundaryReady = manifest.boundaries.final?.state === 'quiesced';
    const lag = Number(!boundaryReady || (manifest.mode === 'online' && !manifest.checkpoint.drained));
    const sourceDigest = digestRecords(sourceRecords);
    const destinationDigest = digestRecords(destinationRecords);
    const sourceChunks = digestRecordChunks(sourceRecords, this.batchSize);
    const destinationChunks = digestRecordChunks(destinationRecords, this.batchSize);
    const chunks = {
      valid: stableStringify(sourceChunks) === stableStringify(destinationChunks),
      source: sourceChunks,
      destination: destinationChunks,
    };
    const semantic = await this.options.verifier.verify({
      manifest,
      source: this.source,
      destination: this.destination,
      sourceRecords,
      destinationRecords,
      signal: this.options.signal,
    });
    validateSemanticVerification(semantic);
    return {
      valid: missing.length === 0 && unexpected.length === 0 && corrupt.length === 0 && lag === 0 &&
        sourceDigest === destinationDigest && chunks.valid && semanticIsValid(semantic),
      sourceCount: sourceRecords.length,
      destinationCount: destinationRecords.length,
      sourceDigest,
      destinationDigest,
      missing,
      unexpected,
      corrupt,
      lag,
      chunks,
      semantic,
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
    if (!manifest.digests.verification || sha256(stableStringify(verification)) !== manifest.digests.verification) {
      throw new MigrationProtocolError(
        'AIWG_MIGRATION_VERIFICATION_CHANGED',
        'migration verification changed after approval; verify and approve a new manifest',
      );
    }
    const finalBoundary = manifest.boundaries.final;
    if (!finalBoundary) {
      throw new MigrationProtocolError('AIWG_MIGRATION_BOUNDARY_MISSING', 'migration has no final quiesced source boundary');
    }
    manifest.state = 'cutover';
    await this.persist(manifest);
    try {
      manifest.routingSwitch = await this.routing.switchAtomically(manifest);
      await this.options.safety.release(finalBoundary, 'cutover');
    } catch (error) {
      await this.routing.restoreSource(manifest);
      await this.options.safety.release(finalBoundary, 'failed');
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
    await this.options.safety.release(manifest.boundaries.final ?? manifest.boundaries.initial, 'rollback');
    manifest.state = 'rolled-back';
    await this.persist(manifest);
    return manifest;
  }

  private async copyRecords(records: readonly VersionedRecord<T>[], manifest: MigrationManifest): Promise<void> {
    const completed = new Set(manifest.records.map(receiptKey));
    const latest = new Map<string, MigrationRecordReceipt>();
    for (const receipt of manifest.records) latest.set(identityKey(receipt.identity), receipt);
    const selected = new Map<string, VersionedRecord<T>>();
    for (const record of records) {
      if (completed.has(recordKey(record))) continue;
      const key = identityKey(record.identity);
      const receipt = latest.get(key);
      if (receipt && this.options.compareSourceRevisions) {
        const order = compareRevisions(this.options.compareSourceRevisions, record.sourceRevision, receipt.sourceRevision);
        if (order < 0) continue;
        if (order === 0) {
          if (record.digest !== receipt.contentDigest) throw revisionConflict(key, record.sourceRevision);
          continue;
        }
      }
      const prior = selected.get(key);
      if (!prior) {
        selected.set(key, record);
        continue;
      }
      if (!this.options.compareSourceRevisions) {
        throw new MigrationProtocolError('AIWG_MIGRATION_DUPLICATE_IDENTITY', `snapshot contains multiple records for ${key}`);
      }
      const order = compareRevisions(this.options.compareSourceRevisions, record.sourceRevision, prior.sourceRevision);
      if (order > 0) selected.set(key, record);
      else if (order === 0 && record.digest !== prior.digest) throw revisionConflict(key, record.sourceRevision);
    }
    const pending = [...selected.values()].sort((left, right) => identityKey(left.identity).localeCompare(identityKey(right.identity)));
    const batches = chunk(pending, this.batchSize);
    let next = 0;
    const workers = Array.from({ length: Math.min(this.concurrency, batches.length) }, async () => {
      for (;;) {
        const index = next++;
        if (index >= batches.length) return;
        const batch = batches[index];
        const mutations = batch.map(record => mutationFor(
          manifest.migrationId,
          record,
          latest.get(identityKey(record.identity))?.destinationRevision,
        ));
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

  private async replayChanges(manifest: MigrationManifest): Promise<void> {
    if (!this.source.changes) {
      throw new MigrationProtocolError(
        'AIWG_MIGRATION_CURSOR_UNAVAILABLE',
        'online migration requires a source change cursor',
      );
    }
    let cursor = manifest.checkpoint.cursor ?? manifest.snapshot.cursor;
    for (;;) {
      this.throwIfAborted();
      const page = await this.source.changes(cursor, this.options.signal);
      await this.copyRecords(page.records, manifest);
      cursor = page.nextCursor ?? page.highWaterMark;
      manifest.checkpoint = {
        ...manifest.checkpoint,
        cursor,
        highWaterMark: page.highWaterMark,
        drained: page.records.length === 0 || page.nextCursor === undefined,
      };
      await this.persist(manifest);
      if (manifest.checkpoint.drained) break;
    }
  }

  private async retry<R>(operation: () => Promise<R>, label: string): Promise<R> {
    let attempt = 0;
    for (;;) {
      this.throwIfAborted();
      try {
        return await operation();
      } catch (error) {
        const retryable = isRetryableError(error);
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

export function digestRecordChunks<T>(records: readonly VersionedRecord<T>[], chunkSize: number): string[] {
  const sorted = [...records].sort((left, right) => identityKey(left.identity).localeCompare(identityKey(right.identity)));
  return chunk(sorted, chunkSize).map(recordsInChunk => digestRecords(recordsInChunk));
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
  if (!manifest.boundaries?.initial) {
    throw new MigrationProtocolError('AIWG_MIGRATION_BOUNDARY_MISSING', 'migration manifest has no durable source boundary receipt');
  }
  assertBoundaryState(
    manifest.boundaries.initial,
    manifest.mode === 'offline' ? 'quiesced' : 'tracking',
    'initial',
  );
  if (source && stableStringify(manifest.source) !== stableStringify(source)) {
    throw new MigrationProtocolError('AIWG_MIGRATION_SOURCE_MISMATCH', 'manifest source does not match the active source');
  }
  if (destination && stableStringify(manifest.destination) !== stableStringify(destination)) {
    throw new MigrationProtocolError('AIWG_MIGRATION_DESTINATION_MISMATCH', 'manifest destination does not match the active destination');
  }
}

function assertBoundaryState(
  boundary: MigrationBoundaryReceipt,
  expected: MigrationBoundaryState,
  stage: 'initial' | 'final',
): void {
  if (!boundary.boundaryId || !boundary.establishedAt || boundary.state !== expected) {
    throw new MigrationProtocolError(
      'AIWG_MIGRATION_BOUNDARY_INVALID',
      `${stage} source boundary must provide a durable ${expected} receipt`,
    );
  }
}

function mutationFor<T>(migrationId: string, record: VersionedRecord<T>, expectedRevision?: string): AtomicMutation<T> {
  return {
    operation: record.tombstone ? 'delete' : 'upsert',
    record,
    idempotencyKey: sha256(`${migrationId}\0${recordKey(record)}`),
    ...(expectedRevision === undefined ? {} : { expectedRevision }),
  };
}

function revisionConflict(identity: string, revision: string): MigrationProtocolError {
  return new MigrationProtocolError(
    'AIWG_MIGRATION_REVISION_CONFLICT',
    `source revision ${revision} has conflicting content for ${identity}`,
  );
}

function compareRevisions(comparator: (left: string, right: string) => number, left: string, right: string): number {
  const result = comparator(left, right);
  if (!Number.isFinite(result)) {
    throw new MigrationProtocolError('AIWG_MIGRATION_REVISION_ORDER_INVALID', 'source-revision comparator returned a non-finite result');
  }
  return Math.sign(result);
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
  const semanticFailures = Object.values(verification.semantic).filter(check => !check.valid).length;
  return `migration parity failed: missing=${verification.missing.length} unexpected=${verification.unexpected.length} corrupt=${verification.corrupt.length} chunks=${verification.chunks.valid ? 'valid' : 'invalid'} semantic=${semanticFailures} lag=${verification.lag}`;
}

function validateSemanticVerification(verification: MigrationSemanticVerification): void {
  for (const dimension of [
    'schema', 'constraints', 'countsByType', 'edgeIntegrity', 'queryParity', 'traversalParity',
  ] as const) {
    const check = verification?.[dimension];
    if (!check || typeof check.valid !== 'boolean' || !Number.isInteger(check.declared) || check.declared < 0 ||
      !Number.isInteger(check.checked) || check.checked < 0 || check.checked !== check.declared || !Array.isArray(check.failures)) {
      throw new MigrationProtocolError(
        'AIWG_MIGRATION_SEMANTIC_VERIFICATION_INVALID',
        `semantic verification is incomplete for ${dimension}`,
      );
    }
    if (check.valid !== (check.failures.length === 0)) {
      throw new MigrationProtocolError(
        'AIWG_MIGRATION_SEMANTIC_VERIFICATION_INVALID',
        `semantic verification validity disagrees with failures for ${dimension}`,
      );
    }
    if (check.evidenceDigest !== undefined && !/^[0-9A-Za-z._:-]+$/.test(check.evidenceDigest)) {
      throw new MigrationProtocolError(
        'AIWG_MIGRATION_SEMANTIC_VERIFICATION_INVALID',
        `semantic verification evidence digest is invalid for ${dimension}`,
      );
    }
    if (['schema', 'constraints', 'queryParity'].includes(dimension) && check.declared < 1) {
      throw new MigrationProtocolError(
        'AIWG_MIGRATION_SEMANTIC_VERIFICATION_INVALID',
        `semantic verification must exercise at least one ${dimension} check`,
      );
    }
    if (dimension === 'countsByType') {
      if (!isCountMap(check.sourceCounts) || !isCountMap(check.destinationCounts)) {
        throw new MigrationProtocolError(
          'AIWG_MIGRATION_SEMANTIC_VERIFICATION_INVALID',
          'countsByType must include non-negative integer source and destination maps',
        );
      }
      const declaredTypes = new Set([...Object.keys(check.sourceCounts), ...Object.keys(check.destinationCounts)]).size;
      if (check.declared !== declaredTypes || (check.valid && stableStringify(check.sourceCounts) !== stableStringify(check.destinationCounts))) {
        throw new MigrationProtocolError(
          'AIWG_MIGRATION_SEMANTIC_VERIFICATION_INVALID',
          'countsByType scope or validity does not match its declared maps',
        );
      }
    }
  }
}

function semanticIsValid(verification: MigrationSemanticVerification): boolean {
  return Object.values(verification).every(check => check.valid);
}

function isCountMap(value: unknown): value is Record<string, number> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) &&
    Object.values(value).every(count => Number.isInteger(count) && count >= 0);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isRetryableError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'retryable' in error && error.retryable === true;
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
