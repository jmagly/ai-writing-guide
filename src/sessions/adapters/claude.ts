import { opendir } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';
import { z } from 'zod';
import {
  SessionContractError,
  assertSupportedSchemaMajor,
  sha256,
  type AuthorizedScope,
  type ImportCursor,
  type ProviderRecord,
  type SelectedSource,
  type SessionSourceAdapter,
  type SourceDescriptor,
  type SourceProbe,
} from '../contracts.js';
import { redactSourceLocator } from '../discovery.js';
import {
  readBoundedJsonLines, streamBoundedJsonLines,
  type BoundedJsonRecord, type ReaderLimits,
} from '../readers.js';

export const CLAUDE_ADAPTER_VERSION = '1.0.0';
export const CLAUDE_TRANSCRIPT_SCHEMA_VERSION = '1.0.0';

const ClaudeRecordSchema = z.object({
  type: z.string().min(1),
  subtype: z.string().optional(),
  uuid: z.string().min(1).optional(),
  parentUuid: z.string().min(1).nullable().optional(),
  sessionId: z.string().min(1).optional(),
  session_id: z.string().min(1).optional(),
  timestamp: z.string().datetime({ offset: true }).optional(),
  cwd: z.string().optional(),
  gitBranch: z.string().optional(),
  version: z.string().optional(),
  schemaVersion: z.string().optional(),
  message: z.object({
    id: z.string().min(1).optional(),
    role: z.string().min(1).optional(),
    content: z.union([z.string(), z.array(z.unknown())]).optional(),
  }).passthrough().optional(),
}).passthrough();

const ClaudeHookSchema = z.object({
  session_id: z.string().min(1),
  transcript_path: z.string().min(1),
  cwd: z.string().min(1),
  hook_event_name: z.string().min(1),
  permission_mode: z.string().optional(),
  source: z.enum(['startup', 'resume', 'clear', 'compact']).optional(),
  model: z.string().optional(),
  reason: z.string().optional(),
  schemaVersion: z.string().optional(),
  timestamp: z.string().datetime({ offset: true }).optional(),
}).passthrough();

type ClaudeRecord = z.infer<typeof ClaudeRecordSchema>;
type ClaudeHook = z.infer<typeof ClaudeHookSchema>;

export class ClaudeSessionAdapter implements SessionSourceAdapter {
  readonly provider = 'claude' as const;
  readonly adapterVersion = CLAUDE_ADAPTER_VERSION;
  readonly disposition = 'implemented' as const;
  readonly supportedOperations = ['discover', 'inspect', 'stream'] as const;
  readonly acquisitionModes = ['jsonl', 'hook'] as const;

  constructor(
    private readonly limits?: Partial<ReaderLimits>,
    private readonly discoveryLimits = { maxDepth: 8, maxFiles: 10_000 },
  ) {}

