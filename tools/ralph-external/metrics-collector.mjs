/**
 * Metrics Collector for PID Control System
 *
 * Extracts Proportional, Integral, and Derivative metrics from
 * Ralph loop iteration data for adaptive control decisions.
 *
 * @implements Issue #23 - PID-inspired Control Feedback Loop
 * @references REF-015 Self-Refine, REF-021 Reflexion
 *
 * Metric Definitions:
 * - Proportional (P): Current completion gap (1.0 - completion_percentage)
 * - Integral (I): Accumulated learnings and repeated issues
 * - Derivative (D): Rate of progress change (velocity)
 */

/**
 * @typedef {Object} IterationMetrics
 * @property {number} completionPercentage - 0.0 to 1.0
 * @property {number} qualityScore - 0.0 to 1.0
 * @property {number} errorCount - Number of errors
 * @property {number} testsPassing - Number of passing tests
 * @property {number} testsFailing - Number of failing tests
 * @property {string[]} learnings - Extracted learnings
 * @property {string[]} blockers - Current blockers
 * @property {number} duration - Duration in ms
 */

/**
 * @typedef {Object} PIDMetrics
 * @property {number} proportional - Current error (completion gap)
 * @property {number} integral - Accumulated error over time
 * @property {number} derivative - Rate of change of error
 * @property {number} timestamp - When metrics were calculated
 * @property {Object} raw - Raw metrics data
 */

/**
 * @typedef {Object} MetricsHistory
 * @property {PIDMetrics[]} metrics - Array of historical metrics
 * @property {number} windowSize - Number of iterations to consider
 */

export class MetricsCollector {
  /**
   * @param {Object} options
   * @param {number} [options.windowSize=5] - Number of iterations for derivative calculation
   * @param {number} [options.integralDecay=0.9] - Decay factor for integral accumulation
   * @param {number} [options.noiseThreshold=0.05] - Deadband threshold for noise filtering
   */
  constructor(options = {}) {
    this.windowSize = options.windowSize || 5;
    this.integralDecay = options.integralDecay || 0.9;
    this.noiseThreshold = options.noiseThreshold || 0.05;

    // Historical data for derivative calculation
    this.history = [];

    // Accumulated integral value
    this.integralAccumulator = 0;

    // Track repeated issues for integral component
    this.issueFrequency = new Map();

    // Track learnings weight
    this.learningsWeight = 0;
  }

  /**
   * Extract metrics from an iteration result
   * @param {Object} iteration - Iteration data from orchestrator
   * @returns {IterationMetrics}
   */
  extractIterationMetrics(iteration) {
    const analysis = iteration.analysis || {};

    return {
      completionPercentage: this.normalizePercentage(analysis.completionPercentage || 0),
      qualityScore: this.normalizePercentage(analysis.qualityScore || analysis.confidence || 0.5),
      errorCount: analysis.errorCount || iteration.errorCount || 0,
      testsPassing: analysis.testsPassing || 0,
      testsFailing: analysis.testsFailing || 0,
      learnings: this.extractLearnings(iteration),
      blockers: this.extractBlockers(iteration),
      duration: iteration.duration || 0,
      filesModified: analysis.filesModified || [],
      toolCallCount: iteration.toolCallCount || 0,
    };
  }

  /**
   * Normalize a percentage value to 0.0-1.0 range
   * @param {number} value - Raw percentage (0-100 or 0.0-1.0)
   * @returns {number}
   */
  normalizePercentage(value) {
    if (value > 1) {
      return Math.min(value / 100, 1.0);
    }
    return Math.max(0, Math.min(value, 1.0));
  }

  /**
   * Extract learnings from iteration
   * @param {Object} iteration
   * @returns {string[]}
   */
  extractLearnings(iteration) {
    const learnings = [];

    if (iteration.analysis?.learnings) {
      if (Array.isArray(iteration.analysis.learnings)) {
        learnings.push(...iteration.analysis.learnings);
      } else if (typeof iteration.analysis.learnings === 'string') {
        learnings.push(iteration.analysis.learnings);
      }
    }

    if (iteration.learnings) {
      if (Array.isArray(iteration.learnings)) {
        learnings.push(...iteration.learnings);
      } else if (typeof iteration.learnings === 'string') {
        learnings.push(iteration.learnings);
      }
    }

    return learnings;
  }

