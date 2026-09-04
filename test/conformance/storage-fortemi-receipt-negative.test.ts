import { describe, expect, it } from "vitest";
import { createFortemiQualificationReceipt } from "../../src/storage/fortemi-qualification-receipt.js";

const input = () => ({
  report: {
    schema: "aiwg.fortemi-live-qualification/v1" as const,
    compatible: true,
    mutationAttempted: false,
    server: { name: "fortemi", version: "2026.9.1" },
    namespace: "aiwg-qualification-123e4567-e89b-42d3-a456-426614174000",
    operations: [],
  },
  endpointUrl: "https://titan.example/mcp",
  toolSchemas: {},
  aiwgCommit: "a".repeat(40),
  aiwgRef: "refs/heads/main",
  contractRevision: "2026-07-06",
  startedAt: "2026-09-04T12:00:00Z",
  endedAt: "2026-09-04T12:00:01Z",
  timeoutMs: 5000,
  networkAttempts: 1,
});

describe("Fortemi qualification receipt negative controls", () => {
  it.each([
    [
      "raw URL in ref",
      (value: ReturnType<typeof input>) => {
        value.aiwgRef = "https://titan.example/token";
      },
      "FORTEMI_RECEIPT_INVALID_REF",
    ],
    [
      "unsafe server value",
      (value: ReturnType<typeof input>) => {
        value.report.server.name = "fortemi password=secret";
      },
      "FORTEMI_RECEIPT_INVALID_SERVER_NAME",
    ],
    [
      "mutation without object binding",
      (value: ReturnType<typeof input>) => {
        value.report.mutationAttempted = true;
      },
      "FORTEMI_RECEIPT_MUTATION_BINDING_MISMATCH",
    ],
    [
      "invalid resource envelope",
      (value: ReturnType<typeof input>) => {
        value.timeoutMs = 60000;
      },
      "FORTEMI_RECEIPT_INVALID_RESOURCES",
    ],
  ])("rejects %s", (_name, mutate, code) => {
    const value = input();
    mutate(value);
    expect(() => createFortemiQualificationReceipt(value)).toThrow(code);
  });
});
