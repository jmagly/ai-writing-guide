/**
 * CLI Handler Index
 *
 * Aggregates all extracted command handlers for registry-based routing.
 *
 * @implements @.aiwg/architecture/decisions/ADR-001-unified-extension-system.md
 * @tests @test/unit/cli/handlers/index.test.ts
 * @issue #42
 */

// Re-export types
export * from './types.js';
export { createScriptRunner, DefaultScriptRunner } from './script-runner.js';

// Import all handlers
import { helpHandler } from './help.js';
import { versionHandler } from './version.js';
import { useHandler } from './use.js';
import {
  statusHandler,
  migrateWorkspaceHandler,
  rollbackWorkspaceHandler,
  workspaceHandlers,
} from './workspace.js';
import {
  prefillCardsHandler,
  contributeStartHandler,
  validateMetadataHandler,
  doctorHandler,
  updateHandler,
  utilityHandlers,
} from './utilities.js';
import {
  addAgentHandler,
  addCommandHandler,
  addSkillHandler,
  addTemplateHandler,
  scaffoldAddonHandler,
  scaffoldExtensionHandler,
  scaffoldFrameworkHandler,
  scaffoldingHandlers,
} from './scaffolding.js';
import {
  ralphHandler,
  ralphStatusHandler,
  ralphAbortHandler,
  ralphResumeHandler,
  ralphHandlers,
} from './ralph.js';
import {
  mcpHandler,
  catalogHandler,
  listHandler,
  removeHandler,
  newProjectHandler,
  installPluginHandler,
  uninstallPluginHandler,
  pluginStatusHandler,
  packagePluginHandler,
  packageAllPluginsHandler,
  subcommandHandlers,
} from './subcommands.js';
import { runtimeInfoHandler } from './runtime-info.js';

import type { CommandHandler } from './types.js';

// Re-export individual handlers
export {
  // Maintenance
  helpHandler,
  versionHandler,
  doctorHandler,
  updateHandler,

  // Framework management
  useHandler,
  listHandler,
  removeHandler,

  // Project
  newProjectHandler,

  // Workspace
  statusHandler,
  migrateWorkspaceHandler,
  rollbackWorkspaceHandler,

  // Subcommands
  mcpHandler,
  catalogHandler,
  runtimeInfoHandler,

  // Utilities
  prefillCardsHandler,
  contributeStartHandler,
  validateMetadataHandler,

  // Plugin
  installPluginHandler,
  uninstallPluginHandler,
  pluginStatusHandler,
  packagePluginHandler,
  packageAllPluginsHandler,

  // Scaffolding
  addAgentHandler,
  addCommandHandler,
  addSkillHandler,
  addTemplateHandler,
  scaffoldAddonHandler,
  scaffoldExtensionHandler,
  scaffoldFrameworkHandler,

  // Ralph
  ralphHandler,
  ralphStatusHandler,
  ralphAbortHandler,
  ralphResumeHandler,
};

// Re-export handler arrays
export {
  workspaceHandlers,
  utilityHandlers,
  scaffoldingHandlers,
  ralphHandlers,
  subcommandHandlers,
};

/**
 * All registered command handlers
 *
 * Used by the registry to build the command routing table.
 */
export const allHandlers: CommandHandler[] = [
  // Maintenance (shown first in help)
  helpHandler,
  versionHandler,
  doctorHandler,
  updateHandler,

  // Framework management
  useHandler,
  listHandler,
  removeHandler,

  // Project setup
  newProjectHandler,

  // Workspace management
  ...workspaceHandlers,

  // Subcommand handlers (MCP, catalog)
  mcpHandler,
  catalogHandler,
  runtimeInfoHandler,

  // Utilities
  prefillCardsHandler,
  contributeStartHandler,
  validateMetadataHandler,

  // Plugin packaging
  installPluginHandler,
  uninstallPluginHandler,
  pluginStatusHandler,
  packagePluginHandler,
  packageAllPluginsHandler,

  // Scaffolding
  ...scaffoldingHandlers,

  // Ralph loop
  ...ralphHandlers,
];

/**
 * Build alias map from all handlers
 *
 * Maps command aliases to canonical handler IDs.
 *
 * @returns Map of alias -> handler ID
 */
export function buildAliasMap(): Map<string, string> {
  const aliasMap = new Map<string, string>();

  for (const handler of allHandlers) {
    // Add canonical ID
    aliasMap.set(handler.id, handler.id);

    // Add all aliases
    for (const alias of handler.aliases) {
      aliasMap.set(alias, handler.id);
    }
  }

  return aliasMap;
}

/**
 * Build handler map for O(1) lookup
 *
 * @returns Map of handler ID -> handler
 */
export function buildHandlerMap(): Map<string, CommandHandler> {
  const handlerMap = new Map<string, CommandHandler>();

  for (const handler of allHandlers) {
    handlerMap.set(handler.id, handler);
  }

  return handlerMap;
}

/**
 * Resolve a command to its handler
 *
 * @param command - Raw command from CLI (may be alias)
 * @param aliasMap - Alias map from buildAliasMap()
 * @param handlerMap - Handler map from buildHandlerMap()
 * @returns Handler or undefined if not found
 */
export function resolveHandler(
  command: string,
  aliasMap: Map<string, string>,
  handlerMap: Map<string, CommandHandler>
): CommandHandler | undefined {
  const canonicalId = aliasMap.get(command);
  if (!canonicalId) return undefined;

  return handlerMap.get(canonicalId);
}

/**
 * Get handlers grouped by category
 *
 * Used for generating organized help text.
 *
 * @returns Map of category -> handlers
 */
export function getHandlersByCategory(): Map<string, CommandHandler[]> {
  const categoryMap = new Map<string, CommandHandler[]>();

  for (const handler of allHandlers) {
    const category = handler.category;
    const handlers = categoryMap.get(category) || [];
    handlers.push(handler);
    categoryMap.set(category, handlers);
  }

  return categoryMap;
}

/**
 * Get total handler count
 */
export function getHandlerCount(): number {
  return allHandlers.length;
}

/**
 * Get total alias count (including canonical IDs)
 */
export function getAliasCount(): number {
  return buildAliasMap().size;
}
