/**
 * Storage CLI — `aiwg storage <subcommand>`
 *
 * Subcommands:
 *   show               — print effective config + resolved physical paths
 *   list-backends      — inventory of compiled-in adapters with status
 *   test <subsystem>   — round-trip read/write/list/delete through the
 *                        configured backend
 *   migrate <subsystem> — copy entries from one backend to another
 *
 * @design @.aiwg/architecture/storage-design.md (§7)
 * @issue #934
 * @issue #954
 * @issue #955
 */

import { randomUUID } from 'crypto';
import { existsSync } from 'fs';
import { mkdir, readFile, writeFile, appendFile } from 'fs/promises';
import { dirname, join, resolve as resolvePath } from 'path';
import {
  BACKEND_TYPES,
  FilesystemAdapter,
  ObsidianAdapter,
  LogseqAdapter,
  FortemiAdapter,
  SUBSYSTEM_KEYS,
  getLoadedConfig,
  initStorage,
  resolveStorage,
  resolveSubsystemRoot,
  storageConfigPath,
  type BackendType,
  type StorageAdapter,
  type SubsystemKey,
} from './index.js';

export async function main(args: string[]): Promise<void> {
  const subcommand = args[0];
  const subArgs = args.slice(1);
  const projectRoot = process.cwd();

  switch (subcommand) {
    case 'show':
      await handleShow(projectRoot);
      break;
    case 'list-backends':
      await handleListBackends(subArgs);
      break;
    case 'test':
      await handleTest(projectRoot, subArgs);
      break;
    case 'migrate':
      await handleMigrate(projectRoot, subArgs);
      break;
    default:
      printUsage();
      if (subcommand) {
        throw new Error(`Unknown storage subcommand: ${subcommand}`);
      }
  }
}

async function handleShow(projectRoot: string): Promise<void> {
  await initStorage(projectRoot);
  const config = await getLoadedConfig(projectRoot);
  const cfgPath = storageConfigPath(projectRoot);

  if (!config) {
    console.log(`No storage.config — every subsystem uses the default fs backend under .aiwg/.\n`);
    console.log(`Expected location (when configured): ${cfgPath}\n`);
  } else {
    console.log(`storage.config: ${cfgPath}`);
    console.log(`schema version: ${config.version}`);
    if (config.fallback) console.log(`fallback: ${config.fallback}`);
    console.log('');
  }

  console.log(`Subsystem      Backend       Resolved location`);
  console.log(`─────────────  ────────────  ──────────────────────────────────────────`);
  for (const subsystem of SUBSYSTEM_KEYS) {
    const backend = config?.backends?.[subsystem]?.type ?? 'fs';
    const location =
      backend === 'fs'
        ? resolveSubsystemRoot(subsystem, projectRoot, config)
        : describeBackendLocation(subsystem, config);
    const sub = subsystem.padEnd(13);
    const back = backend.padEnd(12);
    console.log(`  ${sub}  ${back}  ${location}`);
  }
  console.log('');
}

