import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const addonRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REQUIRED_TOPOLOGIES = ['single-agent', 'bounded-parallel', 'planner-worker'];

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function round(value) {
  return Math.round(value * 10000) / 10000;
}

export function summarizeEvaluationRuns(runs, {
  qualityField = 'quality_score',
  successField = 'success',
  latencyField = 'duration_ms',
  costField = 'cost_usd',
} = {}) {
  if (!Array.isArray(runs) || runs.length === 0) throw new Error('Evaluation summary requires at least one run.');
  for (const [index, run] of runs.entries()) {
    assertNumber(run[qualityField], `runs[${index}].${qualityField}`);
    assertNumber(run[latencyField], `runs[${index}].${latencyField}`);
    assertNumber(run[costField], `runs[${index}].${costField}`);
    if (typeof run[successField] !== 'boolean') throw new Error(`runs[${index}].${successField} must be boolean.`);
  }
  const successful = runs.filter((run) => run[successField]);
  return {
    sample_n: runs.length,
    success_n: successful.length,
    success_rate: round(successful.length / runs.length),
    failure_rate: round((runs.length - successful.length) / runs.length),
    mean_quality: round(mean(runs.map((run) => run[qualityField]))),
    mean_latency_ms: round(mean(runs.map((run) => run[latencyField]))),
    total_cost_usd: round(runs.reduce((sum, run) => sum + run[costField], 0)),
    success_conditioned: successful.length ? {
      mean_quality: round(mean(successful.map((run) => run[qualityField]))),
      mean_latency_ms: round(mean(successful.map((run) => run[latencyField]))),
      mean_cost_usd: round(mean(successful.map((run) => run[costField]))),
    } : null,
  };
}

