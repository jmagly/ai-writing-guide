import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { applyProofreadCorrections, parseWritingBrief, prepareWritingBrief, validateBriefClaims, validateWritingBrief, writingBriefHash, type WritingBrief, type WritingBriefTarget } from '../../../src/writing/writing-brief.js';

const fixture = JSON.parse(readFileSync('test/fixtures/writing/launch-briefs.v1.json', 'utf8'));
function brief(): WritingBrief {
  const draft = 'We offer experimental support. Teh CLI needs tests. 🦉';
  const notes = 'I tested the CLI on my laptop. We chose a preview because the results are preliminary.';
  const start = draft.indexOf('Teh');
  return parseWritingBrief({
    schemaVersion: 1, id: 'review', operation: 'proofread-only', reader: { task: 'Preview the CLI setup.', audience: 'Developers', requirements: ['Keep the limitation visible'] },
    intendedAction: 'Review the preview before deployment.', exclusions: ['Unsupported production-readiness claims'],
    inputs: [
      { id: 'draft', kind: 'existing-draft', text: draft, sha256: writingBriefHash(draft), provenance: { source: 'fixture:draft', version: '1' }, authorApproved: true },
      { id: 'notes', kind: 'author-notes', text: notes, sha256: writingBriefHash(notes), provenance: { source: 'fixture:author-notes', version: '1' }, authorApproved: true },
    ],
    propositions: [{ id: 'support', text: 'We offer experimental support.', evidenceStrength: 'experimental', evidence: [{ inputId: 'draft', start: 0, end: 30 }], qualifiers: ['experimental'] }],
    limitations: [], authorClaims: [
      { id: 'experience', kind: 'experience', text: 'I tested the CLI on my laptop.', evidence: [{ inputId: 'notes', start: 0, end: notes.indexOf(' We chose') }] },
      { id: 'rationale', kind: 'rationale', text: 'We chose a preview because the results are preliminary.', evidence: [{ inputId: 'notes', start: notes.indexOf('We chose'), end: notes.length }] },
    ], sourceInputId: 'draft', permissions: { rephrase: false, reorder: false, addContent: false, corrections: [{ id: 'typo', start, end: start + 3, expected: 'Teh', replacement: 'The', reason: 'Correct transposed letters.', authorAuthorized: true }] },
  });
}

describe('structured writing brief', () => {
  it('keeps the same propositions, evidence strength and notes lineage across profiles and all five channels', () => {
    const b = brief(); const original = JSON.stringify(b);
    const digests = new Set<string>();
    for (const profileId of ['assertive', 'reserved']) for (const channel of ['article', 'social', 'email', 'engineering', 'conversation'] as WritingBriefTarget['channel'][]) {
      const plan = prepareWritingBrief(b, { profileId, channel });
      expect(plan.brief.propositions).toEqual(b.propositions);
      expect(plan.brief.authorClaims).toEqual(b.authorClaims);
      expect(plan.permissions).toEqual(b.permissions);
      expect(plan.factualVerification).toBe('not-performed');
      expect(plan.lineage.map(v => v.role)).toEqual(['existing-draft', 'author-notes']);
      digests.add(plan.briefDigest);
      plan.brief.inputs[0].text = 'mutated returned copy';
    }
    expect(digests.size).toBe(1); expect(JSON.stringify(b)).toBe(original);
  });

  it('returns an editorial gap for missing reader task, action or supported content', () => {
    const b = brief(); b.reader.task = ''; b.intendedAction = ''; b.propositions = [];
    const result = validateWritingBrief(b);
    expect(result.valid).toBe(false); expect(result.diagnostics.filter(d => d.code === 'editorial-gap')).toHaveLength(3);
    expect(() => prepareWritingBrief(b, { profileId: 'plain', channel: 'article' })).toThrow(/editorial-gap/);
  });

  it('requires approved author notes and exact source wording for personal experience and rationale', () => {
    expect(validateBriefClaims(brief(), [{ kind: 'experience', text: 'I tested the CLI on my laptop.', groundedIn: ['experience'] }, { kind: 'rationale', text: 'We chose a preview because the results are preliminary.', groundedIn: ['rationale'] }]).valid).toBe(true);
    for (const kind of ['experience', 'rationale'] as const) {
      const b = brief(); b.authorClaims.find(c => c.kind === kind)!.text = 'I spent three years designing it for enterprise security.';
      expect(validateWritingBrief(b).diagnostics.some(d => d.code === 'unsupported-claim')).toBe(true);
    }
    for (const mutate of [(b: WritingBrief) => { b.inputs[1].authorApproved = false; }, (b: WritingBrief) => { b.inputs[1].kind = 'source'; }]) {
      const b = brief(); mutate(b); expect(validateWritingBrief(b).valid).toBe(false);
    }
  });

  it('rejects invented anecdotes and unsupported rationale even when they cite real IDs', () => {
    const check = validateBriefClaims(brief(), [
      { kind: 'experience', text: 'I shipped this to a million users.', groundedIn: ['experience'] },
      { kind: 'rationale', text: 'We chose it because it is proven secure.', groundedIn: ['rationale'] },
      { kind: 'experience', text: 'I tested the CLI on my laptop.', groundedIn: ['missing'] },
    ]);
    expect(check.valid).toBe(false); expect(check.diagnostics).toHaveLength(3);
    expect(JSON.stringify(check)).not.toContain('million users');
  });

  it('rejects strengthened experimental claims rather than accepting a matching proposition ID', () => {
    const result = validateBriefClaims(brief(), [{ kind: 'proposition', text: 'We offer production-ready support.', groundedIn: ['support'] }]);
    expect(result.valid).toBe(false); expect(result.diagnostics[0].code).toBe('unsupported-claim');
  });

  it('exposes distinct operation permissions and refuses a missing author draft', () => {
    const b = brief(); b.operation = 'proofread-only'; b.permissions.rephrase = true;
    expect(validateWritingBrief(b).diagnostics.some(d => d.code === 'permission')).toBe(true);
    b.operation = 'continue-author-text'; b.permissions = { rephrase: false, reorder: false, addContent: true, corrections: [] };
    expect(prepareWritingBrief(b, { profileId: 'plain', channel: 'conversation' }).operation).toBe('continue-author-text');
    b.operation = 'edit-existing'; b.sourceInputId = 'missing';
    expect(validateWritingBrief(b).valid).toBe(false);
    b.operation = 'draft-from-notes'; delete b.sourceInputId;
    expect(validateWritingBrief(b).valid).toBe(true);
  });

  it('rejects stale input hashes, dangling or Unicode-splitting evidence and duplicate IDs', () => {
    for (const mutate of [
      (b: WritingBrief) => { b.inputs[0].text += 'drift'; },
      (b: WritingBrief) => { b.propositions[0].evidence[0].inputId = 'missing'; },
      (b: WritingBrief) => { const at = b.inputs[0].text.indexOf('🦉'); b.propositions[0].evidence[0] = { inputId: 'draft', start: at + 1, end: at + 2 }; },
      (b: WritingBrief) => { b.inputs.push(structuredClone(b.inputs[0])); },
    ]) { const b = brief(); mutate(b); expect(validateWritingBrief(b).valid).toBe(false); }
  });
});

