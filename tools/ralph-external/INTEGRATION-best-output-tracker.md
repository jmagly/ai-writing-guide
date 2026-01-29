# BestOutputTracker Integration Guide

Quick guide for integrating BestOutputTracker into the Ralph external loop.

## Integration Steps

### 1. Import and Initialize

```javascript
// In orchestrator.mjs or main loop
import { BestOutputTracker } from './best-output-tracker.mjs';
import { StateManager } from './state-manager.mjs';
import { OutputAnalyzer } from './output-analyzer.mjs';

// Initialize tracker when starting loop
const state = stateManager.load();
const tracker = new BestOutputTracker(state.loopId, {
  storage_path: join(stateManager.getStateDir(), 'tracking'),
  selection: {
    mode: 'highest_quality_verified',
    threshold: 70,
    require_verification: true,
  },
});
```

### 2. Record After Each Iteration

```javascript
// After iteration completes
const analysis = await outputAnalyzer.analyze({
  stdoutPath: outputPaths.stdout,
  stderrPath: outputPaths.stderr,
  exitCode: result.exitCode,
  context: { objective, criteria },
});

// Convert analysis to quality dimensions
const dimensions = {
  validation: analysis.success ? 0.9 : 0.3,
  completeness: analysis.completionPercentage / 100,
  correctness: analysis.success ? 0.85 : 0.5,
  readability: 0.75, // From code quality checks
  efficiency: 0.8,   // From performance metrics
};

// Record iteration
tracker.recordIteration({
  iteration_number: state.currentIteration,
  dimensions,
  artifacts: analysis.artifactsModified,
  tokens_used: analysis.tokensUsed || 0,
  token_cost_usd: analysis.tokenCost || 0,
  execution_time_ms: Date.now() - iterationStartTime,
  verification_status: analysis.success ? 'passed' : 'failed',
  reflections: analysis.learnings ? [analysis.learnings] : [],
});
```

### 3. Check for Early Stopping

```javascript
// After recording iteration, check diminishing returns
const diminishing = tracker.detectDiminishingReturns(2, 5);
if (diminishing.detected) {
  console.log(`Diminishing returns detected at iteration ${diminishing.iteration}`);
  console.log('Quality improvements are minimal, considering early stop');

  // Optionally stop loop
  if (state.currentIteration >= 3) {
    console.log('Stopping loop early due to diminishing returns');
    break;
  }
}
```

### 4. Select Best Output on Completion

```javascript
// After loop completes
console.log('Selecting best output from all iterations...');
const selection = tracker.selectOutput();

console.log(`Selected iteration ${selection.selected_iteration} with quality ${selection.quality_score}%`);

if (selection.degradation_detected) {
  console.log(`⚠️  Quality degraded from ${selection.quality_score}% to ${selection.final_quality}%`);
  console.log(`   Using iteration ${selection.selected_iteration} instead of final iteration ${selection.final_iteration}`);
}

// Apply selected artifacts
const selectedIteration = tracker.getIteration(selection.selected_iteration);
for (const artifactPath of selectedIteration.artifacts) {
  // Copy from snapshot to working directory
  const destPath = artifactPath.replace('/iterations/iteration-', '/output/');
  cpSync(artifactPath, destPath, { recursive: true });
}
```

### 5. Generate Reports

```javascript
// Generate selection report
const report = tracker.generateSelectionReport(selection);
const reportPath = join(stateManager.getStateDir(), 'selection-report.md');
writeFileSync(reportPath, report);
console.log(`Selection report: ${reportPath}`);

// Export CSV for analysis
const csv = tracker.exportCSV();
const csvPath = join(stateManager.getStateDir(), 'tracking.csv');
writeFileSync(csvPath, csv);

// Show summary
const summary = tracker.getSummary();
console.log('\nLoop Summary:');
console.log(`  Iterations: ${summary.total_iterations}`);
console.log(`  Average Quality: ${summary.average_quality.toFixed(1)}%`);
console.log(`  Best Quality: ${summary.best_quality}%`);
console.log(`  Total Tokens: ${summary.total_tokens}`);
console.log(`  Total Cost: $${summary.total_cost_usd.toFixed(4)}`);
```

### 6. Optional: Cleanup Snapshots

```javascript
// If storage space is a concern, remove non-selected snapshots
if (!tracker.config.keep_all_iterations) {
  console.log('Cleaning up non-selected iteration snapshots...');
  tracker.cleanupSnapshots(selection.selected_iteration);
}
```

## Quality Dimension Mapping

Map OutputAnalyzer results to quality dimensions:

