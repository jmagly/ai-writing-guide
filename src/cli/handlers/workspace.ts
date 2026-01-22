/**
 * Workspace Management Handlers
 *
 * Handlers for workspace health, migration, and rollback operations.
 * Delegates to existing CLI scripts in tools/cli/.
 *
 * @implements @.aiwg/architecture/decisions/ADR-001-unified-extension-system.md
 * @source @src/cli/index.mjs
 * @issue #33
 */

import { CommandHandler, HandlerContext, HandlerResult } from './types.js';
import { createScriptRunner } from './script-runner.js';
import { getFrameworkRoot } from '../../channel/manager.mjs';

/**
 * Handler for workspace status command
 *
 * Shows workspace health, installed frameworks, and migration status.
 *
 * Usage:
 *   aiwg -status
 *   aiwg --status
 *   aiwg -status --verbose
 *   aiwg -status --json
 */
export const statusHandler: CommandHandler = {
  id: 'status',
  name: 'Workspace Status',
  description: 'Show workspace health and installed frameworks',
  category: 'workspace',
  aliases: ['-status', '--status'],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const frameworkRoot = await getFrameworkRoot();
    const runner = createScriptRunner(frameworkRoot);

    return runner.run('tools/cli/workspace-status.mjs', ctx.args, {
      cwd: ctx.cwd,
    });
  },
};

/**
 * Handler for workspace migration command
 *
 * Migrates legacy .aiwg/ workspace structure to framework-scoped structure.
 * Provides interactive migration workflow with validation, backup, and reporting.
 *
 * Usage:
 *   aiwg -migrate-workspace
 *   aiwg --migrate-workspace
 *   aiwg -migrate-workspace --dry-run
 *   aiwg -migrate-workspace --no-backup
 *   aiwg -migrate-workspace --force
 *   aiwg -migrate-workspace --yes
 */
export const migrateWorkspaceHandler: CommandHandler = {
  id: 'migrate-workspace',
  name: 'Migrate Workspace',
  description: 'Migrate legacy .aiwg/ to framework-scoped structure',
  category: 'workspace',
  aliases: ['-migrate-workspace', '--migrate-workspace'],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const frameworkRoot = await getFrameworkRoot();
    const runner = createScriptRunner(frameworkRoot);

    return runner.run('tools/cli/workspace-migrate.mjs', ctx.args, {
      cwd: ctx.cwd,
    });
  },
};

/**
 * Handler for workspace rollback command
 *
 * Rolls back workspace migration from backup.
 *
 * Usage:
 *   aiwg -rollback-workspace
 *   aiwg --rollback-workspace
 *   aiwg -rollback-workspace --list
 *   aiwg -rollback-workspace --backup <backup-path>
 */
export const rollbackWorkspaceHandler: CommandHandler = {
  id: 'rollback-workspace',
  name: 'Rollback Workspace',
  description: 'Rollback workspace migration from backup',
  category: 'workspace',
  aliases: ['-rollback-workspace', '--rollback-workspace'],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const frameworkRoot = await getFrameworkRoot();
    const runner = createScriptRunner(frameworkRoot);

    return runner.run('tools/cli/workspace-rollback.mjs', ctx.args, {
      cwd: ctx.cwd,
    });
  },
};

/**
 * All workspace management handlers
 */
export const workspaceHandlers: CommandHandler[] = [
  statusHandler,
  migrateWorkspaceHandler,
  rollbackWorkspaceHandler,
];
