/**
 * Loop Registry Tests
 * Tests for multi-loop registry management
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import { strict as assert } from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { LoopRegistry } from '../../../tools/ralph/registry.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_DIR = path.join(__dirname, '.tmp-registry');
const TEST_REGISTRY_PATH = path.join(TEST_DIR, 'registry.json');

describe('LoopRegistry', () => {
  let registry;

  beforeEach(() => {
    // Clean test directory
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });

    registry = new LoopRegistry(TEST_DIR);
  });

  afterEach(() => {
    // Cleanup
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
  });

  describe('initialization', () => {
    it('should create registry file on first access', () => {
      registry.load();
      assert.ok(fs.existsSync(TEST_REGISTRY_PATH));
    });

    it('should initialize with default structure', () => {
      const data = registry.load();
      assert.strictEqual(data.version, '2.0.0');
      assert.strictEqual(data.max_concurrent_loops, 4);
      assert.ok(Array.isArray(data.active_loops));
      assert.strictEqual(data.active_loops.length, 0);
    });
  });

  describe('loop registration', () => {
    it('should register a new loop', () => {
      const loopId = 'ralph-test-loop-abc123';
      const config = {
        task_summary: 'Test task',
        status: 'running',
        owner: 'test-agent',
      };

      registry.register(loopId, config);

      const data = registry.load();
      assert.strictEqual(data.active_loops.length, 1);
      assert.strictEqual(data.active_loops[0].loop_id, loopId);
      assert.strictEqual(data.active_loops[0].task_summary, 'Test task');
    });

    it('should track multiple loops', () => {
      registry.register('ralph-loop-1-abc', { task_summary: 'Task 1' });
      registry.register('ralph-loop-2-def', { task_summary: 'Task 2' });
      registry.register('ralph-loop-3-ghi', { task_summary: 'Task 3' });

      const data = registry.load();
      assert.strictEqual(data.active_loops.length, 3);
      assert.strictEqual(data.total_active, 3);
    });

    it('should enforce MAX_CONCURRENT_LOOPS limit', () => {
      // Register 4 loops (at limit)
      registry.register('ralph-loop-1-abc', { task_summary: 'Task 1' });
      registry.register('ralph-loop-2-def', { task_summary: 'Task 2' });
      registry.register('ralph-loop-3-ghi', { task_summary: 'Task 3' });
      registry.register('ralph-loop-4-jkl', { task_summary: 'Task 4' });

      // 5th should throw
      assert.throws(() => {
        registry.register('ralph-loop-5-mno', { task_summary: 'Task 5' });
      }, /Cannot create loop.*max: 4/);
    });

    it('should allow override with force flag', () => {
      // Register 4 loops
      registry.register('ralph-loop-1-abc', { task_summary: 'Task 1' });
      registry.register('ralph-loop-2-def', { task_summary: 'Task 2' });
      registry.register('ralph-loop-3-ghi', { task_summary: 'Task 3' });
      registry.register('ralph-loop-4-jkl', { task_summary: 'Task 4' });

      // 5th with force should succeed
      registry.register('ralph-loop-5-mno', { task_summary: 'Task 5' }, { force: true });

      const data = registry.load();
      assert.strictEqual(data.active_loops.length, 5);
    });
  });

  describe('loop unregistration', () => {
    it('should unregister a loop', () => {
      registry.register('ralph-loop-1-abc', { task_summary: 'Task 1' });
      registry.register('ralph-loop-2-def', { task_summary: 'Task 2' });

      registry.unregister('ralph-loop-1-abc');

      const data = registry.load();
      assert.strictEqual(data.active_loops.length, 1);
      assert.strictEqual(data.active_loops[0].loop_id, 'ralph-loop-2-def');
    });

    it('should increment completed count on unregister', () => {
      registry.register('ralph-loop-1-abc', { task_summary: 'Task 1' });
      registry.unregister('ralph-loop-1-abc');

      const data = registry.load();
      assert.strictEqual(data.total_completed, 1);
    });
  });

  describe('loop queries', () => {
    beforeEach(() => {
      registry.register('ralph-loop-1-abc', {
        task_summary: 'Task 1',
        status: 'running',
      });
      registry.register('ralph-loop-2-def', {
        task_summary: 'Task 2',
        status: 'paused',
      });
    });

    it('should get loop by ID', () => {
      const loop = registry.get('ralph-loop-1-abc');
      assert.ok(loop);
      assert.strictEqual(loop.loop_id, 'ralph-loop-1-abc');
      assert.strictEqual(loop.task_summary, 'Task 1');
    });

    it('should return null for non-existent loop', () => {
      const loop = registry.get('ralph-nonexistent');
      assert.strictEqual(loop, null);
    });

    it('should list all active loops', () => {
      const loops = registry.listActive();
      assert.strictEqual(loops.length, 2);
    });

    it('should check if loop exists', () => {
      assert.ok(registry.exists('ralph-loop-1-abc'));
      assert.ok(!registry.exists('ralph-nonexistent'));
    });
  });

  describe('concurrency metrics', () => {
    it('should calculate communication paths correctly', () => {
      assert.strictEqual(registry.calculateCommunicationPaths(2), 1);
      assert.strictEqual(registry.calculateCommunicationPaths(3), 3);
      assert.strictEqual(registry.calculateCommunicationPaths(4), 6);
      assert.strictEqual(registry.calculateCommunicationPaths(5), 10);
      assert.strictEqual(registry.calculateCommunicationPaths(7), 21);
    });
  });

  describe('loop ID generation', () => {
    it('should generate valid loop IDs', () => {
      const id1 = registry.generateLoopId('Fix all failing tests');
      const id2 = registry.generateLoopId('Migrate to TypeScript');

      assert.ok(id1.startsWith('ralph-fix-all-failing-tests-'));
      assert.ok(id2.startsWith('ralph-migrate-to-typescript-'));

      // Should be unique
      assert.notStrictEqual(id1, id2);
    });

    it('should sanitize task names', () => {
      const id = registry.generateLoopId('Fix ALL tests!!! (with @special chars)');
      assert.ok(/^ralph-[a-z0-9-]+-[a-f0-9]{8}$/.test(id));
    });

    it('should truncate long task names', () => {
      const longTask = 'A'.repeat(100);
      const id = registry.generateLoopId(longTask);
      const slug = id.split('-').slice(1, -1).join('-');
      assert.ok(slug.length <= 30);
    });
  });

  describe('file locking', () => {
    it('should prevent concurrent modifications', async () => {
      const results = [];

      // Simulate concurrent registrations
      const promises = [
        registry.withLock(() => {
          results.push('A-start');
          return new Promise(resolve => {
            setTimeout(() => {
              results.push('A-end');
              resolve();
            }, 50);
          });
        }),
        registry.withLock(() => {
          results.push('B-start');
          results.push('B-end');
        }),
      ];

      await Promise.all(promises);

      // A should complete before B starts
      assert.deepStrictEqual(results, ['A-start', 'A-end', 'B-start', 'B-end']);
    });

    it('should release lock on error', async () => {
      try {
        await registry.withLock(() => {
          throw new Error('Test error');
        });
      } catch (err) {
        // Expected
      }

      // Should be able to acquire lock again
      await registry.withLock(() => {
        assert.ok(true, 'Lock was released');
      });
    });
  });
});
