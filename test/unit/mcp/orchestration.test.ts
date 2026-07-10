/**
 * MCP orchestration tool tests.
 *
 * @source @src/mcp/tools/orchestration.mjs
 * @implements #1584
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
import * as orchestration from "../../../src/mcp/tools/orchestration.mjs";

const { listFlows, registerMissionToolset } = orchestration as any;

describe("MCP orchestration — flows", () => {
  it("lists declarative YAML Flows from the framework corpus", async () => {
    const flows = await listFlows({ filter: "flow-release" });
    const release = flows.find((flow: any) => flow.name === "flow-release");

    expect(release).toBeDefined();
    expect(release.framework).toBe("sdlc-complete");
    expect(release.kind).toBe("WorkflowPlaybook");
    expect(release.apiVersion).toBe("workflow.aiwg.io/v1");
    expect(release.step_count).toBeGreaterThan(0);
    expect(release.wrapper_skill.exists).toBe(true);
  });
});

describe("MCP orchestration — missions", () => {
  it("mission-dispatch forwards LFD budget controls to Mission Control", async () => {
    const tools = new Map<string, any>();
    const server = {
      registerTool: vi.fn((name: string, config: any, handler: any) => {
        tools.set(name, { config, handler });
      }),
    };

    registerMissionToolset(server);

    await tools.get("mission-dispatch").handler({
      session_id: "mc-456",
      objective: "run a bounded LFD mission",
      completion: "best-output report emitted",
      max_iterations: 9,
      max_total_tokens: 60_000,
      max_output_tokens: 15_000,
      max_tool_calls: 90,
      max_total_cost: 5.25,
      max_wall_clock_minutes: 40,
      exploration_quota: 3,
      project_dir: "/tmp/project",
      confirmed: true,
    });

    expect(runAiwgCliMock).toHaveBeenCalledWith([
      "mc",
      "dispatch",
      "mc-456",
      "run a bounded LFD mission",
      "--completion",
      "best-output report emitted",
      "--max-iterations",
      "9",
      "--max-total-tokens",
      "60000",
      "--max-output-tokens",
      "15000",
      "--max-tool-calls",
      "90",
      "--max-total-cost",
      "5.25",
      "--max-wall-clock-minutes",
      "40",
      "--exploration-quota",
      "3",
    ], { cwd: "/tmp/project", timeoutMs: 30_000 });
  });
});
