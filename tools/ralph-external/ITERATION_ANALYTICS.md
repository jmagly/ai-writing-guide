# Iteration Analytics

Tracks quality metrics, detects diminishing returns, and selects best output per REF-015 Self-Refine research.

## Overview

The `IterationAnalytics` class implements iteration improvement tracking for Ralph loops following the Self-Refine research pattern. It addresses the key finding that quality is non-monotonic during iterative refinement - the best output may occur at iteration 2-3 rather than the final iteration.

## Key Features

1. **Quality Tracking** - Records quality score, delta, tokens, cost, and timing per iteration
2. **Diminishing Returns Detection** - Identifies when consecutive iterations show <5% improvement
3. **Best Output Selection** - Selects highest quality iteration, not necessarily the final one
4. **Trajectory Analysis** - Classifies quality trend as improving/stable/declining/fluctuating
5. **Comprehensive Reporting** - Generates JSON analytics and markdown reports

## Research Foundation

Based on REF-015 Self-Refine (Madaan et al., 2023):
- Quality can fluctuate during iterative refinement
- Peak quality often occurs at iteration 2-3
- Final iteration is not always the best
- Selecting best from history improves overall output quality

## Usage

### Basic Usage

```javascript
import { IterationAnalytics } from './iteration-analytics.mjs';

// Create analytics tracker
const analytics = new IterationAnalytics(
  'loop-001',
  'Fix authentication tests',
  {
    storagePath: '.aiwg/ralph/analytics',
    diminishingReturnsThreshold: 0.05,  // 5%
    consecutiveCountThreshold: 2,
    qualityThreshold: 70,
  }
);

// Record each iteration
analytics.recordIteration({
  iteration_number: 1,
  quality_score: 75,
  tokens_used: 1200,
  token_cost_usd: 0.012,
  execution_time_ms: 5000,
  verification_status: 'passed',
  output_snapshot_path: '.aiwg/ralph/loop-001/iteration-1',
  reflections: ['Fixed null check bug'],
});

// Check for diminishing returns
const dr = analytics.detectDiminishingReturns();
if (dr.detected) {
  console.log(`Diminishing returns at iteration ${dr.iteration}`);
}

// Get optimal iteration (highest quality)
const optimal = analytics.getOptimalIteration();
console.log(`Best iteration: ${optimal.iteration_number} (quality: ${optimal.quality_score})`);

// Export analytics
const paths = analytics.export();
console.log(`Report: ${paths.markdown}`);
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `storagePath` | string | `.aiwg/ralph/analytics` | Directory for analytics files |
| `diminishingReturnsThreshold` | number | `0.05` | Percentage threshold (5%) |
| `consecutiveCountThreshold` | number | `2` | Consecutive low-delta iterations |
| `qualityThreshold` | number | `70` | Minimum quality to consider |
| `selectionCriteria` | string | `highest_quality_verified` | Best output selection strategy |

### Selection Criteria

| Criteria | Description |
|----------|-------------|
| `highest_quality_verified` | Highest quality with verification_status='passed' |
| `highest_quality` | Highest quality regardless of verification |
| `most_recent_above_threshold` | Most recent iteration above quality threshold |

## API Reference

### Constructor

```javascript
new IterationAnalytics(loopId, taskDescription, config)
```

Creates a new analytics tracker.

**Parameters:**
- `loopId` (string) - Unique loop identifier
- `taskDescription` (string) - Human-readable task description
- `config` (object) - Configuration options (optional)

### recordIteration(metrics)

Records metrics for a single iteration.

**Parameters:**
- `metrics.iteration_number` (number) - Iteration number
- `metrics.quality_score` (number) - Quality score (0-100)
- `metrics.tokens_used` (number) - Token count
- `metrics.token_cost_usd` (number) - Cost in USD
- `metrics.execution_time_ms` (number) - Execution time
- `metrics.verification_status` (string) - 'passed', 'failed', or 'skipped'
- `metrics.output_snapshot_path` (string) - Path to snapshot
- `metrics.reflections` (array) - Reflection notes (optional)

**Returns:** Complete iteration record with calculated quality_delta

### detectDiminishingReturns()

Detects diminishing returns using consecutive low-delta method.

**Returns:**
```javascript
{
  detected: boolean,
  iteration: number,  // First iteration where detected
  reason: string
}
```

### getTrajectory()

Calculates overall quality trajectory.

**Returns:** String - 'improving', 'stable', 'declining', 'fluctuating', or 'insufficient_data'

### getOptimalIteration(verifiedOnly)

Gets the iteration with highest quality.

**Parameters:**
- `verifiedOnly` (boolean) - Only consider verified iterations (default: true)

**Returns:** IterationMetrics object for optimal iteration

### selectBestIteration()

Selects best iteration based on configuration criteria.

**Returns:**
```javascript
{
  selected: IterationMetrics,
  reason: string
}
```

### generateSummary()

Generates complete analytics summary.

**Returns:** AnalyticsSummary object with all metrics

### generateReport()

Generates markdown report with charts and recommendations.

**Returns:** String - Markdown formatted report

### export()

Exports both JSON analytics and markdown report.

**Returns:**
```javascript
{
  json: string,      // Path to JSON file
  markdown: string   // Path to markdown report
}
```

### static load(filepath)

Loads analytics from saved JSON file.

**Parameters:**
- `filepath` (string) - Path to analytics JSON file

**Returns:** IterationAnalytics instance

### static formatDuration(ms)

Formats milliseconds into human-readable duration.

**Parameters:**
- `ms` (number) - Duration in milliseconds

**Returns:** String - Formatted duration (e.g., "5m 30s")

## Output Formats

### JSON Analytics

Saved to `{storagePath}/{loopId}.json`:

```json
{
  "loop_id": "loop-001",
  "task_description": "Fix authentication tests",
  "start_time": "2026-01-28T10:00:00Z",
  "end_time": "2026-01-28T10:30:00Z",
  "iterations": [
    {
      "iteration_number": 1,
      "timestamp": "2026-01-28T10:05:00Z",
      "quality_score": 75,
      "quality_delta": 0,
      "tokens_used": 1200,
      "token_cost_usd": 0.012,
      "execution_time_ms": 5000,
      "verification_status": "passed",
      "output_snapshot_path": ".aiwg/ralph/loop-001/iteration-1",
      "reflections": ["Fixed null check bug"]
    }
  ],
  "total_iterations": 3,
  "optimal_iteration": 2,
  "final_iteration": 3,
  "selected_iteration": 2,
  "selection_reason": "Highest quality verified iteration (85)",
  "total_tokens": 3600,
  "total_cost_usd": 0.036,
  "total_time_ms": 15000,
  "diminishing_returns_detected": true,
  "diminishing_returns_iteration": 3,
  "quality_trajectory": "improving"
}
```

### Markdown Report

Saved to `{storagePath}/{loopId}-report.md`:

```markdown
# Ralph Loop Analytics: loop-001

