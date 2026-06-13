/**
 * Mission Conductor — cross-stack orchestration (#1546, #1534).
 *
 * Proves the conductor fans worker cycles across heterogeneous stacks
 * (Claude ↔ Codex) on the existing executor registry / `runtime:<name>`
 * convention, and that the retained-ownership bookkeeping invariant holds
 * IDENTICALLY regardless of which stack ran each worker.
 */

import { describe, it, expect } from 'vitest';
import {
  MissionConductor,
  type MissionPlan,
  type RunWorker,
  type MissionLedger,
} from '../../../src/serve/mission-conductor.js';
import {
  StackAdapterRegistry,
  codexAdapter,
  claudeCodeAdapter,
  BUILTIN_STACK_ADAPTERS,
} from '../../../src/serve/stack-adapters.js';
import type { ExecutorRegistration } from '../../../src/serve/executor-registry.js';

function makeExecutor(overrides: Partial<ExecutorRegistration> = {}): ExecutorRegistration {
  const base: ExecutorRegistration = {
    executorId: '00000000-0000-0000-0000-000000000000',
    name: 'executor',
    version: '1.0.0',
    specVersion: 'executor.aiwg.io/v1',
    transportEndpoints: {},
    capabilities: ['isolation:vm', 'runtime:claude-code', 'resumable'],
    token: 'tok',
    connected: true,
    registeredAt: new Date().toISOString(),
    currentMissions: new Set<string>(),
  };
  return { ...base, ...overrides };
}

const codexExec = makeExecutor({
  executorId: 'codex-0000-0000-0000-0000-000000000001',
  name: 'codex-executor',
  capabilities: ['isolation:container', 'runtime:codex', 'resumable'],
});
const claudeExec = makeExecutor({
  executorId: 'claude-0000-0000-0000-0000-000000000002',
  name: 'claude-executor',
  capabilities: ['isolation:vm', 'runtime:claude-code', 'resumable'],
});
const fleet = [codexExec, claudeExec];

// Fake worker execution — returns a per-runtime output + cost so we can assert
// cross-stack bookkeeping without a live `aiwg serve`.
const fakeRun: RunWorker = (cycle, executor) => ({
  output: `result of ${cycle.id} on ${cycle.runtime}`,
  cost: cycle.runtime === 'codex' ? 100 : 250,
});

function mixedPlan(): MissionPlan {
  return {
    missionId: 'mission-xstack-1',
    goal: 'cross-stack proof: one Claude worker + one Codex worker under one conductor',
    completionCriterion: 'both worker cycles routed and complete',
    cycles: [
      { id: 'cycle-codex', runtime: 'codex', prompt: 'analyze module A' },
      { id: 'cycle-claude', runtime: 'claude-code', prompt: 'analyze module B' },
    ],
  };
}

