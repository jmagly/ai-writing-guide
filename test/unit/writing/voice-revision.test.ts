import { describe, expect, it } from 'vitest';
import { runVoiceRevision, createRevisionReview, acceptRevisionEdits, undoRevisionReview, proposeWriterLearning, acceptWriterLearning, undoWriterLearning, type VoiceRevisionOptions } from '../../../src/writing/voice-revision.js';
import { parseWriterProfile } from '../../../src/writing/writer-profile.js';

const replace = (source: string, before: string, after: string, id = 'edit') => ({ id, start: source.indexOf(before), end: source.indexOf(before) + before.length, expected: before, replacement: after, reason: 'Author expression preference' });
const defaults: VoiceRevisionOptions = { strength: 'substantive', tokenBudget: 1000, perCallTokenReservation: 100, timeBudgetMs: 5000 };
const better = () => ({ value: { fidelity: 'pass' as const, preference: 'better' as const, rationale: 'Independent task and author review.' } });
const original = 'A clear statement.';
function proposer(current: string, replacement: string) {
  return { value: { candidate: current.replace('clear', replacement), edits: [replace(current, 'clear', replacement)] } };
}

describe('bounded voice revision artifacts', () => {
  it('preserves original with no callbacks when preserve strength is selected', async () => {
    let called = false;
    const result = await runVoiceRevision(original, { ...defaults, strength: 'preserve', revise: () => { called = true; return proposer(original, 'useful'); } });
    expect(called).toBe(false); expect(result.best).toBe(original); expect(result.receipt.stopReason).toBe('preserve');
  });
  it('retains a reviewable generated candidate without requiring an automatic judge', async () => {
    const result = await runVoiceRevision(original, { ...defaults, revise: c => proposer(c.current, 'useful') });
    expect(result.best).toBe(original); expect(result.candidates[0].content).toBe('A useful statement.');
    expect(result.candidates[0].retained).toBe(false); expect(result.receipt.stopReason).toBe('human-review');
    expect(result.receipt.authorAcceptance).toBe('not-requested');
  });
  it('retains the best valid candidate when a second pass is worse', async () => {
    let pass = 0;
    const result = await runVoiceRevision(original, { ...defaults,
      revise: c => { pass++; const word = pass === 1 ? 'clear' : 'useful'; const next = pass === 1 ? 'useful' : 'brief'; return { value: { candidate: c.current.replace(word, next), edits: [replace(c.current, word, next)] } }; },
      reviewCandidate: () => ({ value: { fidelity: 'pass', preference: pass === 1 ? 'better' : 'worse', rationale: 'Independent comparison to current best.' } }),
    });
    expect(result.best).toBe('A useful statement.'); expect(result.candidates).toHaveLength(2);
    expect(result.receipt).toMatchObject({ passes: 2, stopReason: 'worse-candidate' });
    expect(result.candidates.map(c => c.retained)).toEqual([true, false]);
  });
  it('marks only the final best candidate retained after two improving passes', async () => {
    const result = await runVoiceRevision(original, { ...defaults,
      revise: c => { const word = c.current.includes('clear') ? 'clear' : 'useful'; const next = word === 'clear' ? 'useful' : 'concise'; return { value: { candidate: c.current.replace(word, next), edits: [replace(c.current, word, next)] } }; },
      reviewCandidate: better,
    });
    expect(result.best).toBe('A concise statement.');
    expect(result.candidates.map(c => c.retained)).toEqual([false, true]);
    expect(result.receipt).toMatchObject({ passes: 2, stopReason: 'pass-limit' });
  });
  it('stops on equal content or no preference improvement', async () => {
    const equal = await runVoiceRevision(original, { ...defaults, revise: () => ({ value: { candidate: original, edits: [] } }), reviewCandidate: better });
    expect(equal.receipt.stopReason).toBe('no-improvement');
    const judged = await runVoiceRevision(original, { ...defaults, revise: c => proposer(c.current, 'useful'), reviewCandidate: () => ({ value: { fidelity: 'pass', preference: 'same', rationale: 'No useful improvement.' } }) });
    expect(judged.best).toBe(original); expect(judged.receipt.stopReason).toBe('no-improvement');
  });
  it('prioritizes literal quantity failure over a favorable automatic judge', async () => {
    let judged = false;
    const source = 'Support covers 2 files.';
    const result = await runVoiceRevision(source, { ...defaults, revise: () => ({ value: { candidate: 'Support covers 3 files.', edits: [replace(source, '2', '3')] } }), reviewCandidate: () => { judged = true; return better(); } });
    expect(judged).toBe(false); expect(result.best).toBe(source); expect(result.receipt.stopReason).toBe('fidelity-failure');
  });
  it('allows an explicit reviewer to assess a bounded repair that removes an unsupported negation', async () => {
    const source = 'The paths do not fit a standard adapter. Preview checks are limited.';
    const corrected = 'The paths require a distinct adapter. Preview checks are limited.';
    const edit = replace(source, 'The paths do not fit a standard adapter.', 'The paths require a distinct adapter.');
    for (const outcome of ['pass', 'fail', 'uncertain'] as const) {
      let reviewed = false;
      const result = await runVoiceRevision(source, { ...defaults, strength: 'light', maxPasses: 1,
        critique: () => ({ value: [{ start: edit.start, end: edit.end, reason: 'The supplied evidence establishes a distinct adapter, not a comparison.' }] }),
        revise: () => ({ value: { candidate: corrected, edits: [edit] } }),
        reviewCandidate: () => { reviewed = true; return { value: { fidelity: outcome, preference: 'better', rationale: 'Fixture reviewer decision bound to the repair.' } }; } });
      expect(reviewed).toBe(true); expect(result.best).toBe(outcome === 'pass' ? corrected : source);
    }
  });
  it('requires explicit independent fidelity pass before retaining changed prose', async () => {
    const result = await runVoiceRevision(original, { ...defaults, revise: c => proposer(c.current, 'useful'), reviewCandidate: () => ({ value: { fidelity: 'uncertain', preference: 'better', rationale: 'Meaning still needs review.' } }) });
    expect(result.best).toBe(original); expect(result.receipt.stopReason).toBe('fidelity-review');
  });
  it('enforces light edits within located critique spans and without paragraph changes', async () => {
    const allowed = await runVoiceRevision(original, { ...defaults, strength: 'light', maxPasses: 1,
      critique: () => ({ value: [{ start: 2, end: 7, reason: 'Inspect this word.' }] }), revise: c => proposer(c.current, 'useful'), reviewCandidate: better });
    expect(allowed.best).toBe('A useful statement.');
    const blocked = await runVoiceRevision(original, { ...defaults, strength: 'light', revise: c => proposer(c.current, 'useful'), reviewCandidate: better });
    expect(blocked.best).toBe(original); expect(blocked.receipt.stopReason).toBe('strength-limit');
  });
  it('does not start a callback without enough reserved token budget', async () => {
    let called = false;
    const result = await runVoiceRevision(original, { ...defaults, tokenBudget: 99, revise: () => { called = true; return proposer(original, 'useful'); } });
    expect(called).toBe(false); expect(result.receipt.stopReason).toBe('token-budget'); expect(result.receipt.chargedTokens).toBe(0);
  });
  it('distinguishes reported usage from reserved upper bounds and records actual costs only', async () => {
    const result = await runVoiceRevision(original, { ...defaults, maxPasses: 1,
      revise: c => ({ ...proposer(c.current, 'useful'), usage: { tokens: 20, costUsd: 0.002, provider: 'synthetic-fixture', model: 'deterministic-callback-v1' } }), reviewCandidate: better });
    expect(result.receipt).toMatchObject({ chargedTokens: 120, reportedTokens: 20, reservedTokens: 100, reportedCostUsd: 0.002, costsComplete: false });
    expect(result.receipt.calls.map(c => c.measurement)).toEqual(['reported', 'reserved-upper-bound']);
    expect(result.receipt.elapsedMs).toBeGreaterThanOrEqual(0);
    expect(result.best).not.toContain('cost');
  });
  it('stops and reports callback token overruns rather than hiding observed charges', async () => {
    const result = await runVoiceRevision(original, { ...defaults, revise: c => ({ ...proposer(c.current, 'useful'), usage: { tokens: 101, provider: 'fixture', model: 'fixture' } }) });
    expect(result.receipt.stopReason).toBe('provider-budget-overrun'); expect(result.receipt.chargedTokens).toBe(101); expect(result.best).toBe(original);
  });
  it('cancellation retains recoverable original/candidate artifacts and reserved charge', async () => {
    const controller = new AbortController();
    const result = await runVoiceRevision(original, { ...defaults, signal: controller.signal,
      revise: c => proposer(c.current, 'useful'), reviewCandidate: () => { controller.abort(); return new Promise(() => {}); } });
    expect(result.receipt.stopReason).toBe('cancelled'); expect(result.original).toBe(original);
    expect(result.candidates).toHaveLength(1); expect(result.receipt.reservedTokens).toBe(200);
  });
  it('timeout returns recoverable artifacts even for an uncooperative callback', async () => {
    const result = await runVoiceRevision(original, { ...defaults, timeBudgetMs: 10, revise: () => new Promise(() => {}) });
    expect(result.receipt.stopReason).toBe('time-budget'); expect(result.best).toBe(original); expect(result.receipt.reservedTokens).toBe(100);
  });
  it('preserves received proposal data even when candidate and located edits disagree', async () => {
    const payload = { candidate: 'Unmatched output.', edits: [] };
    const result = await runVoiceRevision(original, { ...defaults, revise: () => ({ value: payload }) });
    expect(result.receipt.stopReason).toBe('candidate-edit-mismatch');
    expect(result.receivedProposals[0].payload).toEqual(payload);
    expect(result.best).toBe(original);
  });
  it('retains artifacts and redacts arbitrary callback error details', async () => {
    const result = await runVoiceRevision(original, { ...defaults, revise: () => { throw new Error('Private author text'); } });
    expect(result.receipt.stopReason).toBe('callback-or-validation-error'); expect(JSON.stringify(result.receipt)).not.toContain('Private author text');
  });
});

