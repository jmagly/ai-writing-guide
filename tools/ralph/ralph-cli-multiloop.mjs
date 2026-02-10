#!/usr/bin/env node
/**
 * Ralph CLI - Multi-Loop Support
 *
 * CLI interface for Ralph loops with multi-loop support.
 * Supports concurrent Ralph loops with loop ID tracking.
 *
 * Usage:
 *   aiwg ralph "task" --completion "criteria" [--loop-id <id>]
 *   aiwg ralph --interactive
 *   aiwg ralph list
 *
 * @module tools/ralph/ralph-cli-multiloop
 */

import fs from 'fs';
import path from 'path';
import { createInterface } from 'readline';
import { fileURLToPath } from 'url';
import { MultiLoopStateManager } from './state-manager.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Parse CLI arguments
 */
function parseArgs(args) {
  const result = {
    task: null,
    completion: null,
    maxIterations: 10,
    timeout: 60,
    interactive: false,
    noCommit: false,
    branch: null,
    loopId: null,
    force: false,
    help: false,
    list: false,
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === '--completion' && args[i + 1]) {
      result.completion = args[++i];
    } else if (arg === '--max-iterations' && args[i + 1]) {
      result.maxIterations = parseInt(args[++i], 10);
    } else if (arg === '--timeout' && args[i + 1]) {
      result.timeout = parseInt(args[++i], 10);
    } else if (arg === '--branch' && args[i + 1]) {
      result.branch = args[++i];
    } else if (arg === '--loop-id' && args[i + 1]) {
      result.loopId = args[++i];
    } else if (arg === '--force') {
      result.force = true;
    } else if (arg === '--interactive' || arg === '-i') {
      result.interactive = true;
    } else if (arg === '--no-commit') {
      result.noCommit = true;
    } else if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === 'list') {
      result.list = true;
    } else if (!arg.startsWith('-') && !result.task) {
      result.task = arg;
    }
    i++;
  }

  return result;
}

/**
 * Display help
 */
function displayHelp() {
  console.log(`
Ralph Loop - Iterative AI Task Execution (Multi-Loop Support)

"Iteration beats perfection" - keeps trying until success

Usage:
  aiwg ralph "<task>" --completion "<criteria>" [options]
  aiwg ralph --interactive
  aiwg ralph list

Options:
  --completion <criteria>   Verification command/criteria (required)
  --max-iterations <N>      Maximum iterations before stopping (default: 10)
  --timeout <minutes>       Maximum time before timeout (default: 60)
  --loop-id <id>            Explicit loop ID (auto-generated if omitted)
  --force                   Override MAX_CONCURRENT_LOOPS limit
  --interactive, -i         Ask setup questions first
  --no-commit               Disable auto-commits after each iteration
  --branch <name>           Create feature branch for loop work
  --help, -h                Show this help

Commands:
  list                      List all active loops

Examples:
  # Start new loop (auto-generates ID)
  aiwg ralph "Fix all failing tests" --completion "npm test passes"

  # Start with explicit loop ID
  aiwg ralph "Fix tests" --completion "npm test" --loop-id my-test-fix

  # List active loops
  aiwg ralph list

  # Start with long-running task
  aiwg ralph "Convert to TypeScript" --completion "npx tsc --noEmit passes" --max-iterations 20

Multi-Loop Notes:
  - Maximum 4 concurrent loops recommended (research-backed limit)
  - Each loop has isolated state in .aiwg/ralph/loops/{loop-id}/
  - Use --force to exceed 4-loop limit (not recommended)

State:
  Loop state saved to .aiwg/ralph/loops/{loop-id}/ for resume support

Related Commands:
  aiwg ralph-status --loop-id <id>    Check specific loop status
  aiwg ralph-status --all             Check all loop statuses
  aiwg ralph-abort --loop-id <id>     Abort specific loop
  aiwg ralph-resume --loop-id <id>    Resume paused loop

For more: https://github.com/jmagly/aiwg
`);
}

/**
 * List active loops
 */
function listActiveLoops() {
  const manager = new MultiLoopStateManager(process.cwd());
  const loops = manager.listActiveLoops();

  if (loops.length === 0) {
    console.log('\nNo active Ralph loops.');
    console.log('Start one with: aiwg ralph "task" --completion "criteria"\n');
    return;
  }

  console.log('\n═══════════════════════════════════════════');
  console.log(`Active Ralph Loops (${loops.length})`);
  console.log('═══════════════════════════════════════════\n');

  loops.forEach((loop, i) => {
    console.log(`${i + 1}. ${loop.loop_id}`);
    console.log(`   Task: ${loop.task_summary}`);
    console.log(`   Status: ${loop.status}`);
    console.log(`   Iteration: ${loop.iteration}/${loop.max_iterations}`);
    console.log(`   Started: ${loop.started_at}`);
    if (loop.owner) {
      console.log(`   Owner: ${loop.owner}`);
    }
    console.log('');
  });

  console.log('Use: aiwg ralph-status --loop-id <id> for details');
  console.log('═══════════════════════════════════════════\n');
}

