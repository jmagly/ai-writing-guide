import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test file patterns
    include: [
      'test/**/*.test.ts',
      'test/**/*.spec.ts',
      'agentic/code/frameworks/*/test/**/*.test.ts',
      'agentic/code/frameworks/*/test/**/*.spec.ts'
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

    // Timeout configuration (MVP: fast feedback)
    testTimeout: 5000,
    hookTimeout: 10000,

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

  // TypeScript support (built-in, no additional config needed)
  resolve: {
    extensions: ['.ts', '.js', '.json']
  }
});
