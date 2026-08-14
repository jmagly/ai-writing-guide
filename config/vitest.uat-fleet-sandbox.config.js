import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  root: path.resolve(import.meta.dirname, '..'),
  test: {
    include: ['test/uat/fleet-sandbox-live.uat.ts'],
    environment: 'node',
    globals: false,
    testTimeout: 180_000,
    hookTimeout: 60_000,
    reporters: ['verbose', 'junit'],
    outputFile: {
      junit: './test-results/fleet-sandbox-live.junit.xml',
    },
    pool: 'forks',
    maxWorkers: 1,
    fileParallelism: false,
    isolate: false,
  },
});