describe('MissionConductor cross-stack dispatch (#1546)', () => {
  it('routes each worker cycle to an executor advertising its runtime', async () => {
    const conductor = new MissionConductor({ runWorker: fakeRun });
    const ledger = await conductor.conduct(mixedPlan(), fleet);

    const codex = ledger.cycles.find((c) => c.cycleId === 'cycle-codex')!;
    const claude = ledger.cycles.find((c) => c.cycleId === 'cycle-claude')!;

    expect(codex.routed).toBe(true);
    expect(codex.executorId).toBe(codexExec.executorId);
    expect(codex.runtime).toBe('codex');
    expect(codex.primitive).toBe('/goal');

    expect(claude.routed).toBe(true);
    expect(claude.executorId).toBe(claudeExec.executorId);
    expect(claude.runtime).toBe('claude-code');
    expect(claude.primitive).toBe('workflow-tool');

    // Distinct stacks under one conductor.
    expect(codex.executorId).not.toBe(claude.executorId);
  });

  it('retained-ownership invariant: bookkeeping is identical-shape across stacks', async () => {
    const conductor = new MissionConductor({ runWorker: fakeRun });
    const ledger = await conductor.conduct(mixedPlan(), fleet);

    // Activity log: a dispatch line per cycle, plus start/end framing.
    expect(ledger.activityLog.some((l) => l.includes('cycle-codex') && l.includes('codex'))).toBe(true);
    expect(ledger.activityLog.some((l) => l.includes('cycle-claude') && l.includes('claude-code'))).toBe(true);
    expect(ledger.activityLog[0]).toContain('mission mission-xstack-1 start');

    // Cost aggregated across BOTH stacks (100 + 250).
    expect(ledger.totalCost).toBe(350);

    // Checkpoint records both as completed, none pending/failed.
    expect(ledger.checkpoint.completed.sort()).toEqual(['cycle-claude', 'cycle-codex']);
    expect(ledger.checkpoint.pending).toEqual([]);
    expect(ledger.checkpoint.failed).toEqual([]);

    // Both stacks recorded as used.
    expect(ledger.runtimesUsed.sort()).toEqual(['claude-code', 'codex']);

    // Each completed cycle carries the same bookkeeping fields regardless of stack.
    for (const c of ledger.cycles) {
      expect(c.executorId, `${c.cycleId} has an executor`).toBeTruthy();
      expect(typeof c.cost, `${c.cycleId} has cost`).toBe('number');
      expect(c.output, `${c.cycleId} has output`).toBeTruthy();
    }
  });

  it('best-output selection runs conductor-side across stacks (REF-015)', async () => {
    const conductor = new MissionConductor({ runWorker: fakeRun });
    const ledger = await conductor.conduct(mixedPlan(), fleet);
    // Default scorer = output length; both outputs differ only by the runtime
    // suffix, so the longer (`claude-code`) wins — the point is it selects ONE
    // best across heterogeneous stacks.
    expect(ledger.bestOutput).toBeTruthy();
    expect(['cycle-codex', 'cycle-claude']).toContain(ledger.bestOutput!.cycleId);
  });

  it('honors a custom best-output scorer across stacks', async () => {
    const conductor = new MissionConductor({
      runWorker: fakeRun,
      // Prefer the higher-cost cycle (the Claude worker, cost 250).
      scoreOutput: (r) => r.cost,
    });
    const ledger = await conductor.conduct(mixedPlan(), fleet);
    expect(ledger.bestOutput!.cycleId).toBe('cycle-claude');
    expect(ledger.bestOutput!.runtime).toBe('claude-code');
  });
});

describe('MissionConductor no-silent-drop (#1546)', () => {
  it('records an unroutable cycle when no adapter is registered for its runtime', async () => {
    const conductor = new MissionConductor({ runWorker: fakeRun });
    const plan: MissionPlan = {
      missionId: 'm-unroutable',
      goal: 'g',
      completionCriterion: 'c',
      cycles: [{ id: 'c1', runtime: 'nonexistent-stack', prompt: 'x' }],
    };
    const ledger = await conductor.conduct(plan, fleet);
    const c1 = ledger.cycles.find((c) => c.cycleId === 'c1')!;
    expect(c1.routed).toBe(false);
    expect(c1.reason).toContain('no stack adapter');
    expect(ledger.checkpoint.failed).toContain('c1');
    expect(ledger.checkpoint.completed).not.toContain('c1');
  });

  it('records an unassigned cycle when no connected executor advertises the runtime', async () => {
    const conductor = new MissionConductor({ runWorker: fakeRun });
    const plan: MissionPlan = {
      missionId: 'm-unassigned',
      goal: 'g',
      completionCriterion: 'c',
      cycles: [{ id: 'c1', runtime: 'codex', prompt: 'x' }],
    };
    // Pool has only a claude executor — no runtime:codex available.
    const ledger = await conductor.conduct(plan, [claudeExec]);
    const c1 = ledger.cycles.find((c) => c.cycleId === 'c1')!;
    expect(c1.routed).toBe(false);
    expect(c1.reason).toContain('no connected executor');
    expect(ledger.checkpoint.failed).toContain('c1');
  });

  it('records a worker error without dropping the cycle', async () => {
    const conductor = new MissionConductor({
      runWorker: () => {
        throw new Error('boom');
      },
    });
    const plan: MissionPlan = {
      missionId: 'm-err',
      goal: 'g',
      completionCriterion: 'c',
      cycles: [{ id: 'c1', runtime: 'codex', prompt: 'x' }],
    };
    const ledger = await conductor.conduct(plan, fleet);
    const c1 = ledger.cycles.find((c) => c.cycleId === 'c1')!;
    expect(c1.routed).toBe(true);
    expect(c1.reason).toContain('worker error: boom');
    expect(ledger.checkpoint.failed).toContain('c1');
  });
});

