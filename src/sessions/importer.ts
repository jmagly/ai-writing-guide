import {
  SESSION_CONTRACT_VERSION, SessionEventSchema, SessionSchema,
  assertSupportedSchemaMajor, sha256, stableEventId, stableSessionId,
  SessionContractError,
  type ImportCheckpoint, type ImportRun, type ProviderRecord,
  type SelectedSource, type Session, type SessionEvent, type SessionSource,
  type SessionSourceAdapter,
} from './contracts.js';
import { redactSessionText, sanitizeNativeExtensions } from './policy.js';
import type { ImportReceipt } from './repository.js';
import type { SessionRepositoryPort } from './ports.js';
import { fingerprintSourcePrefix } from './readers.js';
import {
  classifySessionEventOrigin,
  deriveSessionIntent,
} from './origin.js';

export interface ImportLimits {
  maxRecords: number;
  maxRecordBytes: number;
  maxTotalBytes: number;
  batchSize: number;
}
export interface ImportRequest {
  source: SessionSource;
  selectedSource: SelectedSource;
  adapter: SessionSourceAdapter;
  workspaceId: string;
  policyVersion: string;
  limits?: Partial<ImportLimits>;
  batchRunId?: string;
  publish?: boolean;
  signal?: AbortSignal;
  inactivityThresholdMs?: number;
}

const DEFAULT_LIMITS: ImportLimits = {
  maxRecords: 1_000_000,
  maxRecordBytes: 8 * 1024 * 1024,
  maxTotalBytes: 1024 * 1024 * 1024,
  batchSize: 1_000,
};

export interface SessionImportFailureReceipt {
  contractVersion: '1.0.0';
  outcome: 'terminal-failure';
  sourceId: string;
  sourceGeneration: string;
  consistency: SessionSource['consistency'];
  committedPrefix: {
    batches: number;
    records: number;
    events: number;
  };
  resumableCheckpoint: ImportCheckpoint;
  errorCode: string;
}

export class SessionImportFailure extends SessionContractError {
  constructor(
    public readonly failureReceipt: SessionImportFailureReceipt,
    cause: unknown,
  ) {
    super(
      cause instanceof SessionContractError ? cause.code : 'IMPORT_INTERRUPTED',
      cause instanceof Error ? cause.message : 'session import failed',
    );
    this.name = 'SessionImportFailure';
  }
}

export class IncrementalSessionImporter {
  constructor(private readonly repository: SessionRepositoryPort) {}

