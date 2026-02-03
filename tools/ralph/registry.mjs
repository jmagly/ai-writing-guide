/**
 * Loop Registry - Central tracking for multi-loop Ralph
 *
 * Manages registry of all active Ralph loops to enable:
 * - Concurrent loop execution without conflicts
 * - MAX_CONCURRENT_LOOPS enforcement (REF-086, REF-088)
 * - Cross-loop coordination and learning
 * - Recovery from crashed loops
 *
 * Based on:
 * - REF-086: Coordination Tax (17.2x error trap, 4-agent threshold)
 * - REF-088: DEV Guide 2026 (optimal 3-7 agents, n*(n-1)/2 paths)
 * - REF-082: Multi-Agent Orchestration (ConcurrencyManager pattern)
 *
 * @module tools/ralph/registry
 */

import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const MAX_CONCURRENT_LOOPS = 4; // Research-backed limit (REF-086, REF-088)

/**
 * Loop Registry
 *
 * Manages the central registry of active Ralph loops with file locking
 * to prevent concurrent modification conflicts.
 */
export class LoopRegistry {
  /**
   * @param {string} baseDir - Base directory for registry (usually project root)
   */
  constructor(baseDir) {
    this.baseDir = baseDir;
    this.ralphDir = path.join(baseDir, '.aiwg', 'ralph');
    this.registryPath = path.join(this.ralphDir, 'registry.json');
    this.lockPath = `${this.registryPath}.lock`;

    // Ensure directories exist
    if (!fs.existsSync(this.ralphDir)) {
      fs.mkdirSync(this.ralphDir, { recursive: true });
    }
  }

  /**
   * Load registry data (creates if doesn't exist)
   */
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

  /**
   * Save registry data
   */
  save(data) {
    data.updated_at = new Date().toISOString();
    data.total_active = data.active_loops.length;
    fs.writeFileSync(this.registryPath, JSON.stringify(data, null, 2));
  }

  /**
   * Execute function with registry lock
   *
   * Implements lease-based locking with stale detection per Kleppmann's
   * distributed locking guide.
   *
   * @param {Function} fn - Function to execute while holding lock
   * @returns {Promise<any>} Result of fn
   */
  async withLock(fn) {
    const LEASE_MS = 30000; // 30 second lease
    const RETRY_MS = 100;
    const MAX_ATTEMPTS = 300; // 30 seconds total

    let attempts = 0;

    while (attempts < MAX_ATTEMPTS) {
      try {
        // Try to acquire lock (atomic file creation)
        const lockData = {
          pid: process.pid,
          timestamp: Date.now(),
          leaseExpiry: Date.now() + LEASE_MS,
        };

        fs.writeFileSync(
          this.lockPath,
          JSON.stringify(lockData, null, 2),
          { flag: 'wx' } // Exclusive create
        );

        // Lock acquired, execute function
        try {
          return await fn();
        } finally {
          // Release lock
          this.releaseLock();
        }
      } catch (err) {
        if (err.code === 'EEXIST') {
          // Lock exists - check if stale
          try {
            const existingLock = JSON.parse(
              fs.readFileSync(this.lockPath, 'utf8')
            );

            // Check if lease expired
            if (Date.now() > existingLock.leaseExpiry) {
              fs.unlinkSync(this.lockPath);
              continue; // Retry immediately
            }

            // Check if process dead
            if (!this.processExists(existingLock.pid)) {
              fs.unlinkSync(this.lockPath);
              continue; // Retry immediately
            }

            // Lock is valid, wait and retry
            await this.sleep(RETRY_MS);
            attempts++;
          } catch {
            // Lock file corrupted, remove it
            try {
              fs.unlinkSync(this.lockPath);
            } catch {
              // Ignore
            }
            continue;
          }
        } else {
          throw err;
        }
      }
    }

    throw new Error('Failed to acquire registry lock after maximum attempts');
  }

  /**
   * Release lock (only if we own it)
   */
  releaseLock() {
    try {
      if (fs.existsSync(this.lockPath)) {
        const lockData = JSON.parse(fs.readFileSync(this.lockPath, 'utf8'));
        if (lockData.pid === process.pid) {
          fs.unlinkSync(this.lockPath);
        }
      }
    } catch {
      // Ignore errors during cleanup
    }
  }

  /**
   * Check if process exists (cross-platform)
   */
  processExists(pid) {
    try {
      process.kill(pid, 0); // Signal 0 = check existence
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Register a new loop
   *
   * @param {string} loopId - Unique loop identifier
   * @param {object} config - Loop configuration
   * @param {object} options - Options (e.g., { force: true })
   */
  register(loopId, config, options = {}) {
    return this.withLock(() => {
      const registry = this.load();

      // Check MAX_CONCURRENT_LOOPS
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

      // Warn if exceeding limit with --force
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

      // Add to registry
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
    });
  }

  /**
   * Unregister a loop (on completion or abort)
   *
   * @param {string} loopId - Loop to unregister
   */
  unregister(loopId) {
    return this.withLock(() => {
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
    });
  }

  /**
   * Get loop entry by ID
   *
   * @param {string} loopId - Loop ID to find
   * @returns {object|null} Loop entry or null
   */
  get(loopId) {
    const registry = this.load();
    return registry.active_loops.find((l) => l.loop_id === loopId) || null;
  }

  /**
   * Check if loop exists
   *
   * @param {string} loopId - Loop ID to check
   * @returns {boolean} True if exists
   */
  exists(loopId) {
    return this.get(loopId) !== null;
  }

  /**
   * List all active loops
   *
   * @returns {Array} Active loop entries
   */
  listActive() {
    const registry = this.load();
    return registry.active_loops;
  }

  /**
   * Calculate communication paths: n * (n - 1) / 2
   *
   * Based on REF-088 DEV Multi-Agent Guide 2026
   *
   * @param {number} n - Number of loops
   * @returns {number} Communication paths
   */
  calculateCommunicationPaths(n) {
    return (n * (n - 1)) / 2;
  }

  /**
   * Generate unique loop ID
   *
   * Pattern: ralph-{task-slug}-{short-uuid}
   *
   * @param {string} task - Task description
   * @returns {string} Generated loop ID
   */
  generateLoopId(task) {
    const slug = task
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with dash
      .replace(/^-+|-+$/g, '') // Trim leading/trailing dashes
      .slice(0, 30); // Limit length

    const shortUuid = randomUUID().split('-')[0]; // First 8 chars

    return `ralph-${slug}-${shortUuid}`;
  }

  /**
   * Update loop entry
   *
   * @param {string} loopId - Loop to update
   * @param {object} updates - Fields to update
   */
  update(loopId, updates) {
    return this.withLock(() => {
      const registry = this.load();
      const loop = registry.active_loops.find((l) => l.loop_id === loopId);

      if (!loop) {
        throw new Error(`Loop not found: ${loopId}`);
      }

      Object.assign(loop, updates);
      this.save(registry);

      return loop;
    });
  }
}