**Task:** Fix authentication tests
**Duration:** 2026-01-28T10:00:00Z → 2026-01-28T10:30:00Z

## Summary

| Metric | Value |
|--------|-------|
| Total Iterations | 3 |
| Selected Iteration | 2 |
| Final Quality Score | 80.0 |
| Total Tokens | 3,600 |
| Total Cost | $0.0360 |

## Iteration History

| # | Quality | Delta | Tokens | Cost | Verified |
|---|---------|-------|--------|------|----------|
| 1 | 75.0 | +0.0 | 1200 | $0.0120 | ✓ |
| 2 | 85.0 | +10.0 | 1200 | $0.0120 | ✓ |
| 3 | 80.0 | -5.0 | 1200 | $0.0120 | ✓ |

## Quality Trajectory

```
 85 | ●
 82 |
 80 |  ●
 77 |
 75 |●
    +---
     123
```

**Trajectory:** fluctuating

## Analysis

**Best Output:** Iteration 2 (quality: 85.0)
**Selected:** Iteration 2 (Highest quality verified iteration (85))

**Diminishing Returns Detected:** At iteration 3
2 consecutive iterations with <5% improvement

## Recommendations

- Selected iteration 2 over final iteration 3 due to higher quality
- Consider stopping at iteration 3 to save tokens/cost
```

## Integration with Ralph Loop

The IterationAnalytics class is designed to integrate with Ralph external loop:

```javascript
import { IterationAnalytics } from './iteration-analytics.mjs';

class RalphLoop {
  constructor(config) {
    this.analytics = new IterationAnalytics(
      config.loopId,
      config.objective,
      { storagePath: config.analyticsPath }
    );
  }

  async runIteration(iterationNumber) {
    const startTime = Date.now();

    // Run iteration logic...
    const output = await this.executeIteration();

    // Analyze output quality
    const qualityScore = await this.assessQuality(output);

    // Record analytics
    this.analytics.recordIteration({
      iteration_number: iterationNumber,
      quality_score: qualityScore,
      tokens_used: output.tokensUsed,
      token_cost_usd: output.estimatedCost,
      execution_time_ms: Date.now() - startTime,
      verification_status: output.testsPass ? 'passed' : 'failed',
      output_snapshot_path: output.snapshotPath,
      reflections: output.learnings,
    });

    // Check for diminishing returns
    const dr = this.analytics.detectDiminishingReturns();
    if (dr.detected) {
      console.log(`Diminishing returns detected at iteration ${dr.iteration}`);
      // Optionally stop loop early
    }
  }

  async complete() {
    // Export analytics
    const paths = this.analytics.export();
    console.log(`Analytics report: ${paths.markdown}`);

    // Select best output
    const best = this.analytics.selectBestIteration();
    console.log(`Selected iteration ${best.selected.iteration_number} as best`);

    return best.selected;
  }
}
```

## Testing

Run the test suite:

```bash
node tools/ralph-external/iteration-analytics.test.mjs
```

Run the example:

```bash
node tools/ralph-external/iteration-analytics.example.mjs
```

## References

- **Schema**: `/mnt/dev-inbox/jmagly/ai-writing-guide/agentic/code/addons/ralph/schemas/iteration-analytics.yaml`
- **Research**: `/mnt/dev-inbox/jmagly/ai-writing-guide/.aiwg/research/findings/REF-015-self-refine.md`
- **Issue**: #167 - Iteration analytics implementation
- **Related**:
  - #152 - Iteration analytics tracking
  - #153 - Best output selection
  - #168 - Best output selection (non-monotonic)

## Implementation Notes

1. **Auto-save**: Analytics automatically save after each recordIteration() call
2. **Quality delta**: Calculated automatically from previous iteration
3. **Trajectory thresholds**: Uses 2-point delta threshold for classification
4. **ASCII chart**: 10-row height, verified iterations marked with ●, failed with ○
5. **Diminishing returns**: Percentage-based to handle different quality scales

## Future Enhancements

- [ ] CSV export format
- [ ] Integration with quality-dimensions.yaml schema
- [ ] Support for multiple quality dimensions (not just overall score)
- [ ] Graphical chart generation (SVG/PNG)
- [ ] Real-time streaming updates
- [ ] Comparison across multiple loops