  /**
   * Extract blockers from iteration
   * @param {Object} iteration
   * @returns {string[]}
   */
  extractBlockers(iteration) {
    const blockers = [];

    if (iteration.analysis?.blockers) {
      blockers.push(...(Array.isArray(iteration.analysis.blockers)
        ? iteration.analysis.blockers
        : [iteration.analysis.blockers]));
    }

    if (iteration.analysis?.failureReason) {
      blockers.push(iteration.analysis.failureReason);
    }

    return blockers.filter(Boolean);
  }

  /**
   * Calculate Proportional component (current error)
   * @param {IterationMetrics} metrics
   * @returns {number} - Error value (0.0 = complete, 1.0 = no progress)
   */
  calculateProportional(metrics) {
    // Primary: Completion gap
    const completionGap = 1.0 - metrics.completionPercentage;

    // Secondary: Quality adjustment
    const qualityPenalty = (1.0 - metrics.qualityScore) * 0.2;

    // Error penalty (normalized)
    const errorPenalty = Math.min(metrics.errorCount * 0.05, 0.3);

    // Combined proportional error
    const rawP = completionGap + qualityPenalty + errorPenalty;

    // Apply deadband filter
    return this.applyDeadband(Math.min(rawP, 1.0));
  }

  /**
   * Calculate Integral component (accumulated error)
   * @param {IterationMetrics} metrics
   * @param {number} proportional - Current proportional error
   * @returns {number}
   */
  calculateIntegral(metrics, proportional) {
    // Decay previous integral (prevents windup)
    this.integralAccumulator *= this.integralDecay;

    // Add current error contribution
    this.integralAccumulator += proportional;

    // Track repeated blockers (increases integral)
    for (const blocker of metrics.blockers) {
      const key = this.normalizeIssueKey(blocker);
      const count = (this.issueFrequency.get(key) || 0) + 1;
      this.issueFrequency.set(key, count);

      // Repeated issues add to integral
      if (count > 1) {
        this.integralAccumulator += 0.1 * count;
      }
    }

    // Learnings reduce integral (positive feedback)
    this.learningsWeight = Math.min(
      this.learningsWeight + metrics.learnings.length * 0.05,
      0.5
    );

    // Apply anti-windup bounds
    return this.applyAntiWindup(this.integralAccumulator - this.learningsWeight);
  }

  /**
   * Calculate Derivative component (rate of change)
   * @param {IterationMetrics} metrics
   * @param {number} proportional - Current proportional error
   * @returns {number}
   */
  calculateDerivative(metrics, proportional) {
    if (this.history.length === 0) {
      return 0;
    }

    // Get recent history
    const recent = this.history.slice(-this.windowSize);

    if (recent.length < 2) {
      // Not enough history for derivative
      const last = recent[recent.length - 1];
      return proportional - last.proportional;
    }

    // Calculate weighted moving average of error changes
    let sumWeightedChange = 0;
    let sumWeights = 0;

    for (let i = 1; i < recent.length; i++) {
      const weight = i / recent.length; // More recent = higher weight
      const change = recent[i].proportional - recent[i - 1].proportional;
      sumWeightedChange += change * weight;
      sumWeights += weight;
    }

    // Add current change
    const currentChange = proportional - recent[recent.length - 1].proportional;
    sumWeightedChange += currentChange * 1.0;
    sumWeights += 1.0;

    const derivative = sumWeightedChange / sumWeights;

    // Apply deadband filter
    return this.applyDeadband(derivative);
  }

  /**
   * Apply deadband filter to remove noise
   * @param {number} value
   * @returns {number}
   */
  applyDeadband(value) {
    if (Math.abs(value) < this.noiseThreshold) {
      return 0;
    }
    return value;
  }

  /**
   * Apply anti-windup bounds to integral
   * @param {number} integral
   * @returns {number}
   */
  applyAntiWindup(integral) {
    const maxIntegral = 5.0;  // Upper bound
    const minIntegral = -1.0; // Lower bound (allow some negative for learnings)

    return Math.max(minIntegral, Math.min(integral, maxIntegral));
  }

