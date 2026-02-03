/**
 * Tests for Ralph CLI multi-loop support
 *
 * @module test/unit/ralph/ralph-cli-multiloop
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { MultiLoopStateManager } from '../../../tools/ralph/state-manager-sync.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_DIR = path.join(__dirname, 'test-workspace-cli');
const RALPH_DIR = path.join(TEST_DIR, '.aiwg', 'ralph');

function cleanupTestDir() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

function runCli(args, options = {}) {
  const cliPath = path.join(__dirname, '../../../tools/ralph/ralph-cli.mjs');
  const cmd = `node ${cliPath} ${args}`;

  try {
    const output = execSync(cmd, {
      cwd: TEST_DIR,
      encoding: 'utf8',
      ...options,
    });
    return { success: true, output };
  } catch (err) {
    return { success: false, output: err.stdout || '', error: err.stderr || err.message };
  }
}

function runStatus(args = '', options = {}) {
  const cliPath = path.join(__dirname, '../../../tools/ralph/ralph-status.mjs');
  const cmd = `node ${cliPath} ${args}`;

  try {
    const output = execSync(cmd, {
      cwd: TEST_DIR,
      encoding: 'utf8',
      ...options,
    });
    return { success: true, output };
  } catch (err) {
    return { success: false, output: err.stdout || '', error: err.stderr || err.message };
  }
}

function runAbort(args = '', options = {}) {
  const cliPath = path.join(__dirname, '../../../tools/ralph/ralph-abort.mjs');
  const cmd = `node ${cliPath} ${args}`;

  try {
    const output = execSync(cmd, {
      cwd: TEST_DIR,
      encoding: 'utf8',
      ...options,
    });
    return { success: true, output };
  } catch (err) {
    return { success: false, output: err.stdout || '', error: err.stderr || err.message };
  }
}

function runResume(args = '', options = {}) {
  const cliPath = path.join(__dirname, '../../../tools/ralph/ralph-resume.mjs');
  const cmd = `node ${cliPath} ${args}`;

  try {
    const output = execSync(cmd, {
      cwd: TEST_DIR,
      encoding: 'utf8',
      ...options,
    });
    return { success: true, output };
  } catch (err) {
    return { success: false, output: err.stdout || '', error: err.stderr || err.message };
  }
}

describe('Ralph CLI Multi-Loop Support', () => {
  beforeEach(() => {
    cleanupTestDir();
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    cleanupTestDir();
  });

  describe('ralph list', () => {
    it('should show no loops when none exist', () => {
      const result = runCli('list');

      assert.strictEqual(result.success, true);
      assert.match(result.output, /No active Ralph loops/);
    });

    it('should list all active loops', () => {
      const stateManager = new MultiLoopStateManager(TEST_DIR);

      // Create multiple loops
      stateManager.createLoop({
        task: 'Fix tests',
        completion: 'npm test passes',
        maxIterations: 10,
      });

      stateManager.createLoop({
        task: 'Add coverage',
        completion: 'coverage >= 80%',
        maxIterations: 5,
      });

      const result = runCli('list');

      assert.strictEqual(result.success, true);
      assert.match(result.output, /Active Ralph Loops \(2\/4\)/);
      assert.match(result.output, /Fix tests/);
      assert.match(result.output, /Add coverage/);
    });

    it('should show loop details in list', () => {
      const stateManager = new MultiLoopStateManager(TEST_DIR);

      stateManager.createLoop({
        task: 'Convert to TypeScript',
        completion: 'tsc passes',
        maxIterations: 20,
        priority: 'high',
        tags: ['refactoring', 'typescript'],
      });

      const result = runCli('list');

      assert.strictEqual(result.success, true);
      assert.match(result.output, /Convert to TypeScript/);
      assert.match(result.output, /Priority: high/);
      assert.match(result.output, /Tags: refactoring, typescript/);
    });
  });

  describe('ralph creation with --loop-id', () => {
    it('should create loop with custom loop ID', () => {
      const result = runCli(
        '"Fix tests" --completion "npm test" --loop-id custom-loop-123'
      );

      assert.strictEqual(result.success, true);
      assert.match(result.output, /Loop ID: custom-loop-123/);

      const stateManager = new MultiLoopStateManager(TEST_DIR);
      const state = stateManager.getLoopState('custom-loop-123');

      assert.strictEqual(state.task, 'Fix tests');
    });

    it('should auto-generate loop ID if not provided', () => {
      const result = runCli('"Fix failing tests" --completion "npm test"');

      assert.strictEqual(result.success, true);
      assert.match(result.output, /Loop ID: ralph-fix-failing-tests-/);
    });

    it('should enforce MAX_CONCURRENT_LOOPS', () => {
      const stateManager = new MultiLoopStateManager(TEST_DIR);

      // Create 4 loops (max)
      for (let i = 0; i < 4; i++) {
        stateManager.createLoop({
          task: `Task ${i}`,
          completion: 'done',
          maxIterations: 10,
        });
      }

      // Try to create 5th
      const result = runCli('"Fifth task" --completion "done"');

      assert.strictEqual(result.success, false);
      assert.match(result.error, /4 loops already active/);
      assert.match(result.error, /max: 4/);
    });

    it('should allow --force to override MAX_CONCURRENT_LOOPS', () => {
      const stateManager = new MultiLoopStateManager(TEST_DIR);

      // Create 4 loops
      for (let i = 0; i < 4; i++) {
        stateManager.createLoop({
          task: `Task ${i}`,
          completion: 'done',
          maxIterations: 10,
        });
      }

      // Force create 5th
      const result = runCli('"Fifth task" --completion "done" --force');

      assert.strictEqual(result.success, true);
      assert.match(result.output, /Loop ID: ralph-fifth-task-/);
    });
  });

  describe('ralph-status', () => {
    it('should show message when no loops exist', () => {
      const result = runStatus();

      assert.strictEqual(result.success, true);
      assert.match(result.output, /No Ralph loops found/);
    });

    it('should auto-detect single loop', () => {
      const stateManager = new MultiLoopStateManager(TEST_DIR);
      const { loopId } = stateManager.createLoop({
        task: 'Fix tests',
        completion: 'npm test',
        maxIterations: 10,
      });

      const result = runStatus();

      assert.strictEqual(result.success, true);
      assert.match(result.output, new RegExp(loopId));
      assert.match(result.output, /Fix tests/);
      assert.match(result.output, /Status: RUNNING/);
    });

    it('should require --loop-id when multiple loops exist', () => {
      const stateManager = new MultiLoopStateManager(TEST_DIR);

      stateManager.createLoop({
        task: 'Task 1',
        completion: 'done',
        maxIterations: 10,
      });

      stateManager.createLoop({
        task: 'Task 2',
        completion: 'done',
        maxIterations: 10,
      });

      const result = runStatus();

      assert.strictEqual(result.success, false);
      assert.match(result.error, /Multiple Ralph loops active \(2\)/);
      assert.match(result.error, /Specify --loop-id/);
    });

    it('should show specific loop with --loop-id', () => {
      const stateManager = new MultiLoopStateManager(TEST_DIR);

      const { loopId: loop1 } = stateManager.createLoop({
        task: 'Task 1',
        completion: 'done',
        maxIterations: 10,
      });

      stateManager.createLoop({
        task: 'Task 2',
        completion: 'done',
        maxIterations: 10,
      });

      const result = runStatus(`--loop-id ${loop1}`);

      assert.strictEqual(result.success, true);
      assert.match(result.output, new RegExp(loop1));
      assert.match(result.output, /Task 1/);
      assert.doesNotMatch(result.output, /Task 2/);
    });

    it('should show all loops with --all', () => {
      const stateManager = new MultiLoopStateManager(TEST_DIR);

      stateManager.createLoop({
        task: 'Task 1',
        completion: 'done',
        maxIterations: 10,
      });

      stateManager.createLoop({
        task: 'Task 2',
        completion: 'done',
        maxIterations: 10,
      });

      const result = runStatus('--all');

      assert.strictEqual(result.success, true);
      assert.match(result.output, /All Active Ralph Loops \(2\)/);
      assert.match(result.output, /Task 1/);
      assert.match(result.output, /Task 2/);
    });

    it('should support --json output', () => {
      const stateManager = new MultiLoopStateManager(TEST_DIR);

      const { loopId } = stateManager.createLoop({
        task: 'Test task',
        completion: 'done',
        maxIterations: 10,
      });

      const result = runStatus(`--loop-id ${loopId} --json`);

      assert.strictEqual(result.success, true);

      const data = JSON.parse(result.output);
      assert.strictEqual(data.loopId, loopId);
      assert.strictEqual(data.task, 'Test task');
      assert.strictEqual(data.status, 'running');
    });
  });

  describe('ralph-abort', () => {
    it('should show message when no loops exist', () => {
      const result = runAbort();

      assert.strictEqual(result.success, true);
      assert.match(result.output, /No Ralph loop to abort/);
    });

    it('should auto-detect single loop', () => {
      const stateManager = new MultiLoopStateManager(TEST_DIR);
      const { loopId } = stateManager.createLoop({
        task: 'Fix tests',
        completion: 'npm test',
        maxIterations: 10,
      });

      const result = runAbort();

      assert.strictEqual(result.success, true);
      assert.match(result.output, new RegExp(`Ralph Loop Aborted: ${loopId}`));

      const state = stateManager.getLoopState(loopId);
      assert.strictEqual(state.status, 'aborted');
      assert.strictEqual(state.active, false);
    });

    it('should require --loop-id when multiple loops exist', () => {
      const stateManager = new MultiLoopStateManager(TEST_DIR);

      stateManager.createLoop({
        task: 'Task 1',
        completion: 'done',
        maxIterations: 10,
      });

      stateManager.createLoop({
        task: 'Task 2',
        completion: 'done',
        maxIterations: 10,
      });

      const result = runAbort();

      assert.strictEqual(result.success, false);
      assert.match(result.error, /Multiple Ralph loops active \(2\)/);
      assert.match(result.error, /Specify --loop-id/);
    });

    it('should abort specific loop with --loop-id', () => {
      const stateManager = new MultiLoopStateManager(TEST_DIR);

      const { loopId: loop1 } = stateManager.createLoop({
        task: 'Task 1',
        completion: 'done',
        maxIterations: 10,
      });

      const { loopId: loop2 } = stateManager.createLoop({
        task: 'Task 2',
        completion: 'done',
        maxIterations: 10,
      });

      const result = runAbort(`--loop-id ${loop1}`);

      assert.strictEqual(result.success, true);
      assert.match(result.output, new RegExp(`Ralph Loop Aborted: ${loop1}`));

      // Verify loop1 is aborted
      const state1 = stateManager.getLoopState(loop1);
      assert.strictEqual(state1.status, 'aborted');

      // Verify loop2 is still running
      const state2 = stateManager.getLoopState(loop2);
      assert.strictEqual(state2.status, 'running');
    });

    it('should error on invalid loop ID', () => {
      const stateManager = new MultiLoopStateManager(TEST_DIR);

      stateManager.createLoop({
        task: 'Task 1',
        completion: 'done',
        maxIterations: 10,
      });

      const result = runAbort('--loop-id nonexistent-loop');

      assert.strictEqual(result.success, false);
      assert.match(result.error, /Loop not found/);
    });
  });

  describe('ralph-resume', () => {
    it('should show message when no loops exist', () => {
      const result = runResume();

      assert.strictEqual(result.success, true);
      assert.match(result.output, /No Ralph loop to resume/);
    });

    it('should auto-detect single loop', () => {
      const stateManager = new MultiLoopStateManager(TEST_DIR);
      const { loopId } = stateManager.createLoop({
        task: 'Fix tests',
        completion: 'npm test',
        maxIterations: 10,
      });

      // Pause the loop
      stateManager.updateLoopState(loopId, { active: false, status: 'paused' });

      const result = runResume();

      assert.strictEqual(result.success, true);
      assert.match(result.output, new RegExp(`Resuming Ralph Loop: ${loopId}`));

      const state = stateManager.getLoopState(loopId);
      assert.strictEqual(state.status, 'running');
      assert.strictEqual(state.active, true);
    });

    it('should require --loop-id when multiple loops exist', () => {
      const stateManager = new MultiLoopStateManager(TEST_DIR);

      stateManager.createLoop({
        task: 'Task 1',
        completion: 'done',
        maxIterations: 10,
      });

      stateManager.createLoop({
        task: 'Task 2',
        completion: 'done',
        maxIterations: 10,
      });

      const result = runResume();

      assert.strictEqual(result.success, false);
      assert.match(result.error, /Multiple Ralph loops available \(2\)/);
      assert.match(result.error, /Specify --loop-id/);
    });

    it('should resume specific loop with --loop-id', () => {
      const stateManager = new MultiLoopStateManager(TEST_DIR);

      const { loopId: loop1 } = stateManager.createLoop({
        task: 'Task 1',
        completion: 'done',
        maxIterations: 10,
      });

      stateManager.createLoop({
        task: 'Task 2',
        completion: 'done',
        maxIterations: 10,
      });

      // Pause loop1
      stateManager.updateLoopState(loop1, { active: false, status: 'paused' });

      const result = runResume(`--loop-id ${loop1}`);

      assert.strictEqual(result.success, true);
      assert.match(result.output, new RegExp(`Resuming Ralph Loop: ${loop1}`));

      const state = stateManager.getLoopState(loop1);
      assert.strictEqual(state.status, 'running');
      assert.strictEqual(state.active, true);
    });

    it('should support --max-iterations override', () => {
      const stateManager = new MultiLoopStateManager(TEST_DIR);

      const { loopId } = stateManager.createLoop({
        task: 'Task 1',
        completion: 'done',
        maxIterations: 10,
      });

      stateManager.updateLoopState(loopId, { active: false, status: 'paused' });

      const result = runResume(`--loop-id ${loopId} --max-iterations 20`);

      assert.strictEqual(result.success, true);

      const state = stateManager.getLoopState(loopId);
      assert.strictEqual(state.maxIterations, 20);
    });

    it('should not resume completed loops', () => {
      const stateManager = new MultiLoopStateManager(TEST_DIR);

      const { loopId } = stateManager.createLoop({
        task: 'Task 1',
        completion: 'done',
        maxIterations: 10,
      });

      stateManager.updateLoopState(loopId, { status: 'success', active: false });

      const result = runResume(`--loop-id ${loopId}`);

      assert.strictEqual(result.success, true);
      assert.match(result.output, /completed successfully/);
    });

    it('should not resume aborted loops', () => {
      const stateManager = new MultiLoopStateManager(TEST_DIR);

      const { loopId } = stateManager.createLoop({
        task: 'Task 1',
        completion: 'done',
        maxIterations: 10,
      });

      stateManager.updateLoopState(loopId, { status: 'aborted', active: false });

      const result = runResume(`--loop-id ${loopId}`);

      assert.strictEqual(result.success, true);
      assert.match(result.output, /was aborted/);
    });
  });

  describe('backward compatibility', () => {
    it('should maintain single-loop behavior when only one loop exists', () => {
      const stateManager = new MultiLoopStateManager(TEST_DIR);

      const { loopId } = stateManager.createLoop({
        task: 'Fix tests',
        completion: 'npm test',
        maxIterations: 10,
      });

      // All commands should work without --loop-id
      const statusResult = runStatus();
      assert.strictEqual(statusResult.success, true);
      assert.match(statusResult.output, new RegExp(loopId));

      const resumeResult = runResume();
      assert.strictEqual(resumeResult.success, true);

      const abortResult = runAbort();
      assert.strictEqual(abortResult.success, true);
    });
  });
});
