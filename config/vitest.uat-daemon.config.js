import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Vitest config for live daemon UAT tests (starts a real daemon process).
 *
 * NOT included in CI — run on demand only:
 *   npm run uat:daemon:claude   (claude provider only)
 *   npm run uat:daemon          (all daemon live tests)
 *
 * Requirements:
 *   - claude CLI installed and authenticated
 *   - ANTHROPIC_API_KEY set or equivalent session active
 *   - No existing daemon process on the test socket paths
 */
export default defineConfig({
  root: path.resolve(import.meta.dirname, '..'),
  test: {
    include: ['test/uat/daemon-live-*.uat.mjs'],
    environment: 'node',
    globals: false,
    clearMocks: false,
    mockReset: false,
    restoreMocks: false,
    testTimeout: 360000,   // 6 min per test (daemon + agent session startup)
    hookTimeout: 60000,    // 60s for beforeAll/afterAll (daemon start + stop)
    reporters: ['verbose'],
    pool: 'forks',
    maxWorkers: 1,
    fileParallelism: false, // Sequential — one daemon at a time to avoid socket conflicts
    isolate: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, '../src'),
    },
    extensions: ['.ts', '.mjs', '.js', '.json'],
  },
});
