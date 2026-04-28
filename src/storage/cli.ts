/**
 * Storage CLI — `aiwg storage <subcommand>`
 *
 * Subcommands:
 *   show              — print effective config + resolved physical paths
 *   list-backends     — inventory of compiled-in adapters with status
 *   test <subsystem>  — round-trip read/write/list/delete through the
 *                       configured backend
 *
 * @design @.aiwg/architecture/storage-design.md (§7)
 * @issue #934
 * @issue #954
 */

import { randomUUID } from 'crypto';
import {
  BACKEND_TYPES,
  SUBSYSTEM_KEYS,
  getLoadedConfig,
  initStorage,
  resolveStorage,
  resolveSubsystemRoot,
  storageConfigPath,
  type BackendType,
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
      await handleListBackends();
      break;
    case 'test':
      await handleTest(projectRoot, subArgs);
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

async function handleListBackends(): Promise<void> {
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
}

function backendStatus(type: BackendType): BackendStatus {
  switch (type) {
    case 'fs':
      return { implemented: true, note: 'default backend — local filesystem' };
    case 'obsidian':
      return { implemented: true, note: 'fs-shaped vault writes; refuses .obsidian/' };
    case 'logseq':
      return { implemented: true, note: 'fs writes; YAML→property:: transform; refuses logseq/' };
    case 'notion':
      return { implemented: false, note: 'planned (#959) — REST + external_id upsert' };
    case 'anythingllm':
      return { implemented: false, note: 'planned (#960) — multipart upload' };
    case 'fortemi':
      return { implemented: true, note: 'MCP-routed via configured Fortemi server (alpha)' };
    case 's3':
      return { implemented: false, note: 'planned (#962) — phase 3' };
    case 'webdav':
      return { implemented: false, note: 'planned (#963) — phase 3' };
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
  show                Print effective config + resolved physical paths per subsystem
  list-backends       Inventory of compiled-in adapters with their implementation status
  test <subsystem>    Round-trip read/write/list/delete through the configured backend

Subsystems: ${SUBSYSTEM_KEYS.join(', ')}

Examples:
  aiwg storage show
  aiwg storage list-backends
  aiwg storage test activity_log

See @.aiwg/architecture/storage-design.md for the design.`);
}
