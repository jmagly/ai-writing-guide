/**
 * Hook Registry
 *
 * Manages registration and discovery of hook handlers. Organizes hooks
 * by lifecycle event and supports priority-based ordering.
 *
 * @implements @.aiwg/requirements/use-cases/UC-004-extension-system.md
 * @architecture @src/extensions/types.ts
 * @tests @test/unit/cli/hooks/registry.test.ts
 * @issue #58
 */

import type { HookHandler, HookEvent } from './types.js';

/**
 * Hook Registry
 *
 * Central registry for all hook handlers. Provides O(1) lookup by event
 * and maintains priority ordering for execution.
 */
export class HookRegistry {
  /** Map of hook ID to handler */
  private handlers: Map<string, HookHandler> = new Map();

  /** Map of event to sorted list of handler IDs */
  private eventMap: Map<HookEvent, string[]> = new Map();

  /**
   * Register a hook handler
   *
   * @param handler - Hook handler to register
   * @throws Error if hook ID is already registered
   */
  register(handler: HookHandler): void {
    if (this.handlers.has(handler.id)) {
      throw new Error(`Hook ${handler.id} is already registered`);
    }

    // Store handler
    this.handlers.set(handler.id, handler);

    // Add to event map
    const eventHandlers = this.eventMap.get(handler.event) || [];
    eventHandlers.push(handler.id);

    // Sort by priority (ascending)
    eventHandlers.sort((aId, bId) => {
      const a = this.handlers.get(aId)!;
      const b = this.handlers.get(bId)!;
      return a.priority - b.priority;
    });

    this.eventMap.set(handler.event, eventHandlers);
  }

  /**
   * Unregister a hook handler
   *
   * @param id - Hook ID to unregister
   */
  unregister(id: string): void {
    const handler = this.handlers.get(id);
    if (!handler) {
      return;
    }

    // Remove from handlers map
    this.handlers.delete(id);

    // Remove from event map
    const eventHandlers = this.eventMap.get(handler.event);
    if (eventHandlers) {
      const filtered = eventHandlers.filter((hId) => hId !== id);
      if (filtered.length === 0) {
        this.eventMap.delete(handler.event);
      } else {
        this.eventMap.set(handler.event, filtered);
      }
    }
  }

  /**
   * Get handlers for a specific event
   *
   * Returns handlers in priority order (ascending). Optionally filters
   * by command name.
   *
   * @param event - Lifecycle event
   * @param command - Optional command name for filtering
   * @returns Array of matching handlers in priority order
   */
  getHandlers(event: HookEvent, command?: string): HookHandler[] {
    const handlerIds = this.eventMap.get(event) || [];

    return handlerIds
      .map((id) => this.handlers.get(id)!)
      .filter((handler) => {
        // If no command specified, return all handlers
        if (!command || !handler.filter) {
          return true;
        }

        const filter = handler.filter;

        // Check exclude list first
        if (filter.exclude && filter.exclude.includes(command)) {
          return false;
        }

        // If commands list is specified, command must be in it
        if (filter.commands && !filter.commands.includes(command)) {
          return false;
        }

        return true;
      });
  }

  /**
   * Check if a hook is registered
   *
   * @param id - Hook ID
   * @returns True if hook is registered
   */
  has(id: string): boolean {
    return this.handlers.has(id);
  }

  /**
   * Get a specific hook handler
   *
   * @param id - Hook ID
   * @returns Handler or undefined if not found
   */
  get(id: string): HookHandler | undefined {
    return this.handlers.get(id);
  }

  /**
   * Clear all registered hooks
   */
  clear(): void {
    this.handlers.clear();
    this.eventMap.clear();
  }

  /**
   * Get all registered handlers
   *
   * @returns Array of all handlers
   */
  getAllHandlers(): HookHandler[] {
    return Array.from(this.handlers.values());
  }

  /**
   * Get count of registered hooks
   *
   * @returns Number of registered hooks
   */
  get size(): number {
    return this.handlers.size;
  }
}
