import { basename, extname } from 'node:path';
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
import { readBoundedJson, type ReaderLimits } from '../readers.js';

export const COPILOT_ADAPTER_VERSION = '1.0.0';
export const COPILOT_EXPORT_SCHEMA_VERSION = '1.0.0';

const ResponsePartSchema = z.object({
  value: z.string().optional(),
  kind: z.string().optional(),
}).passthrough();

const RequestSchema = z.object({
  requestId: z.string().min(1).optional(),
  message: z.union([
    z.string(),
    z.object({ text: z.string() }).passthrough(),
  ]),
  response: z.union([
    z.string(),
    z.array(ResponsePartSchema),
  ]).optional(),
  timestamp: z.union([z.string(), z.number()]).optional(),
  modelId: z.string().optional(),
}).passthrough();

const ExportSchema = z.object({
  version: z.union([z.number().int().positive(), z.string()]),
  schemaVersion: z.string().optional(),
  sessionId: z.string().min(1).optional(),
  creationDate: z.union([z.string(), z.number()]).optional(),
  lastMessageDate: z.union([z.string(), z.number()]).optional(),
  requests: z.array(RequestSchema),
  requesterUsername: z.string().optional(),
  responderUsername: z.string().optional(),
  state: z.string().optional(),
  isArchived: z.boolean().optional(),
  syncStatus: z.string().optional(),
  workspace: z.object({
    id: z.string().optional(),
    repository: z.string().optional(),
  }).passthrough().optional(),
}).passthrough();

type CopilotExport = z.infer<typeof ExportSchema>;
type CopilotRequest = z.infer<typeof RequestSchema>;

export class CopilotSessionAdapter implements SessionSourceAdapter {
  readonly provider = 'copilot' as const;
  readonly adapterVersion = COPILOT_ADAPTER_VERSION;
  readonly disposition = 'implemented' as const;
  readonly supportedOperations = ['inspect', 'stream'] as const;
  readonly acquisitionModes = ['manual-export'] as const;

  constructor(private readonly limits?: Partial<ReaderLimits>) {}

  async *discover(_scope: AuthorizedScope): AsyncIterable<SourceDescriptor> {
    // Supported VS Code exports require explicit user selection. Versioned
    // workspaceStorage JSON/JSONL is intentionally not treated as a stable source.
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
    if (source.locatorClass !== 'copilot-chat-json-export') {
      throw new SessionContractError(
        'UNSUPPORTED_OPERATION',
        'Copilot workspace-store parsing is experimental and not enabled by this adapter',
      );
    }
    const { value } = await readBoundedJson({
      selectedPath: source.locator,
      allowedRoots: source.authorizedScope.allowedRoots,
    }, this.limits);
    const parsed = ExportSchema.safeParse(value);
    if (!parsed.success) {
      throw new SessionContractError('MALFORMED_SOURCE', 'Copilot chat export is malformed');
    }
    const schemaVersion = declaredSchemaVersion(parsed.data);
    assertSupportedSchemaMajor(schemaVersion);
    return {
      schemaVersion,
      consistency: parsed.data.isArchived || parsed.data.state === 'archived'
        || parsed.data.state === 'deleted' ? 'complete' : 'provisional',
      records: normalizeExport(parsed.data, source.locator),
    };
  }
}

function normalizeExport(value: CopilotExport, locator: string): ProviderRecord[] {
  const nativeSessionId = value.sessionId ?? basename(locator, extname(locator));
  const lifecycle = value.isArchived || value.state === 'archived'
    ? 'archived'
    : value.state === 'deleted' ? 'deleted' : 'active';
  const output: ProviderRecord[] = [];
  for (const [requestIndex, request] of value.requests.entries()) {
    const requestId = request.requestId ?? `request-${requestIndex}`;
    output.push({
      nativeSessionId,
      nativeEventId: `${requestId}:request`,
      sequence: requestIndex * 2,
      kind: 'message',
      role: 'user',
      occurredAt: timestamp(request.timestamp ?? value.creationDate),
      text: messageText(request),
      rawReference: { locatorClass: 'copilot-chat-json-export', sequence: requestIndex },
      extensions: commonExtensions(value, request, lifecycle, {
        direction: 'request',
        unknownFields: unknownFields(request, REQUEST_KEYS),
        metadataLoss: [],
      }),
    });
    const response = responseText(request);
    if (response.text !== null) {
      output.push({
        nativeSessionId,
        nativeEventId: `${requestId}:response`,
        sequence: requestIndex * 2 + 1,
        kind: 'message',
        role: 'assistant',
        occurredAt: timestamp(request.timestamp ?? value.lastMessageDate),
        text: response.text,
        rawReference: { locatorClass: 'copilot-chat-json-export', sequence: requestIndex },
        extensions: commonExtensions(value, request, lifecycle, {
          direction: 'response',
          unknownFields: response.unknownFields,
          metadataLoss: response.losses,
        }),
      });
    }
  }
  return output;
}

