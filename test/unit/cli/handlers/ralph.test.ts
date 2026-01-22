/**
 * Tests for Ralph Command Handlers
 *
 * Unit tests for Ralph loop CLI command handlers that delegate to Ralph scripts.
 *
 * @source @src/cli/handlers/ralph.ts
 * @implements @.aiwg/architecture/decisions/ADR-001-unified-extension-system.md
 * @issue #33
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommandHandler, HandlerContext, HandlerResult } from '../../../../src/cli/handlers/types.js';
import { ScriptRunner } from '../../../../src/cli/handlers/types.js';

// Mock dependencies
vi.mock('../../../../src/cli/handlers/script-runner.js', () => ({
  createScriptRunner: vi.fn(),
}));

vi.mock('../../../../src/channel/manager.mjs', () => ({
  getFrameworkRoot: vi.fn(() => '/mock/framework/root'),
}));

describe('Ralph Command Handlers', () => {
  let mockRunner: ScriptRunner;
  let mockContext: HandlerContext;

  beforeEach(async () => {
    // Mock script runner
    mockRunner = {
      run: vi.fn(async () => ({ exitCode: 0 })),
    };

    // Mock handler context
    mockContext = {
      args: [],
      rawArgs: [],
      cwd: '/mock/project',
      frameworkRoot: '/mock/framework/root',
    };

    // Set up createScriptRunner mock
    const { createScriptRunner } = await import('../../../../src/cli/handlers/script-runner.js');
    vi.mocked(createScriptRunner).mockReturnValue(mockRunner);
  });

  describe('ralphHandler', () => {
    it('should have correct metadata', async () => {
      const { ralphHandler } = await import('../../../../src/cli/handlers/ralph.js');

      expect(ralphHandler.id).toBe('ralph');
      expect(ralphHandler.name).toBe('Ralph Loop');
      expect(ralphHandler.description.toLowerCase()).toContain('iterative task loop');
      expect(ralphHandler.category).toBe('ralph');
      expect(ralphHandler.aliases).toEqual(['ralph', '-ralph', '--ralph']);
    });

    it('should delegate to ralph-cli.mjs with arguments', async () => {
      const { ralphHandler } = await import('../../../../src/cli/handlers/ralph.js');

      mockContext.args = ['task description', '--completion', 'done criteria'];

      const result = await ralphHandler.execute(mockContext);

      expect(mockRunner.run).toHaveBeenCalledWith(
        'tools/ralph/ralph-cli.mjs',
        ['task description', '--completion', 'done criteria']
      );
      expect(result.exitCode).toBe(0);
    });

    it('should pass empty args when no arguments provided', async () => {
      const { ralphHandler } = await import('../../../../src/cli/handlers/ralph.js');

      const result = await ralphHandler.execute(mockContext);

      expect(mockRunner.run).toHaveBeenCalledWith(
        'tools/ralph/ralph-cli.mjs',
        []
      );
      expect(result.exitCode).toBe(0);
    });

    it('should return error from script runner', async () => {
      const { ralphHandler } = await import('../../../../src/cli/handlers/ralph.js');

      const errorResult: HandlerResult = {
        exitCode: 1,
        message: 'Script failed',
        error: new Error('Test error'),
      };

      vi.mocked(mockRunner.run).mockResolvedValue(errorResult);

      const result = await ralphHandler.execute(mockContext);

      expect(result.exitCode).toBe(1);
      expect(result.message).toBe('Script failed');
      expect(result.error).toBeDefined();
    });
  });

  describe('ralphStatusHandler', () => {
    it('should have correct metadata', async () => {
      const { ralphStatusHandler } = await import('../../../../src/cli/handlers/ralph.js');

      expect(ralphStatusHandler.id).toBe('ralph-status');
      expect(ralphStatusHandler.name).toBe('Ralph Status');
      expect(ralphStatusHandler.description.toLowerCase()).toContain('status');
      expect(ralphStatusHandler.category).toBe('ralph');
      expect(ralphStatusHandler.aliases).toEqual(['ralph-status']);
    });

    it('should delegate to ralph-status.mjs', async () => {
      const { ralphStatusHandler } = await import('../../../../src/cli/handlers/ralph.js');

      const result = await ralphStatusHandler.execute(mockContext);

      expect(mockRunner.run).toHaveBeenCalledWith(
        'tools/ralph/ralph-status.mjs',
        []
      );
      expect(result.exitCode).toBe(0);
    });

    it('should pass optional arguments', async () => {
      const { ralphStatusHandler } = await import('../../../../src/cli/handlers/ralph.js');

      mockContext.args = ['--json'];

      const result = await ralphStatusHandler.execute(mockContext);

      expect(mockRunner.run).toHaveBeenCalledWith(
        'tools/ralph/ralph-status.mjs',
        ['--json']
      );
      expect(result.exitCode).toBe(0);
    });
  });

  describe('ralphAbortHandler', () => {
    it('should have correct metadata', async () => {
      const { ralphAbortHandler } = await import('../../../../src/cli/handlers/ralph.js');

      expect(ralphAbortHandler.id).toBe('ralph-abort');
      expect(ralphAbortHandler.name).toBe('Ralph Abort');
      expect(ralphAbortHandler.description.toLowerCase()).toContain('abort');
      expect(ralphAbortHandler.category).toBe('ralph');
      expect(ralphAbortHandler.aliases).toEqual(['ralph-abort']);
    });

    it('should delegate to ralph-abort.mjs', async () => {
      const { ralphAbortHandler } = await import('../../../../src/cli/handlers/ralph.js');

      const result = await ralphAbortHandler.execute(mockContext);

      expect(mockRunner.run).toHaveBeenCalledWith(
        'tools/ralph/ralph-abort.mjs',
        []
      );
      expect(result.exitCode).toBe(0);
    });

    it('should pass optional arguments', async () => {
      const { ralphAbortHandler } = await import('../../../../src/cli/handlers/ralph.js');

      mockContext.args = ['--force'];

      const result = await ralphAbortHandler.execute(mockContext);

      expect(mockRunner.run).toHaveBeenCalledWith(
        'tools/ralph/ralph-abort.mjs',
        ['--force']
      );
      expect(result.exitCode).toBe(0);
    });
  });

  describe('ralphResumeHandler', () => {
    it('should have correct metadata', async () => {
      const { ralphResumeHandler } = await import('../../../../src/cli/handlers/ralph.js');

      expect(ralphResumeHandler.id).toBe('ralph-resume');
      expect(ralphResumeHandler.name).toBe('Ralph Resume');
      expect(ralphResumeHandler.description.toLowerCase()).toContain('resume');
      expect(ralphResumeHandler.category).toBe('ralph');
      expect(ralphResumeHandler.aliases).toEqual(['ralph-resume']);
    });

    it('should delegate to ralph-resume.mjs', async () => {
      const { ralphResumeHandler } = await import('../../../../src/cli/handlers/ralph.js');

      const result = await ralphResumeHandler.execute(mockContext);

      expect(mockRunner.run).toHaveBeenCalledWith(
        'tools/ralph/ralph-resume.mjs',
        []
      );
      expect(result.exitCode).toBe(0);
    });

    it('should pass optional arguments', async () => {
      const { ralphResumeHandler } = await import('../../../../src/cli/handlers/ralph.js');

      mockContext.args = ['--max-iterations', '20'];

      const result = await ralphResumeHandler.execute(mockContext);

      expect(mockRunner.run).toHaveBeenCalledWith(
        'tools/ralph/ralph-resume.mjs',
        ['--max-iterations', '20']
      );
      expect(result.exitCode).toBe(0);
    });
  });

  describe('ralphHandlers array', () => {
    it('should export all Ralph handlers', async () => {
      const { ralphHandlers } = await import('../../../../src/cli/handlers/ralph.js');

      expect(ralphHandlers).toBeDefined();
      expect(ralphHandlers).toHaveLength(4);
      expect(ralphHandlers.map(h => h.id)).toEqual([
        'ralph',
        'ralph-status',
        'ralph-abort',
        'ralph-resume',
      ]);
    });

    it('should contain valid CommandHandler instances', async () => {
      const { ralphHandlers } = await import('../../../../src/cli/handlers/ralph.js');

      ralphHandlers.forEach((handler: CommandHandler) => {
        expect(handler.id).toBeDefined();
        expect(handler.name).toBeDefined();
        expect(handler.description).toBeDefined();
        expect(handler.category).toBe('ralph');
        expect(handler.aliases).toBeInstanceOf(Array);
        expect(handler.execute).toBeInstanceOf(Function);
      });
    });
  });
});
