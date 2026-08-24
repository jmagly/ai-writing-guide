import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { runCompositionBenchmark, validateBenchmarkManifest } from '../../../agentic/code/addons/composition-engine/lib/evaluation-harness.mjs';
import compositionBenchmark from '../../../agentic/code/addons/composition-engine/commands/composition-benchmark.mjs';

const root = path.resolve(__dirname, '../../..');
const addon = path.join(root, 'agentic/code/addons/composition-engine');
const manifestPath = path.join(addon, 'benchmarks/composition-policy-benchmark.v1.json');
const json = async (file: string) => JSON.parse(await readFile(file, 'utf8'));

describe('composition policy evaluation harness (#2118)', () => {
  it('validates the fixed versioned task, policy, failure, and ablation contract', async () => {
    const manifest = await json(manifestPath);
    expect(manifest).toMatchObject({
      apiVersion: 'flow.aiwg.io/v1alpha1',
      kind: 'CompositionPolicyBenchmark',
    });
    const validation = validateBenchmarkManifest(manifest);
    expect(validation.valid).toBe(true);
    expect([...validation.policies.keys()]).toEqual([
      'single-pass', 'self-refine', 'parallel-candidates', 'strict-lcm', 'adaptive-convergence', 'budget-partial',
    ]);
    expect([...validation.failures.keys()].sort()).toEqual([
      'budget-exhaustion', 'denied-tool', 'duplicate-retry', 'evaluator-error', 'non-convergence', 'prompt-injection',
    ]);
    expect([...validation.controls.keys()]).toEqual(['wrong-side-effect-policy']);
    expect([...validation.ablations.keys()].sort()).toEqual([
      'budget', 'evaluator-identity', 'join-policy', 'model-sharing', 'track-count',
    ]);
  });

  it('compares every policy on every fixed task with identical settings and requested budgets', async () => {
    const manifest = await json(manifestPath);
    const report = runCompositionBenchmark(manifest);
    const policyRuns = report.raw.records.filter((record: {record_type: string}) => record.record_type === 'policy-run');
    expect(policyRuns).toHaveLength(manifest.tasks.length * manifest.policies.length * manifest.seeds.length);
    expect(new Set(policyRuns.map((record: {model_settings_id: string}) => record.model_settings_id))).toEqual(new Set([manifest.model_settings.id]));
    expect(new Set(policyRuns.map((record: {requested_resources: object}) => JSON.stringify(record.requested_resources)))).toEqual(new Set([JSON.stringify(manifest.budgets)]));
  });

  it('reports baseline deltas and directly compares strict LCM with adaptive stopping', async () => {
    const report = runCompositionBenchmark(await json(manifestPath));
    expect(report.summary.baseline_comparisons).toHaveLength(5);
    expect(report.summary.baseline_comparisons.every((entry: {left: string}) => entry.left === 'single-pass')).toBe(true);
    expect(report.summary.strict_lcm_vs_adaptive).toEqual(expect.objectContaining({
      left: 'strict-lcm', right: 'adaptive-convergence', independent_quality_delta: expect.any(Number),
      mean_tokens_delta: expect.any(Number), mean_latency_ms_delta: expect.any(Number), mean_activations_delta: -12,
    }));
  });

  it('conditions efficiency on success and emits speed-of-accuracy curves', async () => {
    const report = runCompositionBenchmark(await json(manifestPath));
    for (const policy of report.summary.policies) {
      expect(policy.success_conditioned_efficiency).toEqual(expect.any(Object));
      expect(policy.speed_of_accuracy).toHaveLength(3);
      expect(policy.requested_resources).toEqual(expect.any(Object));
    }
  });

  it('uses an independent path, exposes self-judge bias, and keeps human preference NOT RUN', async () => {
    const report = runCompositionBenchmark(await json(manifestPath));
    expect(report.summary.independent_evaluation).toEqual({
      path: 'independent-rubric-fixture-v1', self_judge_bias_reported: true,
      human_evaluation: {state: 'NOT RUN', reason: 'required before empirical preference or quality claims'},
    });
    expect(report.summary.policies.every((policy: {self_judge_bias: number}) => Number.isFinite(policy.self_judge_bias))).toBe(true);
  });

  it('retains all injected failures outside normal policy means with expected recovery', async () => {
    const report = runCompositionBenchmark(await json(manifestPath));
    const failures = report.raw.records.filter((record: {record_type: string}) => record.record_type === 'failure-injection');
    expect(failures).toHaveLength(6);
    expect(failures.every((record: {observed: {matched: boolean}}) => record.observed.matched)).toBe(true);
    expect(report.summary.failure_injections.map((entry: {id: string}) => entry.id).sort()).toEqual([
      'budget-exhaustion', 'denied-tool', 'duplicate-retry', 'evaluator-error', 'non-convergence', 'prompt-injection',
    ]);
  });

  it('rejects the deliberately wrong policy with the same workload and instrument', async () => {
    const manifest = await json(manifestPath);
    const report = runCompositionBenchmark(manifest);
    const controls = report.raw.records.filter((record: {record_type: string}) => record.record_type === 'negative-control');
    expect(controls).toHaveLength(1);
    expect(controls[0]).toMatchObject({
      control_id: 'wrong-side-effect-policy',
      task_id: 'sandboxed-side-effect',
      base_policy_id: 'single-pass',
      observed: {outcome: 'rejected', matched: true},
    });
    expect(controls[0].control_contract.instrumentation).toEqual(manifest.metrics);
    expect(report.summary).toMatchObject({measurement_valid: true, invalid_reasons: []});
  });

  it('invalidates a benchmark when an expected negative control passes', async () => {
    const manifest = await json(manifestPath);
    manifest.negative_controls[0].policy_patch = {quality_delta: 0.5, constraint_delta: 0.5};
    const report = runCompositionBenchmark(manifest);
    expect(report.summary.measurement_valid).toBe(false);
    expect(report.summary.invalid_reasons[0]).toContain('wrong-side-effect-policy');
  });

  it('keeps the empirical claim gate blocked for synthetic conformance records', async () => {
    const report = runCompositionBenchmark(await json(manifestPath));
    expect(report.summary.claim_gate).toEqual(expect.objectContaining({
      state: 'BLOCKED', supported_positioning: expect.stringContaining('dependencies'),
      prohibited_positioning: expect.stringContaining('general upgrade over loops'),
    }));
  });

  it('reproduces the committed raw records and summary exactly', async () => {
    const report = runCompositionBenchmark(await json(manifestPath));
    expect(report.raw).toMatchObject({
      schemaVersion: 'flow.aiwg.io/v1alpha1',
      kind: 'CompositionPolicyBenchmarkRawEvidence',
    });
    expect(report.summary).toMatchObject({
      schemaVersion: 'flow.aiwg.io/v1alpha1',
      kind: 'CompositionPolicyBenchmarkSummary',
    });
    expect(await json(path.join(addon, 'evidence/composition-policy-benchmark-v1.raw.json'))).toEqual(report.raw);
    expect(await json(path.join(addon, 'evidence/composition-policy-benchmark-v1.summary.json'))).toEqual(report.summary);
  });

  it('writes raw and summary artifacts through the composition CLI command', async () => {
    const temporary = await mkdtemp(path.join(os.tmpdir(), 'aiwg-composition-eval-'));
    try {
      const raw = path.join(temporary, 'raw.json');
      const summary = path.join(temporary, 'summary.json');
      const result = await compositionBenchmark([manifestPath, '--raw-out', raw, '--summary-out', summary, '--format', 'markdown'], {cwd: root});
      expect(result.exitCode).toBe(0);
      expect(result.message).toContain('Claim gate: **BLOCKED**');
      expect((await json(raw)).records).toHaveLength(43);
      expect((await json(summary)).strict_lcm_vs_adaptive).toBeTruthy();
    } finally {
      await rm(temporary, {recursive: true, force: true});
    }
  });

  it('documents every research decision and graph, loop, DAG, and durable alternatives', async () => {
    const research = await readFile(path.join(addon, 'docs/composition-evaluation-research-matrix.md'), 'utf8');
    for (const ref of ['020', '021', '024', '1275', '1453', '1454', '1527', '1528', '1537']) expect(research).toContain(`REF-${ref}`);
    const guidance = await readFile(path.join(addon, 'docs/composition-evaluation.md'), 'utf8');
    for (const baseline of ['Plain Flow DAG', 'Airflow-style', 'Ralph-style loop', 'RLM fanout', 'Provider-native', 'Durable application code']) expect(guidance).toContain(baseline);
    expect(guidance).toContain('flow.aiwg.io/v1alpha1');
    expect(guidance).not.toContain('graph.flow.aiwg.io');
  });
});
