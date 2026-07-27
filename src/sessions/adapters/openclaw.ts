import { z } from 'zod';
import {
  SessionContractError,
  assertSupportedSchemaMajor,
  type AuthorizedScope,
  type ImportCursor,
  type ProviderRecord,
  type SelectedSource,
  type SessionSourceAdapter,
  type SourceDescriptor,
  type SourceProbe,
} from '../contracts.js';
import { readBoundedJsonLines, type BoundedJsonRecord, type ReaderLimits } from '../readers.js';

export const OPENCLAW_ADAPTER_VERSION = '1.0.0';
export const OPENCLAW_SOURCE_SCHEMA_VERSION = '1.0.0';
export const OPENCLAW_NATIVE_SCHEMA_VERSION = '16.0.0';
export const OPENCLAW_EVENT_VERSION = '3.0.0';

export interface OpenClawGatewayTransport {
  snapshot(source: SelectedSource): Promise<unknown[]>;
}

const LineageSchema = z.object({
  kind: z.enum(['reset', 'fork', 'rewind', 'compaction']),
  fromSessionId: z.string().optional(),
  checkpointId: z.string().optional(),
  reason: z.string().optional(),
}).passthrough();

const EventSchema = z.object({
  id: z.string().min(1),
  parentId: z.string().nullable().optional(),
  type: z.string().min(1),
  timestamp: z.union([z.string(), z.number()]).optional(),
  role: z.string().optional(),
  text: z.string().optional(),
  model: z.record(z.unknown()).optional(),
  tool: z.record(z.unknown()).optional(),
  media: z.record(z.unknown()).optional(),
  usage: z.record(z.unknown()).optional(),
  lineage: LineageSchema.optional(),
  opaque: z.unknown().optional(),
  idempotencyKey: z.string().optional(),
}).passthrough();

const SessionSchema = z.object({
  id: z.string().min(1),
  sessionKey: z.string().min(1),
  conversationId: z.string().optional(),
  agentId: z.string().optional(),
  identityKey: z.string().optional(),
  stateVersion: z.number().int().nonnegative().optional(),
  startedAt: z.union([z.string(), z.number()]).optional(),
  updatedAt: z.union([z.string(), z.number()]).optional(),
  archivedAt: z.union([z.string(), z.number()]).nullable().optional(),
  recovered: z.boolean().optional(),
  active: z.boolean().optional(),
  window: z.object({
    firstSequence: z.number().int().nonnegative().optional(),
    lastSequence: z.number().int().nonnegative().optional(),
    historyGap: z.boolean().optional(),
  }).passthrough().optional(),
  events: z.array(EventSchema),
}).passthrough();

const SnapshotSchema = z.object({
  schemaVersion: z.union([z.string(), z.number()]),
  eventVersion: z.union([z.string(), z.number()]),
  snapshotConsistency: z.enum(['sqlite-backup']).optional(),
  gateway: z.object({
    mode: z.enum(['local', 'remote']).optional(),
    hostId: z.string().optional(),
    expectedHostId: z.string().optional(),
  }).passthrough().optional(),
  incognito: z.boolean().optional(),
  projection: z.object({
    kind: z.enum(['canonical', 'bounded-history', 'html', 'trajectory']),
    complete: z.boolean(),
    omittedBefore: z.union([z.string(), z.number()]).optional(),
    limitation: z.string().optional(),
  }).passthrough().optional(),
  sessions: z.array(SessionSchema),
  providerDeletedAt: z.union([z.string(), z.number()]).nullable().optional(),
}).passthrough();

type OpenClawSnapshot = z.infer<typeof SnapshotSchema>;
type OpenClawSession = z.infer<typeof SessionSchema>;
type OpenClawEvent = z.infer<typeof EventSchema>;

export class OpenClawSessionAdapter implements SessionSourceAdapter {
  readonly provider = 'openclaw' as const;
  readonly adapterVersion = OPENCLAW_ADAPTER_VERSION;
  readonly disposition = 'implemented' as const;
  readonly supportedOperations = ['inspect', 'stream'] as const;
  readonly acquisitionModes = ['api', 'sqlite-snapshot', 'jsonl'] as const;

