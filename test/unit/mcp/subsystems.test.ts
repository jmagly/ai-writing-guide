/**
 * MCP Subsystem Toolset Dispatch Tests
 *
 * @source @src/mcp/tools/subsystems.mjs
 * @implements #1322-#1332
 */

import { describe, it, expect } from "vitest";
// @ts-expect-error — .mjs untyped
import * as subsystems from "../../../src/mcp/tools/subsystems.mjs";

const { parseToolsets, KNOWN_TOOLSETS } = subsystems as any;

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
    const expected = ['memory', 'kb', 'research', 'activity-log', 'index', 'ralph', 'mc', 'ops'];
    for (const t of expected) {
      expect(KNOWN_TOOLSETS).toContain(t);
    }
  });
});
