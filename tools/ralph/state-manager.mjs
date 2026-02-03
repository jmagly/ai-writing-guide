/**
 * Multi-Loop State Manager
 *
 * Manages loop-scoped state files with isolation between concurrent loops.
 * Each loop gets its own directory with state, iterations, checkpoints, etc.
 *
 * Directory structure:
 *   .aiwg/ralph/
 *   ├── registry.json              # Central registry
 *   ├── loops/                     # Per-loop directories
 *   │   ├── {loop-id-1}/
 *   │   │   ├── state.json         # Loop state
 *   │   │   ├── iterations/
 *   │   │   ├── checkpoints/
 *   │   │   └── debug-memory/
 *   │   └── {loop-id-2}/
 *   │       └── ...
 *   ├── shared/                    # Cross-loop resources
 *   │   ├── patterns/
 *   │   └── memory/
 *   └── archive/                   # Completed loops
 *
 * @module tools/ralph/state-manager
 */

import fs from 'fs';
import path from 'path';
import { LoopRegistry } from './registry.mjs';

/**
 * Multi-Loop State Manager
 *
 * Provides loop-scoped state isolation for concurrent Ralph loops.
 */
export class MultiLoopStateManager {
  /**
   * @param {string} projectRoot - Project root directory
   */
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.baseDir = path.join(projectRoot, '.aiwg', 'ralph');
    this.loopsDir = path.join(this.baseDir, 'loops');
    this.archiveDir = path.join(this.baseDir, 'archive');
    this.sharedDir = path.join(this.baseDir, 'shared');

    this.registry = new LoopRegistry(projectRoot);

    // Ensure directories exist
    this.ensureDirectories();
  }

  /**
   * Ensure base directories exist
   */
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

    // Create shared subdirectories
    const sharedPatternsDir = path.join(this.sharedDir, 'patterns');
    const sharedMemoryDir = path.join(this.sharedDir, 'memory');

    for (const dir of [sharedPatternsDir, sharedMemoryDir]) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  /**
   * Create new loop with unique ID
   *
   * @param {object} config - Loop configuration
   * @param {object} options - Options (e.g., { force: true })
   * @returns {object} { loopId, state }
   */
  createLoop(config, options = {}) {
    // Generate loop ID
    const loopId =
      config.loopId ||
      this.registry.generateLoopId(config.task || 'unnamed-task');

    // Create loop directory
    const loopDir = path.join(this.loopsDir, loopId);
    if (fs.existsSync(loopDir)) {
      throw new Error(`Loop directory already exists: ${loopId}`);
    }

    fs.mkdirSync(loopDir, { recursive: true });

    // Create subdirectories
    const subdirs = ['iterations', 'checkpoints', 'debug-memory'];
    for (const subdir of subdirs) {
      fs.mkdirSync(path.join(loopDir, subdir), { recursive: true });
    }

    // Initialize state
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

    // Save state
    this.saveLoopState(loopId, state);

    // Register in registry
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

  /**
   * Get loop directory path
   *
   * @param {string} loopId - Loop ID
   * @returns {string} Loop directory path
   */
  getLoopDir(loopId) {
    return path.join(this.loopsDir, loopId);
  }

  /**
   * Get loop state file path
   *
   * @param {string} loopId - Loop ID
   * @returns {string} State file path
   */
  getStatePath(loopId) {
    return path.join(this.getLoopDir(loopId), 'state.json');
  }

  /**
   * Load loop state
   *
   * @param {string} loopId - Loop ID
   * @returns {object} Loop state
   */
  getLoopState(loopId) {
    const statePath = this.getStatePath(loopId);

    if (!fs.existsSync(statePath)) {
      throw new Error(`Loop not found: ${loopId}`);
    }

    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  }

  /**
   * Save loop state
   *
   * @param {string} loopId - Loop ID
   * @param {object} state - State to save
   */
  saveLoopState(loopId, state) {
    const statePath = this.getStatePath(loopId);
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  }

  /**
   * Update loop state (partial update)
   *
   * @param {string} loopId - Loop ID
   * @param {object} updates - Fields to update
   */
  updateLoopState(loopId, updates) {
    const state = this.getLoopState(loopId);
    Object.assign(state, updates);
    this.saveLoopState(loopId, state);

    // Update registry if relevant fields changed
    if (updates.status || updates.currentIteration !== undefined) {
      this.registry.update(loopId, {
        status: updates.status || state.status,
        iteration: updates.currentIteration || state.currentIteration,
      });
    }
  }

  /**
   * List all active loops
   *
   * @returns {Array} Active loops from registry
   */
  listActiveLoops() {
    return this.registry.listActive();
  }

  /**
   * Archive completed loop
   *
   * Moves loop directory from loops/ to archive/ and unregisters.
   *
   * @param {string} loopId - Loop to archive
   */
  archiveLoop(loopId) {
    const srcDir = this.getLoopDir(loopId);
    const destDir = path.join(this.archiveDir, loopId);

    if (!fs.existsSync(srcDir)) {
      throw new Error(`Loop not found: ${loopId}`);
    }

    // Move directory
    fs.renameSync(srcDir, destDir);

    // Unregister
    this.registry.unregister(loopId);
  }

  /**
   * Detect single loop scenario (for backward compatibility)
   *
   * Returns the single active loop if exactly one exists, null otherwise.
   *
   * @returns {object|null} Single loop or null
   */
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

  /**
   * Get iteration directory for a loop
   *
   * @param {string} loopId - Loop ID
   * @returns {string} Iterations directory path
   */
  getIterationsDir(loopId) {
    return path.join(this.getLoopDir(loopId), 'iterations');
  }

  /**
   * Get checkpoints directory for a loop
   *
   * @param {string} loopId - Loop ID
   * @returns {string} Checkpoints directory path
   */
  getCheckpointsDir(loopId) {
    return path.join(this.getLoopDir(loopId), 'checkpoints');
  }

  /**
   * Get debug memory directory for a loop
   *
   * @param {string} loopId - Loop ID
   * @returns {string} Debug memory directory path
   */
  getDebugMemoryDir(loopId) {
    return path.join(this.getLoopDir(loopId), 'debug-memory');
  }

  /**
   * Save iteration data
   *
   * @param {string} loopId - Loop ID
   * @param {number} iterationNum - Iteration number
   * @param {object} data - Iteration data
   */
  saveIteration(loopId, iterationNum, data) {
    const iterPath = path.join(
      this.getIterationsDir(loopId),
      `iteration-${iterationNum}.json`
    );
    fs.writeFileSync(iterPath, JSON.stringify(data, null, 2));
  }

  /**
   * Load iteration data
   *
   * @param {string} loopId - Loop ID
   * @param {number} iterationNum - Iteration number
   * @returns {object} Iteration data
   */
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

  /**
   * Get shared patterns directory
   *
   * @returns {string} Shared patterns directory
   */
  getSharedPatternsDir() {
    return path.join(this.sharedDir, 'patterns');
  }

  /**
   * Get shared memory directory
   *
   * @returns {string} Shared memory directory
   */
  getSharedMemoryDir() {
    return path.join(this.sharedDir, 'memory');
  }
}
