/**
 * TrendAnalyzer - Statistical analysis for NFR trend detection
 *
 * Provides statistical methods for analyzing time-series data, detecting
 * trends, outliers, change points, and forecasting future values.
 *
 * Features:
 * - Moving average calculation (simple and exponential)
 * - Outlier detection (IQR and Z-score methods)
 * - Linear regression for trend lines
 * - Simple forecasting using trend extrapolation
 * - Change point detection using statistical tests
 *
 * @module testing/trend-analyzer
 */

/**
 * Time-series data point
 */
export interface TimeSeriesPoint {
  /** Timestamp (Unix milliseconds) */
  timestamp: number;
  /** Measured value */
  value: number;
}

/**
 * Time-series dataset
 */
export type TimeSeries = TimeSeriesPoint[];

/**
 * Linear trend line (y = mx + b)
 */
export interface TrendLine {
  /** Slope (change per unit time) */
  slope: number;
  /** Y-intercept */
  intercept: number;
  /** R-squared value (goodness of fit, 0-1) */
  rSquared: number;
}

/**
 * Forecast result with confidence
 */
export interface ForecastResult {
  /** Predicted value */
  value: number;
  /** Lower bound of prediction interval */
  lowerBound: number;
  /** Upper bound of prediction interval */
  upperBound: number;
  /** Confidence level (0-1) */
  confidence: number;
}

/**
 * Change point detection result
 */
export interface ChangePoint {
  /** Index in time series where change occurred */
  index: number;
  /** Timestamp of change point */
  timestamp: number;
  /** Mean before change */
  meanBefore: number;
  /** Mean after change */
  meanAfter: number;
  /** Statistical significance (p-value) */
  significance: number;
}

/**
 * Outlier detection method
 */
export type OutlierMethod = 'iqr' | 'zscore';

/**
 * TrendAnalyzer - Statistical analysis for NFR trends
 *
 * @example
 * ```typescript
 * const analyzer = new TrendAnalyzer();
 *
 * // Calculate moving average
 * const samples = [10, 12, 11, 13, 15, 14, 16];
 * const smoothed = analyzer.calculateMovingAverage(samples, 3);
 *
 * // Detect outliers
 * const outliers = analyzer.detectOutliers(samples, 'iqr');
 *
 * // Fit trend line
 * const timeSeries = samples.map((v, i) => ({ timestamp: i * 1000, value: v }));
 * const trend = analyzer.fitTrendLine(timeSeries);
 * console.log(`Trend: ${trend.slope > 0 ? 'increasing' : 'decreasing'}`);
 * ```
 */
export class TrendAnalyzer {
  /**
   * Calculate simple moving average
   *
   * @param samples - Array of values
   * @param windowSize - Size of moving window
   * @returns Array of moving averages (same length as input, padded with original values)
   * @throws {Error} If windowSize is invalid
   */
  calculateMovingAverage(samples: number[], windowSize: number): number[] {
    if (windowSize <= 0) {
      throw new Error('Window size must be positive');
    }
    if (windowSize > samples.length) {
      throw new Error('Window size cannot exceed sample count');
    }

    const result: number[] = [];

    for (let i = 0; i < samples.length; i++) {
      if (i < windowSize - 1) {
        // Not enough data for full window, use available data
        const window = samples.slice(0, i + 1);
        const avg = window.reduce((sum, val) => sum + val, 0) / window.length;
        result.push(avg);
      } else {
        // Full window available
        const window = samples.slice(i - windowSize + 1, i + 1);
        const avg = window.reduce((sum, val) => sum + val, 0) / window.length;
        result.push(avg);
      }
    }

    return result;
  }

  /**
   * Calculate exponential moving average
   *
   * @param samples - Array of values
   * @param alpha - Smoothing factor (0-1, higher = more weight on recent values)
   * @returns Array of exponential moving averages
   * @throws {Error} If alpha is out of range
   */
  calculateExponentialMovingAverage(samples: number[], alpha: number = 0.3): number[] {
    if (alpha <= 0 || alpha > 1) {
      throw new Error('Alpha must be between 0 and 1');
    }
    if (samples.length === 0) {
      return [];
    }

    const result: number[] = [samples[0]]; // Start with first value

    for (let i = 1; i < samples.length; i++) {
      const ema = alpha * samples[i] + (1 - alpha) * result[i - 1];
      result.push(ema);
    }

    return result;
  }

