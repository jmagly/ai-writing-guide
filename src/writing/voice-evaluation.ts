import { createHash } from 'node:crypto';
import { z } from 'zod';

const id = z.string().min(1).max(120);
const nonempty = z.string().min(1);
const sha = z.string().regex(/^[a-f0-9]{64}$/);
export const evaluationHash = (text: string): string => createHash('sha256').update(text).digest('hex');
export const EVALUATION_WORKFLOWS = ['unassisted', 'minimal-editing', 'notes-plus-author-edits', 'notes-plus-exemplars-plus-author-edits'] as const;
export const EVALUATION_CONDITIONS = Array.from({ length: 8 }, (_, n) => ({
  id: `r${(n >> 2) & 1}v${(n >> 1) & 1}e${n & 1}`,
  rules: Boolean(n & 4), voiceDescription: Boolean(n & 2), exemplars: Boolean(n & 1),
}));
export const EVALUATION_DIMENSIONS = ['factual-fidelity', 'author-authenticity', 'reader-suitability', 'effort', 'within-author-preservation', 'between-author-diversity'] as const;
export type EvaluationDimension = typeof EVALUATION_DIMENSIONS[number];
const model = z.object({ id, family: nonempty, provider: nonempty, snapshot: nonempty, decoding: z.record(z.string(), z.union([z.string(), z.number().finite(), z.boolean(), z.null()])), promptSha256: sha }).strict();
const document = z.object({ id, authorId: id, topic: nonempty, split: z.enum(['development', 'enrollment', 'heldout']), text: nonempty, sha256: sha }).strict();
export const evaluationManifestSchema = z.object({
  schemaVersion: z.literal(1), id,
  developmentAuthorIds: z.array(id), finalAuthorIds: z.array(id), documents: z.array(document),
  duplicatePolicy: z.object({ metric: z.literal('normalized-word-trigram-jaccard-v1'), threshold: z.number().gt(0).lte(1), justification: nonempty }).strict(),
  controls: z.array(z.object({ kind: z.enum(['same-author-different-topic', 'different-author-same-topic']), leftDocumentId: id, rightDocumentId: id }).strict()),
  models: z.array(model), extractionModelIds: z.array(id),
  judges: z.array(z.object({ id, modelId: id, role: z.literal('reader').default('reader'), independentCalibrationSha256: sha, selfPreferenceAuditSha256: sha }).strict()),
  humanJudges: z.array(z.object({ id, role: z.enum(['author', 'reader']), authorId: id.optional() }).strict()).default([]),
  voluntaryStrata: z.array(z.object({ authorId: id, suppliedByAuthor: z.literal(true), language: nonempty.optional(), proficiency: nonempty.optional() }).strict()),
}).strict();
export type EvaluationManifest = z.infer<typeof evaluationManifestSchema>;
const unique = (items: string[]) => new Set(items).size === items.length;
const words = (text: string) => text.normalize('NFKC').toLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu) ?? [];
function shingles(text: string): Set<string> {
  const w = words(text); const size = Math.min(3, w.length);
  return new Set(Array.from({ length: Math.max(0, w.length - size + 1) }, (_, i) => w.slice(i, i + size).join(' ')));
}
function nearDuplicate(left: string, right: string, threshold: number): boolean {
  if (words(left).join(' ') === words(right).join(' ')) return true;
  const a = shingles(left); const b = shingles(right); const intersection = [...a].filter(v => b.has(v)).length;
  return intersection / (a.size + b.size - intersection) >= threshold;
}
/** Reject contaminated manifests before fitting. Checks supplied texts, not undisclosed data or semantic paraphrases. */
export function parseEvaluationManifest(value: unknown): EvaluationManifest {
  const m = evaluationManifestSchema.parse(value);
  for (const ids of [m.developmentAuthorIds, m.finalAuthorIds, m.documents.map(d => d.id), m.models.map(v => v.id), [...m.judges, ...m.humanJudges].map(v => v.id), m.extractionModelIds, m.voluntaryStrata.map(v => v.authorId)]) if (!unique(ids)) throw new Error('Duplicate evaluation identifiers');
  if (m.developmentAuthorIds.some(a => m.finalAuthorIds.includes(a))) throw new Error('Development and final authors overlap');
  for (const d of m.documents) {
    if (evaluationHash(d.text) !== d.sha256) throw new Error('Document integrity mismatch');
    if (!(d.split === 'development' ? m.developmentAuthorIds : m.finalAuthorIds).includes(d.authorId)) throw new Error('Document violates author partition');
  }
  for (let i = 0; i < m.documents.length; i++) for (let j = i + 1; j < m.documents.length; j++) {
    if (nearDuplicate(m.documents[i].text, m.documents[j].text, m.duplicatePolicy.threshold)) throw new Error('Duplicate or near-duplicate documents must be excluded before fitting');
  }
  const documents = new Map(m.documents.map(d => [d.id, d]));
  for (const c of m.controls) {
    const a = documents.get(c.leftDocumentId); const b = documents.get(c.rightDocumentId);
    if (!a || !b || a.id === b.id) throw new Error('Control references missing or identical documents');
    if (c.kind === 'same-author-different-topic' ? a.authorId !== b.authorId || a.topic === b.topic : a.authorId === b.authorId || a.topic !== b.topic) throw new Error('Control does not match declared author/topic relationship');
  }
  const models = new Map(m.models.map(v => [v.id, v]));
  if (m.extractionModelIds.some(v => !models.has(v))) throw new Error('Unknown extraction model');
  const extractionFamilies = new Set(m.extractionModelIds.map(v => models.get(v)!.family));
  for (const judge of m.judges) {
    const selected = models.get(judge.modelId);
    if (!selected || extractionFamilies.has(selected.family) || m.extractionModelIds.some(id => { const extraction = models.get(id)!; return extraction.provider === selected.provider && extraction.snapshot === selected.snapshot; })) throw new Error('Judge must be independent of extraction model family');
  }
  if (m.humanJudges.some(j => j.role === 'author' && (!j.authorId || !m.finalAuthorIds.includes(j.authorId)))) throw new Error('Author judges require a known final author');
  if (m.voluntaryStrata.some(v => ![...m.developmentAuthorIds, ...m.finalAuthorIds].includes(v.authorId))) throw new Error('Unknown voluntary stratum author');
  return m;
}

