/**
 * Subcommand Handlers
 *
 * Handlers for MCP, catalog, plugin, and other subcommands.
 * Extracted from src/cli/index.mjs.
 *
 * @implements @.aiwg/architecture/decisions/ADR-001-unified-extension-system.md
 * @source @src/cli/index.mjs
 * @tests @test/unit/cli/handlers/subcommands.test.ts
 * @issue #33
 */

import type { CommandHandler, HandlerContext, HandlerResult } from "./types.js";
import { createScriptRunner } from "./script-runner.js";
import { getFrameworkRoot } from "../../channel/manager.mjs";

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
 * Delegates to tools/plugin/plugin-status-cli.mjs
 */
export const listHandler: CommandHandler = {
  id: "list",
  name: "List Frameworks",
  description: "List installed frameworks and plugins",
  category: "framework",
  aliases: [],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const frameworkRoot = await getFrameworkRoot();
    const runner = createScriptRunner(frameworkRoot);

    return runner.run("tools/plugin/plugin-status-cli.mjs", ctx.args, {
      cwd: ctx.cwd,
    });
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
 * Delegates to tools/plugin/package-plugins.mjs with --plugin flag
 */
export const packagePluginHandler: CommandHandler = {
  id: "package-plugin",
  name: "Package Plugin",
  description: "Package a specific plugin for distribution",
  category: "plugin",
  aliases: ["-package-plugin", "--package-plugin"],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const frameworkRoot = await getFrameworkRoot();
    const runner = createScriptRunner(frameworkRoot);

    // Prepend --plugin to args
    const scriptArgs = ["--plugin", ...ctx.args];

    return runner.run("tools/plugin/package-plugins.mjs", scriptArgs, {
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

    // Prepend --all to args
    const scriptArgs = ["--all", ...ctx.args];

    return runner.run("tools/plugin/package-plugins.mjs", scriptArgs, {
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
