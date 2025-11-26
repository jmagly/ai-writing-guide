# PerformanceProfiler Usage Examples

## Overview

The PerformanceProfiler provides high-precision performance measurement with statistical analysis for validating NFR performance targets.

## Basic Usage

### Synchronous Operations

```typescript
import { PerformanceProfiler } from './performance-profiler';

const profiler = new PerformanceProfiler();

// Measure a synchronous operation
const result = profiler.measureSync(() => {
  // Your operation to measure
  const arr = Array.from({ length: 10000 }, (_, i) => i);
  arr.sort((a, b) => b - a);
}, 1000); // Run 1000 iterations

console.log(`Mean latency: ${result.mean.toFixed(3)}ms`);
console.log(`P95 latency: ${result.p95.toFixed(3)}ms`);
console.log(`95% CI: [${result.confidenceInterval[0].toFixed(3)}, ${result.confidenceInterval[1].toFixed(3)}]ms`);
```

### Asynchronous Operations

```typescript
// Measure an async operation
const asyncResult = await profiler.measureAsync(async () => {
  await fetch('https://api.example.com/data');
}, 100); // Run 100 iterations

console.log(`Mean latency: ${asyncResult.mean.toFixed(3)}ms`);
console.log(`P95 latency: ${asyncResult.p95.toFixed(3)}ms`);
```

## Advanced Configuration

### Custom Warmup Iterations

```typescript
const profiler = new PerformanceProfiler({
  warmupIterations: 20, // Default is 10
});

const result = profiler.measureSync(() => {
  // Operation with JIT warmup
  heavyComputation();
}, 500);
```

### Outlier Filtering

```typescript
const profiler = new PerformanceProfiler({
  filterOutliers: true, // Enable IQR-based outlier filtering
});

const result = profiler.measureSync(() => {
  // Operation that may have outliers
  networkRequest();
}, 1000);

console.log(`Outliers removed: ${result.outliersRemoved}`);
```

### Custom Confidence Level

```typescript
const profiler = new PerformanceProfiler({
  confidenceLevel: 0.99, // 99% confidence interval (default is 0.95)
});

const result = profiler.measureSync(operation, 1000);
```

## Statistical Analysis

### Calculate Specific Percentiles

```typescript
const profiler = new PerformanceProfiler();

// Get raw samples from measurement
const result = profiler.measureSync(operation, 1000);

// Calculate custom percentiles
const p50 = profiler.calculatePercentile(result.samples, 50); // Median
const p90 = profiler.calculatePercentile(result.samples, 90);
const p99 = profiler.calculatePercentile(result.samples, 99);
const p999 = profiler.calculatePercentile(result.samples, 99.9);

console.log(`P50: ${p50.toFixed(3)}ms`);
console.log(`P90: ${p90.toFixed(3)}ms`);
console.log(`P99: ${p99.toFixed(3)}ms`);
console.log(`P99.9: ${p999.toFixed(3)}ms`);
```

### Calculate Custom Confidence Intervals

```typescript
const profiler = new PerformanceProfiler();
const result = profiler.measureSync(operation, 500);

// Calculate different confidence levels
const [lower90, upper90] = profiler.calculateConfidenceInterval(result.samples, 0.90);
const [lower95, upper95] = profiler.calculateConfidenceInterval(result.samples, 0.95);
const [lower99, upper99] = profiler.calculateConfidenceInterval(result.samples, 0.99);

console.log(`90% CI: [${lower90.toFixed(3)}, ${upper90.toFixed(3)}]ms`);
console.log(`95% CI: [${lower95.toFixed(3)}, ${upper95.toFixed(3)}]ms`);
console.log(`99% CI: [${lower99.toFixed(3)}, ${upper99.toFixed(3)}]ms`);
```

## Memory Profiling

```typescript
const profiler = new PerformanceProfiler();

const memResult = profiler.measureMemory(() => {
  // Operation that allocates memory
  const largeArray = new Array(100000).fill({ id: 1, name: 'test' });
  largeArray.sort((a, b) => a.id - b.id);
});

console.log(`Heap used: ${(memResult.heapUsed / 1024 / 1024).toFixed(2)} MB`);
console.log(`Heap total: ${(memResult.heapTotal / 1024 / 1024).toFixed(2)} MB`);
console.log(`External: ${(memResult.external / 1024 / 1024).toFixed(2)} MB`);
console.log(`ArrayBuffers: ${(memResult.arrayBuffers / 1024 / 1024).toFixed(2)} MB`);
```

## Reporting

### Generate Performance Report

```typescript
const profiler = new PerformanceProfiler();

// Collect multiple measurements
const results = [
  profiler.measureSync(operation1, 1000),
  profiler.measureSync(operation2, 1000),
  profiler.measureSync(operation3, 1000),
];

// Generate formatted report
const report = profiler.generateReport(results);
console.log(report);
```