  async import(request: ImportRequest): Promise<ImportReceipt[]> {
    assertSupportedSchemaMajor(request.source.sourceSchemaVersion);
    if (request.inactivityThresholdMs !== undefined
      && (!Number.isFinite(request.inactivityThresholdMs) || request.inactivityThresholdMs < 0)) {
      throw new SessionContractError(
        'INVALID_ARGUMENT',
        'session inactivity threshold must be a non-negative duration',
      );
    }
    if (request.workspaceId !== request.selectedSource.authorizedScope.workspaceId) {
      throw new SessionContractError(
        'SOURCE_NOT_AUTHORIZED',
        'session import workspace is outside the authorized source scope',
      );
    }
    const limits = { ...DEFAULT_LIMITS, ...request.limits };
    const previous = request.batchRunId
      ? this.repository.getBatchCheckpoint(
          request.source.sourceId,
          request.adapter.adapterVersion,
          request.batchRunId,
        ) ?? this.repository.getCheckpoint(
          request.source.sourceId,
          request.adapter.adapterVersion,
        )
      : this.repository.getCheckpoint(
          request.source.sourceId,
          request.adapter.adapterVersion,
        );
    const continuity = await sourceContinuity(request, previous);
    const sourceGeneration = continuity?.sourceGeneration ?? sourceGenerationDigest(request);
    if (previous?.sourceGeneration && previous.sourceGeneration !== sourceGeneration) {
      throw new SessionContractError(
        'SCHEMA_DRIFT',
        'session source generation changed; explicit restart or migration is required',
      );
    }
    if (previous?.adapterVersion && previous.adapterVersion !== request.adapter.adapterVersion) {
      throw new SessionContractError(
        'SCHEMA_DRIFT',
        'session checkpoint adapter version changed; checkpoint migration is required',
      );
    }
    if (previous?.sourceSchemaVersion
      && previous.sourceSchemaVersion !== request.source.sourceSchemaVersion) {
      throw new SessionContractError(
        'SCHEMA_DRIFT',
        'session checkpoint source schema changed; checkpoint migration is required',
      );
    }
    if (previous?.policyVersion && previous.policyVersion !== request.policyVersion) {
      throw new SessionContractError(
        'SCHEMA_DRIFT',
        'session checkpoint policy version changed; checkpoint migration is required',
      );
    }
    const checkpoint: ImportCheckpoint = {
      cursor: previous?.cursor ?? '',
      recordsRead: previous?.recordsRead ?? 0,
      bytesRead: previous?.bytesRead ?? 0,
      checkpointVersion: '2',
      positionKind: previous?.positionKind ?? 'record-index',
      sourceGeneration,
      locatorClass: request.selectedSource.locatorClass,
      adapterVersion: request.adapter.adapterVersion,
      sourceSchemaVersion: request.source.sourceSchemaVersion,
      policyVersion: request.policyVersion,
      continuity: continuity
        ? (!previous || previous.positionKind === 'byte-offset'
            ? continuity.outcome
            : 'unverified')
        : (previous ? 'unverified' : 'new-generation'),
      sourceSize: continuity?.size,
      sourceMtimeMs: continuity?.mtimeMs,
      sourceFileIdentity: continuity?.fileIdentity,
      prefixDigest: continuity?.prefixDigest,
    };
    const receipts: ImportReceipt[] = [];
    let batch: ProviderRecord[] = [];
    let batchStart = checkpoint.recordsRead;
    let durableCheckpoint = { ...checkpoint };
    const importStarted = performance.now();
    let peakHeap = process.memoryUsage().heapUsed;
    let peakRss = process.memoryUsage().rss;

    const flush = (): void => {
      if (batch.length === 0) return;
      if (request.signal?.aborted) {
        throw new SessionContractError(
          'IMPORT_INTERRUPTED',
          'session import was cancelled at a durable batch boundary',
        );
      }
      const runId = sha256([
        request.source.sourceId, request.adapter.adapterVersion,
        batchStart, checkpoint.recordsRead,
        ...batch.map((record) => sha256(JSON.stringify(record))),
      ].join('\0'));
      const normalized = normalizeBatch(request, batch, runId);
      const run: ImportRun = {
        contractVersion: SESSION_CONTRACT_VERSION,
        importRunId: runId,
        sourceId: request.source.sourceId,
        parserVersion: request.adapter.adapterVersion,
        policyVersion: request.policyVersion,
        sourceSchemaVersion: request.source.sourceSchemaVersion,
        consistency: request.source.consistency,
        status: 'running',
        checkpoint: { ...checkpoint },
        startedAt: new Date().toISOString(),
        completedAt: null,
        errorCode: null,
      };
      const flushStarted = performance.now();
      const sanitizedSource = {
        ...request.source,
        extensions: sanitizeNativeExtensions(request.source.extensions).value,
      };
      const receipt = this.repository.applyImport({
        source: sanitizedSource, run,
        sessions: normalized.sessions, events: normalized.events,
        batchRunId: request.batchRunId,
      }, { ...checkpoint }, request.publish ?? request.source.consistency !== 'complete');
      const memory = process.memoryUsage();
      peakHeap = Math.max(peakHeap, memory.heapUsed);
      peakRss = Math.max(peakRss, memory.rss);
      receipt.metrics = {
        records: batch.length,
        normalizedEvents: normalized.events.length,
        normalizedBytes: batch.reduce(
          (total, record) => total + Buffer.byteLength(JSON.stringify(record)),
          0,
        ),
        durationMs: performance.now() - importStarted,
        batchLatencyMs: performance.now() - flushStarted,
        heapUsedBytes: peakHeap,
        rssBytes: peakRss,
        checkpointDurable: true,
      };
      receipts.push(receipt);
      durableCheckpoint = { ...checkpoint };
      batch = [];
      batchStart = checkpoint.recordsRead;
    };

    try {
      for await (const record of request.adapter.stream(
        request.selectedSource,
        previous ? { value: previous.cursor } : undefined,
      )) {
        if (request.signal?.aborted) {
          throw new SessionContractError(
            'IMPORT_INTERRUPTED',
            'session import was cancelled and can resume from its durable checkpoint',
          );
        }
        const bytes = Buffer.byteLength(JSON.stringify(record));
        if (bytes > limits.maxRecordBytes
          || checkpoint.bytesRead + bytes > limits.maxTotalBytes
          || checkpoint.recordsRead + 1 > limits.maxRecords) {
          throw new SessionContractError('RESOURCE_LIMIT_EXCEEDED', 'session import exceeded an authorized resource limit');
        }
        batch.push(record);
        checkpoint.recordsRead += 1;
        if (record.sourceCursor?.startsWith('byte:')) {
          checkpoint.positionKind = 'byte-offset';
          checkpoint.cursor = record.sourceCursor;
          checkpoint.bytesRead = Number(record.sourceCursor.slice(5));
        } else {
          checkpoint.bytesRead += bytes;
          checkpoint.cursor = String(checkpoint.recordsRead);
        }
        if (batch.length >= limits.batchSize) flush();
      }
      flush();
    } catch (error) {
      const published = request.publish ?? request.source.consistency !== 'complete';
      const committed = published ? receipts : [];
      throw new SessionImportFailure({
        contractVersion: '1.0.0',
        outcome: 'terminal-failure',
        sourceId: request.source.sourceId,
        sourceGeneration,
        consistency: request.source.consistency,
        committedPrefix: {
          batches: committed.length,
          records: committed.reduce(
            (total, receipt) => total + (receipt.metrics?.records ?? 0),
            0,
          ),
          events: committed.reduce((total, receipt) => total + receipt.eventsInserted, 0),
        },
        resumableCheckpoint: !published
          ? {
              ...durableCheckpoint,
              cursor: '',
              recordsRead: 0,
              bytesRead: 0,
              continuity: 'new-generation',
            }
          : durableCheckpoint,
        errorCode: error instanceof SessionContractError
          ? error.code : 'IMPORT_INTERRUPTED',
      }, error);
    }
    if (request.publish !== false && request.source.consistency === 'complete') {
      this.repository.commitStagedImports(request.source.sourceId, request.adapter.adapterVersion);
      for (const receipt of receipts) {
        if (receipt.outcome === 'staged') receipt.outcome = 'committed';
      }
    }
    return receipts;
  }
}

