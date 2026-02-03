#!/usr/bin/env node
/**
 * Ralph Resume - Resume an interrupted loop
 *
 * Multi-loop support: Auto-detect single loop or require --loop-id for multiple loops.
 *
 * @module tools/ralph/ralph-resume
 */

import { MultiLoopStateManager } from './state-manager-sync.mjs';

function displayActiveLoops(stateManager) {
  const activeLoops = stateManager.listActiveLoops();

  if (activeLoops.length === 0) {
    console.log('\nNo Ralph loops to resume.\n');
    return;
  }

  console.log('\nAvailable Ralph Loops:');
  console.log('─'.repeat(40));

  for (const loop of activeLoops) {
    const state = stateManager.getLoopState(loop.loop_id);
    console.log(`${loop.loop_id}`);
    console.log(`  Task: ${state.task}`);
    console.log(`  Status: ${state.status}`);
    console.log(`  Iteration: ${state.currentIteration}/${state.maxIterations}`);
    console.log('');
  }
}

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  let loopId = null;
  let maxIterations = null;
  let timeout = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--loop-id' && args[i + 1]) {
      loopId = args[++i];
    } else if (arg === '--max-iterations' && args[i + 1]) {
      maxIterations = parseInt(args[++i], 10);
    } else if (arg === '--timeout' && args[i + 1]) {
      timeout = parseInt(args[++i], 10);
    }
  }

  const projectRoot = process.cwd();
  const stateManager = new MultiLoopStateManager(projectRoot);

  const activeLoops = stateManager.listActiveLoops();

  // No loops available
  if (activeLoops.length === 0) {
    console.log('\nNo Ralph loop to resume.');
    console.log('Start one with: aiwg ralph "task" --completion "criteria"\n');
    return;
  }

  // Auto-detect single loop
  if (!loopId) {
    if (activeLoops.length === 1) {
      loopId = activeLoops[0].loop_id;
    } else {
      // Multiple loops - require --loop-id
      console.error(
        `\nError: Multiple Ralph loops available (${activeLoops.length}). Specify --loop-id <id>\n`
      );
      displayActiveLoops(stateManager);
      process.exit(1);
    }
  }

  // Get and resume loop
  try {
    const state = stateManager.getLoopState(loopId);

    // Check if loop can be resumed
    if (state.status === 'success') {
      console.log(`\nRalph loop ${loopId} completed successfully.`);
      console.log('Start a new loop with: aiwg ralph "task" --completion "criteria"\n');
      return;
    }

    if (state.status === 'aborted') {
      console.log(`\nRalph loop ${loopId} was aborted.`);
      console.log('Start fresh with: aiwg ralph "task" --completion "criteria"\n');
      return;
    }

    // Apply overrides
    const updates = {
      active: true,
      status: 'running',
    };

    if (maxIterations) {
      updates.maxIterations = maxIterations;
    }

    if (timeout) {
      updates.timeoutMinutes = timeout;
      updates.timeoutMs = timeout * 60 * 1000;
      // Reset timeout start to now
      updates.startTimeMs = Date.now();
    }

    // Update state
    stateManager.updateLoopState(loopId, updates);

    console.log('\n═══════════════════════════════════════════');
    console.log(`Resuming Ralph Loop: ${loopId}`);
    console.log('═══════════════════════════════════════════\n');

    console.log(`Task: ${state.task}`);
    console.log(`Completion: ${state.completion}`);
    console.log(`Previous iterations: ${state.currentIteration}`);
    console.log(
      `Remaining iterations: ${(maxIterations || state.maxIterations) - state.currentIteration}`
    );
    console.log('');

    if (state.lastResult) {
      console.log(`Last result: ${state.lastResult}`);
    }
    if (state.learnings) {
      console.log(`Learnings so far: ${state.learnings}`);
    }

    // Generate skill prompt for resume
    const skillPrompt = `/ralph-resume --loop-id ${loopId}${maxIterations ? ` --max-iterations ${maxIterations}` : ''}${timeout ? ` --timeout ${timeout}` : ''}`;

    console.log('');
    console.log('To continue in an agentic environment:');
    console.log('─'.repeat(50));
    console.log(skillPrompt);
    console.log('─'.repeat(50));
    console.log('');
  } catch (err) {
    console.error(`Error: ${err.message}`);

    // Show available loops
    if (err.message.includes('Loop not found')) {
      console.log('\nAvailable loops:');
      displayActiveLoops(stateManager);
    }

    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
