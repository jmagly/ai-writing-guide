/**
 * Ops CLI — Subcommand router for `aiwg ops`
 *
 * Subcommands:
 *   init              — Bootstrap a new ops workspace
 *   status            — Show workspace health
 *   use <workspace>   — Switch active workspace
 *   list              — List registered workspaces
 *   push              — Push workspace repos to remote
 *
 * @implements #544
 */

import { OpsRegistry } from './registry.js';

/**
 * Main CLI entry point for `aiwg ops <subcommand> [args]`
 */
export async function main(args: string[]): Promise<void> {
  // Extract global flags
  let configDir: string | undefined;
  const filteredArgs: string[] = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--config-dir' && i + 1 < args.length) {
      configDir = args[i + 1];
      i++;
    } else {
      filteredArgs.push(args[i]);
    }
  }

  const subcommand = filteredArgs[0];
  const subArgs = filteredArgs.slice(1);

  const registry = new OpsRegistry(configDir);

  switch (subcommand) {
    case 'init':
      await handleInit(registry, subArgs);
      break;

    case 'status':
      await handleStatus(registry, subArgs);
      break;

    case 'use':
      await handleUse(registry, subArgs);
      break;

    case 'list':
    case 'ls':
      await handleList(registry);
      break;

    case 'push':
      await handlePush(registry, subArgs);
      break;

    case 'discover':
      await handleDiscover(registry, subArgs);
      break;

    case 'adopt':
      await handleAdopt(registry, subArgs);
      break;

    default:
      printUsage();
      if (subcommand) {
        throw new Error(`Unknown ops subcommand: ${subcommand}`);
      }
      break;
  }
}

async function handleInit(registry: OpsRegistry, args: string[]): Promise<void> {
  // Parse flags
  let silent = false;
  let workspace: string | undefined;
  let home: string | undefined;
  let mode: 'single-repo' | 'multi-repo' = 'multi-repo';
  let extensions = ['sys', 'it', 'dev'];
  let prefix: string | undefined;
  let provider: string | undefined;
  let from: string | undefined;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--silent': silent = true; break;
      case '--workspace': workspace = args[++i]; break;
      case '--home': home = args[++i]; break;
      case '--mode': mode = args[++i] as 'single-repo' | 'multi-repo'; break;
      case '--ext': extensions = args[++i].split(','); break;
      case '--prefix': prefix = args[++i]; break;
      case '--provider': provider = args[++i]; break;
      case '--from': from = args[++i]; break;
    }
  }

  if (!workspace) {
    workspace = 'default';
  }

  await registry.initWorkspace({
    name: workspace,
    home,
    mode,
    extensions,
    prefix,
    provider,
    silent,
    from,
  });
}

async function handleAdopt(registry: OpsRegistry, args: string[]): Promise<void> {
  let path: string | undefined;
  let workspace: string | undefined;
  let extensions: string[] | undefined;
  let name: string | undefined;
  let silent = false;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--workspace') workspace = args[++i];
    else if (a === '--ext') extensions = args[++i].split(',');
    else if (a === '--name') name = args[++i];
    else if (a === '--silent') silent = true;
    else if (!a.startsWith('--') && !path) path = a;
  }

  if (!path) {
    throw new Error('Usage: aiwg ops adopt <path> [--workspace <n>] [--ext <list>] [--name <n>]');
  }

  await registry.adoptRepo(path, { workspace, extensions, name, silent });
}

async function handleStatus(registry: OpsRegistry, args: string[]): Promise<void> {
  const showAll = args.includes('--all');
  await registry.showStatus(showAll);
}

async function handleUse(registry: OpsRegistry, args: string[]): Promise<void> {
  const workspace = args[0];
  if (!workspace) {
    throw new Error('Usage: aiwg ops use <workspace>');
  }
  await registry.switchWorkspace(workspace);
}

async function handleList(registry: OpsRegistry): Promise<void> {
  await registry.listWorkspaces();
}

