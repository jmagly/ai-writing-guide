import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { FortemiDatasetExecutionClient } from "../../../src/dataset/fortemi-dataset-execution.js";

const receipt = JSON.parse(readFileSync(new URL("../../fixtures/dataset/fortemi-run-receipt/degraded-run-receipt.json", import.meta.url), "utf8"));
const request = JSON.parse(readFileSync(new URL("../../fixtures/dataset/fortemi-run-receipt/supported-request.json", import.meta.url), "utf8"));
const capabilities = { contracts: { receipt: "fortemi.dataset-run-receipt/v1" }, schemaVersions: { receipt: "1.0.0" }, receiptValidation: { revision: "1.0.1", requestBindingRevision: "1.0.1" } };

describe("Fortemi consolidated dataset tool binding", () => {
  it("requires exact approval before executing and independently verifies the returned receipt", async () => {
    const callTool = vi.fn(async (tool, args) => {
      expect(tool).toBe("manage_dataset_execution");
      const result = args.action === "capabilities" ? capabilities
        : args.action === "preview" ? { accepted: true, noSideEffects: true, requestDigest: receipt.requestDigest }
        : { state: receipt.state, verification: receipt.verification, receipt };
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    });
    const client = new FortemiDatasetExecutionClient({ callTool });
    await expect(client.execute(request, "")).rejects.toThrow("CONFORMANCE_LIVE_AUTHORIZATION_REQUIRED");
    expect(callTool).not.toHaveBeenCalled();
    await expect(client.execute(request, `sha256:${"0".repeat(64)}`)).rejects.toThrow("CONFORMANCE_FORTEMI_PLAN_NOT_APPROVED");
    expect(callTool.mock.calls.map(([, args]) => args.action)).not.toContain("execute");
    expect(await client.execute(request, receipt.requestDigest)).toEqual(receipt);
  });

  it("rejects legacy validation revisions before preview or execution", async () => {
    const callTool = vi.fn(async () => ({ ...capabilities, receiptValidation: { revision: "1.0.0" } }));
    await expect(new FortemiDatasetExecutionClient({ callTool }).preview(request)).rejects.toThrow("CONFORMANCE_FORTEMI_RECEIPT_REVISION_UNSUPPORTED");
    expect(callTool).toHaveBeenCalledOnce();
  });

  it("rejects an otherwise valid receipt for a different namespace", async () => {
    const callTool = vi.fn(async (_tool, args) => args.action === "capabilities" ? capabilities
      : args.action === "preview" ? { accepted: true, noSideEffects: true, requestDigest: receipt.requestDigest }
      : { state: receipt.state, verification: receipt.verification, receipt });
    const different = { ...request, plan: { destination: { dataset: "different" } } };
    await expect(new FortemiDatasetExecutionClient({ callTool }).execute(different, receipt.requestDigest)).rejects.toThrow("CONFORMANCE_FORTEMI_PLAN_NOT_APPROVED");
    expect(callTool).not.toHaveBeenCalled();
  });
});
