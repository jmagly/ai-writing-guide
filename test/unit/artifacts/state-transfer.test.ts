import { describe, expect, it } from "vitest";

import { normalizeStateTransferProjection } from "../../../src/artifacts/state-transfer.js";

describe("state-transfer projection", () => {
  it("keeps an explicit active-record null", () => {
    expect(normalizeStateTransferProjection({ deleted_at: null })).toEqual({
      deletedAt: null,
    });
  });

  it("normalizes a source-authored tombstone timestamp", () => {
    expect(
      normalizeStateTransferProjection({
        deleted_at: "2026-07-20T08:30:00-04:00",
      }),
    ).toEqual({ deletedAt: "2026-07-20T12:30:00.000Z" });
  });

  it.each([
    null,
    "deleted",
    {},
    { deleted_at: "not-a-date" },
    { deleted_at: null, observed_state: "closed" },
  ])("rejects an invalid projection: %j", (value) => {
    expect(() => normalizeStateTransferProjection(value)).toThrow();
  });
});
