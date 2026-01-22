/**
 * Ralph Command Handlers
 *
 * CLI command handlers for Ralph iterative execution loop.
 * Delegates to existing Ralph scripts in tools/ralph/.
 *
 * @implements @.aiwg/architecture/decisions/ADR-001-unified-extension-system.md
 * @tests @test/unit/cli/handlers/ralph.test.ts
 * @issue #33
 */

import { CommandHandler, HandlerContext, HandlerResult } from './types.js';
import { createScriptRunner } from './script-runner.js';

/**
 * Ralph Loop Handler
 *
 * Executes iterative task loops with automatic completion detection.
 */
export class RalphHandler implements CommandHandler {
  id = 'ralph';
  name = 'Ralph Loop';
  description = 'Execute iterative task loop with automatic completion detection';
  category = 'ralph' as const;
  aliases = ['ralph', '-ralph', '--ralph'];

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const runner = createScriptRunner(ctx.frameworkRoot);
    return runner.run('tools/ralph/ralph-cli.mjs', ctx.args);
  }
}

/**
 * Ralph Status Handler
 *
 * Shows current Ralph loop status and iteration history.
 */
export class RalphStatusHandler implements CommandHandler {
  id = 'ralph-status';
  name = 'Ralph Status';
  description = 'Show Ralph loop status and iteration history';
  category = 'ralph' as const;
  aliases = ['ralph-status'];

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const runner = createScriptRunner(ctx.frameworkRoot);
    return runner.run('tools/ralph/ralph-status.mjs', ctx.args);
  }
}

/**
 * Ralph Abort Handler
 *
 * Aborts currently running Ralph loop.
 */
export class RalphAbortHandler implements CommandHandler {
  id = 'ralph-abort';
  name = 'Ralph Abort';
  description = 'Abort currently running Ralph loop';
  category = 'ralph' as const;
  aliases = ['ralph-abort'];

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const runner = createScriptRunner(ctx.frameworkRoot);
    return runner.run('tools/ralph/ralph-abort.mjs', ctx.args);
  }
}

/**
 * Ralph Resume Handler
 *
 * Resumes previously aborted Ralph loop.
 */
export class RalphResumeHandler implements CommandHandler {
  id = 'ralph-resume';
  name = 'Ralph Resume';
  description = 'Resume previously aborted Ralph loop';
  category = 'ralph' as const;
  aliases = ['ralph-resume'];

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const runner = createScriptRunner(ctx.frameworkRoot);
    return runner.run('tools/ralph/ralph-resume.mjs', ctx.args);
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