  /**
   * Detect outliers using IQR or Z-score method
   *
   * @param samples - Array of values
   * @param method - Detection method ('iqr' or 'zscore')
   * @returns Boolean array indicating outliers (true = outlier)
   * @throws {Error} If method is invalid
   */
  detectOutliers(samples: number[], method: OutlierMethod = 'iqr'): boolean[] {
    if (samples.length === 0) {
      return [];
    }

    if (method === 'iqr') {
      return this.detectOutliersIQR(samples);
    } else if (method === 'zscore') {
      return this.detectOutliersZScore(samples);
    } else {
      throw new Error(`Invalid outlier detection method: ${method}`);
    }
  }

  /**
   * Fit linear trend line to time series data
   *
   * Uses least squares regression to find best-fit line.
   *
   * @param data - Time series data points
   * @returns Trend line parameters and R-squared
   * @throws {Error} If insufficient data points
   */
  fitTrendLine(data: TimeSeries): TrendLine {
    if (data.length < 2) {
      throw new Error('Need at least 2 data points to fit trend line');
    }

    // Extract x (timestamps) and y (values)
    const x = data.map(p => p.timestamp);
    const y = data.map(p => p.value);

    // Normalize timestamps to avoid floating point issues
    const xMin = Math.min(...x);
    const xNorm = x.map(t => t - xMin);

    // Calculate means
    const xMean = xNorm.reduce((sum, val) => sum + val, 0) / xNorm.length;
    const yMean = y.reduce((sum, val) => sum + val, 0) / y.length;

    // Calculate slope and intercept using least squares
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < xNorm.length; i++) {
      numerator += (xNorm[i] - xMean) * (y[i] - yMean);
      denominator += Math.pow(xNorm[i] - xMean, 2);
    }

    const slope = denominator === 0 ? 0 : numerator / denominator;
    const intercept = yMean - slope * xMean;

    // Calculate R-squared
    let ssRes = 0; // Sum of squared residuals
    let ssTot = 0; // Total sum of squares

    for (let i = 0; i < xNorm.length; i++) {
      const predicted = slope * xNorm[i] + intercept;
      ssRes += Math.pow(y[i] - predicted, 2);
      ssTot += Math.pow(y[i] - yMean, 2);
    }

    const rSquared = ssTot === 0 ? 1 : 1 - (ssRes / ssTot);