async function handlePush(registry: OpsRegistry, args: string[]): Promise<void> {
  let workspace: string | undefined;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--workspace') {
      workspace = args[++i];
    }
  }
  await registry.pushWorkspace(workspace);
}

async function handleDiscover(registry: OpsRegistry, args: string[]): Promise<void> {
  const roots: string[] = [];
  let maxDepth = 3;
  let register = false;
  let workspaceName = 'discovered';
  let asJson = false;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--max-depth') {
      maxDepth = Number(args[++i]);
    } else if (a === '--register' || a === '--yes' || a === '-y') {
      register = true;
    } else if (a === '--workspace') {
      workspaceName = args[++i];
    } else if (a === '--json') {
      asJson = true;
    } else if (!a.startsWith('--')) {
      roots.push(a);
    }
  }

  const candidates = await registry.discoverWorkspaces({
    roots: roots.length > 0 ? roots : undefined,
    maxDepth,
  });

  if (asJson) {
    console.log(JSON.stringify({ candidates }, null, 2));
  } else if (candidates.length === 0) {
    console.log('No ops workspace candidates found.');
  } else {
    console.log(`Found ${candidates.length} candidate(s):\n`);
    console.log('  STATUS  NAME           REMOTE                                   PATH');
    for (const c of candidates) {
      const status = c.alreadyRegistered ? 'KNOWN ' : 'NEW   ';
      const name = (c.name + ' '.repeat(14)).slice(0, 14);
      const remote = (c.remote || '-').slice(0, 40).padEnd(40);
      console.log(`  ${status}  ${name} ${remote} ${c.path}`);
    }
    console.log('');
  }

  if (register) {
    const result = await registry.registerDiscovered(workspaceName, candidates);
    console.log(
      `Registered ${result.added} new entr${result.added === 1 ? 'y' : 'ies'} ` +
        `(skipped ${result.skipped} already-known) into workspace "${workspaceName}".`
    );
  } else if (candidates.some((c) => !c.alreadyRegistered)) {
    console.log('Run with --register to add NEW candidates to the registry.');
  }
}

function printUsage(): void {
  console.log(`Usage: aiwg ops <subcommand> [options]

Subcommands:
  init                    Bootstrap a new ops workspace
  status [--all]          Show workspace health
  use <workspace>         Switch active workspace
  list                    List registered workspaces
  push [--workspace <n>]  Push workspace repos to remote
  discover [root...]      Scan filesystem for orphaned ops-workspace clones
  adopt <path>            Register an existing local clone as a repo entry

Init options:
  --silent                Skip interactive prompts
  --workspace <name>      Workspace name (default: "default")
  --home <path>           Parent directory for repos
  --mode <mode>           single-repo or multi-repo (default: multi-repo)
  --ext <list>            Comma-separated extensions: sys,it,dev,stream
  --prefix <name>         Repo naming prefix (e.g., "myorg")
  --provider <name>       Remote provider for auto-push (github, gitea, or URL)
  --from <git-url>        Clone this URL into the target repo instead of init.
                          Requires single-repo mode or exactly one --ext value.

Global flags:
  --config-dir <path>     Override config directory

Examples:
  aiwg ops init
  aiwg ops init --silent --workspace personal --ext sys,dev
  aiwg ops init --mode single-repo --workspace homelab
  aiwg ops status
  aiwg ops status --all
  aiwg ops use client-acme
  aiwg ops list
  aiwg ops push --workspace personal
  aiwg ops discover ~/projects ~/work --max-depth 4
  aiwg ops discover --register --workspace home

Discover options:
  --max-depth <n>         Max walk depth from each root (default: 3)
  --register              Write NEW candidates into the registry
  --yes, -y               Alias for --register
  --workspace <name>      Bucket workspace for registered entries (default: "discovered")
  --json                  Machine-readable output

Adopt options:
  --workspace <name>      Workspace to attach to (default: "default")
  --ext <list>            Comma-separated extensions for the adopted repo
  --name <name>           Override repo name (default: basename of path)
  --silent                Suppress informational logging`);
}