describe('human edit decisions and explicit profile learning', () => {
  const source = '🧵 Clear words. Short lines.';
  const edits = [replace(source, 'Clear', 'Plain', 'one'), replace(source, 'Short', 'Brief', 'two')];
  const p = () => parseWriterProfile({ schemaVersion: 1, id: 'author', version: '1.0.0', name: 'Author', provenance: { source: 'author', license: 'owned' }, samples: [], preferences: [] });
  it('supports partial acceptance, rejection and exact original recovery without a judge', () => {
    const review = createRevisionReview(source, edits);
    const accepted = acceptRevisionEdits(review, { sourceHash: review.sourceHash, acceptedIds: ['one'], rejectedIds: ['two'], actor: 'author' });
    expect(accepted.output).toBe('🧵 Plain words. Short lines.'); expect(undoRevisionReview(accepted)).toBe(source);
    expect(accepted.candidate).toBe('🧵 Plain words. Brief lines.');
  });
  it('rejects stale sources, overlapping edits and missing human decisions', () => {
    const review = createRevisionReview(source, edits);
    expect(() => acceptRevisionEdits(review, { sourceHash: 'stale', acceptedIds: ['one'], rejectedIds: ['two'], actor: 'author' })).toThrow('Stale');
    expect(() => createRevisionReview(source, [edits[0], { ...edits[0], id: 'overlap' }])).toThrow('Overlapping');
    expect(() => acceptRevisionEdits(review, { sourceHash: review.sourceHash, acceptedIds: ['one'], rejectedIds: [], actor: 'author' })).toThrow('Every edit');
  });
  it('rejects edit boundaries that split a Unicode surrogate pair', () => {
    expect(() => createRevisionReview(source, [{ id: 'split', start: 1, end: 2, expected: source.slice(1, 2), replacement: '', reason: 'Invalid partial character' }])).toThrow('Invalid');
  });
  it('requires a separate profile acceptance and supports versioned undo with provenance', () => {
    const profile = p(); const review = createRevisionReview(source, edits);
    const accepted = acceptRevisionEdits(review, { sourceHash: review.sourceHash, acceptedIds: ['one'], rejectedIds: ['two'], actor: 'author' });
    const proposal = proposeWriterLearning(profile, accepted, [{ key: 'lexicalChoice', action: 'set', value: 'familiar' }]);
    expect(profile.overrides).toEqual([]); expect(proposal.provenance.correctionIds).toEqual(['one']);
    const applied = acceptWriterLearning(profile, proposal, { expectedRevision: 1, actor: 'author' });
    expect(applied.profile.overrides).toEqual(proposal.overrides); expect(applied.profile.revision).toBe(2);
    const undone = undoWriterLearning(applied.profile, applied.undo);
    expect(undone.overrides).toEqual([]); expect(undone.revision).toBe(3); expect(undone.cacheEpoch).toBe(2);
    expect(() => acceptWriterLearning(applied.profile, proposal, { expectedRevision: 1, actor: 'author' })).toThrow('Stale');
    expect(() => undoWriterLearning(undone, applied.undo)).toThrow('Stale');
  });
  it('does not let extra decision fields relabel generated content as human corrections', () => {
    const review = createRevisionReview(source, edits, 'generated');
    const decision = { sourceHash: review.sourceHash, acceptedIds: ['one'], rejectedIds: ['two'], actor: 'author', origin: 'human' };
    const accepted = acceptRevisionEdits(review, decision);
    expect(accepted.origin).toBe('generated');
    expect(() => proposeWriterLearning(p(), accepted, [{ key: 'lexicalChoice', action: 'set', value: 'familiar' }])).toThrow('human corrections');
  });
  it('cannot derive profile changes from unapproved or generated candidates', () => {
    const review = createRevisionReview(source, edits, 'generated');
    const accepted = acceptRevisionEdits(review, { sourceHash: review.sourceHash, acceptedIds: ['one'], rejectedIds: ['two'], actor: 'author' });
    expect(() => proposeWriterLearning(p(), accepted, [{ key: 'lexicalChoice', action: 'set', value: 'familiar' }])).toThrow('human corrections');
  });
});
