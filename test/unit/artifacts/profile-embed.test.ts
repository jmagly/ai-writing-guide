/**
 * Profile text-embedding similarity + collaboration prediction (#1501).
 * The cosine/similarity/prediction math is dep-free (tested in CI); only
 * buildProfileEmbeddings needs @xenova/transformers (skips when absent).
 *
 * @source @src/artifacts/corpus-tools/profile-embed.ts
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  profileSimilar,
  collaborationPredictions,
  buildProfileEmbeddings,
  type ProfileEmbeddings,
} from '../../../src/artifacts/corpus-tools/profile-embed.js';
import { checkEmbeddingDeps } from '../../../src/artifacts/embedding-index.js';

// Hand-crafted normalized vectors: A and B nearly identical; C orthogonal-ish.
function fixture(): ProfileEmbeddings {
  return {
    profIds: ['PROF-P-a', 'PROF-P-b', 'PROF-P-c'],
    names: ['A', 'B', 'C'],
    vectors: [
      [1, 0, 0],
      [0.98, 0.2, 0],
      [0, 0, 1],
    ],
    refs: [new Set(['REF-1']), new Set(['REF-2']), new Set(['REF-3'])],
  };
}

describe('profileSimilar (#1501)', () => {
  it('ranks the nearest researcher first, excludes self', () => {
    const hits = profileSimilar(fixture(), 'PROF-P-a', 10);
    expect(hits[0].profId).toBe('PROF-P-b'); // closest
    expect(hits.map((h) => h.profId)).not.toContain('PROF-P-a');
    expect(hits[0].score).toBeGreaterThan(hits[1].score);
  });
  it('throws for an unknown profile', () => {
    expect(() => profileSimilar(fixture(), 'PROF-P-nope')).toThrow(/not in the embedding set/);
  });
});

describe('collaborationPredictions (#1501)', () => {
  it('surfaces high-similarity pairs that share no corpus-refs', () => {
    const preds = collaborationPredictions(fixture(), 0.9);
    // A↔B are similar (>0.9) and share no refs → predicted.
    expect(preds).toEqual([{ a: 'PROF-P-a', b: 'PROF-P-b', score: expect.any(Number) }]);
    expect(preds[0].score).toBeGreaterThanOrEqual(0.9);
  });

  it('excludes pairs that already co-author (shared corpus-refs)', () => {
    const emb = fixture();
    emb.refs[1] = new Set(['REF-1']); // B now shares REF-1 with A → already co-authored
    const preds = collaborationPredictions(emb, 0.9);
    expect(preds.find((p) => (p.a === 'PROF-P-a' && p.b === 'PROF-P-b') || (p.a === 'PROF-P-b' && p.b === 'PROF-P-a'))).toBeUndefined();
  });

  it('respects the threshold', () => {
    expect(collaborationPredictions(fixture(), 0.999)).toEqual([]); // nothing that similar + non-coauthor
  });
});

describe('buildProfileEmbeddings (dep-gated)', () => {
  let available = false;
  beforeAll(async () => {
    available = (await checkEmbeddingDeps()).available;
  });
  it('throws a clear error when transformers is absent (else builds)', async () => {
    if (available) return; // when deps present, the live build is exercised elsewhere
    await expect(buildProfileEmbeddings('/nonexistent-corpus')).rejects.toThrow(/optional deps/);
  });
});
