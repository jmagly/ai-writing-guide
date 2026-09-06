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
    ['--scope', '--global'], ['2 files', '3 files'], ['does not', 'does'],
    ['experimental', 'stable'], ['https://example.test/source', 'https://other.test/source'],
  ])('locates a material mutation of %s', (before, after) => {
    const candidate = original.replace(before, after);
    const result = assessWritingFidelity(original, candidate);
    expect(result.outcome).toBe('fail');
    expect(result.changes.length).toBeGreaterThan(0);
    expect(result.formalProof).toBe(false);
    for (const change of result.changes) expect(change.end).toBeGreaterThan(change.start);
  });
  it('requires review for invented first-person statements and arbitrary rewrites', () => {
    expect(assessWritingFidelity(original, original + ' I designed this last year.').outcome).toBe('fail');
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
