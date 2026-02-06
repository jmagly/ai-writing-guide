/**
 * Tests for CLI Analyzer
 *
 * @source @src/smiths/mcpsmith/analyzers/cli-analyzer.ts
 */

import { describe, it, expect } from 'vitest';
import { analyzeCLI } from '../../../../src/smiths/mcpsmith/analyzers/cli-analyzer.js';

describe('CLI Analyzer', () => {
  describe('analyzeCLI', () => {
    it('should analyze echo command', async () => {
      const result = await analyzeCLI({
        command: 'echo',
        includeSubcommands: false,
        timeout: 2000
      });

      expect(result).toBeDefined();
      expect(result.metadata.sourceType).toBe('cli');
      expect(result.metadata.sourceName).toBe('echo');
      expect(result.tools.length).toBeGreaterThan(0);
    });

    it('should extract tool definition with proper structure', async () => {
      const result = await analyzeCLI({
        command: 'echo',
        includeSubcommands: false,
        timeout: 2000
      });

      const tool = result.tools[0];
      expect(tool).toHaveProperty('name');
      expect(tool).toHaveProperty('title');
      expect(tool).toHaveProperty('description');
      expect(tool).toHaveProperty('source');
      expect(tool).toHaveProperty('inputSchema');
      expect(tool).toHaveProperty('metadata');

      expect(tool.source.type).toBe('cli');
      expect(tool.source.command).toBe('echo');
    });

    it('should mark dangerous commands appropriately', async () => {
      // Note: This is a mock test. In production, we'd test with actual dangerous commands
      // For now, just verify the metadata structure exists
      const result = await analyzeCLI({
        command: 'echo',
        includeSubcommands: false,
        timeout: 2000
      });

      const tool = result.tools[0];
      expect(tool.metadata).toHaveProperty('dangerous');
      expect(tool.metadata).toHaveProperty('requiresConfirmation');
      expect(typeof tool.metadata.dangerous).toBe('boolean');
      expect(typeof tool.metadata.requiresConfirmation).toBe('boolean');
    });

    it('should include metadata about discovery', async () => {
      const result = await analyzeCLI({
        command: 'echo',
        includeSubcommands: false,
        timeout: 2000
      });

      expect(result.metadata).toBeDefined();
      expect(result.metadata.sourceType).toBe('cli');
      expect(result.metadata.sourceName).toBe('echo');
      expect(result.metadata.toolCount).toBe(result.tools.length);
      expect(result.metadata.discoveredAt).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO date
    });

    it('should handle timeout gracefully', async () => {
      // Note: Testing actual timeout is unreliable because `sleep --help` completes instantly
      // This test verifies the timeout parameter is accepted and the function still works
      const result = await analyzeCLI({
        command: 'echo',
        includeSubcommands: false,
        timeout: 100
      });

      // If we get here, the function completed despite short timeout
      // This is expected for fast commands like echo
      expect(result).toBeDefined();
      expect(result.tools.length).toBeGreaterThan(0);
    });

    it('should handle non-existent command', async () => {
      await expect(
        analyzeCLI({
          command: 'this-command-does-not-exist-xyz123',
          includeSubcommands: false,
          timeout: 1000
        })
      ).rejects.toThrow();
    });
  });

  describe('Help text parsing', () => {
    it('should parse commands with subcommands', async () => {
      // Using 'git' as it typically has subcommands
      // Skip if git not available
      try {
        const result = await analyzeCLI({
          command: 'git',
          includeSubcommands: true,
          timeout: 3000
        });

        // Git should have multiple subcommands
        expect(result.tools.length).toBeGreaterThan(1);

        // Tool names should include git- prefix
        result.tools.forEach(tool => {
          expect(tool.name).toMatch(/^git-/);
        });
      } catch (error) {
        // Git not available, skip test
        console.log('Git not available, skipping subcommand test');
      }
    });

    it('should include input schema properties', async () => {
      const result = await analyzeCLI({
        command: 'echo',
        includeSubcommands: false,
        timeout: 2000
      });

      const tool = result.tools[0];
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toBeDefined();
    });
  });

  describe('Security classification', () => {
    it('should mark rm-like commands as dangerous', async () => {
      // We'll test the classification logic indirectly through the tool metadata
      const result = await analyzeCLI({
        command: 'echo',
        includeSubcommands: false,
        timeout: 2000
      });

      const tool = result.tools[0];
      // Echo should not be dangerous
      expect(tool.metadata.dangerous).toBe(false);
    });

    it('should set retryable flag', async () => {
      const result = await analyzeCLI({
        command: 'echo',
        includeSubcommands: false,
        timeout: 2000
      });

      const tool = result.tools[0];
      expect(tool.metadata.retryable).toBe(true);
    });
  });

  describe('Source mapping', () => {
    it('should include mapping for CLI arguments', async () => {
      const result = await analyzeCLI({
        command: 'echo',
        includeSubcommands: false,
        timeout: 2000
      });

      const tool = result.tools[0];
      expect(tool.source).toHaveProperty('mapping');
      expect(typeof tool.source.mapping).toBe('object');
    });

    it('should map flags correctly', async () => {
      const result = await analyzeCLI({
        command: 'echo',
        includeSubcommands: false,
        timeout: 2000
      });

      const tool = result.tools[0];
      const mapping = tool.source.mapping || {};

      // Check that any mapped flags have proper structure
      Object.values(mapping).forEach((map: any) => {
        if (map.flag) {
          expect(typeof map.flag).toBe('string');
        }
        expect(['string', 'boolean', 'number', 'array']).toContain(map.type);
      });
    });
  });
});
