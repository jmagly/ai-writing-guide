import type { McpClientLike } from "../storage/backends/fortemi.js";
import { canonicalFortemiDatasetJson, fortemiDatasetDigest, verifyFortemiDatasetRunReceipt, type FortemiDatasetRunReceipt } from "./fortemi-run-receipt.js";

export const FORTEMI_DATASET_EXECUTION_TOOL = "manage_dataset_execution";

export function fortemiDatasetRequestDigest(request: Record<string, unknown>): string {
  return fortemiDatasetDigest({
    contractVersions: request.contractVersions || {},
    schemaVersions: request.schemaVersions || {},
    negotiation: request.negotiation || {},
    plan: request.plan,
    batch: request.batch,
    resourceEnvelope: request.resourceEnvelope,
    profiles: request.profiles || {},
    inputSchemaDigest: request.inputSchemaDigest,
    outputSchemaDigest: request.outputSchemaDigest,
  });
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("CONFORMANCE_FORTEMI_RESPONSE_INVALID");
  return value as Record<string, unknown>;
}

/** MCP transport binding; receipt verification is implemented independently in AIWG. */
export class FortemiDatasetExecutionClient {
  private readonly runs = new Map<string, { request: Record<string, unknown>; digest: string }>();
  constructor(private readonly client: McpClientLike) {}

  private async call(action: string, parameters: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    const response = object(await this.client.callTool(FORTEMI_DATASET_EXECUTION_TOOL, { ...parameters, action }));
    if (response.isError === true) throw new Error("CONFORMANCE_FORTEMI_TOOL_FAILED");
    if (Array.isArray(response.content)) {
      const blocks = response.content.map(object);
      if (blocks.length !== 1 || blocks[0].type !== "text" || typeof blocks[0].text !== "string") throw new Error("CONFORMANCE_FORTEMI_RESPONSE_INVALID");
      return object(JSON.parse(blocks[0].text));
    }
    return response;
  }

  async capabilities(): Promise<Record<string, unknown>> {
    const result = await this.call("capabilities");
    if (object(result.contracts).receipt !== "fortemi.dataset-run-receipt/v1"
      || object(result.schemaVersions).receipt !== "1.0.0"
      || object(result.receiptValidation).revision !== "1.0.1"
      || object(result.receiptValidation).requestBindingRevision !== "1.0.1") throw new Error("CONFORMANCE_FORTEMI_RECEIPT_REVISION_UNSUPPORTED");
    return result;
  }

  async preview(request: Record<string, unknown>): Promise<Record<string, unknown>> {
    await this.capabilities();
    const result = await this.call("preview", { request });
    if (result.noSideEffects !== true) throw new Error("CONFORMANCE_FORTEMI_PREVIEW_INVALID");
    if (result.accepted === true && result.requestDigest !== fortemiDatasetRequestDigest(request)) throw new Error("CONFORMANCE_FORTEMI_PREVIEW_BINDING_MISMATCH");
    return result;
  }

  /** The caller must approve the exact digest returned by read-only preview. */
  async execute(request: Record<string, unknown>, approvedRequestDigest: string): Promise<FortemiDatasetRunReceipt> {
    request = structuredClone(request);
    if (!/^sha256:[a-f0-9]{64}$/.test(approvedRequestDigest)) throw new Error("CONFORMANCE_LIVE_AUTHORIZATION_REQUIRED");
    if (fortemiDatasetRequestDigest(request) !== approvedRequestDigest) throw new Error("CONFORMANCE_FORTEMI_PLAN_NOT_APPROVED");
    const preview = await this.preview(request);
    if (preview.accepted !== true || preview.requestDigest !== approvedRequestDigest) throw new Error("CONFORMANCE_FORTEMI_PLAN_NOT_APPROVED");
    if (typeof request.runId !== "string") throw new Error("CONFORMANCE_FORTEMI_RUN_INVALID");
    const previous = this.runs.get(request.runId);
    if (previous && previous.digest !== approvedRequestDigest) throw new Error("CONFORMANCE_FORTEMI_PLAN_NOT_APPROVED");
    this.runs.set(request.runId, { request: structuredClone(request), digest: approvedRequestDigest });
    const result = await this.call("execute", { request });
    return this.verifyResult(result, request, approvedRequestDigest);
  }

