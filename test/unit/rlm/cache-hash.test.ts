/**
 * Hash determinism and invalidation tests for RLM result cache.
 *
 * @implements #1203
 */

import { describe, expect, it } from 'vitest';
import { computeHash, isCacheKey } from '../../../src/rlm/cache/hash.js';
import type { CacheKey } from '../../../src/rlm/cache/types.js';

const baseKey: CacheKey = {
  inputs: [
    { artifactId: 'src/auth/login.ts',  contentHash: 'a'.repeat(64) },
    { artifactId: 'src/auth/logout.ts', contentHash: 'b'.repeat(64) },
  ],
  query:             'extract security findings',
  subPrompt:         'Look for password handling issues.',
  model:             'claude-sonnet-4-6',
  aggregateStrategy: 'concat',
};

describe('cache hash', () => {
  it('produces a 64-char hex sha256', () => {
    const h = computeHash(baseKey);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic for identical inputs', () => {
    expect(computeHash(baseKey)).toEqual(computeHash({ ...baseKey, inputs: [...baseKey.inputs] }));
  });

  it('is invariant to input ordering', () => {
    const reversed = { ...baseKey, inputs: [...baseKey.inputs].reverse() };
    expect(computeHash(reversed)).toEqual(computeHash(baseKey));
  });

  it('changes when content hash changes (file edit invalidation)', () => {
    const edited: CacheKey = {
      ...baseKey,
      inputs: [
        { artifactId: 'src/auth/login.ts',  contentHash: 'c'.repeat(64) }, // changed
        { artifactId: 'src/auth/logout.ts', contentHash: 'b'.repeat(64) },
      ],
    };
    expect(computeHash(edited)).not.toEqual(computeHash(baseKey));
  });

  it('changes when query changes', () => {
    expect(computeHash({ ...baseKey, query: 'different query' })).not.toEqual(computeHash(baseKey));
  });

  it('changes when sub-prompt changes', () => {
    expect(computeHash({ ...baseKey, subPrompt: 'different prompt' })).not.toEqual(computeHash(baseKey));
  });

  it('changes when model changes', () => {
    expect(computeHash({ ...baseKey, model: 'claude-opus-4-7' })).not.toEqual(computeHash(baseKey));
  });

  it('changes when aggregate strategy changes', () => {
    expect(computeHash({ ...baseKey, aggregateStrategy: 'summarize' })).not.toEqual(computeHash(baseKey));
  });

  it('isCacheKey accepts well-formed keys and rejects junk', () => {
    expect(isCacheKey(baseKey)).toBe(true);
    expect(isCacheKey(null)).toBe(false);
    expect(isCacheKey({})).toBe(false);
    expect(isCacheKey({ ...baseKey, query: 42 })).toBe(false);
  });
});
