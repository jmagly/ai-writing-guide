#!/usr/bin/env node

/**
 * External Ralph Loop CLI
 *
 * Entry point for the external Ralph supervisor that provides
 * crash-resilient, long-running iterative task execution.
 *
 * Usage:
 *   node index.mjs "objective" --completion "criteria" [options]
 *   node index.mjs --resume [--max-iterations N]
 *   node index.mjs --status
 *   node index.mjs --abort
 *
 * @implements @.aiwg/requirements/design-ralph-external.md
 */

import { resolve } from 'path';
import { Orchestrator } from './orchestrator.mjs';
import { StateManager } from './state-manager.mjs';
import { isClaudeAvailable, getClaudeVersion } from './session-launcher.mjs';

/**
 * Parse command line arguments
 * @param {string[]} args
 * @returns {Object}
 */
function parseArgs(args) {
  const options = {
    objective: null,
    completionCriteria: null,
    maxIterations: 5,
    model: 'opus',
    budgetPerIteration: 2.0,
    timeoutMinutes: 60,
    mcpConfig: null,
    giteaIssue: false,
    resume: false,
    status: false,
    abort: false,
    help: false,
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--resume' || arg === '-r') {
      options.resume = true;
    } else if (arg === '--status' || arg === '-s') {
      options.status = true;
    } else if (arg === '--abort') {
      options.abort = true;
    } else if (arg === '--completion' || arg === '-c') {
      options.completionCriteria = args[++i];
    } else if (arg === '--max-iterations') {
      options.maxIterations = parseInt(args[++i], 10);
    } else if (arg === '--model') {
      options.model = args[++i];
    } else if (arg === '--budget') {
      options.budgetPerIteration = parseFloat(args[++i]);
    } else if (arg === '--timeout') {
      options.timeoutMinutes = parseInt(args[++i], 10);
    } else if (arg === '--mcp-config') {
      options.mcpConfig = JSON.parse(args[++i]);
    } else if (arg === '--gitea-issue') {
      options.giteaIssue = true;
    } else if (!arg.startsWith('-') && !options.objective) {
      options.objective = arg;
    }

    i++;
  }

  return options;
}

/**
 * Print help message
 */
function printHelp() {
  console.log(`
External Ralph Loop - Crash-resilient iterative task execution

USAGE:
  ralph-external "<objective>" --completion "<criteria>" [options]
  ralph-external --resume [options]
  ralph-external --status
  ralph-external --abort

ARGUMENTS:
  <objective>             Task objective (required for new loop)

OPTIONS:
  -c, --completion <str>  Completion criteria (required for new loop)
  --max-iterations <n>    Maximum external iterations (default: 5)
  --model <model>         Claude model (default: opus)
  --budget <usd>          Budget per iteration in USD (default: 2.0)
  --timeout <min>         Timeout per iteration in minutes (default: 60)
  --mcp-config <json>     MCP server configuration JSON
  --gitea-issue           Create/link Gitea issue for tracking

COMMANDS:
  -r, --resume            Resume interrupted loop
  -s, --status            Show current loop status
  --abort                 Abort current loop
  -h, --help              Show this help message

EXAMPLES:
  # Start new loop
  ralph-external "Fix all failing tests" --completion "npm test passes"

  # With options
  ralph-external "Migrate to TypeScript" \\
    --completion "npx tsc --noEmit exits 0" \\
    --max-iterations 10 \\
    --budget 5.0

  # Resume interrupted loop
  ralph-external --resume --max-iterations 15

  # Check status
  ralph-external --status
`);
}

/**
 * Print status
 * @param {string} projectRoot
 */
function printStatus(projectRoot) {
  const stateManager = new StateManager(projectRoot);
  const state = stateManager.load();

  if (!state) {
    console.log('No external Ralph loop found.');
    return;
  }

  console.log(`
External Ralph Loop Status
==========================

Loop ID:        ${state.loopId}
Status:         ${state.status}
Objective:      ${state.objective}
Criteria:       ${state.completionCriteria}

Progress:       ${state.currentIteration}/${state.maxIterations} iterations
Start Time:     ${state.startTime}
Last Update:    ${state.lastUpdate}

Iterations:
${state.iterations.map((iter, idx) => {
    const status = iter.status || 'unknown';
    const progress = iter.analysis?.completionPercentage || 0;
    return `  ${idx + 1}. ${status} (${progress}% progress)`;
  }).join('\n') || '  None yet'}

Learnings:
${state.accumulatedLearnings ? state.accumulatedLearnings.slice(0, 500) + '...' : '  None yet'}
`);
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);
  const projectRoot = process.cwd();

  // Handle help
  if (options.help) {
    printHelp();
    process.exit(0);
  }

  // Handle status
  if (options.status) {
    printStatus(projectRoot);
    process.exit(0);
  }

  // Handle abort
  if (options.abort) {
    const stateManager = new StateManager(projectRoot);
    stateManager.clear();
    console.log('External Ralph loop aborted.');
    process.exit(0);
  }

  // Check Claude availability
  const claudeAvailable = await isClaudeAvailable();
  if (!claudeAvailable) {
    console.error('Error: Claude CLI not found. Please install Claude Code.');
    process.exit(1);
  }

  const version = await getClaudeVersion();
  console.log(`Claude Code version: ${version}`);

  const orchestrator = new Orchestrator(projectRoot);

  // Handle signals for graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n[External Ralph] Received SIGINT, aborting...');
    orchestrator.abort();
  });

  process.on('SIGTERM', () => {
    console.log('\n[External Ralph] Received SIGTERM, aborting...');
    orchestrator.abort();
  });

  try {
    let result;

    if (options.resume) {
      // Resume existing loop
      result = await orchestrator.resume({
        maxIterations: options.maxIterations,
        budgetPerIteration: options.budgetPerIteration,
      });
    } else {
      // Start new loop
      if (!options.objective) {
        console.error('Error: Objective is required. Use --help for usage.');
        process.exit(1);
      }

      if (!options.completionCriteria) {
        console.error('Error: Completion criteria is required. Use --completion.');
        process.exit(1);
      }

      result = await orchestrator.execute({
        objective: options.objective,
        completionCriteria: options.completionCriteria,
        maxIterations: options.maxIterations,
        model: options.model,
        budgetPerIteration: options.budgetPerIteration,
        timeoutMinutes: options.timeoutMinutes,
        mcpConfig: options.mcpConfig,
        giteaIntegration: options.giteaIssue ? { enabled: true } : null,
      });
    }

    // Print result
    console.log(`\n[External Ralph] Loop completed:`);
    console.log(`  Success: ${result.success}`);
    console.log(`  Reason: ${result.reason}`);
    console.log(`  Iterations: ${result.iterations}`);
    console.log(`  Loop ID: ${result.loopId}`);

    process.exit(result.success ? 0 : 1);

  } catch (error) {
    console.error(`[External Ralph] Fatal error: ${error.message}`);
    process.exit(1);
  }
}

// Run if executed directly
main().catch(console.error);

export { parseArgs, printHelp, printStatus };
