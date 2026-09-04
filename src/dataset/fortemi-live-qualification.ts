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
  diagnostic:
    | "CONFORMANCE_FORTEMI_DATASET_CONTRACT_UNAVAILABLE"
    | "CONFORMANCE_FORTEMI_DATASET_PREFLIGHT_SUPPORTED";
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
  resources: {
    maxDurationMs: number;
    durationMs: number;
    maxToolCount: number;
    observedToolCount: number;
    maxSchemaBytes: number;
    observedSchemaBytes: number;
    networkAttempts: number;
    toolCalls: number;
  };
  startedAt: string;
  endedAt: string;
}

const UUID_NAMESPACE = /^aiwg-dataset-qualification-[0-9a-f-]{36}$/u;
const COMMIT = /^[0-9a-f]{40}$/u;
const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const SAFE = /^[A-Za-z0-9._:/-]+$/u;
const REQUIRED_TOOLS = [
  FORTEMI_DATASET_CAPABILITIES_TOOL,
  FORTEMI_DATASET_EXECUTE_TOOL,
] as const;
const MAX_TOOL_COUNT = 256;
const MAX_SCHEMA_BYTES = 1_048_576;

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function exactKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
): boolean {
  const keys = Object.keys(value);
  return (
    keys.length === allowed.length && keys.every((key) => allowed.includes(key))
  );
}

function material(
  receipt: FortemiDatasetLiveReceipt,
): Omit<FortemiDatasetLiveReceipt, "receiptDigest"> {
  const { receiptDigest: _digest, ...rest } = receipt;
  return rest;
}

function inputSchemaCompatible(
  schema: unknown,
  required: Readonly<Record<string, string>>,
): boolean {
  const candidate = record(schema);
  const properties = record(candidate?.properties);
  const declaredRequired = candidate?.required;
  if (
    candidate?.type !== "object" ||
    !properties ||
    !Array.isArray(declaredRequired)
  )
    return false;
  if (
    !declaredRequired.every((key) => typeof key === "string") ||
    new Set(declaredRequired).size !== declaredRequired.length
  )
    return false;
  return Object.entries(required).every(([key, type]) => {
    const property = record(properties[key]);
    return declaredRequired.includes(key) && property?.type === type;
  });
}

async function bounded<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(
        () =>
          reject(new Error("CONFORMANCE_FORTEMI_DATASET_PREFLIGHT_TIMEOUT")),
        timeoutMs,
      );
    }),
  ]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

