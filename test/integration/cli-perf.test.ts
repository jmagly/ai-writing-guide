/**
 * CLI startup-performance gate.
 *
 * Asserts the CLI cold-start budget so a regression that adds a heavy
 * top-level import or reintroduces the tsx fork fails CI instead of quietly
 * shipping a 500ms `aiwg --version`.
 *
 * Strategy: discard one cache-cold run, then sandwich every CLI measurement
 * between Node startup baselines. Take the p50 of those paired overheads so
 * shared-runner drift is calibrated at measurement time.
 * Also run with `--trace-exit` and assert no "active handles at exit" warnings
 * — catches the handle-leak class of bug (#918).
 *
 * Budgets (from epic #924 and #923 targets):
 *   `aiwg --version` overhead ≤ 150ms (tight budget, no room for tsx forks)
 *   `aiwg help`     overhead ≤ 750ms under suite load (500ms isolated target)
 *
 * Overridable via env for slow CI machines:
 *   AIWG_PERF_BUDGET_VERSION_MS (default 150)
 *   AIWG_PERF_BUDGET_HELP_MS    (default 750)
 *   AIWG_PERF_SAMPLE_COUNT      (default 7; odd integer >= 3)
 *
 * Phase 5 of the CLI Stabilization Epic (#922).
 */

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import {
  parsePositiveInt,
  summarizePairedTimings,
} from '../helpers/cli-perf-policy.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const ROUTER_PATH = path.join(REPO_ROOT, 'dist', 'src', 'cli', 'router.js');
const BIN_PATH = path.join(REPO_ROOT, 'bin', 'aiwg.mjs');

const missingBuild = !existsSync(ROUTER_PATH);

// #1302: `aiwg --version` now has a package-metadata fast path and is back
// under the original tight budget. `help` still pays router startup cost under
// parallel load, and the default Fortemi index integration adds more packaged
// command/search surface to load, so keep its realistic full-suite budget until
// a separate help-path optimization lands.
const VERSION_BUDGET_MS = parseIntEnv('AIWG_PERF_BUDGET_VERSION_MS', 150);
const HELP_BUDGET_MS = parseIntEnv('AIWG_PERF_BUDGET_HELP_MS', 750);
const SAMPLE_COUNT = parsePositiveInt(process.env.AIWG_PERF_SAMPLE_COUNT, 7, {
  minimum: 3,
  odd: true,
});

function parseIntEnv(name: string, def: number): number {
  return parsePositiveInt(process.env[name], def);
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

function measurePaired(args: string[]) {
  runOnce(args);
  runNodeOnce(['-e', '']);
  return summarizePairedTimings(Array.from({ length: SAMPLE_COUNT }, () => ({
    baselineBeforeMs: runNodeOnce(['-e', '']),
    commandMs: runOnce(args),
    baselineAfterMs: runNodeOnce(['-e', '']),
  })));
}

function logMeasurement(command: string, summary: ReturnType<typeof measurePaired>, budget: number) {
  // eslint-disable-next-line no-console
  console.log(
    `${command}: command p50=${summary.commandMedianMs.toFixed(1)}ms; `
    + `paired node p50=${summary.baselineMedianMs.toFixed(1)}ms; `
    + `overhead p50=${summary.overheadMedianMs.toFixed(1)}ms `
    + `(range ${summary.overheadMinMs.toFixed(1)}-${summary.overheadMaxMs.toFixed(1)}ms, `
    + `n=${SAMPLE_COUNT}, budget ${budget}ms)`,
  );
}

describe.skipIf(missingBuild)('CLI performance gate', () => {
  it(`aiwg --version cold start p50 under ${VERSION_BUDGET_MS}ms`, () => {
    const summary = measurePaired(['--version']);
    logMeasurement('aiwg --version', summary, VERSION_BUDGET_MS);
    expect(summary.overheadMedianMs).toBeLessThan(VERSION_BUDGET_MS);
  }, 20_000);

  it(`aiwg help cold start p50 under ${HELP_BUDGET_MS}ms`, () => {
    const summary = measurePaired(['help']);
    logMeasurement('aiwg help', summary, HELP_BUDGET_MS);
    expect(summary.overheadMedianMs).toBeLessThan(HELP_BUDGET_MS);
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
