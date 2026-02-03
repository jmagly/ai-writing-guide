/**
 * Multi-Loop State Manager - Synchronous version
 *
 * @module tools/ralph/state-manager-sync
 */

import fs from 'fs';
import path from 'path';
import { LoopRegistry } from './registry-sync.mjs';

export class MultiLoopStateManager {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.baseDir = path.join(projectRoot, '.aiwg', 'ralph');
    this.loopsDir = path.join(this.baseDir, 'loops');
    this.archiveDir = path.join(this.baseDir, 'archive');
    this.sharedDir = path.join(this.baseDir, 'shared');

    this.registry = new LoopRegistry(projectRoot);
    this.ensureDirectories();
  }

  ensureDirectories() {
    for (const dir of [
      this.baseDir,
      this.loopsDir,
      this.archiveDir,
      this.sharedDir,
    ]) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    const sharedPatternsDir = path.join(this.sharedDir, 'patterns');
    const sharedMemoryDir = path.join(this.sharedDir, 'memory');

    for (const dir of [sharedPatternsDir, sharedMemoryDir]) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  createLoop(config, options = {}) {
    const loopId =
      config.loopId ||
      this.registry.generateLoopId(config.task || 'unnamed-task');

    const loopDir = path.join(this.loopsDir, loopId);
    if (fs.existsSync(loopDir)) {
      throw new Error(`Loop directory already exists: ${loopId}`);
    }

    fs.mkdirSync(loopDir, { recursive: true });

    const subdirs = ['iterations', 'checkpoints', 'debug-memory'];
    for (const subdir of subdirs) {
      fs.mkdirSync(path.join(loopDir, subdir), { recursive: true });
    }

    const state = {
      loopId,
      active: true,
      task: config.task || 'Unnamed task',
      completion: config.completion || null,
      maxIterations: config.maxIterations || 10,
      timeoutMinutes: config.timeout || 60,
      timeoutMs: (config.timeout || 60) * 60 * 1000,
      startTime: new Date().toISOString(),
      startTimeMs: Date.now(),
      currentIteration: 0,
      autoCommit: config.autoCommit !== false,
      branch: config.branch || null,
      completed: false,
      status: 'running',
      iterations: [],
      lastResult: null,
      learnings: null,
    };

    this.saveLoopState(loopId, state);

    this.registry.register(
      loopId,
      {
        task_summary: config.task,
        status: 'running',
        owner: config.owner,
        iteration: 0,
        max_iterations: config.maxIterations || 10,
        completion: config.completion,
        priority: config.priority,
        tags: config.tags,
      },
      options
    );

    return { loopId, state };
  }

  getLoopDir(loopId) {
    return path.join(this.loopsDir, loopId);
  }

  getStatePath(loopId) {
    return path.join(this.getLoopDir(loopId), 'state.json');
  }

  getLoopState(loopId) {
    const statePath = this.getStatePath(loopId);

    if (!fs.existsSync(statePath)) {
      throw new Error(`Loop not found: ${loopId}`);
    }

    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  }

  saveLoopState(loopId, state) {
    const statePath = this.getStatePath(loopId);
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  }

  updateLoopState(loopId, updates) {
    const state = this.getLoopState(loopId);
    Object.assign(state, updates);
    this.saveLoopState(loopId, state);

    if (updates.status || updates.currentIteration !== undefined) {
      this.registry.update(loopId, {
        status: updates.status || state.status,
        iteration: updates.currentIteration || state.currentIteration,
      });
    }
  }

  listActiveLoops() {
    return this.registry.listActive();
  }

  archiveLoop(loopId) {
    const srcDir = this.getLoopDir(loopId);
    const destDir = path.join(this.archiveDir, loopId);

    if (!fs.existsSync(srcDir)) {
      throw new Error(`Loop not found: ${loopId}`);
    }

    fs.renameSync(srcDir, destDir);
    this.registry.unregister(loopId);
  }

  detectSingleLoop() {
    const activeLoops = this.listActiveLoops();

    if (activeLoops.length === 1) {
      return {
        loopId: activeLoops[0].loop_id,
        ...this.getLoopState(activeLoops[0].loop_id),
      };
    }

    return null;
  }

  getIterationsDir(loopId) {
    return path.join(this.getLoopDir(loopId), 'iterations');
  }

  getCheckpointsDir(loopId) {
    return path.join(this.getLoopDir(loopId), 'checkpoints');
  }

  getDebugMemoryDir(loopId) {
    return path.join(this.getLoopDir(loopId), 'debug-memory');
  }

  saveIteration(loopId, iterationNum, data) {
    const iterPath = path.join(
      this.getIterationsDir(loopId),
      `iteration-${iterationNum}.json`
    );
    fs.writeFileSync(iterPath, JSON.stringify(data, null, 2));
  }

  loadIteration(loopId, iterationNum) {
    const iterPath = path.join(
      this.getIterationsDir(loopId),
      `iteration-${iterationNum}.json`
    );

    if (!fs.existsSync(iterPath)) {
      return null;
    }

    return JSON.parse(fs.readFileSync(iterPath, 'utf8'));
  }

  getSharedPatternsDir() {
    return path.join(this.sharedDir, 'patterns');
  }

  getSharedMemoryDir() {
    return path.join(this.sharedDir, 'memory');
  }
}
