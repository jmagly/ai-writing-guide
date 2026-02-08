# regression-performance

Detect performance regressions by comparing benchmarks across versions, analyzing latency/throughput degradation, and providing statistical significance testing.

## Triggers

- "performance regression"
- "check latency"
- "benchmark comparison"
- "detect slowdown"
- "throughput degradation"
- "memory leak"
- "performance analysis"
- "compare performance"

## Purpose

This skill detects performance regressions across software versions by:
- Comparing latency metrics (p50, p95, p99) between baseline and current versions
- Detecting throughput regressions (requests/sec, transactions/sec)
- Identifying memory regressions (heap growth, memory leaks)
- Analyzing resource utilization (CPU, disk I/O, network)
- Running benchmark comparisons with statistical significance testing
- Generating performance regression reports with visualizations

## Behavior

When triggered, this skill:

1. **Identifies baseline version**:
   - Detect last known good version from git tags
   - Load baseline benchmark results
   - Extract performance metrics from monitoring

2. **Runs performance benchmarks**:
   - Execute load tests using k6, Artillery, or wrk
   - Capture latency distributions (p50, p95, p99)
   - Measure throughput (req/s, TPS)
   - Profile memory usage and heap growth
   - Monitor CPU and I/O utilization

3. **Performs statistical comparison**:
   - Calculate delta and percentage change
   - Apply statistical significance tests (t-test, Mann-Whitney U)
   - Determine if degradation exceeds threshold
   - Account for variance and noise

4. **Detects regression patterns**:
   - Latency spikes at specific percentiles
   - Throughput capacity reduction
   - Memory leak indicators (growing heap)
   - CPU saturation points
   - I/O bottlenecks

5. **Generates regression report**:
   - Performance comparison tables
   - Percentile distribution graphs
   - Time-series trend analysis
   - Root cause indicators
   - Recommendations

6. **Logs regression findings**:
   - Create regression register entry
   - Tag commits with performance impact
   - Alert on threshold violations

## Performance Metrics Model

```
┌─────────────────────┐
│   BASELINE v2.3.0   │
├─────────────────────┤
│ p50:  45ms          │
│ p95: 120ms          │
│ p99: 180ms          │
│ RPS: 2500           │
│ Mem: 256MB          │
└─────────────────────┘
         │
         ▼ Compare
┌─────────────────────┐
│   CURRENT v2.4.0    │
├─────────────────────┤
│ p50:  52ms (+15%)   │  ⚠️ REGRESSION
│ p95: 145ms (+21%)   │  ⚠️ REGRESSION
│ p99: 220ms (+22%)   │  ⚠️ REGRESSION
│ RPS: 2100 (-16%)    │  ⚠️ REGRESSION
│ Mem: 312MB (+22%)   │  ⚠️ REGRESSION
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ REGRESSION REPORT   │
│                     │
│ Type: Latency       │
│ Severity: HIGH      │
│ Confidence: 99.5%   │
│ Root Cause: TBD     │
└─────────────────────┘
```

## Metric Categories

### Latency Metrics

| Metric | Description | Threshold | Tool |
|--------|-------------|-----------|------|
| p50 (median) | 50th percentile latency | +10% | k6, Artillery, wrk |
| p95 | 95th percentile latency | +15% | k6, Artillery, wrk |
| p99 | 99th percentile latency | +20% | k6, Artillery, wrk |
| max | Maximum observed latency | +30% | k6, Artillery, wrk |

### Throughput Metrics

| Metric | Description | Threshold | Tool |
|--------|-------------|-----------|------|
| Requests/sec | HTTP requests per second | -10% | k6, wrk, ab |
| Transactions/sec | Business transactions per second | -10% | Custom |
| Bytes/sec | Network throughput | -15% | iperf3, iftop |
| Queries/sec | Database query throughput | -10% | pgbench, sysbench |

### Memory Metrics

| Metric | Description | Threshold | Tool |
|--------|-------------|-----------|------|
| Heap size | JavaScript heap usage | +20% | Node.js heap snapshot |
| RSS | Resident set size | +20% | ps, top |
| Memory growth rate | MB/hour increase | >10 MB/hour | Continuous profiling |
| GC pressure | Garbage collection frequency | +30% | Node.js --trace-gc |

