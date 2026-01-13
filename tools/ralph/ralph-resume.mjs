#!/usr/bin/env node
/**
 * Ralph Resume - Resume an interrupted loop
 *
 * @module tools/ralph/ralph-resume
 */

import fs from 'fs';
import path from 'path';

const RALPH_STATE_DIR = '.aiwg/ralph';

async function main() {
  const args = process.argv.slice(2);

  // Parse overrides
  let maxIterations = null;
  let timeout = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--max-iterations' && args[i + 1]) {
      maxIterations = parseInt(args[++i], 10);
    } else if (args[i] === '--timeout' && args[i + 1]) {
      timeout = parseInt(args[++i], 10);
    }
  }

  const stateFile = path.resolve(RALPH_STATE_DIR, 'current-loop.json');

  if (!fs.existsSync(stateFile)) {
    console.log('\nNo Ralph loop to resume.');
    console.log('Start one with: aiwg ralph "task" --completion "criteria"\n');
    return;
  }

  try {
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));

    // Check if loop can be resumed
    if (state.status === 'success') {
      console.log('\nThis Ralph loop completed successfully.');
      console.log('Start a new loop with: aiwg ralph "task" --completion "criteria"\n');
      return;
    }

    if (state.status === 'aborted') {
      console.log('\nThis Ralph loop was aborted.');
      console.log('Start fresh with: aiwg ralph "task" --completion "criteria"\n');
      return;
    }

    // Apply overrides
    if (maxIterations) {
      state.maxIterations = maxIterations;
    }
    if (timeout) {
      state.timeoutMinutes = timeout;
      state.timeoutMs = timeout * 60 * 1000;
      // Reset timeout start to now
      state.startTimeMs = Date.now();
    }

    // Reactivate loop
    state.active = true;
    state.status = 'running';

    // Save updated state
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));

    console.log('\n═══════════════════════════════════════════');
    console.log('Resuming Ralph Loop');
    console.log('═══════════════════════════════════════════\n');

    console.log(`Task: ${state.task}`);
    console.log(`Completion: ${state.completion}`);
    console.log(`Previous iterations: ${state.currentIteration}`);
    console.log(`Remaining iterations: ${state.maxIterations - state.currentIteration}`);
    console.log('');

    if (state.lastResult) {
      console.log(`Last result: ${state.lastResult}`);
    }
    if (state.learnings) {
      console.log(`Learnings so far: ${state.learnings}`);
    }

    // Generate skill prompt for resume
    const skillPrompt = `/ralph-resume${maxIterations ? ` --max-iterations ${maxIterations}` : ''}${timeout ? ` --timeout ${timeout}` : ''}`;

    console.log('');
    console.log('To continue in an agentic environment:');
    console.log('─'.repeat(50));
    console.log(skillPrompt);
    console.log('─'.repeat(50));
    console.log('');

  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
