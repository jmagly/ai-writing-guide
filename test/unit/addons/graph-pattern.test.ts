import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import graphValidate from '../../../agentic/code/addons/graph-pattern/commands/graph.mjs';
import graphExplain from '../../../agentic/code/addons/graph-pattern/commands/graph-explain.mjs';
import graphScaffold from '../../../agentic/code/addons/graph-pattern/commands/graph-scaffold.mjs';
import {
  projectGraphPlaybook,
  validateGraphPlaybook,
} from '../../../agentic/code/addons/graph-pattern/lib/validator.mjs';

const ROOT = resolve('agentic/code/addons/graph-pattern');
const FIXTURES = ['loop-with-approval', 'screen-fanout-synthesize', 'sandbox-task-with-retry', 'airflow-style-dag-subset', 'durable-code-node-with-metadata'];

function fixture(name = FIXTURES[0]): any {
  return JSON.parse(readFileSync(resolve(ROOT, 'fixtures', `${name}.json`), 'utf8'));
}

function codes(value: any): string[] {
  return validateGraphPlaybook(value).diagnostics.map((item: any) => item.code);
}

describe('graph.flow.aiwg.io GraphPlaybook profile', () => {
  it('uses the optional graph domain and reuses the FlowGraph substrate', () => {
    const graph = fixture();
    expect(graph.apiVersion).toBe('graph.flow.aiwg.io/v1');
    expect(graph.kind).toBe('GraphPlaybook');
    const flow = projectGraphPlaybook(graph);
    expect(flow.apiVersion).toBe('flow.aiwg.io/v1alpha1');
    expect(flow.kind).toBe('FlowGraph');
  });

  it('validates the required examples with stable graph/run/node/edge identity', () => {
    for (const name of FIXTURES) {
      const report = validateGraphPlaybook(fixture(name));
      expect(report.valid, `${name}: ${JSON.stringify(report.diagnostics)}`).toBe(true);
      expect(report.normalized.contractVersion).toBe('graph.flow.aiwg.io/v1');
      expect(report.normalized.identity.runId).toBeNull();
      expect(report.normalized.identity.nodeIds.every((id: string) => id.includes(':node:'))).toBe(true);
      expect(report.normalized.identity.edgeIds.every((id: string) => id.includes(':edge:'))).toBe(true);
    }
  });

  it('rejects duplicate node and edge identifiers through the inherited validator', () => {
    const graph = fixture();
    graph.spec.nodes.push(structuredClone(graph.spec.nodes[0]));
    graph.spec.routes.push(structuredClone(graph.spec.routes[0]));
    expect(codes(graph)).toContain('FLOW_DUPLICATE_IDENTIFIER');
  });

  it('rejects orphan nodes unless they are connected by the Flow topology', () => {
    const graph = fixture('screen-fanout-synthesize');
    graph.spec.entry = ['screen-a'];
    graph.spec.routes = graph.spec.routes.filter((route: any) => route.from !== 'screen-b');
    expect(codes(graph)).toContain('FLOW_UNREACHABLE_NODE');
  });

  it('requires a guard and finite ceiling on every cycle', () => {
    const graph = fixture();
    delete graph.spec.routes.find((route: any) => route.id === 'approval-to-rework').guard;
    delete graph.spec.routes.find((route: any) => route.id === 'approval-to-rework').maxIterations;
    expect(codes(graph)).toContain('FLOW_UNBOUNDED_CYCLE');
  });

  it('requires a reducer/join for multi-source fan-in', () => {
    const graph = fixture('screen-fanout-synthesize');
    graph.spec.joins = [];
    expect(codes(graph)).toContain('REDUCER_REQUIRED');
  });

  it('rejects an invalid route predicate using the inherited closed schema', () => {
    const graph = fixture();
    graph.spec.routes[1].when = { language: 'javascript', expression: 'process.exit()' };
    expect(codes(graph)).toContain('FLOW_SCHEMA_INVALID');
  });

  it('requires HITL responder, deadline, and approval/denial/timeout routes', () => {
    const graph = fixture();
    delete graph.spec.nodes.find((node: any) => node.id === 'approval').hitl;
    expect(codes(graph)).toContain('HITL_POLICY_REQUIRED');
  });

  it('rejects a HITL node without its required deadline', () => {
    const graph = fixture();
    delete graph.spec.nodes.find((node: any) => node.id === 'approval').hitl.deadline;
    expect(codes(graph)).toContain('GRAPH_SCHEMA_INVALID');
  });

  it('rejects retrying side effects without inherited idempotency safeguards', () => {
    const graph = fixture('sandbox-task-with-retry');
    graph.spec.nodes[0].sideEffectMode = 'exactly-once';
    delete graph.spec.nodes[0].idempotencyKey;
    expect(codes(graph)).toContain('FLOW_UNSAFE_SIDE_EFFECT_MODE');
  });

  it('emits stable machine-readable validation and explanation reports', async () => {
    const path = resolve(ROOT, 'fixtures', 'screen-fanout-synthesize.json');
    const validation = await graphValidate([path, '--format', 'json'], { cwd: process.cwd() });
    expect(validation.exitCode).toBe(0);
    expect(JSON.parse(validation.message).kind).toBe('GraphPlaybookValidationReport');
    const explanation = await graphExplain([path, '--format', 'json'], { cwd: process.cwd() });
    expect(explanation.exitCode).toBe(0);
    expect(JSON.parse(explanation.message).kind).toBe('GraphPlaybookExplanation');
  });

  it('scaffolds a valid project-local graph without overwriting', async () => {
    const cwd = mkdtempSync(resolve(tmpdir(), 'aiwg-graph-scaffold-'));
    try {
      const result = await graphScaffold(['sample-graph', '--template', 'sandbox-task-with-retry'], { cwd });
      expect(result.exitCode).toBe(0);
      const graphPath = resolve(cwd, '.aiwg/workflow/graph/sample-graph/graph.json');
      const graph = JSON.parse(readFileSync(graphPath, 'utf8'));
      expect(graph.metadata).toMatchObject({ name: 'sample-graph', graphId: 'sample-graph', graphVersion: '0.1.0' });
      expect(validateGraphPlaybook(graph).valid).toBe(true);
      expect(JSON.parse(readFileSync(resolve(cwd, '.aiwg/workflow/graph/sample-graph/state.schema.json'), 'utf8')).type).toBe('object');
      expect((await graphScaffold(['sample-graph'], { cwd })).exitCode).toBe(1);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
