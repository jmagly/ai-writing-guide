#!/usr/bin/env node
/**
 * Ralph Status - Check current loop status
 *
 * @module tools/ralph/ralph-status
 */

import fs from 'fs';
import path from 'path';

const RALPH_STATE_DIR = '.aiwg/ralph';

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

function displayStatus(state) {
  const elapsed = Date.now() - new Date(state.startTime).getTime();
  const remaining = state.timeoutMs - elapsed;

  console.log('\n═══════════════════════════════════════════');
  console.log('Ralph Loop Status');
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

async function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json');
  const verbose = args.includes('--verbose') || args.includes('-v');

  const stateFile = path.resolve(RALPH_STATE_DIR, 'current-loop.json');

  if (!fs.existsSync(stateFile)) {
    if (jsonOutput) {
      console.log(JSON.stringify({ active: false, reason: 'no_loop' }));
    } else {
      console.log('\nNo Ralph loop found.');
      console.log('Start one with: aiwg ralph "task" --completion "criteria"\n');
    }
    return;
  }

  try {
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));

    if (jsonOutput) {
      console.log(JSON.stringify(state, null, 2));
    } else {
      displayStatus(state);

      if (verbose) {
        console.log('Full State:');
        console.log(JSON.stringify(state, null, 2));
      }
    }
  } catch (err) {
    console.error(`Error reading state: ${err.message}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
