# NFR Test Generator - Usage Examples

## Overview

The NFRTestGenerator transforms NFR specifications from ground truth corpus into executable Vitest test files with statistical assertions, performance targets, and accuracy validation.

## Basic Usage

### 1. Create NFR Corpus

```typescript
import { NFRTestGenerator, NFRGroundTruthCorpus, NFRBaseline } from './nfr-test-generator.js';

// Define NFR baselines (typically loaded from JSON/YAML)
const corpus: NFRGroundTruthCorpus = {
  version: '1.0.0',
  lastUpdated: '2025-10-23',
  nfrs: new Map<string, NFRBaseline>([
    ['NFR-PERF-001', {
      nfrId: 'NFR-PERF-001',
      category: 'Performance',
      description: 'Content Validation Time',
      target: 5000,
      unit: 'ms',
      baseline: 4850,
      tolerance: 10,
      priority: 'P0',
      measurementMethod: 'Benchmark with 100 iterations, report p95',
      testCases: ['TC-001-015'],
    }],
    ['NFR-ACC-001', {
      nfrId: 'NFR-ACC-001',
      category: 'Accuracy',
      description: 'AI Pattern False Positive Rate',
      target: 0.95, // 95% accuracy
      unit: 'accuracy',
      baseline: 0.96,
      tolerance: 2,
      priority: 'P0',
      measurementMethod: 'Ground truth corpus validation, 1000 samples',
      testCases: ['TC-001-020'],
    }],
  ])
};
```

### 2. Generate Single Performance Test

```typescript
const generator = new NFRTestGenerator(corpus);

const testCode = generator.generatePerformanceTest('NFR-PERF-001', {
  nfrId: 'NFR-PERF-001',
  targetValue: 5000,
  unit: 'ms',
  percentile: 95,
  tolerance: 10,
  baseline: 4850,
});

console.log(testCode);
```

**Output:**

```typescript
describe('NFR-PERF-001: Content Validation Time', () => {
  it('should complete in <5000ms (95th percentile)', async () => {
    const profiler = new PerformanceProfiler({
      warmupIterations: 10,
      filterOutliers: true,
      confidenceLevel: 0.95
    });

    // Simulate workload for NFR-PERF-001
    const result = await profiler.measureAsync(
      async () => {
        // TODO: Replace with actual component under test
        await simulateWorkload('NFR-PERF-001');
      },
      100
    );

    // Ground truth baseline: 4850ms (±10%)
    expect(result.p95).toBeLessThan(5000);

    // Baseline validation (allow 10% deviation)
    expect(result.p95).toBeGreaterThan(4365);
    expect(result.p95).toBeLessThan(5335);

    // Statistical confidence
    expect(result.confidenceInterval[0]).toBeLessThan(5000);
    expect(result.iterations).toBe(100);
  }, 120000); // 2 minute timeout
});
```

### 3. Generate Accuracy Test

```typescript
const accuracyTest = generator.generateAccuracyTest('NFR-ACC-001', {
  nfrId: 'NFR-ACC-001',
  expectedAccuracy: 0.95,
  falsePositiveRate: 0.03,
  falseNegativeRate: 0.02,
  sampleSize: 1000,
});

console.log(accuracyTest);
```

**Output:**

```typescript
describe('NFR-ACC-001: AI Pattern False Positive Rate', () => {
  it('should maintain 95.0% accuracy on validation corpus', async () => {
    // Load ground truth corpus for NFR-ACC-001
    const corpus = await loadValidationCorpus('NFR-ACC-001');
    const samples = corpus.getSamples(1000);

    let correctPredictions = 0;
    let falsePositives = 0;
    let falseNegatives = 0;

    // Run validation on each sample
    for (const sample of samples) {
      const prediction = await validateSample(sample);
      const groundTruth = sample.label;

      if (prediction === groundTruth) {
        correctPredictions++;
      } else if (prediction === true && groundTruth === false) {
        falsePositives++;
      } else if (prediction === false && groundTruth === true) {
        falseNegatives++;
      }
    }

    const accuracy = correctPredictions / samples.length;

    // Accuracy target: 95.0%
    expect(accuracy).toBeGreaterThanOrEqual(0.95);

    // Error budget: max 50 errors (5.0% error rate)
    expect(samples.length - correctPredictions).toBeLessThanOrEqual(50);

    // False positive rate target: 3.0%
    const fpRate = falsePositives / samples.length;
    expect(fpRate).toBeLessThanOrEqual(0.03);

    // False negative rate target: 2.0%
    const fnRate = falseNegatives / samples.length;
    expect(fnRate).toBeLessThanOrEqual(0.02);
  }, 60000); // 1 minute timeout
});
```

### 4. Generate Complete Test Suite

```typescript
const testSuite = generator.generateTestSuite(
  ['NFR-PERF-001', 'NFR-ACC-001', 'NFR-REL-001'],
  {
    includeComments: true,
    includeGroundTruth: true,
    strictMode: false,
    tolerance: 10,
    iterations: 100,
    confidenceLevel: 0.95,
  }
);

console.log(testSuite);
```

**Output includes:**

- File header with corpus version and generation date
- All necessary imports
- Test cases for each NFR
- Helper function placeholders

### 5. Write Test File to Disk

```typescript
await generator.generateTestFile(
  ['NFR-PERF-001', 'NFR-PERF-002'],
  './test/acceptance/nfr-performance.test.ts',
  {
    includeComments: true,
    includeGroundTruth: true,
  }
);
```

### 6. Generate All NFR Tests (One File Per Category)

```typescript
const fileCount = await generator.generateAllNFRTests(
  './test/acceptance/nfr/',
  {
    includeComments: true,
    strictMode: false,
  }
);

console.log(`Generated ${fileCount} test files`);
```

