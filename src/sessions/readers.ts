import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { open } from 'node:fs/promises';
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

export const DEFAULT_READER_LIMITS: ReaderLimits = Object.freeze({
  maxRecords: 1_000_000,
  maxRecordBytes: 4 * 1024 * 1024,
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
  const allowed = await authorizeSourceFile(authorization);
  const limits = { ...DEFAULT_READER_LIMITS, ...options.limits };
  const start = parseCursor(options.cursor);
  if (start > allowed.size) throw new SessionContractError('SCHEMA_DRIFT', 'reader cursor is beyond source size');

  const records: BoundedJsonRecord[] = [];
  let offset = start;
  let total = 0;
  let incompleteTail = false;
  const lines = createInterface({
    input: createReadStream(allowed.canonicalPath, { start, encoding: 'utf8' }),
    crlfDelay: Infinity,
  });
  for await (const line of lines) {
    const bytes = Buffer.byteLength(line) + 1;
    if (bytes > limits.maxRecordBytes || total + bytes > limits.maxTotalBytes
      || records.length + 1 > limits.maxRecords) {
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
    records.push({ value, sequence: records.length, byteOffset: offset, byteLength: bytes });
    offset += bytes;
    total += bytes;
  }
  return {
    records,
    nextCursor: String(offset),
    consistency: options.consistency,
    incompleteTail,
    bytesRead: total,
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

