import type {
  DatasetExecutionBackend,
  ExecutionRequest,
  ExecutionResult,
} from "./orchestration-types.js";
export class LocalDatasetExecutionBackend implements DatasetExecutionBackend {
  readonly id = "local";
  capabilities() {
    return [
      { name: "incremental-read", version: "1" },
      { name: "materialize-records", version: "1" },
    ];
  }
  async execute(r: ExecutionRequest): Promise<ExecutionResult> {
    if (r.signal?.aborted)
      return {
        outcome: "cancelled",
        attemptedRecords: 0,
        committedRecords: 0,
        rejectedRecords: 0,
        diagnostics: [],
      };
    return {
      outcome: "committed",
      attemptedRecords: r.records.length,
      committedRecords: r.records.length,
      rejectedRecords: 0,
      diagnostics: [],
      artifact: {
        id: `artifact:${r.plan.id}`,
        revisionId: r.plan.planDigest.value,
        records: r.records,
      },
    };
  }
}
