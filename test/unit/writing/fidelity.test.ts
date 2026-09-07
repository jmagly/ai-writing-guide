import { describe, expect, it } from 'vitest';
import { assessWritingFidelity } from '../../../src/writing/fidelity.js';
import { applyOutputModes } from '../../../src/output-modes/runtime.js';
import type { ResolvedOutputMode } from '../../../src/output-modes/types.js';

const mode = (id: string, mandatory = false): ResolvedOutputMode => ({
  id, version: '1.0.0', description: 'test', kind: 'voice', stage: 'voice', instructions: 'test',
  provenance: { source: 'test', license: 'MIT' }, validation: { level: mandatory ? 'validated' : 'advisory' }, source: 'project',
  protectedContent: ['code', 'commands', 'quoted-text', 'citations', 'machine-readable-blocks'],
});

describe('conservative fidelity assessment', () => {
  const original = 'Support is experimental. Run --scope project with 2 files. It does not publish. See https://example.test/source.';
  it.each([
    ['--scope', '--global'], ['2 files', '3 files'], ['https://example.test/source', 'https://other.test/source'],
  ])('locates a material mutation of %s', (before, after) => {
    const candidate = original.replace(before, after);
    const result = assessWritingFidelity(original, candidate);
    expect(result.outcome).toBe('fail');
    expect(result.changes.length).toBeGreaterThan(0);
    expect(result.formalProof).toBe(false);
    for (const change of result.changes) expect(change.end).toBeGreaterThan(change.start);
  });
  it.each([['does not', 'does'], ['does not', "doesn't"], ['experimental', 'stable']])('requires semantic adjudication for lexical change %s to %s', (before, after) => {
    const result = assessWritingFidelity(original, original.replace(before, after));
    expect(result.outcome).toBe('uncertain');
    expect(result.changes.length).toBeGreaterThan(0);
  });
  it('requires review for invented first-person statements and arbitrary rewrites', () => {
    expect(assessWritingFidelity(original, original + ' I designed this last year.').outcome).toBe('uncertain');
    expect(assessWritingFidelity('Readers can deploy resources.', 'Resources can be deployed by readers.').outcome).toBe('uncertain');
    expect(assessWritingFidelity(original, original).outcome).toBe('pass');
  });
});

describe('final output validation and accurate fallback', () => {
  it('revalidates mandatory constraints after a later presentation pass', async () => {
    const result = await applyOutputModes('original', [mode('voice', true), mode('presentation')], {
      transform: (text, current) => current.id === 'presentation' ? 'violated' : text,
      validate: text => ({ valid: text !== 'violated' }),
    });
    expect(result).toMatchObject({ content: 'original', applied: [], retained: [], attempted: ['voice', 'presentation'], fallback: 'unaltered' });
  });
  it('handles missing, errored, timed-out and uncertain required validators without a success receipt', async () => {
    for (const validate of [undefined, () => { throw new Error('private validator error'); }, () => new Promise<{ valid: boolean }>(() => {})]) {
      const result = await applyOutputModes('original', [mode('mandatory', true)], { transform: () => 'changed', validate, validationTimeoutMs: 5 });
      expect(result.fallback).toBe('unaltered'); expect(result.applied).toEqual([]);
      expect(JSON.stringify(result.diagnostics)).not.toContain('private validator error');
    }
    const final = await applyOutputModes('original', [mode('voice')], { transform: () => 'changed', requireFinalValidator: true });
    expect(final.fallback).toBe('unaltered');
    const uncertain = await applyOutputModes('original', [mode('voice')], { transform: () => 'changed', validateFinal: () => ({ outcome: 'uncertain' }) });
    expect(uncertain.fallback).toBe('unaltered');
    await expect(applyOutputModes('original', [mode('mandatory', true)], { transform: () => 'changed', onMandatoryValidationFailure: 'fail' })).rejects.toThrow('missing');
  });
  it('protects fenced and quoted multiline literals through all stages', async () => {
    const input = 'Intro\n~~~json\n{"flag":"--safe"}\n~~~\n> Keep this\n> quote.\nRun `npm test` and [source](https://example.test).';
    const presentation = { ...mode('presentation'), protectedContent: [] };
    const result = await applyOutputModes(input, [mode('voice'), presentation], { transform: text => text.replace('Intro', 'Opening') });
    expect(result.content).toBe(input.replace('Intro', 'Opening'));
    expect(result.retained).toEqual(['voice', 'presentation']);
  });
  it('restores replacement metacharacters and preexisting marker prefixes exactly', async () => {
    const input = '\uE000AIWG_OUTPUT_MODE_0\uE001 Keep `echo $& $$ $1`. ';
    const result = await applyOutputModes(input, [mode('voice')], { transform: text => text });
    expect(result.content).toBe(input);
  });
  it('rejects token deletion, duplication and forged tokens with configured original fallback', async () => {
    const input = 'Keep `--safe`.';
    for (const transform of [() => '', (text: string) => text + text, (text: string) => text + '\uE000AIWG_OUTPUT_MODE_999\uE001']) {
      const result = await applyOutputModes(input, [mode('voice')], { transform, onMandatoryValidationFailure: 'unaltered' });
      expect(result.content).toBe(input); expect(result.fallback).toBe('unaltered'); expect(result.retained).toEqual([]);
    }
  });
});


