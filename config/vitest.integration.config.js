import { defineConfig } from 'vitest/config';
import path from 'path';

// Tier-3 integration suite (#1174). Spawns aiwg serve as a child process and
// drives its HTTP API + WS bridge against the in-process fake-sandbox harness
// (#1173). Uses single-fork to avoid socket contention.
//
// Mirrors vitest.uat-daemon.config.js shape per the issue body.
export default defineConfig({
  root: path.resolve(__dirname, '..'),
  test: {
    include: [
      'test/integration/serve-sandbox-fake.test.ts',
      'test/integration/serve-pty-bridge.test.ts',
    ],
    exclude: ['node_modules/**', 'dist/**'],
    environment: 'node',

    // Generous timeouts — each test spawns aiwg serve which can take ~1s to boot.
    testTimeout: 60_000,
    hookTimeout: 30_000,

    // Single fork so multiple serve processes don't fight for sockets.
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },

    globals: false,
    clearMocks: true,
    restoreMocks: true,

    reporters: ['default'],
    outputFile: {
      json: './test-results/integration-results.json',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../src'),
    },
    extensions: ['.ts', '.js', '.json'],
  },
});