async function handleListBackends(args: string[] = []): Promise<void> {
  const json = args.includes('--json');

  if (json) {
    const out = BACKEND_TYPES.map((t) => {
      const status = backendStatus(t);
      return {
        type: t,
        status: status.implemented ? 'ready' : 'stub',
        note: status.note,
        ...(status.trackingIssue ? { tracking_issue: status.trackingIssue } : {}),
      };
    });
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  console.log(`Compiled-in storage backends:\n`);
  console.log(`  STATUS   TYPE          NOTES`);
  console.log(`  ──────   ────────────  ────────────────────────────────────────`);
  for (const t of BACKEND_TYPES) {
    const status = backendStatus(t);
    const sym = status.implemented ? 'READY ' : 'STUB  ';
    console.log(`  ${sym}   ${t.padEnd(12)}  ${status.note}`);
  }
  console.log('');
}

async function handleTest(projectRoot: string, args: string[]): Promise<void> {
  const subsystem = args[0];
  if (!subsystem || !(SUBSYSTEM_KEYS as readonly string[]).includes(subsystem)) {
    throw new Error(
      `Usage: aiwg storage test <subsystem>\n` +
        `  Valid subsystems: ${SUBSYSTEM_KEYS.join(', ')}`
    );
  }

  await initStorage(projectRoot);
  const adapter = await resolveStorage(subsystem as SubsystemKey);

  const probePath = `.aiwg-storage-test/${randomUUID()}.txt`;
  const probeContent = `aiwg storage test ${subsystem} ${new Date().toISOString()}\n`;
  let stage = 'init';
  try {
    stage = 'write';
    console.log(`  ► write    ${probePath}`);
    await adapter.write(probePath, probeContent);

    stage = 'read';
    console.log(`  ► read     ${probePath}`);
    const got = await adapter.read(probePath);
    if (got !== probeContent) {
      throw new Error(`read mismatch: expected ${JSON.stringify(probeContent)}, got ${JSON.stringify(got)}`);
    }

    stage = 'list';
    console.log(`  ► list     prefix=.aiwg-storage-test/`);
    const entries = await adapter.list('.aiwg-storage-test/');
    if (!entries.some((e) => e.path === probePath)) {
      throw new Error(`list missing probe path ${probePath}`);
    }

    stage = 'delete';
    console.log(`  ► delete   ${probePath}`);
    await adapter.delete(probePath);
    const after = await adapter.read(probePath);
    if (after !== null) {
      throw new Error(`delete did not remove ${probePath}`);
    }

    console.log(`\n  ✓ all 4 ops succeeded for subsystem "${subsystem}"\n`);
  } catch (err) {
    throw new Error(
      `storage test failed at ${stage}: ${(err as Error).message}\n` +
        `  Subsystem: ${subsystem}\n  Probe path: ${probePath}`
    );
  }
}

/**
 * `aiwg storage migrate <subsystem> --from <spec> --to <spec> [--dry-run]`
 *
 * Spec format: `<type>:<location>` where type is one of fs/obsidian/
 * logseq/fortemi and location is:
 *   fs       → directory path (relative to projectRoot or absolute)
 *   obsidian → vault directory (folder via `--from-folder`/`--to-folder`)
 *   logseq   → graph directory
 *   fortemi  → MCP server name (default: 'fortemi')
 *
 * Examples:
 *   aiwg storage migrate memory --from fs:.aiwg/memory --to obsidian:~/vault --to-folder AIWG/memory
 *   aiwg storage migrate kb --from fs:.aiwg/kb --to fortemi:fortemi --dry-run
 *
 * Walks source.list(''), reads each entry, writes to destination. Tracks
 * progress in `.aiwg/.storage-cache/migrations/<id>.jsonl` so re-running
 * resumes from the last successfully-migrated entry.
 *
 * @issue #955
 */
async function handleMigrate(projectRoot: string, args: string[]): Promise<void> {
  const opts = parseMigrateArgs(args);

  const source = buildAdapter(opts.subsystem, opts.from, projectRoot);
  const destination = buildAdapter(opts.subsystem, opts.to, projectRoot);

  if (locationsEqual(opts.from, opts.to, projectRoot)) {
    throw new Error(
      `Refusing to migrate: source and destination resolve to the same location.\n  ${describeSpec(opts.from)}\n  ${describeSpec(opts.to)}`
    );
  }

  if (source.init) await source.init();
  if (destination.init) await destination.init();

  console.log(`storage migrate (${opts.dryRun ? 'DRY RUN' : 'live'})`);
  console.log(`  subsystem: ${opts.subsystem}`);
  console.log(`  from:      ${describeSpec(opts.from)}`);
  console.log(`  to:        ${describeSpec(opts.to)}`);
  console.log('');

  const entries = await source.list('');
  if (entries.length === 0) {
    console.log('No entries to migrate.');
    return;
  }

  // Resume support: read the per-migration log; skip already-done paths
  const migrationLogPath = resolvePath(
    projectRoot,
    '.aiwg',
    '.storage-cache',
    'migrations',
    `${opts.subsystem}-${specSlug(opts.from)}-to-${specSlug(opts.to)}.jsonl`
  );
  const completed = await readCompletedSet(migrationLogPath);

  let copied = 0;
  let skipped = 0;
  let errored = 0;

  for (const entry of entries) {
    if (completed.has(entry.path)) {
      skipped++;
      console.log(`  ✓ ${entry.path} (already migrated, skipped)`);
      continue;
    }
    if (opts.dryRun) {
      copied++;
      console.log(`  → ${entry.path} (would copy)`);
      continue;
    }
    try {
      const content = await source.read(entry.path);
      if (content === null) {
        errored++;
        console.log(`  ✗ ${entry.path} (read returned null)`);
        continue;
      }
      await destination.write(entry.path, content);
      await recordCompletion(migrationLogPath, entry.path);
      copied++;
      console.log(`  ✓ ${entry.path}`);
    } catch (err) {
      errored++;
      console.log(`  ✗ ${entry.path} (${(err as Error).message})`);
    }
  }

  if (source.close) await source.close();
  if (destination.close) await destination.close();

  console.log('');
  console.log(`Summary: copied=${copied} skipped=${skipped} errored=${errored} total=${entries.length}`);
  if (!opts.dryRun) {
    console.log(`Migration log: ${migrationLogPath}`);
  }
  if (errored > 0) {
    throw new Error(`${errored} entr${errored === 1 ? 'y' : 'ies'} failed to migrate.`);
  }
}

interface MigrateArgs {
  subsystem: SubsystemKey;
  from: BackendSpec;
  to: BackendSpec;
  dryRun: boolean;
}

interface BackendSpec {
  type: BackendType;
  location: string;
  folder?: string;
}

function parseMigrateArgs(args: string[]): MigrateArgs {
  let subsystem: string | undefined;
  let from: string | undefined;
  let to: string | undefined;
  let fromFolder: string | undefined;
  let toFolder: string | undefined;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--from') from = args[++i];
    else if (a === '--to') to = args[++i];
    else if (a === '--from-folder') fromFolder = args[++i];
    else if (a === '--to-folder') toFolder = args[++i];
    else if (a === '--dry-run') dryRun = true;
    else if (!a.startsWith('--') && !subsystem) subsystem = a;
    else throw new Error(`Unknown migrate flag: ${a}`);
  }

  if (!subsystem || !(SUBSYSTEM_KEYS as readonly string[]).includes(subsystem)) {
    throw new Error(
      `Usage: aiwg storage migrate <subsystem> --from <type>:<location> --to <type>:<location> [--dry-run]\n  Valid subsystems: ${SUBSYSTEM_KEYS.join(', ')}`
    );
  }
  if (!from) throw new Error('storage migrate: --from <type>:<location> is required');
  if (!to) throw new Error('storage migrate: --to <type>:<location> is required');

  return {
    subsystem: subsystem as SubsystemKey,
    from: { ...parseSpec(from), ...(fromFolder ? { folder: fromFolder } : {}) },
    to: { ...parseSpec(to), ...(toFolder ? { folder: toFolder } : {}) },
    dryRun,
  };
}

