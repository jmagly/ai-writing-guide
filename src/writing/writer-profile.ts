import { createHash } from 'node:crypto';
import { z } from 'zod';
import { redactText } from '../governance/redaction.js';
import { validateLegacyWriterProfile } from './writer-profile-legacy.js';
import type { OutputModeProfile } from '../output-modes/types.js';

const hash = (text: string) => createHash('sha256').update(text).digest('hex');
const id = z.string().min(1).max(120).regex(/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/);
const provenance = z.object({ source: z.string().min(1).max(2000), license: z.string().min(1).max(200) }).strict();
const evidence = z.object({ sampleId: id, start: z.number().int().nonnegative(), end: z.number().int().positive() }).strict();
/** Closed expression controls exclude identity, personality and generated signature phrases. */
export const writerPreferenceValues = {
  dialect: ['unspecified', 'en-US', 'en-GB', 'en-AU', 'en-CA', 'fr-FR', 'fr-CA'],
  register: ['conversational', 'professional', 'technical', 'formal'],
  formality: ['casual', 'neutral', 'formal'],
  warmth: ['reserved', 'neutral', 'warm'],
  directness: ['gentle', 'neutral', 'direct'],
  sentenceLength: ['short', 'varied', 'long'],
  paragraphLength: ['short', 'varied', 'long'],
  contractions: ['prefer', 'avoid', 'contextual'],
  punctuation: ['minimal', 'varied', 'contextual'],
  lexicalChoice: ['familiar', 'technical', 'contextual'],
  rhetoric: ['plain', 'illustrative', 'contextual'],
  structure: ['prose', 'lists', 'contextual'],
} as const;
export type WriterPreferenceKey = keyof typeof writerPreferenceValues;
const preferenceKey = z.enum(Object.keys(writerPreferenceValues) as [WriterPreferenceKey, ...WriterPreferenceKey[]]);
const preference = z.object({
  id, key: preferenceKey, value: z.string(), origin: z.enum(['explicit', 'inferred']),
  confidence: z.enum(['low', 'moderate', 'high']), evidence: z.array(evidence).default([]),
  task: z.string().max(120).optional(), status: z.enum(['accepted', 'rejected']).default('accepted'),
}).strict();
const override = z.object({ key: preferenceKey, action: z.enum(['set', 'reject', 'reset']), value: z.string().optional(), task: z.string().max(120).optional() }).strict();
const sample = z.object({
  id, text: z.string().max(1_000_000).optional(), sha256: z.string().regex(/^[a-f0-9]{64}$/), approved: z.boolean(),
  status: z.enum(['active', 'revoked']), provenance,
  rights: z.object({ useForVoice: z.boolean(), shareText: z.boolean() }).strict(),
  sensitivity: z.enum(['public', 'private', 'secret']),
}).strict();
export const legacyProfileAttachmentSchema = z.object({
  format: z.enum(['yaml', 'json']),
  kind: z.enum(['addon-template', 'python-generated', 'python-analyzed', 'python-blended', 'ts-analyzer', 'ts-calibration']),
  raw: z.string(), sha256: z.string().regex(/^[a-f0-9]{64}$/), payload: z.unknown(),
}).strict();

