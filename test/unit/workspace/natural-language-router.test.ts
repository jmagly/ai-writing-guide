/**
 * Natural Language Router Test Suite
 *
 * Tests for phrase routing, fuzzy matching, confidence scoring,
 * category/framework filtering, batch routing, and suggestions.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NaturalLanguageRouter, TranslationLoadError } from '../../../tools/workspace/natural-language-router.mjs';

describe('NaturalLanguageRouter', () => {
  let router: InstanceType<typeof NaturalLanguageRouter>;

  beforeEach(() => {
    router = new NaturalLanguageRouter();
  });

  describe('Basic Routing', () => {
    it('should return correct command for exact phrase match', async () => {
      const result = await router.route('transition to elaboration');

      expect(result).not.toBeNull();
      expect(result?.commandId).toBe('flow-inception-to-elaboration');
      expect(result?.framework).toBe('sdlc-complete');
      expect(result?.confidence).toBe(1.0);
      expect(result?.category).toBe('phase-transitions');
    });

    it('should handle case-insensitive matching', async () => {
      const result = await router.route('TRANSITION TO ELABORATION');

      expect(result).not.toBeNull();
      expect(result?.commandId).toBe('flow-inception-to-elaboration');
      expect(result?.confidence).toBe(1.0);
    });

    it('should normalize punctuation and whitespace', async () => {
      const result = await router.route('  Transition  to   Elaboration!  ');

      expect(result).not.toBeNull();
      expect(result?.commandId).toBe('flow-inception-to-elaboration');
      expect(result?.confidence).toBe(1.0);
    });

    it('should handle fuzzy match with typos (Levenshtein ≤2)', async () => {
      const result = await router.route('transision to elaboration'); // 1 typo

      expect(result).not.toBeNull();
      expect(result?.commandId).toBe('flow-inception-to-elaboration');
      expect(result?.confidence).toBeGreaterThanOrEqual(0.7);
      expect(result?.confidence).toBeLessThan(1.0);
    });

    it('should return null for low confidence matches (<0.7)', async () => {
      const result = await router.route('completely different phrase');

      expect(result).toBeNull();
    });
  });

  describe('Translation Management', () => {
    it('should load translations from markdown file', async () => {
      await router.loadTranslations();

      const count = router.getTranslationCount();
      expect(count).toBeGreaterThan(0);
      expect(router.translationMetadata.version).toBeDefined();
      expect(router.translationMetadata.loadedAt).toBeDefined();
    });

    it('should reload translations and maintain count', async () => {
      await router.loadTranslations();
      const countBefore = router.getTranslationCount();

      await router.reloadTranslations();
      const countAfter = router.getTranslationCount();

      expect(countBefore).toBe(countAfter);
    });

    it('should have at least 50 translations loaded', async () => {
      await router.loadTranslations();

      const count = router.getTranslationCount();
      expect(count).toBeGreaterThanOrEqual(50);
    });
  });

  describe('Filtering and Queries', () => {
    it('should get translations by category', async () => {
      const transitions = await router.getByCategory('phase-transitions');

      expect(Array.isArray(transitions)).toBe(true);
      expect(transitions.length).toBeGreaterThan(0);
      expect(transitions.every(t => t.category === 'phase-transitions')).toBe(true);
    });

    it('should get translations by framework', async () => {
      const sdlcTranslations = await router.getByFramework('sdlc-complete');

      expect(Array.isArray(sdlcTranslations)).toBe(true);
      expect(sdlcTranslations.length).toBeGreaterThan(0);
      expect(sdlcTranslations.every(t => t.framework === 'sdlc-complete')).toBe(true);
    });

    it('should get suggestions for ambiguous phrase', async () => {
      const suggestions = await router.getSuggestions('start', 5);

      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.length).toBeLessThanOrEqual(5);

      // Verify sorted by confidence descending
      for (let i = 1; i < suggestions.length; i++) {
        expect(suggestions[i - 1].confidence).toBeGreaterThanOrEqual(suggestions[i].confidence);
      }
    });
  });

  describe('Batch Operations', () => {
    it('should route multiple phrases in batch', async () => {
      const phrases = [
        'transition to elaboration',
        'run security review',
        'unknown phrase xyz'
      ];

      const results = await router.routeBatch(phrases);

      expect(results.length).toBe(3);
      expect(results[0]).not.toBeNull();
      expect(results[1]).not.toBeNull();
      expect(results[2]).toBeNull();

      expect(results[0]?.commandId).toBe('flow-inception-to-elaboration');
      expect(results[1]?.commandId).toBe('flow-security-review-cycle');
    });

    it('should throw error for non-array input', async () => {
      await expect(router.routeBatch('not an array' as any))
        .rejects.toThrow('routeBatch expects array of phrases');
    });
  });

  describe('Fuzzy Matching Algorithm', () => {
    it('should calculate correct similarity scores', () => {
      // Exact match
      const exact = router.fuzzyMatch('test', 'test');
      expect(exact).toBe(1.0);

      // Single character difference
      const close = router.fuzzyMatch('test', 'text');
      expect(close).toBeGreaterThan(0.7);
      expect(close).toBeLessThan(1.0);

      // Completely different
      const different = router.fuzzyMatch('abc', 'xyz');
      expect(different).toBeLessThan(0.5);
    });

    it('should handle Levenshtein distance calculation', () => {
      const score1 = router.fuzzyMatch('kitten', 'sitting');
      expect(score1).toBeGreaterThan(0.4);

      const score2 = router.fuzzyMatch('abc', 'abc');
      expect(score2).toBe(1.0);
    });

    it('should find best match from candidates', () => {
      // Use lower threshold for findBestMatch
      const customRouter = new NaturalLanguageRouter(null, { confidenceThreshold: 0.6 });
      const candidates = [
        'run security review',
        'start security check',
        'validate security'
      ];

      const best = customRouter.findBestMatch('run security', candidates);

      expect(best).not.toBeNull();
      expect(best?.phrase).toBe('run security review');
      expect(best?.confidence).toBeGreaterThanOrEqual(0.6);
    });

    it('should return null for no matching candidates', () => {
      const candidates = ['apple', 'banana', 'cherry'];

      const best = router.findBestMatch('xyz completely different', candidates);

      expect(best).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should return null for unknown phrase', async () => {
      const result = await router.route('this phrase does not exist anywhere');

      expect(result).toBeNull();
    });

    it('should return null for null phrase', async () => {
      const result = await router.route(null as any);

      expect(result).toBeNull();
    });

    it('should return null for empty phrase', async () => {
      const result = await router.route('');

      expect(result).toBeNull();
    });

    it('should return null for undefined phrase', async () => {
      const result = await router.route(undefined as any);

      expect(result).toBeNull();
    });

    it('should return empty array for getSuggestions with null phrase', async () => {
      const suggestions = await router.getSuggestions(null as any);

      expect(suggestions).toEqual([]);
    });
  });

  describe('Normalization', () => {
    it('should normalize to lowercase', () => {
      const normalized = router.normalize('HELLO WORLD');
      expect(normalized).toBe('hello world');
    });

    it('should trim whitespace', () => {
      const normalized = router.normalize('  hello  ');
      expect(normalized).toBe('hello');
    });

    it('should remove punctuation', () => {
      const normalized = router.normalize('hello, world!');
      expect(normalized).toBe('hello world');
    });

    it('should collapse multiple spaces', () => {
      const normalized = router.normalize('hello    world');
      expect(normalized).toBe('hello world');
    });

    it('should handle empty input', () => {
      const normalized = router.normalize('');
      expect(normalized).toBe('');
    });

    it('should handle null input', () => {
      const normalized = router.normalize(null as any);
      expect(normalized).toBe('');
    });
  });

  describe('Token Extraction', () => {
    it('should extract tokens from phrase', () => {
      const tokens = router.extractTokens('transition to elaboration');
      expect(tokens).toEqual(['transition', 'to', 'elaboration']);
    });

    it('should return empty array for null input', () => {
      const tokens = router.extractTokens(null as any);
      expect(tokens).toEqual([]);
    });

    it('should filter out empty tokens', () => {
      const tokens = router.extractTokens('  hello   world  ');
      expect(tokens).toEqual(['hello', 'world']);
    });
  });

  describe('Performance', () => {
    it('should route phrase in <100ms (NFR-PERF-09)', async () => {
      // Warm up cache
      await router.route('transition to elaboration');

      // Test 100 iterations
      const iterations = 100;
      const start = Date.now();

      for (let i = 0; i < iterations; i++) {
        await router.route('transition to elaboration');
      }

      const elapsed = Date.now() - start;
      const avgTime = elapsed / iterations;

      expect(avgTime).toBeLessThan(100);
    });
  });

  describe('Custom Configuration', () => {
    it('should respect custom confidence threshold', async () => {
      const strictRouter = new NaturalLanguageRouter(null, { confidenceThreshold: 0.99 });

      // Fuzzy match that would normally pass 0.7 threshold (typo: transision vs transition)
      const result = await strictRouter.route('transision to elaboration');

      // Should fail strict 0.99 threshold (actual confidence ~0.96)
      expect(result).toBeNull();
    });

    it('should use default confidence threshold of 0.7', () => {
      const defaultRouter = new NaturalLanguageRouter();
      expect(defaultRouter.confidenceThreshold).toBe(0.7);
    });

    it('should use default cache TTL of 5 minutes', () => {
      const defaultRouter = new NaturalLanguageRouter();
      expect(defaultRouter.cacheTTL).toBe(300000);
    });
  });

  describe('Translation Metadata', () => {
    it('should populate metadata after loading', async () => {
      await router.loadTranslations();

      expect(router.translationMetadata.version).toBeDefined();
      expect(router.translationMetadata.loadedAt).toBeDefined();
      expect(router.translationMetadata.totalTranslations).toBeGreaterThan(0);
      expect(router.translationMetadata.categories).toBeDefined();
      expect(router.translationMetadata.categories.size).toBeGreaterThan(0);
    });
  });
});
