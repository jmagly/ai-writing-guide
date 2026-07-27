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
import {
  readBoundedJson,
  readBoundedJsonLines,
  streamBoundedJsonLines,
  type BoundedJsonRecord,
  type ReaderLimits,
} from '../readers.js';

export const OPENCODE_ADAPTER_VERSION = '1.0.0';
export const OPENCODE_EXPORT_SCHEMA_VERSION = '1.0.0';

export interface OpenCodeSessionTransport {
  readonly kind: 'api' | 'sse';
  snapshot(source: SelectedSource): Promise<unknown>;
}

const SessionInfoSchema = z.object({
  id: z.string().min(1),
  projectID: z.string().optional(),
  directory: z.string().optional(),
  parentID: z.string().optional(),
  title: z.string().optional(),
  version: z.string().optional(),
  time: z.object({
    created: z.number().optional(),
    updated: z.number().optional(),
    compacting: z.number().nullable().optional(),
    archived: z.number().nullable().optional(),
  }).passthrough().optional(),
  share: z.object({ url: z.string().optional() }).passthrough().optional(),
}).passthrough();

const MessageInfoSchema = z.object({
  id: z.string().min(1),
  sessionID: z.string().min(1),
  role: z.string().min(1),
  parentID: z.string().optional(),
  modelID: z.string().optional(),
  providerID: z.string().optional(),
  model: z.object({ providerID: z.string(), modelID: z.string() }).optional(),
  cost: z.number().optional(),
  tokens: z.record(z.unknown()).optional(),
  time: z.object({ created: z.number().optional(), completed: z.number().optional() })
    .passthrough().optional(),
  error: z.unknown().optional(),
}).passthrough();

const PartSchema = z.object({
  id: z.string().min(1),
  sessionID: z.string().min(1),
  messageID: z.string().min(1),
  type: z.string().min(1),
  text: z.string().optional(),
  tool: z.string().optional(),
  callID: z.string().optional(),
  state: z.unknown().optional(),
  mime: z.string().optional(),
  filename: z.string().optional(),
  url: z.string().optional(),
  time: z.unknown().optional(),
}).passthrough();

const MessageSchema = z.object({
  info: MessageInfoSchema,
  parts: z.array(PartSchema),
}).passthrough();

const ExportSchema = z.object({
  schemaVersion: z.string().optional(),
  info: SessionInfoSchema,
  messages: z.array(MessageSchema),
  sanitized: z.boolean().optional(),
  sanitization: z.record(z.unknown()).optional(),
  shared: z.boolean().optional(),
  providerDeletedAt: z.number().nullable().optional(),
}).passthrough();

const EventSchema = z.object({
  schemaVersion: z.string().optional(),
  type: z.string().min(1),
  properties: z.record(z.unknown()),
  sanitized: z.boolean().optional(),
  shared: z.boolean().optional(),
}).passthrough();

type OpenCodeExport = z.infer<typeof ExportSchema>;
type OpenCodeMessage = z.infer<typeof MessageSchema>;
type OpenCodePart = z.infer<typeof PartSchema>;

export class OpenCodeSessionAdapter implements SessionSourceAdapter {
  readonly provider = 'opencode' as const;
  readonly adapterVersion = OPENCODE_ADAPTER_VERSION;
  readonly disposition = 'implemented' as const;
  readonly supportedOperations = ['inspect', 'stream'] as const;
  readonly acquisitionModes = ['manual-export', 'api', 'jsonl'] as const;

  constructor(
    private readonly limits?: Partial<ReaderLimits>,
    private readonly transports: readonly OpenCodeSessionTransport[] = [],
  ) {}