const preregistrationSchema = z.object({
  schemaVersion: z.literal(1), id, manifestSha256: sha,
  pilot: z.object({ artifactSha256: sha, completedAt: z.string().datetime(), authorIds: z.array(id).min(1), findings: nonempty }).strict(),
  registeredAt: z.string().datetime(), finalDataNotAccessed: z.literal(true),
  plannedAuthors: z.number().int().min(2), sampleSizeJustification: nonempty,
  thresholds: z.array(z.object({ dimension: z.enum(EVALUATION_DIMENSIONS), value: z.number().finite(), direction: z.enum(['at-least', 'at-most']), justification: nonempty }).strict()).min(1),
  primaryOutcomes: z.array(z.enum(EVALUATION_DIMENSIONS)).min(1), analysisPlan: nonempty,
  selectorPoliciesSha256: sha, budget: z.object({ limit: z.number().int().positive(), tokenizerId: nonempty, tokenizerVersion: nonempty }).strict(),
}).strict();
export type EvaluationPreregistration = z.infer<typeof preregistrationSchema>;
/** Records caller declarations; hashes/timestamps do not attest that a pilot occurred or final data stayed unseen. */
export function preregisterEvaluation(manifest: EvaluationManifest, value: unknown): EvaluationPreregistration {
  const m = parseEvaluationManifest(manifest); const p = preregistrationSchema.parse(value);
  if (p.manifestSha256 !== evaluationHash(JSON.stringify(m))) throw new Error('Preregistration does not bind this manifest');
  if (Date.parse(p.registeredAt) <= Date.parse(p.pilot.completedAt)) throw new Error('Preregister after pilot completion');
  if (!unique(p.pilot.authorIds) || p.pilot.authorIds.some(a => !m.developmentAuthorIds.includes(a))) throw new Error('Pilot authors must come from development partition');
  if (!unique(p.primaryOutcomes) || !unique(p.thresholds.map(t => t.dimension))) throw new Error('Duplicate preregistered outcomes');
  return p;
}

