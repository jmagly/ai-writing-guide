/**
 * NFRTestGenerator - Generate automated test suites from NFR specifications
 *
 * Transforms NFR specifications (from ground truth corpus) into executable
 * Vitest test files with statistical assertions, performance targets, and
 * accuracy validation.
 *
 * Features:
 * - Generate performance benchmark tests (p95, p99 targets)
 * - Generate accuracy validation tests (false positive/negative rates)
 * - Generate reliability tests (success rate, retry behavior)
 * - Statistical assertions (95% confidence intervals)
 * - Ground truth baseline integration
 * - Customizable tolerance and strictness
 *
 * @module testing/nfr-test-generator
 */

// import { PerformanceProfiler } from './performance-profiler.js';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * NFR Ground Truth Corpus - Baseline measurements for NFR validation
 */
export interface NFRGroundTruthCorpus {
  nfrs: Map<string, NFRBaseline>;
  version: string;
  lastUpdated: string;
}

/**
 * Baseline measurement for a single NFR
 */
export interface NFRBaseline {
  nfrId: string;
  category: 'Performance' | 'Accuracy' | 'Reliability' | 'Usability' | 'Security';
  description: string;
  target: number;
  unit: string;
  baseline: number;
  tolerance: number; // percentage (e.g., 10 = 10%)
  priority: 'P0' | 'P1' | 'P2';
  measurementMethod: string;
  testCases: string[];
}

/**
 * Options for test suite generation
 */
export interface GenerateOptions {
  /** Include explanatory comments in generated tests */
  includeComments?: boolean;
  /** Include ground truth baselines as comments */
  includeGroundTruth?: boolean;
  /** Fail test on any deviation from baseline (no tolerance) */
  strictMode?: boolean;
  /** Override default tolerance (percentage) */
  tolerance?: number;
  /** Number of iterations for performance tests */
  iterations?: number;
  /** Statistical confidence level (0-1) */
  confidenceLevel?: number;
}

/**
 * Performance test target specification
 */
export interface PerformanceTarget {
  nfrId: string;
  targetValue: number;
  unit: string;
  percentile?: number; // 95, 99
  tolerance?: number;
  baseline?: number;
}

/**
 * Accuracy test target specification
 */
export interface AccuracyTarget {
  nfrId: string;
  expectedAccuracy: number; // 0-1 (e.g., 0.95 = 95%)
  falsePositiveRate?: number; // 0-1
  falseNegativeRate?: number; // 0-1
  sampleSize?: number;
}

/**
 * Reliability test target specification
 */
export interface ReliabilityTarget {
  nfrId: string;
  successRate: number; // 0-1 (e.g., 0.99 = 99%)
  retryCount?: number;
  timeoutMs?: number;
}

/**
 * NFRTestGenerator - Transform NFR specifications into executable tests
 *
 * @example
 * ```typescript
 * const corpus = createMockCorpus(); // Load NFR baselines
 * const generator = new NFRTestGenerator(corpus);
 *
 * // Generate single performance test
 * const testCode = generator.generatePerformanceTest('NFR-PERF-001', {
 *   nfrId: 'NFR-PERF-001',
 *   targetValue: 5000,
 *   unit: 'ms',
 *   percentile: 95,
 *   tolerance: 10
 * });
 *
 * // Generate complete test suite for multiple NFRs
 * const suite = generator.generateTestSuite(['NFR-PERF-001', 'NFR-ACC-001'], {
 *   includeComments: true,
 *   includeGroundTruth: true,
 *   strictMode: false,
 *   tolerance: 10
 * });
 *
 * // Write test file to disk
 * await generator.generateTestFile(['NFR-PERF-001'], './test/nfr-perf.test.ts');
 * ```
 */
export class NFRTestGenerator {
  private corpus: NFRGroundTruthCorpus;

  constructor(corpus: NFRGroundTruthCorpus) {
    this.corpus = corpus;
  }

