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
import { createProvider, hasProvider } from './lib/provider-adapter.mjs';
import { MemoryManager } from './memory-manager.mjs';
import { BestOutputTracker } from './best-output-tracker.mjs';
import { IterationAnalytics } from './iteration-analytics.mjs';
import { EarlyStopping } from './early-stopping.mjs';
import { CrossTaskLearner } from './cross-task-learner.mjs';

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
    // New research-backed options (#149, #154, #167, #168, #170)
    memory: 3,                    // Memory capacity Ω (#170)
    crossTask: true,              // Cross-task learning (#154)
    enableAnalytics: true,        // Iteration analytics (#167)
    enableBestOutput: true,       // Best output tracking (#168)
    enableEarlyStopping: true,    // Early stopping (#149)
    provider: 'claude',           // CLI provider (claude, codex)
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
    } else if (arg === '--memory' || arg === '-m') {
      const memArg = args[++i];
      options.memory = isNaN(parseInt(memArg)) ? memArg : parseInt(memArg, 10);
    } else if (arg === '--cross-task') {
      options.crossTask = true;
    } else if (arg === '--no-cross-task') {
      options.crossTask = false;
    } else if (arg === '--no-analytics') {
      options.enableAnalytics = false;
    } else if (arg === '--no-best-output') {
      options.enableBestOutput = false;
    } else if (arg === '--no-early-stopping') {
      options.enableEarlyStopping = false;
    } else if (arg === '--provider') {
      options.provider = args[++i];
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

================================================================================
                           SECURITY WARNING
================================================================================
This tool spawns Claude Code with --dangerously-skip-permissions, which
BYPASSES ALL PERMISSION PROMPTS. Sessions can:

  - Read/write ANY file without confirmation
  - Execute ANY shell command without approval
  - Run for hours without human oversight

BEFORE USING: Read docs/ralph-external-security.md

REQUIRED PRECAUTIONS:
  - Clean git state (for rollback)
  - Set budget limits (--budget)
  - Set iteration limits (--max-iterations)
  - Monitor session progress
  - Be ready to abort if needed
================================================================================

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
  --provider <name>       CLI provider: claude (default), codex

RESEARCH-BACKED OPTIONS (REF-015, REF-021):
  -m, --memory <n|preset>  Memory capacity Ω: 1-10 or preset name
                          Presets: simple(1), moderate(3), complex(5), maximum(10)
                          Default: 3 (moderate)
  --cross-task            Enable cross-task learning (default: true)
  --no-cross-task         Disable cross-task learning
  --no-analytics          Disable iteration analytics
  --no-best-output        Disable best output selection (use final)
  --no-early-stopping     Disable early stopping on high confidence

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

  // Check provider availability
  const providerName = options.provider || 'claude';
  if (!hasProvider(providerName)) {
    console.error(`Error: Unknown provider '${providerName}'. Available: claude, codex`);
    process.exit(1);
  }

  const adapter = createProvider(providerName);
  const providerAvailable = await adapter.isAvailable();
  if (!providerAvailable) {
    console.error(`Error: ${providerName} CLI not found. Please install it.`);
    process.exit(1);
  }

  const version = await adapter.getVersion();
  console.log(`${providerName} CLI version: ${version}`);

  const orchestrator = new Orchestrator(projectRoot);

  // Track if shutdown is in progress to prevent double-handling
  let shutdownInProgress = false;

  // Handle signals for graceful shutdown
  process.on('SIGINT', async () => {
    if (shutdownInProgress) {
      console.log('\n[External Ralph] Force quit requested');
      process.exit(1);
    }
    shutdownInProgress = true;
    console.log('\n[External Ralph] Received SIGINT, initiating graceful shutdown...');
    try {
      await orchestrator.gracefulShutdown();
    } catch (error) {
      console.error(`[External Ralph] Shutdown error: ${error.message}`);
    }
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    if (shutdownInProgress) {
      return;
    }
    shutdownInProgress = true;
    console.log('\n[External Ralph] Received SIGTERM, initiating graceful shutdown...');
    try {
      await orchestrator.gracefulShutdown();
    } catch (error) {
      console.error(`[External Ralph] Shutdown error: ${error.message}`);
    }
    process.exit(0);
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
        provider: options.provider,
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

// Import process reliability modules
import { ProcessMonitor } from './process-monitor.mjs';
import { RecoveryEngine } from './recovery-engine.mjs';

// Import Epic #26 modules
import { PIDController } from './pid-controller.mjs';
import { GainScheduler } from './gain-scheduler.mjs';
import { MetricsCollector } from './metrics-collector.mjs';
import { ControlAlarms } from './control-alarms.mjs';
import { ClaudePromptGenerator } from './lib/claude-prompt-generator.mjs';
import { ValidationAgent } from './lib/validation-agent.mjs';
import { StrategyPlanner } from './lib/strategy-planner.mjs';
import { SemanticMemory } from './lib/semantic-memory.mjs';
import { MemoryPromotion } from './lib/memory-promotion.mjs';
import { LearningExtractor } from './lib/learning-extractor.mjs';
import { MemoryRetrieval } from './lib/memory-retrieval.mjs';
import { Overseer } from './lib/overseer.mjs';
import { BehaviorDetector } from './lib/behavior-detector.mjs';
import { InterventionSystem } from './lib/intervention-system.mjs';
import { EscalationHandler } from './lib/escalation-handler.mjs';

// Export all modules for programmatic use
export {
  parseArgs,
  printHelp,
  printStatus,
  // Core modules
  Orchestrator,
  StateManager,
  // Research-backed modules (#149, #154, #167, #168, #170)
  MemoryManager,
  BestOutputTracker,
  IterationAnalytics,
  EarlyStopping,
  CrossTaskLearner,
  // Process reliability modules (Phase 4)
  ProcessMonitor,
  RecoveryEngine,
  // Epic #26 - PID Control Layer (#23)
  PIDController,
  GainScheduler,
  MetricsCollector,
  ControlAlarms,
  // Epic #26 - Claude Intelligence Layer (#22)
  ClaudePromptGenerator,
  ValidationAgent,
  StrategyPlanner,
  // Epic #26 - Memory Layer (#24)
  SemanticMemory,
  MemoryPromotion,
  LearningExtractor,
  MemoryRetrieval,
  // Epic #26 - Overseer Layer (#25)
  Overseer,
  BehaviorDetector,
  InterventionSystem,
  EscalationHandler,
};
