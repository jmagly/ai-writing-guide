/**
 * Recovery Engine for External Ralph Loop
 *
 * Handles crash detection, state recovery, and session resumption.
 * Enhanced with per-loop crash detection and recovery support.
 *
 * @implements @.aiwg/requirements/design-ralph-external.md
 * @implements @.aiwg/requirements/use-cases/UC-273-multi-loop-supervisor.md
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { gunzipSync } from 'zlib';
import { StateManager } from './state-manager.mjs';

/**
 * @typedef {Object} RecoveryState
 * @property {boolean} crashed - Whether a crash was detected
 * @property {number} [iteration] - Last iteration before crash
 * @property {string} [lastCheckpoint] - Last checkpoint identifier
 * @property {Object} [recoveryStrategy] - Recommended recovery strategy
 */

/**
 * @typedef {Object} RecoveryStrategy
 * @property {'resume_internal'|'continue_external'|'restart'} type
 * @property {string} action - Description of recovery action
 * @property {string} [prompt] - Suggested prompt for recovery
 */

/**
 * @typedef {Object} CheckpointInfo
 * @property {string} checkpointId - Checkpoint identifier
 * @property {string} path - Path to checkpoint file
 * @property {number} iteration - Iteration number
 * @property {number} timestamp - Checkpoint timestamp
 */