function normalizeBatch(
  request: ImportRequest,
  records: ProviderRecord[],
  importRunId: string,
): { sessions: Session[]; events: SessionEvent[] } {
  const sessions = new Map<string, Session>();
  const events = records.map((record): SessionEvent => {
    const sessionId = stableSessionId(request.source.provider, request.source.sourceId, record.nativeSessionId);
    const redacted = redactSessionText(record.text);
    const native = sanitizeNativeExtensions(record.extensions ?? {});
    const digest = sha256(JSON.stringify(record));
    const origin = classifySessionEventOrigin(request.source.provider, record);
    const lifecycle = sessionLifecycle(request, record);
    const lifecycleEvidence = sessionLifecycleEvidence(request, record);
    const extensions = {
      [`native.${request.source.provider}`]: native.value,
    };
    const event = SessionEventSchema.parse({
      contractVersion: SESSION_CONTRACT_VERSION,
      eventId: stableEventId(request.source.provider, request.source.sourceId, record, digest),
      sessionId, sourceId: request.source.sourceId, importRunId,
      nativeId: record.nativeEventId ?? null, sequence: record.sequence,
      kind: record.kind, role: record.role ?? null, occurredAt: record.occurredAt ?? null,
      activityBoundary: record.activityBoundary ?? null,
      activityBoundaryBasis: record.activityBoundaryBasis ?? null,
      activityBoundaryConfidence: record.activityBoundaryConfidence ?? null,
      origin: origin.origin,
      originRule: origin.rule,
      originClassifierVersion: origin.classifierVersion,
      participant: record.participant ?? null,
      toolName: record.toolName ?? null,
      toolCallId: record.toolCallId ?? null,
      model: record.model ?? null,
      entities: record.entities ?? [],
      extractionState: record.extractionState ?? null,
      searchableText: redacted.text, digest, rawReference: record.rawReference,
      adapterVersion: request.adapter.adapterVersion,
      consistency: request.source.consistency,
      sensitivity: {
        classification:
          redacted.sensitivity === 'sensitive' || native.sensitivity === 'sensitive'
            ? 'sensitive' : 'none',
        classes: [...new Set([...redacted.classes, ...native.classes])].sort(),
      },
      opaque: !KNOWN_EVENT_KINDS.has(record.kind),
      extensions,
    });
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, SessionSchema.parse({
        contractVersion: SESSION_CONTRACT_VERSION,
        sessionId, sourceId: request.source.sourceId, provider: request.source.provider,
        nativeSessionId: record.nativeSessionId, workspaceId: request.workspaceId,
        startedAt: record.occurredAt ?? null, updatedAt: record.occurredAt ?? null,
        consistency: request.source.consistency,
        lifecycle,
        sourceDigest: sha256(`${sourceGenerationDigest(request)}\0${record.nativeSessionId}`),
        extensions: {
          [`native.${request.source.provider}`]: {
            lifecycleEvidence,
          },
        },
      }));
    } else {
      const session = sessions.get(sessionId)!;
      session.startedAt = earlierTimestamp(session.startedAt, record.occurredAt ?? null);
      session.updatedAt = laterTimestamp(session.updatedAt, record.occurredAt ?? null);
      session.consistency = strongerConsistency(session.consistency, request.source.consistency);
      const nativeKey = `native.${request.source.provider}`;
      const nativeEnvelope = session.extensions[nativeKey];
      const nativeRecord = nativeEnvelope && typeof nativeEnvelope === 'object' && !Array.isArray(nativeEnvelope)
        ? nativeEnvelope as Record<string, unknown>
        : {};
      const selected = selectLifecycleTransition(
        session.lifecycle,
        nativeRecord.lifecycleEvidence,
        lifecycle,
        lifecycleEvidence,
      );
      session.lifecycle = selected.lifecycle;
      session.extensions[nativeKey] = {
        ...nativeRecord,
        lifecycleEvidence: selected.evidence,
      };
    }
    return event;
  });
  for (const session of sessions.values()) {
    session.intent = deriveSessionIntent(
      events.filter((event) => event.sessionId === session.sessionId),
    );
  }
  return { sessions: [...sessions.values()], events };
}

