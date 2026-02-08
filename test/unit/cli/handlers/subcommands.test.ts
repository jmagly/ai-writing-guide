/**
 * Subcommand Handlers Tests
 *
 * Tests for MCP, catalog, plugin, and other subcommand handlers.
 *
 * @source @src/cli/handlers/subcommands.ts
 * @implements @.aiwg/architecture/decisions/ADR-001-unified-extension-system.md
 * @issue #33
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { HandlerContext } from "../../../../src/cli/handlers/types.js";

// Mock script runner
const mockRun = vi.fn().mockResolvedValue({ exitCode: 0 });

vi.mock("../../../../src/cli/handlers/script-runner.js", () => ({
  createScriptRunner: vi.fn(() => ({
    run: mockRun,
  })),
}));

// Mock channel manager
vi.mock("../../../../src/channel/manager.mjs", () => ({
  getFrameworkRoot: vi.fn().mockResolvedValue("/mock/framework/root"),
}));

// Mock MCP CLI module
const mockMcpMain = vi.fn().mockResolvedValue(undefined);
vi.mock("../../../../src/mcp/cli.mjs", () => ({
  main: mockMcpMain,
}));

// Mock catalog CLI module
const mockCatalogMain = vi.fn().mockResolvedValue(undefined);
vi.mock("../../../../src/catalog/cli.mjs", () => ({
  main: mockCatalogMain,
}));

// Import handlers after mocks are set up
import {
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
  subcommandHandlers,
} from "../../../../src/cli/handlers/subcommands.js";

describe("Subcommand Handlers", () => {
  let mockContext: HandlerContext;

  beforeEach(() => {
    mockContext = {
      args: [],
      rawArgs: [],
      cwd: "/mock/cwd",
      frameworkRoot: "/mock/framework/root",
    };
    vi.clearAllMocks();
  });

  describe("mcpHandler", () => {
    it("should have correct metadata", () => {
      expect(mcpHandler.id).toBe("mcp");
      expect(mcpHandler.category).toBe("mcp");
      expect(mcpHandler.aliases).toEqual([]);
      expect(mcpHandler.name).toBe("MCP Server");
      expect(mcpHandler.description).toMatch(/MCP server/i);
    });

    it("should handle dynamic import, subcommands, success, and errors", async () => {
      // Test dynamic import and call
      mockContext.args = ["serve", "--transport", "stdio"];
      await mcpHandler.execute(mockContext);
      expect(mockMcpMain).toHaveBeenCalledWith([
        "serve",
        "--transport",
        "stdio",
      ]);

      // Test multiple subcommands
      const subcommands = ["serve", "install", "info"];
      for (const subcmd of subcommands) {
        vi.clearAllMocks();
        mockContext.args = [subcmd];
        await mcpHandler.execute(mockContext);
        expect(mockMcpMain).toHaveBeenCalledWith([subcmd]);
      }

      // Test success
      vi.clearAllMocks();
      mockContext.args = [];
      const successResult = await mcpHandler.execute(mockContext);
      expect(successResult.exitCode).toBe(0);

      // Test error handling
      const testError = new Error("MCP failed");
      mockMcpMain.mockRejectedValueOnce(testError);
      const errorResult = await mcpHandler.execute(mockContext);
      expect(errorResult.exitCode).toBe(1);
      expect(errorResult.error).toBe(testError);
      expect(errorResult.message).toMatch(/MCP command failed/i);
    });
  });

  describe("catalogHandler", () => {
    it("should have correct metadata", () => {
      expect(catalogHandler.id).toBe("catalog");
      expect(catalogHandler.category).toBe("catalog");
      expect(catalogHandler.aliases).toEqual([]);
      expect(catalogHandler.name).toBe("Model Catalog");
      expect(catalogHandler.description).toMatch(/model catalog/i);
    });

    it("should handle dynamic import, subcommands, success, and errors", async () => {
      // Test dynamic import and call
      mockContext.args = ["list", "--provider", "anthropic"];
      await catalogHandler.execute(mockContext);
      expect(mockCatalogMain).toHaveBeenCalledWith([
        "list",
        "--provider",
        "anthropic",
      ]);

      // Test multiple subcommands
      const subcommands = ["list", "info", "search"];
      for (const subcmd of subcommands) {
        vi.clearAllMocks();
        mockContext.args = [subcmd];
        await catalogHandler.execute(mockContext);
        expect(mockCatalogMain).toHaveBeenCalledWith([subcmd]);
      }

      // Test success
      vi.clearAllMocks();
      mockContext.args = [];
      const successResult = await catalogHandler.execute(mockContext);
      expect(successResult.exitCode).toBe(0);

      // Test error handling
      const testError = new Error("Catalog failed");
      mockCatalogMain.mockRejectedValueOnce(testError);
      const errorResult = await catalogHandler.execute(mockContext);
      expect(errorResult.exitCode).toBe(1);
      expect(errorResult.error).toBe(testError);
      expect(errorResult.message).toMatch(/catalog command failed/i);
    });
  });

  describe("listHandler", () => {
    it("should have correct metadata and use registry", async () => {
      expect(listHandler.id).toBe("list");
      expect(listHandler.category).toBe("framework");
      expect(listHandler.aliases).toEqual(["ls"]);
      expect(listHandler.name).toBe("List Frameworks");
      expect(listHandler.description).toMatch(/list.*framework/i);

      // listHandler now uses the extension registry first
      const result = await listHandler.execute(mockContext);
      expect(result.exitCode).toBe(0);
    });
  });

  describe("removeHandler", () => {
    it("should have correct metadata and delegate to uninstaller", async () => {
      expect(removeHandler.id).toBe("remove");
      expect(removeHandler.category).toBe("framework");
      expect(removeHandler.aliases).toEqual([]);
      expect(removeHandler.name).toBe("Remove Framework");
      expect(removeHandler.description).toMatch(/remove.*framework/i);

      await removeHandler.execute(mockContext);
      expect(mockRun).toHaveBeenCalledWith(
        "tools/plugin/plugin-uninstaller-cli.mjs",
        mockContext.args,
        { cwd: mockContext.cwd },
      );
    });
  });

  describe("newProjectHandler", () => {
    it("should have correct metadata and delegate to new-project script", async () => {
      expect(newProjectHandler.id).toBe("new");
      expect(newProjectHandler.category).toBe("project");
      expect(newProjectHandler.aliases).toEqual(["-new", "--new"]);
      expect(newProjectHandler.name).toBe("New Project");
      expect(newProjectHandler.description).toMatch(/new project|scaffold/i);

      await newProjectHandler.execute(mockContext);
      expect(mockRun).toHaveBeenCalledWith(
        "tools/install/new-project.mjs",
        mockContext.args,
        { cwd: mockContext.cwd },
      );
    });
  });

  describe("installPluginHandler", () => {
    it("should have correct metadata and delegate to installer", async () => {
      expect(installPluginHandler.id).toBe("install-plugin");
      expect(installPluginHandler.category).toBe("plugin");
      expect(installPluginHandler.aliases).toEqual([
        "-install-plugin",
        "--install-plugin",
      ]);
      expect(installPluginHandler.name).toBe("Install Plugin");
      expect(installPluginHandler.description).toMatch(/install.*plugin/i);

      await installPluginHandler.execute(mockContext);
      expect(mockRun).toHaveBeenCalledWith(
        "tools/plugin/plugin-installer-cli.mjs",
        mockContext.args,
        { cwd: mockContext.cwd },
      );
    });
  });

  describe("uninstallPluginHandler", () => {
    it("should have correct metadata and delegate to uninstaller", async () => {
      expect(uninstallPluginHandler.id).toBe("uninstall-plugin");
      expect(uninstallPluginHandler.category).toBe("plugin");
      expect(uninstallPluginHandler.aliases).toEqual([
        "-uninstall-plugin",
        "--uninstall-plugin",
      ]);
      expect(uninstallPluginHandler.name).toBe("Uninstall Plugin");
      expect(uninstallPluginHandler.description).toMatch(/uninstall.*plugin/i);

      await uninstallPluginHandler.execute(mockContext);
      expect(mockRun).toHaveBeenCalledWith(
        "tools/plugin/plugin-uninstaller-cli.mjs",
        mockContext.args,
        { cwd: mockContext.cwd },
      );
    });
  });

  describe("pluginStatusHandler", () => {
    it("should have correct metadata and delegate to status script", async () => {
      expect(pluginStatusHandler.id).toBe("plugin-status");
      expect(pluginStatusHandler.category).toBe("plugin");
      expect(pluginStatusHandler.aliases).toEqual([
        "-plugin-status",
        "--plugin-status",
      ]);
      expect(pluginStatusHandler.name).toBe("Plugin Status");
      expect(pluginStatusHandler.description).toMatch(/plugin.*status/i);

      await pluginStatusHandler.execute(mockContext);
      expect(mockRun).toHaveBeenCalledWith(
        "tools/plugin/plugin-status-cli.mjs",
        mockContext.args,
        { cwd: mockContext.cwd },
      );
    });
  });

  describe("packagePluginHandler", () => {
    it("should have correct metadata", () => {
      expect(packagePluginHandler.id).toBe("package-plugin");
      expect(packagePluginHandler.category).toBe("plugin");
      expect(packagePluginHandler.aliases).toEqual([
        "-package-plugin",
        "--package-plugin",
      ]);
      expect(packagePluginHandler.name).toBe("Package Plugin");
      expect(packagePluginHandler.description).toMatch(/package.*plugin/i);
    });

    it("should delegate to packager with various args", async () => {
      // Single plugin
      mockContext.args = ["my-plugin"];
      await packagePluginHandler.execute(mockContext);
      expect(mockRun).toHaveBeenCalledWith(
        "tools/plugin/plugin-packager-cli.mjs",
        ["my-plugin"],
        { cwd: mockContext.cwd },
      );

      // Multiple plugins with flags
      vi.clearAllMocks();
      mockContext.args = ["plugin1", "plugin2", "--output", "dist"];
      await packagePluginHandler.execute(mockContext);
      expect(mockRun).toHaveBeenCalledWith(
        "tools/plugin/plugin-packager-cli.mjs",
        ["plugin1", "plugin2", "--output", "dist"],
        { cwd: mockContext.cwd },
      );
    });
  });

  describe("packageAllPluginsHandler", () => {
    it("should have correct metadata", () => {
      expect(packageAllPluginsHandler.id).toBe("package-all-plugins");
      expect(packageAllPluginsHandler.category).toBe("plugin");
      expect(packageAllPluginsHandler.aliases).toEqual([
        "-package-all-plugins",
        "--package-all-plugins",
      ]);
      expect(packageAllPluginsHandler.name).toBe("Package All Plugins");
      expect(packageAllPluginsHandler.description).toMatch(
        /package all.*plugins/i,
      );
    });

    it("should delegate to packager with --all flag", async () => {
      // No args - just --all
      await packageAllPluginsHandler.execute(mockContext);
      expect(mockRun).toHaveBeenCalledWith(
        "tools/plugin/plugin-packager-cli.mjs",
        ["--all"],
        { cwd: mockContext.cwd },
      );

      // With additional args
      vi.clearAllMocks();
      mockContext.args = ["--output", "dist"];
      await packageAllPluginsHandler.execute(mockContext);
      expect(mockRun).toHaveBeenCalledWith(
        "tools/plugin/plugin-packager-cli.mjs",
        ["--all", "--output", "dist"],
        { cwd: mockContext.cwd },
      );
    });
  });

  describe("subcommandHandlers array", () => {
    it("should export all subcommand handlers with correct IDs", () => {
      expect(subcommandHandlers).toHaveLength(10);

      const handlerIds = subcommandHandlers.map((h) => h.id);
      const expectedIds = [
        "mcp",
        "catalog",
        "list",
        "remove",
        "new",
        "install-plugin",
        "uninstall-plugin",
        "plugin-status",
        "package-plugin",
        "package-all-plugins",
      ];

      for (const expectedId of expectedIds) {
        expect(handlerIds).toContain(expectedId);
      }
    });

    it("all handlers should have required properties", () => {
      for (const handler of subcommandHandlers) {
        expect(handler.id).toBeDefined();
        expect(handler.name).toBeDefined();
        expect(handler.description).toBeDefined();
        expect(handler.category).toBeDefined();
        expect(handler.aliases).toBeDefined();
        expect(Array.isArray(handler.aliases)).toBe(true);
        expect(typeof handler.execute).toBe("function");
      }
    });

    it("handlers should have correct categories", () => {
      // Plugin handlers
      const pluginHandlers = subcommandHandlers.filter((h) =>
        h.id.includes("plugin"),
      );
      for (const handler of pluginHandlers) {
        expect(handler.category).toBe("plugin");
      }

      // Framework handlers
      const frameworkHandlers = subcommandHandlers.filter((h) =>
        ["list", "remove"].includes(h.id),
      );
      for (const handler of frameworkHandlers) {
        expect(handler.category).toBe("framework");
      }

      // Specific handlers
      const specificCategories = [
        { id: "mcp", category: "mcp" },
        { id: "catalog", category: "catalog" },
        { id: "new", category: "project" },
      ];
      for (const { id, category } of specificCategories) {
        const handler = subcommandHandlers.find((h) => h.id === id);
        expect(handler?.category).toBe(category);
      }
    });
  });

  describe("handler error handling", () => {
    it("list handler should return success when registry is available", async () => {
      const result = await listHandler.execute(mockContext);
      expect(result.exitCode).toBe(0);
    });

    it("mcp and catalog handlers should wrap errors in HandlerResult", async () => {
      // MCP handler error
      const mcpError = new Error("Import failed");
      mockMcpMain.mockRejectedValueOnce(mcpError);
      const mcpResult = await mcpHandler.execute(mockContext);
      expect(mcpResult.exitCode).toBe(1);
      expect(mcpResult.error).toBe(mcpError);
      expect(mcpResult.message).toBeDefined();

      // Catalog handler error
      const catalogError = new Error("Import failed");
      mockCatalogMain.mockRejectedValueOnce(catalogError);
      const catalogResult = await catalogHandler.execute(mockContext);
      expect(catalogResult.exitCode).toBe(1);
      expect(catalogResult.error).toBe(catalogError);
      expect(catalogResult.message).toBeDefined();
    });
  });
});
