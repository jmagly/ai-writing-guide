#!/usr/bin/env node
/**
 * Ralph Status - Check current loop status
 *
 * Multi-loop support: Auto-detect single loop or require --loop-id for multiple loops.
 *
 * @module tools/ralph/ralph-status
 */

import { MultiLoopStateManager } from './state-manager-sync.mjs';

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

function displayStatus(loopId, state) {
  const elapsed = Date.now() - new Date(state.startTime).getTime();
  const remaining = state.timeoutMs - elapsed;

  console.log('\n═══════════════════════════════════════════');
  console.log(`Ralph Loop Status: ${loopId}`);
  console.log('═══════════════════════════════════════════\n');

  console.log(`Task: ${state.task}`);
  console.log(`Completion: ${state.completion}`);
  console.log('');
  console.log(`Status: ${state.status.toUpperCase()}`);
  console.log(`Iteration: ${state.currentIteration}/${state.maxIterations}`);
  console.log(`Elapsed: ${formatDuration(elapsed)}`);
  console.log(`Remaining: ${remaining > 0 ? formatDuration(remaining) : 'TIMEOUT'}`);
  console.log('');

  if (state.lastResult) {
    console.log(`Last result: ${state.lastResult}`);
  }

  if (state.learnings) {
    console.log(`Current learnings: ${state.learnings}`);
  }

  if (state.iterations && state.iterations.length > 0) {
    console.log('\nIteration History:');
    console.log('─'.repeat(40));
    state.iterations.forEach((iter, i) => {
      console.log(`  ${i + 1}. ${iter.action || 'attempt'}`);
      if (iter.result) console.log(`     Result: ${iter.result}`);
    });
  }

  console.log('\n═══════════════════════════════════════════\n');
}

function displayAllLoops(stateManager) {
  const activeLoops = stateManager.listActiveLoops();

  if (activeLoops.length === 0) {
    console.log('\nNo active Ralph loops.\n');
    return;
  }

  console.log('\n═══════════════════════════════════════════');
  console.log(`All Active Ralph Loops (${activeLoops.length})`);
  console.log('═══════════════════════════════════════════\n');

  for (const loop of activeLoops) {
    const state = stateManager.getLoopState(loop.loop_id);
    const elapsed = Date.now() - new Date(state.startTime).getTime();

    console.log(`Loop ID: ${loop.loop_id}`);
    console.log(`  Task: ${state.task}`);
    console.log(`  Status: ${state.status.toUpperCase()}`);
    console.log(`  Iteration: ${state.currentIteration}/${state.maxIterations}`);
    console.log(`  Elapsed: ${formatDuration(elapsed)}`);
    console.log('');
  }

  console.log('Use --loop-id <id> to see detailed status for a specific loop.\n');
}

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  let loopId = null;
  let jsonOutput = false;
  let verbose = false;
  let showAll = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--loop-id' && args[i + 1]) {
      loopId = args[++i];
    } else if (arg === '--json') {
      jsonOutput = true;
    } else if (arg === '--verbose' || arg === '-v') {
      verbose = true;
    } else if (arg === '--all') {
      showAll = true;
    }
  }

  const projectRoot = process.cwd();
  const stateManager = new MultiLoopStateManager(projectRoot);

  const activeLoops = stateManager.listActiveLoops();

  // No active loops
  if (activeLoops.length === 0) {
    if (jsonOutput) {
      console.log(JSON.stringify({ active: false, reason: 'no_loops' }));
    } else {
      console.log('\nNo Ralph loops found.');
      console.log('Start one with: aiwg ralph "task" --completion "criteria"\n');
    }
    return;
  }

  // Show all loops if --all flag
  if (showAll && !loopId) {
    if (jsonOutput) {
      const allStates = activeLoops.map((loop) => ({
        loopId: loop.loop_id,
        ...stateManager.getLoopState(loop.loop_id),
      }));
      console.log(JSON.stringify(allStates, null, 2));
    } else {
      displayAllLoops(stateManager);
    }
    return;
  }

  // Auto-detect single loop
  if (!loopId) {
    if (activeLoops.length === 1) {
      loopId = activeLoops[0].loop_id;
    } else {
      // Multiple loops - require --loop-id
      console.error(
        `\nError: Multiple Ralph loops active (${activeLoops.length}). Specify --loop-id <id>\n`
      );
      displayAllLoops(stateManager);
      process.exit(1);
    }
  }

  // Get and display specific loop status
  try {
    const state = stateManager.getLoopState(loopId);

    if (jsonOutput) {
      console.log(JSON.stringify({ loopId, ...state }, null, 2));
    } else {
      displayStatus(loopId, state);

      if (verbose) {
        console.log('Full State:');
        console.log(JSON.stringify(state, null, 2));
      }
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);

    // Show available loops
    if (err.message.includes('Loop not found')) {
      console.log('\nAvailable loops:');
      displayAllLoops(stateManager);
    }

    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