### Resource Metrics

| Metric | Description | Threshold | Tool |
|--------|-------------|-----------|------|
| CPU utilization | Average CPU usage | +20% | mpstat, top |
| Disk I/O wait | I/O wait percentage | +25% | iostat |
| Network bandwidth | Network utilization | +15% | iftop, nethogs |
| File descriptors | Open file handles | +30% | lsof |

## Benchmark Tools Integration

### k6 Load Testing

```javascript
// benchmark.k6.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up
    { duration: '5m', target: 100 },   // Steady state
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(50)<100', 'p(95)<200', 'p(99)<300'],
    'http_req_failed': ['rate<0.01'],
  },
};

export default function () {
  const res = http.get('https://api.example.com/endpoint');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
  sleep(1);
}
```

**Running comparison**:
```bash
# Baseline
k6 run --out json=baseline-results.json benchmark.k6.js

# Current version
k6 run --out json=current-results.json benchmark.k6.js

# Compare
./compare-k6-results.sh baseline-results.json current-results.json
```

### Artillery Load Testing

```yaml
# artillery-config.yml
config:
  target: 'https://api.example.com'
  phases:
    - duration: 120
      arrivalRate: 10
      rampTo: 50
    - duration: 300
      arrivalRate: 50
    - duration: 120
      arrivalRate: 50
      rampTo: 0
  plugins:
    metrics-by-endpoint:
      stripQueryString: true

scenarios:
  - name: "API Performance Test"
    flow:
      - get:
          url: "/api/users"
      - get:
          url: "/api/products"
      - post:
          url: "/api/orders"
          json:
            product_id: 123
            quantity: 2
```

**Running comparison**:
```bash
# Baseline
artillery run --output baseline.json artillery-config.yml

# Current
artillery run --output current.json artillery-config.yml

# Compare
artillery report baseline.json --output baseline-report.html
artillery report current.json --output current-report.html
./compare-artillery-results.sh baseline.json current.json
```

### wrk HTTP Benchmarking

```bash
# Simple throughput test
wrk_benchmark() {
  local version=$1
  local output_file=$2

  wrk -t12 -c400 -d30s \
      --latency \
      --timeout 10s \
      https://api.example.com/endpoint \
      > "$output_file"
}

# Baseline
wrk_benchmark "v2.3.0" "wrk-baseline.txt"

# Current
wrk_benchmark "v2.4.0" "wrk-current.txt"

# Compare
./parse-wrk-results.sh wrk-baseline.txt wrk-current.txt
```

### Apache Bench (ab)

```bash
# Quick regression check
ab_compare() {
  local baseline_version=$1
  local current_version=$2

  echo "=== Baseline ${baseline_version} ==="
  ab -n 10000 -c 100 https://api.example.com/ > ab-baseline.txt

  echo "=== Current ${current_version} ==="
  ab -n 10000 -c 100 https://api.example.com/ > ab-current.txt

  # Extract key metrics
  echo "Comparison:"
  echo "Baseline RPS: $(grep 'Requests per second' ab-baseline.txt | awk '{print $4}')"
  echo "Current RPS: $(grep 'Requests per second' ab-current.txt | awk '{print $4}')"
}
```

### Hyperfine (CLI tool benchmarking)

```bash
# For CLI tool performance
hyperfine \
  --warmup 3 \
  --export-json comparison.json \
  'git checkout v2.3.0 && npm run build && npm test' \
  'git checkout v2.4.0 && npm run build && npm test'
```

## Statistical Significance Testing

### T-Test for Mean Comparison

```typescript
function detectLatencyRegression(
  baseline: number[],
  current: number[]
): RegressionAnalysis {
  const baselineMean = mean(baseline);
  const currentMean = mean(current);
  const delta = currentMean - baselineMean;
  const deltaPercent = (delta / baselineMean) * 100;

  // Perform Welch's t-test
  const tTestResult = welchTTest(baseline, current);

  return {
    metric: 'latency',
    baseline: {
      mean: baselineMean,
      stddev: stddev(baseline),
      n: baseline.length,
    },
    current: {
      mean: currentMean,
      stddev: stddev(current),
      n: current.length,
    },
    delta,
    deltaPercent,
    pValue: tTestResult.pValue,
    isSignificant: tTestResult.pValue < 0.05,
    isRegression: deltaPercent > 10 && tTestResult.pValue < 0.05,
    confidence: 1 - tTestResult.pValue,
  };
}
```

