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

export const OPENHUMAN_ADAPTER_VERSION = '1.0.0';
export const OPENHUMAN_SOURCE_SCHEMA_VERSION = '1.0.0';

const MetadataSchema = z.object({
  provider: z.string().optional(),
  model: z.string().optional(),
  profile: z.string().optional(),
  nestedAgentId: z.string().optional(),
  parentAgentId: z.string().optional(),
}).passthrough();

const AttachmentSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  mime: z.string().optional(),
  uri: z.string().optional(),
  state: z.enum(['present', 'expired']),
  expiredAt: z.union([z.string(), z.number()]).optional(),
}).passthrough();

const RawSchema = z.object({
  schemaVersion: z.union([z.string(), z.number()]),
  recordType: z.literal('session_raw'),
  session_id: z.string().min(1),
  event_id: z.string().min(1),
  thread_id: z.string().min(1),
  request_id: z.string().optional(),
  parent_event_id: z.string().nullable().optional(),
  type: z.string().min(1),
  role: z.string().optional(),
  content: z.unknown().optional(),
  timestamp: z.union([z.string(), z.number()]).optional(),
  metadata: MetadataSchema.optional(),
  input_tokens: z.number().optional(),
  cached_input_tokens: z.number().optional(),
  output_tokens: z.number().optional(),
  charged_amount_usd: z.number().optional(),
  compacted: z.boolean().optional(),
  interrupted: z.boolean().optional(),
  tool: z.record(z.unknown()).optional(),
  attachment: AttachmentSchema.optional(),
  active: z.boolean().optional(),
  raw_transcript_deleted_at: z.union([z.string(), z.number()]).nullable().optional(),
}).passthrough();

const ThreadStateSchema = z.object({
  schemaVersion: z.union([z.string(), z.number()]),
  recordType: z.literal('thread_state'),
  thread_id: z.string().min(1),
  title: z.string().optional(),
  state: z.string().optional(),
  deleted_at: z.union([z.string(), z.number()]).nullable().optional(),
}).passthrough();

const TurnStateSchema = z.object({
  schemaVersion: z.union([z.string(), z.number()]),
  recordType: z.literal('turn_state'),
  thread_id: z.string().min(1),
  request_id: z.string().min(1),
  state: z.string().min(1),
  interrupted: z.boolean().optional(),
  completed_at: z.union([z.string(), z.number()]).nullable().optional(),
}).passthrough();

const RecordSchema = z.discriminatedUnion('recordType', [
  RawSchema, ThreadStateSchema, TurnStateSchema,
]);

type RawRecord = z.infer<typeof RawSchema>;
type ThreadState = z.infer<typeof ThreadStateSchema>;
type TurnState = z.infer<typeof TurnStateSchema>;

export class OpenHumanSessionAdapter implements SessionSourceAdapter {
  readonly provider = 'openhuman' as const;
  readonly adapterVersion = OPENHUMAN_ADAPTER_VERSION;
  readonly disposition = 'implemented' as const;
  readonly supportedOperations = ['inspect', 'stream'] as const;
  readonly acquisitionModes = ['jsonl'] as const;

  constructor(private readonly limits?: Partial<ReaderLimits>) {}

  async *discover(_scope: AuthorizedScope): AsyncIterable<SourceDescriptor> {
    // session_raw and enrichment bundles require explicit selection.
  }

  async inspect(source: SelectedSource): Promise<SourceProbe> {
    const parsed = await this.readSource(source);
    return {
      sourceSchemaVersion: parsed.schemaVersion,
      consistency: parsed.consistency,
      operationalState: 'available',
    };
  }

  async *stream(source: SelectedSource, cursor?: ImportCursor): AsyncIterable<ProviderRecord> {
    const parsed = await this.readSource(source);
    const start = parseCursor(cursor?.value);
    for (const record of parsed.records.slice(start)) yield record;
  }

  private async readSource(source: SelectedSource): Promise<{
    schemaVersion: string;
    consistency: 'provisional' | 'complete';
    records: ProviderRecord[];
  }> {
    if (source.locatorClass !== 'openhuman-session-raw-jsonl'
      && source.locatorClass !== 'openhuman-enriched-jsonl') {
      throw new SessionContractError('UNSUPPORTED_OPERATION', 'unsupported OpenHuman source class');
    }
    const result = await readBoundedJsonLines({
      selectedPath: source.locator,
      allowedRoots: source.authorizedScope.allowedRoots,
    }, { consistency: 'provisional', limits: this.limits });
    if (result.records.length === 0) {
      throw new SessionContractError('MALFORMED_SOURCE', 'OpenHuman transcript source is empty');
    }
    const parsed = result.records.map(({ value, ...line }) => {
      const record = RecordSchema.safeParse(value);
      if (!record.success) throw new SessionContractError('MALFORMED_SOURCE', 'OpenHuman transcript record is malformed');
      return { value: record.data, ...line };
    });
    const versions = new Set(parsed.map(({ value }) => version(value.schemaVersion)));
    if (versions.size !== 1) throw new SessionContractError('SCHEMA_DRIFT', 'mixed OpenHuman schema versions');
    assertSupportedSchemaMajor([...versions][0]);
    const raw = parsed.filter((item): item is typeof item & { value: RawRecord } =>
      item.value.recordType === 'session_raw');
    if (raw.length === 0) {
      throw new SessionContractError('MALFORMED_SOURCE', 'OpenHuman source contains no session_raw records');
    }
    const threads = new Map<string, ThreadState>();
    const turns = new Map<string, TurnState>();
    for (const item of parsed) {
      if (item.value.recordType === 'thread_state') threads.set(item.value.thread_id, item.value);
      if (item.value.recordType === 'turn_state') {
        turns.set(`${item.value.thread_id}\0${item.value.request_id}`, item.value);
      }
    }
    const sessions = new Map<string, RawRecord[]>();
    for (const item of raw) {
      const values = sessions.get(item.value.session_id) ?? [];
      values.push(item.value);
      sessions.set(item.value.session_id, values);
    }
    return {
      schemaVersion: OPENHUMAN_SOURCE_SCHEMA_VERSION,
      consistency: result.incompleteTail || [...sessions.values()].some((events) =>
        events.at(-1)?.active !== false && events.at(-1)?.type !== 'session_end')
        ? 'provisional' : 'complete',
      records: raw.map(({ value, ...line }) =>
        normalize(value, line, source.locatorClass, threads.get(value.thread_id),
          value.request_id ? turns.get(`${value.thread_id}\0${value.request_id}`) : undefined)),
    };
  }
}

