import { describe, expect, it } from 'vitest';
import { applyOutputModes, type OutputModeRuntimeOptions } from '../../../src/output-modes/runtime.js';
import { assessWritingFidelity } from '../../../src/writing/fidelity.js';
import { parseWritingBrief, writingBriefHash, type WritingBrief } from '../../../src/writing/writing-brief.js';
import type { ResolvedOutputMode } from '../../../src/output-modes/types.js';

const mode: ResolvedOutputMode = {
  id: 'voice-review', version: '1', description: 'Fidelity review fixture', kind: 'voice', stage: 'voice',
  instructions: '', provenance: { source: 'fixture', license: 'MIT' }, validation: { level: 'advisory' }, source: 'project',
  protectedContent: ['code', 'commands', 'quoted-text', 'citations', 'machine-readable-blocks'],
};
function brief(): WritingBrief {
  const source = 'Support is experimental.';
  return parseWritingBrief({ schemaVersion: 1, id: 'brief', operation: 'edit-existing',
    reader: { task: 'Understand limits', audience: 'readers', requirements: [] }, intendedAction: 'Understand scope', exclusions: [],
    inputs: [{ id: 'source', kind: 'existing-draft', text: source, sha256: writingBriefHash(source), provenance: { source: 'fixture', version: '1' }, authorApproved: true }],
    propositions: [{ id: 'proposition', text: source, evidenceStrength: 'experimental', evidence: [{ inputId: 'source', start: 0, end: source.length }], qualifiers: ['experimental'] }],
    limitations: [], authorClaims: [], sourceInputId: 'source', permissions: { rephrase: true, reorder: true, addContent: false, corrections: [] },
  });
}

describe('independent fidelity review regressions', () => {
  it('runs a supplied final validator even when there are no output modes', async () => {
    let calls = 0;
    const result = await applyOutputModes('original', [], { transform: value => value, validateFinal: () => { calls++; return { outcome: 'fail' }; } });
    expect(calls).toBe(1); expect(result.fallback).toBe('unaltered'); expect(result.retained).toEqual([]);
  });
  it.each(['  ~~~text\nKeep --safe\n  ~~~', '   ```text\nKeep --safe\n   ```', '  > Keep --safe\n  > quote.'])('protects valid indented Markdown: %s', async input => {
    const result = await applyOutputModes(input, [mode], { transform: text => text.replace('--safe', '--unsafe') });
    expect(result.content).toBe(input); expect(result.fallback).toBe('none');
  });
  it('snapshots required validator policy before executing transformation callbacks', async () => {
    const options: OutputModeRuntimeOptions = { requireFinalValidator: true, transform: () => { options.requireFinalValidator = false; return 'changed'; } };
    const result = await applyOutputModes('original', [mode], options);
    expect(result).toMatchObject({ content: 'original', fallback: 'unaltered', retained: [] });
  });
  it('snapshots callback identity so a transform cannot replace a failing validator', async () => {
    const options: OutputModeRuntimeOptions = { validateFinal: () => ({ outcome: 'fail' }), transform: () => { options.validateFinal = () => ({ outcome: 'pass' }); return 'changed'; } };
    const result = await applyOutputModes('original', [mode], options);
    expect(result.fallback).toBe('unaltered');
  });
  it('rejects a mismatched original even when candidate text is unchanged', () => {
    const result = assessWritingFidelity('Support is stable.', 'Support is stable.', brief());
    expect(result.outcome).toBe('fail'); expect(result.changes.some(c => c.kind === 'protected')).toBe(true);
  });
  it('binds the fidelity receipt to the immutable original brief snapshot', async () => {
    const supplied = brief(); const expectedHash = writingBriefHash(JSON.stringify(supplied));
    const result = await applyOutputModes(supplied.inputs[0].text, [mode], {
      fidelity: { brief: supplied }, transform: text => { supplied.id = 'mutated'; return text; },
    });
    expect(result.fidelity?.briefHash).toBe(expectedHash); expect(result.fidelity?.outcome).toBe('pass');
  });
  it('protects inline code whose delimiter encloses shorter internal backtick runs', async () => {
    const input = 'Run ``echo `value` --safe``.';
    const result = await applyOutputModes(input, [mode], { transform: text => text.replace('value', 'wrong') });
    expect(result.content).toBe(input);
  });
  it('keeps prose after a longer legal closing fence available for transformation', async () => {
    const input = '~~~text\nKeep literal.\n~~~~\nAfterward explain the result.';
    const result = await applyOutputModes(input, [mode], { transform: text => text.replace('Afterward', 'Then') });
    expect(result.content).toBe(input.replace('Afterward', 'Then'));
  });
  it('protects the complete Markdown link when its URL contains balanced parentheses', async () => {
    const input = 'See [source](https://example.test/a_(b)).';
    const result = await applyOutputModes(input, [mode], { transform: text => text.replaceAll(')', ']') });
    expect(result.content).toBe(input);
  });
  it('locates complete prose deletion on original content rather than an empty candidate span', () => {
    const result = assessWritingFidelity('A useful explanation.', '');
    expect(result.outcome).toBe('uncertain');
    expect(result.changes).toEqual(expect.arrayContaining([expect.objectContaining({ side: 'original', start: 0, end: 21 })]));
  });
});
