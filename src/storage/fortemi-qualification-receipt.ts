import { createHash } from "node:crypto";
import { link, mkdir, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { FortemiQualificationReport } from "./fortemi-qualification.js";

export const FORTEMI_QUALIFICATION_RECEIPT =
  "aiwg.fortemi-live-qualification-receipt/v1" as const;
const DIGEST = /^sha256:[0-9a-f]{64}$/;
const COMMIT = /^[0-9a-f]{40}$/;
const REF = /^(?:refs\/(?:heads|tags)\/[A-Za-z0-9._/-]+|[0-9a-f]{40})$/;
const SAFE = /^[A-Za-z0-9._:/-]+$/;
const NAMESPACE = /^aiwg-qualification-[0-9a-f-]{36}$/;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface FortemiQualificationReceipt {
  contract: typeof FORTEMI_QUALIFICATION_RECEIPT;
  receiptDigest: string;
  bindings: {
    aiwgCommit: string;
    aiwgRef: string;
    endpointFingerprint: string;
    toolSchemaDigest: string;
  };
  observed: {
    serverName: string;
    serverVersion: string;
    contractRevision: string;
  };
  namespace: string;
  operations: Array<{
    operation: string;
    tool: string;
    compatible: boolean;
    code: string;
  }>;
  mutation: { attempted: boolean; objectId?: string };
  startedAt: string;
  endedAt: string;
  resources: {
    timeoutMs: number;
    durationMs: number;
    networkAttempts: number;
    toolCount: number;
  };
}

export interface CreateFortemiQualificationReceiptInput {
  report: FortemiQualificationReport;
  endpointUrl: string;
  toolSchemas: unknown;
  aiwgCommit: string;
  aiwgRef: string;
  contractRevision: string;
  startedAt: string;
  endedAt: string;
  timeoutMs: number;
  networkAttempts: number;
  mutationObjectId?: string;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}

export function fortemiReceiptDigest(value: unknown): string {
  return `sha256:${createHash("sha256").update(canonical(value)).digest("hex")}`;
}

export function endpointFingerprint(rawUrl: string): string {
  const url = new URL(rawUrl);
  url.username = "";
  url.password = "";
  url.hash = "";
  return fortemiReceiptDigest(url.toString());
}

function receiptMaterial(
  receipt: FortemiQualificationReceipt,
): Omit<FortemiQualificationReceipt, "receiptDigest"> {
  const { receiptDigest: _digest, ...material } = receipt;
  return material;
}

export function createFortemiQualificationReceipt(
  input: CreateFortemiQualificationReceiptInput,
): FortemiQualificationReceipt {
  if (!COMMIT.test(input.aiwgCommit))
    throw new Error("FORTEMI_RECEIPT_INVALID_COMMIT");
  if (!REF.test(input.aiwgRef) || input.aiwgRef.includes(".."))
    throw new Error("FORTEMI_RECEIPT_INVALID_REF");
  if (!input.report.server.name || !SAFE.test(input.report.server.name))
    throw new Error("FORTEMI_RECEIPT_INVALID_SERVER_NAME");
  if (!input.report.server.version || !SAFE.test(input.report.server.version))
    throw new Error("FORTEMI_RECEIPT_INVALID_SERVER_VERSION");
  if (!SAFE.test(input.contractRevision))
    throw new Error("FORTEMI_RECEIPT_INVALID_CONTRACT_REVISION");
  if (!NAMESPACE.test(input.report.namespace))
    throw new Error("FORTEMI_RECEIPT_INVALID_NAMESPACE");
  if (input.report.mutationAttempted !== Boolean(input.mutationObjectId))
    throw new Error("FORTEMI_RECEIPT_MUTATION_BINDING_MISMATCH");
  if (input.mutationObjectId && !UUID.test(input.mutationObjectId))
    throw new Error("FORTEMI_RECEIPT_INVALID_OBJECT_ID");
  const start = Date.parse(input.startedAt);
  const end = Date.parse(input.endedAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start)
    throw new Error("FORTEMI_RECEIPT_INVALID_TIMESTAMPS");
  if (
    !Number.isInteger(input.timeoutMs) ||
    input.timeoutMs < 250 ||
    input.timeoutMs > 30_000 ||
    !Number.isInteger(input.networkAttempts) ||
    input.networkAttempts < 0
  )
    throw new Error("FORTEMI_RECEIPT_INVALID_RESOURCES");
  const operations = input.report.operations.map(
    ({ operation, tool, compatible, code }) => {
      if (![operation, tool, code].every((value) => SAFE.test(value)))
        throw new Error("FORTEMI_RECEIPT_UNSAFE_OPERATION");
      return { operation, tool, compatible, code };
    },
  );
  const material: Omit<FortemiQualificationReceipt, "receiptDigest"> = {
    contract: FORTEMI_QUALIFICATION_RECEIPT,
    bindings: {
      aiwgCommit: input.aiwgCommit,
      aiwgRef: input.aiwgRef,
      endpointFingerprint: endpointFingerprint(input.endpointUrl),
      toolSchemaDigest: fortemiReceiptDigest(input.toolSchemas),
    },
    observed: {
      serverName: input.report.server.name,
      serverVersion: input.report.server.version,
      contractRevision: input.contractRevision,
    },
    namespace: input.report.namespace,
    operations,
    mutation: {
      attempted: input.report.mutationAttempted,
      ...(input.mutationObjectId ? { objectId: input.mutationObjectId } : {}),
    },
    startedAt: new Date(start).toISOString(),
    endedAt: new Date(end).toISOString(),
    resources: {
      timeoutMs: input.timeoutMs,
      durationMs: end - start,
      networkAttempts: input.networkAttempts,
      toolCount: operations.length,
    },
  };
  return { ...material, receiptDigest: fortemiReceiptDigest(material) };
}

export function verifyFortemiQualificationReceipt(
  receipt: FortemiQualificationReceipt,
): string[] {
  const errors: string[] = [];
  if (receipt.contract !== FORTEMI_QUALIFICATION_RECEIPT)
    errors.push("FORTEMI_RECEIPT_CONTRACT_MISMATCH");
  if (
    !DIGEST.test(receipt.receiptDigest) ||
    receipt.receiptDigest !== fortemiReceiptDigest(receiptMaterial(receipt))
  )
    errors.push("FORTEMI_RECEIPT_DIGEST_MISMATCH");
  if (
    !DIGEST.test(receipt.bindings.endpointFingerprint) ||
    !DIGEST.test(receipt.bindings.toolSchemaDigest)
  )
    errors.push("FORTEMI_RECEIPT_BINDING_INVALID");
  if (
    !COMMIT.test(receipt.bindings.aiwgCommit) ||
    !REF.test(receipt.bindings.aiwgRef)
  )
    errors.push("FORTEMI_RECEIPT_SOURCE_INVALID");
  if (
    !SAFE.test(receipt.observed.serverName) ||
    !SAFE.test(receipt.observed.serverVersion) ||
    !SAFE.test(receipt.observed.contractRevision) ||
    !NAMESPACE.test(receipt.namespace)
  )
    errors.push("FORTEMI_RECEIPT_OBSERVATION_INVALID");
  if (
    receipt.operations.some(
      (item) =>
        !SAFE.test(item.operation) ||
        !SAFE.test(item.tool) ||
        !SAFE.test(item.code),
    )
  )
    errors.push("FORTEMI_RECEIPT_OPERATION_INVALID");
  if (
    receipt.mutation.attempted !== Boolean(receipt.mutation.objectId) ||
    (receipt.mutation.objectId && !UUID.test(receipt.mutation.objectId))
  )
    errors.push("FORTEMI_RECEIPT_MUTATION_INVALID");
  if (
    Date.parse(receipt.endedAt) < Date.parse(receipt.startedAt) ||
    receipt.resources.durationMs !==
      Date.parse(receipt.endedAt) - Date.parse(receipt.startedAt)
  )
    errors.push("FORTEMI_RECEIPT_TIME_INVALID");
  if (
    !Number.isInteger(receipt.resources.timeoutMs) ||
    receipt.resources.timeoutMs < 250 ||
    receipt.resources.timeoutMs > 30_000 ||
    !Number.isInteger(receipt.resources.networkAttempts) ||
    receipt.resources.networkAttempts < 0 ||
    receipt.resources.toolCount !== receipt.operations.length
  )
    errors.push("FORTEMI_RECEIPT_RESOURCES_INVALID");
  return errors;
}

export async function writeFortemiQualificationReceipt(
  path: string,
  receipt: FortemiQualificationReceipt,
): Promise<void> {
  const errors = verifyFortemiQualificationReceipt(receipt);
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
