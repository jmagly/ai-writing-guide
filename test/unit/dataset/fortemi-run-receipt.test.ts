import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { canonicalFortemiDatasetJson, fortemiDatasetDigest, verifyFortemiDatasetRunReceipt } from "../../../src/dataset/fortemi-run-receipt.js";

const fixture = (name: string) => JSON.parse(readFileSync(new URL(`../../fixtures/dataset/fortemi-run-receipt/${name}`, import.meta.url), "utf8"));

describe("Fortemi dataset receipt consumer", () => {
  it("independently reproduces the published canonical vector and receipt digest", () => {
    const vector = fixture("canonical-vector.json");
    expect(canonicalFortemiDatasetJson(vector.value)).toBe(vector.canonicalUtf8);
    expect(fortemiDatasetDigest(vector.value)).toBe(vector.digest);
    expect(verifyFortemiDatasetRunReceipt(fixture("degraded-run-receipt.json"))).toEqual([]);
    expect(verifyFortemiDatasetRunReceipt(fixture("local-postgres-run-receipt.json"))).toEqual([]);
    for (const example of fixture("canonical-vectors.json").vectors) {
      expect(canonicalFortemiDatasetJson(example.value)).toBe(example.canonicalUtf8);
      expect(fortemiDatasetDigest(example.value)).toBe(example.digest);
    }
  });

  it("sorts keys by UTF-16 rather than locale and preserves JSON number encoding", () => {
    expect(canonicalFortemiDatasetJson({ "\ue000": 5, "😀": 4, "ä": 3, a: 2, A: 1 }))
      .toBe('{"A":1,"a":2,"ä":3,"😀":4,"\ue000":5}');
    expect(canonicalFortemiDatasetJson([1e-7, -0, 1e21, 1.25])).toBe('[1e-7,0,1e+21,1.25]');
    expect(() => canonicalFortemiDatasetJson({ invalid: Infinity })).toThrow("RECEIPT_VALUE_INVALID");
  });

  it("rejects the shared freshly checksummed negative vectors", () => {
    for (const vector of fixture("negative-receipts.json").cases) {
      const receipt = fixture("degraded-run-receipt.json");
      for (const patch of vector.patch) {
        const keys = patch.path.slice(1).split("/");
        const last = keys.pop();
        let target = receipt;
        for (const key of keys) target = target[key];
        target[last] = patch.value;
      }
      delete receipt.receiptDigest;
      receipt.receiptDigest = fortemiDatasetDigest(receipt);
      expect(verifyFortemiDatasetRunReceipt(receipt), vector.id).toContain(vector.expectedCode);
    }
  });

  it("rejects a bound-field mutation without resealing", () => {
    const receipt = fixture("degraded-run-receipt.json");
    receipt.bindings.planDigest = `sha256:${"0".repeat(64)}`;
    expect(verifyFortemiDatasetRunReceipt(receipt)).toContain("RECEIPT_DIGEST_MISMATCH");
  });
});