  async *discover(_scope: AuthorizedScope): AsyncIterable<SourceDescriptor> {
    // Exports and loopback API/SSE endpoints require explicit selection.
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
    if (source.locatorClass === 'opencode-sse-jsonl') {
      const input = await streamBoundedJsonLines({
        selectedPath: source.locator,
        allowedRoots: source.authorizedScope.allowedRoots,
      }, { consistency: 'provisional', limits: this.limits });
      const start = parseCursor(cursor?.value);
      const sessions = new Map<string, z.infer<typeof SessionInfoSchema>>();
      const messages = new Map<string, z.infer<typeof MessageInfoSchema>>();
      const maxJoinStates = Math.min(this.limits?.maxRecords ?? 1_000_000, 10_000);
      let schemaVersion: string | null = null;
      let outputIndex = 0;
      let sawSession = false;
      for await (const line of input) {
        const parsed = EventSchema.safeParse(line.value);
        if (!parsed.success) {
          throw new SessionContractError('MALFORMED_SOURCE', 'OpenCode SSE event is malformed');
        }
        const event = parsed.data;
        const currentSchema = event.schemaVersion ?? OPENCODE_EXPORT_SCHEMA_VERSION;
        if (schemaVersion && schemaVersion !== currentSchema) {
          throw new SessionContractError('SCHEMA_DRIFT', 'mixed OpenCode event schemas');
        }
        schemaVersion = currentSchema;
        assertSupportedSchemaMajor(schemaVersion);
        const properties = event.properties;
        const emitted: ProviderRecord[] = [];
        if (event.type === 'session.created' || event.type === 'session.updated') {
          const candidate = SessionInfoSchema.safeParse(properties.info);
          if (candidate.success) {
            sawSession = true;
            sessions.set(candidate.data.id, candidate.data);
            emitted.push(...normalizeExport({
              info: candidate.data,
              messages: [],
              sanitized: event.sanitized !== false,
              shared: event.shared === true,
            }, source.locatorClass, true).records);
          }
        } else if (event.type === 'message.updated') {
          const candidate = MessageInfoSchema.safeParse(properties.info);
          if (candidate.success) {
            messages.set(candidate.data.id, candidate.data);
            const session = sessions.get(candidate.data.sessionID);
            if (!session) {
              throw new SessionContractError(
                'MALFORMED_SOURCE',
                'OpenCode message event precedes its session identity',
              );
            }
            const common = sessionExtensions({
              info: session, messages: [], sanitized: event.sanitized !== false,
              shared: event.shared === true,
            }, source.locatorClass);
            emitted.push(...normalizeMessage(
              { info: candidate.data, parts: [] },
              line.sequence * 1_000 + 1,
              source.locatorClass,
              common,
            ));
          }
        } else if (event.type === 'message.part.updated') {
          const candidate = PartSchema.safeParse(properties.part);
          if (candidate.success) {
            const message = messages.get(candidate.data.messageID);
            const session = sessions.get(candidate.data.sessionID);
            if (!message || !session) {
              throw new SessionContractError(
                'MALFORMED_SOURCE',
                'OpenCode part event precedes its message or session identity',
              );
            }
            const common = sessionExtensions({
              info: session, messages: [], sanitized: event.sanitized !== false,
              shared: event.shared === true,
            }, source.locatorClass);
            const normalized = normalizeMessage(
              { info: message, parts: [candidate.data] },
              line.sequence * 1_000,
              source.locatorClass,
              common,
            );
            emitted.push(...normalized.slice(1));
          }
        }
        if (sessions.size + messages.size > maxJoinStates) {
          throw new SessionContractError(
            'RESOURCE_LIMIT_EXCEEDED',
            'OpenCode SSE join state exceeds the bounded streaming limit',
          );
        }
        for (const record of emitted) {
          if (outputIndex++ >= start) yield record;
        }
      }
      if (!sawSession) {
        throw new SessionContractError('MALFORMED_SOURCE', 'OpenCode SSE stream lacks a session identity');
      }
      return;
    }
    const parsed = await this.readSource(source);
    const start = parseCursor(cursor?.value);
    for (const record of parsed.records.slice(start)) yield record;
  }

