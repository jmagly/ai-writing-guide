import { opendir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
import {
  SessionContractError, type AuthorizedScope, type ImportCursor,
  type ProviderRecord, type SelectedSource, type SessionSourceAdapter,
  type SourceDescriptor, type SourceProbe,
} from '../contracts.js';
import { readBoundedJsonLines, streamBoundedJsonLines, type ReaderLimits } from '../readers.js';

export const DEEPSEEK_HARNESS_ADAPTER_VERSION = '1.0.0';
export const DEEPSEEK_HARNESS_SOURCE_SCHEMA_VERSION = '2.0.0';

const Header = z.object({
  type: z.literal('session'), version: z.number().int(), id: z.string().min(1),
  createdAt: z.number().finite(), cwd: z.string().optional(), parentSession: z.string().optional(),
  isSeeded: z.boolean(), origin: z.literal('subagent').optional(),
  delegationDepth: z.number().int().nonnegative(), agentPreset: z.string().optional(),
}).passthrough();
const Event = z.object({
  type: z.string().min(1), seq: z.number().int().nonnegative(), time: z.number().finite(),
  data: z.unknown(),
}).passthrough();

const KNOWN = new Set([
  'turn/start', 'user/message', 'step/start', 'assistant/message', 'tool/call',
  'tool/result', 'request/header', 'request/context', 'session/end-seed',
  'step/end', 'turn/end',
]);

export class DeepSeekHarnessSessionAdapter implements SessionSourceAdapter {
  readonly provider = 'deepseek-harness' as const;
  readonly adapterVersion = DEEPSEEK_HARNESS_ADAPTER_VERSION;
  readonly disposition = 'implemented' as const;
  readonly supportedOperations = ['discover', 'inspect', 'stream'] as const;
  readonly acquisitionModes = ['jsonl'] as const;
  constructor(private readonly limits?: Partial<ReaderLimits>, private readonly maxFiles = 10_000) {}

  async *discover(scope: AuthorizedScope): AsyncIterable<SourceDescriptor> {
    if (!scope.allowedRoots.length) throw new SessionContractError('SOURCE_NOT_AUTHORIZED', 'DeepSeek Harness discovery requires an explicitly authorized sessions root');
    let count = 0;
    for (const root of [...scope.allowedRoots].sort()) {
      for await (const locator of jsonlFiles(resolve(root))) {
        if (++count > this.maxFiles) throw new SessionContractError('RESOURCE_LIMIT_EXCEEDED', 'DeepSeek Harness discovery file limit exceeded');
        yield { provider: this.provider, locator, locatorClass: 'deepseek-harness-session-v2-jsonl' };
      }
    }
  }

  async inspect(source: SelectedSource): Promise<SourceProbe> {
    let input;
    try {
      input = await readBoundedJsonLines({ selectedPath: source.locator, allowedRoots: source.authorizedScope.allowedRoots }, { consistency: 'provisional', limits: this.limits });
    } catch (error) { throw normalizeAuthorizationError(error); }
    const header = parseHeader(input.records[0]?.value);
    if (input.incompleteTail) throw new SessionContractError('TRUNCATED_SOURCE', 'DeepSeek Harness session has a truncated JSONL tail');
    return { sourceSchemaVersion: `${header.version}.0.0`, consistency: 'complete', operationalState: 'available' };
  }

  async *stream(source: SelectedSource, cursor?: ImportCursor): AsyncIterable<ProviderRecord> {
    let input;
    try {
      input = await streamBoundedJsonLines({ selectedPath: source.locator, allowedRoots: source.authorizedScope.allowedRoots }, { consistency: 'provisional', limits: this.limits });
    } catch (error) { throw normalizeAuthorizationError(error); }
    const start = cursor?.value.replace(/^byte:/, '') ?? '0';
    if (!/^\d+$/.test(start)) throw new SessionContractError('SCHEMA_DRIFT', 'invalid DeepSeek Harness cursor');
    let header: z.infer<typeof Header> | undefined;
    let expectedSeq = 0;
    let end = 0;
    for await (const line of input) {
      end = line.byteOffset + line.byteLength;
      if (Number(start) > line.byteOffset && Number(start) < end) throw new SessionContractError('SCHEMA_DRIFT', 'DeepSeek Harness cursor is not a record boundary');
      if (!header) { header = parseHeader(line.value); continue; }
      const parsed = Event.safeParse(line.value);
      if (!parsed.success) throw new SessionContractError('MALFORMED_SOURCE', 'DeepSeek Harness session event is malformed');
      const event = parsed.data;
      if (event.seq !== expectedSeq) throw new SessionContractError(event.seq < expectedSeq ? 'DUPLICATE_NATIVE_ID' : 'SCHEMA_DRIFT', `DeepSeek Harness sequence expected ${expectedSeq}, received ${event.seq}`);
      expectedSeq++;
      if (end <= Number(start)) continue;
      const data = object(event.data);
      const message = object(data.message ?? event.data);
      const sensitive = isSensitive(event.type);
      const source = object(message.source);
      const role = event.type === 'user/message' ? 'user' : event.type === 'assistant/message' ? 'assistant' : undefined;
      const text = sensitive ? '[redacted provider content]' : textContent(message.content ?? data.content);
      const terminal = event.type === 'turn/end';
      yield {
        nativeSessionId: header.id,
        nativeEventId: `${header.id}:${event.seq}`,
        sequence: event.seq,
        kind: kindFor(event.type, role),
        role,
        toolName: event.type.startsWith('tool/') ? string(data.name) ?? string(data.toolName) : undefined,
        toolCallId: event.type.startsWith('tool/') ? string(data.id) ?? string(data.toolCallId) : undefined,
        model: string(source.model) ?? string(data.model),
        occurredAt: new Date(event.time).toISOString(),
        text,
        sourceCursor: `byte:${end}`,
        sourceBytes: line.byteLength,
        rawReference: { locatorClass: 'deepseek-harness-session-v2-jsonl', offset: line.byteOffset },
        activityBoundary: terminal ? 'end' : undefined,
        activityBoundaryBasis: terminal ? 'deepseek-harness:turn/end' : undefined,
        activityBoundaryConfidence: terminal ? 'high' : undefined,
        extensions: {
          provenance: { acquisition: 'deepseek-harness-session-v2', cwd: header.cwd, parentSession: header.parentSession, origin: header.origin },
          opaque: !KNOWN.has(event.type), redacted: sensitive, nativeType: event.type,
          turn: integer(data.turn), step: integer(data.step), delegationDepth: header.delegationDepth,
          agentPreset: header.agentPreset, provider: string(source.provider), model: string(source.model),
        },
      };
    }
    if (!header) throw new SessionContractError('MALFORMED_SOURCE', 'DeepSeek Harness session header is missing');
    if (Number(start) > end) throw new SessionContractError('SCHEMA_DRIFT', 'DeepSeek Harness cursor exceeds source size');
    if (input.incompleteTail) throw new SessionContractError('TRUNCATED_SOURCE', 'DeepSeek Harness session has a truncated JSONL tail');
  }
}

function parseHeader(value: unknown) {
  const parsed = Header.safeParse(value);
  if (!parsed.success) throw new SessionContractError('MALFORMED_SOURCE', 'DeepSeek Harness session header is malformed');
  if (parsed.data.version !== 2) throw new SessionContractError('UNKNOWN_SCHEMA_MAJOR', `unsupported DeepSeek Harness session version: ${parsed.data.version}`);
  return parsed.data;
}
function isSensitive(type: string) { return !KNOWN.has(type) || type === 'tool/call' || type === 'tool/result' || type === 'request/header' || type === 'request/context'; }
function kindFor(type: string, role?: string) { return role ? `message.${role}` : `deepseek-harness.${type}`; }
function object(value: unknown): Record<string, unknown> { return value && typeof value === 'object' ? value as Record<string, unknown> : {}; }
function string(value: unknown): string | undefined { return typeof value === 'string' && value ? value : undefined; }
function integer(value: unknown): number | undefined { return Number.isInteger(value) ? value as number : undefined; }
function textContent(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!Array.isArray(value)) return '';
  return value.flatMap(part => {
    if (typeof part === 'string') return part;
    const item = object(part);
    return item.type === 'text' && typeof item.text === 'string' ? item.text : [];
  }).join('\n');
}
async function* jsonlFiles(root: string): AsyncGenerator<string> {
  let directory;
  try { directory = await opendir(root); } catch { return; }
  for await (const entry of directory) {
    const path = resolve(root, entry.name);
    if (entry.isDirectory()) yield* jsonlFiles(path);
    else if (entry.isFile() && entry.name.endsWith('.jsonl') && !entry.name.endsWith('.jsonl.zstd')) yield path;
  }
}
function normalizeAuthorizationError(error: unknown): unknown {
  if (error instanceof SessionContractError && ['SOURCE_OUTSIDE_ALLOWED_ROOT', 'SOURCE_SYMLINK', 'SOURCE_NOT_REGULAR_FILE'].includes(error.code)) {
    return new SessionContractError('SOURCE_NOT_AUTHORIZED', 'DeepSeek Harness source is not an authorized regular file');
  }
  return error;
}
