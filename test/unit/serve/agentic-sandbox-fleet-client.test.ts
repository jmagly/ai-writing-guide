import { describe, expect, it } from 'vitest';
import { AgenticSandboxFleetClient } from '../../../src/serve/agentic-sandbox-fleet-client.js';
import { FleetMissionConductor, type FleetMissionPlan } from '../../../src/serve/fleet-mission-conductor.js';
import type { ExecutorRegistration } from '../../../src/serve/executor-registry.js';

const executor: ExecutorRegistration = {
  executorId: 'sandbox-target-1',
  name: 'sandbox-target-1',
  version: '1.0.0',
  specVersion: 'executor.aiwg.io/v1',
  transportEndpoints: {},
  capabilities: ['runtime:codex', 'isolation:vm', 'resumable'],
  token: 'executor-token-not-used-by-fleet-client',
  connected: true,
  registeredAt: '2026-08-02T12:00:00Z',
  currentMissions: new Set<string>(),
};

const hash = 'b'.repeat(64);

function workload(status: Record<string, unknown>, lineage: Record<string, unknown> = {}) {
  return {
    lineage: { session_id: null, task_id: null, command_id: null, ...lineage },
    status: { last_seen: '2026-08-02T12:00:00Z', artifacts: [], ...status },
  };
}

describe('AgenticSandboxFleetClient AIWG integration (#1991)', () => {
  it('dispatches the neutral contract and streams revisioned Sandbox observations into the conductor', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const responses = [
      { replayed: false, workload: workload({ observed_state: 'admitted', revision: 1 }) },
      workload({ observed_state: 'running', revision: 2 }, {
        session_id: 'session-1', task_id: 'task-1', command_id: 'command-1',
      }),
      workload({
        observed_state: 'succeeded',
        revision: 3,
        artifacts: [
          { kind: 'result', uri: 'artifact://result', sha256: hash },
          { kind: 'verifier', uri: 'artifact://verifier', sha256: hash },
        ],
      }, { session_id: 'session-1', task_id: 'task-1', command_id: 'command-1' }),
    ];
    const fakeFetch = async (input: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(input), init });
      return new Response(JSON.stringify(responses.shift()), {
        status: calls.length === 1 ? 202 : 200,
        headers: { 'content-type': 'application/json' },
      });
    };
    const client = new AgenticSandboxFleetClient({
      baseUrl: 'http://sandbox.example/',
      token: 'management-token',
      fetch: fakeFetch,
      pollIntervalMs: 0,
      maxPolls: 5,
    });
    const plan: FleetMissionPlan = {
      orchestratorId: 'aiwg-cockpit',
      missionId: 'mission-1',
      goal: 'prove the real contract binding',
      completionCriterion: 'verified command succeeds',
      aggregation: { mode: 'all-pass' },
      cycles: [{
        id: 'child-1',
        runtime: 'codex',
        prompt: 'run proof',
        workloadKind: 'one-shot-command',
        requiredEvidence: ['result', 'verifier'],
      }],
    };

    const ledger = await new FleetMissionConductor({ runWorker: client.runWorker })
      .conduct(plan, [executor]);

    expect(ledger.parentState).toBe('completed');
    expect(ledger.cycles[0]!.revision).toBe(3);
    expect(ledger.cycles[0]).toMatchObject({
      output: 'artifact://result',
      sessionId: 'session-1',
      taskId: 'task-1',
      commandId: 'command-1',
    });
    expect(calls.map((call) => call.url)).toEqual([
      'http://sandbox.example/api/v2/fleet/workloads',
      'http://sandbox.example/api/v2/fleet/workloads/child-1',
      'http://sandbox.example/api/v2/fleet/workloads/child-1',
    ]);
    expect(new Headers(calls[0]!.init!.headers).get('authorization')).toBe('Bearer management-token');
    const body = JSON.parse(String(calls[0]!.init!.body));
    expect(body.api_version).toBe('agentic-orchestration/v1');
    expect(body.lineage).toMatchObject({
      mission_id: 'mission-1',
      child_id: 'child-1',
      target_id: 'sandbox-target-1',
      idempotency_key: 'mission-1:child-1:dispatch',
      session_id: null,
      task_id: null,
      command_id: null,
    });
    expect(JSON.stringify(body)).not.toContain('management-token');
  });

  it('continues bounded polling through retryable typed backpressure', async () => {
    const responses = [
      { replayed: false, workload: workload({ observed_state: 'admitted', revision: 1 }) },
      workload({
        observed_state: 'blocked',
        revision: 2,
        backpressure: { reason: 'capacity', retryable: true },
      }),
      workload({ observed_state: 'running', revision: 3 }),
      workload({ observed_state: 'succeeded', revision: 4 }),
    ];
    let calls = 0;
    const client = new AgenticSandboxFleetClient({
      baseUrl: 'http://sandbox.example',
      token: 'token',
      pollIntervalMs: 0,
      maxPolls: 3,
      fetch: async () => {
        calls += 1;
        return new Response(JSON.stringify(responses.shift()), {
          status: calls === 1 ? 202 : 200,
          headers: { 'content-type': 'application/json' },
        });
      },
    });
    const retryPlan: FleetMissionPlan = {
      orchestratorId: 'aiwg-cockpit',
      missionId: 'mission-retry',
      goal: 'wait through bounded capacity pressure',
      completionCriterion: 'command succeeds',
      aggregation: { mode: 'all-pass' },
      cycles: [{ id: 'child-retry', runtime: 'codex', prompt: 'run', workloadKind: 'one-shot-command' }],
    };

    const ledger = await new FleetMissionConductor({ runWorker: client.runWorker })
      .conduct(retryPlan, [executor]);

    expect(calls).toBe(4);
    expect(ledger.cycles[0]!.staleEventRevisions).toEqual([]);
    expect(ledger.cycles[0]!.observedState).toBe('succeeded');
    expect(ledger.parentState).toBe('completed');
  });

  it('requests restart reconciliation without importing AIWG mission internals', async () => {
    let requestBody: unknown;
    const client = new AgenticSandboxFleetClient({
      baseUrl: 'http://sandbox.example',
      token: 'token',
      fetch: async (_input, init) => {
        requestBody = JSON.parse(String(init?.body));
        return new Response(JSON.stringify({
          document_type: 'reconciliation',
          api_version: 'agentic-orchestration/v1',
          before_revision: 4,
          after_revision: 7,
          rows: [{ child_id: 'child-1', classification: 're-adopted', observed_state: 'running', revision: 3 }],
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      },
    });
    const report = await client.reconcile(4, ['child-1']);
    expect(requestBody).toEqual({ before_revision: 4, child_ids: ['child-1'] });
    expect(report.rows[0]!.classification).toBe('re-adopted');
  });
});
