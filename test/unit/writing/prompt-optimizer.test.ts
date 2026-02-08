import { describe, it, expect, beforeEach } from 'vitest';
import { PromptOptimizer } from '../../../src/writing/prompt-optimizer.ts';

describe('PromptOptimizer', () => {
  let optimizer: PromptOptimizer;

  beforeEach(() => {
    optimizer = new PromptOptimizer();
  });

  describe('Prompt Analysis', () => {
    it('should detect various prompt issues and categorize them', () => {
      const testCases = [
        {
          prompt: 'Write about authentication',
          checks: [
            { fn: (r: any) => r.score < 50, desc: 'vague prompt has low score' },
            { fn: (r: any) => r.issues.some(i => i.category === 'specificity'), desc: 'detects lack of specificity' }
          ]
        },
        {
          prompt: 'Write an article about security',
          checks: [
            { fn: (r: any) => r.issues.some(i => i.category === 'constraints'), desc: 'detects missing constraints' }
          ]
        },
        {
          prompt: 'Explain JWT tokens',
          checks: [
            { fn: (r: any) => r.issues.some(i => i.category === 'examples'), desc: 'detects missing examples' }
          ]
        },
        {
          prompt: 'Write about microservices',
          checks: [
            { fn: (r: any) => r.score < 40, desc: 'vague prompts score very low' }
          ]
        },
        {
          prompt: 'Write a comprehensive guide about security',
          checks: [
            { fn: (r: any) => r.antiPatterns.length > 0, desc: 'identifies anti-patterns' },
            { fn: (r: any) => r.antiPatterns.some(p => p.pattern === 'ai_trigger_word'), desc: 'detects AI trigger words' }
          ]
        }
      ];

      testCases.forEach(({ prompt, checks }) => {
        const result = optimizer.analyzePrompt(prompt);
        checks.forEach(({ fn, desc }) => {
          expect(fn(result), `${desc} for: "${prompt}"`).toBe(true);
        });
      });
    });

    it('should score specific and well-formed prompts high', () => {
      const specificPrompt = `Write a 1500-word technical article about OAuth 2.0 for senior developers.
Requirements:
- Avoid "delve into" and "seamlessly"
- Include code examples
Example: Show PKCE flow implementation`;

      const wellFormedPrompt = `Write a 2000-word technical deep-dive about database indexing for backend engineers.

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

      const specificResult = optimizer.analyzePrompt(specificPrompt);
      expect(specificResult.score).toBeGreaterThan(70);

      const wellFormedResult = optimizer.analyzePrompt(wellFormedPrompt);
      expect(wellFormedResult.score).toBeGreaterThan(80);
      expect(wellFormedResult.strengths.length).toBeGreaterThan(3);
    });

    it('should detect missing audience and format specifications', () => {
      const cases = [
        { prompt: 'Write about API design', category: 'audience', suggestion: 'Specify target audience or expertise level' },
        { prompt: 'Explain containers', category: 'format' }
      ];

      cases.forEach(({ prompt, category, suggestion }) => {
        const result = optimizer.analyzePrompt(prompt);
        expect(result.issues.some(i => i.category === category), `failed for ${category}`).toBe(true);
        if (suggestion) {
          expect(result.suggestions, `suggestion check failed for ${category}`).toContain(suggestion);
        }
      });
    });

    it('should recognize format when specified', () => {
      const result = optimizer.analyzePrompt('Write a 1000-word tutorial about Docker');
      expect(result.issues.some(i => i.category === 'format')).toBe(false);
    });

    it('should detect multiple AI trigger words and generic tone', () => {
      const patterns = optimizer.detectAntiPatterns('Write a comprehensive, robust solution using cutting-edge technology');
      expect(patterns.length).toBeGreaterThan(2);

      const triggerWords = ['comprehensive', 'robust', 'cutting-edge'];
      triggerWords.forEach(word => {
        expect(patterns.some(p => p.description.includes(word)), `failed to detect: ${word}`).toBe(true);
      });

      const genericTonePatterns = optimizer.detectAntiPatterns('Write in a professional tone about testing');
      expect(genericTonePatterns.some(p => p.pattern === 'generic_tone')).toBe(true);
    });

    it('should provide actionable suggestions and categorize issues by severity', () => {
      const result = optimizer.analyzePrompt('Write about APIs');
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions.every(s => s.length > 0)).toBe(true);

      const criticalResult = optimizer.analyzePrompt('Write a comprehensive guide');
      const critical = criticalResult.issues.filter(i => i.severity === 'critical');
      const warnings = criticalResult.issues.filter(i => i.severity === 'warning');
      expect(critical.length + warnings.length).toBeGreaterThan(0);
    });

    it('should score prompts with quality indicators appropriately', () => {
      const comparisons = [
        {
          without: 'Write about performance optimization',
          with: 'Write about reducing latency from 500ms to 50ms with caching',
          label: 'metrics'
        },
        {
          without: 'Write about authentication',
          with: 'Write about OAuth 2.0 and JWT authentication',
          label: 'specific technologies'
        },
        {
          without: 'Write about database design',
          with: 'Write about database design, moreover ensure seamless integration',
          label: 'banned phrases (inverse)',
          inverse: true
        }
      ];

      comparisons.forEach(({ without, with: withFeature, label, inverse }) => {
        const score1 = optimizer.scorePromptQuality(without);
        const score2 = optimizer.scorePromptQuality(withFeature);

        if (inverse) {
          expect(score1, `failed for ${label}`).toBeGreaterThan(score2);
        } else {
          expect(score2, `failed for ${label}`).toBeGreaterThan(score1);
        }
      });
    });

    it('should handle edge case prompts gracefully', () => {
      const emptyResult = optimizer.analyzePrompt('');
      expect(emptyResult.score).toBe(0);
      expect(emptyResult.issues.length).toBeGreaterThan(0);

      const longPrompt = 'Write about '.repeat(1000) + 'testing';
      const longResult = optimizer.analyzePrompt(longPrompt);
      expect(longResult.score).toBeDefined();
      expect(longResult.score).toBeGreaterThanOrEqual(0);
      expect(longResult.score).toBeLessThanOrEqual(100);
    });

    it('should identify anti-pattern locations', () => {
      const patterns = optimizer.detectAntiPatterns('Use cutting-edge technology and seamless integration');
      expect(patterns.length).toBeGreaterThan(0);
      const triggerWordPatterns = patterns.filter(p => p.pattern === 'ai_trigger_word');
      expect(triggerWordPatterns.every(p => p.locations.length > 0)).toBe(true);
    });
  });

  describe('Optimization Strategies', () => {
    it('should apply various optimization strategies', async () => {
      const testCases = [
        {
          prompt: 'Write about authentication',
          checks: [
            { fn: (r: any) => r.optimizedPrompt !== r.originalPrompt, desc: 'adds specificity' },
            { fn: (r: any) => r.improvements.some(i => i.type === 'specificity'), desc: 'tracks specificity improvement' },
            { fn: (r: any) => r.score.after > r.score.before, desc: 'improves score' }
          ]
        },
        {
          prompt: 'Write an article about security',
          checks: [
            { fn: (r: any) => r.improvements.some(i => i.type === 'constraints'), desc: 'adds constraints' },
            { fn: (r: any) => r.optimizedPrompt.toLowerCase().includes('avoid'), desc: 'includes AIWG constraints' }
          ]
        },
        {
          prompt: 'Write a comprehensive guide using robust solutions',
          checks: [
            { fn: (r: any) => r.improvements.some(i => i.description.includes('vague')), desc: 'detects vagueness' },
            { fn: (r: any) => !r.optimizedPrompt.includes('comprehensive'), desc: 'removes filler words' }
          ]
        },
        {
          prompt: 'Write about microservices',
          checks: [
            { fn: (r: any) => r.improvements.some(i => i.type === 'anti_pattern' || i.type === 'specificity'), desc: 'fixes vague requests' },
            { fn: (r: any) => r.score.after > r.score.before, desc: 'improves score for vague prompts' }
          ]
        },
        {
          prompt: 'Write a comprehensive and robust article',
          checks: [
            { fn: (r: any) => !r.optimizedPrompt.toLowerCase().includes('comprehensive'), desc: 'removes "comprehensive"' },
            { fn: (r: any) => !r.optimizedPrompt.toLowerCase().includes('robust'), desc: 'removes "robust"' }
          ]
        }
      ];

      for (const { prompt, checks } of testCases) {
        const result = await optimizer.optimize(prompt);
        checks.forEach(({ fn, desc }) => {
          expect(fn(result), `${desc} for: "${prompt}"`).toBe(true);
        });
      }
    });

    it('should inject examples and voice guidance based on context', async () => {
      const examplesResult = await optimizer.optimize('Explain JWT tokens', { domain: 'technical' });
      expect(examplesResult.improvements.some(i => i.type === 'examples')).toBe(true);
      expect(examplesResult.optimizedPrompt).toContain('example');

      const voiceContexts = [
        { voice: 'technical', prompt: 'Write about databases', expectedText: 'technical' },
        { voice: 'academic', prompt: 'Analyze social media impact', expectedText: 'academic' },
        { voice: 'executive', prompt: 'Write brief about cloud migration', expectedText: 'executive' }
      ];

      for (const { voice, prompt, expectedText } of voiceContexts) {
        const result = await optimizer.optimize(prompt, { voice });
        expect(result.improvements.some(i => i.type === 'voice'), `failed for voice: ${voice}`).toBe(true);
        expect(result.optimizedPrompt.toLowerCase(), `failed to find text for: ${voice}`).toContain(expectedText);
      }
    });

    it('should preserve good parts of original prompt and avoid duplication', async () => {
      const original = 'Write a 1500-word article for senior developers about OAuth 2.0';
      const result = await optimizer.optimize(original);
      expect(result.optimizedPrompt).toContain('1500-word');
      expect(result.optimizedPrompt).toContain('senior developers');
      expect(result.optimizedPrompt).toContain('OAuth 2.0');

      const wordCountResult = await optimizer.optimize('Write about testing', { targetLength: 2000 });
      expect(wordCountResult.optimizedPrompt).toContain('2000');

      const duplicateTest = `Write about APIs
Requirements:
- Avoid "seamlessly"
- Include examples`;
      const duplicateResult = await optimizer.optimize(duplicateTest);
      const requirementsCount = (duplicateResult.optimizedPrompt.match(/Requirements:/g) || []).length;
      expect(requirementsCount).toBeLessThanOrEqual(1);
    });

    it('should add domain-specific constraints based on context', async () => {
      const domainTests = [
        { domain: 'technical', prompt: 'Write about security', expectedText: 'implementation' },
        { domain: 'academic', prompt: 'Analyze topic', expectedText: 'cite' },
        { domain: 'executive', prompt: 'Write brief', expectedText: 'impact' }
      ];

      for (const { domain, prompt, expectedText } of domainTests) {
        const result = await optimizer.optimize(prompt, { domain });
        expect(result.optimizedPrompt.toLowerCase(), `failed for domain: ${domain}`).toContain(expectedText);
      }
    });

    it('should generate detailed reasoning and track improvements', async () => {
      const result = await optimizer.optimize('Write about APIs');
      expect(result.reasoning).toBeTruthy();
      expect(result.reasoning.length).toBeGreaterThan(50);
      expect(result.reasoning).toContain('score');

      const types = new Set(result.improvements.map(i => i.type));
      expect(types.size).toBeGreaterThan(0);

      const impactResult = await optimizer.optimize('Write a comprehensive article');
      expect(impactResult.improvements.every(i => ['high', 'medium', 'low'].includes(i.impact))).toBe(true);
    });

    it('should handle already-optimized prompts with minimal changes', async () => {
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

    it('should preserve special formatting and provide before/after snippets', async () => {
      const prompt = `Write about authentication
\`\`\`javascript
const token = jwt.sign(payload, secret);
\`\`\``;
      const result = await optimizer.optimize(prompt);
      expect(result.optimizedPrompt).toContain('```');
      expect(result.optimizedPrompt).toContain('jwt.sign');

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
    it('should analyze before/after differences and improvements', () => {
      const testCases = [
        {
          original: 'Write about authentication',
          optimized: `Write a 1500-word article about OAuth 2.0 authentication for senior developers.

Requirements:
- Avoid AI patterns
- Include code examples`,
          checks: [
            { fn: (c: any) => c.differences.length > 0, desc: 'shows differences' },
            { fn: (c: any) => c.improvement > 0, desc: 'quantifies improvement' }
          ]
        },
        {
          original: 'Write about testing',
          optimized: `Write about integration testing with pytest

Requirements:
- Avoid "comprehensive"
- Include code examples`,
          checks: [
            { fn: (c: any) => c.differences.some(d => d.type === 'added'), desc: 'lists specific improvements' }
          ]
        },
        {
          original: 'Write a comprehensive, robust guide',
          optimized: 'Write a detailed guide about specific topic',
          checks: [
            { fn: (c: any) => c.differences.some(d => d.type === 'modified'), desc: 'highlights removed anti-patterns' }
          ]
        },
        {
          original: 'Write about databases',
          optimized: 'Write a 1500-word article about PostgreSQL indexing for DBAs',
          checks: [
            { fn: (c: any) => c.summary && c.summary.length > 20, desc: 'generates summary' }
          ]
        }
      ];

      testCases.forEach(({ original, optimized, checks }) => {
        const comparison = optimizer.comparePrompts(original, optimized);
        checks.forEach(({ fn, desc }) => {
          expect(fn(comparison), `${desc} for comparison`).toBe(true);
        });
      });
    });

    it('should track section changes (added/removed/modified)', () => {
      const changeTests = [
        {
          original: 'Write about APIs',
          optimized: `Write about APIs

Requirements:
- Avoid AI patterns`,
          type: 'added',
          label: 'added sections'
        },
        {
          original: `Write about APIs
Use comprehensive approach`,
          optimized: 'Write about APIs',
          type: 'removed',
          label: 'removed sections'
        },
        {
          original: 'Write about authentication',
          optimized: 'Write about OAuth 2.0 authentication',
          type: 'modified',
          label: 'modified sections'
        }
      ];

      changeTests.forEach(({ original, optimized, type, label }) => {
        const comparison = optimizer.comparePrompts(original, optimized);
        const changes = comparison.differences.filter(d => d.type === type);
        expect(changes.length, `failed for ${label}`).toBeGreaterThan(0);
      });
    });

    it('should provide reasons for all changes', () => {
      const original = 'Write comprehensive guide';
      const optimized = 'Write detailed guide with examples';

      const comparison = optimizer.comparePrompts(original, optimized);
      expect(comparison.differences.every(d => d.reason.length > 0)).toBe(true);
    });
  });

  describe('Batch Optimization', () => {
    it('should optimize multiple prompts in parallel and handle mixed quality', async () => {
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

      const mixedPrompts = [
        'Write about APIs', // vague
        'Write a 1500-word technical article about GraphQL for senior developers' // specific
      ];

      const mixedResults = await optimizer.optimizeBatch(mixedPrompts);
      const scores = Array.from(mixedResults.values()).map(r => r.score.before);
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
    it('should handle prompts with special formatting and characters', async () => {
      const edgeCases = [
        { prompt: 'Write about C++ & Rust: performance comparison', expected: ['C++', 'Rust'], label: 'special characters' },
        { prompt: `Write about testing

Must include:
- Unit tests
- Integration tests`, expected: ['Unit tests'], label: 'multi-line prompts' },
        { prompt: 'Write about https://api.example.com REST API', expected: ['https://api.example.com'], label: 'URLs' },
        { prompt: 'Write about reducing latency from 500ms to 50ms', expected: ['500ms', '50ms'], label: 'numbers' },
        { prompt: `Write about security:
• Authentication
• Authorization
• Encryption`, expected: ['•'], label: 'bullet points' },
        { prompt: 'Write about testing with émojis 🚀', expected: ['🚀'], label: 'unicode' }
      ];

      for (const { prompt, expected, label } of edgeCases) {
        const result = await optimizer.optimize(prompt);
        expected.forEach(exp => {
          expect(result.optimizedPrompt, `failed for ${label}: missing "${exp}"`).toContain(exp);
        });
      }
    });

    it('should handle very short prompts and mixed case', async () => {
      const shortResult = await optimizer.optimize('APIs');
      expect(shortResult.optimizedPrompt.length).toBeGreaterThan(10);
      expect(shortResult.score.after).toBeGreaterThan(shortResult.score.before);

      const mixedCasePrompt = 'WRITE ABOUT TESTING';
      const mixedCaseResult = await optimizer.optimize(mixedCasePrompt);
      expect(mixedCaseResult.optimizedPrompt).toBeTruthy();
    });

    it('should handle undefined and empty context gracefully', async () => {
      const contexts = [
        { context: undefined, label: 'undefined context' },
        { context: {}, label: 'empty context' }
      ];

      for (const { context, label } of contexts) {
        const result = await optimizer.optimize('Write about testing', context);
        expect(result, `failed for ${label}`).toBeTruthy();
        expect(result.score.after, `failed score check for ${label}`).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Scoring Consistency', () => {
    it('should produce consistent scores for same prompt', () => {
      const prompt = 'Write about databases';
      const score1 = optimizer.scorePromptQuality(prompt);
      const score2 = optimizer.scorePromptQuality(prompt);
      expect(score1).toBe(score2);
    });

    it('should enforce score boundaries (0-100)', () => {
      const worst = 'Write a comprehensive robust cutting-edge seamless innovative solution moreover furthermore';
      const worstScore = optimizer.scorePromptQuality(worst);
      expect(worstScore).toBeGreaterThanOrEqual(0);

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

      const bestScore = optimizer.scorePromptQuality(best);
      expect(bestScore).toBeLessThanOrEqual(100);
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
