/**
 * Focused tests for external Ralph status output.
 *
 * Run with: node tools/ralph-external/status-output.test.mjs
 */

import assert from 'assert';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';
import { spawnSync } from 'child_process';

const CLI_PATH = resolve('tools/ralph-external/index.mjs');

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`  ${error.message}`);
    throw error;
  }
}

function createStatusFixture() {
  const root = mkdtempSync(join(tmpdir(), 'ralph-status-'));
  const stateDir = join(root, '.aiwg', 'ralph-external');
  const analyticsDir = join(stateDir, 'analytics');
  mkdirSync(analyticsDir, { recursive: true });

  const loopId = 'lfd-status-loop';
  const state = {
    version: '1.0.0',
    loopId,
    objective: 'Exercise LFD status output',
    completionCriteria: 'status shows budget usage',
    status: 'running',
    maxIterations: 3,
    currentIteration: 2,
    startTime: '2026-07-10T00:00:00.000Z',
    lastUpdate: '2026-07-10T00:05:00.000Z',
    iterations: [
      { status: 'completed', analysis: { completionPercentage: 40 } },
      { status: 'completed', analysis: { completionPercentage: 80 } },
    ],
    accumulatedLearnings: '',
    config: {
      budgetLimits: {
        total_tokens: 2000,
        output_tokens: 500,
        tool_calls: 10,
        spend_usd: 0.5,
        wall_clock_minutes: 10,
      },
      explorationQuota: { enabled: true, k: 3 },
    },
    lfdControls: {
      structuralVariantRequired: false,
      flatCycleCount: 1,
      explorationQuotaK: 3,
    },
  };

  const analytics = {
    loop_id: loopId,
    budget_usage: {
      total_tokens: 1500,
      output_tokens: 300,
      tool_calls: 4,
      spend_usd: 0.12,
      wall_clock_minutes: 2.5,
    },
    budget_exhausted: false,
    flat_cycle_count: 1,
    structural_variant_required: false,
    iterations: [
      {
        iteration_number: 1,
        quality_per_1k_tokens: 50,
        quality_per_minute: 120,
        baseline_comparison: {
          quality_lift: 10,
          token_efficiency_lift: 20,
          speed_efficiency_lift: 40,
        },
      },
      {
        iteration_number: 2,
        quality_per_1k_tokens: 60,
        quality_per_minute: 100,
        baseline_comparison: {
          quality_lift: 25,
          token_efficiency_lift: 30,
          speed_efficiency_lift: 10,
        },
      },
    ],
  };

  writeFileSync(join(stateDir, 'session-state.json'), JSON.stringify(state, null, 2));
  writeFileSync(join(analyticsDir, `${loopId}.json`), JSON.stringify(analytics, null, 2));

  return root;
}

test('ralph-external --status shows LFD budget and efficiency metrics', () => {
  const root = createStatusFixture();

  try {
    const result = spawnSync(process.execPath, [CLI_PATH, '--status'], {
      cwd: root,
      encoding: 'utf8',
    });

    assert.strictEqual(result.status, 0, result.stderr);
    assert.match(result.stdout, /LFD Controls:/);
    assert.match(result.stdout, /Total Tokens:\s+1,500 \/ 2,000 \(75\.0%\)/);
    assert.match(result.stdout, /Output Tokens:\s+300 \/ 500 \(60\.0%\)/);
    assert.match(result.stdout, /Tool Calls:\s+4 \/ 10 \(40\.0%\)/);
    assert.match(result.stdout, /Spend:\s+\$0\.1200 \/ \$0\.5000 \(24\.0%\)/);
    assert.match(result.stdout, /Runtime:\s+2\.50 min \/ 10\.00 min \(25\.0%\)/);
    assert.match(result.stdout, /Best \/ 1K Tok:\s+iteration 2 \(60\.00\)/);
    assert.match(result.stdout, /Best \/ Minute:\s+iteration 1 \(120\.00\)/);
    assert.match(result.stdout, /Random Lift:\s+iteration 2 \(\+25\.00\)/);
    assert.match(result.stdout, /Random TokLift:\s+iteration 2 \(\+30\.00\)/);
    assert.match(result.stdout, /Random SpdLift:\s+iteration 1 \(\+40\.00\)/);
    assert.match(result.stdout, /Structural Var:\s+not required \(1\/3 flat cycles\)/);
  } finally {
    if (existsSync(root)) {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

console.log('\nStatus output tests passed.\n');
