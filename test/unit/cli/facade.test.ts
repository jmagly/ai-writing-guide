/**
 * CLI Facade Tests
 *
 * Tests for the CLI entry point that routes commands through
 * the registry-based router.
 *
 * @source @src/cli/facade.mjs
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { run } from '../../../src/cli/facade.mjs';

describe('CLI Facade', () => {
  describe('run', () => {
    it('should export run function', () => {
      expect(run).toBeDefined();
      expect(typeof run).toBe('function');
    });

    it('should be async', () => {
      // run should return a promise
      const result = run(['--help']);
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('module structure', () => {
    it('should only export run function', async () => {
      const facade = await import('../../../src/cli/facade.mjs');
      const exports = Object.keys(facade);

      expect(exports).toContain('run');
      expect(exports.length).toBe(1);
    });
  });
});
