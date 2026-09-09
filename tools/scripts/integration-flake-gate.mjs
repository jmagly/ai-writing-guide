#!/usr/bin/env node
// 50-run flake gate for the tier-3 integration suite (#1174 cycle 3).
//
// Runs `vitest run --config config/vitest.integration.config.js` N times in
// sequence (default 50) and fails fast on the first non-zero exit. Used to
// confirm the suite is stable before any change to the harness or fake
// sandbox lands.
//
// Usage:
//   node tools/scripts/integration-flake-gate.mjs        # 50 runs
//   N=10 node tools/scripts/integration-flake-gate.mjs   # 10 runs
//   node tools/scripts/integration-flake-gate.mjs --runs 25
//
// Each run is reported on its own line; failures dump the full vitest output
// for debugging.

import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEFAULT_RUNS = 50;
const POSITIVE_INTEGER = /^[1-9]\d*$/;

function parsePositiveInteger(value, source) {
  const text = String(value);
  if (!POSITIVE_INTEGER.test(text)) {
    throw new Error(`${source} must be a positive integer (received ${JSON.stringify(text)})`);
  }
  const parsed = Number(text);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`${source} must be a safe positive integer (received ${JSON.stringify(text)})`);
  }
  return parsed;
}

export function parseRunCount(argv = [], env = {}) {
  const indices = argv.flatMap((arg, index) => (arg === '--runs' ? [index] : []));
  if (indices.length > 1) throw new Error('--runs may be provided only once');
  if (indices.length === 1) {
    const value = argv[indices[0] + 1];
    if (value === undefined) throw new Error('--runs requires a positive integer value');
    return parsePositiveInteger(value, '--runs');
  }
  if (env.N !== undefined) return parsePositiveInteger(env.N, 'N');
  return DEFAULT_RUNS;
}

function writeLine(stream, value = '') {
  stream.write(`${value}\n`);
}

export function runFlakeGate({
  totalRuns,
  spawn = spawnSync,
  now = Date.now,
  stdout = process.stdout,
  stderr = process.stderr,
} = {}) {
  if (!Number.isSafeInteger(totalRuns) || totalRuns <= 0) {
    throw new Error(`totalRuns must be a safe positive integer (received ${JSON.stringify(totalRuns)})`);
  }

  writeLine(stdout, `Tier-3 integration flake gate — ${totalRuns} consecutive runs`);
  writeLine(stdout, '='.repeat(60));

  const startWall = now();
  const durations = [];

  for (let index = 1; index <= totalRuns; index += 1) {
    const runStart = now();
    let result;
    try {
      result = spawn(
        'npx',
        ['vitest', 'run', '--config', 'config/vitest.integration.config.js', '--reporter=dot'],
        { encoding: 'utf-8' },
      );
    } catch (error) {
      result = { status: null, stdout: '', stderr: '', error };
    }
    const durationMs = now() - runStart;
    durations.push(durationMs);

    if (result.status !== 0) {
      writeLine(stderr);
      writeLine(stderr, `✗ Run ${index}/${totalRuns} FAILED after ${durationMs}ms`);
      if (result.error) writeLine(stderr, `─── process error ───\n${result.error.message}`);
      writeLine(stderr, '─── vitest stdout ───');
      writeLine(stderr, result.stdout ?? '');
      writeLine(stderr, '─── vitest stderr ───');
      writeLine(stderr, result.stderr ?? '');
      return {
        ok: false,
        status: 1,
        totalRuns,
        completedRuns: index - 1,
        failedRun: index,
        durations,
      };
    }

    writeLine(stdout, `[${index}/${totalRuns}] ok in ${durationMs}ms`);
  }

  const elapsedMs = now() - startWall;
  const sortedDurations = [...durations].sort((left, right) => left - right);
  const statistics = {
    min: sortedDurations[0],
    median: sortedDurations[Math.floor(sortedDurations.length / 2)],
    average: Math.round(durations.reduce((sum, duration) => sum + duration, 0) / durations.length),
    max: sortedDurations.at(-1),
  };

  writeLine(stdout, '='.repeat(60));
  writeLine(stdout, `✓ ${totalRuns}/${totalRuns} runs passed in ${(elapsedMs / 1000).toFixed(1)}s`);
  writeLine(stdout, `  per-run: min=${statistics.min}ms  median=${statistics.median}ms  avg=${statistics.average}ms  max=${statistics.max}ms`);
  return { ok: true, status: 0, totalRuns, completedRuns: totalRuns, durations, elapsedMs, statistics };
}

export function main({
  argv = process.argv.slice(2),
  env = process.env,
  spawn = spawnSync,
  now = Date.now,
  stdout = process.stdout,
  stderr = process.stderr,
  setExitCode = (status) => { process.exitCode = status; },
} = {}) {
  try {
    const result = runFlakeGate({ totalRuns: parseRunCount(argv, env), spawn, now, stdout, stderr });
    if (!result.ok) setExitCode(result.status);
    return result;
  } catch (error) {
    writeLine(stderr, `integration-flake-gate: ${error.message}`);
    setExitCode(1);
    return { ok: false, status: 1, error: error.message };
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) main();
