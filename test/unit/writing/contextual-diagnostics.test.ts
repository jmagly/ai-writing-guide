import { describe, expect, it } from 'vitest';
import { diagnoseWriting, diagnoseWritingBatch, writingContentHash, type DiagnosticRule } from '../../../src/writing/contextual-diagnostics.js';

describe('contextual writing diagnostics', () => {
  it('preserves Unicode offsets and exposes overlapping rules independently', () => {
    const content = '🧵 A rich tapestry of features.';
    const rule: DiagnosticRule = { id: 'custom:tapestry', phrase: 'tapestry', authority: 'user', explanation: 'Author preference', suggestion: 'Review' };
    const result = diagnoseWriting(content, { rules: [rule] });
    expect(result.diagnostics).toHaveLength(2);
    for (const d of result.diagnostics) expect(content.slice(d.start, d.end)).toBe(d.text);
    expect(result.diagnostics[0].start).toBe(5);
    expect(result.publicationGate).toBe(false);
    expect(result).not.toHaveProperty('score');
  });

  it.each([
    '```text\nA rich tapestry\n```',
    '~~~~text\nA rich tapestry\n~~~~',
    '`a rich tapestry`',
    '> A rich tapestry\n> of cloth',
    '“A rich tapestry”',
    '- [ ] Delve into the source',
    '- A rich tapestry',
  ])('does not apply advisory phrase rules to protected/structured context: %s', content => {
    expect(diagnoseWriting(content).diagnostics).toEqual([]);
  });

  it('allows literal textile terms, questionnaires and deliberate author punctuation', () => {
    const content = 'A rich tapestry — where was it woven?';
    expect(diagnoseWriting(content, { terminology: ['rich tapestry'] }).diagnostics).toEqual([]);
    expect(diagnoseWriting(content, { contexts: [{ start: 0, end: content.length, context: 'questionnaire' }] }).diagnostics).toEqual([]);
    expect(diagnoseWriting('What happened? Why? Use — or ; intentionally.').diagnostics).toEqual([]);
  });

  it('retains an exact flagged span with a reason and invalidates stale exceptions', () => {
    const content = 'Delve into this.';
    const exception = { ruleId: 'phrase:delve', start: 0, end: 5, contentHash: writingContentHash(content), reason: 'Intentional author choice' };
    expect(diagnoseWriting(content, { exceptions: [exception] }).diagnostics[0]).toMatchObject({ resolution: 'retained', reason: exception.reason });
    const changed = diagnoseWriting(content + ' More.', { exceptions: [exception] });
    expect(changed.diagnostics[0].resolution).toBe('review');
    expect(changed.notices[0]).toContain('Stale exception');
    expect(() => diagnoseWriting(content, { exceptions: [{ ...exception, reason: ' ' }] })).toThrow('reason');
  });

  it('gives explicit overrides precedence, including disabling a default', () => {
    const rule: DiagnosticRule = { id: 'phrase:delve', phrase: 'delve', authority: 'user', explanation: 'Explicit preference', suggestion: 'Retain or revise' };
    expect(diagnoseWriting('- Delve here', { overrides: [rule] }).diagnostics[0].authority).toBe('user');
    expect(diagnoseWriting('Delve here', { overrides: [{ ...rule, enabled: false }] }).diagnostics).toEqual([]);
    expect(diagnoseWriting('`Delve`', { overrides: [rule] }).diagnostics).toEqual([]);
  });

  it('matches user literal phrases without executing regex syntax', () => {
    const rule: DiagnosticRule = { id: 'literal', phrase: 'a+b', authority: 'user', explanation: 'Explicit preference', suggestion: 'Review' };
    expect(diagnoseWriting('a+b and aaab', { rules: [rule] }).diagnostics.map(d => d.text)).toEqual(['a+b']);
  });

  it('reviews separated repeated paragraphs and cross-document repetition', () => {
    const p = 'This limitation still applies.';
    const result = diagnoseWriting(`${p}\n\nAnother point.\n\n${p}`);
    expect(result.diagnostics.map(d => d.ruleId)).toEqual(['repetition:paragraph']);
    expect(result.diagnostics[0].explanation).toContain('earlier prose');
    expect(result.diagnostics[0].explanation).not.toContain('document');
    const batch = diagnoseWritingBatch([{ id: 'a', content: p }, { id: 'b', content: p }]);
    expect(batch.get('b')?.diagnostics[0].explanation).toContain('document a');
    expect(() => diagnoseWritingBatch([{ id: 'a', content: p }, { id: 'a', content: p }])).toThrow('Duplicate');
  });

  it('does not treat uncertainty or technical terminology as faults', () => {
    expect(diagnoseWriting('The experimental API may fail; perhaps the latency depends on the protocol.').diagnostics).toEqual([]);
  });

  it('declares language limitations instead of exporting English calibration', () => {
    const result = diagnoseWriting('Un texte français.', { language: 'fr' });
    expect(result.notices[0]).toContain('No built-in phrase rules');
    expect(result.diagnostics).toEqual([]);
  });

  it('rejects invalid context offsets rather than silently suppressing diagnostics', () => {
    expect(() => diagnoseWriting('Delve', { contexts: [{ start: -1, end: 5, context: 'literal' }] })).toThrow('Invalid context');
  });

  it.each(['~~~text\nDelve here\n~~~~', '~~~text\nDelve here'])('protects long closing and unclosed fences', content => {
    expect(diagnoseWriting(content).diagnostics).toEqual([]);
  });

  it('does not allow a prose annotation to override literal protection', () => {
    expect(diagnoseWriting('`Delve`', { contexts: [{ start: 0, end: 7, context: 'prose' }] }).diagnostics).toEqual([]);
  });

  it('reviews repeated prose containing inline code', () => {
    expect(diagnoseWriting('Keep the `value` safe.\n\nKeep the `value` safe.').diagnostics[0].ruleId).toBe('repetition:paragraph');
  });

  it('reports stale exceptions after deletion without throwing', () => {
    const original = 'This is a rich tapestry.';
    expect(diagnoseWriting('Short.', { exceptions: [{ start: 10, end: 23, contentHash: writingContentHash(original), ruleId: 'phrase:rich-tapestry', reason: 'Intentional' }] }).notices[0]).toContain('Stale');
  });

  it('applies batch protection, disabling and retained exceptions to located repetition', () => {
    const code = [{ id: 'a', content: '`Delve`' }, { id: 'b', content: '`Delve`' }];
    expect(diagnoseWritingBatch(code).get('b')?.diagnostics).toEqual([]);
    const documents = [{ id: 'a', content: 'Repeat this.' }, { id: 'b', content: 'Repeat this.' }];
    const disabled: DiagnosticRule = { id: 'repetition:paragraph', phrase: '', authority: 'user', explanation: 'Deliberate', suggestion: 'Retain', enabled: false };
    expect(diagnoseWritingBatch(documents, { overrides: [disabled] }).get('b')?.diagnostics).toEqual([]);
    const result = diagnoseWritingBatch(documents, { exceptions: [{ ruleId: 'repetition:paragraph', start: 0, end: 12, contentHash: writingContentHash('Repeat this.'), reason: 'Required in each document' }] });
    expect(result.get('b')?.diagnostics[0]).toMatchObject({ start: 0, end: 12, resolution: 'retained' });
  });

  it('reviews within-sentence repetition without calling deliberate emphasis an error', () => {
    expect(diagnoseWriting('This is very very useful.').diagnostics[0]).toMatchObject({ ruleId: 'repetition:word', authority: 'advisory', resolution: 'review' });
  });
});
