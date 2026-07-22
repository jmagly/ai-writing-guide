import { describe, expect, it } from "vitest";

import {
  classifyOperationalState,
  compareOperationalStateRecords,
  normalizeOperationalState,
  operationalStateQueryProjection,
  type OperationalStateEvidence,
  type OperationalStateProvenance,
} from "../../../src/artifacts/operational-state.js";

const base: OperationalStateProvenance = {
  source_repo: "roctinam/agentic-sandbox",
  source_kind: "issue",
  source_id: "agentic-sandbox#656",
  observed_state: "open",
  observed_at: "2026-07-21T10:00:00.000Z",
  source_updated_at: "2026-07-21T09:00:00.000Z",
  observer: "gitea-mcp",
  classification: "fresh",
  confidence: "source",
  current_action_selector: true,
};

function evidence(overrides: Partial<OperationalStateEvidence> = {}): OperationalStateEvidence {
  return {
    source_repo: "roctinam/agentic-sandbox",
    source_kind: "issue",
    source_id: "agentic-sandbox#656",
    observed_state: "open",
    observed_at: "2026-07-21T10:00:00.000Z",
    source_updated_at: "2026-07-21T09:00:00.000Z",
    observer: "gitea-mcp",
    ...overrides,
  };
}

describe("operational live-state provenance (#1827)", () => {
  it("classifies matching authoritative evidence as fresh", () => {
    expect(classifyOperationalState(base, evidence())).toEqual({
      classification: "fresh",
      reason: "remembered state matches the supplied authoritative evidence",
    });
  });

  it("classifies newer same-state evidence as superseded", () => {
    expect(
      classifyOperationalState(
        base,
        evidence({
          observed_at: "2026-07-21T12:00:00.000Z",
          source_updated_at: "2026-07-21T11:00:00.000Z",
        }),
      ).classification,
    ).toBe("superseded");
  });

  it("classifies a remembered/live state mismatch as contradicted", () => {
    const result = classifyOperationalState(
      base,
      evidence({ observed_state: "closed" }),
    );
    expect(result.classification).toBe("contradicted");
    expect(result.reason).toContain("open");
    expect(result.reason).toContain("closed");
  });

  it("classifies incomplete provenance as needs-source", () => {
    const normalized = normalizeOperationalState({
      observed_state: "open",
      classification: "fresh",
    });
    expect(normalized).toEqual({
      observed_state: "open",
      classification: "needs-source",
    });
    expect(classifyOperationalState(normalized!).classification).toBe("needs-source");
  });

  it("classifies expired observations as historical", () => {
    expect(
      classifyOperationalState(
        {
          ...base,
          stale_after: "2026-07-21T10:30:00.000Z",
        },
        undefined,
        new Date("2026-07-21T11:00:00.000Z"),
      ).classification,
    ).toBe("historical");
  });

  it("emits deterministic comparison findings", () => {
    const findings = compareOperationalStateRecords(
      [
        { id: "memory:z", operational_state: { classification: "needs-source" } },
        { id: "memory:a", operational_state: base },
      ],
      [evidence({ observed_state: "closed" })],
    );
    expect(findings.map((finding) => finding.record_id)).toEqual([
      "memory:a",
      "memory:z",
    ]);
    expect(findings.map((finding) => finding.classification)).toEqual([
      "contradicted",
      "needs-source",
    ]);
  });

  it("projects historical versus current assertion status for query output", () => {
    expect(
      operationalStateQueryProjection(base, new Date("2026-07-21T10:00:00.000Z")),
    ).toMatchObject({
      classification: "fresh",
      current: true,
      requires_live_check: true,
      source_id: "agentic-sandbox#656",
    });
    expect(
      operationalStateQueryProjection(
        { ...base, classification: "historical", current_action_selector: false },
        new Date("2026-07-21T10:00:00.000Z"),
      ),
    ).toMatchObject({ classification: "historical", current: false });
  });

  it("allowlists metadata and strips credentials and URL query material", () => {
    const normalized = normalizeOperationalState({
      ...base,
      evidence_url:
        "https://user:secret@git.example.test/roctinam/agentic-sandbox/issues/656?access_token=synthetic#private",
      bearer_token: "synthetic-must-not-survive",
      headers: { authorization: "Bearer synthetic-must-not-survive" },
    });
    expect(normalized?.evidence_url).toBe(
      "https://git.example.test/roctinam/agentic-sandbox/issues/656",
    );
    expect(JSON.stringify(normalized)).not.toContain("synthetic");
    expect(normalized).not.toHaveProperty("bearer_token");
    expect(normalized).not.toHaveProperty("headers");
  });
});
