/**
 * Hook System Types
 *
 * Type definitions for the hook execution system. Hooks allow users to
 * intercept and modify CLI behavior at specific lifecycle points.
 *
 * @implements @.aiwg/requirements/use-cases/UC-004-extension-system.md
 * @architecture @src/extensions/types.ts
 * @tests @test/unit/cli/hooks/types.test.ts
 * @issue #58
 */

/**
 * Hook lifecycle events
 *
 * Matches the HookEvent type from the unified extension schema.
 */
export type HookEvent =
  | 'pre-command'   // Before any command executes
  | 'post-command'  // After any command completes
  | 'on-error'      // When a command fails
  | 'on-deploy';    // When frameworks are deployed

/**
 * Hook execution context
 *
 * Provides hooks with information about the current execution context.
 */
export interface HookContext {
  /** The lifecycle event that triggered this hook */
  event: HookEvent;

  /** The command being executed (e.g., 'use', 'new', 'help') */
  command: string;

  /** Command arguments */
  args: string[];

  /** Current working directory */
  cwd: string;

  /** Framework root path */
  frameworkRoot: string;

  /** Error object (only present for on-error events) */
  error?: Error;

  /** Additional context data passed from previous hooks or command */
  data?: Record<string, unknown>;
}

/**
 * Hook execution result
 *
 * Indicates what action the hook wants to take.
 */
export interface HookResult {
  /**
   * Action to take after hook execution
   *
   * - continue: Allow execution to proceed
   * - block: Stop execution (requires canBlock: true in metadata)
   * - modify: Modify execution context (requires canModify: true in metadata)
   */
  action: 'continue' | 'block' | 'modify';

  /** Message to display (optional) */
  message?: string;

  /** Modified data to pass to next hook or command (for modify action) */
  data?: Record<string, unknown>;

  /** Error that occurred during hook execution (optional) */
  error?: Error;
}

/**
 * Hook filter criteria
 *
 * Determines which commands this hook applies to.
 */
export interface HookFilter {
  /** Only run for these commands (if undefined, runs for all) */
  commands?: string[];

  /** Exclude these commands */
  exclude?: string[];
}

/**
 * Hook handler interface
 *
 * Defines a hook that can be registered with the hook system.
 */
export interface HookHandler {
  /** Unique hook identifier */
  id: string;

  /** Lifecycle event this hook responds to */
  event: HookEvent;

  /**
   * Execution priority (lower = earlier execution)
   *
   * @default 100
   */
  priority: number;

  /** Optional filter to limit which commands trigger this hook */
  filter?: HookFilter;

  /**
   * Execute the hook
   *
   * @param ctx - Hook execution context
   * @returns Hook result indicating next action
   */
  execute(ctx: HookContext): Promise<HookResult>;
}

/**
 * Hook execution result summary
 *
 * Aggregates results from all executed hooks.
 */
export interface HookExecutionResult {
  /** Whether execution was blocked by any hook */
  blocked: boolean;

  /** ID of the hook that blocked execution (if any) */
  blockingHook?: string;

  /** Message from blocking hook */
  message?: string;

  /** List of hook IDs that were executed */
  executed: string[];

  /** Errors that occurred during hook execution */
  errors: Array<{
    hook: string;
    error: Error;
  }>;

  /** Accumulated modifications from all hooks */
  modifications: Record<string, unknown>;
}
