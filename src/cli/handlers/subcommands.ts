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
  sessionHandler,
  feedbackHandler,
];
