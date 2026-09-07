import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyWritingChannel, getWritingChannelPack, type WritingChannel } from '../../../src/writing/writing-channels.js';
import { parseWritingBrief, writingBriefHash } from '../../../src/writing/writing-brief.js';
import { parseWriterProfile } from '../../../src/writing/writer-profile.js';
import { WriterProfileStore } from '../../../src/writing/writer-profile-store.js';
import pilots from '../../fixtures/writing/channel-pilots.v1.json';
const roots: string[] = [];
afterEach(async () => { vi.unstubAllEnvs(); await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })) ); });
const source = 'Experimental adapter. Technical guidance is advisory. Try the preview.';
function brief(text = source) {
  return parseWritingBrief({ schemaVersion: 1, id: 'shared', operation: 'draft-from-notes', reader: { task: 'Assess the adapter', audience: 'operators', requirements: [] }, intendedAction: 'Try the preview.', exclusions: [], inputs: [{ id: 'facts', kind: 'source', text, sha256: writingBriefHash(text), provenance: { source: 'deterministic fixture', version: '1' }, authorApproved: false }], propositions: [{ id: 'adapter', text, evidenceStrength: 'verified', qualifiers: [], evidence: [{ inputId: 'facts', start: 0, end: text.length }] }], limitations: [], authorClaims: [], permissions: { rephrase: true, reorder: true, addContent: false, corrections: [] } });
}
async function setup() {
  const cwd = await mkdtemp(path.join(tmpdir(), 'channel-')); roots.push(cwd); vi.stubEnv('AIWG_CONFIG', path.join(cwd, 'user')); vi.stubEnv('AIWG_SESSION_ID', path.basename(cwd));
  for (const [id, value] of [['warm', 'warm'], ['neutral', 'neutral']]) {
    await new WriterProfileStore({ cwd }).save(parseWriterProfile({ schemaVersion: 1, id, version: '1.0.0', name: id, provenance: { source: 'test', license: 'author' }, samples: [], preferences: [{ id: 'warmth', key: 'warmth', value, origin: 'explicit', confidence: 'high' }] }), 0);
  }
  return { cwd, frameworkRoot: cwd, provider: 'fixture', consumer: 'channel-test', format: 'prose' as const, invocationModes: ['writer-warm'] };
}
describe('five channel opt-in adapter', () => {
  it('routes all five packs and distinct profiles through the same brief without inventing a provider run', async () => {
    const request = await setup(); const digests = new Set<string>();
    for (const channel of ['article', 'social', 'email', 'engineering', 'conversation'] as WritingChannel[]) {
      for (const id of ['warm', 'neutral']) {
        const transform = vi.fn((text, mode, context) => { expect([`writer-${id}`, `channel-${channel}`]).toContain(mode.id); expect(context.pack.channel).toBe(channel); expect(context.brief).toEqual(brief()); return text; });
        const result = await applyWritingChannel(source, { ...request, invocationModes: [`writer-${id}`], channel, brief: brief(), transform, runtime: { validateFinal: () => ({ outcome: 'pass' }) } });
        expect(transform).toHaveBeenCalledTimes(2); expect(result.content).toBe(source); expect(result.state.applied).toEqual([`writer-${id}`, `channel-${channel}`]); expect(result.state.providerInterception).toBe(false); digests.add(result.receipt.briefDigest);
      }
    }
    expect(digests.size).toBe(1);
  });
  it('routes semantic paraphrases to review while keeping the original on rejection or missing review', async () => {
    const request = await setup();
    const original = 'Historical observation as of 2026-09-04. Oh My Pi is experimental. Local checks do not qualify every configuration.';
    const candidate = "As of 2026-09-04, Oh My Pi is experimental. Local checks won't qualify every configuration.";
    const shared = brief(original);
    shared.propositions[0].qualifiers = ['Historical observation as of 2026-09-04.'];
    const validateFinal = vi.fn((_original, _candidate, assessment) => {
      expect(assessment.outcome).toBe('uncertain');
      expect(assessment.changes.map(change => change.kind)).toEqual(expect.arrayContaining(['negation', 'qualification', 'first-person']));
      assessment.changes.length = 0;
      return { outcome: 'pass' as const };
    });
    const applied = await applyWritingChannel(original, { ...request, invocationModes: [], channel: 'conversation', brief: shared, transform: () => candidate, runtime: { validateFinal } });
    expect(validateFinal).toHaveBeenCalledOnce();
    expect(applied.content).toBe(candidate); expect(applied.state.fallback).toBe('none');
    expect(applied.runtime?.fidelity?.changes.length).toBeGreaterThan(0);
    for (const outcome of ['fail', 'uncertain', undefined] as const) {
      const result = await applyWritingChannel(original, { ...request, invocationModes: [], channel: 'conversation', brief: shared, transform: () => candidate,
        runtime: outcome ? { validateFinal: () => ({ outcome }) } : {} });
      expect(result.content).toBe(original); expect(result.state.applied).toEqual([]);
    }
    const falseClaim = original.replace('do not qualify', 'qualify');
    const reject = vi.fn(() => ({ outcome: 'fail' as const }));
    const rejected = await applyWritingChannel(original, { ...request, invocationModes: [], channel: 'conversation', brief: shared, transform: () => falseClaim, runtime: { validateFinal: reject } });
    expect(reject).toHaveBeenCalledOnce(); expect(rejected.content).toBe(original);
  });
  it('does not let a favorable semantic reviewer override changed quantities', async () => {
    const request = await setup(); const original = 'The preview covers 2 configurations.';
    const judge = vi.fn(() => ({ outcome: 'pass' as const }));
    const result = await applyWritingChannel(original, { ...request, invocationModes: [], channel: 'engineering', brief: brief(original), transform: () => original.replace('2', '3'), runtime: { validateFinal: judge } });
    expect(judge).not.toHaveBeenCalled(); expect(result.content).toBe(original); expect(result.state.applied).toEqual([]);
  });
  it('masks the complete caller CTA and required literals across all five channel packs', async () => {
    const request = await setup();
    const original = 'Intro. Experimental adapter. operator-owned. Which `npm test` workflow?';
    const cta = 'Which `npm test` workflow?';
    for (const channel of ['article', 'social', 'email', 'engineering', 'conversation'] as WritingChannel[]) {
      let calls = 0;
      const result = await applyWritingChannel(original, { ...request, channel, brief: brief(original),
        constraints: { cta, requiredLiterals: ['operator-owned', 'Experimental'], destination: channel === 'social' ? 'telegram' : 'other' },
        runtime: { protectedLiterals: ['adapter'], validateFinal: () => ({ outcome: 'pass' }) },
        transform: text => { calls++; for (const literal of [cta, 'npm test', 'operator-owned', 'Experimental', 'adapter']) expect(text).not.toContain(literal); return text.replace('Intro', 'Opening'); } });
      expect(calls).toBe(2); expect(result.content).toBe(original.replace('Intro', 'Opening')); expect(result.channelCheck.valid).toBe(true);
      expect(result.state.fallback).toBe('none'); expect(result.posts).toEqual([result.content]);
    }
  });
  it('keeps final CTA checks even when a transform adds an extra unmasked copy', async () => {
    const request = await setup(); const original = 'Intro. Which workflow?';
    const result = await applyWritingChannel(original, { ...request, invocationModes: [], channel: 'social', brief: brief(original),
      constraints: { cta: 'Which workflow?', destination: 'discord' }, transform: text => text + ' Which workflow?', runtime: { validateFinal: () => ({ outcome: 'pass' }) } });
    expect(result.content).toBe(original); expect(result.state.fallback).toBe('unaltered'); expect(result.state.applied).toEqual([]);
  });
  it('applies channel-scoped author preferences without leaking them to later calls', async () => {
    const request = await setup();
    const store = new WriterProfileStore({ cwd: request.cwd });
    const profile = await store.read('warm');
    profile.preferences.push({ id: 'article-neutral', key: 'warmth', value: 'neutral', task: 'article', origin: 'explicit', confidence: 'high', status: 'accepted', evidence: [] });
    await store.save(profile, profile.revision);
    const stored = await store.read('warm');
    for (const channel of ['article', 'email', 'social', 'engineering', 'conversation', 'article'] as WritingChannel[]) {
      const expected = channel === 'article' ? 'neutral' : 'warm';
      const exported = await applyWritingChannel(source, { ...request, task: 'ignored-caller-task', channel, brief: brief() });
      expect(exported.modes.find(mode => mode.id === 'writer-warm')?.instructions).toContain(`"warmth":"${expected}"`);
      const seen: string[] = [];
      const applied = await applyWritingChannel(source, { ...request, channel, brief: brief(), transform: (text, mode) => {
        if (mode.id === 'writer-warm') seen.push(mode.instructions);
        return text;
      }, runtime: { validateFinal: () => ({ outcome: 'pass' }) } });
      expect(seen).toHaveLength(1);
      expect(seen[0]).toContain(`"warmth":"${expected}"`);
      expect(applied.state.fallback).toBe('none');
    }
    expect(await store.read('warm')).toEqual(stored);
  });
  it('selects a standalone channel and carries the shared brief through article, social and email', async () => {
    const request = await setup(); let text = source; const outputs: string[] = [];
    for (const channel of ['article', 'social', 'email'] as WritingChannel[]) {
      const result = await applyWritingChannel(text, { ...request, invocationModes: [], channel, brief: brief(), constraints: { requiredLiterals: ['Experimental', 'advisory', 'Try the preview.'] }, transform: (content, mode) => {
        expect(mode.id).toBe(`channel-${channel}`);
        return content.replace(/\.\s+/g, channel === 'article' ? '.\n\n' : channel === 'social' ? '. ' : '.\n');
      }, runtime: { validateFinal: () => ({ outcome: 'pass' }) } });
      expect(result.state.applied).toEqual([`channel-${channel}`]); expect(result.channelCheck.valid).toBe(true);
      text = result.content; outputs.push(text);
    }
    expect(new Set(outputs).size).toBe(3);
  });
  it('exports instructions without applying them or overwriting structured output', async () => {
    const request = await setup(); const transform = vi.fn(() => 'bad');
    const result = await applyWritingChannel(source, { ...request, channel: 'article', brief: brief() });
    expect(result.state.applied).toEqual([]); expect(result.instructionExport).toContain('article'); expect(result.receipt.execution).toBe('instruction-export');
    const structured = await applyWritingChannel(source, { ...request, channel: 'social', brief: brief(), format: 'json', transform });
    expect(transform).not.toHaveBeenCalled(); expect(structured.posts).toEqual([]); expect(structured.content).toBe(source);
  });
  it('requires a final reviewer and preserves uncertainty on failure', async () => {
    const request = await setup();
    const result = await applyWritingChannel(source, { ...request, channel: 'email', brief: brief(), transform: text => text.replace('Try', 'Use') });
    expect(result.content).toBe(source); expect(result.state.applied).toEqual([]); expect(result.state.fallback).toBe('unaltered');
  });
  it('fails budgets without dropping caveats and marks an invalid original ineligible for a post', async () => {
    const request = await setup();
    const result = await applyWritingChannel(source, { ...request, channel: 'social', brief: brief(), constraints: { maxCharacters: 10 }, transform: text => text, runtime: { validateFinal: () => ({ outcome: 'pass' }) } });
    expect(result.content).toBe(source); expect(result.channelCheck.valid).toBe(false); expect(result.posts).toEqual([]); expect(result.state.applied).toEqual([]);
    await expect(applyWritingChannel(source, { ...request, channel: 'social', brief: brief(), constraints: { maxCharacters: 10, onFailure: 'fail' } })).rejects.toThrow('character-limit');
  });
  it('requires one same-post CTA for both chat destinations, never creates engagement records', async () => {
    const request = await setup();
    for (const destination of ['telegram', 'discord'] as const) {
      const result = await applyWritingChannel(source, { ...request, channel: 'social', brief: brief(), constraints: { destination, cta: 'Try the preview.', requiredLiterals: ['Experimental', 'advisory'] } });
      expect(result.posts).toEqual([source]); expect(result.channelCheck.valid).toBe(true);
      const duplicate = await applyWritingChannel(source + ' Try the preview.', { ...request, channel: 'social', brief: brief(), constraints: { destination, cta: 'Try the preview.' } });
      expect(duplicate.posts).toEqual([]);
      await expect(applyWritingChannel(source, { ...request, channel: 'social', brief: brief(), constraints: { destination } })).rejects.toThrow('CTA');
    }
  });
  it('checks final restored links, technical qualifications and Unicode code points', async () => {
    const request = await setup(); const text = 'Experimental API guidance is advisory. [Preview](https://example.test/a_(b)) 🙂';
    const result = await applyWritingChannel(text, { ...request, channel: 'engineering', brief: brief(text), constraints: { maxCharacters: [...text].length, requiredLiterals: ['API', 'advisory', '[Preview](https://example.test/a_(b))'] }, transform: text => text, runtime: { validateFinal: () => ({ outcome: 'pass' }) } });
    expect(result.content).toBe(text); expect(result.channelCheck.valid).toBe(true); expect(result.channelCheck.characters).toBe([...text].length);
  });
  it('cannot retain a callback removing an explicit caveat even when its reviewer claims pass', async () => {
    const request = await setup();
    const result = await applyWritingChannel(source, { ...request, channel: 'engineering', brief: brief(), constraints: { requiredLiterals: ['Technical guidance is advisory.'] }, transform: text => { expect(text).not.toContain('Technical guidance is advisory.'); return text.replace(/\uE000AIWG_OUTPUT_MODE_+\d+\uE001/g, ''); }, runtime: { onMandatoryValidationFailure: 'unaltered', validateFinal: () => ({ outcome: 'pass' }) } });
    expect(result.content).toBe(source); expect(result.state.applied).toEqual([]);
  });
  it('rejects invalid configuration and does not force conclusions or fragments', () => {
    expect(() => getWritingChannelPack('__proto__' as WritingChannel)).toThrow();
    expect(getWritingChannelPack('article').instructions).toContain('no required recap'); expect(getWritingChannelPack('conversation').instructions).toContain('Do not force fragments');
  });
  it('checks annotated proposed pilots mechanically without claiming author approval or model quality', async () => {
    const request = await setup();
    expect(pilots.status).toBe('developer-proposed-awaiting-author-review');
    for (const pilot of pilots.pilots) {
      expect(writingBriefHash(pilot.sourceExcerpt)).toBe(pilot.excerptSha256);
      const result = await applyWritingChannel(pilot.proposed, { ...request, channel: 'social', brief: brief(pilot.proposed), constraints: { destination: 'telegram', cta: pilot.cta, requiredLiterals: pilot.requiredLiterals, forbiddenLiterals: pilot.forbiddenLiterals, maxCharacters: 2000 } });
      expect(result.channelCheck.valid).toBe(true); expect(result.posts).toHaveLength(1); expect(result.receipt.qualityEvaluation).toBe('not-performed');
    }
  });
});
