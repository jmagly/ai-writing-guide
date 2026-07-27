import { opendir } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';
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
  readBoundedJsonLines, streamBoundedJsonLines,
  type BoundedJsonRecord, type ReaderLimits,
} from '../readers.js';

export const FACTORY_ADAPTER_VERSION = '1.0.0';
export const FACTORY_SOURCE_SCHEMA_VERSION = '1.0.0';

export interface FactoryRemoteTransport {
  readonly kind: 'sessions-api' | 'droid-exec';
  snapshot(source: SelectedSource): Promise<unknown[]>;
}

const FactoryRecordSchema = z.object({
  schemaVersion: z.string().optional(),
  type: z.string().min(1),
  subtype: z.string().optional(),
  uuid: z.string().min(1).optional(),
  id: z.string().min(1).optional(),
  parentUuid: z.string().nullable().optional(),
  sessionId: z.string().min(1).optional(),
  session_id: z.string().min(1).optional(),
  timestamp: z.union([z.string(), z.number()]).optional(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
  cwd: z.string().optional(),
  version: z.string().optional(),
  message: z.object({
    id: z.string().optional(),
    role: z.string().optional(),
    content: z.union([z.string(), z.array(z.unknown())]).optional(),
  }).passthrough().optional(),
  content: z.union([z.string(), z.array(z.unknown())]).optional(),
  sessionSettings: z.record(z.unknown()).optional(),
  settings: z.record(z.unknown()).optional(),
  status: z.string().optional(),
}).passthrough();

type FactoryRecord = z.infer<typeof FactoryRecordSchema>;

export class FactorySessionAdapter implements SessionSourceAdapter {
  readonly provider = 'factory' as const;
  readonly adapterVersion = FACTORY_ADAPTER_VERSION;
  readonly disposition = 'implemented' as const;
  readonly supportedOperations = ['discover', 'inspect', 'stream'] as const;
  readonly acquisitionModes = ['jsonl', 'api'] as const;

  constructor(
    private readonly limits?: Partial<ReaderLimits>,
    private readonly transports: readonly FactoryRemoteTransport[] = [],
    private readonly discoveryLimits = { maxDepth: 8, maxFiles: 10_000 },
  ) {}

  async *discover(scope: AuthorizedScope): AsyncIterable<SourceDescriptor> {
    if (scope.allowedRoots.length === 0) {
      throw new SessionContractError(
        'SOURCE_NOT_AUTHORIZED',
        'Factory discovery requires an explicitly authorized projects root',
      );
    }
    let emitted = 0;
    for (const root of [...scope.allowedRoots].sort()) {
      for await (const locator of discoverJsonl(resolve(root), this.discoveryLimits.maxDepth)) {
        if (++emitted > this.discoveryLimits.maxFiles) {
          throw new SessionContractError(
            'RESOURCE_LIMIT_EXCEEDED',
            'Factory source discovery exceeded the authorized file limit',
          );
        }
        yield { provider: 'factory', locator, locatorClass: 'factory-droid-jsonl' };
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
    if (source.locatorClass === 'factory-droid-jsonl') {
      const input = await streamBoundedJsonLines({
        selectedPath: source.locator,
        allowedRoots: source.authorizedScope.allowedRoots,
      }, { consistency: 'provisional', limits: this.limits });
      const start = parseCursor(cursor?.value);
      let outputIndex = 0;
      let establishedId: string | undefined;
      let schemaVersion: string | null = null;
      let sawRecord = false;
      for await (const line of input) {
        sawRecord = true;
        const parsed = FactoryRecordSchema.safeParse(line.value);
        if (!parsed.success) {
          throw new SessionContractError('MALFORMED_SOURCE', 'Factory session record is malformed');
        }
        const value = parsed.data;
        const currentSchema = value.schemaVersion ?? FACTORY_SOURCE_SCHEMA_VERSION;
        if (schemaVersion && schemaVersion !== currentSchema) {
          throw new SessionContractError('SCHEMA_DRIFT', 'mixed Factory source schemas');
        }
        schemaVersion = currentSchema;
        assertSupportedSchemaMajor(schemaVersion);
        const filenameId = basename(source.locator, extname(source.locator));
        const currentId = value.sessionId ?? value.session_id ?? establishedId ?? filenameId;
        if (establishedId && establishedId !== currentId) {
          throw new SessionContractError('DUPLICATE_NATIVE_ID', 'Factory source changes session identity');
        }
        establishedId = currentId;
        for (const record of normalize([line], source).records) {
          if (outputIndex++ >= start) yield record;
        }
      }
      if (!sawRecord && !input.incompleteTail) {
        throw new SessionContractError('MALFORMED_SOURCE', 'Factory session source is empty');
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
    let input: BoundedJsonRecord[];
    let incompleteTail = false;
    if (source.locatorClass === 'factory-droid-jsonl') {
      const result = await readBoundedJsonLines({
        selectedPath: source.locator,
        allowedRoots: source.authorizedScope.allowedRoots,
      }, { consistency: 'provisional', limits: this.limits });
      input = result.records;
      incompleteTail = result.incompleteTail;
    } else {
      input = await this.remoteRecords(source);
    }
    if (input.length === 0 && !incompleteTail) {
      throw new SessionContractError('MALFORMED_SOURCE', 'Factory session source is empty');
    }
    const schemaVersion = declaredVersion(input);
    assertSupportedSchemaMajor(schemaVersion);
    const normalized = normalize(input, source);
    return {
      schemaVersion,
      consistency: normalized.complete && !incompleteTail ? 'complete' : 'provisional',
      records: normalized.records,
    };
  }

  private async remoteRecords(source: SelectedSource): Promise<BoundedJsonRecord[]> {
    const kind = source.locatorClass === 'factory-sessions-api'
      ? 'sessions-api'
      : source.locatorClass === 'factory-exec-stream'
        ? 'droid-exec'
        : undefined;
    if (!kind) throw new SessionContractError('UNSUPPORTED_OPERATION', 'unsupported Factory source class');
    const operation = kind === 'sessions-api' ? 'factory.sessions.read' : 'factory.exec.stream';
    if (source.authorizedScope.networkOperation !== operation
      || (source.authorizedScope.authorizedAccounts?.length ?? 0) === 0) {
      throw new SessionContractError(
        'OPERATION_NOT_AUTHORIZED',
        `Factory ${kind} requires explicit account and ${operation} authorization`,
      );
    }
    const transport = this.transports.find((candidate) => candidate.kind === kind);
    if (!transport) {
      throw new SessionContractError(
        'UNSUPPORTED_OPERATION',
        `Factory ${kind} capability was not negotiated`,
      );
    }
    const values = await transport.snapshot(source);
    if (values.length > (this.limits?.maxRecords ?? 1_000_000)) {
      throw new SessionContractError('RESOURCE_LIMIT_EXCEEDED', 'Factory remote record limit exceeded');
    }
    return values.map((value, sequence) => ({
      value, sequence, byteOffset: sequence, byteLength: Buffer.byteLength(JSON.stringify(value)),
    }));
  }
}

function normalize(
  input: BoundedJsonRecord[],
  source: SelectedSource,
): { records: ProviderRecord[]; complete: boolean } {
  const output: ProviderRecord[] = [];
  const filenameId = basename(source.locator, extname(source.locator));
  let complete = false;
  let establishedId: string | undefined;
  for (const line of input) {
    const parsed = FactoryRecordSchema.safeParse(line.value);
    if (!parsed.success) {
      throw new SessionContractError('MALFORMED_SOURCE', 'Factory session record is malformed');
    }
    const value = parsed.data;
    const nativeSessionId = value.sessionId ?? value.session_id ?? establishedId ?? filenameId;
    if (establishedId && nativeSessionId !== establishedId) {
      throw new SessionContractError('DUPLICATE_NATIVE_ID', 'Factory source changes session identity');
    }
    establishedId = nativeSessionId;
    complete ||= ['session_end', 'result'].includes(value.type)
      || ['completed', 'archived', 'deleted'].includes(value.status ?? '');
    const blocks = contentBlocks(value);
    if (blocks.length === 0) blocks.push({
      kind: value.type === 'settings' ? 'factory.settings' : `factory.${value.type}`,
      text: '',
      opaque: value.type !== 'settings',
      nativeId: undefined,
      unknownFields: {},
    });
    blocks.forEach((block, index) => output.push({
      nativeSessionId,
      nativeEventId: block.nativeId
        ?? (value.uuid ?? value.id ?? value.message?.id
          ? `${value.uuid ?? value.id ?? value.message?.id}:${index}`
          : undefined),
      sequence: line.sequence * 1_000 + index,
      kind: block.kind,
      role: value.message?.role,
      occurredAt: timestamp(value.timestamp ?? value.updatedAt ?? value.createdAt),
      text: block.text,
      rawReference: { locatorClass: source.locatorClass, offset: line.byteOffset },
      extensions: {
        subtype: value.subtype,
        parentUuid: value.parentUuid,
        productVersion: value.version ?? 'not-reported',
        lifecycle: complete ? lifecycle(value.status) : 'active',
        workspace: { cwdClass: value.cwd ? '<workspace>' : undefined },
        settings: value.sessionSettings ?? value.settings,
        opaque: block.opaque,
        provenance: {
          acquisition: source.locatorClass,
          schema: value.schemaVersion ?? FACTORY_SOURCE_SCHEMA_VERSION,
          apiNegotiated: source.locatorClass === 'factory-sessions-api',
          execNegotiated: source.locatorClass === 'factory-exec-stream',
        },
        unknownFields: {
          ...unknownFields(value, RECORD_KEYS),
          ...block.unknownFields,
        },
      },
    }));
  }
  return { records: output, complete };
}

function contentBlocks(value: FactoryRecord): Array<{
  kind: string;
  text: string;
  opaque: boolean;
  nativeId?: string;
  unknownFields: Record<string, unknown>;
}> {
  const content = value.message?.content ?? value.content;
  if (typeof content === 'string') {
    return [{ kind: 'message', text: content, opaque: false, unknownFields: {} }];
  }
  if (!Array.isArray(content)) return [];
  return content.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return { kind: 'factory.unknown-block', text: '', opaque: true, unknownFields: { value: item } };
    }
    const block = item as Record<string, unknown>;
    const type = typeof block.type === 'string' ? block.type : 'unknown';
    const nativeId = typeof block.id === 'string'
      ? block.id
      : typeof block.tool_use_id === 'string' ? block.tool_use_id : undefined;
    if (type === 'text') {
      return { kind: 'message', text: stringValue(block.text), opaque: false, nativeId,
        unknownFields: unknownFields(block, new Set(['type', 'id', 'text'])) };
    }
    if (type === 'reasoning' || type === 'thinking') {
      return { kind: 'reasoning', text: stringValue(block.text ?? block.thinking),
        opaque: false, nativeId, unknownFields: unknownFields(block, new Set(['type', 'id', 'text', 'thinking'])) };
    }
    if (type === 'tool_use') {
      return { kind: 'tool-call', text: stringValue(block.name), opaque: false, nativeId,
        unknownFields: unknownFields(block, new Set(['type', 'id', 'name', 'input'])) };
    }
    if (type === 'tool_result') {
      return { kind: 'tool-result', text: extractText(block.content), opaque: false, nativeId,
        unknownFields: unknownFields(block, new Set(['type', 'tool_use_id', 'content', 'is_error'])) };
    }
    if (type === 'image') {
      return { kind: 'image', text: '', opaque: true, nativeId,
        unknownFields: { mediaType: block.media_type ?? block.source } };
    }
    return { kind: `factory.${type}`, text: '', opaque: true, nativeId, unknownFields: { ...block } };
  });
}

async function* discoverJsonl(root: string, maxDepth: number): AsyncIterable<string> {
  const pending = [{ path: root, depth: 0 }];
  while (pending.length) {
    const current = pending.shift()!;
    let directory;
    try {
      directory = await opendir(current.path);
    } catch {
      throw new SessionContractError('SOURCE_NOT_AUTHORIZED', 'authorized Factory root is inaccessible');
    }
    const directories: string[] = [];
    const files: string[] = [];
    for await (const entry of directory) {
      const path = resolve(current.path, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory() && current.depth < maxDepth) directories.push(path);
      else if (entry.isFile() && entry.name.endsWith('.jsonl')) files.push(path);
    }
    for (const file of files.sort()) yield file;
    for (const path of directories.sort()) pending.push({ path, depth: current.depth + 1 });
  }
}

function declaredVersion(records: BoundedJsonRecord[]): string {
  const versions = new Set(records.flatMap((record) => {
    const value = asObject(record.value);
    return typeof value.schemaVersion === 'string' ? [value.schemaVersion] : [];
  }));
  if (versions.size > 1) throw new SessionContractError('SCHEMA_DRIFT', 'mixed Factory schema versions');
  return [...versions][0] ?? FACTORY_SOURCE_SCHEMA_VERSION;
}

function timestamp(value?: string | number): string | undefined {
  if (value === undefined) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function lifecycle(status?: string): string {
  if (status === 'archived') return 'archived';
  if (status === 'deleted') return 'deleted';
  return 'complete';
}

function extractText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!Array.isArray(value)) return '';
  return value.map((item) => stringValue(asObject(item).text)).filter(Boolean).join('\n');
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
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
  if (!/^\d+$/.test(value)) throw new SessionContractError('SCHEMA_DRIFT', 'invalid Factory cursor');
  return Number(value);
}

const RECORD_KEYS = new Set([
  'schemaVersion', 'type', 'subtype', 'uuid', 'id', 'parentUuid', 'sessionId',
  'session_id', 'timestamp', 'createdAt', 'updatedAt', 'cwd', 'version', 'message',
  'content', 'sessionSettings', 'settings', 'status',
]);
