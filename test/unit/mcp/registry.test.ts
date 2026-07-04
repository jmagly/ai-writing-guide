/**
 * MCP Server Registry Tests
 *
 * Tests for the MCP server definition storage and provider injection.
 *
 * @source @src/mcp/registry.ts
 * @implements #554
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile, writeFile, mkdir } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

import {
  McpServerRegistry,
  injectServers,
  getProviderConfigPath,
  SUPPORTED_PROVIDERS,
} from "../../../src/mcp/registry.js";

describe("McpServerRegistry", () => {
  let tempDir: string;
  let registry: McpServerRegistry;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "aiwg-mcp-test-"));
    registry = new McpServerRegistry(tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("constructor and getPath", () => {
    it("should resolve the registry file path", () => {
      expect(registry.getPath()).toBe(join(tempDir, "mcp-servers.json"));
    });
  });

  describe("load", () => {
    it("should return empty registry when file does not exist", async () => {
      const data = await registry.load();
      expect(data.apiVersion).toBe("aiwg.io/v1");
      expect(data.kind).toBe("McpServerRegistry");
      expect(data.servers).toEqual({});
    });

    it("should parse existing registry file", async () => {
      await writeFile(
        join(tempDir, "mcp-servers.json"),
        JSON.stringify({
          apiVersion: "aiwg.io/v1",
          kind: "McpServerRegistry",
          servers: {
            test: { name: "test", type: "http", url: "https://example.com/mcp" },
          },
        }),
      );

      // Need fresh registry to avoid cache
      const fresh = new McpServerRegistry(tempDir);
      const data = await fresh.load();
      expect(data.servers.test).toBeDefined();
      expect(data.servers.test.url).toBe("https://example.com/mcp");
    });
  });

  describe("add", () => {
    it("should add a new http server", async () => {
      await registry.add({
        name: "fortemi",
        type: "http",
        url: "https://memory.s9.internal/mcp",
      });

      const content = JSON.parse(await readFile(registry.getPath(), "utf-8"));
      expect(content.servers.fortemi).toBeDefined();
      expect(content.servers.fortemi.url).toBe("https://memory.s9.internal/mcp");
      expect(content.servers.fortemi.type).toBe("http");
      expect(content.servers.fortemi.addedAt).toBeDefined();
    });

    it("should add a new stdio server", async () => {
      await registry.add({
        name: "mytools",
        type: "stdio",
        command: "npx",
        args: ["mcp-server-mytools"],
      });

      const content = JSON.parse(await readFile(registry.getPath(), "utf-8"));
      expect(content.servers.mytools.command).toBe("npx");
      expect(content.servers.mytools.args).toEqual(["mcp-server-mytools"]);
    });

    it("should reject duplicate server names", async () => {
      await registry.add({ name: "test", type: "http", url: "https://a.com" });

      await expect(
        registry.add({ name: "test", type: "http", url: "https://b.com" }),
      ).rejects.toThrow(/already exists/);
    });
  });

  describe("remove", () => {
    it("should remove an existing server", async () => {
      await registry.add({ name: "test", type: "http", url: "https://a.com" });
      await registry.remove("test");

      const content = JSON.parse(await readFile(registry.getPath(), "utf-8"));
      expect(content.servers.test).toBeUndefined();
    });

    it("should throw for non-existent server", async () => {
      await expect(registry.remove("nonexistent")).rejects.toThrow(/not found/);
    });
  });

  describe("update", () => {
    it("should update an existing server", async () => {
      await registry.add({ name: "test", type: "http", url: "https://old.com" });
      await registry.update("test", { url: "https://new.com" });

      const content = JSON.parse(await readFile(registry.getPath(), "utf-8"));
      expect(content.servers.test.url).toBe("https://new.com");
      expect(content.servers.test.name).toBe("test");
    });

    it("should throw for non-existent server", async () => {
      await expect(
        registry.update("nonexistent", { url: "https://new.com" }),
      ).rejects.toThrow(/not found/);
    });
  });

  describe("get", () => {
    it("should return a server definition", async () => {
      await registry.add({ name: "test", type: "http", url: "https://a.com" });
      const server = await registry.get("test");
      expect(server).toBeDefined();
      expect(server!.url).toBe("https://a.com");
    });

    it("should return undefined for non-existent server", async () => {
      const server = await registry.get("nonexistent");
      expect(server).toBeUndefined();
    });
  });

  describe("list", () => {
    it("should return all servers", async () => {
      await registry.add({ name: "a", type: "http", url: "https://a.com" });
      await registry.add({ name: "b", type: "stdio", command: "npx", args: ["b"] });

      const servers = await registry.list();
      expect(servers).toHaveLength(2);
      expect(servers.map((s) => s.name).sort()).toEqual(["a", "b"]);
    });

    it("should return empty array when no servers", async () => {
      const servers = await registry.list();
      expect(servers).toEqual([]);
    });
  });

  describe("recordInjection", () => {
    it("should track injected providers", async () => {
      await registry.add({ name: "test", type: "http", url: "https://a.com" });
      await registry.recordInjection("test", "claude-code");
      await registry.recordInjection("test", "cursor");

      const server = await registry.get("test");
      expect(server!.injectedProviders).toContain("claude-code");
      expect(server!.injectedProviders).toContain("cursor");
    });

    it("should not duplicate provider entries", async () => {
      await registry.add({ name: "test", type: "http", url: "https://a.com" });
      await registry.recordInjection("test", "claude-code");
      await registry.recordInjection("test", "claude-code");

      const server = await registry.get("test");
      expect(
        server!.injectedProviders!.filter((p) => p === "claude-code"),
      ).toHaveLength(1);
    });
  });

  describe("getInjectedProviders", () => {
    it("should return unique set of all injected providers", async () => {
      await registry.add({ name: "a", type: "http", url: "https://a.com" });
      await registry.add({ name: "b", type: "http", url: "https://b.com" });
      await registry.recordInjection("a", "claude-code");
      await registry.recordInjection("a", "cursor");
      await registry.recordInjection("b", "cursor");
      await registry.recordInjection("b", "factory");

      const providers = await registry.getInjectedProviders();
      expect(providers.sort()).toEqual(["claude-code", "cursor", "factory"]);
    });
  });
});

describe("injectServers", () => {
  let tempDir: string;
  let projectDir: string;
  let registry: McpServerRegistry;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "aiwg-mcp-inject-"));
    projectDir = join(tempDir, "project");
    await mkdir(projectDir, { recursive: true });

    registry = new McpServerRegistry(tempDir);
    await registry.add({
      name: "fortemi",
      type: "http",
      url: "https://memory.internal/mcp",
    });
    await registry.add({
      name: "gitea",
      type: "http",
      url: "https://mcp-gitea.internal/mcp",
    });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("should inject into claude-code config", async () => {
    const result = await injectServers(registry, "claude-code", {
      projectDir,
    });

    expect(result.serversInjected).toContain("fortemi");
    expect(result.serversInjected).toContain("gitea");
    expect(result.error).toBeUndefined();

    const written = JSON.parse(await readFile(result.configPath, "utf-8"));
    expect(written.mcpServers.fortemi).toBeDefined();
    expect(written.mcpServers.fortemi.url).toBe("https://memory.internal/mcp");
    expect(written.mcpServers.gitea).toBeDefined();
  });

  it("should inject claude alias using ProviderDefinition mcp adapter metadata", async () => {
    const result = await injectServers(registry, "claude", {
      projectDir,
    });

    expect(result.serversInjected).toContain("fortemi");
    const configPath = join(projectDir, ".claude/settings.local.json");
    const written = JSON.parse(await readFile(configPath, "utf-8"));
    expect(written.mcpServers.fortemi.url).toBe("https://memory.internal/mcp");
  });

  it("should inject into cursor config", async () => {
    const result = await injectServers(registry, "cursor", { projectDir });

    expect(result.serversInjected).toHaveLength(2);
    const written = JSON.parse(await readFile(result.configPath, "utf-8"));
    expect(written.mcpServers.fortemi).toBeDefined();
  });

  it("should inject only specified servers", async () => {
    const result = await injectServers(registry, "claude-code", {
      servers: ["fortemi"],
      projectDir,
    });

    expect(result.serversInjected).toEqual(["fortemi"]);
    const written = JSON.parse(await readFile(result.configPath, "utf-8"));
    expect(written.mcpServers.fortemi).toBeDefined();
    expect(written.mcpServers.gitea).toBeUndefined();
  });

  it("should preserve existing provider config", async () => {
    // Write existing config first
    const configDir = join(projectDir, ".claude");
    await mkdir(configDir, { recursive: true });
    await writeFile(
      join(configDir, "settings.local.json"),
      JSON.stringify({
        mcpServers: {
          existing: { command: "existing-cmd", args: [] },
        },
      }),
    );

    const result = await injectServers(registry, "claude-code", { projectDir });

    const written = JSON.parse(await readFile(result.configPath, "utf-8"));
    expect(written.mcpServers.existing).toBeDefined(); // preserved
    expect(written.mcpServers.fortemi).toBeDefined(); // added
  });

  it("should support dry run mode", async () => {
    const result = await injectServers(registry, "claude-code", {
      projectDir,
      dryRun: true,
    });

    expect(result.serversInjected).toHaveLength(2);
    // Config file should NOT exist after dry run
    await expect(readFile(result.configPath, "utf-8")).rejects.toThrow();
  });

  it("should return error when no servers to inject", async () => {
    const emptyRegistry = new McpServerRegistry(tempDir + "-empty");
    const result = await injectServers(emptyRegistry, "claude-code");
    expect(result.error).toMatch(/No servers to inject/);
  });

  it("should handle opencode mcp key format", async () => {
    const result = await injectServers(registry, "opencode", { projectDir });

    const written = JSON.parse(await readFile(result.configPath, "utf-8"));
    // OpenCode uses 'mcp' key, not 'mcpServers'
    expect(written.mcp).toBeDefined();
    expect(written.mcp.fortemi).toBeDefined();
    expect(written.mcp.fortemi.type).toBe("remote");
  });

  it("should handle factory config format", async () => {
    const result = await injectServers(registry, "factory");

    const written = JSON.parse(await readFile(result.configPath, "utf-8"));
    expect(written.mcpServers.fortemi).toBeDefined();
    expect(written.mcpServers.fortemi.type).toBe("http");
    expect(written.mcpServers.fortemi.disabled).toBe(false);
  });

  it("should handle codex TOML format", async () => {
    const result = await injectServers(registry, "codex");

    const content = await readFile(result.configPath, "utf-8");
    expect(content).toContain("[mcp_servers.fortemi]");
    expect(content).toContain("[mcp_servers.gitea]");
    expect(content).toContain('url = "https://memory.internal/mcp"');
  });

  it("should record injection in registry", async () => {
    await injectServers(registry, "claude-code", { projectDir });

    const fortemi = await registry.get("fortemi");
    expect(fortemi!.injectedProviders).toContain("claude-code");

    const providers = await registry.getInjectedProviders();
    expect(providers).toContain("claude-code");
  });
});

describe("getProviderConfigPath", () => {
  it("should return correct paths for each provider", () => {
    expect(getProviderConfigPath("claude-code", "/project")).toContain(
      ".claude/settings.local.json",
    );
    expect(getProviderConfigPath("cursor", "/project")).toContain(
      ".cursor/mcp.json",
    );
    expect(getProviderConfigPath("factory")).toContain(".factory/mcp.json");
    expect(getProviderConfigPath("codex")).toContain(".codex/config.toml");
    expect(getProviderConfigPath("windsurf")).toContain(
      "windsurf/mcp_config.json",
    );
    expect(getProviderConfigPath("warp")).toContain(".warp/mcp.json");
  });
});

describe("SUPPORTED_PROVIDERS", () => {
  it("should include all expected providers", () => {
    expect(SUPPORTED_PROVIDERS).toContain("claude-code");
    expect(SUPPORTED_PROVIDERS).toContain("cursor");
    expect(SUPPORTED_PROVIDERS).toContain("factory");
    expect(SUPPORTED_PROVIDERS).toContain("codex");
    expect(SUPPORTED_PROVIDERS).toContain("opencode");
    expect(SUPPORTED_PROVIDERS).toContain("windsurf");
    expect(SUPPORTED_PROVIDERS).toContain("warp");
  });
});
