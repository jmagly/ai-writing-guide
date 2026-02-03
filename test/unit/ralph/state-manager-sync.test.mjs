/**
 * Multi-Loop State Manager Tests (Synchronous)
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MultiLoopStateManager } from '../../../tools/ralph/state-manager-sync.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_DIR = path.join(__dirname, '.tmp-state-sync');

describe('MultiLoopStateManager (Sync)', () => {
  let manager;

  beforeEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });
    manager = new MultiLoopStateManager(TEST_DIR);
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
  });

  it('should create loop with generated ID', () => {
    const result = manager.createLoop({
      task: 'Fix tests',
      completion: 'npm test passes',
      maxIterations: 10,
    });

    assert.ok(result.loopId);
    assert.ok(result.loopId.startsWith('ralph-fix-tests-'));
    assert.ok(result.state);
    assert.strictEqual(result.state.task, 'Fix tests');
  });

  it('should create isolated loop directory', () => {
    const result = manager.createLoop({
      task: 'Test task',
      completion: 'done',
    });

    const loopDir = path.join(TEST_DIR, '.aiwg', 'ralph', 'loops', result.loopId);
    assert.ok(fs.existsSync(loopDir));
    assert.ok(fs.existsSync(path.join(loopDir, 'state.json')));
  });

  it('should create subdirectories for loop artifacts', () => {
    const result = manager.createLoop({
      task: 'Test task',
      completion: 'done',
    });

    const loopDir = path.join(TEST_DIR, '.aiwg', 'ralph', 'loops', result.loopId);
    assert.ok(fs.existsSync(path.join(loopDir, 'iterations')));
    assert.ok(fs.existsSync(path.join(loopDir, 'checkpoints')));
    assert.ok(fs.existsSync(path.join(loopDir, 'debug-memory')));
  });

  it('should enforce MAX_CONCURRENT_LOOPS', () => {
    manager.createLoop({ task: 'Task 1', completion: 'done' });
    manager.createLoop({ task: 'Task 2', completion: 'done' });
    manager.createLoop({ task: 'Task 3', completion: 'done' });
    manager.createLoop({ task: 'Task 4', completion: 'done' });

    assert.throws(() => {
      manager.createLoop({ task: 'Task 5', completion: 'done' });
    }, /Cannot create loop.*max: 4/);
  });

  it('should maintain separate state files per loop', () => {
    const loop1 = manager.createLoop({
      task: 'Task 1',
      completion: 'done',
    });
    const loop2 = manager.createLoop({
      task: 'Task 2',
      completion: 'done',
    });

    manager.updateLoopState(loop1.loopId, { currentIteration: 5 });

    const state1 = manager.getLoopState(loop1.loopId);
    const state2 = manager.getLoopState(loop2.loopId);

    assert.strictEqual(state1.currentIteration, 5);
    assert.strictEqual(state2.currentIteration, 0);
  });

  it('should handle iteration artifacts separately', () => {
    const loop1 = manager.createLoop({ task: 'Task 1', completion: 'done' });
    const loop2 = manager.createLoop({ task: 'Task 2', completion: 'done' });

    manager.saveIteration(loop1.loopId, 1, { data: 'loop1-iter1' });
    manager.saveIteration(loop2.loopId, 1, { data: 'loop2-iter1' });

    const data1 = manager.loadIteration(loop1.loopId, 1);
    const data2 = manager.loadIteration(loop2.loopId, 1);

    assert.strictEqual(data1.data, 'loop1-iter1');
    assert.strictEqual(data2.data, 'loop2-iter1');
  });

  it('should list all active loops', () => {
    manager.createLoop({ task: 'Task 1', completion: 'done' });
    manager.createLoop({ task: 'Task 2', completion: 'done' });

    const loops = manager.listActiveLoops();
    assert.strictEqual(loops.length, 2);
  });

  it('should get specific loop state', () => {
    const result = manager.createLoop({
      task: 'Test task',
      completion: 'test passes',
    });

    const state = manager.getLoopState(result.loopId);
    assert.strictEqual(state.task, 'Test task');
    assert.strictEqual(state.completion, 'test passes');
  });

  it('should update loop state', () => {
    const result = manager.createLoop({
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

  it('should archive completed loop', () => {
    const result = manager.createLoop({
      task: 'Test task',
      completion: 'done',
    });

    manager.archiveLoop(result.loopId);

    const archiveDir = path.join(
      TEST_DIR,
      '.aiwg',
      'ralph',
      'archive',
      result.loopId
    );
    assert.ok(fs.existsSync(archiveDir));

    const loopDir = path.join(
      TEST_DIR,
      '.aiwg',
      'ralph',
      'loops',
      result.loopId
    );
    assert.ok(!fs.existsSync(loopDir));
  });

  it('should unregister loop on archive', () => {
    const result = manager.createLoop({
      task: 'Test task',
      completion: 'done',
    });

    manager.archiveLoop(result.loopId);

    const loops = manager.listActiveLoops();
    assert.strictEqual(loops.length, 0);
  });

  it('should detect single loop scenario', () => {
    const result = manager.createLoop({
      task: 'Only loop',
      completion: 'done',
    });

    const detected = manager.detectSingleLoop();
    assert.ok(detected);
    assert.strictEqual(detected.loopId, result.loopId);
  });

  it('should return null when multiple loops exist', () => {
    manager.createLoop({ task: 'Task 1', completion: 'done' });
    manager.createLoop({ task: 'Task 2', completion: 'done' });

    const detected = manager.detectSingleLoop();
    assert.strictEqual(detected, null);
  });

  it('should throw on invalid loop ID', () => {
    assert.throws(() => {
      manager.getLoopState('nonexistent-loop');
    }, /Loop not found/);
  });

  it('should throw on archive non-existent loop', () => {
    assert.throws(() => {
      manager.archiveLoop('nonexistent-loop');
    }, /Loop not found/);
  });
});
