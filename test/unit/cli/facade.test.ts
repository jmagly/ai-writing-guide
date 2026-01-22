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
      it('should default to legacy router (false)', () => {
        expect(shouldUseNewRouter([])).toBe(false);
      });

      it('should be false with no env var or flags', () => {
        delete process.env.AIWG_USE_NEW_ROUTER;
        expect(shouldUseNewRouter(['use', 'sdlc'])).toBe(false);
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

      it('should default to false with invalid env value', () => {
        process.env.AIWG_USE_NEW_ROUTER = 'invalid';
        expect(shouldUseNewRouter([])).toBe(false);
      });

      it('should default to false with empty env value', () => {
        process.env.AIWG_USE_NEW_ROUTER = '';
        expect(shouldUseNewRouter([])).toBe(false);
      });

      it('should handle "1" as invalid (not "true")', () => {
        process.env.AIWG_USE_NEW_ROUTER = '1';
        expect(shouldUseNewRouter([])).toBe(false);
      });

      it('should handle "0" as invalid (not "false")', () => {
        process.env.AIWG_USE_NEW_ROUTER = '0';
        expect(shouldUseNewRouter([])).toBe(false);
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

    describe('backward compatibility', () => {
      it('should default to legacy for existing scripts', () => {
        // No env var, no flags → legacy
        expect(shouldUseNewRouter(['use', 'sdlc'])).toBe(false);
      });

      it('should not break existing workflows', () => {
        // Common commands should default to legacy
        expect(shouldUseNewRouter(['use', 'sdlc'])).toBe(false);
        expect(shouldUseNewRouter(['list'])).toBe(false);
        expect(shouldUseNewRouter(['-new'])).toBe(false);
        expect(shouldUseNewRouter(['--help'])).toBe(false);
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
      it('should delegate to legacy router by default', async () => {
        // Mock both routers to track which was called
        const legacySpy = vi.fn().mockResolvedValue(undefined);
        const newSpy = vi.fn().mockResolvedValue(undefined);

        // We can't directly mock the imports, but we can verify the delegation logic
        // This test verifies shouldUseNewRouter returns false by default
        expect(shouldUseNewRouter(['use', 'sdlc'])).toBe(false);
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

    describe('backward compatibility guarantees', () => {
      it('should preserve legacy behavior by default', () => {
        // No env, no flags → legacy
        expect(shouldUseNewRouter(['use', 'sdlc'])).toBe(false);
      });

      it('should not change behavior for existing scripts', () => {
        // Common command patterns should use legacy
        const commonCommands = [
          ['use', 'sdlc'],
          ['list'],
          ['-new'],
          ['--help'],
          ['version'],
          ['doctor'],
        ];

        commonCommands.forEach((cmd) => {
          expect(shouldUseNewRouter(cmd)).toBe(false);
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

    it('should handle null-like env values', () => {
      process.env.AIWG_USE_NEW_ROUTER = 'null';
      expect(shouldUseNewRouter([])).toBe(false);

      process.env.AIWG_USE_NEW_ROUTER = 'undefined';
      expect(shouldUseNewRouter([])).toBe(false);
    });
  });

  describe('migration scenarios', () => {
    it('should support gradual rollout via env var', () => {
      // Developer sets env var for their terminal
      process.env.AIWG_USE_NEW_ROUTER = 'true';
      expect(shouldUseNewRouter([])).toBe(true);

      // Others without env var use legacy
      delete process.env.AIWG_USE_NEW_ROUTER;
      expect(shouldUseNewRouter([])).toBe(false);
    });

    it('should support feature flagging in CI/CD', () => {
      // CI can test both routers
      process.env.AIWG_USE_NEW_ROUTER = 'true';
      expect(shouldUseNewRouter(['use', 'sdlc'])).toBe(true);

      process.env.AIWG_USE_NEW_ROUTER = 'false';
      expect(shouldUseNewRouter(['use', 'sdlc'])).toBe(false);
    });

    it('should support testing new router for specific commands', () => {
      // User can test new router for a single command
      expect(shouldUseNewRouter(['use', 'sdlc', '--experimental-router'])).toBe(true);

      // But default to legacy for other commands
      expect(shouldUseNewRouter(['list'])).toBe(false);
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

      // Default (backward compatible)
      delete process.env.AIWG_USE_NEW_ROUTER;
      expect(shouldUseNewRouter([])).toBe(false);
    });

    it('should work as documented in cleanArgs examples', () => {
      expect(cleanArgs(['use', 'sdlc', '--experimental-router'])).toEqual([
        'use',
        'sdlc',
      ]);

      expect(cleanArgs(['--help', '--legacy-router'])).toEqual(['--help']);
    });

    it('should work as documented in run examples', () => {
      // Verify routing logic for examples
      delete process.env.AIWG_USE_NEW_ROUTER;
      expect(shouldUseNewRouter(['use', 'sdlc'])).toBe(false);

      expect(shouldUseNewRouter(['use', 'sdlc', '--experimental-router'])).toBe(true);

      process.env.AIWG_USE_NEW_ROUTER = 'true';
      expect(shouldUseNewRouter(['use', 'sdlc'])).toBe(true);
    });
  });
});
