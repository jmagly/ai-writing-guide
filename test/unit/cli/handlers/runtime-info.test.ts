/**
 * Tests for Runtime Info Command Handler
 *
 * Unit tests for runtime environment discovery and tool catalog management.
 *
 * @source @src/cli/handlers/runtime-info.ts
 * @implements @.aiwg/architecture/decisions/ADR-001-unified-extension-system.md
 * @issue #33
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { HandlerContext, HandlerResult } from '../../../../src/cli/handlers/types.js';

// Mock RuntimeDiscovery
const mockDiscovery = {
  discover: vi.fn(),
  verify: vi.fn(),
  checkTool: vi.fn(),
  getSummary: vi.fn(),
  basePath: '/mock/.aiwg/smiths/toolsmith',
};

vi.mock('../../../../src/smiths/toolsmith/runtime-discovery.mjs', () => ({
  RuntimeDiscovery: vi.fn(() => mockDiscovery),
}));

describe('Runtime Info Command Handler', () => {
  let mockContext: HandlerContext;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock handler context
    mockContext = {
      args: [],
      rawArgs: ['runtime-info'],
      cwd: '/mock/project',
      frameworkRoot: '/mock/framework/root',
    };

    // Default mock implementations
    mockDiscovery.discover.mockResolvedValue({
      tools: [
        { id: 'git', name: 'Git', category: 'core' },
        { id: 'node', name: 'Node.js', category: 'languages' },
      ],
      unavailable: [
        { id: 'docker', name: 'Docker' },
      ],
    });

    mockDiscovery.verify.mockResolvedValue({
      total: 2,
      valid: 2,
      failed: [],
    });

    mockDiscovery.checkTool.mockResolvedValue({
      available: true,
      version: '2.42.0',
      path: '/usr/bin/git',
      lastVerified: '2026-01-22T10:00:00Z',
    });

    mockDiscovery.getSummary.mockResolvedValue({
      environment: {
        os: 'Linux',
        osVersion: '6.14.0-37-generic',
        arch: 'x64',
        shell: '/bin/bash',
      },
      resources: {
        memoryAvailableGb: 16.5,
        memoryTotalGb: 32.0,
        diskFreeGb: 250.5,
        cpuCores: 8,
      },
      toolCounts: {
        core: 5,
        languages: 3,
        utilities: 7,
        custom: 2,
      },
      totalTools: 17,
      lastDiscovery: '2026-01-22T09:00:00Z',
      catalogPath: '/mock/.aiwg/smiths/toolsmith/runtime.json',
    });
  });

  describe('handler metadata', () => {
    it('should have correct metadata', async () => {
      const { runtimeInfoHandler } = await import('../../../../src/cli/handlers/runtime-info.js');

      expect(runtimeInfoHandler.id).toBe('runtime-info');
      expect(runtimeInfoHandler.name).toBe('Runtime Info');
      expect(runtimeInfoHandler.description.toLowerCase()).toContain('runtime environment');
      expect(runtimeInfoHandler.category).toBe('toolsmith');
      expect(runtimeInfoHandler.aliases).toEqual([]);
    });
  });

  describe('--discover flag', () => {
    it('should perform full discovery and display results', async () => {
      const { runtimeInfoHandler } = await import('../../../../src/cli/handlers/runtime-info.js');

      mockContext.args = ['--discover'];

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await runtimeInfoHandler.execute(mockContext);

      expect(mockDiscovery.discover).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('\nDiscovery complete!');
      expect(consoleSpy).toHaveBeenCalledWith('Discovered 2 tools');
      expect(consoleSpy).toHaveBeenCalledWith('Unavailable: 1');
      expect(result.exitCode).toBe(0);

      consoleSpy.mockRestore();
    });

    it('should output JSON when --json flag is present', async () => {
      const { runtimeInfoHandler } = await import('../../../../src/cli/handlers/runtime-info.js');

      mockContext.args = ['--discover', '--json'];

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await runtimeInfoHandler.execute(mockContext);

      expect(mockDiscovery.discover).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"tools"')
      );
      expect(result.exitCode).toBe(0);

      consoleSpy.mockRestore();
    });
  });

  describe('--verify flag', () => {
    it('should verify existing catalog and display results', async () => {
      const { runtimeInfoHandler } = await import('../../../../src/cli/handlers/runtime-info.js');

      mockContext.args = ['--verify'];

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await runtimeInfoHandler.execute(mockContext);

      expect(mockDiscovery.verify).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('\nVerification complete!');
      expect(consoleSpy).toHaveBeenCalledWith('Valid: 2/2');
      expect(result.exitCode).toBe(0);

      consoleSpy.mockRestore();
    });

    it('should display failed tools when verification finds issues', async () => {
      const { runtimeInfoHandler } = await import('../../../../src/cli/handlers/runtime-info.js');

      mockDiscovery.verify.mockResolvedValue({
        total: 3,
        valid: 2,
        failed: [
          { id: 'python', name: 'Python' },
        ],
      });

      mockContext.args = ['--verify'];

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await runtimeInfoHandler.execute(mockContext);

      expect(mockDiscovery.verify).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Valid: 2/3');
      expect(consoleSpy).toHaveBeenCalledWith('\nFailed tools:');
      expect(consoleSpy).toHaveBeenCalledWith('  - Python (python)');
      expect(result.exitCode).toBe(0);

      consoleSpy.mockRestore();
    });

    it('should output JSON when --json flag is present', async () => {
      const { runtimeInfoHandler } = await import('../../../../src/cli/handlers/runtime-info.js');

      mockContext.args = ['--verify', '--json'];

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await runtimeInfoHandler.execute(mockContext);

      expect(mockDiscovery.verify).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"total"')
      );
      expect(result.exitCode).toBe(0);

      consoleSpy.mockRestore();
    });
  });

  describe('--check flag', () => {
    it('should check specific tool availability', async () => {
      const { runtimeInfoHandler } = await import('../../../../src/cli/handlers/runtime-info.js');

      mockContext.args = ['--check', 'git'];

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await runtimeInfoHandler.execute(mockContext);

      expect(mockDiscovery.checkTool).toHaveBeenCalledWith('git');
      expect(consoleSpy).toHaveBeenCalledWith('\nTool: git');
      expect(consoleSpy).toHaveBeenCalledWith('Status: Available');
      expect(consoleSpy).toHaveBeenCalledWith('Version: 2.42.0');
      expect(consoleSpy).toHaveBeenCalledWith('Path: /usr/bin/git');
      expect(result.exitCode).toBe(0);

      consoleSpy.mockRestore();
    });

    it('should handle unavailable tools', async () => {
      const { runtimeInfoHandler } = await import('../../../../src/cli/handlers/runtime-info.js');

      mockDiscovery.checkTool.mockResolvedValue({
        available: false,
        installHint: 'apt-get install docker.io',
      });

      mockContext.args = ['--check', 'docker'];

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await runtimeInfoHandler.execute(mockContext);

      expect(mockDiscovery.checkTool).toHaveBeenCalledWith('docker');
      expect(consoleSpy).toHaveBeenCalledWith('\nTool: docker');
      expect(consoleSpy).toHaveBeenCalledWith('Status: Not Available');
      expect(consoleSpy).toHaveBeenCalledWith('Install: apt-get install docker.io');
      expect(result.exitCode).toBe(0);

      consoleSpy.mockRestore();
    });

    it('should require tool name argument', async () => {
      const { runtimeInfoHandler } = await import('../../../../src/cli/handlers/runtime-info.js');

      mockContext.args = ['--check'];

      const result = await runtimeInfoHandler.execute(mockContext);

      expect(result.exitCode).toBe(1);
      expect(result.message).toBe('Tool name required for --check');
    });

    it('should output JSON when --json flag is present', async () => {
      const { runtimeInfoHandler } = await import('../../../../src/cli/handlers/runtime-info.js');

      mockContext.args = ['--check', 'git', '--json'];

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await runtimeInfoHandler.execute(mockContext);

      expect(mockDiscovery.checkTool).toHaveBeenCalledWith('git');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"available"')
      );
      expect(result.exitCode).toBe(0);

      consoleSpy.mockRestore();
    });
  });

  describe('default behavior (summary)', () => {
    it('should display runtime environment summary', async () => {
      const { runtimeInfoHandler } = await import('../../../../src/cli/handlers/runtime-info.js');

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await runtimeInfoHandler.execute(mockContext);

      expect(mockDiscovery.getSummary).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('\nRuntime Environment Summary');
      expect(consoleSpy).toHaveBeenCalledWith('===========================');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('OS: Linux')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Shell: /bin/bash')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Memory: 16.5 GB available / 32 GB total')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Total: 17 verified tools')
      );
      expect(result.exitCode).toBe(0);

      consoleSpy.mockRestore();
    });

    it('should output JSON when --json flag is present', async () => {
      const { runtimeInfoHandler } = await import('../../../../src/cli/handlers/runtime-info.js');

      mockContext.args = ['--json'];

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await runtimeInfoHandler.execute(mockContext);

      expect(mockDiscovery.getSummary).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"environment"')
      );
      expect(result.exitCode).toBe(0);

      consoleSpy.mockRestore();
    });
  });

  describe('error handling', () => {
    it('should handle "No catalog found" error gracefully', async () => {
      const { runtimeInfoHandler } = await import('../../../../src/cli/handlers/runtime-info.js');

      mockDiscovery.getSummary.mockRejectedValue(new Error('No catalog found'));

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await runtimeInfoHandler.execute(mockContext);

      expect(consoleSpy).toHaveBeenCalledWith('\nNo runtime catalog found.');
      expect(consoleSpy).toHaveBeenCalledWith(
        "Run 'aiwg runtime-info --discover' to create one."
      );
      expect(result.exitCode).toBe(0);

      consoleSpy.mockRestore();
    });

    it('should return error for other exceptions', async () => {
      const { runtimeInfoHandler } = await import('../../../../src/cli/handlers/runtime-info.js');

      const testError = new Error('Unexpected error');
      mockDiscovery.getSummary.mockRejectedValue(testError);

      const result = await runtimeInfoHandler.execute(mockContext);

      expect(result.exitCode).toBe(1);
      expect(result.message).toBe('Unexpected error');
      expect(result.error).toBe(testError);
    });
  });
});
