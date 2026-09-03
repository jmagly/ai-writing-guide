import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
describe("AIWG/Fortemi language-neutral orchestration fixture (#2236)", () => {
  it("binds identities, exact counts, deterministic ordering, lineage, and privacy", () => {
    const value = JSON.parse(
      readFileSync(
        resolve(import.meta.dirname, "fortemi-language-neutral.json"),
        "utf8",
      ),
    );
    expect(value.schema).toBe("aiwg.dataset-orchestration.conformance/v1");
    expect(value.counts.attempted).toBe(
      value.counts.committed + value.counts.rejected,
    );
    expect([...value.ordering].sort()).toEqual(value.ordering);
    expect(value.relationships[0]).toMatchObject({
      predicate: "wasDerivedFrom",
      object: value.identity.sourceRevisionId,
    });
    expect(value.privacy).toBe("internal");
  });
});
