/**
 * Cross-orchestrator scheduling and admission for shared execution hosts.
 *
 * The store is the global serialization boundary. Multiple AIWG processes must
 * use the same durable implementation; the in-memory store is for tests and
 * single-process embedding only. Executor substrates report capacity and run
 * admitted work, but do not own this policy.
 *
 * @implements #1566
 */

export type AdmissionState =
  | 'queued'
  | 'admitted'
  | 'denied'
  | 'cancelled'
  | 'timed-out'
  | 'preempted';

export type RuntimeKind = 'host' | 'container' | 'vm' | 'microvm' | 'custom';

export interface AdmissionRequest {
  requestId: string;
  orchestratorId: string;
  environment: string;
  provider: string;
  runtimeKind: RuntimeKind;
  priority: number;
  submittedAt: string;
  queueTimeoutMs: number;
  preemptible?: boolean;
  metadata?: Record<string, string>;
}

export interface AdmissionRecord extends AdmissionRequest {
  state: AdmissionState;
  revision: number;
  reason: string;
  admittedAt?: string;
  leaseExpiresAt?: string;
  finishedAt?: string;
  preemptedBy?: string;
}

export interface SharedHostPolicy {
  maxConcurrent: number;
  leaseTtlMs: number;
  agingIntervalMs: number;
  allowPreemption: boolean;
  environmentQuotas?: Record<string, number>;
  providerQuotas?: Record<string, number>;
  runtimeQuotas?: Partial<Record<RuntimeKind, number>>;
  /** Host execution is least isolated and defaults to one concurrent lease. */
  defaultHostQuota?: number;
}

export interface AdmissionSnapshot {
  revision: number;
  records: Record<string, AdmissionRecord>;
}

export interface AdmissionStore {
  transact<T>(mutate: (snapshot: AdmissionSnapshot) => T): T;
  read(): AdmissionSnapshot;
}

export class InMemoryAdmissionStore implements AdmissionStore {
  private snapshot: AdmissionSnapshot = { revision: 0, records: {} };

  transact<T>(mutate: (snapshot: AdmissionSnapshot) => T): T {
    const draft = structuredClone(this.snapshot);
    const result = mutate(draft);
    draft.revision += 1;
    this.snapshot = draft;
    return result;
  }

  read(): AdmissionSnapshot {
    return structuredClone(this.snapshot);
  }
}

const terminalStates = new Set<AdmissionState>([
  'denied', 'cancelled', 'timed-out', 'preempted',
]);

export class SharedHostScheduler {
  constructor(
    private readonly store: AdmissionStore,
    private readonly policy: SharedHostPolicy,
    private readonly clock: () => number = Date.now,
  ) {
    if (!Number.isInteger(policy.maxConcurrent) || policy.maxConcurrent < 1) {
      throw new Error('maxConcurrent must be a positive integer');
    }
    if (policy.leaseTtlMs < 1 || policy.agingIntervalMs < 1) {
      throw new Error('leaseTtlMs and agingIntervalMs must be positive');
    }
  }

  submit(request: AdmissionRequest): AdmissionRecord {
    this.validateRequest(request);
    return this.store.transact(snapshot => {
      const existing = snapshot.records[request.requestId];
      if (existing) {
        if (!sameRequest(existing, request)) {
          throw new Error(`request '${request.requestId}' conflicts with an existing admission`);
        }
        return existing;
      }
      snapshot.records[request.requestId] = {
        ...structuredClone(request),
        state: 'queued',
        revision: 1,
        reason: 'awaiting shared-host capacity',
      };
      this.reconcile(snapshot);
      return structuredClone(snapshot.records[request.requestId]!);
    });
  }

  reconcileNow(): AdmissionSnapshot {
    return this.store.transact(snapshot => {
      this.reconcile(snapshot);
      return structuredClone(snapshot);
    });
  }

  renew(requestId: string): AdmissionRecord {
    return this.store.transact(snapshot => {
      const record = this.required(snapshot, requestId);
      if (record.state !== 'admitted') throw new Error(`cannot renew ${record.state} admission`);
      record.leaseExpiresAt = new Date(this.clock() + this.policy.leaseTtlMs).toISOString();
      record.revision += 1;
      record.reason = 'lease renewed';
      return structuredClone(record);
    });
  }

  release(requestId: string): AdmissionSnapshot {
    return this.store.transact(snapshot => {
      const record = this.required(snapshot, requestId);
      delete snapshot.records[requestId];
      if (record.state === 'admitted') this.reconcile(snapshot);
      return structuredClone(snapshot);
    });
  }

  cancel(requestId: string): AdmissionRecord {
    return this.store.transact(snapshot => {
      const record = this.required(snapshot, requestId);
      if (terminalStates.has(record.state)) return structuredClone(record);
      record.state = 'cancelled';
      record.reason = 'cancelled by orchestrator';
      record.finishedAt = new Date(this.clock()).toISOString();
      record.revision += 1;
      this.reconcile(snapshot);
      return structuredClone(record);
    });
  }

