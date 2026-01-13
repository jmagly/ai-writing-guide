#!/usr/bin/env node
/**
 * Ralph Loop Hook
 *
 * Manages Ralph loop state and provides iteration tracking.
 * This hook captures loop state changes for observability and resume support.
 *
 * The actual re-injection logic is handled by the ralph-loop agent/command,
 * but this hook provides:
 * - State persistence to .aiwg/ralph/
 * - Iteration logging
 * - Timeout/limit checking helpers
 *
 * Hook Events:
 * - RalphStart: Initialize loop state
 * - RalphIteration: Record iteration completion
 * - RalphComplete: Finalize loop
 *
 * Usage:
 * Can be integrated with Claude Code hooks or called directly by ralph commands.
 *
 * Environment Variables:
 * - RALPH_STATE_DIR: Directory for state files (default: .aiwg/ralph)
 * - RALPH_VERBOSE: Enable verbose logging to stderr
 */

const fs = require('fs');
const path = require('path');

// Configuration
const RALPH_STATE_DIR = process.env.RALPH_STATE_DIR || '.aiwg/ralph';
const VERBOSE = process.env.RALPH_VERBOSE === 'true';

/**
 * Ensure ralph state directory exists
 */
function ensureStateDir() {
  const statePath = path.resolve(RALPH_STATE_DIR);
  if (!fs.existsSync(statePath)) {
    fs.mkdirSync(statePath, { recursive: true });
  }
  return statePath;
}

/**
 * Read current loop state
 */
function readLoopState() {
  const stateDir = ensureStateDir();
  const stateFile = path.join(stateDir, 'current-loop.json');

  if (!fs.existsSync(stateFile)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  } catch (err) {
    if (VERBOSE) {
      console.error(`[RALPH] Error reading state: ${err.message}`);
    }
    return null;
  }
}

/**
 * Write loop state
 */
function writeLoopState(state) {
  const stateDir = ensureStateDir();
  const stateFile = path.join(stateDir, 'current-loop.json');

  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));

  if (VERBOSE) {
    console.error(`[RALPH] State updated: iteration ${state.currentIteration}`);
  }
}

/**
 * Initialize a new Ralph loop
 */
function initializeLoop(config) {
  const state = {
    active: true,
    task: config.task,
    completion: config.completion,
    maxIterations: config.maxIterations || 10,
    timeoutMinutes: config.timeoutMinutes || 60,
    currentIteration: 0,
    startTime: new Date().toISOString(),
    startTimestamp: Date.now(),
    autoCommit: config.autoCommit !== false,
    iterations: [],
    status: 'running',
    lastResult: null,
    learnings: null
  };

  writeLoopState(state);

  // Create iterations directory
  const stateDir = ensureStateDir();
  const iterDir = path.join(stateDir, 'iterations');
  if (!fs.existsSync(iterDir)) {
    fs.mkdirSync(iterDir, { recursive: true });
  }

  if (VERBOSE) {
    console.error(`[RALPH] Loop initialized: ${config.task}`);
  }

  return state;
}

/**
 * Record an iteration
 */
function recordIteration(iteration) {
  const state = readLoopState();
  if (!state) {
    throw new Error('No active Ralph loop');
  }

  state.currentIteration++;
  state.iterations.push({
    number: state.currentIteration,
    timestamp: new Date().toISOString(),
    action: iteration.action || 'Iteration attempt',
    result: iteration.result || 'unknown',
    verified: iteration.verified || false,
    learnings: iteration.learnings || null,
    duration_ms: iteration.duration_ms || null
  });

  state.lastResult = iteration.result;
  state.learnings = iteration.learnings;

  writeLoopState(state);

  // Also save individual iteration file
  const stateDir = ensureStateDir();
  const iterFile = path.join(stateDir, 'iterations', `iteration-${state.currentIteration}.json`);
  fs.writeFileSync(iterFile, JSON.stringify(iteration, null, 2));

  if (VERBOSE) {
    console.error(`[RALPH] Iteration ${state.currentIteration} recorded: ${iteration.verified ? 'PASS' : 'FAIL'}`);
  }

  return state;
}

/**
 * Check if loop should continue
 */
function shouldContinue() {
  const state = readLoopState();
  if (!state || !state.active) {
    return { continue: false, reason: 'no_active_loop' };
  }

  // Check iteration limit
  if (state.currentIteration >= state.maxIterations) {
    return { continue: false, reason: 'max_iterations', iterations: state.currentIteration };
  }

  // Check timeout
  const elapsed = Date.now() - state.startTimestamp;
  const timeoutMs = state.timeoutMinutes * 60 * 1000;
  if (elapsed > timeoutMs) {
    return { continue: false, reason: 'timeout', elapsed_minutes: Math.round(elapsed / 60000) };
  }

  return { continue: true };
}

/**
 * Complete the loop (success or failure)
 */
function completeLoop(result) {
  const state = readLoopState();
  if (!state) {
    throw new Error('No active Ralph loop');
  }

  state.active = false;
  state.status = result.success ? 'success' : (result.reason || 'failed');
  state.endTime = new Date().toISOString();
  state.endTimestamp = Date.now();
  state.totalDuration_ms = state.endTimestamp - state.startTimestamp;
  state.finalResult = result;

  writeLoopState(state);

  // Generate completion report
  generateCompletionReport(state);

  if (VERBOSE) {
    console.error(`[RALPH] Loop completed: ${state.status}`);
  }

  return state;
}

