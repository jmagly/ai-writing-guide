#!/usr/bin/env node
/**
 * Ralph Abort - Abort a running loop
 *
 * @module tools/ralph/ralph-abort
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const RALPH_STATE_DIR = '.aiwg/ralph';

async function main() {
  const args = process.argv.slice(2);
  const keepChanges = args.includes('--keep-changes');
  const revert = args.includes('--revert');
  const force = args.includes('--force') || args.includes('-f');

  const stateFile = path.resolve(RALPH_STATE_DIR, 'current-loop.json');

  if (!fs.existsSync(stateFile)) {
    console.log('\nNo Ralph loop to abort.\n');
    return;
  }

  try {
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));

    if (!state.active && !force) {
      console.log('\nRalph loop is not active.');
      console.log(`Status: ${state.status}`);
      console.log('\nUse --force to clean up state anyway.\n');
      return;
    }

    // Update state
    state.active = false;
    state.status = 'aborted';
    state.endTime = new Date().toISOString();

    // Save aborted state
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));

    console.log('\n═══════════════════════════════════════════');
    console.log('Ralph Loop Aborted');
    console.log('═══════════════════════════════════════════\n');

    console.log(`Task: ${state.task}`);
    console.log(`Iterations completed: ${state.currentIteration}`);
    console.log('');

    if (revert) {
      console.log('Reverting changes...');
      try {
        // Find first ralph commit and reset
        const log = execSync('git log --oneline --grep="^ralph:" -n 20', { encoding: 'utf8' });
        const commits = log.trim().split('\n').filter(Boolean);

        if (commits.length > 0) {
          console.log(`Found ${commits.length} ralph commits`);
          console.log('Use: git reset --hard HEAD~N to revert');
        }
      } catch {
        console.log('No ralph commits found to revert');
      }
    } else if (!keepChanges) {
      console.log('Changes kept in working directory.');
      console.log('Use --revert to undo ralph commits.');
    }

    console.log('\nState saved to: .aiwg/ralph/current-loop.json');
    console.log('');
    console.log('To start fresh: aiwg ralph "task" --completion "criteria"');
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
