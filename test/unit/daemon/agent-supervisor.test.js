/**
 * Unit tests for AgentSupervisor
 * @source @tools/daemon/agent-supervisor.mjs
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { AgentSupervisor } from '../../../tools/daemon/agent-supervisor.mjs';

// Mock modules
vi.mock('node:child_process');

const createMockProcess = () => {
  const proc = new EventEmitter();
  proc.pid = Math.floor(Math.random() * 10000);
  proc.kill = vi.fn();
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  return proc;
};

let mockTaskCounter = 0;
const createMockTaskStore = () => {
  mockTaskCounter = 0;
  return {
    createTask: vi.fn((opts) => ({
      id: `task-${String(mockTaskCounter++).padStart(4, '0')}`,
      ...opts,
      state: 'queued',
      createdAt: new Date().toISOString(),
    })),
    startTask: vi.fn(),
    completeTask: vi.fn(),
    failTask: vi.fn(),
    cancelTask: vi.fn(),
    appendOutput: vi.fn(),
    getTask: vi.fn((id) => ({ id, state: 'running' })),
  };
};

describe('AgentSupervisor', () => {
  let supervisor;
  let mockChildProcess;
  let mockTaskStore;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockChildProcess = await import('node:child_process');
    mockTaskStore = createMockTaskStore();

    supervisor = new AgentSupervisor({
      maxConcurrency: 3,
      taskStore: mockTaskStore,
      agentCommand: 'claude',
      agentArgs: [],
      taskTimeout: 2 * 60 * 60 * 1000,
    });
  });

  afterEach(async () => {
    vi.useRealTimers();
    if (supervisor && !supervisor.shutdownInProgress) {
      await supervisor.shutdown(100);
    }
  });

  describe('constructor', () => {
    it('sets maxConcurrency from options', () => {
      expect(supervisor.maxConcurrency).toBe(3);
    });

    it('defaults maxConcurrency to 3', () => {
      const defaultSupervisor = new AgentSupervisor();
      expect(defaultSupervisor.maxConcurrency).toBe(3);
    });

    it('sets taskStore from options', () => {
      expect(supervisor.taskStore).toBe(mockTaskStore);
    });

    it('defaults agentCommand to claude', () => {
      const defaultSupervisor = new AgentSupervisor();
      expect(defaultSupervisor.agentCommand).toBe('claude');
    });

    it('defaults taskTimeout to 2 hours', () => {
      const defaultSupervisor = new AgentSupervisor();
      expect(defaultSupervisor.taskTimeout).toBe(120 * 60 * 1000);
    });

    it('initializes empty queue', () => {
      expect(supervisor.queue).toEqual([]);
    });

    it('initializes empty running map', () => {
      expect(supervisor.running.size).toBe(0);
    });
  });

  describe('submit', () => {
    let mockProc;

    beforeEach(() => {
      mockProc = createMockProcess();
      mockChildProcess.spawn = vi.fn(() => mockProc);
    });

    it('creates task via taskStore', () => {
      supervisor.submit('test prompt', { agent: 'test-agent', priority: 5 });

      expect(mockTaskStore.createTask).toHaveBeenCalledWith({
        prompt: 'test prompt',
        agent: 'test-agent',
        priority: 5,
        metadata: undefined,
      });
    });

    it('adds task to queue', () => {
      supervisor.maxConcurrency = 0; // Prevent immediate processing
      supervisor.submit('test prompt');
      expect(supervisor.queue.length).toBe(1);
    });

    it('sorts queue by priority', () => {
      supervisor.maxConcurrency = 0; // Prevent immediate processing
      supervisor.submit('low priority', { priority: 1 });
      supervisor.submit('high priority', { priority: 10 });
      supervisor.submit('medium priority', { priority: 5 });

      expect(supervisor.queue[0].priority).toBe(10);
      expect(supervisor.queue[1].priority).toBe(5);
      expect(supervisor.queue[2].priority).toBe(1);
    });

    it('emits task:queued event', () => {
      const listener = vi.fn();
      supervisor.on('task:queued', listener);

      supervisor.submit('test prompt');

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('test'),
          queueSize: expect.any(Number),
        })
      );
    });

    it('triggers queue processing', () => {
      supervisor.submit('test prompt');

      // Should spawn process immediately (under maxConcurrency)
      expect(mockChildProcess.spawn).toHaveBeenCalled();
    });

    it('throws when shutting down', () => {
      supervisor.shutdownInProgress = true;
      expect(() => supervisor.submit('test')).toThrow('Supervisor is shutting down');
    });

    it('returns task object', () => {
      const task = supervisor.submit('test prompt');
      expect(task).toBeDefined();
      expect(task.id).toBeDefined();
      expect(task.prompt).toBe('test prompt');
    });

    it('creates task without taskStore', () => {
      const noStoreSupervisor = new AgentSupervisor({ maxConcurrency: 0 });
      const task = noStoreSupervisor.submit('test');

      expect(task.id).toMatch(/^task-/);
      expect(task.state).toBe('queued');
    });
  });

  describe('cancel', () => {
    let mockProc;

    beforeEach(() => {
      mockProc = createMockProcess();
      mockChildProcess.spawn = vi.fn(() => mockProc);
    });

    it('removes queued task', () => {
      supervisor.maxConcurrency = 1;

      supervisor.submit('task1');
      const task2 = supervisor.submit('task2');

      const cancelled = supervisor.cancel(task2.id);

      expect(cancelled).toBe(true);
      expect(supervisor.queue.some(t => t.id === task2.id)).toBe(false);
    });

    it('calls taskStore.cancelTask for queued task', () => {
      supervisor.maxConcurrency = 0; // Prevent processing

      const task = supervisor.submit('test');
      supervisor.cancel(task.id);

      expect(mockTaskStore.cancelTask).toHaveBeenCalledWith(task.id);
    });

    it('emits task:cancelled for queued task', () => {
      supervisor.maxConcurrency = 0;
      const listener = vi.fn();
      supervisor.on('task:cancelled', listener);

      const task = supervisor.submit('test');
      supervisor.cancel(task.id);

      expect(listener).toHaveBeenCalledWith({ taskId: task.id });
    });

    it('kills running task process', () => {
      const task = supervisor.submit('test');

      // Wait for process to start
      expect(supervisor.running.size).toBe(1);

      supervisor.cancel(task.id);

      expect(mockProc.kill).toHaveBeenCalledWith('SIGTERM');
    });

    it('returns false for unknown task', () => {
      const cancelled = supervisor.cancel('task-unknown');
      expect(cancelled).toBe(false);
    });

    it('handles process kill errors gracefully', () => {
      const task = supervisor.submit('test');

      mockProc.kill = vi.fn(() => {
        throw new Error('Process already dead');
      });

      expect(() => supervisor.cancel(task.id)).not.toThrow();
    });
  });

  describe('getStatus', () => {
    let mockProc;

    beforeEach(() => {
      mockProc = createMockProcess();
      mockChildProcess.spawn = vi.fn(() => mockProc);
    });

    it('returns running and queued counts', () => {
      supervisor.maxConcurrency = 1;

      supervisor.submit('task1');
      supervisor.submit('task2');

      const status = supervisor.getStatus();

      expect(status.running).toBe(1);
      expect(status.queued).toBe(1);
    });

    it('returns maxConcurrency', () => {
      const status = supervisor.getStatus();
      expect(status.maxConcurrency).toBe(3);
    });

    it('includes running task details', () => {
      const task = supervisor.submit('test prompt', { agent: 'test-agent' });

      const status = supervisor.getStatus();

      expect(status.tasks.running).toHaveLength(1);
      expect(status.tasks.running[0]).toEqual({
        id: task.id,
        prompt: 'test prompt',
        agent: 'test-agent',
        startedAt: expect.any(String),
        pid: mockProc.pid,
      });
    });

    it('includes queued task details', () => {
      supervisor.maxConcurrency = 1;

      supervisor.submit('task1');
      const task2 = supervisor.submit('task2', { agent: 'agent2', priority: 5 });

      const status = supervisor.getStatus();

      expect(status.tasks.queued).toHaveLength(1);
      expect(status.tasks.queued[0]).toEqual({
        id: task2.id,
        prompt: 'task2',
        agent: 'agent2',
        priority: 5,
      });
    });

    it('truncates prompts to 80 chars', () => {
      const longPrompt = 'a'.repeat(200);
      supervisor.submit(longPrompt);

      const status = supervisor.getStatus();
      expect(status.tasks.running[0].prompt).toHaveLength(80);
    });
  });

  describe('shutdown', () => {
    let mockProc;

    beforeEach(() => {
      mockProc = createMockProcess();
      mockChildProcess.spawn = vi.fn(() => mockProc);
    });

    it('sets shutdownInProgress flag', async () => {
      vi.useFakeTimers();
      supervisor.submit('test');
      const shutdownPromise = supervisor.shutdown(5000);
      // Flag should be true while shutdown is in progress
      expect(supervisor.shutdownInProgress).toBe(true);
      // Complete the task to let shutdown finish
      mockProc.emit('exit', 0, null);
      vi.advanceTimersByTime(200);
      await shutdownPromise;
      vi.useRealTimers();
    });

    it('cancels queued tasks', async () => {
      supervisor.maxConcurrency = 0;

      const task1 = supervisor.submit('task1');
      const task2 = supervisor.submit('task2');

      await supervisor.shutdown(100);

      expect(supervisor.queue.length).toBe(0);
      expect(mockTaskStore.cancelTask).toHaveBeenCalledWith(task1.id);
      expect(mockTaskStore.cancelTask).toHaveBeenCalledWith(task2.id);
    });

    it('emits task:cancelled for queued tasks', async () => {
      supervisor.maxConcurrency = 0;
      const listener = vi.fn();
      supervisor.on('task:cancelled', listener);

      const task = supervisor.submit('test');

      await supervisor.shutdown(100);

      expect(listener).toHaveBeenCalledWith({
        taskId: task.id,
        reason: 'shutdown',
      });
    });

    it('waits for running tasks to complete', async () => {
      vi.useFakeTimers();

      supervisor.submit('test');

      const shutdownPromise = supervisor.shutdown(5000);

      // Simulate task completion
      mockProc.emit('exit', 0, null);

      // Advance to let check interval detect running.size === 0
      vi.advanceTimersByTime(200);

      await shutdownPromise;

      expect(supervisor.running.size).toBe(0);

      vi.useRealTimers();
    });

    it('force kills after timeout', async () => {
      vi.useFakeTimers();

      supervisor.submit('test');

      const shutdownPromise = supervisor.shutdown(1000);

      vi.advanceTimersByTime(1000);

      await shutdownPromise;

      expect(mockProc.kill).toHaveBeenCalledWith('SIGKILL');

      vi.useRealTimers();
    });

    it('marks force-killed tasks as failed', async () => {
      vi.useFakeTimers();

      const task = supervisor.submit('test');

      const shutdownPromise = supervisor.shutdown(500);

      vi.advanceTimersByTime(500);

      await shutdownPromise;

      expect(mockTaskStore.failTask).toHaveBeenCalledWith(
        task.id,
        'Killed during shutdown'
      );

      vi.useRealTimers();
    });

    it('is no-op when no running tasks', async () => {
      await expect(supervisor.shutdown(100)).resolves.not.toThrow();
    });

    it('clears shutdownInProgress after completion', async () => {
      await supervisor.shutdown(100);
      expect(supervisor.shutdownInProgress).toBe(false);
    });
  });

  describe('runningCount getter', () => {
    let mockProc;

    beforeEach(() => {
      mockProc = createMockProcess();
      mockChildProcess.spawn = vi.fn(() => mockProc);
    });

    it('returns count of running tasks', () => {
      expect(supervisor.runningCount).toBe(0);

      supervisor.submit('task1');
      expect(supervisor.runningCount).toBe(1);

      supervisor.submit('task2');
      expect(supervisor.runningCount).toBe(2);
    });
  });

  describe('queuedCount getter', () => {
    beforeEach(() => {
      const mockProc = createMockProcess();
      mockChildProcess.spawn = vi.fn(() => mockProc);
    });

    it('returns count of queued tasks', () => {
      supervisor.maxConcurrency = 1;

      expect(supervisor.queuedCount).toBe(0);

      supervisor.submit('task1');
      expect(supervisor.queuedCount).toBe(0); // First task starts immediately

      supervisor.submit('task2');
      expect(supervisor.queuedCount).toBe(1);

      supervisor.submit('task3');
      expect(supervisor.queuedCount).toBe(2);
    });
  });

  describe('_processQueue', () => {
    let mockProc;

    beforeEach(() => {
      mockProc = createMockProcess();
      mockChildProcess.spawn = vi.fn(() => mockProc);
    });

    it('respects maxConcurrency', () => {
      supervisor.maxConcurrency = 2;

      supervisor.submit('task1');
      supervisor.submit('task2');
      supervisor.submit('task3');

      expect(supervisor.running.size).toBe(2);
      expect(supervisor.queue.length).toBe(1);
    });

    it('stops during shutdown', () => {
      supervisor.shutdownInProgress = true;

      supervisor.queue.push({ id: 'task-1', prompt: 'test' });
      supervisor._processQueue();

      expect(mockChildProcess.spawn).not.toHaveBeenCalled();
    });

    it('processes next task when slot available', () => {
      supervisor.maxConcurrency = 1;

      supervisor.submit('task1');
      expect(supervisor.running.size).toBe(1);

      supervisor.submit('task2');
      expect(supervisor.queue.length).toBe(1);

      // Complete first task
      mockProc.emit('exit', 0, null);

      // Should start second task
      expect(supervisor.running.size).toBe(1);
      expect(supervisor.queue.length).toBe(0);
    });
  });

  describe('_runTask', () => {
    let mockProc;

    beforeEach(() => {
      mockProc = createMockProcess();
      mockChildProcess.spawn = vi.fn(() => mockProc);
    });

    it('spawns process with correct args', () => {
      supervisor.submit('test prompt');

      expect(mockChildProcess.spawn).toHaveBeenCalledWith(
        'claude',
        ['-p', 'test prompt'],
        expect.objectContaining({
          stdio: ['ignore', 'pipe', 'pipe'],
        })
      );
    });

    it('adds --agent flag when task has agent', () => {
      supervisor.submit('test prompt', { agent: 'test-engineer' });

      expect(mockChildProcess.spawn).toHaveBeenCalledWith(
        'claude',
        ['-p', 'test prompt', '--agent', 'test-engineer'],
        expect.any(Object)
      );
    });

    it('calls taskStore.startTask', () => {
      const task = supervisor.submit('test');

      expect(mockTaskStore.startTask).toHaveBeenCalledWith(task.id, mockProc.pid);
    });

    it('emits task:started event', () => {
      const listener = vi.fn();
      supervisor.on('task:started', listener);

      supervisor.submit('test');

      expect(listener).toHaveBeenCalledWith({
        taskId: expect.any(String),
        pid: mockProc.pid,
      });
    });

    it('streams stdout', () => {
      const listener = vi.fn();
      supervisor.on('task:output', listener);

      supervisor.submit('test');

      mockProc.stdout.emit('data', Buffer.from('output line 1\n'));
      mockProc.stdout.emit('data', Buffer.from('output line 2\n'));

      expect(listener).toHaveBeenCalledWith({
        taskId: expect.any(String),
        chunk: 'output line 1\n',
        stream: 'stdout',
      });

      expect(listener).toHaveBeenCalledWith({
        taskId: expect.any(String),
        chunk: 'output line 2\n',
        stream: 'stdout',
      });
    });

    it('streams stderr', () => {
      const listener = vi.fn();
      supervisor.on('task:output', listener);

      supervisor.submit('test');

      mockProc.stderr.emit('data', Buffer.from('error message\n'));

      expect(listener).toHaveBeenCalledWith({
        taskId: expect.any(String),
        chunk: 'error message\n',
        stream: 'stderr',
      });
    });

    it('appends output to taskStore', () => {
      const task = supervisor.submit('test');

      mockProc.stdout.emit('data', Buffer.from('output'));

      expect(mockTaskStore.appendOutput).toHaveBeenCalledWith(task.id, 'output');
    });

    it('handles exit code 0 as completed', () => {
      const listener = vi.fn();
      supervisor.on('task:completed', listener);

      const task = supervisor.submit('test');

      mockProc.stdout.emit('data', Buffer.from('result'));
      mockProc.emit('exit', 0, null);

      expect(mockTaskStore.completeTask).toHaveBeenCalledWith(task.id, 'result');
      expect(listener).toHaveBeenCalledWith({
        taskId: task.id,
        result: 'result',
        duration: expect.any(Number),
      });
    });

    it('handles non-zero exit code as failed', () => {
      const listener = vi.fn();
      supervisor.on('task:failed', listener);

      const task = supervisor.submit('test');

      mockProc.stderr.emit('data', Buffer.from('error message'));
      mockProc.emit('exit', 1, null);

      expect(mockTaskStore.failTask).toHaveBeenCalledWith(task.id, 'error message');
      expect(listener).toHaveBeenCalledWith({
        taskId: task.id,
        error: 'error message',
        exitCode: 1,
      });
    });

    it('handles SIGTERM as cancelled', () => {
      const listener = vi.fn();
      supervisor.on('task:cancelled', listener);

      const task = supervisor.submit('test');

      mockProc.emit('exit', null, 'SIGTERM');

      expect(mockTaskStore.cancelTask).toHaveBeenCalledWith(task.id);
      expect(listener).toHaveBeenCalledWith({
        taskId: task.id,
        signal: 'SIGTERM',
      });
    });

    it('handles SIGKILL as cancelled', () => {
      const task = supervisor.submit('test');

      mockProc.emit('exit', null, 'SIGKILL');

      expect(mockTaskStore.cancelTask).toHaveBeenCalledWith(task.id);
    });

    it('handles process error events', () => {
      const listener = vi.fn();
      supervisor.on('task:failed', listener);

      const task = supervisor.submit('test');

      mockProc.emit('error', new Error('ENOENT'));

      expect(mockTaskStore.failTask).toHaveBeenCalledWith(task.id, 'ENOENT');
      expect(listener).toHaveBeenCalledWith({
        taskId: task.id,
        error: 'ENOENT',
      });
    });

    it('handles timeout', async () => {
      vi.useFakeTimers();

      const listener = vi.fn();
      supervisor.on('task:timeout', listener);

      const task = supervisor.submit('test');

      vi.advanceTimersByTime(supervisor.taskTimeout);

      expect(mockProc.kill).toHaveBeenCalledWith('SIGTERM');
      expect(mockTaskStore.failTask).toHaveBeenCalledWith(
        task.id,
        expect.stringContaining('timed out')
      );
      expect(listener).toHaveBeenCalledWith({ taskId: task.id });

      vi.useRealTimers();
    });

    it('removes from running map on exit', () => {
      const task = supervisor.submit('test');

      expect(supervisor.running.has(task.id)).toBe(true);

      mockProc.emit('exit', 0, null);

      expect(supervisor.running.has(task.id)).toBe(false);
    });

    it('triggers queue processing after task completes', () => {
      supervisor.maxConcurrency = 1;

      supervisor.submit('task1');
      supervisor.submit('task2');

      expect(supervisor.queue.length).toBe(1);

      mockProc.emit('exit', 0, null);

      // Should have processed next task
      expect(supervisor.queue.length).toBe(0);
    });
  });

  describe('priority ordering', () => {
    let mockProc;

    beforeEach(() => {
      mockProc = createMockProcess();
      mockChildProcess.spawn = vi.fn(() => {
        const proc = createMockProcess();
        setTimeout(() => proc.emit('exit', 0, null), 0);
        return proc;
      });
    });

    it('processes higher priority tasks first', async () => {
      supervisor.maxConcurrency = 1;

      const low = supervisor.submit('low', { priority: 1 });
      const high = supervisor.submit('high', { priority: 10 });
      const medium = supervisor.submit('medium', { priority: 5 });

      // Low priority task starts first (already running)
      expect(supervisor.queue[0].id).toBe(high.id);
      expect(supervisor.queue[1].id).toBe(medium.id);
    });
  });
});
