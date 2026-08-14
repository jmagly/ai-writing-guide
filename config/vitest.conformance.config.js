/**
 * Vitest config for the executor-v1 conformance test suite.
 *
 * Scoped to test/conformance/executor-v1/ only.
 * Runs in one non-isolated fork to prevent socket conflicts
 * with the registry tests.
 *
 * Usage:
 *   npm run test:conformance                   # fixture mode (CI-safe)
 *   AIWG_CONFORMANCE_LIVE=1 npm run test:conformance  # live mode
 *
 * @see docs/contracts/conformance.md
 * @issue #1183
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  root: path.resolve(import.meta.dirname, '..'),
  test: {
    include: [
      'test/conformance/executor-v1/**/*.test.mjs',
      'test/conformance/fleet-workload-v1/**/*.test.mjs',
      'test/conformance/activity-v1/**/*.test.mjs',
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
    ],
    environment: 'node',

    // One non-isolated fork prevents socket-level conflicts with
    // the registry tests that may share port space
    pool: 'forks',
    maxWorkers: 1,
    fileParallelism: false,
    isolate: false,

    // Conformance tests exercise I/O-bound fixture loading and can be slow
    // in live mode; use a generous timeout
    testTimeout: 60000,
    hookTimeout: 30000,

    // No globals — explicit vitest imports in each test file
    globals: false,
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,

    reporters: ['verbose'],
  },

  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, '../src'),
    },
    extensions: ['.mjs', '.js', '.ts', '.json'],
  },
});
