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

const argRuns = (() => {
  const i = process.argv.indexOf('--runs');
  if (i >= 0 && i + 1 < process.argv.length) {
    const n = parseInt(process.argv[i + 1], 10);
    if (Number.isInteger(n) && n > 0) return n;
  }
  return null;
})();
const totalRuns = argRuns || parseInt(process.env.N || '50', 10);

console.log(`Tier-3 integration flake gate — ${totalRuns} consecutive runs`);
console.log('='.repeat(60));

const startWall = Date.now();
const durations = [];

for (let i = 1; i <= totalRuns; i++) {
  const runStart = Date.now();
  const result = spawnSync(
    'npx',
    ['vitest', 'run', '--config', 'config/vitest.integration.config.js', '--reporter=dot'],
    { encoding: 'utf-8' },
  );
  const dur = Date.now() - runStart;
  durations.push(dur);

  if (result.status !== 0) {
    console.error(`\n✗ Run ${i}/${totalRuns} FAILED after ${dur}ms`);
    console.error('─── vitest stdout ───');
    console.error(result.stdout);
    console.error('─── vitest stderr ───');
    console.error(result.stderr);
    process.exit(1);
  }

  // Compact one-liner per run: "[i/N] ok in 1450ms"
  process.stdout.write(`[${i}/${totalRuns}] ok in ${dur}ms${i === totalRuns ? '\n' : '\n'}`);
}

const elapsed = ((Date.now() - startWall) / 1000).toFixed(1);
const min = Math.min(...durations);
const max = Math.max(...durations);
const avg = Math.round(durations.reduce((s, d) => s + d, 0) / durations.length);
const median = [...durations].sort((a, b) => a - b)[Math.floor(durations.length / 2)];

console.log('='.repeat(60));
console.log(`✓ ${totalRuns}/${totalRuns} runs passed in ${elapsed}s`);
console.log(`  per-run: min=${min}ms  median=${median}ms  avg=${avg}ms  max=${max}ms`);
