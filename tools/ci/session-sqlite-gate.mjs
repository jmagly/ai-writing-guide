#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const root = resolve(import.meta.dirname, '../..');
const require = createRequire(import.meta.url);
const reportPath = resolve(root, 'test-results/test-results.json');
const requiredFiles = [
  'test/unit/sessions/repository-importer.test.ts',
  'test/unit/cli/handlers/sessions.test.ts',
  ...[
    'claude', 'codex', 'copilot', 'cursor', 'factory', 'generic', 'hermes',
    'openclaw', 'opencode', 'openhuman', 'warp', 'windsurf',
  ].map((provider) => `test/unit/sessions/${provider}-adapter.test.ts`),
];

try {
  require('better-sqlite3');
} catch {
  console.error('SQLite CI preflight failed: better-sqlite3 could not be loaded.');
  process.exit(1);
}

const vitest = resolve(root, 'node_modules/vitest/vitest.mjs');
const result = spawnSync(process.execPath, [
  vitest,
  'run',
  '--config',
  'config/vitest.config.js',
  '--reporter=json',
  ...requiredFiles,
], {
  cwd: root,
  encoding: 'utf8',
  stdio: ['ignore', 'inherit', 'inherit'],
});

if (result.error || !existsSync(reportPath)) {
  console.error('SQLite CI gate failed before a complete machine-readable report was produced.');
  process.exit(result.status || 1);
}

const report = JSON.parse(readFileSync(reportPath, 'utf8'));
const results = new Map(report.testResults.map((entry) => [
  entry.name.replace(`${root}/`, ''),
  entry,
]));
const missing = requiredFiles.filter((file) => !results.has(file));
const skipped = report.testResults.flatMap((entry) =>
  entry.assertionResults
    .filter((assertion) => assertion.status === 'pending' || assertion.status === 'disabled')
    .map((assertion) => `${entry.name.replace(`${root}/`, '')}: ${assertion.fullName}`));
const failed = report.testResults.flatMap((entry) =>
  entry.assertionResults
    .filter((assertion) => assertion.status === 'failed')
    .map((assertion) => `${entry.name.replace(`${root}/`, '')}: ${assertion.fullName}`));

if (missing.length || skipped.length || failed.length || result.status !== 0) {
  if (missing.length) console.error(`Required SQLite suites missing: ${missing.join(', ')}`);
  if (skipped.length) console.error(`Required SQLite tests skipped:\n${skipped.join('\n')}`);
  if (failed.length) console.error(`Required SQLite tests failed:\n${failed.join('\n')}`);
  process.exit(1);
}

console.log(JSON.stringify({
  gate: 'session-sqlite',
  backend: 'better-sqlite3',
  requiredFiles: requiredFiles.length,
  testSuites: report.numTotalTestSuites,
  tests: report.numTotalTests,
  passed: report.numPassedTests,
  skipped: report.numPendingTests,
}, null, 2));
