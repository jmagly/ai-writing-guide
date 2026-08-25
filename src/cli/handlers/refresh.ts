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
 * @issue #174, #482, #557, #694
 */

import type { CommandHandler, HandlerContext, HandlerResult } from './types.js';
import { promises as fs } from 'fs';
import path from 'path';
import { createScriptRunner } from './script-runner.js';
import { createUseHandler } from './use.js';
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
import {
  collectPackagedAgentInventory,
  normalizeAgentArtifactName,
  parseManagedArtifactMarker,
} from '../../agents/packaged-agent-inventory.js';
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

export async function currentBundledAgentBasenames(frameworkRoot: string): Promise<Set<string>> {
  return new Set((await collectPackagedAgentInventory(frameworkRoot)).keys());
}

export interface ProviderStaleAgentRemoval {
  provider: string;
  paths: string[];
}

async function readFrameworkVersion(frameworkRoot: string): Promise<string | null> {
  try {
    const pkg = JSON.parse(await fs.readFile(path.join(frameworkRoot, 'package.json'), 'utf8')) as {
      version?: unknown;
    };
    return typeof pkg.version === 'string' && pkg.version.length > 0 ? pkg.version : null;
  } catch {
    return null;
  }
}

function isOlderManagedVersion(deployedVersion: string, currentVersion: string): boolean {
  const parse = (version: string): { core: number[]; prerelease: string | null } | null => {
    const match = /^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/.exec(version);
    return match
      ? { core: [Number(match[1]), Number(match[2]), Number(match[3])], prerelease: match[4] ?? null }
      : null;
  };
  const deployed = parse(deployedVersion);
  const current = parse(currentVersion);
  if (!deployed || !current) return deployedVersion !== currentVersion;
  for (let index = 0; index < deployed.core.length; index += 1) {
    if (deployed.core[index] !== current.core[index]) {
      return deployed.core[index] < current.core[index];
    }
  }
  if (deployed.prerelease === current.prerelease) return false;
  if (deployed.prerelease === null) return false;
  if (current.prerelease === null) return true;
  return deployed.prerelease.localeCompare(current.prerelease, undefined, { numeric: true }) < 0;
}

export async function pruneStaleManagedAgentFiles(options: {
  projectRoot: string;
  frameworkRoot: string;
  /** Provider successfully refreshed in this invocation. */
  provider?: string;
  currentVersion?: string;
  dryRun?: boolean;
}): Promise<ProviderStaleAgentRemoval[]> {
  const desired = await currentBundledAgentBasenames(options.frameworkRoot);
  const currentVersion = options.currentVersion ?? await readFrameworkVersion(options.frameworkRoot);
  const removals: ProviderStaleAgentRemoval[] = [];

  for (const [provider, relDir] of Object.entries(PROVIDER_AGENT_DIRS)) {
    const dir = path.join(options.projectRoot, relDir);
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
      const file = path.join(dir, entry.name);
      let content;
      try {
        content = await fs.readFile(file, 'utf8');
      } catch {
        continue;
      }
      const marker = parseManagedArtifactMarker(content);
      if (marker?.source !== 'bundled') continue;

      const artifactName = normalizeAgentArtifactName(entry.name);
      const missingFromCurrentPackage = !desired.has(artifactName);
      // Addons have independent manifest versions. Comparing their managed
      // marker to the top-level package version makes a successful refresh
      // delete freshly restored addon agents. Version-based cleanup remains
      // valid for other provider trees that were not refreshed, while the
      // active provider removes only artifacts absent from current sources.
      const fromOlderPackage = provider !== options.provider
        && currentVersion !== null
        && isOlderManagedVersion(marker.version, currentVersion);
      if (!missingFromCurrentPackage && !fromOlderPackage) continue;

      const relFile = path.relative(options.projectRoot, file);
      if (!options.dryRun) await fs.rm(file, { force: true });
      let providerRemoval = removals.find((item) => item.provider === provider);
      if (!providerRemoval) {
        providerRemoval = { provider, paths: [] };
        removals.push(providerRemoval);
      }
      providerRemoval.paths.push(relFile);
    }
  }

  for (const removal of removals) removal.paths.sort((a, b) => a.localeCompare(b));
  return removals;
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

const MODEL_DEPLOY_VALUE_FLAGS = new Set([
  '--model', '--reasoning-model', '--coding-model', '--efficiency-model',
  '--filter', '--filter-role', '--model-tier',
]);
const MODEL_DEPLOY_BOOLEAN_FLAGS = new Set(['--save', '--save-user']);
export function collectModelDeployArgs(args: string[]): string[] {
  const forwarded: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (MODEL_DEPLOY_BOOLEAN_FLAGS.has(args[i])) forwarded.push(args[i]);
    else if (MODEL_DEPLOY_VALUE_FLAGS.has(args[i]) && args[i + 1]) {
      forwarded.push(args[i], args[++i]);
    }
  }
  return forwarded;
}

const REFRESH_HELP = `Usage: aiwg refresh [options]

Update AIWG, re-deploy installed frameworks, and run health verification.

Options:
  --dry-run                 Preview changes without updating or deploying
  --quiet                   Suppress progress output
  --skip-update             Skip the installation update
  --packages-only           Refresh remote packages only
  --provider <name>         Override provider auto-detection
  --channel <name>          Select the update channel (stable or main)
  --frameworks <list>       Re-deploy a comma-separated installed subset
  --model <name>            Override all deployed agent model tiers
  --reasoning-model <name>  Override the reasoning model tier
  --coding-model <name>     Override the coding model tier
  --efficiency-model <name> Override the efficiency model tier
  --filter <pattern>        Limit model deployment by agent name
  --filter-role <role>      Limit model deployment by role
  --model-tier <tier>       Limit model deployment by tier
  --save                    Save model overrides to the project
  --save-user               Save model overrides to user configuration
  -h, --help                Show this help without running refresh

Alias: aiwg sync (deprecated)`;