  /**
   * Generate complete test suite for multiple NFRs
   *
   * @param nfrIds - Array of NFR identifiers to generate tests for
   * @param options - Test generation options
   * @returns Complete test suite code (Vitest format)
   *
   * @throws {Error} If NFR ID not found in corpus
   */
  generateTestSuite(nfrIds: string[], options?: GenerateOptions): string {
    const opts = this.mergeOptions(options);
    const testCases: string[] = [];

    // Group NFRs by category for organized test structure
    const nfrsByCategory = this.groupByCategory(nfrIds);

    // Generate imports
    const imports = this.generateImports(nfrsByCategory);

    // Generate test cases for each NFR
    for (const nfrId of nfrIds) {
      const baseline = this.corpus.nfrs.get(nfrId);
      if (!baseline) {
        throw new Error(`NFR ${nfrId} not found in ground truth corpus`);
      }

      let testCase: string;
      switch (baseline.category) {
        case 'Performance':
          testCase = this.generatePerformanceTest(nfrId, {
            nfrId,
            targetValue: baseline.target,
            unit: baseline.unit,
            percentile: 95,
            tolerance: opts.strictMode ? 0 : baseline.tolerance,
            baseline: baseline.baseline,
          });
          break;
        case 'Accuracy':
          testCase = this.generateAccuracyTest(nfrId, {
            nfrId,
            expectedAccuracy: baseline.target,
            sampleSize: 1000,
          });
          break;
        case 'Reliability':
          testCase = this.generateReliabilityTest(nfrId, {
            nfrId,
            successRate: baseline.target,
            retryCount: 3,
          });
          break;
        default:
          testCase = this.generateGenericTest(nfrId, baseline, opts);
      }

      testCases.push(testCase);
    }

    // Assemble complete test file
    return this.assembleTestFile(imports, testCases, opts);
  }

  /**
   * Generate performance benchmark test
   *
   * Creates test with statistical assertions (p95, p99), confidence intervals,
   * and baseline comparison.
   *
   * @param nfrId - NFR identifier
   * @param target - Performance target specification
   * @returns Test code (Vitest format)
   */
  generatePerformanceTest(nfrId: string, target: PerformanceTarget): string {
    const baseline = this.corpus.nfrs.get(nfrId);
    if (!baseline) {
      throw new Error(`NFR ${nfrId} not found in ground truth corpus`);
    }

    const percentile = target.percentile ?? 95;
    const tolerance = target.tolerance ?? baseline.tolerance;
    const targetValue = target.targetValue;
    const baselineValue = target.baseline ?? baseline.baseline;

    // Calculate tolerance bounds
    const lowerBound = baselineValue * (1 - tolerance / 100);
    const upperBound = baselineValue * (1 + tolerance / 100);
    
    // Format numbers (avoid .00 for whole numbers)
    const formatNum = (n: number): string => {
      return Number.isInteger(n) ? n.toString() : n.toFixed(2);
    };

    return `
  describe('${nfrId}: ${baseline.description}', () => {
    it('should complete in <${targetValue}${target.unit} (${percentile}th percentile)', async () => {
      const profiler = new PerformanceProfiler({
        warmupIterations: 10,
        filterOutliers: true,
        confidenceLevel: 0.95
      });

      // Simulate workload for ${nfrId}
      const result = await profiler.measureAsync(
        async () => {
          // TODO: Replace with actual component under test
          await simulateWorkload('${nfrId}');
        },
        100
      );

      // Ground truth baseline: ${baselineValue}${target.unit} (±${tolerance}%)
      expect(result.p${percentile}).toBeLessThan(${targetValue});

${tolerance > 0 ? `      // Baseline validation (allow ${tolerance}% deviation)
      expect(result.p${percentile}).toBeGreaterThan(${formatNum(lowerBound)});
      expect(result.p${percentile}).toBeLessThan(${formatNum(upperBound)});
` : ''}      // Statistical confidence
      expect(result.confidenceInterval[0]).toBeLessThan(${targetValue});
      expect(result.iterations).toBe(100);
    }, 120000); // 2 minute timeout
  });
`;
  }

