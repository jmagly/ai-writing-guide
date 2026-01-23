/**
 * Hook Registry Tests
 *
 * Tests for hook registration, discovery, and filtering.
 *
 * @implements @.aiwg/requirements/use-cases/UC-004-extension-system.md
 * @source @src/cli/hooks/registry.ts
 * @issue #58
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HookRegistry } from '../../../../src/cli/hooks/registry.js';
import type { HookHandler, HookContext, HookResult } from '../../../../src/cli/hooks/types.js';

describe('HookRegistry', () => {
  let registry: HookRegistry;

  beforeEach(() => {
    registry = new HookRegistry();
  });

  describe('register', () => {
    it('should register a hook handler', () => {
      const handler: HookHandler = {
        id: 'test-hook',
        event: 'pre-command',
        priority: 100,
        async execute(ctx: HookContext): Promise<HookResult> {
          return { action: 'continue' };
        },
      };

      registry.register(handler);

      const handlers = registry.getHandlers('pre-command');
      expect(handlers).toHaveLength(1);
      expect(handlers[0].id).toBe('test-hook');
    });

    it('should register multiple hooks for same event', () => {
      const handler1: HookHandler = {
        id: 'hook-1',
        event: 'pre-command',
        priority: 100,
        async execute(ctx: HookContext): Promise<HookResult> {
          return { action: 'continue' };
        },
      };

      const handler2: HookHandler = {
        id: 'hook-2',
        event: 'pre-command',
        priority: 50,
        async execute(ctx: HookContext): Promise<HookResult> {
          return { action: 'continue' };
        },
      };

      registry.register(handler1);
      registry.register(handler2);

      const handlers = registry.getHandlers('pre-command');
      expect(handlers).toHaveLength(2);
    });

    it('should reject duplicate hook IDs', () => {
      const handler1: HookHandler = {
        id: 'duplicate',
        event: 'pre-command',
        priority: 100,
        async execute(ctx: HookContext): Promise<HookResult> {
          return { action: 'continue' };
        },
      };

      const handler2: HookHandler = {
        id: 'duplicate',
        event: 'post-command',
        priority: 50,
        async execute(ctx: HookContext): Promise<HookResult> {
          return { action: 'continue' };
        },
      };

      registry.register(handler1);

      expect(() => registry.register(handler2)).toThrow('Hook duplicate is already registered');
    });
  });

  describe('unregister', () => {
    it('should unregister a hook handler', () => {
      const handler: HookHandler = {
        id: 'test-hook',
        event: 'pre-command',
        priority: 100,
        async execute(ctx: HookContext): Promise<HookResult> {
          return { action: 'continue' };
        },
      };

      registry.register(handler);
      expect(registry.getHandlers('pre-command')).toHaveLength(1);

      registry.unregister('test-hook');
      expect(registry.getHandlers('pre-command')).toHaveLength(0);
    });

    it('should not error when unregistering non-existent hook', () => {
      expect(() => registry.unregister('non-existent')).not.toThrow();
    });
  });

  describe('getHandlers', () => {
    it('should return handlers sorted by priority (ascending)', () => {
      const handler1: HookHandler = {
        id: 'hook-1',
        event: 'pre-command',
        priority: 200,
        async execute(ctx: HookContext): Promise<HookResult> {
          return { action: 'continue' };
        },
      };

      const handler2: HookHandler = {
        id: 'hook-2',
        event: 'pre-command',
        priority: 50,
        async execute(ctx: HookContext): Promise<HookResult> {
          return { action: 'continue' };
        },
      };

      const handler3: HookHandler = {
        id: 'hook-3',
        event: 'pre-command',
        priority: 100,
        async execute(ctx: HookContext): Promise<HookResult> {
          return { action: 'continue' };
        },
      };

      registry.register(handler1);
      registry.register(handler2);
      registry.register(handler3);

      const handlers = registry.getHandlers('pre-command');
      expect(handlers).toHaveLength(3);
      expect(handlers[0].id).toBe('hook-2'); // Priority 50
      expect(handlers[1].id).toBe('hook-3'); // Priority 100
      expect(handlers[2].id).toBe('hook-1'); // Priority 200
    });

    it('should return empty array when no handlers for event', () => {
      const handlers = registry.getHandlers('pre-command');
      expect(handlers).toEqual([]);
    });

    it('should filter by command when specified', () => {
      const handler1: HookHandler = {
        id: 'filtered-hook',
        event: 'pre-command',
        priority: 100,
        filter: { commands: ['use'] },
        async execute(ctx: HookContext): Promise<HookResult> {
          return { action: 'continue' };
        },
      };

      const handler2: HookHandler = {
        id: 'unfiltered-hook',
        event: 'pre-command',
        priority: 100,
        async execute(ctx: HookContext): Promise<HookResult> {
          return { action: 'continue' };
        },
      };

      registry.register(handler1);
      registry.register(handler2);

      const handlersForUse = registry.getHandlers('pre-command', 'use');
      expect(handlersForUse).toHaveLength(2); // Both match

      const handlersForHelp = registry.getHandlers('pre-command', 'help');
      expect(handlersForHelp).toHaveLength(1); // Only unfiltered
      expect(handlersForHelp[0].id).toBe('unfiltered-hook');
    });

    it('should respect exclude filter', () => {
      const handler: HookHandler = {
        id: 'excluded-hook',
        event: 'pre-command',
        priority: 100,
        filter: { exclude: ['help', 'version'] },
        async execute(ctx: HookContext): Promise<HookResult> {
          return { action: 'continue' };
        },
      };

      registry.register(handler);

      const handlersForHelp = registry.getHandlers('pre-command', 'help');
      expect(handlersForHelp).toHaveLength(0);

      const handlersForUse = registry.getHandlers('pre-command', 'use');
      expect(handlersForUse).toHaveLength(1);
    });
  });

  describe('has', () => {
    it('should return true when hook is registered', () => {
      const handler: HookHandler = {
        id: 'test-hook',
        event: 'pre-command',
        priority: 100,
        async execute(ctx: HookContext): Promise<HookResult> {
          return { action: 'continue' };
        },
      };

      registry.register(handler);
      expect(registry.has('test-hook')).toBe(true);
    });

    it('should return false when hook is not registered', () => {
      expect(registry.has('non-existent')).toBe(false);
    });
  });

  describe('get', () => {
    it('should return handler by ID', () => {
      const handler: HookHandler = {
        id: 'test-hook',
        event: 'pre-command',
        priority: 100,
        async execute(ctx: HookContext): Promise<HookResult> {
          return { action: 'continue' };
        },
      };

      registry.register(handler);

      const retrieved = registry.get('test-hook');
      expect(retrieved).toBe(handler);
    });

    it('should return undefined for non-existent hook', () => {
      const retrieved = registry.get('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('clear', () => {
    it('should clear all registered hooks', () => {
      const handler1: HookHandler = {
        id: 'hook-1',
        event: 'pre-command',
        priority: 100,
        async execute(ctx: HookContext): Promise<HookResult> {
          return { action: 'continue' };
        },
      };

      const handler2: HookHandler = {
        id: 'hook-2',
        event: 'post-command',
        priority: 100,
        async execute(ctx: HookContext): Promise<HookResult> {
          return { action: 'continue' };
        },
      };

      registry.register(handler1);
      registry.register(handler2);

      expect(registry.getHandlers('pre-command')).toHaveLength(1);
      expect(registry.getHandlers('post-command')).toHaveLength(1);

      registry.clear();

      expect(registry.getHandlers('pre-command')).toHaveLength(0);
      expect(registry.getHandlers('post-command')).toHaveLength(0);
    });
  });

  describe('getAllHandlers', () => {
    it('should return all registered handlers', () => {
      const handler1: HookHandler = {
        id: 'hook-1',
        event: 'pre-command',
        priority: 100,
        async execute(ctx: HookContext): Promise<HookResult> {
          return { action: 'continue' };
        },
      };

      const handler2: HookHandler = {
        id: 'hook-2',
        event: 'post-command',
        priority: 100,
        async execute(ctx: HookContext): Promise<HookResult> {
          return { action: 'continue' };
        },
      };

      registry.register(handler1);
      registry.register(handler2);

      const allHandlers = registry.getAllHandlers();
      expect(allHandlers).toHaveLength(2);
      expect(allHandlers.map(h => h.id)).toContain('hook-1');
      expect(allHandlers.map(h => h.id)).toContain('hook-2');
    });
  });
});
