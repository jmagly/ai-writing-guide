import { createHash } from 'node:crypto';
import { assessWritingFidelity, type FidelityOutcome, type FidelityAssessment } from './fidelity.js';
import { parseWritingBrief, type WritingBrief } from './writing-brief.js';
import { parseWriterProfile, type WriterOverride, type WriterProfile } from './writer-profile.js';

const hash = (text: string) => createHash('sha256').update(text).digest('hex');
export interface RevisionEdit { id: string; start: number; end: number; expected: string; replacement: string; reason: string }
export interface RevisionCritique { start: number; end: number; reason: string }
export type RevisionStrength = 'preserve' | 'light' | 'substantive';
export interface RevisionReview { original: string; sourceHash: string; edits: RevisionEdit[]; candidate: string; origin: 'human' | 'generated' }
export interface HumanRevisionAcceptance extends RevisionReview {
  actor: string; acceptedIds: string[]; rejectedIds: string[]; output: string; outputHash: string; approval: 'explicit-human';
}
function validateEdits(source: string, edits: RevisionEdit[]): RevisionEdit[] {
  const sorted = structuredClone(edits).sort((a, b) => a.start - b.start || a.end - b.end);
  const boundary = (at: number) => Number.isSafeInteger(at) && at >= 0 && at <= source.length && !(at > 0 && at < source.length && /[\uD800-\uDBFF]/.test(source[at - 1]) && /[\uDC00-\uDFFF]/.test(source[at]));
  if (new Set(sorted.map(e => e.id)).size !== sorted.length) throw new Error('Duplicate revision edit IDs');
  for (let i = 0; i < sorted.length; i++) {
    const e = sorted[i];
    if (typeof e.id !== 'string' || !e.id || !boundary(e.start) || !boundary(e.end) || e.start > e.end || typeof e.expected !== 'string' || source.slice(e.start, e.end) !== e.expected || typeof e.replacement !== 'string' || !e.reason?.trim()) throw new Error('Invalid or stale revision edit');
    if (i && (e.start < sorted[i - 1].end || e.start === sorted[i - 1].start)) throw new Error('Overlapping revision edits require review');
  }
  return sorted;
}
function applyEdits(source: string, edits: RevisionEdit[]): string {
  let output = source;
  for (const e of [...validateEdits(source, edits)].reverse()) output = output.slice(0, e.start) + e.replacement + output.slice(e.end);
  return output;
}
export function createRevisionReview(original: string, edits: RevisionEdit[], origin: 'human' | 'generated' = 'human'): RevisionReview {
  if (origin !== 'human' && origin !== 'generated') throw new Error('Invalid correction origin');
  return { original, sourceHash: hash(original), edits: validateEdits(original, edits), candidate: applyEdits(original, edits), origin };
}
export function acceptRevisionEdits(review: RevisionReview, decision: { sourceHash: string; acceptedIds: string[]; rejectedIds: string[]; actor: string }): HumanRevisionAcceptance {
  const frozen = createRevisionReview(review.original, review.edits, review.origin);
  if (decision.sourceHash !== frozen.sourceHash || review.sourceHash !== frozen.sourceHash || review.candidate !== frozen.candidate) throw new Error('Stale revision source or candidate');
  const ids = [...decision.acceptedIds, ...decision.rejectedIds];
  if (!decision.actor.trim() || new Set(ids).size !== ids.length || ids.some(id => !frozen.edits.some(e => e.id === id)) || ids.length !== frozen.edits.length) throw new Error('Every edit requires exactly one explicit human decision');
  const output = applyEdits(frozen.original, frozen.edits.filter(e => decision.acceptedIds.includes(e.id)));
  return { ...frozen, actor: decision.actor, acceptedIds: [...decision.acceptedIds], rejectedIds: [...decision.rejectedIds], output, outputHash: hash(output), approval: 'explicit-human' };
}
export function undoRevisionReview(review: RevisionReview): string {
  if (hash(review.original) !== review.sourceHash) throw new Error('Stale revision source');
  return review.original;
}

