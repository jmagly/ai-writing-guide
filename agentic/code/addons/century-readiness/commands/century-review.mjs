import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const addonRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REQUIRED_DIMENSIONS = [
  'obligation_horizon',
  'stable_core',
  'pace_layers',
  'dependency_inventory',
  'replacement_points',
  'stewardship',
  'degradation',
  'audit_evidence',
  'meaning_preservation',
];
const STATUSES = new Set(['ready', 'partial', 'gap', 'not_run']);

export function reviewCenturyReadiness(input) {
  if (!input?.project || !input?.dimensions) throw new Error('Readiness input requires project and dimensions.');
  const missing = REQUIRED_DIMENSIONS.filter((dimension) => !input.dimensions[dimension]);
  if (missing.length) throw new Error(`Missing readiness dimensions: ${missing.join(', ')}`);
  const dimensions = REQUIRED_DIMENSIONS.map((id) => {
    const value = input.dimensions[id];
    if (!STATUSES.has(value.status)) throw new Error(`Invalid status for ${id}.`);
    if (!value.evidence || !value.finding) throw new Error(`${id} requires evidence and finding.`);
    if (value.status === 'not_run' && !value.reason) throw new Error(`${id} NOT RUN requires a reason.`);
    return {id, ...value};
  });
  const dependencies = input.dependencies ?? [];
  for (const dependency of dependencies) {
    for (const field of ['name', 'category', 'replacement_point', 'steward']) {
      if (!dependency[field]) throw new Error(`Dependency entries require ${field}.`);
    }
  }
  const actionableFindings = dimensions
    .filter((dimension) => dimension.status !== 'ready')
    .map((dimension) => ({
      dimension: dimension.id,
      severity: dimension.status === 'gap' ? 'high' : dimension.status === 'not_run' ? 'unverified' : 'moderate',
      action: dimension.action ?? dimension.finding,
    }));
  const migrationCandidates = dependencies
    .filter((dependency) => dependency.rehearsal_candidate)
    .map((dependency) => ({
      dependency: dependency.name,
      category: dependency.category,
      replacement_point: dependency.replacement_point,
      steward: dependency.steward,
      cadence: dependency.rehearsal_cadence ?? 'annual',
    }));
  const relatedReviews = (input.related_reviews ?? []).map((review) => {
    if (!['reviewed', 'not_run'].includes(review.state)) throw new Error(`Invalid related review state for ${review.name}.`);
    if (review.state === 'not_run' && !review.reason) throw new Error(`${review.name} NOT RUN requires a reason.`);
    return review.state === 'not_run' ? {...review, state: 'NOT RUN'} : review;
  });
  return {
    schema_version: '1',
    project: input.project,
    review_horizon: input.review_horizon,
    dimensions,
    readiness_summary: {
      ready: dimensions.filter((dimension) => dimension.status === 'ready').length,
      partial: dimensions.filter((dimension) => dimension.status === 'partial').length,
      gaps: dimensions.filter((dimension) => dimension.status === 'gap').length,
      not_run: dimensions.filter((dimension) => dimension.status === 'not_run').length,
    },
    dependency_inventory: dependencies,
    migration_rehearsal_candidates: migrationCandidates,
    actionable_findings: actionableFindings,
    related_reviews: relatedReviews,
    packaging: {
      public_core: 'Local checklist, self-review, dependency inventory, and migration rehearsal candidates.',
      enterprise_candidate: 'Governed organization inventory, rehearsal scheduling, and board/audit reporting.',
    },
  };
}

export function formatCenturyMarkdown(report) {
  return [
    `# Century-Scale Readiness: ${report.project}`,
    '',
    `Review horizon: ${report.review_horizon}`,
    '',
    '| Dimension | Status | Finding |',
    '|---|---|---|',
    ...report.dimensions.map((dimension) => `| ${dimension.id} | ${dimension.status.toUpperCase()} | ${dimension.finding} |`),
    '',
    '## Migration rehearsal candidates',
    '',
    ...report.migration_rehearsal_candidates.map((candidate) => `- ${candidate.dependency}: ${candidate.replacement_point} (${candidate.cadence}; steward: ${candidate.steward})`),
    '',
    '## Related reviews',
    '',
    ...report.related_reviews.map((review) => `- ${review.name}: ${review.state}${review.reason ? ` — ${review.reason}` : ''}`),
  ].join('\n');
}

export default async function centuryReview(args, context) {
  if (args.includes('--help') || args.includes('-h')) {
    return {exitCode: 0, message: 'Usage: aiwg century-readiness review [review.json] [--format json|markdown]'};
  }
  const formatIndex = args.indexOf('--format');
  const fixtureArg = args.find((arg, index) => !arg.startsWith('--') && index !== formatIndex + 1);
  const source = fixtureArg ? path.resolve(context.cwd, fixtureArg) : path.join(addonRoot, 'fixtures', 'aiwg-self-review.json');
  const report = reviewCenturyReadiness(JSON.parse(await fs.readFile(source, 'utf8')));
  const format = formatIndex >= 0 ? args[formatIndex + 1] : 'json';
  return {exitCode: 0, message: format === 'markdown' ? formatCenturyMarkdown(report) : JSON.stringify(report, null, 2)};
}
