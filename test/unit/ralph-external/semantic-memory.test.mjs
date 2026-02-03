/**
 * Tests for L3 Semantic Memory
 *
 * @implements @.aiwg/working/issue-ralph-external-completion.md Section L3
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { SemanticMemory } from '../../../tools/ralph-external/lib/semantic-memory.mjs';

const TEST_DIR = join(process.cwd(), '.test-knowledge');

describe('SemanticMemory', () => {
  let memory;

  beforeEach(() => {
    // Clean test directory
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });

    memory = new SemanticMemory(TEST_DIR);
  });

  afterEach(() => {
    // Cleanup
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  describe('Initialization', () => {
    it('should create knowledge directory', () => {
      expect(existsSync(TEST_DIR)).toBe(true);
    });

    it('should initialize empty store', () => {
      const store = memory.load();
      expect(store.version).toBe('1.0.0');
      expect(store.learnings).toEqual([]);
      expect(store.stats.totalLearnings).toBe(0);
    });

    it('should create store file', () => {
      memory.load();
      const storePath = join(TEST_DIR, 'ralph-learnings.json');
      expect(existsSync(storePath)).toBe(true);
    });
  });

  describe('Store Operations', () => {
    it('should store a learning', () => {
      const learning = memory.store('strategy', 'test-fix', {
        description: 'Test-driven development',
        effectiveness: 0.85,
      }, {
        confidence: 0.8,
        sourceLoops: ['loop-001'],
        successRate: 0.9,
      });

      expect(learning.id).toMatch(/^learn-/);
      expect(learning.type).toBe('strategy');
      expect(learning.taskType).toBe('test-fix');
      expect(learning.confidence).toBe(0.8);
      expect(learning.successRate).toBe(0.9);
    });

    it('should persist learnings across instances', () => {
      memory.store('strategy', 'test-fix', { description: 'TDD' });

      const memory2 = new SemanticMemory(TEST_DIR);
      const store = memory2.load();

      expect(store.learnings.length).toBe(1);
      expect(store.learnings[0].content.description).toBe('TDD');
    });

    it('should use default confidence if not provided', () => {
      const learning = memory.store('strategy', 'feature', { description: 'Incremental' });
      expect(learning.confidence).toBe(0.5);
    });

    it('should initialize useCount to 0', () => {
      const learning = memory.store('antipattern', 'bug-fix', { description: 'Avoid X' });
      expect(learning.useCount).toBe(0);
    });
  });

  describe('Retrieve Operations', () => {
    it('should retrieve learning by ID', () => {
      const stored = memory.store('strategy', 'test-fix', { description: 'TDD' });
      const retrieved = memory.retrieve(stored.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved.id).toBe(stored.id);
      expect(retrieved.content.description).toBe('TDD');
    });

    it('should increment useCount on retrieve', () => {
      const stored = memory.store('strategy', 'test-fix', { description: 'TDD' });

      memory.retrieve(stored.id);
      memory.retrieve(stored.id);

      const retrieved = memory.retrieve(stored.id);
      expect(retrieved.useCount).toBe(3);
    });

    it('should return null for non-existent ID', () => {
      const retrieved = memory.retrieve('learn-nonexistent');
      expect(retrieved).toBeNull();
    });
  });

  describe('Query Operations', () => {
    beforeEach(() => {
      // Populate with test data
      memory.store('strategy', 'test-fix', { description: 'Strategy 1' }, {
        confidence: 0.8,
        successRate: 0.9,
      });
      memory.store('strategy', 'feature', { description: 'Strategy 2' }, {
        confidence: 0.6,
        successRate: 0.7,
      });
      memory.store('antipattern', 'test-fix', { description: 'Anti 1' }, {
        confidence: 0.7,
        successRate: 0.1,
      });
    });

    it('should filter by type', () => {
      const results = memory.query({ type: 'strategy' });
      expect(results.length).toBe(2);
      expect(results.every(r => r.type === 'strategy')).toBe(true);
    });

    it('should filter by taskType', () => {
      const results = memory.query({ taskType: 'test-fix' });
      expect(results.length).toBe(2);
      expect(results.every(r => r.taskType === 'test-fix')).toBe(true);
    });

    it('should filter by minConfidence', () => {
      const results = memory.query({ minConfidence: 0.75 });
      expect(results.length).toBe(1);
      expect(results[0].confidence).toBeGreaterThanOrEqual(0.75);
    });

    it('should filter by minSuccessRate', () => {
      const results = memory.query({ minSuccessRate: 0.5 });
      expect(results.length).toBe(2);
      expect(results.every(r => r.successRate >= 0.5)).toBe(true);
    });

    it('should combine multiple filters', () => {
      const results = memory.query({
        type: 'strategy',
        taskType: 'test-fix',
        minConfidence: 0.7,
      });

      expect(results.length).toBe(1);
      expect(results[0].type).toBe('strategy');
      expect(results[0].taskType).toBe('test-fix');
    });

    it('should limit results', () => {
      const results = memory.query({ type: 'strategy', limit: 1 });
      expect(results.length).toBe(1);
    });

    it('should sort by weighted relevance', () => {
      // Add more test data to verify sorting
      memory.store('strategy', 'test-fix', { description: 'High use' }, {
        confidence: 0.7,
        successRate: 0.8,
      });

      // Simulate high use count
      const store = memory.load();
      store.learnings[3].useCount = 10;
      memory.save(store);

      const results = memory.query({ type: 'strategy' });

      // High use count should rank higher
      expect(results[0].useCount).toBe(10);
    });
  });

  describe('Update Operations', () => {
    it('should update learning fields', () => {
      const stored = memory.store('strategy', 'test-fix', { description: 'Original' });

      memory.update(stored.id, {
        confidence: 0.95,
        successRate: 0.88,
      });

      const updated = memory.retrieve(stored.id);
      expect(updated.confidence).toBe(0.95);
      expect(updated.successRate).toBe(0.88);
    });

    it('should update timestamp', async () => {
      const stored = memory.store('strategy', 'test-fix', { description: 'Test' });
      const originalTime = stored.updatedAt;

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));

      memory.update(stored.id, { confidence: 0.9 });
      const updated = memory.retrieve(stored.id);
      expect(updated.updatedAt).not.toBe(originalTime);
    });

    it('should not update immutable fields', () => {
      const stored = memory.store('strategy', 'test-fix', { description: 'Test' });

      memory.update(stored.id, {
        id: 'learn-hacked',
        createdAt: '2020-01-01',
        sourceLoops: ['loop-999'],
      });

      const updated = memory.retrieve(stored.id);
      expect(updated.id).toBe(stored.id);
      expect(updated.createdAt).toBe(stored.createdAt);
      expect(updated.sourceLoops).toEqual(stored.sourceLoops);
    });

    it('should return null for non-existent ID', () => {
      const result = memory.update('learn-nonexistent', { confidence: 0.9 });
      expect(result).toBeNull();
    });
  });

  describe('Delete Operations', () => {
    it('should delete learning by ID', () => {
      const stored = memory.store('strategy', 'test-fix', { description: 'Test' });

      const deleted = memory.delete(stored.id);
      expect(deleted).toBe(true);

      const retrieved = memory.retrieve(stored.id);
      expect(retrieved).toBeNull();
    });

    it('should return false for non-existent ID', () => {
      const deleted = memory.delete('learn-nonexistent');
      expect(deleted).toBe(false);
    });

    it('should update stats after deletion', () => {
      memory.store('strategy', 'test-fix', { description: 'Test 1' });
      const learning2 = memory.store('strategy', 'test-fix', { description: 'Test 2' });

      memory.delete(learning2.id);

      const stats = memory.getStats();
      expect(stats.totalSize).toBe(1);
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      memory.store('strategy', 'test-fix', { description: 'S1' }, {
        confidence: 0.8,
        successRate: 0.9,
      });
      memory.store('antipattern', 'bug-fix', { description: 'A1' }, {
        confidence: 0.6,
        successRate: 0.2,
      });
    });

    it('should return correct stats', () => {
      const stats = memory.getStats();

      expect(stats.totalSize).toBe(2);
      expect(stats.totalLearnings).toBe(2);
      expect(stats.byType.strategy).toBe(1);
      expect(stats.byType.antipattern).toBe(1);
    });

    it('should calculate average confidence', () => {
      const stats = memory.getStats();
      expect(stats.averageConfidence).toBeCloseTo(0.7, 1);
    });

    it('should calculate average success rate', () => {
      const stats = memory.getStats();
      expect(stats.averageSuccessRate).toBeCloseTo(0.55, 1);
    });

    it('should identify most used learning', () => {
      const stored = memory.store('strategy', 'test-fix', { description: 'Popular' });

      memory.retrieve(stored.id);
      memory.retrieve(stored.id);

      const stats = memory.getStats();
      expect(stats.mostUsedLearning.id).toBe(stored.id);
      expect(stats.mostUsedLearning.useCount).toBe(2);
    });
  });

  describe('Checksum Validation', () => {
    it('should calculate checksum on save', () => {
      memory.store('strategy', 'test-fix', { description: 'Test' });
      const store = memory.load();
      expect(store.checksum).toBeTruthy();
      expect(store.checksum.length).toBe(64); // SHA-256 hex length
    });

    it('should recover from backup if corruption detected', () => {
      memory.store('strategy', 'test-fix', { description: 'Test' });

      // Create second entry to trigger backup
      memory.store('strategy', 'feature', { description: 'Test2' });

      // Corrupt main file
      const storePath = join(TEST_DIR, 'ralph-learnings.json');
      const content = readFileSync(storePath, 'utf8');
      const corrupted = content.replace('Test', 'Corrupted');
      writeFileSync(storePath, corrupted);

      // Should recover from backup (will log warning)
      const store = memory.load();
      expect(store.learnings.length).toBeGreaterThan(0);
    });

    it('should handle completely corrupted file', () => {
      memory.store('strategy', 'test-fix', { description: 'Test' });

      // Corrupt file completely (no valid JSON)
      const storePath = join(TEST_DIR, 'ralph-learnings.json');
      writeFileSync(storePath, 'NOT JSON');

      // Should throw since backup doesn't exist or is also corrupted
      expect(() => memory.load()).toThrow(/Failed to load/);
    });
  });

  describe('Verify Integrity', () => {
    it('should verify valid store', () => {
      memory.store('strategy', 'test-fix', { description: 'Test' });
      const result = memory.verify();
      expect(result.valid).toBe(true);
    });

    it('should detect corrupted store', () => {
      memory.store('strategy', 'test-fix', { description: 'Test' });

      // Create backup so load succeeds
      memory.store('strategy', 'feature', { description: 'Test2' });

      // Corrupt main file
      const storePath = join(TEST_DIR, 'ralph-learnings.json');
      const content = readFileSync(storePath, 'utf8');
      writeFileSync(storePath, content.replace('Test', 'Corrupted'));

      // verify() will load from backup, which is valid
      // To actually test corruption detection, we need to corrupt both
      const backupPath = `${storePath}.bak`;
      writeFileSync(backupPath, content.replace('Test', 'Corrupted'));

      const result = memory.verify();
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/checksum/i);
    });
  });

  describe('Clear Operations', () => {
    it('should clear all learnings', () => {
      memory.store('strategy', 'test-fix', { description: 'Test1' });
      memory.store('strategy', 'feature', { description: 'Test2' });

      memory.clear();

      const store = memory.load();
      expect(store.learnings.length).toBe(0);
      expect(store.stats.totalLearnings).toBe(0);
    });
  });
});
