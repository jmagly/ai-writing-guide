/**
 * Unit tests for TaskStore
 * @source @tools/daemon/task-store.mjs
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TaskStore } from '../../../tools/daemon/task-store.mjs';

// Mock modules
vi.mock('node:fs');
vi.mock('node:path');

describe('TaskStore', () => {
  let store;
  let mockFs;
  let mockPath;

  beforeEach(async () => {
    vi.clearAllMocks();

    // TaskStore uses `import fs from 'node:fs'` (default export),
    // so we must access .default to get the same object
    const fsModule = await import('node:fs');
    mockFs = fsModule.default;
    const pathModule = await import('node:path');
    mockPath = pathModule.default;

    // Mock fs
    mockFs.existsSync = vi.fn(() => false);
    mockFs.mkdirSync = vi.fn();
    mockFs.readFileSync = vi.fn(() => '{}');
    mockFs.writeFileSync = vi.fn();

    // Mock path
    mockPath.dirname = vi.fn((p) => p.replace(/\/[^/]*$/, ''));

    store = new TaskStore('/tmp/tasks.json');
  });

  describe('constructor', () => {
    it('sets storePath from parameter', () => {
      expect(store.storePath).toBe('/tmp/tasks.json');
    });

    it('initializes empty tasks map', () => {
      expect(store.tasks.size).toBe(0);
    });

    it('initializes taskIdCounter to 0', () => {
      expect(store.taskIdCounter).toBe(0);
    });
  });

  describe('initialize', () => {
    it('creates parent directory if needed', async () => {
      mockFs.existsSync = vi.fn(() => false);
      await store.initialize();
      expect(mockFs.mkdirSync).toHaveBeenCalledWith('/tmp', { recursive: true });
    });

    it('loads existing tasks from disk', async () => {
      const existingData = {
        tasks: [
          { id: 'task-0000', prompt: 'test1', state: 'completed' },
          { id: 'task-0001', prompt: 'test2', state: 'running' },
        ],
      };
      mockFs.existsSync = vi.fn(() => true);
      mockFs.readFileSync = vi.fn(() => JSON.stringify(existingData));

      await store.initialize();

      expect(store.tasks.size).toBe(2);
      expect(store.tasks.get('task-0000')).toEqual(existingData.tasks[0]);
      expect(store.tasks.get('task-0001')).toEqual(existingData.tasks[1]);
    });

    it('tracks highest ID for counter', async () => {
      const existingData = {
        tasks: [
          { id: 'task-0000', prompt: 'test1' },
          { id: 'task-0005', prompt: 'test2' },
          { id: 'task-0003', prompt: 'test3' },
        ],
      };
      mockFs.existsSync = vi.fn(() => true);
      mockFs.readFileSync = vi.fn(() => JSON.stringify(existingData));

      await store.initialize();

      // Counter should be highest + 1
      expect(store.taskIdCounter).toBe(6);
    });

    it('handles corrupted JSON gracefully', async () => {
      mockFs.existsSync = vi.fn(() => true);
      mockFs.readFileSync = vi.fn(() => 'not valid json{');

      await store.initialize();

      expect(store.tasks.size).toBe(0);
      expect(store.taskIdCounter).toBe(0);
    });

    it('handles missing tasks array', async () => {
      mockFs.existsSync = vi.fn(() => true);
      mockFs.readFileSync = vi.fn(() => JSON.stringify({ version: 1 }));

      await store.initialize();

      expect(store.tasks.size).toBe(0);
    });
  });

  describe('createTask', () => {
    it('returns task with auto-incrementing id', () => {
      const task1 = store.createTask({ prompt: 'test1' });
      const task2 = store.createTask({ prompt: 'test2' });

      expect(task1.id).toBe('task-0000');
      expect(task2.id).toBe('task-0001');
    });

    it('uses task-NNNN format with zero padding', () => {
      for (let i = 0; i < 3; i++) {
        store.createTask({ prompt: 'test' });
      }

      const task = store.createTask({ prompt: 'test' });
      expect(task.id).toBe('task-0003');
    });

    it('sets default values', () => {
      const task = store.createTask({ prompt: 'test prompt' });

      expect(task.state).toBe('queued');
      expect(task.prompt).toBe('test prompt');
      expect(task.agent).toBeNull();
      expect(task.priority).toBe(0);
      expect(task.startedAt).toBeNull();
      expect(task.completedAt).toBeNull();
      expect(task.pid).toBeNull();
      expect(task.result).toBeNull();
      expect(task.error).toBeNull();
      expect(task.output).toBe('');
      expect(task.createdAt).toBeDefined();
    });

    it('accepts agent option', () => {
      const task = store.createTask({ prompt: 'test', agent: 'test-engineer' });
      expect(task.agent).toBe('test-engineer');
    });

    it('accepts priority option', () => {
      const task = store.createTask({ prompt: 'test', priority: 10 });
      expect(task.priority).toBe(10);
    });

    it('accepts metadata option', () => {
      const metadata = { source: 'cli', user: 'test' };
      const task = store.createTask({ prompt: 'test', metadata });
      expect(task.metadata).toEqual(metadata);
    });

    it('persists to disk', () => {
      store.createTask({ prompt: 'test' });
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/tmp/tasks.json',
        expect.stringContaining('task-0000')
      );
    });
  });

  describe('updateTask', () => {
    beforeEach(() => {
      store.createTask({ prompt: 'test' });
    });

    it('throws for unknown task', () => {
      expect(() => store.updateTask('task-9999', {})).toThrow('Task not found: task-9999');
    });

    it('validates state values', () => {
      expect(() => store.updateTask('task-0000', { state: 'invalid' })).toThrow('Invalid state: invalid');
    });

    it('updates task properties', () => {
      const task = store.updateTask('task-0000', {
        state: 'running',
        pid: 1234,
      });

      expect(task.state).toBe('running');
      expect(task.pid).toBe(1234);
    });

    it('persists changes', () => {
      const writeCallsBefore = mockFs.writeFileSync.mock.calls.length;
      store.updateTask('task-0000', { state: 'running' });
      expect(mockFs.writeFileSync.mock.calls.length).toBeGreaterThan(writeCallsBefore);
    });

    it('returns updated task', () => {
      const task = store.updateTask('task-0000', { state: 'completed' });
      expect(task).toBe(store.tasks.get('task-0000'));
    });
  });

  describe('startTask', () => {
    beforeEach(() => {
      store.createTask({ prompt: 'test' });
    });

    it('sets state to running', () => {
      const task = store.startTask('task-0000', 1234);
      expect(task.state).toBe('running');
    });

    it('sets startedAt timestamp', () => {
      const task = store.startTask('task-0000', 1234);
      expect(task.startedAt).toBeDefined();
      expect(new Date(task.startedAt).getTime()).toBeGreaterThan(0);
    });

    it('sets pid', () => {
      const task = store.startTask('task-0000', 5678);
      expect(task.pid).toBe(5678);
    });
  });

  describe('completeTask', () => {
    beforeEach(() => {
      const task = store.createTask({ prompt: 'test' });
      store.startTask(task.id, 1234);
    });

    it('sets state to completed', () => {
      const task = store.completeTask('task-0000', 'result data');
      expect(task.state).toBe('completed');
    });

    it('sets completedAt timestamp', () => {
      const task = store.completeTask('task-0000', 'result');
      expect(task.completedAt).toBeDefined();
      expect(new Date(task.completedAt).getTime()).toBeGreaterThan(0);
    });

    it('sets result', () => {
      const task = store.completeTask('task-0000', 'success output');
      expect(task.result).toBe('success output');
    });

    it('clears pid', () => {
      const task = store.completeTask('task-0000', 'result');
      expect(task.pid).toBeNull();
    });
  });

  describe('failTask', () => {
    beforeEach(() => {
      const task = store.createTask({ prompt: 'test' });
      store.startTask(task.id, 1234);
    });

    it('sets state to failed', () => {
      const task = store.failTask('task-0000', 'error message');
      expect(task.state).toBe('failed');
    });

    it('sets completedAt timestamp', () => {
      const task = store.failTask('task-0000', 'error');
      expect(task.completedAt).toBeDefined();
    });

    it('sets error from string', () => {
      const task = store.failTask('task-0000', 'test error');
      expect(task.error).toBe('test error');
    });

    it('handles Error objects', () => {
      const error = new Error('Something went wrong');
      const task = store.failTask('task-0000', error);
      expect(task.error).toBe('Something went wrong');
    });

    it('clears pid', () => {
      const task = store.failTask('task-0000', 'error');
      expect(task.pid).toBeNull();
    });
  });

  describe('cancelTask', () => {
    beforeEach(() => {
      const task = store.createTask({ prompt: 'test' });
      store.startTask(task.id, 1234);
    });

    it('sets state to cancelled', () => {
      const task = store.cancelTask('task-0000');
      expect(task.state).toBe('cancelled');
    });

    it('sets completedAt timestamp', () => {
      const task = store.cancelTask('task-0000');
      expect(task.completedAt).toBeDefined();
    });

    it('clears pid', () => {
      const task = store.cancelTask('task-0000');
      expect(task.pid).toBeNull();
    });
  });

  describe('appendOutput', () => {
    beforeEach(() => {
      store.createTask({ prompt: 'test' });
    });

    it('appends to task output', () => {
      store.appendOutput('task-0000', 'line 1\n');
      store.appendOutput('task-0000', 'line 2\n');

      const task = store.getTask('task-0000');
      expect(task.output).toBe('line 1\nline 2\n');
    });

    it('does not persist on every chunk', () => {
      const writeCallsBefore = mockFs.writeFileSync.mock.calls.length;
      store.appendOutput('task-0000', 'chunk');
      expect(mockFs.writeFileSync.mock.calls.length).toBe(writeCallsBefore);
    });

    it('handles unknown task gracefully', () => {
      expect(() => store.appendOutput('task-9999', 'data')).not.toThrow();
    });
  });

  describe('getTask', () => {
    beforeEach(() => {
      store.createTask({ prompt: 'test' });
    });

    it('returns task by id', () => {
      const task = store.getTask('task-0000');
      expect(task).toBeDefined();
      expect(task.id).toBe('task-0000');
    });

    it('returns null for unknown task', () => {
      expect(store.getTask('task-9999')).toBeNull();
    });
  });

  describe('getTasks', () => {
    beforeEach(() => {
      store.createTask({ prompt: 'test1', agent: 'agent-a' });
      store.tasks.get('task-0000').createdAt = '2026-01-01T00:00:01Z';
      store.startTask('task-0000', 1234);

      store.createTask({ prompt: 'test2', agent: 'agent-b' });
      store.tasks.get('task-0001').createdAt = '2026-01-01T00:00:02Z';
      store.completeTask('task-0001', 'result');

      store.createTask({ prompt: 'test3', agent: 'agent-a' });
      store.tasks.get('task-0002').createdAt = '2026-01-01T00:00:03Z';
    });

    it('returns all tasks', () => {
      const tasks = store.getTasks();
      expect(tasks).toHaveLength(3);
    });

    it('sorts by creation time, newest first', () => {
      const tasks = store.getTasks();
      expect(tasks[0].id).toBe('task-0002');
      expect(tasks[1].id).toBe('task-0001');
      expect(tasks[2].id).toBe('task-0000');
    });

    it('filters by state', () => {
      const running = store.getTasks({ state: 'running' });
      expect(running).toHaveLength(1);
      expect(running[0].state).toBe('running');

      const completed = store.getTasks({ state: 'completed' });
      expect(completed).toHaveLength(1);
      expect(completed[0].state).toBe('completed');

      const queued = store.getTasks({ state: 'queued' });
      expect(queued).toHaveLength(1);
      expect(queued[0].state).toBe('queued');
    });

    it('filters by agent', () => {
      const agentA = store.getTasks({ agent: 'agent-a' });
      expect(agentA).toHaveLength(2);

      for (const task of agentA) {
        expect(task.agent).toBe('agent-a');
      }
    });

    it('applies limit', () => {
      const tasks = store.getTasks({ limit: 2 });
      expect(tasks).toHaveLength(2);
      expect(tasks[0].id).toBe('task-0002');
      expect(tasks[1].id).toBe('task-0001');
    });

    it('combines filters', () => {
      const tasks = store.getTasks({ agent: 'agent-a', state: 'running', limit: 5 });
      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe('task-0000');
    });
  });

  describe('getStats', () => {
    beforeEach(() => {
      store.createTask({ prompt: 'test1' });
      store.createTask({ prompt: 'test2' });
      store.createTask({ prompt: 'test3' });
      store.createTask({ prompt: 'test4' });

      store.startTask('task-0000', 1234);
      store.completeTask('task-0001', 'result');
      store.failTask('task-0002', 'error');
      // task-0003 remains queued
    });

    it('returns counts by state', () => {
      const stats = store.getStats();

      expect(stats.total).toBe(4);
      expect(stats.queued).toBe(1);
      expect(stats.running).toBe(1);
      expect(stats.completed).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.cancelled).toBe(0);
    });
  });

  describe('getSummary', () => {
    beforeEach(() => {
      store.createTask({ prompt: 'test1', agent: 'agent-a' });
      store.startTask('task-0000', 1234);

      store.createTask({ prompt: 'test2' });
      store.completeTask('task-0001', 'result');

      store.createTask({ prompt: 'test3' });
    });

    it('includes stats', () => {
      const summary = store.getSummary();
      expect(summary.stats).toBeDefined();
      expect(summary.stats.total).toBe(3);
    });

    it('includes running tasks', () => {
      const summary = store.getSummary();
      expect(summary.running).toHaveLength(1);
      expect(summary.running[0].id).toBe('task-0000');
      expect(summary.running[0].agent).toBe('agent-a');
      expect(summary.running[0].startedAt).toBeDefined();
    });

    it('truncates prompts to 80 chars', () => {
      const longPrompt = 'a'.repeat(200);
      store.createTask({ prompt: longPrompt });

      const summary = store.getSummary();
      const recentTask = summary.recent.find(t => t.id === 'task-0003');
      expect(recentTask.prompt).toHaveLength(80);
    });

    it('includes recent tasks (limit 5)', () => {
      // Create 7 more tasks
      for (let i = 0; i < 7; i++) {
        store.createTask({ prompt: `test-${i}` });
      }

      const summary = store.getSummary();
      expect(summary.recent).toHaveLength(5);
    });

    it('includes task state and completedAt in recent', () => {
      const summary = store.getSummary();
      const completedTask = summary.recent.find(t => t.id === 'task-0001');
      expect(completedTask.state).toBe('completed');
      expect(completedTask.completedAt).toBeDefined();
    });
  });

  describe('cleanup', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

      // Create tasks at different times
      store.createTask({ prompt: 'old1' });
      store.completeTask('task-0000', 'result');
      store.tasks.get('task-0000').completedAt = new Date('2025-12-01T00:00:00Z').toISOString();

      store.createTask({ prompt: 'old2' });
      store.failTask('task-0001', 'error');
      store.tasks.get('task-0001').completedAt = new Date('2025-12-15T00:00:00Z').toISOString();

      store.createTask({ prompt: 'recent' });
      store.completeTask('task-0002', 'result');
      store.tasks.get('task-0002').completedAt = new Date('2025-12-28T00:00:00Z').toISOString();

      store.createTask({ prompt: 'running' });
      store.startTask('task-0003', 1234);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('removes old completed tasks', () => {
      const removed = store.cleanup(7 * 24 * 60 * 60 * 1000); // 7 days
      expect(removed).toBe(2);
      expect(store.tasks.has('task-0000')).toBe(false);
      expect(store.tasks.has('task-0001')).toBe(false);
    });

    it('preserves recent tasks', () => {
      store.cleanup(7 * 24 * 60 * 60 * 1000);
      expect(store.tasks.has('task-0002')).toBe(true);
    });

    it('preserves running tasks', () => {
      store.cleanup(7 * 24 * 60 * 60 * 1000);
      expect(store.tasks.has('task-0003')).toBe(true);
    });

    it('respects maxAge parameter', () => {
      const removed = store.cleanup(20 * 24 * 60 * 60 * 1000); // 20 days
      expect(removed).toBe(1); // Only task-0000 is older than 20 days
    });

    it('persists after removal', () => {
      const writeCallsBefore = mockFs.writeFileSync.mock.calls.length;
      store.cleanup(7 * 24 * 60 * 60 * 1000);
      expect(mockFs.writeFileSync.mock.calls.length).toBeGreaterThan(writeCallsBefore);
    });

    it('returns 0 when nothing to clean', () => {
      const removed = store.cleanup(365 * 24 * 60 * 60 * 1000); // 365 days
      expect(removed).toBe(0);
    });

    it('removes cancelled tasks', () => {
      store.cancelTask('task-0003');
      store.tasks.get('task-0003').completedAt = new Date('2025-12-01T00:00:00Z').toISOString();

      const removed = store.cleanup(7 * 24 * 60 * 60 * 1000);
      expect(removed).toBe(3);
      expect(store.tasks.has('task-0003')).toBe(false);
    });
  });

  describe('size getter', () => {
    it('returns task count', () => {
      expect(store.size).toBe(0);

      store.createTask({ prompt: 'test1' });
      expect(store.size).toBe(1);

      store.createTask({ prompt: 'test2' });
      expect(store.size).toBe(2);
    });
  });

  describe('_persist', () => {
    beforeEach(() => {
      store.createTask({ prompt: 'test' });
    });

    it('writes tasks to disk in JSON format', () => {
      // Clear previous calls
      mockFs.writeFileSync.mockClear();

      store._persist();

      expect(mockFs.writeFileSync).toHaveBeenCalledOnce();
      const [path, data] = mockFs.writeFileSync.mock.calls[0];
      expect(path).toBe('/tmp/tasks.json');

      const parsed = JSON.parse(data);
      expect(parsed.version).toBe(1);
      expect(parsed.tasks).toHaveLength(1);
      expect(parsed.updatedAt).toBeDefined();
    });

    it('handles write errors gracefully', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockFs.writeFileSync = vi.fn(() => {
        throw new Error('Disk full');
      });

      expect(() => store._persist()).not.toThrow();
      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to persist')
      );

      consoleError.mockRestore();
    });
  });
});
