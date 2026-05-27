/**
 * `aiwg corpus` subcommand router — radar/freshness tools (#1498).
 *
 * Mirrors src/artifacts/cli.ts (the `aiwg index` router): a thin arg parser that
 * resolves the corpus root (env > research.corpusRoot > cwd, via build.ts's
 * resolveCorpusRoot) and dispatches to the corpus-tools functions. The
 * research-complete radar-* skills wrap these subcommands.
 *
 * Subcommands:
 *   radar-init   --ref REF-XXX | --all-missing [--cadence C] [--cluster T] [--write]
 *   radar-status [--stale-only] [--format table|csv|list] [--out PATH]
 *   radar-report [--cluster T] [--out PATH]
 *
 * @source historical: corpus/radar_init.py, radar_staleness.py, radar_report.py
 */

import * as fs from 'fs';
import * as path from 'path';
import { resolveCorpusRoot } from '../corpus-views/build.js';
import { scaffoldRadar, radarInitMissing } from './radar-init.js';
import { radarStatusRows, renderRadarStatus, type RadarStatusFormat } from './radar-status.js';
import { renderRadarReport } from './radar-report.js';
import { profileStatusRows, renderProfileStatus, type ProfileStatusFormat } from './profile-status.js';
import { generateTier1Profiles } from './profile-generate.js';
import { generateFmProfiles } from './profile-generate-fm.js';
import { curatorRows, curatorOrphans, renderCuratorStatus, scaffoldCurator } from './curator.js';
import { logDiscovery } from './discovery-log.js';

function flagValue(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i !== -1 && i + 1 < args.length ? args[i + 1] : undefined;
}

function hasFlag(args: string[], name: string): boolean {
  return args.includes(name);
}

const HELP = `aiwg corpus — research-corpus tools

Usage:
  aiwg corpus radar-init --ref REF-XXX [--cadence C] [--cluster T] [--write]
  aiwg corpus radar-init --all-missing [--write]
  aiwg corpus radar-status [--stale-only] [--format table|csv|list] [--out PATH]
  aiwg corpus radar-report [--cluster TAG] [--out PATH]
  aiwg corpus profile-status [--stale-only] [--format table|csv|list] [--out PATH]
  aiwg corpus profile-generate [--limit N] [--scan N] [--write]
  aiwg corpus profile-generate --fm [--write]
  aiwg corpus curator-status [--out PATH]
  aiwg corpus curator-init --handle @h [--platform x] [--name "N"] [--cadence weekly] [--write]
  aiwg corpus discovery-log --ref REF-XXX --surface SURFACE [--via "..."] [--curator PROF-S-x] [--date D] [--batch B] [--by A] [--write]

radar-init scaffolds radar sidecars (dry-run unless --write; skips existing).
radar-status reports overdue radars (most-overdue-first).
radar-report aggregates corpus/cluster freshness.
profile-status reports entity profiles past their refresh cadence.
profile-generate scaffolds PROF-P profiles for unprofiled hub authors (dry-run unless --write).
profile-generate --fm scaffolds FM-author PROF-P + group PROF-G profiles from documentation/profiles/fm-config.yaml.
curator-status reports PROF-S curators by yield (return-to score) + discovery orphans.
curator-init scaffolds a PROF-S source/curator profile from a handle.
discovery-log records the discovery block on a citation sidecar.
`;

function radarInit(root: string, args: string[]): void {
  const write = hasFlag(args, '--write');
  const cadence = flagValue(args, '--cadence');
  const cluster = flagValue(args, '--cluster');
  if (hasFlag(args, '--all-missing')) {
    const results = radarInitMissing(root, { cadence, cluster, write });
    console.log(`Refs missing radars: ${results.length}`);
    for (const r of results) console.log('  ' + r.message);
    return;
  }
  const ref = flagValue(args, '--ref');
  if (!ref) throw new Error('radar-init requires --ref <REF-XXX> or --all-missing');
  console.log(scaffoldRadar(root, ref, { cadence, cluster, write }).message);
}

function radarStatus(root: string, args: string[]): void {
  const staleOnly = hasFlag(args, '--stale-only');
  const format = (flagValue(args, '--format') ?? 'table') as RadarStatusFormat;
  if (!['table', 'csv', 'list'].includes(format)) {
    throw new Error(`radar-status: invalid --format '${format}' (table|csv|list)`);
  }
  const content = renderRadarStatus(radarStatusRows(root, { staleOnly }), format);
  emit(content, flagValue(args, '--out'), root);
}

