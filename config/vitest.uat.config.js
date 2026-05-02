import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Vitest config for stub UAT tests (no real agent invoked — CI-safe).
 *
 * Included in CI via test:ci script.
 * Also runnable on demand: npm run uat
 */
export default defineConfig({
  root: path.resolve(__dirname, '..'),
  test: {
    include: ['test/uat/ralph-external.uat.ts', 'test/uat/daemon-supervisor.test.mjs', 'test/uat/rlm-cli.uat.ts', 'test/uat/aiwg-config-flow.uat.ts', 'test/uat/project-local-flow.uat.ts'],
    exclude: ['test/uat/ralph-live-*.uat.ts'],
    environment: 'node',
    globals: false,
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,
    testTimeout: 120000,
    hookTimeout: 30000,
    reporters: ['verbose'],
    pool: 'forks',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../src'),
    },
    extensions: ['.ts', '.js', '.json'],
  },
});
