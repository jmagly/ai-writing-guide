import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const addonRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REQUIRED_STRATEGIES = [
  'compressed-skim-exact-recovery',
  'summary-compaction',
  'direct-retrieval',
  'provider-context',
];

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value) {
  return Math.round(value * 10000) / 10000;
}

export function runContextBenchmark(fixture) {
  if (!fixture?.task_family || !Array.isArray(fixture.tasks) || fixture.tasks.length === 0) {
    throw new Error('Context benchmark requires task_family and tasks[].');
  }
  if (!fixture.tasks.some((task) => task.real_aiwg_task === true)) {
    throw new Error('At least one real AIWG task is required.');
  }
  for (const task of fixture.tasks) {
    const names = new Set((task.observations ?? []).map((observation) => observation.strategy));
    for (const strategy of REQUIRED_STRATEGIES) {
      if (!names.has(strategy)) throw new Error(`Task '${task.id}' is missing strategy '${strategy}'.`);
    }
  }
  const strategies = REQUIRED_STRATEGIES.map((strategy) => {
    const observations = fixture.tasks.flatMap((task) => task.observations
      .filter((observation) => observation.strategy === strategy)
      .map((observation) => ({...observation, task_id: task.id})));
    for (const observation of observations) {
      for (const field of ['quality_score', 'exact_recovery_failures', 'latency_ms', 'memory_mb']) {
        if (!Number.isFinite(observation[field]) || observation[field] < 0) {
          throw new Error(`${strategy}.${field} must be a non-negative number.`);
        }
      }
      if (!Array.isArray(observation.operational_constraints)) {
        throw new Error(`${strategy}.operational_constraints must be an array.`);
      }
    }
    return {
      strategy,
      task_n: observations.length,
      mean_quality: round(mean(observations.map((observation) => observation.quality_score))),
      exact_recovery_failures: observations.reduce((sum, observation) => sum + observation.exact_recovery_failures, 0),
      mean_latency_ms: round(mean(observations.map((observation) => observation.latency_ms))),
      mean_memory_mb: round(mean(observations.map((observation) => observation.memory_mb))),
      operational_constraints: [...new Set(observations.flatMap((observation) => observation.operational_constraints))].sort(),
      task_results: observations.map((observation) => ({
        task_id: observation.task_id,
        quality_score: observation.quality_score,
        exact_recovery_failures: observation.exact_recovery_failures,
      })),
    };
  });
  const candidate = strategies.find((entry) => entry.strategy === 'compressed-skim-exact-recovery');
  const baselines = strategies.filter((entry) => entry.strategy !== candidate.strategy);
  const strongestQuality = Math.max(...baselines.map((entry) => entry.mean_quality));
  const fewestFailures = Math.min(...baselines.map((entry) => entry.exact_recovery_failures));
  const integrationAllowed = candidate.mean_quality > strongestQuality
    && candidate.exact_recovery_failures <= fewestFailures;
  const weakResults = strategies
    .filter((entry) => entry.mean_quality < strongestQuality || entry.exact_recovery_failures > fewestFailures)
    .map((entry) => ({
      strategy: entry.strategy,
      reason: [
        entry.mean_quality < strongestQuality ? 'quality below strongest baseline' : null,
        entry.exact_recovery_failures > fewestFailures ? 'more exact-recovery failures than best baseline' : null,
      ].filter(Boolean),
    }));
  return {
    schema_version: '1',
    task_family: fixture.task_family,
    real_aiwg_tasks: fixture.tasks.filter((task) => task.real_aiwg_task).map((task) => task.id),
    strategies,
    product_integration: {
      state: integrationAllowed ? 'eligible-for-separate-product-review' : 'BLOCKED',
      allowed: integrationAllowed,
      rule: 'Compressed skim plus exact recovery must beat the strongest quality baseline without increasing exact-recovery failures.',
    },
    failed_or_weak_results: weakResults,
    evidence_policy: 'All weak and failed results are retained; no strategy is omitted from the report.',
  };
}

export default async function contextBench(args, context) {
  if (args.includes('--help') || args.includes('-h')) {
    return {exitCode: 0, message: 'Usage: aiwg context-bench run [benchmark.json]'};
  }
  const fixtureArg = args.find((arg) => !arg.startsWith('--'));
  const source = fixtureArg ? path.resolve(context.cwd, fixtureArg) : path.join(addonRoot, 'fixtures', 'aiwg-retrieval-benchmark.json');
  const report = runContextBenchmark(JSON.parse(await fs.readFile(source, 'utf8')));
  return {exitCode: 0, message: JSON.stringify(report, null, 2)};
}
