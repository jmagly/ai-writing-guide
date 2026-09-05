import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { open, readFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { SessionContractError, type ConsistencyStateSchema } from './contracts.js';
import { authorizeSourceFile, type SourceAuthorization } from './policy.js';
import type { z } from 'zod';

export interface ReaderLimits {
  maxRecords: number;
  maxRecordBytes: number;
  maxTotalBytes: number;
  maxNestingDepth: number;
}
export interface BoundedJsonRecord {
  value: unknown;
  sequence: number;
  byteOffset: number;
  byteLength: number;
}
export interface BoundedReadResult {
  records: BoundedJsonRecord[];
  nextCursor: string;
  consistency: z.infer<typeof ConsistencyStateSchema>;
  incompleteTail: boolean;
  bytesRead: number;
}

export interface BoundedJsonLineStream extends AsyncIterable<BoundedJsonRecord> {
  readonly nextCursor: string;
  readonly consistency: z.infer<typeof ConsistencyStateSchema>;
  readonly incompleteTail: boolean;
  readonly bytesRead: number;
  readonly recordsRead: number;
}

export const DEFAULT_READER_LIMITS: ReaderLimits = Object.freeze({
  maxRecords: 1_000_000,
  maxRecordBytes: 8 * 1024 * 1024,
  maxTotalBytes: 1024 * 1024 * 1024,
  maxNestingDepth: 64,
});

export async function readBoundedJsonLines(
  authorization: SourceAuthorization,
  options: {
    cursor?: string;
    consistency: z.infer<typeof ConsistencyStateSchema>;
    limits?: Partial<ReaderLimits>;
  },
): Promise<BoundedReadResult> {
  const stream = await streamBoundedJsonLines(authorization, options);
  const records: BoundedJsonRecord[] = [];
  for await (const record of stream) records.push(record);
  return {
    records,
    nextCursor: stream.nextCursor,
    consistency: stream.consistency,
    incompleteTail: stream.incompleteTail,
    bytesRead: stream.bytesRead,
  };
}

export async function streamBoundedJsonLines(
  authorization: SourceAuthorization,
  options: {
    cursor?: string;
    consistency: z.infer<typeof ConsistencyStateSchema>;
    limits?: Partial<ReaderLimits>;
  },
): Promise<BoundedJsonLineStream> {
  const allowed = await authorizeSourceFile(authorization);
  const limits = { ...DEFAULT_READER_LIMITS, ...options.limits };
  const start = parseCursor(options.cursor);
  if (start > allowed.size) throw new SessionContractError('SCHEMA_DRIFT', 'reader cursor is beyond source size');

  let offset = start;
  let total = 0;
  let count = 0;
  let incompleteTail = false;
  const iterate = async function* (): AsyncGenerator<BoundedJsonRecord> {
    const input = createReadStream(allowed.canonicalPath, { start, encoding: 'utf8' });
    const lines = createInterface({ input, crlfDelay: Infinity });
    try {
      for await (const line of lines) {
        const bytes = Buffer.byteLength(line) + 1;
        if (bytes > limits.maxRecordBytes || total + bytes > limits.maxTotalBytes
          || count + 1 > limits.maxRecords) {
          throw new SessionContractError('RESOURCE_LIMIT_EXCEEDED', 'bounded session reader limit exceeded');
        }
        if (line.trim() === '') {
          offset += bytes;
          total += bytes;
          continue;
        }
        let value: unknown;
        try {
          value = JSON.parse(line);
        } catch {
          if (options.consistency === 'provisional') {
            incompleteTail = true;
            break;
          }
          throw new SessionContractError('SCHEMA_DRIFT', 'malformed JSONL record in consistent source');
        }
        if (jsonDepth(value) > limits.maxNestingDepth) {
          throw new SessionContractError('RESOURCE_LIMIT_EXCEEDED', 'JSON nesting depth exceeds reader limit');
        }
        const record = { value, sequence: count, byteOffset: offset, byteLength: bytes };
        count += 1;
        offset += bytes;
        total += bytes;
        yield record;
      }
    } finally {
      lines.close();
      input.destroy();
    }
  };
  return {
    get nextCursor() { return String(offset); },
    consistency: options.consistency,
    get incompleteTail() { return incompleteTail; },
    get bytesRead() { return total; },
    get recordsRead() { return count; },
    [Symbol.asyncIterator]: iterate,
  };
}

export async function readBoundedJson(
  authorization: SourceAuthorization,
  limitsInput?: Partial<ReaderLimits>,
): Promise<{ value: unknown; bytesRead: number }> {
  const allowed = await authorizeSourceFile(authorization);
  const limits = { ...DEFAULT_READER_LIMITS, ...limitsInput };
  if (allowed.size > limits.maxTotalBytes || allowed.size > limits.maxRecordBytes) {
    throw new SessionContractError('RESOURCE_LIMIT_EXCEEDED', 'bounded JSON source limit exceeded');
  }
  let value: unknown;
  try {
    value = JSON.parse(await readFile(allowed.canonicalPath, 'utf8'));
  } catch {
    throw new SessionContractError('SCHEMA_DRIFT', 'malformed JSON source');
  }
  if (jsonDepth(value) > limits.maxNestingDepth) {
    throw new SessionContractError('RESOURCE_LIMIT_EXCEEDED', 'JSON nesting depth exceeds reader limit');
  }
  return { value, bytesRead: allowed.size };
}

export async function readBoundedText(
  authorization: SourceAuthorization,
  limitsInput?: Partial<ReaderLimits>,
): Promise<{ value: string; bytesRead: number }> {
  const allowed = await authorizeSourceFile(authorization);
  const limits = { ...DEFAULT_READER_LIMITS, ...limitsInput };
  if (allowed.size > limits.maxTotalBytes || allowed.size > limits.maxRecordBytes) {
    throw new SessionContractError('RESOURCE_LIMIT_EXCEEDED', 'bounded text source limit exceeded');
  }
  return {
    value: await readFile(allowed.canonicalPath, 'utf8'),
    bytesRead: allowed.size,
  };
}

export async function fingerprintSourceFile(
  authorization: SourceAuthorization,
): Promise<{ digest: string; size: number }> {
  const allowed = await authorizeSourceFile(authorization);
  const handle = await open(allowed.canonicalPath, 'r');
  const hash = createHash('sha256');
  try {
    const buffer = Buffer.allocUnsafe(64 * 1024);
    let position = 0;
    while (position < allowed.size) {
      const result = await handle.read(buffer, 0, Math.min(buffer.length, allowed.size - position), position);
      if (result.bytesRead === 0) break;
      hash.update(buffer.subarray(0, result.bytesRead));
      position += result.bytesRead;
    }
  } finally {
    await handle.close();
  }
  return { digest: `sha256:${hash.digest('hex')}`, size: allowed.size };
}

export async function fingerprintSourcePrefix(
  authorization: SourceAuthorization,
  length: number,
  skipPrefixBytes = 0,
): Promise<{ digest: string; size: number; mtimeMs: number; fileIdentity: string }> {
  const allowed = await authorizeSourceFile(authorization);
  if (!Number.isSafeInteger(length) || length < 0 || length > allowed.size
    || !Number.isSafeInteger(skipPrefixBytes) || skipPrefixBytes < 0 || skipPrefixBytes > allowed.size) {
    throw new SessionContractError(
      'SCHEMA_DRIFT',
      'checkpoint source position is beyond the current source size',
    );
  }
  const handle = await open(allowed.canonicalPath, 'r');
  const hash = createHash('sha256');
  try {
    const buffer = Buffer.allocUnsafe(64 * 1024);
    let position = skipPrefixBytes;
    while (position < length) {
      const result = await handle.read(
        buffer,
        0,
        Math.min(buffer.length, length - position),
        position,
      );
      if (result.bytesRead === 0) break;
      hash.update(buffer.subarray(0, result.bytesRead));
      position += result.bytesRead;
    }
  } finally {
    await handle.close();
  }
  return {
    digest: `sha256:${hash.digest('hex')}`,
    size: allowed.size,
    mtimeMs: allowed.mtimeMs,
    fileIdentity: `${allowed.dev}:${allowed.ino}`,
  };
}

function parseCursor(cursor?: string): number {
  if (cursor === undefined || cursor === '') return 0;
  if (!/^\d+$/.test(cursor)) throw new SessionContractError('SCHEMA_DRIFT', 'invalid reader cursor');
  return Number(cursor);
}

function jsonDepth(value: unknown, depth = 0): number {
  if (value === null || typeof value !== 'object') return depth;
  const children = Array.isArray(value) ? value : Object.values(value);
  return children.reduce((max, child) => Math.max(max, jsonDepth(child, depth + 1)), depth);
}
