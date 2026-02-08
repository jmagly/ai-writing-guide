/**
 * Performance Profiler Tests
 *
 * Comprehensive test suite for PerformanceProfiler component
 * covering sync/async measurement, statistical analysis, memory profiling,
 * and reporting functionality.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PerformanceProfiler, PerformanceResult } from '../../../src/testing/performance-profiler';

describe('PerformanceProfiler', () => {
  let profiler: PerformanceProfiler;

  beforeEach(() => {
    profiler = new PerformanceProfiler();
  });

  describe('measureSync', () => {
    it('should measure synchronous operation performance with correct statistical metrics', () => {
      const result = profiler.measureSync(() => {
        // Simulate work with a deterministic operation
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
          sum += i;
        }
      }, 100);

      // Validate all statistical properties
      expect(result.iterations).toBe(100);
      expect(result.samples).toHaveLength(100);
      expect(result.mean).toBeGreaterThan(0);
      expect(result.median).toBeGreaterThan(0);
      expect(result.p95).toBeGreaterThan(0);
      expect(result.p99).toBeGreaterThan(0);
      expect(result.min).toBeGreaterThanOrEqual(0);
      expect(result.max).toBeGreaterThan(0);
      expect(result.stddev).toBeGreaterThanOrEqual(0);
    });

    it('should throw error for non-positive iterations', () => {
      const invalidIterations = [0, -1];
      for (const iterations of invalidIterations) {
        expect(() => {
          profiler.measureSync(() => {}, iterations);
        }).toThrow('Iterations must be positive');
      }
    });

    it('should complete warmup iterations before measurement', () => {
      const warmupIterations = 10;
      const measurementIterations = 50;
      let callCount = 0;

      const profilerWithWarmup = new PerformanceProfiler({ warmupIterations });
      const fn = () => { callCount++; };

      profilerWithWarmup.measureSync(fn, measurementIterations);

      // Should be called warmup + measurement times
      expect(callCount).toBe(warmupIterations + measurementIterations);
    });

    it('should measure operations of varying durations correctly', () => {
      // Test sub-millisecond operations
      const fastResult = profiler.measureSync(() => {
        Math.sqrt(42);
      }, 1000);

      expect(fastResult.mean).toBeGreaterThan(0);
      expect(fastResult.mean).toBeLessThan(1); // Sub-millisecond

      // Test longer operations
      const slowResult = profiler.measureSync(() => {
        const start = Date.now();
        while (Date.now() - start < 10) {
          // Busy wait for ~10ms
        }
      }, 10);

      expect(slowResult.mean).toBeGreaterThan(9);
      expect(slowResult.mean).toBeLessThan(50); // Allow variance for CI
    });
  });

  describe('measureAsync', () => {
    it('should measure asynchronous operation performance', async () => {
      const result = await profiler.measureAsync(async () => {
        await new Promise(resolve => setTimeout(resolve, 5));
      }, 20);

      expect(result.iterations).toBe(20);
      expect(result.samples).toHaveLength(20);
      expect(result.mean).toBeGreaterThan(4);
      expect(result.mean).toBeLessThan(20); // Allow for timing variance
      expect(result.median).toBeGreaterThan(0);
      expect(result.p95).toBeGreaterThan(0);
    });

    it('should throw error for non-positive iterations', async () => {
      const invalidIterations = [0, -1];
      for (const iterations of invalidIterations) {
        await expect(
          profiler.measureAsync(async () => {}, iterations)
        ).rejects.toThrow('Iterations must be positive');
      }
    });

    it('should complete warmup iterations and measure Promise-based operations', async () => {
      const warmupIterations = 5;
      const measurementIterations = 10;
      let callCount = 0;

      const profilerWithWarmup = new PerformanceProfiler({ warmupIterations });
      const fn = async () => { callCount++; };

      await profilerWithWarmup.measureAsync(fn, measurementIterations);
      expect(callCount).toBe(warmupIterations + measurementIterations);

      // Also test Promise-based operations
      const result = await profiler.measureAsync(async () => {
        return await Promise.resolve(42);
      }, 100);

      expect(result.iterations).toBe(100);
      expect(result.samples).toHaveLength(100);
      expect(result.mean).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculatePercentile', () => {
    it('should calculate percentiles correctly for various values', () => {
      const samples = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      // Test multiple percentile values
      const percentileTests = [
        { percentile: 0, expected: 1 },
        { percentile: 50, expected: 5.5 },
        { percentile: 100, expected: 10 },
      ];

      for (const { percentile, expected } of percentileTests) {
        expect(profiler.calculatePercentile(samples, percentile)).toBe(expected);
      }
    });

    it('should calculate 95th percentile and handle interpolation', () => {
      const samples = Array.from({ length: 100 }, (_, i) => i + 1);
      const p95 = profiler.calculatePercentile(samples, 95);
      expect(p95).toBeCloseTo(95.05, 1);

      // Test interpolation for non-integer indices
      const smallSamples = [1, 2, 3, 4, 5];
      expect(profiler.calculatePercentile(smallSamples, 25)).toBe(2);
      expect(profiler.calculatePercentile(smallSamples, 75)).toBe(4);
    });

    it('should throw error for empty samples or invalid percentile values', () => {
      // Test empty samples
      expect(() => {
        profiler.calculatePercentile([], 50);
      }).toThrow('Cannot calculate percentile of empty sample set');

      // Test invalid percentile values
      const samples = [1, 2, 3];
      const invalidPercentiles = [-1, 101];
      for (const percentile of invalidPercentiles) {
        expect(() => {
          profiler.calculatePercentile(samples, percentile);
        }).toThrow('Percentile must be between 0 and 100');
      }
    });

    it('should handle single-element array for all percentiles', () => {
      const samples = [42];
      const percentiles = [0, 50, 100];

      for (const percentile of percentiles) {
        expect(profiler.calculatePercentile(samples, percentile)).toBe(42);
      }
    });
  });

  describe('calculateConfidenceInterval', () => {
    it('should calculate 95% confidence interval correctly', () => {
      const samples = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      const [lower, upper] = profiler.calculateConfidenceInterval(samples, 0.95);

      expect(lower).toBeLessThan(5.5);
      expect(upper).toBeGreaterThan(5.5);
      expect(upper - lower).toBeGreaterThan(0);
    });

    it('should calculate narrower relative intervals for larger sample sizes', () => {
      // Small sample: 10 values around 50
      const smallSamples = [48, 49, 50, 50, 50, 50, 51, 52, 48, 52];

      // Large sample: 1000 values with similar distribution
      const largeSamples = Array.from({ length: 1000 }, (_, i) => {
        const noise = (Math.random() - 0.5) * 4;
        return 50 + noise;
      });

      const [smallLower, smallUpper] = profiler.calculateConfidenceInterval(smallSamples, 0.95);
      const [largeLower, largeUpper] = profiler.calculateConfidenceInterval(largeSamples, 0.95);

      const smallMean = smallSamples.reduce((a, b) => a + b, 0) / smallSamples.length;
      const largeMean = largeSamples.reduce((a, b) => a + b, 0) / largeSamples.length;

      // Calculate relative widths
      const smallRelativeWidth = ((smallUpper - smallLower) / smallMean) * 100;
      const largeRelativeWidth = ((largeUpper - largeLower) / largeMean) * 100;

      expect(largeRelativeWidth).toBeLessThan(smallRelativeWidth);
    });

    it('should throw error for insufficient samples or invalid confidence levels', () => {
      // Test insufficient samples
      const insufficientSamples = [[1], []];
      for (const samples of insufficientSamples) {
        expect(() => {
          profiler.calculateConfidenceInterval(samples, 0.95);
        }).toThrow('Need at least 2 samples to calculate confidence interval');
      }

      // Test invalid confidence levels
      const samples = [1, 2, 3, 4, 5];
      const invalidLevels = [0, 1, -0.5, 1.5];
      for (const level of invalidLevels) {
        expect(() => {
          profiler.calculateConfidenceInterval(samples, level);
        }).toThrow('Confidence level must be between 0 and 1');
      }
    });

    it('should calculate different confidence levels with expected width relationships', () => {
      const samples = Array.from({ length: 100 }, (_, i) => i + 1);

      const [lower90, upper90] = profiler.calculateConfidenceInterval(samples, 0.90);
      const [lower95, upper95] = profiler.calculateConfidenceInterval(samples, 0.95);
      const [lower99, upper99] = profiler.calculateConfidenceInterval(samples, 0.99);

      const width90 = upper90 - lower90;
      const width95 = upper95 - lower95;
      const width99 = upper99 - lower99;

      // Higher confidence should result in wider intervals
      expect(width90).toBeLessThan(width95);
      expect(width95).toBeLessThan(width99);
    });
  });

  describe('measureMemory', () => {
    it('should measure memory usage with all required properties', () => {
      const result = profiler.measureMemory(() => {
        const arr = new Array(10000).fill(0);
        arr.reduce((sum, val) => sum + val, 0);
      });

      // Validate all memory properties exist and are numbers
      const expectedProps = ['heapUsed', 'heapTotal', 'external', 'arrayBuffers'];
      for (const prop of expectedProps) {
        expect(result).toHaveProperty(prop);
        expect(typeof result[prop as keyof typeof result]).toBe('number');
      }
    });

    it('should detect memory allocation including ArrayBuffers', () => {
      // Test heap allocation
      const heapResult = profiler.measureMemory(() => {
        const largeArray = new Array(100000).fill({ data: 'test' });
        largeArray.length; // Access to prevent optimization
      });
      expect(heapResult.heapUsed).toBeGreaterThan(0);

      // Test ArrayBuffer allocation
      const bufferResult = profiler.measureMemory(() => {
        const buffer = new ArrayBuffer(10000);
        buffer.byteLength; // Access to prevent optimization
      });
      expect(typeof bufferResult.arrayBuffers).toBe('number');
    });
  });

  describe('generateReport', () => {
    it('should generate formatted report for single result with all metrics', () => {
      const result: PerformanceResult = {
        mean: 5.123,
        median: 5.001,
        p95: 7.456,
        p99: 8.789,
        min: 3.111,
        max: 9.999,
        stddev: 1.234,
        confidenceInterval: [4.5, 5.7],
        samples: [5.0, 5.1, 5.2],
        iterations: 100,
      };

      const report = profiler.generateReport([result]);

      // Verify all metrics are present
      const expectedContent = [
        'Performance Profiler Report',
        'Iterations:     100',
        'Mean:           5.123 ms',
        'Median:         5.001 ms',
        'P95:            7.456 ms',
        'P99:            8.789 ms',
        'Min:            3.111 ms',
        'Max:            9.999 ms',
        'Std Dev:        1.234 ms',
        '95% CI:         [4.500, 5.700] ms',
      ];

      for (const content of expectedContent) {
        expect(report).toContain(content);
      }
    });

    it('should generate report for multiple results and include outlier information', () => {
      const results: PerformanceResult[] = [
        {
          mean: 5.0,
          median: 4.9,
          p95: 7.0,
          p99: 8.0,
          min: 3.0,
          max: 9.0,
          stddev: 1.0,
          confidenceInterval: [4.0, 6.0],
          samples: [5.0],
          iterations: 100,
        },
        {
          mean: 10.0,
          median: 9.9,
          p95: 14.0,
          p99: 16.0,
          min: 6.0,
          max: 18.0,
          stddev: 2.0,
          confidenceInterval: [8.0, 12.0],
          samples: [10.0],
          iterations: 200,
          outliersRemoved: 5,
        },
      ];

      const report = profiler.generateReport(results);

      expect(report).toContain('Measurement 1:');
      expect(report).toContain('Measurement 2:');
      expect(report).toContain('Iterations:     100');
      expect(report).toContain('Iterations:     200');
      expect(report).toContain('Outliers:       5 removed');
    });

    it('should handle empty results array', () => {
      const report = profiler.generateReport([]);
      expect(report).toBe('No performance results to report');
    });
  });

  describe('outlier filtering', () => {
    it('should filter outliers when enabled and not filter by default', () => {
      const profilerWithFiltering = new PerformanceProfiler({
        filterOutliers: true,
      });

      // Create data with outliers
      let iterationCount = 0;
      const resultWithFiltering = profilerWithFiltering.measureSync(() => {
        iterationCount++;
        if (iterationCount === 5 || iterationCount === 15) {
          const start = Date.now();
          while (Date.now() - start < 10) {
            // Busy wait to create outlier
          }
        } else {
          Math.sqrt(42);
        }
      }, 20);

      expect(resultWithFiltering.outliersRemoved).toBeGreaterThan(0);

      // Test default (no filtering)
      const resultNoFiltering = profiler.measureSync(() => {
        Math.sqrt(42);
      }, 100);

      expect(resultNoFiltering.outliersRemoved).toBeUndefined();
    });
  });

  describe('options configuration', () => {
    it('should use default and custom options correctly', () => {
      // Test default warmup
      const defaultProfiler = new PerformanceProfiler();
      let defaultCallCount = 0;
      defaultProfiler.measureSync(() => { defaultCallCount++; }, 10);
      expect(defaultCallCount).toBe(20); // 10 warmup + 10 measurement

      // Test custom warmup
      const customProfiler = new PerformanceProfiler({ warmupIterations: 5 });
      let customCallCount = 0;
      customProfiler.measureSync(() => { customCallCount++; }, 10);
      expect(customCallCount).toBe(15); // 5 warmup + 10 measurement

      // Test custom confidence level
      const confProfiler = new PerformanceProfiler({ confidenceLevel: 0.99 });
      const samples = Array.from({ length: 100 }, (_, i) => i + 1);
      const [lower, upper] = confProfiler.calculateConfidenceInterval(samples, 0.99);
      expect(upper - lower).toBeGreaterThan(0);
    });
  });

  describe('statistical accuracy', () => {
    it('should calculate mean and median correctly for various sample sizes', () => {
      // Test mean calculation
      const result = profiler.measureSync(() => {
        for (let i = 0; i < 100; i++) {
          Math.sqrt(i);
        }
      }, 100);

      const manualMean = result.samples.reduce((sum, val) => sum + val, 0) / result.samples.length;
      expect(result.mean).toBeCloseTo(manualMean, 10);

      // Test median for odd count
      const oddSamples = [1, 2, 3, 4, 5];
      const oddMedian = profiler.calculatePercentile(oddSamples, 50);
      expect(oddMedian).toBe(3);

      // Test median for even count
      const evenSamples = [1, 2, 3, 4, 5, 6];
      const evenMedian = profiler.calculatePercentile(evenSamples, 50);
      expect(evenMedian).toBe(3.5);
    });

    it('should maintain statistical invariants (min <= median <= max, mean in CI)', () => {
      const result = profiler.measureSync(() => {
        Math.random();
      }, 100);

      // Test ordering invariant
      expect(result.min).toBeLessThanOrEqual(result.median);
      expect(result.median).toBeLessThanOrEqual(result.max);

      // Test confidence interval contains mean
      const [lower, upper] = result.confidenceInterval;
      expect(result.mean).toBeGreaterThanOrEqual(lower - 0.001);
      expect(result.mean).toBeLessThanOrEqual(upper + 0.001);
    });
  });

  describe('edge cases', () => {
    it('should handle very fast operations and high-variance operations', () => {
      // Test very fast operations
      const fastResult = profiler.measureSync(() => {
        1 + 1;
      }, 1000);

      expect(fastResult.mean).toBeGreaterThanOrEqual(0);
      expect(fastResult.samples).toHaveLength(1000);

      // Test high variance
      let toggle = false;
      const variableResult = profiler.measureSync(() => {
        toggle = !toggle;
        if (toggle) {
          Math.sqrt(42);
        } else {
          for (let i = 0; i < 1000; i++) {
            Math.sqrt(i);
          }
        }
      }, 100);

      expect(variableResult.stddev).toBeGreaterThan(0);
      expect(variableResult.max).toBeGreaterThan(variableResult.min);
    });
  });
});