const stimulusSchema = z.object({ id, taskId: id, authorId: id, heldoutDocumentId: id, text: nonempty, sha256: sha, budgetUsed: z.number().int().nonnegative(), tokenizerId: nonempty, tokenizerVersion: nonempty, conditionId: z.enum(['r0v0e0', 'r0v0e1', 'r0v1e0', 'r0v1e1', 'r1v0e0', 'r1v0e1', 'r1v1e0', 'r1v1e1']), workflow: z.enum(EVALUATION_WORKFLOWS), modelId: id.nullable(), genre: nonempty, lengthBand: nonempty, editingStrength: nonempty }).strict();
export type EvaluationStimulus = z.infer<typeof stimulusSchema>;
export interface BlindEvaluationPacket { packetId: string; role: 'author' | 'reader'; items: Array<{ label: string; text: string }> }
export interface EvaluationPrivateKey { packetId: string; judgeId: string; role: 'author' | 'reader'; items: Array<{ label: string; stimulus: EvaluationStimulus }> }
/** Latin-square rotations plus reversed blocks. Balance is exact only for complete 2N-judge blocks per role. */
export function createBlindEvaluationPackets(stimuliInput: EvaluationStimulus[], judges: Array<{ id: string; role: 'author' | 'reader' }>, seed: string): { packets: BlindEvaluationPacket[]; privateKeyMap: EvaluationPrivateKey[]; balance: string } {
  const stimuli = z.array(stimulusSchema).min(2).parse(stimuliInput);
  if (stimuli.some(s => evaluationHash(s.text) !== s.sha256)) throw new Error('Stimulus integrity mismatch');
  z.array(z.object({ id, role: z.enum(['author', 'reader']) }).strict()).min(1).parse(judges);
  if (!seed || !unique(stimuli.map(s => s.id)) || !unique(judges.map(j => j.id))) throw new Error('Seed and unique stimulus/judge IDs required');
  if (new Set(stimuli.map(s => `${s.authorId}\0${s.taskId}\0${s.heldoutDocumentId}`)).size !== 1) throw new Error('Blind block must compare one author and task');
  const shuffled = [...stimuli].sort((a, b) => evaluationHash(`${seed}:stimulus:${a.id}`).localeCompare(evaluationHash(`${seed}:stimulus:${b.id}`)));
  const packets: BlindEvaluationPacket[] = []; const privateKeyMap: EvaluationPrivateKey[] = [];
  for (const role of ['author', 'reader'] as const) {
    const group = judges.filter(j => j.role === role).sort((a, b) => evaluationHash(`${seed}:judge:${a.id}`).localeCompare(evaluationHash(`${seed}:judge:${b.id}`)));
    group.forEach((judge, index) => {
      const base = Math.floor(index / stimuli.length) % 2 ? [...shuffled].reverse() : shuffled;
      const offset = index % stimuli.length; const ordered = [...base.slice(offset), ...base.slice(0, offset)];
      const packetId = evaluationHash(`${seed}:${role}:${judge.id}:${JSON.stringify(stimuli)}`).slice(0, 24);
      const items = ordered.map((stimulus, i) => ({ label: `option-${i + 1}`, stimulus }));
      packets.push({ packetId, role, items: items.map(i => ({ label: i.label, text: i.stimulus.text })) });
      privateKeyMap.push({ packetId, judgeId: judge.id, role, items });
    });
  }
  return { packets, privateKeyMap, balance: 'Rotations/reversal by role; complete 2N blocks balance positions and reversal, incomplete blocks may be imbalanced. Text itself may reveal authorship or condition.' };
}

