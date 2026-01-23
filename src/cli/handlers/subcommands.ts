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

/**
 * MCP server command handler
 *
 * Dynamically imports and delegates to src/mcp/cli.mjs.
 * Handles subcommands: serve, install, info
 */
export const mcpHandler: CommandHandler = {
  id: "mcp",
  name: "MCP Server",
  description: "MCP server commands (serve, install, info)",
  category: "mcp",
  aliases: [],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    try {
      // Dynamic import to avoid loading MCP dependencies unless needed
      const { main } = await import("../../mcp/cli.mjs");
      await main(ctx.args);

      return {
        exitCode: 0,
      };
    } catch (error) {
      return {
        exitCode: 1,
        message: `MCP command failed: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error : new Error(String(error)),
      };
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
      return {
        exitCode: 1,
        message: `Catalog command failed: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error : new Error(String(error)),
      };
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
 * Delegates to tools/plugin/plugin-packager-cli.mjs
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

    return runner.run("tools/plugin/plugin-packager-cli.mjs", ctx.args, {
      cwd: ctx.cwd,
    });
  },
};

/**
 * Package all plugins handler
 *
 * Delegates to tools/plugin/plugin-packager-cli.mjs with --all flag
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

    return runner.run("tools/plugin/plugin-packager-cli.mjs", ["--all", ...ctx.args], {
      cwd: ctx.cwd,
    });
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
];