function assertNumber(value, label) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be a non-negative number.`);
}

export function evaluateTopologyLab(fixture) {
  if (!fixture || typeof fixture !== 'object' || !fixture.task_family) {
    throw new Error('Topology fixture requires one task_family.');
  }
  if (!Array.isArray(fixture.topologies)) throw new Error('Topology fixture requires topologies[].');
  const byName = new Map(fixture.topologies.map((entry) => [entry.name, entry]));
  for (const name of REQUIRED_TOPOLOGIES) {
    if (!byName.has(name)) throw new Error(`Missing required topology '${name}'.`);
  }

  const topologies = REQUIRED_TOPOLOGIES.map((name) => {
    const entry = byName.get(name);
    assertNumber(entry.budget_usd, `${name}.budget_usd`);
    if (entry.budget_usd === 0) throw new Error(`${name}.budget_usd must be greater than zero.`);
    if (!Array.isArray(entry.runs) || entry.runs.length === 0) {
      throw new Error(`Topology '${name}' requires at least one run.`);
    }
    for (const [index, run] of entry.runs.entries()) {
      for (const field of ['duration_ms', 'coordination_ms', 'claims', 'contradictions', 'cost_usd', 'quality_score']) {
        assertNumber(run[field], `${name}.runs[${index}].${field}`);
      }
      if (run.quality_score > 1) throw new Error(`${name}.quality_score must be between 0 and 1.`);
      if (!['accepted', 'rejected'].includes(run.outcome)) {
        throw new Error(`${name}.runs[${index}].outcome must be accepted or rejected.`);
      }
      if (!run.activity_evidence || !['captured', 'not_run'].includes(run.activity_evidence.state)) {
        throw new Error(`${name}.activity_evidence must be captured or not_run.`);
      }
      if (run.activity_evidence.state === 'not_run' && !run.activity_evidence.reason) {
        throw new Error(`${name}.activity_evidence NOT RUN requires a reason.`);
      }
    }

    const claims = entry.runs.reduce((sum, run) => sum + run.claims, 0);
    const contradictions = entry.runs.reduce((sum, run) => sum + run.contradictions, 0);
    const expected = entry.runs.reduce((sum, run) => sum + (run.delegations_expected ?? 0), 0);
    const correct = entry.runs.reduce((sum, run) => sum + (run.delegations_correct ?? 0), 0);
    const captured = entry.runs.filter((run) => run.activity_evidence.state === 'captured');
    const notRunReasons = entry.runs
      .filter((run) => run.activity_evidence.state === 'not_run')
      .map((run) => run.activity_evidence.reason);

    const totalCost = entry.runs.reduce((sum, run) => sum + run.cost_usd, 0);
    const sharedSummary = summarizeEvaluationRuns(entry.runs.map((run) => ({
      quality_score: run.quality_score,
      success: run.outcome === 'accepted',
      duration_ms: run.duration_ms,
      cost_usd: run.cost_usd,
    })));
    const metrics = {
      sample_n: entry.runs.length,
      quality_score: round(mean(entry.runs.map((run) => run.quality_score))),
      coordination_overhead_ms: round(mean(entry.runs.map((run) => run.coordination_ms))),
      contradiction_rate: round(claims ? contradictions / claims : 0),
      synthesis_failure_rate: round(entry.runs.filter((run) => run.synthesis_failed).length / entry.runs.length),
      delegation_precision: expected ? round(correct / expected) : null,
      total_cost_usd: round(totalCost),
      budget_usd: entry.budget_usd,
      budget_conservation_ratio: round(Math.max(0, (entry.budget_usd - totalCost) / entry.budget_usd)),
      mean_duration_ms: round(mean(entry.runs.map((run) => run.duration_ms))),
      activity_evidence: captured.length === entry.runs.length
        ? {
            state: 'captured',
            mean_quality: round(mean(captured.map((run) => run.activity_evidence.quality_score))),
          }
        : {
            state: 'NOT RUN',
            captured_n: captured.length,
            reasons: [...new Set(notRunReasons)].sort(),
          },
      outcome_profile: {
        accepted: entry.runs.filter((run) => run.outcome === 'accepted').length,
        rejected: entry.runs.filter((run) => run.outcome === 'rejected').length,
      },
      shared_evaluation_summary: sharedSummary,
    };
    const evidenceScore = metrics.activity_evidence.state === 'captured' ? metrics.activity_evidence.mean_quality : 0;
    const recommendationScore = round(
      metrics.quality_score * 100
      + evidenceScore * 10
      - metrics.contradiction_rate * 30
      - metrics.synthesis_failure_rate * 40
      - metrics.coordination_overhead_ms / 1000
      - metrics.total_cost_usd,
    );
    return { name, metrics, recommendation_score: recommendationScore };
  });

  const ranked = [...topologies].sort((left, right) => right.recommendation_score - left.recommendation_score);
  const winner = ranked[0];
  return {
    schema_version: '1',
    task_family: fixture.task_family,
    integrity_state: fixture.integrity_state ?? 'unknown',
    topologies,
    recommendation: {
      topology: winner.name,
      evidence_based: true,
      basis: [
        'observed task quality',
        'coordination overhead',
        'contradiction rate',
        'synthesis failure rate',
        'delegation precision where available',
        'budget conservation',
        'cost',
        'activity-evidence quality',
      ],
      warning: 'Experimental local evidence only; do not infer fan-out from agent count or enable automatic production routing.',
    },
  };
}

export function formatTopologyMarkdown(report) {
  const rows = report.topologies.map(({ name, metrics }) => (
    `| ${name} | ${metrics.sample_n} | ${metrics.quality_score} | ${metrics.coordination_overhead_ms} | ${metrics.contradiction_rate} | ${metrics.synthesis_failure_rate} | ${metrics.delegation_precision ?? 'N/A'} | ${metrics.budget_conservation_ratio} | ${metrics.total_cost_usd} | ${metrics.activity_evidence.state} |`
  ));
  return [
    `# Topology Lab: ${report.task_family}`,
    '',
    '| Topology | n | Quality | Coordination ms | Contradiction rate | Synthesis failure | Delegation precision | Budget conserved | Cost USD | Activity evidence |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|---|',
    ...rows,
    '',
    `Recommendation: **${report.recommendation.topology}**`,
    '',
    report.recommendation.warning,
  ].join('\n');
}

function option(args, name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}

export default async function topologyLab(args, context) {
  if (args.includes('--help') || args.includes('-h')) {
    return { exitCode: 0, message: 'Usage: aiwg topology-lab run [fixture.json] [--format json|markdown]' };
  }
  const fixtureArg = args.find((arg, index) => !arg.startsWith('--') && args[index - 1] !== '--format');
  const fixturePath = fixtureArg
    ? path.resolve(context.cwd, fixtureArg)
    : path.join(addonRoot, 'fixtures', 'research-synthesis.json');
  const fixture = JSON.parse(await fs.readFile(fixturePath, 'utf8'));
  const report = evaluateTopologyLab(fixture);
  const format = option(args, '--format', 'json');
  return {
    exitCode: 0,
    message: format === 'markdown' ? formatTopologyMarkdown(report) : JSON.stringify(report, null, 2),
  };
}
