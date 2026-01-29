# BestOutputTracker

Tracks quality scores across iterations and selects best output (not just final iteration) per REF-015 Self-Refine research.

**Research Foundation**: Quality can fluctuate during iterative refinement, with peak quality often occurring at iteration 2-3 before degrading.

## Purpose

The BestOutputTracker implements non-monotonic quality handling for Ralph loops, ensuring the highest quality output is selected regardless of when it occurred during iteration.

### Key Insight from REF-015

**Problem**: Naively selecting the final iteration assumes quality monotonically improves.

**Reality**: Quality trajectory is often: Initial (70%) → Peak (85%) → Degraded (83%)

**Solution**: Track all iterations and select the best, not the most recent.

## Features

- **Quality Tracking**: Records multi-dimensional quality scores for each iteration
- **Best Selection**: Maintains running best iteration (not just final)
- **Flexible Criteria**: Multiple selection modes (highest quality, verified only, threshold-based)
- **Snapshot Management**: Preserves artifacts from each iteration
- **Degradation Detection**: Identifies when quality declines after peak
- **Diminishing Returns**: Detects when further iteration provides minimal benefit
- **Analytics**: Comprehensive reporting and CSV export

## Usage

### Basic Usage

```javascript
import { BestOutputTracker } from './best-output-tracker.mjs';

// Initialize tracker
const tracker = new BestOutputTracker('loop-001', {
  storage_path: '.aiwg/ralph/loop-001',
  selection: {
    mode: 'highest_quality_verified',
    threshold: 70,
    require_verification: true,
  },
});

// Record iterations
tracker.recordIteration({
  iteration_number: 1,
  dimensions: {
    validation: 0.7,
    completeness: 0.8,
    correctness: 0.75,
    readability: 0.7,
    efficiency: 0.65,
  },
  artifacts: ['.aiwg/architecture/sad.md'],
  tokens_used: 5000,
  token_cost_usd: 0.05,
  execution_time_ms: 30000,
  verification_status: 'passed',
  reflections: ['Need to improve error handling section'],
});

// Get current best
const best = tracker.getBest();
console.log(`Best iteration so far: ${best.iteration_number} (${best.quality_score}%)`);

// Select final output
const selection = tracker.selectOutput();
console.log(`Selected iteration ${selection.selected_iteration}`);
console.log(`Reason: ${selection.reason}`);

// Generate report
const report = tracker.generateSelectionReport(selection);
console.log(report);
```

### Quality Dimensions

All iterations must provide scores (0-1) for five quality dimensions:

| Dimension | Weight | Description |
|-----------|--------|-------------|
| **validation** | 30% | Passes all validation checks |
| **completeness** | 25% | All required sections present |
| **correctness** | 25% | Accurate information/behavior |
| **readability** | 10% | Clear, well-structured |
| **efficiency** | 10% | Appropriate length/complexity |

Overall quality score = weighted sum × 100 (0-100 scale)

### Selection Modes

**highest_quality** (no verification filter)
```javascript
{
  mode: 'highest_quality',
  threshold: 70,
  require_verification: false,
}
```
Selects highest quality score across all iterations.

**highest_quality_verified** (default)
```javascript
{
  mode: 'highest_quality_verified',
  threshold: 70,
  require_verification: true,
}
```
Selects highest quality among verified iterations. Falls back to unverified if none verified.

**most_recent_above_threshold**
```javascript
{
  mode: 'most_recent_above_threshold',
  threshold: 80,
  require_verification: false,
}
```
Selects most recent iteration exceeding threshold. Useful for "good enough" completion.

## Quality Score Calculation

```javascript
quality_score = Math.round(
  (validation * 0.30) +
  (completeness * 0.25) +
  (correctness * 0.25) +
  (readability * 0.10) +
  (efficiency * 0.10)
) * 100
```

### Custom Weights

Override default weights for domain-specific needs:

```javascript
const tracker = new BestOutputTracker('loop-001', {
  quality_weights: {
    validation: 0.5,    // Emphasize validation
    completeness: 0.3,  // Emphasize completeness
    correctness: 0.2,
    readability: 0.0,   // Ignore readability
    efficiency: 0.0,    // Ignore efficiency
  },
});
```

## API Reference

### Constructor

```javascript
new BestOutputTracker(loopId, config)
```

**Parameters:**
- `loopId` (string): Unique loop identifier
- `config` (object, optional): Configuration
  - `storage_path` (string): Base storage directory
  - `selection` (object): Selection criteria
  - `keep_all_iterations` (boolean): Preserve all snapshots (default: true)
  - `quality_weights` (object): Custom dimension weights

### Methods

#### `recordIteration(params)`

Record iteration with quality metrics and snapshot artifacts.

