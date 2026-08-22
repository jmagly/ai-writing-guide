import { createHash } from 'node:crypto';
import { summarizeEvaluationRuns } from '../../orchestration-topology-lab/commands/topology-lab.mjs';

const REQUIRED_POLICIES = [
  'single-pass',
  'self-refine',
  'parallel-candidates',
  'strict-lcm',
  'adaptive-convergence',
  'budget-partial',
];

const REQUIRED_FAILURES = [
  'evaluator-error',
  'non-convergence',
  'prompt-injection',
  'denied-tool',
  'duplicate-retry',
  'budget-exhaustion',
];

const REQUIRED_ABLATIONS = ['track-count', 'evaluator-identity', 'model-sharing', 'join-policy', 'budget'];

function round(value) {
  return Math.round(value * 10000) / 10000;
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function clamp(value) {
  return Math.max(0, Math.min(1, round(value)));
}

function positiveNumber(value, label, { allowZero = true } = {}) {
  if (!Number.isFinite(value) || value < 0 || (!allowZero && value === 0)) {
    throw new Error(`${label} must be ${allowZero ? 'a non-negative' : 'a positive'} number.`);
  }
}

function stableId(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);
}

function byId(entries, label) {
  const result = new Map();
  for (const entry of entries) {
    if (!entry?.id || result.has(entry.id)) throw new Error(`${label} entries require unique id values.`);
    result.set(entry.id, entry);
  }
  return result;
}

export function validateBenchmarkManifest(manifest) {
  if (!manifest || typeof manifest !== 'object') throw new Error('Benchmark manifest must be an object.');
  if (manifest.apiVersion !== 'flow.aiwg.io/v1alpha1') {
    throw new Error("Benchmark manifest apiVersion must be 'flow.aiwg.io/v1alpha1'.");
  }
  if (manifest.kind !== 'CompositionPolicyBenchmark') {
    throw new Error("Benchmark manifest kind must be 'CompositionPolicyBenchmark'.");
  }
  if (!manifest.benchmark_id) throw new Error('Benchmark manifest requires benchmark_id.');
  if (manifest.evidence_mode !== 'synthetic-conformance') {
    throw new Error("Initial shipped benchmark requires evidence_mode 'synthetic-conformance'.");
  }
  if (!Array.isArray(manifest.tasks) || manifest.tasks.length < 6) throw new Error('Benchmark requires at least six fixed tasks.');
  if (!Array.isArray(manifest.policies)) throw new Error('Benchmark requires policies[].');
  if (!Array.isArray(manifest.failure_injections)) throw new Error('Benchmark requires failure_injections[].');
  if (!Array.isArray(manifest.ablations)) throw new Error('Benchmark requires ablations[].');
  if (!Array.isArray(manifest.seeds) || manifest.seeds.length === 0) throw new Error('Benchmark requires at least one seed.');
  if (!manifest.model_settings?.provider || !manifest.model_settings?.model) {
    throw new Error('Benchmark requires fixed model_settings.provider and model_settings.model.');
  }

  const tasks = byId(manifest.tasks, 'Task');
  const policies = byId(manifest.policies, 'Policy');
  const failures = byId(manifest.failure_injections, 'Failure injection');
  const ablations = byId(manifest.ablations, 'Ablation');
  for (const id of REQUIRED_POLICIES) if (!policies.has(id)) throw new Error(`Missing required policy '${id}'.`);
  for (const id of REQUIRED_FAILURES) if (!failures.has(id)) throw new Error(`Missing required failure injection '${id}'.`);
  for (const id of REQUIRED_ABLATIONS) if (!ablations.has(id)) throw new Error(`Missing required ablation '${id}'.`);

  const families = new Set(manifest.tasks.map((task) => task.family));
  for (const family of ['technical', 'conceptual', 'practical', 'theoretical']) {
    if (!families.has(family)) throw new Error(`Task suite must include family '${family}'.`);
  }
  const toolModes = new Set(manifest.tasks.map((task) => task.tool_mode));
  for (const mode of ['none', 'read-only', 'side-effect-fixture']) {
    if (!toolModes.has(mode)) throw new Error(`Task suite must include tool_mode '${mode}'.`);
  }

  for (const task of manifest.tasks) {
    for (const field of ['base_quality', 'base_constraint_score', 'base_tokens', 'base_latency_ms', 'base_tool_calls']) {
      positiveNumber(task[field], `tasks.${task.id}.${field}`);
    }
    if (task.base_quality > 1 || task.base_constraint_score > 1) throw new Error(`Task '${task.id}' scores must be between 0 and 1.`);
  }
  for (const policy of manifest.policies) {
    for (const field of ['quality_delta', 'constraint_delta', 'self_judge_bias']) {
      if (!Number.isFinite(policy[field])) throw new Error(`policies.${policy.id}.${field} must be numeric.`);
    }
    for (const field of ['tokens_factor', 'latency_factor', 'cost_factor', 'tool_call_factor', 'activations', 'retries']) {
      positiveNumber(policy[field], `policies.${policy.id}.${field}`);
    }
    if (!policy.convergence_reason) throw new Error(`Policy '${policy.id}' requires convergence_reason.`);
  }
  for (const field of ['tokens', 'tool_calls', 'cost_usd', 'latency_ms', 'activations', 'retries']) {
    positiveNumber(manifest.budgets?.[field], `budgets.${field}`, { allowZero: false });
  }
  for (const injection of manifest.failure_injections) {
    if (!policies.has(injection.policy_id)) throw new Error(`Failure '${injection.id}' references unknown policy.`);
    if (!tasks.has(injection.task_id)) throw new Error(`Failure '${injection.id}' references unknown task.`);
    if (!injection.expected_outcome || !injection.expected_recovery) {
      throw new Error(`Failure '${injection.id}' requires expected_outcome and expected_recovery.`);
    }
  }
  const independent = manifest.evaluators?.find((entry) => entry.independence === 'independent');
  if (!independent) throw new Error('Benchmark requires an independent evaluation path.');
  if (!manifest.thresholds?.quality || !Array.isArray(manifest.thresholds.speed_of_accuracy)) {
    throw new Error('Benchmark requires quality and speed_of_accuracy thresholds.');
  }
  return { valid: true, tasks, policies, failures, ablations };
}

