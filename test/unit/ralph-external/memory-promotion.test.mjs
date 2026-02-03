/**
 * Tests for Memory Promotion Pipeline
 *
 * @implements @.aiwg/working/issue-ralph-external-completion.md Section L3
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';
import { MemoryPromotion } from '../../../tools/ralph-external/lib/memory-promotion.mjs';
import { SemanticMemory } from '../../../tools/ralph-external/lib/semantic-memory.mjs';

const TEST_DIR = join(process.cwd(), '.test-promotion');

describe('MemoryPromotion', () => {
  let promotion;
  let semanticMemory;

  beforeEach(() => {
    // Clean test directory
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });

    promotion = new MemoryPromotion(TEST_DIR);
    semanticMemory = new SemanticMemory(TEST_DIR);
  });

  afterEach(() => {
    // Cleanup
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  describe('Staging Area', () => {
    it('should initialize staging area', () => {
      const staging = promotion.loadStaging();

      expect(staging.version).toBe('1.0.0');
      expect(staging.staged).toEqual([]);
    });

    it('should create staging file', () => {
      promotion.loadStaging();
      const stagingPath = join(TEST_DIR, 'staging.json');
      expect(existsSync(stagingPath)).toBe(true);
    });

    it('should persist across instances', () => {
      const staging = promotion.loadStaging();
      staging.staged.push({
        id: 'stage-1',
        learning: { type: 'strategy' },
        status: 'pending',
      });
      promotion.saveStaging(staging);

      const promotion2 = new MemoryPromotion(TEST_DIR);
      const staging2 = promotion2.loadStaging();

      expect(staging2.staged.length).toBe(1);
    });
  });

  describe('Extraction', () => {
    it('should extract learnings from loop state', () => {
      const loopState = {
        loopId: 'loop-001',
        objective: 'Fix failing tests',
        status: 'completed',
        currentIteration: 2,
        iterations: [
          {
            number: 1,
            status: 'completed',
            duration: 5000,
            analysis: { progressMade: true },
            learnings: ['Used test-driven approach'],
            filesModified: ['test/auth.test.js'],
          },
        ],
      };

      const result = promotion.extract(loopState);

      expect(result.extracted).toBeGreaterThan(0);
      expect(result.staged).toBe(result.extracted);
    });

    it('should stage all extracted learnings', () => {
      const loopState = {
        loopId: 'loop-001',
        objective: 'Implement feature',
        status: 'completed',
        currentIteration: 3,
        iterations: [
          {
            number: 1,
            status: 'completed',
            duration: 5000,
            analysis: { progressMade: true },
            learnings: ['Incremental approach'],
          },
          {
            number: 2,
            status: 'failed',
            duration: 4000,
            analysis: { errors: ['Syntax error'] },
          },
          {
            number: 3,
            status: 'failed',
            duration: 3000,
            analysis: { errors: ['Syntax error'] },
          },
        ],
      };

      promotion.extract(loopState);

      const staging = promotion.loadStaging();
      expect(staging.staged.length).toBeGreaterThan(0);
      expect(staging.staged.every(s => s.status === 'pending')).toBe(true);
    });
  });

  describe('Validation', () => {
    it('should validate required fields', () => {
      const result = promotion.validate({
        type: 'strategy',
        taskType: 'test-fix',
        content: { description: 'Test' },
        confidence: 0.8,
        successRate: 0.9,
        sourceLoops: [],
      });

      expect(result.valid).toBe(true);
    });

    it('should reject missing required fields', () => {
      const result = promotion.validate({
        type: 'strategy',
        // missing taskType
        content: { description: 'Test' },
        confidence: 0.8,
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/missing required fields/i);
    });

    it('should reject invalid type', () => {
      const result = promotion.validate({
        type: 'invalid-type',
        taskType: 'test-fix',
        content: {},
        confidence: 0.5,
        successRate: 0.5,
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/invalid type/i);
    });

    it('should reject confidence out of range', () => {
      const result = promotion.validate({
        type: 'strategy',
        taskType: 'test-fix',
        content: {},
        confidence: 1.5,
        successRate: 0.5,
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/confidence/i);
    });

    it('should reject low confidence', () => {
      const result = promotion.validate({
        type: 'strategy',
        taskType: 'test-fix',
        content: {},
        confidence: 0.2,
        successRate: 0.5,
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/confidence too low/i);
    });

    it('should validate antipatterns have low success rate', () => {
      const result = promotion.validate({
        type: 'antipattern',
        taskType: 'bug-fix',
        content: {},
        confidence: 0.7,
        successRate: 0.8, // Too high for antipattern
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/anti-patterns/i);
    });

    it('should validate strategies have reasonable success rate', () => {
      const result = promotion.validate({
        type: 'strategy',
        taskType: 'test-fix',
        content: {},
        confidence: 0.8,
        successRate: 0.3, // Too low for strategy
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/strategies/i);
    });
  });

  describe('Validate Staged', () => {
    it('should validate pending learnings', () => {
      const staging = promotion.loadStaging();

      staging.staged.push({
        id: 'stage-1',
        learning: {
          type: 'strategy',
          taskType: 'test-fix',
          content: {},
          confidence: 0.8,
          successRate: 0.9,
          sourceLoops: [],
        },
        status: 'pending',
        stagedAt: new Date().toISOString(),
      });

      promotion.saveStaging(staging);

      const result = promotion.validateStaged();

      expect(result.validated).toBe(1);
      expect(result.rejected).toBe(0);

      const staging2 = promotion.loadStaging();
      expect(staging2.staged[0].status).toBe('validated');
    });

    it('should reject invalid learnings', () => {
      const staging = promotion.loadStaging();

      staging.staged.push({
        id: 'stage-1',
        learning: {
          type: 'strategy',
          taskType: 'test-fix',
          content: {},
          confidence: 0.1, // Too low
          successRate: 0.9,
          sourceLoops: [],
        },
        status: 'pending',
        stagedAt: new Date().toISOString(),
      });

      promotion.saveStaging(staging);

      const result = promotion.validateStaged();

      expect(result.validated).toBe(0);
      expect(result.rejected).toBe(1);

      const staging2 = promotion.loadStaging();
      expect(staging2.staged[0].status).toBe('rejected');
      expect(staging2.staged[0].rejectionReason).toBeTruthy();
    });
  });

  describe('Promotion', () => {
    it('should promote validated learnings to semantic memory', () => {
      const staging = promotion.loadStaging();

      staging.staged.push({
        id: 'stage-1',
        learning: {
          type: 'strategy',
          taskType: 'test-fix',
          content: { description: 'TDD approach' },
          confidence: 0.8,
          successRate: 0.9,
          sourceLoops: ['loop-001'],
        },
        status: 'validated',
        stagedAt: new Date().toISOString(),
      });

      promotion.saveStaging(staging);

      const result = promotion.promote({ autoValidate: false, clearAfter: true });

      expect(result.promoted).toBe(1);
      expect(result.skipped).toBe(0);

      // Verify in semantic memory
      const stored = semanticMemory.query({ type: 'strategy' });
      expect(stored.length).toBe(1);
      expect(stored[0].content.description).toBe('TDD approach');
    });

    it('should auto-validate before promotion', () => {
      const staging = promotion.loadStaging();

      staging.staged.push({
        id: 'stage-1',
        learning: {
          type: 'strategy',
          taskType: 'test-fix',
          content: {},
          confidence: 0.8,
          successRate: 0.9,
          sourceLoops: [],
        },
        status: 'pending', // Not yet validated
        stagedAt: new Date().toISOString(),
      });

      promotion.saveStaging(staging);

      const result = promotion.promote({ autoValidate: true, clearAfter: true });

      expect(result.promoted).toBe(1);
    });

    it('should clear staging after promotion', () => {
      const staging = promotion.loadStaging();

      staging.staged.push({
        id: 'stage-1',
        learning: {
          type: 'strategy',
          taskType: 'test-fix',
          content: {},
          confidence: 0.8,
          successRate: 0.9,
          sourceLoops: [],
        },
        status: 'validated',
        stagedAt: new Date().toISOString(),
      });

      promotion.saveStaging(staging);

      promotion.promote({ autoValidate: false, clearAfter: true });

      const staging2 = promotion.loadStaging();
      expect(staging2.staged.length).toBe(0);
    });

    it('should not clear if clearAfter is false', () => {
      const staging = promotion.loadStaging();

      staging.staged.push({
        id: 'stage-1',
        learning: {
          type: 'strategy',
          taskType: 'test-fix',
          content: {},
          confidence: 0.8,
          successRate: 0.9,
          sourceLoops: [],
        },
        status: 'validated',
        stagedAt: new Date().toISOString(),
      });

      promotion.saveStaging(staging);

      promotion.promote({ autoValidate: false, clearAfter: false });

      const staging2 = promotion.loadStaging();
      expect(staging2.staged.length).toBe(1);
    });
  });

  describe('Full Pipeline', () => {
    it('should process entire pipeline', () => {
      const loopState = {
        loopId: 'loop-001',
        objective: 'Fix failing tests',
        status: 'completed',
        currentIteration: 2,
        iterations: [
          {
            number: 1,
            status: 'completed',
            duration: 5000,
            analysis: { progressMade: true },
            learnings: ['Test-driven development'],
            filesModified: ['test.js'],
          },
        ],
      };

      const result = promotion.processPipeline(loopState);

      expect(result.extracted).toBeGreaterThan(0);
      expect(result.promoted).toBeGreaterThan(0);

      // Verify learnings are in semantic memory
      const stored = semanticMemory.query({});
      expect(stored.length).toBeGreaterThan(0);
    });
  });

  describe('Statistics', () => {
    it('should return staging statistics', () => {
      const staging = promotion.loadStaging();

      staging.staged.push(
        {
          id: 'stage-1',
          learning: { type: 'strategy' },
          status: 'pending',
        },
        {
          id: 'stage-2',
          learning: { type: 'antipattern' },
          status: 'validated',
        },
        {
          id: 'stage-3',
          learning: { type: 'estimate' },
          status: 'rejected',
        }
      );

      promotion.saveStaging(staging);

      const stats = promotion.getStagingStats();

      expect(stats.total).toBe(3);
      expect(stats.pending).toBe(1);
      expect(stats.validated).toBe(1);
      expect(stats.rejected).toBe(1);
    });
  });

  describe('Clear Staging', () => {
    it('should clear all staged learnings', () => {
      const staging = promotion.loadStaging();
      staging.staged.push({ id: 'stage-1', learning: {}, status: 'pending' });
      promotion.saveStaging(staging);

      promotion.clearStaging();

      const staging2 = promotion.loadStaging();
      expect(staging2.staged.length).toBe(0);
    });
  });
});