function radarReport(root: string, args: string[]): void {
  const content = renderRadarReport(root, { cluster: flagValue(args, '--cluster') });
  emit(content, flagValue(args, '--out'), root);
}

function profileStatus(root: string, args: string[]): void {
  const staleOnly = hasFlag(args, '--stale-only');
  const format = (flagValue(args, '--format') ?? 'table') as ProfileStatusFormat;
  if (!['table', 'csv', 'list'].includes(format)) {
    throw new Error(`profile-status: invalid --format '${format}' (table|csv|list)`);
  }
  const content = renderProfileStatus(profileStatusRows(root, { staleOnly }), format);
  emit(content, flagValue(args, '--out'), root);
}

function profileGenerate(root: string, args: string[]): void {
  const write = hasFlag(args, '--write');
  if (hasFlag(args, '--fm')) {
    const results = generateFmProfiles(root, { write });
    console.log(`FM profiles (from fm-config.yaml): ${results.length}`);
    for (const r of results) console.log('  ' + r.message);
    return;
  }
  const limit = flagValue(args, '--limit');
  const scan = flagValue(args, '--scan');
  const results = generateTier1Profiles(root, {
    write,
    limit: limit ? parseInt(limit, 10) : undefined,
    scan: scan ? parseInt(scan, 10) : undefined,
  });
  console.log(`Tier-1 candidates: ${results.length}`);
  for (const r of results) console.log('  ' + r.message);
}

function curatorInit(root: string, args: string[]): void {
  const handle = flagValue(args, '--handle');
  if (!handle) throw new Error('curator-init requires --handle <@account>');
  const res = scaffoldCurator(root, handle, {
    platform: flagValue(args, '--platform'),
    name: flagValue(args, '--name'),
    cadence: flagValue(args, '--cadence'),
    write: hasFlag(args, '--write'),
  });
  console.log(res.message);
}

function discoveryLog(root: string, args: string[]): void {
  const ref = flagValue(args, '--ref');
  const surface = flagValue(args, '--surface');
  if (!ref || !surface) throw new Error('discovery-log requires --ref <REF-XXX> and --surface <surface>');
  const res = logDiscovery(root, ref, {
    surface,
    via: flagValue(args, '--via'),
    curatorId: flagValue(args, '--curator'),
    date: flagValue(args, '--date'),
    harvestBatch: flagValue(args, '--batch'),
    harvestedBy: flagValue(args, '--by'),
    write: hasFlag(args, '--write'),
  });
  console.log(res.message);
  if (res.status === 'dry-run') {
    console.log('--- discovery block ---');
    console.log(res.block);
  }
}

/** Write to --out (resolved against the corpus root) or print to stdout. */
function emit(content: string, out: string | undefined, root: string): void {
  if (!out) {
    process.stdout.write(content);
    return;
  }
  const outPath = path.isAbsolute(out) ? out : path.join(root, out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, content, 'utf-8');
  console.log(`Wrote ${path.relative(root, outPath)}`);
}

/** Route `aiwg corpus <subcommand> [...args]`. Throws on error (handler maps to exit code). */
export async function corpusMain(args: string[], cwd: string = process.cwd()): Promise<void> {
  const sub = args[0];
  const rest = args.slice(1);
  if (!sub || sub === 'help' || sub === '--help' || sub === '-h') {
    process.stdout.write(HELP);
    return;
  }
  const root = await resolveCorpusRoot(cwd);
  switch (sub) {
    case 'radar-init':
      return radarInit(root, rest);
    case 'radar-status':
      return radarStatus(root, rest);
    case 'radar-report':
      return radarReport(root, rest);
    case 'profile-status':
      return profileStatus(root, rest);
    case 'profile-generate':
      return profileGenerate(root, rest);
    case 'curator-status':
      return emit(renderCuratorStatus(curatorRows(root), curatorOrphans(root)), flagValue(rest, '--out'), root);
    case 'curator-init':
      return curatorInit(root, rest);
    case 'discovery-log':
      return discoveryLog(root, rest);
    default:
      process.stderr.write(`Unknown corpus subcommand: ${sub}\n\n${HELP}`);
      throw new Error(`unknown corpus subcommand: ${sub}`);
  }
}
