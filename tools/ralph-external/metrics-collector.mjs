/**
 * Metrics Collector for PID Control
 *
 * Implements research-backed PID control metrics for External Ralph Loop.
 *
 * **Proportional (P)**: Current error (completion gap + quality penalty + error penalty)
 * - Measures how far we are from task completion
 * - Combines completion percentage, code quality, and error count
 * - Normalized to 0.0-1.0 range (0=complete, 1=no progress)
 *
 * **Integral (I)**: Accumulated error over time (weighted by repeated issues)
 * - Tracks persistent/recurring problems
 * - Increased by repeated similar errors (same root cause)
 * - Decreased by accumulated learnings from reflection
 * - Anti-windup mechanism prevents unbounded accumulation
 *
 * **Derivative (D)**: Rate of change of error
 * - Predicts future error based on current trend
 * - Positive = error decreasing (improving)
 * - Negative = error increasing (regressing)
 * - Smoothed over sliding window to reduce noise
 *
 * @implements PID control theory for agentic task completion
 */

/**
 * @typedef {Object} IterationMetrics
 * @property {number} completionPercentage - 0.0-1.0
 * @property {number} qualityScore - 0.0-1.0
 * @property {number} errorCount - Number of errors
 * @property {number} testsPassing - Tests passing count
 * @property {number} testsFailing - Tests failing count
 * @property {string[]} learnings - Learnings from iteration
 * @property {string[]} blockers - Blockers encountered
 * @property {number} duration - Iteration duration ms
 * @property {string[]} filesModified - Files modified
 * @property {number} toolCallCount - Tool calls made
 */

/**
 * @typedef {Object} PIDMetrics
 * @property {number} proportional - Current error (P term)
 * @property {number} integral - Accumulated error (I term)
 * @property {number} derivative - Error rate of change (D term)
 * @property {number} timestamp - Metric timestamp
 * @property {number} iterationNumber - Iteration number
 * @property {IterationMetrics} raw - Raw metrics
 */

export class MetricsCollector {
  constructor(options = {}) {
    // Sliding window size for derivative calculation
    this.windowSize = options.windowSize || 3;

    // Integral decay factor (prevents infinite accumulation)
    this.integralDecay = options.integralDecay || 0.9;

    // Deadband threshold (ignore small fluctuations)
    this.noiseThreshold = options.noiseThreshold || 0.01;

    // History of PID metrics
    this.history = [];

    // Integral accumulator (tracks persistent errors)
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

    // Tertiary: Error count penalty
    const errorPenalty = Math.min(metrics.errorCount * 0.05, 0.3);

    // Combined proportional error
    // Weight: completion (1.0) + quality (0.2) + errors (0.05 each, max 0.3)
    const rawP = completionGap + qualityPenalty + errorPenalty;

    return this.applyDeadband(Math.min(rawP, 1.0));
  }

  /**
   * Calculate Integral component (accumulated error)
   * @param {IterationMetrics} metrics
   * @param {number} proportional - Current P value
   * @returns {number}
   */
  calculateIntegral(metrics, proportional) {
    // Accumulate proportional error
    this.integralAccumulator += proportional;

    // Track issue frequency
    for (const blocker of metrics.blockers) {
      const key = this.normalizeIssueKey(blocker);
      const count = (this.issueFrequency.get(key) || 0) + 1;
      this.issueFrequency.set(key, count);

      // Weight repeated issues more heavily
      if (count > 1) {
        this.integralAccumulator += 0.1 * count;
      }
    }

    // Reduce integral for learnings (negative feedback)
    this.learningsWeight = Math.min(
      this.learningsWeight + (metrics.learnings.length * 0.05),
      1.0
    );

    return this.applyAntiWindup(this.integralAccumulator - this.learningsWeight);
  }

  /**
   * Calculate Derivative component (rate of change)
   * @param {IterationMetrics} metrics
   * @param {number} proportional - Current P value
   * @returns {number}
   */
  calculateDerivative(metrics, proportional) {
    if (this.history.length === 0) {
      return 0; // No history yet
    }

    // Use sliding window for smoothing
    const recent = this.history.slice(-this.windowSize);

    if (recent.length < 2) {
      return 0; // Not enough history
    }

    // Calculate average rate of change
    // Positive derivative = error decreasing (good)
    // Negative derivative = error increasing (bad)
    let totalChange = 0;

    for (let i = 1; i < recent.length; i++) {
      const change = recent[i - 1].proportional - recent[i].proportional;
      totalChange += change;
    }

    const averageChange = totalChange / (recent.length - 1);

    // Also factor in current change vs most recent
    const currentChange = recent[recent.length - 1].proportional - proportional;
    const derivative = (averageChange + currentChange) / 2;

    return this.applyDeadband(derivative);
  }

  /**
   * Apply deadband to filter noise
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
   * Apply anti-windup to integral
   * @param {number} integral
   * @returns {number}
   */
  applyAntiWindup(integral) {
    const maxIntegral = 2.0; // Upper bound
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

    // Add trend information (calculated after adding to history)
    const trendInfo = this.getTrend();
    return {
      ...pidMetrics,
      trend: trendInfo.trend,
      velocity: trendInfo.velocity,
    };
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
    this.history = state.history || [];
    this.integralAccumulator = state.integralAccumulator || 0;
    this.issueFrequency = new Map(state.issueFrequency || []);
    this.learningsWeight = state.learningsWeight || 0;
    this.windowSize = state.windowSize || this.windowSize;
    this.integralDecay = state.integralDecay || this.integralDecay;
    this.noiseThreshold = state.noiseThreshold || this.noiseThreshold;
  }
}
