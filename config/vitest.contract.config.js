import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  root: path.resolve(__dirname, '..'),
  test: {
    include: [
      'test/contract/**/*.test.mjs',
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
    ],
    environment: 'node',
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    globals: false,
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,
    reporters: ['verbose'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../src'),
    },
    extensions: ['.mjs', '.js', '.ts', '.json'],
  },
});
