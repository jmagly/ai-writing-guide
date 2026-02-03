#!/usr/bin/env node
/**
 * Ralph Abort - Abort a running loop
 *
 * Multi-loop support: Auto-detect single loop or require --loop-id for multiple loops.
 *
 * @module tools/ralph/ralph-abort
 */

import { execSync } from 'child_process';
import { MultiLoopStateManager } from './state-manager-sync.mjs';

function displayActiveLoops(stateManager) {
  const activeLoops = stateManager.listActiveLoops();

  if (activeLoops.length === 0) {
    console.log('\nNo active Ralph loops.\n');
    return;
  }

  console.log('\nActive Ralph Loops:');
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
  let keepChanges = false;
  let revert = false;
  let force = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--loop-id' && args[i + 1]) {
      loopId = args[++i];
    } else if (arg === '--keep-changes') {
      keepChanges = true;
    } else if (arg === '--revert') {
      revert = true;
    } else if (arg === '--force' || arg === '-f') {
      force = true;
    }
  }

  const projectRoot = process.cwd();
  const stateManager = new MultiLoopStateManager(projectRoot);

  const activeLoops = stateManager.listActiveLoops();

  // No active loops
  if (activeLoops.length === 0) {
    console.log('\nNo Ralph loop to abort.\n');
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
      displayActiveLoops(stateManager);
      process.exit(1);
    }
  }

  // Verify loop exists
  try {
    const state = stateManager.getLoopState(loopId);

    if (!state.active && !force) {
      console.log(`\nRalph loop ${loopId} is not active.`);
      console.log(`Status: ${state.status}`);
      console.log('\nUse --force to clean up state anyway.\n');
      return;
    }

    // Update state
    stateManager.updateLoopState(loopId, {
      active: false,
      status: 'aborted',
      endTime: new Date().toISOString(),
    });

    console.log('\n═══════════════════════════════════════════');
    console.log(`Ralph Loop Aborted: ${loopId}`);
    console.log('═══════════════════════════════════════════\n');

    console.log(`Task: ${state.task}`);
    console.log(`Iterations completed: ${state.currentIteration}`);
    console.log('');

    if (revert) {
      console.log('Reverting changes...');
      try {
        // Find ralph commits for this loop
        const log = execSync(
          `git log --oneline --grep="^ralph:.*${loopId}" -n 20`,
          { encoding: 'utf8' }
        );
        const commits = log.trim().split('\n').filter(Boolean);

        if (commits.length > 0) {
          console.log(`Found ${commits.length} ralph commits for this loop`);
          console.log('Use: git reset --hard HEAD~N to revert');
        }
      } catch {
        console.log('No ralph commits found to revert');
      }
    } else if (!keepChanges) {
      console.log('Changes kept in working directory.');
      console.log('Use --revert to undo ralph commits.');
    }

    console.log(`\nState saved to: .aiwg/ralph/loops/${loopId}/state.json`);
    console.log('');
    console.log('To start fresh: aiwg ralph "task" --completion "criteria"');
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
