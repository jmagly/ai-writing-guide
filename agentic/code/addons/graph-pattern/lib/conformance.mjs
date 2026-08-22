import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assessGraphReplay, dryRunGraphPlaybook, executeGraphPlaybook } from './runtime.mjs';
import { validateGraphPlaybook } from './validator.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = (name) => JSON.parse(fs.readFileSync(path.join(root, 'fixtures', `${name}.json`), 'utf8'));

function outputsFor(node, value = node.id) {
  return Object.fromEntries((node.outputs ?? []).map((output) => [
    output.name,
    output.schema?.type === 'integer' ? 1
      : output.schema?.type === 'array' ? [value]
        : output.schema?.type === 'object' ? { value }
          : String(value),
  ]));
}

function identity(report, fallback) {
  return {
    graphId: report?.graphId ?? fallback.metadata.graphId,
    runId: report?.runId ?? null,
    nodeIds: fallback.spec.nodes.map((node) => node.id),
    edgeIds: fallback.spec.routes.map((route) => route.id),
  };
}

async function caseResult(name, graph, execute) {
  try {
    const evidence = await execute();
    return { name, passed: true, identity: identity(evidence, graph), evidence };
  } catch (error) {
    return { name, passed: false, identity: identity(undefined, graph), error: { code: error.code ?? 'CONFORMANCE_CASE_FAILED', message: error.message } };
  }
}

export const GRAPH_CONFORMANCE_CASES = [
  'static-validation-failure',
  'success-path',
  'runtime-failure',
  'hitl-blocked',
  'hitl-denial',
  'guarded-cycle-exhaustion',
  'retry-exhaustion-fallback',
  'duplicate-idempotency-replay',
  'sandbox-disconnect',
  'budget-limit',
  'checkpoint-replay',
];