**Parameters:**
```javascript
{
  iteration_number: number,
  dimensions: {
    validation: number,     // 0-1
    completeness: number,   // 0-1
    correctness: number,    // 0-1
    readability: number,    // 0-1
    efficiency: number,     // 0-1
  },
  artifacts: string[],      // Paths to artifacts
  tokens_used: number,      // Optional
  token_cost_usd: number,   // Optional
  execution_time_ms: number, // Optional
  verification_status: string, // 'passed'|'failed'|'skipped'
  reflections: string[],    // Optional reflection notes
}
```

**Returns:** `IterationRecord`

#### `getBest()`

Get current best iteration record.

**Returns:** `IterationRecord | null`

#### `selectOutput()`

Select output based on configured criteria.

**Returns:** `SelectionResult`
```javascript
{
  selected_iteration: number,
  quality_score: number,
  reason: string,
  final_iteration: number,
  final_quality: number,
  degradation_detected: boolean,
}
```

#### `generateSelectionReport(selection)`

Generate markdown selection report.

**Parameters:**
- `selection` (SelectionResult): Selection result from `selectOutput()`

**Returns:** `string` (Markdown)

#### `detectDiminishingReturns(consecutiveThreshold, deltaThreshold)`

Detect diminishing returns in iteration quality.

**Parameters:**
- `consecutiveThreshold` (number): Number of low-delta iterations (default: 2)
- `deltaThreshold` (number): Delta threshold 0-100 (default: 5)

**Returns:**
```javascript
{
  detected: boolean,
  iteration: number | null,
}
```

#### `getQualityTrajectory()`

Get quality scores across iterations.

**Returns:** `Array<{iteration: number, quality: number}>`

#### `getSummary()`

Get summary statistics.

**Returns:**
```javascript
{
  total_iterations: number,
  average_quality: number,
  best_quality: number,
  worst_quality: number,
  total_tokens: number,
  total_cost_usd: number,
  total_time_ms: number,
}
```

#### `exportCSV()`

Export tracking data as CSV.

**Returns:** `string` (CSV content)

#### `cleanupSnapshots(selectedIteration)`

Remove snapshots except selected iteration.

**Parameters:**
- `selectedIteration` (number): Iteration to keep

## Example Scenarios

### Scenario 1: Quality Degradation

```javascript
// Iteration 1: 72%
tracker.recordIteration({
  iteration_number: 1,
  dimensions: { validation: 0.7, completeness: 0.72, ... },
  artifacts: ['output.md'],
});

// Iteration 2: 85% (peak)
tracker.recordIteration({
  iteration_number: 2,
  dimensions: { validation: 0.87, completeness: 0.85, ... },
  artifacts: ['output.md'],
  verification_status: 'passed',
});

// Iteration 3: 75% (degraded)
tracker.recordIteration({
  iteration_number: 3,
  dimensions: { validation: 0.75, completeness: 0.75, ... },
  artifacts: ['output.md'],
  verification_status: 'passed',
});

const selection = tracker.selectOutput();
// Result: selected_iteration = 2 (not 3)
//         degradation_detected = true
//         reason = "Highest verified quality: 85%"
```

### Scenario 2: Diminishing Returns

```javascript
// 70 → 75 (+5%) → 77 (+2%) → 78 (+1%)
for (let i = 1; i <= 4; i++) {
  tracker.recordIteration({
    iteration_number: i,
    dimensions: calculateDimensions(70 + (i * 2.5)),
    artifacts: ['output.md'],
  });
}

const diminishing = tracker.detectDiminishingReturns(2, 5);
// Result: detected = true, iteration = 3
// Recommendation: Stop early, minimal benefit from further iteration
```

### Scenario 3: Verification Required

```javascript
// All iterations fail verification
for (let i = 1; i <= 3; i++) {
  tracker.recordIteration({
    iteration_number: i,
    dimensions: { ... },
    artifacts: ['output.md'],
    verification_status: 'failed',
  });
}

const selection = tracker.selectOutput();
// Result: Falls back to highest quality despite no verified iterations
//         reason = "Highest quality (no verified iterations): XX%"
```

## Integration with Ralph Loop

