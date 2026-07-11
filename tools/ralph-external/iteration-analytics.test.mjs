/**
 * Basic tests for IterationAnalytics
 *
 * Run with: node tools/ralph-external/iteration-analytics.test.mjs
 */

import { IterationAnalytics } from './iteration-analytics.mjs';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import assert from 'assert';

const TEST_DIR = '.aiwg/ralph/analytics-test';

function cleanup() {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

function setup() {
  cleanup();
  mkdirSync(TEST_DIR, { recursive: true });
}

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

// Test: Basic initialization
test('IterationAnalytics initializes correctly', () => {
  setup();
  const analytics = new IterationAnalytics(
    'test-loop-001',
    'Test task',
    { storagePath: TEST_DIR }
  );

  assert.strictEqual(analytics.loopId, 'test-loop-001');
  assert.strictEqual(analytics.taskDescription, 'Test task');
  assert.strictEqual(analytics.iterations.length, 0);
});

// Test: Record iteration
test('recordIteration() tracks metrics correctly', () => {
  setup();
  const analytics = new IterationAnalytics(
    'test-loop-002',
    'Test task',
    { storagePath: TEST_DIR }
  );

  const record = analytics.recordIteration({
    iteration_number: 1,
    quality_score: 75,
    tokens_used: 1000,
    token_cost_usd: 0.01,
    execution_time_ms: 5000,
    verification_status: 'passed',
    output_snapshot_path: '/path/to/snapshot',
  });

  assert.strictEqual(record.iteration_number, 1);
  assert.strictEqual(record.quality_score, 75);
  assert.strictEqual(record.quality_delta, 0); // First iteration
  assert.strictEqual(analytics.iterations.length, 1);
});

// Test: Quality delta calculation
test('Quality delta calculated correctly', () => {
  setup();
  const analytics = new IterationAnalytics(
    'test-loop-003',
    'Test task',
    { storagePath: TEST_DIR }
  );

  analytics.recordIteration({
    iteration_number: 1,
    quality_score: 70,
    tokens_used: 1000,
    token_cost_usd: 0.01,
    execution_time_ms: 5000,
    verification_status: 'passed',
    output_snapshot_path: '/path/1',
  });

  const record2 = analytics.recordIteration({
    iteration_number: 2,
    quality_score: 85,
    tokens_used: 1000,
    token_cost_usd: 0.01,
    execution_time_ms: 5000,
    verification_status: 'passed',
    output_snapshot_path: '/path/2',
  });

  assert.strictEqual(record2.quality_delta, 15); // 85 - 70
});

// Test: Diminishing returns detection
test('detectDiminishingReturns() detects consecutive low deltas', () => {
  setup();
  const analytics = new IterationAnalytics(
    'test-loop-004',
    'Test task',
    {
      storagePath: TEST_DIR,
      diminishingReturnsThreshold: 0.05,
      consecutiveCountThreshold: 2,
    }
  );

  // First iteration: 70
  analytics.recordIteration({
    iteration_number: 1,
    quality_score: 70,
    tokens_used: 1000,
    token_cost_usd: 0.01,
    execution_time_ms: 5000,
    verification_status: 'passed',
    output_snapshot_path: '/path/1',
  });

  // Second iteration: 72 (delta: +2, 2.86% improvement - below 5%)
  analytics.recordIteration({
    iteration_number: 2,
    quality_score: 72,
    tokens_used: 1000,
    token_cost_usd: 0.01,
    execution_time_ms: 5000,
    verification_status: 'passed',
    output_snapshot_path: '/path/2',
  });

  // Third iteration: 73 (delta: +1, 1.39% improvement - below 5%)
  analytics.recordIteration({
    iteration_number: 3,
    quality_score: 73,
    tokens_used: 1000,
    token_cost_usd: 0.01,
    execution_time_ms: 5000,
    verification_status: 'passed',
    output_snapshot_path: '/path/3',
  });

  const result = analytics.detectDiminishingReturns();
  assert.strictEqual(result.detected, true);
  assert.strictEqual(result.iteration, 3);
});

// Test: Quality trajectory
test('getTrajectory() calculates trajectory correctly', () => {
  setup();
  const analytics = new IterationAnalytics(
    'test-loop-005',
    'Test task',
    { storagePath: TEST_DIR }
  );

  // Improving trajectory
  [70, 80, 90, 95].forEach((score, i) => {
    analytics.recordIteration({
      iteration_number: i + 1,
      quality_score: score,
      tokens_used: 1000,
      token_cost_usd: 0.01,
      execution_time_ms: 5000,
      verification_status: 'passed',
      output_snapshot_path: `/path/${i + 1}`,
    });
  });

  const trajectory = analytics.getTrajectory();
  assert.strictEqual(trajectory, 'improving');
});

// Test: Best output selection
test('getOptimalIteration() returns highest quality', () => {
  setup();
  const analytics = new IterationAnalytics(
    'test-loop-006',
    'Test task',
    { storagePath: TEST_DIR, qualityThreshold: 70 }
  );

  // Scores: 70, 85, 80 (peak at iteration 2)
  analytics.recordIteration({
    iteration_number: 1,
    quality_score: 70,
    tokens_used: 1000,
    token_cost_usd: 0.01,
    execution_time_ms: 5000,
    verification_status: 'passed',
    output_snapshot_path: '/path/1',
  });

  analytics.recordIteration({
    iteration_number: 2,
    quality_score: 85,
    tokens_used: 1000,
    token_cost_usd: 0.01,
    execution_time_ms: 5000,
    verification_status: 'passed',
    output_snapshot_path: '/path/2',
  });

  analytics.recordIteration({
    iteration_number: 3,
    quality_score: 80,
    tokens_used: 1000,
    token_cost_usd: 0.01,
    execution_time_ms: 5000,
    verification_status: 'passed',
    output_snapshot_path: '/path/3',
  });

  const optimal = analytics.getOptimalIteration();
  assert.strictEqual(optimal.iteration_number, 2);
  assert.strictEqual(optimal.quality_score, 85);
});

// Test: Summary generation
test('generateSummary() includes all required fields', () => {
  setup();
  const analytics = new IterationAnalytics(
    'test-loop-007',
    'Test task description',
    { storagePath: TEST_DIR }
  );

  analytics.recordIteration({
    iteration_number: 1,
    quality_score: 75,
    tokens_used: 1000,
    token_cost_usd: 0.01,
    execution_time_ms: 5000,
    verification_status: 'passed',
    output_snapshot_path: '/path/1',
  });

  const summary = analytics.generateSummary();

  assert.strictEqual(summary.loop_id, 'test-loop-007');
  assert.strictEqual(summary.task_description, 'Test task description');
  assert.strictEqual(summary.total_iterations, 1);
  assert.strictEqual(summary.total_tokens, 1000);
  assert.strictEqual(summary.total_cost_usd, 0.01);
  assert.strictEqual(summary.total_time_ms, 5000);
  assert.ok(summary.quality_trajectory);
});

// Test: Report generation
test('generateReport() produces markdown', () => {
  setup();
  const analytics = new IterationAnalytics(
    'test-loop-008',
    'Test task',
    { storagePath: TEST_DIR }
  );

  analytics.recordIteration({
    iteration_number: 1,
    quality_score: 75,
    tokens_used: 1000,
    token_cost_usd: 0.01,
    execution_time_ms: 5000,
    verification_status: 'passed',
    output_snapshot_path: '/path/1',
  });

  const report = analytics.generateReport();

  assert.ok(report.includes('# Ralph Loop Analytics'));
  assert.ok(report.includes('test-loop-008'));
  assert.ok(report.includes('## Summary'));
  assert.ok(report.includes('## Iteration History'));
  assert.ok(report.includes('Quality / 1K Tokens'));
  assert.ok(report.includes('Quality / Minute'));
  assert.ok(report.includes('Lift vs Random'));
  assert.ok(report.includes('## Quality Trajectory'));
  assert.ok(report.includes('## Recommendations'));
});

test('baseline comparison records lift over random walk', () => {
  setup();
  const analytics = new IterationAnalytics(
    'test-loop-baseline',
    'Test task',
    { storagePath: TEST_DIR }
  );

  const record = analytics.recordIteration({
    iteration_number: 1,
    quality_score: 80,
    tokens_used: 1000,
    token_cost_usd: 0.01,
    tool_calls: 2,
    execution_time_ms: 60000,
    verification_status: 'passed',
    output_snapshot_path: '/path/1',
    random_walk_baseline: {
      quality_score: 50,
      tokens_used: 2000,
      tool_calls: 5,
      execution_time_ms: 120000,
      source: 'synthetic-fixture',
    },
  });

  assert.strictEqual(record.baseline_comparison.baseline_type, 'random_walk');
  assert.strictEqual(record.baseline_comparison.source, 'synthetic-fixture');
  assert.strictEqual(record.baseline_comparison.quality_lift, 30);
  assert.strictEqual(record.baseline_comparison.quality_lift_pct, 0.6);
  assert.strictEqual(record.baseline_comparison.token_efficiency_lift, 55);
  assert.strictEqual(record.baseline_comparison.speed_efficiency_lift, 55);
  assert.strictEqual(record.baseline_comparison.tool_call_savings, 3);

  const summary = analytics.generateSummary();
  assert.strictEqual(summary.baseline_comparison.count, 1);
  assert.strictEqual(summary.baseline_comparison.best_quality_lift, 30);

  const report = analytics.generateReport();
  assert.ok(report.includes('Best Lift Over Random Baseline'));
  assert.ok(report.includes('Best Token-Efficiency Lift Over Random Baseline'));
  assert.ok(report.includes('Best Speed-Efficiency Lift Over Random Baseline'));
  assert.ok(report.includes('Token Lift vs Random'));
  assert.ok(report.includes('Speed Lift vs Random'));
  assert.ok(report.includes('| 1 | 80.0 | +0.0 | 1000 | 80.00 | 80.00 | 30.00 | 55.00 | 55.00 |'));
});

// Test: Export
test('export() creates both JSON and Markdown files', () => {
  setup();
  const analytics = new IterationAnalytics(
    'test-loop-009',
    'Test task',
    { storagePath: TEST_DIR }
  );

  analytics.recordIteration({
    iteration_number: 1,
    quality_score: 75,
    tokens_used: 1000,
    token_cost_usd: 0.01,
    execution_time_ms: 5000,
    verification_status: 'passed',
    output_snapshot_path: '/path/1',
  });

  const paths = analytics.export();

  assert.ok(existsSync(paths.json));
  assert.ok(existsSync(paths.markdown));
  assert.ok(paths.json.endsWith('.json'));
  assert.ok(paths.markdown.endsWith('.md'));
});

// Test: Load from file
test('load() restores analytics from JSON', () => {
  setup();
  const analytics = new IterationAnalytics(
    'test-loop-010',
    'Test task',
    { storagePath: TEST_DIR }
  );

  analytics.recordIteration({
    iteration_number: 1,
    quality_score: 75,
    tokens_used: 1000,
    token_cost_usd: 0.01,
    execution_time_ms: 5000,
    verification_status: 'passed',
    output_snapshot_path: '/path/1',
  });

  const jsonPath = analytics.saveAnalytics();
  const loaded = IterationAnalytics.load(jsonPath);

  assert.strictEqual(loaded.loopId, 'test-loop-010');
  assert.strictEqual(loaded.taskDescription, 'Test task');
  assert.strictEqual(loaded.iterations.length, 1);
  assert.strictEqual(loaded.iterations[0].quality_score, 75);
});

// Run all tests
console.log('\n=== Running IterationAnalytics Tests ===\n');

try {
  test('IterationAnalytics initializes correctly', () => {
    setup();
    const analytics = new IterationAnalytics(
      'test-loop-001',
      'Test task',
      { storagePath: TEST_DIR }
    );

    assert.strictEqual(analytics.loopId, 'test-loop-001');
    assert.strictEqual(analytics.taskDescription, 'Test task');
    assert.strictEqual(analytics.iterations.length, 0);
  });

  test('recordIteration() tracks metrics correctly', () => {
    setup();
    const analytics = new IterationAnalytics(
      'test-loop-002',
      'Test task',
      { storagePath: TEST_DIR }
    );

    const record = analytics.recordIteration({
      iteration_number: 1,
      quality_score: 75,
      tokens_used: 1000,
      token_cost_usd: 0.01,
      execution_time_ms: 5000,
      verification_status: 'passed',
      output_snapshot_path: '/path/to/snapshot',
    });

    assert.strictEqual(record.iteration_number, 1);
    assert.strictEqual(record.quality_score, 75);
    assert.strictEqual(record.quality_delta, 0);
    assert.strictEqual(analytics.iterations.length, 1);
  });

  test('Quality delta calculated correctly', () => {
    setup();
    const analytics = new IterationAnalytics(
      'test-loop-003',
      'Test task',
      { storagePath: TEST_DIR }
    );

    analytics.recordIteration({
      iteration_number: 1,
      quality_score: 70,
      tokens_used: 1000,
      token_cost_usd: 0.01,
      execution_time_ms: 5000,
      verification_status: 'passed',
      output_snapshot_path: '/path/1',
    });

    const record2 = analytics.recordIteration({
      iteration_number: 2,
      quality_score: 85,
      tokens_used: 1000,
      token_cost_usd: 0.01,
      execution_time_ms: 5000,
      verification_status: 'passed',
      output_snapshot_path: '/path/2',
    });

    assert.strictEqual(record2.quality_delta, 15);
  });

  test('detectDiminishingReturns() detects consecutive low deltas', () => {
    setup();
    const analytics = new IterationAnalytics(
      'test-loop-004',
      'Test task',
      {
        storagePath: TEST_DIR,
        diminishingReturnsThreshold: 0.05,
        consecutiveCountThreshold: 2,
      }
    );

    analytics.recordIteration({
      iteration_number: 1,
      quality_score: 70,
      tokens_used: 1000,
      token_cost_usd: 0.01,
      execution_time_ms: 5000,
      verification_status: 'passed',
      output_snapshot_path: '/path/1',
    });

    analytics.recordIteration({
      iteration_number: 2,
      quality_score: 72,
      tokens_used: 1000,
      token_cost_usd: 0.01,
      execution_time_ms: 5000,
      verification_status: 'passed',
      output_snapshot_path: '/path/2',
    });

    analytics.recordIteration({
      iteration_number: 3,
      quality_score: 73,
      tokens_used: 1000,
      token_cost_usd: 0.01,
      execution_time_ms: 5000,
      verification_status: 'passed',
      output_snapshot_path: '/path/3',
    });

    const result = analytics.detectDiminishingReturns();
    assert.strictEqual(result.detected, true);
    assert.strictEqual(result.iteration, 3);
  });

  test('getTrajectory() calculates trajectory correctly', () => {
    setup();
    const analytics = new IterationAnalytics(
      'test-loop-005',
      'Test task',
      { storagePath: TEST_DIR }
    );

    [70, 80, 90, 95].forEach((score, i) => {
      analytics.recordIteration({
        iteration_number: i + 1,
        quality_score: score,
        tokens_used: 1000,
        token_cost_usd: 0.01,
        execution_time_ms: 5000,
        verification_status: 'passed',
        output_snapshot_path: `/path/${i + 1}`,
      });
    });

    const trajectory = analytics.getTrajectory();
    assert.strictEqual(trajectory, 'improving');
  });

  test('getOptimalIteration() returns highest quality', () => {
    setup();
    const analytics = new IterationAnalytics(
      'test-loop-006',
      'Test task',
      { storagePath: TEST_DIR, qualityThreshold: 70 }
    );

    analytics.recordIteration({
      iteration_number: 1,
      quality_score: 70,
      tokens_used: 1000,
      token_cost_usd: 0.01,
      execution_time_ms: 5000,
      verification_status: 'passed',
      output_snapshot_path: '/path/1',
    });

    analytics.recordIteration({
      iteration_number: 2,
      quality_score: 85,
      tokens_used: 1000,
      token_cost_usd: 0.01,
      execution_time_ms: 5000,
      verification_status: 'passed',
      output_snapshot_path: '/path/2',
    });

    analytics.recordIteration({
      iteration_number: 3,
      quality_score: 80,
      tokens_used: 1000,
      token_cost_usd: 0.01,
      execution_time_ms: 5000,
      verification_status: 'passed',
      output_snapshot_path: '/path/3',
    });

    const optimal = analytics.getOptimalIteration();
    assert.strictEqual(optimal.iteration_number, 2);
    assert.strictEqual(optimal.quality_score, 85);
  });

  test('generateSummary() includes all required fields', () => {
    setup();
    const analytics = new IterationAnalytics(
      'test-loop-007',
      'Test task description',
      { storagePath: TEST_DIR }
    );

    analytics.recordIteration({
      iteration_number: 1,
      quality_score: 75,
      tokens_used: 1000,
      token_cost_usd: 0.01,
      execution_time_ms: 5000,
      verification_status: 'passed',
      output_snapshot_path: '/path/1',
    });

    const summary = analytics.generateSummary();

    assert.strictEqual(summary.loop_id, 'test-loop-007');
    assert.strictEqual(summary.task_description, 'Test task description');
    assert.strictEqual(summary.total_iterations, 1);
    assert.strictEqual(summary.total_tokens, 1000);
    assert.strictEqual(summary.total_cost_usd, 0.01);
    assert.strictEqual(summary.total_time_ms, 5000);
  });

  test('generateReport() produces markdown', () => {
    setup();
    const analytics = new IterationAnalytics(
      'test-loop-008',
      'Test task',
      { storagePath: TEST_DIR }
    );

    analytics.recordIteration({
      iteration_number: 1,
      quality_score: 75,
      tokens_used: 1000,
      token_cost_usd: 0.01,
      execution_time_ms: 5000,
      verification_status: 'passed',
      output_snapshot_path: '/path/1',
    });

    const report = analytics.generateReport();

    assert.ok(report.includes('# Ralph Loop Analytics'));
    assert.ok(report.includes('test-loop-008'));
    assert.ok(report.includes('## Summary'));
    assert.ok(report.includes('Quality / 1K Tokens'));
    assert.ok(report.includes('Quality / Minute'));
  });

  test('export() creates both JSON and Markdown files', () => {
    setup();
    const analytics = new IterationAnalytics(
      'test-loop-009',
      'Test task',
      { storagePath: TEST_DIR }
    );

    analytics.recordIteration({
      iteration_number: 1,
      quality_score: 75,
      tokens_used: 1000,
      token_cost_usd: 0.01,
      execution_time_ms: 5000,
      verification_status: 'passed',
      output_snapshot_path: '/path/1',
    });

    const paths = analytics.export();

    assert.ok(existsSync(paths.json));
    assert.ok(existsSync(paths.markdown));
  });

  test('load() restores analytics from JSON', () => {
    setup();
    const analytics = new IterationAnalytics(
      'test-loop-010',
      'Test task',
      { storagePath: TEST_DIR }
    );

    analytics.recordIteration({
      iteration_number: 1,
      quality_score: 75,
      tokens_used: 1000,
      token_cost_usd: 0.01,
      execution_time_ms: 5000,
      verification_status: 'passed',
      output_snapshot_path: '/path/1',
    });

    const jsonPath = analytics.saveAnalytics();
    const loaded = IterationAnalytics.load(jsonPath);

    assert.strictEqual(loaded.loopId, 'test-loop-010');
    assert.strictEqual(loaded.iterations.length, 1);
  });

  test('checkBudgetLimits() detects hard total token exhaustion', () => {
    setup();
    const analytics = new IterationAnalytics(
      'test-loop-011',
      'Budgeted task',
      {
        storagePath: TEST_DIR,
        budgetLimits: { total_tokens: 1500 },
      }
    );

    analytics.recordIteration({
      iteration_number: 1,
      quality_score: 70,
      tokens_used: 1000,
      token_cost_usd: 0.01,
      execution_time_ms: 5000,
      verification_status: 'passed',
      output_snapshot_path: '/path/1',
    });
    analytics.recordIteration({
      iteration_number: 2,
      quality_score: 80,
      tokens_used: 600,
      token_cost_usd: 0.01,
      execution_time_ms: 5000,
      verification_status: 'passed',
      output_snapshot_path: '/path/2',
    });

    const decision = analytics.checkBudgetLimits();
    assert.strictEqual(decision.exhausted, true);
    assert.strictEqual(decision.trigger, 'total_tokens_exhausted');

    const report = analytics.generateBudgetStopReport(decision.trigger);
    assert.strictEqual(report.stop_reason, 'total_tokens_exhausted');
    assert.strictEqual(report.selected_iteration, 2);
    assert.strictEqual(report.budgets.observed.total_tokens, 1600);
  });

  test('checkBudgetLimits() uses schema stop reason names', () => {
    setup();
    const spendAnalytics = new IterationAnalytics(
      'test-loop-011b',
      'Spend task',
      {
        storagePath: TEST_DIR,
        budgetLimits: { spend_usd: 0.01 },
      }
    );

    spendAnalytics.recordIteration({
      iteration_number: 1,
      quality_score: 70,
      tokens_used: 1000,
      token_cost_usd: 0.02,
      execution_time_ms: 5000,
      verification_status: 'failed',
      output_snapshot_path: '/path/1',
    });

    assert.strictEqual(spendAnalytics.checkBudgetLimits().trigger, 'spend_exhausted');

    const timeAnalytics = new IterationAnalytics(
      'test-loop-011c',
      'Time task',
      {
        storagePath: TEST_DIR,
        budgetLimits: { wall_clock_minutes: 0.01 },
      }
    );

    timeAnalytics.recordIteration({
      iteration_number: 1,
      quality_score: 70,
      tokens_used: 1000,
      token_cost_usd: 0.01,
      execution_time_ms: 1000,
      verification_status: 'failed',
      output_snapshot_path: '/path/1',
    });

    assert.strictEqual(timeAnalytics.checkBudgetLimits().trigger, 'wall_clock_exhausted');
  });

  test('checkExplorationQuota() requires structural variant after flat cycles', () => {
    setup();
    const analytics = new IterationAnalytics(
      'test-loop-012',
      'Flat task',
      {
        storagePath: TEST_DIR,
        diminishingReturnsThreshold: 0.05,
        explorationQuota: { enabled: true, k: 2 },
      }
    );

    [70, 71, 71.5].forEach((score, index) => {
      analytics.recordIteration({
        iteration_number: index + 1,
        quality_score: score,
        tokens_used: 1000,
        token_cost_usd: 0.01,
        execution_time_ms: 5000,
        verification_status: 'failed',
        output_snapshot_path: `/path/${index + 1}`,
        experiment: {
          hypothesis: `hypothesis ${index + 1}`,
          expected_failure_mode: 'same failure',
          distinguishing_diagnostic: 'run verifier',
        },
      });
    });

    const decision = analytics.checkExplorationQuota();
    assert.strictEqual(decision.required, true);
    assert.strictEqual(decision.flat_cycle_count, 2);

    const summary = analytics.generateSummary();
    assert.strictEqual(summary.structural_variant_required, true);
    assert.strictEqual(summary.flat_cycle_count, 2);
  });

  test('checkExplorationQuota() is OFF without a declared K — no default is substituted (#1770)', () => {
    setup();

    const recordFlat = (analytics) => {
      [70, 70, 70, 70, 70].forEach((score, index) => {
        analytics.recordIteration({
          iteration_number: index + 1,
          quality_score: score,
          tokens_used: 1000,
          token_cost_usd: 0.01,
          execution_time_ms: 5000,
          verification_status: 'failed',
          output_snapshot_path: `/path/${index + 1}`,
        });
      });
    };

    // Default config: quota off entirely
    const defaults = new IterationAnalytics('quota-default', 'Flat task', { storagePath: TEST_DIR });
    recordFlat(defaults);
    assert.strictEqual(defaults.checkExplorationQuota().required, false);

    // enabled but no K declared: off, and k reported as null (not 3)
    const noK = new IterationAnalytics('quota-no-k', 'Flat task', {
      storagePath: TEST_DIR,
      explorationQuota: { enabled: true },
    });
    recordFlat(noK);
    const noKDecision = noK.checkExplorationQuota();
    assert.strictEqual(noKDecision.required, false);
    assert.strictEqual(noKDecision.k, null);

    // k: 0 means off — must never coerce to a default K
    const zeroK = new IterationAnalytics('quota-zero-k', 'Flat task', {
      storagePath: TEST_DIR,
      explorationQuota: { enabled: true, k: 0 },
    });
    recordFlat(zeroK);
    const zeroKDecision = zeroK.checkExplorationQuota();
    assert.strictEqual(zeroKDecision.required, false);
    assert.strictEqual(zeroKDecision.k, null);
  });

  console.log('\n=== All Tests Passed ===\n');
  cleanup();
} catch (error) {
  console.error('\n=== Test Suite Failed ===\n');
  cleanup();
  process.exit(1);
}
