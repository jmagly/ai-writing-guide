import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { loadCliCommandsContribution } from '../../src/cli/cli-extension-loader.js';

const root = path.resolve(__dirname, '../..');
const addon = (id: string) => path.join(root, 'agentic', 'code', 'addons', id);
const json = async (file: string) => JSON.parse(await readFile(file, 'utf8'));

describe('research-roadmap experimental addons', () => {
  it.each([
    ['orchestration-topology-lab', 'topology-lab', ['run']],
    ['natural-language-harness', 'harness', ['validate', 'plan', 'ablate']],
    ['century-readiness', 'century-readiness', ['review']],
    ['long-context-bench', 'context-bench', ['run']],
    ['premortem-v2', 'premortem-v2', ['run']],
    ['monitorability-red-team', 'monitorability-red-team', ['run']],
  ])('loads %s CLI contribution with executable local modules', async (id, namespace, subcommands) => {
    const contribution = await loadCliCommandsContribution(addon(id));
    expect(contribution?.manifest.namespace).toBe(namespace);
    expect(Object.keys(contribution?.manifest.subcommands ?? {}).sort()).toEqual([...subcommands].sort());
    for (const descriptor of Object.values(contribution?.manifest.subcommands ?? {})) {
      await expect(import(path.join(contribution!.commandsSource, descriptor.file))).resolves.toHaveProperty('default');
    }
  });

  it('compares all required orchestration topologies using evidence-bearing metrics', async () => {
    const module = await import('../../agentic/code/addons/orchestration-topology-lab/commands/topology-lab.mjs');
    const fixture = await json(path.join(addon('orchestration-topology-lab'), 'fixtures', 'research-synthesis.json'));
    const codeReviewFixture = await json(path.join(addon('orchestration-topology-lab'), 'fixtures', 'code-review.json'));
    const report = module.evaluateTopologyLab(fixture);
    const codeReviewReport = module.evaluateTopologyLab(codeReviewFixture);

    expect(report.topologies.map((entry: {name: string}) => entry.name)).toEqual([
      'single-agent', 'bounded-parallel', 'planner-worker',
    ]);
    for (const entry of report.topologies) {
      expect(entry.metrics).toEqual(expect.objectContaining({
        quality_score: expect.any(Number),
        coordination_overhead_ms: expect.any(Number),
        contradiction_rate: expect.any(Number),
        synthesis_failure_rate: expect.any(Number),
        total_cost_usd: expect.any(Number),
        budget_conservation_ratio: expect.any(Number),
        mean_duration_ms: expect.any(Number),
        outcome_profile: expect.objectContaining({accepted: expect.any(Number), rejected: expect.any(Number)}),
      }));
    }
    const planner = report.topologies.find((entry: {name: string}) => entry.name === 'planner-worker');
    expect(planner.metrics.activity_evidence).toEqual(expect.objectContaining({
      state: 'NOT RUN', reasons: expect.arrayContaining([expect.any(String)]),
    }));
    expect(report.recommendation).toEqual(expect.objectContaining({evidence_based: true}));
    expect(report.recommendation.warning).toContain('do not infer fan-out from agent count');
    expect(codeReviewReport.task_family).toContain('code-review');
  });

  it('validates, plans, and ablates a deterministic natural-language harness', async () => {
    const module = await import('../../agentic/code/addons/natural-language-harness/commands/nlah.mjs');
    const markdown = await readFile(path.join(addon('natural-language-harness'), 'fixtures', 'research-evaluation', 'NLAH.md'), 'utf8');
    const validation = module.validateNlah(markdown);
    const plan = module.planNlah(markdown);
    const ablation = module.ablateNlah(markdown, 'verifier');

    expect(validation.valid).toBe(true);
    expect(validation.diagnostics).toEqual({unmapped: [], duplicate_mappings: [], undeclared_mappings: []});
    expect(validation.ambiguous_clauses.length).toBeGreaterThan(0);
    expect(plan.mode).toBe('plan-only');
    expect(plan.manual_gates.length).toBeGreaterThan(0);
    expect(plan.comparison_to_current_flow).toEqual(expect.objectContaining({
      current_flow: expect.stringContaining('research-evaluation.md'),
      differences: expect.arrayContaining([expect.stringContaining('plan-only')]),
    }));
    expect(ablation).toEqual(expect.objectContaining({
      ablation: expect.objectContaining({removed_module: 'verifier'}),
      comparison: expect.objectContaining({coverage_delta: -2}),
      result: 'comparison-only',
    }));
  });

  it('reviews all century-scale dimensions and records gaps plus migration candidates', async () => {
    const module = await import('../../agentic/code/addons/century-readiness/commands/century-review.mjs');
    const fixture = await json(path.join(addon('century-readiness'), 'fixtures', 'aiwg-self-review.json'));
    const report = module.reviewCenturyReadiness(fixture);

    expect(report.dimensions.map((entry: {id: string}) => entry.id)).toEqual(module.REQUIRED_DIMENSIONS);
    expect(report.actionable_findings.length).toBeGreaterThan(0);
    expect(report.dependency_inventory.length).toBeGreaterThan(0);
    expect(report.migration_rehearsal_candidates.length).toBeGreaterThan(0);
    expect(report.related_reviews).toContainEqual(expect.objectContaining({
      name: expect.stringContaining('Agentic Sandbox'), state: 'NOT RUN', reason: expect.any(String),
    }));
    expect(report.packaging).toEqual(expect.objectContaining({
      public_core: expect.any(String), enterprise_candidate: expect.any(String),
    }));
  });

  it('benchmarks all context strategies and retains the blocked result', async () => {
    const module = await import('../../agentic/code/addons/long-context-bench/commands/context-bench.mjs');
    const fixture = await json(path.join(addon('long-context-bench'), 'fixtures', 'aiwg-retrieval-benchmark.json'));
    const evidence = await json(path.join(addon('long-context-bench'), 'evidence', 'aiwg-retrieval-report.json'));
    const report = module.runContextBenchmark(fixture);

    expect(report.real_aiwg_tasks.length).toBeGreaterThan(0);
    expect(report.strategies.map((entry: {strategy: string}) => entry.strategy)).toEqual(module.REQUIRED_STRATEGIES);
    for (const strategy of report.strategies) {
      expect(strategy).toEqual(expect.objectContaining({
        mean_quality: expect.any(Number),
        exact_recovery_failures: expect.any(Number),
        mean_latency_ms: expect.any(Number),
        mean_memory_mb: expect.any(Number),
        operational_constraints: expect.any(Array),
      }));
    }
    expect(report.product_integration).toEqual(expect.objectContaining({state: 'BLOCKED', allowed: false}));
    expect(report.failed_or_weak_results.length).toBeGreaterThan(0);
    expect(evidence.product_integration.state).toBe('BLOCKED');
    expect(evidence.failed_or_weak_results).toEqual(report.failed_or_weak_results);
  });

  it('runs diversity-first premortem stages and preserves the #2046 evidence', async () => {
    const module = await import('../../agentic/code/addons/premortem-v2/commands/premortem-v2.mjs');
    const fixture = await json(path.join(addon('premortem-v2'), 'fixtures', 'issue-2046.json'));
    const evidence = await json(path.join(addon('premortem-v2'), 'evidence', 'issue-2046-premortem.json'));
    const report = module.runPremortem(fixture);

    expect(report.stage_order).toEqual([
      'diverse_failure_generation', 'bounded_deep_dive_selection', 'blind_verification',
    ]);
    expect(report.diverse_failure_generation.categories.length).toBeGreaterThanOrEqual(3);
    expect(report.bounded_deep_dive_selection.selected_count).toBeGreaterThanOrEqual(3);
    expect(report.bounded_deep_dive_selection.selected_count).toBeLessThanOrEqual(7);
    for (const selected of report.bounded_deep_dive_selection.selected) {
      expect(selected.selection_rationale).toBeTruthy();
      expect(selected.deep_dive.narrative.label).toBe('HYPOTHETICAL');
    }
    for (const verification of report.blind_verification) {
      expect(verification).toEqual(expect.objectContaining({
        verifier_context: expect.stringContaining('withheld'),
        plausibility: expect.any(Number),
        impact: expect.any(Number),
      }));
    }
    expect(report.provenance.unresolved_citation_risks.length).toBeGreaterThan(0);
    expect(evidence.subject.id).toBe('#2046');
    expect(evidence.diverse_failure_generation.mode_count).toBe(report.diverse_failure_generation.mode_count);
    expect(evidence.bounded_deep_dive_selection.selected_count).toBe(report.bounded_deep_dive_selection.selected_count);
  });

  it('labels synthetic monitorability limits and blocks an unlabeled miss', async () => {
    const module = await import('../../agentic/code/addons/monitorability-red-team/commands/monitorability-red-team.mjs');
    const fixture = await json(path.join(addon('monitorability-red-team'), 'fixtures', 'synthetic-monitorability.json'));
    const invalid = await json(path.join(addon('monitorability-red-team'), 'fixtures', 'unlabeled-monitor-limit.json'));
    const evidence = await json(path.join(addon('monitorability-red-team'), 'evidence', 'synthetic-monitorability-report.json'));
    const report = module.evaluateMonitorabilitySuite(fixture);
    const blocked = module.evaluateMonitorabilitySuite(invalid);

    expect(report.mode).toBe('synthetic-local-only');
    expect(report.safety).toEqual(expect.objectContaining({
      synthetic_only: true,
      network: 'forbidden',
      provider_calls: 'forbidden',
      external_secrets: 'forbidden',
      redaction_applied: true,
    }));
    expect(report.coverage.carrier_classes).toEqual(['semantic', 'unicode-tag']);
    expect(report.coverage.observability_labels).toEqual(expect.arrayContaining([
      'content-blind', 'tool-blind', 'state-blind', 'evidence-incomplete',
    ]));
    expect(report.coverage.defenses).toEqual(expect.arrayContaining([
      'paraphrase-normalization', 'unicode-normalization',
    ]));
    expect(report.coverage.topology_evidence).toContainEqual(expect.objectContaining({
      name: 'same-family-self-monitoring', state: 'captured',
    }));
    expect(report.coverage.topology_evidence).toContainEqual(expect.objectContaining({
      name: 'cross-vendor', state: 'NOT RUN', reason: expect.any(String),
    }));
    expect(report.activity_evidence.captured).toBeGreaterThan(0);
    expect(report.activity_evidence.not_run).toBeGreaterThan(0);
    expect(report.integrity).toEqual(expect.objectContaining({
      positive_cases: 2,
      negative_cases: 2,
      silent_acceptance_count: 0,
      unmet_expectation_count: 0,
    }));
    expect(report.gate).toEqual({state: 'PASS', allowed: true, reasons: []});
    expect(evidence).toEqual(report);

    expect(blocked.integrity.silent_acceptance_count).toBe(1);
    expect(blocked.gate).toEqual(expect.objectContaining({
      state: 'BLOCKED',
      allowed: false,
      reasons: expect.arrayContaining([expect.stringContaining('unlabeled monitor limits')]),
    }));

    expect(() => module.evaluateMonitorabilitySuite({
      ...fixture,
      safety: {...fixture.safety, network: 'allowed'},
    })).toThrow('forbid network and provider calls');
    expect(() => module.evaluateMonitorabilitySuite({
      ...fixture,
      scenarios: fixture.scenarios.map((scenario: Record<string, unknown>, index: number) => index === 0
        ? {...scenario, provenance: {source: 'inline-synthetic', external_reference: true}}
        : scenario),
    })).toThrow('no external reference');
  });
});
