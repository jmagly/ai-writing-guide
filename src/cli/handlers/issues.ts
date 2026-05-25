/**
 * Issue command handler.
 *
 * Routes `aiwg issue ...` to the local issue CLI. External tracker operations
 * remain governed by `.aiwg/aiwg.config` `remotes.issue_tracker`.
 *
 * @issue #1462
 */

import type { CommandHandler, HandlerContext, HandlerResult } from './types.js';
import { handlerResultFromError } from '../errors.js';

export const issueHandler: CommandHandler = {
  id: 'issue',
  name: 'Issue',
  description: 'Local issue storage commands under .aiwg/issues/',
  category: 'project',
  aliases: ['issues'],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    try {
      const { main } = await import('../../issues/cli.js');
      await main(ctx.args, ctx.cwd);
      return { exitCode: 0 };
    } catch (error) {
      const result = handlerResultFromError(error);
      return { ...result, message: `Issue command failed: ${result.message}` };
    }
  },
};

export const issueAuditHandler: CommandHandler = {
  id: 'issue-audit',
  name: 'Issue Audit',
  description: 'Audit local issues under .aiwg/issues/ when --provider local is supplied',
  category: 'project',
  aliases: ['audit-issues'],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    try {
      const { auditLocalIssuesCli } = await import('../../issues/workflows.js');
      await auditLocalIssuesCli(ctx.args, ctx.cwd);
      return { exitCode: 0 };
    } catch (error) {
      const result = handlerResultFromError(error);
      return { ...result, message: `Issue audit failed: ${result.message}` };
    }
  },
};

export const addressIssuesHandler: CommandHandler = {
  id: 'address-issues',
  name: 'Address Issues',
  description: 'Prepare local issue slices for address-issues loops when --provider local is supplied',
  category: 'project',
  aliases: ['address-issue'],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    try {
      const { addressLocalIssuesCli } = await import('../../issues/workflows.js');
      await addressLocalIssuesCli(ctx.args, ctx.cwd);
      return { exitCode: 0 };
    } catch (error) {
      const result = handlerResultFromError(error);
      return { ...result, message: `Address issues failed: ${result.message}` };
    }
  },
};