  constructor(
    private readonly limits?: Partial<ReaderLimits>,
    private readonly gateway?: OpenClawGatewayTransport,
  ) {}

  async *discover(_scope: AuthorizedScope): AsyncIterable<SourceDescriptor> {
    // Gateway and consistent snapshots require explicit operator selection.
  }

  async inspect(source: SelectedSource): Promise<SourceProbe> {
    const parsed = await this.readSource(source, true);
    return {
      sourceSchemaVersion: parsed.schemaVersion,
      consistency: parsed.consistency,
      operationalState: parsed.operationalState,
    };
  }

  async *stream(source: SelectedSource, cursor?: ImportCursor): AsyncIterable<ProviderRecord> {
    const parsed = await this.readSource(source, false);
    const start = parseCursor(cursor?.value);
    for (const record of parsed.records.slice(start)) yield record;
  }

  private async readSource(source: SelectedSource, inspection: boolean): Promise<{
    schemaVersion: string;
    consistency: 'provisional' | 'complete' | 'consistent-snapshot';
    operationalState: 'available' | 'inaccessible' | 'degraded';
    records: ProviderRecord[];
  }> {
    if (source.locatorClass === 'openclaw-state-db') {
      throw new SessionContractError(
        'UNSUPPORTED_OPERATION',
        'raw OpenClaw SQLite access is unsafe; use Gateway acquisition or a verified sqlite3.backup() projection',
      );
    }
    let input: BoundedJsonRecord[];
    if (source.locatorClass === 'openclaw-gateway-api') {
      if (source.authorizedScope.networkOperation !== 'openclaw.gateway.sessions.read') {
        throw new SessionContractError(
          'OPERATION_NOT_AUTHORIZED',
          'OpenClaw Gateway reads require explicit openclaw.gateway.sessions.read authorization',
        );
      }
      if (!this.gateway) {
        throw new SessionContractError('UNSUPPORTED_OPERATION', 'OpenClaw Gateway capability was not negotiated');
      }
      input = (await this.gateway.snapshot(source)).map(toRecord);
    } else if (SOURCE_CLASSES.has(source.locatorClass)) {
      const result = await readBoundedJsonLines({
        selectedPath: source.locator,
        allowedRoots: source.authorizedScope.allowedRoots,
      }, {
        consistency: source.locatorClass === 'openclaw-consistent-snapshot-jsonl'
          ? 'complete' : 'provisional',
        limits: this.limits,
      });
      if (result.incompleteTail && source.locatorClass === 'openclaw-consistent-snapshot-jsonl') {
        throw new SessionContractError('TRUNCATED_SOURCE', 'OpenClaw consistent snapshot is truncated');
      }
      input = result.records;
    } else {
      throw new SessionContractError('UNSUPPORTED_OPERATION', 'unsupported OpenClaw source class');
    }
    if (input.length === 0) throw new SessionContractError('MALFORMED_SOURCE', 'OpenClaw source is empty');
    const parsed = input.map(({ value, ...line }) => {
      const result = SnapshotSchema.safeParse(value);
      if (!result.success) throw new SessionContractError('MALFORMED_SOURCE', 'OpenClaw snapshot is malformed');
      return { value: result.data, ...line };
    });
    const nativeSchemas = new Set(parsed.map(({ value }) => nativeVersion(value.schemaVersion)));
    const eventSchemas = new Set(parsed.map(({ value }) => nativeVersion(value.eventVersion)));
    if (nativeSchemas.size !== 1 || eventSchemas.size !== 1) {
      throw new SessionContractError('SCHEMA_DRIFT', 'mixed OpenClaw snapshot schemas');
    }
    assertSupportedSchemaMajor([...nativeSchemas][0], 16);
    assertSupportedSchemaMajor([...eventSchemas][0], 3);
    if (source.locatorClass === 'openclaw-consistent-snapshot-jsonl'
      && parsed.some(({ value }) => value.snapshotConsistency !== 'sqlite-backup')) {
      throw new SessionContractError(
        'SCHEMA_DRIFT',
        'OpenClaw snapshot lacks sqlite3.backup() consistency evidence',
      );
    }
    const incognito = parsed.some(({ value }) => value.incognito);
    const remoteMismatch = parsed.some(({ value }) => value.gateway?.mode === 'remote'
      && value.gateway.hostId !== value.gateway.expectedHostId);
    if (!inspection && incognito) {
      throw new SessionContractError(
        'OPERATION_NOT_AUTHORIZED',
        'OpenClaw incognito session capture is unavailable by provider policy',
      );
    }
    if (!inspection && remoteMismatch) {
      throw new SessionContractError(
        'SOURCE_NOT_AUTHORIZED',
        'OpenClaw remote Gateway identity does not match the authorized host',
      );
    }
    const projectionIncomplete = parsed.some(({ value }) =>
      value.projection && (value.projection.kind !== 'canonical' || !value.projection.complete));
    return {
      schemaVersion: OPENCLAW_SOURCE_SCHEMA_VERSION,
      consistency: source.locatorClass === 'openclaw-consistent-snapshot-jsonl'
        ? 'consistent-snapshot'
        : parsed.every(({ value }) => value.sessions.every(sessionComplete)) && !projectionIncomplete
          ? 'complete' : 'provisional',
      operationalState: incognito ? 'inaccessible' : remoteMismatch || projectionIncomplete ? 'degraded' : 'available',
      records: incognito || remoteMismatch
        ? []
        : parsed.flatMap(({ value, ...line }) => normalizeSnapshot(value, line, source.locatorClass)),
    };
  }
}

