#!/usr/bin/env node
/**
 * Example usage of BestOutputTracker
 *
 * Demonstrates quality tracking and best output selection
 * for a typical Ralph loop scenario.
 */

import { BestOutputTracker } from '../best-output-tracker.mjs';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

// Create example artifacts directory
const EXAMPLE_DIR = join(process.cwd(), '.example-ralph');
if (existsSync(EXAMPLE_DIR)) {
  rmSync(EXAMPLE_DIR, { recursive: true, force: true });
}
mkdirSync(EXAMPLE_DIR, { recursive: true });

// Helper to create mock artifact
function createArtifact(iteration, quality) {
  const artifactPath = join(EXAMPLE_DIR, `output-${iteration}.md`);
  const content = `# Architecture Document (Iteration ${iteration})

Quality: ${quality}%

## System Overview

This is the system architecture document generated in iteration ${iteration}.

${iteration === 1 ? '## Known Issues\n- Missing security section\n- Incomplete data flow diagrams' : ''}
${iteration === 2 ? '## Security\n- Authentication using JWT\n- Authorization via RBAC\n\n## Data Flow\n[Complete diagrams]' : ''}
${iteration === 3 ? '## Security\n- Authentication using JWT\n\n## Data Flow\n[Simplified diagrams - some detail lost]' : ''}
`;

  writeFileSync(artifactPath, content);
  return artifactPath;
}

// Simulate quality dimensions based on iteration
function calculateDimensions(iteration) {
  const scenarios = {
    1: { validation: 0.70, completeness: 0.65, correctness: 0.75, readability: 0.70, efficiency: 0.72 },
    2: { validation: 0.87, completeness: 0.88, correctness: 0.85, readability: 0.82, efficiency: 0.85 },
    3: { validation: 0.82, completeness: 0.80, correctness: 0.84, readability: 0.85, efficiency: 0.83 },
  };
  return scenarios[iteration] || scenarios[1];
}

// Main example
async function runExample() {
  console.log('BestOutputTracker Example');
  console.log('========================\n');

  // Initialize tracker
  const tracker = new BestOutputTracker('example-loop-001', {
    storage_path: join(EXAMPLE_DIR, 'tracking'),
    selection: {
      mode: 'highest_quality_verified',
      threshold: 70,
      require_verification: true,
    },
  });

  console.log('Simulating Ralph loop with 3 iterations...\n');

  // Simulate 3 iterations with quality trajectory: 72% → 85% → 83%
  for (let i = 1; i <= 3; i++) {
    console.log(`Iteration ${i}:`);

    const artifactPath = createArtifact(i, i === 1 ? 72 : i === 2 ? 85 : 83);
    const dimensions = calculateDimensions(i);

    const record = tracker.recordIteration({
      iteration_number: i,
      dimensions,
      artifacts: [artifactPath],
      tokens_used: 5000 + (i * 500),
      token_cost_usd: 0.05 + (i * 0.005),
      execution_time_ms: 30000 + (i * 2000),
      verification_status: 'passed',
      reflections: i === 1 ? ['Need to add security section', 'Improve completeness'] : [],
    });

    console.log(`  Quality Score: ${record.quality_score}%`);
    if (record.quality_delta !== null) {
      const sign = record.quality_delta >= 0 ? '+' : '';
      console.log(`  Delta: ${sign}${record.quality_delta.toFixed(1)}%`);
    }
    console.log(`  Verified: ${record.verification_status === 'passed' ? 'Yes' : 'No'}`);

    // Show current best
    const best = tracker.getBest();
    console.log(`  Current Best: Iteration ${best.iteration_number} (${best.quality_score}%)`);
    console.log();
  }

  // Check for diminishing returns
  console.log('Checking for diminishing returns...');
  const diminishing = tracker.detectDiminishingReturns(2, 5);
  if (diminishing.detected) {
    console.log(`  ⚠️  Diminishing returns detected at iteration ${diminishing.iteration}`);
  } else {
    console.log('  ✓ No diminishing returns detected');
  }
  console.log();

  // Select best output
  console.log('Selecting best output...');
  const selection = tracker.selectOutput();

  console.log(`  Selected Iteration: ${selection.selected_iteration}`);
  console.log(`  Quality Score: ${selection.quality_score}%`);
  console.log(`  Final Iteration: ${selection.final_iteration}`);
  console.log(`  Final Quality: ${selection.final_quality}%`);
  console.log(`  Degradation Detected: ${selection.degradation_detected ? 'Yes' : 'No'}`);
  console.log(`  Reason: ${selection.reason}`);
  console.log();

  // Generate report
  console.log('Generating selection report...');
  const report = tracker.generateSelectionReport(selection);
  const reportPath = join(EXAMPLE_DIR, 'selection-report.md');
  writeFileSync(reportPath, report);
  console.log(`  Report saved to: ${reportPath}`);
  console.log();

  // Show summary statistics
  console.log('Summary Statistics:');
  const summary = tracker.getSummary();
  console.log(`  Total Iterations: ${summary.total_iterations}`);
  console.log(`  Average Quality: ${summary.average_quality.toFixed(1)}%`);
  console.log(`  Best Quality: ${summary.best_quality}%`);
  console.log(`  Worst Quality: ${summary.worst_quality}%`);
  console.log(`  Total Tokens: ${summary.total_tokens}`);
  console.log(`  Total Cost: $${summary.total_cost_usd.toFixed(4)}`);
  console.log(`  Total Time: ${(summary.total_time_ms / 1000).toFixed(1)}s`);
  console.log();

  // Export CSV
  console.log('Exporting to CSV...');
  const csv = tracker.exportCSV();
  const csvPath = join(EXAMPLE_DIR, 'tracking.csv');
  writeFileSync(csvPath, csv);
  console.log(`  CSV saved to: ${csvPath}`);
  console.log();

  // Show quality trajectory
  console.log('Quality Trajectory:');
  const trajectory = tracker.getQualityTrajectory();
  for (const point of trajectory) {
    const marker = point.iteration === selection.selected_iteration ? ' ← SELECTED' : '';
    const bar = '█'.repeat(Math.round(point.quality / 100 * 40));
    console.log(`  Iteration ${point.iteration}: ${bar} ${point.quality}%${marker}`);
  }
  console.log();

  // Demonstration of the key insight
  console.log('📊 Key Insight from REF-015 Self-Refine:');
  console.log('=========================================');
  console.log();
  if (selection.degradation_detected) {
    console.log('Quality DEGRADED after peak:');
    console.log(`  Peak: Iteration ${selection.selected_iteration} at ${selection.quality_score}%`);
    console.log(`  Final: Iteration ${selection.final_iteration} at ${selection.final_quality}%`);
    console.log(`  Loss: ${selection.quality_score - selection.final_quality}%`);
    console.log();
    console.log('✓ BestOutputTracker selected peak iteration (not final)');
    console.log('  Without tracking: Would have returned lower quality final output');
    console.log('  With tracking: Returned optimal output from iteration 2');
  } else {
    console.log('Quality improved or remained stable throughout iterations.');
    console.log('Final iteration selected as best output.');
  }

  console.log();
  console.log(`Example complete! Check ${EXAMPLE_DIR} for generated files.`);
}

// Run example
runExample().catch(console.error);
