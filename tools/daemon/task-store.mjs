/**
 * Task Store - JSON file persistence for agent tasks
 *
 * Tracks all spawned agent tasks with state, results, and history.
 * Provides task queries and summary generation for session reattach.
 *
 * @implements @.aiwg/requirements/use-cases/UC-IPC-002.md
 * @tests @test/unit/daemon/task-store.test.js
 */

import fs from 'node:fs';
import path from 'node:path';

const TASK_STATES = ['queued', 'running', 'completed', 'failed', 'cancelled'];

export class TaskStore {
  constructor(storePath) {
    this.storePath = storePath;
    this.tasks = new Map();
    this.taskIdCounter = 0;
  }

  /**
   * Initialize store - load existing tasks from disk
   */
  async initialize() {
    const dir = path.dirname(this.storePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(this.storePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.storePath, 'utf8'));
        for (const task of data.tasks || []) {
          this.tasks.set(task.id, task);
          // Track highest ID for counter
          const numPart = parseInt(task.id.split('-').pop(), 10);
          if (!isNaN(numPart) && numPart >= this.taskIdCounter) {
            this.taskIdCounter = numPart + 1;
          }
        }
      } catch {
        // Corrupted file, start fresh
        this.tasks.clear();
      }
    }
  }

  /**
   * Create a new task
   */
  createTask(options) {
    const id = `task-${String(this.taskIdCounter++).padStart(4, '0')}`;
    const task = {
      id,
      prompt: options.prompt,
      agent: options.agent || null,
      priority: options.priority || 0,
      state: 'queued',
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      pid: null,
      result: null,
      error: null,
      output: '',
      metadata: options.metadata || {},
    };

    this.tasks.set(id, task);
    this._persist();
    return task;
  }

  /**
   * Update task state
   */
  updateTask(id, updates) {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task not found: ${id}`);
    }

    // Validate state transitions
    if (updates.state) {
      if (!TASK_STATES.includes(updates.state)) {
        throw new Error(`Invalid state: ${updates.state}`);
      }
    }

    Object.assign(task, updates);
    this._persist();
    return task;
  }

  /**
   * Mark task as running
   */
  startTask(id, pid) {
    return this.updateTask(id, {
      state: 'running',
      startedAt: new Date().toISOString(),
      pid,
    });
  }

  /**
   * Mark task as completed
   */
  completeTask(id, result) {
    return this.updateTask(id, {
      state: 'completed',
      completedAt: new Date().toISOString(),
      result,
      pid: null,
    });
  }

  /**
   * Mark task as failed
   */
  failTask(id, error) {
    return this.updateTask(id, {
      state: 'failed',
      completedAt: new Date().toISOString(),
      error: typeof error === 'string' ? error : error.message,
      pid: null,
    });
  }

  /**
   * Mark task as cancelled
   */
  cancelTask(id) {
    return this.updateTask(id, {
      state: 'cancelled',
      completedAt: new Date().toISOString(),
      pid: null,
    });
  }

  /**
   * Append output to a task
   */
  appendOutput(id, chunk) {
    const task = this.tasks.get(id);
    if (task) {
      task.output += chunk;
      // Don't persist on every chunk - too expensive
    }
  }

  /**
   * Get a task by ID
   */
  getTask(id) {
    return this.tasks.get(id) || null;
  }

  /**
   * Get all tasks, optionally filtered by state
   */
  getTasks(filter = {}) {
    let result = Array.from(this.tasks.values());

    if (filter.state) {
      result = result.filter(t => t.state === filter.state);
    }

    if (filter.agent) {
      result = result.filter(t => t.agent === filter.agent);
    }

    // Sort by creation time, newest first
    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (filter.limit) {
      result = result.slice(0, filter.limit);
    }

    return result;
  }

  /**
   * Get summary statistics
   */
  getStats() {
    const tasks = Array.from(this.tasks.values());
    return {
      total: tasks.length,
      queued: tasks.filter(t => t.state === 'queued').length,
      running: tasks.filter(t => t.state === 'running').length,
      completed: tasks.filter(t => t.state === 'completed').length,
      failed: tasks.filter(t => t.state === 'failed').length,
      cancelled: tasks.filter(t => t.state === 'cancelled').length,
    };
  }

  /**
   * Generate a summary for session reattach
   */
  getSummary() {
    const stats = this.getStats();
    const running = this.getTasks({ state: 'running' });
    const recent = this.getTasks({ limit: 5 });

    return {
      stats,
      running: running.map(t => ({
        id: t.id,
        prompt: t.prompt.slice(0, 80),
        agent: t.agent,
        startedAt: t.startedAt,
      })),
      recent: recent.map(t => ({
        id: t.id,
        prompt: t.prompt.slice(0, 80),
        state: t.state,
        completedAt: t.completedAt,
      })),
    };
  }

  /**
   * Clean up old completed/failed tasks
   */
  cleanup(maxAge = 7 * 24 * 60 * 60 * 1000) {
    const cutoff = Date.now() - maxAge;
    let removed = 0;

    for (const [id, task] of this.tasks) {
      if (
        (task.state === 'completed' || task.state === 'failed' || task.state === 'cancelled') &&
        task.completedAt &&
        new Date(task.completedAt).getTime() < cutoff
      ) {
        this.tasks.delete(id);
        removed++;
      }
    }

    if (removed > 0) {
      this._persist();
    }

    return removed;
  }

  /**
   * Get count of tasks
   */
  get size() {
    return this.tasks.size;
  }

  // --- Private methods ---

  _persist() {
    const data = {
      version: 1,
      updatedAt: new Date().toISOString(),
      tasks: Array.from(this.tasks.values()),
    };

    try {
      fs.writeFileSync(this.storePath, JSON.stringify(data, null, 2));
    } catch (err) {
      // Log but don't throw - persistence failure shouldn't break operations
      console.error(`TaskStore: Failed to persist: ${err.message}`);
    }
  }
}