Output:
```
╔════════════════════════════════════════════════════════════╗
║           Performance Profiler Report                      ║
╚════════════════════════════════════════════════════════════╝

Measurement 1:
  Iterations:     1000
  Mean:           5.234 ms
  Median:         5.123 ms
  P95:            7.456 ms
  P99:            8.789 ms
  Min:            3.111 ms
  Max:            9.999 ms
  Std Dev:        1.234 ms
  95% CI:         [5.156, 5.312] ms

Measurement 2:
  Iterations:     1000
  Mean:           12.456 ms
  Median:         12.234 ms
  P95:            15.678 ms
  P99:            17.890 ms
  Min:            9.012 ms
  Max:            20.123 ms
  Std Dev:        2.345 ms
  95% CI:         [12.311, 12.601] ms
```

## NFR Validation

### Validate P95 Latency Target

```typescript
const profiler = new PerformanceProfiler();

// NFR: P95 latency must be < 50ms
const result = profiler.measureSync(criticalOperation, 1000);

if (result.p95 > 50) {
  console.error(`❌ NFR violated: P95 latency ${result.p95.toFixed(3)}ms exceeds 50ms target`);
} else {
  console.log(`✓ NFR met: P95 latency ${result.p95.toFixed(3)}ms within 50ms target`);
}
```

### Validate with Confidence Interval

```typescript
const profiler = new PerformanceProfiler();

// NFR: Mean latency must be < 10ms with 95% confidence
const result = profiler.measureSync(operation, 1000);
const [lower, upper] = result.confidenceInterval;

if (upper > 10) {
  console.error(`❌ NFR violated: Upper CI bound ${upper.toFixed(3)}ms exceeds 10ms`);
} else {
  console.log(`✓ NFR met: Mean latency ${result.mean.toFixed(3)}ms with 95% CI [${lower.toFixed(3)}, ${upper.toFixed(3)}]ms`);
}
```

## Integration Testing

### Compare Performance Across Implementations

```typescript
const profiler = new PerformanceProfiler();

const implementation1 = profiler.measureSync(() => {
  // Implementation 1
  arraySort1(data);
}, 1000);

const implementation2 = profiler.measureSync(() => {
  // Implementation 2
  arraySort2(data);
}, 1000);

console.log(`Implementation 1: ${implementation1.p95.toFixed(3)}ms (P95)`);
console.log(`Implementation 2: ${implementation2.p95.toFixed(3)}ms (P95)`);

if (implementation2.p95 < implementation1.p95) {
  console.log(`✓ Implementation 2 is ${((1 - implementation2.p95 / implementation1.p95) * 100).toFixed(1)}% faster`);
}
```

### Regression Testing

```typescript
const profiler = new PerformanceProfiler();

// Baseline measurement
const baseline = {
  mean: 5.0,
  p95: 7.0,
};

// Current measurement
const result = profiler.measureSync(operation, 1000);

const meanRegression = ((result.mean - baseline.mean) / baseline.mean) * 100;
const p95Regression = ((result.p95 - baseline.p95) / baseline.p95) * 100;

console.log(`Mean regression: ${meanRegression.toFixed(2)}%`);
console.log(`P95 regression: ${p95Regression.toFixed(2)}%`);

if (p95Regression > 10) {
  console.error(`❌ Performance regression detected: P95 increased by ${p95Regression.toFixed(2)}%`);
}
```

## Best Practices

### 1. Use Sufficient Iterations

```typescript
// ❌ Too few iterations - unreliable statistics
const badResult = profiler.measureSync(operation, 10);

// ✓ Sufficient iterations - reliable statistics
const goodResult = profiler.measureSync(operation, 1000);
```

### 2. Account for Warmup

```typescript
// ✓ Use warmup for JIT-compiled code
const profiler = new PerformanceProfiler({
  warmupIterations: 20, // Let JIT stabilize
});
```

### 3. Filter Outliers for Network Operations

```typescript
// ✓ Use outlier filtering for operations with external dependencies
const profiler = new PerformanceProfiler({
  filterOutliers: true,
});

const result = profiler.measureSync(() => {
  // Network request that may have occasional spikes
  makeNetworkRequest();
}, 100);
```

### 4. Validate Both Mean and P95

```typescript
// ✓ Validate both mean and tail latency
const result = profiler.measureSync(operation, 1000);

const meanValid = result.mean < targetMean;
const p95Valid = result.p95 < targetP95;

if (meanValid && p95Valid) {
  console.log('✓ Both mean and P95 latency targets met');
}
```

### 5. Use Confidence Intervals for Decision Making

```typescript
// ✓ Use CI bounds for more robust validation
const result = profiler.measureSync(operation, 1000);
const [lower, upper] = result.confidenceInterval;

// Conservative: Check upper bound
if (upper < target) {
  console.log('✓ Target met with 95% confidence');
}
```

## NFR Performance Measurement Requirements

The PerformanceProfiler satisfies the following NFR requirements:

- **NFR-PERF-MEAS-001**: 95th percentile calculation with 95% confidence intervals
- **Sub-5ms precision**: Uses `performance.now()` for microsecond precision
- **Async support**: Measures both synchronous and asynchronous operations
- **Memory profiling**: Tracks heap, external, and ArrayBuffer memory usage
- **Statistical rigor**: Implements proper t-distribution for confidence intervals
- **Outlier handling**: Optional IQR-based outlier detection and filtering