  private async readSource(source: SelectedSource): Promise<{
    schemaVersion: string;
    consistency: 'provisional' | 'complete';
    records: ProviderRecord[];
  }> {
    if (source.locatorClass === 'opencode-sqlite') {
      throw new SessionContractError(
        'UNSUPPORTED_OPERATION',
        'direct OpenCode SQLite access is not a supported acquisition boundary; use export or API/SSE',
      );
    }
    if (source.locatorClass === 'opencode-export-json') {
      const { value } = await readBoundedJson({
        selectedPath: source.locator,
        allowedRoots: source.authorizedScope.allowedRoots,
      }, this.limits);
      return normalizeExport(value, source.locatorClass);
    }
    if (source.locatorClass === 'opencode-sse-jsonl') {
      const result = await readBoundedJsonLines({
        selectedPath: source.locator,
        allowedRoots: source.authorizedScope.allowedRoots,
      }, { consistency: 'provisional', limits: this.limits });
      if (result.records.length === 0) {
        throw new SessionContractError('MALFORMED_SOURCE', 'OpenCode SSE source is empty');
      }
      return normalizeEvents(result.records, source.locatorClass);
    }
    const kind = source.locatorClass === 'opencode-local-api'
      ? 'api'
      : source.locatorClass === 'opencode-live-sse' ? 'sse' : undefined;
    if (!kind) throw new SessionContractError('UNSUPPORTED_OPERATION', 'unsupported OpenCode source class');
    const operation = kind === 'api' ? 'opencode.local.sessions.read' : 'opencode.local.events.read';
    if (source.authorizedScope.networkOperation !== operation) {
      throw new SessionContractError(
        'OPERATION_NOT_AUTHORIZED',
        `OpenCode ${kind.toUpperCase()} requires explicit ${operation} authorization`,
      );
    }
    const transport = this.transports.find((candidate) => candidate.kind === kind);
    if (!transport) {
      throw new SessionContractError('UNSUPPORTED_OPERATION', `OpenCode ${kind.toUpperCase()} was not negotiated`);
    }
    const value = await transport.snapshot(source);
    if (kind === 'api') return normalizeExport(value, source.locatorClass, true);
    const events = Array.isArray(value) ? value : [value];
    return normalizeEvents(events.map(toRecord), source.locatorClass);
  }
}

function normalizeExport(
  input: unknown,
  locatorClass: string,
  provisional = false,
): { schemaVersion: string; consistency: 'provisional' | 'complete'; records: ProviderRecord[] } {
  const parsed = ExportSchema.safeParse(input);
  if (!parsed.success) throw new SessionContractError('MALFORMED_SOURCE', 'OpenCode export is malformed');
  const value = parsed.data;
  const schema = value.schemaVersion ?? OPENCODE_EXPORT_SCHEMA_VERSION;
  assertSupportedSchemaMajor(schema);
  const common = sessionExtensions(value, locatorClass);
  const header: ProviderRecord = {
    nativeSessionId: value.info.id,
    nativeEventId: `session:${value.info.id}`,
    sequence: 0,
    kind: 'opencode.session',
    role: 'system',
    occurredAt: timestamp(value.info.time?.created),
    text: value.info.title ?? '',
    rawReference: { locatorClass, sequence: 0 },
    extensions: common,
  };
  return {
    schemaVersion: OPENCODE_EXPORT_SCHEMA_VERSION,
    consistency: provisional || !isClosed(value) ? 'provisional' : 'complete',
    records: [
      header,
      ...value.messages.flatMap((message, index) =>
        normalizeMessage(message, index * 1_000 + 1, locatorClass, common)),
    ],
  };
}

