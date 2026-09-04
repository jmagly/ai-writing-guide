import { opendir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
import {
  SessionContractError, type AuthorizedScope, type ImportCursor,
  type ProviderRecord, type SelectedSource, type SessionSourceAdapter,
  type SourceDescriptor, type SourceProbe,
} from '../contracts.js';
import { readBoundedJsonLines, streamBoundedJsonLines, type ReaderLimits } from '../readers.js';

export const OMP_ADAPTER_VERSION = '1.0.0';
export const OMP_SOURCE_SCHEMA_VERSION = '3.0.0';
const Title = z.object({ type: z.literal('title'), v: z.literal(1), title: z.string(), source: z.enum(['auto', 'user']).optional(), updatedAt: z.string(), pad: z.string() });
const Header = z.object({ type: z.literal('session'), version: z.number().int(), id: z.string().min(1),
  timestamp: z.string().datetime({ offset: true }), cwd: z.string(), parentSession: z.string().optional() }).passthrough();
const Entry = z.object({ type: z.string().min(1), id: z.string().min(1),
  parentId: z.string().nullable(), timestamp: z.string().datetime({ offset: true }) }).passthrough();

export class OmpSessionAdapter implements SessionSourceAdapter {
  readonly provider = 'omp' as const;
  readonly sourceSchemaMajor = 3;
  readonly adapterVersion = OMP_ADAPTER_VERSION;
  readonly disposition = 'implemented' as const;
  readonly supportedOperations = ['discover', 'inspect', 'stream'] as const;
  readonly acquisitionModes = ['jsonl'] as const;
  constructor(private readonly limits?: Partial<ReaderLimits>, private readonly maxFiles = 10_000) {}

  async *discover(scope: AuthorizedScope): AsyncIterable<SourceDescriptor> {
    if (!scope.allowedRoots.length) throw new SessionContractError('SOURCE_NOT_AUTHORIZED', 'OMP discovery requires an authorized sessions root');
    let count = 0;
    for (const root of [...scope.allowedRoots].sort()) {
      for await (const locator of jsonlFiles(resolve(root))) {
        if (++count > this.maxFiles) throw new SessionContractError('RESOURCE_LIMIT_EXCEEDED', 'OMP discovery file limit exceeded');
        yield { provider: 'omp', locator, locatorClass: 'omp-session-v3-jsonl' };
      }
    }
  }
  async inspect(source: SelectedSource): Promise<SourceProbe> {
    let input;
    try {
      input = await readBoundedJsonLines({ selectedPath: source.locator,
        allowedRoots: source.authorizedScope.allowedRoots }, { consistency: 'provisional', limits: this.limits });
    } catch (error) { throw normalizeAuthorizationError(error); }
    const header = parseHeader(input.records[titleOffset(input.records[0]) ? 1 : 0]?.value);
    if (input.incompleteTail) throw new SessionContractError('TRUNCATED_SOURCE', 'OMP session has a truncated JSONL tail');
    return { sourceSchemaVersion: `${header.version}.0.0`, consistency: 'complete', operationalState: 'available' };
  }
  async *stream(source: SelectedSource, cursor?: ImportCursor): AsyncIterable<ProviderRecord> {
    let input;
    try {
      input = await streamBoundedJsonLines({ selectedPath: source.locator,
        allowedRoots: source.authorizedScope.allowedRoots }, { consistency: 'provisional', limits: this.limits });
    } catch (error) { throw normalizeAuthorizationError(error); }
    let sessionId = '';
    let header: Record<string, unknown> = {};
    let prefix = true;
    const start = cursor?.value.replace(/^byte:/, '') ?? '0';
    if (!/^\d+$/.test(start)) throw new SessionContractError('SCHEMA_DRIFT', 'invalid OMP cursor');
    let end = 0;
    const ids = new Set<string>();
    for await (const line of input) {
      end = line.byteOffset + line.byteLength;
      if (Number(start) > line.byteOffset && Number(start) < end) {
        throw new SessionContractError('SCHEMA_DRIFT', 'OMP cursor is not a record boundary');
      }
      if (prefix) { prefix = false; if (titleOffset(line)) continue; }
      if (!sessionId) { header = parseHeader(line.value); sessionId = String(header.id); continue; }
      const parsed = Entry.safeParse(line.value);
      if (!parsed.success) throw new SessionContractError('MALFORMED_SOURCE', 'OMP session entry is malformed');
      const entry = parsed.data as Record<string, unknown> & z.infer<typeof Entry>;
      if (ids.has(entry.id)) throw new SessionContractError('DUPLICATE_NATIVE_ID', 'OMP session contains a duplicate entry id');
      ids.add(entry.id);
      if (end <= Number(start)) continue;
      const message = object(entry.message);
      const role = string(message.role) ?? roleFor(entry.type);
      const sensitive = role === 'toolResult' || ['custom', 'custom_message', 'session_init', 'credential_pin'].includes(entry.type) || !KNOWN.has(entry.type);
      const text = sensitive ? '[redacted provider content]' : entryText(entry, message);
      yield { nativeSessionId: sessionId, nativeEventId: entry.id, sequence: line.sequence,
        kind: kindFor(entry.type, role), role, toolName: sensitive ? string(message.toolName) : undefined,
        toolCallId: sensitive ? string(message.toolCallId) : undefined,
        occurredAt: entry.timestamp, text, model: string(entry.model) ?? string(message.model), sourceCursor: `byte:${end}`,
        sourceBytes: line.byteLength, rawReference: { locatorClass: 'omp-session-v3-jsonl', offset: line.byteOffset },
        activityBoundary: entry.type === 'compaction' ? 'continuation' : undefined,
        activityBoundaryBasis: entry.type === 'compaction' ? 'pi-session:compaction' : undefined,
        activityBoundaryConfidence: entry.type === 'compaction' ? 'high' : undefined,
        extensions: { provenance: { acquisition: 'omp-session-v3', parentId: entry.parentId, parentSession: header.parentSession, previousSessionFiles: header.previousSessionFiles, cwd: header.cwd, additionalDirectories: header.additionalDirectories },
          opaque: !KNOWN.has(entry.type), redacted: sensitive,
          nativeType: entry.type, parentId: entry.parentId, ...metadata(entry, message) } };
    }
    if (!sessionId) throw new SessionContractError('MALFORMED_SOURCE', 'OMP session header is missing');
    if (Number(start) > end) throw new SessionContractError('SCHEMA_DRIFT', 'OMP cursor exceeds source size');
    if (input.incompleteTail) throw new SessionContractError('TRUNCATED_SOURCE', 'OMP session has a truncated JSONL tail');
  }
  async mutablePrefixBytes(source: SelectedSource): Promise<number> {
    const input = await streamBoundedJsonLines({ selectedPath: source.locator, allowedRoots: source.authorizedScope.allowedRoots }, { consistency: 'provisional', limits: this.limits });
    for await (const line of input) return titleOffset(line);
    return 0;
  }
}

const KNOWN = new Set(['message', 'thinking_level_change', 'model_change', 'compaction',
  'branch_summary', 'custom', 'label', 'session_info', 'custom_message', 'model_usage', 'title_change', 'service_tier_change', 'reset_boundary', 'ttsr_injection', 'credential_pin', 'session_init', 'mode_change']);
function parseHeader(value: unknown) {
  const parsed = Header.safeParse(value);
  if (!parsed.success) throw new SessionContractError('MALFORMED_SOURCE', 'OMP session header is malformed');
  if (parsed.data.version !== 3) throw new SessionContractError('UNKNOWN_SCHEMA_MAJOR', `unsupported OMP session version: ${parsed.data.version}`);
  return parsed.data;
}
function object(value: unknown): Record<string, unknown> { return value && typeof value === 'object' ? value as Record<string, unknown> : {}; }
function string(value: unknown): string | undefined { return typeof value === 'string' && value ? value : undefined; }
function roleFor(type: string) { return type === 'compaction' || type === 'branch_summary' ? 'system' : undefined; }
function kindFor(type: string, role?: string) { return type === 'message' ? `message.${role ?? 'unknown'}` : `omp.${type}`; }
function entryText(entry: Record<string, unknown>, message: Record<string, unknown>): string {
  const value = entry.type === 'message' ? message.content : entry.summary ?? entry.title ?? entry.name ?? entry.label ?? '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.flatMap(part => typeof part === 'string' ? part : string(object(part).text) ?? []).join('\n');
  return '';
}
async function* jsonlFiles(root: string): AsyncGenerator<string> {
  let directory;
  try { directory = await opendir(root); } catch { return; }
  for await (const entry of directory) {
    const path = resolve(root, entry.name);
    if (entry.isDirectory()) yield* jsonlFiles(path);
    else if (entry.isFile() && entry.name.endsWith('.jsonl')) yield path;
  }
}
function normalizeAuthorizationError(error: unknown): unknown {
  if (error instanceof SessionContractError && (error.code === 'SOURCE_OUTSIDE_ALLOWED_ROOT'
    || error.code === 'SOURCE_SYMLINK' || error.code === 'SOURCE_NOT_REGULAR_FILE')) {
    return new SessionContractError('SOURCE_NOT_AUTHORIZED', 'OMP source is not an authorized regular file');
  }
  return error;
}

function titleOffset(line?: { value: unknown; byteLength: number }): number {
  if (object(line?.value).type !== 'title') return 0;
  if (!Title.safeParse(line?.value).success || line?.byteLength !== 256) {
    throw new SessionContractError('MALFORMED_SOURCE', 'OMP title slot is malformed');
  }
  return 256;
}
function metadata(entry: Record<string, unknown>, message: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of ['fromId', 'firstKeptEntryId', 'providerReplayThroughEntryId', 'tokensBefore', 'tokensAfter', 'method', 'role', 'resolvedModelIsFallback', 'purpose', 'provider', 'api', 'stopReason']) {
    if (['string', 'number', 'boolean'].includes(typeof entry[key])) result[key] = entry[key];
  }
  const usage = object(entry.usage ?? message.usage);
  const numbers = Object.fromEntries(Object.entries(usage).filter(([, v]) => typeof v === 'number' && Number.isFinite(v)));
  const cost = Object.fromEntries(Object.entries(object(usage.cost)).filter(([, v]) => typeof v === 'number' && Number.isFinite(v)));
  if (Object.keys(numbers).length || Object.keys(cost).length) result.usage = { ...numbers, cost };
  return result;
}

/** Read only the bounded native preamble; never infer OMP from version alone. */
export async function readOmpSessionHeader(source: SelectedSource) {
  const input = await streamBoundedJsonLines({ selectedPath: source.locator, allowedRoots: source.authorizedScope.allowedRoots }, { consistency: 'provisional', limits: { maxRecords: 2, maxRecordBytes: 1024 * 1024 } });
  let first = true;
  for await (const line of input) {
    if (first) { first = false; if (titleOffset(line)) continue; }
    return parseHeader(line.value);
  }
  throw new SessionContractError('MALFORMED_SOURCE', 'OMP header is missing');
}
