/**
 * Hook Executor Tests
 *
 * Tests for hook execution engine including sequential execution,
 * blocking, modification, and error handling.
 *
 * @implements @.aiwg/requirements/use-cases/UC-004-extension-system.md
 * @source @src/cli/hooks/executor.ts
 * @issue #58
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HookExecutor } from '../../../../src/cli/hooks/executor.js';
import { HookRegistry } from '../../../../src/cli/hooks/registry.js';
import type { HookHandler, HookContext, HookResult } from '../../../../src/cli/hooks/types.js';

describe('HookExecutor', () => {
  let registry: HookRegistry;
  let executor: HookExecutor;

  beforeEach(() => {
    registry = new HookRegistry();
    executor = new HookExecutor(registry);
  });

  describe('execute', () => {
    it('should execute all matching hooks in priority order', async () => {
      const executionOrder: string[] = [];

      const handler1: HookHandler = {
        id: 'hook-1',
        event: 'pre-command',
        priority: 200,
        async execute(ctx: HookContext): Promise<HookResult> {
          executionOrder.push('hook-1');
          return { action: 'continue' };
        },
      };

      const handler2: HookHandler = {
        id: 'hook-2',
        event: 'pre-command',
        priority: 50,
        async execute(ctx: HookContext): Promise<HookResult> {
          executionOrder.push('hook-2');
          return { action: 'continue' };
        },
      };

      const handler3: HookHandler = {
        id: 'hook-3',
        event: 'pre-command',
        priority: 100,
        async execute(ctx: HookContext): Promise<HookResult> {
          executionOrder.push('hook-3');
          return { action: 'continue' };
        },
      };

      registry.register(handler1);
      registry.register(handler2);
      registry.register(handler3);

      const ctx: HookContext = {
        event: 'pre-command',
        command: 'use',
        args: ['sdlc'],
        cwd: '/test',
        frameworkRoot: '/framework',
      };

      const result = await executor.execute('pre-command', ctx);

      expect(result.blocked).toBe(false);
      expect(executionOrder).toEqual(['hook-2', 'hook-3', 'hook-1']);
    });

    it('should stop execution when hook blocks', async () => {
      const executionOrder: string[] = [];

      const handler1: HookHandler = {
        id: 'hook-1',
        event: 'pre-command',
        priority: 50,
        async execute(ctx: HookContext): Promise<HookResult> {
          executionOrder.push('hook-1');
          return { action: 'continue' };
        },
      };

      const handler2: HookHandler = {
        id: 'hook-2',
        event: 'pre-command',
        priority: 100,
        async execute(ctx: HookContext): Promise<HookResult> {
          executionOrder.push('hook-2');
          return { action: 'block', message: 'Blocked by hook-2' };
        },
      };

      const handler3: HookHandler = {
        id: 'hook-3',
        event: 'pre-command',
        priority: 200,
        async execute(ctx: HookContext): Promise<HookResult> {
          executionOrder.push('hook-3');
          return { action: 'continue' };
        },
      };

      registry.register(handler1);
      registry.register(handler2);
      registry.register(handler3);

      const ctx: HookContext = {
        event: 'pre-command',
        command: 'use',
        args: ['sdlc'],
        cwd: '/test',
        frameworkRoot: '/framework',
      };

      const result = await executor.execute('pre-command', ctx);

      expect(result.blocked).toBe(true);
      expect(result.blockingHook).toBe('hook-2');
      expect(result.message).toBe('Blocked by hook-2');
      expect(executionOrder).toEqual(['hook-1', 'hook-2']); // hook-3 not executed
    });

    it('should accumulate modifications from hooks', async () => {
      const handler1: HookHandler = {
        id: 'hook-1',
        event: 'pre-command',
        priority: 50,
        async execute(ctx: HookContext): Promise<HookResult> {
          return {
            action: 'modify',
            data: { modified: true, hook1: 'value1' },
          };
        },
      };

      const handler2: HookHandler = {
        id: 'hook-2',
        event: 'pre-command',
        priority: 100,
        async execute(ctx: HookContext): Promise<HookResult> {
          return {
            action: 'modify',
            data: { hook2: 'value2' },
          };
        },
      };

      registry.register(handler1);
      registry.register(handler2);

      const ctx: HookContext = {
        event: 'pre-command',
        command: 'use',
        args: ['sdlc'],
        cwd: '/test',
        frameworkRoot: '/framework',
      };

      const result = await executor.execute('pre-command', ctx);

      expect(result.blocked).toBe(false);
      expect(result.modifications).toEqual({
        modified: true,
        hook1: 'value1',
        hook2: 'value2',
      });
    });

    it('should handle hook errors gracefully', async () => {
      const handler1: HookHandler = {
        id: 'hook-1',
        event: 'pre-command',
        priority: 50,
        async execute(ctx: HookContext): Promise<HookResult> {
          throw new Error('Hook error');
        },
      };

      const handler2: HookHandler = {
        id: 'hook-2',
        event: 'pre-command',
        priority: 100,
        async execute(ctx: HookContext): Promise<HookResult> {
          return { action: 'continue' };
        },
      };

      registry.register(handler1);
      registry.register(handler2);

      const ctx: HookContext = {
        event: 'pre-command',
        command: 'use',
        args: ['sdlc'],
        cwd: '/test',
        frameworkRoot: '/framework',
      };

      const result = await executor.execute('pre-command', ctx);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].hook).toBe('hook-1');
      expect(result.errors[0].error.message).toBe('Hook error');
      // Should continue to next hook despite error
    });

    it('should return empty result when no hooks for event', async () => {
      const ctx: HookContext = {
        event: 'pre-command',
        command: 'use',
        args: ['sdlc'],
        cwd: '/test',
        frameworkRoot: '/framework',
      };

      const result = await executor.execute('pre-command', ctx);

      expect(result.blocked).toBe(false);
      expect(result.executed).toEqual([]);
      expect(result.errors).toEqual([]);
      expect(result.modifications).toEqual({});
    });

    it('should filter hooks by command', async () => {
      const executionOrder: string[] = [];

      const handler1: HookHandler = {
        id: 'filtered-hook',
        event: 'pre-command',
        priority: 50,
        filter: { commands: ['use'] },
        async execute(ctx: HookContext): Promise<HookResult> {
          executionOrder.push('filtered-hook');
          return { action: 'continue' };
        },
      };

      const handler2: HookHandler = {
        id: 'unfiltered-hook',
        event: 'pre-command',
        priority: 100,
        async execute(ctx: HookContext): Promise<HookResult> {
          executionOrder.push('unfiltered-hook');
          return { action: 'continue' };
        },
      };

      registry.register(handler1);
      registry.register(handler2);

      const ctx: HookContext = {
        event: 'pre-command',
        command: 'help',
        args: [],
        cwd: '/test',
        frameworkRoot: '/framework',
      };

      const result = await executor.execute('pre-command', ctx);

      expect(result.executed).toEqual(['unfiltered-hook']);
      expect(executionOrder).toEqual(['unfiltered-hook']);
    });

    it('should track executed hooks', async () => {
      const handler1: HookHandler = {
        id: 'hook-1',
        event: 'pre-command',
        priority: 50,
        async execute(ctx: HookContext): Promise<HookResult> {
          return { action: 'continue' };
        },
      };

      const handler2: HookHandler = {
        id: 'hook-2',
        event: 'pre-command',
        priority: 100,
        async execute(ctx: HookContext): Promise<HookResult> {
          return { action: 'continue' };
        },
      };

      registry.register(handler1);
      registry.register(handler2);

      const ctx: HookContext = {
        event: 'pre-command',
        command: 'use',
        args: ['sdlc'],
        cwd: '/test',
        frameworkRoot: '/framework',
      };

      const result = await executor.execute('pre-command', ctx);

      expect(result.executed).toEqual(['hook-1', 'hook-2']);
    });
  });

  describe('executeWithContext', () => {
    it('should execute hooks with command from context', async () => {
      const executionOrder: string[] = [];

      const handler: HookHandler = {
        id: 'test-hook',
        event: 'pre-command',
        priority: 100,
        async execute(ctx: HookContext): Promise<HookResult> {
          executionOrder.push(ctx.command);
          return { action: 'continue' };
        },
      };

      registry.register(handler);

      const ctx: HookContext = {
        event: 'pre-command',
        command: 'use',
        args: ['sdlc'],
        cwd: '/test',
        frameworkRoot: '/framework',
      };

      await executor.execute('pre-command', ctx);

      expect(executionOrder).toEqual(['use']);
    });
  });
});
