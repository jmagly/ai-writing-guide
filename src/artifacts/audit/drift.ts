/**
 * Drift detection logic.
 *
 * Pure functions — given a stored SemanticFields and a current artifact
 * snapshot, classify status and produce a DriftRow. The CLI layer
 * orchestrates filesystem I/O around these primitives.
 *
 * @implements #1208
 */

import type { SemanticFields } from '../enrichment/types.js';
import { DEFAULT_THRESHOLDS, type DriftRow, type DriftThresholds } from './types.js';

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'on', 'in', 'at', 'to',
  'for', 'of', 'is', 'are', 'was', 'were', 'be', 'been', 'this', 'that',
  'with', 'from', 'as', 'by', 'it',
]);

/** Tokenize and de-stop a string into a content keyword set. */
export function keywords(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
  return new Set(tokens);
}

/** Jaccard-like overlap ratio between two keyword sets. */
export function keywordOverlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let intersect = 0;
  for (const t of a) if (b.has(t)) intersect++;
  const union = a.size + b.size - intersect;
  return union === 0 ? 1 : intersect / union;
}

/** Symmetric difference between two symbol arrays. */
export function symbolDelta(
  stored:  string[],
  current: string[],
): { added: string[]; removed: string[] } {
  const sset = new Set(stored);
  const cset = new Set(current);
  const added:   string[] = [];
  const removed: string[] = [];
  for (const c of cset) if (!sset.has(c)) added.push(c);
  for (const s of sset) if (!cset.has(s)) removed.push(s);
  added.sort();
  removed.sort();
  return { added, removed };
}

export interface DriftInput {
  artifactId:    string;
  stored:        SemanticFields;
  currentHash:   string;
  /** Recomputed semantic fields for the current artifact (or null if not recomputed). */
  recomputed:    SemanticFields | null;
  thresholds?:   Partial<DriftThresholds>;
  now?:          Date;
}

/** Classify drift for a single entry. */
export function detectDrift(input: DriftInput): DriftRow {
  const t   = { ...DEFAULT_THRESHOLDS, ...(input.thresholds ?? {}) };
  const now = input.now ?? new Date();
  const ageDays = Math.max(
    0,
    Math.floor((now.getTime() - new Date(input.stored.enrichedAt).getTime()) / 86_400_000),
  );

  // Hash matches → entry is content-fresh; only flag if past freshness window
  if (input.stored.enrichedHash === input.currentHash) {
    if (ageDays > t.freshnessMaxDays) {
      return {
        artifactId:  input.artifactId,
        status:      'stale-age',
        reason:      `enriched ${ageDays}d ago (>${t.freshnessMaxDays}d threshold), content unchanged`,
        storedHash:  input.stored.enrichedHash,
        currentHash: input.currentHash,
        ageDays,
      };
    }
    return {
      artifactId:  input.artifactId,
      status:      'ok',
      reason:      'content unchanged',
      storedHash:  input.stored.enrichedHash,
      currentHash: input.currentHash,
      ageDays,
    };
  }

  // Hash differs but no recomputation supplied → can't classify drift, skip
  if (!input.recomputed) {
    return {
      artifactId:  input.artifactId,
      status:      'skip',
      reason:      'hash differs but no recomputed enrichment supplied',
      storedHash:  input.stored.enrichedHash,
      currentHash: input.currentHash,
      ageDays,
    };
  }

  // Hash differs AND recomputed → check semantic divergence
  const overlap = keywordOverlap(keywords(input.stored.summary), keywords(input.recomputed.summary));
  const delta   = symbolDelta(input.stored.declaredSymbols, input.recomputed.declaredSymbols);
  const symbolDriftSignificant = t.symbolChangeCritical && (delta.added.length > 0 || delta.removed.length > 0);
  const overlapDriftSignificant = overlap < t.keywordOverlapMin;

  if (overlapDriftSignificant || symbolDriftSignificant) {
    const reasons: string[] = [];
    if (overlapDriftSignificant) reasons.push(`summary overlap ${(overlap * 100).toFixed(0)}% < ${(t.keywordOverlapMin * 100).toFixed(0)}%`);
    if (symbolDriftSignificant) reasons.push(`symbols changed (+${delta.added.length}/-${delta.removed.length})`);
    return {
      artifactId:  input.artifactId,
      status:      'drift',
      reason:      reasons.join('; '),
      storedHash:  input.stored.enrichedHash,
      currentHash: input.currentHash,
      ageDays,
      overlap,
      symbolDelta: delta,
      remediation: `aiwg index enrich --using-rlm --files "${input.artifactId}" --force`,
    };
  }

  return {
    artifactId:  input.artifactId,
    status:      'ok',
    reason:      'hash differs but semantic content within thresholds',
    storedHash:  input.stored.enrichedHash,
    currentHash: input.currentHash,
    ageDays,
    overlap,
    symbolDelta: delta,
  };
}