export interface RevisionUsage { tokens: number; costUsd?: number; model: string; provider: string }
export interface RevisionCallResult<T> { value: T; usage?: RevisionUsage }
export interface RevisionCallContext { original: string; current: string; strength: RevisionStrength; signal: AbortSignal; maxTokens: number; brief?: WritingBrief }
export interface VoiceRevisionOptions {
  strength: RevisionStrength; brief?: WritingBrief; maxPasses?: number; tokenBudget: number; timeBudgetMs: number; perCallTokenReservation: number; signal?: AbortSignal;
  critique?: (context: RevisionCallContext) => Promise<RevisionCallResult<RevisionCritique[]>> | RevisionCallResult<RevisionCritique[]>;
  revise?: (context: RevisionCallContext & { critique: RevisionCritique[] }) => Promise<RevisionCallResult<{ candidate: string; edits: RevisionEdit[] }>> | RevisionCallResult<{ candidate: string; edits: RevisionEdit[] }>;
  /** Independent assessment: fidelity first, then task/author preference relative to current best. No detector score. */
  reviewCandidate?: (context: RevisionCallContext & { candidate: string }) => Promise<RevisionCallResult<{ fidelity: FidelityOutcome; preference: 'better' | 'same' | 'worse'; rationale: string }>> | RevisionCallResult<{ fidelity: FidelityOutcome; preference: 'better' | 'same' | 'worse'; rationale: string }>;
}
export interface RevisionCandidate {
  id: string; parentHash: string; content: string; contentHash: string; edits: RevisionEdit[]; critique: RevisionCritique[];
  fidelity: FidelityOutcome; fidelityAssessment?: FidelityAssessment; review?: { fidelity: FidelityOutcome; preference: 'better' | 'same' | 'worse'; rationale: string }; preference: 'better' | 'same' | 'worse' | 'unreviewed'; retained: boolean;
}
export interface VoiceRevisionResult {
  original: string; originalHash: string; receivedProposals: Array<{ parentHash: string; payload: unknown }>; candidates: RevisionCandidate[]; best: string; bestHash: string;
  receipt: { strength: RevisionStrength; passes: number; stopReason: string; elapsedMs: number; tokenBudget: number; chargedTokens: number; reportedTokens: number; reservedTokens: number; reportedCostUsd: number | null; costsComplete: boolean;
    calls: Array<{ phase: string; measurement: 'reported' | 'reserved-upper-bound'; chargedTokens: number; usage?: RevisionUsage }>;
    authorAcceptance: 'not-requested'; qualityClaim: 'not-qualified'; };
}
class RevisionStop extends Error { constructor(public readonly reason: string) { super(reason); } }