function parseSpec(raw: string): BackendSpec {
  const idx = raw.indexOf(':');
  if (idx === -1) {
    throw new Error(`Invalid backend spec "${raw}" — expected <type>:<location>`);
  }
  const type = raw.slice(0, idx);
  const location = raw.slice(idx + 1);
  if (!(BACKEND_TYPES as readonly string[]).includes(type)) {
    throw new Error(
      `Unknown backend type "${type}" in spec "${raw}". Valid: ${BACKEND_TYPES.join(', ')}`
    );
  }
  if (location.length === 0) {
    throw new Error(`Empty location in backend spec "${raw}"`);
  }
  return { type: type as BackendType, location };
}

function buildAdapter(
  subsystem: SubsystemKey,
  spec: BackendSpec,
  projectRoot: string
): StorageAdapter {
  switch (spec.type) {
    case 'fs': {
      const root = expandFsLocation(spec.location, projectRoot);
      return new FilesystemAdapter(root);
    }
    case 'obsidian':
      return new ObsidianAdapter({
        type: 'obsidian',
        vault: expandFsLocation(spec.location, projectRoot),
        ...(spec.folder ? { folder: spec.folder } : {}),
        useCli: false,
      });
    case 'logseq':
      return new LogseqAdapter({
        type: 'logseq',
        graph: expandFsLocation(spec.location, projectRoot),
        useApi: false,
      });
    case 'fortemi':
      return new FortemiAdapter({
        subsystem,
        config: { type: 'fortemi', mcpServer: spec.location },
      });
    case 'notion':
    case 'anythingllm':
    case 's3':
    case 'webdav':
      throw new Error(
        `storage migrate: backend "${spec.type}" not yet implemented. ` +
          `See issues #959, #960, #962, #963 for tracking.`
      );
    default: {
      const _exhaustive: never = spec.type;
      void _exhaustive;
      throw new Error(`Unhandled backend type ${spec.type}`);
    }
  }
}

function expandFsLocation(loc: string, projectRoot: string): string {
  if (loc.startsWith('~/')) {
    const { homedir } = require('os') as typeof import('os');
    return join(homedir(), loc.slice(2));
  }
  if (loc === '~') {
    const { homedir } = require('os') as typeof import('os');
    return homedir();
  }
  if (loc.startsWith('/')) return loc;
  return resolvePath(projectRoot, loc);
}

function locationsEqual(a: BackendSpec, b: BackendSpec, projectRoot: string): boolean {
  if (a.type !== b.type) return false;
  if (a.type === 'fortemi') return a.location === b.location;
  // For file-shaped backends, compare resolved fs paths
  return expandFsLocation(a.location, projectRoot) === expandFsLocation(b.location, projectRoot);
}

function describeSpec(spec: BackendSpec): string {
  return spec.folder ? `${spec.type}:${spec.location} (folder=${spec.folder})` : `${spec.type}:${spec.location}`;
}

function specSlug(spec: BackendSpec): string {
  return `${spec.type}-${spec.location.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 32)}`;
}