function requestedResources(manifest) {
  return {
    tokens: manifest.budgets.tokens,
    tool_calls: manifest.budgets.tool_calls,
    cost_usd: manifest.budgets.cost_usd,
    latency_ms: manifest.budgets.latency_ms,
    activations: manifest.budgets.activations,
    retries: manifest.budgets.retries,
  };
}

function realizedResources(task, policy) {
  const tokens = Math.round(task.base_tokens * policy.tokens_factor);
  const toolCalls = Math.round(task.base_tool_calls * policy.tool_call_factor);
  return {
    tokens,
    tool_calls: toolCalls,
    cost_usd: round(tokens * 0.000002 * policy.cost_factor + toolCalls * 0.0005),
    latency_ms: Math.round(task.base_latency_ms * policy.latency_factor),
    activations: policy.activations,
    retries: policy.retries,
  };
}

function normalRecord(manifest, task, policy, seed) {
  const quality = clamp(task.base_quality + policy.quality_delta);
  const constraint = clamp(task.base_constraint_score + policy.constraint_delta);
  const selfJudge = clamp(quality + policy.self_judge_bias);
  const independent = quality;
  const realized = realizedResources(task, policy);
  const withinBudget = Object.entries(realized).every(([field, value]) => value <= requestedResources(manifest)[field]);
  const success = quality >= manifest.thresholds.quality
    && constraint >= manifest.thresholds.constraint_satisfaction
    && withinBudget;
  const identity = { benchmark: manifest.benchmark_id, task: task.id, policy: policy.id, seed };
  return {
    record_id: `run-${stableId(identity)}`,
    record_type: 'policy-run',
    evidence_mode: manifest.evidence_mode,
    task_id: task.id,
    task_family: task.family,
    tool_mode: task.tool_mode,
    policy_id: policy.id,
    seed,
    model_settings_id: manifest.model_settings.id,
    success,
    outcome: success ? 'accepted' : 'rejected',
    metrics: {
      quality_score: quality,
      constraint_satisfaction: constraint,
      calibration_error: round(Math.abs(selfJudge - independent)),
      self_judge_score: selfJudge,
      independent_score: independent,
      human_preference: { state: 'NOT RUN', reason: 'synthetic conformance fixture; human evaluation is required for empirical claims' },
    },
    requested_resources: requestedResources(manifest),
    realized_resources: realized,
    budget_adherence: withinBudget,
    budget_utilization: round(realized.tokens / manifest.budgets.tokens),
    convergence_reason: policy.convergence_reason,
    hitl_burden: policy.hitl_burden,
    observability: policy.observability,
    recovery: policy.recovery,
    evaluation_provenance: ['self-judge-fixture-v1', 'independent-rubric-fixture-v1'],
  };
}

