import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Ajv from 'ajv';
import { describe, expect, it } from 'vitest';
import compositionValidate from '../../../agentic/code/addons/composition-engine/commands/composition.mjs';
import {
  flowGraphSchema,
  normalizeFlowGraph,
  validateFlowGraph,
} from '../../../agentic/code/addons/composition-engine/lib/validator.mjs';

const ROOT = resolve('agentic/code/addons/composition-engine');
const FIXTURES = [
  'linear-flow',
  'parallel-fanout',
  'agent-tool-flow',
  'phased-multi-track',
  'lcm-4x5',
];

function fixture(name = 'linear-flow'): any {
  return JSON.parse(readFileSync(resolve(ROOT, 'fixtures', `${name}.json`), 'utf8'));
}

function codes(report: ReturnType<typeof validateFlowGraph>): string[] {
  return report.diagnostics.map((item: { code: string }) => item.code);
}

describe('composition-engine FlowGraph contract', () => {
  it('declares the Flow profile without a fourth-level DNS group', () => {
    const manifest = fixture();
    expect(manifest.apiVersion).toBe('flow.aiwg.io/v1alpha1');
    expect(manifest.apiVersion).not.toContain('graph.flow.aiwg.io');
    expect(manifest.kind).toBe('FlowGraph');
    expect(flowGraphSchema.$id).toContain('/flow/graph/v1alpha1/');
  });

  it('compiles the strict JSON Schema and validates every required fixture', () => {
    const validate = new Ajv({ allErrors: true, strict: false }).compile(flowGraphSchema);
    for (const name of FIXTURES) {
      const value = fixture(name);
      expect(validate(value), `${name}: ${JSON.stringify(validate.errors)}`).toBe(true);
      const report = validateFlowGraph(value);
      expect(report.valid, `${name}: ${JSON.stringify(report.diagnostics)}`).toBe(true);
    }
  });

  it('rejects unknown fields under the closed v1alpha1 contract', () => {
    const value = fixture();
    value.spec.provider = 'codex';
    const report = validateFlowGraph(value);
    expect(report.valid).toBe(false);
    expect(codes(report)).toContain('SCHEMA_INVALID');
  });

  it('rejects duplicate identifiers', () => {
    const value = fixture();
    value.spec.nodes.push(structuredClone(value.spec.nodes[0]));
    expect(codes(validateFlowGraph(value))).toContain('DUPLICATE_IDENTIFIER');
  });

  it('rejects unresolved stable index references with an actionable diagnostic', () => {
    const value = fixture();
    value.spec.candidates = [];
    const report = validateFlowGraph(value);
    expect(codes(report)).toContain('UNRESOLVED_INDEX_REFERENCE');
    expect(report.diagnostics.find((item: any) => item.code === 'UNRESOLVED_INDEX_REFERENCE')?.hint).toContain('authorized candidate');
  });

  it('can prove candidate IDs against a supplied AIWG index catalog', () => {
    const value = fixture();
    const present = new Set(value.spec.candidates.slice(0, 1).map((item: any) => item.id));
    expect(codes(validateFlowGraph(value, { catalogIds: present }))).toContain('UNRESOLVED_INDEX_REFERENCE');
    const complete = new Set(value.spec.candidates.map((item: any) => item.id));
    expect(validateFlowGraph(value, { catalogIds: complete }).valid).toBe(true);
  });

  it('rejects incompatible binding schemas', () => {
    const value = fixture();
    value.spec.nodes[1].inputs[0].schema = { type: 'number' };
    expect(codes(validateFlowGraph(value))).toContain('INCOMPATIBLE_SCHEMA');
  });

  it('rejects unreachable nodes', () => {
    const value = fixture();
    value.spec.routes = [];
    delete value.spec.nodes[1].dependsOn;
    expect(codes(validateFlowGraph(value))).toContain('UNREACHABLE_NODE');
  });

  it('rejects unbounded cycles and accepts a guarded finite feedback route', () => {
    const value = fixture();
    delete value.spec.nodes[1].dependsOn;
    value.spec.routes.push({ from: 'polish', to: 'draft' });
    expect(codes(validateFlowGraph(value))).toContain('UNBOUNDED_CYCLE');
    value.spec.routes[1].guard = { language: 'cel', expression: 'state.iterations < 3' };
    value.spec.routes[1].maxIterations = 3;
    expect(validateFlowGraph(value).valid).toBe(true);
  });

  it('rejects impossible joins, including an LCM beyond the activation ceiling', () => {
    const value = fixture('lcm-4x5');
    value.spec.ceilings.activations = 19;
    expect(codes(validateFlowGraph(value))).toContain('IMPOSSIBLE_JOIN');

    const fanout = fixture('parallel-fanout');
    fanout.spec.joins[0].policy = { mode: 'quorum', quorum: 3 };
    expect(codes(validateFlowGraph(fanout))).toContain('IMPOSSIBLE_JOIN');
  });

  it('rejects undeclared capabilities and permission widening', () => {
    const value = fixture();
    value.spec.nodes[0].capabilities = ['shell-write'];
    value.spec.nodes[0].permissions = ['filesystem:write'];
    const report = validateFlowGraph(value);
    expect(codes(report)).toContain('UNDECLARED_CAPABILITY');
    expect(codes(report)).toContain('PERMISSION_WIDENING');
  });

  it('rejects unsafe retry and exactly-once declarations', () => {
    const value = fixture();
    value.spec.nodes[0].sideEffectMode = 'approval-required';
    value.spec.nodes[0].retry = { limit: 1, backoff: 'none', on: ['failure'] };
    expect(codes(validateFlowGraph(value))).toContain('UNSAFE_RETRY_MODE');

    value.spec.nodes[0].sideEffectMode = 'exactly-once';
    delete value.spec.nodes[0].approvalGate;
    expect(codes(validateFlowGraph(value))).toContain('UNSAFE_SIDE_EFFECT_MODE');
  });

  it('requires deterministic function nodes', () => {
    const value = fixture('lcm-4x5');
    delete value.spec.nodes[0].deterministic;
    expect(codes(validateFlowGraph(value))).toContain('NONDETERMINISTIC_FUNCTION');
  });

  it('rejects incompatible state reducers and typed failure without a failure schema', () => {
    const value = fixture('agent-tool-flow');
    value.spec.state.fields[0].reducer = 'sum';
    expect(codes(validateFlowGraph(value))).toContain('INCOMPATIBLE_REDUCER');

    const linear = fixture();
    linear.spec.output.mode = 'typed-terminal-failure';
    expect(codes(validateFlowGraph(linear))).toContain('MISSING_FAILURE_SCHEMA');
  });

  it('normalizes one provider-neutral graph with graph, node, and edge identities', () => {
    const value = fixture();
    const normalized = normalizeFlowGraph(value);
    expect(normalized.contractVersion).toBe('composition.normalized.aiwg.io/v1alpha1');
    expect(normalized.identity.graphId).toBe('linear-flow');
    expect(normalized.identity.nodeIds).toEqual(['linear-flow:draft', 'linear-flow:polish']);
    expect(normalized.identity.edgeIds[0]).toContain('draft-to-polish');
    expect(JSON.stringify(normalized)).not.toContain('provider');

    const lcm = normalizeFlowGraph(fixture('lcm-4x5'));
    expect(lcm.identity.edgeIds).toHaveLength(2);
    expect(lcm.identity.edgeIds[0]).toContain('join:twentieth-activation');
  });

  it('exposes machine-readable CLI diagnostics and normalized output', async () => {
    const valid = await compositionValidate(
      [resolve(ROOT, 'fixtures', 'linear-flow.json'), '--format', 'json'],
      { cwd: process.cwd() },
    );
    expect(valid.exitCode).toBe(0);
    expect(JSON.parse(valid.message).valid).toBe(true);

    const invalid = await compositionValidate(
      [resolve(ROOT, 'fixtures', 'linear-flow.json'), '--catalog', resolve(ROOT, 'fixtures', 'empty-catalog.json'), '--format', 'json'],
      { cwd: process.cwd() },
    );
    expect(invalid.exitCode).toBe(1);
    expect(JSON.parse(invalid.message).diagnostics[0].code).toBe('UNRESOLVED_INDEX_REFERENCE');
  });

  it('registers CLI, schema, fixtures, and discovery metadata', () => {
    const manifest = JSON.parse(readFileSync(resolve(ROOT, 'manifest.json'), 'utf8'));
    expect(manifest.cli_commands.namespace).toBe('composition');
    expect(manifest.cli_commands.subcommands.validate.file).toBe('composition.mjs');
    expect(manifest.schemas).toContain('flow-graph.schema');
    expect(manifest.fixtures).toEqual(expect.arrayContaining(FIXTURES));
    expect(readFileSync(resolve(ROOT, 'types', 'flow-graph.generated.ts'), 'utf8')).toContain('export interface FlowGraph');
    expect(readFileSync(resolve(ROOT, 'skills', 'composition-validate', 'SKILL.md'), 'utf8')).toContain('validate a Flow graph');
  });
});