function validateManifestStimuli(m: EvaluationManifest, input: EvaluationStimulus[]): EvaluationStimulus[] {
  const stimuli = z.array(stimulusSchema).parse(input); const models = new Map(m.models.map(v => [v.id, v]));
  if (!unique(stimuli.map(s => s.id))) throw new Error('Duplicate stimulus IDs');
  if (stimuli.some(s => !m.finalAuthorIds.includes(s.authorId) || s.modelId !== null && !models.has(s.modelId))) throw new Error('Unknown final author or model');
  for (const s of stimuli) {
    const task = m.documents.find(d => d.id === s.heldoutDocumentId);
    if (!task || task.split !== 'heldout' || task.authorId !== s.authorId || evaluationHash(s.text) !== s.sha256) throw new Error('Stimulus must bind a heldout author document and output hash');
    if (s.workflow === 'unassisted' && (s.modelId !== null || s.conditionId !== 'r0v0e0') || s.workflow !== 'unassisted' && s.modelId === null) throw new Error('Workflow/model labels conflict');
    if (s.workflow === 'notes-plus-exemplars-plus-author-edits' && !s.conditionId.endsWith('e1') || s.workflow === 'notes-plus-author-edits' && s.conditionId.endsWith('e1')) throw new Error('Workflow/exemplar labels conflict');
  }
  return stimuli;
}

export interface EvaluationRating { stimulusId: string; authorId: string; judgeId: string; role: 'author' | 'reader'; dimension: EvaluationDimension; value: number | null; missingReason?: string; tie: boolean }
export interface EvaluationRatingAssignment { stimulusId: string; judgeId: string; role: 'author' | 'reader'; dimension: EvaluationDimension }
export interface EvaluationRatingContext { manifest: EvaluationManifest; stimuli: EvaluationStimulus[]; assignments?: EvaluationRatingAssignment[] }
function ingestRatings(ratings: EvaluationRating[], context?: EvaluationRatingContext): EvaluationRating[] {
  const parsed = z.array(z.object({ stimulusId: id, authorId: id, judgeId: id, role: z.enum(['author', 'reader']), dimension: z.enum(EVALUATION_DIMENSIONS), value: z.number().finite().nullable(), missingReason: nonempty.optional(), tie: z.boolean() }).strict()).parse(ratings);
  if (!unique(parsed.map(r => JSON.stringify([r.stimulusId, r.judgeId, r.role, r.dimension])))) throw new Error('Duplicate rating observations');
  if (parsed.some(r => r.value === null && (!r.missingReason || r.tie) || r.value !== null && r.missingReason !== undefined)) throw new Error('Missing ratings require a reason and cannot also be a tie');
  if (!context) return parsed;
  const m = parseEvaluationManifest(context.manifest); const stimuli = validateManifestStimuli(m, context.stimuli);
  const judges = new Map([...m.judges, ...m.humanJudges].map(j => [j.id, j]));
  const key = (r: EvaluationRatingAssignment) => JSON.stringify([r.stimulusId, r.judgeId, r.role, r.dimension]);
  const validate = (r: EvaluationRatingAssignment) => {
    const stimulus = stimuli.find(s => s.id === r.stimulusId); const judge = judges.get(r.judgeId);
    if (!stimulus || !judge || judge.role !== r.role || 'authorId' in judge && judge.role === 'author' && judge.authorId !== stimulus.authorId) throw new Error('Unknown or incompatible rating judge, role or stimulus');
    return stimulus;
  };
  for (const r of parsed) if (validate(r).authorId !== r.authorId) throw new Error('Rating/stimulus author mismatch');
  if (context.assignments !== undefined) {
    const assignments = z.array(z.object({ stimulusId: id, judgeId: id, role: z.enum(['author', 'reader']), dimension: z.enum(EVALUATION_DIMENSIONS) }).strict()).parse(context.assignments);
    if (!unique(assignments.map(key))) throw new Error('Duplicate rating assignments');
    for (const assignment of assignments) validate(assignment);
    const expected = new Set(assignments.map(key));
    if (parsed.some(r => !expected.has(key(r)))) throw new Error('Unassigned rating observation');
    const received = new Set(parsed.map(key));
    for (const assignment of assignments) if (!received.has(key(assignment))) parsed.push({ ...assignment, authorId: validate(assignment).authorId, value: null, missingReason: 'assigned-rating-not-returned', tie: false });
  }
  const kinds = new Set(parsed.map(r => m.judges.some(j => j.id === r.judgeId) ? 'model' : 'human'));
  if (kinds.size > 1) throw new Error('Human outcomes and model diagnostics require separate aggregation calls');
  return parsed;
}
export function summarizeEvaluationRatings(ratings: EvaluationRating[], context?: EvaluationRatingContext) {
  const parsed = ingestRatings(ratings, context);
  const judgeKind = !context || !parsed.length ? 'unknown' : context.manifest.judges.some(j => j.id === parsed[0].judgeId) ? 'model' : 'human';
  return (['author', 'reader'] as const).flatMap(role => EVALUATION_DIMENSIONS.map(dimension => {
    const group = parsed.filter(r => r.role === role && r.dimension === dimension); const observed = group.filter(r => r.value !== null);
    return { role, dimension, judgeKind, missingnessCompleteness: context?.assignments === undefined ? 'unknown' as const : 'declared-assignments' as const, observed: observed.length, missing: group.length - observed.length, ties: observed.filter(r => r.tie).length, mean: observed.length ? observed.reduce((sum, r) => sum + r.value!, 0) / observed.length : null };
  }));
}

