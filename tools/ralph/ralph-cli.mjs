#!/usr/bin/env node
/**
 * Ralph CLI - Iterative Task Loop Executor
 *
 * CLI interface for Ralph loops. Invokes the ralph skill for actual execution,
 * keeping logic centralized and allowing Ralph to work across agentic toolsets.
 *
 * Usage:
 *   aiwg ralph "task" --completion "criteria"
 *   aiwg ralph --interactive
 *
 * @module tools/ralph/ralph-cli
 */

import fs from 'fs';
import path from 'path';
import { createInterface } from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RALPH_STATE_DIR = '.aiwg/ralph';

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
    help: false,
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
    } else if (arg === '--interactive' || arg === '-i') {
      result.interactive = true;
    } else if (arg === '--no-commit') {
      result.noCommit = true;
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
  aiwg ralph --interactive

Options:
  --completion <criteria>   Verification command/criteria (required)
  --max-iterations <N>      Maximum iterations before stopping (default: 10)
  --timeout <minutes>       Maximum time before timeout (default: 60)
  --interactive, -i         Ask setup questions first
  --no-commit               Disable auto-commits after each iteration
  --branch <name>           Create feature branch for loop work
  --help, -h                Show this help

Examples:
  aiwg ralph "Fix all failing tests" --completion "npm test passes"
  aiwg ralph "Convert to TypeScript" --completion "npx tsc --noEmit passes" --max-iterations 20
  aiwg ralph "Add tests for 80% coverage" --completion "npm run coverage shows >= 80%"
  aiwg ralph --interactive

Completion Criteria (must be verifiable):
  Good: "npm test passes", "npx tsc --noEmit exits 0", "coverage >= 80%"
  Bad:  "code is good", "feature complete" (subjective)

State:
  Loop state saved to .aiwg/ralph/ for resume support

Related Commands:
  aiwg ralph-status    Check current loop status
  aiwg ralph-abort     Abort running loop
  aiwg ralph-resume    Resume interrupted loop

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
 * Initialize loop state
 */
function initializeState(config) {
  const state = {
    active: true,
    task: config.task,
    completion: config.completion,
    maxIterations: config.maxIterations,
    timeoutMinutes: config.timeout,
    timeoutMs: config.timeout * 60 * 1000,
    startTime: new Date().toISOString(),
    startTimeMs: Date.now(),
    currentIteration: 0,
    autoCommit: !config.noCommit,
    branch: config.branch,
    completed: false,
    status: 'running',
    iterations: [],
    lastResult: null,
    learnings: null,
  };

  // Ensure state directory exists
  const stateDir = path.resolve(RALPH_STATE_DIR);
  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }

  // Create iterations subdirectory
  const iterDir = path.join(stateDir, 'iterations');
  if (!fs.existsSync(iterDir)) {
    fs.mkdirSync(iterDir, { recursive: true });
  }

  // Write initial state
  const stateFile = path.join(stateDir, 'current-loop.json');
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));

  return state;
}

/**
 * Generate skill invocation prompt
 *
 * This creates a prompt that the ralph skill can process,
 * allowing Ralph to work across different agentic toolsets.
 */
function generateSkillPrompt(config) {
  return `
/ralph "${config.task}" --completion "${config.completion}" --max-iterations ${config.maxIterations} --timeout ${config.timeout}${config.branch ? ` --branch ${config.branch}` : ''}${config.noCommit ? ' --no-commit' : ''}
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

  // Initialize state
  console.log('\n🔁 Initializing Ralph Loop\n');
  const state = initializeState(config);

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
  const skillPrompt = generateSkillPrompt(config);
  console.log('State initialized at: .aiwg/ralph/current-loop.json');
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
    console.log(JSON.stringify({
      initialized: true,
      stateFile: path.resolve(RALPH_STATE_DIR, 'current-loop.json'),
      skillPrompt,
      config,
    }));
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
