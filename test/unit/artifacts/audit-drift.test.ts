/**
 * Drift detection tests.
 *
 * @implements #1208
 */

import { describe, expect, it } from 'vitest';
import { detectDrift, keywordOverlap, keywords, symbolDelta } from '../../../src/artifacts/audit/drift.js';
import type { SemanticFields } from '../../../src/artifacts/enrichment/types.js';

const stored: SemanticFields = {
  summary:         'Manages user sessions and token refresh logic.',
  declaredSymbols: ['SessionManager', 'refreshToken', 'validateSession'],
  citations:       ['REF-001'],
  inferredTags:    ['authentication', 'session'],
  openQuestions:   [],
  enrichedAt:      '2026-04-01T00:00:00Z',
  enrichedBy:      'rlm-batch',
  enrichedHash:    'a'.repeat(64),
};

describe('keyword tooling', () => {
  it('tokenizes and de-stops correctly', () => {
    const k = keywords('the quick brown fox jumps over the lazy dog');
    expect(k.has('quick')).toBe(true);
    expect(k.has('the')).toBe(false);
  });

  it('overlap = 1 for identical sets', () => {
    const a = keywords('foo bar baz');
    const b = keywords('foo bar baz');
    expect(keywordOverlap(a, b)).toBe(1);
  });

  it('overlap = 0 for disjoint sets', () => {
    expect(keywordOverlap(keywords('alpha beta'), keywords('gamma delta'))).toBe(0);
  });

  it('overlap = jaccard for partial overlap', () => {
    const a = keywords('foo bar baz qux');
    const b = keywords('foo bar quux corge');
    // intersect = 2 (foo, bar); union = 6 (foo, bar, baz, qux, quux, corge)
    expect(keywordOverlap(a, b)).toBeCloseTo(2 / 6, 5);
  });
});

describe('symbolDelta', () => {
  it('returns empty for identical sets', () => {
    const d = symbolDelta(['a', 'b'], ['a', 'b']);
    expect(d.added).toEqual([]);
    expect(d.removed).toEqual([]);
  });

  it('detects additions and removals', () => {
    const d = symbolDelta(['a', 'b'], ['b', 'c']);
    expect(d.added).toEqual(['c']);
    expect(d.removed).toEqual(['a']);
  });
});

describe('detectDrift', () => {
  it('returns ok when hash matches and within freshness', () => {
    const row = detectDrift({
      artifactId:  'src/auth/sessionManager.ts',
      stored,
      currentHash: 'a'.repeat(64),     // matches
      recomputed:  null,
      now:         new Date('2026-04-15T00:00:00Z'),  // 14 days after enrichment
    });
    expect(row.status).toBe('ok');
  });

  it('returns stale-age when hash matches but past freshness window', () => {
    const row = detectDrift({
      artifactId:  'src/auth/sessionManager.ts',
      stored,
      currentHash: 'a'.repeat(64),
      recomputed:  null,
      thresholds:  { freshnessMaxDays: 30 },
      now:         new Date('2026-06-01T00:00:00Z'),  // 61 days after
    });
    expect(row.status).toBe('stale-age');
    expect(row.ageDays).toBe(61);
  });

  it('returns skip when hash differs and no recomputation', () => {
    const row = detectDrift({
      artifactId:  'src/auth/sessionManager.ts',
      stored,
      currentHash: 'b'.repeat(64),
      recomputed:  null,
    });
    expect(row.status).toBe('skip');
  });

  it('detects drift when symbols change (symbolChangeCritical)', () => {
    const recomputed: SemanticFields = {
      ...stored,
      summary:         'Manages user sessions and token refresh logic.',
      declaredSymbols: ['SessionManager', 'refreshToken'],   // validateSession removed
      enrichedHash:    'b'.repeat(64),
    };
    const row = detectDrift({
      artifactId:  'src/auth/sessionManager.ts',
      stored,
      currentHash: 'b'.repeat(64),
      recomputed,
    });
    expect(row.status).toBe('drift');
    expect(row.symbolDelta?.removed).toContain('validateSession');
    expect(row.remediation).toContain('aiwg index enrich');
  });

  it('detects drift when summary overlap below threshold', () => {
    const recomputed: SemanticFields = {
      ...stored,
      summary:         'Handles password reset flow exclusively.',  // very different topic
      declaredSymbols: stored.declaredSymbols,                       // symbols unchanged
      enrichedHash:    'b'.repeat(64),
    };
    const row = detectDrift({
      artifactId:  'src/auth/sessionManager.ts',
      stored,
      currentHash: 'b'.repeat(64),
      recomputed,
      thresholds:  { keywordOverlapMin: 0.7, symbolChangeCritical: false },
    });
    expect(row.status).toBe('drift');
    expect(row.overlap).toBeLessThan(0.7);
  });

  it('returns ok when hash differs but semantic content within thresholds', () => {
    const recomputed: SemanticFields = {
      ...stored,
      // Same symbols, very similar summary (whitespace + light edit)
      summary:         'Manages user sessions and token refresh logic and helpers.',
      enrichedHash:    'b'.repeat(64),
    };
    const row = detectDrift({
      artifactId:  'src/auth/sessionManager.ts',
      stored,
      currentHash: 'b'.repeat(64),
      recomputed,
    });
    expect(row.status).toBe('ok');
    expect((row.overlap ?? 0)).toBeGreaterThanOrEqual(0.7);
  });
});