async function readCompletedSet(logPath: string): Promise<Set<string>> {
  if (!existsSync(logPath)) return new Set();
  try {
    const content = await readFile(logPath, 'utf-8');
    const out = new Set<string>();
    for (const line of content.split('\n')) {
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line) as { path?: string };
        if (obj.path) out.add(obj.path);
      } catch {
        /* ignore malformed line */
      }
    }
    return out;
  } catch {
    return new Set();
  }
}

async function recordCompletion(logPath: string, path: string): Promise<void> {
  await mkdir(dirname(logPath), { recursive: true });
  const line = JSON.stringify({ path, ts: new Date().toISOString() }) + '\n';
  if (existsSync(logPath)) {
    await appendFile(logPath, line, 'utf-8');
  } else {
    await writeFile(logPath, line, 'utf-8');
  }
}

function describeBackendLocation(
  subsystem: SubsystemKey,
  config: import('./types.js').StorageConfig | null
): string {
  const b = config?.backends?.[subsystem];
  if (!b) return '(default fs)';
  switch (b.type) {
    case 'obsidian':
      return `obsidian: ${b.vault}${b.folder ? '/' + b.folder : ''}`;
    case 'logseq':
      return `logseq: ${b.graph}${b.useApi === false ? ' (file mode)' : ' (HTTP API)'}`;
    case 'notion':
      return `notion: ${'pageId' in b.parent ? 'page=' + b.parent.pageId : 'database=' + b.parent.databaseId}`;
    case 'anythingllm':
      return `anythingllm: ${b.baseUrl}/${b.workspace}${b.folder ? '/' + b.folder : ''}`;
    case 'fortemi':
      return `fortemi: mcp=${b.mcpServer ?? 'fortemi'}${b.scheme ? ' scheme=' + b.scheme : ''}`;
    case 's3':
      return `s3: ${b.bucket}${b.prefix ? '/' + b.prefix : ''}${b.endpoint ? ' @ ' + b.endpoint : ''}`;
    case 'webdav':
      return `webdav: ${b.url}`;
    default:
      return `(${b.type})`;
  }
}

interface BackendStatus {
  implemented: boolean;
  note: string;
  trackingIssue?: string;
}

const ISSUE_TRACKER_BASE = 'https://git.integrolabs.net/roctinam/aiwg/issues';

export function backendStatus(type: BackendType): BackendStatus {
  switch (type) {
    case 'fs':
      return { implemented: true, note: 'default backend — local filesystem' };
    case 'obsidian':
      return { implemented: true, note: 'fs-shaped vault writes; refuses .obsidian/' };
    case 'logseq':
      return { implemented: true, note: 'fs writes; YAML→property:: transform; refuses logseq/' };
    case 'notion':
      return {
        implemented: false,
        note: 'planned (#959) — REST + external_id upsert',
        trackingIssue: `${ISSUE_TRACKER_BASE}/959`,
      };
    case 'anythingllm':
      return {
        implemented: false,
        note: 'planned (#960) — multipart upload',
        trackingIssue: `${ISSUE_TRACKER_BASE}/960`,
      };
    case 'fortemi':
      return { implemented: true, note: 'MCP-routed via configured Fortemi server (alpha)' };
    case 's3':
      return {
        implemented: false,
        note: 'planned (#962) — phase 3',
        trackingIssue: `${ISSUE_TRACKER_BASE}/962`,
      };
    case 'webdav':
      return {
        implemented: false,
        note: 'planned (#963) — phase 3',
        trackingIssue: `${ISSUE_TRACKER_BASE}/963`,
      };
    default: {
      const _exhaustive: never = type;
      void _exhaustive;
      return { implemented: false, note: 'unknown' };
    }
  }
}

function printUsage(): void {
  console.log(`Usage: aiwg storage <subcommand>

Subcommands:
  show                          Print effective config + resolved physical paths
  list-backends [--json]        Inventory of compiled-in adapters; --json emits structured output including tracking_issue URL for stubs
  test <subsystem>              Round-trip read/write/list/delete through the configured backend
  migrate <subsystem>           Copy entries from one backend to another (#955)
    --from <type>:<location>    Source spec (fs:./dir, obsidian:~/vault, logseq:./graph, fortemi:server)
    --to <type>:<location>      Destination spec (same format)
    --from-folder <folder>      Optional Obsidian subfolder for source
    --to-folder <folder>        Optional Obsidian subfolder for destination
    --dry-run                   Preview operations without writing

Subsystems: ${SUBSYSTEM_KEYS.join(', ')}

Examples:
  aiwg storage show
  aiwg storage list-backends
  aiwg storage test activity_log
  aiwg storage migrate memory --from fs:.aiwg/memory --to obsidian:~/vault --to-folder AIWG/memory --dry-run
  aiwg storage migrate kb --from fs:.aiwg/kb --to fortemi:fortemi

See @.aiwg/architecture/storage-design.md for the design.`);
}
