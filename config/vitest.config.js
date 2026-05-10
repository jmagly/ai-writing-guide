import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  root: path.resolve(__dirname, '..'),
  test: {
    // Test file patterns
    include: [
      'test/**/*.test.ts',
      'test/**/*.spec.ts',
      'test/**/*.test.js',
      'agentic/code/frameworks/*/test/**/*.test.ts',
      'agentic/code/frameworks/*/test/**/*.spec.ts'
    ],

    // Exclude .mjs test files (use node:test runner) and all UAT tests.
    // UAT tests run in their own vitest config to avoid thread-pool conflicts
    // caused by ESM dynamic imports in the stub UAT fixtures.
    // CI runs stub UAT separately via: npm run uat
    //
    // The tools/ralph-external/*.test.mjs and test/unit/ralph/*.test.mjs
    // files also use the node:test runner — see `npm run test:node`.
    // They're outside vitest's include globs already, but listing them
    // here makes the separation explicit (#1210).
    //
    // vscode-extension has its own test runner (`node ./test/runTests.js`)
    // and depends on the `vscode` module which only resolves inside the
    // VS Code Extension Test Runner — never let vitest discover it (#1210).
    exclude: [
      'test/**/*.test.mjs',
      'test/uat/**',
      'tools/ralph-external/**',
      'test/unit/ralph/**',
      'vscode-extension/**',
      'node_modules/**',
      'dist/**'
    ],

    // Environment configuration
    environment: 'node',

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',

      // Coverage targets
      lines: 80,
      functions: 80,
      branches: 70,
      statements: 80,

      // Include/exclude patterns
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/**/index.ts',
        'node_modules/**',
        'dist/**',
        'coverage/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData/**',
        '**/fixtures/**'
      ],

      // Fail build if coverage thresholds not met
      thresholdAutoUpdate: false,
      skipFull: false,
      all: true
    },

    // Test execution configuration
    globals: false, // Use explicit imports for better tree-shaking
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,

    // Timeout configuration
    testTimeout: 30000,
    hookTimeout: 30000,

    // Parallel execution for speed
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        useAtomics: true
      }
    },

    // Reporter configuration
    reporters: ['default'],
    outputFile: {
      json: './test-results/test-results.json'
    }
  },

  // TypeScript support and path aliases
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../src'),
      '@sdlc': path.resolve(__dirname, '../agentic/code/frameworks/sdlc-complete/src'),
      '@global': path.resolve(__dirname, '../src')
    },
    extensions: ['.ts', '.js', '.json']
  }
});
