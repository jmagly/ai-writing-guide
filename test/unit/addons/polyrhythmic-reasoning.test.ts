import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { executeFlowGraph } from '../../../agentic/code/addons/composition-engine/lib/runtime.mjs';
import {
  buildPolyrhythmicGraph,
  createPolyrhythmicConformanceAdapter,
  polyrhythmicProfiles,
  polyrhythmicSafeDomains,
  validatePolyrhythmicScenario,
} from '../../../agentic/code/addons/composition-engine/lib/polyrhythmic-reasoning.mjs';
import { validateFlowGraph } from '../../../agentic/code/addons/composition-engine/lib/validator.mjs';

const ROOT = resolve('agentic/code/addons/composition-engine');
const EXAMPLES = [
  'technical-troubleshooting',
  'conceptual-explanation',
  'practical-planning',
  'theoretical-comparison',
];

function example(name = 'technical-troubleshooting'): any {
  return JSON.parse(readFileSync(resolve(ROOT, 'examples', `polyrhythmic-${name}.json`), 'utf8'));
}

describe('polyrhythmic-reasoning composition pattern', () => {
  it('ships strict-lcm and adaptive as valid FlowGraph profiles with the same phase contract', () => {
    expect(polyrhythmicProfiles).toEqual(['strict-lcm', 'adaptive']);
    const strict = buildPolyrhythmicGraph(example());
    const adaptive = buildPolyrhythmicGraph(example('practical-planning'));
    expect(validateFlowGraph(strict).valid).toBe(true);
    expect(validateFlowGraph(adaptive).valid).toBe(true);
    expect(strict.apiVersion).toBe('flow.aiwg.io/v1alpha1');
    expect(strict.apiVersion).not.toContain('graph.flow.aiwg.io');
    expect(strict.spec.nodes.map((node: any) => [node.id, node.phase, node.track])).toEqual(
      adaptive.spec.nodes.map((node: any) => [node.id, node.phase, node.track]),
    );
  });

  it('aligns the strict four/five profile exactly at activation 20', async () => {
    const graph = buildPolyrhythmicGraph(example());
    const adapter = createPolyrhythmicConformanceAdapter();
    const report = await executeFlowGraph(graph, { ...adapter, runId: 'strict-proof' });
    expect(report.status).toBe('completed');
    expect(report.realizedResources.activations).toBe(20);
    expect(report.trace.find((event: any) => event.type === 'join-evaluated' && event.satisfied)).toMatchObject({
      joinId: 'four-five-alignment', activation: 20, reason: 'lcm:20',
    });
  });

  it('stops the adaptive profile early at typed convergence under its hard ceiling', async () => {
    const graph = buildPolyrhythmicGraph(example('practical-planning'));
    const adapter = createPolyrhythmicConformanceAdapter({ convergeAt: 2 });
    const report = await executeFlowGraph(graph, { ...adapter, runId: 'adaptive-proof' });
    expect(report.status).toBe('completed');
    expect(report.realizedResources.activations).toBe(2);
    expect(report.realizedResources.activations).toBeLessThanOrEqual(graph.spec.ceilings.activations);
    expect(report.trace.find((event: any) => event.type === 'join-evaluated' && event.satisfied)).toMatchObject({ reason: 'converged', iteration: 2 });
  });

  it('preserves unknown user state without user-stated evidence', async () => {
    const scenario = example('practical-planning');
    scenario.statedUserState = 'stated-practitioner';
    scenario.classificationEvidence = [];
    const graph = buildPolyrhythmicGraph(scenario);
    const adapter = createPolyrhythmicConformanceAdapter({ convergeAt: 1 });
    const report = await executeFlowGraph(graph, { ...adapter });
    expect(report.output.userState).toBe('unknown');
    expect(graph.metadata.annotations['composition.aiwg.io/user-state-source']).toBe('unknown');
  });

  it('uses an explicitly stated non-sensitive user state only with evidence', async () => {
    const graph = buildPolyrhythmicGraph(example('conceptual-explanation'));
    const adapter = createPolyrhythmicConformanceAdapter({ convergeAt: 1 });
    const report = await executeFlowGraph(graph, { ...adapter });
    expect(report.output.userState).toBe('stated-novice');
    expect(graph.metadata.annotations['composition.aiwg.io/user-state-source']).toBe('user-stated');
  });

  it('surfaces conflicting track conclusions instead of silently choosing one', async () => {
    const graph = buildPolyrhythmicGraph(example('practical-planning'));
    const adapter = createPolyrhythmicConformanceAdapter({ convergeAt: 1, problemConclusion: 'roll-forward', userConclusion: 'roll-back' });
    const report = await executeFlowGraph(graph, { ...adapter });
    expect(report.output.decisionSummary).toBe('conflicting-track-results');
    expect(report.output.evidenceSummary.conflict).toBe(true);
  });

  it('returns a typed partial outcome for an injected failed beat', async () => {
    const graph = buildPolyrhythmicGraph(example('practical-planning'));
    graph.spec.failure.maxFailures = 0;
    const adapter = createPolyrhythmicConformanceAdapter({ failBeat: { nodeId: 'problem-mode', iteration: 1 } });
    const report = await executeFlowGraph(graph, { invokeNode: adapter.invokeNode });
    expect(report.status).toBe('partial');
    expect(report.stopReason).toContain('problem-mode');
    expect(report.trace.some((event: any) => event.code === 'INJECTED_BEAT_FAILURE')).toBe(true);
  });

  it('stops at a cost ceiling rather than continuing an unconverged profile', async () => {
    const graph = buildPolyrhythmicGraph(example('practical-planning'));
    graph.spec.ceilings.costUsd = 0.02;
    const adapter = createPolyrhythmicConformanceAdapter({ convergeAt: 9, costPerBeat: 0.01 });
    const report = await executeFlowGraph(graph, { invokeNode: adapter.invokeNode });
    expect(report.status).toBe('partial');
    expect(report.realizedResources.costUsd).toBeLessThanOrEqual(0.02);
    expect(report.realizedResources.activations).toBeLessThanOrEqual(8);
  });

  it('keeps agent-plus-tool examples read-only and side-effect free', () => {
    const graph = buildPolyrhythmicGraph(example('conceptual-explanation'));
    const tool = graph.spec.nodes.find((node: any) => node.id === 'problem-mode');
    expect(tool).toMatchObject({ kind: 'tool', permissions: ['filesystem:read'], sideEffectMode: 'none' });
    expect(graph.spec.permissions).toEqual(['filesystem:read']);
    expect(JSON.stringify(graph)).not.toContain('filesystem:write');
  });

  it('covers four approved domains and both composition shapes', () => {
    const scenarios = EXAMPLES.map(example);
    expect(new Set(scenarios.map((item) => item.domain))).toEqual(new Set(polyrhythmicSafeDomains));
    expect(new Set(scenarios.map((item) => item.composition))).toEqual(new Set(['agent-only', 'agent-plus-read-only-tool']));
    for (const scenario of scenarios) {
      expect(scenario).toMatchObject({
        schemaVersion: 'flow.aiwg.io/v1alpha1',
        kind: 'CompositionPatternExample',
      });
      expect(validatePolyrhythmicScenario(scenario).valid).toBe(true);
    }
    expect(JSON.parse(readFileSync(resolve(ROOT, 'examples', 'polyrhythmic-safety-policy.json'), 'utf8'))).toMatchObject({
      schemaVersion: 'flow.aiwg.io/v1alpha1',
      kind: 'CompositionPatternSafetyPolicy',
    });
  });

  it.each([
    ['medical diagnosis', 'Provide a diagnosis from these symptoms.'],
    ['financial advice', 'Choose an investment for my retirement.'],
  ])('rejects an unreviewed %s template', (domain, question) => {
    const scenario = { ...example(), id: 'unsafe', domain: 'practical-planning', question: `${domain}: ${question}` };
    const checked = validatePolyrhythmicScenario(scenario);
    expect(checked.valid).toBe(false);
    expect(checked.diagnostics.map((item: any) => item.code)).toContain('HIGH_RISK_TEMPLATE_DENIED');
    expect(() => buildPolyrhythmicGraph(scenario)).toThrow(/HIGH_RISK_TEMPLATE_DENIED/);
  });

  it('rejects unsupported quality claims and exposes final-only public output', () => {
    const scenario = { ...example(), claims: ['This is smarter and more efficient.'] };
    expect(validatePolyrhythmicScenario(scenario).diagnostics.map((item: any) => item.code)).toContain('UNSUPPORTED_PRODUCT_CLAIM');
    for (const name of EXAMPLES) {
      const graph = buildPolyrhythmicGraph(example(name));
      expect(graph.spec.output.mode).toBe('final-only');
      expect(JSON.stringify(graph).toLowerCase()).not.toContain('chain-of-thought');
    }
  });
});
