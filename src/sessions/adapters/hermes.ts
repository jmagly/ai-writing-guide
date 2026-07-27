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

export const HERMES_ADAPTER_VERSION = '1.0.0';
export const HERMES_EXPORT_SCHEMA_VERSION = '1.0.0';
export const HERMES_NATIVE_SCHEMA_VERSION = '23.0.0';

export interface HermesLocalSessionsTransport {
  snapshot(source: SelectedSource): Promise<unknown[]>;
}

const MessageSchema = z.object({
  id: z.union([z.string(), z.number()]),
  role: z.string().min(1),
  content: z.unknown().optional(),
  tool_call_id: z.string().optional(),
  tool_calls: z.unknown().optional(),
  tool_name: z.string().optional(),
  timestamp: z.number().optional(),
  token_count: z.number().optional(),
  finish_reason: z.string().optional(),
  reasoning: z.string().optional(),
  reasoning_content: z.string().optional(),
  reasoning_details: z.unknown().optional(),
  codex_reasoning_items: z.unknown().optional(),
}).passthrough();

const ExportSchema = z.object({
  schemaVersion: z.union([z.string(), z.number()]),
  id: z.string().min(1),
  source: z.string().min(1),
  user_id: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  model_config: z.unknown().optional(),
  parent_session_id: z.string().nullable().optional(),
  compressed_from_session_id: z.string().nullable().optional(),
  started_at: z.number(),
  ended_at: z.number().nullable().optional(),
  end_reason: z.string().nullable().optional(),
  archived: z.boolean().optional(),
  inactive: z.boolean().optional(),
  cwd: z.string().nullable().optional(),
  git_branch: z.string().nullable().optional(),
  routing_key: z.string().nullable().optional(),
  input_tokens: z.number().optional(),
  output_tokens: z.number().optional(),
  cache_read_tokens: z.number().optional(),
  cache_write_tokens: z.number().optional(),
  reasoning_tokens: z.number().optional(),
  estimated_cost_usd: z.number().nullable().optional(),
  actual_cost_usd: z.number().nullable().optional(),
  billing_provider: z.string().nullable().optional(),
  messages: z.array(MessageSchema),
  export_deleted_at: z.number().nullable().optional(),
  provider_deleted_at: z.number().nullable().optional(),
  snapshotConsistency: z.enum(['sqlite-backup']).optional(),
}).passthrough();

type HermesExport = z.infer<typeof ExportSchema>;
type HermesMessage = z.infer<typeof MessageSchema>;

export class HermesSessionAdapter implements SessionSourceAdapter {
  readonly provider = 'hermes' as const;
  readonly adapterVersion = HERMES_ADAPTER_VERSION;
  readonly disposition = 'implemented' as const;
  readonly supportedOperations = ['inspect', 'stream'] as const;
  readonly acquisitionModes = ['jsonl', 'api', 'sqlite-snapshot'] as const;

  constructor(
    private readonly limits?: Partial<ReaderLimits>,
    private readonly localApi?: HermesLocalSessionsTransport,
  ) {}