function normalizeEvents(
  input: BoundedJsonRecord[],
  locatorClass: string,
): { schemaVersion: string; consistency: 'provisional'; records: ProviderRecord[] } {
  const parsed = input.map(({ value, ...line }) => {
    const result = EventSchema.safeParse(value);
    if (!result.success) throw new SessionContractError('MALFORMED_SOURCE', 'OpenCode SSE event is malformed');
    return { value: result.data, ...line };
  });
  const versions = new Set(parsed.map((item) => item.value.schemaVersion ?? OPENCODE_EXPORT_SCHEMA_VERSION));
  if (versions.size !== 1) throw new SessionContractError('SCHEMA_DRIFT', 'mixed OpenCode event schemas');
  assertSupportedSchemaMajor([...versions][0]);
  const sessions = new Map<string, z.infer<typeof SessionInfoSchema>>();
  const messages = new Map<string, z.infer<typeof MessageInfoSchema>>();
  const parts: OpenCodePart[] = [];
  for (const event of parsed) {
    const properties = event.value.properties;
    if (event.value.type === 'session.created' || event.value.type === 'session.updated') {
      const candidate = SessionInfoSchema.safeParse(properties.info);
      if (candidate.success) sessions.set(candidate.data.id, candidate.data);
    } else if (event.value.type === 'message.updated') {
      const candidate = MessageInfoSchema.safeParse(properties.info);
      if (candidate.success) messages.set(candidate.data.id, candidate.data);
    } else if (event.value.type === 'message.part.updated') {
      const candidate = PartSchema.safeParse(properties.part);
      if (candidate.success) parts.push(candidate.data);
    }
  }
  if (sessions.size === 0) {
    throw new SessionContractError('MALFORMED_SOURCE', 'OpenCode SSE stream lacks a session identity');
  }
  const records: ProviderRecord[] = [];
  for (const session of sessions.values()) {
    const exportValue: OpenCodeExport = {
      info: session,
      messages: [...messages.values()]
        .filter((message) => message.sessionID === session.id)
        .map((info) => ({ info, parts: parts.filter((part) => part.messageID === info.id) })),
      sanitized: parsed.every((item) => item.value.sanitized !== false),
      shared: parsed.some((item) => item.value.shared === true),
    };
    const normalized = normalizeExport(exportValue, locatorClass, true);
    records.push(...normalized.records);
  }
  return { schemaVersion: OPENCODE_EXPORT_SCHEMA_VERSION, consistency: 'provisional', records };
}

function normalizeMessage(
  message: OpenCodeMessage,
  sequence: number,
  locatorClass: string,
  common: Record<string, unknown>,
): ProviderRecord[] {
  const header: ProviderRecord = {
    nativeSessionId: message.info.sessionID,
    nativeEventId: `message:${message.info.id}`,
    sequence,
    kind: 'message',
    role: message.info.role,
    participant: message.info.role,
    model: message.info.model?.modelID ?? message.info.modelID,
    occurredAt: timestamp(message.info.time?.created),
    text: '',
    rawReference: { locatorClass, sequence },
    extensions: {
      ...common,
      parentMessageId: message.info.parentID,
      model: message.info.model ?? {
        providerID: message.info.providerID,
        modelID: message.info.modelID,
      },
      usage: { cost: message.info.cost, tokens: message.info.tokens },
      error: message.info.error,
      messageUnknownFields: unknownFields(message.info, MESSAGE_KEYS),
    },
  };
  return [
    header,
    ...message.parts.map((part, index) => ({
      nativeSessionId: part.sessionID,
      nativeEventId: `part:${part.id}`,
      sequence: sequence + index + 1,
      kind: partKind(part),
      role: message.info.role,
      participant: message.info.role,
      toolName: part.tool,
      toolCallId: part.callID,
      model: message.info.model?.modelID ?? message.info.modelID,
      occurredAt: timestamp(asObject(part.time).start),
      text: partText(part),
      rawReference: { locatorClass, sequence: sequence + index + 1 },
      extensions: {
        ...common,
        messageId: part.messageID,
        tool: part.tool,
        toolCallId: part.callID,
        toolState: part.state,
        attachment: part.type === 'file'
          ? { mime: part.mime, filename: part.filename, urlPresent: Boolean(part.url) }
          : undefined,
        opaqueContent: !['text', 'reasoning', 'tool', 'file'].includes(part.type),
        unknownFields: unknownFields(part, PART_KEYS),
      },
    })),
  ];
}

