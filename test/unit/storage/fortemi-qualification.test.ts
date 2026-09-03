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
