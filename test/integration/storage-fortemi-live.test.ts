import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { createDefaultMcpClient } from "../../src/storage/backends/fortemi.js";
import { qualifyLiveFortemi } from "../../src/storage/fortemi-qualification.js";
import {
  createFortemiQualificationReceipt,
  resolveFortemiQualificationSource,
  writeFortemiQualificationReceipt,
} from "../../src/storage/fortemi-qualification-receipt.js";

const url = process.env.AIWG_FORTEMI_LIVE_URL;
describe.skipIf(!url)("Fortemi live adapter qualification (#2194)", () => {
  it("captures server/tool compatibility before bounded isolated adapter operations", async () => {
    const startedAt = new Date().toISOString();
    const timeoutMs = Math.max(
      250,
      Math.min(Number(process.env.AIWG_FORTEMI_LIVE_TIMEOUT_MS ?? 5_000), 30_000),
    );
    let toolSchemas: unknown = [];
    let networkAttempts = 0;
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
    const observedClient = {
      ...client,
      listTools: client.listTools
        ? async () => {
            networkAttempts += 1;
            return client.listTools!();
          }
        : undefined,
      callTool: async (...args: Parameters<typeof client.callTool>) => {
        networkAttempts += 1;
        return client.callTool(...args);
      },
    };
    const report = await qualifyLiveFortemi(observedClient, {
      timeoutMs,
      allowMutation: process.env.AIWG_FORTEMI_LIVE_ALLOW_WRITE === "1",
      contractRevision: process.env.AIWG_FORTEMI_CONTRACT_REVISION,
      onToolSchemas: (schemas) => {
        toolSchemas = schemas;
      },
    });
    const endedAt = new Date().toISOString();
    const evidenceDirectory = process.env.AIWG_STORAGE_EVIDENCE_DIR;
    if (evidenceDirectory) {
      const source = resolveFortemiQualificationSource();
      const receipt = createFortemiQualificationReceipt({
        report,
        endpointUrl: url!,
        toolSchemas,
        ...source,
        contractRevision:
          process.env.AIWG_FORTEMI_CONTRACT_REVISION ||
          report.server.contractRevision ||
          "unreported",
        startedAt,
        endedAt,
        timeoutMs,
        networkAttempts,
        mutationObjectId: report.mutationObjectId,
      });
      await writeFortemiQualificationReceipt(
        join(evidenceDirectory, `fortemi-${receipt.receiptDigest.slice(7)}.json`),
        receipt,
      );
    }
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
