/**
 * Checkpoint Manager for External Ralph Loop
 *
 * Manages periodic checkpoints during long-running Claude sessions (6-8 hours)
 * to enable crash recovery and progress tracking.
 *
 * @implements @.aiwg/requirements/design-ralph-external.md
 */

import { EventEmitter } from 'events';
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

/**
 * @typedef {Object} CheckpointData
 * @property {number} number - Checkpoint number
 * @property {string} timestamp - ISO timestamp of checkpoint
 * @property {number} duration - Milliseconds since session start
 * @property {Object} gitStatus - Git status snapshot
 * @property {string} gitStatus.branch - Current git branch
 * @property {string[]} gitStatus.modified - Modified files
 * @property {string[]} gitStatus.untracked - Untracked files
 * @property {string[]} gitStatus.staged - Staged files
 * @property {Object} aiwgState - .aiwg/ directory state
 * @property {string[]} aiwgState.files - Files in .aiwg/
 * @property {Object} aiwgState.sizes - File sizes in bytes
 * @property {string[]} filesModified - Cumulative files modified since session start
 * @property {string} sessionId - Claude session ID
 * @property {Object} memory - Memory snapshot
 * @property {number} memory.heapUsed - Heap memory used in bytes
 * @property {number} memory.rss - Resident set size in bytes
 */

/**
 * @typedef {Object} CheckpointOptions
 * @property {string} stateDir - State directory (.aiwg/ralph-external)
 * @property {string} projectRoot - Project root directory
 * @property {number} [interval=1800000] - Checkpoint interval in milliseconds (default: 30 min)
 * @property {Function} [onCheckpoint] - Callback when checkpoint is captured
 * @property {string} [sessionId] - Claude session ID
 */

const DEFAULT_INTERVAL = 30 * 60 * 1000; // 30 minutes
const CHECKPOINTS_DIR = 'checkpoints';

export class CheckpointManager extends EventEmitter {
  /**
   * @param {CheckpointOptions} options
   */
  constructor(options = {}) {
    super();
    this.stateDir = options.stateDir;
    this.projectRoot = options.projectRoot;
    this.interval = options.interval || DEFAULT_INTERVAL;
    this.onCheckpoint = options.onCheckpoint;
    this.sessionId = options.sessionId || 'unknown';

    this.timerId = null;
    this.checkpointNumber = 0;
    this.sessionStartTime = Date.now();
    this.checkpointsDir = null;
    this.isRunning = false;

    if (this.stateDir) {
      this.checkpointsDir = join(this.stateDir, CHECKPOINTS_DIR);
    }
  }

  /**
   * Start periodic checkpoint capture
   * @param {CheckpointOptions} options - Checkpoint options (overrides constructor)
   * @returns {CheckpointManager} This instance for chaining
   */
  start(options = {}) {
    if (this.isRunning) {
      throw new Error('Checkpoint manager already running');
    }

    // Override constructor options if provided
    if (options.stateDir) this.stateDir = options.stateDir;
    if (options.projectRoot) this.projectRoot = options.projectRoot;
    if (options.interval) this.interval = options.interval;
    if (options.onCheckpoint) this.onCheckpoint = options.onCheckpoint;
    if (options.sessionId) this.sessionId = options.sessionId;

    if (!this.stateDir || !this.projectRoot) {
      throw new Error('stateDir and projectRoot are required');
    }

    this.checkpointsDir = join(this.stateDir, CHECKPOINTS_DIR);
    this.ensureCheckpointsDir();

    // Determine starting checkpoint number
    this.checkpointNumber = this.getNextCheckpointNumber();
    this.sessionStartTime = Date.now();
    this.isRunning = true;

    // Capture initial checkpoint immediately
    this.captureCheckpoint(this.checkpointNumber);

    // Start periodic timer
    this.timerId = setInterval(() => {
      this.checkpointNumber++;
      this.captureCheckpoint(this.checkpointNumber);
    }, this.interval);

    this.emit('started', {
      interval: this.interval,
      checkpointsDir: this.checkpointsDir,
    });

    return this;
  }

  /**
   * Ensure checkpoints directory exists
   */
  ensureCheckpointsDir() {
    if (!existsSync(this.checkpointsDir)) {
      mkdirSync(this.checkpointsDir, { recursive: true });
    }
  }

