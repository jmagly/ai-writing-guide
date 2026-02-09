/**
 * Agent Supervisor - Task queue and process management for claude -p spawning
 *
 * Manages a pool of concurrent agent subprocesses, tracking their lifecycle,
 * streaming output, and reporting results through the event system.
 *
 * @implements @.aiwg/requirements/use-cases/UC-AGENT-001.md
 * @tests @test/unit/daemon/agent-supervisor.test.js
 */

import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';

export class AgentSupervisor extends EventEmitter {
  constructor(options = {}) {
    super();
    this.maxConcurrency = options.maxConcurrency ?? 3;
    this.taskStore = options.taskStore || null;
    this.queue = [];
    this.running = new Map(); // taskId -> { process, task }
    this.shutdownInProgress = false;
    this.agentCommand = options.agentCommand || 'claude';
    this.agentArgs = options.agentArgs || [];
    this.taskTimeout = options.taskTimeout || 120 * 60 * 1000; // 2 hours default
  }

  /**
   * Submit a task to the queue
   * Returns the task object with assigned ID
   */
  submit(prompt, options = {}) {
    if (this.shutdownInProgress) {
      throw new Error('Supervisor is shutting down');
    }

    // Create task in store if available
    const task = this.taskStore
      ? this.taskStore.createTask({ prompt, agent: options.agent, priority: options.priority || 0, metadata: options.metadata })
      : {
          id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          prompt,
          agent: options.agent || null,
          priority: options.priority || 0,
          state: 'queued',
          createdAt: new Date().toISOString(),
        };

    this.queue.push(task);
    this.queue.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    this.emit('task:queued', { taskId: task.id, prompt: prompt.slice(0, 80), queueSize: this.queue.length });

    this._processQueue();
    return task;
  }

  /**
   * Cancel a task (queued or running)
   */
  cancel(taskId) {
    // Check queue first
    const queueIdx = this.queue.findIndex(t => t.id === taskId);
    if (queueIdx !== -1) {
      this.queue.splice(queueIdx, 1);
      if (this.taskStore) {
        this.taskStore.cancelTask(taskId);
      }
      this.emit('task:cancelled', { taskId });
      return true;
    }

    // Check running
    const entry = this.running.get(taskId);
    if (entry) {
      try {
        entry.process.kill('SIGTERM');
      } catch {
        // Process may have already exited
      }
      // Cleanup happens in exit handler
      return true;
    }

    return false;
  }

  /**
   * Get status of all tasks
   */
  getStatus() {
    return {
      running: this.running.size,
      queued: this.queue.length,
      maxConcurrency: this.maxConcurrency,
      tasks: {
        running: Array.from(this.running.entries()).map(([id, entry]) => ({
          id,
          prompt: entry.task.prompt.slice(0, 80),
          agent: entry.task.agent,
          startedAt: entry.task.startedAt,
          pid: entry.process.pid,
        })),
        queued: this.queue.map(t => ({
          id: t.id,
          prompt: t.prompt.slice(0, 80),
          agent: t.agent,
          priority: t.priority,
        })),
      },
    };
  }

  /**
   * Graceful shutdown - drain queue and wait for running tasks
   */
  async shutdown(timeoutMs = 30000) {
    this.shutdownInProgress = true;

    // Reject queued tasks
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (this.taskStore) {
        this.taskStore.cancelTask(task.id);
      }
      this.emit('task:cancelled', { taskId: task.id, reason: 'shutdown' });
    }

    // Wait for running tasks to complete or timeout
    if (this.running.size === 0) {
      this.shutdownInProgress = false;
      return;
    }

    const waitForCompletion = new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.running.size === 0) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });

    const timeout = new Promise((resolve) => {
      setTimeout(() => {
        // Force kill remaining
        for (const [taskId, entry] of this.running) {
          try {
            entry.process.kill('SIGKILL');
          } catch {
            // Already dead
          }
          if (this.taskStore) {
            this.taskStore.failTask(taskId, 'Killed during shutdown');
          }
        }
        this.running.clear();
        resolve();
      }, timeoutMs);
    });

    await Promise.race([waitForCompletion, timeout]);
    this.shutdownInProgress = false;
  }

  /**
   * Get running task count
   */
  get runningCount() {
    return this.running.size;
  }

  /**
   * Get queued task count
   */
  get queuedCount() {
    return this.queue.length;
  }

  // --- Private methods ---

  _processQueue() {
    while (
      this.running.size < this.maxConcurrency &&
      this.queue.length > 0 &&
      !this.shutdownInProgress
    ) {
      const task = this.queue.shift();
      this._runTask(task);
    }
  }

  _runTask(task) {
    const args = [...this.agentArgs, '-p', task.prompt];

    if (task.agent) {
      args.push('--agent', task.agent);
    }

    const proc = spawn(this.agentCommand, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    // Track start time
    task.startedAt = new Date().toISOString();
    task.state = 'running';

    if (this.taskStore) {
      this.taskStore.startTask(task.id, proc.pid);
    }

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;
      if (this.taskStore) {
        this.taskStore.appendOutput(task.id, text);
      }
      this.emit('task:output', { taskId: task.id, chunk: text, stream: 'stdout' });
    });

    proc.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      this.emit('task:output', { taskId: task.id, chunk: text, stream: 'stderr' });
    });

    // Timeout handler
    const timeoutTimer = setTimeout(() => {
      try {
        proc.kill('SIGTERM');
      } catch {
        // Already dead
      }
      if (this.taskStore) {
        this.taskStore.failTask(task.id, `Task timed out after ${this.taskTimeout}ms`);
      }
      this.running.delete(task.id);
      this.emit('task:timeout', { taskId: task.id });
      this._processQueue();
    }, this.taskTimeout);

    proc.on('exit', (code, signal) => {
      clearTimeout(timeoutTimer);
      this.running.delete(task.id);

      if (signal === 'SIGTERM' || signal === 'SIGKILL') {
        // Cancelled or killed
        if (this.taskStore && this.taskStore.getTask(task.id)?.state === 'running') {
          this.taskStore.cancelTask(task.id);
        }
        this.emit('task:cancelled', { taskId: task.id, signal });
      } else if (code === 0) {
        if (this.taskStore) {
          this.taskStore.completeTask(task.id, stdout);
        }
        this.emit('task:completed', {
          taskId: task.id,
          result: stdout,
          duration: Date.now() - new Date(task.startedAt).getTime(),
        });
      } else {
        const errorMsg = stderr || `Process exited with code ${code}`;
        if (this.taskStore) {
          this.taskStore.failTask(task.id, errorMsg);
        }
        this.emit('task:failed', {
          taskId: task.id,
          error: errorMsg,
          exitCode: code,
        });
      }

      this._processQueue();
    });

    proc.on('error', (err) => {
      clearTimeout(timeoutTimer);
      this.running.delete(task.id);

      if (this.taskStore) {
        this.taskStore.failTask(task.id, err.message);
      }
      this.emit('task:failed', {
        taskId: task.id,
        error: err.message,
      });

      this._processQueue();
    });

    this.running.set(task.id, { process: proc, task });
    this.emit('task:started', { taskId: task.id, pid: proc.pid });
  }
}
