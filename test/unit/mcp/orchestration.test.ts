/**
 * MCP orchestration tool tests.
 *
 * @source @src/mcp/tools/orchestration.mjs
 * @implements #1584
 */

import { describe, it, expect } from "vitest";
// @ts-expect-error — .mjs untyped
import * as orchestration from "../../../src/mcp/tools/orchestration.mjs";

const { listFlows } = orchestration as any;

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
