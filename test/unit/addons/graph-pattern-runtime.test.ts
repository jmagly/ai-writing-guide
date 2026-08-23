import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  assessGraphReplay,
  dryRunGraphPlaybook,
  executeGraphPlaybook,
} from '../../../agentic/code/addons/graph-pattern/lib/runtime.mjs';

const ROOT = resolve('agentic/code/addons/graph-pattern');
function fixture(name: string): any {
  return JSON.parse(readFileSync(resolve(ROOT, 'fixtures', `${name}.json`), 'utf8'));
}

describe('GraphPlaybook planning, execution projection, and replay', () => {
  it('dispatches the mixed-runtime fixture through one unchanged adapter contract', async () => {
    const manifest = fixture('mixed-runtime-dispatch');
    const bindings: string[] = [];
    const report = await executeGraphPlaybook(manifest, {
      runId: 'mixed-1', hitlDecisions: { approval: 'approve' },
      invokeNode: async ({ node, profileNode }: any) => {
        bindings.push(profileNode.runtimeBinding);
        const outputs = Object.fromEntries(node.outputs.map((output: any) => [output.name,
          output.schema.type === 'object' ? {} : output.name === 'result' ? 'approved' : 'value']));
        return { outputs, usage: { tokens: 1, costUsd: 0, timeMs: 1 } };
      },
    });
    expect(report.status).toBe('completed');
    expect(bindings).toEqual(['flow-capability', 'rlm', 'a2a-sandbox', 'hitl', 'terminal']);
  });

  it('dry-runs deterministically without invoking side effects', () => {
    const manifest = fixture('sandbox-task-with-retry');
    const first = dryRunGraphPlaybook(manifest, { runId: 'dry-1' });
    const second = dryRunGraphPlaybook(manifest, { runId: 'dry-1' });
    expect(first).toEqual(second);
    expect(first.sideEffectsExecuted).toBe(false);
    expect(first.runnableNodeIds).toEqual(['sandbox-task']);
    expect(first.nodes[0]).toMatchObject({ nodeRunId: 'dry-1:sandbox-task', runtimeBinding: 'a2a-sandbox', retryLimit: 2 });
    expect(first.routes[0]).toMatchObject({ edgeId: 'sandbox-success', evidenceField: '/sandbox/evidence' });
  });

  it('projects mixed node metadata through the existing Flow runtime', async () => {
    const manifest = fixture('screen-fanout-synthesize');
    const invocations: any[] = [];
    const events: any[] = [];
    const report = await executeGraphPlaybook(manifest, {
      runId: 'run-42',
      invokeNode: vi.fn(async (request: any) => {
        invocations.push(request);
        if (request.node.id === 'screen-a') return { outputs: { findings: ['a'] }, usage: { tokens: 1 } };
        if (request.node.id === 'screen-b') return { outputs: { findings: ['b'] }, usage: { tokens: 1 } };
        return { outputs: { result: [...request.inputs.left, ...request.inputs.right] }, usage: { tokens: 0 } };
      }),
      onGraphEvent: (event: any) => events.push(event),
    });
    expect(report.kind).toBe('GraphRunReport');
    expect(report.runId).toBe('run-42');
    expect(invocations.map((item) => item.profileNode.runtimeBinding)).toEqual(expect.arrayContaining(['flow-capability', 'rlm', 'terminal']));
    expect(invocations.every((item) => item.graphMetadata.graphId === 'examples/screen-fanout-synthesize')).toBe(true);
    expect(invocations.find((item) => item.node.id === 'synthesize').graphMetadata).toMatchObject({ edgeId: 'b-to-synthesis', nodeId: 'synthesize' });
    expect(events.some((event) => event.type === 'route-evaluated' && event.edgeId
      && event.routeReason === 'predicate and guard matched'
      && event.routeEvidence?.evidenceField === '/screens/a')).toBe(true);
    expect(events.every((event) => event.graphId === 'examples/screen-fanout-synthesize')).toBe(true);
    expect(report.checkpoint).toMatchObject({ kind: 'GraphPlaybookCheckpoint', graphId: 'examples/screen-fanout-synthesize' });
  });

  it('explains incompatible checkpoints and accepts complete compatible checkpoints', () => {
    const manifest = fixture('sandbox-task-with-retry');
    const incompatible = assessGraphReplay(manifest, { graphId: 'other', runId: 'old' });
    expect(incompatible.replayable).toBe(false);
    expect(incompatible.reasons.join(' ')).toContain('does not match');
    const compatible = assessGraphReplay(manifest, {
      graphId: 'examples/sandbox-task-with-retry',
      graphVersion: manifest.metadata.graphVersion,
      runId: 'old-run',
      state: {},
      events: [],
    });
    expect(compatible.replayable).toBe(true);
    expect(compatible.resumeFrom.runId).toBe('old-run');
  });

  it('fails closed before dispatch on widened authority and incompatible replay', async () => {
    const manifest = fixture('sandbox-task-with-retry');
    manifest.spec.failure = { onNodeFailure: 'fail', maxFailures: 0 };
    delete manifest.spec.nodes[0].fallback;
    const invokeNode = vi.fn(async () => ({ outputs: {}, usage: {} }));
    const denied = await executeGraphPlaybook(manifest, {
      runId: 'authority-denied',
      allowedCapabilities: [],
      allowedPermissions: [],
      invokeNode,
    });
    expect(denied.status).toBe('failed');
    expect(denied.trace.some((event: any) => ['CAPABILITY_DENIED', 'PERMISSION_DENIED'].includes(event.code))).toBe(true);
    expect(invokeNode).not.toHaveBeenCalled();

    await expect(executeGraphPlaybook(manifest, {
      runId: 'new-run',
      resumeFrom: { graphId: manifest.metadata.graphId, graphVersion: 'tampered', runId: 'old-run', state: {}, events: [] },
      invokeNode,
    })).rejects.toMatchObject({ code: 'CHECKPOINT_RESTORE_REJECTED' });
  });

  it('fails closed when a route predicate evaluator fails', async () => {
    const manifest = fixture('screen-fanout-synthesize');
    await expect(executeGraphPlaybook(manifest, {
      runId: 'predicate-failure',
      evaluatePredicate: async () => { throw Object.assign(new Error('predicate unavailable'), { code: 'ROUTE_PREDICATE_FAILURE' }); },
      invokeNode: async ({ node }: any) => ({
        outputs: Object.fromEntries(node.outputs.map((output: any) => [output.name, output.schema.type === 'array' ? [] : 'value'])),
        usage: { tokens: 0, costUsd: 0, timeMs: 0 },
      }),
    })).rejects.toMatchObject({ code: 'ROUTE_PREDICATE_FAILURE' });
  });

  it('projects a denied HITL decision onto the declared guarded rework route', async () => {
    const manifest = fixture('loop-with-approval');
    const report = await executeGraphPlaybook(manifest, {
      runId: 'hitl-denied',
      hitlDecisions: { approval: 'deny' },
      invokeNode: async ({ node, activation }: any) => ({
        outputs: Object.fromEntries(node.outputs.map((output: any) => [
          output.name,
          output.schema.type === 'integer' ? activation : `${node.id}:${activation}`,
        ])),
        usage: { tokens: 1, costUsd: 0, timeMs: 1 },
      }),
    });
    expect(report.trace.some((event: any) => event.type === 'route-evaluated' && event.routeId === 'approval-to-rework' && event.active)).toBe(true);
    expect(report.status).toBe('failed');
    expect(report.stopReason).toContain('HITL denial routed through guarded rework');
  });
});
