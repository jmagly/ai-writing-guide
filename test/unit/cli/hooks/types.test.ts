/**
 * Hook Types Tests
 *
 * Tests for hook-specific type definitions and interfaces.
 *
 * @implements @.aiwg/requirements/use-cases/UC-004-extension-system.md
 * @source @src/cli/hooks/types.ts
 * @issue #58
 */

import { describe, it, expect } from 'vitest';
import type {
  HookEvent,
  HookContext,
  HookResult,
  HookHandler,
  HookFilter,
} from '../../../../src/cli/hooks/types.js';

describe('Hook Types', () => {
  describe('HookEvent', () => {
    it('should support pre-command lifecycle event', () => {
      const event: HookEvent = 'pre-command';
      expect(event).toBe('pre-command');
    });

    it('should support post-command lifecycle event', () => {
      const event: HookEvent = 'post-command';
      expect(event).toBe('post-command');
    });

    it('should support on-error lifecycle event', () => {
      const event: HookEvent = 'on-error';
      expect(event).toBe('on-error');
    });

    it('should support on-deploy lifecycle event', () => {
      const event: HookEvent = 'on-deploy';
      expect(event).toBe('on-deploy');
    });
  });

  describe('HookContext', () => {
    it('should have required fields', () => {
      const ctx: HookContext = {
        event: 'pre-command',
        command: 'use',
        args: ['sdlc'],
        cwd: '/test/path',
        frameworkRoot: '/framework/root',
      };

      expect(ctx.event).toBe('pre-command');
      expect(ctx.command).toBe('use');
      expect(ctx.args).toEqual(['sdlc']);
      expect(ctx.cwd).toBe('/test/path');
      expect(ctx.frameworkRoot).toBe('/framework/root');
    });

    it('should support optional error field', () => {
      const error = new Error('Test error');
      const ctx: HookContext = {
        event: 'on-error',
        command: 'use',
        args: ['sdlc'],
        cwd: '/test/path',
        frameworkRoot: '/framework/root',
        error,
      };

      expect(ctx.error).toBe(error);
    });

    it('should support optional data field', () => {
      const ctx: HookContext = {
        event: 'post-command',
        command: 'use',
        args: ['sdlc'],
        cwd: '/test/path',
        frameworkRoot: '/framework/root',
        data: { result: 'success' },
      };

      expect(ctx.data).toEqual({ result: 'success' });
    });
  });

  describe('HookResult', () => {
    it('should support continue action', () => {
      const result: HookResult = {
        action: 'continue',
      };

      expect(result.action).toBe('continue');
    });

    it('should support block action with message', () => {
      const result: HookResult = {
        action: 'block',
        message: 'Hook blocked execution',
      };

      expect(result.action).toBe('block');
      expect(result.message).toBe('Hook blocked execution');
    });

    it('should support modify action with data', () => {
      const result: HookResult = {
        action: 'modify',
        data: { modifiedArgs: ['new-arg'] },
      };

      expect(result.action).toBe('modify');
      expect(result.data).toEqual({ modifiedArgs: ['new-arg'] });
    });

    it('should support error field', () => {
      const error = new Error('Hook error');
      const result: HookResult = {
        action: 'continue',
        error,
      };

      expect(result.error).toBe(error);
    });
  });

  describe('HookHandler', () => {
    it('should define handler interface', async () => {
      const handler: HookHandler = {
        id: 'test-hook',
        event: 'pre-command',
        priority: 100,
        async execute(ctx: HookContext): Promise<HookResult> {
          return { action: 'continue' };
        },
      };

      expect(handler.id).toBe('test-hook');
      expect(handler.event).toBe('pre-command');
      expect(handler.priority).toBe(100);

      const result = await handler.execute({
        event: 'pre-command',
        command: 'test',
        args: [],
        cwd: '/test',
        frameworkRoot: '/framework',
      });

      expect(result.action).toBe('continue');
    });

    it('should support optional filter', async () => {
      const filter: HookFilter = {
        commands: ['use', 'new'],
      };

      const handler: HookHandler = {
        id: 'filtered-hook',
        event: 'pre-command',
        priority: 50,
        filter,
        async execute(ctx: HookContext): Promise<HookResult> {
          return { action: 'continue' };
        },
      };

      expect(handler.filter).toBe(filter);
      expect(handler.filter?.commands).toEqual(['use', 'new']);
    });
  });

  describe('HookFilter', () => {
    it('should support command filtering', () => {
      const filter: HookFilter = {
        commands: ['use', 'new', 'deploy'],
      };

      expect(filter.commands).toEqual(['use', 'new', 'deploy']);
    });

    it('should support exclude filtering', () => {
      const filter: HookFilter = {
        exclude: ['help', 'version'],
      };

      expect(filter.exclude).toEqual(['help', 'version']);
    });

    it('should support both include and exclude', () => {
      const filter: HookFilter = {
        commands: ['use', 'new'],
        exclude: ['help'],
      };

      expect(filter.commands).toEqual(['use', 'new']);
      expect(filter.exclude).toEqual(['help']);
    });
  });
});