### Mann-Whitney U Test (Non-Parametric)

```typescript
function detectThroughputRegression(
  baseline: number[],
  current: number[]
): RegressionAnalysis {
  const baselineMedian = median(baseline);
  const currentMedian = median(current);
  const delta = currentMedian - baselineMedian;
  const deltaPercent = (delta / baselineMedian) * 100;

  // Use Mann-Whitney U for non-normal distributions
  const uTestResult = mannWhitneyU(baseline, current);

  return {
    metric: 'throughput',
    baseline: {
      median: baselineMedian,
      iqr: iqr(baseline),
      n: baseline.length,
    },
    current: {
      median: currentMedian,
      iqr: iqr(current),
      n: current.length,
    },
    delta,
    deltaPercent,
    pValue: uTestResult.pValue,
    isSignificant: uTestResult.pValue < 0.05,
    isRegression: deltaPercent < -10 && uTestResult.pValue < 0.05,
    confidence: 1 - uTestResult.pValue,
  };
}
```

### Multiple Comparison Correction

```typescript
// Apply Bonferroni correction when testing multiple metrics
function detectMultiMetricRegressions(
  metrics: MetricComparison[],
  familyAlpha: number = 0.05
): RegressionResult[] {
  const adjustedAlpha = familyAlpha / metrics.length;

  return metrics.map(metric => ({
    ...metric,
    adjustedAlpha,
    isSignificantCorrected: metric.pValue < adjustedAlpha,
  }));
}
```

## Threshold Configuration

Configure regression detection thresholds in `.aiwg/config/performance-thresholds.yaml`:

```yaml
performance_thresholds:
  latency:
    p50:
      warning: 10%    # Warn if p50 increases by >10%
      critical: 20%   # Critical if p50 increases by >20%
    p95:
      warning: 15%
      critical: 25%
    p99:
      warning: 20%
      critical: 30%

  throughput:
    requests_per_sec:
      warning: -10%   # Warn if RPS decreases by >10%
      critical: -20%
    transactions_per_sec:
      warning: -10%
      critical: -20%

  memory:
    heap_size:
      warning: 20%
      critical: 40%
    growth_rate:
      warning: 10      # MB/hour
      critical: 25

  resources:
    cpu_utilization:
      warning: 20%
      critical: 40%
    io_wait:
      warning: 25%
      critical: 50%

  statistical:
    significance_level: 0.05  # p-value threshold
    min_sample_size: 100      # Minimum observations
    multiple_comparison_correction: bonferroni
```

## Memory Leak Detection

### Heap Snapshot Comparison

```typescript
interface HeapAnalysis {
  version: string;
  timestamp: string;
  totalSize: number;
  usedSize: number;
  objectCounts: Record<string, number>;
  retainedPaths: RetainedPath[];
}

function detectMemoryLeak(
  baseline: HeapAnalysis,
  current: HeapAnalysis
): MemoryLeakReport {
  const growthRate = (current.usedSize - baseline.usedSize) /
                     (current.timestamp - baseline.timestamp);

  const suspectObjects = Object.keys(current.objectCounts)
    .filter(type => {
      const baseCount = baseline.objectCounts[type] || 0;
      const currCount = current.objectCounts[type];
      const growth = currCount - baseCount;
      return growth > 1000; // >1000 additional objects
    })
    .map(type => ({
      type,
      baseline: baseline.objectCounts[type] || 0,
      current: current.objectCounts[type],
      delta: current.objectCounts[type] - (baseline.objectCounts[type] || 0),
    }));

  return {
    isLeak: growthRate > 10 * 1024 * 1024, // >10MB/hour
    growthRate,
    suspectObjects,
    recommendation: suspectObjects.length > 0
      ? `Investigate ${suspectObjects[0].type} accumulation`
      : 'Run extended profiling session',
  };
}
```

### Continuous Memory Monitoring