function normalize(
  value: RawRecord,
  line: Omit<BoundedJsonRecord, 'value'>,
  locatorClass: string,
  thread?: ThreadState,
  turn?: TurnState,
): ProviderRecord {
  const lifecycle = value.raw_transcript_deleted_at
    ? 'deleted'
    : value.active === false || value.type === 'session_end' ? 'complete' : 'active';
  return {
    nativeSessionId: value.session_id,
    nativeEventId: value.event_id,
    sequence: line.sequence,
    kind: recordKind(value),
    role: value.role,
    occurredAt: timestamp(value.timestamp),
    text: extractText(value.content, value.tool),
    rawReference: { locatorClass, offset: line.byteOffset },
    extensions: {
      lifecycle,
      relationship: {
        threadId: value.thread_id,
        requestId: value.request_id,
        parentEventId: value.parent_event_id,
      },
      repeatedMetadata: value.metadata,
      usage: {
        inputTokens: value.input_tokens,
        cachedInputTokens: value.cached_input_tokens,
        outputTokens: value.output_tokens,
        chargedAmountUsd: value.charged_amount_usd,
      },
      compaction: { compacted: value.compacted === true },
      interruption: {
        interrupted: value.interrupted === true || turn?.interrupted === true,
        turnState: turn?.state,
        turnCompletedAt: timestamp(turn?.completed_at),
      },
      tool: value.tool,
      attachment: value.attachment ? {
        id: value.attachment.id,
        name: value.attachment.name,
        mime: value.attachment.mime,
        state: value.attachment.state,
        uriPresent: Boolean(value.attachment.uri),
        expiredAt: timestamp(value.attachment.expiredAt),
      } : undefined,
      thread: thread ? {
        title: thread.title,
        state: thread.state,
        deletedAt: timestamp(thread.deleted_at),
      } : undefined,
      deletion: {
        threadDeletedAt: timestamp(thread?.deleted_at),
        rawTranscriptDeletedAt: timestamp(value.raw_transcript_deleted_at),
        threadDeletionDoesNotImplyRawDeletion: true,
        aiwgDeletionDoesNotDeleteProviderData: true,
      },
      opaqueContent: typeof value.content !== 'string',
      provenance: {
        acquisition: locatorClass,
        schema: version(value.schemaVersion),
        rawTranscriptAuthoritative: true,
        enrichmentJoined: Boolean(thread || turn),
      },
      unknownFields: unknownFields(value, RAW_KEYS),
      threadUnknownFields: thread ? unknownFields(thread, THREAD_KEYS) : {},
      turnUnknownFields: turn ? unknownFields(turn, TURN_KEYS) : {},
    },
  };
}

function recordKind(value: RawRecord): string {
  if (value.attachment) return 'attachment';
  if (value.tool) {
    const status = String(value.tool.status ?? '');
    return ['failed', 'error', 'completed'].includes(status) ? 'tool-result' : 'tool-call';
  }
  if (value.compacted) return 'compaction';
  if (value.interrupted) return 'interruption';
  if (value.type === 'message') return 'message';
  return `openhuman.${value.type}`;
}

function extractText(content: unknown, tool?: Record<string, unknown>): string {
  if (typeof content === 'string') return content;
  if (tool && typeof tool.output === 'string') return tool.output;
  if (Array.isArray(content)) {
    return content.map((item) => {
      const record = item && typeof item === 'object' ? item as Record<string, unknown> : {};
      return typeof record.text === 'string' ? record.text : '';
    }).filter(Boolean).join('\n');
  }
  return '';
}

function version(value: string | number): string {
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
  if (!/^\d+$/.test(value)) throw new SessionContractError('SCHEMA_DRIFT', 'invalid OpenHuman cursor');
  return Number(value);
}

const RAW_KEYS = new Set([
  'schemaVersion', 'recordType', 'session_id', 'event_id', 'thread_id', 'request_id',
  'parent_event_id', 'type', 'role', 'content', 'timestamp', 'metadata', 'input_tokens',
  'cached_input_tokens', 'output_tokens', 'charged_amount_usd', 'compacted',
  'interrupted', 'tool', 'attachment', 'active', 'raw_transcript_deleted_at',
]);
const THREAD_KEYS = new Set([
  'schemaVersion', 'recordType', 'thread_id', 'title', 'state', 'deleted_at',
]);
const TURN_KEYS = new Set([
  'schemaVersion', 'recordType', 'thread_id', 'request_id', 'state', 'interrupted',
  'completed_at',
]);
