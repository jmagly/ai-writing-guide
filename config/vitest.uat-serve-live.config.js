import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Vitest config for tier-4 live UAT — `aiwg serve` against a real
 * agentic-sandbox instance (#1176).
 *
 * NOT included in CI — run on demand only:
 *   npm run uat:serve-live
 *
 * Requirements:
 *   - A live agentic-sandbox reachable at AIWG_SANDBOX_ENDPOINT
 *     (default: http://127.0.0.1:8122 if the env var is unset)
 *   - Tests skip cleanly with a clear message when the sandbox is not
 *     reachable, so this config is safe to run in any environment.
 */
export default defineConfig({
  root: path.resolve(import.meta.dirname, '..'),
  test: {
    include: ['test/uat/serve-sandbox-live.uat.mjs', 'test/uat/serve-sandbox-live.uat.ts'],
    environment: 'node',
    globals: false,
    clearMocks: false,
    mockReset: false,
    restoreMocks: false,
    testTimeout: 360_000, // 6 min per test (serve + sandbox roundtrip)
    hookTimeout: 60_000,
    reporters: ['verbose'],
    pool: 'forks',
    maxWorkers: 1,
    fileParallelism: false, // Sequential — one serve at a time
    isolate: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, '../src'),
    },
    extensions: ['.ts', '.mjs', '.js', '.json'],
  },
});