    return {
      slope,
      intercept: intercept - slope * xMin, // Adjust for denormalization
      rSquared: Math.max(0, Math.min(1, rSquared)), // Clamp to [0, 1]
    };
  }

  /**
   * Forecast future value using trend extrapolation
   *
   * Uses linear regression trend line to predict future value.
   *
   * @param data - Historical time series data
   * @param horizon - Number of time units into future (milliseconds)
   * @returns Forecast with prediction interval
   * @throws {Error} If insufficient data or invalid horizon
   */
  forecastValue(data: TimeSeries, horizon: number): ForecastResult {
    if (data.length < 2) {
      throw new Error('Need at least 2 data points to forecast');
    }
    if (horizon < 0) {
      throw new Error('Horizon must be non-negative');
    }

    const trend = this.fitTrendLine(data);
    const lastTimestamp = data[data.length - 1].timestamp;
    const futureTimestamp = lastTimestamp + horizon;

    // Calculate predicted value
    const predictedValue = trend.slope * futureTimestamp + trend.intercept;

    // Calculate prediction interval using residual standard error
    const values = data.map(p => p.value);
    const timestamps = data.map(p => p.timestamp);

    const residuals: number[] = [];
    for (let i = 0; i < data.length; i++) {
      const predicted = trend.slope * timestamps[i] + trend.intercept;
      residuals.push(values[i] - predicted);
    }

    const residualStdDev = this.calculateStdDev(residuals);

    // Use 95% confidence (1.96 standard deviations)
    const margin = 1.96 * residualStdDev;

    return {
      value: predictedValue,
      lowerBound: predictedValue - margin,
      upperBound: predictedValue + margin,
      confidence: 0.95,
    };
  }

  /**
   * Detect change point in time series
   *
   * Uses a sliding window approach to find significant shifts in mean.
   *
   * @param data - Time series data
   * @param minSegmentSize - Minimum size of segments before/after change point
   * @returns Change point if detected, null otherwise
   */
  detectChangePoint(data: TimeSeries, minSegmentSize: number = 5): ChangePoint | null {
    if (data.length < minSegmentSize * 2) {
      return null; // Not enough data
    }

    let maxSignificance = 0;
    let bestChangePoint: ChangePoint | null = null;

    // Try each possible split point
    for (let i = minSegmentSize; i < data.length - minSegmentSize; i++) {
      const before = data.slice(0, i).map(p => p.value);
      const after = data.slice(i).map(p => p.value);

      const meanBefore = this.calculateMean(before);
      const meanAfter = this.calculateMean(after);

      // Calculate t-statistic for difference in means
      const stdBefore = this.calculateStdDev(before);
      const stdAfter = this.calculateStdDev(after);

      const pooledStd = Math.sqrt(
        (Math.pow(stdBefore, 2) / before.length) +
        (Math.pow(stdAfter, 2) / after.length)
      );

      if (pooledStd === 0) {
        // Handle constant values - use simple mean difference
        const tStat = Math.abs(meanAfter - meanBefore) * 10; // Scale for detection
        if (tStat > maxSignificance) {
          maxSignificance = tStat;
          bestChangePoint = {
            index: i,
            timestamp: data[i].timestamp,
            meanBefore,
            meanAfter,
            significance: 0.01, // Highly significant
          };
        }
        continue;
      }

      const tStat = Math.abs(meanAfter - meanBefore) / pooledStd;

      // Convert t-statistic to rough p-value significance
      // (simplified, not exact)
      const significance = Math.min(1, 1 / (1 + tStat));

      if (tStat > maxSignificance) {
        maxSignificance = tStat;
        bestChangePoint = {
          index: i,
          timestamp: data[i].timestamp,
          meanBefore,
          meanAfter,
          significance,
        };
      }
    }

    // Only return if change is significant (t-stat > 2.0 roughly p < 0.05)
    if (maxSignificance > 2.0 && bestChangePoint) {
      return bestChangePoint;
    }

    return null;
  }

  /**
   * Calculate standard deviation of samples
   *
   * @param samples - Array of values
   * @returns Standard deviation
   */
  private calculateStdDev(samples: number[]): number {
    if (samples.length <= 1) {
      return 0;
    }

    const mean = this.calculateMean(samples);
    const variance = samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (samples.length - 1);
    return Math.sqrt(variance);
  }

  /**
   * Calculate mean of samples
   *
   * @param samples - Array of values
   * @returns Mean value
   */
  private calculateMean(samples: number[]): number {
    if (samples.length === 0) {
      return 0;
    }
    return samples.reduce((sum, val) => sum + val, 0) / samples.length;
  }

  /**
   * Calculate percentile from sorted values
   *
   * @param sortedValues - Pre-sorted array of values
   * @param percentile - Percentile to calculate (0-100)
   * @returns Percentile value
   */
  private calculatePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) {
      return 0;
    }

    const index = (percentile / 100) * (sortedValues.length - 1);

    if (Number.isInteger(index)) {
      return sortedValues[index];
    }

    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }

  /**
   * Detect outliers using IQR method
   *
   * @private
   */
  private detectOutliersIQR(samples: number[]): boolean[] {
    const sorted = [...samples].sort((a, b) => a - b);
    const q1 = this.calculatePercentile(sorted, 25);
    const q3 = this.calculatePercentile(sorted, 75);
    const iqr = q3 - q1;

    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    return samples.map(value => value < lowerBound || value > upperBound);
  }

  /**
   * Detect outliers using Z-score method
   *
   * @private
   */
  private detectOutliersZScore(samples: number[], threshold: number = 3): boolean[] {
    const mean = this.calculateMean(samples);
    const stdDev = this.calculateStdDev(samples);

    if (stdDev === 0) {
      // No variance, no outliers
      return samples.map(() => false);
    }

    return samples.map(value => {
      const zScore = Math.abs((value - mean) / stdDev);
      return zScore > threshold;
    });
  }
}
