/**
 * Memory CLI — `aiwg memory <subcommand>`
 *
 * Thin subsystem wrapper around `runSubsystemCli('memory', ...)` for
 * the `memory` storage subsystem. Subcommands and behavior live in
 * `src/storage/subsystem-cli.ts` so memory and reflections share the
 * same implementation.
 *
 * @issue #934
 * @issue #966
 */

import { runSubsystemCli } from '../storage/subsystem-cli.js';
import type { ProjectMemoryLookup } from './project-registry.js';

interface ProjectMemoryCliOptions {
  id?: string;
  name?: string;
  workspace?: string;
  remote?: string;
  memoryRoot?: string;
}

export async function main(args: string[]): Promise<void> {
  if (args[0] === 'project') {
    await runProjectMemoryCli(args.slice(1));
    return;
  }
  await runSubsystemCli('memory', args);
}

async function runProjectMemoryCli(args: string[]): Promise<void> {
  const subcommand = args[0];
  const rest = args.slice(1);
  const json = rest.includes('--json');
  const registry = await import('./project-registry.js');

  switch (subcommand) {
    case 'register': {
      const opts = parseProjectMemoryOptions(rest);
      const entry = await registry.registerProjectMemory({
        workspaceRoot: opts.workspace,
        id: opts.id,
        name: opts.name,
        memoryRoot: opts.memoryRoot,
      });
      if (json) console.log(JSON.stringify(entry, null, 2));
      else {
        console.log(`Registered project memory: ${entry.id}`);
        console.log(`  workspace: ${entry.workspaceRoots.join(', ')}`);
        console.log(`  memory:    ${entry.memoryRoot}`);
      }
      break;
    }
    case 'inspect':
    case 'resolve': {
      const opts = parseProjectMemoryOptions(rest);
      if (subcommand === 'resolve') {
        const resolved = await registry.resolveProjectMemoryRoot(opts.workspace ?? process.cwd());
        if (json) console.log(JSON.stringify(resolved, null, 2));
        else {
          console.log(resolved.root);
          console.log(`source: ${resolved.source} (${resolved.reason})`);
        }
        break;
      }
      const lookup = await registry.lookupProjectMemory({
        id: opts.id,
        workspaceRoot: opts.workspace ?? (!opts.id && !opts.remote ? process.cwd() : undefined),
        gitRemote: opts.remote,
      });
      if (json) console.log(JSON.stringify(lookup, null, 2));
      else printLookup(lookup);
      break;
    }
    case 'list': {
      const manifest = await registry.readProjectMemoryManifest();
      if (json) console.log(JSON.stringify(manifest.projects, null, 2));
      else if (manifest.projects.length === 0) console.log('No registered project memory entries.');
      else for (const entry of manifest.projects) console.log(`${entry.id}\t${entry.name}\t${entry.memoryRoot}`);
      break;
    }
    case 'reindex': {
      const index = await registry.writeProjectMemoryIndex();
      if (json) console.log(JSON.stringify(index, null, 2));
      else console.log(`Reindexed ${Object.keys(index.byProjectId).length} project memory entr${Object.keys(index.byProjectId).length === 1 ? 'y' : 'ies'} at ${registry.projectMemoryIndexPath()}`);
      break;
    }
    case 'relocate': {
      const id = rest.find((arg) => !arg.startsWith('--'));
      const target = rest.filter((arg) => !arg.startsWith('--'))[1];
      if (!id || !target) throw new Error('Usage: aiwg memory project relocate <id> <memory-root> [--json]');
      const entry = await registry.relocateProjectMemory(id, target);
      if (json) console.log(JSON.stringify(entry, null, 2));
      else console.log(`Relocated ${entry.id} to ${entry.memoryRoot}`);
      break;
    }
    case 'remove': {
      const id = rest.find((arg) => !arg.startsWith('--'));
      if (!id) throw new Error('Usage: aiwg memory project remove <id> [--delete-files] [--json]');
      const removed = await registry.removeProjectMemory(id, { deleteFiles: rest.includes('--delete-files') });
      if (json) console.log(JSON.stringify({ removed }, null, 2));
      else console.log(removed ? `Removed project memory mapping: ${removed.id}` : `No project memory mapping found for: ${id}`);
      break;
    }
    default:
      printProjectMemoryUsage();
      if (subcommand) throw new Error(`Unknown memory project subcommand: ${subcommand}`);
  }
}

function parseProjectMemoryOptions(args: string[]): ProjectMemoryCliOptions {
  const opts: ProjectMemoryCliOptions = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--id') opts.id = args[++i];
    else if (arg === '--name') opts.name = args[++i];
    else if (arg === '--workspace') opts.workspace = args[++i];
    else if (arg === '--remote') opts.remote = args[++i];
    else if (arg === '--memory-root') opts.memoryRoot = args[++i];
  }
  return opts;
}

function printLookup(lookup: ProjectMemoryLookup): void {
  if (lookup.status === 'missing') {
    console.log(`No project memory mapping found: ${lookup.reason}`);
    return;
  }
  if (lookup.status === 'ambiguous') {
    console.log(lookup.reason);
    for (const entry of lookup.entries) console.log(`  ${entry.id}\t${entry.memoryRoot}`);
    return;
  }
  console.log(`Project memory: ${lookup.entry.id}`);
  console.log(`  matched by: ${lookup.matchedBy}`);
  console.log(`  name:       ${lookup.entry.name}`);
  console.log(`  memory:     ${lookup.entry.memoryRoot}`);
  console.log(`  workspace:  ${lookup.entry.workspaceRoots.join(', ')}`);
  if (lookup.entry.gitRemotes.length > 0) console.log(`  remotes:    ${lookup.entry.gitRemotes.join(', ')}`);
}

function printProjectMemoryUsage(): void {
  console.log(`Usage: aiwg memory project <subcommand>

Subcommands:
  register [--id <id>] [--name <name>] [--workspace <path>] [--memory-root <path>] [--json]
  inspect [--id <id> | --workspace <path> | --remote <url>] [--json]
  resolve [--workspace <path>] [--json]
  list [--json]
  reindex [--json]
  relocate <id> <memory-root> [--json]
  remove <id> [--delete-files] [--json]

The manifest lives at ~/.aiwg/projects/manifest.json and each registered
project memory root uses a private .aiwg layout under ~/.aiwg/projects/<id>/.aiwg.`);
}