function failureRecord(manifest, injection) {
  const task = manifest.tasks.find((entry) => entry.id === injection.task_id);
  const policy = manifest.policies.find((entry) => entry.id === injection.policy_id);
  const base = normalRecord(manifest, task, policy, manifest.seeds[0]);
  return {
    ...base,
    record_id: `failure-${stableId({ benchmark: manifest.benchmark_id, injection: injection.id })}`,
    record_type: 'failure-injection',
    injection_id: injection.id,
    success: false,
    outcome: injection.expected_outcome,
    convergence_reason: injection.id,
    recovery: injection.expected_recovery,
    expected: {
      outcome: injection.expected_outcome,
      recovery: injection.expected_recovery,
    },
    observed: {
      outcome: injection.expected_outcome,
      recovery: injection.expected_recovery,
      matched: true,
    },
  };
}

function speedOfAccuracy(records, thresholds) {
  return thresholds.map((threshold) => {
    const eligible = records.filter((record) => record.success && record.metrics.independent_score >= threshold);
    return {
      quality_threshold: threshold,
      success_n: eligible.length,
      success_rate: round(eligible.length / records.length),
      mean_latency_ms: eligible.length ? round(mean(eligible.map((record) => record.realized_resources.latency_ms))) : null,
      mean_tokens: eligible.length ? round(mean(eligible.map((record) => record.realized_resources.tokens))) : null,
    };
  });
}

function summarizePolicy(policyId, records, manifest) {
  const shared = summarizeEvaluationRuns(records.map((record) => ({
    quality_score: record.metrics.independent_score,
    success: record.success,
    duration_ms: record.realized_resources.latency_ms,
    cost_usd: record.realized_resources.cost_usd,
  })));
  const successful = records.filter((record) => record.success);
  return {
    policy_id: policyId,
    ...shared,
    constraint_satisfaction: round(mean(records.map((record) => record.metrics.constraint_satisfaction))),
    calibration_error: round(mean(records.map((record) => record.metrics.calibration_error))),
    self_judge_bias: round(mean(records.map((record) => record.metrics.self_judge_score - record.metrics.independent_score))),
    mean_tokens: round(mean(records.map((record) => record.realized_resources.tokens))),
    mean_tool_calls: round(mean(records.map((record) => record.realized_resources.tool_calls))),
    mean_activations: round(mean(records.map((record) => record.realized_resources.activations))),
    mean_retries: round(mean(records.map((record) => record.realized_resources.retries))),
    success_conditioned_efficiency: successful.length ? {
      mean_tokens: round(mean(successful.map((record) => record.realized_resources.tokens))),
      mean_cost_usd: round(mean(successful.map((record) => record.realized_resources.cost_usd))),
      mean_latency_ms: round(mean(successful.map((record) => record.realized_resources.latency_ms))),
    } : null,
    speed_of_accuracy: speedOfAccuracy(records, manifest.thresholds.speed_of_accuracy),
    convergence_reasons: [...new Set(records.map((record) => record.convergence_reason))].sort(),
    requested_resources: requestedResources(manifest),
  };
}

function comparison(left, right) {
  return {
    left: left.policy_id,
    right: right.policy_id,
    independent_quality_delta: round(right.mean_quality - left.mean_quality),
    success_rate_delta: round(right.success_rate - left.success_rate),
    mean_tokens_delta: round(right.mean_tokens - left.mean_tokens),
    mean_latency_ms_delta: round(right.mean_latency_ms - left.mean_latency_ms),
    mean_activations_delta: round(right.mean_activations - left.mean_activations),
    failure_rate_delta: round(right.failure_rate - left.failure_rate),
  };
}

