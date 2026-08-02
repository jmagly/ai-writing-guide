import { describe, expect, it } from 'vitest';
import {
  FleetMissionConductor,
  type FleetMissionPlan,
  type FleetMissionLedger,
  type FleetRunResult,
} from '../../../src/serve/fleet-mission-conductor.js';
import type { ExecutorRegistration } from '../../../src/serve/executor-registry.js';

function executor(id: string): ExecutorRegistration {
  return {
    executorId: id,
    name: id,
    version: '1.0.0',
    specVersion: 'executor.aiwg.io/v1',
    transportEndpoints: {},
    capabilities: ['runtime:codex', 'isolation:vm', 'resumable'],
    token: 'test-only',
    connected: true,
    registeredAt: '2026-08-02T12:00:00.000Z',
    currentMissions: new Set<string>(),
  };
}

const pool = [executor('target-a'), executor('target-b'), executor('target-c')];
const hash = 'a'.repeat(64);

function plan(): FleetMissionPlan {
  return {
    orchestratorId: 'aiwg-cockpit',
    missionId: 'mission-fleet-1',
    goal: 'run a mixed workload fleet',
    completionCriterion: 'all children satisfy lifecycle and evidence requirements',
    aggregation: { mode: 'all-pass' },
    cycles: [
      { id: 'agent', runtime: 'codex', prompt: 'retain', workloadKind: 'persistent-agent', longRunning: true },
      { id: 'daemon', runtime: 'codex', prompt: 'serve', workloadKind: 'daemon', longRunning: true },
      {
        id: 'command',
        runtime: 'codex',
        prompt: 'verify',
        workloadKind: 'one-shot-command',
        requiredEvidence: ['result', 'verifier'],
      },
    ],
  };
}

function resultFor(id: string): FleetRunResult {
  const observedState = id === 'agent' ? 'retained' : id === 'daemon' ? 'healthy' : 'succeeded';
  return {
    output: `output:${id}`,
    cost: 1,
    commandId: `command:${id}`,
    sessionId: id === 'command' ? undefined : `session:${id}`,
    events: [{
      revision: 1,
      observedState,
      health: id === 'daemon' ? 'healthy' : undefined,
      lastSeen: '2026-08-02T12:00:01.000Z',
      artifacts: id === 'command' ? [
        { kind: 'result', uri: 'artifact://result', sha256: hash },
        { kind: 'verifier', uri: 'artifact://verifier', sha256: hash },
      ] : [],
    }],
  };
}

describe('FleetMissionConductor N-target orchestration (#1991)', () => {
  it('dispatches mixed workloads concurrently to distinct targets and completes all-pass', async () => {
    let active = 0;
    let peak = 0;
    const conductor = new FleetMissionConductor({
      runWorker: async (cycle) => {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active -= 1;
        return resultFor(cycle.id);
      },
    });

    const ledger = await conductor.conduct(plan(), pool);

    expect(peak).toBe(3);
    expect(new Set(ledger.cycles.map((cycle) => cycle.lineage?.targetId)).size).toBe(3);
    expect(ledger.cycles.map((cycle) => cycle.workloadKind)).toEqual([
      'persistent-agent', 'daemon', 'one-shot-command',
    ]);
    expect(ledger.parentState).toBe('completed');
    expect(ledger.aggregation.completionEligible).toBe(true);
    expect(ledger.checkpoint.completed).toEqual(['agent', 'daemon', 'command']);
  });

  it('persists revisioned snapshots and ignores stale events', async () => {
    const snapshots: FleetMissionLedger[] = [];
    const one = plan();
    one.cycles = [one.cycles[2]!];
    const conductor = new FleetMissionConductor({
      ledgerStore: { save: (ledger) => { snapshots.push(ledger); } },
      runWorker: () => ({
        output: 'verified',
        events: [
          {
            revision: 2,
            observedState: 'succeeded',
            lastSeen: '2026-08-02T12:00:02.000Z',
            artifacts: [
              { kind: 'result', uri: 'artifact://result', sha256: hash },
              { kind: 'verifier', uri: 'artifact://verifier', sha256: hash },
            ],
          },
          { revision: 1, observedState: 'failed', lastSeen: '2026-08-02T12:00:01.000Z' },
        ],
      }),
    });

    const ledger = await conductor.conduct(one, pool);
    expect(ledger.cycles[0]!.observedState).toBe('succeeded');
    expect(ledger.cycles[0]!.staleEventRevisions).toEqual([1]);
    expect(snapshots.length).toBeGreaterThanOrEqual(3);
    expect(snapshots.at(-1)!.parentState).toBe('completed');
    expect(snapshots.map((snapshot) => snapshot.cycles.length)).toEqual(
      [...snapshots.map((snapshot) => snapshot.cycles.length)].sort((a, b) => a - b),
    );
  });

  it('fails closed when required evidence is missing', async () => {
    const one = plan();
    one.cycles = [one.cycles[2]!];
    const conductor = new FleetMissionConductor({
      runWorker: () => ({
        output: 'unverified',
        events: [{
          revision: 1,
          observedState: 'succeeded',
          lastSeen: '2026-08-02T12:00:01.000Z',
          artifacts: [{ kind: 'result', uri: 'artifact://result', sha256: hash }],
        }],
      }),
    });

    const ledger = await conductor.conduct(one, pool);
    expect(ledger.aggregation.evidenceMissing).toEqual(['command']);
    expect(ledger.aggregation.completionEligible).toBe(false);
    expect(ledger.parentState).toBe('pending');
  });

  it('surfaces approval backpressure and unknown recovery as non-success states', async () => {
    const blocked = plan();
    blocked.cycles = [blocked.cycles[0]!];
    const blockedLedger = await new FleetMissionConductor({
      runWorker: () => ({
        events: [{
          revision: 4,
          observedState: 'blocked',
          lastSeen: '2026-08-02T12:00:04.000Z',
          backpressure: { reason: 'approval', retryable: true },
        }],
      }),
    }).conduct(blocked, pool);
    expect(blockedLedger.parentState).toBe('pending');
    expect(blockedLedger.cycles[0]!.backpressure?.reason).toBe('approval');

    const unknownLedger = await new FleetMissionConductor({
      runWorker: () => ({ events: [] }),
    }).conduct(blocked, pool);
    expect(unknownLedger.parentState).toBe('operator-review-required');
    expect(unknownLedger.aggregation.completionEligible).toBe(false);
  });

  it('re-adopts only durable satisfied children and never repeats them', async () => {
    const firstPlan = plan();
    firstPlan.cycles = [firstPlan.cycles[0]!];
    const first = await new FleetMissionConductor({ runWorker: (cycle) => resultFor(cycle.id) })
      .conduct(firstPlan, pool);
    let dispatches = 0;
    const resumed = await new FleetMissionConductor({
      runWorker: () => {
        dispatches += 1;
        return { events: [] };
      },
    }).conduct(firstPlan, pool, first);

    expect(dispatches).toBe(0);
    expect(resumed.cycles[0]!.lineage?.idempotencyKey).toBe('mission-fleet-1:agent:dispatch');
    expect(resumed.parentState).toBe('completed');
  });
});
