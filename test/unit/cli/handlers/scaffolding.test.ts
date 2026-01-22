/**
 * Tests for Scaffolding Handlers
 *
 * @source @src/cli/handlers/scaffolding.ts
 * @implements @.aiwg/requirements/use-cases/UC-033-cli-handler-extraction.md
 * @issue #33
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HandlerContext } from '../../../../src/cli/handlers/types.js';

// Mock modules before imports
vi.mock('../../../../src/cli/handlers/script-runner.js');
vi.mock('../../../../src/channel/manager.mjs');

import {
  addAgentHandler,
  addCommandHandler,
  addSkillHandler,
  addTemplateHandler,
  scaffoldAddonHandler,
  scaffoldExtensionHandler,
  scaffoldFrameworkHandler,
  scaffoldingHandlers,
} from '../../../../src/cli/handlers/scaffolding.js';
import { createScriptRunner } from '../../../../src/cli/handlers/script-runner.js';
import { getFrameworkRoot } from '../../../../src/channel/manager.mjs';

describe('Scaffolding Handlers', () => {
  let mockContext: HandlerContext;
  let mockRun: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockContext = {
      args: [],
      rawArgs: [],
      cwd: process.cwd(),
      frameworkRoot: '/mock/framework/root',
    };

    // Create mock run function
    mockRun = vi.fn().mockResolvedValue({ exitCode: 0 });

    // Setup mocks
    vi.mocked(getFrameworkRoot).mockResolvedValue('/mock/framework/root');
    vi.mocked(createScriptRunner).mockReturnValue({
      run: mockRun,
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('addAgentHandler', () => {
    it('should have correct metadata', () => {
      expect(addAgentHandler.id).toBe('add-agent');
      expect(addAgentHandler.name).toBe('Add Agent');
      expect(addAgentHandler.category).toBe('scaffolding');
      expect(addAgentHandler.aliases).toContain('add-agent');
    });

    it('should delegate to add-agent.mjs script', async () => {
      mockContext.args = ['test-agent', '--category', 'testing'];

      const result = await addAgentHandler.execute(mockContext);

      expect(result.exitCode).toBe(0);
      expect(mockRun).toHaveBeenCalledWith(
        'tools/scaffolding/add-agent.mjs',
        ['test-agent', '--category', 'testing']
      );
    });

    it('should pass all arguments to the script', async () => {
      mockContext.args = ['my-agent', '--type', 'specialist'];

      await addAgentHandler.execute(mockContext);

      expect(mockRun).toHaveBeenCalledWith(
        'tools/scaffolding/add-agent.mjs',
        ['my-agent', '--type', 'specialist']
      );
    });
  });

  describe('addCommandHandler', () => {
    it('should have correct metadata', () => {
      expect(addCommandHandler.id).toBe('add-command');
      expect(addCommandHandler.name).toBe('Add Command');
      expect(addCommandHandler.category).toBe('scaffolding');
      expect(addCommandHandler.aliases).toContain('add-command');
    });

    it('should delegate to add-command.mjs script', async () => {
      mockContext.args = ['test-command'];

      const result = await addCommandHandler.execute(mockContext);

      expect(result.exitCode).toBe(0);
      expect(mockRun).toHaveBeenCalledWith(
        'tools/scaffolding/add-command.mjs',
        ['test-command']
      );
    });
  });

  describe('addSkillHandler', () => {
    it('should have correct metadata', () => {
      expect(addSkillHandler.id).toBe('add-skill');
      expect(addSkillHandler.name).toBe('Add Skill');
      expect(addSkillHandler.category).toBe('scaffolding');
      expect(addSkillHandler.aliases).toContain('add-skill');
    });

    it('should delegate to add-skill.mjs script', async () => {
      mockContext.args = ['test-skill'];

      const result = await addSkillHandler.execute(mockContext);

      expect(result.exitCode).toBe(0);
      expect(mockRun).toHaveBeenCalledWith(
        'tools/scaffolding/add-skill.mjs',
        ['test-skill']
      );
    });
  });

  describe('addTemplateHandler', () => {
    it('should have correct metadata', () => {
      expect(addTemplateHandler.id).toBe('add-template');
      expect(addTemplateHandler.name).toBe('Add Template');
      expect(addTemplateHandler.category).toBe('scaffolding');
      expect(addTemplateHandler.aliases).toContain('add-template');
    });

    it('should delegate to add-template.mjs script', async () => {
      mockContext.args = ['test-template'];

      const result = await addTemplateHandler.execute(mockContext);

      expect(result.exitCode).toBe(0);
      expect(mockRun).toHaveBeenCalledWith(
        'tools/scaffolding/add-template.mjs',
        ['test-template']
      );
    });
  });

  describe('scaffoldAddonHandler', () => {
    it('should have correct metadata', () => {
      expect(scaffoldAddonHandler.id).toBe('scaffold-addon');
      expect(scaffoldAddonHandler.name).toBe('Scaffold Addon');
      expect(scaffoldAddonHandler.category).toBe('scaffolding');
      expect(scaffoldAddonHandler.aliases).toContain('scaffold-addon');
    });

    it('should delegate to scaffold-addon.mjs script', async () => {
      mockContext.args = ['test-addon'];

      const result = await scaffoldAddonHandler.execute(mockContext);

      expect(result.exitCode).toBe(0);
      expect(mockRun).toHaveBeenCalledWith(
        'tools/scaffolding/scaffold-addon.mjs',
        ['test-addon']
      );
    });
  });

  describe('scaffoldExtensionHandler', () => {
    it('should have correct metadata', () => {
      expect(scaffoldExtensionHandler.id).toBe('scaffold-extension');
      expect(scaffoldExtensionHandler.name).toBe('Scaffold Extension');
      expect(scaffoldExtensionHandler.category).toBe('scaffolding');
      expect(scaffoldExtensionHandler.aliases).toContain('scaffold-extension');
    });

    it('should delegate to scaffold-extension.mjs script', async () => {
      mockContext.args = ['test-extension'];

      const result = await scaffoldExtensionHandler.execute(mockContext);

      expect(result.exitCode).toBe(0);
      expect(mockRun).toHaveBeenCalledWith(
        'tools/scaffolding/scaffold-extension.mjs',
        ['test-extension']
      );
    });
  });

  describe('scaffoldFrameworkHandler', () => {
    it('should have correct metadata', () => {
      expect(scaffoldFrameworkHandler.id).toBe('scaffold-framework');
      expect(scaffoldFrameworkHandler.name).toBe('Scaffold Framework');
      expect(scaffoldFrameworkHandler.category).toBe('scaffolding');
      expect(scaffoldFrameworkHandler.aliases).toContain('scaffold-framework');
    });

    it('should delegate to scaffold-framework.mjs script', async () => {
      mockContext.args = ['test-framework'];

      const result = await scaffoldFrameworkHandler.execute(mockContext);

      expect(result.exitCode).toBe(0);
      expect(mockRun).toHaveBeenCalledWith(
        'tools/scaffolding/scaffold-framework.mjs',
        ['test-framework']
      );
    });
  });

  describe('scaffoldingHandlers array', () => {
    it('should export all handlers in array', () => {
      expect(scaffoldingHandlers).toHaveLength(7);
      expect(scaffoldingHandlers).toContain(addAgentHandler);
      expect(scaffoldingHandlers).toContain(addCommandHandler);
      expect(scaffoldingHandlers).toContain(addSkillHandler);
      expect(scaffoldingHandlers).toContain(addTemplateHandler);
      expect(scaffoldingHandlers).toContain(scaffoldAddonHandler);
      expect(scaffoldingHandlers).toContain(scaffoldExtensionHandler);
      expect(scaffoldingHandlers).toContain(scaffoldFrameworkHandler);
    });

    it('should have all handlers with scaffolding category', () => {
      scaffoldingHandlers.forEach(handler => {
        expect(handler.category).toBe('scaffolding');
      });
    });
  });

  describe('error handling', () => {
    it('should propagate script errors', async () => {
      mockRun.mockResolvedValueOnce({
        exitCode: 1,
        message: 'Script failed',
        error: new Error('Test error'),
      });

      const result = await addAgentHandler.execute(mockContext);

      expect(result.exitCode).toBe(1);
      expect(result.message).toBe('Script failed');
    });
  });
});