  private verifyResult(result: Record<string, unknown>, request: Record<string, unknown>, approvedRequestDigest: string): FortemiDatasetRunReceipt {
    const errors = verifyFortemiDatasetRunReceipt(result.receipt);
    if (errors.length) throw new Error(`CONFORMANCE_FORTEMI_RECEIPT_INVALID:${errors.join(",")}`);
    const receipt = result.receipt as FortemiDatasetRunReceipt;
    if (receipt.requestDigest !== approvedRequestDigest || receipt.runId !== request.runId
      || receipt.namespaceId !== object(object(request.plan).destination).dataset
      || receipt.state !== result.state || receipt.verification !== result.verification) throw new Error("CONFORMANCE_FORTEMI_RECEIPT_BINDING_MISMATCH");
    const plan = object(request.plan);
    const batch = object(request.batch);
    if (["planId", "sourceRevision", "mode", "planDigest", "configurationDigest", "transformationDigest"].some(key => receipt.bindings[key] !== plan[key])
      || receipt.bindings.inputSchemaDigest !== request.inputSchemaDigest || receipt.bindings.outputSchemaDigest !== request.outputSchemaDigest
      || receipt.bindings.inputDigest !== fortemiDatasetDigest(batch.mutations)
      || receipt.idempotencyKey !== (batch.idempotencyKey || approvedRequestDigest)
      || canonicalFortemiDatasetJson(receipt.resourceEnvelope) !== canonicalFortemiDatasetJson(request.resourceEnvelope)
      || canonicalFortemiDatasetJson(receipt.profiles) !== canonicalFortemiDatasetJson(request.profiles || {})
      || canonicalFortemiDatasetJson(receipt.checkpoint.after) !== canonicalFortemiDatasetJson(batch.checkpointAfter)
      || canonicalFortemiDatasetJson(receipt.checkpoint.before || null) !== canonicalFortemiDatasetJson(batch.checkpointBefore || null)) throw new Error("CONFORMANCE_FORTEMI_RECEIPT_BINDING_MISMATCH");
    return receipt;
  }

  private knownRun(runId: string): { request: Record<string, unknown>; digest: string } {
    const run = this.runs.get(runId);
    if (!run) throw new Error("CONFORMANCE_FORTEMI_RUN_UNKNOWN");
    return run;
  }

  async retry(runId: string, action: "retry" | "resume" = "retry"): Promise<FortemiDatasetRunReceipt> {
    const run = this.knownRun(runId);
    return this.verifyResult(await this.call(action, { runId }), run.request, run.digest);
  }

  async status(runId: string): Promise<Record<string, unknown>> {
    const run = this.knownRun(runId);
    const result = await this.call("status", { runId });
    if (result.runId !== runId) throw new Error("CONFORMANCE_FORTEMI_RECEIPT_BINDING_MISMATCH");
    if (result.receipt) this.verifyResult(result, run.request, run.digest);
    else if (result.state !== "running" || result.verification !== "pending") throw new Error("CONFORMANCE_FORTEMI_RESPONSE_INVALID");
    return result;
  }

  async checkpoint(runId: string): Promise<Record<string, unknown>> {
    this.knownRun(runId);
    const result = await this.call("checkpoint", { runId });
    if (result.runId !== runId || (result.checkpoint !== undefined && !["committed", "degraded"].includes(String(result.state)))) throw new Error("CONFORMANCE_FORTEMI_CHECKPOINT_UNVERIFIED");
    if (result.checkpoint !== undefined) {
      const status = await this.status(runId);
      const receipt = status.receipt as FortemiDatasetRunReceipt;
      if (result.receiptDigest !== receipt.receiptDigest || canonicalFortemiDatasetJson(result.checkpoint) !== canonicalFortemiDatasetJson(receipt.checkpoint.after)) throw new Error("CONFORMANCE_FORTEMI_CHECKPOINT_UNVERIFIED");
    }
    return result;
  }

  async cancel(runId: string): Promise<Record<string, unknown>> {
    this.knownRun(runId);
    const result = await this.call("cancel", { runId });
    if (result.runId !== runId) throw new Error("CONFORMANCE_FORTEMI_RECEIPT_BINDING_MISMATCH");
    return result;
  }

  async archive(runId: string): Promise<Record<string, unknown>> {
    const run = this.knownRun(runId);
    const status = await this.status(runId);
    const receipt = status.receipt as FortemiDatasetRunReceipt | undefined;
    if (!receipt || !["committed", "degraded", "failed"].includes(receipt.state)) throw new Error("CONFORMANCE_FORTEMI_ARCHIVE_UNRESOLVED");
    const result = await this.call("archive", { runId });
    if (result.namespaceId !== object(object(run.request.plan).destination).dataset
      || typeof result.complete !== "boolean" || !Array.isArray(result.unresolved)
      || result.unresolved.some(value => typeof value !== "string" || !/^sha256:[a-f0-9]{64}$/.test(value))
      || (result.complete && result.unresolved.length !== 0)
      || !Number.isSafeInteger(result.archived) || Number(result.archived) < 0
      || !Number.isSafeInteger(result.alreadyArchived) || Number(result.alreadyArchived) < 0
      || Number(result.archived) + Number(result.alreadyArchived) + result.unresolved.length !== receipt.counts.committed) throw new Error("CONFORMANCE_FORTEMI_ARCHIVE_INVALID");
    return result;
  }
}
