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

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export interface AgenticSandboxFleetClientOptions {
  baseUrl: string;
  token: string;
  fetch?: FetchLike;
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
  'unknown', 'operator-review-required', 'blocked',
]);

export class AgenticSandboxFleetClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly fetchImpl: FetchLike;
  private readonly pollIntervalMs: number;
  private readonly maxPolls: number;
  private readonly defaultPolicy: NonNullable<FleetWorkerCycle['policy']>;
  private readonly defaultBudgets: NonNullable<FleetWorkerCycle['budgets']>;

  constructor(options: AgenticSandboxFleetClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.token = options.token;
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.pollIntervalMs = options.pollIntervalMs ?? 250;
    this.maxPolls = options.maxPolls ?? 120;
    this.defaultPolicy = options.defaultPolicy ?? { trustTier: 'T2', isolationKind: 'vm' };
    this.defaultBudgets = options.defaultBudgets ?? { maxAttempts: 1, timeoutSeconds: 3600 };
  }

  /** Directly assignable to FleetMissionConductor's `runWorker` option. */
  readonly runWorker: RunFleetWorker = async (cycle, executor, _invocation, lineage) => {
    const record = this.workloadRecord(cycle, executor, lineage);
    const admitted = await this.request<{ replayed: boolean; workload: WorkloadRecord }>(
      '/api/v2/fleet/workloads',
      { method: 'POST', body: JSON.stringify(record) },
    );
    const events = [this.toEvent(admitted.workload.status)];

    for (let attempt = 0; attempt < this.maxPolls && !this.settled(cycle, events.at(-1)!); attempt += 1) {
      if (this.pollIntervalMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, this.pollIntervalMs));
      }
      const next = await this.request<WorkloadRecord>(
        `/api/v2/fleet/workloads/${encodeURIComponent(lineage.childId)}`,
      );
      const event = this.toEvent(next.status);
      if (event.revision > events.at(-1)!.revision) events.push(event);
    }

    const latest = events.at(-1)!;
    return {
      commandId: latest.commandId,
      sessionId: latest.sessionId,
      events,
    } satisfies FleetRunResult;
  };

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
    return terminal.has(event.observedState);
  }

  private toEvent(status: WorkloadStatus): FleetEvent {
    return {
      revision: status.revision,
      observedState: status.observed_state,
      lastSeen: status.last_seen,
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
