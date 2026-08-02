/**
 * AIWG management-plane adapter for Agentic Sandbox's neutral fleet API.
 * The adapter owns no runtime state: it dispatches contract records and
 * converts durable Sandbox observations into FleetMissionConductor events.
 *
 * @implements #1991
 */

import type {
  FleetArtifact,
  FleetBackpressure,
  FleetEvent,
  FleetLineage,
  FleetRunResult,
  FleetWorkerCycle,
  RunFleetWorker,
} from './fleet-mission-conductor.js';
import type { ExecutorRegistration } from './executor-registry.js';
import { routeDispatch } from './dispatch-router.js';

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export interface AgenticSandboxFleetClientOptions {
  baseUrl: string;
  token: string;
  fetch?: FetchLike;
  /** Executor data-plane fetch. Kept separate from the management-plane client for tests and split trust domains. */
  executorFetch?: FetchLike;
  pollIntervalMs?: number;
  maxPolls?: number;
  defaultPolicy?: FleetWorkerCycle['policy'];
  defaultBudgets?: FleetWorkerCycle['budgets'];
}

interface WorkloadStatus {
  observed_state: FleetEvent['observedState'];
  revision: number;
  last_seen: string;
  health?: FleetEvent['health'];
  backpressure?: {
    reason: FleetBackpressure['reason'];
    retryable: boolean;
    retry_after?: string;
  };
  artifacts?: Array<{ kind: FleetArtifact['kind']; uri: string; sha256: string }>;
  error_code?: string;
}

interface WorkloadRecord {
  lineage: {
    session_id?: string | null;
    task_id?: string | null;
    command_id?: string | null;
  };
  status: WorkloadStatus;
}

export interface FleetReconciliationResponse {
  document_type: 'reconciliation';
  api_version: 'agentic-orchestration/v1';
  before_revision: number;
  after_revision: number;
  rows: Array<{
    child_id: string;
    classification: 're-adopted' | 'terminal' | 'unknown' | 'failed-or-aborted' | 'operator-review-required';
    observed_state: FleetEvent['observedState'];
    revision: number;
    reason?: string;
  }>;
}

const terminal = new Set<FleetEvent['observedState']>([
  'retained', 'healthy', 'scheduled', 'succeeded', 'failed', 'cancelled', 'timed-out',
  'unknown', 'operator-review-required',
]);