describe('authorized proofreading', () => {
  it('applies only the selected correction and records notes/draft/final lineage without changing other wording', () => {
    const b = brief(); const before = JSON.stringify(b);
    const result = applyProofreadCorrections(b, ['typo']);
    expect(result.valid).toBe(true);
    expect(result.text).toBe('We offer experimental support. The CLI needs tests. 🦉');
    expect(result.lineage).toMatchObject({ sourceInputId: 'draft', sourceDigest: b.inputs[0].sha256, finalDigest: writingBriefHash(result.text), correctionIds: ['typo'] });
    expect(result.lineage.briefDigest).toBe(prepareWritingBrief(b, { profileId: 'plain', channel: 'article' }).briefDigest);
    expect(JSON.stringify(b)).toBe(before);
    expect(applyProofreadCorrections(b, []).text).toBe(b.inputs[0].text);
  });

  it('fails closed for unapproved, duplicated, overlapping and stale corrections', () => {
    const b = brief();
    for (const ids of [['unknown'], ['typo', 'typo']]) expect(applyProofreadCorrections(b, ids)).toMatchObject({ valid: false, text: b.inputs[0].text });
    b.permissions.corrections.push({ ...b.permissions.corrections[0], id: 'overlap' });
    expect(applyProofreadCorrections(b, ['typo', 'overlap']).valid).toBe(false);
    b.permissions.corrections[0].expected = 'Other';
    expect(applyProofreadCorrections(b, ['typo'])).toMatchObject({ valid: false, text: b.inputs[0].text });
  });

  it('blocks an authorized correction that removes an experimental qualifier or changes grounded content', () => {
    const b = brief(); const start = b.inputs[0].text.indexOf('experimental');
    b.permissions.corrections.push({ id: 'strengthen', start, end: start + 12, expected: 'experimental', replacement: 'production-ready', reason: 'Claim upgrade', authorAuthorized: true });
    const result = applyProofreadCorrections(b, ['typo', 'strengthen']);
    expect(result).toMatchObject({ valid: false, text: b.inputs[0].text });
    expect(result.diagnostics[0].code).toBe('protected-content');
    expect(result.lineage.correctionIds).toEqual([]);
  });
});

describe('historical provider launch annotations', () => {
  it.each(fixture.fixtures)('$id uses real pinned excerpts and an actionable reader task without inventing a new draft', (f: any) => {
    expect(f.source.historical).toBe(true); expect(f.source.commit).toBe('2197634ce5273f79310538c98c530254c65c05e3');
    expect(f.source.sha256).toMatch(/^[a-f0-9]{64}$/);
    for (const e of f.excerpts) { expect(writingBriefHash(e.text)).toBe(e.sha256); expect(e.originalSpan.end - e.originalSpan.start).toBe(e.text.length); }
    const b = parseWritingBrief(f.brief);
    expect(b.inputs[0].text).toBe(f.excerpts.map((e: any) => e.text).join('\n\n'));
    expect(b.authorClaims).toEqual([]);
    expect(f.annotations.map((a: any) => a.kind)).toEqual(expect.arrayContaining(['reader-first-opening', 'remove-internal-review-language', 'retain-qualification', 'retain-limitation']));
    for (const profileId of ['assertive', 'reserved']) expect(prepareWritingBrief(b, { profileId, channel: 'article' }).brief.propositions[0].evidenceStrength).toBe('experimental');
    b.operation = 'proofread-only'; b.permissions = { rephrase: false, reorder: false, addContent: false, corrections: [] };
    const start = b.inputs[0].text.indexOf('experimental');
    b.permissions.corrections.push({ id: 'remove-status', start, end: start + 12, expected: 'experimental', replacement: 'qualified', reason: 'Fixture negative control', authorAuthorized: true });
    expect(applyProofreadCorrections(b, ['remove-status']).diagnostics[0].code).toBe('protected-content');
  });
});