  snapshot(): AdmissionSnapshot {
    return this.store.read();
  }

  private reconcile(snapshot: AdmissionSnapshot): void {
    const now = this.clock();
    for (const record of Object.values(snapshot.records)) {
      if (record.state === 'admitted' && Date.parse(record.leaseExpiresAt ?? '') <= now) {
        record.state = 'timed-out';
        record.reason = 'admission lease expired; capacity recovered';
        record.finishedAt = new Date(now).toISOString();
        record.revision += 1;
      } else if (record.state === 'queued' && Date.parse(record.submittedAt) + record.queueTimeoutMs <= now) {
        record.state = 'timed-out';
        record.reason = 'queue deadline elapsed';
        record.finishedAt = new Date(now).toISOString();
        record.revision += 1;
      }
    }

    let queued = Object.values(snapshot.records)
      .filter(record => record.state === 'queued')
      .sort((a, b) => this.compare(a, b, now));

    for (const candidate of queued) {
      if (!this.hasCapacity(snapshot, candidate)) {
        if (this.policy.allowPreemption) this.tryPreempt(snapshot, candidate, now);
      }
      if (!this.hasCapacity(snapshot, candidate)) continue;
      candidate.state = 'admitted';
      candidate.reason = 'admitted by shared-host policy';
      candidate.admittedAt = new Date(now).toISOString();
      candidate.leaseExpiresAt = new Date(now + this.policy.leaseTtlMs).toISOString();
      candidate.revision += 1;
    }
    queued = [];
  }

  private tryPreempt(snapshot: AdmissionSnapshot, candidate: AdmissionRecord, now: number): void {
    const victims = Object.values(snapshot.records)
      .filter(record => record.state === 'admitted' && record.preemptible === true)
      .sort((a, b) => this.compare(b, a, now));
    const victim = victims.find(record => {
      if (this.effectivePriority(record, now) >= this.effectivePriority(candidate, now)) return false;
      const priorState = record.state;
      record.state = 'preempted';
      const freesRequiredCapacity = this.hasCapacity(snapshot, candidate);
      record.state = priorState;
      return freesRequiredCapacity;
    });
    if (!victim) return;
    victim.state = 'preempted';
    victim.reason = `preempted by higher-priority request '${candidate.requestId}'`;
    victim.preemptedBy = candidate.requestId;
    victim.finishedAt = new Date(now).toISOString();
    victim.revision += 1;
  }

  private hasCapacity(snapshot: AdmissionSnapshot, candidate: AdmissionRecord): boolean {
    const active = Object.values(snapshot.records).filter(record => record.state === 'admitted');
    if (active.length >= this.policy.maxConcurrent) return false;
    if (!belowQuota(active, 'environment', candidate.environment, this.policy.environmentQuotas)) return false;
    if (!belowQuota(active, 'provider', candidate.provider, this.policy.providerQuotas)) return false;
    const runtimeQuotas = {
      host: this.policy.defaultHostQuota ?? 1,
      ...this.policy.runtimeQuotas,
    };
    return belowQuota(active, 'runtimeKind', candidate.runtimeKind, runtimeQuotas);
  }

  private effectivePriority(record: AdmissionRecord, now: number): number {
    const waited = Math.max(0, now - Date.parse(record.submittedAt));
    return record.priority + Math.floor(waited / this.policy.agingIntervalMs);
  }

  private compare(a: AdmissionRecord, b: AdmissionRecord, now: number): number {
    return this.effectivePriority(b, now) - this.effectivePriority(a, now)
      || Date.parse(a.submittedAt) - Date.parse(b.submittedAt)
      || a.requestId.localeCompare(b.requestId);
  }

  private required(snapshot: AdmissionSnapshot, requestId: string): AdmissionRecord {
    const record = snapshot.records[requestId];
    if (!record) throw new Error(`unknown admission request '${requestId}'`);
    return record;
  }

  private validateRequest(request: AdmissionRequest): void {
    if (!request.requestId || !request.orchestratorId || !request.environment || !request.provider) {
      throw new Error('request identity, orchestrator, environment, and provider are required');
    }
    if (!Number.isFinite(request.priority)) throw new Error('priority must be finite');
    if (!Number.isFinite(Date.parse(request.submittedAt))) throw new Error('submittedAt must be a timestamp');
    if (request.queueTimeoutMs < 1) throw new Error('queueTimeoutMs must be positive');
  }
}

function belowQuota<K extends 'environment' | 'provider' | 'runtimeKind'>(
  active: AdmissionRecord[],
  field: K,
  value: AdmissionRecord[K],
  quotas: Partial<Record<string, number>> | undefined,
): boolean {
  const quota = quotas?.[String(value)];
  if (quota === undefined) return true;
  return active.filter(record => record[field] === value).length < quota;
}

function sameRequest(record: AdmissionRecord, request: AdmissionRequest): boolean {
  return record.orchestratorId === request.orchestratorId
    && record.environment === request.environment
    && record.provider === request.provider
    && record.runtimeKind === request.runtimeKind;
}
