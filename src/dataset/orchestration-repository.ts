import type { ProcessingPlan } from "./types.js";
import type {
  DatasetRunState,
  RegisteredSource,
} from "./orchestration-types.js";

export interface DatasetOrchestrationRepository {
  getSource(id: string): Promise<RegisteredSource | undefined>;
  putSource(source: RegisteredSource): Promise<void>;
  getPlan(id: string): Promise<ProcessingPlan | undefined>;
  putPlan(plan: ProcessingPlan): Promise<void>;
  getRun(id: string): Promise<DatasetRunState | undefined>;
  getRunByIdempotency(key: string): Promise<DatasetRunState | undefined>;
  putRun(run: DatasetRunState): Promise<void>;
  listArtifactRecords(id: string): Promise<readonly unknown[]>;
  putArtifactRecords(id: string, records: readonly unknown[]): Promise<void>;
}

export class MemoryDatasetOrchestrationRepository implements DatasetOrchestrationRepository {
  sources = new Map<string, RegisteredSource>();
  plans = new Map<string, ProcessingPlan>();
  runs = new Map<string, DatasetRunState>();
  artifacts = new Map<string, readonly unknown[]>();
  async getSource(id: string) {
    return this.sources.get(id);
  }
  async putSource(v: RegisteredSource) {
    this.sources.set(v.id, structuredClone(v));
  }
  async getPlan(id: string) {
    return this.plans.get(id);
  }
  async putPlan(v: ProcessingPlan) {
    this.plans.set(v.id, structuredClone(v));
  }
  async getRun(id: string) {
    return this.runs.get(id);
  }
  async getRunByIdempotency(key: string) {
    return [...this.runs.values()].find((v) => v.idempotencyKey === key);
  }
  async putRun(v: DatasetRunState) {
    this.runs.set(v.runId, structuredClone(v));
  }
  async listArtifactRecords(id: string) {
    return this.artifacts.get(id) ?? [];
  }
  async putArtifactRecords(id: string, v: readonly unknown[]) {
    this.artifacts.set(id, structuredClone(v));
  }
}
