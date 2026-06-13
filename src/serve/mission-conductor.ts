/**
 * Mission Conductor (#1546).
 *
 * A Mission is the cross-stack dynamic-orchestration primitive (naming per
 * #1536): one durable, audited conductor fans worker cycles out across
 * *heterogeneous* agentic stacks (Claude ↔ Codex ↔ …) and aggregates results.
 * In-stack primitives (Claude's Workflow tool, Codex `/goal`) are the in-stack
 * WORKERS a Mission dispatches to — not substitutes for the conductor.
 *
 * This builds on the proven substrate (no new transport):
 *   - `routeMission()` (agent-router.ts) selects an executor by `ExecutorFilter`.
 *   - executors advertise their stack via the `runtime:<name>` capability
 *     (slice-1 convention; see agent-router cross-stack test).
 *   - StackAdapter (stack-adapters.ts) maps a worker cycle onto a stack's
 *     native primitive and supplies the `runtime:<name>` token to filter on.
 *
 * RETAINED-OWNERSHIP INVARIANT (non-negotiable, #1537 ADR, cross-stack):
 * the conductor owns the bookkeeping — activity log, best-output selection,
 * cost tracking, crash-resilient checkpoint/resume — IDENTICALLY regardless of
 * which stack each worker ran on. The native primitive drives worker mechanism
 * only; it never owns gates, durability, or provenance.
 *
 * @implements #1546
 */

import { routeMission } from './agent-router.js';
import type { ExecutorRegistration } from './executor-registry.js';
import { StackAdapterRegistry } from './stack-adapters.js';

/** A single worker cycle within a Mission — runs on exactly one stack. */
export interface WorkerCycle {
  id: string;
  /** Which stack runs this worker (resolved to a `runtime:<name>` filter). */
  runtime: string;
  /** The worker task the dispatched executor drives via its native primitive. */
  prompt: string;
  /** Additional capabilities the executor must advertise (beyond the runtime). */
  requiredCapabilities?: string[];
  /** Long-running workers require the `resumable` capability (per ADR §3). */
  longRunning?: boolean;
}

/** A Mission: a goal + measurable completion criterion + worker cycles. */
export interface MissionPlan {
  missionId: string;
  goal: string;
  /** Measurable completion criterion (per the vague-discretion rule). */
  completionCriterion: string;
  cycles: WorkerCycle[];
}

/** Outcome of dispatching one worker cycle. */
export interface CycleResult {
  cycleId: string;
  runtime: string;
  primitive: string;
  executorId?: string;
  /** True when an executor advertising the cycle's runtime was selected. */
  routed: boolean;
  reason: string;
  output?: string;
  /** Runtime-agnostic cost units (e.g. output tokens) for cross-stack aggregation. */
  cost: number;
}

/**
 * Conductor-side ledger. The retained-ownership invariant means every field
 * here is populated the same way regardless of which stack ran each worker.
 */
export interface MissionLedger {
  missionId: string;
  goal: string;
  completionCriterion: string;
  /** Append-only audit trail (one line per conductor decision/observation). */
  activityLog: string[];
  cycles: CycleResult[];
  /** Cross-stack cost aggregation. */
  totalCost: number;
  /** Best-output selection (REF-015) across the cycles that produced output. */
  bestOutput?: { cycleId: string; runtime: string; output: string; score: number };
  /** Crash-resilient checkpoint: which cycles completed vs. remain. */
  checkpoint: { completed: string[]; pending: string[]; failed: string[] };
  /** Distinct stacks a worker actually ran on. */
  runtimesUsed: string[];
}

/**
 * Runs a single dispatched worker on its selected executor. The real seam to
 * `aiwg serve`'s dispatch-router + WS event stream plugs in here; tests inject
 * a fake. The default planner marks the cycle as routed-but-not-executed so the
 * conductor is honest about what is wired vs. pending the live transport.
 */
export type RunWorker = (
  cycle: WorkerCycle,
  executor: ExecutorRegistration,
  invocation: { runtimeCapability: string; primitive: string; describe: string },
) => { output?: string; cost?: number } | Promise<{ output?: string; cost?: number }>;

/** Scores a worker output for best-output selection. Default: output length. */
export type ScoreOutput = (result: CycleResult) => number;

export interface ConductorOptions {
  adapters?: StackAdapterRegistry;
  /** Worker execution seam (default: plan-only, no execution). */
  runWorker?: RunWorker;
  /** Best-output scorer (default: output length). */
  scoreOutput?: ScoreOutput;
  /** Resume from a prior ledger's checkpoint (skip already-completed cycles). */
  resumeFrom?: MissionLedger;
}

const defaultRunWorker: RunWorker = () => ({ output: undefined, cost: 0 });
const defaultScore: ScoreOutput = (r) => (r.output ? r.output.length : 0);

/**
 * The cross-stack Mission conductor. Decomposes a Mission into worker cycles,
 * dispatches each to an executor of the chosen runtime via `routeMission`, and
 * retains all bookkeeping conductor-side regardless of stack.
 */
export class MissionConductor {
  private adapters: StackAdapterRegistry;
  private runWorker: RunWorker;
  private scoreOutput: ScoreOutput;

  constructor(opts: ConductorOptions = {}) {
    this.adapters = opts.adapters ?? new StackAdapterRegistry();
    this.runWorker = opts.runWorker ?? defaultRunWorker;
    this.scoreOutput = opts.scoreOutput ?? defaultScore;
  }

