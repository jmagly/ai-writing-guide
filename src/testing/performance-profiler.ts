/**
 * PerformanceProfiler - NFR performance measurement with statistical rigor
 *
 * Provides high-precision performance measurement, statistical analysis,
 * and memory profiling for validating NFR performance targets.
 *
 * Features:
 * - Sub-millisecond precision timing using performance.now()
 * - Statistical analysis (95th percentile, 95% confidence intervals)
 * - Outlier detection and filtering (IQR method)
 * - Memory profiling support
 * - Async operation support
 * - Comprehensive reporting
 *
 * @module testing/performance-profiler
 */

/**
 * Performance measurement result with statistical analysis
 */
export interface PerformanceResult {
  /** Arithmetic mean of all samples */
  mean: number;
  /** Median (50th percentile) of all samples */
  median: number;
  /** 95th percentile latency */
  p95: number;
  /** 99th percentile latency */
  p99: number;
  /** Minimum observed value */
  min: number;
  /** Maximum observed value */
  max: number;
  /** Standard deviation */
  stddev: number;
  /** 95% confidence interval [lower, upper] bounds */
  confidenceInterval: [number, number];
  /** Raw sample measurements (milliseconds) */
  samples: number[];
  /** Number of iterations performed */
  iterations: number;
  /** Number of outliers removed (if filtering enabled) */
  outliersRemoved?: number;
}

/**
 * Memory usage measurement result
 */
export interface MemoryResult {
  /** Heap memory used (bytes) */
  heapUsed: number;
  /** Total heap memory allocated (bytes) */
  heapTotal: number;
  /** External memory used (bytes) */
  external: number;
  /** ArrayBuffer memory used (bytes) */
  arrayBuffers: number;
}

/**
 * Configuration options for performance measurements
 */
export interface ProfilerOptions {
  /** Number of warmup iterations before measurement (default: 10) */
  warmupIterations?: number;
  /** Whether to filter outliers using IQR method (default: false) */
  filterOutliers?: boolean;
  /** Confidence level for confidence interval (default: 0.95) */
  confidenceLevel?: number;
}

/**
 * PerformanceProfiler - Measure and validate NFR performance targets
 *
 * @example
 * ```typescript
 * const profiler = new PerformanceProfiler();
 *
 * // Measure synchronous operation
 * const result = profiler.measureSync(() => {
 *   // Operation to measure
 * }, 1000);
 *
 * console.log(`P95 latency: ${result.p95.toFixed(3)}ms`);
 * console.log(`95% CI: [${result.confidenceInterval[0].toFixed(3)}, ${result.confidenceInterval[1].toFixed(3)}]ms`);
 * ```
 */
export class PerformanceProfiler {
  private options: Required<ProfilerOptions>;

  constructor(options: ProfilerOptions = {}) {
    this.options = {
      warmupIterations: options.warmupIterations ?? 10,
      filterOutliers: options.filterOutliers ?? false,
      confidenceLevel: options.confidenceLevel ?? 0.95,
    };
  }

  /**
   * Measure synchronous operation performance
   *
   * @param fn - Function to measure
   * @param iterations - Number of measurement iterations
   * @returns Performance measurement results with statistics
   */
  measureSync(fn: () => void, iterations: number): PerformanceResult {
    if (iterations <= 0) {
      throw new Error('Iterations must be positive');
    }

    // Warmup phase to stabilize JIT compilation
    for (let i = 0; i < this.options.warmupIterations; i++) {
      fn();
    }

    // Measurement phase
    const samples: number[] = [];
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      fn();
      const end = performance.now();
      samples.push(end - start);
    }

