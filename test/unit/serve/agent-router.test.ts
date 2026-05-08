/**
 * Agent Router unit tests
 *
 * Covers both routeTask (#916) and routeMission (#1179).
 */

import { describe, it, expect } from 'vitest';
import {
  routeTask,
  routeMission,
  matchAgent,
  type AgentFilter,
  type ExecutorFilter,
} from '../../../src/serve/agent-router.js';
import type { SandboxAgent } from '../../../src/serve/sandbox-registry.js';
import type { ExecutorRegistration } from '../../../src/serve/executor-registry.js';

// ── routeTask helpers ────────────────────────────────────────────────────────

function makeAgent(overrides: Partial<SandboxAgent & { sandboxId: string; sandboxName: string }> = {}): SandboxAgent & { sandboxId: string; sandboxName: string } {
  return {
    agentId: 'agent-01',
    sandboxId: 'sandbox-01',
    sandboxName: 'test-sandbox',
    status: 'ready',
    ...overrides,
  };
}

// ── routeTask tests (#916) ───────────────────────────────────────────────────

describe('matchAgent', () => {
  it('returns null (match) for agent with no filter constraints', () => {
    expect(matchAgent(makeAgent(), {})).toBeNull();
  });

  it('rejects agent with wrong agentId', () => {
    const reason = matchAgent(makeAgent({ agentId: 'agent-01' }), { agent_id: 'agent-02' });
    expect(reason).not.toBeNull();
  });

  it('matches agent by agentId', () => {
    expect(matchAgent(makeAgent({ agentId: 'agent-01' }), { agent_id: 'agent-01' })).toBeNull();
  });

  it('matches agent by instanceId', () => {
    expect(matchAgent(makeAgent({ instanceId: 'inst-01' }), { agent_id: 'inst-01' })).toBeNull();
  });

  it('matches agent by logicalName', () => {
    expect(matchAgent(makeAgent({ logicalName: 'prod-agent' }), { agent_id: 'prod-agent' })).toBeNull();
  });

  it('rejects disconnected agent', () => {
    expect(matchAgent(makeAgent({ status: 'disconnected' }), {})).not.toBeNull();
  });

  it('rejects agent with wrong sandbox_id', () => {
    const reason = matchAgent(makeAgent({ sandboxId: 'sandbox-01' }), { sandbox_id: 'sandbox-99' });
    expect(reason).not.toBeNull();
  });

  it('rejects agent missing required frameworks', () => {
    const reason = matchAgent(
      makeAgent({ aiwgFrameworks: [{ name: 'sdlc-complete', providers: [] }] }),
      { frameworks: ['sdlc-complete', 'security-engineering'] }
    );
    expect(reason).not.toBeNull();
    expect(reason).toContain('security-engineering');
  });

  it('matches agent with all required frameworks', () => {
    const reason = matchAgent(
      makeAgent({ aiwgFrameworks: [{ name: 'sdlc-complete', providers: [] }, { name: 'security-engineering', providers: [] }] }),
      { frameworks: ['sdlc-complete'] }
    );
    expect(reason).toBeNull();
  });

  it('rejects agent exceeding CPU threshold', () => {
    const reason = matchAgent(
      makeAgent({ latestMetrics: { cpu_percent: 95, memory_used_bytes: 100, memory_total_bytes: 1000, uptime_seconds: 10, ts: Date.now() } }),
      { max_cpu_percent: 80 }
    );
    expect(reason).not.toBeNull();
  });

  it('rejects agent with insufficient memory', () => {
    const reason = matchAgent(
      makeAgent({ latestMetrics: { cpu_percent: 10, memory_used_bytes: 900, memory_total_bytes: 1000, uptime_seconds: 10, ts: Date.now() } }),
      { min_memory_gb: 100 }
    );
    expect(reason).not.toBeNull();
  });
});

describe('routeTask', () => {
  const agents = [
    makeAgent({ agentId: 'a1', status: 'ready' }),
    makeAgent({ agentId: 'a2', status: 'ready' }),
    makeAgent({ agentId: 'a3', status: 'disconnected' }),
  ];

  it('returns selected agent when filter matches', () => {
    const result = routeTask(agents, { agent_id: 'a1' });
    expect(result.selected?.agent.agentId).toBe('a1');
  });

  it('returns no selection when filter matches nothing', () => {
    const result = routeTask(agents, { agent_id: 'nonexistent' });
    expect(result.selected).toBeUndefined();
    expect(result.candidates).toHaveLength(0);
  });

  it('excludes disconnected agents', () => {
    const result = routeTask(agents, { agent_id: 'a3' });
    expect(result.selected).toBeUndefined();
  });

  it('applies fallback strategy "any" when preferred is unavailable', () => {
    const result = routeTask(agents, {
      frameworks: ['nonexistent-framework'],
      fallback: { strategy: 'any' },
    });
    // Should fall back to any ready agent
    expect(result.selected).toBeDefined();
  });

  it('sorts candidates by score (CPU-weighted)', () => {
    const highLoad = makeAgent({ agentId: 'high', latestMetrics: { cpu_percent: 90, memory_used_bytes: 100, memory_total_bytes: 1000, uptime_seconds: 10, ts: Date.now() } });
    const lowLoad  = makeAgent({ agentId: 'low',  latestMetrics: { cpu_percent: 10, memory_used_bytes: 100, memory_total_bytes: 1000, uptime_seconds: 10, ts: Date.now() } });
    const result = routeTask([highLoad, lowLoad], {});
    expect(result.selected?.agent.agentId).toBe('low');
  });
});