```bash
#!/bin/bash
# monitor-memory-regression.sh

monitor_memory() {
  local duration_minutes=$1
  local interval_seconds=$2
  local output_file=$3

  echo "timestamp,rss,heap_used,heap_total,external" > "$output_file"

  for i in $(seq 1 $((duration_minutes * 60 / interval_seconds))); do
    local stats=$(curl -s http://localhost:3000/metrics/memory)
    echo "$(date +%s),$stats" >> "$output_file"
    sleep "$interval_seconds"
  done
}

# Run for 30 minutes, sample every 10 seconds
monitor_memory 30 10 memory-profile.csv

# Analyze for leaks
python analyze-memory-trend.py memory-profile.csv
```

## Performance Regression Report Format

### Executive Summary

```markdown
# Performance Regression Report

**Project**: my-api-service
**Analysis Date**: 2024-01-25
**Baseline Version**: v2.3.0
**Current Version**: v2.4.0
**Test Duration**: 10 minutes
**Load Profile**: 100 concurrent users, steady state

## Executive Summary

**Regression Detected**: YES (HIGH severity)
**Metrics Affected**: 5 of 8 metrics show significant degradation
**Statistical Confidence**: 99.5%
**Recommendation**: DO NOT DEPLOY - requires investigation

| Category | Status | Details |
|----------|--------|---------|
| Latency | ⚠️ REGRESSION | p50: +15%, p95: +21%, p99: +22% |
| Throughput | ⚠️ REGRESSION | -16% requests/sec |
| Memory | ⚠️ REGRESSION | +22% heap, potential leak |
| CPU | ✅ PASS | Within acceptable range |
| I/O | ✅ PASS | No significant change |
```

### Detailed Metrics Comparison

```markdown
## Latency Metrics

| Metric | Baseline | Current | Delta | % Change | p-value | Regression? |
|--------|----------|---------|-------|----------|---------|-------------|
| p50 | 45ms | 52ms | +7ms | +15.6% | 0.001 | ⚠️ YES |
| p75 | 78ms | 92ms | +14ms | +17.9% | 0.002 | ⚠️ YES |
| p90 | 105ms | 128ms | +23ms | +21.9% | 0.001 | ⚠️ YES |
| p95 | 120ms | 145ms | +25ms | +20.8% | 0.001 | ⚠️ YES |
| p99 | 180ms | 220ms | +40ms | +22.2% | 0.001 | ⚠️ YES |
| max | 450ms | 580ms | +130ms | +28.9% | 0.023 | ⚠️ YES |

**Statistical Test**: Welch's t-test
**Significance Level**: α = 0.05 (Bonferroni corrected: 0.0083)
**Confidence**: 99.9% that degradation is real

### Latency Distribution

```
Baseline v2.3.0              Current v2.4.0
     │                            │
 600 │                            │              *
     │                            │
 500 │                            │            *
     │                            │          *
 400 │                            │        *
     │                            │
 300 │                            │      **
     │                            │     *
 200 │                *           │   **
     │              **            │  **
 100 │          ****              │ **
     │     *****                  │**
   0 └─────────────────          └─────────────────
     0  25  50  75  95 99         0  25  50  75  95 99
            Percentile                    Percentile
```
```

### Throughput Regression

```markdown
## Throughput Metrics

| Metric | Baseline | Current | Delta | % Change | p-value | Regression? |
|--------|----------|---------|-------|----------|---------|-------------|
| Requests/sec | 2500 | 2100 | -400 | -16.0% | 0.003 | ⚠️ YES |
| Total requests | 150000 | 126000 | -24000 | -16.0% | - | - |
| Failed requests | 150 (0.1%) | 1260 (1.0%) | +1110 | +740% | 0.001 | ⚠️ YES |

**Statistical Test**: Mann-Whitney U test
**Confidence**: 99.7% that throughput decreased

### Time Series Comparison

```
Requests per Second Over Time

3000 ┤
     │  Baseline ─────
2500 │ ████████████████████████████████████
     │
2000 │           Current ─ ─ ─ ─
     │          ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
1500 │
     │
1000 │
     │
 500 │
     │
   0 └────────────────────────────────────────
     0   2m  4m  6m  8m  10m
              Time
```
```

### Memory Analysis

