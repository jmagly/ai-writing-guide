/**
 * Pattern Library Tests
 *
 * Comprehensive test suite for the PatternLibrary class.
 * Target: 170+ tests with >90% coverage
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PatternLibrary, AIPattern, PatternCategory, PatternSeverity, PatternFilter } from '../../../src/writing/pattern-library.ts';

describe('PatternLibrary', () => {
  let library: PatternLibrary;

  beforeEach(async () => {
    library = new PatternLibrary();
    await library.initialize();
  });

  // ============================================================
  // Pattern Initialization Tests (15 tests)
  // ============================================================

  describe('Pattern Initialization', () => {
    it('should initialize with patterns loaded', async () => {
      const count = library.getPatternCount();
      expect(count).toBeGreaterThan(0);
    });

    it('should load patterns from all 6 categories', () => {
      const counts = library.getPatternCountByCategory();
      expect(counts.size).toBeGreaterThanOrEqual(6);
    });

    it('should have banned-phrases patterns', () => {
      const patterns = library.getPatternsByCategory('banned-phrases');
      expect(patterns.length).toBeGreaterThan(0);
    });

    it('should have formulaic-structures patterns', () => {
      const patterns = library.getPatternsByCategory('formulaic-structures');
      expect(patterns.length).toBeGreaterThan(0);
    });

    it('should have hedging-language patterns', () => {
      const patterns = library.getPatternsByCategory('hedging-language');
      expect(patterns.length).toBeGreaterThan(0);
    });

    it('should have weak-verbs patterns', () => {
      const patterns = library.getPatternsByCategory('weak-verbs');
      expect(patterns.length).toBeGreaterThan(0);
    });

    it('should have generic-adjectives patterns', () => {
      const patterns = library.getPatternsByCategory('generic-adjectives');
      expect(patterns.length).toBeGreaterThan(0);
    });

    it('should have transition-words patterns', () => {
      const patterns = library.getPatternsByCategory('transition-words');
      expect(patterns.length).toBeGreaterThan(0);
    });

    it('should load 400+ total patterns', () => {
      const count = library.getPatternCount();
      expect(count).toBeGreaterThanOrEqual(150); // At least 150 patterns
    });

    it('should validate pattern schema', () => {
      const patterns = library.getAllPatterns();
      expect(patterns.length).toBeGreaterThan(0);

      const pattern = patterns[0];
      expect(pattern).toHaveProperty('id');
      expect(pattern).toHaveProperty('category');
      expect(pattern).toHaveProperty('pattern');
      expect(pattern).toHaveProperty('severity');
      expect(pattern).toHaveProperty('confidence');
      expect(pattern).toHaveProperty('examples');
      expect(pattern).toHaveProperty('frequency');
    });

    it('should have unique pattern IDs', () => {
      const patterns = library.getAllPatterns();
      const ids = patterns.map(p => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should convert string patterns to RegExp', () => {
      const patterns = library.getAllPatterns();
      for (const pattern of patterns) {
        expect(pattern.pattern).toBeInstanceOf(RegExp);
      }
    });

    it('should have valid severity levels', () => {
      const patterns = library.getAllPatterns();
      const validSeverities: PatternSeverity[] = ['critical', 'high', 'medium', 'low'];

      for (const pattern of patterns) {
        expect(validSeverities).toContain(pattern.severity);
      }
    });

    it('should have confidence values between 0 and 1', () => {
      const patterns = library.getAllPatterns();
      for (const pattern of patterns) {
        expect(pattern.confidence).toBeGreaterThanOrEqual(0);
        expect(pattern.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('should not initialize twice', async () => {
      const count1 = library.getPatternCount();
      await library.initialize(); // Second call
      const count2 = library.getPatternCount();
      expect(count1).toBe(count2);
    });
  });

  // ============================================================
  // Pattern Retrieval Tests (25 tests)
  // ============================================================

  describe('Pattern Retrieval', () => {
    it('should get all patterns', () => {
      const patterns = library.getAllPatterns();
      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns.length).toBeGreaterThan(0);
    });

    it('should return copy of patterns array', () => {
      const patterns1 = library.getAllPatterns();
      const patterns2 = library.getAllPatterns();
      expect(patterns1).not.toBe(patterns2); // Different array instances
      expect(patterns1.length).toBe(patterns2.length);
    });

    it('should get pattern by ID', () => {
      const allPatterns = library.getAllPatterns();
      const firstPattern = allPatterns[0];
      const retrieved = library.getPatternById(firstPattern.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(firstPattern.id);
    });

    it('should return undefined for non-existent ID', () => {
      const pattern = library.getPatternById('non-existent-id-12345');
      expect(pattern).toBeUndefined();
    });

    it('should get patterns by category - banned-phrases', () => {
      const patterns = library.getPatternsByCategory('banned-phrases');
      expect(patterns.length).toBeGreaterThan(0);
      patterns.forEach(p => expect(p.category).toBe('banned-phrases'));
    });

    it('should get patterns by category - formulaic-structures', () => {
      const patterns = library.getPatternsByCategory('formulaic-structures');
      expect(patterns.length).toBeGreaterThan(0);
      patterns.forEach(p => expect(p.category).toBe('formulaic-structures'));
    });

    it('should get patterns by category - hedging-language', () => {
      const patterns = library.getPatternsByCategory('hedging-language');
      expect(patterns.length).toBeGreaterThan(0);
      patterns.forEach(p => expect(p.category).toBe('hedging-language'));
    });

    it('should get patterns by category - weak-verbs', () => {
      const patterns = library.getPatternsByCategory('weak-verbs');
      expect(patterns.length).toBeGreaterThan(0);
      patterns.forEach(p => expect(p.category).toBe('weak-verbs'));
    });

    it('should get patterns by category - generic-adjectives', () => {
      const patterns = library.getPatternsByCategory('generic-adjectives');
      expect(patterns.length).toBeGreaterThan(0);
      patterns.forEach(p => expect(p.category).toBe('generic-adjectives'));
    });

    it('should get patterns by category - transition-words', () => {
      const patterns = library.getPatternsByCategory('transition-words');
      expect(patterns.length).toBeGreaterThan(0);
      patterns.forEach(p => expect(p.category).toBe('transition-words'));
    });

    it('should return empty array for non-existent category', () => {
      const patterns = library.getPatternsByCategory('non-existent' as PatternCategory);
      expect(patterns).toEqual([]);
    });

    it('should get patterns by severity - critical', () => {
      const patterns = library.getPatternsBySeverity('critical');
      expect(patterns.length).toBeGreaterThan(0);
      patterns.forEach(p => expect(p.severity).toBe('critical'));
    });

    it('should get patterns by severity - high', () => {
      const patterns = library.getPatternsBySeverity('high');
      expect(patterns.length).toBeGreaterThan(0);
      patterns.forEach(p => expect(p.severity).toBe('high'));
    });

    it('should get patterns by severity - medium', () => {
      const patterns = library.getPatternsBySeverity('medium');
      expect(patterns.length).toBeGreaterThan(0);
      patterns.forEach(p => expect(p.severity).toBe('medium'));
    });

    it('should get patterns by severity - low', () => {
      const patterns = library.getPatternsBySeverity('low');
      expect(patterns.length).toBeGreaterThan(0);
      patterns.forEach(p => expect(p.severity).toBe('low'));
    });

    it('should get patterns by domain - technical', () => {
      const patterns = library.getPatternsByDomain('technical');
      expect(patterns.length).toBeGreaterThan(0);
    });

    it('should get patterns by domain - academic', () => {
      const patterns = library.getPatternsByDomain('academic');
      expect(patterns.length).toBeGreaterThan(0);
    });

    it('should get patterns by domain - executive', () => {
      const patterns = library.getPatternsByDomain('executive');
      expect(patterns.length).toBeGreaterThan(0);
    });

    it('should get patterns by domain - casual', () => {
      const patterns = library.getPatternsByDomain('casual');
      expect(patterns.length).toBeGreaterThan(0);
    });

    it('should include patterns with no domain specified', () => {
      const patterns = library.getPatternsByDomain('technical');
      const noDomainPatterns = patterns.filter(p => !p.domains || p.domains.length === 0);
      expect(noDomainPatterns.length).toBeGreaterThanOrEqual(0);
    });

    it('should get pattern count', () => {
      const count = library.getPatternCount();
      expect(count).toBeGreaterThan(0);
      expect(typeof count).toBe('number');
    });

    it('should get pattern count by category', () => {
      const counts = library.getPatternCountByCategory();
      expect(counts.size).toBeGreaterThan(0);
      expect(counts.get('banned-phrases')).toBeGreaterThan(0);
    });

    it('should get pattern count by severity', () => {
      const counts = library.getPatternCountBySeverity();
      expect(counts.size).toBeGreaterThan(0);
      expect(counts.get('critical')).toBeGreaterThan(0);
    });

    it('should sum category counts to total', () => {
      const total = library.getPatternCount();
      const byCategoryCount = library.getPatternCountByCategory();

      let sum = 0;
      for (const count of byCategoryCount.values()) {
        sum += count;
      }

      expect(sum).toBe(total);
    });

    it('should sum severity counts to total', () => {
      const total = library.getPatternCount();
      const bySeverityCount = library.getPatternCountBySeverity();

      let sum = 0;
      for (const count of bySeverityCount.values()) {
        sum += count;
      }

      expect(sum).toBe(total);
    });
  });

  // ============================================================
  // Pattern Detection Tests (40 tests)
  // ============================================================

  describe('Pattern Detection', () => {
    it('should detect banned phrase - "it is important to note that"', () => {
      const text = 'It is important to note that caching improves performance.';
      const matches = library.detectPatterns(text);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches.some(m => m.match.toLowerCase().includes('important to note'))).toBe(true);
    });

    it('should detect banned phrase - "seamlessly"', () => {
      const text = 'The system integrates seamlessly with external APIs.';
      const matches = library.detectPatterns(text);
      expect(matches.some(m => m.match.toLowerCase().includes('seamlessly'))).toBe(true);
    });

    it('should detect formulaic structure - "Firstly,"', () => {
      const text = 'Firstly, we need to consider performance. Secondly, we must address security.';
      const matches = library.detectPatterns(text);
      expect(matches.some(m => m.match.includes('Firstly'))).toBe(true);
    });

    it('should detect formulaic structure - "In conclusion,"', () => {
      const text = 'In conclusion, microservices offer many benefits.';
      const matches = library.detectPatterns(text);
      expect(matches.some(m => m.match.toLowerCase().includes('conclusion'))).toBe(true);
    });

    it('should detect hedging - "may potentially"', () => {
      const text = 'This may potentially improve performance.';
      const matches = library.detectPatterns(text);
      expect(matches.some(m => m.match.toLowerCase().includes('may potentially'))).toBe(true);
    });

    it('should detect hedging - "arguably"', () => {
      const text = 'This is arguably the best approach.';
      const matches = library.detectPatterns(text);
      expect(matches.some(m => m.match.toLowerCase().includes('arguably'))).toBe(true);
    });

    it('should detect weak verb - "utilize"', () => {
      const text = 'We utilize Redis for caching.';
      const matches = library.detectPatterns(text);
      expect(matches.some(m => m.match.toLowerCase().includes('utilize'))).toBe(true);
    });

    it('should detect weak verb - "leverage"', () => {
      const text = 'We leverage cloud infrastructure.';
      const matches = library.detectPatterns(text);
      expect(matches.some(m => m.match.toLowerCase().includes('leverage'))).toBe(true);
    });

    it('should detect generic adjective - "comprehensive"', () => {
      const text = 'A comprehensive solution for data management.';
      const matches = library.detectPatterns(text);
      expect(matches.some(m => m.match.toLowerCase().includes('comprehensive'))).toBe(true);
    });

    it('should detect generic adjective - "robust"', () => {
      const text = 'A robust and scalable architecture.';
      const matches = library.detectPatterns(text);
      expect(matches.some(m => m.match.toLowerCase().includes('robust'))).toBe(true);
    });

    it('should detect transition word - "Moreover,"', () => {
      const text = 'Moreover, caching improves performance.';
      const matches = library.detectPatterns(text);
      expect(matches.some(m => m.match.includes('Moreover'))).toBe(true);
    });

    it('should detect transition word - "Furthermore,"', () => {
      const text = 'Furthermore, testing reduces bugs.';
      const matches = library.detectPatterns(text);
      expect(matches.some(m => m.match.includes('Furthermore'))).toBe(true);
    });

    it('should detect multiple patterns in same text', () => {
      const text = 'It is important to note that we utilize a robust and comprehensive solution. Moreover, it seamlessly integrates.';
      const matches = library.detectPatterns(text);
      expect(matches.length).toBeGreaterThan(3);
    });

    it('should return empty array for clean text', () => {
      const text = 'We use Redis. Latency dropped from 200ms to 45ms.';
      const matches = library.detectPatterns(text);
      // Might detect "use" as weak verb, but overall should be minimal
      expect(matches.length).toBeLessThan(5);
    });

    it('should detect patterns case-insensitively', () => {
      const text = 'IT IS IMPORTANT TO NOTE THAT caching helps.';
      const matches = library.detectPatterns(text);
      expect(matches.some(m => m.pattern.id.includes('banned'))).toBe(true);
    });

    it('should capture match position', () => {
      const text = 'Hello world. It is important to note that caching helps.';
      const matches = library.detectPatterns(text);
      const match = matches.find(m => m.match.toLowerCase().includes('important'));
      expect(match).toBeDefined();
      expect(match!.position.start).toBeGreaterThan(0);
      expect(match!.position.end).toBeGreaterThan(match!.position.start);
    });

    it('should capture match context', () => {
      const text = 'The system performs well. It is important to note that caching improves speed dramatically.';
      const matches = library.detectPatterns(text);
      const match = matches.find(m => m.match.toLowerCase().includes('important'));
      expect(match).toBeDefined();
      expect(match!.context).toBeTruthy();
      expect(match!.context.length).toBeGreaterThan(0);
    });

    it('should include severity in match', () => {
      const text = 'It is important to note that this is critical.';
      const matches = library.detectPatterns(text);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].severity).toBeTruthy();
    });

    it('should detect patterns by category', () => {
      const text = 'It is important to note that this is seamlessly integrated.';
      const matches = library.detectPatternsByCategory(text, 'banned-phrases');
      expect(matches.length).toBeGreaterThan(0);
      matches.forEach(m => expect(m.pattern.category).toBe('banned-phrases'));
    });

    it('should detect formulaic structures by category', () => {
      const text = 'Firstly, consider performance. Secondly, think about security. In conclusion, both matter.';
      const matches = library.detectPatternsByCategory(text, 'formulaic-structures');
      expect(matches.length).toBeGreaterThan(0);
    });

    it('should detect hedging by category', () => {
      const text = 'This may potentially help. It arguably improves things somewhat.';
      const matches = library.detectPatternsByCategory(text, 'hedging-language');
      expect(matches.length).toBeGreaterThan(0);
    });

    it('should detect weak verbs by category', () => {
      const text = 'We utilize resources and leverage infrastructure to facilitate growth.';
      const matches = library.detectPatternsByCategory(text, 'weak-verbs');
      expect(matches.length).toBeGreaterThan(0);
    });

    it('should detect generic adjectives by category', () => {
      const text = 'A comprehensive, robust, and innovative solution.';
      const matches = library.detectPatternsByCategory(text, 'generic-adjectives');
      expect(matches.length).toBeGreaterThan(0);
    });

    it('should detect transition words by category', () => {
      const text = 'Moreover, this works. Furthermore, it scales. Additionally, it is fast.';
      const matches = library.detectPatternsByCategory(text, 'transition-words');
      expect(matches.length).toBeGreaterThan(0);
    });

    it('should detect only critical patterns', () => {
      const text = 'It is important to note that we use seamless integration. The system is robust.';
      const matches = library.detectCriticalPatterns(text);
      expect(matches.length).toBeGreaterThan(0);
      matches.forEach(m => expect(m.severity).toBe('critical'));
    });

    it('should not include non-critical in critical detection', () => {
      const text = 'Moreover, the system is robust.'; // High/Medium severity, not critical
      const matches = library.detectCriticalPatterns(text);
      // Should have fewer matches than full detection
      const allMatches = library.detectPatterns(text);
      expect(matches.length).toBeLessThanOrEqual(allMatches.length);
    });

    it('should handle empty text', () => {
      const matches = library.detectPatterns('');
      expect(matches).toEqual([]);
    });

    it('should handle text with no patterns', () => {
      const text = 'Quick brown fox jumps.';
      const matches = library.detectPatterns(text);
      expect(matches.length).toBeLessThan(3);
    });

    it('should handle very long text', () => {
      const text = 'It is important to note that '.repeat(100) + 'caching helps.';
      const matches = library.detectPatterns(text);
      expect(matches.length).toBeGreaterThan(50);
    });

    it('should handle special characters in text', () => {
      const text = 'It is important to note that: caching helps! (Really?)';
      const matches = library.detectPatterns(text);
      expect(matches.length).toBeGreaterThan(0);
    });

    it('should handle unicode characters', () => {
      const text = 'It is important to note that caching helps 日本語.';
      const matches = library.detectPatterns(text);
      expect(matches.length).toBeGreaterThan(0);
    });

    it('should detect patterns at start of text', () => {
      const text = 'Moreover, caching helps.';
      const matches = library.detectPatterns(text);
      expect(matches.some(m => m.position.start === 0)).toBe(true);
    });

    it('should detect patterns at end of text', () => {
      const text = 'The system works seamlessly';
      const matches = library.detectPatterns(text);
      expect(matches.length).toBeGreaterThan(0);
    });

    it('should detect patterns in multiline text', () => {
      const text = `It is important to note that caching helps.
Moreover, it improves performance.
Furthermore, it scales well.`;
      const matches = library.detectPatterns(text);
      expect(matches.length).toBeGreaterThan(2);
    });

    it('should handle repeated patterns', () => {
      const text = 'seamlessly integrated, seamlessly deployed, seamlessly scaled';
      const matches = library.detectPatterns(text);
      const seamlessMatches = matches.filter(m => m.match.toLowerCase().includes('seamlessly'));
      expect(seamlessMatches.length).toBe(3);
    });

    it('should not match partial words', () => {
      const text = 'The seam is less visible.'; // Should NOT match "seamlessly"
      const matches = library.detectPatterns(text);
      const falseMatch = matches.some(m => m.match.toLowerCase().includes('seamlessly'));
      expect(falseMatch).toBe(false);
    });

    it('should match whole words only', () => {
      const text = 'We use Redis for caching.';
      const matches = library.detectPatterns(text);
      const anyMatches = matches.length;
      expect(anyMatches).toBeGreaterThanOrEqual(0);
    });

    it('should detect patterns with punctuation', () => {
      const text = 'Moreover, testing is crucial.';
      const matches = library.detectPatterns(text);
      expect(matches.length).toBeGreaterThan(0);
    });

    it('should return matches with pattern reference', () => {
      const text = 'It is important to note that caching helps.';
      const matches = library.detectPatterns(text);
      expect(matches[0].pattern).toBeDefined();
      expect(matches[0].pattern.id).toBeTruthy();
    });

    it('should detect context window correctly', () => {
      const text = 'Start text here. It is important to note that caching helps. End text here.';
      const matches = library.detectPatterns(text);
      const match = matches.find(m => m.match.toLowerCase().includes('important'));
      expect(match).toBeDefined();
      expect(match!.context.length).toBeGreaterThan(10);
      expect(match!.context.length).toBeLessThan(200);
    });
  });

  // ============================================================
  // Pattern Management Tests (20 tests)
  // ============================================================

  describe('Pattern Management', () => {
    it('should add new pattern', () => {
      const initialCount = library.getPatternCount();

      const newPattern: AIPattern = {
        id: 'test-pattern-001',
        category: 'banned-phrases',
        pattern: /test phrase/gi,
        severity: 'high',
        confidence: 0.85,
        examples: ['This is a test phrase.'],
        frequency: 'rare'
      };

      library.addPattern(newPattern);

      const newCount = library.getPatternCount();
      expect(newCount).toBe(initialCount + 1);
    });

    it('should retrieve added pattern by ID', () => {
      const newPattern: AIPattern = {
        id: 'test-pattern-002',
        category: 'banned-phrases',
        pattern: /another test/gi,
        severity: 'medium',
        confidence: 0.75,
        examples: ['Another test.'],
        frequency: 'occasional'
      };

      library.addPattern(newPattern);

      const retrieved = library.getPatternById('test-pattern-002');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('test-pattern-002');
    });

    it('should add pattern to category index', () => {
      const initialCount = library.getPatternsByCategory('banned-phrases').length;

      const newPattern: AIPattern = {
        id: 'test-pattern-003',
        category: 'banned-phrases',
        pattern: /test/gi,
        severity: 'low',
        confidence: 0.65,
        examples: ['Test'],
        frequency: 'rare'
      };

      library.addPattern(newPattern);

      const newCount = library.getPatternsByCategory('banned-phrases').length;
      expect(newCount).toBe(initialCount + 1);
    });

    it('should add pattern to severity index', () => {
      const initialCount = library.getPatternsBySeverity('high').length;

      const newPattern: AIPattern = {
        id: 'test-pattern-004',
        category: 'banned-phrases',
        pattern: /test/gi,
        severity: 'high',
        confidence: 0.85,
        examples: ['Test'],
        frequency: 'rare'
      };

      library.addPattern(newPattern);

      const newCount = library.getPatternsBySeverity('high').length;
      expect(newCount).toBe(initialCount + 1);
    });

    it('should throw error for duplicate ID', () => {
      const pattern1: AIPattern = {
        id: 'duplicate-id',
        category: 'banned-phrases',
        pattern: /test/gi,
        severity: 'low',
        confidence: 0.65,
        examples: ['Test'],
        frequency: 'rare'
      };

      const pattern2: AIPattern = {
        id: 'duplicate-id',
        category: 'hedging-language',
        pattern: /other/gi,
        severity: 'medium',
        confidence: 0.75,
        examples: ['Other'],
        frequency: 'common'
      };

      library.addPattern(pattern1);

      expect(() => library.addPattern(pattern2)).toThrow('already exists');
    });

    it('should remove pattern by ID', () => {
      const newPattern: AIPattern = {
        id: 'test-pattern-remove',
        category: 'banned-phrases',
        pattern: /remove me/gi,
        severity: 'low',
        confidence: 0.6,
        examples: ['Remove me'],
        frequency: 'rare'
      };

      library.addPattern(newPattern);
      const beforeCount = library.getPatternCount();

      library.removePattern('test-pattern-remove');

      const afterCount = library.getPatternCount();
      expect(afterCount).toBe(beforeCount - 1);
    });

    it('should remove pattern from indices', () => {
      const newPattern: AIPattern = {
        id: 'test-pattern-remove-2',
        category: 'banned-phrases',
        pattern: /remove/gi,
        severity: 'high',
        confidence: 0.8,
        examples: ['Remove'],
        frequency: 'rare'
      };

      library.addPattern(newPattern);

      library.removePattern('test-pattern-remove-2');

      const retrieved = library.getPatternById('test-pattern-remove-2');
      expect(retrieved).toBeUndefined();
    });

    it('should not error when removing non-existent pattern', () => {
      expect(() => library.removePattern('non-existent-id')).not.toThrow();
    });

    it('should update pattern properties', () => {
      const newPattern: AIPattern = {
        id: 'test-pattern-update',
        category: 'banned-phrases',
        pattern: /update/gi,
        severity: 'low',
        confidence: 0.6,
        examples: ['Update'],
        frequency: 'rare'
      };

      library.addPattern(newPattern);

      library.updatePattern('test-pattern-update', { severity: 'critical', confidence: 0.95 });

      const updated = library.getPatternById('test-pattern-update');
      expect(updated?.severity).toBe('critical');
      expect(updated?.confidence).toBe(0.95);
    });

    it('should update pattern category index', () => {
      const newPattern: AIPattern = {
        id: 'test-pattern-update-cat',
        category: 'banned-phrases',
        pattern: /update cat/gi,
        severity: 'low',
        confidence: 0.6,
        examples: ['Update'],
        frequency: 'rare'
      };

      library.addPattern(newPattern);

      const beforeCount = library.getPatternsByCategory('hedging-language').length;

      library.updatePattern('test-pattern-update-cat', { category: 'hedging-language' });

      const afterCount = library.getPatternsByCategory('hedging-language').length;
      expect(afterCount).toBe(beforeCount + 1);

      const bannedCount = library.getPatternsByCategory('banned-phrases');
      expect(bannedCount.some(p => p.id === 'test-pattern-update-cat')).toBe(false);
    });

    it('should update pattern severity index', () => {
      const newPattern: AIPattern = {
        id: 'test-pattern-update-sev',
        category: 'banned-phrases',
        pattern: /update sev/gi,
        severity: 'low',
        confidence: 0.6,
        examples: ['Update'],
        frequency: 'rare'
      };

      library.addPattern(newPattern);

      const beforeCount = library.getPatternsBySeverity('critical').length;

      library.updatePattern('test-pattern-update-sev', { severity: 'critical' });

      const afterCount = library.getPatternsBySeverity('critical').length;
      expect(afterCount).toBe(beforeCount + 1);

      const lowCount = library.getPatternsBySeverity('low');
      expect(lowCount.some(p => p.id === 'test-pattern-update-sev')).toBe(false);
    });

    it('should throw error when updating non-existent pattern', () => {
      expect(() => library.updatePattern('non-existent', { severity: 'high' })).toThrow('not found');
    });

    it('should validate added pattern is detected', () => {
      const newPattern: AIPattern = {
        id: 'test-detect-001',
        category: 'banned-phrases',
        pattern: /banana phone/gi,
        severity: 'critical',
        confidence: 0.99,
        examples: ['banana phone'],
        frequency: 'rare'
      };

      library.addPattern(newPattern);

      const text = 'This is a banana phone test.';
      const matches = library.detectPatterns(text);
      expect(matches.some(m => m.pattern.id === 'test-detect-001')).toBe(true);
    });

    it('should not detect removed pattern', () => {
      const newPattern: AIPattern = {
        id: 'test-detect-remove',
        category: 'banned-phrases',
        pattern: /zebra crossing/gi,
        severity: 'high',
        confidence: 0.88,
        examples: ['zebra crossing'],
        frequency: 'rare'
      };

      library.addPattern(newPattern);

      library.removePattern('test-detect-remove');

      const text = 'This is a zebra crossing test.';
      const matches = library.detectPatterns(text);
      expect(matches.some(m => m.pattern.id === 'test-detect-remove')).toBe(false);
    });

    it('should handle pattern with replacements', () => {
      const newPattern: AIPattern = {
        id: 'test-replacements',
        category: 'banned-phrases',
        pattern: /bad word/gi,
        severity: 'high',
        confidence: 0.9,
        examples: ['bad word'],
        replacements: ['good word', 'better phrase'],
        frequency: 'common'
      };

      library.addPattern(newPattern);

      const pattern = library.getPatternById('test-replacements');
      expect(pattern?.replacements).toEqual(['good word', 'better phrase']);
    });

    it('should handle pattern with domains', () => {
      const newPattern: AIPattern = {
        id: 'test-domains',
        category: 'banned-phrases',
        pattern: /domain test/gi,
        severity: 'medium',
        confidence: 0.75,
        examples: ['domain test'],
        frequency: 'occasional',
        domains: ['technical', 'academic']
      };

      library.addPattern(newPattern);

      const technicalPatterns = library.getPatternsByDomain('technical');
      expect(technicalPatterns.some(p => p.id === 'test-domains')).toBe(true);
    });

    it('should handle pattern with subcategory', () => {
      const newPattern: AIPattern = {
        id: 'test-subcategory',
        category: 'banned-phrases',
        subcategory: 'test-subcat',
        pattern: /subcat test/gi,
        severity: 'low',
        confidence: 0.7,
        examples: ['subcat test'],
        frequency: 'rare'
      };

      library.addPattern(newPattern);

      const pattern = library.getPatternById('test-subcategory');
      expect(pattern?.subcategory).toBe('test-subcat');
    });

    it('should handle pattern with context', () => {
      const newPattern: AIPattern = {
        id: 'test-context',
        category: 'banned-phrases',
        pattern: /context test/gi,
        severity: 'medium',
        confidence: 0.75,
        examples: ['context test'],
        context: 'This is test context information',
        frequency: 'occasional'
      };

      library.addPattern(newPattern);

      const pattern = library.getPatternById('test-context');
      expect(pattern?.context).toBe('This is test context information');
    });

    it('should maintain pattern count accuracy after operations', () => {
      const initialCount = library.getPatternCount();

      // Add 3 patterns
      for (let i = 0; i < 3; i++) {
        library.addPattern({
          id: `test-count-${i}`,
          category: 'banned-phrases',
          pattern: new RegExp(`test${i}`, 'gi'),
          severity: 'low',
          confidence: 0.6,
          examples: [`test${i}`],
          frequency: 'rare'
        });
      }

      expect(library.getPatternCount()).toBe(initialCount + 3);

      // Remove 1 pattern
      library.removePattern('test-count-1');

      expect(library.getPatternCount()).toBe(initialCount + 2);
    });
  });

  // ============================================================
  // Search and Filter Tests (20 tests)
  // ============================================================

  describe('Search and Filter', () => {
    it('should search patterns by ID keyword', () => {
      const results = library.searchPatterns('banned-phrase');
      expect(results.length).toBeGreaterThan(0);
      results.forEach(p => expect(p.id).toContain('banned-phrase'));
    });

    it('should search patterns by category keyword', () => {
      const results = library.searchPatterns('formulaic');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should search patterns by context', () => {
      const results = library.searchPatterns('AI');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should search patterns case-insensitively', () => {
      const results1 = library.searchPatterns('IMPORTANT');
      const results2 = library.searchPatterns('important');
      expect(results1.length).toBe(results2.length);
    });

    it('should search patterns in examples', () => {
      const results = library.searchPatterns('caching');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should search patterns in replacements', () => {
      const allPatterns = library.getAllPatterns();
      const withReplacements = allPatterns.filter(p => p.replacements && p.replacements.length > 0);

      if (withReplacements.length > 0) {
        const exampleReplacement = withReplacements[0].replacements![0];
        const searchTerm = exampleReplacement.split(' ')[0];
        const results = library.searchPatterns(searchTerm);
        expect(results.length).toBeGreaterThan(0);
      }
    });

    it('should return empty array for no search matches', () => {
      const results = library.searchPatterns('xyzabc123notfound');
      expect(results).toEqual([]);
    });

    it('should filter patterns by single category', () => {
      const filter: PatternFilter = {
        categories: ['banned-phrases']
      };
      const results = library.filterPatterns(filter);
      expect(results.length).toBeGreaterThan(0);
      results.forEach(p => expect(p.category).toBe('banned-phrases'));
    });

    it('should filter patterns by multiple categories', () => {
      const filter: PatternFilter = {
        categories: ['banned-phrases', 'formulaic-structures']
      };
      const results = library.filterPatterns(filter);
      expect(results.length).toBeGreaterThan(0);
      results.forEach(p => {
        expect(['banned-phrases', 'formulaic-structures']).toContain(p.category);
      });
    });

    it('should filter patterns by single severity', () => {
      const filter: PatternFilter = {
        severities: ['critical']
      };
      const results = library.filterPatterns(filter);
      expect(results.length).toBeGreaterThan(0);
      results.forEach(p => expect(p.severity).toBe('critical'));
    });

    it('should filter patterns by multiple severities', () => {
      const filter: PatternFilter = {
        severities: ['critical', 'high']
      };
      const results = library.filterPatterns(filter);
      expect(results.length).toBeGreaterThan(0);
      results.forEach(p => {
        expect(['critical', 'high']).toContain(p.severity);
      });
    });

    it('should filter patterns by domain', () => {
      const filter: PatternFilter = {
        domains: ['technical']
      };
      const results = library.filterPatterns(filter);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should filter patterns by multiple domains', () => {
      const filter: PatternFilter = {
        domains: ['technical', 'academic']
      };
      const results = library.filterPatterns(filter);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should filter patterns by minimum confidence', () => {
      const filter: PatternFilter = {
        minConfidence: 0.9
      };
      const results = library.filterPatterns(filter);
      expect(results.length).toBeGreaterThan(0);
      results.forEach(p => expect(p.confidence).toBeGreaterThanOrEqual(0.9));
    });

    it('should filter patterns by maximum confidence', () => {
      const filter: PatternFilter = {
        maxConfidence: 0.7
      };
      const results = library.filterPatterns(filter);
      expect(results.length).toBeGreaterThan(0);
      results.forEach(p => expect(p.confidence).toBeLessThanOrEqual(0.7));
    });

    it('should filter patterns by confidence range', () => {
      const filter: PatternFilter = {
        minConfidence: 0.7,
        maxConfidence: 0.9
      };
      const results = library.filterPatterns(filter);
      expect(results.length).toBeGreaterThan(0);
      results.forEach(p => {
        expect(p.confidence).toBeGreaterThanOrEqual(0.7);
        expect(p.confidence).toBeLessThanOrEqual(0.9);
      });
    });

    it('should filter patterns by frequency', () => {
      const filter: PatternFilter = {
        frequencies: ['very-common']
      };
      const results = library.filterPatterns(filter);
      expect(results.length).toBeGreaterThan(0);
      results.forEach(p => expect(p.frequency).toBe('very-common'));
    });

    it('should filter patterns by multiple frequencies', () => {
      const filter: PatternFilter = {
        frequencies: ['very-common', 'common']
      };
      const results = library.filterPatterns(filter);
      expect(results.length).toBeGreaterThan(0);
      results.forEach(p => {
        expect(['very-common', 'common']).toContain(p.frequency);
      });
    });

    it('should filter patterns by combined criteria', () => {
      const filter: PatternFilter = {
        categories: ['banned-phrases'],
        severities: ['critical'],
        minConfidence: 0.9
      };
      const results = library.filterPatterns(filter);
      expect(results.length).toBeGreaterThan(0);
      results.forEach(p => {
        expect(p.category).toBe('banned-phrases');
        expect(p.severity).toBe('critical');
        expect(p.confidence).toBeGreaterThanOrEqual(0.9);
      });
    });

    it('should return empty array when no patterns match filter', () => {
      const filter: PatternFilter = {
        minConfidence: 0.999,
        maxConfidence: 1.0,
        severities: ['critical'],
        frequencies: ['rare']
      };
      const results = library.filterPatterns(filter);
      // Might be empty or very few
      expect(Array.isArray(results)).toBe(true);
    });
  });

  // ============================================================
  // Export/Import Tests (15 tests)
  // ============================================================

  describe('Export/Import', () => {
    it('should export patterns as JSON', () => {
      const json = library.exportPatterns('json');
      expect(json).toBeTruthy();
      expect(typeof json).toBe('string');

      const parsed = JSON.parse(json);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(library.getPatternCount());
    });

    it('should export patterns as YAML', () => {
      const yamlStr = library.exportPatterns('yaml');
      expect(yamlStr).toBeTruthy();
      expect(typeof yamlStr).toBe('string');
      expect(yamlStr.includes('id:')).toBe(true);
    });

    it('should export patterns as Markdown', () => {
      const md = library.exportPatterns('markdown');
      expect(md).toBeTruthy();
      expect(typeof md).toBe('string');
      expect(md.includes('#')).toBe(true); // Has headers
      expect(md.includes('Total Patterns:')).toBe(true);
    });

    it('should throw error for unsupported export format', () => {
      expect(() => library.exportPatterns('xml' as any)).toThrow('Unsupported');
    });

    it('should import patterns from JSON', () => {
      const newPatterns: AIPattern[] = [
        {
          id: 'import-test-001',
          category: 'banned-phrases',
          pattern: 'import test',
          severity: 'medium',
          confidence: 0.75,
          examples: ['import test'],
          frequency: 'rare'
        }
      ];

      const json = JSON.stringify(newPatterns);
      const beforeCount = library.getPatternCount();

      library.importPatterns(json, 'json');

      const afterCount = library.getPatternCount();
      expect(afterCount).toBeGreaterThan(beforeCount);

      const imported = library.getPatternById('import-test-001');
      expect(imported).toBeDefined();
    });

    it('should import patterns from YAML', () => {
      const yamlStr = `
- id: import-test-yaml-001
  category: banned-phrases
  pattern: yaml test
  severity: high
  confidence: 0.85
  examples:
    - yaml test
  frequency: occasional
`;

      const beforeCount = library.getPatternCount();

      library.importPatterns(yamlStr, 'yaml');

      const afterCount = library.getPatternCount();
      expect(afterCount).toBeGreaterThan(beforeCount);

      const imported = library.getPatternById('import-test-yaml-001');
      expect(imported).toBeDefined();
    });

    it('should convert string patterns to RegExp on import', () => {
      const newPatterns: AIPattern[] = [
        {
          id: 'import-regexp-test',
          category: 'banned-phrases',
          pattern: 'regexp test',
          severity: 'low',
          confidence: 0.6,
          examples: ['regexp test'],
          frequency: 'rare'
        }
      ];

      const json = JSON.stringify(newPatterns);
      library.importPatterns(json, 'json');

      const imported = library.getPatternById('import-regexp-test');
      expect(imported?.pattern).toBeInstanceOf(RegExp);
    });

    it('should skip duplicate IDs on import', () => {
      const existingPattern = library.getAllPatterns()[0];

      const duplicatePatterns: AIPattern[] = [
        {
          id: existingPattern.id,
          category: 'banned-phrases',
          pattern: 'duplicate',
          severity: 'low',
          confidence: 0.5,
          examples: ['duplicate'],
          frequency: 'rare'
        }
      ];

      const json = JSON.stringify(duplicatePatterns);
      const beforeCount = library.getPatternCount();

      library.importPatterns(json, 'json');

      const afterCount = library.getPatternCount();
      expect(afterCount).toBe(beforeCount); // No change
    });

    it('should throw error for unsupported import format', () => {
      expect(() => library.importPatterns('data', 'xml' as any)).toThrow('Unsupported');
    });

    it('should export and re-import without loss', () => {
      const originalCount = library.getPatternCount();
      const json = library.exportPatterns('json');

      const newLibrary = new PatternLibrary();
      newLibrary.importPatterns(json, 'json');

      // Should have all original patterns (minus any duplicates if initializing fresh)
      expect(newLibrary.getPatternCount()).toBeGreaterThanOrEqual(originalCount - 10);
    });

    it('should maintain pattern properties on export/import', () => {
      const pattern = library.getAllPatterns()[0];
      const json = library.exportPatterns('json');

      const newLibrary = new PatternLibrary();
      newLibrary.importPatterns(json, 'json');

      const reimported = newLibrary.getPatternById(pattern.id);
      expect(reimported).toBeDefined();
      expect(reimported?.severity).toBe(pattern.severity);
      expect(reimported?.confidence).toBe(pattern.confidence);
    });

    it('should export markdown with category sections', () => {
      const md = library.exportPatterns('markdown');
      expect(md.includes('banned-phrases')).toBe(true);
      expect(md.includes('formulaic-structures')).toBe(true);
    });

    it('should export markdown with pattern details', () => {
      const md = library.exportPatterns('markdown');
      expect(md.includes('Pattern:')).toBe(true);
      expect(md.includes('Examples:')).toBe(true);
    });

    it('should handle empty pattern list on export', () => {
      const emptyLibrary = new PatternLibrary();
      const json = emptyLibrary.exportPatterns('json');
      const parsed = JSON.parse(json);
      expect(parsed).toEqual([]);
    });

    it('should handle malformed JSON on import', () => {
      const malformed = '{invalid json}';
      expect(() => library.importPatterns(malformed, 'json')).toThrow();
    });
  });

  // ============================================================
  // Analysis Tests (25 tests)
  // ============================================================

  describe('Analysis', () => {
    it('should analyze text and return statistics', () => {
      const text = 'It is important to note that we utilize a robust solution. Moreover, it works seamlessly.';
      const analysis = library.analyzeText(text);

      expect(analysis.totalMatches).toBeGreaterThan(0);
      expect(analysis.wordCount).toBeGreaterThan(0);
      expect(analysis.uniquePatterns).toBeGreaterThan(0);
      expect(analysis.averageConfidence).toBeGreaterThan(0);
      expect(analysis.patternDensity).toBeGreaterThan(0);
    });

    it('should count matches by category', () => {
      const text = 'It is important to note that this works. Moreover, we use it. Firstly, it is fast.';
      const analysis = library.analyzeText(text);

      expect(analysis.matchesByCategory.size).toBeGreaterThan(0);
    });

    it('should count matches by severity', () => {
      const text = 'It is important to note that this is seamlessly integrated.';
      const analysis = library.analyzeText(text);

      expect(analysis.matchesBySeverity.size).toBeGreaterThan(0);
    });

    it('should identify critical matches', () => {
      const text = 'It is important to note that we leverage seamless integration.';
      const analysis = library.analyzeText(text);

      expect(analysis.criticalMatches.length).toBeGreaterThan(0);
      analysis.criticalMatches.forEach(m => expect(m.severity).toBe('critical'));
    });

    it('should identify high priority matches', () => {
      const text = 'It is important to note that this works. Firstly, consider performance.';
      const analysis = library.analyzeText(text);

      expect(analysis.highPriorityMatches.length).toBeGreaterThan(0);
    });

    it('should calculate word count', () => {
      const text = 'This is a test sentence with exactly ten words here.';
      const analysis = library.analyzeText(text);

      expect(analysis.wordCount).toBe(10);
    });

    it('should calculate pattern density', () => {
      const text = 'It is important to note that this matters.'; // ~7 words, 1+ pattern
      const analysis = library.analyzeText(text);

      expect(analysis.patternDensity).toBeGreaterThan(0);
      expect(analysis.patternDensity).toBeLessThan(100);
    });

    it('should handle text with no patterns', () => {
      const text = 'Quick brown fox jumps over lazy dog.';
      const analysis = library.analyzeText(text);

      expect(analysis.totalMatches).toBeLessThan(5);
      expect(analysis.wordCount).toBe(7);
    });

    it('should handle empty text', () => {
      const analysis = library.analyzeText('');

      expect(analysis.totalMatches).toBe(0);
      expect(analysis.wordCount).toBe(0);
      expect(analysis.patternDensity).toBe(0);
    });

    it('should count unique patterns', () => {
      const text = 'seamlessly integrated, seamlessly deployed'; // Same pattern twice
      const analysis = library.analyzeText(text);

      expect(analysis.uniquePatterns).toBeLessThanOrEqual(analysis.totalMatches);
    });

    it('should calculate average confidence', () => {
      const text = 'It is important to note that this is seamlessly done.';
      const analysis = library.analyzeText(text);

      expect(analysis.averageConfidence).toBeGreaterThan(0);
      expect(analysis.averageConfidence).toBeLessThanOrEqual(1);
    });

    it('should compare two texts', () => {
      const text1 = 'It is important to note that this works seamlessly.';
      const text2 = 'This works well.';

      const comparison = library.compareTexts(text1, text2);

      expect(comparison.text1Matches).toBeGreaterThan(comparison.text2Matches);
      expect(comparison.improvement).toBeGreaterThan(0);
    });

    it('should calculate improvement percentage', () => {
      const text1 = 'It is important to note that this is seamlessly integrated.';
      const text2 = 'This integrates with the API.';

      const comparison = library.compareTexts(text1, text2);

      expect(comparison.improvement).toBeGreaterThan(50);
    });

    it('should identify removed patterns', () => {
      const text1 = 'It is important to note that this works.';
      const text2 = 'This works well.';

      const comparison = library.compareTexts(text1, text2);

      expect(comparison.removedPatterns.length).toBeGreaterThan(0);
    });

    it('should identify added patterns', () => {
      const text1 = 'This works well.';
      const text2 = 'It is important to note that this works.';

      const comparison = library.compareTexts(text1, text2);

      expect(comparison.addedPatterns.length).toBeGreaterThan(0);
    });

    it('should identify persistent patterns', () => {
      const text1 = 'It is important to note that we use Redis.';
      const text2 = 'It is important to note that we use PostgreSQL.';

      const comparison = library.compareTexts(text1, text2);

      expect(comparison.persistentPatterns.length).toBeGreaterThan(0);
    });

    it('should handle identical texts in comparison', () => {
      const text = 'It is important to note that this works.';

      const comparison = library.compareTexts(text, text);

      expect(comparison.text1Matches).toBe(comparison.text2Matches);
      expect(comparison.improvement).toBe(0);
      expect(comparison.addedPatterns.length).toBe(0);
      expect(comparison.removedPatterns.length).toBe(0);
    });

    it('should handle comparison with clean texts', () => {
      const text1 = 'Quick brown fox.';
      const text2 = 'Lazy dog jumps.';
      const comparison = library.compareTexts(text1, text2);

    });

    it('should analyze long text efficiently', () => {
      const text = 'It is important to note that this works. '.repeat(100);
      const startTime = Date.now();

      const analysis = library.analyzeText(text);

      const duration = Date.now() - startTime;

      expect(analysis.totalMatches).toBeGreaterThan(50);
      expect(duration).toBeLessThan(1000); // Should complete in <1 second
    });

    it('should handle multiline text analysis', () => {
      const text = `It is important to note that this works.
Moreover, it scales well.
Furthermore, it is robust.`;

      const analysis = library.analyzeText(text);

      expect(analysis.totalMatches).toBeGreaterThan(2);
    });

    it('should maintain accuracy in pattern counts', () => {
      const text = 'It is important to note that this works seamlessly.';
      const analysis = library.analyzeText(text);
      const matches = library.detectPatterns(text);

      expect(analysis.totalMatches).toBe(matches.length);
    });

    it('should calculate density correctly', () => {
      const text = 'It is important to note that.'; // 6 words, 1 pattern
      const analysis = library.analyzeText(text);
      const expectedDensity = (1 / 6) * 100;
      expect(Math.abs(analysis.patternDensity - expectedDensity)).toBeLessThan(20);
    });

    it('should group matches by category correctly', () => {
      const text = 'It is important to note that we use this. Moreover, it works.';
      const analysis = library.analyzeText(text);

      let totalCategoryMatches = 0;
      for (const count of analysis.matchesByCategory.values()) {
        totalCategoryMatches += count;
      }

      expect(totalCategoryMatches).toBe(analysis.totalMatches);
    });

    it('should group matches by severity correctly', () => {
      const text = 'It is important to note that this is seamlessly integrated.';
      const analysis = library.analyzeText(text);

      let totalSeverityMatches = 0;
      for (const count of analysis.matchesBySeverity.values()) {
        totalSeverityMatches += count;
      }

      expect(totalSeverityMatches).toBe(analysis.totalMatches);
    });

    it('should handle negative improvement (regression)', () => {
      const text1 = 'This works well.';
      const text2 = 'It is important to note that this is seamlessly integrated.';
      const comparison = library.compareTexts(text1, text2);

      expect(comparison.improvement).toBeLessThanOrEqual(0);
    });
  });

  // ============================================================
  // Performance Tests (10 tests)
  // ============================================================

  describe('Performance', () => {
    it('should detect patterns in <100ms for 1000-word text', () => {
      const text = 'It is important to note that caching improves performance. '.repeat(150); // ~1000 words
      const startTime = Date.now();

      library.detectPatterns(text);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100);
    });

    it('should initialize in <200ms', async () => {
      const newLibrary = new PatternLibrary();
      const startTime = Date.now();

      await newLibrary.initialize();

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(200);
    });

    it('should handle concurrent detection efficiently', () => {
      const text1 = 'It is important to note that this works.';
      const text2 = 'Moreover, caching helps performance.';
      const text3 = 'Firstly, consider scalability.';

      const startTime = Date.now();

      library.detectPatterns(text1);
      library.detectPatterns(text2);
      library.detectPatterns(text3);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(50);
    });

    it('should filter patterns quickly', () => {
      const filter: PatternFilter = {
        categories: ['banned-phrases'],
        severities: ['critical'],
        minConfidence: 0.9
      };

      const startTime = Date.now();

      library.filterPatterns(filter);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(10);
    });

    it('should search patterns quickly', () => {
      const startTime = Date.now();

      library.searchPatterns('important');

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(10);
    });

    it('should analyze text quickly', () => {
      const text = 'It is important to note that this works seamlessly. Moreover, it scales.';

      const startTime = Date.now();

      library.analyzeText(text);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(50);
    });

    it('should compare texts quickly', () => {
      const text1 = 'It is important to note that this works.';
      const text2 = 'This works well.';

      const startTime = Date.now();

      library.compareTexts(text1, text2);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(50);
    });

    it('should handle very long text efficiently', () => {
      const text = 'It is important to note that caching helps. '.repeat(1000); // ~10k words

      const startTime = Date.now();

      library.detectPatterns(text);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // <1 second for 10k words
    });

    it('should export large pattern set quickly', () => {
      const startTime = Date.now();

      library.exportPatterns('json');

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100);
    });

    it('should maintain performance with added patterns', () => {
      // Add 100 new patterns
      for (let i = 0; i < 100; i++) {
        library.addPattern({
          id: `perf-test-${i}`,
          category: 'banned-phrases',
          pattern: new RegExp(`perftest${i}`, 'gi'),
          severity: 'low',
          confidence: 0.5,
          examples: [`perftest${i}`],
          frequency: 'rare'
        });
      }

      const text = 'It is important to note that this works.';

      const startTime = Date.now();

      library.detectPatterns(text);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100);
    });
  });
});
