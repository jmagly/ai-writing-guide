#!/usr/bin/env node

/**
 * @fileoverview Unit Tests for Natural Language Router
 *
 * @module tests/unit/natural-language-router.test
 * @description
 * Comprehensive test suite for NaturalLanguageRouter component (FID-007, Week 3, Task 2).
 *
 * Test Coverage:
 * - Exact phrase matching (TC-WS-004-1)
 * - Fuzzy matching with typo tolerance (TC-WS-004-2)
 * - Confidence scoring and threshold validation
 * - Category and framework filtering
 * - Batch routing
 * - Suggestion generation
 * - Performance validation (<100ms per route)
 * - Translation loading and caching
 * - Edge cases and error handling
 *
 * @author Software Implementer
 * @version 1.0.0
 * @created 2025-10-19
 *
 * @see FID-007 (Implementation Plan - Week 3, Task 2)
 * @see UC-012 (Framework-Aware Workspace Management - AC-4)
 */

import assert from 'assert';
import { NaturalLanguageRouter, TranslationLoadError } from '../../tools/workspace/natural-language-router.mjs';

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  errors: []
};

/**
 * Test Runner
 */
async function runTests() {
  console.log('🧪 Natural Language Router - Unit Tests\n');
  console.log('─'.repeat(60));

  // Test Suite 1: Basic Routing
  await testExactMatch();
  await testCaseInsensitiveMatch();
  await testNormalizationHandling();
  await testFuzzyMatchTypo();
  await testLowConfidenceReject();

  // Test Suite 2: Translation Management
  await testLoadTranslations();
  await testReloadTranslations();
  await testGetTranslationCount();

  // Test Suite 3: Filtering and Queries
  await testGetByCategory();
  await testGetByFramework();
  await testGetSuggestions();

  // Test Suite 4: Batch Operations
  await testRouteBatch();

  // Test Suite 5: Fuzzy Matching Algorithm
  await testFuzzyMatchSimilarity();
  await testLevenshteinDistance();
  await testFindBestMatch();

  // Test Suite 6: Edge Cases
  await testUnknownPhrase();
  await testNullPhrase();
  await testEmptyPhrase();

  // Test Suite 7: Performance
  await testRoutingPerformance();

  // Summary
  console.log('─'.repeat(60));
  console.log(`\n✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);

  if (results.failed > 0) {
    console.log('\n🔴 Failures:');
    results.errors.forEach(err => console.log(`  - ${err}`));
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  }
}

/**
 * Test Helper: Assert with custom message
 */
function test(name, fn) {
  return async () => {
    try {
      await fn();
      results.passed++;
      console.log(`✅ ${name}`);
    } catch (error) {
      results.failed++;
      results.errors.push(`${name}: ${error.message}`);
      console.log(`❌ ${name}`);
      console.log(`   ${error.message}`);
    }
  };
}

// ──────────────────────────────────────────────────────────────────────
// Test Suite 1: Basic Routing
// ──────────────────────────────────────────────────────────────────────

async function testExactMatch() {
  await test('Exact phrase match returns correct command', async () => {
    const router = new NaturalLanguageRouter();
    const result = await router.route("transition to elaboration");

    assert.ok(result, 'Result should not be null');
    assert.strictEqual(result.commandId, 'flow-inception-to-elaboration');
    assert.strictEqual(result.framework, 'sdlc-complete');
    assert.strictEqual(result.confidence, 1.0);
    assert.strictEqual(result.category, 'phase-transitions');
  })();
}

async function testCaseInsensitiveMatch() {
  await test('Case-insensitive matching works', async () => {
    const router = new NaturalLanguageRouter();
    const result = await router.route("TRANSITION TO ELABORATION");

    assert.ok(result, 'Result should not be null');
    assert.strictEqual(result.commandId, 'flow-inception-to-elaboration');
    assert.strictEqual(result.confidence, 1.0);
  })();
}

async function testNormalizationHandling() {
  await test('Normalization handles punctuation and whitespace', async () => {
    const router = new NaturalLanguageRouter();
    const result = await router.route("  Transition  to   Elaboration!  ");

    assert.ok(result, 'Result should not be null');
    assert.strictEqual(result.commandId, 'flow-inception-to-elaboration');
    assert.strictEqual(result.confidence, 1.0);
  })();
}

async function testFuzzyMatchTypo() {
  await test('Fuzzy match handles typos (Levenshtein ≤2)', async () => {
    const router = new NaturalLanguageRouter();
    const result = await router.route("transision to elaboration"); // 1 typo

    assert.ok(result, 'Result should not be null');
    assert.strictEqual(result.commandId, 'flow-inception-to-elaboration');
    assert.ok(result.confidence >= 0.7, 'Confidence should be >= 0.7');
    assert.ok(result.confidence < 1.0, 'Confidence should be < 1.0 for fuzzy match');
  })();
}

async function testLowConfidenceReject() {
  await test('Low confidence (<0.7) returns null', async () => {
    const router = new NaturalLanguageRouter();
    const result = await router.route("completely different phrase");

    assert.strictEqual(result, null, 'Low confidence should return null');
  })();
}

// ──────────────────────────────────────────────────────────────────────
// Test Suite 2: Translation Management
// ──────────────────────────────────────────────────────────────────────

async function testLoadTranslations() {
  await test('Load translations from markdown file', async () => {
    const router = new NaturalLanguageRouter();
    await router.loadTranslations();

    const count = router.getTranslationCount();
    assert.ok(count > 0, 'Should load at least 1 translation');
    assert.ok(router.translationMetadata.version, 'Metadata version should be set');
    assert.ok(router.translationMetadata.loadedAt, 'Metadata loadedAt should be set');
  })();
}

async function testReloadTranslations() {
  await test('Reload translations clears cache and reloads', async () => {
    const router = new NaturalLanguageRouter();
    await router.loadTranslations();
    const countBefore = router.getTranslationCount();

    await router.reloadTranslations();
    const countAfter = router.getTranslationCount();

    assert.strictEqual(countBefore, countAfter, 'Translation count should remain same after reload');
  })();
}

async function testGetTranslationCount() {
  await test('Get translation count returns correct number', async () => {
    const router = new NaturalLanguageRouter();
    await router.loadTranslations();

    const count = router.getTranslationCount();
    assert.ok(count >= 50, 'Should have at least 50 translations (target: 75+)');
  })();
}

// ──────────────────────────────────────────────────────────────────────
// Test Suite 3: Filtering and Queries
// ──────────────────────────────────────────────────────────────────────

async function testGetByCategory() {
  await test('Get translations by category', async () => {
    const router = new NaturalLanguageRouter();
    const transitions = await router.getByCategory('phase-transitions');

    assert.ok(Array.isArray(transitions), 'Should return array');
    assert.ok(transitions.length > 0, 'Should have at least 1 phase transition');
    assert.ok(transitions.every(t => t.category === 'phase-transitions'), 'All should be phase-transitions');
  })();
}

async function testGetByFramework() {
  await test('Get translations by framework', async () => {
    const router = new NaturalLanguageRouter();
    const sdlcTranslations = await router.getByFramework('sdlc-complete');

    assert.ok(Array.isArray(sdlcTranslations), 'Should return array');
    assert.ok(sdlcTranslations.length > 0, 'Should have SDLC translations');
    assert.ok(sdlcTranslations.every(t => t.framework === 'sdlc-complete'), 'All should be sdlc-complete');
  })();
}

async function testGetSuggestions() {
  await test('Get suggestions for ambiguous phrase', async () => {
    const router = new NaturalLanguageRouter();
    const suggestions = await router.getSuggestions('start', 5);

    assert.ok(Array.isArray(suggestions), 'Should return array');
    assert.ok(suggestions.length > 0, 'Should have at least 1 suggestion');
    assert.ok(suggestions.length <= 5, 'Should not exceed limit');

    // Verify sorted by confidence descending
    for (let i = 1; i < suggestions.length; i++) {
      assert.ok(
        suggestions[i - 1].confidence >= suggestions[i].confidence,
        'Suggestions should be sorted by confidence descending'
      );
    }
  })();
}

// ──────────────────────────────────────────────────────────────────────
// Test Suite 4: Batch Operations
// ──────────────────────────────────────────────────────────────────────

async function testRouteBatch() {
  await test('Route multiple phrases in batch', async () => {
    const router = new NaturalLanguageRouter();
    const phrases = [
      "transition to elaboration",
      "run security review",
      "unknown phrase xyz"
    ];

    const results = await router.routeBatch(phrases);

    assert.strictEqual(results.length, 3, 'Should return same number of results');
    assert.ok(results[0], 'First phrase should match');
    assert.ok(results[1], 'Second phrase should match');
    assert.strictEqual(results[2], null, 'Third phrase should not match');

    assert.strictEqual(results[0].commandId, 'flow-inception-to-elaboration');
    assert.strictEqual(results[1].commandId, 'flow-security-review-cycle');
  })();
}

// ──────────────────────────────────────────────────────────────────────
// Test Suite 5: Fuzzy Matching Algorithm
// ──────────────────────────────────────────────────────────────────────

async function testFuzzyMatchSimilarity() {
  await test('Fuzzy match calculates correct similarity scores', async () => {
    const router = new NaturalLanguageRouter();

    // Exact match
    const exact = router.fuzzyMatch("test", "test");
    assert.strictEqual(exact, 1.0, 'Exact match should score 1.0');

    // Single character difference
    const close = router.fuzzyMatch("test", "text");
    assert.ok(close > 0.7, 'Close match should score > 0.7');
    assert.ok(close < 1.0, 'Close match should score < 1.0');

    // Completely different
    const different = router.fuzzyMatch("abc", "xyz");
    assert.ok(different < 0.5, 'Different strings should score < 0.5');
  })();
}

async function testLevenshteinDistance() {
  await test('Levenshtein distance calculation correct', async () => {
    const router = new NaturalLanguageRouter();

    // Test via fuzzyMatch (which uses _levenshteinDistance internally)
    const score1 = router.fuzzyMatch("kitten", "sitting");
    assert.ok(score1 > 0.4, 'kitten/sitting should have reasonable similarity');

    const score2 = router.fuzzyMatch("abc", "abc");
    assert.strictEqual(score2, 1.0, 'Identical strings should have distance 0');
  })();
}

async function testFindBestMatch() {
  await test('Find best match from candidates', async () => {
    // Use lower threshold for findBestMatch use case (0.6 instead of 0.7)
    const router = new NaturalLanguageRouter(null, { confidenceThreshold: 0.6 });
    const candidates = [
      "run security review",
      "start security check",
      "validate security"
    ];

    const best = router.findBestMatch("run security", candidates);

    assert.ok(best, 'Should find a match');
    assert.strictEqual(best.phrase, "run security review", 'Should pick closest match');
    assert.ok(best.confidence >= 0.6, 'Confidence should be >= threshold');
  })();
}

// ──────────────────────────────────────────────────────────────────────
// Test Suite 6: Edge Cases
// ──────────────────────────────────────────────────────────────────────

async function testUnknownPhrase() {
  await test('Unknown phrase returns null', async () => {
    const router = new NaturalLanguageRouter();
    const result = await router.route("this phrase does not exist anywhere");

    assert.strictEqual(result, null, 'Unknown phrase should return null');
  })();
}

async function testNullPhrase() {
  await test('Null phrase returns null', async () => {
    const router = new NaturalLanguageRouter();
    const result = await router.route(null);

    assert.strictEqual(result, null, 'Null phrase should return null');
  })();
}

async function testEmptyPhrase() {
  await test('Empty phrase returns null', async () => {
    const router = new NaturalLanguageRouter();
    const result = await router.route("");

    assert.strictEqual(result, null, 'Empty phrase should return null');
  })();
}

// ──────────────────────────────────────────────────────────────────────
// Test Suite 7: Performance
// ──────────────────────────────────────────────────────────────────────

async function testRoutingPerformance() {
  await test('Routing performance <100ms per phrase (NFR-PERF-09)', async () => {
    const router = new NaturalLanguageRouter();

    // Warm up cache
    await router.route("transition to elaboration");

    // Test 100 iterations
    const iterations = 100;
    const start = Date.now();

    for (let i = 0; i < iterations; i++) {
      await router.route("transition to elaboration");
    }

    const elapsed = Date.now() - start;
    const avgTime = elapsed / iterations;

    console.log(`   Average routing time: ${avgTime.toFixed(2)}ms`);
    assert.ok(avgTime < 100, `Routing should be <100ms (actual: ${avgTime.toFixed(2)}ms)`);
  })();
}

// ──────────────────────────────────────────────────────────────────────
// Run All Tests
// ──────────────────────────────────────────────────────────────────────

runTests();
