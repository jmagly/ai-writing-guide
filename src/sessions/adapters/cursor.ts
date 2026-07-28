import { opendir } from 'node:fs/promises';
import {
  basename, dirname, extname, resolve,
} from 'node:path';
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
  readBoundedJsonLines,
  readBoundedText,
  streamBoundedJsonLines,
  type BoundedJsonRecord,
  type ReaderLimits,
} from '../readers.js';

export const CURSOR_ADAPTER_VERSION = '1.0.0';
export const CURSOR_SOURCE_SCHEMA_VERSION = '1.0.0';

const CliEventSchema = z.object({
  schemaVersion: z.string().optional(),
  cliVersion: z.string().optional(),
  version: z.string().optional(),
  type: z.string().min(1),
  subtype: z.string().optional(),
  session_id: z.string().min(1),
  request_id: z.string().optional(),
  call_id: z.string().optional(),
  cwd: z.string().optional(),
  model: z.string().optional(),
  permissionMode: z.string().optional(),
  message: z.object({
    role: z.string().optional(),
    content: z.array(z.object({
      type: z.string(),
      text: z.string().optional(),
    }).passthrough()).optional(),
  }).passthrough().optional(),
  tool_call: z.record(z.unknown()).optional(),
  result: z.string().optional(),
  is_error: z.boolean().optional(),
}).passthrough();

const CloudEventSchema = z.object({
  schemaVersion: z.string().optional(),
  id: z.string().optional(),
  event_id: z.string().optional(),
  type: z.string().min(1),
  agent: z.object({
    id: z.string().min(1),
    status: z.string().optional(),
  }).passthrough().optional(),
  run: z.object({
    id: z.string().min(1),
    status: z.string().optional(),
  }).passthrough().optional(),
  data: z.unknown().optional(),
}).passthrough().refine((value) => value.agent?.id || value.run?.id, {
  message: 'cloud event requires an agent or run identity',
});

const AgentTranscriptEventSchema = z.object({
  schemaVersion: z.string().optional(),
  id: z.string().optional(),
  event_id: z.string().optional(),
  request_id: z.string().optional(),
  timestamp: z.string().datetime({ offset: true }).optional(),
  type: z.string().min(1).optional(),
  status: z.string().min(1).optional(),
  role: z.string().min(1).optional(),
  message: z.object({
    id: z.string().optional(),
    role: z.string().optional(),
    content: z.union([z.string(), z.array(z.unknown())]).optional(),
  }).passthrough().optional(),
}).passthrough().refine((value) => value.role || value.type, {
  message: 'agent transcript event requires role or type',
});

export class CursorSessionAdapter implements SessionSourceAdapter {
  readonly provider = 'cursor' as const;
  readonly adapterVersion = CURSOR_ADAPTER_VERSION;
  readonly disposition = 'implemented' as const;
  readonly supportedOperations = ['discover', 'inspect', 'stream'] as const;
  readonly acquisitionModes = ['api', 'jsonl', 'manual-export'] as const;

  constructor(
    private readonly limits?: Partial<ReaderLimits>,
    private readonly discoveryLimits = { maxDepth: 8, maxFiles: 10_000 },
  ) {}

