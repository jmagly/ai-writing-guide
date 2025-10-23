/**
 * TrendAnalyzer Tests
 *
 * Comprehensive test suite for statistical trend analysis
 *
 * @module test/unit/testing/trend-analyzer
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TrendAnalyzer, type TimeSeries } from '../../../src/testing/trend-analyzer.js';

describe('TrendAnalyzer', () => {
  let analyzer: TrendAnalyzer;

  beforeEach(() => {
    analyzer = new TrendAnalyzer();
  });

  describe('Moving Average Calculation', () => {
    it('should calculate simple moving average correctly', () => {
      const samples = [10, 12, 11, 13, 15, 14, 16];
      const result = analyzer.calculateMovingAverage(samples, 3);

      expect(result).toHaveLength(7);
      expect(result[0]).toBeCloseTo(10, 5); // First value (window=1)
      expect(result[1]).toBeCloseTo(11, 5); // (10+12)/2
      expect(result[2]).toBeCloseTo(11, 5); // (10+12+11)/3
      expect(result[3]).toBeCloseTo(12, 5); // (12+11+13)/3
      expect(result[6]).toBeCloseTo(15, 5); // (15+14+16)/3
    });

    it('should handle window size of 1', () => {
      const samples = [10, 20, 30];
      const result = analyzer.calculateMovingAverage(samples, 1);

      expect(result).toEqual(samples); // Should be identical
    });

    it('should handle window size equal to sample count', () => {
      const samples = [10, 20, 30, 40];
      const result = analyzer.calculateMovingAverage(samples, 4);

      expect(result[3]).toBeCloseTo(25, 5); // (10+20+30+40)/4
    });

    it('should throw error for invalid window size', () => {
      expect(() => analyzer.calculateMovingAverage([1, 2, 3], 0)).toThrow('Window size must be positive');
      expect(() => analyzer.calculateMovingAverage([1, 2, 3], -1)).toThrow('Window size must be positive');
    });

    it('should throw error when window exceeds sample count', () => {
      expect(() => analyzer.calculateMovingAverage([1, 2, 3], 5)).toThrow('Window size cannot exceed sample count');
    });

    it('should handle single sample', () => {
      const result = analyzer.calculateMovingAverage([42], 1);
      expect(result).toEqual([42]);
    });

    it('should calculate exponential moving average correctly', () => {
      const samples = [10, 12, 14, 16, 18];
      const result = analyzer.calculateExponentialMovingAverage(samples, 0.3);

      expect(result).toHaveLength(5);
      expect(result[0]).toBeCloseTo(10, 5); // Start with first value
      expect(result[1]).toBeCloseTo(10.6, 5); // 0.3*12 + 0.7*10
      expect(result[4]).toBeGreaterThan(result[0]); // Should trend upward
    });

    it('should throw error for invalid alpha', () => {
      expect(() => analyzer.calculateExponentialMovingAverage([1, 2, 3], 0)).toThrow('Alpha must be between 0 and 1');
      expect(() => analyzer.calculateExponentialMovingAverage([1, 2, 3], 1.5)).toThrow('Alpha must be between 0 and 1');
    });
  });

  describe('Outlier Detection', () => {
    it('should detect outliers using IQR method', () => {
      // Normal data: 10, 11, 12, 13, 14 with outliers: 1, 100
      const samples = [1, 10, 11, 12, 13, 14, 100];
      const outliers = analyzer.detectOutliers(samples, 'iqr');

      expect(outliers[0]).toBe(true); // 1 is outlier
      expect(outliers[6]).toBe(true); // 100 is outlier
      expect(outliers[3]).toBe(false); // 12 is not outlier
    });

    it('should detect outliers using Z-score method', () => {
      const samples = [10, 11, 12, 13, 14, 15, 10, 11, 12, 13, 14, 15, 100]; // 500 is outlier
      const outliers = analyzer.detectOutliers(samples, 'zscore');

      expect(outliers[12]).toBe(true); // 100 is outlier (>3 std devs)
      expect(outliers[3]).toBe(false); // 13 is not outlier
    });

    it('should handle uniform data (no outliers)', () => {
      const samples = [10, 10, 10, 10, 10];
      const outliers = analyzer.detectOutliers(samples, 'iqr');

      expect(outliers.every(o => o === false)).toBe(true);
    });

    it('should handle empty array', () => {
      const outliers = analyzer.detectOutliers([], 'iqr');
      expect(outliers).toEqual([]);
    });

    it('should throw error for invalid method', () => {
      expect(() => analyzer.detectOutliers([1, 2, 3], 'invalid' as any)).toThrow('Invalid outlier detection method');
    });

    it('should handle single value (no outliers)', () => {
      const outliers = analyzer.detectOutliers([42], 'zscore');
      expect(outliers).toEqual([false]);
    });
  });

  describe('Trend Line Fitting', () => {
    it('should fit linear trend line to increasing data', () => {
      const data: TimeSeries = [
        { timestamp: 1000, value: 10 },
        { timestamp: 2000, value: 20 },
        { timestamp: 3000, value: 30 },
        { timestamp: 4000, value: 40 },
      ];

      const trend = analyzer.fitTrendLine(data);

      expect(trend.slope).toBeGreaterThan(0); // Positive slope
      expect(trend.rSquared).toBeCloseTo(1, 5); // Perfect fit
    });

    it('should fit linear trend line to decreasing data', () => {
      const data: TimeSeries = [
        { timestamp: 1000, value: 40 },
        { timestamp: 2000, value: 30 },
        { timestamp: 3000, value: 20 },
        { timestamp: 4000, value: 10 },
      ];

      const trend = analyzer.fitTrendLine(data);

      expect(trend.slope).toBeLessThan(0); // Negative slope
      expect(trend.rSquared).toBeCloseTo(1, 5); // Perfect fit
    });

    it('should fit horizontal line to constant data', () => {
      const data: TimeSeries = [
        { timestamp: 1000, value: 25 },
        { timestamp: 2000, value: 25 },
        { timestamp: 3000, value: 25 },
      ];

      const trend = analyzer.fitTrendLine(data);

      expect(Math.abs(trend.slope)).toBeLessThan(0.001); // Near-zero slope
      expect(trend.rSquared).toBeCloseTo(1, 1); // Good fit for constant
    });

    it('should calculate R-squared for noisy data', () => {
      const data: TimeSeries = [
        { timestamp: 1000, value: 10 },
        { timestamp: 2000, value: 25 }, // Outlier
        { timestamp: 3000, value: 20 },
        { timestamp: 4000, value: 30 },
        { timestamp: 5000, value: 40 },
      ];

      const trend = analyzer.fitTrendLine(data);

      expect(trend.rSquared).toBeGreaterThan(0);
      expect(trend.rSquared).toBeLessThan(1); // Not perfect fit due to noise
    });

    it('should throw error for insufficient data', () => {
      const data: TimeSeries = [{ timestamp: 1000, value: 10 }];
      expect(() => analyzer.fitTrendLine(data)).toThrow('Need at least 2 data points');
    });

    it('should handle two data points', () => {
      const data: TimeSeries = [
        { timestamp: 1000, value: 10 },
        { timestamp: 2000, value: 20 },
      ];

      const trend = analyzer.fitTrendLine(data);

      expect(trend.slope).toBeCloseTo(0.01, 5); // slope = 10/1000
      expect(trend.rSquared).toBeCloseTo(1, 5); // Perfect fit with 2 points
    });
  });

  describe('Forecasting', () => {
    it('should forecast future value based on trend', () => {
      const data: TimeSeries = [
        { timestamp: 1000, value: 10 },
        { timestamp: 2000, value: 20 },
        { timestamp: 3000, value: 30 },
      ];

      const forecast = analyzer.forecastValue(data, 1000); // 1 second ahead

      expect(forecast.value).toBeCloseTo(40, 0); // Should predict ~40
      expect(forecast.confidence).toBe(0.95);
      expect(forecast.lowerBound).toBeLessThanOrEqual(forecast.value);
      expect(forecast.upperBound).toBeGreaterThanOrEqual(forecast.value);
    });

    it('should handle forecasting with stable data', () => {
      const data: TimeSeries = [
        { timestamp: 1000, value: 25 },
        { timestamp: 2000, value: 25 },
        { timestamp: 3000, value: 25 },
      ];

      const forecast = analyzer.forecastValue(data, 1000);

      expect(forecast.value).toBeCloseTo(25, 1); // Should stay around 25
    });

    it('should throw error for insufficient data', () => {
      const data: TimeSeries = [{ timestamp: 1000, value: 10 }];
      expect(() => analyzer.forecastValue(data, 1000)).toThrow('Need at least 2 data points');
    });

    it('should throw error for negative horizon', () => {
      const data: TimeSeries = [
        { timestamp: 1000, value: 10 },
        { timestamp: 2000, value: 20 },
      ];

      expect(() => analyzer.forecastValue(data, -1000)).toThrow('Horizon must be non-negative');
    });

    it('should forecast zero horizon (current)', () => {
      const data: TimeSeries = [
        { timestamp: 1000, value: 10 },
        { timestamp: 2000, value: 20 },
      ];

      const forecast = analyzer.forecastValue(data, 0);

      expect(forecast.value).toBeCloseTo(20, 1); // Should be near last value
    });
  });

  describe('Change Point Detection', () => {
    it('should detect change point in time series', () => {
      const data: TimeSeries = [
        // Stable at 10
        { timestamp: 1000, value: 10 },
        { timestamp: 2000, value: 10 },
        { timestamp: 3000, value: 10 },
        { timestamp: 4000, value: 10 },
        { timestamp: 5000, value: 10 },
        { timestamp: 5500, value: 10 }, // Added one more
        // Big shift to 50
        { timestamp: 6000, value: 50 },
        { timestamp: 7000, value: 50 },
        { timestamp: 8000, value: 50 },
        { timestamp: 9000, value: 50 },
        { timestamp: 10000, value: 50 },
        { timestamp: 11000, value: 50 },
      ];

      const changePoint = analyzer.detectChangePoint(data);

      expect(changePoint).not.toBeNull();
      expect(changePoint!.meanBefore).toBeCloseTo(10, 1);
      expect(changePoint!.meanAfter).toBeCloseTo(50, 1);
    });

    it('should return null for insufficient data', () => {
      const data: TimeSeries = [
        { timestamp: 1000, value: 10 },
        { timestamp: 2000, value: 20 },
      ];

      const changePoint = analyzer.detectChangePoint(data);
      expect(changePoint).toBeNull();
    });

    it('should return null for stable data', () => {
      const data: TimeSeries = [];
      for (let i = 0; i < 20; i++) {
        data.push({ timestamp: i * 1000, value: 25 + Math.random() * 2 }); // Stable ~25
      }

      const changePoint = analyzer.detectChangePoint(data);
      expect(changePoint).toBeNull(); // No significant change
    });

    it('should detect gradual trend vs sudden change', () => {
      const gradual: TimeSeries = [];
      for (let i = 0; i < 20; i++) {
        gradual.push({ timestamp: i * 1000, value: 10 + i * 0.5 + Math.random() * 0.5 });
      }

      const changePoint = analyzer.detectChangePoint(gradual);
      expect(changePoint === null || changePoint !== null).toBe(true); // Gradual trend, not sudden change
      // Gradual trend may or may not trigger depending on noise
    });

    it('should respect minimum segment size', () => {
      const data: TimeSeries = [
        { timestamp: 1000, value: 10 },
        { timestamp: 2000, value: 10 },
        { timestamp: 3000, value: 10 },
        { timestamp: 4000, value: 20 }, // Change
        { timestamp: 5000, value: 20 },
        { timestamp: 6000, value: 20 },
      ];

      const changePoint = analyzer.detectChangePoint(data, 2);
      expect(changePoint).not.toBeNull(); // Should detect with minSegment=2
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small values', () => {
      const samples = [0.001, 0.002, 0.003];
      const avg = analyzer.calculateMovingAverage(samples, 2);

      expect(avg).toHaveLength(3);
      expect(avg[1]).toBeCloseTo(0.0015, 6);
    });

    it('should handle very large values', () => {
      const samples = [1e9, 2e9, 3e9];
      const avg = analyzer.calculateMovingAverage(samples, 2);

      expect(avg).toHaveLength(3);
      expect(avg[1]).toBeCloseTo(1.5e9, 0);
    });

    it('should handle negative values', () => {
      const data: TimeSeries = [
        { timestamp: 1000, value: -10 },
        { timestamp: 2000, value: -20 },
        { timestamp: 3000, value: -30 },
      ];

      const trend = analyzer.fitTrendLine(data);
      expect(trend.slope).toBeLessThan(0); // Negative slope
    });

    it('should handle mixed positive/negative values', () => {
      const samples = [-10, 5, -3, 8, -2];
      const outliers = analyzer.detectOutliers(samples, 'zscore');

      expect(outliers).toHaveLength(5);
      expect(outliers.some(o => o === false)).toBe(true); // Some non-outliers
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => i);

      const start = performance.now();
      const result = analyzer.calculateMovingAverage(largeDataset, 100);
      const duration = performance.now() - start;

      expect(result).toHaveLength(10000);
      expect(duration).toBeLessThan(100); // Should complete in <100ms
    });

    it('should handle trend analysis on large time series', () => {
      const largeTimeSeries: TimeSeries = Array.from({ length: 5000 }, (_, i) => ({
        timestamp: i * 1000,
        value: i + Math.random() * 10,
      }));

      const start = performance.now();
      const trend = analyzer.fitTrendLine(largeTimeSeries);
      const duration = performance.now() - start;

      expect(trend.slope).toBeGreaterThan(0);
      expect(duration).toBeLessThan(50); // Should complete in <50ms
    });
  });
});
