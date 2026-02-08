/**
 * Natural Language Router Test Suite
 *
 * Tests for phrase routing, fuzzy matching, confidence scoring,
 * category/framework filtering, batch routing, and suggestions.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { resolve } from 'path';
import { NaturalLanguageRouter, TranslationLoadError } from '../../../tools/workspace/natural-language-router.mjs';

describe('NaturalLanguageRouter', () => {
  let router: InstanceType<typeof NaturalLanguageRouter>;

  beforeEach(() => {
    const translationsPath = resolve(process.cwd(), 'agentic/code/frameworks/sdlc-complete/docs/simple-language-translations.md');
    router = new NaturalLanguageRouter(translationsPath);
  });

  describe('Basic Routing', () => {
    it('should route phrases correctly with exact, fuzzy, and case-insensitive matches', async () => {
      // Exact phrase match
      const exactResult = await router.route('transition to elaboration');
      expect(exactResult).not.toBeNull();
      expect(exactResult?.commandId).toBe('flow-inception-to-elaboration');
      expect(exactResult?.framework).toBe('sdlc-complete');
      expect(exactResult?.confidence).toBe(1.0);
      expect(exactResult?.category).toBe('phase-transitions');

      // Case-insensitive matching
      const caseResult = await router.route('TRANSITION TO ELABORATION');
      expect(caseResult).not.toBeNull();
      expect(caseResult?.commandId).toBe('flow-inception-to-elaboration');
      expect(caseResult?.confidence).toBe(1.0);

      // Normalize punctuation and whitespace
      const punctResult = await router.route('  Transition  to   Elaboration!  ');
      expect(punctResult).not.toBeNull();
      expect(punctResult?.commandId).toBe('flow-inception-to-elaboration');
      expect(punctResult?.confidence).toBe(1.0);

      // Fuzzy match with typos (Levenshtein ≤2)
      const fuzzyResult = await router.route('transision to elaboration'); // 1 typo
      expect(fuzzyResult).not.toBeNull();
      expect(fuzzyResult?.commandId).toBe('flow-inception-to-elaboration');
      expect(fuzzyResult?.confidence).toBeGreaterThanOrEqual(0.7);
      expect(fuzzyResult?.confidence).toBeLessThan(1.0);

      // Low confidence matches (<0.7) return null
      const lowConfidenceResult = await router.route('completely different phrase');
      expect(lowConfidenceResult).toBeNull();
    });
  });

  describe('Translation Management', () => {
    it('should load, reload, and track translations with metadata', async () => {
      // Initial load
      await router.loadTranslations();
      const count = router.getTranslationCount();
      expect(count).toBeGreaterThan(0);
      expect(router.translationMetadata.version).toBeDefined();
      expect(router.translationMetadata.loadedAt).toBeDefined();

      // Reload and maintain count
      const countBefore = router.getTranslationCount();
      await router.reloadTranslations();
      const countAfter = router.getTranslationCount();
      expect(countBefore).toBe(countAfter);

      // At least 50 translations loaded
      expect(count).toBeGreaterThanOrEqual(50);

      // Metadata populated after loading
      expect(router.translationMetadata.totalTranslations).toBeGreaterThan(0);
      expect(router.translationMetadata.categories).toBeDefined();
      expect(router.translationMetadata.categories.size).toBeGreaterThan(0);
    });
  });

  describe('Filtering and Queries', () => {
    it('should filter translations by category and framework', async () => {
      // Get by category
      const transitions = await router.getByCategory('phase-transitions');
      expect(Array.isArray(transitions)).toBe(true);
      expect(transitions.length).toBeGreaterThan(0);
      expect(transitions.every(t => t.category === 'phase-transitions')).toBe(true);

      // Get by framework
      const sdlcTranslations = await router.getByFramework('sdlc-complete');
      expect(Array.isArray(sdlcTranslations)).toBe(true);
      expect(sdlcTranslations.length).toBeGreaterThan(0);
      expect(sdlcTranslations.every(t => t.framework === 'sdlc-complete')).toBe(true);
    });

    it('should get suggestions sorted by confidence', async () => {
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
    it('should calculate similarity scores and find best matches', () => {
      // Test various similarity cases in one test
      const testCases = [
        { str1: 'test', str2: 'test', expectedMin: 1.0, expectedMax: 1.0, desc: 'exact match' },
        { str1: 'test', str2: 'text', expectedMin: 0.7, expectedMax: 1.0, desc: 'single char diff' },
        { str1: 'abc', str2: 'xyz', expectedMin: 0.0, expectedMax: 0.5, desc: 'completely different' },
        { str1: 'kitten', str2: 'sitting', expectedMin: 0.4, expectedMax: 1.0, desc: 'Levenshtein distance' },
        { str1: 'abc', str2: 'abc', expectedMin: 1.0, expectedMax: 1.0, desc: 'exact match 2' }
      ];

      for (const { str1, str2, expectedMin, expectedMax, desc } of testCases) {
        const score = router.fuzzyMatch(str1, str2);
        expect(score, `${desc}: fuzzyMatch('${str1}', '${str2}')`).toBeGreaterThanOrEqual(expectedMin);
        expect(score, `${desc}: fuzzyMatch('${str1}', '${str2}')`).toBeLessThanOrEqual(expectedMax);
      }
    });

    it('should find best match from candidates or return null', () => {
      // Best match from candidates
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

      // No matching candidates
      const candidatesNoMatch = ['apple', 'banana', 'cherry'];
      const noMatch = router.findBestMatch('xyz completely different', candidatesNoMatch);
      expect(noMatch).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should return null for invalid or unknown phrases', async () => {
      const edgeCases = [
        { phrase: 'this phrase does not exist anywhere', desc: 'unknown phrase' },
        { phrase: null, desc: 'null phrase' },
        { phrase: '', desc: 'empty phrase' },
        { phrase: undefined, desc: 'undefined phrase' }
      ];

      for (const { phrase, desc } of edgeCases) {
        const result = await router.route(phrase as any);
        expect(result, desc).toBeNull();
      }
    });

    it('should return empty array for getSuggestions with null phrase', async () => {
      const suggestions = await router.getSuggestions(null as any);
      expect(suggestions).toEqual([]);
    });
  });

  describe('Normalization', () => {
    it('should normalize various input formats', () => {
      const normalizationCases = [
        { input: 'HELLO WORLD', expected: 'hello world', desc: 'lowercase' },
        { input: '  hello  ', expected: 'hello', desc: 'trim whitespace' },
        { input: 'hello, world!', expected: 'hello world', desc: 'remove punctuation' },
        { input: 'hello    world', expected: 'hello world', desc: 'collapse multiple spaces' },
        { input: '', expected: '', desc: 'empty input' },
        { input: null, expected: '', desc: 'null input' }
      ];

      for (const { input, expected, desc } of normalizationCases) {
        const normalized = router.normalize(input as any);
        expect(normalized, desc).toBe(expected);
      }
    });
  });

  describe('Token Extraction', () => {
    it('should extract tokens correctly from various inputs', () => {
      const tokenCases = [
        { input: 'transition to elaboration', expected: ['transition', 'to', 'elaboration'], desc: 'extract tokens from phrase' },
        { input: null, expected: [], desc: 'return empty array for null input' },
        { input: '  hello   world  ', expected: ['hello', 'world'], desc: 'filter out empty tokens' }
      ];

      for (const { input, expected, desc } of tokenCases) {
        const tokens = router.extractTokens(input as any);
        expect(tokens, desc).toEqual(expected);
      }
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
    it('should respect custom and default configuration values', async () => {
      const translationsPath = resolve(process.cwd(), 'agentic/code/frameworks/sdlc-complete/docs/simple-language-translations.md');

      // Custom strict threshold
      const strictRouter = new NaturalLanguageRouter(translationsPath, { confidenceThreshold: 0.99 });
      const strictResult = await strictRouter.route('transision to elaboration');
      expect(strictResult).toBeNull(); // Should fail strict 0.99 threshold

      // Default confidence threshold of 0.7
      const defaultRouter = new NaturalLanguageRouter();
      expect(defaultRouter.confidenceThreshold).toBe(0.7);

      // Default cache TTL of 5 minutes
      expect(defaultRouter.cacheTTL).toBe(300000);
    });
  });
});