  async *discover(scope: AuthorizedScope): AsyncIterable<SourceDescriptor> {
    if (scope.allowedRoots.length === 0) {
      throw new SessionContractError(
        'SOURCE_NOT_AUTHORIZED',
        'Claude discovery requires an explicitly authorized projects or hook root',
      );
    }
    let emitted = 0;
    for (const root of [...scope.allowedRoots].sort()) {
      for await (const locator of discoverJsonl(resolve(root), this.discoveryLimits.maxDepth)) {
        emitted += 1;
        if (emitted > this.discoveryLimits.maxFiles) {
          throw new SessionContractError(
            'RESOURCE_LIMIT_EXCEEDED',
            'Claude source discovery exceeded the authorized file limit',
          );
        }
        yield {
          provider: 'claude',
          locator,
          locatorClass: isHookLocator(locator) ? 'claude-hook-jsonl' : 'claude-transcript-jsonl',
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
    const start = parseRecordCursor(cursor?.value);
    const input = await streamBoundedJsonLines(
      {
        selectedPath: source.locator,
        allowedRoots: source.authorizedScope.allowedRoots,
      },
      { consistency: 'provisional', limits: this.limits },
    );
    const hookSource = isHookLocator(source.locator);
    let outputIndex = 0;
    let sawRecord = false;
    let schemaVersion: string | null = null;
    for await (const line of input) {
      sawRecord = true;
      const value = line.value as Record<string, unknown>;
      const currentSchema = typeof value.schemaVersion === 'string'
        ? value.schemaVersion : CLAUDE_TRANSCRIPT_SCHEMA_VERSION;
      if (schemaVersion && currentSchema !== schemaVersion) {
        throw new SessionContractError('SCHEMA_DRIFT', 'Claude source declares mixed schema versions');
      }
      schemaVersion = currentSchema;
      assertSupportedSchemaMajor(schemaVersion);
      const normalized = hookSource || isHookRecord(line.value)
        ? normalizeHooks([line]).records
        : normalizeTranscript([line], source.locator).records;
      for (const record of normalized) {
        if (outputIndex++ >= start) yield record;
      }
    }
    if (!sawRecord && !input.incompleteTail) {
      throw new SessionContractError('MALFORMED_SOURCE', 'Claude JSONL source is empty');
    }
  }

  private async readSource(source: SelectedSource): Promise<{
    records: ProviderRecord[];
    schemaVersion: string;
    consistency: 'provisional' | 'complete';
  }> {
    const result = await readBoundedJsonLines(
      {
        selectedPath: source.locator,
        allowedRoots: source.authorizedScope.allowedRoots,
      },
      { consistency: 'provisional', limits: this.limits },
    );
    if (result.records.length === 0 && !result.incompleteTail) {
      throw new SessionContractError('MALFORMED_SOURCE', 'Claude JSONL source is empty');
    }
    const hookSource = isHookLocator(source.locator)
      || result.records.some((record) => isHookRecord(record.value));
    const normalized = hookSource
      ? normalizeHooks(result.records)
      : normalizeTranscript(result.records, source.locator);
    const schemaVersion = declaredSchemaVersion(result.records);
    assertSupportedSchemaMajor(schemaVersion);
    return {
      records: normalized.records,
      schemaVersion,
      consistency: normalized.complete ? 'complete' : 'provisional',
    };
  }
}

function normalizeTranscript(
  records: BoundedJsonRecord[],
  locator: string,
): { records: ProviderRecord[]; complete: false } {
  const filenameSessionId = basename(locator, extname(locator));
  const output: ProviderRecord[] = [];
  for (const record of records) {
    const parsed = ClaudeRecordSchema.safeParse(record.value);
    if (!parsed.success) {
      throw new SessionContractError('MALFORMED_SOURCE', 'Claude transcript record is malformed');
    }
    const value = parsed.data;
    const nativeSessionId = value.sessionId ?? value.session_id ?? filenameSessionId;
    if ((value.sessionId || value.session_id) && nativeSessionId !== filenameSessionId) {
      throw new SessionContractError(
        'SCHEMA_DRIFT',
        'Claude transcript session identity differs from its documented filename identity',
      );
    }
    const blocks = messageBlocks(value);
    if (blocks.length === 0) {
      output.push(providerRecord(value, record, nativeSessionId, {
        kind: `claude.${value.type}`,
        text: '',
        opaque: true,
        unknownFields: unknownFields(value, TRANSCRIPT_KEYS),
      }));
      continue;
    }
    for (const [blockIndex, block] of blocks.entries()) {
      output.push(providerRecord(value, record, nativeSessionId, {
        kind: block.kind,
        text: block.text,
        blockIndex,
        blockNativeId: block.nativeId,
        opaque: block.opaque,
        unknownFields: block.unknownFields,
      }));
    }
  }
  return { records: output, complete: false };
}

function normalizeHooks(
  records: BoundedJsonRecord[],
): { records: ProviderRecord[]; complete: boolean } {
  const output: ProviderRecord[] = [];
  let complete = false;
  for (const record of records) {
    const parsed = ClaudeHookSchema.safeParse(record.value);
    if (!parsed.success) {
      throw new SessionContractError('MALFORMED_SOURCE', 'Claude lifecycle hook record is malformed');
    }
    const hook = parsed.data;
    complete ||= hook.hook_event_name === 'SessionEnd';
    output.push({
      nativeSessionId: hook.session_id,
      nativeEventId: hookNativeId(hook, record.sequence),
      sequence: record.sequence,
      kind: 'lifecycle-hook',
      role: 'system',
      participant: 'claude',
      model: hook.model,
      occurredAt: hook.timestamp,
      text: '',
      rawReference: { locatorClass: 'claude-hook-jsonl', offset: record.byteOffset },
      extensions: {
        hookEventName: hook.hook_event_name,
        lifecycle: hook.hook_event_name === 'SessionEnd' ? 'complete' : 'active',
        startSource: hook.source,
        model: hook.model,
        reason: hook.reason,
        permissionMode: hook.permission_mode,
        workspace: { cwdClass: '<workspace>', transcript: redactSourceLocator(hook.transcript_path) },
        provenance: { acquisition: 'claude-hook', schema: CLAUDE_TRANSCRIPT_SCHEMA_VERSION },
        unknownFields: unknownFields(hook, HOOK_KEYS),
      },
    });
  }
  return { records: output, complete };
}

function providerRecord(
  value: ClaudeRecord,
  record: BoundedJsonRecord,
  nativeSessionId: string,
  block: {
    kind: string;
    text: string;
    blockIndex?: number;
    blockNativeId?: string;
    opaque: boolean;
    unknownFields: Record<string, unknown>;
  },
): ProviderRecord {
  const nativeBase = value.uuid ?? value.message?.id;
  const nativeEventId = block.blockNativeId
    ?? (nativeBase ? `${nativeBase}:${block.blockIndex ?? 0}` : undefined);
  return {
    nativeSessionId,
    nativeEventId,
    sequence: record.sequence * 1_000 + (block.blockIndex ?? 0),
    kind: block.kind,
    role: value.message?.role,
    occurredAt: value.timestamp,
    text: block.text,
    rawReference: { locatorClass: 'claude-transcript-jsonl', offset: record.byteOffset },
    extensions: {
      transcriptType: value.type,
      transcriptSubtype: value.subtype,
      parentUuid: value.parentUuid,
      productVersion: value.version,
      workspace: { cwdClass: value.cwd ? '<workspace>' : undefined, gitBranch: value.gitBranch },
      provenance: { acquisition: 'claude-transcript', schema: CLAUDE_TRANSCRIPT_SCHEMA_VERSION },
      opaque: block.opaque,
      unknownFields: {
        ...unknownFields(value, TRANSCRIPT_KEYS),
        ...block.unknownFields,
      },
    },
  };
}

function messageBlocks(value: ClaudeRecord): Array<{
  kind: string;
  text: string;
  nativeId?: string;
  opaque: boolean;
  unknownFields: Record<string, unknown>;
}> {
  const content = value.message?.content;
  if (typeof content === 'string') {
    return [{ kind: 'message', text: content, opaque: false, unknownFields: {} }];
  }
  if (!Array.isArray(content)) return [];
  return content.map((input) => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return { kind: 'claude.unknown-block', text: '', opaque: true, unknownFields: { value: input } };
    }
    const block = input as Record<string, unknown>;
    const type = typeof block.type === 'string' ? block.type : 'unknown';
    if (type === 'text' && typeof block.text === 'string') {
      return {
        kind: 'message', text: block.text, opaque: false,
        unknownFields: unknownFields(block, new Set(['type', 'text'])),
      };
    }
    if (type === 'tool_use') {
      return {
        kind: 'tool-call',
        text: typeof block.name === 'string' ? block.name : '',
        nativeId: typeof block.id === 'string' ? block.id : undefined,
        opaque: false,
        unknownFields: unknownFields(block, new Set(['type', 'id', 'name', 'input'])),
      };
    }
    if (type === 'tool_result') {
      return {
        kind: 'tool-result',
        text: extractToolResultText(block.content),
        nativeId: typeof block.tool_use_id === 'string' ? block.tool_use_id : undefined,
        opaque: false,
        unknownFields: unknownFields(block, new Set(['type', 'tool_use_id', 'content', 'is_error'])),
      };
    }
    return {
      kind: `claude.${type}`,
      text: '',
      opaque: true,
      unknownFields: { ...block },
    };
  });
}

function extractToolResultText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!Array.isArray(value)) return '';
  return value
    .filter((item): item is Record<string, unknown> =>
      Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    .map((item) => typeof item.text === 'string' ? item.text : '')
    .filter(Boolean)
    .join('\n');
}

