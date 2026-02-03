/**
 * Tests for Memory Retrieval
 *
 * @implements @.aiwg/working/issue-ralph-external-completion.md Section L3
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';
import { MemoryRetrieval } from '../../../tools/ralph-external/lib/memory-retrieval.mjs';
import { SemanticMemory } from '../../../tools/ralph-external/lib/semantic-memory.mjs';

const TEST_DIR = join(process.cwd(), '.test-retrieval');

describe('MemoryRetrieval', () => {
  let retrieval;
  let memory;

  beforeEach(() => {
    // Clean test directory
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });

    memory = new SemanticMemory(TEST_DIR);
    retrieval = new MemoryRetrieval(TEST_DIR);

    // Populate with test data
    memory.store('strategy', 'test-fix', {
      description: 'Use test-driven development',
      effectiveness: 0.9,
    }, {
      confidence: 0.8,
      successRate: 0.9,
      sourceLoops: ['loop-001'],
    });

    memory.store('antipattern', 'test-fix', {
      description: 'Avoid: Syntax errors - check code carefully',
      occurrences: 3,
    }, {
      confidence: 0.7,
      successRate: 0.1,
    });

    memory.store('estimate', 'test-fix', {
      avgIterationTime: 5000,
      totalIterations: 3,
      complexity: 'medium',
    }, {
      confidence: 0.6,
      successRate: 0.8,
    });

    memory.store('convention', 'general', {
      pattern: 'Tests in test/ directory',
      examples: ['test/auth.test.js'],
    }, {
      confidence: 0.8,
      successRate: 1.0,
    });
  });

  afterEach(() => {
    // Cleanup
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  describe('Task Type Detection', () => {
    it('should detect test-fix tasks', () => {
      const type = retrieval.detectTaskType('Fix failing test');
      expect(type).toBe('test-fix');
    });

    it('should detect feature tasks', () => {
      const type = retrieval.detectTaskType('Implement user registration');
      expect(type).toBe('feature');
    });

    it('should detect bug-fix tasks', () => {
      const type = retrieval.detectTaskType('Fix crash in login');
      expect(type).toBe('bug-fix');
    });

    it('should default to general', () => {
      const type = retrieval.detectTaskType('Do something');
      expect(type).toBe('general');
    });
  });

  describe('Get Relevant Knowledge', () => {
    it('should retrieve strategies for task type', () => {
      const knowledge = retrieval.getRelevantKnowledge({
        objective: 'Fix failing authentication tests',
        taskType: 'test-fix',
      });

      expect(knowledge.strategies.length).toBeGreaterThan(0);
      expect(knowledge.strategies[0].type).toBe('strategy');
    });

    it('should retrieve anti-patterns for task type', () => {
      const knowledge = retrieval.getRelevantKnowledge({
        objective: 'Fix failing tests',
        taskType: 'test-fix',
      });

      expect(knowledge.antipatterns.length).toBeGreaterThan(0);
      expect(knowledge.antipatterns[0].type).toBe('antipattern');
    });

    it('should retrieve estimates for task type', () => {
      const knowledge = retrieval.getRelevantKnowledge({
        objective: 'Fix tests',
        taskType: 'test-fix',
      });

      expect(knowledge.estimates.length).toBeGreaterThan(0);
      expect(knowledge.estimates[0].type).toBe('estimate');
    });

    it('should retrieve conventions', () => {
      const knowledge = retrieval.getRelevantKnowledge({
        objective: 'Fix tests',
        taskType: 'test-fix',
      });

      expect(knowledge.conventions.length).toBeGreaterThan(0);
      expect(knowledge.conventions[0].type).toBe('convention');
    });

    it('should auto-detect task type from objective', () => {
      const knowledge = retrieval.getRelevantKnowledge({
        objective: 'Fix failing test in auth module',
        // No explicit taskType
      });

      expect(knowledge.strategies.length).toBeGreaterThan(0);
    });

    it('should generate formatted summary', () => {
      const knowledge = retrieval.getRelevantKnowledge({
        objective: 'Fix tests',
        taskType: 'test-fix',
      });

      expect(knowledge.summary).toBeTruthy();
      expect(knowledge.summary).toMatch(/Knowledge Base/);
    });
  });

  describe('Get Anti-Patterns', () => {
    it('should retrieve anti-patterns for task type', () => {
      const antipatterns = retrieval.getAntiPatterns({
        objective: 'Fix tests',
        taskType: 'test-fix',
      });

      expect(antipatterns.length).toBeGreaterThan(0);
      expect(antipatterns[0].type).toBe('antipattern');
    });

    it('should boost anti-patterns matching error patterns', () => {
      // Add more anti-patterns
      memory.store('antipattern', 'test-fix', {
        description: 'Avoid: Timeout errors',
      }, {
        confidence: 0.5,
        successRate: 0.0,
      });

      const antipatterns = retrieval.getAntiPatterns({
        objective: 'Fix tests',
        taskType: 'test-fix',
        errorPatterns: ['timeout', 'timed out'],
      });

      // Timeout anti-pattern should be boosted
      expect(antipatterns.length).toBeGreaterThan(0);
    });

    it('should limit results', () => {
      // Add many anti-patterns
      for (let i = 0; i < 10; i++) {
        memory.store('antipattern', 'test-fix', {
          description: `Avoid pattern ${i}`,
        }, {
          confidence: 0.6,
          successRate: 0.0,
        });
      }

      const antipatterns = retrieval.getAntiPatterns({
        objective: 'Fix tests',
        taskType: 'test-fix',
      });

      expect(antipatterns.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Get File Conventions', () => {
    it('should retrieve all conventions if no file patterns', () => {
      const conventions = retrieval.getFileConventions([]);
      expect(conventions.length).toBeGreaterThan(0);
    });

    it('should filter by file patterns', () => {
      memory.store('convention', 'general', {
        pattern: 'Source in src/ directory',
        examples: ['src/auth.js'],
      }, {
        confidence: 0.8,
        successRate: 1.0,
      });

      const conventions = retrieval.getFileConventions(['test']);

      // Should only return test-related convention
      expect(conventions.length).toBeGreaterThan(0);
      expect(conventions.some(c => c.content.pattern.includes('test'))).toBe(true);
    });
  });

  describe('Get Estimate', () => {
    it('should retrieve estimate for task type', () => {
      const estimate = retrieval.getEstimate('test-fix', 'medium');

      expect(estimate).not.toBeNull();
      expect(estimate.type).toBe('estimate');
      expect(estimate.content.complexity).toBe('medium');
    });

    it('should return highest confidence if no complexity match', () => {
      const estimate = retrieval.getEstimate('test-fix', 'high');

      // No high complexity estimate, should return best available
      expect(estimate).not.toBeNull();
    });

    it('should return null if no estimates', () => {
      const estimate = retrieval.getEstimate('nonexistent-type', 'medium');

      expect(estimate).toBeNull();
    });
  });

  describe('Format Summary', () => {
    it('should include strategies section', () => {
      const knowledge = {
        strategies: [{
          content: {
            description: 'TDD approach',
            effectiveness: 0.85,
          },
        }],
        antipatterns: [],
        estimates: [],
        conventions: [],
      };

      const summary = retrieval.formatSummary(knowledge);

      expect(summary).toMatch(/Proven Strategies/);
      expect(summary).toMatch(/TDD approach/);
      expect(summary).toMatch(/85%/);
    });

    it('should include anti-patterns section', () => {
      const knowledge = {
        strategies: [],
        antipatterns: [{
          content: {
            description: 'Avoid syntax errors',
          },
        }],
        estimates: [],
        conventions: [],
      };

      const summary = retrieval.formatSummary(knowledge);

      expect(summary).toMatch(/Anti-Patterns to Avoid/);
      expect(summary).toMatch(/syntax errors/);
    });

    it('should include estimates section', () => {
      const knowledge = {
        strategies: [],
        antipatterns: [],
        estimates: [{
          content: {
            avgIterationTime: 5000,
            totalIterations: 3,
          },
        }],
        conventions: [],
      };

      const summary = retrieval.formatSummary(knowledge);

      expect(summary).toMatch(/Time\/Iteration Estimates/);
      expect(summary).toMatch(/3 iterations/);
    });

    it('should include conventions section', () => {
      const knowledge = {
        strategies: [],
        antipatterns: [],
        estimates: [],
        conventions: [{
          content: {
            pattern: 'Tests in test/ directory',
            examples: ['test/auth.test.js'],
          },
        }],
      };

      const summary = retrieval.formatSummary(knowledge);

      expect(summary).toMatch(/Project Conventions/);
      expect(summary).toMatch(/test\/ directory/);
    });

    it('should return message if no knowledge', () => {
      const knowledge = {
        strategies: [],
        antipatterns: [],
        estimates: [],
        conventions: [],
      };

      const summary = retrieval.formatSummary(knowledge);

      expect(summary).toMatch(/No relevant learnings/);
    });
  });

  describe('Calculate Relevance', () => {
    it('should score based on confidence', () => {
      const learning = {
        type: 'strategy',
        taskType: 'test-fix',
        confidence: 0.8,
        successRate: 0.5,
        updatedAt: new Date().toISOString(),
      };

      const score = retrieval.calculateRelevance(learning, {
        objective: 'Fix tests',
        taskType: 'test-fix',
      });

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should boost task type match', () => {
      const learning = {
        type: 'strategy',
        taskType: 'test-fix',
        confidence: 0.5,
        successRate: 0.5,
        updatedAt: new Date().toISOString(),
      };

      const matchScore = retrieval.calculateRelevance(learning, {
        objective: 'Fix tests',
        taskType: 'test-fix',
      });

      const noMatchScore = retrieval.calculateRelevance(learning, {
        objective: 'Implement feature',
        taskType: 'feature',
      });

      expect(matchScore).toBeGreaterThan(noMatchScore);
    });

    it('should include success rate', () => {
      const highSuccess = {
        type: 'strategy',
        taskType: 'test-fix',
        confidence: 0.5,
        successRate: 0.9,
        updatedAt: new Date().toISOString(),
      };

      const lowSuccess = {
        ...highSuccess,
        successRate: 0.3,
      };

      const context = { objective: 'Test', taskType: 'test-fix' };

      const highScore = retrieval.calculateRelevance(highSuccess, context);
      const lowScore = retrieval.calculateRelevance(lowSuccess, context);

      expect(highScore).toBeGreaterThan(lowScore);
    });

    it('should favor recent learnings', () => {
      const recent = {
        type: 'strategy',
        taskType: 'test-fix',
        confidence: 0.5,
        successRate: 0.5,
        updatedAt: new Date().toISOString(),
      };

      const old = {
        ...recent,
        updatedAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(), // 100 days ago
      };

      const context = { objective: 'Test', taskType: 'test-fix' };

      const recentScore = retrieval.calculateRelevance(recent, context);
      const oldScore = retrieval.calculateRelevance(old, context);

      expect(recentScore).toBeGreaterThan(oldScore);
    });
  });

  describe('Get Top Learnings', () => {
    it('should return top learnings by relevance', () => {
      const top = retrieval.getTopLearnings({
        objective: 'Fix failing tests',
        taskType: 'test-fix',
      }, 2);

      expect(top.length).toBeLessThanOrEqual(2);
      expect(top[0].relevance).toBeGreaterThanOrEqual(top[top.length - 1].relevance);
    });

    it('should sort by relevance', () => {
      // Add more learnings
      for (let i = 0; i < 5; i++) {
        memory.store('strategy', 'test-fix', {
          description: `Strategy ${i}`,
        }, {
          confidence: Math.random(),
          successRate: Math.random(),
        });
      }

      const top = retrieval.getTopLearnings({
        objective: 'Fix tests',
        taskType: 'test-fix',
      });

      // Verify sorted
      for (let i = 1; i < top.length; i++) {
        expect(top[i - 1].relevance).toBeGreaterThanOrEqual(top[i].relevance);
      }
    });

    it('should respect limit', () => {
      for (let i = 0; i < 20; i++) {
        memory.store('strategy', 'test-fix', { description: `S${i}` });
      }

      const top = retrieval.getTopLearnings({
        objective: 'Fix tests',
        taskType: 'test-fix',
      }, 5);

      expect(top.length).toBe(5);
    });
  });
});