```markdown
## Memory Metrics

| Metric | Baseline | Current | Delta | % Change | Leak Detected? |
|--------|----------|---------|-------|----------|----------------|
| Heap Used | 256 MB | 312 MB | +56 MB | +21.9% | ⚠️ Suspected |
| RSS | 384 MB | 468 MB | +84 MB | +21.9% | - |
| Growth Rate | 2 MB/hour | 18 MB/hour | +16 MB/hour | +800% | ⚠️ YES |
| GC Frequency | 12/min | 18/min | +6/min | +50% | ⚠️ Pressure |

**Memory Leak Analysis**:
- **Leak Detected**: YES (high confidence)
- **Growth Rate**: 18 MB/hour (threshold: 10 MB/hour)
- **Suspect Objects**: Array (+12500 instances), Closure (+8200 instances)
- **Recommendation**: Take heap snapshot and analyze retained paths

### Heap Growth Over Time

```
Heap Size (MB)

400 ┤                                    Current ╱╱
    │                               ╱╱╱╱╱
350 │                          ╱╱╱╱╱
    │                     ╱╱╱╱╱
300 │                ╱╱╱╱╱
    │           ╱╱╱╱╱
250 │      ╱╱╱╱╱              Baseline ────
    │ ╱╱╱╱╱        ──────────────────────────
200 │
    │
150 │
    │
100 │
    └────────────────────────────────────────
      0   10  20  30  40  50  60
               Time (minutes)
```
```

### Root Cause Indicators

```markdown
## Root Cause Analysis

**Automated Analysis**:

### Likely Culprits

1. **Synchronous I/O in Request Path** (HIGH confidence)
   - Evidence: p99 latency +22%, I/O wait +15%
   - Pattern: Blocking operations correlate with latency spikes
   - Recommendation: Profile with `clinic doctor` or `0x`

2. **Memory Accumulation** (HIGH confidence)
   - Evidence: Linear heap growth at 18 MB/hour
   - Pattern: Array and Closure object growth
   - Recommendation: Take heap snapshots at t=0 and t=30min, analyze diff

3. **Increased Computation** (MEDIUM confidence)
   - Evidence: CPU +12%, throughput -16%
   - Pattern: Less throughput despite similar CPU usage
   - Recommendation: Profile with `perf` or `clinic flame`

### Recommended Investigation Steps

1. **Git Bisect**: Identify introducing commit
   ```bash
   git bisect start HEAD v2.3.0
   git bisect run ./performance-test.sh
   ```

2. **Heap Snapshot Diff**:
   ```bash
   node --heap-prof app.js  # Baseline
   # Run load test
   node --heap-prof app.js  # Current
   # Compare snapshots
   ```

3. **Flame Graph Analysis**:
   ```bash
   clinic flame -- node app.js
   # Analyze hot paths
   ```
```

### Recommendations

```markdown
## Recommendations

### Immediate Actions (DO NOT DEPLOY)

- [ ] **Do not deploy v2.4.0** - Severity is HIGH
- [ ] Run git bisect to identify introducing commit
- [ ] Take heap snapshots and analyze memory accumulation
- [ ] Profile CPU with flame graphs to identify hot paths

### Investigation Priority

| Priority | Action | Owner | ETA |
|----------|--------|-------|-----|
| P0 | Identify regression commit via bisect | Regression Analyst | 2 hours |
| P0 | Analyze heap snapshots for leak | Performance Engineer | 4 hours |
| P1 | Profile CPU for hot paths | Performance Engineer | 4 hours |
| P1 | Review recent I/O changes | Developer | 2 hours |

### Prevention (After Fix)

- [ ] Add performance regression tests to CI
- [ ] Set up continuous memory profiling
- [ ] Enable automated alerts for p99 > 200ms
- [ ] Add load testing to pull request checks
```

## Usage Examples

### Full Performance Comparison

```
User: "Performance regression check between v2.3.0 and v2.4.0"

Skill executes:
1. Checkout v2.3.0, run k6 benchmark → baseline-results.json
2. Checkout v2.4.0, run k6 benchmark → current-results.json
3. Statistical comparison → 5 of 8 metrics regressed
4. Memory profiling → leak detected (+18 MB/hour)
5. Generate report → .aiwg/reports/performance-regression-20240125.md

Output:
"⚠️ PERFORMANCE REGRESSION DETECTED

Severity: HIGH
Confidence: 99.5%
Metrics Affected: Latency (+15-22%), Throughput (-16%), Memory Leak

Report: .aiwg/reports/performance-regression-20240125.md

DO NOT DEPLOY - Investigation required"
```