export function runCompositionBenchmark(manifest) {
  validateBenchmarkManifest(manifest);
  const policyRecords = manifest.tasks.flatMap((task) => manifest.policies.flatMap((policy) => (
    manifest.seeds.map((seed) => normalRecord(manifest, task, policy, seed))
  )));
  const failureRecords = manifest.failure_injections.map((injection) => failureRecord(manifest, injection));
  const records = [...policyRecords, ...failureRecords];
  const policies = manifest.policies.map((policy) => summarizePolicy(
    policy.id,
    policyRecords.filter((record) => record.policy_id === policy.id),
    manifest,
  ));
  const baseline = policies.find((entry) => entry.policy_id === 'single-pass');
  const strict = policies.find((entry) => entry.policy_id === 'strict-lcm');
  const adaptive = policies.find((entry) => entry.policy_id === 'adaptive-convergence');
  return {
    raw: {
      schemaVersion: 'flow.aiwg.io/v1alpha1',
      kind: 'CompositionPolicyBenchmarkRawEvidence',
      benchmark_id: manifest.benchmark_id,
      manifest_digest: stableId(manifest),
      evidence_mode: manifest.evidence_mode,
      records,
    },
    summary: {
      schemaVersion: 'flow.aiwg.io/v1alpha1',
      kind: 'CompositionPolicyBenchmarkSummary',
      benchmark_id: manifest.benchmark_id,
      evidence_mode: manifest.evidence_mode,
      task_count: manifest.tasks.length,
      policy_run_count: policyRecords.length,
      failure_injection_count: failureRecords.length,
      model_settings: manifest.model_settings,
      policies,
      baseline_comparisons: policies
        .filter((entry) => entry.policy_id !== baseline.policy_id)
        .map((entry) => comparison(baseline, entry)),
      strict_lcm_vs_adaptive: comparison(strict, adaptive),
      independent_evaluation: {
        path: manifest.evaluators.find((entry) => entry.independence === 'independent').id,
        self_judge_bias_reported: true,
        human_evaluation: { state: 'NOT RUN', reason: 'required before empirical preference or quality claims' },
      },
      failure_injections: failureRecords.map((record) => ({
        id: record.injection_id,
        outcome: record.outcome,
        recovery: record.recovery,
        matched: record.observed.matched,
      })),
      ablations: manifest.ablations.map((entry) => ({ id: entry.id, variants: entry.variants, state: entry.state })),
      claim_gate: {
        state: 'BLOCKED',
        reason: 'Synthetic conformance data validates the harness, not provider quality or efficiency.',
        required_evidence: [
          'repeated trusted provider runs',
          'independent or blinded human evaluation',
          'confidence intervals and task-family replication',
        ],
        supported_positioning: 'Flow graphs are useful when dependencies, conditional routing, fanout/fanin, approvals, retries, audit, or multi-agent boundaries must be explicit.',
        prohibited_positioning: 'Graphs are a general upgrade over loops or are inherently smarter, faster, cheaper, or more accurate.',
      },
    },
  };
}

export function formatBenchmarkMarkdown(summary) {
  const rows = summary.policies.map((entry) => (
    `| ${entry.policy_id} | ${entry.success_rate} | ${entry.mean_quality} | ${entry.constraint_satisfaction} | ${entry.mean_tokens} | ${entry.mean_latency_ms} | ${entry.mean_activations} | ${entry.failure_rate} |`
  ));
  return [
    `# Composition benchmark: ${summary.benchmark_id}`,
    '',
    `Evidence mode: **${summary.evidence_mode}**`,
    '',
    '| Policy | Success | Independent quality | Constraints | Tokens | Latency ms | Activations | Failure |',
    '|---|---:|---:|---:|---:|---:|---:|---:|',
    ...rows,
    '',
    `Claim gate: **${summary.claim_gate.state}** — ${summary.claim_gate.reason}`,
    '',
    summary.claim_gate.supported_positioning,
  ].join('\n');
}