/**
 * Interactive setup mode
 */
async function interactiveSetup() {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = (question) =>
    new Promise((resolve) => rl.question(question, resolve));

  console.log('\n🔁 Ralph Loop Setup\n');

  const task = await ask('Task to execute: ');
  if (!task.trim()) {
    console.error('Error: Task is required');
    rl.close();
    process.exit(1);
  }

  const completion = await ask('Completion criteria (verification command): ');
  if (!completion.trim()) {
    console.error('Error: Completion criteria is required');
    rl.close();
    process.exit(1);
  }

  const maxIterStr = await ask('Max iterations [10]: ');
  const maxIterations = maxIterStr.trim() ? parseInt(maxIterStr, 10) : 10;

  const timeoutStr = await ask('Timeout in minutes [60]: ');
  const timeout = timeoutStr.trim() ? parseInt(timeoutStr, 10) : 60;

  const branchStr = await ask('Feature branch name [none]: ');
  const branch = branchStr.trim() || null;

  const loopIdStr = await ask('Loop ID [auto-generated]: ');
  const loopId = loopIdStr.trim() || null;

  rl.close();

  return { task, completion, maxIterations, timeout, branch, loopId, noCommit: false };
}

/**
 * Generate skill invocation prompt
 */
function generateSkillPrompt(config, loopId) {
  let prompt = `/ralph "${config.task}" --completion "${config.completion}" --max-iterations ${config.maxIterations} --timeout ${config.timeout}`;

  if (loopId) {
    prompt += ` --loop-id ${loopId}`;
  }
  if (config.branch) {
    prompt += ` --branch ${config.branch}`;
  }
  if (config.noCommit) {
    prompt += ' --no-commit';
  }

  return prompt;
}

/**
 * Main CLI handler
 */
async function main() {
  const args = process.argv.slice(2);
  const config = parseArgs(args);

  if (config.help) {
    displayHelp();
    process.exit(0);
  }

  // List command
  if (config.list) {
    listActiveLoops();
    process.exit(0);
  }

  // Interactive mode
  if (config.interactive) {
    const interactiveConfig = await interactiveSetup();
    Object.assign(config, interactiveConfig);
  }

  // Validate required params
  if (!config.task) {
    console.error('Error: Task is required');
    console.log('Usage: aiwg ralph "task" --completion "criteria"');
    console.log('Run: aiwg ralph --help for more info');
    process.exit(1);
  }

  if (!config.completion) {
    console.error('Error: Completion criteria is required');
    console.log('Usage: aiwg ralph "task" --completion "criteria"');
    console.log('Run: aiwg ralph --help for more info');
    process.exit(1);
  }

  // Create loop using multi-loop state manager
  console.log('\n🔁 Initializing Ralph Loop\n');

  const manager = new MultiLoopStateManager(process.cwd());

  try {
    const result = manager.createLoop(
      {
        loopId: config.loopId,
        task: config.task,
        completion: config.completion,
        maxIterations: config.maxIterations,
        timeout: config.timeout,
        branch: config.branch,
        autoCommit: !config.noCommit,
      },
      { force: config.force }
    );

    const { loopId, state } = result;

    console.log(`Loop ID: ${loopId}`);
    console.log(`Task: ${config.task}`);
    console.log(`Completion: ${config.completion}`);
    console.log(`Max iterations: ${config.maxIterations}`);
    console.log(`Timeout: ${config.timeout} minutes`);
    if (config.branch) {
      console.log(`Branch: ralph/${config.branch}`);
    }
    console.log(`Auto-commit: ${!config.noCommit}`);
    console.log('');

    // Generate skill invocation for agentic toolsets
    const skillPrompt = generateSkillPrompt(config, loopId);
    const loopDir = manager.getLoopDir(loopId);
    console.log(`State directory: ${loopDir}`);
    console.log('');
    console.log('To execute in an agentic environment, use:');
    console.log('─'.repeat(50));
    console.log(skillPrompt);
    console.log('─'.repeat(50));
    console.log('');
    console.log('Or invoke naturally: "ralph this task until tests pass"');
    console.log('');

    // Output for piping to other tools
    if (process.stdout.isTTY === false) {
      // Non-interactive mode - output JSON for other tools
      console.log(
        JSON.stringify({
          initialized: true,
          loopId,
          stateDir: loopDir,
          skillPrompt,
          config,
        })
      );
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
