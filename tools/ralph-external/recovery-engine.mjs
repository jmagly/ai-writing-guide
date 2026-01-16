/**
 * Recovery Engine for External Ralph Loop
 *
 * Handles crash detection, state recovery, and session resumption.
 *
 * @implements @.aiwg/requirements/design-ralph-external.md
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
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

export class RecoveryEngine {
  /**
   * @param {string} projectRoot - Project root directory
   */
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.stateManager = new StateManager(projectRoot);
    this.internalRalphStatePath = join(projectRoot, '.aiwg', 'ralph', 'current-loop.json');
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
    if (!pid) return false;

    try {
      // Signal 0 checks if process exists without killing it
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Detect crash state
   * @returns {RecoveryState}
   */
  detectCrash() {
    const state = this.stateManager.load();

    if (!state) {
      return { crashed: false };
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
   * @returns {Object|null} - Recovery context or null if no recovery needed
   */
  recover() {
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
   */
  markRecovered() {
    const state = this.stateManager.load();
    if (state && state.status === 'recovering') {
      state.status = 'running';
      this.stateManager.save(state);
    }
  }
}

export default RecoveryEngine;
