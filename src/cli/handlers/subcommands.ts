/**
 * Subcommand Handlers
 *
 * Handlers for MCP, catalog, plugin, and other subcommands.
 * Handles CLI subcommand routing.
 *
 * @implements @.aiwg/architecture/decisions/ADR-001-unified-extension-system.md
 * @implements #56, #57
 * @source @src/cli/router.ts
 * @tests @test/unit/cli/handlers/subcommands.test.ts
 * @issue #33
 */

import type { CommandHandler, HandlerContext, HandlerResult } from "./types.js";
import { createScriptRunner } from "./script-runner.js";
import { getFrameworkRoot } from "../../channel/manager.mjs";
import { getRegistry } from "../../extensions/registry.js";
import { registerDeployedExtensions } from "../../extensions/deployment-registration.js";
import { discoverProjectLocalBundles } from "../../extensions/project-local-discovery.js";
import { buildUpstreamRegistry } from "../../extensions/upstream-registry.js";
import { resolveShadows } from "../../extensions/shadow-resolver.js";
import { sessionHandler } from "./session.js";
import { feedbackHandler } from "./feedback.js";
import { handlerResultFromError } from "../errors.js";

/**
 * MCP server command handler
 *
 * Dynamically imports and delegates to src/mcp/cli.mjs.
 * Handles subcommands: serve, install, info
 */
export const mcpHandler: CommandHandler = {
  id: "aiwg-mcp-server",
  name: "AIWG MCP Server",
  description: "AIWG MCP server commands (serve, install, add, remove, update, list, inject, info)",
  category: "mcp",
  aliases: ["mcp", "aiwg-mcp"],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    try {
      // Dynamic import to avoid loading MCP dependencies unless needed
      const { main } = await import("../../mcp/cli.mjs");
      await main(ctx.args);

      return {
        exitCode: 0,
      };
    } catch (error) {
      const result = handlerResultFromError(error);
      return { ...result, message: `MCP command failed: ${result.message}` };
    }
  },
};

/**
 * Model catalog command handler
 *
 * Dynamically imports and delegates to src/catalog/cli.mjs.
 * Handles subcommands: list, info, search
 */
export const catalogHandler: CommandHandler = {
  id: "catalog",
  name: "Model Catalog",
  description: "Model catalog commands (list, info, search)",
  category: "catalog",
  aliases: [],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    try {
      // Dynamic import to avoid loading catalog dependencies unless needed
      const { main } = await import("../../catalog/cli.mjs");
      await main(ctx.args);

      return {
        exitCode: 0,
      };
    } catch (error) {
      const result = handlerResultFromError(error);
      return { ...result, message: `Catalog command failed: ${result.message}` };
    }
  },
};

/**
 * List frameworks handler
 *
 * Lists deployed extensions from the registry.
 * Falls back to legacy plugin-status script if needed.
 */
export const listHandler: CommandHandler = {
  id: "list",
  name: "List Frameworks",
  description: "List installed frameworks and plugins",
  category: "framework",
  aliases: ["ls"],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    // Filter args: positional type filter, plus --project-local flag (#1034)
    const projectLocalOnly = ctx.args.includes('--project-local');
    const shadowsOnly = ctx.args.includes('--shadows');
    const filterType = ctx.args.find((a) => !a.startsWith('--')); // 'agents'|'skills'|'commands'|'all'|undefined

    // #1156 Phase 1 — --scope user / --user surfaces the per-user registry
    // (~/.aiwg/installed.json) instead of the project-scope deployed-extensions
    // registry. Works from any cwd; does not require a project to be present.
    const userScopeRequested = ctx.args.includes('--user') || isScopeUser(ctx.args);
    if (userScopeRequested) {
      return await formatUserScopeRegistry();
    }

    // Project-local bundle discovery (#1034) — read-only scan, no deploy
    const projectLocal = await discoverProjectLocalBundles(ctx.cwd);

    if (shadowsOnly) {
      // #1036 — surface only artifacts that shadow upstream
      return await formatShadowsOnly(projectLocal);
    }

    if (projectLocalOnly) {
      // --project-local: only show project-local bundles; skip the deployed-
      // extension registry read entirely
      return formatProjectLocalOnly(projectLocal);
    }

    // Ensure registry is populated with deployed extensions
    const registry = getRegistry();

    // If registry is empty, try to populate it
    if (registry.size === 0) {
      try {
        await registerDeployedExtensions(registry, {
          agentsPath: '.claude/agents',
          skillsPath: '.claude/skills',
          commandsPath: '.claude/commands',
          provider: 'claude',
          cwd: ctx.cwd,
        });
      } catch (error) {
        // If registry population fails, fall back to legacy script
        const frameworkRoot = await getFrameworkRoot();
        const runner = createScriptRunner(frameworkRoot);
        return runner.run("tools/plugin/plugin-status-cli.mjs", ctx.args, {
          cwd: ctx.cwd,
        });
      }
    }

    // Determine what to show
    const showAgents = !filterType || filterType === 'agents' || filterType === 'all';
    const showSkills = !filterType || filterType === 'skills' || filterType === 'all';
    const showCommands = !filterType || filterType === 'commands' || filterType === 'all';

    let output = '';

    if (showAgents) {
      const agents = registry.getByType('agent');
      output += `\nAgents (${agents.length}):\n`;
      output += '─'.repeat(60) + '\n';

      if (agents.length === 0) {
        output += '  No agents deployed\n';
      } else {
        for (const agent of agents.slice(0, 20)) { // Limit to 20 for readability
          output += `  ${agent.name}\n`;
          output += `    ID: ${agent.id}\n`;
          output += `    Description: ${agent.description.slice(0, 80)}${agent.description.length > 80 ? '...' : ''}\n`;
          if (agent.installation) {
            output += `    Path: ${agent.installation.installedPath}\n`;
          }
          output += '\n';
        }
        if (agents.length > 20) {
          output += `  ... and ${agents.length - 20} more\n`;
        }
      }
    }

    if (showSkills) {
      const skills = registry.getByType('skill');
      output += `\nSkills (${skills.length}):\n`;
      output += '─'.repeat(60) + '\n';

      if (skills.length === 0) {
        output += '  No skills deployed\n';
      } else {
        for (const skill of skills.slice(0, 20)) {
          output += `  ${skill.name}\n`;
          output += `    ID: ${skill.id}\n`;
          output += `    Description: ${skill.description.slice(0, 80)}${skill.description.length > 80 ? '...' : ''}\n`;
          if (skill.installation) {
            output += `    Path: ${skill.installation.installedPath}\n`;
          }
          output += '\n';
        }
        if (skills.length > 20) {
          output += `  ... and ${skills.length - 20} more\n`;
        }
      }
    }

    if (showCommands) {
      const commands = registry.getByType('command');
      output += `\nCommands (${commands.length}):\n`;
      output += '─'.repeat(60) + '\n';

      if (commands.length === 0) {
        output += '  No commands registered\n';
      } else {
        for (const command of commands.slice(0, 20)) {
          output += `  ${command.name}\n`;
          output += `    ID: ${command.id}\n`;
          output += `    Description: ${command.description.slice(0, 80)}${command.description.length > 80 ? '...' : ''}\n`;
          output += '\n';
        }
        if (commands.length > 20) {
          output += `  ... and ${commands.length - 20} more\n`;
        }
      }
    }

    // Project-local bundles (#1034) — surfaced as a separate section with
    // [project] source label
    const totalProjectLocal =
      projectLocal.counts.extension +
      projectLocal.counts.addon +
      projectLocal.counts.framework +
      projectLocal.counts.plugin;

    if (totalProjectLocal > 0 || projectLocal.errors.length > 0) {
      output += `\nProject-local bundles (${totalProjectLocal}):\n`;
      output += '─'.repeat(60) + '\n';
      for (const b of projectLocal.bundles) {
        output += `  ${b.id} [project] [${b.type}]\n`;
        output += `    Path: ${b.localPath}\n`;
        output += `    Description: ${b.manifest.description.slice(0, 80)}${b.manifest.description.length > 80 ? '...' : ''}\n\n`;
      }
      if (projectLocal.errors.length > 0) {
        output += `  ⚠ ${projectLocal.errors.length} validation error(s) — see "aiwg doctor" for details\n`;
      }
    }

    // Summary
    const totalAgents = registry.getByType('agent').length;
    const totalSkills = registry.getByType('skill').length;
    const totalCommands = registry.getByType('command').length;
    const total = totalAgents + totalSkills + totalCommands;

    output += '\n' + '═'.repeat(60) + '\n';
    output += `Total: ${total} extensions (${totalAgents} agents, ${totalSkills} skills, ${totalCommands} commands)`;
    if (totalProjectLocal > 0) {
      output += ` + ${totalProjectLocal} project-local`;
    }
    output += '\n';

    if (total === 0 && totalProjectLocal === 0) {
      output += '\nTip: Deploy a framework with "aiwg use sdlc" to get started\n';
    } else if (totalCommands === 0 && totalAgents > 0) {
      // Skill-only model (Claude Code default): commands aren't deployed as
      // slash commands; capabilities reach the agent via natural language or
      // `aiwg discover` (#1228). Surface this so 0 commands doesn't look like
      // a deploy failure.
      output += '\nNote: 0 commands is expected on Claude Code — capabilities are reached via natural language or `aiwg discover "<phrase>"`.\n';
    }

    return {
      exitCode: 0,
      message: output,
    };
  },
};