export class AgenticSandboxFleetClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly fetchImpl: FetchLike;
  private readonly executorFetch: FetchLike;
  private readonly pollIntervalMs: number;
  private readonly maxPolls: number;
  private readonly defaultPolicy: NonNullable<FleetWorkerCycle['policy']>;
  private readonly defaultBudgets: NonNullable<FleetWorkerCycle['budgets']>;

  constructor(options: AgenticSandboxFleetClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.token = options.token;
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.executorFetch = options.executorFetch ?? globalThis.fetch.bind(globalThis);
    this.pollIntervalMs = options.pollIntervalMs ?? 250;
    this.maxPolls = options.maxPolls ?? 120;
    this.defaultPolicy = options.defaultPolicy ?? { trustTier: 'T2', isolationKind: 'vm' };
    this.defaultBudgets = options.defaultBudgets ?? { maxAttempts: 1, timeoutSeconds: 3600 };
  }

  /** Directly assignable to FleetMissionConductor's `runWorker` option. */
  readonly runWorker: RunFleetWorker = async (cycle, executor, invocation, lineage) => {
    const record = this.workloadRecord(cycle, executor, lineage);
    const admitted = await this.request<{ replayed: boolean; workload: WorkloadRecord }>(
      '/api/v2/fleet/workloads',
      { method: 'POST', body: JSON.stringify(record) },
    );
    const events = [this.toEvent(admitted.workload)];

    if (!admitted.workload.lineage.task_id) {
      const dispatched = await routeDispatch(executor, {
        mission_id: lineage.dispatchId,
        objective: cycle.prompt,
        long_running: cycle.longRunning ?? cycle.workloadKind !== 'one-shot-command',
        fleet_workload_kind: cycle.workloadKind,
        fleet_child_id: lineage.childId,
        native_primitive: invocation.primitive,
        ...(executor.a2aInstanceId ? { a2a_instance_id: executor.a2aInstanceId } : {}),
      }, { fetch: this.executorFetch as typeof fetch });
      if (!dispatched.task?.id) {
        throw new Error(`Agentic Sandbox dispatch for '${lineage.childId}' returned no durable task identity`);
      }
      const bound = await this.bindDispatchedTask(
        cycle,
        lineage.childId,
        admitted.workload.status,
        dispatched.task.id,
        this.taskObservedState(cycle, dispatched.task.status.state),
      );
      events.push(this.toEvent(bound));
    }

    for (let attempt = 0; attempt < this.maxPolls && !this.settled(cycle, events.at(-1)!); attempt += 1) {
      if (this.pollIntervalMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, this.pollIntervalMs));
      }
      const next = await this.request<WorkloadRecord>(
        `/api/v2/fleet/workloads/${encodeURIComponent(lineage.childId)}`,
      );
      const event = this.toEvent(next);
      if (event.revision > events.at(-1)!.revision) events.push(event);
    }

    const latest = events.at(-1)!;
    return {
      output: latest.artifacts?.find((artifact) => artifact.kind === 'result')?.uri,
      commandId: latest.commandId,
      sessionId: latest.sessionId,
      events,
    } satisfies FleetRunResult;
  };

  private async bindDispatchedTask(
    cycle: FleetWorkerCycle,
    childId: string,
    current: WorkloadStatus,
    taskId: string,
    observedState: FleetEvent['observedState'],
  ): Promise<WorkloadRecord> {
    const status: WorkloadStatus = {
      observed_state: observedState,
      revision: current.revision + 1,
      last_seen: new Date().toISOString(),
      artifacts: current.artifacts ?? [],
      ...(cycle.workloadKind === 'daemon' ? { health: observedState === 'healthy' ? 'healthy' : 'unknown' } : {}),
      ...(observedState === 'blocked' ? { backpressure: { reason: 'approval', retryable: false } } : {}),
    };
    return this.request(`/api/v2/fleet/workloads/${encodeURIComponent(childId)}/observations`, {
      method: 'POST',
      body: JSON.stringify({
        expected_revision: current.revision,
        runtime_identity: { task_id: taskId },
        status,
      }),
    });
  }

  private taskObservedState(cycle: FleetWorkerCycle, taskState: string): FleetEvent['observedState'] {
    switch (taskState) {
      case 'submitted': return 'starting';
      case 'working': return cycle.workloadKind === 'daemon' ? 'healthy' : 'running';
      case 'input-required': return 'blocked';
      case 'completed':
        if (cycle.workloadKind === 'persistent-agent') return 'retained';
        if (cycle.workloadKind === 'daemon') return 'healthy';
        if (cycle.workloadKind === 'scheduled-collector') return 'scheduled';
        return 'succeeded';
      case 'failed': return 'failed';
      case 'canceled':
      case 'cancelled': return 'cancelled';
      case 'rejected': return 'failed';
      default: return 'unknown';
    }
  }

  async inventory(): Promise<unknown> {
    return this.request('/api/v2/fleet/workloads');
  }

  async reconcile(beforeRevision: number, childIds: string[]): Promise<FleetReconciliationResponse> {
    return this.request('/api/v2/fleet/reconcile', {
      method: 'POST',
      body: JSON.stringify({ before_revision: beforeRevision, child_ids: childIds }),
    });
  }

  private workloadRecord(
    cycle: FleetWorkerCycle,
    executor: ExecutorRegistration,
    lineage: FleetLineage,
  ): unknown {
    if (cycle.workloadKind === 'scheduled-collector' && !cycle.schedule) {
      throw new Error(`scheduled collector '${cycle.id}' requires a schedule`);
    }
    const policy = cycle.policy ?? this.defaultPolicy;
    const budgets = cycle.budgets ?? this.defaultBudgets;
    const spec: Record<string, unknown> = {
      desired_state: 'running',
      capabilities: (cycle.requiredCapabilities ?? []).map((name) => ({ name, status: 'supported' })),
      policy: {
        trust_tier: policy.trustTier,
        isolation_kind: policy.isolationKind,
        ...(policy.credentialPolicyRef ? { credential_policy_ref: policy.credentialPolicyRef } : {}),
        ...(policy.networkPolicyRef ? { network_policy_ref: policy.networkPolicyRef } : {}),
      },
      budgets: {
        max_attempts: budgets.maxAttempts,
        timeout_seconds: budgets.timeoutSeconds,
        ...(budgets.maxCostUsd === undefined ? {} : { max_cost_usd: budgets.maxCostUsd }),
      },
      ...(cycle.schedule ? { schedule: cycle.schedule } : {}),
      orchestrator_metadata: { executor_spec_version: executor.specVersion },
    };
    return {
      document_type: 'workload',
      api_version: 'agentic-orchestration/v1',
      kind: cycle.workloadKind,
      lineage: {
        orchestrator_id: lineage.orchestratorId,
        mission_id: lineage.missionId,
        dispatch_id: lineage.dispatchId,
        idempotency_key: lineage.idempotencyKey,
        parent_id: lineage.parentId,
        child_id: lineage.childId,
        target_id: lineage.targetId,
        executor_id: lineage.executorId,
        runtime_id: lineage.runtimeId,
        session_id: null,
        task_id: null,
        command_id: null,
      },
      spec,
      status: {
        observed_state: 'pending',
        revision: 0,
        last_seen: new Date().toISOString(),
        ...(cycle.workloadKind === 'daemon' ? { health: 'unknown' } : {}),
        artifacts: [],
      },
    };
  }

  private settled(cycle: FleetWorkerCycle, event: FleetEvent): boolean {
    if (event.observedState === 'running' && cycle.workloadKind === 'persistent-agent') return true;
    if (event.observedState === 'running' && cycle.workloadKind === 'daemon' && event.health === 'healthy') return true;
    if (event.observedState === 'blocked') return event.backpressure?.retryable !== true;
    return terminal.has(event.observedState);
  }

  private toEvent(record: WorkloadRecord): FleetEvent {
    const { status, lineage } = record;
    return {
      revision: status.revision,
      observedState: status.observed_state,
      lastSeen: status.last_seen,
      sessionId: lineage.session_id ?? undefined,
      taskId: lineage.task_id ?? undefined,
      commandId: lineage.command_id ?? undefined,
      health: status.health,
      backpressure: status.backpressure ? {
        reason: status.backpressure.reason,
        retryable: status.backpressure.retryable,
        retryAfter: status.backpressure.retry_after,
      } : undefined,
      artifacts: status.artifacts,
      errorCode: status.error_code,
    };
  }

  private async request<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${this.token}`,
        ...(init.body ? { 'content-type': 'application/json' } : {}),
        ...init.headers,
      },
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Agentic Sandbox fleet API ${response.status}: ${body.slice(0, 512)}`);
    }
    return response.json() as Promise<T>;
  }
}
