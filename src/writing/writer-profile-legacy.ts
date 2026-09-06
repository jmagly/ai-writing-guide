import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { parseDocument } from 'yaml';
import type { LegacyProfileAttachment } from './writer-profile.js';

type RecordValue = Record<string, unknown>;
const record = (value: unknown): value is RecordValue => value !== null && typeof value === 'object' && !Array.isArray(value);
const nonempty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const bounded = (value: unknown, max = 1): boolean => finite(value) && value >= 0 && value <= max;
const strings = (value: unknown): boolean => Array.isArray(value) && value.every(item => typeof item === 'string');
const fail = (): never => { throw new Error('Invalid or unsupported legacy writer profile. Source text is omitted from diagnostics.'); };

/** Decode UTF-8 without dropping a BOM or silently replacing invalid source bytes. */
function sourceText(raw: string | Uint8Array): string {
  if (typeof raw === 'string') {
    if (Buffer.from(raw, 'utf8').toString('utf8') !== raw) fail();
    return raw;
  }
  if (!(raw instanceof Uint8Array)) fail();
  const bytes = Buffer.from(raw);
  const text = bytes.toString('utf8');
  if (!Buffer.from(text, 'utf8').equals(bytes)) fail();
  return text;
}

function parseSource(raw: string, format: LegacyProfileAttachment['format']): unknown {
  try {
    if (format === 'json') return JSON.parse(raw.replace(/^\uFEFF/, '')) as unknown;
    if (format !== 'yaml') fail();
    const document = parseDocument(raw, { uniqueKeys: true, strict: true });
    if (document.errors.length || document.warnings.length) fail();
    const payload: unknown = document.toJS({ maxAliasCount: 100 });
    // Sidecars serialize as JSON: reject cyclic aliases, non-finite numbers and
    // other YAML values that would silently change on private export.
    if (!isDeepStrictEqual(payload, JSON.parse(JSON.stringify(payload)))) fail();
    return payload;
  } catch {
    // Parser messages may quote private samples, filenames or instruction text.
    return fail();
  }
}

function isCalibration(value: unknown): boolean {
  if (!record(value) || !nonempty(value.voice) || !bounded(value.detectionConfidence) || !record(value.characteristics) || !Array.isArray(value.markers)) return false;
  const c = value.characteristics;
  if (!['formality', 'technicality', 'assertiveness', 'complexity'].every(key => bounded(c[key]))) return false;
  const lengths = c.sentenceLength;
  if (!record(lengths) || !['avg', 'min', 'max', 'variance'].every(key => finite(lengths[key]) && (lengths[key] as number) >= 0)) return false;
  if (!['basic', 'intermediate', 'advanced', 'expert'].includes(String(c.vocabularyLevel)) || !bounded(c.firstPersonUsage, 100) || !bounded(c.passiveVoiceRatio, 100)) return false;
  return value.markers.every(marker => record(marker)
    && ['vocabulary', 'structure', 'tone', 'perspective'].includes(String(marker.type))
    && typeof marker.indicator === 'string' && bounded(marker.weight) && strings(marker.examples));
}

function isAnalyzer(value: RecordValue): boolean {
  if (!['academic', 'technical', 'executive', 'casual', 'mixed'].includes(String(value.primaryVoice)) || !bounded(value.confidence, 100) || !record(value.characteristics) || !record(value.metadata) || !Array.isArray(value.markers)) return false;
  const characteristics = value.characteristics;
  if (!['academic', 'technical', 'executive', 'casual'].every(key => finite(characteristics[key]) && (characteristics[key] as number) >= 0)) return false;
  const metadata = value.metadata;
  return ['wordCount', 'sentenceCount', 'averageSentenceLength'].every(key => finite(metadata[key]) && (metadata[key] as number) >= 0)
    && ['first-person', 'third-person', 'neutral'].includes(String(value.perspective))
    && ['formal', 'conversational', 'enthusiastic', 'matter-of-fact'].includes(String(value.tone))
    && value.markers.every(marker => record(marker)
      && ['academic', 'technical', 'executive', 'casual'].includes(String(marker.type))
      && typeof marker.text === 'string' && Number.isInteger(marker.position) && (marker.position as number) >= 0
      && ['strong', 'moderate', 'weak'].includes(String(marker.strength)));
}

/** Recognize producer families without rewriting their incompatible legacy fields. */
function classify(payload: unknown): LegacyProfileAttachment['kind'] {
  if (Array.isArray(payload)) {
    if (payload.length > 0 && payload.every(isCalibration)) return 'ts-calibration';
    return fail();
  }
  if (!record(payload)) return fail();
  if ('profiles' in payload) {
    if (Array.isArray(payload.profiles) && payload.profiles.length > 0 && payload.profiles.every(isCalibration)) return 'ts-calibration';
    return fail();
  }
  if ('primaryVoice' in payload) return isAnalyzer(payload) ? 'ts-analyzer' : fail();
  if ('voice' in payload) return isCalibration(payload) ? 'ts-calibration' : fail();
  if (!nonempty(payload.name) || !nonempty(payload.version) || typeof payload.description !== 'string' || !record(payload.tone)) return fail();
  for (const key of ['formality', 'confidence', 'warmth', 'energy', 'complexity']) {
    if (key in payload.tone && !bounded(payload.tone[key])) return fail();
  }
  const producers = ['generated_from', 'analysis_source', 'blend_sources'].filter(key => key in payload);
  if (producers.length > 1) return fail();
  if ('generated_from' in payload) {
    if (typeof payload.generated_from !== 'string' || typeof payload.detected_domain !== 'string') return fail();
    return 'python-generated';
  }
  if ('analysis_source' in payload) {
    const source = payload.analysis_source;
    if (!record(source) || !finite(source.sample_size) || source.sample_size < 0 || !bounded(source.confidence) || !record(payload.extracted_metrics)) return fail();
    return 'python-analyzed';
  }
  if ('blend_sources' in payload) {
    if (!Array.isArray(payload.blend_sources) || !payload.blend_sources.length || !payload.blend_sources.every(source => record(source) && nonempty(source.name) && finite(source.weight))) return fail();
    return 'python-blended';
  }
  return 'addon-template';
}

/**
 * Explicit, lossless import. No preferences, samples, identities or instructions
 * are inferred. Keep this attachment private unless separately reviewed: legacy
 * examples and unknown fields may contain personal text or secrets.
 */
export function importLegacyWriterProfile(raw: string | Uint8Array, format: LegacyProfileAttachment['format']): LegacyProfileAttachment {
  const text = sourceText(raw);
  const payload = parseSource(text, format);
  const kind = classify(payload);
  return { format, kind, raw: text, sha256: createHash('sha256').update(text, 'utf8').digest('hex'), payload };
}

/** Reject stale/tampered payloads and metadata without quoting source content. */
export function validateLegacyWriterProfile(attachment: LegacyProfileAttachment): LegacyProfileAttachment {
  if (!record(attachment) || typeof attachment.raw !== 'string') return fail();
  const imported = importLegacyWriterProfile(attachment.raw, attachment.format);
  if (attachment.sha256 !== imported.sha256 || attachment.kind !== imported.kind || !isDeepStrictEqual(attachment.payload, imported.payload)) return fail();
  return imported;
}

/** Return original UTF-8 text, including whitespace, comments, BOM and newlines. */
export function exportLegacyWriterProfile(attachment: LegacyProfileAttachment): string {
  return validateLegacyWriterProfile(attachment).raw;
}
