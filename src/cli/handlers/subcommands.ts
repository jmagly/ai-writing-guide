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
    const filterType = ctx.args[0]; // Optional: 'agents', 'skills', 'commands', 'all'

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

    // Summary
    const totalAgents = registry.getByType('agent').length;
    const totalSkills = registry.getByType('skill').length;
    const totalCommands = registry.getByType('command').length;
    const total = totalAgents + totalSkills + totalCommands;

    output += '\n' + '═'.repeat(60) + '\n';
    output += `Total: ${total} extensions (${totalAgents} agents, ${totalSkills} skills, ${totalCommands} commands)\n`;

    if (total === 0) {
      output += '\nTip: Deploy a framework with "aiwg use sdlc" to get started\n';
    }

    return {
      exitCode: 0,
      message: output,
    };
  },
};

/**
 * Remove framework handler
 *
 * Delegates to tools/plugin/plugin-uninstaller-cli.mjs
 */
export const removeHandler: CommandHandler = {
  id: "remove",
  name: "Remove Framework",
  description: "Remove installed framework or plugin",
  category: "framework",
  aliases: [],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const frameworkRoot = await getFrameworkRoot();
    const runner = createScriptRunner(frameworkRoot);

    return runner.run("tools/plugin/plugin-uninstaller-cli.mjs", ctx.args, {
      cwd: ctx.cwd,
    });
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
  chunkHandler,
  fanoutHandler,
  rlmPrepHandler,
  rlmSearchHandler,
  rlmStatusCliHandler,
  sessionHandler,
  feedbackHandler,
];
