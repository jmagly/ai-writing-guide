/**
 * Registry-Based CLI Router
 *
 * New CLI entry point using extension registry for command routing.
 * Replaces the monolithic switch/case with O(1) lookup via registry.
 *
 * @implements @.aiwg/architecture/decisions/ADR-001-unified-extension-system.md
 * @source @src/cli/router.ts
 * @tests @test/unit/cli/router.test.ts
 * @issue #48
 */

import { getFrameworkRoot } from '../channel/manager.mjs';
import { allHandlers, buildAliasMap, buildHandlerMap } from './handlers/index.mjs';

// Cached maps for O(1) lookup
let aliasMap = null;
let handlerMap = null;
let initialized = false;

/**
 * Initialize the router
 */
export async function initRouter() {
  if (!initialized) {
    aliasMap = buildAliasMap();
    handlerMap = buildHandlerMap();
    initialized = true;
  }
  return { aliasMap, handlerMap };
}

/**
 * Reset router state (for testing)
 */
export function resetRouter() {
  aliasMap = null;
  handlerMap = null;
  initialized = false;
}

/**
 * Build handler context
 */
async function buildContext(args, rawArgs, options = {}) {
  const frameworkRoot = await getFrameworkRoot();
  return {
    args,
    rawArgs,
    cwd: options.cwd || process.cwd(),
    frameworkRoot,
    dryRun: args.includes('--dry-run'),
  };
}

/**
 * Main CLI entry point - registry-based routing
 *
 * @param {string[]} args - Command line arguments
 * @param {object} [options] - Execution options
 * @param {string} [options.cwd] - Working directory
 */
export async function run(args, options = {}) {
  const { aliasMap: aliases, handlerMap: handlers } = await initRouter();
  const [rawCommand, ...commandArgs] = args;

  // No command - show help
  if (!rawCommand) {
    const helpHandler = handlers.get('help');
    if (helpHandler) {
      const ctx = await buildContext([], args, options);
      await helpHandler.execute(ctx);
    }
    return;
  }

  // Resolve command (handles aliases)
  const commandId = aliases.get(rawCommand);

  if (!commandId) {
    console.error(`Unknown command: ${rawCommand}`);
    console.log('Run `aiwg help` for usage information.');
    process.exit(1);
  }

  // Get handler
  const handler = handlers.get(commandId);

  if (!handler) {
    console.error(`No handler found for command: ${commandId}`);
    process.exit(1);
  }

  // Build context and execute
  const ctx = await buildContext(commandArgs, args, options);
  const result = await handler.execute(ctx);

  if (result.exitCode !== 0) {
    process.exit(result.exitCode);
  }
}
