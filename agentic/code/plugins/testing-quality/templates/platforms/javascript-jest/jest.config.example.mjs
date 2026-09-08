// TODO: review module transforms, environment, scope and justified thresholds.
export default { testMatch: ['<rootDir>/test/**/*.test.js'], collectCoverageFrom: ['src/**/*.js'], coverageReporters: ['json', 'text'], coverageThreshold: { global: { lines: 80, branches: 80, functions: 80, statements: 80 } } };
