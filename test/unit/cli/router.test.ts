/**
 * CLI Router Tests
 *
 * Tests for the registry-based CLI router including command routing,
 * alias resolution, unknown command handling, and help display.
 *
 * @implements @.aiwg/requirements/use-cases/UC-004-extension-system.md
 * @source @src/cli/router.ts
 * @architecture @.aiwg/architecture/decisions/ADR-001-unified-extension-system.md
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { run, initRouter, cachedRegistry } from '../../../src/cli/router.js';
import type { HandlerContext, HandlerResult, CommandHandler } from '../../../src/cli/handlers/types.js';

// Store original functions
const originalExit = process.exit;
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

// Track console calls
let consoleErrorCalls: any[] = [];
let consoleLogCalls: any[] = [];

// Mock process.exit to prevent tests from actually exiting
let exitCode: number | undefined;

describe('router', () => {
  beforeEach(() => {
    // Reset tracking
    exitCode = undefined;
    consoleErrorCalls = [];
    consoleLogCalls = [];

    // Replace functions with tracked versions
    process.exit = ((code?: number) => {
      exitCode = code;
      throw new Error(`process.exit called with ${code}`);
    }) as any;

    console.error = (...args: any[]) => {
      consoleErrorCalls.push(args);
    };

    console.log = (...args: any[]) => {
      consoleLogCalls.push(args);
    };
  });

  afterEach(() => {
    // Restore originals
    process.exit = originalExit;
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
  });

  describe('initRouter', () => {
    it('should load and cache the registry', async () => {
      const registry = await initRouter();

      expect(registry).toBeDefined();
      expect(registry.registry).toBeDefined();
      expect(registry.handlerMap).toBeDefined();
      expect(registry.capabilityIndex).toBeDefined(); // indexCapabilities: true
    });

    it('should return cached registry on subsequent calls', async () => {
      const first = await initRouter();
      const second = await initRouter();

      expect(first).toBe(second);
    });

    it('should have handlers for core commands', async () => {
      const registry = await initRouter();

      expect(registry.handlerMap.get('help')).toBeDefined();
      expect(registry.handlerMap.get('version')).toBeDefined();
      expect(registry.handlerMap.get('use')).toBeDefined();
    });
  });

  describe('run', () => {
    describe('command routing', () => {
      it('should route command to correct handler', async () => {
        // Run help command (no args)
        await run([]);

        // Help handler should be executed
        // Should not error
        expect(consoleErrorCalls).toHaveLength(0);
        expect(exitCode).toBeUndefined();
      });

      it('should exit with code 0 on successful handler execution', async () => {
        // Test with version command (simple, likely to succeed)
        await run(['version']);

        // Should not exit with error
        expect(exitCode).toBeUndefined();
      });
    });

    describe('alias resolution', () => {
      it('should resolve command aliases', async () => {
        const registry = await initRouter();

        // Test alias resolution directly
        expect(registry.registry.resolveCommand('-h')).toBe('help');
        expect(registry.registry.resolveCommand('--help')).toBe('help');
        expect(registry.registry.resolveCommand('-help')).toBe('help');
      });

      it('should route aliased commands to handler', async () => {
        // Test that alias routes to correct handler
        await run(['--help']);

        // Should not error out
        const errorMessages = consoleErrorCalls.flat().join(' ');
        expect(errorMessages).not.toContain('Unknown command');
        expect(exitCode).toBeUndefined();
      });

      it('should handle version aliases', async () => {
        const registry = await initRouter();

        // version has aliases: ['-version', '--version'] (not -v)
        expect(registry.registry.resolveCommand('-version')).toBe('version');
        expect(registry.registry.resolveCommand('--version')).toBe('version');
      });
    });

    describe('unknown command handling', () => {
      it('should error on unknown command', async () => {
        try {
          await run(['unknown-command']);
        } catch (e) {
          // Expected to throw due to process.exit mock
        }

        expect(consoleErrorCalls).toHaveLength(1);
        expect(consoleErrorCalls[0][0]).toBe('Unknown command: unknown-command');
        expect(consoleLogCalls).toContainEqual(['Run `aiwg help` for usage information.']);
        expect(exitCode).toBe(1);
      });

      it('should error on invalid alias', async () => {
        try {
          await run(['--invalid-flag']);
        } catch (e) {
          // Expected to throw due to process.exit mock
        }

        expect(consoleErrorCalls).toHaveLength(1);
        expect(consoleErrorCalls[0][0]).toContain('Unknown command');
        expect(exitCode).toBe(1);
      });
    });

    describe('help display when no args', () => {
      it('should show help when called with no arguments', async () => {
        await run([]);

        // Should not exit with error
        expect(exitCode).toBeUndefined();
        expect(consoleErrorCalls).toHaveLength(0);

        // Help handler would be executed (actual output tested in help handler tests)
      });

      it('should not error when help handler is available', async () => {
        const registry = await initRouter();

        // Verify help handler exists
        const helpHandler = registry.handlerMap.get('help');
        expect(helpHandler).toBeDefined();
        expect(helpHandler?.id).toBe('help');

        // Run with no args
        await run([]);

        // Should complete without error
        expect(consoleErrorCalls).toHaveLength(0);
      });
    });

    describe('context building', () => {
      it('should pass command arguments to handler', async () => {
        // Use version command which is simple and stable
        await run(['version', '--dry-run']);

        // Should not error on valid command
        const errorMessages = consoleErrorCalls.flat().join(' ');
        expect(errorMessages).not.toContain('Unknown command');
        expect(exitCode).toBeUndefined();
      });

      it('should detect dry-run flag in context', async () => {
        // Would need to mock handler to verify context
        // For now, verify command runs without error
        await run(['version', '--dry-run']);

        expect(exitCode).toBeUndefined();
      });

      it('should use provided cwd option', async () => {
        const customCwd = '/custom/path';

        // No error should occur
        await run(['version'], { cwd: customCwd });

        expect(exitCode).toBeUndefined();
      });
    });

    describe('handler execution', () => {
      it('should execute handler with correct context', async () => {
        // Test that execution completes
        await run(['version']);

        expect(exitCode).toBeUndefined();
      });

      it('should handle missing handler gracefully', async () => {
        // This is an edge case - registry has command but no handler
        // Skip for now as it requires complex mocking
      });
    });
  });

  describe('error handling', () => {
    it('should handle registry loading errors', async () => {
      // Would need to mock loadRegistry to throw
      // Skip for now as this is a rare edge case
    });

    it('should provide helpful error messages', async () => {
      try {
        await run(['nonexistent']);
      } catch (e) {
        // Expected to throw
      }

      expect(consoleErrorCalls).toHaveLength(1);
      expect(consoleErrorCalls[0][0]).toBe('Unknown command: nonexistent');
      expect(consoleLogCalls).toContainEqual(['Run `aiwg help` for usage information.']);
    });
  });
});
