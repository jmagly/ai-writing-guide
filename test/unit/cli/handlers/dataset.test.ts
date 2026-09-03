import { describe, expect, it } from "vitest";
import { datasetHandler } from "../../../../src/cli/handlers/dataset.js";
import type { HandlerContext } from "../../../../src/cli/handlers/types.js";
const context = (args: string[]): HandlerContext => ({
  args,
  rawArgs: ["dataset", ...args],
  cwd: process.cwd(),
  frameworkRoot: process.cwd(),
});
describe("dataset CLI handler (#2236)", () => {
  it("documents every lifecycle action without executing it", async () => {
    const result = await datasetHandler.help!(context([]));
    expect(result.exitCode).toBe(0);
    for (const action of [
      "source",
      "check",
      "preview",
      "plan",
      "ingest",
      "status",
      "show",
      "verify",
      "query",
      "lineage",
      "export",
      "cancel",
      "retry",
    ])
      expect(result.message).toContain(action);
  });
  it("returns a stable machine-readable error envelope", async () => {
    const result = await datasetHandler.execute(
      context(["show", "missing", "--json"]),
    );
    expect(result.exitCode).toBe(1);
    expect(JSON.parse(result.message!)).toMatchObject({
      schema: "aiwg.dataset-orchestration/v1",
      action: "show",
      ok: false,
      diagnostics: [{ code: "DATASET_OBJECT_NOT_FOUND" }],
    });
  });
});