const KNOWN_EVENT_KINDS = new Set(['message', 'tool-call', 'tool-result', 'artifact', 'attachment', 'summary']);

function earlierTimestamp(left: string | null, right: string | null): string | null {
  if (!left) return right;
  if (!right) return left;
  return Date.parse(left) <= Date.parse(right) ? left : right;
}

function laterTimestamp(left: string | null, right: string | null): string | null {
  if (!left) return right;
  if (!right) return left;
  return Date.parse(left) >= Date.parse(right) ? left : right;
}

function strongerConsistency(
  left: Session['consistency'],
  right: Session['consistency'],
): Session['consistency'] {
  const rank: Record<Session['consistency'], number> = {
    provisional: 0,
    'consistent-snapshot': 1,
    complete: 2,
  };
  return rank[left] >= rank[right] ? left : right;
}

function sessionLifecycle(
  request: ImportRequest,
  record: ProviderRecord,
): Session['lifecycle'] {
  const explicit = nativeLifecycle(record.extensions);
  if (explicit) return explicit;
  if (request.source.consistency === 'complete') return 'complete';
  if (record.occurredAt && isStaleHistoricalTimestamp(
    record.occurredAt,
    inactivityThresholdMs(request),
  )) return 'inactive';
  return 'active';
}

function sessionLifecycleEvidence(
  request: ImportRequest,
  record: ProviderRecord,
): Record<string, unknown> {
  const explicit = nativeLifecycle(record.extensions);
  if (explicit) {
    return {
      basis: 'provider-explicit-event',
      state: explicit,
      observedAt: record.occurredAt ?? new Date().toISOString(),
      confidence: 'high',
    };
  }
  if (request.source.consistency === 'complete') {
    return {
      basis: 'complete-source',
      state: 'complete',
      observedAt: record.occurredAt ?? new Date().toISOString(),
      confidence: 'high',
    };
  }
  const thresholdMs = inactivityThresholdMs(request);
  if (record.occurredAt && isStaleHistoricalTimestamp(record.occurredAt, thresholdMs)) {
    return {
      basis: 'inactivity-threshold',
      state: 'inactive',
      observedAt: record.occurredAt,
      confidence: 'medium',
      thresholdMs,
    };
  }
  return {
    basis: 'open-provisional-source',
    state: 'active',
    observedAt: record.occurredAt ?? new Date().toISOString(),
    confidence: 'provisional',
  };
}

function nativeLifecycle(extensions?: Record<string, unknown>): Session['lifecycle'] | null {
  const raw = typeof extensions?.lifecycle === 'string' ? extensions.lifecycle : undefined;
  if (!raw) return null;
  const normalized: Record<string, Session['lifecycle']> = {
    active: 'active',
    inactive: 'inactive',
    paused: 'paused',
    complete: 'complete',
    completed: 'complete',
    archived: 'archived',
    deleted: 'tombstoned',
    cancelled: 'interrupted',
    canceled: 'interrupted',
    failed: 'interrupted',
    interrupted: 'interrupted',
    unknown: 'unknown',
    'unknown-at-import': 'unknown',
    'completed-at-import': 'complete',
  };
  return normalized[raw] ?? null;
}

