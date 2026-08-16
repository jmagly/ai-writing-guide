import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const addonRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIN_DEEP_DIVES = 3;
const MAX_DEEP_DIVES = 7;

function score(value, label) {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${label} must be a number between 0 and 1.`);
  }
  return value;
}

export function runPremortem(input) {
  if (!input?.subject?.id || !Array.isArray(input.failure_modes)) {
    throw new Error('Premortem input requires subject.id and failure_modes[].');
  }
  const categories = new Set(input.failure_modes.map((mode) => mode.category));
  if (categories.size < 3) throw new Error('Diverse generation requires at least three failure-mode categories.');
  for (const mode of input.failure_modes) {
    for (const field of ['id', 'category', 'failure', 'hypothetical_narrative', 'selection_rationale']) {
      if (!mode[field]) throw new Error(`Failure modes require ${field}.`);
    }
    score(mode.selection_score, `${mode.id}.selection_score`);
    score(mode.blind_verification?.plausibility, `${mode.id}.blind_verification.plausibility`);
    score(mode.blind_verification?.impact, `${mode.id}.blind_verification.impact`);
  }
  const requested = input.deep_dive_count ?? 5;
  if (!Number.isInteger(requested) || requested < MIN_DEEP_DIVES || requested > MAX_DEEP_DIVES) {
    throw new Error(`deep_dive_count must be an integer from ${MIN_DEEP_DIVES} to ${MAX_DEEP_DIVES}.`);
  }
  if (input.failure_modes.length < requested) throw new Error('Not enough generated failure modes for the requested deep dives.');

  const generated = input.failure_modes.map((mode) => ({
    id: mode.id,
    category: mode.category,
    failure: mode.failure,
    narrative: {label: 'HYPOTHETICAL', text: mode.hypothetical_narrative},
  }));
  const selectedModes = [...input.failure_modes]
    .sort((left, right) => right.selection_score - left.selection_score || left.id.localeCompare(right.id))
    .slice(0, requested);
  const selected = selectedModes.map((mode) => ({
    id: mode.id,
    category: mode.category,
    selection_score: mode.selection_score,
    selection_rationale: mode.selection_rationale,
    deep_dive: {
      failure: mode.failure,
      narrative: {label: 'HYPOTHETICAL', text: mode.hypothetical_narrative},
      mitigation: mode.mitigation ?? 'No mitigation supplied.',
    },
  }));
  const blindVerification = selectedModes.map((mode) => ({
    risk_id: mode.id,
    verifier_context: 'risk statement only; selection score and rationale withheld',
    plausibility: mode.blind_verification.plausibility,
    impact: mode.blind_verification.impact,
    disposition: mode.blind_verification.disposition ?? 'review',
  }));
  const citations = (input.citations ?? []).map((citation) => {
    if (!citation.id || !citation.claim || !['verified', 'unresolved'].includes(citation.status)) {
      throw new Error('Citations require id, claim, and verified or unresolved status.');
    }
    if (citation.status === 'verified' && !citation.locator) throw new Error(`Verified citation '${citation.id}' requires a locator.`);
    if (citation.status === 'unresolved' && !citation.risk) throw new Error(`Unresolved citation '${citation.id}' requires a risk.`);
    return citation;
  });

  return {
    schema_version: '1',
    subject: input.subject,
    stage_order: ['diverse_failure_generation', 'bounded_deep_dive_selection', 'blind_verification'],
    diverse_failure_generation: {
      mode_count: generated.length,
      categories: [...categories].sort(),
      modes: generated,
    },
    bounded_deep_dive_selection: {
      cap: {minimum: MIN_DEEP_DIVES, maximum: MAX_DEEP_DIVES},
      selected_count: selected.length,
      selected,
    },
    blind_verification: blindVerification,
    provenance: {
      narrative_policy: 'All vivid failure narratives are hypothetical scenarios, not evidence.',
      citations,
      unresolved_citation_risks: citations
        .filter((citation) => citation.status === 'unresolved')
        .map((citation) => ({citation_id: citation.id, risk: citation.risk})),
    },
  };
}

export default async function premortemV2(args, context) {
  if (args.includes('--help') || args.includes('-h')) {
    return {exitCode: 0, message: 'Usage: aiwg premortem-v2 run [premortem.json]'};
  }
  const fixtureArg = args.find((arg) => !arg.startsWith('--'));
  const source = fixtureArg ? path.resolve(context.cwd, fixtureArg) : path.join(addonRoot, 'fixtures', 'issue-2046.json');
  const report = runPremortem(JSON.parse(await fs.readFile(source, 'utf8')));
  return {exitCode: 0, message: JSON.stringify(report, null, 2)};
}