  async *discover(scope: AuthorizedScope): AsyncIterable<SourceDescriptor> {
    if (scope.allowedRoots.length === 0) {
      throw new SessionContractError(
        'SOURCE_NOT_AUTHORIZED',
        'Cursor discovery requires an explicitly authorized agent-transcripts root',
      );
    }
    let emitted = 0;
    for (const root of [...scope.allowedRoots].sort()) {
      for await (const locator of discoverJsonl(resolve(root), this.discoveryLimits.maxDepth)) {
        if (++emitted > this.discoveryLimits.maxFiles) {
          throw new SessionContractError(
            'RESOURCE_LIMIT_EXCEEDED',
            'Cursor source discovery exceeded the authorized file limit',
          );
        }
        yield {
          provider: 'cursor',
          locator,
          locatorClass: 'cursor-agent-transcript-jsonl',
        };
      }
    }
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
    if (source.locatorClass === 'cursor-cli-stream-json'
      || source.locatorClass === 'cursor-cloud-events-jsonl') {
      const input = await streamBoundedJsonLines({
        selectedPath: source.locator,
        allowedRoots: source.authorizedScope.allowedRoots,
      }, { consistency: 'provisional', limits: this.limits });
      const start = parseCursor(cursor?.value);
      let outputIndex = 0;
      let schemaVersion: string | null = null;
      let cliSessionId: string | undefined;
      let agentId: string | undefined;
      let runId: string | undefined;
      let sawRecord = false;
      for await (const line of input) {
        sawRecord = true;
        const raw = asObject(line.value);
        const currentSchema = typeof raw.schemaVersion === 'string'
          ? raw.schemaVersion : CURSOR_SOURCE_SCHEMA_VERSION;
        if (schemaVersion && schemaVersion !== currentSchema) {
          throw new SessionContractError('SCHEMA_DRIFT', 'Cursor source declares mixed schema versions');
        }
        schemaVersion = currentSchema;
        assertSupportedSchemaMajor(schemaVersion);
        let record: ProviderRecord;
        if (source.locatorClass === 'cursor-cli-stream-json') {
          const parsed = CliEventSchema.safeParse(line.value);
          if (!parsed.success) {
            throw new SessionContractError('MALFORMED_SOURCE', 'Cursor CLI event is malformed');
          }
          const event = parsed.data;
          if (cliSessionId && cliSessionId !== event.session_id) {
            throw new SessionContractError('DUPLICATE_NATIVE_ID', 'Cursor CLI stream changes session identity');
          }
          cliSessionId = event.session_id;
          record = normalizeCli([line]).records[0];
        } else {
          const parsed = CloudEventSchema.safeParse(line.value);
          if (!parsed.success) {
            throw new SessionContractError('MALFORMED_SOURCE', 'Cursor Cloud Agent event is malformed');
          }
          const event = parsed.data;
          const nextAgentId = event.agent?.id ?? agentId;
          const nextRunId = event.run?.id ?? runId;
          if (agentId && nextAgentId && agentId !== nextAgentId) {
            throw new SessionContractError('DUPLICATE_NATIVE_ID', 'Cursor cloud stream changes agent identity');
          }
          if (runId && nextRunId && runId !== nextRunId) {
            throw new SessionContractError('DUPLICATE_NATIVE_ID', 'Cursor cloud stream changes run identity');
          }
          agentId = nextAgentId;
          runId = nextRunId;
          record = normalizeCloud([{
            ...line,
            value: {
              ...event,
              agent: event.agent ?? (agentId ? { id: agentId } : undefined),
              run: event.run ?? (runId ? { id: runId } : undefined),
            },
          }]).records[0];
        }
        if (outputIndex++ >= start) yield record;
      }
      if (!sawRecord && !input.incompleteTail) {
        throw new SessionContractError('MALFORMED_SOURCE', 'Cursor structured source is empty');
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
    const authorization = {
      selectedPath: source.locator,
      allowedRoots: source.authorizedScope.allowedRoots,
    };
    if (source.locatorClass === 'cursor-editor-sqlite') {
      throw new SessionContractError(
        'UNSUPPORTED_OPERATION',
        'Cursor editor SQLite is undocumented and unsupported; export the chat as Markdown',
      );
    }
    if (source.locatorClass === 'cursor-editor-markdown') {
      const input = await readBoundedText(authorization, this.limits);
      return {
        schemaVersion: CURSOR_SOURCE_SCHEMA_VERSION,
        consistency: 'complete',
        records: normalizeMarkdown(input.value, source.locator),
      };
    }
    const input = await readBoundedJsonLines(
      authorization,
      { consistency: 'provisional', limits: this.limits },
    );
    if (input.records.length === 0 && !input.incompleteTail) {
      throw new SessionContractError('MALFORMED_SOURCE', 'Cursor structured source is empty');
    }
    const schemaVersion = declaredVersion(input.records);
    assertSupportedSchemaMajor(schemaVersion);
    if (source.locatorClass === 'cursor-cli-stream-json') {
      const normalized = normalizeCli(input.records);
      return {
        schemaVersion,
        consistency: normalized.complete && !input.incompleteTail ? 'complete' : 'provisional',
        records: normalized.records,
      };
    }
    if (source.locatorClass === 'cursor-cloud-events-jsonl') {
      const normalized = normalizeCloud(input.records);
      return {
        schemaVersion,
        consistency: normalized.complete && !input.incompleteTail ? 'complete' : 'provisional',
        records: normalized.records,
      };
    }
    if (source.locatorClass === 'cursor-agent-transcript-jsonl') {
      const normalized = normalizeAgentTranscript(input.records, source.locator);
      return {
        schemaVersion,
        consistency: normalized.complete && !input.incompleteTail ? 'complete' : 'provisional',
        records: normalized.records,
      };
    }
    throw new SessionContractError('UNSUPPORTED_OPERATION', 'unsupported Cursor source class');
  }
}

async function* discoverJsonl(root: string, remainingDepth: number): AsyncIterable<string> {
  if (remainingDepth < 0) return;
  let directory;
  try {
    directory = await opendir(root);
  } catch {
    return;
  }
  const entries = [];
  for await (const entry of directory) entries.push(entry);
  entries.sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    const path = resolve(root, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      yield* discoverJsonl(path, remainingDepth - 1);
    } else if (entry.isFile() && extname(entry.name) === '.jsonl') {
      yield path;
    }
  }
}

function normalizeCli(input: BoundedJsonRecord[]): {
  records: ProviderRecord[];
  complete: boolean;
} {
  const records: ProviderRecord[] = [];
  let sessionId: string | undefined;
  let complete = false;
  for (const line of input) {
    const parsed = CliEventSchema.safeParse(line.value);
    if (!parsed.success) {
      throw new SessionContractError('MALFORMED_SOURCE', 'Cursor CLI event is malformed');
    }
    const event = parsed.data;
    if (sessionId && sessionId !== event.session_id) {
      throw new SessionContractError('DUPLICATE_NATIVE_ID', 'Cursor CLI stream changes session identity');
    }
    sessionId = event.session_id;
    complete ||= event.type === 'result' && event.subtype === 'success' && event.is_error !== true;
    const text = event.type === 'result'
      ? (event.result ?? '')
      : (event.message?.content ?? []).flatMap((part) => part.text ?? []).join('');
    records.push({
      nativeSessionId: event.session_id,
      nativeEventId: event.call_id ?? event.request_id ?? `${event.type}:${line.sequence}`,
      sequence: line.sequence,
      kind: event.type === 'tool_call' ? `tool.${event.subtype ?? 'event'}` : event.type,
      role: event.message?.role ?? (event.type === 'system' ? 'system' : undefined),
      participant: event.message?.role ?? (event.type === 'system' ? 'system' : undefined),
      model: event.model,
      toolName: typeof asObject(event.tool_call).name === 'string'
        ? String(asObject(event.tool_call).name) : undefined,
      toolCallId: event.call_id,
      text,
      rawReference: { locatorClass: 'cursor-cli-stream-json', offset: line.byteOffset },
      extensions: {
        subtype: event.subtype,
        cwd: event.cwd,
        model: event.model,
        permissionMode: event.permissionMode,
        productVersion: event.cliVersion ?? event.version ?? 'not-reported',
        toolCall: event.tool_call,
        lifecycle: complete ? 'complete' : 'active',
        provenance: { acquisition: 'cursor-cli-stream-json', schema: declaredEventVersion(event) },
        unknownFields: unknownFields(event, CLI_KEYS),
      },
    });
  }
  return { records, complete };
}

function normalizeCloud(input: BoundedJsonRecord[]): {
  records: ProviderRecord[];
  complete: boolean;
} {
  const records: ProviderRecord[] = [];
  let agentId: string | undefined;
  let runId: string | undefined;
  let complete = false;
  for (const line of input) {
    const parsed = CloudEventSchema.safeParse(line.value);
    if (!parsed.success) {
      throw new SessionContractError('MALFORMED_SOURCE', 'Cursor Cloud Agent event is malformed');
    }
    const event = parsed.data;
    const nextAgentId = event.agent?.id ?? agentId;
    const nextRunId = event.run?.id ?? runId;
    if (agentId && nextAgentId && agentId !== nextAgentId) {
      throw new SessionContractError('DUPLICATE_NATIVE_ID', 'Cursor cloud stream changes agent identity');
    }
    if (runId && nextRunId && runId !== nextRunId) {
      throw new SessionContractError('DUPLICATE_NATIVE_ID', 'Cursor cloud stream changes run identity');
    }
    agentId = nextAgentId;
    runId = nextRunId;
    const status = event.run?.status ?? event.agent?.status;
    complete ||= isTerminal(status) || event.type === 'agent.deleted' || event.type === 'agent.archived';
    const sessionId = runId ? `${agentId ?? 'agent'}:${runId}` : agentId!;
    records.push({
      nativeSessionId: sessionId,
      nativeEventId: event.event_id ?? event.id ?? `${event.type}:${line.sequence}`,
      sequence: line.sequence,
      kind: `cursor.cloud.${event.type}`,
      role: 'system',
      activityBoundary: event.type === 'agent.unarchived'
        ? 'resume'
        : event.type === 'agent.archived' || event.type === 'agent.deleted'
          ? 'end'
          : undefined,
      activityBoundaryBasis: event.type === 'agent.unarchived'
        || event.type === 'agent.archived'
        || event.type === 'agent.deleted'
        ? `cursor-cloud:${event.type}`
        : undefined,
      activityBoundaryConfidence: event.type === 'agent.unarchived'
        || event.type === 'agent.archived'
        || event.type === 'agent.deleted'
        ? 'high'
        : undefined,
      text: extractCloudText(event.data),
      rawReference: { locatorClass: 'cursor-cloud-events-jsonl', offset: line.byteOffset },
      extensions: {
        agent: event.agent,
        run: event.run,
        status,
        lifecycle: cloudLifecycle(event.type, status),
        reconnect: {
          eventId: event.event_id ?? event.id,
          supported: true,
          header: 'Last-Event-ID',
        },
        provenance: { acquisition: 'cursor-cloud-agents-api-v1', schema: declaredEventVersion(event) },
        unknownFields: unknownFields(event, CLOUD_KEYS),
      },
    });
  }
  return { records, complete };
}

function normalizeAgentTranscript(
  input: BoundedJsonRecord[],
  locator: string,
): { records: ProviderRecord[]; complete: boolean } {
  const nativeSessionId = agentTranscriptSessionId(locator);
  const records: ProviderRecord[] = [];
  let complete = false;
  for (const line of input) {
    const parsed = AgentTranscriptEventSchema.safeParse(line.value);
    if (!parsed.success) {
      throw new SessionContractError(
        'MALFORMED_SOURCE',
        'Cursor agent transcript event is malformed',
      );
    }
    const event = parsed.data;
    complete ||= event.type === 'turn_ended' && event.status === 'success';
    const messageRole = event.message?.role ?? event.role ?? 'system';
    records.push({
      nativeSessionId,
      nativeEventId: event.event_id ?? event.id ?? event.request_id ?? `${messageRole}:${line.sequence}`,
      sequence: line.sequence,
      kind: event.type ? `cursor.agent.${event.type}` : 'message',
      role: messageRole,
      participant: messageRole,
      occurredAt: event.timestamp,
      activityBoundary: event.type === 'turn_ended' ? 'end' : undefined,
      activityBoundaryBasis: event.type === 'turn_ended'
        ? `cursor-agent:${event.status ?? 'unknown'}`
        : undefined,
      activityBoundaryConfidence: event.type === 'turn_ended' ? 'high' : undefined,
      text: messageText(event.message?.content),
      rawReference: { locatorClass: 'cursor-agent-transcript-jsonl', offset: line.byteOffset },
      extensions: {
        transcriptRole: event.role,
        status: event.status,
        lifecycle: event.type === 'turn_ended' && event.status === 'success' ? 'complete' : 'active',
        provenance: {
          acquisition: 'cursor-agent-transcript-jsonl',
          schema: declaredEventVersion(event),
          nativeSessionIdDerivedFromPath: true,
        },
        unknownFields: unknownFields(event, AGENT_TRANSCRIPT_KEYS),
      },
    });
  }
  return { records, complete };
}

function normalizeMarkdown(value: string, locator: string): ProviderRecord[] {
  const heading = /^#{1,3}\s+(User|Assistant|Cursor)\s*$/gim;
  const matches = [...value.matchAll(heading)];
  if (matches.length === 0) {
    throw new SessionContractError('MALFORMED_SOURCE', 'Cursor Markdown export has no role headings');
  }
  const nativeSessionId = basename(locator, extname(locator));
  return matches.map((match, index) => {
    const start = match.index! + match[0].length;
    const end = matches[index + 1]?.index ?? value.length;
    const role = match[1].toLowerCase() === 'user' ? 'user' : 'assistant';
    return {
      nativeSessionId,
      nativeEventId: `markdown:${index}`,
      sequence: index,
      kind: 'message',
      role,
      text: value.slice(start, end).trim(),
      rawReference: { locatorClass: 'cursor-editor-markdown', sequence: index },
      extensions: {
        metadataLoss: [
          'timestamps unavailable',
          'model unavailable',
          'tool calls and results unavailable',
          'provider lifecycle unavailable',
        ],
        provenance: {
          acquisition: 'cursor-editor-markdown-export',
          nativeSessionIdDerivedFromFilename: true,
          undocumentedSqliteDependency: false,
        },
      },
    };
  });
}

function agentTranscriptSessionId(locator: string): string {
  const fileIdentity = basename(locator, extname(locator));
  const directoryIdentity = basename(dirname(locator));
  return directoryIdentity && directoryIdentity === fileIdentity
    ? directoryIdentity : fileIdentity;
}

function messageText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!Array.isArray(value)) return '';
  return value.map((item) => {
    const block = asObject(item);
    if (typeof block.text === 'string') return block.text;
    if (typeof block.content === 'string') return block.content;
    return '';
  }).filter(Boolean).join('\n');
}

