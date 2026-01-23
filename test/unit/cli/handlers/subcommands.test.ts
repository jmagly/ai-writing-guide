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

    it("should dynamically import and call mcp/cli.mjs main()", async () => {
      mockContext.args = ["serve", "--transport", "stdio"];

      await mcpHandler.execute(mockContext);

      expect(mockMcpMain).toHaveBeenCalledWith([
        "serve",
        "--transport",
        "stdio",
      ]);
    });

    it("should handle subcommands: serve, install, info", async () => {
      const subcommands = ["serve", "install", "info"];

      for (const subcmd of subcommands) {
        vi.clearAllMocks();
        mockContext.args = [subcmd];

        await mcpHandler.execute(mockContext);

        expect(mockMcpMain).toHaveBeenCalledWith([subcmd]);
      }
    });

    it("should return success on successful execution", async () => {
      const result = await mcpHandler.execute(mockContext);

      expect(result.exitCode).toBe(0);
    });

    it("should handle errors from mcp main()", async () => {
      const testError = new Error("MCP failed");
      mockMcpMain.mockRejectedValueOnce(testError);

      const result = await mcpHandler.execute(mockContext);

      expect(result.exitCode).toBe(1);
      expect(result.error).toBe(testError);
      expect(result.message).toMatch(/MCP command failed/i);
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

    it("should dynamically import and call catalog/cli.mjs main()", async () => {
      mockContext.args = ["list", "--provider", "anthropic"];

      await catalogHandler.execute(mockContext);

      expect(mockCatalogMain).toHaveBeenCalledWith([
        "list",
        "--provider",
        "anthropic",
      ]);
    });

    it("should handle subcommands: list, info, search", async () => {
      const subcommands = ["list", "info", "search"];

      for (const subcmd of subcommands) {
        vi.clearAllMocks();
        mockContext.args = [subcmd];

        await catalogHandler.execute(mockContext);

        expect(mockCatalogMain).toHaveBeenCalledWith([subcmd]);
      }
    });

    it("should return success on successful execution", async () => {
      const result = await catalogHandler.execute(mockContext);

      expect(result.exitCode).toBe(0);
    });

    it("should handle errors from catalog main()", async () => {
      const testError = new Error("Catalog failed");
      mockCatalogMain.mockRejectedValueOnce(testError);

      const result = await catalogHandler.execute(mockContext);

      expect(result.exitCode).toBe(1);
      expect(result.error).toBe(testError);
      expect(result.message).toMatch(/catalog command failed/i);
    });
  });

  describe("listHandler", () => {
    it("should have correct metadata", () => {
      expect(listHandler.id).toBe("list");
      expect(listHandler.category).toBe("framework");
      expect(listHandler.aliases).toEqual(["ls"]);
      expect(listHandler.name).toBe("List Frameworks");
      expect(listHandler.description).toMatch(/list.*framework/i);
    });

    it("should use registry to list extensions (or fallback to legacy script)", async () => {
      // listHandler now uses the extension registry first
      // It only falls back to legacy script if registry population fails
      const result = await listHandler.execute(mockContext);

      // With registry-first approach, it should return success
      expect(result.exitCode).toBe(0);
    });
  });

  describe("removeHandler", () => {
    it("should have correct metadata", () => {
      expect(removeHandler.id).toBe("remove");
      expect(removeHandler.category).toBe("framework");
      expect(removeHandler.aliases).toEqual([]);
      expect(removeHandler.name).toBe("Remove Framework");
      expect(removeHandler.description).toMatch(/remove.*framework/i);
    });

    it("should delegate to tools/plugin/plugin-uninstaller-cli.mjs", async () => {
      await removeHandler.execute(mockContext);

      expect(mockRun).toHaveBeenCalledWith(
        "tools/plugin/plugin-uninstaller-cli.mjs",
        mockContext.args,
        { cwd: mockContext.cwd },
      );
    });
  });

  describe("newProjectHandler", () => {
    it("should have correct metadata", () => {
      expect(newProjectHandler.id).toBe("new");
      expect(newProjectHandler.category).toBe("project");
      expect(newProjectHandler.aliases).toEqual(["-new", "--new"]);
      expect(newProjectHandler.name).toBe("New Project");
      expect(newProjectHandler.description).toMatch(/new project|scaffold/i);
    });

    it("should delegate to tools/install/new-project.mjs", async () => {
      await newProjectHandler.execute(mockContext);

      expect(mockRun).toHaveBeenCalledWith(
        "tools/install/new-project.mjs",
        mockContext.args,
        { cwd: mockContext.cwd },
      );
    });
  });

  describe("installPluginHandler", () => {
    it("should have correct metadata", () => {
      expect(installPluginHandler.id).toBe("install-plugin");
      expect(installPluginHandler.category).toBe("plugin");
      expect(installPluginHandler.aliases).toEqual([
        "-install-plugin",
        "--install-plugin",
      ]);
      expect(installPluginHandler.name).toBe("Install Plugin");
      expect(installPluginHandler.description).toMatch(/install.*plugin/i);
    });

    it("should delegate to tools/plugin/plugin-installer-cli.mjs", async () => {
      await installPluginHandler.execute(mockContext);

      expect(mockRun).toHaveBeenCalledWith(
        "tools/plugin/plugin-installer-cli.mjs",
        mockContext.args,
        { cwd: mockContext.cwd },
      );
    });
  });

  describe("uninstallPluginHandler", () => {
    it("should have correct metadata", () => {
      expect(uninstallPluginHandler.id).toBe("uninstall-plugin");
      expect(uninstallPluginHandler.category).toBe("plugin");
      expect(uninstallPluginHandler.aliases).toEqual([
        "-uninstall-plugin",
        "--uninstall-plugin",
      ]);
      expect(uninstallPluginHandler.name).toBe("Uninstall Plugin");
      expect(uninstallPluginHandler.description).toMatch(/uninstall.*plugin/i);
    });

    it("should delegate to tools/plugin/plugin-uninstaller-cli.mjs", async () => {
      await uninstallPluginHandler.execute(mockContext);

      expect(mockRun).toHaveBeenCalledWith(
        "tools/plugin/plugin-uninstaller-cli.mjs",
        mockContext.args,
        { cwd: mockContext.cwd },
      );
    });
  });

  describe("pluginStatusHandler", () => {
    it("should have correct metadata", () => {
      expect(pluginStatusHandler.id).toBe("plugin-status");
      expect(pluginStatusHandler.category).toBe("plugin");
      expect(pluginStatusHandler.aliases).toEqual([
        "-plugin-status",
        "--plugin-status",
      ]);
      expect(pluginStatusHandler.name).toBe("Plugin Status");
      expect(pluginStatusHandler.description).toMatch(/plugin.*status/i);
    });

    it("should delegate to tools/plugin/plugin-status-cli.mjs", async () => {
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

    it("should delegate to tools/plugin/plugin-packager-cli.mjs", async () => {
      mockContext.args = ["my-plugin"];

      await packagePluginHandler.execute(mockContext);

      expect(mockRun).toHaveBeenCalledWith(
        "tools/plugin/plugin-packager-cli.mjs",
        ["my-plugin"],
        { cwd: mockContext.cwd },
      );
    });

    it("should pass through all args", async () => {
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

    it("should delegate to tools/plugin/plugin-packager-cli.mjs with --all flag", async () => {
      await packageAllPluginsHandler.execute(mockContext);

      expect(mockRun).toHaveBeenCalledWith(
        "tools/plugin/plugin-packager-cli.mjs",
        ["--all"],
        { cwd: mockContext.cwd },
      );
    });

    it("should prepend --all to args", async () => {
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
    it("should export all subcommand handlers", () => {
      expect(subcommandHandlers).toHaveLength(10);

      const handlerIds = subcommandHandlers.map((h) => h.id);
      expect(handlerIds).toContain("mcp");
      expect(handlerIds).toContain("catalog");
      expect(handlerIds).toContain("list");
      expect(handlerIds).toContain("remove");
      expect(handlerIds).toContain("new");
      expect(handlerIds).toContain("install-plugin");
      expect(handlerIds).toContain("uninstall-plugin");
      expect(handlerIds).toContain("plugin-status");
      expect(handlerIds).toContain("package-plugin");
      expect(handlerIds).toContain("package-all-plugins");
    });

    it("all handlers should have required properties", () => {
      subcommandHandlers.forEach((handler) => {
        expect(handler.id).toBeDefined();
        expect(handler.name).toBeDefined();
        expect(handler.description).toBeDefined();
        expect(handler.category).toBeDefined();
        expect(handler.aliases).toBeDefined();
        expect(Array.isArray(handler.aliases)).toBe(true);
        expect(typeof handler.execute).toBe("function");
      });
    });

    it("plugin handlers should have plugin category", () => {
      const pluginHandlers = subcommandHandlers.filter((h) =>
        h.id.includes("plugin"),
      );

      pluginHandlers.forEach((handler) => {
        expect(handler.category).toBe("plugin");
      });
    });

    it("framework handlers should have framework category", () => {
      const frameworkHandlers = subcommandHandlers.filter((h) =>
        ["list", "remove"].includes(h.id),
      );

      frameworkHandlers.forEach((handler) => {
        expect(handler.category).toBe("framework");
      });
    });

    it("mcp handler should have mcp category", () => {
      const handler = subcommandHandlers.find((h) => h.id === "mcp");
      expect(handler?.category).toBe("mcp");
    });

    it("catalog handler should have catalog category", () => {
      const handler = subcommandHandlers.find((h) => h.id === "catalog");
      expect(handler?.category).toBe("catalog");
    });

    it("new handler should have project category", () => {
      const handler = subcommandHandlers.find((h) => h.id === "new");
      expect(handler?.category).toBe("project");
    });
  });

  describe("handler error handling", () => {
    it("list handler should return success when registry is available", async () => {
      // listHandler now uses registry first, returns success with empty registry
      const result = await listHandler.execute(mockContext);

      // With registry available (even if empty), handler succeeds
      expect(result.exitCode).toBe(0);
    });

    it("mcp handler should wrap errors in HandlerResult", async () => {
      const testError = new Error("Import failed");
      mockMcpMain.mockRejectedValueOnce(testError);

      const result = await mcpHandler.execute(mockContext);

      expect(result.exitCode).toBe(1);
      expect(result.error).toBe(testError);
      expect(result.message).toBeDefined();
    });

    it("catalog handler should wrap errors in HandlerResult", async () => {
      const testError = new Error("Import failed");
      mockCatalogMain.mockRejectedValueOnce(testError);

      const result = await catalogHandler.execute(mockContext);

      expect(result.exitCode).toBe(1);
      expect(result.error).toBe(testError);
      expect(result.message).toBeDefined();
    });
  });
});
