/**
 * Activity Log Parser
 *
 * Parses `.aiwg/activity.log` lines into structured entries. Lines that
 * don't match the expected format are silently skipped (the log is
 * append-only and may contain malformed entries from older tooling or
 * manual edits).
 *
 * @issue #934
 * @issue #964
 */

import { type ActivityEntry, isActivityOperation } from './types.js';

/**
 * Pattern: `## [YYYY-MM-DD HH:MM] <operation> | <summary>`
 *
 * Match groups:
 *   1: full timestamp (`YYYY-MM-DD HH:MM`)
 *   2: operation token
 *   3: summary
 */
const LINE_PATTERN = /^##\s+\[(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})\]\s+([a-z]+)\s+\|\s+(.+?)\s*$/;

/**
 * Parse a single log line. Returns null when the line doesn't match the
 * canonical format or the operation token is unknown.
 */
export function parseLine(line: string): ActivityEntry | null {
  const m = LINE_PATTERN.exec(line);
  if (!m) return null;
  const [, rawTimestamp, op, summary] = m;
  if (!isActivityOperation(op)) return null;
  const timestamp = parseUtcTimestamp(rawTimestamp);
  if (!timestamp) return null;
  return { timestamp, rawTimestamp, operation: op, summary };
}

/**
 * Parse the entire log content into entries. Skips blank lines and
 * lines that don't match the canonical format.
 */
export function parseLog(content: string): ActivityEntry[] {
  const out: ActivityEntry[] = [];
  for (const line of content.split('\n')) {
    if (line.trim().length === 0) continue;
    const entry = parseLine(line);
    if (entry) out.push(entry);
  }
  return out;
}

/**
 * Parse a `YYYY-MM-DD HH:MM` UTC timestamp into a Date. Returns null on
 * malformed input.
 */
export function parseUtcTimestamp(raw: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/.exec(raw);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m;
  const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), 0));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

/**
 * Parse a `YYYY-MM-DD` date (interpreted as UTC midnight). Returns null
 * on malformed input. Used by `--since` filtering.
 */
export function parseUtcDate(raw: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!m) return null;
  const [, y, mo, d] = m;
  const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), 0, 0, 0));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}
