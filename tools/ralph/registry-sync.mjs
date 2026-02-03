/**
 * Loop Registry - Synchronous version for simplicity
 *
 * Manages registry of all active Ralph loops.
 * Synchronous operations for test-first implementation.
 *
 * @module tools/ralph/registry-sync
 */

import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const MAX_CONCURRENT_LOOPS = 4;

export class LoopRegistry {
  constructor(baseDir) {
    this.baseDir = baseDir;
    this.ralphDir = path.join(baseDir, '.aiwg', 'ralph');
    this.registryPath = path.join(this.ralphDir, 'registry.json');

    if (!fs.existsSync(this.ralphDir)) {
      fs.mkdirSync(this.ralphDir, { recursive: true });
    }
  }

  load() {
    if (!fs.existsSync(this.registryPath)) {
      const initialRegistry = {
        version: '2.0.0',
        max_concurrent_loops: MAX_CONCURRENT_LOOPS,
        updated_at: new Date().toISOString(),
        active_loops: [],
        total_active: 0,
        total_completed: 0,
        total_aborted: 0,
      };
      fs.writeFileSync(
        this.registryPath,
        JSON.stringify(initialRegistry, null, 2)
      );
      return initialRegistry;
    }

    return JSON.parse(fs.readFileSync(this.registryPath, 'utf8'));
  }

  save(data) {
    data.updated_at = new Date().toISOString();
    data.total_active = data.active_loops.length;
    fs.writeFileSync(this.registryPath, JSON.stringify(data, null, 2));
  }

  register(loopId, config, options = {}) {
    const registry = this.load();

    if (
      registry.active_loops.length >= MAX_CONCURRENT_LOOPS &&
      !options.force
    ) {
      const paths = this.calculateCommunicationPaths(
        registry.active_loops.length + 1
      );
      throw new Error(
        `Cannot create loop: ${registry.active_loops.length} loops already active (max: ${MAX_CONCURRENT_LOOPS}).\n` +
          `Adding another would create ${paths} communication paths (REF-088).\n` +
          `Use --force to override or complete/abort an existing loop.`
      );
    }

    if (
      registry.active_loops.length >= MAX_CONCURRENT_LOOPS &&
      options.force
    ) {
      const paths = this.calculateCommunicationPaths(
        registry.active_loops.length + 1
      );
      console.warn(
        `WARNING: Exceeding recommended MAX_CONCURRENT_LOOPS (${MAX_CONCURRENT_LOOPS})`
      );
      console.warn(
        `Communication paths: ${paths} (overhead increases quadratically)`
      );
    }

    const entry = {
      loop_id: loopId,
      task_summary: config.task_summary || config.task || 'Unnamed task',
      status: config.status || 'running',
      started_at: new Date().toISOString(),
      owner: config.owner || 'unknown',
      pid: config.pid || process.pid,
      iteration: config.iteration || 0,
      max_iterations: config.max_iterations || config.maxIterations || 10,
      completion_criteria: config.completion || null,
      priority: config.priority || 'medium',
      tags: config.tags || [],
    };

    registry.active_loops.push(entry);
    this.save(registry);

    return entry;
  }

  unregister(loopId) {
    const registry = this.load();
    const index = registry.active_loops.findIndex(
      (l) => l.loop_id === loopId
    );

    if (index === -1) {
      return false;
    }

    registry.active_loops.splice(index, 1);
    registry.total_completed++;
    this.save(registry);

    return true;
  }

  get(loopId) {
    const registry = this.load();
    return registry.active_loops.find((l) => l.loop_id === loopId) || null;
  }

  exists(loopId) {
    return this.get(loopId) !== null;
  }

  listActive() {
    const registry = this.load();
    return registry.active_loops;
  }

  calculateCommunicationPaths(n) {
    return (n * (n - 1)) / 2;
  }

  generateLoopId(task) {
    const slug = task
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 30);

    const shortUuid = randomUUID().split('-')[0];

    return `ralph-${slug}-${shortUuid}`;
  }

  update(loopId, updates) {
    const registry = this.load();
    const loop = registry.active_loops.find((l) => l.loop_id === loopId);

    if (!loop) {
      throw new Error(`Loop not found: ${loopId}`);
    }

    Object.assign(loop, updates);
    this.save(registry);

    return loop;
  }
}
