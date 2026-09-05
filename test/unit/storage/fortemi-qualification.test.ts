import { describe, expect, it, vi } from "vitest";
import { qualifyLiveFortemi } from "../../../src/storage/fortemi-qualification.js";

const compatibleTools = [
  {
    name: "get_note",
    inputSchema: { required: ["note_id"], properties: { note_id: {} } },
  },
  {
    name: "capture_knowledge",
    inputSchema: {
      required: ["note_id", "content"],
      properties: { note_id: {}, content: {} },
    },
  },
  {
    name: "update_note",
    inputSchema: {
      required: ["note_id"],
      properties: { note_id: {}, content: {}, archived: {} },
    },
  },
  { name: "list_notes", inputSchema: { properties: { id_prefix: {} } } },
  {
    name: "search",
    inputSchema: {
      required: ["query"],
      properties: { query: {}, id_prefix: {} },
    },
  },
];

const sourceAddressedTools = [
  {
    name: "get_note",
    inputSchema: { required: ["id"], properties: { id: {} } },
  },
  {
    name: "upsert_external_notes",
    inputSchema: {
      required: [
        "source_namespace",
        "source_schema_version",
        "import_run_id",
        "items",
      ],
      properties: {
        source_namespace: {},
        source_schema_version: {},
        import_run_id: {},
        batch_id: {},
        policy: {},
        items: {
          items: {
            properties: {
              external_id: {},
              content: {},
              content_digest: {},
              caller_stable_id: {},
              metadata: {},
              policy: {},
            },
          },
        },
      },
    },
  },
  {
    name: "update_note",
    inputSchema: {
      required: ["id"],
      properties: { id: {}, content: {}, archived: {} },
    },
  },
  {
    name: "list_notes",
    inputSchema: { properties: { limit: {}, offset: {} } },
  },
  {
    name: "search",
    inputSchema: {
      required: ["action"],
      properties: { action: {}, query: {}, limit: {} },
    },
  },
];

