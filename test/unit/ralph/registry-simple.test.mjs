/**
 * Loop Registry Tests (Node Test Runner)
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { LoopRegistry } from '../../../tools/ralph/registry.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_DIR = path.join(__dirname, '.tmp-registry-simple');

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

  it('should create registry file on first access', () => {
    registry.load();
    assert.ok(fs.existsSync(path.join(TEST_DIR, '.aiwg', 'ralph', 'registry.json')));
  });

  it('should initialize with default structure', () => {
    const data = registry.load();
    assert.strictEqual(data.version, '2.0.0');
    assert.strictEqual(data.max_concurrent_loops, 4);
    assert.ok(Array.isArray(data.active_loops));
    assert.strictEqual(data.active_loops.length, 0);
  });

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
  });

  it('should enforce MAX_CONCURRENT_LOOPS limit', () => {
    registry.register('ralph-loop-1-abc', { task_summary: 'Task 1' });
    registry.register('ralph-loop-2-def', { task_summary: 'Task 2' });
    registry.register('ralph-loop-3-ghi', { task_summary: 'Task 3' });
    registry.register('ralph-loop-4-jkl', { task_summary: 'Task 4' });

    // 5th should throw
    assert.throws(() => {
      registry.register('ralph-loop-5-mno', { task_summary: 'Task 5' });
    }, /Cannot create loop.*max: 4/);
  });

  it('should calculate communication paths correctly', () => {
    assert.strictEqual(registry.calculateCommunicationPaths(2), 1);
    assert.strictEqual(registry.calculateCommunicationPaths(3), 3);
    assert.strictEqual(registry.calculateCommunicationPaths(4), 6);
  });

  it('should generate valid loop IDs', () => {
    const id1 = registry.generateLoopId('Fix all failing tests');
    const id2 = registry.generateLoopId('Migrate to TypeScript');

    assert.ok(id1.startsWith('ralph-fix-all-failing-tests-'));
    assert.ok(id2.startsWith('ralph-migrate-to-typescript-'));
  });
});
