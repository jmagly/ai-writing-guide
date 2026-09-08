// TODO: review paths and install/version-qualify Vitest and its matching coverage provider separately.
export default { test: { include: ['test/**/*.test.js'], coverage: { provider: 'v8', include: ['src/**/*.js'], reporter: ['json', 'text'], thresholds: { lines: 80, branches: 80, functions: 80, statements: 80 } } } };