**Creates:**

- `./test/acceptance/nfr/nfr-performance.test.ts`
- `./test/acceptance/nfr/nfr-accuracy.test.ts`
- `./test/acceptance/nfr/nfr-reliability.test.ts`
- `./test/acceptance/nfr/nfr-security.test.ts`
- `./test/acceptance/nfr/nfr-usability.test.ts`

## Advanced Usage

### Strict Mode (No Baseline Tolerance)

```typescript
const strictTest = generator.generateTestSuite(['NFR-PERF-001'], {
  strictMode: true, // Fail on any deviation from target
});

// Generated test will NOT include baseline validation bounds
// Only the absolute target will be enforced
```

### Reliability Tests

```typescript
const reliabilityTest = generator.generateReliabilityTest('NFR-REL-001', {
  nfrId: 'NFR-REL-001',
  successRate: 0.99, // 99% success rate
  retryCount: 3,
  timeoutMs: 30000,
});
```

**Output:**

```typescript
describe('NFR-REL-001: Plugin Deployment Success Rate', () => {
  it('should maintain 99.0% success rate', async () => {
    let successCount = 0;
    let failureCount = 0;
    const testRuns = 100;

    // Run operation 100 times to establish reliability
    for (let i = 0; i < testRuns; i++) {
      try {
        await executeOperationWithRetry(
          async () => {
            // TODO: Replace with actual operation
            await performOperation('NFR-REL-001');
          },
          { maxRetries: 3, timeoutMs: 30000 }
        );
        successCount++;
      } catch (error) {
        failureCount++;
      }
    }

    const actualSuccessRate = successCount / testRuns;

    // Success rate target: 99.0%
    expect(actualSuccessRate).toBeGreaterThanOrEqual(0.99);

    // Minimum 99 successes out of 100 runs
    expect(successCount).toBeGreaterThanOrEqual(99);

    // Failure budget: max 1 failures
    expect(failureCount).toBeLessThanOrEqual(1);
  }, 3010000); // Extended timeout for 100 runs
});
```

## Integration with Test Infrastructure

### Step 1: Load NFR Corpus from YAML/JSON

```typescript
import * as fs from 'fs/promises';
import * as yaml from 'yaml';

async function loadNFRCorpus(filePath: string): Promise<NFRGroundTruthCorpus> {
  const content = await fs.readFile(filePath, 'utf-8');
  const data = yaml.parse(content);

  const nfrs = new Map<string, NFRBaseline>();
  for (const nfr of data.nfrs) {
    nfrs.set(nfr.nfrId, nfr);
  }

  return {
    version: data.version,
    lastUpdated: data.lastUpdated,
    nfrs,
  };
}
```

### Step 2: Generate Tests in CI/CD Pipeline

```typescript
// scripts/generate-nfr-tests.ts
import { NFRTestGenerator } from '../src/testing/nfr-test-generator.js';
import { loadNFRCorpus } from './load-corpus.js';

async function main() {
  // Load NFR corpus
  const corpus = await loadNFRCorpus('./.aiwg/testing/nfr-corpus.yaml');

  // Create generator
  const generator = new NFRTestGenerator(corpus);

  // Generate all NFR tests
  const fileCount = await generator.generateAllNFRTests(
    './test/acceptance/nfr',
    {
      includeComments: true,
      includeGroundTruth: true,
      strictMode: false,
    }
  );

  console.log(`✓ Generated ${fileCount} NFR test files`);
}

main().catch(console.error);
```

### Step 3: Run Generated Tests

```bash
# Run all NFR acceptance tests
npm test -- test/acceptance/nfr/**/*.test.ts

# Run specific category
npm test -- test/acceptance/nfr/nfr-performance.test.ts
```

## Key Features

1. **Statistical Rigor**: Includes p95/p99 targets, confidence intervals, outlier filtering
2. **Baseline Integration**: Uses ground truth corpus for validation
3. **Category Support**: Performance, Accuracy, Reliability, Security, Usability
4. **Tolerance Control**: Configurable deviation from baseline (±10%, ±5%, etc.)
5. **Strict Mode**: Enforce absolute targets with no tolerance
6. **Batch Generation**: Generate all NFRs in one command
7. **File Management**: Automatic directory creation, organized by category

## Best Practices

1. **Keep Corpus Updated**: Regenerate baselines after major refactoring
2. **Version Corpus**: Track corpus version in generated tests for traceability
3. **Use Strict Mode for Critical NFRs**: P0 NFRs should have zero tolerance
4. **Separate by Phase**: Generate P0 tests for MVP, P1 for next release
5. **CI/CD Integration**: Regenerate tests on corpus changes (pre-commit hook)
6. **Helper Implementation**: Implement test helpers (workload simulators, corpus loaders)

## Troubleshooting

### Test Generation Fails

**Error**: `NFR NFR-XXX-001 not found in ground truth corpus`

**Solution**: Ensure NFR ID exists in corpus and spelling matches exactly

### Generated Tests Don't Compile

**Issue**: TypeScript errors in generated code

**Solution**: Check that all required helper functions are implemented:
- `simulateWorkload()` for performance tests
- `loadValidationCorpus()` for accuracy tests
- `executeOperationWithRetry()` for reliability tests

### Baseline Validation Fails

**Issue**: Test fails due to baseline bounds

**Solution**:
- Update baseline in corpus if performance improved
- Increase tolerance if acceptable variability increased
- Use strict mode if baseline validation is not needed

## Related Documentation

- [Performance Profiler](/src/testing/PERFORMANCE_PROFILER_EXAMPLES.md)
- [Test Infrastructure Specification](/.aiwg/testing/test-infrastructure-specification.md)
- [NFR Measurement Protocols](/.aiwg/testing/nfr-measurement-protocols.md)