function random(seed: string): () => number {
  let state = Number.parseInt(evaluationHash(seed).slice(0, 8), 16);
  return () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return state / 0x100000000; };
}
/** Equal-weight author means, then author-cluster percentile bootstrap; no independent-text pseudo-replication. */
export function bootstrapAuthorMeans(rows: Array<{ authorId: string; value: number | null }>, options: { seed: string; iterations: number; confidence: number }) {
  z.array(z.object({ authorId: id, value: z.number().finite().nullable() }).strict()).parse(rows);
  if (!options.seed || !Number.isSafeInteger(options.iterations) || options.iterations < 2 || !Number.isFinite(options.confidence) || options.confidence <= 0 || options.confidence >= 1) throw new Error('Invalid bootstrap options');
  const authors = [...new Set(rows.map(r => r.authorId))].sort();
  const means = authors.map(authorId => rows.filter(r => r.authorId === authorId && r.value !== null).map(r => r.value!)).filter(v => v.length).map(v => v.reduce((a, b) => a + b, 0) / v.length);
  const estimate = means.length ? means.reduce((a, b) => a + b, 0) / means.length : null;
  if (means.length < 2) return { estimate, interval: null, authors: means.length, excludedAuthors: authors.length - means.length, method: 'author-cluster-percentile' as const };
  const rng = random(options.seed); const draws: number[] = [];
  for (let i = 0; i < options.iterations; i++) { let sum = 0; for (let j = 0; j < means.length; j++) sum += means[Math.floor(rng() * means.length)]; draws.push(sum / means.length); }
  draws.sort((a, b) => a - b); const tail = (1 - options.confidence) / 2;
  return { estimate, interval: [draws[Math.floor(tail * (draws.length - 1))], draws[Math.ceil((1 - tail) * (draws.length - 1))]], authors: means.length, excludedAuthors: authors.length - means.length, method: 'author-cluster-percentile' as const };
}

/** Outcomes must already share a preregistered decision rule; never compare arbitrary raw scales. */
export function reportMetricDisagreement(rows: Array<{ itemId: string; human: 'pass' | 'fail' | 'tie' | null; metric: 'pass' | 'fail' | 'tie' | null }>, calibration: { humanReferenceSha256: string; independentOfFinalData: true; decisionRule: string }) {
  z.object({ humanReferenceSha256: sha, independentOfFinalData: z.literal(true), decisionRule: nonempty }).strict().parse(calibration);
  const outcome = z.enum(['pass', 'fail', 'tie']).nullable();
  z.array(z.object({ itemId: id, human: outcome, metric: outcome }).strict()).parse(rows);
  if (!unique(rows.map(r => r.itemId))) throw new Error('Duplicate metric comparison IDs');
  const paired = rows.filter(r => r.human !== null && r.metric !== null); const disagreements = paired.filter(r => r.human !== r.metric);
  return { paired: paired.length, missing: rows.length - paired.length, ties: paired.filter(r => r.human === 'tie' || r.metric === 'tie').length, disagreements: disagreements.map(r => r.itemId), disagreementRate: paired.length ? disagreements.length / paired.length : null, calibration: { ...calibration }, authorshipCertification: false as const };
}