  /**
   * Conduct a Mission across the given executor pool. Returns the ledger.
   * `resumeFrom` (if given) skips cycles already marked completed — the
   * crash-resilient resume path; their prior results are carried forward.
   */
  async conduct(plan: MissionPlan, pool: ExecutorRegistration[], resumeFrom?: MissionLedger): Promise<MissionLedger> {
    const carried = new Map<string, CycleResult>();
    if (resumeFrom) {
      for (const c of resumeFrom.cycles) {
        if (resumeFrom.checkpoint.completed.includes(c.cycleId)) carried.set(c.cycleId, c);
      }
    }

    const ledger: MissionLedger = {
      missionId: plan.missionId,
      goal: plan.goal,
      completionCriterion: plan.completionCriterion,
      activityLog: [],
      cycles: [],
      totalCost: 0,
      checkpoint: { completed: [], pending: [], failed: [] },
      runtimesUsed: [],
    };

    ledger.activityLog.push(
      `mission ${plan.missionId} start — goal: ${plan.goal} — ${plan.cycles.length} cycle(s)` +
        (resumeFrom ? ` (resume: ${carried.size} carried)` : ''),
    );

    for (const cycle of plan.cycles) {
      // Resume: carry a previously-completed cycle forward, identical bookkeeping.
      const prior = carried.get(cycle.id);
      if (prior) {
        ledger.cycles.push(prior);
        ledger.checkpoint.completed.push(cycle.id);
        ledger.totalCost += prior.cost;
        if (prior.executorId) ledger.activityLog.push(`cycle ${cycle.id} resumed (was complete on ${prior.runtime})`);
        continue;
      }

      const adapter = this.adapters.get(cycle.runtime);
      if (!adapter) {
        // No silent drop — record the unroutable cycle (vague-discretion / anti-laziness).
        const result: CycleResult = {
          cycleId: cycle.id,
          runtime: cycle.runtime,
          primitive: '(none)',
          routed: false,
          reason: `no stack adapter registered for runtime '${cycle.runtime}'`,
          cost: 0,
        };
        ledger.cycles.push(result);
        ledger.checkpoint.failed.push(cycle.id);
        ledger.activityLog.push(`cycle ${cycle.id} UNROUTABLE — ${result.reason}`);
        continue;
      }

      const filter = {
        capabilities: [adapter.runtimeCapability, ...(cycle.requiredCapabilities ?? [])],
      };
      const routing = routeMission(pool, filter, cycle.longRunning ?? false);

      if (!routing.selected) {
        const result: CycleResult = {
          cycleId: cycle.id,
          runtime: cycle.runtime,
          primitive: adapter.primitive,
          routed: false,
          reason: `no connected executor advertises ${filter.capabilities.join(', ')}`,
          cost: 0,
        };
        ledger.cycles.push(result);
        ledger.checkpoint.failed.push(cycle.id);
        ledger.activityLog.push(`cycle ${cycle.id} UNASSIGNED — ${result.reason}`);
        continue;
      }

      const executor = routing.selected.executor;
      const invocation = adapter.invoke(cycle.prompt);
      ledger.activityLog.push(
        `cycle ${cycle.id} → executor ${executor.name} (${executor.executorId}) on ${cycle.runtime}: ${invocation.describe}`,
      );

      let output: string | undefined;
      let cost = 0;
      try {
        const ran = await this.runWorker(cycle, executor, invocation);
        output = ran.output;
        cost = ran.cost ?? 0;
      } catch (err) {
        const result: CycleResult = {
          cycleId: cycle.id,
          runtime: cycle.runtime,
          primitive: adapter.primitive,
          executorId: executor.executorId,
          routed: true,
          reason: `worker error: ${err instanceof Error ? err.message : String(err)}`,
          cost: 0,
        };
        ledger.cycles.push(result);
        ledger.checkpoint.failed.push(cycle.id);
        ledger.activityLog.push(`cycle ${cycle.id} FAILED on ${cycle.runtime} — ${result.reason}`);
        continue;
      }

      const result: CycleResult = {
        cycleId: cycle.id,
        runtime: cycle.runtime,
        primitive: adapter.primitive,
        executorId: executor.executorId,
        routed: true,
        reason: routing.selected.matchReason,
        output,
        cost,
      };
      ledger.cycles.push(result);
      ledger.checkpoint.completed.push(cycle.id);
      ledger.totalCost += cost;
      ledger.activityLog.push(`cycle ${cycle.id} done on ${cycle.runtime} (cost ${cost})`);
    }

    // Pending = cycles neither completed nor failed (none, here — full pass).
    const accounted = new Set([...ledger.checkpoint.completed, ...ledger.checkpoint.failed]);
    ledger.checkpoint.pending = plan.cycles.map((c) => c.id).filter((id) => !accounted.has(id));

    // Cross-stack aggregation: distinct runtimes that actually ran a worker.
    ledger.runtimesUsed = [
      ...new Set(ledger.cycles.filter((c) => c.routed).map((c) => c.runtime)),
    ];

    // Best-output selection (REF-015) — conductor-side, across stacks.
    let best: MissionLedger['bestOutput'] | undefined;
    for (const c of ledger.cycles) {
      if (!c.output) continue;
      const score = this.scoreOutput(c);
      if (!best || score > best.score) {
        best = { cycleId: c.cycleId, runtime: c.runtime, output: c.output, score };
      }
    }
    ledger.bestOutput = best;

    ledger.activityLog.push(
      `mission ${plan.missionId} end — completed ${ledger.checkpoint.completed.length}, ` +
        `failed ${ledger.checkpoint.failed.length}, runtimes [${ledger.runtimesUsed.join(', ')}], ` +
        `total cost ${ledger.totalCost}`,
    );

    return ledger;
  }
}