```javascript
import { BestOutputTracker } from './best-output-tracker.mjs';
import { OutputAnalyzer } from './output-analyzer.mjs';

async function runRalphLoop(objective, criteria) {
  const tracker = new BestOutputTracker('loop-001');
  const analyzer = new OutputAnalyzer();

  for (let i = 1; i <= maxIterations; i++) {
    // Run iteration
    const result = await runClaudeSession(objective);

    // Analyze output
    const analysis = await analyzer.analyze({
      stdoutPath: result.stdout,
      stderrPath: result.stderr,
      exitCode: result.exitCode,
      context: { objective, criteria },
    });

    // Calculate quality dimensions from analysis
    const dimensions = calculateQualityDimensions(analysis);

    // Record iteration
    tracker.recordIteration({
      iteration_number: i,
      dimensions,
      artifacts: analysis.artifactsModified,
      tokens_used: analysis.tokensUsed,
      verification_status: analysis.success ? 'passed' : 'failed',
    });

    // Check for completion or diminishing returns
    if (analysis.completed && analysis.success) {
      break;
    }

    const diminishing = tracker.detectDiminishingReturns();
    if (diminishing.detected) {
      console.log('Diminishing returns detected, stopping early');
      break;
    }
  }

  // Select best output
  const selection = tracker.selectOutput();
  console.log(`Selected iteration ${selection.selected_iteration}`);

  // Generate report
  const report = tracker.generateSelectionReport(selection);
  writeFileSync('.aiwg/ralph/selection-report.md', report);

  return selection;
}
```

## Storage Structure

```
.aiwg/ralph/{loop_id}/
├── iterations/
│   ├── iteration-001/
│   │   ├── sad.md
│   │   └── adrs/
│   ├── iteration-002/
│   │   ├── sad.md
│   │   └── adrs/
│   └── iteration-003/
│       ├── sad.md
│       └── adrs/
├── best-output-tracking.json
└── selection-report.md
```

### Tracking File Format

```json
{
  "loop_id": "loop-001",
  "config": {
    "storage_path": ".aiwg/ralph/loop-001",
    "selection": {
      "mode": "highest_quality_verified",
      "threshold": 70,
      "require_verification": true
    },
    "keep_all_iterations": true,
    "quality_weights": {
      "validation": 0.30,
      "completeness": 0.25,
      "correctness": 0.25,
      "readability": 0.10,
      "efficiency": 0.10
    }
  },
  "iterations": [
    {
      "iteration_number": 1,
      "timestamp": "2026-01-28T10:00:00Z",
      "quality_score": 72,
      "quality_delta": null,
      "dimensions": {
        "validation": 0.7,
        "completeness": 0.72,
        "correctness": 0.73,
        "readability": 0.72,
        "efficiency": 0.70
      },
      "tokens_used": 5000,
      "token_cost_usd": 0.05,
      "execution_time_ms": 30000,
      "verification_status": "passed",
      "snapshot_path": ".aiwg/ralph/loop-001/iterations/iteration-001",
      "artifacts": [
        ".aiwg/ralph/loop-001/iterations/iteration-001/sad.md"
      ],
      "reflections": []
    }
  ],
  "best_iteration_number": 2,
  "last_updated": "2026-01-28T10:15:00Z"
}
```

## Report Example

```markdown
# Output Selection Report

**Loop ID**: loop-001
**Total Iterations**: 3
**Selected Iteration**: 2

## Summary

| Metric | Value |
|--------|-------|
| Selected Iteration | 2 |
| Selected Quality | 85% |
| Final Iteration | 3 |
| Final Quality | 83% |
| Degradation Detected | Yes |

## Quality Scores

| Iteration | Quality | Delta | Tokens | Cost | Verified |
|-----------|---------|-------|--------|------|----------|
| 1 | 72% | -% | 5000 | $0.0500 | ✓ |
| 2 ✓ | 85% | +13.0% | 6000 | $0.0600 | ✓ |
| 3 | 83% | -2.0% | 5500 | $0.0550 | ✓ |

## Selection Rationale

**Selected**: Iteration 2
**Reason**: Highest verified quality: 85%

### Degradation Detected

Quality degraded from iteration 2 (85%) to final iteration 3 (83%). Selected best output instead of final.

## Quality Trajectory

```
Iteration 1: ████████████████████████████         72%
Iteration 2: ████████████████████████████████████ 85% ← SELECTED
Iteration 3: ███████████████████████████████      83%
```

## Artifacts Applied

- .aiwg/ralph/loop-001/iterations/iteration-002/sad.md
- .aiwg/ralph/loop-001/iterations/iteration-002/adrs/001-auth.md

## Recommendations

- Quality degraded by 2% in later iterations
- Consider setting max iterations to avoid over-refinement
- Optimal iteration count for this task: ~2
```

## References

- **Schema**: `@agentic/code/addons/ralph/schemas/iteration-analytics.yaml`
- **Research**: `@.aiwg/research/findings/REF-015-self-refine.md`
- **Rules**: `@.claude/rules/best-output-selection.md`
- **Issue**: #168

## See Also

- `state-manager.mjs` - Loop state persistence
- `output-analyzer.mjs` - Output quality analysis
- `snapshot-manager.mjs` - Artifact snapshots