function commonExtensions(
  value: CopilotExport,
  request: CopilotRequest,
  lifecycle: string,
  event: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...event,
    lifecycle,
    sync: {
      status: value.syncStatus ?? 'unknown',
      archiveState: value.isArchived ? 'archived' : 'not-reported',
      deletionState: value.state === 'deleted' ? 'provider-reported' : 'not-reported',
    },
    workspace: {
      id: value.workspace?.id,
      repository: value.workspace?.repository,
    },
    model: request.modelId,
    participants: {
      requester: value.requesterUsername,
      responder: value.responderUsername,
    },
    provenance: {
      acquisition: 'vscode-chat-json-export',
      schema: declaredSchemaVersion(value),
      stableWorkspaceStoreDependency: false,
      proposedApiDependency: false,
    },
    exportUnknownFields: unknownFields(value, EXPORT_KEYS),
  };
}

function responseText(request: CopilotRequest): {
  text: string | null;
  losses: Array<{ field: string; reason: string }>;
  unknownFields: Record<string, unknown>;
} {
  if (typeof request.response === 'string') {
    return { text: request.response, losses: [], unknownFields: {} };
  }
  if (!request.response) return { text: null, losses: [], unknownFields: {} };
  const text = request.response
    .map((part) => part.value)
    .filter((part): part is string => typeof part === 'string')
    .join('\n\n');
  const losses = request.response.flatMap((part, index) => (
    part.kind && part.kind !== 'markdownContent'
      ? [{
          field: `response[${index}]`,
          reason: `structured ${part.kind} part flattened or retained as opaque metadata`,
        }]
      : []
  ));
  return {
    text,
    losses,
    unknownFields: {
      responseParts: request.response.map((part) => unknownFields(part, RESPONSE_KEYS)),
    },
  };
}

function messageText(request: CopilotRequest): string {
  return typeof request.message === 'string' ? request.message : request.message.text;
}

function declaredSchemaVersion(value: CopilotExport): string {
  if (value.schemaVersion) return value.schemaVersion;
  const major = typeof value.version === 'number'
    ? value.version
    : Number(String(value.version).split('.')[0]);
  if (!Number.isInteger(major) || major < 1) {
    throw new SessionContractError('SCHEMA_DRIFT', 'invalid Copilot export version');
  }
  return `${major}.0.0`;
}

function timestamp(value: string | number | undefined): string | undefined {
  if (value === undefined) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function unknownFields(
  value: Record<string, unknown>,
  known: ReadonlySet<string>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => !known.has(key)).sort(([a], [b]) => a.localeCompare(b)),
  );
}

function parseCursor(value?: string): number {
  if (!value) return 0;
  if (!/^\d+$/.test(value)) {
    throw new SessionContractError('SCHEMA_DRIFT', 'invalid Copilot record cursor');
  }
  return Number(value);
}

const EXPORT_KEYS = new Set([
  'version', 'schemaVersion', 'sessionId', 'creationDate', 'lastMessageDate',
  'requests', 'requesterUsername', 'responderUsername', 'state', 'isArchived',
  'syncStatus', 'workspace',
]);
const REQUEST_KEYS = new Set([
  'requestId', 'message', 'response', 'timestamp', 'modelId',
]);
const RESPONSE_KEYS = new Set(['value', 'kind']);
