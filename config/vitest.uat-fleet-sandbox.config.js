import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  root: path.resolve(__dirname, '..'),
  test: {
    include: ['test/uat/fleet-sandbox-live.uat.ts'],
    environment: 'node',
    globals: false,
    testTimeout: 180_000,
    hookTimeout: 60_000,
    reporters: ['verbose'],
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
  },
});