/**
 * Format `aiwg list --project-local` output: only project-local bundles, with
 * per-type breakdown and any validation errors surfaced. (#1034)
 */
function formatProjectLocalOnly(
  result: Awaited<ReturnType<typeof discoverProjectLocalBundles>>
): HandlerResult {
  let output = '';
  const total =
    result.counts.extension +
    result.counts.addon +
    result.counts.framework +
    result.counts.plugin;

  if (total === 0 && result.errors.length === 0) {
    output += '\nNo project-local bundles found.\n';
    output += '\nTip: place a manifest.json under .aiwg/{extensions,addons,frameworks,plugins}/<name>/ to author a project-local artifact.\n';
    return { exitCode: 0, message: output };
  }

  output += `\nProject-local bundles (${total}):\n`;
  output += '─'.repeat(60) + '\n';
  for (const b of result.bundles) {
    output += `  ${b.id} [project] [${b.type}] v${b.manifest.version}\n`;
    output += `    Path: ${b.localPath}\n`;
    output += `    Description: ${b.manifest.description.slice(0, 80)}${b.manifest.description.length > 80 ? '...' : ''}\n\n`;
  }

  if (result.errors.length > 0) {
    output += '\nValidation errors:\n';
    output += '─'.repeat(60) + '\n';
    for (const e of result.errors.slice(0, 10)) {
      output += `  [${e.severity}] ${e.path}\n`;
      output += `    ${e.field}: expected ${e.expected}, got ${e.actual}\n`;
      if (e.hint) output += `    hint: ${e.hint}\n`;
    }
    if (result.errors.length > 10) {
      output += `  ... and ${result.errors.length - 10} more\n`;
    }
  }

  output += '\n' + '═'.repeat(60) + '\n';
  output += `Counts by type: extension=${result.counts.extension} addon=${result.counts.addon} framework=${result.counts.framework} plugin=${result.counts.plugin}\n`;

  return { exitCode: 0, message: output };
}

/**
 * Format `aiwg list --shadows` output: only artifacts that currently shadow
 * an upstream artifact, with safety-critical and override status. (#1036)
 */
async function formatShadowsOnly(
  projectLocal: Awaited<ReturnType<typeof discoverProjectLocalBundles>>
): Promise<HandlerResult> {
  let output = '';

  if (projectLocal.bundles.length === 0) {
    output += '\nNo project-local bundles — no shadows possible.\n';
    return { exitCode: 0, message: output };
  }

  const { getFrameworkRoot: gfr } = await import('../../channel/manager.mjs');
  const frameworkRoot = await gfr();
  const upstream = await buildUpstreamRegistry({ frameworkRoot });
  const result = await resolveShadows(projectLocal.bundles, upstream);

  if (result.shadows.length === 0) {
    output += '\nNo active shadows.\n';
    output += '\nProject-local bundles deploy alongside upstream without collision.\n';
    return { exitCode: 0, message: output };
  }

  output += `\nActive shadows (${result.shadows.length}):\n`;
  output += '─'.repeat(60) + '\n';
  for (const r of result.shadows) {
    const sc = r.upstream?.safetyCritical ? ' [SAFETY-CRITICAL]' : '';
    output += `  ${r.artifactType}/${r.artifactId}${sc}\n`;
    output += `    Bundle: ${r.bundleId} (${r.bundleLocalPath})\n`;
    output += `    Project-local: ${r.artifactSourcePath}\n`;
    if (r.upstream) {
      output += `    Shadows ${r.upstream.source}: ${r.upstream.sourcePath}\n`;
    }
    output += `    Verdict: ${r.verdict}\n\n`;
  }

  if (result.blockedBundleIds.size > 0) {
    output += `\n⚠ ${result.blockedBundleIds.size} bundle(s) blocked from deployment due to unsafe shadows.\n`;
  }

  return { exitCode: 0, message: output };
}