  async *discover(_scope: AuthorizedScope): AsyncIterable<SourceDescriptor> {
    // Native exports and consistent snapshots require explicit selection.
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
    if (source.locatorClass === 'hermes-state-db') {
      throw new SessionContractError(
        'UNSUPPORTED_OPERATION',
        'raw Hermes state.db copying is unsafe in WAL mode; use native export or sqlite3.backup()',
      );
    }
    let input: BoundedJsonRecord[];
    if (source.locatorClass === 'hermes-local-api') {
      if (source.authorizedScope.networkOperation !== 'hermes.local.sessions.read') {
        throw new SessionContractError(
          'OPERATION_NOT_AUTHORIZED',
          'Hermes local API requires explicit hermes.local.sessions.read authorization',
        );
      }
      if (!this.localApi) {
        throw new SessionContractError('UNSUPPORTED_OPERATION', 'Hermes local API was not negotiated');
      }
      input = (await this.localApi.snapshot(source)).map((value, sequence) => ({
        value, sequence, byteOffset: sequence, byteLength: Buffer.byteLength(JSON.stringify(value)),
      }));
    } else if (source.locatorClass === 'hermes-export-jsonl'
      || source.locatorClass === 'hermes-consistent-snapshot-jsonl') {
      const result = await readBoundedJsonLines({
        selectedPath: source.locator,
        allowedRoots: source.authorizedScope.allowedRoots,
      }, {
        consistency: source.locatorClass === 'hermes-export-jsonl' ? 'provisional' : 'complete',
        limits: this.limits,
      });
      input = result.records;
      if (result.incompleteTail && source.locatorClass !== 'hermes-export-jsonl') {
        throw new SessionContractError('TRUNCATED_SOURCE', 'Hermes consistent snapshot is truncated');
      }
    } else {
      throw new SessionContractError('UNSUPPORTED_OPERATION', 'unsupported Hermes source class');
    }
    if (input.length === 0) throw new SessionContractError('MALFORMED_SOURCE', 'Hermes source is empty');
    const parsed = input.map((line) => {
      const result = ExportSchema.safeParse(line.value);
      if (!result.success) throw new SessionContractError('MALFORMED_SOURCE', 'Hermes export is malformed');
      return { line, value: result.data };
    });
    const schemaVersion = declaredVersion(parsed.map(({ value }) => value));
    assertSupportedSchemaMajor(schemaVersion, 23);
    if (source.locatorClass === 'hermes-consistent-snapshot-jsonl'
      && parsed.some(({ value }) => value.snapshotConsistency !== 'sqlite-backup')) {
      throw new SessionContractError(
        'SCHEMA_DRIFT',
        'Hermes snapshot lacks sqlite3.backup() consistency evidence',
      );
    }
    return {
      schemaVersion: HERMES_EXPORT_SCHEMA_VERSION,
      consistency: parsed.every(({ value }) => ended(value)) ? 'complete' : 'provisional',
      records: parsed.flatMap(({ line, value }) => normalizeSession(value, line, source.locatorClass)),
    };
  }
}

function normalizeSession(
  session: HermesExport,
  line: BoundedJsonRecord,
  locatorClass: string,
): ProviderRecord[] {
  const lifecycle = session.provider_deleted_at
    ? 'deleted'
    : session.archived ? 'archived' : ended(session) ? 'complete' : 'active';
  const common = {
    lifecycle,
    lineage: {
      parentSessionId: session.parent_session_id,
      compressedFromSessionId: session.compressed_from_session_id,
    },
    workspace: {
      cwdClass: session.cwd ? '<workspace>' : undefined,
      gitBranch: session.git_branch,
      routingKey: session.routing_key,
      source: session.source,
      userId: session.user_id,
    },
    model: session.model,
    modelConfig: session.model_config,
    usage: {
      inputTokens: session.input_tokens,
      outputTokens: session.output_tokens,
      cacheReadTokens: session.cache_read_tokens,
      cacheWriteTokens: session.cache_write_tokens,
      reasoningTokens: session.reasoning_tokens,
      estimatedCostUsd: session.estimated_cost_usd,
      actualCostUsd: session.actual_cost_usd,
      billingProvider: session.billing_provider,
    },
    deletion: {
      exportDeletedAt: timestamp(session.export_deleted_at),
      providerDeletedAt: timestamp(session.provider_deleted_at),
      archivePreservesProviderData: true,
      compactionPreservesLineage: true,
    },
    provenance: {
      acquisition: locatorClass,
      schema: declaredSchema(session),
      sqliteSnapshotConsistency: session.snapshotConsistency,
    },
    sessionUnknownFields: unknownFields(session, SESSION_KEYS),
  };
  const header: ProviderRecord = {
    nativeSessionId: session.id,
    nativeEventId: `session:${session.id}`,
    sequence: line.sequence * 1_000_000,
    kind: 'hermes.session',
    role: 'system',
    occurredAt: timestamp(session.started_at),
    text: '',
    rawReference: { locatorClass, offset: line.byteOffset },
    extensions: common,
  };
  return [
    header,
    ...session.messages.flatMap((message, index) =>
      normalizeMessage(session.id, message, index, line, locatorClass, common)),
  ];
}

