/**
 * Hook Executor
 *
 * Executes hook handlers in priority order, handles blocking, modification,
 * and error propagation. Provides the runtime for the hook system.
 *
 * @implements @.aiwg/requirements/use-cases/UC-004-extension-system.md
 * @architecture @src/extensions/types.ts
 * @tests @test/unit/cli/hooks/executor.test.ts
 * @issue #58
 */

import type { HookRegistry } from './registry.js';
import type { HookEvent, HookContext, HookExecutionResult } from './types.js';

/**
 * Hook Executor
 *
 * Executes registered hooks for lifecycle events. Handles priority ordering,
 * blocking, modification accumulation, and error handling.
 */
export class HookExecutor {
  constructor(private registry: HookRegistry) {}

  /**
   * Execute all hooks for a lifecycle event
   *
   * Executes hooks in priority order (ascending). Stops execution if any
   * hook blocks. Accumulates modifications from all executed hooks.
   *
   * @param event - Lifecycle event
   * @param ctx - Hook execution context
   * @returns Aggregated execution result
   */
  async execute(event: HookEvent, ctx: HookContext): Promise<HookExecutionResult> {
    const result: HookExecutionResult = {
      blocked: false,
      executed: [],
      errors: [],
      modifications: {},
    };

    // Get handlers for this event and command
    const handlers = this.registry.getHandlers(event, ctx.command);

    // Execute handlers in priority order
    for (const handler of handlers) {
      try {
        // Execute handler
        const hookResult = await handler.execute(ctx);

        // Track execution
        result.executed.push(handler.id);

        // Handle result action
        switch (hookResult.action) {
          case 'block':
            result.blocked = true;
            result.blockingHook = handler.id;
            result.message = hookResult.message;
            return result; // Stop execution

          case 'modify':
            if (hookResult.data) {
              // Accumulate modifications
              Object.assign(result.modifications, hookResult.data);

              // Update context with modifications for next hook
              ctx.data = { ...ctx.data, ...hookResult.data };
            }
            break;

          case 'continue':
            // Continue to next hook
            break;
        }
      } catch (error) {
        // Record error but continue execution
        result.errors.push({
          hook: handler.id,
          error: error instanceof Error ? error : new Error(String(error)),
        });

        // Still track as executed even if errored
        if (!result.executed.includes(handler.id)) {
          result.executed.push(handler.id);
        }
      }
    }

    return result;
  }

  /**
   * Execute hooks for a specific command
   *
   * Convenience method that extracts command from context.
   *
   * @param event - Lifecycle event
   * @param ctx - Hook execution context
   * @returns Aggregated execution result
   */
  async executeForCommand(event: HookEvent, ctx: HookContext): Promise<HookExecutionResult> {
    return this.execute(event, ctx);
  }
}
