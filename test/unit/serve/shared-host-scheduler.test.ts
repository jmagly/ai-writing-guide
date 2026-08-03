import { describe, expect, it } from 'vitest';
import {
  InMemoryAdmissionStore,
  SharedHostScheduler,
  type AdmissionRequest,
} from '../../../src/serve/shared-host-scheduler.js';

const start = Date.parse('2026-08-03T12:00:00.000Z');

function request(id: string, overrides: Partial<AdmissionRequest> = {}): AdmissionRequest {
  return {
    requestId: id,
    orchestratorId: `orchestrator-${id}`,
    environment: 'dev',
    provider: 'codex',
    runtimeKind: 'container',
    priority: 10,
    submittedAt: new Date(start).toISOString(),
    queueTimeoutMs: 60_000,
    ...overrides,
  };
}

function scheduler(store: InMemoryAdmissionStore, now: () => number, overrides = {}) {
  return new SharedHostScheduler(store, {
    maxConcurrent: 2,
    leaseTtlMs: 10_000,
    agingIntervalMs: 1_000,
    allowPreemption: true,
    environmentQuotas: { prod: 1, dev: 2 },
    providerQuotas: { codex: 2 },
    runtimeQuotas: { container: 2, vm: 2 },
    ...overrides,
  }, now);
}

describe('SharedHostScheduler (#1566)', () => {
  it('serializes admission globally across orchestrators sharing a store', () => {
    const store = new InMemoryAdmissionStore();
    const now = () => start;
    const first = scheduler(store, now, { maxConcurrent: 1 });
    const second = scheduler(store, now, { maxConcurrent: 1 });
    expect(first.submit(request('a')).state).toBe('admitted');
    expect(second.submit(request('b')).state).toBe('queued');
    expect(Object.values(store.read().records).filter(row => row.state === 'admitted')).toHaveLength(1);
  });

  it('enforces environment, provider, and least-isolated host quotas', () => {
    const store = new InMemoryAdmissionStore();
    const s = scheduler(store, () => start, { maxConcurrent: 5 });
    expect(s.submit(request('prod-a', { environment: 'prod' })).state).toBe('admitted');
    expect(s.submit(request('prod-b', { environment: 'prod' })).state).toBe('queued');
    expect(s.submit(request('host-a', { provider: 'claude', runtimeKind: 'host' })).state).toBe('admitted');
    expect(s.submit(request('host-b', { provider: 'gemini', runtimeKind: 'host' })).state).toBe('queued');
  });

  it('orders by priority, stable FIFO, and aging to prevent starvation', () => {
    let current = start;
    const store = new InMemoryAdmissionStore();
    const s = scheduler(store, () => current, { maxConcurrent: 1, allowPreemption: false });
    s.submit(request('running'));
    s.submit(request('old-low', { priority: 1 }));
    current += 20_000;
    s.submit(request('new-high', { priority: 10, submittedAt: new Date(current).toISOString() }));
    s.release('running');
    expect(s.snapshot().records['old-low']!.state).toBe('admitted');
    expect(s.snapshot().records['new-high']!.state).toBe('queued');
  });

  it('preempts only explicitly preemptible lower-priority leases', () => {
    const store = new InMemoryAdmissionStore();
    const s = scheduler(store, () => start, { maxConcurrent: 1 });
    s.submit(request('low', { priority: 1, preemptible: true }));
    expect(s.submit(request('urgent', { priority: 50 })).state).toBe('admitted');
    expect(s.snapshot().records.low).toMatchObject({ state: 'preempted', preemptedBy: 'urgent' });
  });

  it('does not preempt an unrelated lease that cannot satisfy the blocked quota', () => {
    const store = new InMemoryAdmissionStore();
    const s = scheduler(store, () => start, { maxConcurrent: 3 });
    s.submit(request('prod', { environment: 'prod', priority: 1, preemptible: false }));
    s.submit(request('dev', { environment: 'dev', provider: 'claude', priority: 1, preemptible: true }));
    expect(s.submit(request('prod-urgent', { environment: 'prod', priority: 50 })).state).toBe('queued');
    expect(s.snapshot().records.dev!.state).toBe('admitted');
  });

  it('recovers abandoned capacity after lease expiry and times out queues', () => {
    let current = start;
    const store = new InMemoryAdmissionStore();
    const s = scheduler(store, () => current, { maxConcurrent: 1, allowPreemption: false });
    s.submit(request('abandoned'));
    s.submit(request('waiting', { queueTimeoutMs: 30_000 }));
    current += 11_000;
    s.reconcileNow();
    expect(s.snapshot().records.abandoned!.state).toBe('timed-out');
    expect(s.snapshot().records.waiting!.state).toBe('admitted');

    s.submit(request('short', { submittedAt: new Date(current).toISOString(), queueTimeoutMs: 5_000 }));
    current += 6_000;
    s.reconcileNow();
    expect(s.snapshot().records.short!.state).toBe('timed-out');
  });

  it('is idempotent for exact replay and rejects identity collision', () => {
    const store = new InMemoryAdmissionStore();
    const s = scheduler(store, () => start);
    expect(s.submit(request('same')).revision).toBe(2);
    expect(s.submit(request('same')).revision).toBe(2);
    expect(() => s.submit(request('same', { provider: 'claude' }))).toThrow(/conflicts/);
  });
});
