import base from './vitest.config.js';

// A measured, bounded library gate. This is not whole-repository coverage:
// CLI subprocesses, external adapters and the legacy source threshold are separate scopes.
export default {
  ...base,
  test: {
    ...base.test,
    include: ['test/unit/addons/test-conformance-*.test.ts'],
    exclude: ['test/unit/addons/test-conformance-cli-platforms.test.ts', 'test/unit/addons/test-conformance-platform-lifecycle.test.ts'],
    coverage: {
      enabled: true, provider: 'v8',
      include: ['agentic/code/addons/testing-quality/lib/**/*.mjs'],
      exclude: [],
      reporter: ['text', 'json', 'json-summary'],
      reportsDirectory: './test-results/testing-quality-coverage',
      thresholds: { lines: 90, statements: 80, branches: 75, functions: 85 },
    },
  },
};