function normalizeSnapshot(
  snapshot: OpenClawSnapshot,
  line: Omit<BoundedJsonRecord, 'value'>,
  locatorClass: string,
): ProviderRecord[] {
  return snapshot.sessions.flatMap((session, sessionIndex) => {
    const common = sessionExtensions(snapshot, session, locatorClass);
    const base = line.sequence * 10_000_000 + sessionIndex * 100_000;
    const header: ProviderRecord = {
      nativeSessionId: session.id,
      nativeEventId: `session:${session.id}`,
      sequence: base,
      kind: 'openclaw.session',
      role: 'system',
      occurredAt: timestamp(session.startedAt),
      text: '',
      rawReference: { locatorClass, offset: line.byteOffset },
      extensions: common,
    };
    return [
      header,
      ...session.events.map((event, eventIndex) =>
        normalizeEvent(session.id, event, base + eventIndex + 1, locatorClass, line, common)),
    ];
  });
}

function normalizeEvent(
  sessionId: string,
  event: OpenClawEvent,
  sequence: number,
  locatorClass: string,
  line: Omit<BoundedJsonRecord, 'value'>,
  common: Record<string, unknown>,
): ProviderRecord {
  return {
    nativeSessionId: sessionId,
    nativeEventId: event.id,
    sequence,
    kind: eventKind(event),
    role: event.role,
    occurredAt: timestamp(event.timestamp),
    text: event.text ?? toolText(event.tool),
    rawReference: { locatorClass, offset: line.byteOffset },
    extensions: {
      ...common,
      eventTree: { parentId: event.parentId },
      model: event.model,
      tool: event.tool,
      media: event.media,
      usage: event.usage,
      lineageEvent: event.lineage,
      idempotencyKey: event.idempotencyKey,
      opaqueEventJson: event.opaque,
      unknownFields: unknownFields(event, EVENT_KEYS),
    },
  };
}

