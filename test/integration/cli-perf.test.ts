/**
 * CLI startup-performance gate.
 *
 * Asserts the CLI cold-start budget so a regression that adds a heavy
 * top-level import or reintroduces the tsx fork fails CI instead of quietly
 * shipping a 500ms `aiwg --version`.
 *
 * Strategy: run `aiwg --version` N times, discard the first run (cache-cold),
 * take the p50 of the remaining warm runs, subtract a Node startup baseline, and assert the CLI overhead is below the budget.
 * Also run with `--trace-exit` and assert no "active handles at exit" warnings
 * — catches the handle-leak class of bug (#918).
 *
 * Budgets (from epic #924 and #923 targets):
 *   `aiwg --version` overhead ≤ 150ms (tight budget, no room for tsx forks)
 *   `aiwg help`     overhead ≤ 1000ms under full-suite load
 *
 * Overridable via env for slow CI machines:
 *   AIWG_PERF_BUDGET_VERSION_MS (default 150)
 *   AIWG_PERF_BUDGET_HELP_MS    (default 1000)
 *
 * Phase 5 of the CLI Stabilization Epic (#922).
 */

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const ROUTER_PATH = path.join(REPO_ROOT, 'dist', 'src', 'cli', 'router.js');
const BIN_PATH = path.join(REPO_ROOT, 'bin', 'aiwg.mjs');

const missingBuild = !existsSync(ROUTER_PATH);

// #1302: `aiwg --version` now has a package-metadata fast path and is back
// under the original tight budget. `help` still pays router startup cost under
// parallel load, so keep its realistic full-suite budget until a separate help-path
// optimization lands.
const VERSION_BUDGET_MS = parseIntEnv('AIWG_PERF_BUDGET_VERSION_MS', 150);
const HELP_BUDGET_MS = parseIntEnv('AIWG_PERF_BUDGET_HELP_MS', 1000);

function parseIntEnv(name: string, def: number): number {
  const raw = process.env[name];
  const n = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : def;
}

function runNodeOnce(args: string[]): number {
  const start = process.hrtime.bigint();
  const result = spawnSync(process.execPath, args, {
    timeout: 5_000,
    stdio: 'ignore',
    env: {
      ...process.env,
      AIWG_LOG_DISABLE: '1',
      NO_UPDATE_NOTIFIER: '1',
      AIWG_NO_UPDATE_CHECK: '1',
    },
  });
  const elapsed = Number(process.hrtime.bigint() - start) / 1_000_000; // ns → ms
  if (result.status !== 0) {
    throw new Error(`CLI exited with status ${result.status} during perf measurement`);
  }
  return elapsed;
}

function runOnce(args: string[]): number {
  return runNodeOnce([BIN_PATH, ...args]);
}

function p50(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

function nodeBaseline(): number {
  runNodeOnce(['-e', '']);
  return p50(Array.from({ length: 5 }, () => runNodeOnce(['-e', ''])));
}

describe.skipIf(missingBuild)('CLI performance gate', () => {
  it(`aiwg --version cold start p50 under ${VERSION_BUDGET_MS}ms`, () => {
    // Discard first run (cache-cold).
    runOnce(['--version']);
    const runs = Array.from({ length: 5 }, () => runOnce(['--version']));
    const median = p50(runs);
    const baseline = nodeBaseline();
    const overhead = Math.max(0, median - baseline);
    // Emit the measurement for CI logs even when the assertion passes.
    // eslint-disable-next-line no-console
    console.log(`aiwg --version p50 = ${median.toFixed(1)}ms; node baseline = ${baseline.toFixed(1)}ms; overhead = ${overhead.toFixed(1)}ms (budget ${VERSION_BUDGET_MS}ms)`);
    expect(overhead).toBeLessThan(VERSION_BUDGET_MS);
  }, 20_000);

  it(`aiwg help cold start p50 under ${HELP_BUDGET_MS}ms`, () => {
    runOnce(['help']);
    const runs = Array.from({ length: 5 }, () => runOnce(['help']));
    const median = p50(runs);
    const baseline = nodeBaseline();
    const overhead = Math.max(0, median - baseline);
    // eslint-disable-next-line no-console
    console.log(`aiwg help p50 = ${median.toFixed(1)}ms; node baseline = ${baseline.toFixed(1)}ms; overhead = ${overhead.toFixed(1)}ms (budget ${HELP_BUDGET_MS}ms)`);
    expect(overhead).toBeLessThan(HELP_BUDGET_MS);
  }, 20_000);

  /**
   * --trace-exit prints "There are still active handles at exit" when the
   * event loop has pending work at process exit. A failure here catches
   * the class of bug from #918 where unawaited promises held the event
   * loop open for minutes.
   */
  it('aiwg --version exits cleanly (no active handles warning)', () => {
    const result = spawnSync(process.execPath, ['--trace-exit', BIN_PATH, '--version'], {
      timeout: 5_000,
      stdio: 'pipe',
      encoding: 'utf-8',
      env: {
        ...process.env,
        AIWG_LOG_DISABLE: '1',
        NO_UPDATE_NOTIFIER: '1',
        AIWG_NO_UPDATE_CHECK: '1',
      },
    });
    expect(result.status).toBe(0);
    expect(result.stderr).not.toMatch(/active handles/i);
    expect(result.stderr).not.toMatch(/timer/i);
  });
});