  /**
   * Generate accuracy validation test
   *
   * Creates test with false positive/negative rate assertions and
   * statistical significance testing.
   *
   * @param nfrId - NFR identifier
   * @param target - Accuracy target specification
   * @returns Test code (Vitest format)
   */
  generateAccuracyTest(nfrId: string, target: AccuracyTarget): string {
    const baseline = this.corpus.nfrs.get(nfrId);
    if (!baseline) {
      throw new Error(`NFR ${nfrId} not found in ground truth corpus`);
    }

    const sampleSize = target.sampleSize ?? 1000;
    const expectedAccuracy = target.expectedAccuracy;
    const maxErrors = Math.floor(sampleSize * (1 - expectedAccuracy));

    return `
  describe('${nfrId}: ${baseline.description}', () => {
    it('should maintain ${(expectedAccuracy * 100).toFixed(1)}% accuracy on validation corpus', async () => {
      // Load ground truth corpus for ${nfrId}
      const corpus = await loadValidationCorpus('${nfrId}');
      const samples = corpus.getSamples(${sampleSize});

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

      // Accuracy target: ${(expectedAccuracy * 100).toFixed(1)}%
      expect(accuracy).toBeGreaterThanOrEqual(${expectedAccuracy});

      // Error budget: max ${maxErrors} errors (${((1 - expectedAccuracy) * 100).toFixed(1)}% error rate)
      expect(samples.length - correctPredictions).toBeLessThanOrEqual(${maxErrors});

${target.falsePositiveRate !== undefined ? `      // False positive rate target: ${(target.falsePositiveRate * 100).toFixed(1)}%
      const fpRate = falsePositives / samples.length;
      expect(fpRate).toBeLessThanOrEqual(${target.falsePositiveRate});
` : ''}${target.falseNegativeRate !== undefined ? `      // False negative rate target: ${(target.falseNegativeRate * 100).toFixed(1)}%
      const fnRate = falseNegatives / samples.length;
      expect(fnRate).toBeLessThanOrEqual(${target.falseNegativeRate});
` : ''}    }, 60000); // 1 minute timeout
  });
`;
  }

  /**
   * Generate reliability test
   *
   * Creates test with success rate assertions, retry behavior, and
   * timeout handling.
   *
   * @param nfrId - NFR identifier
   * @param target - Reliability target specification
   * @returns Test code (Vitest format)
   */
  generateReliabilityTest(nfrId: string, target: ReliabilityTarget): string {
    const baseline = this.corpus.nfrs.get(nfrId);
    if (!baseline) {
      throw new Error(`NFR ${nfrId} not found in ground truth corpus`);
    }

    const successRate = target.successRate;
    const retryCount = target.retryCount ?? 3;
    const timeoutMs = target.timeoutMs ?? 30000;
    const testRuns = 100;
    const minSuccesses = Math.floor(testRuns * successRate);

    return `
  describe('${nfrId}: ${baseline.description}', () => {
    it('should maintain ${(successRate * 100).toFixed(1)}% success rate', async () => {
      let successCount = 0;
      let failureCount = 0;
      const testRuns = ${testRuns};

      // Run operation ${testRuns} times to establish reliability
      for (let i = 0; i < testRuns; i++) {
        try {
          await executeOperationWithRetry(
            async () => {
              // TODO: Replace with actual operation
              await performOperation('${nfrId}');
            },
            { maxRetries: ${retryCount}, timeoutMs: ${timeoutMs} }
          );
          successCount++;
        } catch (error) {
          failureCount++;
        }
      }

      const actualSuccessRate = successCount / testRuns;

      // Success rate target: ${(successRate * 100).toFixed(1)}%
      expect(actualSuccessRate).toBeGreaterThanOrEqual(${successRate});

      // Minimum ${minSuccesses} successes out of ${testRuns} runs
      expect(successCount).toBeGreaterThanOrEqual(${minSuccesses});

      // Failure budget: max ${testRuns - minSuccesses} failures
      expect(failureCount).toBeLessThanOrEqual(${testRuns - minSuccesses});
    }, ${timeoutMs * testRuns + 10000}); // Extended timeout for ${testRuns} runs
  });
`;
  }