    return this.analyzeResults(samples, iterations);
  }

  /**
   * Measure asynchronous operation performance
   *
   * @param fn - Async function to measure
   * @param iterations - Number of measurement iterations
   * @returns Performance measurement results with statistics
   */
  async measureAsync(fn: () => Promise<void>, iterations: number): Promise<PerformanceResult> {
    if (iterations <= 0) {
      throw new Error('Iterations must be positive');
    }

    // Warmup phase
    for (let i = 0; i < this.options.warmupIterations; i++) {
      await fn();
    }

    // Measurement phase
    const samples: number[] = [];
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await fn();
      const end = performance.now();
      samples.push(end - start);
    }

    return this.analyzeResults(samples, iterations);
  }

  /**
   * Calculate specific percentile from samples
   *
   * @param samples - Array of measurements
   * @param percentile - Percentile to calculate (0-100)
   * @returns Percentile value
   */
  calculatePercentile(samples: number[], percentile: number): number {
    if (samples.length === 0) {
      throw new Error('Cannot calculate percentile of empty sample set');
    }
    if (percentile < 0 || percentile > 100) {
      throw new Error('Percentile must be between 0 and 100');
    }

    const sorted = [...samples].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);

    if (Number.isInteger(index)) {
      return sorted[index];
    }

    // Linear interpolation for non-integer indices
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  /**
   * Calculate confidence interval using t-distribution
   *
   * @param samples - Array of measurements
   * @param confidence - Confidence level (0-1)
   * @returns Confidence interval [lower, upper] bounds
   */
  calculateConfidenceInterval(samples: number[], confidence: number): [number, number] {
    if (samples.length < 2) {
      throw new Error('Need at least 2 samples to calculate confidence interval');
    }
    if (confidence <= 0 || confidence >= 1) {
      throw new Error('Confidence level must be between 0 and 1');
    }

    const n = samples.length;
    const mean = this.calculateMean(samples);
    const stddev = this.calculateStdDev(samples, mean);

    // Standard error of the mean
    const sem = stddev / Math.sqrt(n);

    // Critical value from t-distribution (approximation for large n)
    // For n >= 30, t-distribution ≈ normal distribution
    const tCritical = this.getTCriticalValue(n - 1, confidence);

    // Margin of error
    const marginOfError = tCritical * sem;

    return [mean - marginOfError, mean + marginOfError];
  }

  /**
   * Measure memory usage of an operation
   *
   * @param fn - Function to measure memory usage
   * @returns Memory usage statistics
   */
  measureMemory(fn: () => void): MemoryResult {
    // Force garbage collection if available (requires --expose-gc flag)
    if (global.gc) {
      global.gc();
    }

    const memBefore = process.memoryUsage();

    fn();

    const memAfter = process.memoryUsage();

    return {
      heapUsed: memAfter.heapUsed - memBefore.heapUsed,
      heapTotal: memAfter.heapTotal - memBefore.heapTotal,
      external: memAfter.external - memBefore.external,
      arrayBuffers: memAfter.arrayBuffers - memBefore.arrayBuffers,
    };
  }

  /**
   * Generate formatted performance report
   *
   * @param results - Array of performance results to report
   * @returns Formatted report string
   */
  generateReport(results: PerformanceResult[]): string {
    if (results.length === 0) {
      return 'No performance results to report';
    }

    const lines: string[] = [
      '╔════════════════════════════════════════════════════════════╗',
      '║           Performance Profiler Report                      ║',
      '╚════════════════════════════════════════════════════════════╝',
      '',
    ];

    results.forEach((result, index) => {
      lines.push(`Measurement ${index + 1}:`);
      lines.push(`  Iterations:     ${result.iterations}`);
      lines.push(`  Mean:           ${result.mean.toFixed(3)} ms`);
      lines.push(`  Median:         ${result.median.toFixed(3)} ms`);
      lines.push(`  P95:            ${result.p95.toFixed(3)} ms`);
      lines.push(`  P99:            ${result.p99.toFixed(3)} ms`);
      lines.push(`  Min:            ${result.min.toFixed(3)} ms`);
      lines.push(`  Max:            ${result.max.toFixed(3)} ms`);
      lines.push(`  Std Dev:        ${result.stddev.toFixed(3)} ms`);
      lines.push(`  95% CI:         [${result.confidenceInterval[0].toFixed(3)}, ${result.confidenceInterval[1].toFixed(3)}] ms`);

      if (result.outliersRemoved !== undefined && result.outliersRemoved > 0) {
        lines.push(`  Outliers:       ${result.outliersRemoved} removed`);
      }

      lines.push('');
    });

    return lines.join('\n');
  }

  /**
   * Analyze raw samples and compute statistics
   *
   * @private
   */
  private analyzeResults(rawSamples: number[], iterations: number): PerformanceResult {
    let samples = rawSamples;
    let outliersRemoved = 0;

    // Filter outliers if enabled
    if (this.options.filterOutliers) {
      const filtered = this.filterOutliers(samples);
      samples = filtered.filtered;
      outliersRemoved = filtered.outliers.length;
    }

    // Calculate statistics
    const mean = this.calculateMean(samples);
    const stddev = this.calculateStdDev(samples, mean);
    const median = this.calculatePercentile(samples, 50);
    const p95 = this.calculatePercentile(samples, 95);
    const p99 = this.calculatePercentile(samples, 99);
    const min = Math.min(...samples);
    const max = Math.max(...samples);
    const confidenceInterval = this.calculateConfidenceInterval(samples, this.options.confidenceLevel);

    return {
      mean,
      median,
      p95,
      p99,
      min,
      max,
      stddev,
      confidenceInterval,
      samples: rawSamples, // Return original samples
      iterations,
      outliersRemoved: outliersRemoved > 0 ? outliersRemoved : undefined,
    };
  }

  /**
   * Filter outliers using IQR (Interquartile Range) method
   *
   * @private
   */
  private filterOutliers(samples: number[]): { filtered: number[]; outliers: number[] } {
    const q1 = this.calculatePercentile(samples, 25);
    const q3 = this.calculatePercentile(samples, 75);
    const iqr = q3 - q1;

    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    const filtered: number[] = [];
    const outliers: number[] = [];

    for (const sample of samples) {
      if (sample >= lowerBound && sample <= upperBound) {
        filtered.push(sample);
      } else {
        outliers.push(sample);
      }
    }

    return { filtered, outliers };
  }

  /**
   * Calculate arithmetic mean
   *
   * @private
   */
  private calculateMean(samples: number[]): number {
    return samples.reduce((sum, val) => sum + val, 0) / samples.length;
  }

  /**
   * Calculate standard deviation
   *
   * @private
   */
  private calculateStdDev(samples: number[], mean: number): number {
    const variance = samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (samples.length - 1);
    return Math.sqrt(variance);
  }

  /**
   * Get critical t-value for confidence interval
   * Uses approximation for large sample sizes
   *
   * @private
   */
  private getTCriticalValue(degreesOfFreedom: number, confidence: number): number {
    // For large samples (df >= 30), use normal approximation
    if (degreesOfFreedom >= 30) {
      // Z-scores for common confidence levels
      const zScores: Record<string, number> = {
        '0.90': 1.645,
        '0.95': 1.960,
        '0.99': 2.576,
      };
      return zScores[confidence.toFixed(2)] ?? 1.960;
    }

    // T-table for small samples (df < 30)
    // Simplified lookup table for 95% confidence
    const tTable: Record<number, number> = {
      1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571,
      6: 2.447, 7: 2.365, 8: 2.306, 9: 2.262, 10: 2.228,
      15: 2.131, 20: 2.086, 25: 2.060, 29: 2.045,
    };

    // Find closest df in table
    const availableDf = Object.keys(tTable).map(Number);
    const closestDf = availableDf.reduce((prev, curr) =>
      Math.abs(curr - degreesOfFreedom) < Math.abs(prev - degreesOfFreedom) ? curr : prev
    );

    return tTable[closestDf];
  }
}
