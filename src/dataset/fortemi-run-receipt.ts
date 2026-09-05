import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

/** Independent implementation of the Fortemi wire canonicalization contract. */
export function canonicalFortemiDatasetJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalFortemiDatasetJson).join(",")}]`;
  if (typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map(key => `${JSON.stringify(key)}:${canonicalFortemiDatasetJson(object[key])}`).join(",")}}`;
  }
  throw new Error("RECEIPT_VALUE_INVALID");
}

export function fortemiDatasetDigest(value: unknown): string {
  return `sha256:${createHash("sha256").update(canonicalFortemiDatasetJson(value), "utf8").digest("hex")}`;
}

function schemaPath(): string {
  let directory = dirname(fileURLToPath(import.meta.url));
  for (;;) {
    try {
      const metadata = JSON.parse(readFileSync(join(directory, "package.json"), "utf8")) as { name?: string };
      if (metadata.name === "aiwg" || metadata.name === "@aiwg/cli") {
        return join(directory, "schemas/dataset/fortemi-run-receipt/validation-1.0.1/run-receipt.schema.json");
      }
    } catch { /* Source and built installations have different depths. */ }
    const parent = dirname(directory);
    if (parent === directory) throw new Error("FORTEMI_RECEIPT_SCHEMA_UNAVAILABLE");
    directory = parent;
  }
}

const ajv = new Ajv2020({ strict: true, allErrors: true });
addFormats(ajv);
const validate = ajv.compile(JSON.parse(readFileSync(schemaPath(), "utf8")));

interface Checkpoint {
  sequence: number;
  scope: { dataset: string; [key: string]: string };
}

export interface FortemiDatasetRunReceipt {
  receiptDigest: string;
  requestDigest: string;
  runId: string;
  idempotencyKey: string;
  profiles: unknown;
  namespaceId: string;
  bindings: Record<string, string>;
  effects: Array<{ outcome: "committed" | "conflict" | "rejected" | "unverifiable" }>;
  counts: { attempted: number; committed: number; rejected: number };
  checkpoint: { before?: Checkpoint; after: Checkpoint };
  capabilityDecision: { selected: string[]; degradations: unknown[] };
  resourceEnvelope: { maxRecords: number };
  state: "running" | "committed" | "degraded" | "failed" | "cancelled" | "ambiguous";
  verification: "pending" | "verified" | "failed" | "unverifiable";
}

/** Schema validity, semantic consistency, and checksum integrity; not issuer authentication. */
export function verifyFortemiDatasetRunReceipt(value: unknown): string[] {
  if (!validate(value)) return ["RECEIPT_STRUCTURE_INVALID"];
  const receipt = value as FortemiDatasetRunReceipt;
  const errors: string[] = [];
  const { receiptDigest, ...payload } = receipt;
  if (fortemiDatasetDigest(payload) !== receiptDigest) errors.push("RECEIPT_DIGEST_MISMATCH");
  const { attempted, committed, rejected } = receipt.counts;
  if (committed + rejected !== attempted) errors.push("RECEIPT_COUNTS_INCONSISTENT");
  const committedEffects = receipt.effects.filter(effect => effect.outcome === "committed").length;
  if (receipt.effects.length !== attempted || committedEffects !== committed || attempted - committedEffects !== rejected) errors.push("RECEIPT_EFFECTS_INCONSISTENT");
  if (receipt.state === "failed" && committed !== 0) errors.push("RECEIPT_STATE_INCONSISTENT");
  if (receipt.bindings.outputDigest !== fortemiDatasetDigest(receipt.effects)
    || receipt.bindings.resourceEnvelopeDigest !== fortemiDatasetDigest(receipt.resourceEnvelope)
    || receipt.bindings.negotiationDigest !== fortemiDatasetDigest({ selected: receipt.capabilityDecision.selected, degradations: receipt.capabilityDecision.degradations, diagnostics: [] })) errors.push("RECEIPT_BINDINGS_INCONSISTENT");
  const { before, after } = receipt.checkpoint;
  if (after.scope.dataset !== receipt.namespaceId || receipt.bindings.destinationDigest !== fortemiDatasetDigest(after.scope)
    || (before && (canonicalFortemiDatasetJson(before.scope) !== canonicalFortemiDatasetJson(after.scope) || before.sequence >= after.sequence))) errors.push("RECEIPT_CHECKPOINT_INCONSISTENT");
  if (attempted > receipt.resourceEnvelope.maxRecords) errors.push("RECEIPT_RESOURCE_LIMIT_EXCEEDED");
  return errors;
}