function selectLifecycleTransition(
  leftLifecycle: Session['lifecycle'],
  left: unknown,
  rightLifecycle: Session['lifecycle'],
  right: Record<string, unknown>,
): { lifecycle: Session['lifecycle']; evidence: Record<string, unknown> } {
  const leftEvidence = asLifecycleEvidence(left);
  if (leftLifecycle === 'tombstoned') {
    return { lifecycle: leftLifecycle, evidence: leftEvidence ?? right };
  }
  if (!leftEvidence) return { lifecycle: rightLifecycle, evidence: right };
  const rank: Record<string, number> = {
    'open-provisional-source': 1,
    'inactivity-threshold': 1,
    'complete-source': 2,
    'provider-explicit-event': 3,
  };
  const leftRank = rank[String(leftEvidence.basis)] ?? 0;
  const rightRank = rank[String(right.basis)] ?? 0;
  const rightIsNewer = evidenceTimestamp(right) > evidenceTimestamp(leftEvidence);
  return rightRank > leftRank || (rightRank === leftRank && rightIsNewer)
    ? { lifecycle: rightLifecycle, evidence: right }
    : { lifecycle: leftLifecycle, evidence: leftEvidence };
}

function asLifecycleEvidence(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function evidenceTimestamp(value: Record<string, unknown>): number {
  const parsed = Date.parse(String(value.observedAt ?? ''));
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

const DEFAULT_INACTIVITY_THRESHOLD_MS = 24 * 60 * 60 * 1000;

function inactivityThresholdMs(request: ImportRequest): number {
  return request.inactivityThresholdMs ?? DEFAULT_INACTIVITY_THRESHOLD_MS;
}

function isStaleHistoricalTimestamp(value: string, thresholdMs: number): boolean {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp)
    && Date.now() - timestamp > thresholdMs;
}

function sourceGenerationDigest(request: ImportRequest): string {
  return sha256([
    request.source.sourceId,
    request.source.provider,
    request.selectedSource.locatorClass,
    request.source.sourceSchemaVersion,
    request.adapter.adapterVersion,
  ].join('\0'));
}

async function sourceContinuity(
  request: ImportRequest,
  previous: ImportCheckpoint | null,
): Promise<{
  sourceGeneration: string;
  outcome: 'new-generation' | 'validated-append' | 'unchanged-replay';
  size: number;
  mtimeMs: number;
  fileIdentity: string;
  prefixDigest: `sha256:${string}`;
} | null> {
  if (request.selectedSource.authorizedScope.allowedRoots.length === 0
    || /^[a-z][a-z0-9+.-]*:\/\//i.test(request.selectedSource.locator)
    || request.selectedSource.locator.startsWith('<')) {
    return null;
  }
  const authorization = {
    selectedPath: request.selectedSource.locator,
    allowedRoots: request.selectedSource.authorizedScope.allowedRoots,
  };
  const metadata = await fingerprintSourcePrefix(authorization, 0);
  if (previous?.sourceSize !== undefined) {
    if (metadata.size < previous.sourceSize) {
      throw new SessionContractError(
        'SCHEMA_DRIFT',
        'session source was truncated before its durable checkpoint',
      );
    }
    if (previous.sourceFileIdentity
      && previous.sourceFileIdentity !== metadata.fileIdentity) {
      throw new SessionContractError(
        'SCHEMA_DRIFT',
        'session source file generation was replaced or rotated',
      );
    }
    const priorPrefix = await fingerprintSourcePrefix(authorization, previous.sourceSize);
    if (previous.prefixDigest && priorPrefix.digest !== previous.prefixDigest) {
      throw new SessionContractError(
        'SCHEMA_DRIFT',
        'session source prefix was rewritten before its durable checkpoint',
      );
    }
  }
  const current = await fingerprintSourcePrefix(authorization, metadata.size);
  const generation = previous?.sourceGeneration ?? sha256([
    sourceGenerationDigest(request),
    metadata.fileIdentity,
  ].join('\0'));
  return {
    sourceGeneration: generation,
    outcome: !previous
      ? 'new-generation'
      : metadata.size === previous.sourceSize
        && current.digest === previous.prefixDigest
        ? 'unchanged-replay' : 'validated-append',
    size: metadata.size,
    mtimeMs: metadata.mtimeMs,
    fileIdentity: metadata.fileIdentity,
    prefixDigest: current.digest as `sha256:${string}`,
  };
}
