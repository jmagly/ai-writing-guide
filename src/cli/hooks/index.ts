/**
 * Hook System
 *
 * Exports the complete hook system: types, registry, and executor.
 * Provides lifecycle hooks for CLI command execution.
 *
 * @implements @.aiwg/requirements/use-cases/UC-004-extension-system.md
 * @architecture @src/extensions/types.ts
 * @issue #58
 */

// Types
export type {
  HookEvent,
  HookContext,
  HookResult,
  HookFilter,
  HookHandler,
  HookExecutionResult,
} from './types.js';

// Registry
export { HookRegistry } from './registry.js';

// Executor
export { HookExecutor } from './executor.js';
