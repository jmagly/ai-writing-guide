import {
  computeRunReceiptDigest,
  verifyRunReceiptDigest,
} from "./contracts.js";
import type {
  DatasetExecutionBackend,
  ExecutionRequest,
  ExecutionResult,
} from "./orchestration-types.js";
import type { RunReceipt } from "./types.js";
export interface FortemiTransport {
  capabilities(): Promise<readonly { name: string; version: string }[]>;
  execute(request: {
    plan: unknown;
    records: readonly unknown[];
    signal?: AbortSignal;
  }): Promise<{ result: ExecutionResult; receipt: RunReceipt }>;
}
export class FortemiExecutionBridge implements DatasetExecutionBackend {
  readonly id = "fortemi-core";
  private offered: readonly { name: string; version: string }[] = [];
  constructor(private readonly transport?: FortemiTransport) {}
  capabilities() {
    return this.offered;
  }
  async negotiate() {
    if (!this.transport)
      throw new Error(
        "DATASET_FORTEMI_UNAVAILABLE: injected Fortemi transport required",
      );
    this.offered = await this.transport.capabilities();
    return this.offered;
  }
  async execute(r: ExecutionRequest) {
    if (!this.transport)
      throw new Error(
        "DATASET_FORTEMI_UNAVAILABLE: injected Fortemi transport required",
      );
    const response = await this.transport.execute({
      plan: r.plan,
      records: r.records,
      signal: r.signal,
    });
    if (
      response.receipt.planDigest.value !== r.plan.planDigest.value ||
      !verifyRunReceiptDigest(response.receipt)
    )
      throw new Error("DATASET_FORTEMI_RECEIPT_INVALID");
    return response.result;
  }
}
export function sealFortemiFixtureReceipt(receipt: RunReceipt): RunReceipt {
  return { ...receipt, receiptDigest: computeRunReceiptDigest(receipt) };
}