describe('explicit literal protection', () => {
  it('merges overlapping text/code ranges and preserves repeats, Unicode and regex metacharacters through every stage', async () => {
    const literals = ['Which `npm test` workflow?', 'operator-owned', 'a+b($1)', '🦉 note', 'aba', 'bab'];
    const input = '\uE000AIWG_OUTPUT_MODE_0\uE001 Intro. Which `npm test` workflow? operator-owned; operator-owned. a+b($1). 🦉 note. ababa.';
    let calls = 0;
    const result = await applyOutputModes(input, [mode('voice'), { ...mode('presentation'), protectedContent: [] }], {
      protectedLiterals: literals, requireFinalValidator: true, validateFinal: () => ({ outcome: 'pass' }),
      transform: text => {
        calls++;
        for (const literal of literals) expect(text).not.toContain(literal);
        expect(text).not.toContain('npm test');
        return text.replace('Intro', 'Opening');
      },
    });
    expect(calls).toBe(2); expect(result.content).toBe(input.replace('Intro', 'Opening'));
    expect(result.fallback).toBe('none'); expect(result.retained).toEqual(['voice', 'presentation']);
  });
  it('does not insert absent text and snapshots the caller list before callbacks', async () => {
    const literals = ['keep', 'absent'];
    const result = await applyOutputModes('keep editable', [mode('first'), mode('second')], { protectedLiterals: literals,
      transform: text => { literals.push('editable'); expect(text).toContain('editable'); return text; } });
    expect(result.content).toBe('keep editable');
  });
  it('rejects deletion and duplication even with a favorable final reviewer', async () => {
    for (const duplicate of [false, true]) {
      let reviewed = false;
      const result = await applyOutputModes('Which workflow?', [mode('voice')], { protectedLiterals: ['Which workflow?'],
        transform: text => duplicate ? text + text : '', onMandatoryValidationFailure: 'unaltered',
        validateFinal: () => { reviewed = true; return { outcome: 'pass' }; } });
      expect(reviewed).toBe(false); expect(result.content).toBe('Which workflow?'); expect(result.applied).toEqual([]);
    }
  });
  it.each([[''], ['  '], ['\uD83E'], ['\uDD89'], [42], 'text', null])('rejects invalid explicit literal lists before transformation: %j', async protectedLiterals => {
    let called = false;
    await expect(applyOutputModes('input', [mode('voice')], { protectedLiterals: protectedLiterals as string[], transform: text => { called = true; return text; } })).rejects.toThrow('Protected literals');
    expect(called).toBe(false);
  });
});