/** Read-only discovery. It never invokes a Fortemi tool, even when the proposed contract is present. */
export async function qualifyFortemiDatasetLivePreflight(input: {
  client: McpClientLike;
  endpointUrl: string;
  aiwgCommit: string;
  maxDurationMs?: number;
  now?: () => Date;
}): Promise<FortemiDatasetLiveReceipt> {
  if (!COMMIT.test(input.aiwgCommit))
    throw new Error("CONFORMANCE_INVALID_AIWG_COMMIT");
  const requestedDuration = input.maxDurationMs ?? 5_000;
  if (!Number.isFinite(requestedDuration))
    throw new Error("CONFORMANCE_INVALID_RESOURCE_BOUND");
  const maxDurationMs = Math.max(
    250,
    Math.min(Math.trunc(requestedDuration), 30_000),
  );
  const now = input.now ?? (() => new Date());
  const startedAt = now().toISOString();
  const namespace = `aiwg-dataset-qualification-${randomUUID()}`;
  let schemas: unknown = [];
  try {
    if (!input.client.listTools)
      throw new Error("CONFORMANCE_FORTEMI_TOOL_DISCOVERY_UNAVAILABLE");
    const discovered = await bounded(input.client.listTools(), maxDurationMs);
    schemas = discovered.tools ?? [];
    if (!Array.isArray(schemas))
      throw new Error("CONFORMANCE_FORTEMI_TOOL_INVENTORY_INVALID");
    const inventory = schemas;
    const observedSchemaBytes = Buffer.byteLength(
      JSON.stringify(inventory),
      "utf8",
    );
    if (
      inventory.length > MAX_TOOL_COUNT ||
      observedSchemaBytes > MAX_SCHEMA_BYTES
    )
      throw new Error("CONFORMANCE_RESOURCE_ENVELOPE_EXCEEDED");
    const tools = new Map(inventory.map((tool) => [tool.name, tool]));
    const specifications: Array<{
      tool: string;
      required: Readonly<Record<string, string>>;
    }> = [
      {
        tool: FORTEMI_DATASET_CAPABILITIES_TOOL,
        required: { contract_version: "string" },
      },
      {
        tool: FORTEMI_DATASET_EXECUTE_TOOL,
        required: {
          contract_version: "string",
          namespace: "string",
          plan: "object",
          records: "array",
        },
      },
    ];
    const checks = specifications.map(({ tool, required }) => {
      const unique =
        inventory.filter((candidate) => candidate.name === tool).length === 1;
      const compatible =
        unique && inputSchemaCompatible(tools.get(tool)?.inputSchema, required);
      return {
        tool,
        compatible,
        code: compatible
          ? "FORTEMI_DATASET_TOOL_SCHEMA_COMPATIBLE"
          : tools.has(tool)
            ? "FORTEMI_DATASET_TOOL_SCHEMA_DRIFT"
            : "FORTEMI_DATASET_TOOL_MISSING",
      };
    });
    const supported = checks.every((check) => check.compatible);
    const endedAt = now().toISOString();
    const server = input.client.serverVersion?.() ?? {};
    const safeObserved = (value: string | undefined) =>
      value && SAFE.test(value) ? value : "unreported";
    const base: Omit<FortemiDatasetLiveReceipt, "receiptDigest"> = {
      contract: FORTEMI_DATASET_LIVE_CONTRACT,
      outcome: supported ? "supported" : "pending",
      diagnostic: supported
        ? "CONFORMANCE_FORTEMI_DATASET_PREFLIGHT_SUPPORTED"
        : "CONFORMANCE_FORTEMI_DATASET_CONTRACT_UNAVAILABLE",
      bindings: {
        aiwgCommit: input.aiwgCommit,
        endpointFingerprint: endpointFingerprint(input.endpointUrl),
        toolSchemaDigest: fortemiReceiptDigest(schemas),
      },
      observed: {
        serverName: safeObserved(server.name),
        serverVersion: safeObserved(server.version),
      },
      namespace,
      operations: checks,
      mutation: { authorized: false, attempted: false },
      resources: {
        maxDurationMs,
        durationMs: Date.parse(endedAt) - Date.parse(startedAt),
        maxToolCount: MAX_TOOL_COUNT,
        observedToolCount: inventory.length,
        maxSchemaBytes: MAX_SCHEMA_BYTES,
        observedSchemaBytes,
        networkAttempts: 1,
        toolCalls: 0,
      },
      startedAt,
      endedAt,
    };
    const receipt = { ...base, receiptDigest: fortemiReceiptDigest(base) };
    const errors = verifyFortemiDatasetLiveReceipt(receipt);
    if (errors.length) throw new Error(errors.join(","));
    return receipt;
  } finally {
    await input.client.close?.();
  }
}