/**
 * Generate completion report
 */
function generateCompletionReport(state) {
  const stateDir = ensureStateDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const reportFile = path.join(stateDir, `completion-${timestamp}.md`);

  const duration = Math.round(state.totalDuration_ms / 1000);
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;

  let iterationTable = state.iterations.map(i =>
    `| ${i.number} | ${i.action.slice(0, 40)} | ${i.verified ? 'PASS' : 'FAIL'} | ${i.learnings?.slice(0, 30) || '-'} |`
  ).join('\n');

  const report = `# Ralph Loop Completion Report

**Generated**: ${new Date().toISOString()}

## Summary

| Field | Value |
|-------|-------|
| **Task** | ${state.task} |
| **Status** | ${state.status.toUpperCase()} |
| **Iterations** | ${state.currentIteration} / ${state.maxIterations} |
| **Duration** | ${minutes}m ${seconds}s |

## Completion Criteria

\`\`\`
${state.completion}
\`\`\`

## Iteration History

| # | Action | Result | Learnings |
|---|--------|--------|-----------|
${iterationTable}

## Final Result

${state.finalResult?.success ? '**SUCCESS** - Completion criteria met.' : `**${state.status.toUpperCase()}** - ${state.finalResult?.reason || 'Did not complete'}`}

${state.learnings ? `### Final Learnings\n\n${state.learnings}` : ''}

## State File

Loop state saved to: \`.aiwg/ralph/current-loop.json\`

${state.status !== 'success' ? `
## Resume

To continue this loop:
\`\`\`
/ralph-resume
\`\`\`

To abort:
\`\`\`
/ralph-abort
\`\`\`
` : ''}
`;

  fs.writeFileSync(reportFile, report);

  if (VERBOSE) {
    console.error(`[RALPH] Report generated: ${reportFile}`);
  }

  return reportFile;
}

/**
 * Parse input from stdin (for hook integration)
 */
async function parseInput() {
  return new Promise((resolve) => {
    let data = '';

    if (process.stdin.isTTY) {
      resolve({});
      return;
    }

    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => data += chunk);
    process.stdin.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });

    // Timeout for no input
    setTimeout(() => {
      if (!data) resolve({});
    }, 100);
  });
}

/**
 * Main CLI handler
 */
async function main() {
  const command = process.argv[2];
  const input = await parseInput();

  switch (command) {
    case 'init':
      const config = {
        task: process.argv[3] || input.task,
        completion: process.argv[4] || input.completion,
        maxIterations: parseInt(process.argv[5] || input.maxIterations || '10'),
        timeoutMinutes: parseInt(process.argv[6] || input.timeoutMinutes || '60'),
        autoCommit: input.autoCommit !== false
      };
      const initState = initializeLoop(config);
      console.log(JSON.stringify(initState, null, 2));
      break;

    case 'iteration':
      const iteration = {
        action: process.argv[3] || input.action,
        result: process.argv[4] || input.result,
        verified: (process.argv[5] || input.verified) === 'true',
        learnings: process.argv[6] || input.learnings,
        duration_ms: parseInt(process.argv[7] || input.duration_ms || '0')
      };
      const iterState = recordIteration(iteration);
      console.log(JSON.stringify(iterState, null, 2));
      break;

    case 'check':
      const checkResult = shouldContinue();
      console.log(JSON.stringify(checkResult, null, 2));
      process.exit(checkResult.continue ? 0 : 1);
      break;

    case 'complete':
      const result = {
        success: (process.argv[3] || input.success) === 'true',
        reason: process.argv[4] || input.reason
      };
      const finalState = completeLoop(result);
      console.log(JSON.stringify(finalState, null, 2));
      break;

    case 'status':
      const state = readLoopState();
      if (state) {
        console.log(JSON.stringify(state, null, 2));
      } else {
        console.log('{"active": false, "message": "No active Ralph loop"}');
        process.exit(1);
      }
      break;

    default:
      console.error(`
Ralph Loop Hook

Usage:
  ralph-loop.js init "<task>" "<completion>" [maxIterations] [timeoutMinutes]
  ralph-loop.js iteration "<action>" "<result>" <verified> "<learnings>"
  ralph-loop.js check
  ralph-loop.js complete <success> [reason]
  ralph-loop.js status

Environment:
  RALPH_STATE_DIR   State directory (default: .aiwg/ralph)
  RALPH_VERBOSE     Enable verbose logging

Examples:
  ralph-loop.js init "Fix tests" "npm test passes" 10 60
  ralph-loop.js iteration "Fixed auth mock" "1 test still failing" false "Need to update date mock"
  ralph-loop.js check
  ralph-loop.js complete true
  ralph-loop.js status
`);
      process.exit(1);
  }
}

// Export for programmatic use
module.exports = {
  initializeLoop,
  recordIteration,
  shouldContinue,
  completeLoop,
  readLoopState,
  writeLoopState
};

// Run if called directly
if (require.main === module) {
  main().catch(err => {
    console.error(`[RALPH] Error: ${err.message}`);
    process.exit(1);
  });
}
