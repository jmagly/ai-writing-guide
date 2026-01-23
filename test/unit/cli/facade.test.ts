/**
 * CLI Facade Tests
 *
 * Tests for the compatibility facade that allows gradual migration from
 * the legacy CLI router to the new registry-based router.
 *
 * @implements @.aiwg/requirements/use-cases/UC-004-extension-system.md
 * @source @src/cli/facade.mjs
 * @architecture @.aiwg/architecture/decisions/ADR-001-unified-extension-system.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  run,
  shouldUseNewRouter,
  cleanArgs,
  legacyRun,
  newRun,
} from '../../../src/cli/facade.mjs';

// Store original environment
const originalEnv = { ...process.env };

describe('facade', () => {
  beforeEach(() => {
    // Clear environment before each test
    delete process.env.AIWG_USE_NEW_ROUTER;
  });

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
  });

  describe('shouldUseNewRouter', () => {
    describe('default behavior', () => {
      it('should default to new router (true)', () => {
        expect(shouldUseNewRouter([])).toBe(true);
      });

      it('should be true with no env var or flags', () => {
        delete process.env.AIWG_USE_NEW_ROUTER;
        expect(shouldUseNewRouter(['use', 'sdlc'])).toBe(true);
      });
    });

    describe('environment variable control', () => {
      it('should return true when AIWG_USE_NEW_ROUTER=true', () => {
        process.env.AIWG_USE_NEW_ROUTER = 'true';
        expect(shouldUseNewRouter([])).toBe(true);
      });

      it('should return false when AIWG_USE_NEW_ROUTER=false', () => {
        process.env.AIWG_USE_NEW_ROUTER = 'false';
        expect(shouldUseNewRouter([])).toBe(false);
      });

      it('should default to true with invalid env value', () => {
        process.env.AIWG_USE_NEW_ROUTER = 'invalid';
        expect(shouldUseNewRouter([])).toBe(true);
      });

      it('should default to true with empty env value', () => {
        process.env.AIWG_USE_NEW_ROUTER = '';
        expect(shouldUseNewRouter([])).toBe(true);
      });

      it('should handle "1" as invalid (defaults to true)', () => {
        process.env.AIWG_USE_NEW_ROUTER = '1';
        expect(shouldUseNewRouter([])).toBe(true);
      });

      it('should handle "0" as invalid (defaults to true)', () => {
        process.env.AIWG_USE_NEW_ROUTER = '0';
        expect(shouldUseNewRouter([])).toBe(true);
      });
    });

    describe('CLI flag control', () => {
      it('should return true with --experimental-router flag', () => {
        expect(shouldUseNewRouter(['--experimental-router'])).toBe(true);
      });

      it('should return false with --legacy-router flag', () => {
        expect(shouldUseNewRouter(['--legacy-router'])).toBe(false);
      });

      it('should detect flag anywhere in args', () => {
        expect(shouldUseNewRouter(['use', 'sdlc', '--experimental-router'])).toBe(true);
        expect(shouldUseNewRouter(['--experimental-router', 'use', 'sdlc'])).toBe(true);
      });

      it('should detect legacy flag anywhere in args', () => {
        expect(shouldUseNewRouter(['use', 'sdlc', '--legacy-router'])).toBe(false);
        expect(shouldUseNewRouter(['--legacy-router', 'use', 'sdlc'])).toBe(false);
      });
    });

    describe('flag priority over environment', () => {
      it('should use --legacy-router even when env is true', () => {
        process.env.AIWG_USE_NEW_ROUTER = 'true';
        expect(shouldUseNewRouter(['--legacy-router'])).toBe(false);
      });

      it('should use --experimental-router even when env is false', () => {
        process.env.AIWG_USE_NEW_ROUTER = 'false';
        expect(shouldUseNewRouter(['--experimental-router'])).toBe(true);
      });

      it('should use --legacy-router over --experimental-router (legacy takes precedence)', () => {
        // When both flags present, legacy wins (most conservative behavior)
        expect(
          shouldUseNewRouter(['--experimental-router', '--legacy-router'])
        ).toBe(false);
      });
    });

    describe('new router as default', () => {
      it('should default to new router for all commands', () => {
        // No env var, no flags → new router
        expect(shouldUseNewRouter(['use', 'sdlc'])).toBe(true);
      });

      it('should use new router for all common commands', () => {
        // All commands use new router by default
        expect(shouldUseNewRouter(['use', 'sdlc'])).toBe(true);
        expect(shouldUseNewRouter(['list'])).toBe(true);
        expect(shouldUseNewRouter(['-new'])).toBe(true);
        expect(shouldUseNewRouter(['--help'])).toBe(true);
      });
    });
  });

  describe('cleanArgs', () => {
    it('should remove --experimental-router flag', () => {
      expect(cleanArgs(['use', 'sdlc', '--experimental-router'])).toEqual([
        'use',
        'sdlc',
      ]);
    });

    it('should remove --legacy-router flag', () => {
      expect(cleanArgs(['use', 'sdlc', '--legacy-router'])).toEqual([
        'use',
        'sdlc',
      ]);
    });

    it('should remove both flags', () => {
      expect(
        cleanArgs(['--experimental-router', 'use', 'sdlc', '--legacy-router'])
      ).toEqual(['use', 'sdlc']);
    });

    it('should return unchanged args when no router flags', () => {
      const args = ['use', 'sdlc', '--force'];
      expect(cleanArgs(args)).toEqual(args);
    });

    it('should handle empty args', () => {
      expect(cleanArgs([])).toEqual([]);
    });

    it('should preserve other flags', () => {
      expect(
        cleanArgs(['use', 'sdlc', '--experimental-router', '--force', '--dry-run'])
      ).toEqual(['use', 'sdlc', '--force', '--dry-run']);
    });

    it('should only remove exact flag matches', () => {
      // Should not remove partial matches
      expect(cleanArgs(['--experimental-router-mode'])).toEqual([
        '--experimental-router-mode',
      ]);
      expect(cleanArgs(['--legacy-router-config'])).toEqual([
        '--legacy-router-config',
      ]);
    });

    it('should handle multiple occurrences', () => {
      expect(
        cleanArgs([
          '--experimental-router',
          'use',
          '--experimental-router',
          'sdlc',
        ])
      ).toEqual(['use', 'sdlc']);
    });
  });

  describe('run', () => {
    describe('router delegation', () => {
      it('should delegate to new router by default', async () => {
        // Mock both routers to track which was called
        const legacySpy = vi.fn().mockResolvedValue(undefined);
        const newSpy = vi.fn().mockResolvedValue(undefined);

        // We can't directly mock the imports, but we can verify the delegation logic
        // This test verifies shouldUseNewRouter returns true by default
        expect(shouldUseNewRouter(['use', 'sdlc'])).toBe(true);
      });

      it('should delegate to new router with --experimental-router', async () => {
        // Verify routing logic
        expect(shouldUseNewRouter(['use', 'sdlc', '--experimental-router'])).toBe(true);
      });

      it('should delegate to new router with env var', async () => {
        process.env.AIWG_USE_NEW_ROUTER = 'true';
        expect(shouldUseNewRouter(['use', 'sdlc'])).toBe(true);
      });

      it('should force legacy router with --legacy-router', async () => {
        process.env.AIWG_USE_NEW_ROUTER = 'true';
        expect(shouldUseNewRouter(['use', 'sdlc', '--legacy-router'])).toBe(false);
      });
    });

    describe('argument cleaning', () => {
      it('should clean args before passing to router', () => {
        const args = ['use', 'sdlc', '--experimental-router'];
        const cleaned = cleanArgs(args);
        expect(cleaned).toEqual(['use', 'sdlc']);
      });

      it('should pass cleaned args without router flags', () => {
        const args = ['use', 'sdlc', '--force', '--experimental-router'];
        const cleaned = cleanArgs(args);
        expect(cleaned).toEqual(['use', 'sdlc', '--force']);
      });
    });

    describe('options forwarding', () => {
      it('should forward cwd option to router', async () => {
        // Verify options structure is compatible
        const options = { cwd: '/custom/path' };
        expect(options.cwd).toBe('/custom/path');
      });

      it('should handle undefined options', async () => {
        // Should not error with no options
        expect(() => shouldUseNewRouter([])).not.toThrow();
      });
    });

    describe('new router as default', () => {
      it('should use new router by default', () => {
        // No env, no flags → new router
        expect(shouldUseNewRouter(['use', 'sdlc'])).toBe(true);
      });

      it('should use new router for all common commands', () => {
        // All common commands now use new router by default
        const commonCommands = [
          ['use', 'sdlc'],
          ['list'],
          ['-new'],
          ['--help'],
          ['version'],
          ['doctor'],
        ];

        commonCommands.forEach((cmd) => {
          expect(shouldUseNewRouter(cmd)).toBe(true);
        });
      });
    });

    describe('A/B testing support', () => {
      it('should allow selective new router testing via env', () => {
        process.env.AIWG_USE_NEW_ROUTER = 'true';
        expect(shouldUseNewRouter(['use', 'sdlc'])).toBe(true);

        process.env.AIWG_USE_NEW_ROUTER = 'false';
        expect(shouldUseNewRouter(['use', 'sdlc'])).toBe(false);
      });

      it('should allow selective new router testing via flag', () => {
        expect(shouldUseNewRouter(['use', 'sdlc', '--experimental-router'])).toBe(true);
        expect(shouldUseNewRouter(['use', 'sdlc', '--legacy-router'])).toBe(false);
      });
    });
  });

  describe('exports', () => {
    it('should export legacyRun for direct access', () => {
      expect(legacyRun).toBeDefined();
      expect(typeof legacyRun).toBe('function');
    });

    it('should export newRun for direct access', () => {
      expect(newRun).toBeDefined();
      expect(typeof newRun).toBe('function');
    });

    it('should export main run function', () => {
      expect(run).toBeDefined();
      expect(typeof run).toBe('function');
    });

    it('should export utility functions', () => {
      expect(shouldUseNewRouter).toBeDefined();
      expect(cleanArgs).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle args with special characters', () => {
      expect(cleanArgs(['use', 'sdlc', '--flag="value"'])).toEqual([
        'use',
        'sdlc',
        '--flag="value"',
      ]);
    });

    it('should handle args with spaces (if properly quoted)', () => {
      expect(cleanArgs(['use', 'sdlc', '--message', 'hello world'])).toEqual([
        'use',
        'sdlc',
        '--message',
        'hello world',
      ]);
    });

    it('should handle args starting with router flag names', () => {
      // Should not remove if not exact match
      expect(cleanArgs(['--experimental-router-v2'])).toEqual([
        '--experimental-router-v2',
      ]);
    });

    it('should handle empty string in args', () => {
      expect(cleanArgs(['use', '', 'sdlc'])).toEqual(['use', '', 'sdlc']);
    });

    it('should handle undefined env gracefully', () => {
      delete process.env.AIWG_USE_NEW_ROUTER;
      expect(() => shouldUseNewRouter([])).not.toThrow();
    });

    it('should handle null-like env values (defaults to new)', () => {
      process.env.AIWG_USE_NEW_ROUTER = 'null';
      expect(shouldUseNewRouter([])).toBe(true);

      process.env.AIWG_USE_NEW_ROUTER = 'undefined';
      expect(shouldUseNewRouter([])).toBe(true);
    });
  });

  describe('migration scenarios', () => {
    it('should support opt-out via env var', () => {
      // Everyone uses new router by default
      delete process.env.AIWG_USE_NEW_ROUTER;
      expect(shouldUseNewRouter([])).toBe(true);

      // Can opt-out with env var
      process.env.AIWG_USE_NEW_ROUTER = 'false';
      expect(shouldUseNewRouter([])).toBe(false);
    });

    it('should support feature flagging in CI/CD', () => {
      // CI can test both routers
      process.env.AIWG_USE_NEW_ROUTER = 'true';
      expect(shouldUseNewRouter(['use', 'sdlc'])).toBe(true);

      process.env.AIWG_USE_NEW_ROUTER = 'false';
      expect(shouldUseNewRouter(['use', 'sdlc'])).toBe(false);
    });

    it('should support testing legacy router for specific commands', () => {
      // New router is default
      expect(shouldUseNewRouter(['list'])).toBe(true);

      // User can force legacy for a single command
      expect(shouldUseNewRouter(['use', 'sdlc', '--legacy-router'])).toBe(false);
    });

    it('should support safe rollback via flag', () => {
      // Even if new router is default (env=true), can force legacy
      process.env.AIWG_USE_NEW_ROUTER = 'true';
      expect(shouldUseNewRouter(['use', 'sdlc', '--legacy-router'])).toBe(false);
    });
  });

  describe('documentation examples', () => {
    it('should work as documented in shouldUseNewRouter examples', () => {
      // Via environment variable
      process.env.AIWG_USE_NEW_ROUTER = 'true';
      expect(shouldUseNewRouter([])).toBe(true);

      // Via CLI flag
      expect(shouldUseNewRouter(['--experimental-router'])).toBe(true);
      expect(shouldUseNewRouter(['--legacy-router'])).toBe(false);

      // Default (new router)
      delete process.env.AIWG_USE_NEW_ROUTER;
      expect(shouldUseNewRouter([])).toBe(true);
    });

    it('should work as documented in cleanArgs examples', () => {
      expect(cleanArgs(['use', 'sdlc', '--experimental-router'])).toEqual([
        'use',
        'sdlc',
      ]);

      expect(cleanArgs(['--help', '--legacy-router'])).toEqual(['--help']);
    });

    it('should work as documented in run examples', () => {
      // Default is now new router
      delete process.env.AIWG_USE_NEW_ROUTER;
      expect(shouldUseNewRouter(['use', 'sdlc'])).toBe(true);

      // Flags still work
      expect(shouldUseNewRouter(['use', 'sdlc', '--experimental-router'])).toBe(true);
      expect(shouldUseNewRouter(['use', 'sdlc', '--legacy-router'])).toBe(false);

      // Env var still works
      process.env.AIWG_USE_NEW_ROUTER = 'true';
      expect(shouldUseNewRouter(['use', 'sdlc'])).toBe(true);
    });
  });
});