/**
 * #1156 Phase 1 — `--scope user` detection. Mirrors `detectScope()` from
 * scope-resolver but tolerates the absence of the flag (no throw on absent).
 * Returns true when args contain `--scope user`.
 */
function isScopeUser(args: ReadonlyArray<string>): boolean {
  const idx = args.findIndex((a) => a === '--scope');
  if (idx === -1) return false;
  return args[idx + 1] === 'user';
}

/**
 * #1156 Phase 1 — Format the per-user registry (~/.aiwg/installed.json) as a
 * human-readable inventory. Used by `aiwg list --scope user` / `aiwg list
 * --user`. Independent of any project — works from any cwd.
 */
async function formatUserScopeRegistry(): Promise<HandlerResult> {
  const { readUserRegistry, userRegistryPath } = await import('../../config/user-registry.js');
  const registry = await readUserRegistry();
  const frameworks = Object.entries(registry.installed);

  let output = '';
  if (frameworks.length === 0) {
    output += '\nNo frameworks deployed at user scope.\n';
    output += `\nRegistry path: ${userRegistryPath()}\n`;
    output += '\nTip: run `aiwg use <framework> --provider <p> --scope user` to install at user scope.\n';
    return { exitCode: 0, message: output };
  }

  output += `\nUser-scope deployments (${frameworks.length}):\n`;
  output += '─'.repeat(60) + '\n';
  for (const [name, entry] of frameworks) {
    output += `  ${name}  v${entry.version}  [${entry.source}]\n`;
    output += `    Installed: ${entry.installedAt}\n`;
    const providers = Object.entries(entry.deployedTo);
    for (const [provider, counts] of providers) {
      const parts: string[] = [];
      if (counts.agents > 0) parts.push(`${counts.agents} agents`);
      if (counts.commands > 0) parts.push(`${counts.commands} commands`);
      if (counts.skills > 0) parts.push(`${counts.skills} skills`);
      if (counts.rules > 0) parts.push(`${counts.rules} rules`);
      output += `    ${provider}: ${parts.length > 0 ? parts.join(', ') : '(empty)'}\n`;
    }
    output += '\n';
  }

  output += '═'.repeat(60) + '\n';
  output += `Registry path: ${userRegistryPath()}\n`;
  return { exitCode: 0, message: output };
}

/**
 * #1156 Phase 1 — Revert a user-scope mirror.
 *
 * Reads `~/.aiwg/installed.json`, looks up the framework + provider entry,
 * and deletes the specific artifact entries this deploy created (recorded
 * by the mirror in Cycle 3). With `--dry-run`, lists what would be removed
 * without touching the filesystem.
 *
 * Back-compat: registry entries written before Cycle 3 lack the `entries`
 * snapshot. For those, the handler falls back to the conservative
 * registry-only revert and tells the operator to clean up manually.
 *
 * Multi-provider: if `--provider` is omitted, all of the framework's
 * provider deployments are reverted in one pass.
 */
