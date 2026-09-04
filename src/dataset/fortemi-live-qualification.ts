import { randomUUID } from "node:crypto";
import { link, mkdir, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { McpClientLike } from "../storage/backends/fortemi.js";
import {
  endpointFingerprint,
  fortemiReceiptDigest,
} from "../storage/fortemi-qualification-receipt.js";

export const FORTEMI_DATASET_LIVE_CONTRACT =
  "aiwg.fortemi-dataset-live-qualification/v1" as const;
export const FORTEMI_DATASET_CAPABILITIES_TOOL = "dataset_capabilities";
export const FORTEMI_DATASET_EXECUTE_TOOL = "dataset_execute";

export interface FortemiDatasetLiveReceipt {
  contract: typeof FORTEMI_DATASET_LIVE_CONTRACT;
  outcome: "pending" | "supported";
  diagnostic: "CONFORMANCE_FORTEMI_DATASET_CONTRACT_UNAVAILABLE" | "CONFORMANCE_FORTEMI_DATASET_PREFLIGHT_SUPPORTED";
  receiptDigest: string;
  bindings: {
    aiwgCommit: string;
    endpointFingerprint: string;
    toolSchemaDigest: string;
  };
  observed: { serverName: string; serverVersion: string };
  namespace: string;
  operations: Array<{ tool: string; compatible: boolean; code: string }>;
  mutation: { authorized: false; attempted: false };
  resources: { maxDurationMs: number; networkAttempts: number; toolCalls: number };
  startedAt: string;
  endedAt: string;
}

const UUID_NAMESPACE = /^aiwg-dataset-qualification-[0-9a-f-]{36}$/u;
const COMMIT = /^[0-9a-f]{40}$/u;
const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const SAFE = /^[A-Za-z0-9._:/-]+$/u;

function material(receipt: FortemiDatasetLiveReceipt): Omit<FortemiDatasetLiveReceipt, "receiptDigest"> {
  const { receiptDigest: _digest, ...rest } = receipt;
  return rest;
}

function inputSchemaCompatible(schema: unknown, required: readonly string[]): boolean {
  if (!schema || typeof schema !== "object") return false;
  const candidate = schema as { type?: unknown; properties?: unknown; required?: unknown };
  const properties = candidate.properties && typeof candidate.properties === "object"
    ? candidate.properties as Record<string, unknown>
    : {};
  const declaredRequired = Array.isArray(candidate.required) ? candidate.required : [];
  return candidate.type === "object" && required.every((key) => key in properties && declaredRequired.includes(key));
}

async function bounded<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("CONFORMANCE_FORTEMI_DATASET_PREFLIGHT_TIMEOUT")), timeoutMs);
    }),
  ]).finally(() => { if (timer) clearTimeout(timer); });
}

