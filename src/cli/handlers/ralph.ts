/**
 * Ralph Command Handlers
 *
 * CLI command handlers for Ralph iterative execution loop.
 * Uses external Ralph supervisor for crash-resilient background execution.
 * Falls back to internal scripts when --internal flag is used.
 *
 * @implements @.aiwg/architecture/decisions/ADR-001-unified-extension-system.md
 * @implements @.aiwg/working/issue-ralph-external-completion.md
 * @tests @test/unit/cli/handlers/ralph.test.ts
 * @issue #33, #275
 */

import { CommandHandler, HandlerContext, HandlerResult } from './types.js';
import { createScriptRunner } from './script-runner.js';
import {
  launchExternalRalph,
  getLoopStatuses,
  abortLoop,
  resumeLoop,
  RalphLaunchOptions,
} from './ralph-launcher.js';

/**
 * Parse Ralph command arguments
 */
function parseRalphArgs(args: string[]): {
  objective?: string;
  completionCriteria?: string;
  maxIterations?: number;
  model?: string;
  budget?: number;
  timeout?: number;
  mcpConfig?: string;
  giteaIssue?: boolean;
  memory?: number | string;
  crossTask?: boolean;
  enableAnalytics?: boolean;
  enableBestOutput?: boolean;
  enableEarlyStopping?: boolean;
  internal?: boolean;
  help?: boolean;
  loopId?: string;
} {
  const result: ReturnType<typeof parseRalphArgs> = {};
  let i = 0;

  while (i < args.length) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--internal') {
      result.internal = true;
    } else if (arg === '--completion' || arg === '-c') {
      result.completionCriteria = args[++i];
    } else if (arg === '--max-iterations') {
      result.maxIterations = parseInt(args[++i], 10);
    } else if (arg === '--model') {
      result.model = args[++i];
    } else if (arg === '--budget') {
      result.budget = parseFloat(args[++i]);
    } else if (arg === '--timeout') {
      result.timeout = parseInt(args[++i], 10);
    } else if (arg === '--mcp-config') {
      result.mcpConfig = args[++i];
    } else if (arg === '--gitea-issue') {
      result.giteaIssue = true;
    } else if (arg === '--memory' || arg === '-m') {
      const memArg = args[++i];
      result.memory = isNaN(parseInt(memArg)) ? memArg : parseInt(memArg, 10);
    } else if (arg === '--cross-task') {
      result.crossTask = true;
    } else if (arg === '--no-cross-task') {
      result.crossTask = false;
    } else if (arg === '--no-analytics') {
      result.enableAnalytics = false;
    } else if (arg === '--no-best-output') {
      result.enableBestOutput = false;
    } else if (arg === '--no-early-stopping') {
      result.enableEarlyStopping = false;
    } else if (arg === '--loop-id') {
      result.loopId = args[++i];
    } else if (!arg.startsWith('-') && !result.objective) {
      result.objective = arg;
    }

    i++;
  }

  return result;
}

/**
 * Ralph Loop Handler
 *
 * Executes iterative task loops with automatic completion detection.
 * By default, launches as a detached background process that survives terminal closure.
 * Use --internal flag for the legacy foreground execution.
 */
export class RalphHandler implements CommandHandler {
  id = 'ralph';
  name = 'Ralph Loop';
  description = 'Execute iterative task loop with automatic completion detection';
  category = 'ralph' as const;
  aliases = ['ralph', '-ralph', '--ralph'];

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const parsed = parseRalphArgs(ctx.args);

    // Show help
    if (parsed.help) {
      return {
        exitCode: 0,
        message: this.getHelpText(),
      };
    }

    // Use internal (foreground) mode if requested
    if (parsed.internal) {
      const runner = createScriptRunner(ctx.frameworkRoot);
      return runner.run('tools/ralph/ralph-cli.mjs', ctx.args.filter((a) => a !== '--internal'));
    }

    // Validate required arguments
    if (!parsed.objective) {
      return {
        exitCode: 1,
        message: 'Error: Objective is required.\n\nUsage: aiwg ralph "<objective>" --completion "<criteria>"',
      };
    }