export async function runGraphConformance(options = {}) {
  const requested = options.fixture ? new Set([options.fixture]) : new Set(GRAPH_CONFORMANCE_CASES);
  const unknown = [...requested].filter((name) => !GRAPH_CONFORMANCE_CASES.includes(name));
  if (unknown.length) throw Object.assign(new Error(`Unknown graph conformance fixture '${unknown[0]}'.`), { code: 'UNKNOWN_FIXTURE' });
  const cases = [];
  const add = async (name, graph, run) => {
    if (requested.has(name)) cases.push(await caseResult(name, graph, run));
  };

  {
    const graph = load('loop-with-approval');
    delete graph.spec.routes.find((route) => route.id === 'approval-to-rework').guard;
    delete graph.spec.routes.find((route) => route.id === 'approval-to-rework').maxIterations;
    await add('static-validation-failure', graph, async () => {
      const report = validateGraphPlaybook(graph);
      if (report.valid || !report.diagnostics.some((item) => item.code === 'FLOW_UNBOUNDED_CYCLE')) throw new Error('Expected unbounded-cycle diagnostic.');
      return { ...report, expectedFailureObserved: true, graphId: graph.metadata.graphId, runId: null };
    });
  }

  {
    const graph = load('screen-fanout-synthesize');
    await add('success-path', graph, async () => {
      const dryRun = dryRunGraphPlaybook(graph, { runId: 'conformance-success-dry' });
      if (dryRun.sideEffectsExecuted) throw new Error('Dry-run executed side effects.');
      const report = await executeGraphPlaybook(graph, {
        runId: 'conformance-success',
        invokeNode: async ({ node, inputs }) => ({
          outputs: node.id === 'synthesize'
            ? { result: [...(inputs.left ?? []), ...(inputs.right ?? [])] }
            : outputsFor(node),
          usage: { tokens: 1, costUsd: 0, timeMs: 1 },
        }),
      });
      if (report.status !== 'completed') throw new Error(`Expected completion, got ${report.status}.`);
      return { ...report, dryRun };
    });
  }

  {
    const graph = load('screen-fanout-synthesize');
    await add('runtime-failure', graph, async () => {
      const report = await executeGraphPlaybook(graph, { runId: 'conformance-runtime-failure', invokeNode: async () => { throw Object.assign(new Error('injected runtime failure'), { code: 'INJECTED_FAILURE' }); } });
      if (report.status !== 'failed' || !report.trace.some((event) => event.code === 'INJECTED_FAILURE')) throw new Error('Runtime failure was not recorded.');
      return report;
    });
  }

  {
    const graph = load('loop-with-approval');
    await add('hitl-blocked', graph, async () => {
      const report = await executeGraphPlaybook(graph, {
        runId: 'conformance-hitl-blocked',
        invokeNode: async ({ node }) => ({ outputs: outputsFor(node), usage: { tokens: 1, costUsd: 0, timeMs: 1 } }),
      });
      if (!report.trace.some((event) => event.code === 'APPROVAL_REQUIRED')) throw new Error('Missing HITL decision did not block execution.');
      return report;
    });
  }

  {
    const graph = load('loop-with-approval');
    await add('hitl-denial', graph, async () => {
      const report = await executeGraphPlaybook(graph, {
        runId: 'conformance-hitl-denial', hitlDecisions: { approval: 'deny' },
        invokeNode: async ({ node, activation }) => ({ outputs: outputsFor(node, activation), usage: { tokens: 1, costUsd: 0, timeMs: 1 } }),
      });
      if (!report.trace.some((event) => event.routeId === 'approval-to-rework' && event.active)) throw new Error('Denied HITL route did not activate.');
      return report;
    });
  }

  {
    const graph = load('loop-with-approval');
    const feedback = graph.spec.routes.find((route) => route.id === 'approval-to-rework');
    feedback.guard = { language: 'cel', expression: 'true' };
    feedback.maxIterations = 2;
    await add('guarded-cycle-exhaustion', graph, async () => {
      const report = await executeGraphPlaybook(graph, {
        runId: 'conformance-cycle-exhaustion', hitlDecisions: { approval: 'deny' },
        invokeNode: async ({ node }) => ({ outputs: outputsFor(node), usage: { tokens: 1, costUsd: 0, timeMs: 1 } }),
      });
      if (!report.trace.some((event) => event.exhausted && event.routeId === feedback.id)) throw new Error('Cycle ceiling was not recorded.');
      return report;
    });
  }

  {
    const graph = load('sandbox-task-with-retry');
    await add('retry-exhaustion-fallback', graph, async () => {
      const report = await executeGraphPlaybook(graph, {
        runId: 'conformance-retry-exhaustion',
        invokeNode: async ({ node }) => {
          if (node.id === 'sandbox-task') throw Object.assign(new Error('transient sandbox timeout'), { code: 'TIMEOUT' });
          return { outputs: outputsFor(node, 'fallback'), usage: { tokens: 0, costUsd: 0, timeMs: 1 } };
        },
      });
      if (report.realizedResources.retries !== 2 || !report.trace.some((event) => event.type === 'fallback-started')) throw new Error('Retry exhaustion did not reach fallback.');
      return report;
    });
  }

  {
    const graph = load('sandbox-task-with-retry');
    await add('duplicate-idempotency-replay', graph, async () => {
      let calls = 0;
      const invokeNode = async ({ node }) => {
        calls += 1;
        return { outputs: outputsFor(node, 'receipt'), usage: { tokens: 1, costUsd: 0, timeMs: 1 } };
      };
      const first = await executeGraphPlaybook(graph, { runId: 'conformance-idempotency', invokeNode });
      const checkpoint = structuredClone(first.checkpoint);
      checkpoint.completed = checkpoint.completed.filter((id) => id !== 'sandbox-task');
      checkpoint.failed = [];
      const before = calls;
      const second = await executeGraphPlaybook(graph, { runId: 'conformance-idempotency', resumeFrom: checkpoint, invokeNode });
      if (calls !== before || !second.trace.some((event) => event.type === 'node-replayed')) throw new Error('Duplicate idempotency key invoked side effect again.');
      return second;
    });
  }

  {
    const graph = load('sandbox-task-with-retry');
    graph.spec.failure = { onNodeFailure: 'fail', maxFailures: 0 };
    delete graph.spec.nodes[0].fallback;
    await add('sandbox-disconnect', graph, async () => {
      const report = await executeGraphPlaybook(graph, { runId: 'conformance-sandbox-disconnect', invokeNode: async () => { throw Object.assign(new Error('sandbox state unknown after disconnect'), { code: 'SANDBOX_DISCONNECTED' }); } });
      if (!report.trace.some((event) => event.code === 'SANDBOX_DISCONNECTED')) throw new Error('Sandbox disconnect was not preserved.');
      return report;
    });
  }

  {
    const graph = load('screen-fanout-synthesize');
    await add('budget-limit', graph, async () => {
      const report = await executeGraphPlaybook(graph, { runId: 'conformance-budget-limit', invokeNode: async ({ node }) => ({ outputs: outputsFor(node), usage: { tokens: graph.spec.ceilings.tokens + 1, costUsd: 0, timeMs: 1 } }) });
      if (!report.trace.some((event) => event.code === 'RESOURCE_CEILING_WOULD_EXCEED')) throw new Error('Budget violation was not recorded.');
      return report;
    });
  }

  {
    const graph = load('screen-fanout-synthesize');
    await add('checkpoint-replay', graph, async () => {
      let calls = 0;
      const invokeNode = async ({ node, inputs }) => {
        calls += 1;
        return { outputs: node.id === 'synthesize' ? { result: [...(inputs.left ?? []), ...(inputs.right ?? [])] } : outputsFor(node), usage: { tokens: 1, costUsd: 0, timeMs: 1 } };
      };
      const first = await executeGraphPlaybook(graph, { runId: 'conformance-checkpoint', invokeNode });
      const assessment = assessGraphReplay(graph, first.checkpoint);
      const before = calls;
      const replay = await executeGraphPlaybook(graph, { runId: 'conformance-checkpoint', resumeFrom: assessment.resumeFrom, invokeNode });
      if (!assessment.replayable || calls !== before || JSON.stringify(replay.output) !== JSON.stringify(first.output)) throw new Error('Checkpoint replay was not deterministic.');
      return { ...replay, replayAssessment: assessment };
    });
  }

  return {
    schemaVersion: 'graph.flow.aiwg.io/v1',
    kind: 'GraphConformanceReport',
    profile: 'aiwg-fast',
    externalProfile: 'roctinam/agentic-sandbox-conformance#4',
    passed: cases.every((item) => item.passed),
    total: cases.length,
    passedCount: cases.filter((item) => item.passed).length,
    failedCount: cases.filter((item) => !item.passed).length,
    cases,
  };
}
