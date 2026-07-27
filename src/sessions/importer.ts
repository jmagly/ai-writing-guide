import {
  SESSION_CONTRACT_VERSION, SessionEventSchema, SessionSchema,
  assertSupportedSchemaMajor, sha256, stableEventId, stableSessionId,
  SessionContractError,
  type ImportCheckpoint, type ImportRun, type ProviderRecord,
  type SelectedSource, type Session, type SessionEvent, type SessionSource,
  type SessionSourceAdapter,
} from './contracts.js';
import { redactSessionText } from './policy.js';
import type { ImportReceipt } from './repository.js';
import type { SessionRepositoryPort } from './ports.js';

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
}

const DEFAULT_LIMITS: ImportLimits = {
  maxRecords: 1_000_000,
  maxRecordBytes: 4 * 1024 * 1024,
  maxTotalBytes: 1024 * 1024 * 1024,
  batchSize: 1_000,
};

export class IncrementalSessionImporter {
  constructor(private readonly repository: SessionRepositoryPort) {}

  async import(request: ImportRequest): Promise<ImportReceipt[]> {
    assertSupportedSchemaMajor(request.source.sourceSchemaVersion);
    const limits = { ...DEFAULT_LIMITS, ...request.limits };
    const previous = this.repository.getCheckpoint(request.source.sourceId, request.adapter.adapterVersion);
    const checkpoint: ImportCheckpoint = previous ?? { cursor: '', recordsRead: 0, bytesRead: 0 };
    const receipts: ImportReceipt[] = [];
    let batch: ProviderRecord[] = [];
    let batchStart = checkpoint.recordsRead;

    const flush = (): void => {
      if (batch.length === 0) return;
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
      receipts.push(this.repository.applyImport({
        source: request.source, run,
        sessions: normalized.sessions, events: normalized.events,
      }, { ...checkpoint }, request.source.consistency !== 'complete'));
      batch = [];
      batchStart = checkpoint.recordsRead;
    };

    for await (const record of request.adapter.stream(
      request.selectedSource,
      previous ? { value: previous.cursor } : undefined,
    )) {
      const bytes = Buffer.byteLength(JSON.stringify(record));
      if (bytes > limits.maxRecordBytes
        || checkpoint.bytesRead + bytes > limits.maxTotalBytes
        || checkpoint.recordsRead + 1 > limits.maxRecords) {
        throw new SessionContractError('RESOURCE_LIMIT_EXCEEDED', 'session import exceeded an authorized resource limit');
      }
      batch.push(record);
      checkpoint.recordsRead += 1;
      checkpoint.bytesRead += bytes;
      checkpoint.cursor = String(checkpoint.recordsRead);
      if (batch.length >= limits.batchSize) flush();
    }
    flush();
    if (request.source.consistency === 'complete') {
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
    const digest = sha256(JSON.stringify(record));
    const extensions = {
      [`native.${request.source.provider}`]: record.extensions ?? {},
    };
    const event = SessionEventSchema.parse({
      contractVersion: SESSION_CONTRACT_VERSION,
      eventId: stableEventId(request.source.sourceId, record, digest),
      sessionId, sourceId: request.source.sourceId, importRunId,
      nativeId: record.nativeEventId ?? null, sequence: record.sequence,
      kind: record.kind, role: record.role ?? null, occurredAt: record.occurredAt ?? null,
      searchableText: redacted.text, digest, rawReference: record.rawReference,
      adapterVersion: request.adapter.adapterVersion,
      consistency: request.source.consistency,
      sensitivity: { classification: redacted.sensitivity, classes: redacted.classes },
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
        lifecycle: request.source.consistency === 'complete' ? 'complete' : 'active',
        sourceDigest: sha256(`${request.source.sourceId}\0${record.nativeSessionId}`),
        extensions: { [`native.${request.source.provider}`]: {} },
      }));
    }
    return event;
  });
  return { sessions: [...sessions.values()], events };
}

const KNOWN_EVENT_KINDS = new Set(['message', 'tool-call', 'tool-result', 'artifact', 'attachment', 'summary']);