    if (!parsed.completionCriteria) {
      return {
        exitCode: 1,
        message: 'Error: Completion criteria is required.\n\nUsage: aiwg ralph "<objective>" --completion "<criteria>"',
      };
    }

    // Launch external Ralph as detached background process
    try {
      const options: RalphLaunchOptions = {
        objective: parsed.objective,
        completionCriteria: parsed.completionCriteria,
        maxIterations: parsed.maxIterations,
        model: parsed.model,
        budget: parsed.budget,
        timeout: parsed.timeout,
        mcpConfig: parsed.mcpConfig,
        giteaIssue: parsed.giteaIssue,
        memory: parsed.memory,
        crossTask: parsed.crossTask,
        enableAnalytics: parsed.enableAnalytics,
        enableBestOutput: parsed.enableBestOutput,
        enableEarlyStopping: parsed.enableEarlyStopping,
        loopId: parsed.loopId,
      };

      const result = await launchExternalRalph(ctx.frameworkRoot, process.cwd(), options);

      return {
        exitCode: 0,
        message: `✓ ${result.message}\n  PID: ${result.pid}\n  Loop ID: ${result.loopId}`,
      };
    } catch (error) {
      return {
        exitCode: 1,
        message: `Failed to launch Ralph: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  private getHelpText(): string {
    return `
Ralph Loop - Crash-resilient iterative task execution

USAGE:
  aiwg ralph "<objective>" --completion "<criteria>" [options]
  aiwg ralph-status [--all]
  aiwg ralph-abort [--loop-id <id>]
  aiwg ralph-resume [--loop-id <id>]

ARGUMENTS:
  <objective>             Task objective (required)

OPTIONS:
  -c, --completion <str>  Completion criteria (required)
  --max-iterations <n>    Maximum iterations (default: 5)
  --model <model>         Claude model (default: opus)
  --budget <usd>          Budget per iteration in USD (default: 2.0)
  --timeout <min>         Timeout per iteration in minutes (default: 60)
  --mcp-config <json>     MCP server configuration JSON
  --gitea-issue           Create/link Gitea issue for tracking
  --loop-id <id>          Use specific loop ID

RESEARCH-BACKED OPTIONS (REF-015, REF-021):
  -m, --memory <n>        Memory capacity Ω (default: 3)
  --cross-task            Enable cross-task learning (default: true)
  --no-cross-task         Disable cross-task learning
  --no-analytics          Disable iteration analytics
  --no-best-output        Disable best output selection
  --no-early-stopping     Disable early stopping on high confidence

FLAGS:
  --internal              Run in foreground (legacy mode)
  -h, --help              Show this help message

EXAMPLES:
  # Start background loop
  aiwg ralph "Fix all failing tests" --completion "npm test passes"

  # Check status
  aiwg ralph-status

  # Abort running loop
  aiwg ralph-abort
`;
  }
}

/**
 * Ralph Status Handler
 *
 * Shows current Ralph loop status and iteration history.
 * Works across terminal sessions by reading from the loop registry.
 */
export class RalphStatusHandler implements CommandHandler {
  id = 'ralph-status';
  name = 'Ralph Status';
  description = 'Show Ralph loop status and iteration history';
  category = 'ralph' as const;
  aliases = ['ralph-status'];

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const showAll = ctx.args.includes('--all') || ctx.args.includes('-a');
    const statuses = getLoopStatuses(process.cwd());

    if (statuses.length === 0) {
      return {
        exitCode: 0,
        message: 'No Ralph loops found.',
      };
    }

    // Sort by most recent first
    statuses.sort((a, b) => new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime());

    // Filter to running only unless --all
    const displayed = showAll ? statuses : statuses.filter((s) => s.status === 'running');

    if (displayed.length === 0) {
      return {
        exitCode: 0,
        message: 'No running Ralph loops. Use --all to see completed/failed loops.',
      };
    }

    const lines: string[] = ['Ralph Loop Status', '=================', ''];

    for (const loop of displayed) {
      const statusIcon =
        loop.status === 'running'
          ? '🔄'
          : loop.status === 'completed'
            ? '✅'
            : loop.status === 'aborted'
              ? '⏹️'
              : '❌';

      lines.push(`${statusIcon} ${loop.loopId}`);
      lines.push(`   Status: ${loop.status.toUpperCase()}`);
      lines.push(`   Progress: ${loop.iteration}/${loop.maxIterations} iterations`);
      lines.push(`   Objective: ${loop.objective.slice(0, 60)}${loop.objective.length > 60 ? '...' : ''}`);
      lines.push(`   Started: ${loop.startedAt}`);
      if (loop.status === 'running') {
        lines.push(`   PID: ${loop.pid}`);
      }
      lines.push('');
    }

    if (!showAll && statuses.length > displayed.length) {
      lines.push(`(${statuses.length - displayed.length} completed/failed loops hidden. Use --all to show.)`);
    }

    return {
      exitCode: 0,
      message: lines.join('\n'),
    };
  }
}

/**
 * Ralph Abort Handler
 *
 * Aborts currently running Ralph loop by killing the background process.
 * Works across terminal sessions.
 */
export class RalphAbortHandler implements CommandHandler {
  id = 'ralph-abort';
  name = 'Ralph Abort';
  description = 'Abort currently running Ralph loop';
  category = 'ralph' as const;
  aliases = ['ralph-abort'];

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    // Parse --loop-id if provided
    let loopId: string | undefined;
    const loopIdIndex = ctx.args.indexOf('--loop-id');
    if (loopIdIndex !== -1 && ctx.args[loopIdIndex + 1]) {
      loopId = ctx.args[loopIdIndex + 1];
    }

    const result = abortLoop(process.cwd(), loopId);

    return {
      exitCode: result.success ? 0 : 1,
      message: result.message,
    };
  }
}

/**
 * Ralph Resume Handler
 *
 * Resumes previously interrupted Ralph loop as a new background process.
 * Works across terminal sessions.
 */
export class RalphResumeHandler implements CommandHandler {
  id = 'ralph-resume';
  name = 'Ralph Resume';
  description = 'Resume previously aborted Ralph loop';
  category = 'ralph' as const;
  aliases = ['ralph-resume'];

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    // Parse arguments
    let loopId: string | undefined;
    let maxIterations: number | undefined;

    for (let i = 0; i < ctx.args.length; i++) {
      const arg = ctx.args[i];
      if (arg === '--loop-id' && ctx.args[i + 1]) {
        loopId = ctx.args[++i];
      } else if (arg === '--max-iterations' && ctx.args[i + 1]) {
        maxIterations = parseInt(ctx.args[++i], 10);
      }
    }

    try {
      const result = await resumeLoop(ctx.frameworkRoot, process.cwd(), loopId, { maxIterations });

      return {
        exitCode: 0,
        message: `✓ ${result.message}\n  PID: ${result.pid}\n  Loop ID: ${result.loopId}`,
      };
    } catch (error) {
      return {
        exitCode: 1,
        message: `Failed to resume: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }
}

/**
 * Create Ralph handler instance
 */
export function createRalphHandler(): CommandHandler {
  return new RalphHandler();
}

/**
 * Create Ralph Status handler instance
 */
export function createRalphStatusHandler(): CommandHandler {
  return new RalphStatusHandler();
}

/**
 * Create Ralph Abort handler instance
 */
export function createRalphAbortHandler(): CommandHandler {
  return new RalphAbortHandler();
}

/**
 * Create Ralph Resume handler instance
 */
export function createRalphResumeHandler(): CommandHandler {
  return new RalphResumeHandler();
}

/**
 * Export handler instances
 */
export const ralphHandler = new RalphHandler();
export const ralphStatusHandler = new RalphStatusHandler();
export const ralphAbortHandler = new RalphAbortHandler();
export const ralphResumeHandler = new RalphResumeHandler();

/**
 * Export all Ralph handlers as array for easy registration
 */
export const ralphHandlers: CommandHandler[] = [
  ralphHandler,
  ralphStatusHandler,
  ralphAbortHandler,
  ralphResumeHandler,
];