/** Qualification is a design completeness check, not a quality verdict or evidence that humans participated. */
export function evaluationDesignReadiness(manifest: EvaluationManifest, preregistration: EvaluationPreregistration, stimuliInput: EvaluationStimulus[]) {
  const m = parseEvaluationManifest(manifest); const p = preregisterEvaluation(m, preregistration); const stimuli = validateManifestStimuli(m, stimuliInput);
  const gaps: string[] = []; const models = new Map(m.models.map(v => [v.id, v]));
  for (const s of stimuli) if (s.budgetUsed > p.budget.limit || s.tokenizerId !== p.budget.tokenizerId || s.tokenizerVersion !== p.budget.tokenizerVersion) throw new Error('Stimulus violates frozen budget/tokenizer');
  if (new Set(stimuli.filter(s => s.modelId !== null).map(s => models.get(s.modelId!)!.family)).size < 2) gaps.push('at-least-two-model-families');
  if (m.finalAuthorIds.length < p.plannedAuthors) gaps.push('preregistered-author-count');
  for (const author of m.finalAuthorIds) for (const split of ['enrollment', 'heldout']) if (!m.documents.some(d => d.authorId === author && d.split === split)) gaps.push(`document:${author}:${split}`);
  for (const kind of ['same-author-different-topic', 'different-author-same-topic']) if (!m.controls.some(c => c.kind === kind)) gaps.push(`control:${kind}`);
  const families = [...new Set(stimuli.filter(s => s.modelId !== null).map(s => models.get(s.modelId!)!.family))];
  for (const task of m.documents.filter(d => d.split === 'heldout')) for (const family of families) {
    const available = stimuli.filter(s => s.heldoutDocumentId === task.id && s.modelId !== null && models.get(s.modelId!)!.family === family);
    for (const c of EVALUATION_CONDITIONS) if (!available.some(s => s.conditionId === c.id && s.workflow.startsWith('notes-plus'))) gaps.push(`condition:${task.id}:${family}:${c.id}`);
  }
  for (const workflow of EVALUATION_WORKFLOWS) if (!stimuli.some(s => s.workflow === workflow)) gaps.push(`workflow:${workflow}`);
  return { designComplete: gaps.length === 0, gaps, humanEvaluation: 'not-established' as const, qualityVerdict: 'not-established' as const };
}

/** Descriptive subgroup estimates only; sparse cells return no interval. No inferred demographic strata. */
export function summarizeEvaluationByStratum(manifest: EvaluationManifest, stimuli: EvaluationStimulus[], ratings: EvaluationRating[], options: { seed: string; iterations: number; confidence: number; assignments?: EvaluationRatingAssignment[] }) {
  const m = parseEvaluationManifest(manifest);
  const parsed = validateManifestStimuli(m, stimuli);
  const ingested = ingestRatings(ratings, { manifest: m, stimuli: parsed, assignments: options.assignments });
  const judgeKind = !ingested.length ? 'unknown' : m.judges.some(j => j.id === ingested[0].judgeId) ? 'model' : 'human';
  const groups = new Map<string, Array<{ authorId: string; value: number | null }>>();
  for (const r of ingested) {
    const s = parsed.find(v => v.id === r.stimulusId);
    if (!s || s.authorId !== r.authorId) throw new Error('Rating/stimulus author mismatch');
    const voluntary = m.voluntaryStrata.find(v => v.authorId === r.authorId);
    const family = s.modelId === null ? 'unassisted' : m.models.find(v => v.id === s.modelId)?.family;
    if (!family) throw new Error('Unknown model family');
    const stratum = { condition: s.conditionId, workflow: s.workflow, genre: s.genre, length: s.lengthBand, editingStrength: s.editingStrength, language: voluntary?.language ?? 'not-supplied', proficiency: voluntary?.proficiency ?? 'not-supplied', modelFamily: family };
    for (const [axis, value] of Object.entries(stratum)) {
      const key = JSON.stringify([axis, value, r.role, r.dimension]);
      const group = groups.get(key) ?? []; group.push({ authorId: r.authorId, value: r.value }); groups.set(key, group);
    }
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, rows]) => {
    const [axis, value, role, dimension] = JSON.parse(key) as string[];
    return { axis, value, role, dimension, judgeKind, missingnessCompleteness: options.assignments === undefined ? 'unknown' as const : 'declared-assignments' as const, missing: rows.filter(r => r.value === null).length, ...bootstrapAuthorMeans(rows, { ...options, seed: `${options.seed}:${key}` }) };
  });
}