export const writerProfileSchema = z.object({
  schemaVersion: z.literal(1), revision: z.number().int().positive().default(1), metadataSharingApproved: z.boolean().default(false), id: z.string().regex(/^[a-z0-9][a-z0-9.-]{0,79}$/).refine(v => !v.includes('..')), version: z.string().regex(/^\d+\.\d+\.\d+$/), name: z.string().min(1).max(200), provenance,
  samples: z.array(sample), preferences: z.array(preference), overrides: z.array(override).default([]),
  counterexamples: z.array(evidence).default([]), legacy: legacyProfileAttachmentSchema.optional(),
  cacheEpoch: z.number().int().nonnegative().default(0),
}).strict().superRefine((p, ctx) => {
  const problem = (message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, message });
  if (new Set(p.samples.map(s => s.id)).size !== p.samples.length) problem('Duplicate sample IDs');
  if (new Set(p.preferences.map(s => s.id)).size !== p.preferences.length) problem('Duplicate preference IDs');
  const samples = new Map(p.samples.map(s => [s.id, s]));
  for (const s of p.samples) {
    if (s.text !== undefined && hash(s.text) !== s.sha256) problem('Sample integrity mismatch');
    if (s.status === 'revoked' && s.text !== undefined) problem('Revoked sample must not retain text');
    if (s.sensitivity === 'secret' && s.rights.shareText) problem('Secret samples cannot permit sharing');
  }
  const checkEvidence = (e: z.infer<typeof evidence>) => {
    const s = samples.get(e.sampleId);
    if (!s || !s.approved || !s.rights.useForVoice || s.status !== 'active' || s.sensitivity === 'secret' || s.text === undefined || e.start >= e.end || e.end > s.text.length) problem('Evidence must reference an approved usable sample span');
    if (s?.text) {
      // Do not allow a span boundary to split a surrogate pair.
      for (const offset of [e.start, e.end]) if (offset > 0 && offset < s.text.length && /[\uD800-\uDBFF]/.test(s.text[offset - 1]) && /[\uDC00-\uDFFF]/.test(s.text[offset])) problem('Evidence splits a Unicode code point');
    }
  };
  for (const pref of p.preferences) {
    if (!(writerPreferenceValues[pref.key] as readonly string[]).includes(pref.value)) problem('Unsupported expression value');
    if (pref.origin === 'inferred' && !pref.evidence.length) problem('Inferred preference requires evidence');
    pref.evidence.forEach(checkEvidence);
  }
  for (const o of p.overrides) {
    if (o.action === 'set' && (!o.value || !(writerPreferenceValues[o.key] as readonly string[]).includes(o.value))) problem('Set override requires a supported value');
    if (o.action !== 'set' && o.value !== undefined) problem('Only set overrides accept a value');
  }
  p.counterexamples.forEach(checkEvidence);
  if (p.legacy) { try { validateLegacyWriterProfile(p.legacy); } catch { problem('Legacy attachment integrity mismatch'); } }
});
export type WriterProfile = z.infer<typeof writerProfileSchema>;
export type WriterSample = z.infer<typeof sample>;
export type WriterPreference = z.infer<typeof preference>;
export type WriterOverride = z.infer<typeof override>;
export type LegacyProfileAttachment = z.infer<typeof legacyProfileAttachmentSchema>;

/** Errors never echo personal text, schema values or raw legacy payloads. */
export function parseWriterProfile(input: unknown): WriterProfile {
  const parsed = writerProfileSchema.safeParse(input);
  if (!parsed.success) throw new Error('Invalid writer profile: schema, evidence, rights or integrity validation failed');
  return parsed.data;
}

export function compileWriterProfile(input: WriterProfile, options: { task?: string } = {}): { profile: OutputModeProfile; fallback: boolean; diagnostics: string[] } {
  const p = parseWriterProfile(input);
  const settings: Partial<Record<WriterPreferenceKey, string>> = {};
  const diagnostics: string[] = [];
  const scopeMatches = (task: string | undefined) => task === undefined || task === options.task;
  for (const key of Object.keys(writerPreferenceValues) as WriterPreferenceKey[]) {
    let candidates = p.preferences.filter(v => v.key === key && v.status === 'accepted' && scopeMatches(v.task));
    const specific = candidates.filter(v => v.task !== undefined);
    if (specific.length) candidates = specific;
    const explicit = candidates.filter(v => v.origin === 'explicit');
    candidates = explicit.length ? explicit : candidates.filter(v => v.confidence !== 'low');
    const values = new Set(candidates.map(v => v.value));
    if (values.size === 1) settings[key] = candidates[0].value;
    else if (values.size > 1) diagnostics.push(`Conflicting ${key} evidence; generic fallback for this setting.`);
    const applicable = p.overrides.filter(o => o.key === key && scopeMatches(o.task));
    const taskOverrides = applicable.filter(o => o.task !== undefined);
    const last = (taskOverrides.length ? taskOverrides : applicable).at(-1);
    if (last?.action === 'set') settings[key] = last.value!;
    else if (last?.action === 'reject') delete settings[key];
    // Reset removes the override; retain the underlying resolved preference.
  }
  const fallback = Object.keys(settings).length === 0;
  if (fallback) diagnostics.push('No unambiguous supported preferences; explicit generic fallback.');
  const instructions = [
    'Preserve facts, citations, author intent, uncertainty and protected literals. Expression settings do not change evidence confidence.',
    'Do not invent personal identity, experiences or signature phrases. Apply these advisory expression settings only where the task permits.',
    fallback ? 'Use the existing generic writing behavior; no personal style has been established.' : `Expression settings: ${JSON.stringify(settings)}.`,
  ].join('\n');
  return { profile: {
    id: `writer-${p.id}`, version: p.version, description: 'Author-controlled advisory expression profile.',
    kind: 'voice', stage: 'voice', order: 100, instructions,
    provenance: { ...p.provenance }, validation: { level: 'advisory' },
    protectedContent: ['code', 'commands', 'citations', 'quoted-text', 'identifiers', 'machine-readable-blocks'],
  }, fallback, diagnostics };
}