function declaredVersion(records: BoundedJsonRecord[]): string {
  const versions = new Set(records.map((line) => {
    const value = asObject(line.value);
    return typeof value.schemaVersion === 'string' ? value.schemaVersion : CURSOR_SOURCE_SCHEMA_VERSION;
  }));
  if (versions.size !== 1) {
    throw new SessionContractError('SCHEMA_DRIFT', 'Cursor source declares mixed schema versions');
  }
  return [...versions][0];
}

function declaredEventVersion(event: { schemaVersion?: string }): string {
  return event.schemaVersion ?? CURSOR_SOURCE_SCHEMA_VERSION;
}

function extractCloudText(value: unknown): string {
  const object = asObject(value);
  if (typeof object.text === 'string') return object.text;
  if (typeof object.message === 'string') return object.message;
  return '';
}

function cloudLifecycle(type: string, status?: string): string {
  if (type === 'agent.deleted') return 'deleted';
  if (type === 'agent.archived') return 'archived';
  if (type === 'agent.unarchived') return 'active';
  if (status === 'cancelled' || status === 'canceled') return 'cancelled';
  return isTerminal(status) ? 'complete' : 'active';
}

function isTerminal(status?: string): boolean {
  return ['completed', 'failed', 'cancelled', 'canceled'].includes(status ?? '');
}

function unknownFields(
  value: Record<string, unknown>,
  known: ReadonlySet<string>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => !known.has(key)).sort(([a], [b]) => a.localeCompare(b)),
  );
}

function asObject(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function parseCursor(value?: string): number {
  if (!value) return 0;
  if (!/^\d+$/.test(value)) {
    throw new SessionContractError('SCHEMA_DRIFT', 'invalid Cursor record cursor');
  }
  return Number(value);
}

const CLI_KEYS = new Set([
  'schemaVersion', 'type', 'subtype', 'session_id', 'request_id', 'call_id', 'cwd',
  'model', 'permissionMode', 'cliVersion', 'version', 'message', 'tool_call', 'result', 'is_error',
  'duration_ms', 'duration_api_ms',
]);
const CLOUD_KEYS = new Set(['schemaVersion', 'id', 'event_id', 'type', 'agent', 'run', 'data']);
const AGENT_TRANSCRIPT_KEYS = new Set([
  'schemaVersion', 'id', 'event_id', 'request_id', 'timestamp', 'type', 'status',
  'role', 'message',
]);
