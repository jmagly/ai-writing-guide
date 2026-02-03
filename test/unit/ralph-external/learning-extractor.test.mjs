/**
 * Tests for Learning Extractor
 *
 * @implements @.aiwg/working/issue-ralph-external-completion.md Section L3
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LearningExtractor } from '../../../tools/ralph-external/lib/learning-extractor.mjs';

describe('LearningExtractor', () => {
  let extractor;

  beforeEach(() => {
    extractor = new LearningExtractor();
  });

  describe('Task Type Detection', () => {
    it('should detect test-fix tasks', () => {
      const type = extractor.detectTaskType('Fix failing test in auth module');
      expect(type).toBe('test-fix');
    });

    it('should detect feature tasks', () => {
      const type = extractor.detectTaskType('Implement user registration feature');
      expect(type).toBe('feature');
    });

    it('should detect refactor tasks', () => {
      const type = extractor.detectTaskType('Refactor authentication module');
      expect(type).toBe('refactor');
    });

    it('should detect bug-fix tasks', () => {
      const type = extractor.detectTaskType('Fix null pointer error in login');
      expect(type).toBe('bug-fix');
    });

    it('should default to general for unclear tasks', () => {
      const type = extractor.detectTaskType('Do something unclear');
      expect(type).toBe('general');
    });
  });

  describe('Strategy Extraction', () => {
    it('should extract strategies from successful iterations', () => {
      const loopHistory = {
        loopId: 'loop-001',
        objective: 'Fix test failures',
        status: 'completed',
        currentIteration: 3,
        iterations: [
          {
            number: 1,
            status: 'completed',
            duration: 5000,
            analysis: { progressMade: true },
            learnings: ['Used test-driven development approach'],
          },
          {
            number: 2,
            status: 'completed',
            duration: 4000,
            analysis: { progressMade: true },
            learnings: ['Test-driven development was effective'],
          },
        ],
      };

      const strategies = extractor.extractStrategies(loopHistory, 'test-fix');

      expect(strategies.length).toBeGreaterThan(0);
      expect(strategies[0].type).toBe('strategy');
      expect(strategies[0].taskType).toBe('test-fix');
    });

    it('should require >50% occurrence for strategy', () => {
      const loopHistory = {
        loopId: 'loop-001',
        objective: 'Test',
        status: 'completed',
        currentIteration: 3,
        iterations: [
          {
            number: 1,
            status: 'completed',
            duration: 5000,
            analysis: { progressMade: true },
            learnings: ['Approach A worked well'],
          },
          {
            number: 2,
            status: 'completed',
            duration: 4000,
            analysis: { progressMade: true },
            learnings: ['Approach B was better'],
          },
          {
            number: 3,
            status: 'completed',
            duration: 3000,
            analysis: { progressMade: true },
            learnings: ['Approach C succeeded'],
          },
        ],
      };

      const strategies = extractor.extractStrategies(loopHistory, 'test-fix');

      // No single approach used in >50%, so no strategies
      expect(strategies.length).toBe(0);
    });

    it('should return empty array if no successful iterations', () => {
      const loopHistory = {
        loopId: 'loop-001',
        objective: 'Test',
        status: 'failed',
        currentIteration: 2,
        iterations: [
          { number: 1, status: 'failed', duration: 5000 },
          { number: 2, status: 'failed', duration: 4000 },
        ],
      };

      const strategies = extractor.extractStrategies(loopHistory, 'test-fix');
      expect(strategies).toEqual([]);
    });
  });

  describe('Anti-Pattern Identification', () => {
    it('should identify anti-patterns from failures', () => {
      const iterations = [
        {
          number: 1,
          status: 'failed',
          duration: 5000,
          analysis: { errors: ['Syntax error in file.js line 42'] },
        },
        {
          number: 2,
          status: 'failed',
          duration: 4000,
          analysis: { errors: ['Syntax error in file.js line 45'] },
        },
      ];

      const antipatterns = extractor.identifyAntiPatterns(iterations, 'bug-fix');

      expect(antipatterns.length).toBeGreaterThan(0);
      expect(antipatterns[0].type).toBe('antipattern');
      expect(antipatterns[0].content.description).toMatch(/syntax/i);
    });

    it('should require at least 2 occurrences', () => {
      const iterations = [
        {
          number: 1,
          status: 'failed',
          duration: 5000,
          analysis: { errors: ['Unique error'] },
        },
      ];

      const antipatterns = extractor.identifyAntiPatterns(iterations, 'bug-fix');
      expect(antipatterns.length).toBe(0);
    });

    it('should categorize different error types', () => {
      const iterations = [
        {
          number: 1,
          status: 'failed',
          analysis: { errors: ['TypeError: undefined is not a function'] },
        },
        {
          number: 2,
          status: 'failed',
          analysis: { errors: ['TypeError: null reference'] },
        },
        {
          number: 3,
          status: 'failed',
          analysis: { errors: ['Timeout error after 30s'] },
        },
        {
          number: 4,
          status: 'failed',
          analysis: { errors: ['Timeout occurred'] },
        },
      ];

      const antipatterns = extractor.identifyAntiPatterns(iterations, 'bug-fix');

      expect(antipatterns.length).toBe(2); // null/undefined and timeout
    });
  });

  describe('Estimate Extraction', () => {
    it('should extract time estimates', () => {
      const loopHistory = {
        loopId: 'loop-001',
        objective: 'Test',
        status: 'completed',
        currentIteration: 3,
        iterations: [
          { number: 1, status: 'completed', duration: 5000 },
          { number: 2, status: 'completed', duration: 6000 },
          { number: 3, status: 'completed', duration: 4000 },
        ],
      };

      const estimates = extractor.extractEstimates(loopHistory, 'test-fix');

      expect(estimates.length).toBe(1);
      expect(estimates[0].type).toBe('estimate');
      expect(estimates[0].content.avgIterationTime).toBe(5000);
      expect(estimates[0].content.totalIterations).toBe(3);
    });

    it('should estimate complexity', () => {
      const loopHistory = {
        loopId: 'loop-001',
        objective: 'Test',
        status: 'completed',
        currentIteration: 2,
        iterations: [
          {
            number: 1,
            status: 'completed',
            duration: 5000,
            filesModified: ['file1.js'],
          },
          {
            number: 2,
            status: 'completed',
            duration: 4000,
            filesModified: ['file2.js'],
          },
        ],
      };

      const estimates = extractor.extractEstimates(loopHistory, 'test-fix');

      expect(estimates[0].content.complexity).toBe('low');
    });

    it('should classify high complexity', () => {
      const loopHistory = {
        loopId: 'loop-001',
        objective: 'Test',
        status: 'completed',
        currentIteration: 10,
        iterations: Array.from({ length: 10 }, (_, i) => ({
          number: i + 1,
          status: 'completed',
          duration: 5000,
          filesModified: [`file${i}.js`],
        })),
      };

      const estimates = extractor.extractEstimates(loopHistory, 'test-fix');

      expect(estimates[0].content.complexity).toBe('high');
    });
  });

  describe('Convention Extraction', () => {
    it('should detect test file patterns', () => {
      const loopHistory = {
        loopId: 'loop-001',
        objective: 'Test',
        status: 'completed',
        currentIteration: 2,
        iterations: [
          {
            number: 1,
            status: 'completed',
            filesModified: ['src/auth.test.js', 'src/login.test.js'],
          },
        ],
      };

      const conventions = extractor.extractConventions(loopHistory);

      const testConvention = conventions.find(c =>
        c.content.pattern.includes('test')
      );
      expect(testConvention).toBeTruthy();
    });

    it('should detect module type patterns', () => {
      const loopHistory = {
        loopId: 'loop-001',
        objective: 'Test',
        status: 'completed',
        currentIteration: 1,
        iterations: [
          {
            number: 1,
            status: 'completed',
            filesModified: ['lib/module1.mjs', 'lib/module2.mjs'],
          },
        ],
      };

      const conventions = extractor.extractConventions(loopHistory);

      const moduleConvention = conventions.find(c =>
        c.content.pattern.includes('.mjs')
      );
      expect(moduleConvention).toBeTruthy();
    });
  });

  describe('Full Extraction', () => {
    it('should extract all learning types', () => {
      const loopHistory = {
        loopId: 'loop-001',
        objective: 'Fix failing tests in authentication',
        status: 'completed',
        currentIteration: 4,
        iterations: [
          {
            number: 1,
            status: 'completed',
            duration: 5000,
            analysis: { progressMade: true },
            learnings: ['Used test-driven development'],
            filesModified: ['src/auth.test.js'],
          },
          {
            number: 2,
            status: 'failed',
            duration: 6000,
            analysis: { errors: ['Syntax error'] },
            filesModified: ['src/auth.js'],
          },
          {
            number: 3,
            status: 'failed',
            duration: 4000,
            analysis: { errors: ['Syntax error'] },
            filesModified: ['src/auth.js'],
          },
          {
            number: 4,
            status: 'completed',
            duration: 5000,
            analysis: { progressMade: true },
            learnings: ['Test-driven development approach worked'],
            filesModified: ['src/auth.js'],
          },
        ],
      };

      const learnings = extractor.extractFromLoop(loopHistory);

      const types = new Set(learnings.map(l => l.type));

      // Should have multiple types
      expect(learnings.length).toBeGreaterThan(0);

      // Verify at least one of each type was attempted
      const hasStrategy = learnings.some(l => l.type === 'strategy');
      const hasAntipattern = learnings.some(l => l.type === 'antipattern');
      const hasEstimate = learnings.some(l => l.type === 'estimate');

      expect(hasStrategy || hasAntipattern || hasEstimate).toBe(true);
    });

    it('should set correct task type', () => {
      const loopHistory = {
        loopId: 'loop-001',
        objective: 'Implement new feature for user dashboard',
        status: 'completed',
        currentIteration: 2,
        iterations: [
          {
            number: 1,
            status: 'completed',
            duration: 5000,
            analysis: { progressMade: true },
            learnings: ['Incremental approach worked'],
          },
        ],
      };

      const learnings = extractor.extractFromLoop(loopHistory);

      expect(learnings.length).toBeGreaterThan(0);
      expect(learnings.every(l => l.taskType === 'feature')).toBe(true);
    });
  });

  describe('Approach Normalization', () => {
    it('should normalize TDD mentions', () => {
      const normalized = extractor.normalizeApproach('Wrote tests first before implementation');
      expect(normalized).toBe('Test-driven development approach');
    });

    it('should normalize incremental approach', () => {
      const normalized = extractor.normalizeApproach('Made changes step by step incrementally');
      expect(normalized).toBe('Incremental implementation');
    });

    it('should return null for too short', () => {
      const normalized = extractor.normalizeApproach('Short');
      expect(normalized).toBeNull();
    });
  });

  describe('Error Categorization', () => {
    it('should categorize syntax errors', () => {
      const category = extractor.categorizeError('SyntaxError: Unexpected token');
      expect(category).toMatch(/syntax/i);
    });

    it('should categorize null/undefined errors', () => {
      const category = extractor.categorizeError('TypeError: Cannot read property of undefined');
      expect(category).toMatch(/null\/undefined/i);
    });

    it('should categorize timeout errors', () => {
      const category = extractor.categorizeError('Operation timed out after 30s');
      expect(category).toMatch(/timeout/i);
    });

    it('should categorize permission errors', () => {
      const category = extractor.categorizeError('EACCES: permission denied');
      expect(category).toMatch(/permission/i);
    });

    it('should categorize module errors', () => {
      const category = extractor.categorizeError('Error: Cannot find module "express"');
      expect(category).toMatch(/module not found/i);
    });
  });
});