function normalizeMessage(
  sessionId: string,
  message: HermesMessage,
  index: number,
  line: BoundedJsonRecord,
  locatorClass: string,
  common: Record<string, unknown>,
): ProviderRecord[] {
  const base = {
    nativeSessionId: sessionId,
    sequence: line.sequence * 1_000_000 + index * 10 + 1,
    role: message.role,
    occurredAt: timestamp(message.timestamp),
    rawReference: { locatorClass, offset: line.byteOffset },
  };
  const records: ProviderRecord[] = [{
    ...base,
    nativeEventId: `message:${message.id}`,
    kind: message.tool_name ? 'tool-result' : 'message',
    text: extractText(message.content),
    extensions: {
      ...common,
      toolCallId: message.tool_call_id,
      toolName: message.tool_name,
      tokenCount: message.token_count,
      finishReason: message.finish_reason,
      reasoning: {
        text: message.reasoning,
        content: message.reasoning_content,
        details: message.reasoning_details,
        codexItems: message.codex_reasoning_items,
      },
      opaqueContent: typeof message.content !== 'string',
      unknownFields: unknownFields(message, MESSAGE_KEYS),
    },
  }];
  const toolCalls = arrayValue(message.tool_calls);
  toolCalls.forEach((call, callIndex) => records.push({
    ...base,
    nativeEventId: stringValue(call.id) || `message:${message.id}:tool:${callIndex}`,
    sequence: base.sequence + callIndex + 1,
    kind: 'tool-call',
    text: stringValue(asObject(call.function).name),
    extensions: { ...common, toolCall: call },
  }));
  return records;
}

function ended(value: HermesExport): boolean {
  return Boolean(value.ended_at || value.provider_deleted_at || value.archived || value.inactive);
}

function declaredVersion(values: HermesExport[]): string {
  const versions = new Set(values.map(declaredSchema));
  if (versions.size !== 1) throw new SessionContractError('SCHEMA_DRIFT', 'mixed Hermes export schemas');
  return [...versions][0];
}

function declaredSchema(value: HermesExport): string {
  if (typeof value.schemaVersion === 'number') return `${value.schemaVersion}.0.0`;
  return /^\d+$/.test(value.schemaVersion) ? `${value.schemaVersion}.0.0` : value.schemaVersion;
}

function timestamp(value?: number | null): string | undefined {
  if (value === undefined || value === null) return undefined;
  const date = new Date(value < 10_000_000_000 ? value * 1_000 : value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function extractText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value.map((item) => stringValue(asObject(item).text)).filter(Boolean).join('\n');
  }
  return '';
}

function arrayValue(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(asObject) : [];
}

function asObject(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function unknownFields(value: Record<string, unknown>, keys: ReadonlySet<string>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => !keys.has(key)).sort(([a], [b]) => a.localeCompare(b)),
  );
}

function parseCursor(value?: string): number {
  if (!value) return 0;
  if (!/^\d+$/.test(value)) throw new SessionContractError('SCHEMA_DRIFT', 'invalid Hermes cursor');
  return Number(value);
}

const SESSION_KEYS = new Set([
  'schemaVersion', 'id', 'source', 'user_id', 'model', 'model_config',
  'parent_session_id', 'compressed_from_session_id', 'started_at', 'ended_at',
  'end_reason', 'archived', 'inactive', 'cwd', 'git_branch', 'routing_key',
  'input_tokens', 'output_tokens', 'cache_read_tokens', 'cache_write_tokens',
  'reasoning_tokens', 'estimated_cost_usd', 'actual_cost_usd', 'billing_provider',
  'messages', 'export_deleted_at', 'provider_deleted_at', 'snapshotConsistency',
]);
const MESSAGE_KEYS = new Set([
  'id', 'role', 'content', 'tool_call_id', 'tool_calls', 'tool_name', 'timestamp',
  'token_count', 'finish_reason', 'reasoning', 'reasoning_content',
  'reasoning_details', 'codex_reasoning_items',
]);
