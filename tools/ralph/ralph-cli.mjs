#!/usr/bin/env node
/**
 * Ralph CLI - Iterative Task Loop Executor
 *
 * CLI interface for Ralph loops. Invokes the ralph skill for actual execution,
 * keeping logic centralized and allowing Ralph to work across agentic toolsets.
 *
 * Multi-loop support: Manages concurrent Ralph loops with isolated state.
 *
 * Usage:
 *   aiwg ralph "task" --completion "criteria"
 *   aiwg ralph list
 *   aiwg ralph --interactive
 *
 * @module tools/ralph/ralph-cli
 */

import fs from 'fs';
import path from 'path';
import { createInterface } from 'readline';
import { fileURLToPath } from 'url';
import { MultiLoopStateManager } from './state-manager-sync.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Parse CLI arguments
 */
function parseArgs(args) {
  const result = {
    subcommand: null,
    task: null,
    completion: null,
    maxIterations: 10,
    timeout: 60,
    interactive: false,
    noCommit: false,
    branch: null,
    loopId: null,
    all: false,
    force: false,
    help: false,
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === 'list') {
      result.subcommand = 'list';
    } else if (arg === '--completion' && args[i + 1]) {
      result.completion = args[++i];
    } else if (arg === '--max-iterations' && args[i + 1]) {
      result.maxIterations = parseInt(args[++i], 10);
    } else if (arg === '--timeout' && args[i + 1]) {
      result.timeout = parseInt(args[++i], 10);
    } else if (arg === '--branch' && args[i + 1]) {
      result.branch = args[++i];
    } else if (arg === '--loop-id' && args[i + 1]) {
      result.loopId = args[++i];
    } else if (arg === '--interactive' || arg === '-i') {
      result.interactive = true;
    } else if (arg === '--no-commit') {
      result.noCommit = true;
    } else if (arg === '--all') {
      result.all = true;
    } else if (arg === '--force' || arg === '-f') {
      result.force = true;
    } else if (arg === '--help' || arg === '-h') {
      result.help = true;
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
Ralph Loop - Iterative AI Task Execution

"Iteration beats perfection" - keeps trying until success

Usage:
  aiwg ralph "<task>" --completion "<criteria>" [options]
  aiwg ralph list [--all]
  aiwg ralph --interactive

Options:
  --completion <criteria>   Verification command/criteria (required)
  --max-iterations <N>      Maximum iterations before stopping (default: 10)
  --timeout <minutes>       Maximum time before timeout (default: 60)
  --loop-id <id>            Specify loop ID (for targeting specific loop)
  --interactive, -i         Ask setup questions first
  --no-commit               Disable auto-commits after each iteration
  --branch <name>           Create feature branch for loop work
  --force, -f               Override MAX_CONCURRENT_LOOPS limit
  --all                     Show all loops (with list subcommand)
  --help, -h                Show this help

Subcommands:
  list                      List all active Ralph loops

Examples:
  aiwg ralph "Fix all failing tests" --completion "npm test passes"
  aiwg ralph "Convert to TypeScript" --completion "npx tsc --noEmit passes" --max-iterations 20
  aiwg ralph "Add tests for 80% coverage" --completion "npm run coverage shows >= 80%"
  aiwg ralph list
  aiwg ralph --interactive

Completion Criteria (must be verifiable):
  Good: "npm test passes", "npx tsc --noEmit exits 0", "coverage >= 80%"
  Bad:  "code is good", "feature complete" (subjective)

Multi-Loop Support:
  - Up to 4 concurrent loops supported (MAX_CONCURRENT_LOOPS)
  - Each loop has isolated state in .aiwg/ralph/loops/<loop-id>/
  - Use --force to override MAX_CONCURRENT_LOOPS (not recommended)

State:
  Loop state saved to .aiwg/ralph/loops/<loop-id>/ for resume support
  Registry tracked in .aiwg/ralph/registry.json

Related Commands:
  aiwg ralph-status        Check current loop status (single or multi-loop)
  aiwg ralph-abort         Abort running loop
  aiwg ralph-resume        Resume interrupted loop

For more: https://github.com/jmagly/ai-writing-guide
`);
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

  rl.close();

  return { task, completion, maxIterations, timeout, branch, noCommit: false };
}

/**
 * List active loops
 */
function listActiveLoops(stateManager, options = {}) {
  const activeLoops = stateManager.listActiveLoops();

  if (activeLoops.length === 0) {
    console.log('\nNo active Ralph loops.\n');
    console.log('Start one with: aiwg ralph "task" --completion "criteria"\n');
    return;
  }

  console.log('\n═══════════════════════════════════════════');
  console.log(`Active Ralph Loops (${activeLoops.length}/${stateManager.registry.load().max_concurrent_loops})`);
  console.log('═══════════════════════════════════════════\n');

  for (const loop of activeLoops) {
    const state = stateManager.getLoopState(loop.loop_id);
    const elapsed = Date.now() - new Date(state.startTime).getTime();
    const elapsedMinutes = Math.floor(elapsed / 60000);

    console.log(`Loop ID: ${loop.loop_id}`);
    console.log(`  Task: ${state.task}`);
    console.log(`  Status: ${state.status.toUpperCase()}`);
    console.log(`  Iteration: ${state.currentIteration}/${state.maxIterations}`);
    console.log(`  Elapsed: ${elapsedMinutes}m`);
    console.log(`  Priority: ${loop.priority || 'medium'}`);
    if (loop.tags && loop.tags.length > 0) {
      console.log(`  Tags: ${loop.tags.join(', ')}`);
    }
    console.log('');
  }

  console.log('Commands:');
  console.log('  aiwg ralph-status --loop-id <id>  Show detailed status');
  console.log('  aiwg ralph-abort --loop-id <id>   Abort specific loop');
  console.log('  aiwg ralph-resume --loop-id <id>  Resume specific loop');
  console.log('');
}

/**
 * Generate skill invocation prompt
 *
 * This creates a prompt that the ralph skill can process,
 * allowing Ralph to work across different agentic toolsets.
 */
function generateSkillPrompt(config, loopId) {
  return `
/ralph "${config.task}" --loop-id ${loopId} --completion "${config.completion}" --max-iterations ${config.maxIterations} --timeout ${config.timeout}${config.branch ? ` --branch ${config.branch}` : ''}${config.noCommit ? ' --no-commit' : ''}
`.trim();
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

  const projectRoot = process.cwd();
  const stateManager = new MultiLoopStateManager(projectRoot);

  // Handle list subcommand
  if (config.subcommand === 'list') {
    listActiveLoops(stateManager, { all: config.all });
    return;
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

  // Create loop
  console.log('\n🔁 Initializing Ralph Loop\n');

  let result;
  try {
    result = stateManager.createLoop(
      {
        task: config.task,
        completion: config.completion,
        maxIterations: config.maxIterations,
        timeout: config.timeout,
        branch: config.branch,
        autoCommit: !config.noCommit,
        loopId: config.loopId, // Optional: allow custom loop ID
      },
      { force: config.force }
    );
  } catch (err) {
    console.error(`\nError: ${err.message}\n`);

    // Show active loops if limit exceeded
    if (err.message.includes('loops already active')) {
      console.log('Active loops:');
      listActiveLoops(stateManager);
    }

    process.exit(1);
  }

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
  console.log(`State initialized at: .aiwg/ralph/loops/${loopId}/state.json`);
  console.log('');
  console.log('To execute in an agentic environment, use:');
  console.log('─'.repeat(50));
  console.log(skillPrompt);
  console.log('─'.repeat(50));
  console.log('');
  console.log(`Or invoke naturally: "ralph this task until tests pass" with loop ID ${loopId}`);
  console.log('');

  // Output for piping to other tools
  if (process.stdout.isTTY === false) {
    // Non-interactive mode - output JSON for other tools
    console.log(
      JSON.stringify({
        initialized: true,
        loopId,
        stateFile: stateManager.getStatePath(loopId),
        skillPrompt,
        config,
      })
    );
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
