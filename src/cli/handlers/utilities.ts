/**
 * Utility Command Handlers
 *
 * Handlers for utility commands including card prefilling, contribution workflow,
 * metadata validation, health diagnostics, and update checking.
 *
 * @implements @.aiwg/architecture/decisions/ADR-001-unified-extension-system.md
 * @source @src/cli/index.mjs
 * @tests @test/unit/cli/handlers/utilities.test.ts
 * @issue #33
 */

import { CommandHandler, HandlerContext, HandlerResult } from './types.js';
import { createScriptRunner } from './script-runner.js';
import { getFrameworkRoot } from '../../channel/manager.mjs';
import { forceUpdateCheck } from '../../update/checker.mjs';

/**
 * Handler for prefill-cards command
 *
 * Prefills kanban cards with template data for project planning.
 *
 * Usage:
 *   aiwg -prefill-cards
 *   aiwg --prefill-cards
 *   aiwg -prefill-cards --board <board-name>
 */
export const prefillCardsHandler: CommandHandler = {
  id: 'prefill-cards',
  name: 'Prefill Cards',
  description: 'Prefill kanban cards with template data',
  category: 'utility',
  aliases: ['-prefill-cards', '--prefill-cards'],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const frameworkRoot = await getFrameworkRoot();
    const runner = createScriptRunner(frameworkRoot);

    return runner.run('tools/cards/prefill-cards.mjs', ctx.args, {
      cwd: ctx.cwd,
    });
  },
};

/**
 * Handler for contribute-start command
 *
 * Starts a contribution workflow with issue tracking and branching.
 *
 * Usage:
 *   aiwg -contribute-start
 *   aiwg --contribute-start
 *   aiwg -contribute-start --issue <issue-number>
 */
export const contributeStartHandler: CommandHandler = {
  id: 'contribute-start',
  name: 'Start Contribution',
  description: 'Start a contribution workflow',
  category: 'utility',
  aliases: ['-contribute-start', '--contribute-start'],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const frameworkRoot = await getFrameworkRoot();
    const runner = createScriptRunner(frameworkRoot);

    return runner.run('tools/contrib/start-contribution.mjs', ctx.args, {
      cwd: ctx.cwd,
    });
  },
};

/**
 * Handler for validate-metadata command
 *
 * Validates metadata across framework components and artifacts.
 *
 * Usage:
 *   aiwg -validate-metadata
 *   aiwg --validate-metadata
 *   aiwg -validate-metadata --strict
 */
export const validateMetadataHandler: CommandHandler = {
  id: 'validate-metadata',
  name: 'Validate Metadata',
  description: 'Validate metadata across components',
  category: 'utility',
  aliases: ['-validate-metadata', '--validate-metadata'],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const frameworkRoot = await getFrameworkRoot();
    const runner = createScriptRunner(frameworkRoot);

    return runner.run('tools/cli/validate-metadata.mjs', ctx.args, {
      cwd: ctx.cwd,
    });
  },
};

/**
 * Handler for doctor command
 *
 * Runs health diagnostics on the AIWG installation and workspace.
 *
 * Usage:
 *   aiwg doctor
 *   aiwg -doctor
 *   aiwg --doctor
 *   aiwg doctor --verbose
 */
export const doctorHandler: CommandHandler = {
  id: 'doctor',
  name: 'Doctor',
  description: 'Run health diagnostics',
  category: 'maintenance',
  aliases: ['-doctor', '--doctor'],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const frameworkRoot = await getFrameworkRoot();
    const runner = createScriptRunner(frameworkRoot);

    return runner.run('tools/cli/doctor.mjs', ctx.args, {
      cwd: ctx.cwd,
    });
  },
};

/**
 * Handler for update command
 *
 * Checks for and optionally applies updates to AIWG.
 * - Stable channel: Checks npm registry
 * - Edge channel: Pulls from git remote
 *
 * Usage:
 *   aiwg -update
 *   aiwg --update
 */
export const updateHandler: CommandHandler = {
  id: 'update',
  name: 'Update',
  description: 'Check for updates and update AIWG',
  category: 'maintenance',
  aliases: ['-update', '--update'],

  async execute(_ctx: HandlerContext): Promise<HandlerResult> {
    try {
      await forceUpdateCheck();
      return { exitCode: 0 };
    } catch (error) {
      return {
        exitCode: 1,
        message: `Update check failed: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },
};

/**
 * All utility handlers
 */
export const utilityHandlers: CommandHandler[] = [
  prefillCardsHandler,
  contributeStartHandler,
  validateMetadataHandler,
  doctorHandler,
  updateHandler,
];
