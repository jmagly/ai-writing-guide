import { describe, expect, it, vi } from "vitest";

const captures = vi.hoisted(() => ({
  connected: [] as unknown[],
  http: [] as Array<{ url: URL; options: Record<string, unknown> }>,
  sse: [] as Array<{ url: URL; options: Record<string, unknown> }>,
  stdio: [] as Array<Record<string, unknown>>,
}));

vi.mock("@modelcontextprotocol/sdk/client/index.js", () => ({
  Client: class {
    async connect(transport: unknown) {
      captures.connected.push(transport);
    }
    async callTool() {
      return { structuredContent: { not_found: true } };
    }
    async close() {}
  },
}));

vi.mock("@modelcontextprotocol/sdk/client/streamableHttp.js", () => ({
  StreamableHTTPClientTransport: class {
    constructor(url: URL, options: Record<string, unknown>) {
      captures.http.push({ url, options });
    }
  },
}));

vi.mock("@modelcontextprotocol/sdk/client/sse.js", () => ({
  SSEClientTransport: class {
    constructor(url: URL, options: Record<string, unknown>) {
      captures.sse.push({ url, options });
    }
  },
}));

vi.mock("@modelcontextprotocol/sdk/client/stdio.js", () => ({
  StdioClientTransport: class {
    constructor(options: Record<string, unknown>) {
      captures.stdio.push(options);
    }
  },
}));

import { createDefaultMcpClient } from "../../../src/storage/backends/fortemi.js";

describe("Fortemi MCP transport construction (#1508)", () => {
  it("connects a local workstation stdio registry entry", async () => {
    const client = await createDefaultMcpClient("fortemi", {
      get: async () => ({
        name: "fortemi",
        type: "stdio",
        command: "/opt/fortemi/bin/mcp-server",
        args: ["--local"],
      }),
    });

    expect(captures.stdio.at(-1)).toMatchObject({
      command: "/opt/fortemi/bin/mcp-server",
      args: ["--local"],
    });
    expect(
      await client.callTool("get_note", { note_id: "research:REF-001.md" }),
    ).toEqual({
      not_found: true,
    });
  });

  it("connects authenticated Enterprise Streamable HTTP with a runtime bearer header", async () => {
    await createDefaultMcpClient(
      "fortemi-enterprise",
      {
        get: async () => ({
          name: "fortemi-enterprise",
          type: "http",
          url: "https://memory.example.internal/mcp",
          headerEnv: { Authorization: "AIWG_FORTEMI_TOKEN" },
        }),
      },
      { AIWG_FORTEMI_TOKEN: "synthetic-enterprise-token" },
    );

    const constructed = captures.http.at(-1)!;
    expect(constructed.url.href).toBe("https://memory.example.internal/mcp");
    expect(constructed.options).toMatchObject({
      requestInit: {
        headers: { Authorization: "Bearer synthetic-enterprise-token" },
      },
    });
  });

  it("constructs legacy SSE with credential headers on stream and POST requests", async () => {
    await createDefaultMcpClient(
      "fortemi-sse",
      {
        get: async () => ({
          name: "fortemi-sse",
          type: "sse",
          url: "https://memory.example.internal/sse",
          headerEnv: { Authorization: "AIWG_FORTEMI_TOKEN" },
        }),
      },
      { AIWG_FORTEMI_TOKEN: "synthetic-sse-token" },
    );

    const constructed = captures.sse.at(-1)!;
    expect(constructed.options).toMatchObject({
      requestInit: {
        headers: { Authorization: "Bearer synthetic-sse-token" },
      },
      eventSourceInit: { fetch: expect.any(Function) },
    });
  });
});
