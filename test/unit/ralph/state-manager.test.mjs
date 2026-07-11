/**
 * Multi-Loop State Manager Tests
 * Tests for loop-scoped state isolation
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import { strict as assert } from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MultiLoopStateManager } from '../../../tools/ralph/state-manager.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_DIR = path.join(__dirname, '.tmp-state');

describe('MultiLoopStateManager', async () => {
  let manager;

  beforeEach(() => {
    // Clean test directory
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });

    manager = new MultiLoopStateManager(TEST_DIR);
  });

  afterEach(() => {
    // Cleanup
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
  });

  describe('loop creation', async () => {
    it('should create loop with generated ID', async () => {
      const result = await manager.createLoop({
        task: 'Fix tests',
        completion: 'npm test passes',
        maxIterations: 10,
      });

      assert.ok(result.loopId);
      assert.ok(result.loopId.startsWith('ralph-fix-tests-'));
      assert.ok(result.state);
      assert.strictEqual(result.state.task, 'Fix tests');
    });

    it('should create isolated loop directory', async () => {
      const result = await manager.createLoop({
        task: 'Test task',
        completion: 'done',
      });

      const loopDir = path.join(TEST_DIR, '.aiwg', 'ralph', 'loops', result.loopId);
      assert.ok(fs.existsSync(loopDir));
      assert.ok(fs.existsSync(path.join(loopDir, 'state.json')));
    });

    it('should create subdirectories for loop artifacts', async () => {
      const result = await manager.createLoop({
        task: 'Test task',
        completion: 'done',
      });

      const loopDir = path.join(TEST_DIR, '.aiwg', 'ralph', 'loops', result.loopId);
      assert.ok(fs.existsSync(path.join(loopDir, 'iterations')));
      assert.ok(fs.existsSync(path.join(loopDir, 'checkpoints')));
      assert.ok(fs.existsSync(path.join(loopDir, 'debug-memory')));
    });

    it('should enforce MAX_CONCURRENT_LOOPS', async () => {
      // Create 4 loops
      await manager.createLoop({ task: 'Task 1', completion: 'done' });
      await manager.createLoop({ task: 'Task 2', completion: 'done' });
      await manager.createLoop({ task: 'Task 3', completion: 'done' });
      await manager.createLoop({ task: 'Task 4', completion: 'done' });

      // 5th rejects — createLoop awaits the async registry MAX check (#1777)
      await assert.rejects(
        () => manager.createLoop({ task: 'Task 5', completion: 'done' }),
        /Cannot create loop.*max: 4/,
      );
    });
  });

  describe('state isolation', async () => {
    it('should maintain separate state files per loop', async () => {
      const loop1 = await manager.createLoop({
        task: 'Task 1',
        completion: 'done',
      });
      const loop2 = await manager.createLoop({
        task: 'Task 2',
        completion: 'done',
      });

      // Update loop1 state
      manager.updateLoopState(loop1.loopId, { currentIteration: 5 });

      // Verify loop2 state is unaffected
      const state1 = manager.getLoopState(loop1.loopId);
      const state2 = manager.getLoopState(loop2.loopId);

      assert.strictEqual(state1.currentIteration, 5);
      assert.strictEqual(state2.currentIteration, 0);
    });

    it('should handle iteration artifacts separately', async () => {
      const loop1 = await manager.createLoop({ task: 'Task 1', completion: 'done' });
      const loop2 = await manager.createLoop({ task: 'Task 2', completion: 'done' });

      const iter1Path = path.join(
        TEST_DIR,
        '.aiwg',
        'ralph',
        'loops',
        loop1.loopId,
        'iterations',
        'iteration-1.json'
      );
      const iter2Path = path.join(
        TEST_DIR,
        '.aiwg',
        'ralph',
        'loops',
        loop2.loopId,
        'iterations',
        'iteration-1.json'
      );

      // Create iteration files
      fs.writeFileSync(iter1Path, JSON.stringify({ loop: loop1.loopId }));
      fs.writeFileSync(iter2Path, JSON.stringify({ loop: loop2.loopId }));

      // Verify isolation
      const data1 = JSON.parse(fs.readFileSync(iter1Path, 'utf8'));
      const data2 = JSON.parse(fs.readFileSync(iter2Path, 'utf8'));

      assert.strictEqual(data1.loop, loop1.loopId);
      assert.strictEqual(data2.loop, loop2.loopId);
    });
  });

  describe('loop management', async () => {
    it('should list all active loops', async () => {
      await manager.createLoop({ task: 'Task 1', completion: 'done' });
      await manager.createLoop({ task: 'Task 2', completion: 'done' });

      const loops = manager.listActiveLoops();
      assert.strictEqual(loops.length, 2);
    });

    it('should get specific loop state', async () => {
      const result = await manager.createLoop({
        task: 'Test task',
        completion: 'test passes',
      });

      const state = manager.getLoopState(result.loopId);
      assert.strictEqual(state.task, 'Test task');
      assert.strictEqual(state.completion, 'test passes');
    });

    it('should update loop state', async () => {
      const result = await manager.createLoop({
        task: 'Test task',
        completion: 'done',
      });

      manager.updateLoopState(result.loopId, {
        currentIteration: 5,
        status: 'paused',
      });

      const state = manager.getLoopState(result.loopId);
      assert.strictEqual(state.currentIteration, 5);
      assert.strictEqual(state.status, 'paused');
    });
  });

  describe('loop archival', async () => {
    it('should archive completed loop', async () => {
      const result = await manager.createLoop({
        task: 'Test task',
        completion: 'done',
      });

      await manager.archiveLoop(result.loopId);

      // Should exist in archive
      const archiveDir = path.join(
        TEST_DIR,
        '.aiwg',
        'ralph',
        'archive',
        result.loopId
      );
      assert.ok(fs.existsSync(archiveDir));

      // Should not exist in active loops
      const loopDir = path.join(
        TEST_DIR,
        '.aiwg',
        'ralph',
        'loops',
        result.loopId
      );
      assert.ok(!fs.existsSync(loopDir));
    });

    it('should unregister loop on archive', async () => {
      const result = await manager.createLoop({
        task: 'Test task',
        completion: 'done',
      });

      await manager.archiveLoop(result.loopId);

      const loops = manager.listActiveLoops();
      assert.strictEqual(loops.length, 0);
    });
  });

  describe('backward compatibility', async () => {
    it('should detect single loop scenario', async () => {
      const result = await manager.createLoop({
        task: 'Only loop',
        completion: 'done',
      });

      const detected = manager.detectSingleLoop();
      assert.ok(detected);
      assert.strictEqual(detected.loopId, result.loopId);
    });

    it('should return null when multiple loops exist', async () => {
      await manager.createLoop({ task: 'Task 1', completion: 'done' });
      await manager.createLoop({ task: 'Task 2', completion: 'done' });

      const detected = manager.detectSingleLoop();
      assert.strictEqual(detected, null);
    });
  });

  describe('error handling', async () => {
    it('should throw on invalid loop ID', async () => {
      assert.throws(() => {
        manager.getLoopState('nonexistent-loop');
      }, /Loop not found/);
    });

    it('should throw on archive non-existent loop', async () => {
      // archiveLoop is async now — a synchronous throw inside surfaces as a
      // rejection (#1777)
      await assert.rejects(
        () => manager.archiveLoop('nonexistent-loop'),
        /Loop not found/,
      );
    });
  });
});