/** Read-only discovery. It never invokes a Fortemi tool, even when the proposed contract is present. */
export async function qualifyFortemiDatasetLivePreflight(input: {
  client: McpClientLike;
  endpointUrl: string;
  aiwgCommit: string;
  maxDurationMs?: number;
  now?: () => Date;
}): Promise<FortemiDatasetLiveReceipt> {
  if (!COMMIT.test(input.aiwgCommit)) throw new Error("CONFORMANCE_INVALID_AIWG_COMMIT");
  const maxDurationMs = Math.max(250, Math.min(input.maxDurationMs ?? 5_000, 30_000));
  const now = input.now ?? (() => new Date());
  const startedAt = now().toISOString();
  const namespace = `aiwg-dataset-qualification-${randomUUID()}`;
  let schemas: unknown = [];
  try {
    if (!input.client.listTools) throw new Error("CONFORMANCE_FORTEMI_TOOL_DISCOVERY_UNAVAILABLE");
    const discovered = await bounded(input.client.listTools(), maxDurationMs);
    schemas = discovered.tools ?? [];
    const tools = new Map((discovered.tools ?? []).map((tool) => [tool.name, tool]));
    const checks = [
      { tool: FORTEMI_DATASET_CAPABILITIES_TOOL, required: ["contract_version"] },
      { tool: FORTEMI_DATASET_EXECUTE_TOOL, required: ["contract_version", "namespace", "plan", "records"] },
    ].map(({ tool, required }) => {
      const compatible = inputSchemaCompatible(tools.get(tool)?.inputSchema, required);
      return { tool, compatible, code: compatible ? "FORTEMI_DATASET_TOOL_SCHEMA_COMPATIBLE" : tools.has(tool) ? "FORTEMI_DATASET_TOOL_SCHEMA_DRIFT" : "FORTEMI_DATASET_TOOL_MISSING" };
    });
    const supported = checks.every((check) => check.compatible);
    const endedAt = now().toISOString();
    const server = input.client.serverVersion?.() ?? {};
    const base: Omit<FortemiDatasetLiveReceipt, "receiptDigest"> = {
      contract: FORTEMI_DATASET_LIVE_CONTRACT,
      outcome: supported ? "supported" : "pending",
      diagnostic: supported ? "CONFORMANCE_FORTEMI_DATASET_PREFLIGHT_SUPPORTED" : "CONFORMANCE_FORTEMI_DATASET_CONTRACT_UNAVAILABLE",
      bindings: {
        aiwgCommit: input.aiwgCommit,
        endpointFingerprint: endpointFingerprint(input.endpointUrl),
        toolSchemaDigest: fortemiReceiptDigest(schemas),
      },
      observed: { serverName: server.name ?? "unreported", serverVersion: server.version ?? "unreported" },
      namespace,
      operations: checks,
      mutation: { authorized: false, attempted: false },
      resources: { maxDurationMs, networkAttempts: 1, toolCalls: 0 },
      startedAt,
      endedAt,
    };
    return { ...base, receiptDigest: fortemiReceiptDigest(base) };
  } finally {
    await input.client.close?.();
  }
}

export function verifyFortemiDatasetLiveReceipt(receipt: FortemiDatasetLiveReceipt): string[] {
  const errors: string[] = [];
  if (receipt.contract !== FORTEMI_DATASET_LIVE_CONTRACT) errors.push("CONFORMANCE_RECEIPT_CONTRACT_MISMATCH");
  if (!COMMIT.test(receipt.bindings.aiwgCommit) || !DIGEST.test(receipt.bindings.endpointFingerprint) || !DIGEST.test(receipt.bindings.toolSchemaDigest)) errors.push("CONFORMANCE_RECEIPT_BINDING_INVALID");
  if (!UUID_NAMESPACE.test(receipt.namespace)) errors.push("CONFORMANCE_RECEIPT_NAMESPACE_INVALID");
  if (![receipt.observed.serverName, receipt.observed.serverVersion, ...receipt.operations.flatMap((item) => [item.tool, item.code])].every((value) => SAFE.test(value))) errors.push("CONFORMANCE_RECEIPT_UNSAFE_VALUE");
  if (receipt.mutation.authorized || receipt.mutation.attempted || receipt.resources.toolCalls !== 0 || receipt.resources.networkAttempts !== 1) errors.push("CONFORMANCE_RECEIPT_MUTATION_INVALID");
  const supported = receipt.operations.length === 2 && receipt.operations.every((operation) => operation.compatible);
  if ((receipt.outcome === "supported") !== supported || (receipt.outcome === "pending") === supported) errors.push("CONFORMANCE_RECEIPT_OUTCOME_INVALID");
  if (!DIGEST.test(receipt.receiptDigest) || receipt.receiptDigest !== fortemiReceiptDigest(material(receipt))) errors.push("CONFORMANCE_RECEIPT_DIGEST_MISMATCH");
  return errors;
}

/** Atomically creates private evidence without replacing an existing receipt. */
export async function writeFortemiDatasetLiveReceipt(path: string, receipt: FortemiDatasetLiveReceipt): Promise<void> {
  const errors = verifyFortemiDatasetLiveReceipt(receipt);
  if (errors.length) throw new Error(errors.join(","));
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  await writeFile(temporary, `${JSON.stringify(receipt, null, 2)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
  try {
    await link(temporary, path);
  } finally {
    await unlink(temporary).catch(() => undefined);
  }
}