/**
 * Refresh command handler (formerly sync)
 */
export const refreshHandler: CommandHandler = {
  id: 'refresh',
  name: 'Refresh',
  description: 'Refresh AIWG to latest version and re-deploy installed frameworks',
  category: 'maintenance',
  aliases: ['--refresh', 'sync', '--sync'],

  async help(): Promise<HandlerResult> {
    return { exitCode: 0, message: REFRESH_HELP, rawOutput: true };
  },

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const dryRun = hasFlag(ctx.args, '--dry-run');
    const quiet = hasFlag(ctx.args, '--quiet');
    const skipUpdate = hasFlag(ctx.args, '--skip-update');
    const packagesOnly = hasFlag(ctx.args, '--packages-only');
    const provider = parseFlag(ctx.args, '--provider');
    const channel = parseFlag(ctx.args, '--channel');
    const frameworksArg = parseFlag(ctx.args, '--frameworks');
    const modelDeployArgs = collectModelDeployArgs(ctx.args);

    const frameworkRoot = await getFrameworkRoot();
    const runner = createScriptRunner(frameworkRoot);
    const activeUseHandler = createUseHandler();

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
    const deploymentFailures: string[] = [];
    let updateFailure: { exitCode: number } | null = null;
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
          updateFailure = { exitCode: updateResult.exitCode };
          if (!quiet) {
            ui.warn('Installation update failed; continuing with re-deployment. Run `aiwg installation show` for canonical-install diagnostics.');
          }
        }
      }
    } else {
      if (!quiet) ui.dim('  Skipping package update (--skip-update)');
    }

    // Step 4: Re-deploy frameworks. Both the default form and --all mean
    // "all installed", never the `aiwg use all` expansion meta-target. This
    // preserves the operator's selected footprint and removal symmetry.
    const refreshConfig = await readAiwgConfig(ctx.cwd);
    const installedFrameworks = Object.keys(refreshConfig?.installed ?? {});
    const requestedFrameworks = frameworksArg
      ? frameworksArg.split(',').map(item => item.trim()).filter(Boolean)
      : [];
    const frameworks = !frameworksArg || requestedFrameworks.includes('all')
      ? installedFrameworks
      : requestedFrameworks;
    if (!quiet) ui.info(dryRun ? 'Would re-deploy frameworks...' : 'Re-deploying frameworks...');

    if (!dryRun) {
      if (frameworks.length === 0 && !quiet) {
        ui.dim('  No installed frameworks or addons to re-deploy');
      }
      for (const fw of frameworks) {
        // Invoke the active installation's handler directly. The historical
        // deploy.mjs bridge shells out to the first `aiwg` on PATH, which can
        // be a different version/root and therefore cannot safely refresh
        // addons installed by this package (#143/#2102).
        const useResult = await activeUseHandler.execute({
          ...ctx,
          cwd: ctx.cwd,
          frameworkRoot,
          args: [
            fw,
            '--provider', detectedProvider,
            '--target', ctx.cwd,
            '--yes',
            '--json',
            ...modelDeployArgs,
          ],
          rawArgs: ['use', fw],
        });
        if (useResult.exitCode === 0) {
          if (!quiet) ui.success(`Deployed: ${fw}`);
        } else {
          deploymentFailures.push(fw);
          if (!quiet) ui.warn(`Deploy issue: ${fw} (exit ${useResult.exitCode})`);
        }
      }
    } else {
      if (!quiet) {
        if (frameworks.length === 0) ui.dim('    No installed frameworks or addons');
        for (const fw of frameworks) {
          ui.dim(`    Would re-deploy: ${fw}`);
        }
      }
    }

    // Step 4.25: Report planned project-local deploys (#1035).
    // The active use handler performs the actual project-local deploy during
    // framework refresh; this block surfaces dry-run and completion details.
    try {
      const plDiscovery = await discoverProjectLocalBundles(ctx.cwd);
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

    // Step 4.5: Stale deployment check (#621, #1460, #1799)
    if (!quiet) ui.info('Checking for stale deployments...');
    let staleAgentRemovals: ProviderStaleAgentRemoval[] = [];
    if (!dryRun && deploymentFailures.length === 0) {
      try {
        staleAgentRemovals = await pruneStaleManagedAgentFiles({
          projectRoot: ctx.cwd,
          frameworkRoot,
          provider: detectedProvider,
        });
        if (staleAgentRemovals.length > 0 && !quiet) {
          const total = staleAgentRemovals.reduce((sum, item) => sum + item.paths.length, 0);
          ui.success(
            `Removed ${total} stale AIWG-managed agent file${total === 1 ? '' : 's'} ` +
            `across ${staleAgentRemovals.length} provider${staleAgentRemovals.length === 1 ? '' : 's'}`,
          );
          for (const removal of staleAgentRemovals) {
            const shown = removal.paths.slice(0, 3).join(', ');
            const remainder = removal.paths.length - 3;
            ui.dim(
              `    ${removal.provider}: ${removal.paths.length} (${shown}${remainder > 0 ? `, ...and ${remainder} more` : ''})`,
            );
          }
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
        frameworks,
        skipUpdate,
        channel: channel || undefined,
        staleAgentRemovals,
        deploymentFailures,
        updateFailure,
      });
      console.log(output);
    }

    if (deploymentFailures.length > 0) {
      return {
        exitCode: 1,
        message: `Failed to re-deploy installed bundle(s): ${deploymentFailures.join(', ')}`,
      };
    }
    return { exitCode: 0 };
  },
};