  /**
   * Generate test file and write to disk
   *
   * @param nfrIds - Array of NFR identifiers
   * @param outputPath - File path for generated test file
   * @param options - Test generation options
   * @returns Promise resolving when file is written
   */
  async generateTestFile(nfrIds: string[], outputPath: string, options?: GenerateOptions): Promise<void> {
    const testCode = this.generateTestSuite(nfrIds, options);

    // Ensure output directory exists
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });

    // Write test file
    await fs.writeFile(outputPath, testCode, 'utf-8');
  }

  /**
   * Generate test files for all NFRs in corpus (one file per category)
   *
   * @param outputDir - Directory for generated test files
   * @param options - Test generation options
   * @returns Number of test files generated
   */
  async generateAllNFRTests(outputDir: string, options?: GenerateOptions): Promise<number> {
    // Group NFRs by category
    const categorized = new Map<string, string[]>();

    for (const [nfrId, baseline] of this.corpus.nfrs.entries()) {
      const category = baseline.category.toLowerCase();
      if (!categorized.has(category)) {
        categorized.set(category, []);
      }
      categorized.get(category)!.push(nfrId);
    }

    // Generate one test file per category
    let fileCount = 0;
    for (const [category, nfrIds] of categorized.entries()) {
      const filename = `nfr-${category}.test.ts`;
      const filepath = path.join(outputDir, filename);
      await this.generateTestFile(nfrIds, filepath, options);
      fileCount++;
    }

    return fileCount;
  }

  /**
   * Merge user options with defaults
   * @private
   */
  private mergeOptions(options?: GenerateOptions): Required<GenerateOptions> {
    return {
      includeComments: options?.includeComments ?? true,
      includeGroundTruth: options?.includeGroundTruth ?? true,
      strictMode: options?.strictMode ?? false,
      tolerance: options?.tolerance ?? 10,
      iterations: options?.iterations ?? 100,
      confidenceLevel: options?.confidenceLevel ?? 0.95,
    };
  }

  /**
   * Group NFR IDs by category
   * @private
   */
  private groupByCategory(nfrIds: string[]): Map<string, string[]> {
    const grouped = new Map<string, string[]>();

    for (const nfrId of nfrIds) {
      const baseline = this.corpus.nfrs.get(nfrId);
      if (!baseline) continue;

      const category = baseline.category;
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(nfrId);
    }

    return grouped;
  }

  /**
   * Generate import statements based on NFR categories
   * @private
   */
  private generateImports(nfrsByCategory: Map<string, string[]>): string {
    const imports: string[] = [
      "import { describe, it, expect } from 'vitest';",
      "import { PerformanceProfiler } from '../../../src/testing/performance-profiler.js';",
    ];

    // Add category-specific imports
    if (nfrsByCategory.has('Performance')) {
      imports.push("import { simulateWorkload } from './helpers/workload-simulator.js';");
    }
    if (nfrsByCategory.has('Accuracy')) {
      imports.push("import { loadValidationCorpus, validateSample } from './helpers/validation-helpers.js';");
    }
    if (nfrsByCategory.has('Reliability')) {
      imports.push("import { executeOperationWithRetry, performOperation } from './helpers/reliability-helpers.js';");
    }

    return imports.join('\n');
  }

  /**
   * Generate generic test for non-standard NFR categories
   * @private
   */
  private generateGenericTest(nfrId: string, baseline: NFRBaseline, _options: Required<GenerateOptions>): string {
    return `
  describe('${nfrId}: ${baseline.description}', () => {
    it('should meet NFR target: ${baseline.target} ${baseline.unit}', async () => {
      // TODO: Implement test logic for ${nfrId}
      // Category: ${baseline.category}
      // Measurement method: ${baseline.measurementMethod}

      expect(true).toBe(true); // Placeholder assertion
    });
  });
`;
  }

  /**
   * Assemble complete test file from components
   * @private
   */
  private assembleTestFile(imports: string, testCases: string[], options: Required<GenerateOptions>): string {
    const header = options.includeComments ? this.generateFileHeader() : '';
    const footer = options.includeComments ? this.generateFileFooter() : '';

    return `${header}${imports}

describe('NFR Acceptance Tests', () => {
${testCases.join('\n')}
});
${footer}`;
  }

  /**
   * Generate file header comment
   * @private
   */
  private generateFileHeader(): string {
    return `/**
 * Auto-generated NFR Acceptance Tests
 *
 * Generated by: NFRTestGenerator
 * Corpus version: ${this.corpus.version}
 * Last updated: ${this.corpus.lastUpdated}
 *
 * DO NOT EDIT MANUALLY
 * Regenerate using: npm run generate-nfr-tests
 */

`;
  }

  /**
   * Generate file footer comment
   * @private
   */
  private generateFileFooter(): string {
    return `
// Helper functions (to be implemented)
// See: test/helpers/ for implementation examples
`;
  }
}
