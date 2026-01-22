/**
 * CLI Router - Registry-Based Command Dispatch
 *
 * Main CLI entry point using the extension registry for command routing.
 * Replaces the monolithic switch/case with O(1) handler lookup.
 *
 * @implements @.aiwg/requirements/use-cases/UC-004-extension-system.md
 * @architecture @.aiwg/architecture/decisions/ADR-001-unified-extension-system.md
 * @tests @test/unit/cli/router.test.ts
 * @issue #33
 */

import { loadRegistry, type LoadedRegistry } from '../extensions/loader.js';
import { getFrameworkRoot } from '../channel/manager.mjs';
import type { HandlerContext, HandlerResult } from './handlers/types.js';

// Cached loaded registry
let cachedRegistry: LoadedRegistry | null = null;

/**
 * Initialize the CLI router
 *
 * Loads the extension registry with capability indexing and caches it
 * for subsequent calls.
 *
 * @returns Loaded registry with handlers
 */
export async function initRouter(): Promise<LoadedRegistry> {
  if (!cachedRegistry) {
    cachedRegistry = await loadRegistry({ indexCapabilities: true });
  }
  return cachedRegistry;
}

/**
 * Main CLI entry point - registry-based routing
 *
 * Routes commands to handlers via the extension registry. Handles alias
 * resolution, unknown commands, and help display.
 *
 * @param args - Command line arguments
 * @param options - Execution options
 *
 * @example
 * ```typescript
 * // Route 'use' command
 * await run(['use', 'sdlc']);
 *
 * // Handle alias
 * await run(['--help']);
 *
 * // Show help when no args
 * await run([]);
 * ```
 */
export async function run(args: string[], options: { cwd?: string } = {}): Promise<void> {
  const registry = await initRouter();
  const [rawCommand, ...commandArgs] = args;

  // No command - show help
  if (!rawCommand) {
    const helpHandler = registry.handlerMap.get('help');
    if (helpHandler) {
      const ctx = await buildContext([], args, options);
      await helpHandler.execute(ctx);
    }
    return;
  }

  // Resolve command (handles aliases)
  const commandId = registry.registry.resolveCommand(rawCommand);

  if (!commandId) {
    console.error(`Unknown command: ${rawCommand}`);
    console.log('Run `aiwg help` for usage information.');
    process.exit(1);
  }

  // Get handler
  const handler = registry.handlerMap.get(commandId);

  if (!handler) {
    console.error(`No handler found for command: ${commandId}`);
    process.exit(1);
  }

  // Build context and execute
  const ctx = await buildContext(commandArgs, args, options);
  const result = await handler.execute(ctx);

  // Output message if present
  if (result.message) {
    if (result.exitCode !== 0) {
      console.error(result.message);
    } else {
      console.log(result.message);
    }
  }

  if (result.exitCode !== 0) {
    process.exit(result.exitCode);
  }
}

/**
 * Build handler context
 *
 * Constructs the context object passed to command handlers, including
 * command arguments, working directory, and framework root path.
 *
 * @param args - Command arguments (after command name)
 * @param rawArgs - Raw arguments including command name
 * @param options - Execution options
 * @returns Handler context
 */
async function buildContext(
  args: string[],
  rawArgs: string[],
  options: { cwd?: string }
): Promise<HandlerContext> {
  const frameworkRoot = await getFrameworkRoot();
  return {
    args,
    rawArgs,
    cwd: options.cwd || process.cwd(),
    frameworkRoot,
    dryRun: args.includes('--dry-run'),
  };
}

// Export for testing
export { cachedRegistry };
