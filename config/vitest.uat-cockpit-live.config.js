import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Opt-in Cockpit live UAT against a real agentic-sandbox executor (#1617).
 *
 * Run:
 *   npm run uat:cockpit-live
 *
 * Defaults to AIWG_COCKPIT_EXECUTOR_URL, then AIWG_SANDBOX_ENDPOINT, then
 * http://127.0.0.1:8122. The suite skips with a clear reason when unreachable.
 */
export default defineConfig({
  root: path.resolve(import.meta.dirname, '..'),
  test: {
    include: ['test/uat/cockpit-live.uat.ts'],
    environment: 'node',
    globals: false,
    testTimeout: 180_000,
    hookTimeout: 30_000,
    reporters: ['verbose'],
    pool: 'forks',
    maxWorkers: 1,
    fileParallelism: false,
    isolate: false,
  },
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, '../src') },
    extensions: ['.ts', '.mjs', '.js', '.json'],
  },
});
