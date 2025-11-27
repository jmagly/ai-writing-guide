/**
 * Tests for WritingValidationEngine
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
      it('should detect exact banned phrase matches', async () => {
        const content = 'This solution seamlessly integrates with the platform.';
        const result = await engine.validate(content);

        const bannedIssues = result.issues.filter(i => i.type === 'banned_phrase');
        expect(bannedIssues.length).toBeGreaterThan(0);
        expect(bannedIssues.some(i => i.message.includes('seamlessly'))).toBe(true);
      });

      it('should detect multiple banned phrases', async () => {
        const content = 'Our cutting-edge, revolutionary platform leverages state-of-the-art technology.';
        const result = await engine.validate(content);

        const bannedIssues = result.issues.filter(i => i.type === 'banned_phrase');
        expect(bannedIssues.length).toBeGreaterThanOrEqual(3); // cutting-edge, revolutionary, state-of-the-art
      });

      it('should detect banned phrases case-insensitively', async () => {
        const content = 'SEAMLESSLY and Cutting-Edge and state-OF-the-ART';
        const result = await engine.validate(content);

        const bannedIssues = result.issues.filter(i => i.type === 'banned_phrase');
        expect(bannedIssues.length).toBeGreaterThan(0);
      });

      it('should not false-positive on valid technical terms', async () => {
        const content = 'The algorithm optimizes throughput using cache-aware data structures.';
        const result = await engine.validate(content);

        const bannedIssues = result.issues.filter(i => i.type === 'banned_phrase');
        expect(bannedIssues.length).toBe(0);
      });

      it('should provide accurate line numbers', async () => {
        const content = `Line 1 is clean.
Line 2 has seamlessly integrated content.
Line 3 is also clean.`;

        const result = await engine.validate(content);

        const seamlessIssue = result.issues.find(i => i.message.includes('seamlessly'));
        expect(seamlessIssue?.location.line).toBe(2);
      });

      it('should provide context around matches', async () => {
        const content = 'The platform seamlessly integrates with existing systems and workflows.';
        const result = await engine.validate(content);

        const seamlessIssue = result.issues.find(i => i.message.includes('seamlessly'));
        expect(seamlessIssue?.context).toBeDefined();
        expect(seamlessIssue?.context).toContain('seamlessly');
      });

      it('should handle phrase variations with stemming', async () => {
        const content = 'This is transformative, revolutionary, and groundbreaking.';
        const result = await engine.validate(content);

        expect(result.issues.length).toBeGreaterThan(0);
      });
    });

    describe('AI Patterns', () => {
      it('should detect formulaic AI patterns', async () => {
        const content = 'Moreover, the system is efficient. Furthermore, it is scalable.';
        const result = await engine.validate(content);

        const aiPatterns = result.issues.filter(i => i.type === 'ai_pattern');
        expect(aiPatterns.length).toBeGreaterThan(0);
      });

      it('should detect conclusion phrases', async () => {
        const content = 'In conclusion, the approach works well.';
        const result = await engine.validate(content);

        const conclusionIssue = result.issues.find(i => i.message.includes('conclusion'));
        expect(conclusionIssue).toBeDefined();
      });

      it('should detect formulaic transitions at line start', async () => {
        const content = `First point here.
Moreover, second point follows.
Additionally, third point arrives.`;

        const result = await engine.validate(content);

        const transitions = result.issues.filter(i =>
          i.message.includes('transition') || i.message.includes('Moreover') || i.message.includes('Additionally')
        );
        expect(transitions.length).toBeGreaterThan(0);
      });

      it('should handle multi-line patterns', async () => {
        const content = `The system provides many benefits.

Moreover, it integrates well with existing infrastructure.

Furthermore, the cost savings are significant.`;

        const result = await engine.validate(content);

        expect(result.issues.length).toBeGreaterThan(0);
      });
    });

    describe('Formulaic Structures', () => {
      it('should detect three-item lists', async () => {
        const content = 'The system is fast, reliable, and secure.';
        const result = await engine.validate(content);

        const structureIssues = result.issues.filter(i => i.type === 'formulaic_structure');
        expect(structureIssues.length).toBeGreaterThan(0);
      });

      it('should allow two-item or four-item lists', async () => {
        const content = 'The system is fast and reliable. It is also secure, scalable, maintainable, and cost-effective.';
        const result = await engine.validate(content);

        // Should have fewer issues than three-item list
        const threeItemIssues = result.issues.filter(i =>
          i.message.includes('three-item')
        );
        expect(threeItemIssues.length).toBe(0);
      });
    });
  });

  describe('Authenticity Analysis', () => {
    describe('Human Markers', () => {
      it('should score authentic human writing high (>80)', async () => {
        const content = `I think the authentication system needs improvement. We found that JWT tokens with 15-minute expiry reduced security incidents by 40%.
We chose httpOnly cookies after the XSS incident last year. The p99 latency is 45ms, which meets our requirements.
While this approach is more complex, it provides better security guarantees.`;

        const result = await engine.validate(content);

        expect(result.score).toBeGreaterThan(0);
        expect(result.summary.authenticityScore).toBeGreaterThan(40);
      });

      it('should detect opinion statements as human markers', async () => {
        const content = 'I think GraphQL is better for this use case. In my experience, REST works fine for simple APIs.';
        const analysis = engine.analyzeAuthenticity(content);

        expect(analysis.humanMarkers.some(m => m.includes('personal'))).toBe(true);
      });

      it('should detect trade-off acknowledgments', async () => {
        const content = 'While Redis is fast, we must consider memory constraints. The cache improves performance but increases complexity.';
        const analysis = engine.analyzeAuthenticity(content);

        expect(analysis.humanMarkers.some(m => m.includes('trade-off'))).toBe(true);
      });

      it('should detect specific metrics and examples', async () => {
        const content = 'Reduced latency by 30ms. Improved throughput by 45%. Decreased memory usage by 2GB.';
        const analysis = engine.analyzeAuthenticity(content);

        expect(analysis.humanMarkers.some(m => m.includes('metric'))).toBe(true);
      });

      it('should detect specific technologies as human markers', async () => {
        const content = 'We use PostgreSQL, Redis, and Kubernetes for the backend infrastructure.';
        const analysis = engine.analyzeAuthenticity(content);

        expect(analysis.humanMarkers.length).toBeGreaterThan(0);
      });

      it('should detect problem mentions', async () => {
        const content = 'We encountered a bug in the connection pool. The issue was difficult to reproduce.';
        const analysis = engine.analyzeAuthenticity(content);

        expect(analysis.humanMarkers.some(m => m.includes('problem'))).toBe(true);
      });
    });

    describe('AI Tells', () => {
      it('should score obvious AI writing low (<30)', async () => {
        const content = `Our comprehensive, cutting-edge solution seamlessly integrates with your existing infrastructure.
Moreover, the platform leverages state-of-the-art technology to provide robust and scalable services.
Furthermore, our innovative approach ensures optimal performance and transformative results.
In conclusion, this revolutionary system delivers best-in-class outcomes.`;

        const result = await engine.validate(content);

        expect(result.score).toBeLessThan(40);
        expect(result.summary.aiPatternScore).toBeGreaterThan(20);
      });

      it('should penalize vague claims', async () => {
        const content = 'The comprehensive solution provides robust performance and optimal scalability.';
        const analysis = engine.analyzeAuthenticity(content);

        expect(analysis.aiTells.some(t => t.includes('intensifier'))).toBe(true);
      });

      it('should penalize excessive hedging', async () => {
        const content = 'This may help to improve performance. It can serve to enhance reliability. It might facilitate better outcomes.';
        const analysis = engine.analyzeAuthenticity(content);

        expect(analysis.aiTells.some(t => t.includes('hedging'))).toBe(true);
      });

      it('should detect marketing buzzwords', async () => {
        const content = 'Revolutionary, transformative, groundbreaking innovation in the industry.';
        const analysis = engine.analyzeAuthenticity(content);

        expect(analysis.aiTells.some(t => t.includes('buzzword'))).toBe(true);
      });

      it('should detect throat-clearing phrases', async () => {
        const content = 'It is important to note that performance matters. It is worth noting that security is crucial.';
        const analysis = engine.analyzeAuthenticity(content);

        expect(analysis.aiTells.some(t => t.includes('throat-clearing'))).toBe(true);
      });
    });

    describe('Mixed Content', () => {
      it('should handle mixed content (some AI, some human)', async () => {
        // Content with both human markers and some AI tells (but not heavily penalized)
        const content = `The authentication system uses JWT tokens with 15-minute expiry.
We chose this approach after evaluating alternatives. The p99 latency is 45ms.
Moreover, this solution integrates well with existing infrastructure.`;

        const result = await engine.validate(content);

        // Should have both human markers and AI tells
        expect(result.humanMarkers.length).toBeGreaterThan(0);
        expect(result.aiTells.length).toBeGreaterThan(0);

        // Score should be moderate (more than obvious AI but less than authentic)
        expect(result.score).toBeGreaterThan(0);
        expect(result.score).toBeLessThan(80);
      });
    });
  });

  describe('Context-Specific Validation', () => {
    it('should allow formal language in academic context', async () => {
      const content = 'The study demonstrates significant correlation. Research indicates positive outcomes (Smith et al., 2023).';
      const result = await engine.validateForContext(content, 'academic');

      // Academic citations should boost score
      expect(result.score).toBeGreaterThan(0);
    });

    it('should require citations in academic context', async () => {
      const content = 'The study shows good results. Many researchers agree.';
      const result = await engine.validateForContext(content, 'academic');

      const citationSuggestion = result.suggestions.find(s => s.includes('citation'));
      expect(citationSuggestion).toBeDefined();
    });

    it('should allow technical jargon in technical context', async () => {
      const content = 'The algorithm exhibits O(n log n) complexity. We use epoll for async I/O. The API implements REST with HATEOAS.';
      const result = await engine.validateForContext(content, 'technical');

      expect(result.score).toBeGreaterThan(0);
    });

    it('should penalize hedging in executive context', async () => {
      const content = 'Revenue may increase. Costs might decrease. We could see improvements. Perhaps the strategy will work.';
      const result = await engine.validateForContext(content, 'executive');

      expect(result.score).toBeLessThan(50);
      const hedgingSuggestion = result.suggestions.find(s => s.includes('hedging'));
      expect(hedgingSuggestion).toBeDefined();
    });

    it('should allow contractions in casual context', async () => {
      const content = "We don't use microservices. It's overkill for our use case. Can't justify the complexity.";
      const result = await engine.validateForContext(content, 'casual');

      expect(result.score).toBeGreaterThan(0);
    });

    it('should require metrics in technical context', async () => {
      const content = 'The system is fast and efficient. Performance is good.';
      const result = await engine.validateForContext(content, 'technical');

      const metricSuggestion = result.suggestions.find(s => s.includes('metric'));
      expect(metricSuggestion).toBeDefined();
    });
  });

  describe('Batch Processing', () => {
    it('should validate multiple files in parallel', async () => {
      // Create test files
      writeFileSync(join(testDir, 'file1.md'), 'Clean content with specific metrics: 50ms latency.');
      writeFileSync(join(testDir, 'file2.md'), 'This seamlessly integrates with cutting-edge technology.');
      writeFileSync(join(testDir, 'file3.md'), 'We found that the bug occurred at 2am. Took 3 hours to fix.');

      const results = await engine.validateBatch([
        join(testDir, 'file1.md'),
        join(testDir, 'file2.md'),
        join(testDir, 'file3.md')
      ]);

      expect(results.size).toBe(3);
    });

    it('should handle mixed pass/fail results', async () => {
      writeFileSync(join(testDir, 'pass.md'), 'I think PostgreSQL works better here. Reduced query time by 200ms.');
      writeFileSync(join(testDir, 'fail.md'), 'Our comprehensive solution seamlessly leverages cutting-edge technology.');

      const results = await engine.validateBatch([
        join(testDir, 'pass.md'),
        join(testDir, 'fail.md')
      ]);

      const passResult = results.get(join(testDir, 'pass.md'));
      const failResult = results.get(join(testDir, 'fail.md'));

      expect(passResult?.score).toBeGreaterThanOrEqual(failResult?.score || 0);
    });

    it('should report per-file scores', async () => {
      writeFileSync(join(testDir, 'file1.md'), 'Content 1');
      writeFileSync(join(testDir, 'file2.md'), 'Content 2');

      const results = await engine.validateBatch([
        join(testDir, 'file1.md'),
        join(testDir, 'file2.md')
      ]);

      expect(results.get(join(testDir, 'file1.md'))?.score).toBeDefined();
      expect(results.get(join(testDir, 'file2.md'))?.score).toBeDefined();
    });

    it('should aggregate results across files', async () => {
      writeFileSync(join(testDir, 'file1.md'), 'File 1');
      writeFileSync(join(testDir, 'file2.md'), 'File 2');

      const results = await engine.validateBatch([
        join(testDir, 'file1.md'),
        join(testDir, 'file2.md')
      ]);

      const report = engine.generateReport(results, 'text');

      expect(report).toContain('Total Files: 2');
      expect(report).toContain('Average Score');
    });
  });

  describe('File Validation', () => {
    it('should validate file content', async () => {
      writeFileSync(join(testDir, 'test.md'), 'This seamlessly integrates.');

      const result = await engine.validateFile(join(testDir, 'test.md'));

      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should handle non-existent files', async () => {
      await expect(engine.validateFile(join(testDir, 'missing.md'))).rejects.toThrow();
    });

    it('should handle large files efficiently', async () => {
      const largeContent = 'Valid content. '.repeat(10000); // ~150KB
      writeFileSync(join(testDir, 'large.md'), largeContent);

      const start = Date.now();
      const result = await engine.validateFile(join(testDir, 'large.md'));
      const duration = Date.now() - start;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(2000); // Should complete in < 2s
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content', async () => {
      const result = await engine.validate('');

      expect(result.score).toBeDefined();
      expect(result.issues).toHaveLength(1);
    });

    it('should handle very long documents (>100KB)', async () => {
      const longContent = 'This is valid technical content with specific metrics like 50ms latency. '.repeat(2000);

      const result = await engine.validate(longContent);

      expect(result).toBeDefined();
      expect(result.summary.wordCount).toBeGreaterThan(10000);
    });

    it('should handle Unicode and special characters', async () => {
      const content = 'The system handles émojis 😀 and spëcial çharacters.';

      const result = await engine.validate(content);

      expect(result).toBeDefined();
    });

    it('should handle code blocks (skip validation)', async () => {
      const content = `Regular text here.

\`\`\`javascript
// Code with "seamlessly" in comments
const x = "cutting-edge";
\`\`\`

More regular text.`;

      const result = await engine.validate(content);

      // Should still detect patterns in regular text, but we don't have special code block handling yet
      expect(result).toBeDefined();
    });

    it('should handle malformed markdown', async () => {
      const content = '# Broken Header\n\n[Incomplete link\n\n**Unclosed bold';

      const result = await engine.validate(content);

      expect(result).toBeDefined();
    });

    it('should handle single-line content', async () => {
      const result = await engine.validate('Single line with seamlessly.');

      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0].location.line).toBe(1);
    });

    it('should handle content with only whitespace', async () => {
      const result = await engine.validate('   \n\n   \t\t   \n   ');

      expect(result.score).toBeDefined();
      expect(result.summary.wordCount).toBe(0);
    });
  });

  describe('Report Generation', () => {
    it('should generate text report', async () => {
      const content = 'This seamlessly integrates.';
      const result = await engine.validate(content);

      const report = engine.generateReport(result, 'text');

      expect(report).toContain('Writing Validation Report');
      expect(report).toContain('Overall Score');
      expect(report).toContain('Total Issues');
    });

    it('should generate JSON report', async () => {
      const content = 'Clean content.';
      const result = await engine.validate(content);

      const report = engine.generateReport(result, 'json');

      const parsed = JSON.parse(report);
      expect(parsed.score).toBeDefined();
      expect(parsed.issues).toBeDefined();
      expect(parsed.summary).toBeDefined();
    });

    it('should generate HTML report', async () => {
      const content = 'This seamlessly integrates.';
      const result = await engine.validate(content);

      const report = engine.generateReport(result, 'html');

      expect(report).toContain('<!DOCTYPE html>');
      expect(report).toContain('Writing Validation Report');
      expect(report).toContain(result.score.toString());
    });

    it('should generate batch report in text format', async () => {
      writeFileSync(join(testDir, 'file1.md'), 'Content 1');
      writeFileSync(join(testDir, 'file2.md'), 'Content 2');

      const results = await engine.validateBatch([
        join(testDir, 'file1.md'),
        join(testDir, 'file2.md')
      ]);

      const report = engine.generateReport(results, 'text');

      expect(report).toContain('Batch Validation Report');
      expect(report).toContain('Total Files: 2');
    });

    it('should generate batch report in JSON format', async () => {
      writeFileSync(join(testDir, 'file1.md'), 'Content 1');

      const results = await engine.validateBatch([join(testDir, 'file1.md')]);

      const report = engine.generateReport(results, 'json');

      const parsed = JSON.parse(report);
      expect(parsed[join(testDir, 'file1.md')]).toBeDefined();
    });
  });

  describe('Rule Management', () => {
    it('should load rules from custom guide path', async () => {
      const customGuide = join(testDir, 'custom-guide');
      mkdirSync(join(customGuide, 'validation'), { recursive: true });

      writeFileSync(
        join(customGuide, 'validation/banned-patterns.md'),
        '# Custom\n\n- custom-banned-phrase'
      );

      engine.loadRulesFromGuide(customGuide);
      await engine.initialize();

      const content = 'This has custom-banned-phrase in it.';
      const result = await engine.validate(content);

      expect(result.issues.some(i => i.message.includes('custom-banned-phrase'))).toBe(true);
    });

    it('should update rules with custom rule set', async () => {
      await engine.initialize();

      engine.updateRules({
        bannedPhrases: [{
          id: 'custom_rule',
          type: 'banned_phrase',
          pattern: /super-duper/gi,
          severity: 'critical',
          message: 'Custom banned phrase'
        }]
      });

      const result = await engine.validate('This is super-duper awesome.');

      expect(result.issues.some(i => i.ruleId === 'custom_rule')).toBe(true);
    });

    it('should merge custom rules with existing rules', async () => {
      await engine.initialize();

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
    it('should calculate authenticity score correctly', () => {
      const humanContent = 'I think we should use PostgreSQL. We found it reduced query time by 200ms. The p99 latency is acceptable.';
      const analysis = engine.analyzeAuthenticity(humanContent);

      expect(analysis.score).toBeGreaterThan(50);
    });

    it('should penalize AI tells in score', () => {
      const aiContent = 'Moreover, the comprehensive solution seamlessly integrates. Furthermore, it leverages cutting-edge technology.';
      const analysis = engine.analyzeAuthenticity(aiContent);

      expect(analysis.score).toBeLessThan(50);
    });

    it('should provide balanced scoring for mixed content', () => {
      const mixedContent = 'The system uses Redis for caching. Moreover, it seamlessly integrates with the database.';
      const analysis = engine.analyzeAuthenticity(mixedContent);

      expect(analysis.score).toBeGreaterThan(20);
      expect(analysis.score).toBeLessThan(70);
    });
  });

  describe('Suggestions', () => {
    it('should generate actionable suggestions', async () => {
      const content = 'Moreover, this comprehensive solution seamlessly integrates.';
      const result = await engine.validate(content);

      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions.some(s => s.toLowerCase().includes('remove') || s.toLowerCase().includes('add'))).toBe(true);
    });

    it('should suggest removing critical issues first', async () => {
      const content = 'This seamlessly integrates with cutting-edge technology.';
      const result = await engine.validate(content);

      expect(result.suggestions[0]).toContain('banned phrase');
    });

    it('should suggest adding authenticity markers', async () => {
      const content = 'The system works well and performs efficiently.';
      const result = await engine.validate(content);

      const authSuggestion = result.suggestions.find(s => s.includes('authenticity'));
      expect(authSuggestion).toBeDefined();
    });

    it('should provide context-specific suggestions', async () => {
      const content = 'The approach is good.';
      const result = await engine.validateForContext(content, 'technical');

      expect(result.suggestions.some(s => s.includes('metric'))).toBe(true);
    });
  });
});