/** Bounded automatic assistance; artifacts survive cancellation and no judge is required for human review. */
export async function runVoiceRevision(original: string, input: VoiceRevisionOptions): Promise<VoiceRevisionResult> {
  const options = { ...input, ...(input.brief ? { brief: parseWritingBrief(input.brief) } : {}) };
  const maxPasses = options.maxPasses ?? 2;
  if (!['preserve', 'light', 'substantive'].includes(options.strength) || !Number.isSafeInteger(maxPasses) || maxPasses < 0 || maxPasses > 100 || !Number.isSafeInteger(options.tokenBudget) || options.tokenBudget < 0 || !Number.isSafeInteger(options.perCallTokenReservation) || options.perCallTokenReservation < 1 || !Number.isFinite(options.timeBudgetMs) || options.timeBudgetMs <= 0) throw new Error('Invalid revision limits');
  const started = performance.now();
  const result: VoiceRevisionResult = { original, originalHash: hash(original), receivedProposals: [], candidates: [], best: original, bestHash: hash(original), receipt: {
    strength: options.strength, passes: 0, stopReason: 'pass-limit', elapsedMs: 0, tokenBudget: options.tokenBudget, chargedTokens: 0, reportedTokens: 0, reservedTokens: 0, reportedCostUsd: null, costsComplete: true, calls: [], authorAcceptance: 'not-requested', qualityClaim: 'not-qualified',
  } };
  const remainingTime = () => options.timeBudgetMs - (performance.now() - started);
  const call = async <T>(phase: string, action: (context: RevisionCallContext) => Promise<RevisionCallResult<T>> | RevisionCallResult<T>): Promise<T> => {
    if (options.signal?.aborted) throw new RevisionStop('cancelled');
    if (remainingTime() <= 0) throw new RevisionStop('time-budget');
    const reservation = options.perCallTokenReservation;
    if (result.receipt.chargedTokens + reservation > options.tokenBudget) throw new RevisionStop('token-budget');
    const entry: VoiceRevisionResult['receipt']['calls'][number] = { phase, measurement: 'reserved-upper-bound', chargedTokens: reservation };
    result.receipt.calls.push(entry); result.receipt.chargedTokens += reservation; result.receipt.reservedTokens += reservation;
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout> | undefined; let abort: (() => void) | undefined;
    try {
      const context: RevisionCallContext = { original, current: result.best, strength: options.strength, signal: controller.signal, maxTokens: reservation, ...(options.brief ? { brief: structuredClone(options.brief) } : {}) };
      const response = await Promise.race([Promise.resolve().then(() => action(context)), new Promise<never>((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new RevisionStop('time-budget')); }, Math.max(1, remainingTime()));
        abort = () => { controller.abort(); reject(new RevisionStop('cancelled')); }; options.signal?.addEventListener('abort', abort, { once: true });
      })]);
      if (!response || !('value' in response)) throw new RevisionStop('invalid-callback');
      if (response.usage) {
        const u = response.usage;
        if (!Number.isSafeInteger(u.tokens) || u.tokens < 0 || !u.model?.trim() || !u.provider?.trim() || (u.costUsd !== undefined && (!Number.isFinite(u.costUsd) || u.costUsd < 0))) throw new RevisionStop('invalid-usage');
        entry.measurement = 'reported'; entry.chargedTokens = u.tokens; entry.usage = structuredClone(u);
        result.receipt.chargedTokens += u.tokens - reservation; result.receipt.reservedTokens -= reservation; result.receipt.reportedTokens += u.tokens;
        if (u.costUsd !== undefined) result.receipt.reportedCostUsd = (result.receipt.reportedCostUsd ?? 0) + u.costUsd;
        if (u.tokens > reservation) throw new RevisionStop('provider-budget-overrun');
      }
      if (options.signal?.aborted) throw new RevisionStop('cancelled');
      if (remainingTime() <= 0) throw new RevisionStop('time-budget');
      return structuredClone(response.value);
    } finally {
      if (timer) clearTimeout(timer); if (abort) options.signal?.removeEventListener('abort', abort);
      if (entry.usage?.costUsd === undefined) result.receipt.costsComplete = false;
    }
  };
  try {
    if (options.strength === 'preserve') throw new RevisionStop('preserve');
    if (!options.revise) throw new RevisionStop('human-review');
    for (let pass = 0; pass < maxPasses; pass++) {
      const critique = options.critique ? await call('critique', options.critique) : [];
      if (!Array.isArray(critique) || critique.some(c => !Number.isSafeInteger(c.start) || !Number.isSafeInteger(c.end) || c.start < 0 || c.end < c.start || c.end > result.best.length || !c.reason?.trim())) throw new RevisionStop('invalid-critique');
      const proposal = await call('revise', context => options.revise!({ ...context, critique: structuredClone(critique) }));
      result.receivedProposals.push({ parentHash: result.bestHash, payload: structuredClone(proposal) });
      const review = createRevisionReview(result.best, proposal.edits, 'generated');
      if (review.candidate !== proposal.candidate) throw new RevisionStop('candidate-edit-mismatch');
      result.receipt.passes++;
      const candidate: RevisionCandidate = { id: `candidate-${pass + 1}`, parentHash: result.bestHash, content: proposal.candidate, contentHash: hash(proposal.candidate), edits: review.edits, critique: structuredClone(critique), fidelity: 'uncertain', preference: 'unreviewed', retained: false };
      result.candidates.push(candidate);
      if (options.strength === 'light' && review.edits.some(e => /\r|\n/.test(e.expected + e.replacement) || !critique.some(c => c.start <= e.start && c.end >= e.end))) throw new RevisionStop('strength-limit');
      const assessment = assessWritingFidelity(original, proposal.candidate, options.brief);
      candidate.fidelity = assessment.outcome; candidate.fidelityAssessment = assessment;
      if (assessment.outcome === 'fail') throw new RevisionStop('fidelity-failure');
      if (proposal.candidate === result.best) { candidate.preference = 'same'; throw new RevisionStop('no-improvement'); }
      if (!options.reviewCandidate) throw new RevisionStop('human-review');
      const judged = await call('review', context => options.reviewCandidate!({ ...context, candidate: proposal.candidate }));
      if (!['pass', 'fail', 'uncertain'].includes(judged.fidelity) || !['better', 'same', 'worse'].includes(judged.preference) || !judged.rationale?.trim()) throw new RevisionStop('invalid-review');
      candidate.fidelity = judged.fidelity; candidate.preference = judged.preference; candidate.review = structuredClone(judged);
      if (judged.fidelity !== 'pass') throw new RevisionStop(judged.fidelity === 'fail' ? 'fidelity-failure' : 'fidelity-review');
      if (judged.preference !== 'better') throw new RevisionStop(judged.preference === 'same' ? 'no-improvement' : 'worse-candidate');
      for (const previous of result.candidates) previous.retained = false;
      candidate.retained = true; result.best = candidate.content; result.bestHash = candidate.contentHash;
    }
  } catch (error) { result.receipt.stopReason = error instanceof RevisionStop ? error.reason : 'callback-or-validation-error'; }
  result.receipt.elapsedMs = performance.now() - started;
  return result;
}

