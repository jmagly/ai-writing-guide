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
    it('should measure synchronous operation performance', () => {
      const result = profiler.measureSync(() => {
        // Simulate work with a deterministic operation
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
          sum += i;
        }
      }, 100);

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
      expect(() => {
        profiler.measureSync(() => {}, 0);
      }).toThrow('Iterations must be positive');

      expect(() => {
        profiler.measureSync(() => {}, -1);
      }).toThrow('Iterations must be positive');
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

    it('should measure sub-millisecond operations with precision', () => {
      // Very fast operation
      const result = profiler.measureSync(() => {
        Math.sqrt(42);
      }, 1000);

      expect(result.mean).toBeGreaterThan(0);
      // Should have sub-millisecond precision
      expect(result.mean).toBeLessThan(1);
    });

    it('should handle longer operations correctly', () => {
      const result = profiler.measureSync(() => {
        // Simulate longer operation
        const start = Date.now();
        while (Date.now() - start < 10) {
          // Busy wait for ~10ms
        }
      }, 10);

      expect(result.mean).toBeGreaterThan(9);
      expect(result.mean).toBeLessThan(15);
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
      await expect(
        profiler.measureAsync(async () => {}, 0)
      ).rejects.toThrow('Iterations must be positive');

      await expect(
        profiler.measureAsync(async () => {}, -1)
      ).rejects.toThrow('Iterations must be positive');
    });

    it('should complete warmup iterations before measurement', async () => {
      const warmupIterations = 5;
      const measurementIterations = 10;
      let callCount = 0;

      const profilerWithWarmup = new PerformanceProfiler({ warmupIterations });
      const fn = async () => { callCount++; };

      await profilerWithWarmup.measureAsync(fn, measurementIterations);

      expect(callCount).toBe(warmupIterations + measurementIterations);
    });

    it('should measure Promise-based async operations', async () => {
      const result = await profiler.measureAsync(async () => {
        return await Promise.resolve(42);
      }, 100);

      expect(result.iterations).toBe(100);
      expect(result.samples).toHaveLength(100);
      expect(result.mean).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculatePercentile', () => {
    it('should calculate percentiles correctly', () => {
      const samples = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      expect(profiler.calculatePercentile(samples, 0)).toBe(1);
      expect(profiler.calculatePercentile(samples, 50)).toBe(5.5);
      expect(profiler.calculatePercentile(samples, 100)).toBe(10);
    });

    it('should calculate 95th percentile correctly', () => {
      const samples = Array.from({ length: 100 }, (_, i) => i + 1);

      const p95 = profiler.calculatePercentile(samples, 95);
      expect(p95).toBeCloseTo(95.05, 1);
    });

    it('should handle interpolation for non-integer indices', () => {
      const samples = [1, 2, 3, 4, 5];

      const p25 = profiler.calculatePercentile(samples, 25);
      expect(p25).toBe(2);

      const p75 = profiler.calculatePercentile(samples, 75);
      expect(p75).toBe(4);
    });

    it('should throw error for empty samples', () => {
      expect(() => {
        profiler.calculatePercentile([], 50);
      }).toThrow('Cannot calculate percentile of empty sample set');
    });

    it('should throw error for invalid percentile values', () => {
      const samples = [1, 2, 3];

      expect(() => {
        profiler.calculatePercentile(samples, -1);
      }).toThrow('Percentile must be between 0 and 100');

      expect(() => {
        profiler.calculatePercentile(samples, 101);
      }).toThrow('Percentile must be between 0 and 100');
    });

    it('should handle single-element array', () => {
      const samples = [42];

      expect(profiler.calculatePercentile(samples, 0)).toBe(42);
      expect(profiler.calculatePercentile(samples, 50)).toBe(42);
      expect(profiler.calculatePercentile(samples, 100)).toBe(42);
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
      // Use same mean/stddev but different sample sizes to test CI narrowing
      // Small sample: 10 values around 50
      const smallSamples = [48, 49, 50, 50, 50, 50, 51, 52, 48, 52];

      // Large sample: 1000 values with similar distribution
      const largeSamples = Array.from({ length: 1000 }, (_, i) => {
        // Generate values around 50 with similar variance
        const noise = (Math.random() - 0.5) * 4; // Similar range to small sample
        return 50 + noise;
      });

      const [smallLower, smallUpper] = profiler.calculateConfidenceInterval(smallSamples, 0.95);
      const [largeLower, largeUpper] = profiler.calculateConfidenceInterval(largeSamples, 0.95);

      const smallMean = smallSamples.reduce((a, b) => a + b, 0) / smallSamples.length;
      const largeMean = largeSamples.reduce((a, b) => a + b, 0) / largeSamples.length;

      // Calculate relative widths (as percentage of mean)
      const smallRelativeWidth = ((smallUpper - smallLower) / smallMean) * 100;
      const largeRelativeWidth = ((largeUpper - largeLower) / largeMean) * 100;

      // Larger sample should have narrower relative CI
      expect(largeRelativeWidth).toBeLessThan(smallRelativeWidth);
    });

    it('should throw error for insufficient samples', () => {
      expect(() => {
        profiler.calculateConfidenceInterval([1], 0.95);
      }).toThrow('Need at least 2 samples to calculate confidence interval');

      expect(() => {
        profiler.calculateConfidenceInterval([], 0.95);
      }).toThrow('Need at least 2 samples to calculate confidence interval');
    });

    it('should throw error for invalid confidence levels', () => {
      const samples = [1, 2, 3, 4, 5];

      expect(() => {
        profiler.calculateConfidenceInterval(samples, 0);
      }).toThrow('Confidence level must be between 0 and 1');

      expect(() => {
        profiler.calculateConfidenceInterval(samples, 1);
      }).toThrow('Confidence level must be between 0 and 1');

      expect(() => {
        profiler.calculateConfidenceInterval(samples, -0.5);
      }).toThrow('Confidence level must be between 0 and 1');

      expect(() => {
        profiler.calculateConfidenceInterval(samples, 1.5);
      }).toThrow('Confidence level must be between 0 and 1');
    });

    it('should calculate different confidence levels', () => {
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
    it('should measure memory usage of operation', () => {
      const result = profiler.measureMemory(() => {
        // Allocate some memory
        const arr = new Array(10000).fill(0);
        arr.reduce((sum, val) => sum + val, 0);
      });

      expect(result).toHaveProperty('heapUsed');
      expect(result).toHaveProperty('heapTotal');
      expect(result).toHaveProperty('external');
      expect(result).toHaveProperty('arrayBuffers');

      expect(typeof result.heapUsed).toBe('number');
      expect(typeof result.heapTotal).toBe('number');
      expect(typeof result.external).toBe('number');
      expect(typeof result.arrayBuffers).toBe('number');
    });

    it('should detect memory allocation', () => {
      const result = profiler.measureMemory(() => {
        // Allocate significant memory
        const largeArray = new Array(100000).fill({ data: 'test' });
        largeArray.length; // Access to prevent optimization
      });

      // Should show some memory was allocated
      expect(result.heapUsed).toBeGreaterThan(0);
    });

    it('should measure ArrayBuffer memory separately', () => {
      const result = profiler.measureMemory(() => {
        const buffer = new ArrayBuffer(10000);
        buffer.byteLength; // Access to prevent optimization
      });

      expect(typeof result.arrayBuffers).toBe('number');
    });
  });

  describe('generateReport', () => {
    it('should generate formatted report for single result', () => {
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

      expect(report).toContain('Performance Profiler Report');
      expect(report).toContain('Iterations:     100');
      expect(report).toContain('Mean:           5.123 ms');
      expect(report).toContain('Median:         5.001 ms');
      expect(report).toContain('P95:            7.456 ms');
      expect(report).toContain('P99:            8.789 ms');
      expect(report).toContain('Min:            3.111 ms');
      expect(report).toContain('Max:            9.999 ms');
      expect(report).toContain('Std Dev:        1.234 ms');
      expect(report).toContain('95% CI:         [4.500, 5.700] ms');
    });

    it('should generate report for multiple results', () => {
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
        },
      ];

      const report = profiler.generateReport(results);

      expect(report).toContain('Measurement 1:');
      expect(report).toContain('Measurement 2:');
      expect(report).toContain('Iterations:     100');
      expect(report).toContain('Iterations:     200');
    });

    it('should include outlier information when present', () => {
      const result: PerformanceResult = {
        mean: 5.0,
        median: 5.0,
        p95: 7.0,
        p99: 8.0,
        min: 3.0,
        max: 9.0,
        stddev: 1.0,
        confidenceInterval: [4.0, 6.0],
        samples: [5.0],
        iterations: 100,
        outliersRemoved: 5,
      };

      const report = profiler.generateReport([result]);

      expect(report).toContain('Outliers:       5 removed');
    });

    it('should handle empty results array', () => {
      const report = profiler.generateReport([]);

      expect(report).toBe('No performance results to report');
    });
  });

  describe('outlier filtering', () => {
    it('should filter outliers when enabled', () => {
      const profilerWithFiltering = new PerformanceProfiler({
        filterOutliers: true,
      });

      // Create data with outliers: mostly 1ms, but some 100ms
      let iterationCount = 0;
      const result = profilerWithFiltering.measureSync(() => {
        iterationCount++;
        if (iterationCount === 5 || iterationCount === 15) {
          // Simulate outlier
          const start = Date.now();
          while (Date.now() - start < 10) {
            // Busy wait
          }
        } else {
          // Fast operation
          Math.sqrt(42);
        }
      }, 20);

      expect(result.outliersRemoved).toBeGreaterThan(0);
    });

    it('should not filter outliers by default', () => {
      const result = profiler.measureSync(() => {
        Math.sqrt(42);
      }, 100);

      expect(result.outliersRemoved).toBeUndefined();
    });
  });

  describe('options configuration', () => {
    it('should use default options when not specified', () => {
      const defaultProfiler = new PerformanceProfiler();
      let callCount = 0;

      defaultProfiler.measureSync(() => { callCount++; }, 10);

      // Default warmup is 10
      expect(callCount).toBe(20); // 10 warmup + 10 measurement
    });

    it('should use custom warmup iterations', () => {
      const customProfiler = new PerformanceProfiler({
        warmupIterations: 5,
      });
      let callCount = 0;

      customProfiler.measureSync(() => { callCount++; }, 10);

      expect(callCount).toBe(15); // 5 warmup + 10 measurement
    });

    it('should use custom confidence level', () => {
      const customProfiler = new PerformanceProfiler({
        confidenceLevel: 0.99,
      });

      const samples = Array.from({ length: 100 }, (_, i) => i + 1);
      const [lower, upper] = customProfiler.calculateConfidenceInterval(samples, 0.99);

      expect(upper - lower).toBeGreaterThan(0);
    });
  });

  describe('statistical accuracy', () => {
    it('should calculate mean correctly', () => {
      const result = profiler.measureSync(() => {
        // Deterministic operation
        for (let i = 0; i < 100; i++) {
          Math.sqrt(i);
        }
      }, 100);

      const manualMean = result.samples.reduce((sum, val) => sum + val, 0) / result.samples.length;
      expect(result.mean).toBeCloseTo(manualMean, 10);
    });

    it('should calculate median correctly for odd sample count', () => {
      // Manual test with known values
      const samples = [1, 2, 3, 4, 5];
      const median = profiler.calculatePercentile(samples, 50);
      expect(median).toBe(3);
    });

    it('should calculate median correctly for even sample count', () => {
      const samples = [1, 2, 3, 4, 5, 6];
      const median = profiler.calculatePercentile(samples, 50);
      expect(median).toBe(3.5);
    });

    it('should have min <= median <= max', () => {
      const result = profiler.measureSync(() => {
        Math.random();
      }, 100);

      expect(result.min).toBeLessThanOrEqual(result.median);
      expect(result.median).toBeLessThanOrEqual(result.max);
    });

    it('should have mean within confidence interval', () => {
      const result = profiler.measureSync(() => {
        Math.random();
      }, 100);

      const [lower, upper] = result.confidenceInterval;

      // Mean should typically be within CI (95% confidence)
      expect(result.mean).toBeGreaterThanOrEqual(lower - 0.001); // Small epsilon for floating point
      expect(result.mean).toBeLessThanOrEqual(upper + 0.001);
    });
  });

  describe('edge cases', () => {
    it('should handle very fast operations', () => {
      const result = profiler.measureSync(() => {
        // Almost instant
        1 + 1;
      }, 1000);

      expect(result.mean).toBeGreaterThanOrEqual(0);
      expect(result.samples).toHaveLength(1000);
    });

    it('should handle operations with high variance', () => {
      let toggle = false;
      const result = profiler.measureSync(() => {
        toggle = !toggle;
        if (toggle) {
          // Fast
          Math.sqrt(42);
        } else {
          // Slower
          for (let i = 0; i < 1000; i++) {
            Math.sqrt(i);
          }
        }
      }, 100);

      expect(result.stddev).toBeGreaterThan(0);
      expect(result.max).toBeGreaterThan(result.min);
    });
  });
});