function sessionExtensions(
  snapshot: OpenClawSnapshot,
  session: OpenClawSession,
  locatorClass: string,
): Record<string, unknown> {
  const projection = snapshot.projection ?? { kind: 'canonical', complete: true };
  return {
    lifecycle: snapshot.providerDeletedAt
      ? 'deleted'
      : session.archivedAt ? 'archived' : sessionComplete(session) ? 'complete' : 'active',
    workspace: {
      agentId: session.agentId,
      conversationId: session.conversationId,
    },
    identity: {
      sessionKey: session.sessionKey,
      identityKey: session.identityKey,
      stateVersion: session.stateVersion,
    },
    window: session.window,
    recovered: session.recovered,
    projection: {
      kind: projection.kind,
      complete: projection.complete,
      lossless: projection.kind === 'canonical' && projection.complete,
      omittedBefore: timestamp(projection.omittedBefore),
      limitation: projection.limitation,
    },
    provenance: {
      acquisition: locatorClass,
      nativeSchema: nativeVersion(snapshot.schemaVersion),
      eventSchema: nativeVersion(snapshot.eventVersion),
      snapshotConsistency: snapshot.snapshotConsistency,
      gateway: snapshot.gateway,
    },
    deletion: {
      providerDeletedAt: timestamp(snapshot.providerDeletedAt),
      aiwgDeletionDoesNotDeleteGatewayData: true,
      resetPreservesHistoricalTranscript: true,
    },
    sessionUnknownFields: unknownFields(session, SESSION_KEYS),
    snapshotUnknownFields: unknownFields(snapshot, SNAPSHOT_KEYS),
  };
}

function eventKind(event: OpenClawEvent): string {
  if (event.lineage) return `lineage.${event.lineage.kind}`;
  if (event.tool) {
    const status = String(event.tool.status ?? '');
    return ['completed', 'error', 'failed'].includes(status) ? 'tool-result' : 'tool-call';
  }
  if (event.media) return 'media';
  if (event.type === 'message') return 'message';
  return `openclaw.${event.type}`;
}

function toolText(tool?: Record<string, unknown>): string {
  if (!tool) return '';
  if (typeof tool.output === 'string') return tool.output;
  return typeof tool.name === 'string' ? tool.name : '';
}

function sessionComplete(session: OpenClawSession): boolean {
  return session.active === false || Boolean(session.archivedAt);
}

function nativeVersion(value: string | number): string {
  if (typeof value === 'number') return `${value}.0.0`;
  return /^\d+$/.test(value) ? `${value}.0.0` : value;
}

function timestamp(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }
  if (typeof value !== 'number') return undefined;
  const date = new Date(value < 10_000_000_000 ? value * 1_000 : value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function unknownFields(value: Record<string, unknown>, keys: ReadonlySet<string>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => !keys.has(key)).sort(([a], [b]) => a.localeCompare(b)),
  );
}

function parseCursor(value?: string): number {
  if (!value) return 0;
  if (!/^\d+$/.test(value)) throw new SessionContractError('SCHEMA_DRIFT', 'invalid OpenClaw cursor');
  return Number(value);
}

function toRecord(value: unknown, sequence: number): BoundedJsonRecord {
  return { value, sequence, byteOffset: sequence, byteLength: Buffer.byteLength(JSON.stringify(value)) };
}

const SOURCE_CLASSES = new Set([
  'openclaw-consistent-snapshot-jsonl',
  'openclaw-bounded-history-jsonl',
  'openclaw-html-projection-jsonl',
  'openclaw-trajectory-jsonl',
]);
const EVENT_KEYS = new Set([
  'id', 'parentId', 'type', 'timestamp', 'role', 'text', 'model', 'tool', 'media',
  'usage', 'lineage', 'opaque', 'idempotencyKey',
]);
const SESSION_KEYS = new Set([
  'id', 'sessionKey', 'conversationId', 'agentId', 'identityKey', 'stateVersion',
  'startedAt', 'updatedAt', 'archivedAt', 'recovered', 'active', 'window', 'events',
]);
const SNAPSHOT_KEYS = new Set([
  'schemaVersion', 'eventVersion', 'snapshotConsistency', 'gateway', 'incognito',
  'projection', 'sessions', 'providerDeletedAt',
]);
