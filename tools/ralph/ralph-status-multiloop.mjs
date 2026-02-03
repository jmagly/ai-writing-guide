#!/usr/bin/env node
/**
 * Ralph Status - Multi-Loop Support
 *
 * Check status of Ralph loops with multi-loop support.
 *
 * Usage:
 *   aiwg ralph-status                    # Auto-detect (single loop) or prompt
 *   aiwg ralph-status --loop-id <id>     # Specific loop
 *   aiwg ralph-status --all              # All active loops
 *
 * @module tools/ralph/ralph-status-multiloop
 */

import fs from 'fs';
import path from 'path';
import { MultiLoopStateManager } from './state-manager.mjs';

function parseArgs(args) {
  const result = {
    loopId: null,
    all: false,
    json: false,
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--loop-id' && args[i + 1]) {
      result.loopId = args[++i];
    } else if (arg === '--all') {
      result.all = true;
    } else if (arg === '--json') {
      result.json = true;
    } else if (arg === '--verbose' || arg === '-v') {
      result.verbose = true;
    }
  }

  return result;
}

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

function displayLoopStatus(state, loopId) {
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

function displayAllLoops(loops, manager) {
  console.log('\n═══════════════════════════════════════════');
  console.log(`All Active Ralph Loops (${loops.length})`);
  console.log('═══════════════════════════════════════════\n');

  if (loops.length === 0) {
    console.log('No active Ralph loops.');
    console.log('Start one with: aiwg ralph "task" --completion "criteria"\n');
    return;
  }

  loops.forEach((loop, i) => {
    console.log(`${i + 1}. ${loop.loop_id}`);
    console.log(`   Task: ${loop.task_summary}`);
    console.log(`   Status: ${loop.status}`);
    console.log(`   Iteration: ${loop.iteration}/${loop.max_iterations}`);
    console.log(`   Started: ${loop.started_at}`);

    // Get detailed state
    try {
      const state = manager.getLoopState(loop.loop_id);
      const elapsed = Date.now() - new Date(state.startTime).getTime();
      console.log(`   Elapsed: ${formatDuration(elapsed)}`);

      if (state.lastResult) {
        console.log(`   Last: ${state.lastResult.substring(0, 60)}...`);
      }
    } catch (err) {
      console.log(`   Error loading state: ${err.message}`);
    }

    console.log('');
  });

  console.log('Use: aiwg ralph-status --loop-id <id> for details');
  console.log('═══════════════════════════════════════════\n');
}

async function main() {
  const args = process.argv.slice(2);
  const config = parseArgs(args);

  const manager = new MultiLoopStateManager(process.cwd());

  // Show all loops
  if (config.all) {
    const loops = manager.listActiveLoops();

    if (config.json) {
      console.log(JSON.stringify({ loops }, null, 2));
    } else {
      displayAllLoops(loops, manager);
    }
    return;
  }

  // Determine which loop to show
  let loopId = config.loopId;

  if (!loopId) {
    // Try to auto-detect single loop
    const singleLoop = manager.detectSingleLoop();

    if (singleLoop) {
      loopId = singleLoop.loopId;
      console.log(`Auto-detected loop: ${loopId}`);
    } else {
      // Multiple or no loops - show list and prompt
      const loops = manager.listActiveLoops();

      if (loops.length === 0) {
        if (config.json) {
          console.log(JSON.stringify({ active: false, reason: 'no_loops' }));
        } else {
          console.log('\nNo Ralph loops found.');
          console.log('Start one with: aiwg ralph "task" --completion "criteria"\n');
        }
        return;
      }

      // Multiple loops - need explicit ID
      console.error('\nMultiple loops active. Specify with --loop-id:');
      console.error('');
      loops.forEach((loop) => {
        console.error(`  ${loop.loop_id}  (${loop.task_summary})`);
      });
      console.error('');
      console.error('Usage: aiwg ralph-status --loop-id <id>');
      console.error('Or use: aiwg ralph-status --all\n');
      process.exit(1);
    }
  }

  // Show specific loop
  try {
    const state = manager.getLoopState(loopId);

    if (config.json) {
      console.log(JSON.stringify({ loopId, state }, null, 2));
    } else {
      displayLoopStatus(state, loopId);

      if (config.verbose) {
        console.log('Full State:');
        console.log(JSON.stringify(state, null, 2));
      }
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
