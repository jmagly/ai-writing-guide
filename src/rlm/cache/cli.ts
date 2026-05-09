/**
 * `aiwg rlm-cache` subcommand router.
 *
 * Subcommands:
 *   list                          — show all cached entries
 *   stats                         — aggregate statistics
 *   evict <hash>                  — remove one entry
 *   evict --older-than <Nd|Nh>    — remove old entries
 *   clear --yes                   — wipe everything (requires --yes)
 *
 * @implements #1203
 */

import { clear, evict, list, resolveCacheRoot, stats } from './store.js';

export async function main(args: string[]): Promise<void> {
  const sub = args[0];
  const rest = args.slice(1);

  switch (sub) {
    case 'list':
      handleList(rest);
      break;
    case 'stats':
      handleStats(rest);
      break;
    case 'evict':
      handleEvict(rest);
      break;
    case 'clear':
      handleClear(rest);
      break;
    default:
      printUsage();
      if (sub) throw new Error(`Unknown rlm-cache subcommand: ${sub}`);
  }
}

function asJson(args: string[]): boolean {
  return args.includes('--json');
}

function handleList(args: string[]): void {
  const root = resolveCacheRoot();
  const entries = list(root);
  if (asJson(args)) {
    console.log(JSON.stringify(entries, null, 2));
    return;
  }
  if (entries.length === 0) {
    console.log('No cached RLM results.');
    console.log(`Cache root: ${root}`);
    return;
  }
  console.log(`hash      age   model                inputs  cost($)  query`);
  console.log(`────────  ────  ───────────────────  ──────  ───────  ─────`);
  for (const e of entries) {
    console.log(
      `${e.hash.slice(0, 8)}  ${String(e.ageDays).padStart(3)}d  ` +
      `${e.model.padEnd(19).slice(0, 19)}  ${String(e.inputCount).padStart(6)}  ` +
      `${e.costUsd === null ? '   —   ' : e.costUsd.toFixed(4).padStart(7)}  ${e.query}`
    );
  }
  console.log(`\n${entries.length} cached entries at ${root}`);
}

function handleStats(args: string[]): void {
  const root = resolveCacheRoot();
  const s = stats(root);
  if (asJson(args)) {
    console.log(JSON.stringify(s, null, 2));
    return;
  }
  if (s.totalEntries === 0) {
    console.log('Cache is empty.');
    console.log(`Cache root: ${root}`);
    return;
  }
  console.log(`Cache root:        ${root}`);
  console.log(`Total entries:     ${s.totalEntries}`);
  console.log(`Total size:        ${s.totalSizeKb} KiB`);
  console.log(`Oldest entry:      ${s.oldestAgeDays}d`);
  console.log(`Newest entry:      ${s.newestAgeDays}d`);
  console.log(`Total cached cost: $${s.totalCostUsd.toFixed(4)}`);
}

function parseDuration(spec: string): number {
  // Accepts 30d, 2h, 14 (days)
  const m = spec.match(/^(\d+)\s*([dh])?$/i);
  if (!m) throw new Error(`Invalid duration: ${spec} (use Nd or Nh)`);
  const n = parseInt(m[1] ?? '', 10);
  const unit = (m[2] ?? 'd').toLowerCase();
  return unit === 'h' ? n / 24 : n;
}

function handleEvict(args: string[]): void {
  const root = resolveCacheRoot();
  const olderIdx = args.indexOf('--older-than');
  if (olderIdx !== -1 && args[olderIdx + 1]) {
    const days = parseDuration(args[olderIdx + 1] as string);
    const r = evict(root, { olderThanDays: days });
    if (asJson(args)) {
      console.log(JSON.stringify(r, null, 2));
    } else {
      console.log(`Evicted ${r.evictedCount} entries (${Math.round(r.evictedBytes / 1024)} KiB) older than ${days}d.`);
    }
    return;
  }
  const hash = args.find((a) => /^[0-9a-f]{8,64}$/.test(a));
  if (!hash) {
    console.error('Usage: aiwg rlm-cache evict <hash> | --older-than <Nd|Nh>');
    process.exitCode = 1;
    return;
  }
  // Resolve short hash → full hash
  const full = resolveHashPrefix(root, hash);
  if (!full) {
    console.error(`No cache entry matching: ${hash}`);
    process.exitCode = 1;
    return;
  }
  const r = evict(root, { hash: full });
  if (asJson(args)) {
    console.log(JSON.stringify(r, null, 2));
  } else if (r.evictedCount === 0) {
    console.log(`No entry: ${full}`);
  } else {
    console.log(`Evicted ${full} (${Math.round(r.evictedBytes / 1024)} KiB).`);
  }
}

function resolveHashPrefix(root: string, prefix: string): string | null {
  const all = list(root);
  const matches = all.filter((e) => e.hash.startsWith(prefix));
  if (matches.length === 1 && matches[0]) return matches[0].hash;
  if (matches.length > 1) {
    console.error(`Ambiguous prefix '${prefix}' matches ${matches.length} entries.`);
    return null;
  }
  return null;
}

function handleClear(args: string[]): void {
  if (!args.includes('--yes')) {
    console.error('Refusing to clear cache without --yes confirmation.');
    process.exitCode = 1;
    return;
  }
  const root = resolveCacheRoot();
  const r = clear(root);
  if (asJson(args)) {
    console.log(JSON.stringify(r, null, 2));
  } else {
    console.log(`Cleared ${r.evictedCount} entries (${Math.round(r.evictedBytes / 1024)} KiB).`);
  }
}

function printUsage(): void {
  console.log('aiwg rlm-cache <subcommand>');
  console.log('');
  console.log('Subcommands:');
  console.log('  list [--json]                       List all cached RLM results');
  console.log('  stats [--json]                      Aggregate cache statistics');
  console.log('  evict <hash>                        Remove a single entry by hash (prefix ok)');
  console.log('  evict --older-than <Nd|Nh>          Remove entries older than N days/hours');
  console.log('  clear --yes                         Wipe entire cache (requires --yes)');
}