async function removeUserScopeDeploy(args: ReadonlyArray<string>): Promise<HandlerResult> {
  const positional = args.find(a => !a.startsWith('-'));
  if (!positional) {
    return {
      exitCode: 1,
      message: 'Error: framework name required\n\nUsage: aiwg remove <framework> --scope user [--provider <p>] [--dry-run]',
    };
  }

  const dryRun = args.includes('--dry-run');
  const provIdx = args.findIndex(a => a === '--provider' || a === '--platform');
  const provider = provIdx >= 0 ? args[provIdx + 1] : undefined;

  const { readUserRegistry, removeUserDeploy } = await import('../../config/user-registry.js');
  const { USER_SCOPE_PATHS } = await import('../scope-resolver.js');
  const registry = await readUserRegistry();
  const entry = registry.installed[positional];
  if (!entry) {
    return {
      exitCode: 1,
      message: `Error: framework '${positional}' is not deployed at user scope.\n\nRun 'aiwg list --scope user' to see installed frameworks.`,
    };
  }

  const providersToRevert = provider ? [provider] : Object.keys(entry.deployedTo);
  if (provider && !entry.deployedTo[provider]) {
    return {
      exitCode: 1,
      message: `Error: framework '${positional}' is not deployed at user scope for provider '${provider}'.\n\nDeployed providers: ${Object.keys(entry.deployedTo).join(', ') || '(none)'}`,
    };
  }

  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const linesOut: string[] = [];
  if (dryRun) linesOut.push(`[dry-run] Plan for user-scope remove of '${positional}':`);
  else linesOut.push(`Removing user-scope mirror of '${positional}':`);

  let totalDeleted = 0;
  let conservativeFallbackUsed = false;

  for (const p of providersToRevert) {
    const userPaths = USER_SCOPE_PATHS[p];
    if (!userPaths) {
      linesOut.push(`  ⚠ ${p}: no user-scope paths registered — skipping (manual cleanup may be needed)`);
      continue;
    }

    // Cast through unknown to access the optional `entries` snapshot recorded
    // by the Cycle 3 mirror. Older registry entries won't have it.
    const providerEntry = entry.deployedTo[p] as unknown as {
      entries?: { agents?: string[]; commands?: string[]; skills?: string[]; rules?: string[]; behaviors?: string[] };
    };
    const recorded = providerEntry?.entries;

    if (!recorded) {
      // Pre-Cycle-3 entry: surface the deploy paths and let the operator
      // clean them up manually. We can't safely auto-delete because the dirs
      // are shared with other frameworks.
      conservativeFallbackUsed = true;
      const existingDirs = [
        { type: 'agents', path: userPaths.agents },
        { type: 'commands', path: userPaths.commands },
        { type: 'skills', path: userPaths.skills },
        { type: 'rules', path: userPaths.rules },
        { type: 'behaviors', path: userPaths.behaviors },
      ].filter(t => t.path);
      linesOut.push(`  ⚠ ${p}: registry entry has no per-artifact manifest (deployed before Cycle 3). Manual cleanup of these dirs may be needed:`);
      for (const t of existingDirs) {
        const stat = await fs.stat(t.path).catch(() => null);
        if (stat && stat.isDirectory()) {
          linesOut.push(`      - ${t.path}`);
        }
      }
      continue;
    }

    // Precise revert — walk the recorded entry names and delete each one
    // from its corresponding user-scope dir.
    const sets: Array<[string, string, string[] | undefined]> = [
      ['agents', userPaths.agents, recorded.agents],
      ['commands', userPaths.commands, recorded.commands],
      ['skills', userPaths.skills, recorded.skills],
      ['rules', userPaths.rules, recorded.rules],
      ['behaviors', userPaths.behaviors, recorded.behaviors],
    ];
    for (const [type, dir, names] of sets) {
      if (!dir || !names || names.length === 0) continue;
      let deletedHere = 0;
      for (const name of names) {
        const target = path.join(dir, name);
        if (dryRun) {
          linesOut.push(`  · ${p} ${type}: ${target}`);
          deletedHere++;
          continue;
        }
        try {
          await fs.rm(target, { recursive: true, force: true });
          deletedHere++;
          totalDeleted++;
        } catch (err) {
          linesOut.push(`  ⚠ ${p} ${type}: failed to remove ${target}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      if (!dryRun && deletedHere > 0) {
        linesOut.push(`  ✓ ${p} ${type}: removed ${deletedHere} entry/entries from ${dir}`);
      } else if (dryRun) {
        linesOut.push(`    (${deletedHere} ${type} would be removed from ${dir})`);
      }
    }
  }

  if (!dryRun) {
    if (provider) {
      await removeUserDeploy({ framework: positional, provider });
    } else {
      await removeUserDeploy({ framework: positional });
    }
    linesOut.push('');
    if (conservativeFallbackUsed) {
      linesOut.push('Registry updated. Some providers had no per-artifact manifest (pre-Cycle-3 deploys); inspect the dirs listed above and clean up manually if needed.');
    } else {
      linesOut.push(`Registry updated. ${totalDeleted} artifact entry/entries removed.`);
    }
  }

  return {
    exitCode: 0,
    message: linesOut.join('\n') + '\n',
  };
}

/**
 * Remove framework handler
 *
 * Delegates to tools/plugin/plugin-uninstaller-cli.mjs
 */
export const removeHandler: CommandHandler = {
  id: "remove",
  name: "Remove Framework",
  description: "Remove installed framework, plugin, or project-local bundle",
  category: "framework",
  aliases: [],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    // #1156 Phase 1 — `--scope user` / `--user`: revert the user-scope mirror
    // for the given framework. Independent of any project; reads the per-user
    // registry at ~/.aiwg/installed.json to find what was deployed, deletes
    // the mirrored artifacts under the provider's USER_SCOPE_PATHS, and
    // updates the registry.
    if (ctx.args.includes('--user') || isScopeUser(ctx.args)) {
      return await removeUserScopeDeploy(ctx.args);
    }

    // #1037 — Project-local-aware remove. If the first positional arg matches
    // a project-local entry in `installed`, route to the new handler.
    // Otherwise fall through to the existing plugin-uninstaller flow.
    const positionalArg = ctx.args.find(a => !a.startsWith('-'));
    if (positionalArg) {
      try {
        const { readAiwgConfig, writeAiwgConfig, getProjectDir } = await import(
          '../../config/aiwg-config.js'
        );
        const { removeProjectLocalBundle } = await import(
          '../../extensions/project-local-remove.js'
        );
        const projectDir = getProjectDir({ cwd: ctx.cwd }, ctx.args);
        const config = await readAiwgConfig(projectDir);
        const entry = config?.installed?.[positionalArg];
        if (config && entry?.source === 'project-local') {
          const force = ctx.args.includes('--force');
          const dryRun = ctx.args.includes('--dry-run');
          const keepRegistry = ctx.args.includes('--keep-registry');
          const provIdx = ctx.args.findIndex(a => a === '--provider');
          const provider = provIdx >= 0 ? ctx.args[provIdx + 1] : undefined;

          const result = await removeProjectLocalBundle(
            config, projectDir, positionalArg, { force, dryRun, keepRegistry, provider },
          );

          // Print outcome summary
          const lines: string[] = [];
          if (dryRun) lines.push(`[dry-run] Plan for project-local '${positionalArg}':`);
          for (const o of result.outcomes) {
            const marker = o.reverted ? '✓' : '⚠';
            lines.push(`  ${marker} ${o.provider} :: ${o.artifactPath}  [${o.case}] ${o.message}`);
          }
          if (result.revertedProviders.length > 0) {
            lines.push(`Fully reverted: ${result.revertedProviders.join(', ')}`);
          }
          if (result.partialProviders.length > 0) {
            lines.push(`Partial (registry preserved): ${result.partialProviders.join(', ')}`);
          }
          if (lines.length > 0) console.log(lines.join('\n'));

          if (!dryRun) {
            await writeAiwgConfig(projectDir, config);
          }

          // Note: source under .aiwg/<type>/<name>/ is intentionally NOT
          // deleted (load-bearing invariant from #1048 design).
          return {
            exitCode: result.partialProviders.length > 0 ? 1 : 0,
            message: result.partialProviders.length > 0
              ? `Some artifacts skipped (see above). Use --force to override mutation refusal.`
              : '',
          };
        }
      } catch (err) {
        // Fall through to upstream remove on any error in the project-local path
        const msg = err instanceof Error ? err.message : String(err);
        process.stderr.write(`project-local remove pre-check failed (falling through): ${msg}\n`);
      }
    }

    const frameworkRoot = await getFrameworkRoot();
    const runner = createScriptRunner(frameworkRoot);

    return runner.run("tools/plugin/plugin-uninstaller-cli.mjs", ctx.args, {
      cwd: ctx.cwd,
    });
  },
};

/**
 * Promote handler — graduate a project-local bundle to upstream or to a
 * private corpus path. Implements the design at
 * @.aiwg/architecture/design-doctor-log-promote.md (#1049).
 *
 * Usage:
 *   aiwg promote <name>                          # default: --to upstream
 *   aiwg promote <name> --to upstream
 *   aiwg promote <name> --to corpus <path>
 *   aiwg promote <name> --dry-run
 *   aiwg promote <name> --cleanup
 *   aiwg promote <name> --force
 *
 * @implements #1037
 */
export const promoteHandler: CommandHandler = {
  id: 'promote',
  name: 'Promote',
  description: 'Graduate a project-local bundle to upstream or a corpus path',
  category: 'framework',
  aliases: ['-promote', '--promote', 'graduate'],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const args = ctx.args;
    const positional = args.find(a => !a.startsWith('-'));
    if (!positional) {
      return { exitCode: 1, message: 'Error: bundle name required\n\nUsage: aiwg promote <name> [--to upstream|corpus <path>] [--dry-run] [--cleanup] [--force]' };
    }

    const toIdx = args.findIndex(a => a === '--to');
    const toValue = toIdx >= 0 ? args[toIdx + 1] : 'upstream';
    let corpusPath: string | undefined;
    if (toValue === 'corpus') {
      // The argument *after* "corpus" is the path
      corpusPath = args[toIdx + 2];
      if (!corpusPath || corpusPath.startsWith('-')) {
        return { exitCode: 1, message: 'Error: --to corpus requires a path argument' };
      }
    } else if (toValue !== 'upstream') {
      return { exitCode: 1, message: `Error: --to must be 'upstream' or 'corpus' (got '${toValue}')` };
    }

    const dryRun = args.includes('--dry-run');
    const cleanup = args.includes('--cleanup');
    const force = args.includes('--force');

    try {
      const { readAiwgConfig, writeAiwgConfig, getProjectDir } = await import('../../config/aiwg-config.js');
      const { promoteProjectLocalBundle } = await import('../../extensions/project-local-promote.js');

      const projectDir = getProjectDir({ cwd: ctx.cwd }, args);
      const config = await readAiwgConfig(projectDir);
      if (!config) {
        return { exitCode: 1, message: 'Error: no .aiwg/aiwg.config found — run `aiwg init` first' };
      }

      const fr = await getFrameworkRoot();
      const result = await promoteProjectLocalBundle(config, projectDir, positional, {
        to: toValue as 'upstream' | 'corpus',
        corpusPath,
        dryRun,
        cleanup,
        force,
        frameworkRoot: fr,
      });

      if (!result.ok) {
        return { exitCode: 1, message: `Error: ${result.message ?? result.failureReason}` };
      }

      if (dryRun && result.plan) {
        console.log('[dry-run] Would copy:');
        console.log(`  ${result.plan.source} → ${result.plan.destination}`);
        console.log(`  Files: ${result.plan.files.length}, ${result.plan.totalBytes} bytes`);
        console.log('  Pre-flight: ✓ manifest valid  ✓ destination clean');
        console.log('  Hash verification: skipped (dry-run)');
        console.log(`  Registry update: source: project-local → ${toValue === 'upstream' ? 'bundled' : 'corpus'}`);
        console.log(`  Cleanup: ${cleanup ? 'will remove .aiwg source after copy' : 'skipped (--cleanup not set)'}`);
        return { exitCode: 0 };
      }

      await writeAiwgConfig(projectDir, config);
      console.log(`✓ Promoted '${positional}' → ${result.plan?.destination}`);
      if (cleanup) {
        console.log('  Source removed from .aiwg/');
      }
      return { exitCode: 0 };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { exitCode: 1, message: `promote failed: ${msg}` };
    }
  },
};

/**
 * New bundle handler — scaffolds a project-local bundle under
 * `.aiwg/{type}/{name}/` with a valid manifest, starter artifact, and a
 * README that includes the identical-form portability reminder.
 *
 * Usage:
 *   aiwg new-bundle <name>                      # default: --type extension --starter skill
 *   aiwg new-bundle <name> --type addon
 *   aiwg new-bundle <name> --type framework --starter minimal
 *   aiwg new-bundle <name> --starter rule --description "Custom rule"
 *
 * @implements #1050
 */
export const newBundleHandler: CommandHandler = {
  id: 'new-bundle',
  name: 'New Bundle',
  description: 'Scaffold a project-local bundle under .aiwg/{type}/{name}/',
  category: 'scaffolding',
  aliases: ['new-extension', 'new-addon', 'new-framework', 'new-plugin'],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const args = ctx.args;
    const positional = args.find(a => !a.startsWith('-'));
    if (!positional) {
      return {
        exitCode: 1,
        message: 'Error: bundle name required\n\nUsage: aiwg new-bundle <name> [--type extension|addon|framework|plugin] [--starter skill|rule|agent|minimal] [--description "..."]',
      };
    }

    // Type can be inferred from the alias used to invoke (new-extension etc.)
    const aliasMap: Record<string, 'extension' | 'addon' | 'framework' | 'plugin'> = {
      'new-extension': 'extension',
      'new-addon': 'addon',
      'new-framework': 'framework',
      'new-plugin': 'plugin',
    };
    const invoked = ctx.rawArgs[0] ?? '';
    const aliasType = aliasMap[invoked];

    const typeIdx = args.findIndex(a => a === '--type');
    const typeFlag = typeIdx >= 0 ? args[typeIdx + 1] : undefined;
    const type = (typeFlag ?? aliasType ?? 'extension') as 'extension' | 'addon' | 'framework' | 'plugin';
    if (!['extension', 'addon', 'framework', 'plugin'].includes(type)) {
      return { exitCode: 1, message: `Error: --type must be one of extension|addon|framework|plugin (got '${type}')` };
    }

    const starterIdx = args.findIndex(a => a === '--starter');
    const starter = starterIdx >= 0 ? (args[starterIdx + 1] as 'skill' | 'rule' | 'agent' | 'minimal') : undefined;
    if (starter && !['skill', 'rule', 'agent', 'minimal'].includes(starter)) {
      return { exitCode: 1, message: `Error: --starter must be one of skill|rule|agent|minimal (got '${starter}')` };
    }

    const descIdx = args.findIndex(a => a === '--description');
    const description = descIdx >= 0 ? args[descIdx + 1] : undefined;

    const { scaffoldProjectLocalBundle } = await import('../../extensions/project-local-scaffold.js');

    try {
      const result = await scaffoldProjectLocalBundle({
        type,
        name: positional,
        description,
        starter,
        projectDir: ctx.cwd,
      });

      if (result.alreadyExists) {
        return {
          exitCode: 1,
          message: `Refused: bundle already exists at ${result.bundlePath}. Remove it first or pick a different name.`,
        };
      }

      console.log(`✓ Scaffolded project-local ${type} '${positional}' at ${result.bundlePath}`);
      console.log('  Files created:');
      for (const f of result.filesCreated) console.log(`    + ${f}`);

      // #1085 — when the project blanket-ignores .aiwg/, the new bundle's
      // source would be silently dropped from version control. Detect and
      // self-heal idempotently.
      try {
        const { appendAiwgSourceTrackBlock } = await import(
          '../../extensions/project-local-gitignore.js'
        );
        const ig = await appendAiwgSourceTrackBlock(ctx.cwd);
        if (ig.added) {
          console.log('');
          console.log(`  → ${ig.reason}`);
          console.log('    .aiwg/{addons,extensions,frameworks,plugins}/ now tracked by git.');
          console.log('    Generated state under .aiwg/ (working/, ralph/, research/, ...) stays ignored.');
        }
      } catch {
        // .gitignore management is best-effort; don't fail the scaffold
      }

      console.log('');
      console.log('Next steps:');
      console.log(`  1. Edit manifest.json (description, version, keywords)`);
      console.log(`  2. Customize the starter artifact under ${result.bundlePath}/`);
      console.log(`  3. Deploy:  aiwg use ${positional}`);
      console.log(`  4. Inspect: aiwg doctor --project-local`);

      return { exitCode: 0 };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { exitCode: 1, message: `Error: ${msg}` };
    }
  },
};

/**
 * New project handler
 *
 * Delegates to tools/install/new-project.mjs
 */
export const newProjectHandler: CommandHandler = {
  id: "new",
  name: "New Project",
  description: "Scaffold a new project with AIWG",
  category: "project",
  aliases: ["-new", "--new"],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const frameworkRoot = await getFrameworkRoot();
    const runner = createScriptRunner(frameworkRoot);

    return runner.run("tools/install/new-project.mjs", ctx.args, {
      cwd: ctx.cwd,
    });
  },
};

/**
 * Install plugin handler
 *
 * Delegates to tools/plugin/plugin-installer-cli.mjs
 */
export const installPluginHandler: CommandHandler = {
  id: "install-plugin",
  name: "Install Plugin",
  description: "Install a plugin from the registry",
  category: "plugin",
  aliases: ["-install-plugin", "--install-plugin"],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const frameworkRoot = await getFrameworkRoot();
    const runner = createScriptRunner(frameworkRoot);

    return runner.run("tools/plugin/plugin-installer-cli.mjs", ctx.args, {
      cwd: ctx.cwd,
    });
  },
};

/**
 * Uninstall plugin handler
 *
 * Delegates to tools/plugin/plugin-uninstaller-cli.mjs
 */
export const uninstallPluginHandler: CommandHandler = {
  id: "uninstall-plugin",
  name: "Uninstall Plugin",
  description: "Uninstall a plugin",
  category: "plugin",
  aliases: ["-uninstall-plugin", "--uninstall-plugin"],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const frameworkRoot = await getFrameworkRoot();
    const runner = createScriptRunner(frameworkRoot);

    return runner.run("tools/plugin/plugin-uninstaller-cli.mjs", ctx.args, {
      cwd: ctx.cwd,
    });
  },
};

/**
 * Plugin status handler
 *
 * Delegates to tools/plugin/plugin-status-cli.mjs
 */
export const pluginStatusHandler: CommandHandler = {
  id: "plugin-status",
  name: "Plugin Status",
  description: "Show plugin status and installation details",
  category: "plugin",
  aliases: ["-plugin-status", "--plugin-status"],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const frameworkRoot = await getFrameworkRoot();
    const runner = createScriptRunner(frameworkRoot);

    return runner.run("tools/plugin/plugin-status-cli.mjs", ctx.args, {
      cwd: ctx.cwd,
    });
  },
};

/**
 * Package plugin handler
 *
 * Delegates to tools/plugin/package-plugins.mjs
 */
export const packagePluginHandler: CommandHandler = {
  id: "package-plugin",
  name: "Package Plugin",
  description: "Package a plugin for distribution",
  category: "plugin",
  aliases: ["-package-plugin", "--package-plugin"],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const frameworkRoot = await getFrameworkRoot();
    const runner = createScriptRunner(frameworkRoot);

    return runner.run("tools/plugin/package-plugins.mjs", ctx.args, {
      cwd: ctx.cwd,
    });
  },
};

/**
 * Package all plugins handler
 *
 * Delegates to tools/plugin/package-plugins.mjs with --all flag
 */
export const packageAllPluginsHandler: CommandHandler = {
  id: "package-all-plugins",
  name: "Package All Plugins",
  description: "Package all plugins for distribution",
  category: "plugin",
  aliases: ["-package-all-plugins", "--package-all-plugins"],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const frameworkRoot = await getFrameworkRoot();
    const runner = createScriptRunner(frameworkRoot);

    return runner.run("tools/plugin/package-plugins.mjs", ["--all", ...ctx.args], {
      cwd: ctx.cwd,
    });
  },
};

/**
 * Artifact index command handler
 *
 * Dynamically imports and delegates to src/artifacts/cli.mjs.
 * Handles subcommands: build, query, deps, stats
 *
 * @implements #420
 */
export const indexHandler: CommandHandler = {
  id: "index",
  name: "Artifact Index",
  description: "Artifact index commands (build, query, deps, stats)",
  category: "index",
  aliases: [],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    try {
      const { main } = await import("../../artifacts/cli.js");
      await main(ctx.args);

      return {
        exitCode: 0,
      };
    } catch (error) {
      const result = handlerResultFromError(error);
      return { ...result, message: `Index command failed: ${result.message}` };
    }
  },
};

/**
 * Discovery command handler — first-class top-level verb (#1212).
 *
 * Forwards to the same implementation as `aiwg index discover` but
 * exposes discovery as its own command so agents don't conflate it
 * with the project's general-purpose artifact graph indices.
 *
 *   aiwg discover "<phrase>" [--limit N] [--type skill,agent,...] [--json]
 */
export const discoverHandler: CommandHandler = {
  id: "discover",
  name: "Discover",
  description:
    "Find AIWG skills, agents, commands, and rules by capability — index-driven on-demand discovery",
  category: "index",
  aliases: [],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    try {
      // Delegate to the same handler `aiwg index discover` uses, by
      // prepending the `discover` subcommand and reusing the artifacts
      // CLI router. This keeps a single implementation path.
      const { main } = await import("../../artifacts/cli.js");
      await main(["discover", ...ctx.args]);
      return { exitCode: 0 };
    } catch (error) {
      const result = handlerResultFromError(error);
      return { ...result, message: `Discover command failed: ${result.message}` };
    }
  },
};

/**
 * Features command handler — manage AIWG's optional runtime features (#1219).
 *
 * Subcommands: status / info / install / remove. Cycle 1 ships
 * status + info; install + remove arrive in Cycle 3 once install-mode
 * detection is designed.
 */
export const featuresHandler: CommandHandler = {
  id: "features",
  name: "Features",
  description:
    "List, inspect, and (eventually) install AIWG's optional runtime features",
  category: "maintenance",
  aliases: [],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    try {
      const { main } = await import("../../features/cli.js");
      await main(ctx.args);
      return { exitCode: 0 };
    } catch (error) {
      const result = handlerResultFromError(error);
      return { ...result, message: `Features command failed: ${result.message}` };
    }
  },
};

/**
 * Show command handler — fetch the full text of a specific artifact (#1218).
 *
 * Forwards to the same implementation as `aiwg index show`. Companion to
 * `aiwg discover`: where discover ranks candidates, show fetches the body
 * so consumers don't need to navigate AIWG's storage paths themselves.
 *
 *   aiwg show <name> [--type skill,agent,...] [--json] [--first]
 */
export const showHandler: CommandHandler = {
  id: "show",
  name: "Show",
  description:
    "Print the full text of a specific AIWG skill, agent, command, or rule by name",
  category: "index",
  aliases: [],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    try {
      const { main } = await import("../../artifacts/cli.js");
      await main(["show", ...ctx.args]);
      return { exitCode: 0 };
    } catch (error) {
      const result = handlerResultFromError(error);
      return { ...result, message: `Show command failed: ${result.message}` };
    }
  },
};

/**
 * Skills command handler
 *
 * Dynamically imports and delegates to src/skills/cli.ts.
 * Handles subcommands: search, info, list, install, publish
 *
 * @implements #539
 */
export const skillsHandler: CommandHandler = {
  id: "skills",
  name: "Skills Registry",
  description: "Skill commands (search, info, list, install, publish)",
  category: "catalog",
  aliases: [],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    try {
      const { main } = await import("../../skills/cli.js");
      await main(ctx.args);

      return {
        exitCode: 0,
      };
    } catch (error) {
      const result = handlerResultFromError(error);
      return { ...result, message: `Skills command failed: ${result.message}` };
    }
  },
};

/**
 * Config command handler
 *
 * Dynamically imports and delegates to src/config/cli.ts.
 * Handles subcommands: get, set, list, validate, reset, path, edit
 *
 * @implements #545
 */
export const configHandler: CommandHandler = {
  id: "config",
  name: "Config",
  description: "User config commands (get, set, list, validate, reset, path, edit)",
  category: "config",
  aliases: [],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    try {
      const { main } = await import("../../config/cli.js");
      await main(ctx.args);

      return {
        exitCode: 0,
      };
    } catch (error) {
      const result = handlerResultFromError(error);
      return { ...result, message: `Config command failed: ${result.message}` };
    }
  },
};

/**
 * Ops command handler
 *
 * Dynamically imports and delegates to src/ops/cli.ts.
 * Handles subcommands: init, status, use, list, push
 *
 * @implements #544
 */
export const opsHandler: CommandHandler = {
  id: "ops",
  name: "Ops",
  description: "Ops ecosystem commands (init, status, use, list, push)",
  category: "ops",
  aliases: [],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    try {
      const { main } = await import("../../ops/cli.js");
      await main(ctx.args);

      return {
        exitCode: 0,
      };
    } catch (error) {
      const result = handlerResultFromError(error);
      return { ...result, message: `Ops command failed: ${result.message}` };
    }
  },
};

/**
 * Activity-log command handler
 *
 * Dynamically imports and delegates to src/activity-log/cli.ts.
 * Handles subcommands: show, append, stats. Persistence routes through
 * resolveStorage('activity_log') so the log honors any storage.config
 * override (#934).
 *
 * @implements #934
 * @implements #964
 */
export const activityLogHandler: CommandHandler = {
  id: 'activity-log',
  name: 'Activity Log',
  description: 'Query and manage .aiwg/activity.log (show, append, stats)',
  category: 'utility',
  aliases: [],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    try {
      const { main } = await import('../../activity-log/cli.js');
      await main(ctx.args);
      return { exitCode: 0 };
    } catch (error) {
      const result = handlerResultFromError(error);
      return { ...result, message: `activity-log command failed: ${result.message}` };
    }
  },
};

/**
 * Provenance command handler — routes \`aiwg provenance\` through
 * resolveStorage('provenance') for provenance-* skills (#968).
 *
 * @implements #934
 * @implements #968
 */
export const provenanceHandler: CommandHandler = {
  id: 'provenance',
  name: 'Provenance',
  description: 'Provenance subsystem storage operations (path, list, get, put, delete, append-log)',
  category: 'utility',
  aliases: [],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    try {
      const { main } = await import('../../provenance/cli.js');
      await main(ctx.args);
      return { exitCode: 0 };
    } catch (error) {
      const result = handlerResultFromError(error);
      return { ...result, message: `provenance command failed: ${result.message}` };
    }
  },
};

/**
 * Research storage command handler — routes \`aiwg research-store\`
 * through resolveStorage('research') for research-acquire / corpus-*
 * skills (#968). Disambiguated from existing research-* workflow
 * commands by the \`-store\` suffix.
 *
 * @implements #934
 * @implements #968
 */
export const researchStoreHandler: CommandHandler = {
  id: 'research-store',
  name: 'Research Store',
  description: 'Research subsystem storage operations (path, list, get, put, delete, append-log)',
  category: 'utility',
  aliases: [],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    try {
      const { main } = await import('../../research/storage-cli.js');
      await main(ctx.args);
      return { exitCode: 0 };
    } catch (error) {
      const result = handlerResultFromError(error);
      return { ...result, message: `research-store command failed: ${result.message}` };
    }
  },
};

/**
 * Reflections command handler
 *
 * Routes \`aiwg reflections <subcommand>\` through resolveStorage('reflections')
 * for ralph-reflect / reflection-injection skills (#967).
 *
 * @implements #934
 * @implements #967
 */
export const reflectionsHandler: CommandHandler = {
  id: 'reflections',
  name: 'Reflections',
  description: 'Reflections subsystem storage operations (path, list, get, put, delete, append-log)',
  category: 'utility',
  aliases: [],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    try {
      const { main } = await import('../../reflections/cli.js');
      await main(ctx.args);
      return { exitCode: 0 };
    } catch (error) {
      const result = handlerResultFromError(error);
      return { ...result, message: `reflections command failed: ${result.message}` };
    }
  },
};

/**
 * Memory command handler
 *
 * Routes \`aiwg memory <subcommand>\` through resolveStorage('memory') so
 * the four memory skills (memory-ingest, memory-lint, memory-log-append,
 * memory-query-capture) honor any storage.config redirection.
 *
 * @implements #934
 * @implements #966
 */
export const memoryHandler: CommandHandler = {
  id: 'memory',
  name: 'Memory',
  description: 'Memory subsystem storage operations (path, list, get, put, delete, append-log)',
  category: 'utility',
  aliases: [],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    try {
      const { main } = await import('../../memory/cli.js');
      await main(ctx.args);
      return { exitCode: 0 };
    } catch (error) {
      const result = handlerResultFromError(error);
      return { ...result, message: `memory command failed: ${result.message}` };
    }
  },
};

/**
 * Knowledge-base command handler
 *
 * Routes \`aiwg kb <subcommand>\` through resolveStorage('kb') so the KB
 * honors any storage.config redirection without each kb skill
 * hardcoding `.aiwg/kb/`.
 *
 * @implements #934
 * @implements #965
 */
export const kbHandler: CommandHandler = {
  id: 'kb',
  name: 'Knowledge Base',
  description: 'Knowledge base storage operations (path, list, get, put, delete)',
  category: 'utility',
  aliases: [],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    try {
      const { main } = await import('../../kb/cli.js');
      await main(ctx.args);
      return { exitCode: 0 };
    } catch (error) {
      const result = handlerResultFromError(error);
      return { ...result, message: `kb command failed: ${result.message}` };
    }
  },
};

/**
 * Storage command handler
 *
 * Dynamically imports and delegates to src/storage/cli.ts.
 * Handles subcommands: show, list-backends, test
 *
 * @implements #934
 * @implements #954
 */
export const storageHandler: CommandHandler = {
  id: 'storage',
  name: 'Storage',
  description: 'Storage adapter commands (show, list-backends, test)',
  category: 'utility',
  aliases: [],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    try {
      const { main } = await import('../../storage/cli.js');
      await main(ctx.args);
      return { exitCode: 0 };
    } catch (error) {
      const result = handlerResultFromError(error);
      return { ...result, message: `Storage command failed: ${result.message}` };
    }
  },
};

/**
 * RLM agentic tools handler
 *
 * Routes `aiwg chunk`, `aiwg fanout`, `aiwg rlm-prep`, `aiwg rlm-search`,
 * and `aiwg rlm-status` to src/rlm/cli.ts.
 *
 * These are support tools for agentic sessions — callable by users but
 * primarily used by RLM agents during recursive and fanout operations.
 *
 * @implements #559
 */
export const rlmToolsHandler: CommandHandler = {
  id: 'rlm-tools',
  name: 'RLM Tools',
  description: 'Agentic support tools for RLM operations (chunk, fanout, rlm-prep, rlm-search, rlm-status)',
  category: 'agentic-tools',
  aliases: [],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    try {
      const { main } = await import('../../rlm/cli.js');
      await main(ctx.args);

      return {
        exitCode: 0,
      };
    } catch (error) {
      const result = handlerResultFromError(error);
      return { ...result, message: `RLM tools command failed: ${result.message}` };
    }
  },
};

// Individual handlers that delegate to rlmToolsHandler with their command prepended

export const chunkHandler: CommandHandler = {
  id: 'chunk',
  name: 'Chunk',
  description: 'Split a file into overlapping chunks for parallel fanout processing',
  category: 'agentic-tools',
  aliases: [],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    return rlmToolsHandler.execute({ ...ctx, args: ['chunk', ...ctx.args] });
  },
};

export const fanoutHandler: CommandHandler = {
  id: 'fanout',
  name: 'Fanout',
  description: 'Dispatch parallel subagent queries across a chunk manifest',
  category: 'agentic-tools',
  aliases: [],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    return rlmToolsHandler.execute({ ...ctx, args: ['fanout', ...ctx.args] });
  },
};

export const rlmPrepHandler: CommandHandler = {
  id: 'rlm-prep',
  name: 'RLM Prep',
  description: 'Prepare source content for RLM processing (chunk + index + manifest)',
  category: 'agentic-tools',
  aliases: [],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    return rlmToolsHandler.execute({ ...ctx, args: ['rlm-prep', ...ctx.args] });
  },
};

export const rlmSearchHandler: CommandHandler = {
  id: 'rlm-search',
  name: 'RLM Search',
  description: 'Full recursive search pipeline: decompose source, fanout query, synthesize results',
  category: 'agentic-tools',
  aliases: [],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    return rlmToolsHandler.execute({ ...ctx, args: ['rlm-search', ...ctx.args] });
  },
};

export const rlmStatusCliHandler: CommandHandler = {
  id: 'rlm-status',
  name: 'RLM Status',
  description: 'Show active RLM task tree, progress, and cost breakdown',
  category: 'agentic-tools',
  aliases: [],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    return rlmToolsHandler.execute({ ...ctx, args: ['rlm-status', ...ctx.args] });
  },
};

/** RLM result cache (#1203). */
export const rlmCacheHandler: CommandHandler = {
  id: 'rlm-cache',
  name: 'RLM Cache',
  description: 'Manage cached RLM results (list, stats, evict, clear) — keyed by index content-hash',
  category: 'agentic-tools',
  aliases: [],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    return rlmToolsHandler.execute({ ...ctx, args: ['rlm-cache', ...ctx.args] });
  },
};

/**
 * All subcommand handlers
 */
export const subcommandHandlers: CommandHandler[] = [
  mcpHandler,
  catalogHandler,
  listHandler,
  removeHandler,
  newProjectHandler,
  installPluginHandler,
  uninstallPluginHandler,
  pluginStatusHandler,
  packagePluginHandler,
  packageAllPluginsHandler,
  indexHandler,
  discoverHandler,
  showHandler,
  featuresHandler,
  skillsHandler,
  configHandler,
  opsHandler,
  storageHandler,
  activityLogHandler,
  kbHandler,
  memoryHandler,
  reflectionsHandler,
  provenanceHandler,
  researchStoreHandler,
  chunkHandler,
  fanoutHandler,
  rlmPrepHandler,
  rlmSearchHandler,
  rlmStatusCliHandler,
  rlmCacheHandler,
  sessionHandler,
  feedbackHandler,
];
