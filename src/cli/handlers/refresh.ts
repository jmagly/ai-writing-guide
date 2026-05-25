/**
 * Refresh Command Handler (formerly Sync)
 *
 * Ensures the active session's AIWG deployment matches the latest published
 * version under the current provider. Orchestrates: version check → update →
 * re-deploy all installed frameworks → health verification.
 *
 * Renamed from `aiwg sync` to `aiwg refresh` to avoid collision with
 * git repo sync semantics (#694). `aiwg sync` remains as a deprecated alias.
 *
 * @implements @agentic/code/frameworks/sdlc-complete/rules/self-maintenance.md
 * @source @src/cli/router.ts
 * @issue #482, #557, #694
 */

import type { CommandHandler, HandlerContext, HandlerResult } from './types.js';
import { promises as fs } from 'fs';
import path from 'path';
import { createScriptRunner } from './script-runner.js';
import { getFrameworkRoot } from '../../channel/manager.mjs';
import { refreshAllPackages } from '../../packages/registry.js';
import { resolveActiveProvider } from '../provider-resolution.js';
import {
  readAiwgConfig,
  writeAiwgConfig,
  hashManifest,
  getProviderParallelismDefaults,
} from '../../config/aiwg-config.js';
import { discoverProjectLocalBundles } from '../../extensions/project-local-discovery.js';
import * as ui from '../ui.js';

const PROVIDER_AGENT_DIRS: Record<string, string> = {
  claude: '.claude/agents',
  codex: '.codex/agents',
  copilot: '.github/agents',
  cursor: '.cursor/agents',
  factory: '.factory/droids',
  opencode: '.opencode/agent',
  warp: '.warp/agents',
  windsurf: '.windsurf/agents',
};

async function collectAgentBasenames(rootDir: string, names: Set<string>): Promise<void> {
  let entries;
  try {
    entries = await fs.readdir(rootDir, { withFileTypes: true });
  } catch {
    return;
  }

  if (path.basename(rootDir) === 'agents') {
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md')) names.add(path.basename(entry.name, '.md'));
    }
  }

  await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => collectAgentBasenames(path.join(rootDir, entry.name), names)),
  );
}

export async function currentBundledAgentBasenames(frameworkRoot: string): Promise<Set<string>> {
  const names = new Set<string>();
  await Promise.all([
    collectAgentBasenames(path.join(frameworkRoot, 'agentic', 'code', 'frameworks'), names),
    collectAgentBasenames(path.join(frameworkRoot, 'agentic', 'code', 'addons'), names),
  ]);
  return names;
}

function isBundledManagedArtifact(content: string): boolean {
  return /(?:^|\n)(?:#|<!--)\s*aiwg:managed\s+\S+\s+bundled(?:\s*-->)?/.test(content);
}

export async function pruneStaleManagedAgentFiles(options: {
  projectRoot: string;
  frameworkRoot: string;
  provider?: string;
  dryRun?: boolean;
}): Promise<string[]> {
  const desired = await currentBundledAgentBasenames(options.frameworkRoot);
  const providerDirs = options.provider
    ? [PROVIDER_AGENT_DIRS[options.provider]].filter((dir): dir is string => Boolean(dir))
    : Object.values(PROVIDER_AGENT_DIRS);
  const removed: string[] = [];

  for (const relDir of providerDirs) {
    const dir = path.join(options.projectRoot, relDir);
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
      const basename = path.basename(entry.name, '.md');
      if (desired.has(basename)) continue;

      const file = path.join(dir, entry.name);
      let content;
      try {
        content = await fs.readFile(file, 'utf8');
      } catch {
        continue;
      }
      if (!isBundledManagedArtifact(content)) continue;

      const relFile = path.relative(options.projectRoot, file);
      if (!options.dryRun) await fs.rm(file, { force: true });
      removed.push(relFile);
    }
  }

  return removed;
}

/**
 * Parse --flag value pairs from args
 */
function parseFlag(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx + 1 >= args.length) return undefined;
  return args[idx + 1];
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

/**
 * Refresh command handler (formerly sync)
 */
