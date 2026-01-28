/**
 * Example usage of IterationAnalytics
 *
 * Run with: node tools/ralph-external/iteration-analytics.example.mjs
 */

import { IterationAnalytics } from './iteration-analytics.mjs';
import { existsSync, rmSync } from 'fs';

const EXAMPLE_DIR = '.aiwg/ralph/analytics-example';

// Clean up previous run
if (existsSync(EXAMPLE_DIR)) {
  rmSync(EXAMPLE_DIR, { recursive: true, force: true });
}

console.log('=== IterationAnalytics Example ===\n');

// Create analytics tracker
const analytics = new IterationAnalytics(
  'example-loop-001',
  'Implement user authentication with JWT tokens',
  {
    storagePath: EXAMPLE_DIR,
    diminishingReturnsThreshold: 0.05,
    consecutiveCountThreshold: 2,
    qualityThreshold: 70,
  }
);

console.log('1. Created analytics tracker for loop:', analytics.loopId);
console.log('   Task:', analytics.taskDescription);
console.log();

// Simulate Ralph loop iterations with quality scores
const iterations = [
  { score: 65, tokens: 1200, cost: 0.012, time: 4500, verified: 'passed' },
  { score: 78, tokens: 1500, cost: 0.015, time: 5200, verified: 'passed' },
  { score: 85, tokens: 1800, cost: 0.018, time: 6100, verified: 'passed' }, // Peak
  { score: 87, tokens: 1600, cost: 0.016, time: 5800, verified: 'passed' },
  { score: 88, tokens: 1700, cost: 0.017, time: 5900, verified: 'passed' }, // Diminishing returns
  { score: 86, tokens: 1900, cost: 0.019, time: 6400, verified: 'failed' }, // Degradation
];

console.log('2. Recording iterations:\n');

iterations.forEach((iter, index) => {
  const record = analytics.recordIteration({
    iteration_number: index + 1,
    quality_score: iter.score,
    tokens_used: iter.tokens,
    token_cost_usd: iter.cost,
    execution_time_ms: iter.time,
    verification_status: iter.verified,
    output_snapshot_path: `.aiwg/ralph/example/iteration-${index + 1}`,
    reflections: [`Iteration ${index + 1} complete`],
  });

  console.log(`   Iteration ${record.iteration_number}: Quality ${record.quality_score} (delta: ${record.quality_delta >= 0 ? '+' : ''}${record.quality_delta})`);
});

console.log();

// Check for diminishing returns
const diminishingReturns = analytics.detectDiminishingReturns();
console.log('3. Diminishing Returns Analysis:');
console.log(`   Detected: ${diminishingReturns.detected}`);
if (diminishingReturns.detected) {
  console.log(`   First detected at iteration: ${diminishingReturns.iteration}`);
  console.log(`   Reason: ${diminishingReturns.reason}`);
}
console.log();

// Get quality trajectory
const trajectory = analytics.getTrajectory();
console.log('4. Quality Trajectory:', trajectory);
console.log();

// Get optimal iteration
const optimal = analytics.getOptimalIteration(false);
console.log('5. Optimal Iteration:');
console.log(`   Iteration: ${optimal.iteration_number}`);
console.log(`   Quality Score: ${optimal.quality_score}`);
console.log(`   Verification Status: ${optimal.verification_status}`);
console.log();

// Select best iteration based on configuration
const selection = analytics.selectBestIteration();
console.log('6. Best Iteration Selection:');
console.log(`   Selected Iteration: ${selection.selected.iteration_number}`);
console.log(`   Quality Score: ${selection.selected.quality_score}`);
console.log(`   Reason: ${selection.reason}`);
console.log();

// Generate summary
const summary = analytics.generateSummary();
console.log('7. Summary Statistics:');
console.log(`   Total Iterations: ${summary.total_iterations}`);
console.log(`   Total Tokens: ${summary.total_tokens.toLocaleString()}`);
console.log(`   Total Cost: $${summary.total_cost_usd.toFixed(4)}`);
console.log(`   Total Time: ${IterationAnalytics.formatDuration(summary.total_time_ms)}`);
console.log(`   Quality Trajectory: ${summary.quality_trajectory}`);
console.log();

// Export analytics
const paths = analytics.export();
console.log('8. Exported Analytics:');
console.log(`   JSON: ${paths.json}`);
console.log(`   Markdown Report: ${paths.markdown}`);
console.log();

// Show excerpt of markdown report
const report = analytics.generateReport();
const reportLines = report.split('\n');
console.log('9. Markdown Report Preview:');
console.log('   ---');
reportLines.slice(0, 20).forEach(line => console.log('   ' + line));
console.log('   ...');
console.log('   ---');
console.log();

console.log('10. Chart Preview:');
const chart = analytics.generateQualityChart();
chart.split('\n').forEach(line => console.log('    ' + line));
console.log();

// Demonstrate loading from file
console.log('11. Loading from saved file...');
const loaded = IterationAnalytics.load(paths.json);
console.log(`    Loaded loop: ${loaded.loopId}`);
console.log(`    Iterations: ${loaded.iterations.length}`);
console.log();

console.log('=== Example Complete ===');
console.log(`\nCheck ${EXAMPLE_DIR} for generated files.`);