describe('MissionConductor crash-resilient resume (#1546)', () => {
  it('carries forward completed cycles from a prior ledger and skips re-running them', async () => {
    let runCount = 0;
    const countingRun: RunWorker = (cycle) => {
      runCount += 1;
      return { output: `ran ${cycle.id}`, cost: 10 };
    };
    const conductor = new MissionConductor({ runWorker: countingRun });
    const plan: MissionPlan = {
      missionId: 'm-resume',
      goal: 'g',
      completionCriterion: 'c',
      cycles: [
        { id: 'c1', runtime: 'codex', prompt: 'x' },
        { id: 'c2', runtime: 'claude-code', prompt: 'y' },
      ],
    };

    // First pass: both run.
    const first = await conductor.conduct(plan, fleet);
    expect(runCount).toBe(2);
    expect(first.checkpoint.completed.sort()).toEqual(['c1', 'c2']);

    // Simulate a crash where only c1 completed: resume from a ledger marking c1 done.
    runCount = 0;
    const partial: MissionLedger = {
      ...first,
      cycles: first.cycles.filter((c) => c.cycleId === 'c1'),
      checkpoint: { completed: ['c1'], pending: ['c2'], failed: [] },
    };
    const resumed = await conductor.conduct(plan, fleet, partial);
    // Only c2 re-runs; c1 is carried forward.
    expect(runCount).toBe(1);
    expect(resumed.checkpoint.completed.sort()).toEqual(['c1', 'c2']);
    expect(resumed.cycles.find((c) => c.cycleId === 'c1')!.output).toBe('ran c1');
  });
});

describe('StackAdapterRegistry (#1546)', () => {
  it('ships built-in codex + claude-code adapters with runtime:<name> tokens', () => {
    const reg = new StackAdapterRegistry();
    expect(reg.has('codex')).toBe(true);
    expect(reg.has('claude-code')).toBe(true);
    expect(reg.get('codex')!.runtimeCapability).toBe('runtime:codex');
    expect(reg.get('claude-code')!.runtimeCapability).toBe('runtime:claude-code');
    expect(BUILTIN_STACK_ADAPTERS).toContain(codexAdapter);
    expect(BUILTIN_STACK_ADAPTERS).toContain(claudeCodeAdapter);
  });

  it('lets operators register an additional stack (open-ended runtime convention)', () => {
    const reg = new StackAdapterRegistry();
    reg.register({
      runtime: 'opencode',
      runtimeCapability: 'runtime:opencode',
      primitive: 'opencode-session',
      invoke: (p) => ({ runtimeCapability: 'runtime:opencode', primitive: 'opencode-session', describe: p }),
    });
    expect(reg.has('opencode')).toBe(true);
    expect(reg.runtimes()).toContain('opencode');
  });

  it('adapter.invoke produces a runtime-correct worker invocation descriptor', () => {
    const inv = codexAdapter.invoke('do the thing');
    expect(inv.runtimeCapability).toBe('runtime:codex');
    expect(inv.primitive).toBe('/goal');
    expect(inv.describe).toContain('codex');
  });
});