function sessionExtensions(value: OpenCodeExport, locatorClass: string): Record<string, unknown> {
  return {
    lifecycle: value.providerDeletedAt
      ? 'deleted'
      : value.info.time?.archived ? 'archived' : isClosed(value) ? 'complete' : 'active',
    workspace: {
      projectId: value.info.projectID,
      directoryClass: value.info.directory ? '<workspace>' : undefined,
    },
    lineage: { parentSessionId: value.info.parentID },
    sharing: {
      shared: value.shared ?? Boolean(value.info.share?.url),
      publicUrlPresent: Boolean(value.info.share?.url),
      unshareRequiredForProviderDeletion: Boolean(value.shared ?? value.info.share?.url),
    },
    sanitization: {
      sanitized: value.sanitized === true,
      evidence: value.sanitization,
      exportMayOmitSensitiveNativeFields: true,
    },
    provenance: {
      acquisition: locatorClass,
      productVersion: value.info.version ?? 'not-reported',
      directSqlite: false,
    },
    deletion: {
      providerDeletedAt: timestamp(value.providerDeletedAt),
      aiwgDeletionDoesNotUnshare: true,
      aiwgDeletionDoesNotDeleteProviderSession: true,
    },
    sessionUnknownFields: {
      ...unknownFields(value.info, SESSION_INFO_KEYS),
      ...unknownFields(value, EXPORT_KEYS),
    },
  };
}

function isClosed(value: OpenCodeExport): boolean {
  return Boolean(value.info.time?.archived || value.providerDeletedAt
    || value.messages.some((message) => message.info.time?.completed));
}

function partKind(part: OpenCodePart): string {
  if (part.type === 'tool') {
    const status = String(asObject(part.state).status ?? '');
    return status === 'completed' || status === 'error' ? 'tool-result' : 'tool-call';
  }
  if (part.type === 'text') return 'message-part';
  if (part.type === 'reasoning') return 'reasoning';
  if (part.type === 'file') return 'attachment';
  return `opencode.${part.type}`;
}

function partText(part: OpenCodePart): string {
  if (part.text) return part.text;
  if (part.type === 'tool') {
    const state = asObject(part.state);
    return typeof state.output === 'string' ? state.output : part.tool ?? '';
  }
  return '';
}

function toRecord(value: unknown, sequence: number): BoundedJsonRecord {
  return { value, sequence, byteOffset: sequence, byteLength: Buffer.byteLength(JSON.stringify(value)) };
}

function timestamp(value: unknown): string | undefined {
  if (typeof value !== 'number') return undefined;
  const date = new Date(value < 10_000_000_000 ? value * 1_000 : value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function asObject(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}

function unknownFields(value: Record<string, unknown>, keys: ReadonlySet<string>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => !keys.has(key)).sort(([a], [b]) => a.localeCompare(b)),
  );
}

function parseCursor(value?: string): number {
  if (!value) return 0;
  if (!/^\d+$/.test(value)) throw new SessionContractError('SCHEMA_DRIFT', 'invalid OpenCode cursor');
  return Number(value);
}

const SESSION_INFO_KEYS = new Set([
  'id', 'projectID', 'directory', 'parentID', 'title', 'version', 'time', 'share',
]);
const MESSAGE_KEYS = new Set([
  'id', 'sessionID', 'role', 'parentID', 'modelID', 'providerID', 'model', 'cost',
  'tokens', 'time', 'error',
]);
const PART_KEYS = new Set([
  'id', 'sessionID', 'messageID', 'type', 'text', 'tool', 'callID', 'state',
  'mime', 'filename', 'url', 'time',
]);
const EXPORT_KEYS = new Set([
  'schemaVersion', 'info', 'messages', 'sanitized', 'sanitization', 'shared',
  'providerDeletedAt',
]);