function advance(p: WriterProfile): void {
  const parts = p.version.split('.').map(Number); parts[2]++; p.version = parts.join('.'); p.cacheEpoch++;
}

/** Pure operation; stores use cacheEpoch to invalidate dependent retrieval caches. */
export function revokeWriterSample(input: WriterProfile, sampleId: string): WriterProfile {
  const p = parseWriterProfile(input);
  const s = p.samples.find(v => v.id === sampleId);
  if (!s) throw new Error('Unknown writer sample');
  if (s.status === 'revoked') return p;
  delete s.text; s.status = 'revoked'; s.approved = false; s.rights.useForVoice = false; s.rights.shareText = false;
  p.preferences = p.preferences.filter(v => v.origin === 'explicit' || !v.evidence.some(e => e.sampleId === sampleId));
  for (const v of p.preferences) v.evidence = v.evidence.filter(e => e.sampleId !== sampleId);
  p.counterexamples = p.counterexamples.filter(e => e.sampleId !== sampleId);
  // Legacy payloads may duplicate the revoked text; remove the opaque attachment.
  delete p.legacy;
  advance(p);
  return parseWriterProfile(p);
}

/** Private export is lossless. Shared output requires public approval and passes known-secret redaction. */
export function exportWriterProfile(input: WriterProfile, mode: 'private' | 'shared' = 'shared'): WriterProfile {
  const p = parseWriterProfile(input);
  if (mode === 'private') return p;
  const metadata = { id: p.id, name: p.name, provenance: p.provenance, samples: p.samples.map(s => ({ id: s.id, provenance: s.provenance })), preferences: p.preferences.map(v => ({ id: v.id, task: v.task })), overrides: p.overrides };
  if (redactText(JSON.stringify(metadata)).sensitivity === 'sensitive') p.metadataSharingApproved = false;
  const removed = new Set<string>();
  for (const s of p.samples) {
    const allowed = s.status === 'active' && s.approved && s.sensitivity === 'public' && s.rights.shareText && (s.text === undefined || redactText(s.text).sensitivity === 'none');
    if (!allowed) { delete s.text; removed.add(s.id); }
    if (!p.metadataSharingApproved) s.provenance.source = '[redacted]';
  }
  p.preferences = p.preferences.filter(v => v.origin === 'explicit' || !v.evidence.some(e => removed.has(e.sampleId)));
  for (const v of p.preferences) v.evidence = v.evidence.filter(e => !removed.has(e.sampleId));
  p.counterexamples = p.counterexamples.filter(e => removed.has(e.sampleId) === false);
  if (mode === 'shared') {
    delete p.legacy;
    if (!p.metadataSharingApproved) {
      p.id = 'shared-profile'; p.name = 'Shared writer profile'; p.provenance = { source: '[redacted]', license: '[redacted]' };
      const ids = new Map(p.samples.map((s, i) => [s.id, `sample-${i + 1}`]));
      for (const s of p.samples) { s.id = ids.get(s.id)!; s.provenance = { source: '[redacted]', license: '[redacted]' }; }
      p.preferences = p.preferences.filter(v => v.task === undefined);
      p.overrides = p.overrides.filter(v => v.task === undefined);
      p.preferences.forEach((v, i) => { v.id = `preference-${i + 1}`; v.evidence.forEach(e => { e.sampleId = ids.get(e.sampleId)!; }); });
      p.counterexamples.forEach(e => { e.sampleId = ids.get(e.sampleId)!; });
    }
  }

  return parseWriterProfile(p);
}

/** Metadata-only inspection suitable for CLI logs; never includes sample text or preference evidence text. */
export function inspectWriterProfile(input: WriterProfile) {
  const p = parseWriterProfile(input);
  return { schemaVersion: p.schemaVersion, id: p.id, version: p.version, revision: p.revision, cacheEpoch: p.cacheEpoch,
    sampleCount: p.samples.length, approvedSampleCount: p.samples.filter(s => s.approved && s.status === 'active').length,
    preferenceCount: p.preferences.length, legacyFormat: p.legacy?.format ?? null,
    fallback: compileWriterProfile(p).fallback,
  };
}