```javascript
function mapAnalysisToQualityDimensions(analysis, verificationResults) {
  return {
    // Validation: Did it pass tests/checks?
    validation: verificationResults.testsPassed ? 0.9 : 0.3,

    // Completeness: How much was accomplished?
    completeness: analysis.completionPercentage / 100,

    // Correctness: Is behavior correct?
    correctness: analysis.success && !analysis.blockers.length ? 0.85 : 0.5,

    // Readability: Code/doc quality
    readability: verificationResults.lintPassed ? 0.8 : 0.6,

    // Efficiency: Performance/size appropriate
    efficiency: verificationResults.performanceOk ? 0.8 : 0.7,
  };
}
```

## Integration with Gitea Tracking

Update Gitea issue with selection result:

```javascript
import { GiteaTracker } from './gitea-tracker.mjs';

const giteaTracker = new GiteaTracker(/* ... */);

// After selection
const comment = `
## Ralph Loop Complete

**Selected Output**: Iteration ${selection.selected_iteration}
**Quality Score**: ${selection.quality_score}%
**Reason**: ${selection.reason}

${selection.degradation_detected ? '⚠️ Quality degraded in later iterations, selected peak output.' : '✓ Quality improved throughout iterations.'}

### Summary
- Total Iterations: ${summary.total_iterations}
- Average Quality: ${summary.average_quality.toFixed(1)}%
- Best Quality: ${summary.best_quality}%
- Total Cost: $${summary.total_cost_usd.toFixed(4)}

See selection report: [selection-report.md](.aiwg/ralph/${state.loopId}/selection-report.md)
`;

await giteaTracker.addComment(comment);
```

## Command Integration

Add to ralph-status command:

```bash
# tools/ralph-external/index.mjs

case 'status':
  const state = stateManager.load();
  if (!state) {
    console.log('No active Ralph loop');
    break;
  }

  // Load tracker
  const tracker = new BestOutputTracker(state.loopId, {
    storage_path: join(stateManager.getStateDir(), 'tracking'),
  });

  console.log('\n📊 Quality Tracking:');
  const summary = tracker.getSummary();
  if (summary.total_iterations > 0) {
    console.log(`  Iterations: ${summary.total_iterations}`);
    console.log(`  Average Quality: ${summary.average_quality.toFixed(1)}%`);
    console.log(`  Best Quality: ${summary.best_quality}%`);
    console.log(`  Current Best: Iteration ${tracker.getBest().iteration_number}`);

    // Show trajectory
    const trajectory = tracker.getQualityTrajectory();
    console.log('\n  Quality Trajectory:');
    for (const point of trajectory) {
      const bar = '█'.repeat(Math.round(point.quality / 100 * 20));
      console.log(`    ${point.iteration}: ${bar} ${point.quality}%`);
    }
  } else {
    console.log('  No iterations recorded yet');
  }
  break;
```

## Configuration Options

Customize for different scenarios:

### High-Stakes (Security, Compliance)
```javascript
{
  selection: {
    mode: 'highest_quality_verified',
    threshold: 90,  // Strict threshold
    require_verification: true,
  },
  quality_weights: {
    validation: 0.5,    // Emphasize validation
    correctness: 0.3,   // Emphasize correctness
    completeness: 0.2,
    readability: 0.0,
    efficiency: 0.0,
  },
}
```

### Fast Iteration (Prototyping)
```javascript
{
  selection: {
    mode: 'most_recent_above_threshold',
    threshold: 70,  // Lower threshold
    require_verification: false,
  },
  keep_all_iterations: false,  // Save space
}
```

### Documentation/Content
```javascript
{
  quality_weights: {
    validation: 0.1,
    completeness: 0.4,   // Emphasize completeness
    correctness: 0.2,
    readability: 0.3,    // Emphasize readability
    efficiency: 0.0,
  },
}
```

## Troubleshooting

### Quality scores always 0
- Check dimension values are 0-1 (not 0-100)
- Verify weights sum to 1.0

### Wrong iteration selected
- Check verification status of iterations
- Review selection mode and threshold
- Inspect quality scores in tracking.json

### Snapshots taking too much space
- Set `keep_all_iterations: false`
- Call `cleanupSnapshots()` after selection
- Use `.gitignore` to exclude `.aiwg/ralph/*/iterations/`

### Diminishing returns not detected
- Adjust `consecutiveThreshold` (default: 2)
- Adjust `deltaThreshold` (default: 5%)
- Check if quality truly plateaued

## See Also

- `best-output-tracker.mjs` - Implementation
- `README-best-output-tracker.md` - Full documentation
- `examples/best-output-example.mjs` - Runnable example
- `@agentic/code/addons/ralph/schemas/iteration-analytics.yaml` - Schema
- `@.aiwg/research/findings/REF-015-self-refine.md` - Research
