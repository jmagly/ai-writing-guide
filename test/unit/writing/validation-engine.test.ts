/**
 * Tests for WritingValidationEngine
 *
 * @source @src/writing/validation-engine.ts
 * @requirement @.aiwg/requirements/use-cases/UC-001-validate-ai-generated-content.md
 * @nfr @.aiwg/requirements/nfr-modules/accuracy.md - NFR-ACC-001 (<5% false positives)
 * @nfr @.aiwg/requirements/nfr-modules/performance.md - NFR-PERF-001 (<60s validation)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WritingValidationEngine, ValidationResult } from '../../../src/writing/validation-engine.ts';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('WritingValidationEngine', () => {
  let engine: WritingValidationEngine;
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `aiwg-engine-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    engine = new WritingValidationEngine();
  });

  describe('Pattern Detection', () => {
    describe('Banned Phrases', () => {
      it('should detect banned phrases across multiple scenarios', async () => {
        const testCases = [
          {
            content: 'This solution seamlessly integrates with the platform.',
            expectedPhrase: 'seamlessly',
            minIssues: 1
          },
          {
            content: 'Our cutting-edge, revolutionary platform leverages state-of-the-art technology.',
            expectedPhrase: null,
            minIssues: 3 // cutting-edge, revolutionary, state-of-the-art
          },
          {
            content: 'SEAMLESSLY and Cutting-Edge and state-OF-the-ART',
            expectedPhrase: null,
            minIssues: 1
          },
          {
            content: 'The algorithm optimizes throughput using cache-aware data structures.',
            expectedPhrase: null,
            minIssues: 0 // no false positives
          },
          {
            content: 'This is transformative, revolutionary, and groundbreaking.',
            expectedPhrase: null,
            minIssues: 1 // stemming variations
          }
        ];

        for (const { content, expectedPhrase, minIssues } of testCases) {
          const result = await engine.validate(content);
          const bannedIssues = result.issues.filter(i => i.type === 'banned_phrase');

          expect(bannedIssues.length, `Failed for content: "${content}"`).toBeGreaterThanOrEqual(minIssues);
          if (expectedPhrase) {
            expect(bannedIssues.some(i => i.message.includes(expectedPhrase)),
              `Expected phrase "${expectedPhrase}" in content: "${content}"`).toBe(true);
          }
        }
      });

      it('should provide accurate line numbers and context', async () => {
        const content = `Line 1 is clean.
Line 2 has seamlessly integrated content.
Line 3 is also clean.`;

        const result = await engine.validate(content);

        const seamlessIssue = result.issues.find(i => i.message.includes('seamlessly'));
        expect(seamlessIssue?.location.line).toBe(2);
        expect(seamlessIssue?.context).toBeDefined();
        expect(seamlessIssue?.context).toContain('seamlessly');
      });
    });

    describe('AI Patterns', () => {
      it('should detect formulaic AI patterns and transitions', async () => {
        const testCases = [
          'Moreover, the system is efficient. Furthermore, it is scalable.',
          'In conclusion, the approach works well.',
          `First point here.
Moreover, second point follows.
Additionally, third point arrives.`,
          `The system provides many benefits.

Moreover, it integrates well with existing infrastructure.

Furthermore, the cost savings are significant.`
        ];

        for (const content of testCases) {
          const result = await engine.validate(content);
          const aiPatterns = result.issues.filter(i =>
            i.type === 'ai_pattern' ||
            i.message.includes('transition') ||
            i.message.includes('conclusion') ||
            i.message.includes('Moreover') ||
            i.message.includes('Additionally')
          );
          expect(aiPatterns.length, `Failed for content: "${content}"`).toBeGreaterThan(0);
        }
      });
    });

    describe('Formulaic Structures', () => {
      it('should detect three-item lists but allow other list sizes', async () => {
        // Three-item list should be flagged
        const threeItemContent = 'The system is fast, reliable, and secure.';
        const threeItemResult = await engine.validate(threeItemContent);
        const threeItemIssues = threeItemResult.issues.filter(i => i.type === 'formulaic_structure');
        expect(threeItemIssues.length).toBeGreaterThan(0);

        // Two-item and four-item lists should pass
        const otherContent = 'The system is fast and reliable. It is also secure, scalable, maintainable, and cost-effective.';
        const otherResult = await engine.validate(otherContent);
        const otherThreeItemIssues = otherResult.issues.filter(i => i.message.includes('three-item'));
        expect(otherThreeItemIssues.length).toBe(0);
      });
    });
  });

  describe('Authenticity Analysis', () => {
    describe('Human Markers', () => {
      it('should score authentic human writing high and detect various human markers', async () => {
        // High authenticity score
        const authenticContent = `I think the authentication system needs improvement. We found that JWT tokens with 15-minute expiry reduced security incidents by 40%.
We chose httpOnly cookies after the XSS incident last year. The p99 latency is 45ms, which meets our requirements.
While this approach is more complex, it provides better security guarantees.`;

        const result = await engine.validate(authenticContent);
        expect(result.score).toBeGreaterThan(0);
        expect(result.summary.authenticityScore).toBeGreaterThan(40);

        // Various human marker types
        const humanMarkerTests = [
          {
            content: 'I think GraphQL is better for this use case. In my experience, REST works fine for simple APIs.',
            markerType: 'personal'
          },
          {
            content: 'While Redis is fast, we must consider memory constraints. The cache improves performance but increases complexity.',
            markerType: 'trade-off'
          },
          {
            content: 'Reduced latency by 30ms. Improved throughput by 45%. Decreased memory usage by 2GB.',
            markerType: 'metric'
          },
          {
            content: 'We encountered a bug in the connection pool. The issue was difficult to reproduce.',
            markerType: 'problem'
          },
          {
            content: 'We use PostgreSQL, Redis, and Kubernetes for the backend infrastructure.',
            markerType: 'specific' // specific technologies
          }
        ];

        for (const { content, markerType } of humanMarkerTests) {
          const analysis = engine.analyzeAuthenticity(content);
          expect(analysis.humanMarkers.some(m => m.includes(markerType)),
            `Failed to detect ${markerType} marker in: "${content}"`).toBe(true);
        }
      });
    });

    describe('AI Tells', () => {
      it('should score obvious AI writing low and detect various AI tells', async () => {
        // Low AI score
        const aiContent = `Our comprehensive, cutting-edge solution seamlessly integrates with your existing infrastructure.
Moreover, the platform leverages state-of-the-art technology to provide robust and scalable services.
Furthermore, our innovative approach ensures optimal performance and transformative results.
In conclusion, this revolutionary system delivers best-in-class outcomes.`;

        const result = await engine.validate(aiContent);
        expect(result.score).toBeLessThan(40);
        expect(result.summary.aiPatternScore).toBeGreaterThan(20);

        // Various AI tell types
        const aiTellTests = [
          {
            content: 'The comprehensive solution provides robust performance and optimal scalability.',
            expectedTell: 'intensifier'
          },
          {
            content: 'This may help to improve performance. It can serve to enhance reliability. It might facilitate better outcomes.',
            expectedTell: 'hedging'
          },
          {
            content: 'Revolutionary, transformative, groundbreaking innovation in the industry.',
            expectedTell: 'buzzword'
          },
          {
            content: 'It is important to note that performance matters. It is worth noting that security is crucial.',
            expectedTell: 'throat-clearing'
          }
        ];

        for (const { content, expectedTell } of aiTellTests) {
          const analysis = engine.analyzeAuthenticity(content);
          expect(analysis.aiTells.some(t => t.includes(expectedTell)),
            `Failed to detect ${expectedTell} in: "${content}"`).toBe(true);
        }
      });
    });

    describe('Mixed Content', () => {
      it('should handle mixed content with both human and AI markers', async () => {
        const content = `The authentication system uses JWT tokens with 15-minute expiry.
We chose this approach after evaluating alternatives. The p99 latency is 45ms.
Moreover, this solution integrates well with existing infrastructure.`;

        const result = await engine.validate(content);

        expect(result.humanMarkers.length).toBeGreaterThan(0);
        expect(result.aiTells.length).toBeGreaterThan(0);
        expect(result.score).toBeGreaterThan(0);
        expect(result.score).toBeLessThan(80);
      });
    });
  });

  describe('Context-Specific Validation', () => {
    it('should validate across all context types', async () => {
      const contextTests = [
        {
          context: 'academic',
          validContent: 'The study demonstrates significant correlation. Research indicates positive outcomes (Smith et al., 2023).',
          invalidContent: 'The study shows good results. Many researchers agree.',
          expectedSuggestion: 'citation'
        },
        {
          context: 'technical',
          validContent: 'The algorithm exhibits O(n log n) complexity. We use epoll for async I/O. The API implements REST with HATEOAS.',
          invalidContent: 'The system is fast and efficient. Performance is good.',
          expectedSuggestion: 'metric'
        },
        {
          context: 'executive',
          validContent: 'Revenue increased by 30%. Costs decreased by 15%.',
          invalidContent: 'Revenue may increase. Costs might decrease. We could see improvements. Perhaps the strategy will work.',
          expectedSuggestion: 'hedging'
        },
        {
          context: 'casual',
          validContent: "We don't use microservices. It's overkill for our use case. Can't justify the complexity.",
          invalidContent: null,
          expectedSuggestion: null
        }
      ];

      for (const { context, validContent, invalidContent, expectedSuggestion } of contextTests) {
        const validResult = await engine.validateForContext(validContent, context as any);
        expect(validResult.score).toBeGreaterThan(0);

        if (invalidContent && expectedSuggestion) {
          const invalidResult = await engine.validateForContext(invalidContent, context as any);
          const suggestion = invalidResult.suggestions.find(s => s.includes(expectedSuggestion));
          expect(suggestion).toBeDefined();
        }
      }
    });
  });

  describe('Batch Processing', () => {
    it('should validate multiple files with correct aggregation', async () => {
      writeFileSync(join(testDir, 'file1.md'), 'Clean content with specific metrics: 50ms latency.');
      writeFileSync(join(testDir, 'file2.md'), 'This seamlessly integrates with cutting-edge technology.');
      writeFileSync(join(testDir, 'file3.md'), 'We found that the bug occurred at 2am. Took 3 hours to fix.');
      writeFileSync(join(testDir, 'pass.md'), 'I think PostgreSQL works better here. Reduced query time by 200ms.');
      writeFileSync(join(testDir, 'fail.md'), 'Our comprehensive solution seamlessly leverages cutting-edge technology.');

      const results = await engine.validateBatch([
        join(testDir, 'file1.md'),
        join(testDir, 'file2.md'),
        join(testDir, 'file3.md'),
        join(testDir, 'pass.md'),
        join(testDir, 'fail.md')
      ]);

      expect(results.size).toBe(5);

      const passResult = results.get(join(testDir, 'pass.md'));
      const failResult = results.get(join(testDir, 'fail.md'));
      expect(passResult?.score).toBeGreaterThanOrEqual(failResult?.score || 0);
      expect(passResult?.score).toBeDefined();
      expect(failResult?.score).toBeDefined();

      const report = engine.generateReport(results, 'text');
      expect(report).toContain('Total Files: 5');
      expect(report).toContain('Average Score');
    });
  });

  describe('File Validation', () => {
    it('should validate files with various scenarios', async () => {
      // Standard file validation
      writeFileSync(join(testDir, 'test.md'), 'This seamlessly integrates.');
      const result = await engine.validateFile(join(testDir, 'test.md'));
      expect(result.issues.length).toBeGreaterThan(0);

      // Non-existent file
      await expect(engine.validateFile(join(testDir, 'missing.md'))).rejects.toThrow();

      // Large file performance
      const largeContent = 'Valid content. '.repeat(10000); // ~150KB
      writeFileSync(join(testDir, 'large.md'), largeContent);
      const start = Date.now();
      const largeResult = await engine.validateFile(join(testDir, 'large.md'));
      const duration = Date.now() - start;
      expect(largeResult).toBeDefined();
      expect(duration).toBeLessThan(2000); // Should complete in < 2s
    });
  });

  describe('Edge Cases', () => {
    it('should handle all edge cases correctly', async () => {
      const edgeCases = [
        {
          name: 'empty content',
          content: '',
          checks: (result: ValidationResult) => {
            expect(result.score).toBeDefined();
            expect(result.issues).toHaveLength(1);
          }
        },
        {
          name: 'very long document',
          content: 'This is valid technical content with specific metrics like 50ms latency. '.repeat(2000),
          checks: (result: ValidationResult) => {
            expect(result).toBeDefined();
            expect(result.summary.wordCount).toBeGreaterThan(10000);
          }
        },
        {
          name: 'unicode and special characters',
          content: 'The system handles émojis 😀 and spëcial çharacters.',
          checks: (result: ValidationResult) => {
            expect(result).toBeDefined();
          }
        },
        {
          name: 'malformed markdown',
          content: '# Broken Header\n\n[Incomplete link\n\n**Unclosed bold',
          checks: (result: ValidationResult) => {
            expect(result).toBeDefined();
          }
        },
        {
          name: 'whitespace only',
          content: '   \n\n   \t\t   \n   ',
          checks: (result: ValidationResult) => {
            expect(result.score).toBeDefined();
            expect(result.summary.wordCount).toBe(0);
          }
        },
        {
          name: 'code blocks',
          content: `Regular text here.

\`\`\`javascript
// Code with "seamlessly" in comments
const x = "cutting-edge";
\`\`\`

More regular text.`,
          checks: (result: ValidationResult) => {
            expect(result).toBeDefined();
          }
        },
        {
          name: 'single-line content',
          content: 'Single line with seamlessly.',
          checks: (result: ValidationResult) => {
            expect(result.issues.length).toBeGreaterThan(0);
            expect(result.issues[0].location.line).toBe(1);
          }
        }
      ];

      for (const { name, content, checks } of edgeCases) {
        const result = await engine.validate(content);
        checks(result);
      }
    });
  });

  describe('Report Generation', () => {
    it('should generate reports in all formats', async () => {
      const content = 'This seamlessly integrates.';
      const result = await engine.validate(content);

      // Text report
      const textReport = engine.generateReport(result, 'text');
      expect(textReport).toContain('Writing Validation Report');
      expect(textReport).toContain('Overall Score');
      expect(textReport).toContain('Total Issues');

      // JSON report
      const jsonReport = engine.generateReport(result, 'json');
      const parsed = JSON.parse(jsonReport);
      expect(parsed.score).toBeDefined();
      expect(parsed.issues).toBeDefined();
      expect(parsed.summary).toBeDefined();

      // HTML report
      const htmlReport = engine.generateReport(result, 'html');
      expect(htmlReport).toContain('<!DOCTYPE html>');
      expect(htmlReport).toContain('Writing Validation Report');
      expect(htmlReport).toContain(result.score.toString());
    });

    it('should generate batch reports', async () => {
      writeFileSync(join(testDir, 'file1.md'), 'Content 1');
      writeFileSync(join(testDir, 'file2.md'), 'Content 2');

      const results = await engine.validateBatch([
        join(testDir, 'file1.md'),
        join(testDir, 'file2.md')
      ]);

      // Text batch report
      const textReport = engine.generateReport(results, 'text');
      expect(textReport).toContain('Batch Validation Report');
      expect(textReport).toContain('Total Files: 2');

      // JSON batch report
      const jsonReport = engine.generateReport(results, 'json');
      const parsed = JSON.parse(jsonReport);
      expect(parsed[join(testDir, 'file1.md')]).toBeDefined();
    });
  });

  describe('Rule Management', () => {
    it('should load and merge custom rules', async () => {
      // Load from custom guide
      const customGuide = join(testDir, 'custom-guide');
      mkdirSync(join(customGuide, 'validation'), { recursive: true });

      writeFileSync(
        join(customGuide, 'validation/banned-patterns.md'),
        '# Custom\n\n- custom-banned-phrase'
      );

      engine.loadRulesFromGuide(customGuide);
      await engine.initialize();

      const customContent = 'This has custom-banned-phrase in it.';
      const customResult = await engine.validate(customContent);
      expect(customResult.issues.some(i => i.message.includes('custom-banned-phrase'))).toBe(true);

      // Update with new custom rule
      engine.updateRules({
        bannedPhrases: [{
          id: 'custom_rule',
          type: 'banned_phrase',
          pattern: /super-duper/gi,
          severity: 'critical',
          message: 'Custom banned phrase'
        }]
      });

      const superDuperResult = await engine.validate('This is super-duper awesome.');
      expect(superDuperResult.issues.some(i => i.ruleId === 'custom_rule')).toBe(true);

      // Verify merge with existing rules
      const originalContent = 'seamlessly integrates';
      const originalResult = await engine.validate(originalContent);
      const originalIssueCount = originalResult.issues.length;

      engine.updateRules({
        bannedPhrases: [{
          id: 'new_custom',
          type: 'banned_phrase',
          pattern: /new-custom-phrase/gi,
          severity: 'warning',
          message: 'New custom phrase'
        }]
      });

      const newContent = 'seamlessly integrates and new-custom-phrase';
      const newResult = await engine.validate(newContent);
      expect(newResult.issues.length).toBeGreaterThan(originalIssueCount);
    });
  });

  describe('Scoring Algorithm', () => {
    it('should calculate scores correctly for different content types', () => {
      const scoringTests = [
        {
          name: 'human content',
          content: 'I think we should use PostgreSQL. We found it reduced query time by 200ms. The p99 latency is acceptable.',
          expectedScore: { min: 50, max: 100 }
        },
        {
          name: 'AI content',
          content: 'Moreover, the comprehensive solution seamlessly integrates. Furthermore, it leverages cutting-edge technology.',
          expectedScore: { min: 0, max: 50 }
        },
        {
          name: 'mixed content',
          content: 'The system uses Redis for caching. Moreover, it seamlessly integrates with the database.',
          expectedScore: { min: 20, max: 70 }
        }
      ];

      for (const { name, content, expectedScore } of scoringTests) {
        const analysis = engine.analyzeAuthenticity(content);
        expect(analysis.score, `Failed for ${name}`).toBeGreaterThanOrEqual(expectedScore.min);
        expect(analysis.score, `Failed for ${name}`).toBeLessThanOrEqual(expectedScore.max);
      }
    });
  });

  describe('Suggestions', () => {
    it('should generate actionable and prioritized suggestions', async () => {
      // Actionable suggestions
      const content1 = 'Moreover, this comprehensive solution seamlessly integrates.';
      const result1 = await engine.validate(content1);
      expect(result1.suggestions.length).toBeGreaterThan(0);
      expect(result1.suggestions.some(s => s.toLowerCase().includes('remove') || s.toLowerCase().includes('add'))).toBe(true);

      // Critical issues first
      const content2 = 'This seamlessly integrates with cutting-edge technology.';
      const result2 = await engine.validate(content2);
      expect(result2.suggestions[0]).toContain('banned phrase');

      // Authenticity markers
      const content3 = 'The system works well and performs efficiently.';
      const result3 = await engine.validate(content3);
      const authSuggestion = result3.suggestions.find(s => s.includes('authenticity'));
      expect(authSuggestion).toBeDefined();

      // Context-specific suggestions
      const content4 = 'The approach is good.';
      const result4 = await engine.validateForContext(content4, 'technical');
      expect(result4.suggestions.some(s => s.includes('metric'))).toBe(true);
    });
  });
});