### Quick Latency Check

```
User: "Check latency regression"

Skill executes:
1. Compare current p99 against baseline
2. Statistical t-test for significance
3. Quick report

Output:
"Latency Regression Detected:
  p50: 52ms (baseline: 45ms) → +15.6% ⚠️
  p95: 145ms (baseline: 120ms) → +20.8% ⚠️
  p99: 220ms (baseline: 180ms) → +22.2% ⚠️

Statistical confidence: 99.9%
Exceeds threshold: YES (>10%)
Recommendation: Investigate before deploying"
```

### Memory Leak Detection

```
User: "Detect memory leak"

Skill executes:
1. Monitor memory for 30 minutes
2. Calculate growth rate
3. Identify accumulating objects

Output:
"⚠️ MEMORY LEAK DETECTED

Growth Rate: 18 MB/hour (threshold: 10 MB/hour)
Suspect Objects:
  - Array: +12500 instances
  - Closure: +8200 instances

Heap snapshots saved:
  - .aiwg/profiling/heap-t0.heapsnapshot
  - .aiwg/profiling/heap-t30.heapsnapshot

Recommendation: Analyze with Chrome DevTools Memory Profiler"
```

### Benchmark Comparison

```
User: "Compare performance with main branch"

Skill executes:
1. Stash current changes
2. Benchmark main branch
3. Restore changes
4. Benchmark current branch
5. Statistical comparison

Output:
"Performance Comparison: feature-branch vs main

Latency (p99):
  main: 180ms
  feature-branch: 185ms
  Delta: +2.8% (within threshold ✓)

Throughput:
  main: 2500 req/s
  feature-branch: 2480 req/s
  Delta: -0.8% (within threshold ✓)

Verdict: NO REGRESSION DETECTED
Safe to merge"
```

## Integration

This skill uses:
- `artifact-metadata`: Load benchmark results from previous runs
- `project-awareness`: Detect git tags and version history
- `regression-analyst` agent: For detailed root cause analysis when regression detected

This skill is used by:
- CI/CD pipelines for automated regression gates
- Developers for pre-merge performance validation
- Release managers for go/no-go decisions

## Automated Detection in CI

### GitHub Actions Example

```yaml
# .github/workflows/performance-gate.yml
name: Performance Regression Gate

on:
  pull_request:
    branches: [main]

jobs:
  performance-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0  # Full history for baseline

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Benchmark baseline (main branch)
        run: |
          git checkout main
          npm run build
          k6 run --out json=baseline.json benchmark.k6.js

      - name: Benchmark current (PR branch)
        run: |
          git checkout ${{ github.head_ref }}
          npm run build
          k6 run --out json=current.json benchmark.k6.js

      - name: Performance regression analysis
        id: regression
        run: |
          npm run analyze:performance -- \
            --baseline baseline.json \
            --current current.json \
            --threshold 10 \
            --output regression-report.md

      - name: Comment PR with results
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('regression-report.md', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: report
            });

      - name: Fail if regression detected
        if: steps.regression.outputs.regression == 'true'
        run: |
          echo "Performance regression detected - see report"
          exit 1
```

## Output Locations

- Performance reports: `.aiwg/reports/performance-regression-{date}.md`
- Benchmark data: `.aiwg/benchmarks/{version}-{timestamp}.json`
- Heap snapshots: `.aiwg/profiling/heap-{version}-{timestamp}.heapsnapshot`
- Flame graphs: `.aiwg/profiling/flame-{version}-{timestamp}.html`
- Regression register: `.aiwg/testing/regression-register/REG-PERF-{id}.yaml`

## References

- @agentic/code/frameworks/sdlc-complete/agents/regression-analyst.md - Regression analysis agent
- @agentic/code/frameworks/sdlc-complete/agents/performance-engineer.md - Performance optimization agent
- @agentic/code/frameworks/sdlc-complete/schemas/testing/regression.yaml - Regression schema
- @.aiwg/research/findings/REF-013-metagpt.md - Debug memory pattern for performance history
- @.claude/rules/executable-feedback.md - Execution validation requirements