  /**
   * Get next checkpoint number based on existing checkpoints
   * @returns {number}
   */
  getNextCheckpointNumber() {
    if (!existsSync(this.checkpointsDir)) {
      return 1;
    }

    const files = readdirSync(this.checkpointsDir);
    const checkpointFiles = files.filter(f => f.match(/^\d+-checkpoint\.json$/));

    if (checkpointFiles.length === 0) {
      return 1;
    }

    const numbers = checkpointFiles.map(f => parseInt(f.split('-')[0], 10));
    return Math.max(...numbers) + 1;
  }

  /**
   * Capture git status snapshot
   * @returns {Object} Git status
   */
  captureGitStatus() {
    try {
      const branch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: this.projectRoot,
        encoding: 'utf8',
      }).trim();

      const statusOutput = execSync('git status --porcelain', {
        cwd: this.projectRoot,
        encoding: 'utf8',
      });

      const modified = [];
      const untracked = [];
      const staged = [];

      for (const line of statusOutput.split('\n')) {
        if (!line) continue;

        const status = line.substring(0, 2);
        const file = line.substring(3);

        if (status[0] !== ' ' && status[0] !== '?') {
          staged.push(file);
        }
        if (status[1] === 'M' || status[1] === 'D') {
          modified.push(file);
        }
        if (status === '??') {
          untracked.push(file);
        }
      }

