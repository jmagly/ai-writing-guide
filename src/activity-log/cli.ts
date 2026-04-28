/**
 * Activity Log CLI — `aiwg activity-log <subcommand>`
 *
 * Subcommands:
 *   show [--since DATE] [--operation OP] [--limit N]
 *   append <operation> "<summary>"
 *   stats
 *
 * Persists through `resolveStorage('activity_log')` per #964 — the
 * physical destination is `.aiwg/activity.log` on the default `fs`
 * backend, byte-identical to the legacy `echo >> .aiwg/activity.log`
 * pattern documented in the activity-log skill.
 *
 * @design @.aiwg/architecture/storage-design.md (§4, §8.2)
 * @issue #934
 * @issue #964
 */

import {
  ACTIVITY_OPERATIONS,
  formatEntry,
  formatUtcTimestamp,
  isActivityOperation,
  type ActivityEntry,
  type ActivityOperation,
} from './types.js';
import { parseLog, parseUtcDate } from './parser.js';
import { resolveStorage, type StorageAdapter } from '../storage/index.js';

const LOG_PATH = 'activity.log';
const DEFAULT_LIMIT = 20;

export async function main(args: string[]): Promise<void> {
  const subcommand = args[0];
  const subArgs = args.slice(1);

  switch (subcommand) {
    case 'show':
      await handleShow(subArgs);
      break;
    case 'append':
      await handleAppend(subArgs);
      break;
    case 'stats':
      await handleStats();
      break;
    default:
      printUsage();
      if (subcommand) {
        throw new Error(`Unknown activity-log subcommand: ${subcommand}`);
      }
  }
}

interface ShowArgs {
  since?: Date;
  operation?: ActivityOperation;
  limit: number;
}

async function handleShow(args: string[]): Promise<void> {
  const opts = parseShowArgs(args);
  const adapter = await resolveStorage('activity_log');
  const entries = await readEntries(adapter);

  let filtered = entries;
  if (opts.since) {
    const since = opts.since;
    filtered = filtered.filter((e) => e.timestamp >= since);
  }
  if (opts.operation) {
    filtered = filtered.filter((e) => e.operation === opts.operation);
  }

  // Newest first
  filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  if (filtered.length > opts.limit) {
    filtered = filtered.slice(0, opts.limit);
  }

  if (filtered.length === 0) {
    console.log('No activity log entries match the filters.');
    return;
  }

  for (const entry of filtered) {
    console.log(formatEntry(entry));
  }
}

async function handleAppend(args: string[]): Promise<void> {
  if (args.length < 2) {
    throw new Error(
      `Usage: aiwg activity-log append <operation> "<summary>"\n` +
        `  Valid operations: ${ACTIVITY_OPERATIONS.join(', ')}`
    );
  }
  const op = args[0];
  const summary = args.slice(1).join(' ').trim();

  if (!isActivityOperation(op)) {
    throw new Error(
      `Invalid operation "${op}". Valid operations: ${ACTIVITY_OPERATIONS.join(', ')}`
    );
  }
  if (summary.length === 0) {
    throw new Error('Summary must be a non-empty string');
  }
  if (summary.length > 120) {
    // Soft limit per the activity-log rule. Warn but don't refuse —
    // the rule says "≤120 characters" but doesn't promise rejection.
    console.warn(`warning: summary is ${summary.length} chars (rule recommends ≤120)`);
  }

  const adapter = await resolveStorage('activity_log');
  const newLine = formatEntry({ timestamp: new Date(), operation: op, summary });

  // Read-then-write append. Idempotent at the line level.
  const existing = (await adapter.read(LOG_PATH)) ?? '';
  const trailing = existing.length === 0 || existing.endsWith('\n') ? '' : '\n';
  await adapter.write(LOG_PATH, existing + trailing + newLine + '\n');

  console.log(`Entry appended to .aiwg/activity.log:\n  ${newLine}`);
}

async function handleStats(): Promise<void> {
  const adapter = await resolveStorage('activity_log');
  const entries = await readEntries(adapter);

  if (entries.length === 0) {
    console.log('Activity log is empty.');
    return;
  }

  const counts = new Map<ActivityOperation, number>();
  for (const op of ACTIVITY_OPERATIONS) counts.set(op, 0);
  for (const e of entries) counts.set(e.operation, (counts.get(e.operation) ?? 0) + 1);

  const sorted = [...entries].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const first = sorted[0].timestamp;
  const last = sorted[sorted.length - 1].timestamp;
  const days = Math.max(1, Math.ceil((last.getTime() - first.getTime()) / 86_400_000) + 1);

  console.log(`Activity Log Statistics`);
  console.log(`Log file: .aiwg/activity.log`);
  console.log(
    `Date range: ${formatUtcTimestamp(first).slice(0, 10)} → ${formatUtcTimestamp(last).slice(0, 10)} (${days} day${days === 1 ? '' : 's'})`
  );
  console.log(`Total entries: ${entries.length}`);
  console.log('');
  console.log(`By operation:`);

  // Sort by count desc, then by op name asc for stability
  const ranked = [...counts.entries()]
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  const maxCount = ranked[0]?.[1] ?? 1;
  for (const [op, n] of ranked) {
    const pct = Math.round((n / entries.length) * 100);
    const barLen = Math.max(1, Math.round((n / maxCount) * 20));
    const bar = '█'.repeat(barLen);
    console.log(`  ${op.padEnd(8)} ${String(n).padStart(3)} ${bar.padEnd(20)} ${pct}%`);
  }
}

// ── helpers ──────────────────────────────────────────────────────────

async function readEntries(adapter: StorageAdapter): Promise<ActivityEntry[]> {
  const content = await adapter.read(LOG_PATH);
  if (content === null) return [];
  return parseLog(content);
}

function parseShowArgs(args: string[]): ShowArgs {
  const opts: ShowArgs = { limit: DEFAULT_LIMIT };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--since') {
      const v = args[++i];
      const d = parseUtcDate(v);
      if (!d) throw new Error(`--since must be YYYY-MM-DD (got ${JSON.stringify(v)})`);
      opts.since = d;
    } else if (a === '--operation') {
      const v = args[++i];
      if (!isActivityOperation(v)) {
        throw new Error(
          `--operation must be one of ${ACTIVITY_OPERATIONS.join(', ')} (got ${JSON.stringify(v)})`
        );
      }
      opts.operation = v;
    } else if (a === '--limit') {
      const v = Number(args[++i]);
      if (!Number.isFinite(v) || v <= 0) {
        throw new Error(`--limit must be a positive integer`);
      }
      opts.limit = Math.floor(v);
    } else {
      throw new Error(`Unknown flag: ${a}`);
    }
  }
  return opts;
}

function printUsage(): void {
  console.log(`Usage: aiwg activity-log <subcommand>

Subcommands:
  show [--since YYYY-MM-DD] [--operation OP] [--limit N]
  append <operation> "<summary>"
  stats

Operations: ${ACTIVITY_OPERATIONS.join(', ')}

Examples:
  aiwg activity-log show
  aiwg activity-log show --since 2026-04-01 --operation deploy
  aiwg activity-log show --limit 5
  aiwg activity-log append create ".aiwg/requirements/UC-007 created"
  aiwg activity-log stats

The log persists at .aiwg/activity.log on the default fs backend.
Configure .aiwg/storage.config to route to an external backend (#934).`);
}
