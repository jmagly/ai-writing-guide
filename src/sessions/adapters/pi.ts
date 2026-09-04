import { opendir } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { z } from 'zod';
import {
  SessionContractError, type AuthorizedScope, type ImportCursor,
  type ProviderRecord, type SelectedSource, type SessionSourceAdapter,
  type SourceDescriptor, type SourceProbe,
} from '../contracts.js';
import { readBoundedJsonLines, streamBoundedJsonLines, type ReaderLimits } from '../readers.js';

export const PI_ADAPTER_VERSION = '1.0.0';
export const PI_SOURCE_SCHEMA_VERSION = '3.0.0';
const Header = z.object({ type: z.literal('session'), version: z.number().int(), id: z.string().min(1),
  timestamp: z.string().datetime({ offset: true }), cwd: z.string(), parentSession: z.string().optional() }).passthrough();
const Entry = z.object({ type: z.string().min(1), id: z.string().min(1),
  parentId: z.string().nullable(), timestamp: z.string().datetime({ offset: true }) }).passthrough();

export class PiSessionAdapter implements SessionSourceAdapter {
  readonly provider = 'pi' as const;
  readonly adapterVersion = PI_ADAPTER_VERSION;
  readonly disposition = 'implemented' as const;
  readonly supportedOperations = ['discover', 'inspect', 'stream'] as const;
  readonly acquisitionModes = ['jsonl'] as const;
  constructor(private readonly limits?: Partial<ReaderLimits>, private readonly maxFiles = 10_000) {}

  async *discover(scope: AuthorizedScope): AsyncIterable<SourceDescriptor> {
    if (!scope.allowedRoots.length) throw new SessionContractError('SOURCE_NOT_AUTHORIZED', 'Pi discovery requires an authorized sessions root');
    let count = 0;
    for (const root of [...scope.allowedRoots].sort()) {
      for await (const locator of jsonlFiles(resolve(root))) {
        if (++count > this.maxFiles) throw new SessionContractError('RESOURCE_LIMIT_EXCEEDED', 'Pi discovery file limit exceeded');
        yield { provider: 'pi', locator, locatorClass: 'pi-session-v3-jsonl' };
      }
    }
  }
  async inspect(source: SelectedSource): Promise<SourceProbe> {
    let input;
    try {
      input = await readBoundedJsonLines({ selectedPath: source.locator,
        allowedRoots: source.authorizedScope.allowedRoots }, { consistency: 'provisional', limits: this.limits });
    } catch (error) { throw normalizeAuthorizationError(error); }
    const header = parseHeader(input.records[0]?.value);
    if (input.incompleteTail) throw new SessionContractError('TRUNCATED_SOURCE', 'Pi session has a truncated JSONL tail');
    return { sourceSchemaVersion: `${header.version}.0.0`, consistency: 'complete', operationalState: 'available' };
  }
  async *stream(source: SelectedSource, cursor?: ImportCursor): AsyncIterable<ProviderRecord> {
    let input;
    try {
      input = await streamBoundedJsonLines({ selectedPath: source.locator,
        allowedRoots: source.authorizedScope.allowedRoots }, { cursor: cursor?.value, consistency: 'provisional', limits: this.limits });
    } catch (error) { throw normalizeAuthorizationError(error); }
    let sessionId = '';
    let index = 0;
    const ids = new Set<string>();
    for await (const line of input) {
      if (index++ === 0 && !cursor) { sessionId = parseHeader(line.value).id; continue; }
      if (!sessionId) sessionId = basename(source.locator, '.jsonl');
      const parsed = Entry.safeParse(line.value);
      if (!parsed.success) throw new SessionContractError('MALFORMED_SOURCE', 'Pi session entry is malformed');
      const entry = parsed.data as Record<string, unknown> & z.infer<typeof Entry>;
      if (ids.has(entry.id)) throw new SessionContractError('DUPLICATE_NATIVE_ID', 'Pi session contains a duplicate entry id');
      ids.add(entry.id);
      const message = object(entry.message);
      const role = string(message.role) ?? roleFor(entry.type);
      const sensitive = role === 'toolResult' || entry.type === 'custom';
      const text = sensitive ? '[redacted provider content]' : entryText(entry, message);
      yield { nativeSessionId: sessionId, nativeEventId: entry.id, sequence: line.sequence,
        kind: kindFor(entry.type, role), role, toolName: sensitive ? string(message.toolName) : undefined,
        toolCallId: sensitive ? string(message.toolCallId) : undefined,
        occurredAt: entry.timestamp, text, sourceCursor: String(line.byteOffset + line.byteLength),
        sourceBytes: line.byteLength, rawReference: { locatorClass: 'pi-session-v3-jsonl', offset: line.byteOffset },
        activityBoundary: entry.type === 'compaction' ? 'continuation' : undefined,
        activityBoundaryBasis: entry.type === 'compaction' ? 'pi-session:compaction' : undefined,
        activityBoundaryConfidence: entry.type === 'compaction' ? 'high' : undefined,
        extensions: { provenance: { acquisition: 'pi-session-v3', parentId: entry.parentId },
          opaque: !KNOWN.has(entry.type), redacted: sensitive,
          nativeType: entry.type, parentId: entry.parentId } };
    }
    if (input.incompleteTail) throw new SessionContractError('TRUNCATED_SOURCE', 'Pi session has a truncated JSONL tail');
  }
}

const KNOWN = new Set(['message', 'thinking_level_change', 'model_change', 'compaction',
  'branch_summary', 'custom', 'label', 'session_info', 'custom_message']);
function parseHeader(value: unknown) {
  const parsed = Header.safeParse(value);
  if (!parsed.success) throw new SessionContractError('MALFORMED_SOURCE', 'Pi session header is malformed');
  if (parsed.data.version !== 3) throw new SessionContractError('UNKNOWN_SCHEMA_MAJOR', `unsupported Pi session version: ${parsed.data.version}`);
  return parsed.data;
}
function object(value: unknown): Record<string, unknown> { return value && typeof value === 'object' ? value as Record<string, unknown> : {}; }
function string(value: unknown): string | undefined { return typeof value === 'string' && value ? value : undefined; }
function roleFor(type: string) { return type === 'compaction' || type === 'branch_summary' ? 'system' : undefined; }
function kindFor(type: string, role?: string) { return type === 'message' ? `message.${role ?? 'unknown'}` : `pi.${type}`; }
function entryText(entry: Record<string, unknown>, message: Record<string, unknown>): string {
  const value = entry.type === 'message' ? message.content : entry.summary ?? entry.name ?? entry.label ?? '';
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
    return new SessionContractError('SOURCE_NOT_AUTHORIZED', 'Pi source is not an authorized regular file');
  }
  return error;
}
