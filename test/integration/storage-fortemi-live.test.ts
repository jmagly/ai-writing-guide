import { describe, expect, it } from "vitest";
import { createDefaultMcpClient } from "../../src/storage/backends/fortemi.js";
import { qualifyLiveFortemi } from "../../src/storage/fortemi-qualification.js";

const url = process.env.AIWG_FORTEMI_LIVE_URL;
describe.skipIf(!url)("Fortemi live adapter qualification (#2194)", () => {
  it("captures server/tool compatibility before bounded isolated adapter operations", async () => {
    const tokenEnv = process.env.AIWG_FORTEMI_LIVE_TOKEN
      ? "AIWG_FORTEMI_LIVE_TOKEN"
      : undefined;
    const client = await createDefaultMcpClient("fortemi-live", {
      get: async () => ({
        name: "fortemi-live",
        type: "http",
        url,
        ...(tokenEnv ? { headerEnv: { Authorization: tokenEnv } } : {}),
      }),
    });
    const report = await qualifyLiveFortemi(client, {
      timeoutMs: Number(process.env.AIWG_FORTEMI_LIVE_TIMEOUT_MS ?? 5_000),
      allowMutation: process.env.AIWG_FORTEMI_LIVE_ALLOW_WRITE === "1",
      contractRevision: process.env.AIWG_FORTEMI_CONTRACT_REVISION,
    });
    console.log(JSON.stringify(report, null, 2));
    expect(
      report.server.version,
      "MCP initialize response must identify the Fortemi server version",
    ).toBeTruthy();
    expect(
      report.compatible,
      report.operations
        .filter((item) => !item.compatible)
        .map((item) => `${item.tool}: ${item.detail}`)
        .join("; "),
    ).toBe(true);
  });
});