export class RecoveryEngine {
  /**
   * @param {string} projectRoot - Project root directory
   */
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.stateManager = new StateManager(projectRoot);
    this.internalRalphStatePath = join(projectRoot, '.aiwg', 'ralph', 'current-loop.json');
    this.loopsDir = join(projectRoot, '.aiwg', 'ralph', 'loops');
  }

  /**
   * Read internal Ralph state
   * @returns {Object|null}
   */
  readInternalRalphState() {
    if (!existsSync(this.internalRalphStatePath)) {
      return null;
    }

    try {
      const content = readFileSync(this.internalRalphStatePath, 'utf8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Check if a process is still running
   * @param {number} pid - Process ID
   * @returns {boolean}
   */
  isProcessAlive(pid) {
    if (!pid || pid <= 0) {
      return false;
    }

    try {
      // Signal 0 checks if process exists without killing it
      process.kill(pid, 0);
      return true;
    } catch (error) {
      // ESRCH = No such process
      if (error.code === 'ESRCH') {
        return false;
      }
      // EPERM = Process exists but no permission to signal
      if (error.code === 'EPERM') {
        return true;
      }
      return false;
    }
  }

  /**
   * Detect crashed loops across all active loops
   * @returns {string[]} - Array of crashed loop IDs
   */
  detectCrashedLoops() {
    const crashedLoops = [];

    if (!existsSync(this.loopsDir)) {
      return crashedLoops;
    }

    const loopDirs = readdirSync(this.loopsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const loopId of loopDirs) {
      const stateFile = join(this.loopsDir, loopId, 'state.json');

      if (!existsSync(stateFile)) {
        continue;
      }

      try {
        const state = JSON.parse(readFileSync(stateFile, 'utf8'));

        // Check if loop is marked as running but process is dead
        if (state.status === 'running' && state.currentPid) {
          if (!this.isProcessAlive(state.currentPid)) {
            crashedLoops.push(loopId);
          }
        }
      } catch (error) {
        // Corrupted state file indicates crash
        crashedLoops.push(loopId);
      }
    }

    return crashedLoops;
  }

  /**
   * Detect crash state for specific loop
   * @param {string} [loopId] - Loop ID (uses default if not provided)
   * @returns {RecoveryState}
   */
  detectCrash(loopId = null) {
    let state;

    if (loopId) {
      const stateFile = join(this.loopsDir, loopId, 'state.json');
      if (!existsSync(stateFile)) {
        return { crashed: false };
      }
      try {
        state = JSON.parse(readFileSync(stateFile, 'utf8'));
      } catch {
        return { crashed: false };
      }
    } else {
      state = this.stateManager.load();
      if (!state) {
        return { crashed: false };
      }
    }

    // If status is 'running' but process is dead, it crashed
    if (state.status === 'running') {
      const isRunning = this.isProcessAlive(state.currentPid);

      if (!isRunning) {
        return {
          crashed: true,
          iteration: state.currentIteration,
          lastCheckpoint: `iteration-${state.currentIteration}`,
          recoveryStrategy: this.determineRecoveryStrategy(state),
        };
      }
    }

    return { crashed: false };
  }

  /**
   * Recover specific loop
   * @param {string} loopId - Loop ID to recover
   * @param {Object} [options] - Recovery options
   * @returns {Object|null} - Recovery context or null if no recovery needed
   */
  recoverLoop(loopId, options = {}) {
    const crashState = this.detectCrash(loopId);

    if (!crashState.crashed) {
      return null;
    }

    const stateFile = join(this.loopsDir, loopId, 'state.json');
    const state = JSON.parse(readFileSync(stateFile, 'utf8'));

    // Update state to indicate recovery
    state.status = 'recovering';
    state.recoveryAttempts = (state.recoveryAttempts || 0) + 1;
    state.lastRecoveryAt = new Date().toISOString();

    writeFileSync(stateFile, JSON.stringify(state, null, 2));

    return {
      loopId,
      state,
      strategy: crashState.recoveryStrategy,
      options,
    };
  }

  /**
   * Restore loop from checkpoint
   * @param {string} loopId - Loop ID
   * @param {string} [checkpointId] - Specific checkpoint ID (uses latest if not provided)
   * @returns {Object} - Restored state
   */
  restoreFromCheckpoint(loopId, checkpointId = null) {
    const checkpointsDir = join(this.loopsDir, loopId, 'checkpoints');

    if (!existsSync(checkpointsDir)) {
      throw new Error(`No checkpoints found for loop ${loopId}`);
    }

    let checkpoint;

    if (checkpointId) {
      // Restore from specific checkpoint
      const checkpointFile = join(checkpointsDir, `${checkpointId}.json.gz`);
      if (!existsSync(checkpointFile)) {
        throw new Error(`Checkpoint ${checkpointId} not found`);
      }
      checkpoint = checkpointFile;
    } else {
      // Get latest checkpoint
      const latest = this.getLatestCheckpoint(loopId);
      if (!latest) {
        throw new Error(`No checkpoints available for loop ${loopId}`);
      }
      checkpoint = latest.path;
    }

    // Read and decompress checkpoint
    const compressed = readFileSync(checkpoint);
    const decompressed = gunzipSync(compressed);
    const state = JSON.parse(decompressed.toString('utf8'));

    // Write restored state
    const stateFile = join(this.loopsDir, loopId, 'state.json');
    writeFileSync(stateFile, JSON.stringify(state, null, 2));

    return state;
  }

  /**
   * Get latest checkpoint for a loop
   * @param {string} loopId - Loop ID
   * @returns {CheckpointInfo|null}
   */
  getLatestCheckpoint(loopId) {
    const checkpointsDir = join(this.loopsDir, loopId, 'checkpoints');

    if (!existsSync(checkpointsDir)) {
      return null;
    }

    const checkpoints = readdirSync(checkpointsDir)
      .filter(f => f.endsWith('.json.gz'))
      .map(f => {
        const path = join(checkpointsDir, f);
        const match = f.match(/checkpoint-(\d+)-(\d+)\.json\.gz/);
        if (!match) return null;

        return {
          checkpointId: f.replace('.json.gz', ''),
          path,
          iteration: parseInt(match[1], 10),
          timestamp: parseInt(match[2], 10),
        };
      })
      .filter(c => c !== null)
      .sort((a, b) => b.timestamp - a.timestamp);

    return checkpoints[0] || null;
  }

  /**
   * Notify about crash (can be extended to send notifications)
   * @param {string} loopId - Loop ID
   * @param {Error} error - Error that caused crash
   */
  notifyCrash(loopId, error) {
    const notification = {
      loopId,
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
      },
    };

    // Write crash log
    const crashLog = join(this.loopsDir, loopId, 'crash.log');
    const logEntry = `[${notification.timestamp}] ${error.message}\n${error.stack}\n\n`;

    try {
      const existing = existsSync(crashLog)
        ? readFileSync(crashLog, 'utf8')
        : '';
      writeFileSync(crashLog, existing + logEntry);
    } catch {
      // Ignore write errors
    }

    console.error(`[Recovery] Loop ${loopId} crashed: ${error.message}`);
  }

  /**
   * Determine best recovery strategy
   * @param {Object} state - Loop state
   * @returns {RecoveryStrategy}
   */
  determineRecoveryStrategy(state) {
    // Check internal Ralph state
    const internalState = this.readInternalRalphState();

    if (internalState?.active) {
      return {
        type: 'resume_internal',
        action: 'Resume internal Ralph loop with /ralph-resume',
        prompt: this.buildInternalResumePrompt(state, internalState),
      };
    }

    // Check last iteration analysis
    const lastIteration = state.iterations[state.iterations.length - 1];
    const lastAnalysis = lastIteration?.analysis;

    if (lastAnalysis?.shouldContinue) {
      return {
        type: 'continue_external',
        action: 'Continue with accumulated learnings',
        prompt: this.buildContinuationPrompt(state, lastAnalysis),
      };
    }

    // Default: restart with learnings
    return {
      type: 'restart',
      action: 'Restart with accumulated learnings',
      prompt: this.buildRestartPrompt(state),
    };
  }

  /**
   * Build prompt for resuming internal Ralph
   * @param {Object} externalState - External loop state
   * @param {Object} internalState - Internal Ralph state
   * @returns {string}
   */
  buildInternalResumePrompt(externalState, internalState) {
    return `# Recovery: Resume Internal Ralph Loop

## External Loop Context
- Loop ID: ${externalState.loopId}
- External Iteration: ${externalState.currentIteration}
- Objective: ${externalState.objective}

## Internal Ralph State
- Internal Iteration: ${internalState.currentIteration || 'unknown'}
- Task: ${internalState.task || externalState.objective}
- Status: Active (was interrupted)

## Recovery Action

First, check the internal Ralph status:
\`\`\`
/ralph-status
\`\`\`

Then resume the internal loop:
\`\`\`
/ralph-resume
\`\`\`

## Previous Learnings
${externalState.accumulatedLearnings || 'None recorded'}
`;
  }

  /**
   * Build prompt for continuing external loop
   * @param {Object} state - Loop state
   * @param {Object} lastAnalysis - Last analysis result
   * @returns {string}
   */
  buildContinuationPrompt(state, lastAnalysis) {
    return `# Recovery: Continue External Loop

## Context
- Loop ID: ${state.loopId}
- Objective: ${state.objective}
- Completion Criteria: ${state.completionCriteria}
- Progress: ${lastAnalysis?.completionPercentage || 0}%

## Session was interrupted. Continuing from last state.

### Last Analysis
${lastAnalysis?.learnings || 'No learnings recorded'}

### Suggested Approach
${lastAnalysis?.nextApproach || 'Continue with accumulated context'}

### Blockers (if any)
${lastAnalysis?.blockers?.join('\n- ') || 'None identified'}

## Instructions

Continue working on the objective. Check git status and matric-memory for latest state.
`;
  }

  /**
   * Build prompt for restarting with learnings
   * @param {Object} state - Loop state
   * @returns {string}
   */
  buildRestartPrompt(state) {
    return `# Recovery: Restart with Accumulated Learnings

## Context
- Loop ID: ${state.loopId}
- Objective: ${state.objective}
- Completion Criteria: ${state.completionCriteria}
- Previous Iterations: ${state.currentIteration}

## Session crashed and needs fresh start with context.

### Accumulated Learnings
${state.accumulatedLearnings || 'None recorded'}

### Files Modified
${state.filesModified?.map(f => `- ${f}`).join('\n') || 'None recorded'}

## Instructions

Start fresh but apply the learnings above. Use \`/ralph\` for iterative implementation.
`;
  }

  /**
   * Perform recovery
   * @param {string} [loopId] - Specific loop ID (uses default if not provided)
   * @returns {Object|null} - Recovery context or null if no recovery needed
   */
  recover(loopId = null) {
    if (loopId) {
      return this.recoverLoop(loopId);
    }

    const crashState = this.detectCrash();

    if (!crashState.crashed) {
      return null;
    }

    const state = this.stateManager.load();

    // Update state to indicate recovery
    state.status = 'recovering';
    this.stateManager.save(state);

    return {
      state,
      strategy: crashState.recoveryStrategy,
    };
  }

  /**
   * Mark recovery complete
   * @param {string} [loopId] - Specific loop ID (uses default if not provided)
   */
  markRecovered(loopId = null) {
    if (loopId) {
      const stateFile = join(this.loopsDir, loopId, 'state.json');
      if (!existsSync(stateFile)) {
        return;
      }
      const state = JSON.parse(readFileSync(stateFile, 'utf8'));
      if (state.status === 'recovering') {
        state.status = 'running';
        writeFileSync(stateFile, JSON.stringify(state, null, 2));
      }
    } else {
      const state = this.stateManager.load();
      if (state && state.status === 'recovering') {
        state.status = 'running';
        this.stateManager.save(state);
      }
    }
  }
}

export default RecoveryEngine;