describe("Fortemi live qualification preflight (#2194)", () => {
  it("makes current UUID/action schema drift actionable without calling a tool", async () => {
    const callTool = vi.fn();
    const report = await qualifyLiveFortemi(
      {
        callTool,
        listTools: async () => ({
          tools: [
            {
              name: "get_note",
              inputSchema: {
                required: ["id"],
                properties: { id: { type: "string", format: "uuid" } },
              },
            },
            {
              name: "capture_knowledge",
              inputSchema: {
                required: ["action"],
                properties: {
                  action: { const: "create" },
                  content: { type: "string" },
                },
              },
            },
            {
              name: "list_notes",
              inputSchema: { properties: { limit: { type: "integer" } } },
            },
          ],
        }),
        serverVersion: () => ({ name: "fortemi", version: "2026.9.0" }),
      },
      { contractRevision: "2026-07-06" },
    );

    expect(report).toMatchObject({
      compatible: false,
      mutationAttempted: false,
      server: { version: "2026.9.0", contractRevision: "2026-07-06" },
    });
    expect(report.operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tool: "get_note",
          code: "FORTEMI_TOOL_SCHEMA_DRIFT",
        }),
        expect.objectContaining({
          tool: "list_notes",
          code: "FORTEMI_TOOL_SCHEMA_DRIFT",
        }),
      ]),
    );
    expect(callTool).not.toHaveBeenCalled();
  });

  it("uses the actual adapter for non-mutating operations after preflight", async () => {
    const callTool = vi.fn(async (name: string) =>
      name === "get_note"
        ? { not_found: true }
        : name === "list_notes"
          ? { notes: [] }
          : { results: [] },
    );
    const close = vi.fn();
    const report = await qualifyLiveFortemi({
      callTool,
      close,
      listTools: async () => ({ tools: compatibleTools }),
    });
    expect(report.compatible).toBe(true);
    expect(report.mutationAttempted).toBe(false);
    expect(callTool.mock.calls.map(([name]) => name)).toEqual([
      "get_note",
      "list_notes",
      "search",
    ]);
    expect(close).toHaveBeenCalledOnce();
  });

  it("accepts the 2026.9.1 source-addressed schema and stays read-only by default", async () => {
    const callTool = vi.fn(async (name: string) =>
      name === "get_note"
        ? { not_found: true }
        : name === "list_notes"
          ? { notes: [] }
          : { results: [] },
    );
    const close = vi.fn();
    const listTools = vi.fn(async () => ({ tools: sourceAddressedTools }));
    const report = await qualifyLiveFortemi({
      callTool,
      close,
      listTools,
      serverVersion: () => ({ name: "fortemi", version: "2026.9.1" }),
    });

    expect(report).toMatchObject({
      compatible: true,
      mutationAttempted: false,
    });
    expect(callTool.mock.calls.map(([name]) => name)).toEqual([
      "get_note",
      "list_notes",
      "search",
    ]);
    expect(callTool.mock.calls[0][1]).toEqual({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
    });
    expect(callTool.mock.calls[1][1]).toEqual({ limit: 500, offset: 0 });
    expect(callTool.mock.calls[2][1]).toMatchObject({
      action: "text",
      limit: 50,
    });
    expect(callTool).not.toHaveBeenCalledWith(
      "upsert_external_notes",
      expect.anything(),
    );
    expect(close).toHaveBeenCalledOnce();
  });

  it("rejects an incomplete 2026.9.1 source-addressed item contract before tool calls", async () => {
    const callTool = vi.fn();
    const tools = structuredClone(sourceAddressedTools);
    const upsert = tools.find((tool) => tool.name === "upsert_external_notes")!;
    const items = upsert.inputSchema.properties.items as {
      items: { properties: Record<string, unknown> };
    };
    delete items.items.properties.caller_stable_id;
    const report = await qualifyLiveFortemi({
      callTool,
      listTools: async () => ({ tools }),
    });
    expect(report.compatible).toBe(false);
    expect(report.mutationAttempted).toBe(false);
    expect(
      report.operations.find((item) => item.operation === "write")?.detail,
    ).toContain("caller_stable_id");
    expect(callTool).not.toHaveBeenCalled();
  });

  it("propagates non-mutating tool errors and always closes the client", async () => {
    const close = vi.fn();
    await expect(
      qualifyLiveFortemi({
        listTools: async () => ({ tools: sourceAddressedTools }),
        callTool: vi.fn(async () => {
          throw new Error("synthetic read failure");
        }),
        close,
      }),
    ).rejects.toThrow("synthetic read failure");
    expect(close).toHaveBeenCalledOnce();
  });

  it("bounds a stalled non-mutating read after compatible discovery", async () => {
    const close = vi.fn();
    await expect(
      qualifyLiveFortemi(
        {
          listTools: async () => ({ tools: sourceAddressedTools }),
          callTool: () => new Promise(() => undefined),
          close,
        },
        { timeoutMs: 1 },
      ),
    ).rejects.toThrow("FORTEMI_LIVE_TIMEOUT: adapter read exceeded 250ms");
    expect(close).toHaveBeenCalledOnce();
  });

  it("only opts into a write under the isolated qualification namespace", async () => {
    const callTool = vi.fn(async (name: string) =>
      name === "get_note"
        ? { not_found: true }
        : name === "list_notes"
          ? { notes: [] }
          : { results: [] },
    );
    const report = await qualifyLiveFortemi(
      { callTool, listTools: async () => ({ tools: compatibleTools }) },
      { allowMutation: true },
    );
    const capture = callTool.mock.calls.find(
      ([name]) => name === "capture_knowledge",
    );
    expect(report.mutationAttempted).toBe(true);
    expect(report.mutationObjectId).toBe(capture?.[1].note_id);
    expect(capture?.[1]).toMatchObject({
      note_id: expect.stringMatching(`^${report.namespace}:`),
    });
  });

  it("bounds an unresponsive discovery request and closes the client", async () => {
    const close = vi.fn();
    await expect(
      qualifyLiveFortemi(
        {
          callTool: vi.fn(),
          close,
          listTools: () => new Promise(() => undefined),
        },
        { timeoutMs: 1 },
      ),
    ).rejects.toThrow("FORTEMI_LIVE_TIMEOUT: tools/list exceeded 250ms");
    expect(close).toHaveBeenCalledOnce();
  });
});