export function verifyFortemiDatasetLiveReceipt(value: unknown): string[] {
  const errors: string[] = [];
  const top = record(value);
  if (!top) return ["CONFORMANCE_RECEIPT_SHAPE_INVALID"];
  const receipt = value as FortemiDatasetLiveReceipt;
  if (
    !record(receipt.bindings) ||
    !record(receipt.observed) ||
    !record(receipt.mutation) ||
    !record(receipt.resources) ||
    !Array.isArray(receipt.operations) ||
    !receipt.operations.every((item) => Boolean(record(item)))
  ) {
    return ["CONFORMANCE_RECEIPT_SHAPE_INVALID"];
  }
  if (
    !exactKeys(top, [
      "contract",
      "outcome",
      "diagnostic",
      "receiptDigest",
      "bindings",
      "observed",
      "namespace",
      "operations",
      "mutation",
      "resources",
      "startedAt",
      "endedAt",
    ]) ||
    !exactKeys(receipt.bindings as unknown as Record<string, unknown>, [
      "aiwgCommit",
      "endpointFingerprint",
      "toolSchemaDigest",
    ]) ||
    !exactKeys(receipt.observed as unknown as Record<string, unknown>, [
      "serverName",
      "serverVersion",
    ]) ||
    !exactKeys(receipt.mutation as unknown as Record<string, unknown>, [
      "authorized",
      "attempted",
    ]) ||
    !exactKeys(receipt.resources as unknown as Record<string, unknown>, [
      "maxDurationMs",
      "durationMs",
      "maxToolCount",
      "observedToolCount",
      "maxSchemaBytes",
      "observedSchemaBytes",
      "networkAttempts",
      "toolCalls",
    ]) ||
    !receipt.operations.every((item) =>
      exactKeys(item as unknown as Record<string, unknown>, [
        "tool",
        "compatible",
        "code",
      ]),
    )
  )
    errors.push("CONFORMANCE_RECEIPT_SHAPE_INVALID");
  if (receipt.contract !== FORTEMI_DATASET_LIVE_CONTRACT)
    errors.push("CONFORMANCE_RECEIPT_CONTRACT_MISMATCH");
  if (
    !COMMIT.test(receipt.bindings.aiwgCommit) ||
    !DIGEST.test(receipt.bindings.endpointFingerprint) ||
    !DIGEST.test(receipt.bindings.toolSchemaDigest)
  )
    errors.push("CONFORMANCE_RECEIPT_BINDING_INVALID");
  if (!UUID_NAMESPACE.test(receipt.namespace))
    errors.push("CONFORMANCE_RECEIPT_NAMESPACE_INVALID");
  if (
    ![
      receipt.observed.serverName,
      receipt.observed.serverVersion,
      ...receipt.operations.flatMap((item) => [item.tool, item.code]),
    ].every((value) => SAFE.test(value))
  )
    errors.push("CONFORMANCE_RECEIPT_UNSAFE_VALUE");
  if (
    receipt.mutation.authorized !== false ||
    receipt.mutation.attempted !== false ||
    receipt.resources.toolCalls !== 0 ||
    receipt.resources.networkAttempts !== 1
  )
    errors.push("CONFORMANCE_RECEIPT_MUTATION_INVALID");
  const operationNames = receipt.operations.map((operation) => operation.tool);
  const inventoryValid =
    receipt.operations.length === REQUIRED_TOOLS.length &&
    REQUIRED_TOOLS.every(
      (tool) => operationNames.filter((name) => name === tool).length === 1,
    );
  if (
    !inventoryValid ||
    receipt.operations.some(
      (operation) =>
        operation.code !==
        (operation.compatible
          ? "FORTEMI_DATASET_TOOL_SCHEMA_COMPATIBLE"
          : operation.code === "FORTEMI_DATASET_TOOL_MISSING"
            ? operation.code
            : "FORTEMI_DATASET_TOOL_SCHEMA_DRIFT"),
    )
  )
    errors.push("CONFORMANCE_RECEIPT_OPERATION_INVALID");
  const supported =
    inventoryValid &&
    receipt.operations.every((operation) => operation.compatible);
  const expectedDiagnostic = supported
    ? "CONFORMANCE_FORTEMI_DATASET_PREFLIGHT_SUPPORTED"
    : "CONFORMANCE_FORTEMI_DATASET_CONTRACT_UNAVAILABLE";
  if (
    receipt.outcome !== (supported ? "supported" : "pending") ||
    receipt.diagnostic !== expectedDiagnostic
  )
    errors.push("CONFORMANCE_RECEIPT_OUTCOME_INVALID");
  const start = Date.parse(receipt.startedAt);
  const end = Date.parse(receipt.endedAt);
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    end < start ||
    receipt.resources.durationMs !== end - start
  )
    errors.push("CONFORMANCE_RECEIPT_TIME_INVALID");
  if (
    !Number.isInteger(receipt.resources.maxDurationMs) ||
    receipt.resources.maxDurationMs < 250 ||
    receipt.resources.maxDurationMs > 30_000 ||
    !Number.isInteger(receipt.resources.durationMs) ||
    receipt.resources.durationMs < 0 ||
    receipt.resources.maxToolCount !== MAX_TOOL_COUNT ||
    !Number.isInteger(receipt.resources.observedToolCount) ||
    receipt.resources.observedToolCount < 0 ||
    receipt.resources.observedToolCount > MAX_TOOL_COUNT ||
    receipt.resources.maxSchemaBytes !== MAX_SCHEMA_BYTES ||
    !Number.isInteger(receipt.resources.observedSchemaBytes) ||
    receipt.resources.observedSchemaBytes < 0 ||
    receipt.resources.observedSchemaBytes > MAX_SCHEMA_BYTES
  )
    errors.push("CONFORMANCE_RECEIPT_RESOURCES_INVALID");
  if (
    !DIGEST.test(receipt.receiptDigest) ||
    receipt.receiptDigest !== fortemiReceiptDigest(material(receipt))
  )
    errors.push("CONFORMANCE_RECEIPT_DIGEST_MISMATCH");
  return errors;
}

/** Atomically creates private evidence without replacing an existing receipt. */
export async function writeFortemiDatasetLiveReceipt(
  path: string,
  receipt: FortemiDatasetLiveReceipt,
): Promise<void> {
  const errors = verifyFortemiDatasetLiveReceipt(receipt);
  if (errors.length) throw new Error(errors.join(","));
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  await writeFile(temporary, `${JSON.stringify(receipt, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
    flag: "wx",
  });
  try {
    await link(temporary, path);
  } finally {
    await unlink(temporary).catch(() => undefined);
  }
}