export interface WriterLearningProposal {
  schemaVersion: 1; profileId: string; expectedRevision: number; profileHash: string;
  overrides: WriterOverride[]; provenance: { actor: string; sourceHash: string; outputHash: string; correctionIds: string[] };
}
export interface WriterLearningUndo { acceptedBy: string; profileId: string; afterHash: string; previousOverrides: WriterOverride[]; provenance: WriterLearningProposal['provenance'] }
/** Only human-origin corrections explicitly accepted by a person can propose expression overrides. */
export function proposeWriterLearning(profile: WriterProfile, accepted: HumanRevisionAcceptance, overrides: WriterOverride[]): WriterLearningProposal {
  const p = parseWriterProfile(profile);
  if (accepted.origin !== 'human' || accepted.approval !== 'explicit-human' || accepted.acceptedIds.length === 0 || accepted.output === accepted.original || overrides.length === 0) throw new Error('Learning requires explicitly approved human corrections');
  const checked = acceptRevisionEdits(accepted, accepted);
  if (checked.output !== accepted.output || checked.outputHash !== accepted.outputHash) throw new Error('Stale human correction artifact');
  const validated = parseWriterProfile({ ...p, overrides: [...p.overrides, ...overrides] });
  return { schemaVersion: 1, profileId: p.id, expectedRevision: p.revision, profileHash: hash(JSON.stringify(p)), overrides: validated.overrides.slice(p.overrides.length), provenance: { actor: accepted.actor, sourceHash: accepted.sourceHash, outputHash: accepted.outputHash, correctionIds: [...accepted.acceptedIds] } };
}
function advanceProfile(p: WriterProfile): void { const parts = p.version.split('.').map(Number); parts[2]++; p.version = parts.join('.'); p.revision++; p.cacheEpoch++; }
export function acceptWriterLearning(profile: WriterProfile, proposal: WriterLearningProposal, decision: { expectedRevision: number; actor: string }): { profile: WriterProfile; undo: WriterLearningUndo } {
  const p = parseWriterProfile(profile);
  if (!decision.actor.trim() || proposal.schemaVersion !== 1 || p.id !== proposal.profileId || decision.expectedRevision !== p.revision || proposal.expectedRevision !== p.revision || proposal.profileHash !== hash(JSON.stringify(p))) throw new Error('Stale profile update or missing explicit acceptance');
  const previousOverrides = structuredClone(p.overrides);
  p.overrides.push(...structuredClone(proposal.overrides)); advanceProfile(p);
  const updated = parseWriterProfile(p);
  return { profile: updated, undo: { acceptedBy: decision.actor, profileId: updated.id, afterHash: hash(JSON.stringify(updated)), previousOverrides, provenance: structuredClone(proposal.provenance) } };
}
export function undoWriterLearning(profile: WriterProfile, undo: WriterLearningUndo): WriterProfile {
  const p = parseWriterProfile(profile);
  if (p.id !== undo.profileId || hash(JSON.stringify(p)) !== undo.afterHash) throw new Error('Stale profile undo');
  p.overrides = structuredClone(undo.previousOverrides); advanceProfile(p);
  return parseWriterProfile(p);
}
