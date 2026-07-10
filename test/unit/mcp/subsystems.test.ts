/**
 * MCP Subsystem Toolset Dispatch Tests
 *
 * @source @src/mcp/tools/subsystems.mjs
 * @implements #1322-#1332
 */

import { describe, it, expect, vi } from "vitest";

const { runAiwgCliMock } = vi.hoisted(() => ({
  runAiwgCliMock: vi.fn(async () => ({ stdout: '{"ok":true}', stderr: "", code: 0 })),
}));

vi.mock("../../../src/mcp/helpers.mjs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../src/mcp/helpers.mjs")>();
  return {
    ...actual,
    runAiwgCli: runAiwgCliMock,
  };
});

// @ts-expect-error — .mjs untyped
import * as subsystems from "../../../src/mcp/tools/subsystems.mjs";

const { parseToolsets, KNOWN_TOOLSETS, registerOptInToolsets } = subsystems as any;

describe("MCP subsystems — toolset parsing", () => {
  it("empty string returns empty set", () => {
    expect(parseToolsets("").size).toBe(0);
    expect(parseToolsets(undefined).size).toBe(0);
    expect(parseToolsets(null).size).toBe(0);
  });

  it("'core' alone is implicit — empty opt-in set", () => {
    expect(parseToolsets("core").size).toBe(0);
    expect(parseToolsets("core,").size).toBe(0);
  });

  it("'all' enables every known toolset", () => {
    const all = parseToolsets("all");
    for (const t of KNOWN_TOOLSETS) {
      expect(all.has(t)).toBe(true);
    }
  });

  it("normalises case and whitespace", () => {
    const set = parseToolsets(" Memory , KB , RALPH ");
    expect(set.has("memory")).toBe(true);
    expect(set.has("kb")).toBe(true);
    expect(set.has("ralph")).toBe(true);
  });

  it("silently drops unknown toolsets (warns to stderr)", () => {
    const set = parseToolsets("memory,nonexistent,kb");
    expect(set.has("memory")).toBe(true);
    expect(set.has("kb")).toBe(true);
    expect(set.has("nonexistent")).toBe(false);
  });

  it("known toolsets match expected list", () => {
    const expected = ['flows', 'missions', 'memory', 'kb', 'research', 'activity-log', 'index', 'ralph', 'mc', 'ops'];
    for (const t of expected) {
      expect(KNOWN_TOOLSETS).toContain(t);
    }
  });

  it("'all' includes post-1533 orchestration toolsets", () => {
    const all = parseToolsets("all");
    expect(all.has("flows")).toBe(true);
    expect(all.has("missions")).toBe(true);
  });

  it("mc-dispatch forwards LFD budget controls to the CLI", async () => {
    const tools = new Map<string, any>();
    const server = {
      registerTool: vi.fn((name: string, config: any, handler: any) => {
        tools.set(name, { config, handler });
      }),
    };

    registerOptInToolsets(server, new Set(["mc"]));

    await tools.get("mc-dispatch").handler({
      session_id: "mc-123",
      objective: "tighten loop controls",
      completion: "budget-stop report emitted",
      max_iterations: 7,
      max_total_tokens: 50_000,
      max_output_tokens: 12_000,
      max_tool_calls: 80,
      max_total_cost: 4.5,
      max_wall_clock_minutes: 30,
      exploration_quota: 3,
    });

    expect(runAiwgCliMock).toHaveBeenCalledWith([
      "mc",
      "dispatch",
      "mc-123",
      "tighten loop controls",
      "--completion",
      "budget-stop report emitted",
      "--max-iterations",
      "7",
      "--max-total-tokens",
      "50000",
      "--max-output-tokens",
      "12000",
      "--max-tool-calls",
      "80",
      "--max-total-cost",
      "4.5",
      "--max-wall-clock-minutes",
      "30",
      "--exploration-quota",
      "3",
    ], { input: undefined });
  });
});