export const refreshHandler: CommandHandler = {
  id: 'refresh',
  name: 'Refresh',
  description: 'Refresh AIWG to latest version and re-deploy all frameworks',
  category: 'maintenance',
  aliases: ['--refresh', 'sync', '--sync'],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const dryRun = hasFlag(ctx.args, '--dry-run');
    const quiet = hasFlag(ctx.args, '--quiet');
    const skipUpdate = hasFlag(ctx.args, '--skip-update');
    const packagesOnly = hasFlag(ctx.args, '--packages-only');
    const provider = parseFlag(ctx.args, '--provider');
    const channel = parseFlag(ctx.args, '--channel');
    const frameworksArg = parseFlag(ctx.args, '--frameworks');

    const frameworkRoot = await getFrameworkRoot();
    const runner = createScriptRunner(frameworkRoot);

    if (!quiet) {
      ui.blank();
      // Deprecation notice when invoked as 'sync'
      const invokedAs = ctx.rawArgs[0]?.toLowerCase();
      if (invokedAs === 'sync' || invokedAs === '--sync') {
        ui.warn("'aiwg sync' is deprecated — use 'aiwg refresh' instead (renamed to avoid git sync confusion)");
      }
      console.log(`  ${ui.brandMark()} ${ui.bold('aiwg refresh')}${dryRun ? ui.dimText('  (dry run)') : ''}`);
      ui.rule();
    }

    // Step 1: Detect provider
    if (!quiet) ui.info('Detecting provider...');
    await runner.run('tools/cli/runtime-info.mjs', [], { capture: true });
    const resolution = await resolveActiveProvider({ cwd: ctx.cwd, explicitProvider: provider, detectProcess: true });
    if (!resolution.provider) {
      if (!quiet) ui.warn('Provider detection ambiguous: ' + resolution.reason + '. Specify --provider <name>.');
      return { exitCode: 2, message: 'Provider detection ambiguous: ' + resolution.reason };
    }
    const detectedProvider = resolution.provider;
    if (!quiet) ui.success('Provider: ' + detectedProvider);

    // Step 2: Check current version
    if (!quiet) ui.info('Checking version...');
    await runner.run('tools/cli/version.mjs', ['--json'], { capture: true });
    if (!quiet) ui.success('Version check complete');

    // Step 2.5: Refresh remote packages (always, unless --packages-only skips npm)
    if (!quiet) ui.info(dryRun ? 'Would refresh remote packages...' : 'Refreshing remote packages...');
    if (!dryRun) {
      try {
        const refreshed = await refreshAllPackages();
        if (refreshed.length > 0) {
          if (!quiet) ui.success(`Refreshed ${refreshed.length} remote package${refreshed.length > 1 ? 's' : ''}: ${refreshed.join(', ')}`);
        } else {
          if (!quiet) ui.dim('  No remote packages registered');
        }
      } catch (error) {
        if (!quiet) ui.warn(`Remote package refresh failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (packagesOnly) {
      if (!quiet) {
        ui.rule();
        ui.success('Remote packages refreshed (--packages-only, skipping npm update and framework deploy)');
        ui.blank();
      }
      return { exitCode: 0 };
    }

    // Step 3: Update package (unless --skip-update)
    if (!skipUpdate) {
      if (!quiet) ui.info(dryRun ? 'Would check for updates...' : 'Checking for updates...');
      if (!dryRun) {
        const channelArgs = channel ? ['--channel', channel] : [];
        const updateResult = await runner.run('tools/cli/update.mjs', channelArgs, { capture: quiet });
        if (updateResult.exitCode === 0) {
          if (!quiet) ui.success('Package up to date');
        } else {
          if (!quiet) ui.warn('Update check returned non-zero (may already be current)');
        }
      }
    } else {
      if (!quiet) ui.dim('  Skipping package update (--skip-update)');
    }

    // Step 4: Re-deploy frameworks
    const frameworks = frameworksArg ? frameworksArg.split(',') : undefined;
    if (!quiet) ui.info(dryRun ? 'Would re-deploy frameworks...' : 'Re-deploying frameworks...');

    if (!dryRun) {
      const deployTarget = frameworks || ['all'];
      for (const fw of deployTarget) {
        const providerArgs = ['--provider', detectedProvider];
        const useResult = await runner.run(
          'tools/cli/deploy.mjs',
          [fw, ...providerArgs],
          { capture: quiet }
        );
        if (useResult.exitCode === 0) {
          if (!quiet) ui.success(`Deployed: ${fw}`);
        } else {
          if (!quiet) ui.warn(`Deploy issue: ${fw} (exit ${useResult.exitCode})`);
        }
      }
    } else {
      const targets = frameworks || ['all installed frameworks'];
      if (!quiet) {
        for (const fw of targets) {
          ui.dim(`    Would re-deploy: ${fw}`);
        }
      }
    }

    // Step 4.25: Report planned project-local deploys (#1035).
    // The actual deploy is performed by `aiwg use` underneath via deploy.mjs;
    // this block surfaces what *would* happen during dry-run and what was
    // covered during a real refresh.
    try {
      const plDiscovery = await discoverProjectLocalBundles(process.cwd());
      const plCount = plDiscovery.bundles.length;
      if (plCount > 0) {
        if (dryRun) {
          if (!quiet) {
            ui.info(`Would re-deploy ${plCount} project-local bundle(s):`);
            for (const b of plDiscovery.bundles) {
              ui.dim(`    ${b.type} '${b.id}' from ${b.localPath}`);
            }
          }
        } else {
          if (!quiet) ui.success(`Project-local: ${plCount} bundle(s) re-deployed via 'aiwg use'`);
        }
      }
      if (plDiscovery.errors.length > 0 && !quiet) {
        ui.warn(`Project-local discovery: ${plDiscovery.errors.length} validation error(s) — run 'aiwg list --project-local' for details`);
      }
    } catch {
      // Non-fatal — refresh continues
    }

    // Step 4.5: Stale deployment check (#621, #1460)
    if (!quiet) ui.info('Checking for stale deployments...');
    if (!dryRun) {
      try {
        const removedAgents = await pruneStaleManagedAgentFiles({
          projectRoot: process.cwd(),
          frameworkRoot,
          provider: detectedProvider,
        });
        if (removedAgents.length > 0 && !quiet) {
          ui.success(`Removed ${removedAgents.length} stale AIWG-managed agent file${removedAgents.length === 1 ? '' : 's'}`);
          for (const file of removedAgents.slice(0, 5)) ui.dim(`    ${file}`);
          if (removedAgents.length > 5) ui.dim(`    ...and ${removedAgents.length - 5} more`);
        }
      } catch {
        if (!quiet) ui.dim('  Agent orphan cleanup skipped (non-critical)');
      }

      try {
        const { getFrameworkRoot } = await import('../../channel/manager.mjs');
        const { join } = await import('path');
        const config = await readAiwgConfig(process.cwd());
        if (config) {
          const MANIFEST_PATHS: Record<string, string> = {
            sdlc: 'agentic/code/frameworks/sdlc-complete/manifest.json',
            marketing: 'agentic/code/frameworks/media-marketing-kit/manifest.json',
            'media-curator': 'agentic/code/frameworks/media-curator/manifest.json',
            research: 'agentic/code/frameworks/research-complete/manifest.json',
          };
          const frameworkRoot = await getFrameworkRoot();
          // Batch-hash manifests in parallel instead of serially awaiting each
          // one. For ~10 frameworks this cuts refresh latency from ~N*I/O to
          // max-single-I/O on a warm filesystem (#919 cleanup).
          const hashChecks = await Promise.all(
            Object.entries(config.installed).map(async ([name, entry]) => {
              if (!entry.manifestHash) return null;
              const relPath = MANIFEST_PATHS[name];
              if (!relPath) return null;
              const currentHash = await hashManifest(join(frameworkRoot, relPath));
              return currentHash && currentHash !== entry.manifestHash ? name : null;
            }),
          );
          const stale: string[] = hashChecks.filter((n): n is string => n !== null);
          if (stale.length > 0) {
            for (const name of stale) {
              ui.warn(`Stale deployment: ${name} — run 'aiwg use ${name}' to redeploy`);
            }
          } else {
            if (!quiet) ui.success('All deployments up to date');
          }
        } else {
          if (!quiet) ui.dim('  No aiwg.config — skipping stale check');
        }
      } catch {
        if (!quiet) ui.dim('  Stale check skipped (non-critical)');
      }
    }

    // Step 4.6: Migrate aiwg.config — add parallelism block if missing (#1359)
    if (!dryRun) {
      try {
        const config = await readAiwgConfig(process.cwd());
        if (config && !config.parallelism) {
          const primary = config.providers[0];
          const defaults = getProviderParallelismDefaults(primary);
          config.parallelism = {
            max_parallel_subagents: defaults.max_parallel_subagents,
            max_parallel_ralph_loops: defaults.max_parallel_ralph_loops,
            max_parallel_mc_missions: defaults.max_parallel_mc_missions,
            rationale: `Provider default for ${primary ?? 'unknown'} (migrated by aiwg refresh)`,
          };
          await writeAiwgConfig(process.cwd(), config);
          if (!quiet) {
            ui.success(
              `Added parallelism block to .aiwg/aiwg.config (max_parallel_subagents=${defaults.max_parallel_subagents})`,
            );
          }
        }
      } catch {
        // Non-fatal — refresh continues even if migration fails
      }
    }

    // Step 5: Health check
    if (!quiet) ui.info(dryRun ? 'Would run health check...' : 'Running health check...');
    if (!dryRun) {
      const doctorResult = await runner.run('tools/cli/doctor.mjs', [], { capture: quiet });
      if (doctorResult.exitCode === 0) {
        if (!quiet) ui.success('Health check passed');
      } else {
        if (!quiet) ui.warn('Health check found issues (run `aiwg doctor` for details)');
      }
    }

    // Summary
    if (!quiet) {
      ui.rule();
      if (dryRun) {
        ui.info('Dry run complete — no changes made');
      } else {
        ui.success('Refresh complete');
      }
      ui.blank();
    }

    // Quiet mode: JSON output
    if (quiet) {
      const output = JSON.stringify({
        status: dryRun ? 'dry-run' : 'refreshed',
        provider: detectedProvider,
        frameworks: frameworks || ['all'],
        skipUpdate,
        channel: channel || undefined,
      });
      console.log(output);
    }

    return { exitCode: dryRun ? 0 : 0 };
  },
};