async function* discoverJsonl(root: string, maxDepth: number): AsyncIterable<string> {
  const pending: Array<{ path: string; depth: number }> = [{ path: root, depth: 0 }];
  while (pending.length > 0) {
    const current = pending.shift()!;
    let directory;
    try {
      directory = await opendir(current.path);
    } catch {
      throw new SessionContractError('SOURCE_NOT_AUTHORIZED', 'authorized Claude source root is inaccessible');
    }
    const childDirectories: string[] = [];
    const files: string[] = [];
    for await (const entry of directory) {
      const path = resolve(current.path, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory() && current.depth < maxDepth) childDirectories.push(path);
      else if (entry.isFile() && entry.name.endsWith('.jsonl')) files.push(path);
    }
    for (const file of files.sort()) yield file;
    for (const path of childDirectories.sort()) pending.push({ path, depth: current.depth + 1 });
  }
}

function declaredSchemaVersion(records: BoundedJsonRecord[]): string {
  const declared = records
    .map((record) => {
      if (!record.value || typeof record.value !== 'object' || Array.isArray(record.value)) return undefined;
      return (record.value as Record<string, unknown>).schemaVersion;
    })
    .find((value): value is string => typeof value === 'string');
  return declared ?? CLAUDE_TRANSCRIPT_SCHEMA_VERSION;
}

function parseRecordCursor(value?: string): number {
  if (value === undefined || value === '') return 0;
  if (!/^\d+$/.test(value)) throw new SessionContractError('SCHEMA_DRIFT', 'Claude record cursor is invalid');
  return Number(value);
}

function hookNativeId(hook: ClaudeHook, sequence: number): string {
  return sha256([
    hook.session_id, hook.hook_event_name, hook.source ?? '',
    hook.timestamp ?? '', hook.reason ?? '', sequence,
  ].join('\0'));
}

function isHookLocator(locator: string): boolean {
  return /\.hooks?\.jsonl$/i.test(locator);
}

function isHookRecord(value: unknown): boolean {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
    && typeof (value as Record<string, unknown>).hook_event_name === 'string';
}

function unknownFields(
  value: Record<string, unknown>,
  known: ReadonlySet<string>,
): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !known.has(key)));
}

const TRANSCRIPT_KEYS = new Set([
  'type', 'subtype', 'uuid', 'parentUuid', 'sessionId', 'session_id',
  'timestamp', 'cwd', 'gitBranch', 'version', 'schemaVersion', 'message',
]);
const HOOK_KEYS = new Set([
  'session_id', 'transcript_path', 'cwd', 'hook_event_name', 'permission_mode',
  'source', 'model', 'reason', 'schemaVersion', 'timestamp',
]);
