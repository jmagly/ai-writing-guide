import { mkdtemp, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it, vi } from "vitest";
import {
  qualifyFortemiDatasetLivePreflight,
  verifyFortemiDatasetLiveReceipt,
  writeFortemiDatasetLiveReceipt,
} from "../../../src/dataset/fortemi-live-qualification.js";

const commit = "a".repeat(40);

describe("Fortemi dataset live preflight", () => {
  it("records an absent server contract as pending without invoking tools", async () => {
    const callTool = vi.fn();
    const close = vi.fn();
    const receipt = await qualifyFortemiDatasetLivePreflight({
      client: {
        listTools: async () => ({ tools: [{ name: "search", inputSchema: { type: "object" } }] }),
        callTool,
        close,
        serverVersion: () => ({ name: "fortemi", version: "2026.9.1" }),
      },
      endpointUrl: "https://user:secret@fortemi.invalid/mcp?tenant=private#fragment",
      aiwgCommit: commit,
    });

    expect(receipt).toMatchObject({
      outcome: "pending",
      diagnostic: "CONFORMANCE_FORTEMI_DATASET_CONTRACT_UNAVAILABLE",
      observed: { serverName: "fortemi", serverVersion: "2026.9.1" },
      mutation: { authorized: false, attempted: false },
      resources: { networkAttempts: 1, toolCalls: 0 },
    });
    expect(JSON.stringify(receipt)).not.toContain("secret");
    expect(JSON.stringify(receipt)).not.toContain("private");
    expect(callTool).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledOnce();
    expect(verifyFortemiDatasetLiveReceipt(receipt)).toEqual([]);
  });

  it("recognizes strict discovery but does not claim execution parity", async () => {
    const callTool = vi.fn();
    const receipt = await qualifyFortemiDatasetLivePreflight({
      client: {
        listTools: async () => ({ tools: [
          { name: "dataset_capabilities", inputSchema: { type: "object", required: ["contract_version"], properties: { contract_version: {} } } },
          { name: "dataset_execute", inputSchema: { type: "object", required: ["contract_version", "namespace", "plan", "records"], properties: { contract_version: {}, namespace: {}, plan: {}, records: {} } } },
        ] }),
        callTool,
      },
      endpointUrl: "https://fortemi.invalid/mcp",
      aiwgCommit: commit,
    });

    expect(receipt.outcome).toBe("supported");
    expect(receipt.diagnostic).toBe("CONFORMANCE_FORTEMI_DATASET_PREFLIGHT_SUPPORTED");
    expect(receipt.mutation.attempted).toBe(false);
    expect(callTool).not.toHaveBeenCalled();
    expect(verifyFortemiDatasetLiveReceipt(receipt)).toEqual([]);
  });

  it("rejects tampered maturity evidence", async () => {
    const receipt = await qualifyFortemiDatasetLivePreflight({
      client: { listTools: async () => ({ tools: [] }), callTool: vi.fn() },
      endpointUrl: "https://fortemi.invalid/mcp",
      aiwgCommit: commit,
    });
    const forged = { ...receipt, outcome: "supported" as const };
    expect(verifyFortemiDatasetLiveReceipt(forged)).toEqual(expect.arrayContaining([
      "CONFORMANCE_RECEIPT_OUTCOME_INVALID",
      "CONFORMANCE_RECEIPT_DIGEST_MISMATCH",
    ]));
  });

  it("durably writes private, non-overwriting evidence", async () => {
    const receipt = await qualifyFortemiDatasetLivePreflight({
      client: { listTools: async () => ({ tools: [] }), callTool: vi.fn() },
      endpointUrl: "https://fortemi.invalid/mcp",
      aiwgCommit: commit,
    });
    const directory = await mkdtemp(join(tmpdir(), "aiwg-dataset-live-"));
    const path = join(directory, "receipt.json");
    await writeFortemiDatasetLiveReceipt(path, receipt);
    expect(JSON.parse(await readFile(path, "utf8"))).toEqual(receipt);
    expect((await stat(path)).mode & 0o777).toBe(0o600);
    await expect(writeFortemiDatasetLiveReceipt(path, receipt)).rejects.toThrow();
  });
});