// ── routeMission tests (#1179) ───────────────────────────────────────────────

function makeExecutor(overrides: Partial<ExecutorRegistration> = {}): ExecutorRegistration {
  const base: ExecutorRegistration = {
    executorId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    name: 'test-executor',
    version: '0.3.0',
    specVersion: '1.0.0',
    transportEndpoints: { rest: 'http://127.0.0.1:8122', ws: 'ws://127.0.0.1:8121' },
    capabilities: ['isolation:vm', 'runtime:claude-code', 'platform:linux/x64', 'resumable', 'hitl'],
    token: 'token-abc',
    connected: true,
    registeredAt: '2026-05-08T19:30:00.000Z',
    currentMissions: new Set(),
  };
  return { ...base, ...overrides };
}

describe('routeMission', () => {
  it('returns undefined selected when executor list is empty', () => {
    const result = routeMission([], {});
    expect(result.selected).toBeUndefined();
  });

  it('returns undefined selected when no executor is connected', () => {
    const executor = makeExecutor({ connected: false });
    const result = routeMission([executor], {});
    expect(result.selected).toBeUndefined();
  });

  it('selects a connected executor with no filter', () => {
    const executor = makeExecutor();
    const result = routeMission([executor], {});
    expect(result.selected).toBeDefined();
    expect(result.selected!.executor.executorId).toBe(executor.executorId);
  });

  it('selects executor matching required capabilities', () => {
    const executor = makeExecutor({ capabilities: ['isolation:vm', 'runtime:claude-code', 'resumable'] });
    const result = routeMission([executor], { capabilities: ['runtime:claude-code'] });
    expect(result.selected).toBeDefined();
  });

  it('rejects executor missing required capabilities', () => {
    const executor = makeExecutor({ capabilities: ['isolation:vm'] });
    const result = routeMission([executor], { capabilities: ['runtime:claude-code'] });
    expect(result.selected).toBeUndefined();
    expect(result.candidates).toHaveLength(0);
  });

  it('pins to executor_id when specified', () => {
    const e1 = makeExecutor({ executorId: 'aaa00000-0000-0000-0000-000000000001' });
    const e2 = makeExecutor({ executorId: 'bbb00000-0000-0000-0000-000000000002' });
    const result = routeMission([e1, e2], { executor_id: e1.executorId });
    expect(result.selected?.executor.executorId).toBe(e1.executorId);
  });

  it('rejects all when pinned executor_id does not match any executor', () => {
    const executor = makeExecutor();
    const result = routeMission([executor], { executor_id: '00000000-0000-0000-0000-000000000000' });
    expect(result.selected).toBeUndefined();
  });

  it('rejects executor without resumable when long_running is true', () => {
    const executor = makeExecutor({ capabilities: ['isolation:vm', 'runtime:claude-code'] });
    const result = routeMission([executor], {}, true);
    expect(result.selected).toBeUndefined();
  });

  it('selects resumable executor for long_running', () => {
    const executor = makeExecutor({ capabilities: ['isolation:vm', 'runtime:claude-code', 'resumable'] });
    const result = routeMission([executor], {}, true);
    expect(result.selected).toBeDefined();
  });

  it('prefers isolation:vm executor over isolation:none (sandbox-first policy)', () => {
    const vmExec    = makeExecutor({ executorId: 'vm-00000-0000-0000-0000-000000000001', capabilities: ['isolation:vm', 'runtime:claude-code'] });
    const localExec = makeExecutor({ executorId: 'local-0000-0000-0000-0000-000000000002', capabilities: ['isolation:none', 'runtime:claude-code'] });

    const result = routeMission([localExec, vmExec], {});
    expect(result.selected?.executor.executorId).toBe(vmExec.executorId);
    expect(result.selected?.matchReason).toContain('sandbox-first');
  });

  it('prefers isolation:container over isolation:none', () => {
    const containerExec = makeExecutor({ executorId: 'cnt-00000-0000-0000-0000-000000000001', capabilities: ['isolation:container'] });
    const localExec     = makeExecutor({ executorId: 'loc-00000-0000-0000-0000-000000000002', capabilities: ['isolation:none'] });
    const result = routeMission([localExec, containerExec], {});
    expect(result.selected?.executor.executorId).toBe(containerExec.executorId);
  });

  it('falls back to local executor when no sandbox executor available', () => {
    const executor = makeExecutor({ capabilities: ['isolation:none', 'runtime:claude-code'] });
    const result = routeMission([executor], {});
    expect(result.selected).toBeDefined();
    expect(result.selected!.matchReason).toContain('local fallback');
  });

  it('includes rejected candidates with reasons', () => {
    const disconnected = makeExecutor({ executorId: 'disc-0000-0000-0000-0000-000000000001', connected: false });
    const connected    = makeExecutor({ executorId: 'conn-0000-0000-0000-0000-000000000002' });
    const result = routeMission([disconnected, connected], {});
    expect(result.selected?.executor.executorId).toBe(connected.executorId);
    // Disconnected executor should be in the rejected list
    const rejectedIds = result.selected?.rejected.map((r) => r.executorId) ?? [];
    expect(rejectedIds).toContain(disconnected.executorId);
  });
});
