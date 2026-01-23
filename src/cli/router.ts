/**
 * CLI Router - Registry-Based Command Dispatch with Hook Support
 *
 * Main CLI entry point using the extension registry for command routing.
 * Replaces the monolithic switch/case with O(1) handler lookup.
 * Integrates hook system for lifecycle events.
 *
 * @implements @.aiwg/requirements/use-cases/UC-004-extension-system.md
 * @architecture @.aiwg/architecture/decisions/ADR-001-unified-extension-system.md
 * @tests @test/unit/cli/router.test.ts
 * @issue #33
 * @issue #58
 */

import { loadRegistry, type LoadedRegistry } from '../extensions/loader.js';
import { getFrameworkRoot } from '../channel/manager.mjs';
import type { HandlerContext } from './handlers/types.js';
import { HookRegistry, HookExecutor } from './hooks/index.js';
import type { HookContext } from './hooks/index.js';

// Cached loaded registry
let cachedRegistry: LoadedRegistry | null = null;

// Global hook registry and executor
const hookRegistry = new HookRegistry();
const hookExecutor = new HookExecutor(hookRegistry);

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
 * Get the global hook registry
 *
 * Allows external code to register hooks.
 *
 * @returns Global hook registry
 */
export function getHookRegistry(): HookRegistry {
  return hookRegistry;
}

/**
 * Main CLI entry point - registry-based routing with hooks
 *
 * Routes commands to handlers via the extension registry. Handles alias
 * resolution, unknown commands, and help display. Executes hooks at
 * appropriate lifecycle points.
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

  // Build context for handler and hooks
  const ctx = await buildContext(commandArgs, args, options);

  // Build hook context
  const hookCtx: HookContext = {
    event: 'pre-command',
    command: commandId,
    args: commandArgs,
    cwd: ctx.cwd,
    frameworkRoot: ctx.frameworkRoot,
  };

  try {
    // Execute pre-command hooks
    const preResult = await hookExecutor.execute('pre-command', hookCtx);

    // Check if execution was blocked
    if (preResult.blocked) {
      console.error(preResult.message || `Command blocked by hook: ${preResult.blockingHook}`);
      process.exit(1);
    }

    // Report hook errors (but don't block execution)
    if (preResult.errors.length > 0) {
      for (const { hook, error } of preResult.errors) {
        console.error(`Warning: Hook ${hook} failed: ${error.message}`);
      }
    }

    // Apply modifications to context if any
    if (Object.keys(preResult.modifications).length > 0) {
      // Hooks can modify args, but we keep the handler context simple
      // Modifications are available in hookCtx.data for post-command hooks
      hookCtx.data = preResult.modifications;
    }

    // Execute handler
    const result = await handler.execute(ctx);

    // Execute post-command hooks
    const postHookCtx: HookContext = {
      event: 'post-command',
      command: commandId,
      args: commandArgs,
      cwd: ctx.cwd,
      frameworkRoot: ctx.frameworkRoot,
      data: {
        ...hookCtx.data,
        exitCode: result.exitCode,
        message: result.message,
      },
    };

    const postResult = await hookExecutor.execute('post-command', postHookCtx);

    // Report post-command hook errors
    if (postResult.errors.length > 0) {
      for (const { hook, error } of postResult.errors) {
        console.error(`Warning: Post-command hook ${hook} failed: ${error.message}`);
      }
    }

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
  } catch (error) {
    // Execute on-error hooks
    const errorHookCtx: HookContext = {
      event: 'on-error',
      command: commandId,
      args: commandArgs,
      cwd: ctx.cwd,
      frameworkRoot: ctx.frameworkRoot,
      error: error instanceof Error ? error : new Error(String(error)),
    };

    await hookExecutor.execute('on-error', errorHookCtx);

    // Re-throw error
    throw error;
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