  /**
   * Normalize issue key for frequency tracking
   * @param {string} issue
   * @returns {string}
   */
  normalizeIssueKey(issue) {
    return issue
      .toLowerCase()
      .replace(/\d+/g, 'N')  // Normalize numbers
      .replace(/\s+/g, ' ')   // Normalize whitespace
      .slice(0, 100);         // Truncate
  }

  /**
   * Collect and calculate all PID metrics for an iteration
   * @param {Object} iteration - Raw iteration data
   * @returns {PIDMetrics}
   */
  collect(iteration) {
    const metrics = this.extractIterationMetrics(iteration);

    const proportional = this.calculateProportional(metrics);
    const integral = this.calculateIntegral(metrics, proportional);
    const derivative = this.calculateDerivative(metrics, proportional);

    const pidMetrics = {
      proportional,
      integral,
      derivative,
      timestamp: Date.now(),
      iterationNumber: iteration.number || this.history.length + 1,
      raw: metrics,
    };

    // Add to history
    this.history.push(pidMetrics);

    // Trim history to window size * 2 (keep extra for analysis)
    if (this.history.length > this.windowSize * 2) {
      this.history = this.history.slice(-this.windowSize * 2);
    }

    return pidMetrics;
  }

  /**
   * Get velocity (progress rate) over recent iterations
   * @returns {number} - Positive = improving, negative = regressing
   */
  getVelocity() {
    if (this.history.length < 2) {
      return 0;
    }

    const recent = this.history.slice(-this.windowSize);
    const first = recent[0];
    const last = recent[recent.length - 1];

    // Velocity = reduction in error per iteration
    // Positive = making progress, negative = regressing
    return (first.proportional - last.proportional) / recent.length;
  }

  /**
   * Get trend analysis
   * @returns {Object}
   */
  getTrend() {
    const velocity = this.getVelocity();

    let trend = 'stable';
    if (velocity > 0.05) {
      trend = 'improving';
    } else if (velocity < -0.05) {
      trend = 'regressing';
    } else if (this.history.length >= 3) {
      // Check for oscillation
      const recent = this.history.slice(-3);
      const changes = [];
      for (let i = 1; i < recent.length; i++) {
        changes.push(recent[i].proportional - recent[i - 1].proportional);
      }
      if (changes.length >= 2 && changes[0] * changes[1] < 0) {
        trend = 'oscillating';
      }
    }

    return {
      trend,
      velocity,
      iterationsAnalyzed: this.history.length,
      repeatedIssues: this.getRepeatedIssues(),
    };
  }

  /**
   * Get issues that have appeared multiple times
   * @returns {Array<{issue: string, count: number}>}
   */
  getRepeatedIssues() {
    const repeated = [];
    for (const [issue, count] of this.issueFrequency) {
      if (count > 1) {
        repeated.push({ issue, count });
      }
    }
    return repeated.sort((a, b) => b.count - a.count);
  }

  /**
   * Reset the collector state
   */
  reset() {
    this.history = [];
    this.integralAccumulator = 0;
    this.issueFrequency.clear();
    this.learningsWeight = 0;
  }

  /**
   * Get summary of current state
   * @returns {Object}
   */
  getSummary() {
    const latest = this.history[this.history.length - 1];
    const trend = this.getTrend();

    return {
      currentMetrics: latest || null,
      trend,
      historyLength: this.history.length,
      integralAccumulator: this.integralAccumulator,
      learningsWeight: this.learningsWeight,
      repeatedIssuesCount: this.issueFrequency.size,
    };
  }

  /**
   * Export state for persistence
   * @returns {Object}
   */
  exportState() {
    return {
      history: this.history,
      integralAccumulator: this.integralAccumulator,
      issueFrequency: Array.from(this.issueFrequency.entries()),
      learningsWeight: this.learningsWeight,
      windowSize: this.windowSize,
      integralDecay: this.integralDecay,
      noiseThreshold: this.noiseThreshold,
    };
  }

  /**
   * Import state from persistence
   * @param {Object} state
   */
  importState(state) {
    if (state.history) {
      this.history = state.history;
    }
    if (typeof state.integralAccumulator === 'number') {
      this.integralAccumulator = state.integralAccumulator;
    }
    if (state.issueFrequency) {
      this.issueFrequency = new Map(state.issueFrequency);
    }
    if (typeof state.learningsWeight === 'number') {
      this.learningsWeight = state.learningsWeight;
    }
  }
}

export default MetricsCollector;
