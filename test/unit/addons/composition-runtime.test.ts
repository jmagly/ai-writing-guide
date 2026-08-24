import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  executeFlowGraph,
  FlowGraphRuntimeError,
} from '../../../agentic/code/addons/composition-engine/lib/runtime.mjs';
import compositionRun from '../../../agentic/code/addons/composition-engine/commands/composition-run.mjs';

const ROOT = resolve('agentic/code/addons/composition-engine');

function fixture(name = 'linear-flow'): any {
  return JSON.parse(readFileSync(resolve(ROOT, 'fixtures', `${name}.json`), 'utf8'));
}

function valuesFor(node: any, value: unknown): Record<string, unknown> {
  return Object.fromEntries(node.outputs.map((output: any) => [output.name, value]));
}

const echoAdapter = async ({ node, inputs, activation }: any) => ({
  outputs: Object.fromEntries(node.outputs.map((output: any) => [
    output.name,
    output.schema.type === 'integer' ? activation
      : output.schema.type === 'array' ? [node.id]
        : output.schema.type === 'object' ? { node: node.id, inputs }
          : `${node.id}:${Object.values(inputs).join('|')}`,
  ])),
  usage: { tokens: 10, costUsd: 0.01, timeMs: 2 },
});

describe('composition-engine deterministic runtime', () => {
  it('replays a linear graph with identical activation, route, and join order', async () => {
    const first = await executeFlowGraph(fixture(), { runId: 'replay', adapterId: 'codex', invokeNode: echoAdapter });
    const second = await executeFlowGraph(fixture(), { runId: 'replay', adapterId: 'codex', invokeNode: echoAdapter });
    expect(first.status).toBe('completed');
    expect(second.trace).toEqual(first.trace);
    expect(first.trace.filter((event: any) => event.type === 'node-started').map((event: any) => event.nodeId)).toEqual(['draft', 'polish']);
  });

  it('runs same-phase tracks through parallel-dispatch but commits in stable plan order', async () => {
    const graph = fixture('phased-multi-track');
    const report = await executeFlowGraph(graph, {
      runId: 'parallel',
      invokeNode: echoAdapter,
      parallelDispatch: async (requests: any[], invoke: any) => Promise.all(
        requests.map(async (request) => {
          if (request.node.id === 'architecture') await new Promise((done) => setTimeout(done, 10));
          return invoke(request);
        }),
      ),
    });
    const completed = report.trace.filter((event: any) => event.type === 'node-completed').map((event: any) => event.nodeId);
    expect(completed).toEqual(['intake', 'architecture', 'security', 'decision']);
    expect(report.realizedResources.maxConcurrency).toBe(2);
  });

  it('synchronizes period-four and period-five sources at activation 20', async () => {
    const report = await executeFlowGraph(fixture('lcm-4x5'), { runId: 'lcm', invokeNode: echoAdapter });
    const joined = report.trace.find((event: any) => event.type === 'join-evaluated' && event.satisfied);
    expect(joined).toMatchObject({ joinId: 'twentieth-activation', activation: 20, policy: 'lcm', reason: 'lcm:20' });
    expect(report.output).toBe(20);
    expect(report.realizedResources.activations).toBe(20);
  });

  it('stops a converged join as soon as its typed state threshold is met', async () => {
    const graph = fixture();
    graph.spec.state.fields = [{ name: 'iterations', schema: { type: 'integer' }, reducer: 'sum', initial: 0 }];
    graph.spec.nodes[0].outputs[0].schema = { type: 'integer' };
    graph.spec.nodes[0].outputs[0].state = 'iterations';
    graph.spec.nodes[1].inputs = [{ name: 'iterations', schema: { type: 'integer' }, state: 'iterations' }];
    graph.spec.routes = [];
    delete graph.spec.nodes[1].dependsOn;
    graph.spec.joins = [{
      id: 'quality-threshold',
      sources: ['draft'],
      target: 'polish',
      policy: { mode: 'converged', predicate: { language: 'cel', expression: 'state.iterations >= 3' }, maxIterations: 7 },
    }];
    const report = await executeFlowGraph(graph, {
      runId: 'converged',
      invokeNode: async ({ node, inputs }: any) => ({
        outputs: node.id === 'draft' ? valuesFor(node, 1) : valuesFor(node, `iterations:${inputs.iterations}`),
        usage: { tokens: 1, costUsd: 0, timeMs: 1 },
      }),
    });
    expect(report.status).toBe('completed');
    expect(report.state.iterations).toBe(3);
    expect(report.trace.find((event: any) => event.type === 'join-evaluated' && event.satisfied)).toMatchObject({ iteration: 3, reason: 'converged' });
  });

  it('executes guarded feedback and stops at the declared cycle ceiling', async () => {
    const graph = fixture();
    graph.spec.ceilings.activations = 10;
    graph.spec.state.fields = [{ name: 'iterations', schema: { type: 'integer' }, reducer: 'sum', initial: 0 }];
    graph.spec.nodes[0].outputs.push({ name: 'iteration', schema: { type: 'integer' }, state: 'iterations' });
    graph.spec.routes.push({
      id: 'polish-to-draft', from: 'polish', to: 'draft',
      guard: { language: 'cel', expression: 'true' }, maxIterations: 2,
    });
    const report = await executeFlowGraph(graph, {
      runId: 'guarded-cycle',
      invokeNode: async (request: any) => {
        const result = await echoAdapter(request);
        if (request.node.id === 'draft') result.outputs.iteration = 1;
        return result;
      },
    });
    expect(report.status).toBe('failed');
    expect(report.stopReason).toContain('exhausted maxIterations 2');
    expect(report.state.iterations).toBe(3);
    expect(report.trace.filter((event: any) => event.type === 'node-completed' && event.nodeId === 'draft')).toHaveLength(3);
    expect(report.trace.find((event: any) => event.type === 'route-evaluated' && event.exhausted)).toMatchObject({ routeId: 'polish-to-draft', iteration: 2, maxIterations: 2 });
  });

  it('stops a guarded cycle before its budget ceiling when progress is flat', async () => {
    const graph = fixture('human-decision-cycle');
    const first = await executeFlowGraph(graph, {
      runId: 'flat-progress',
      invokeNode: async ({node}: any) => ({outputs: valuesFor(node, node.id === 'check' ? 2 : 1), usage: {tokens: 1, costUsd: 0, timeMs: 1}}),
    });
    expect(first.status).toBe('paused');
    const resumed = await executeFlowGraph(graph, {
      runId: 'flat-progress', resumeFrom: first.checkpoint, approvedGates: ['approve'],
      invokeNode: async ({node}: any) => ({outputs: valuesFor(node, node.id === 'check' ? 2 : 1), usage: {tokens: 1, costUsd: 0, timeMs: 1}}),
    });
    expect(resumed.status).toBe('failed');
    expect(resumed.stopReason).toContain('did not strictly decrease');
    expect(resumed.realizedResources.activations).toBeLessThan(graph.spec.ceilings.activations);
    expect(resumed.trace.find((event: any) => event.type === 'route-evaluated' && event.progress?.progressed === false)).toBeTruthy();
  });

  it('pauses approval-required work, resumes from checkpoint, and supports operator cancellation', async () => {
    const graph = fixture('human-decision-cycle');
    const first = await executeFlowGraph(graph, {
      runId: 'human-decision',
      invokeNode: async ({node}: any) => ({outputs: valuesFor(node, 2), usage: {tokens: 1, costUsd: 0, timeMs: 1}}),
    });
    expect(first.status).toBe('paused');
    expect(first.trace.some((event: any) => event.type === 'run-paused' && event.nodeId === 'approve')).toBe(true);

    const waiting = [1, 0];
    const resumed = await executeFlowGraph(graph, {
      runId: 'human-decision', resumeFrom: first.checkpoint, approvedGates: ['approve'],
      invokeNode: async ({node}: any) => ({
        outputs: valuesFor(node, node.id === 'check' ? waiting.shift() : 1),
        usage: {tokens: 1, costUsd: 0, timeMs: 1},
      }),
    });
    expect(resumed.status).toBe('completed');
    expect(resumed.output).toBe(0);

    const cancelled = await executeFlowGraph(graph, {
      runId: 'human-decision', resumeFrom: first.checkpoint, cancelledGates: ['approve'],
      invokeNode: echoAdapter,
    });
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.stopReason).toContain('cancelled');
  });

  it('honors an operator stop before invoking any node', async () => {
    let calls = 0;
    const report = await executeFlowGraph(fixture(), {
      operatorAction: 'stop',
      invokeNode: async (request: any) => { calls += 1; return echoAdapter(request); },
    });
    expect(report.status).toBe('cancelled');
    expect(report.stopReason).toBe('operator requested stop');
    expect(calls).toBe(0);
  });

  it('never exceeds a convergence hard ceiling and returns the declared partial shape', async () => {
    const graph = fixture();
    graph.spec.ceilings.activations = 3;
    graph.spec.state.fields = [{ name: 'iterations', schema: { type: 'integer' }, reducer: 'sum', initial: 0 }];
    graph.spec.nodes[0].outputs[0].schema = { type: 'integer' };
    graph.spec.nodes[0].outputs[0].state = 'iterations';
    graph.spec.nodes[1].inputs = [{ name: 'iterations', schema: { type: 'integer' }, state: 'iterations' }];
    graph.spec.routes = [];
    delete graph.spec.nodes[1].dependsOn;
    graph.spec.joins = [{
      id: 'never', sources: ['draft'], target: 'polish',
      policy: { mode: 'converged', predicate: { language: 'cel', expression: 'state.iterations >= 99' }, maxIterations: 9 },
    }];
    graph.spec.failure = { onNodeFailure: 'partial-synthesis', maxFailures: 1 };
    graph.spec.output.mode = 'final-only';
    const report = await executeFlowGraph(graph, {
      invokeNode: async ({ node }: any) => ({ outputs: valuesFor(node, 1), usage: { tokens: 1, costUsd: 0, timeMs: 1 } }),
    });
    expect(report.status).toBe('partial');
    expect(report.realizedResources.activations).toBe(3);
    expect(report.output).toMatchObject({ partial: true, stopReason: expect.stringContaining('join') });
  });

  it('returns typed terminal failure when an adapter would exceed a budget', async () => {
    const graph = fixture();
    graph.spec.ceilings.costUsd = 0.5;
    graph.spec.output.mode = 'typed-terminal-failure';
    graph.spec.output.failureSchema = { type: 'object', required: ['code'] };
    const report = await executeFlowGraph(graph, {
      invokeNode: async ({ node }: any) => ({ outputs: valuesFor(node, 'x'), usage: { tokens: 0, costUsd: 0.6, timeMs: 0 } }),
    });
    expect(report.status).toBe('failed');
    expect(report.output.code).toBe('RESOURCE_CEILING_WOULD_EXCEED');
    expect(report.realizedResources.costUsd).toBe(0);
  });

  it('executes a budget join with a deterministic budget stop reason', async () => {
    const graph = fixture();
    graph.spec.routes = [];
    delete graph.spec.nodes[1].dependsOn;
    graph.spec.joins = [{ id: 'bounded', sources: ['draft'], target: 'polish', policy: { mode: 'budget', maxCostUsd: 0.02 } }];
    const report = await executeFlowGraph(graph, { invokeNode: echoAdapter });
    expect(report.status).toBe('completed');
    expect(report.trace.find((event: any) => event.type === 'join-evaluated' && event.satisfied)).toMatchObject({
      joinId: 'bounded', iteration: 2, reason: 'budget-reached',
    });
  });

  it('skips a declared optional failure and continues independent work', async () => {
    const graph = fixture();
    graph.spec.entry = ['draft', 'polish'];
    graph.spec.routes = [];
    graph.spec.nodes[0].optional = true;
    delete graph.spec.nodes[1].dependsOn;
    graph.spec.nodes[1].inputs = [{ name: 'draft', schema: { type: 'string' }, value: 'fallback input' }];
    graph.spec.failure = { onNodeFailure: 'skip-optional', maxFailures: 1 };
    const report = await executeFlowGraph(graph, {
      invokeNode: async (request: any) => {
        if (request.node.id === 'draft') throw new Error('optional failure');
        return echoAdapter(request);
      },
    });
    expect(report.status).toBe('completed');
    expect(report.trace.some((event: any) => event.type === 'node-skipped' && event.nodeId === 'draft')).toBe(true);
  });

  it('reuses one stable invocation key across a bounded exactly-once retry', async () => {
    const graph = fixture();
    graph.spec.nodes[0].sideEffectMode = 'exactly-once';
    graph.spec.nodes[0].idempotencyKey = 'create-draft';
    graph.spec.nodes[0].retry = { limit: 1, backoff: 'none', on: ['failure'] };
    const keys: string[] = [];
    let attempts = 0;
    const report = await executeFlowGraph(graph, {
      invokeNode: async (request: any) => {
        keys.push(request.invocationKey);
        attempts += 1;
        if (attempts === 1) throw new Error('injected transient failure');
        return echoAdapter(request);
      },
    });
    expect(report.status).toBe('completed');
    expect(keys[0]).toBe(keys[1]);
    expect(report.realizedResources.retries).toBe(1);
    expect(Object.keys(report.checkpoint.receipts)).toEqual([keys[0]]);
  });

  it('records duplicate exactly-once attempts and suppressions without exposing the declared key', async () => {
    const graph = fixture();
    graph.spec.ceilings.activations = 10;
    graph.spec.nodes[0].sideEffectMode = 'exactly-once';
    graph.spec.nodes[0].idempotencyKey = 'private-business-key';
    graph.spec.routes.push({id: 'repeat', from: 'polish', to: 'draft', guard: {language: 'cel', expression: 'true'}, maxIterations: 1});
    const report = await executeFlowGraph(graph, {invokeNode: echoAdapter});
    expect(report.evidence.sideEffects.draft).toMatchObject({attempts: 2, duplicateDetections: 1, suppressions: 1});
    expect(report.trace.some((event: any) => event.type === 'node-replayed' && event.suppressed)).toBe(true);
    expect(JSON.stringify(report)).not.toContain('private-business-key');
  });

  it('fails closed before adapter invocation when runtime authority is narrower', async () => {
    const graph = fixture('agent-tool-flow');
    const called: string[] = [];
    const report = await executeFlowGraph(graph, {
      allowedCapabilities: [],
      allowedPermissions: [],
      invokeNode: async (request: any) => {
        called.push(request.node.id);
        return echoAdapter(request);
      },
    });
    expect(report.status).toBe('failed');
    expect(called).not.toContain('execute');
    expect(report.trace.some((event: any) => event.code === 'CAPABILITY_DENIED')).toBe(true);
  });

  it('records requested versus realized resources and redacts configured full-I/O paths', async () => {
    const graph = fixture();
    graph.spec.trace = { level: 'full-io', redact: ['/topic/secret'] };
    graph.spec.nodes[0].inputs[0] = { name: 'topic', schema: { type: 'object' }, value: { secret: 'token', public: 'ok' } };
    const report = await executeFlowGraph(graph, {
      invokeNode: async ({ node }: any) => ({ outputs: valuesFor(node, 'safe'), usage: { tokens: 4, costUsd: 0.1, timeMs: 3 } }),
    });
    expect(report.requestedResources).toEqual(graph.spec.ceilings);
    expect(report.realizedResources).toMatchObject({ tokens: 8, costUsd: 0.2, timeMs: 6 });
    expect(JSON.stringify(report.trace)).not.toContain('"secret":"token"');
    expect(JSON.stringify(report.trace)).toContain('[REDACTED]');
  });

  it('records declared versus observed scope, empty coverage, and observation limitations', async () => {
    const graph = fixture();
    graph.spec.nodes[0].scope = {files: ['a.md', 'b.md'], resources: ['repo:read']};
    graph.spec.nodes[1].scope = {files: ['result.md']};
    const report = await executeFlowGraph(graph, {
      invokeNode: async ({node}: any) => ({
        outputs: valuesFor(node, 'safe'), usage: {tokens: 1, costUsd: 0, timeMs: 1},
        observedTouches: node.id === 'draft' ? {files: ['a.md', 'outside.md'], resources: ['repo:read']} : {},
        observationComplete: node.id === 'draft',
      }),
    });
    expect(report.evidence.nodes.draft.scope).toMatchObject({
      files: {undeclared: ['outside.md'], unobserved: ['b.md']},
      resources: {undeclared: [], unobserved: []},
      observationComplete: true,
    });
    expect(report.evidence.nodes.polish.scope).toMatchObject({coverage: 'empty', observationComplete: false});
  });

  it('attributes resources per node, branch, and join', async () => {
    const report = await executeFlowGraph(fixture('phased-multi-track'), {
      invokeNode: echoAdapter,
      parallelDispatch: async (requests: any[], invoke: any) => Promise.all(requests.map(invoke)),
    });
    expect(report.evidence.nodes.architecture.resources).toEqual({runs: 1, tokens: 10, costUsd: 0.01, timeMs: 2});
    expect(report.evidence.branches.architecture.timeMs).toBe(2);
    expect(report.evidence.branches.security.timeMs).toBe(2);
    expect(report.evidence.joins['analysis-quorum']).toMatchObject({
      sources: ['architecture', 'security'], resources: {runs: 2, tokens: 20, costUsd: 0.02, timeMs: 4},
    });
  });

  it('keeps core semantics equivalent across the Codex and Claude Code adapters', async () => {
    const reports = await Promise.all(['codex', 'claude-code'].map((adapterId) => (
      executeFlowGraph(fixture(), { runId: 'provider-conformance', adapterId, invokeNode: echoAdapter })
    )));
    const semantics = reports.map((report) => report.trace.map(({ type, nodeId, activation, active }: any) => ({ type, nodeId, activation, active })));
    expect(semantics[1]).toEqual(semantics[0]);
    expect(reports[0].output).toEqual(reports[1].output);
    expect(JSON.stringify(fixture())).not.toContain('provider');
  });

  it('resumes a completed checkpoint without re-invoking nodes', async () => {
    const first = await executeFlowGraph(fixture(), { runId: 'resume', invokeNode: echoAdapter });
    let calls = 0;
    const resumed = await executeFlowGraph(fixture(), {
      runId: 'resume',
      resumeFrom: first.checkpoint,
      invokeNode: async (request: any) => {
        calls += 1;
        return echoAdapter(request);
      },
    });
    expect(calls).toBe(0);
    expect(resumed.status).toBe('completed');
    expect(resumed.output).toEqual(first.output);
  });

  it('rejects execution without an explicit adapter seam', async () => {
    await expect(executeFlowGraph(fixture())).rejects.toMatchObject<Partial<FlowGraphRuntimeError>>({ code: 'ADAPTER_REQUIRED' });
  });

  it('exposes machine-readable CLI execution and atomic checkpoint output', async () => {
    const directory = mkdtempSync(resolve(tmpdir(), 'aiwg-composition-runtime-'));
    try {
      const checkpoint = resolve(directory, 'checkpoint.json');
      const result = await compositionRun([
        resolve(ROOT, 'fixtures', 'linear-flow.json'),
        '--format', 'json',
        '--run-id', 'cli-run',
        '--checkpoint', checkpoint,
      ], {
        cwd: process.cwd(),
        compositionAdapter: { id: 'test', invokeNode: echoAdapter },
      });
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.message)).toMatchObject({
        schemaVersion: 'flow.aiwg.io/v1alpha1',
        kind: 'FlowGraphRunReport',
        runId: 'cli-run',
        status: 'completed',
      });
      expect(JSON.parse(readFileSync(checkpoint, 'utf8'))).toMatchObject({
        schemaVersion: 'flow.aiwg.io/v1alpha1',
        kind: 'FlowGraphCheckpoint',
        runId: 'cli-run',
      });

      const missing = await compositionRun([resolve(ROOT, 'fixtures', 'linear-flow.json'), '--format', 'json'], { cwd: process.cwd() });
      expect(missing.exitCode).toBe(2);
      expect(JSON.parse(missing.message).code).toBe('ADAPTER_REQUIRED');
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