      return { branch, modified, untracked, staged };
    } catch (e) {
      return {
        branch: 'unknown',
        modified: [],
        untracked: [],
        staged: [],
        error: e.message,
      };
    }
  }

  /**
   * Capture .aiwg/ directory state
   * @returns {Object} AIWG state
   */
  captureAiwgState() {
    const aiwgDir = join(this.projectRoot, '.aiwg');

    if (!existsSync(aiwgDir)) {
      return { files: [], sizes: {} };
    }

    try {
      const files = [];
      const sizes = {};

      const walk = (dir, prefix = '') => {
        const entries = readdirSync(dir);
        for (const entry of entries) {
          const fullPath = join(dir, entry);
          const relativePath = prefix ? `${prefix}/${entry}` : entry;
          const stats = statSync(fullPath);

          if (stats.isDirectory()) {
            walk(fullPath, relativePath);
          } else {
            files.push(relativePath);
            sizes[relativePath] = stats.size;
          }
        }
      };

      walk(aiwgDir);

      return { files, sizes };
    } catch (e) {
      return {
        files: [],
        sizes: {},
        error: e.message,
      };
    }
  }

  /**
   * Get cumulative files modified since session start
   * @param {Object} gitStatus - Current git status
   * @returns {string[]} All modified files
   */
  getCumulativeFilesModified(gitStatus) {
    const allFiles = new Set();

    // Add current modified files
    for (const file of gitStatus.modified || []) {
      allFiles.add(file);
    }
    for (const file of gitStatus.staged || []) {
      allFiles.add(file);
    }

    // If we have previous checkpoints, merge their files
    const previousCheckpoints = this.getAllCheckpoints();
    for (const checkpoint of previousCheckpoints) {
      if (checkpoint.filesModified) {
        for (const file of checkpoint.filesModified) {
          allFiles.add(file);
        }
      }
    }

    return Array.from(allFiles).sort();
  }

  /**
   * Capture checkpoint snapshot
   * @param {number} checkpointNum - Checkpoint number
   * @returns {CheckpointData} Checkpoint data
   */
  captureCheckpoint(checkpointNum) {
    const timestamp = new Date().toISOString();
    const duration = Date.now() - this.sessionStartTime;

    const gitStatus = this.captureGitStatus();
    const aiwgState = this.captureAiwgState();
    const filesModified = this.getCumulativeFilesModified(gitStatus);
    const memory = process.memoryUsage();

    /** @type {CheckpointData} */
    const checkpoint = {
      number: checkpointNum,
      timestamp,
      duration,
      gitStatus,
      aiwgState,
      filesModified,
      sessionId: this.sessionId,
      memory: {
        heapUsed: memory.heapUsed,
        rss: memory.rss,
      },
    };

    // Save checkpoint to file
    const filename = `${String(checkpointNum).padStart(3, '0')}-checkpoint.json`;
    const filepath = join(this.checkpointsDir, filename);
    writeFileSync(filepath, JSON.stringify(checkpoint, null, 2));

    // Emit event
    this.emit('checkpoint', checkpoint);

    // Call callback if provided
    if (this.onCheckpoint) {
      this.onCheckpoint(checkpoint);
    }

    return checkpoint;
  }

  /**
   * Stop checkpoint timer and capture final checkpoint
   * @returns {Object} Summary of all checkpoints
   */
  stop() {
    if (!this.isRunning) {
      return this.summarizeCheckpoints();
    }

    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }

    // Capture final checkpoint
    const finalCheckpoint = this.captureCheckpoint(this.checkpointNumber + 1);
    this.isRunning = false;

    const summary = this.summarizeCheckpoints();

    this.emit('stopped', {
      finalCheckpoint,
      summary,
    });

    return summary;
  }

  /**
   * Get all checkpoints for current session
   * @returns {CheckpointData[]} Array of checkpoints
   */
  getAllCheckpoints() {
    if (!existsSync(this.checkpointsDir)) {
      return [];
    }

    const files = readdirSync(this.checkpointsDir);
    const checkpointFiles = files.filter(f => f.match(/^\d+-checkpoint\.json$/));

    const checkpoints = checkpointFiles
      .map(filename => {
        try {
          const filepath = join(this.checkpointsDir, filename);
          const content = readFileSync(filepath, 'utf8');
          return JSON.parse(content);
        } catch (e) {
          return null;
        }
      })
      .filter(cp => cp !== null)
      .sort((a, b) => a.number - b.number);

    return checkpoints;
  }

  /**
   * Get latest checkpoint
   * @param {string} [stateDir] - State directory (optional, uses instance stateDir if not provided)
   * @returns {CheckpointData|null} Latest checkpoint or null
   */
  static getLatestCheckpoint(stateDir) {
    const checkpointsDir = join(stateDir, CHECKPOINTS_DIR);

    if (!existsSync(checkpointsDir)) {
      return null;
    }

    const files = readdirSync(checkpointsDir);
    const checkpointFiles = files.filter(f => f.match(/^\d+-checkpoint\.json$/));

    if (checkpointFiles.length === 0) {
      return null;
    }

    // Get latest checkpoint file
    const numbers = checkpointFiles.map(f => parseInt(f.split('-')[0], 10));
    const latestNum = Math.max(...numbers);
    const latestFile = `${String(latestNum).padStart(3, '0')}-checkpoint.json`;

    try {
      const filepath = join(checkpointsDir, latestFile);
      const content = readFileSync(filepath, 'utf8');
      return JSON.parse(content);
    } catch (e) {
      return null;
    }
  }

  /**
   * Summarize all checkpoints
   * @param {string} [stateDir] - State directory (optional, uses instance stateDir if not provided)
   * @returns {Object} Checkpoint summary
   */
  summarizeCheckpoints(stateDir = null) {
    const dir = stateDir || this.stateDir;

    if (!dir) {
      throw new Error('State directory not set');
    }

    const checkpointsDir = join(dir, CHECKPOINTS_DIR);

    if (!existsSync(checkpointsDir)) {
      return {
        total: 0,
        checkpoints: [],
        totalDuration: 0,
        filesModified: [],
      };
    }

    const files = readdirSync(checkpointsDir);
    const checkpointFiles = files.filter(f => f.match(/^\d+-checkpoint\.json$/));

    const checkpoints = checkpointFiles
      .map(filename => {
        try {
          const filepath = join(checkpointsDir, filename);
          const content = readFileSync(filepath, 'utf8');
          return JSON.parse(content);
        } catch (e) {
          return null;
        }
      })
      .filter(cp => cp !== null)
      .sort((a, b) => a.number - b.number);

    const totalDuration = checkpoints.length > 0
      ? checkpoints[checkpoints.length - 1].duration
      : 0;

    const allFilesModified = new Set();
    for (const cp of checkpoints) {
      if (cp.filesModified) {
        for (const file of cp.filesModified) {
          allFilesModified.add(file);
        }
      }
    }

    const summary = checkpoints.map(cp => ({
      number: cp.number,
      timestamp: cp.timestamp,
      duration: cp.duration,
      filesModified: cp.filesModified.length,
      gitStatus: {
        modified: cp.gitStatus.modified.length,
        staged: cp.gitStatus.staged.length,
        untracked: cp.gitStatus.untracked.length,
      },
      aiwgFiles: cp.aiwgState.files.length,
    }));

    return {
      total: checkpoints.length,
      checkpoints: summary,
      totalDuration,
      filesModified: Array.from(allFilesModified).sort(),
    };
  }

  /**
   * Format duration in human-readable format
   * @param {number} ms - Duration in milliseconds
   * @returns {string} Formatted duration
   */
  static formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

export default CheckpointManager;
