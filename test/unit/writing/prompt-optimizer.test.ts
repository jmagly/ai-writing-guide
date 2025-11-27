import { describe, it, expect, beforeEach } from 'vitest';
import { PromptOptimizer } from '../../../src/writing/prompt-optimizer.ts';

describe('PromptOptimizer', () => {
  let optimizer: PromptOptimizer;

  beforeEach(() => {
    optimizer = new PromptOptimizer();
  });

  describe('Prompt Analysis', () => {
    it('should detect vague prompts', () => {
      const result = optimizer.analyzePrompt('Write about authentication');
      expect(result.score).toBeLessThan(50);
      expect(result.issues.some(i => i.category === 'specificity')).toBe(true);
    });

    it('should detect missing constraints', () => {
      const result = optimizer.analyzePrompt('Write an article about security');
      expect(result.issues.some(i => i.category === 'constraints')).toBe(true);
    });

    it('should detect missing examples', () => {
      const result = optimizer.analyzePrompt('Explain JWT tokens');
      expect(result.issues.some(i => i.category === 'examples')).toBe(true);
    });

    it('should score specific prompts high', () => {
      const prompt = `Write a 1500-word technical article about OAuth 2.0 for senior developers.
Requirements:
- Avoid "delve into" and "seamlessly"
- Include code examples
Example: Show PKCE flow implementation`;

      const result = optimizer.analyzePrompt(prompt);
      expect(result.score).toBeGreaterThan(70);
    });

    it('should score vague prompts low', () => {
      const result = optimizer.analyzePrompt('Write about microservices');
      expect(result.score).toBeLessThan(40);
    });

    it('should identify anti-patterns', () => {
      const result = optimizer.analyzePrompt('Write a comprehensive guide about security');
      expect(result.antiPatterns.length).toBeGreaterThan(0);
      expect(result.antiPatterns.some(p => p.pattern === 'ai_trigger_word')).toBe(true);
    });

    it('should recognize well-formed prompts', () => {
      const prompt = `Write a 2000-word technical deep-dive about database indexing for backend engineers.

Requirements:
- Avoid AI patterns (no "seamlessly", "comprehensive", "robust")
- Include B-tree vs Hash index comparison with performance benchmarks
- Show actual SQL query performance before/after indexing
- Acknowledge trade-offs (storage overhead, write performance impact)

Example structure:
1. Problem: slow queries (actual query times)
2. B-tree indexes (when to use, with code)
3. Hash indexes (when to use, with code)
4. Benchmarks (real numbers from production)
5. Trade-offs (storage, write latency)`;

      const result = optimizer.analyzePrompt(prompt);
      expect(result.score).toBeGreaterThan(80);
      expect(result.strengths.length).toBeGreaterThan(3);
    });

    it('should detect missing audience specification', () => {
      const result = optimizer.analyzePrompt('Write about API design');
      expect(result.issues.some(i => i.category === 'audience')).toBe(true);
      expect(result.suggestions).toContain('Specify target audience or expertise level');
    });

    it('should detect missing format specification', () => {
      const result = optimizer.analyzePrompt('Explain containers');
      expect(result.issues.some(i => i.category === 'format')).toBe(true);
    });

    it('should recognize format when specified', () => {
      const result = optimizer.analyzePrompt('Write a 1000-word tutorial about Docker');
      expect(result.issues.some(i => i.category === 'format')).toBe(false);
    });

    it('should detect AI trigger words', () => {
      const patterns = optimizer.detectAntiPatterns('Write a comprehensive, robust solution using cutting-edge technology');
      expect(patterns.length).toBeGreaterThan(2);
      expect(patterns.some(p => p.description.includes('comprehensive'))).toBe(true);
      expect(patterns.some(p => p.description.includes('robust'))).toBe(true);
      expect(patterns.some(p => p.description.includes('cutting-edge'))).toBe(true);
    });

    it('should detect generic tone requests', () => {
      const patterns = optimizer.detectAntiPatterns('Write in a professional tone about testing');
      expect(patterns.some(p => p.pattern === 'generic_tone')).toBe(true);
    });

    it('should provide actionable suggestions', () => {
      const result = optimizer.analyzePrompt('Write about APIs');
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions.every(s => s.length > 0)).toBe(true);
    });

    it('should categorize issues by severity', () => {
      const result = optimizer.analyzePrompt('Write a comprehensive guide');
      const critical = result.issues.filter(i => i.severity === 'critical');
      const warnings = result.issues.filter(i => i.severity === 'warning');
      expect(critical.length + warnings.length).toBeGreaterThan(0);
    });

    it('should score prompts with metrics higher', () => {
      const withoutMetrics = optimizer.scorePromptQuality('Write about performance optimization');
      const withMetrics = optimizer.scorePromptQuality('Write about reducing latency from 500ms to 50ms with caching');
      expect(withMetrics).toBeGreaterThan(withoutMetrics);
    });

    it('should score prompts with specific technologies higher', () => {
      const generic = optimizer.scorePromptQuality('Write about authentication');
      const specific = optimizer.scorePromptQuality('Write about OAuth 2.0 and JWT authentication');
      expect(specific).toBeGreaterThan(generic);
    });

    it('should penalize banned phrases', () => {
      const clean = optimizer.scorePromptQuality('Write about database design');
      const withBanned = optimizer.scorePromptQuality('Write about database design, moreover ensure seamless integration');
      expect(clean).toBeGreaterThan(withBanned);
    });

    it('should handle empty prompts gracefully', () => {
      const result = optimizer.analyzePrompt('');
      expect(result.score).toBe(0);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should handle very long prompts', () => {
      const longPrompt = 'Write about '.repeat(1000) + 'testing';
      const result = optimizer.analyzePrompt(longPrompt);
      expect(result.score).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should identify anti-pattern locations', () => {
      const patterns = optimizer.detectAntiPatterns('Use cutting-edge technology and seamless integration');
      expect(patterns.length).toBeGreaterThan(0);
      // AI trigger words should have specific locations, but structural issues (like no_constraints) may not
      const triggerWordPatterns = patterns.filter(p => p.pattern === 'ai_trigger_word');
      expect(triggerWordPatterns.every(p => p.locations.length > 0)).toBe(true);
    });
  });

  describe('Optimization Strategies', () => {
    it('should add specificity to vague prompts', async () => {
      const result = await optimizer.optimize('Write about authentication');
      expect(result.optimizedPrompt).not.toBe(result.originalPrompt);
      expect(result.improvements.some(i => i.type === 'specificity')).toBe(true);
      expect(result.score.after).toBeGreaterThan(result.score.before);
    });

    it('should inject examples into generic requests', async () => {
      const result = await optimizer.optimize('Explain JWT tokens', { domain: 'technical' });
      expect(result.improvements.some(i => i.type === 'examples')).toBe(true);
      expect(result.optimizedPrompt).toContain('example');
    });

    it('should add AI Writing Guide constraints', async () => {
      const result = await optimizer.optimize('Write an article about security');
      expect(result.improvements.some(i => i.type === 'constraints')).toBe(true);
      expect(result.optimizedPrompt.toLowerCase()).toContain('avoid');
    });

    it('should inject voice guidance for technical context', async () => {
      const result = await optimizer.optimize('Write about databases', { voice: 'technical' });
      expect(result.improvements.some(i => i.type === 'voice')).toBe(true);
      expect(result.optimizedPrompt).toContain('technical');
    });

    it('should inject voice guidance for academic context', async () => {
      const result = await optimizer.optimize('Analyze social media impact', { voice: 'academic' });
      expect(result.improvements.some(i => i.type === 'voice')).toBe(true);
      expect(result.optimizedPrompt.toLowerCase()).toContain('academic');
    });

    it('should inject voice guidance for executive context', async () => {
      const result = await optimizer.optimize('Write brief about cloud migration', { voice: 'executive' });
      expect(result.improvements.some(i => i.type === 'voice')).toBe(true);
      expect(result.optimizedPrompt.toLowerCase()).toContain('executive');
    });

    it('should remove filler words and vagueness', async () => {
      const result = await optimizer.optimize('Write a comprehensive guide using robust solutions');
      expect(result.improvements.some(i => i.description.includes('vague'))).toBe(true);
      expect(result.optimizedPrompt).not.toContain('comprehensive');
    });

    it('should preserve good parts of original prompt', async () => {
      const original = 'Write a 1500-word article for senior developers about OAuth 2.0';
      const result = await optimizer.optimize(original);
      expect(result.optimizedPrompt).toContain('1500-word');
      expect(result.optimizedPrompt).toContain('senior developers');
      expect(result.optimizedPrompt).toContain('OAuth 2.0');
    });

    it('should add word count when provided in context', async () => {
      const result = await optimizer.optimize('Write about testing', { targetLength: 2000 });
      expect(result.optimizedPrompt).toContain('2000');
    });

    it('should not duplicate constraints', async () => {
      const original = `Write about APIs
Requirements:
- Avoid "seamlessly"
- Include examples`;
      const result = await optimizer.optimize(original);
      const requirementsCount = (result.optimizedPrompt.match(/Requirements:/g) || []).length;
      expect(requirementsCount).toBeLessThanOrEqual(1);
    });

    it('should fix vague request anti-pattern', async () => {
      const result = await optimizer.optimize('Write about microservices');
      expect(result.improvements.some(i => i.type === 'anti_pattern' || i.type === 'specificity')).toBe(true);
      expect(result.score.after).toBeGreaterThan(result.score.before);
    });

    it('should remove AI trigger words', async () => {
      const result = await optimizer.optimize('Write a comprehensive and robust article');
      expect(result.optimizedPrompt.toLowerCase()).not.toContain('comprehensive');
      expect(result.optimizedPrompt.toLowerCase()).not.toContain('robust');
    });

    it('should add domain-specific constraints', async () => {
      const result = await optimizer.optimize('Write about security', { domain: 'technical' });
      expect(result.optimizedPrompt.toLowerCase()).toContain('implementation');
    });

    it('should add academic constraints for academic domain', async () => {
      const result = await optimizer.optimize('Analyze topic', { domain: 'academic' });
      expect(result.optimizedPrompt.toLowerCase()).toContain('cite');
    });

    it('should add executive constraints for executive domain', async () => {
      const result = await optimizer.optimize('Write brief', { domain: 'executive' });
      expect(result.optimizedPrompt.toLowerCase()).toContain('impact');
    });

    it('should generate detailed reasoning', async () => {
      const result = await optimizer.optimize('Write about APIs');
      expect(result.reasoning).toBeTruthy();
      expect(result.reasoning.length).toBeGreaterThan(50);
      expect(result.reasoning).toContain('score');
    });

    it('should track improvement types', async () => {
      const result = await optimizer.optimize('Write about databases');
      const types = new Set(result.improvements.map(i => i.type));
      expect(types.size).toBeGreaterThan(0);
    });

    it('should assign impact levels', async () => {
      const result = await optimizer.optimize('Write a comprehensive article');
      expect(result.improvements.every(i => ['high', 'medium', 'low'].includes(i.impact))).toBe(true);
    });

    it('should handle already-optimized prompts', async () => {
      const optimized = `Write a 1500-word technical article about Redis caching for backend engineers.

Requirements:
- Avoid AI patterns (no "seamlessly", "robust", "comprehensive")
- Include specific Redis commands and data structures
- Show performance benchmarks (before/after with actual numbers)
- Acknowledge trade-offs (memory usage, persistence options)

Examples:
- SET/GET operations with TTL
- Sorted sets for leaderboards
- Pub/Sub for real-time features

Write for senior developers with production experience.`;

      const result = await optimizer.optimize(optimized);
      expect(result.score.before).toBeGreaterThan(80);
      expect(result.improvements.length).toBeLessThan(3);
    });

    it('should handle prompts with code blocks', async () => {
      const prompt = `Write about authentication
\`\`\`javascript
const token = jwt.sign(payload, secret);
\`\`\``;
      const result = await optimizer.optimize(prompt);
      expect(result.optimizedPrompt).toContain('```');
      expect(result.optimizedPrompt).toContain('jwt.sign');
    });

    it('should provide before/after snippets in improvements', async () => {
      const result = await optimizer.optimize('Write a comprehensive guide');
      expect(result.improvements.length).toBeGreaterThan(0);
      expect(result.improvements[0].before).toBeDefined();
      expect(result.improvements[0].after).toBeDefined();
    });

    it('should optimize with custom constraints', async () => {
      const result = await optimizer.optimize('Write about testing', {
        constraints: ['Include pytest examples', 'Focus on mocking']
      });
      expect(result.optimizedPrompt.toLowerCase()).toContain('pytest');
    });
  });

  describe('Template Management', () => {
    it('should detect need for template suggestion', () => {
      const analysis = optimizer.analyzePrompt('Write technical article');
      expect(analysis.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Prompt Comparison', () => {
    it('should show before/after differences', () => {
      const original = 'Write about authentication';
      const optimized = `Write a 1500-word article about OAuth 2.0 authentication for senior developers.

Requirements:
- Avoid AI patterns
- Include code examples`;

      const comparison = optimizer.comparePrompts(original, optimized);
      expect(comparison.differences.length).toBeGreaterThan(0);
    });

    it('should quantify improvement (score delta)', () => {
      const original = 'Write about APIs';
      const optimized = 'Write a 2000-word technical guide about REST API design for backend developers with code examples and avoid "seamlessly"';

      const comparison = optimizer.comparePrompts(original, optimized);
      expect(comparison.improvement).toBeGreaterThan(0);
    });

    it('should list specific improvements made', () => {
      const original = 'Write about testing';
      const optimized = `Write about integration testing with pytest

Requirements:
- Avoid "comprehensive"
- Include code examples`;

      const comparison = optimizer.comparePrompts(original, optimized);
      expect(comparison.differences.some(d => d.type === 'added')).toBe(true);
    });

    it('should highlight removed anti-patterns', () => {
      const original = 'Write a comprehensive, robust guide';
      const optimized = 'Write a detailed guide about specific topic';

      const comparison = optimizer.comparePrompts(original, optimized);
      expect(comparison.differences.some(d => d.type === 'modified')).toBe(true);
    });

    it('should generate comparison summary', () => {
      const original = 'Write about databases';
      const optimized = 'Write a 1500-word article about PostgreSQL indexing for DBAs';

      const comparison = optimizer.comparePrompts(original, optimized);
      expect(comparison.summary).toBeTruthy();
      expect(comparison.summary.length).toBeGreaterThan(20);
    });

    it('should track added sections', () => {
      const original = 'Write about APIs';
      const optimized = `Write about APIs

Requirements:
- Avoid AI patterns`;

      const comparison = optimizer.comparePrompts(original, optimized);
      const added = comparison.differences.filter(d => d.type === 'added');
      expect(added.length).toBeGreaterThan(0);
    });

    it('should track removed sections', () => {
      const original = `Write about APIs
Use comprehensive approach`;
      const optimized = 'Write about APIs';

      const comparison = optimizer.comparePrompts(original, optimized);
      const removed = comparison.differences.filter(d => d.type === 'removed');
      expect(removed.length).toBeGreaterThan(0);
    });

    it('should track modified sections', () => {
      const original = 'Write about authentication';
      const optimized = 'Write about OAuth 2.0 authentication';

      const comparison = optimizer.comparePrompts(original, optimized);
      const modified = comparison.differences.filter(d => d.type === 'modified');
      expect(modified.length).toBeGreaterThan(0);
    });

    it('should provide reasons for changes', () => {
      const original = 'Write comprehensive guide';
      const optimized = 'Write detailed guide with examples';

      const comparison = optimizer.comparePrompts(original, optimized);
      expect(comparison.differences.every(d => d.reason.length > 0)).toBe(true);
    });
  });

  describe('Batch Optimization', () => {
    it('should optimize multiple prompts in parallel', async () => {
      const prompts = [
        'Write about testing',
        'Write about databases',
        'Write about security'
      ];

      const results = await optimizer.optimizeBatch(prompts);
      expect(results.size).toBe(3);
      prompts.forEach(p => {
        expect(results.has(p)).toBe(true);
      });
    });

    it('should handle mixed quality prompts', async () => {
      const prompts = [
        'Write about APIs', // vague
        'Write a 1500-word technical article about GraphQL for senior developers' // specific
      ];

      const results = await optimizer.optimizeBatch(prompts);
      const scores = Array.from(results.values()).map(r => r.score.before);
      expect(Math.max(...scores)).toBeGreaterThan(Math.min(...scores));
    });

    it('should process large batches efficiently', async () => {
      const prompts = Array.from({ length: 25 }, (_, i) => `Write about topic ${i}`);

      const startTime = Date.now();
      const results = await optimizer.optimizeBatch(prompts);
      const duration = Date.now() - startTime;

      expect(results.size).toBe(25);
      expect(duration).toBeLessThan(10000); // Should complete in under 10 seconds
    });

    it('should maintain individual prompt context', async () => {
      const prompts = [
        'Write about authentication',
        'Write about authorization'
      ];

      const results = await optimizer.optimizeBatch(prompts);
      const optimized = Array.from(results.values()).map(r => r.optimizedPrompt);

      expect(optimized[0]).toContain('authentication');
      expect(optimized[1]).toContain('authorization');
    });
  });

  describe('Edge Cases', () => {
    it('should handle prompts with special characters', async () => {
      const prompt = 'Write about C++ & Rust: performance comparison';
      const result = await optimizer.optimize(prompt);
      expect(result.optimizedPrompt).toContain('C++');
      expect(result.optimizedPrompt).toContain('Rust');
    });

    it('should handle multi-line prompts', async () => {
      const prompt = `Write about testing

Must include:
- Unit tests
- Integration tests`;

      const result = await optimizer.optimize(prompt);
      expect(result.optimizedPrompt).toContain('Unit tests');
    });

    it('should handle prompts with URLs', async () => {
      const prompt = 'Write about https://api.example.com REST API';
      const result = await optimizer.optimize(prompt);
      expect(result.optimizedPrompt).toContain('https://api.example.com');
    });

    it('should handle prompts with numbers', async () => {
      const prompt = 'Write about reducing latency from 500ms to 50ms';
      const result = await optimizer.optimize(prompt);
      expect(result.optimizedPrompt).toContain('500ms');
      expect(result.optimizedPrompt).toContain('50ms');
    });

    it('should handle prompts with bullet points', async () => {
      const prompt = `Write about security:
• Authentication
• Authorization
• Encryption`;

      const result = await optimizer.optimize(prompt);
      expect(result.optimizedPrompt).toContain('•');
    });

    it('should handle very short prompts', async () => {
      const result = await optimizer.optimize('APIs');
      expect(result.optimizedPrompt.length).toBeGreaterThan(10);
      expect(result.score.after).toBeGreaterThan(result.score.before);
    });

    it('should handle prompts with mixed case', async () => {
      const prompt = 'WRITE ABOUT TESTING';
      const result = await optimizer.optimize(prompt);
      expect(result.optimizedPrompt).toBeTruthy();
    });

    it('should handle prompts with unicode', async () => {
      const prompt = 'Write about testing with émojis 🚀';
      const result = await optimizer.optimize(prompt);
      expect(result.optimizedPrompt).toContain('🚀');
    });

    it('should not break on undefined context', async () => {
      const result = await optimizer.optimize('Write about testing', undefined);
      expect(result).toBeTruthy();
      expect(result.score.after).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty context object', async () => {
      const result = await optimizer.optimize('Write about APIs', {});
      expect(result).toBeTruthy();
    });
  });

  describe('Scoring Consistency', () => {
    it('should produce consistent scores for same prompt', () => {
      const prompt = 'Write about databases';
      const score1 = optimizer.scorePromptQuality(prompt);
      const score2 = optimizer.scorePromptQuality(prompt);
      expect(score1).toBe(score2);
    });

    it('should never score below 0', () => {
      const worst = 'Write a comprehensive robust cutting-edge seamless innovative solution moreover furthermore';
      const score = optimizer.scorePromptQuality(worst);
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('should never score above 100', () => {
      const best = `Write a 2000-word technical analysis of PostgreSQL B-tree indexing for senior DBAs.

Requirements:
- Avoid AI patterns (no "seamlessly", "robust", "comprehensive", "Moreover")
- Include specific index types (B-tree, Hash, GiST, GIN) with use cases
- Show actual query plans (EXPLAIN ANALYZE output)
- Benchmark results (queries/sec before and after indexing)
- Acknowledge trade-offs (storage overhead, write performance)

Examples:
- CREATE INDEX statements for each index type
- Query performance comparison with real numbers
- Index size calculation and storage impact

Write for database administrators with production PostgreSQL experience.
Reference real-world scenarios from high-traffic applications.
Include what goes wrong (bloat, unused indexes, over-indexing).`;

      const score = optimizer.scorePromptQuality(best);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should score comprehensively optimized prompts high', () => {
      const prompt = `Write a 1500-word article about Redis caching strategies for backend engineers.

Requirements:
- Avoid "delve into", "seamlessly", "comprehensive", "robust"
- Include specific Redis commands (SET, GET, ZADD, PUBLISH)
- Performance benchmarks (cache hit rates, latency improvements)
- Acknowledge limitations (memory constraints, persistence trade-offs)

Examples:
- Cache-aside pattern with code
- Write-through pattern with code
- Sorted sets for leaderboards

Target senior backend developers with production experience.`;

      const score = optimizer.scorePromptQuality(prompt);
      expect(score).toBeGreaterThanOrEqual(85);
    });
  });
});
