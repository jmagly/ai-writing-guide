import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { ProcessingPlan } from "./types.js";
import type {
  DatasetRunState,
  RegisteredSource,
} from "./orchestration-types.js";
import type { DatasetOrchestrationRepository } from "./orchestration-repository.js";

interface State {
  sources: Record<string, RegisteredSource>;
  plans: Record<string, ProcessingPlan>;
  runs: Record<string, DatasetRunState>;
  artifacts: Record<string, readonly unknown[]>;
}
const empty = (): State => ({
  sources: {},
  plans: {},
  runs: {},
  artifacts: {},
});
export class FileDatasetOrchestrationRepository implements DatasetOrchestrationRepository {
  readonly path: string;
  constructor(root: string) {
    this.path = join(resolve(root), ".aiwg", "dataset", "state.v1.json");
  }
  private async read(): Promise<State> {
    try {
      return JSON.parse(await readFile(this.path, "utf8")) as State;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return empty();
      throw e;
    }
  }
  private async update(fn: (s: State) => void) {
    const s = await this.read();
    fn(s);
    await mkdir(dirname(this.path), { recursive: true });
    const tmp = `${this.path}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(s, null, 2) + "\n", { mode: 0o600 });
    await rename(tmp, this.path);
  }
  async getSource(id: string) {
    return (await this.read()).sources[id];
  }
  async putSource(v: RegisteredSource) {
    await this.update((s) => {
      s.sources[v.id] = v;
    });
  }
  async getPlan(id: string) {
    return (await this.read()).plans[id];
  }
  async putPlan(v: ProcessingPlan) {
    await this.update((s) => {
      s.plans[v.id] = v;
    });
  }
  async getRun(id: string) {
    return (await this.read()).runs[id];
  }
  async getRunByIdempotency(k: string) {
    return Object.values((await this.read()).runs).find(
      (v) => v.idempotencyKey === k,
    );
  }
  async putRun(v: DatasetRunState) {
    await this.update((s) => {
      s.runs[v.runId] = v;
    });
  }
  async listArtifactRecords(id: string) {
    return (await this.read()).artifacts[id] ?? [];
  }
  async putArtifactRecords(id: string, v: readonly unknown[]) {
    await this.update((s) => {
      s.artifacts[id] = v;
    });
  }
}
