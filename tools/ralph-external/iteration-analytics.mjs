/**
 * Iteration Analytics for External Ralph Loop
 *
 * Tracks quality metrics, detects diminishing returns, and selects best output
 * per REF-015 Self-Refine research.
 *
 * @implements @agentic/code/addons/ralph/schemas/iteration-analytics.yaml
 * @research @.aiwg/research/findings/REF-015-self-refine.md
 * @issue #167
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * @typedef {Object} IterationMetrics
 * @property {number} iteration_number - Iteration number
 * @property {string} timestamp - ISO timestamp
 * @property {number} quality_score - Quality score (0-100)
 * @property {number} quality_delta - Change from previous iteration
 * @property {number} tokens_used - Token count
 * @property {number} token_cost_usd - Estimated cost in USD
 * @property {number} execution_time_ms - Execution time in milliseconds
 * @property {string} verification_status - passed|failed|skipped
 * @property {string} output_snapshot_path - Path to snapshot
 * @property {string[]} reflections - Reflection notes
 */

/**
 * @typedef {Object} AnalyticsSummary
 * @property {string} loop_id - Loop identifier
 * @property {string} task_description - Task description
 * @property {string} start_time - Start timestamp
 * @property {string} end_time - End timestamp
 * @property {IterationMetrics[]} iterations - All iteration metrics
 * @property {number} total_iterations - Total iteration count
 * @property {number} optimal_iteration - Iteration with highest quality
 * @property {number} final_iteration - Final iteration number
 * @property {number} selected_iteration - Selected iteration
 * @property {string} selection_reason - Why this iteration was selected
 * @property {number} total_tokens - Total tokens used
 * @property {number} total_cost_usd - Total cost in USD
 * @property {number} total_time_ms - Total execution time
 * @property {boolean} diminishing_returns_detected - DR detected
 * @property {number} diminishing_returns_iteration - DR first detected at
 * @property {string} quality_trajectory - improving|stable|declining|fluctuating
 */

/**
 * @typedef {Object} AnalyticsConfig
 * @property {string} storagePath - Storage directory
 * @property {number} diminishingReturnsThreshold - Percentage threshold (default: 0.05 = 5%)
 * @property {number} consecutiveCountThreshold - Consecutive low-delta threshold (default: 2)
 * @property {number} qualityThreshold - Minimum quality to consider (default: 70)
 * @property {string} selectionCriteria - highest_quality|highest_quality_verified|most_recent_above_threshold
 */

const DEFAULT_CONFIG = {
  storagePath: '.aiwg/ralph/analytics',
  diminishingReturnsThreshold: 0.05, // 5%
  consecutiveCountThreshold: 2,
  qualityThreshold: 70,
  selectionCriteria: 'highest_quality_verified',
};

export class IterationAnalytics {
  /**
   * @param {string} loopId - Loop identifier
   * @param {string} taskDescription - Task description
   * @param {AnalyticsConfig} config - Analytics configuration
   */
  constructor(loopId, taskDescription, config = {}) {
    this.loopId = loopId;
    this.taskDescription = taskDescription;
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.startTime = new Date().toISOString();
    this.endTime = null;
    this.iterations = [];

    this.ensureStorageDir();
  }

  /**
   * Ensure storage directory exists
   */
  ensureStorageDir() {
    if (!existsSync(this.config.storagePath)) {
      mkdirSync(this.config.storagePath, { recursive: true });
    }
  }

  /**
   * Record metrics for an iteration
   * @param {Object} metrics - Iteration metrics
   * @param {number} metrics.iteration_number - Iteration number
   * @param {number} metrics.quality_score - Quality score (0-100)
   * @param {number} metrics.tokens_used - Token count
   * @param {number} metrics.token_cost_usd - Cost in USD
   * @param {number} metrics.execution_time_ms - Execution time
   * @param {string} metrics.verification_status - passed|failed|skipped
   * @param {string} metrics.output_snapshot_path - Path to snapshot
   * @param {string[]} [metrics.reflections] - Reflection notes
   * @returns {IterationMetrics} Complete iteration record
   */
  recordIteration(metrics) {
    const timestamp = new Date().toISOString();

    // Calculate quality delta
    const previousIteration = this.iterations[this.iterations.length - 1];
    const quality_delta = previousIteration
      ? metrics.quality_score - previousIteration.quality_score
      : 0;

    /** @type {IterationMetrics} */
    const record = {
      iteration_number: metrics.iteration_number,
      timestamp,
      quality_score: metrics.quality_score,
      quality_delta,
      tokens_used: metrics.tokens_used,
      token_cost_usd: metrics.token_cost_usd,
      execution_time_ms: metrics.execution_time_ms,
      verification_status: metrics.verification_status,
      output_snapshot_path: metrics.output_snapshot_path,
      reflections: metrics.reflections || [],
    };

    this.iterations.push(record);

    // Auto-save after each iteration
    this.saveAnalytics();

    return record;
  }

  /**
   * Detect diminishing returns using consecutive low-delta method
   * @returns {Object} Detection result
   */
  detectDiminishingReturns() {
    if (this.iterations.length < 2) {
      return {
        detected: false,
        iteration: null,
        reason: 'Insufficient iterations for detection',
      };
    }

    const threshold = this.config.diminishingReturnsThreshold;
    const consecutiveRequired = this.config.consecutiveCountThreshold;
    let consecutiveLowDelta = 0;
    let detectedAtIteration = null;

    for (let i = 1; i < this.iterations.length; i++) {
      const iteration = this.iterations[i];
      const prevScore = this.iterations[i - 1].quality_score;
      const percentageChange = prevScore > 0
        ? Math.abs(iteration.quality_delta) / prevScore
        : 0;

      if (percentageChange < threshold) {
        consecutiveLowDelta++;

        if (consecutiveLowDelta >= consecutiveRequired && detectedAtIteration === null) {
          detectedAtIteration = iteration.iteration_number;
        }
      } else {
        consecutiveLowDelta = 0;
      }
    }

    const detected = detectedAtIteration !== null;

    return {
      detected,
      iteration: detectedAtIteration,
      reason: detected
        ? `${consecutiveRequired} consecutive iterations with <${threshold * 100}% improvement`
        : 'No diminishing returns detected',
    };
  }

  /**
   * Calculate quality trajectory
   * @returns {string} improving|stable|declining|fluctuating
   */
  getTrajectory() {
    if (this.iterations.length < 3) {
      return 'insufficient_data';
    }

    const deltas = this.iterations.slice(1).map(it => it.quality_delta);
    const positiveCount = deltas.filter(d => d > 2).length;
    const negativeCount = deltas.filter(d => d < -2).length;
    const stableCount = deltas.filter(d => Math.abs(d) <= 2).length;

    const totalChanges = deltas.length;
    const positiveRatio = positiveCount / totalChanges;
    const negativeRatio = negativeCount / totalChanges;
    const stableRatio = stableCount / totalChanges;

    if (positiveRatio >= 0.67) return 'improving';
    if (negativeRatio >= 0.67) return 'declining';
    if (stableRatio >= 0.67) return 'stable';
    return 'fluctuating';
  }

  /**
   * Get optimal iteration (highest quality)
   * @param {boolean} [verifiedOnly=true] - Only consider verified iterations
   * @returns {IterationMetrics|null} Optimal iteration or null
   */
  getOptimalIteration(verifiedOnly = true) {
    if (this.iterations.length === 0) {
      return null;
    }

    let candidates = [...this.iterations];

    // Filter by verification status if requested
    if (verifiedOnly) {
      candidates = candidates.filter(it => it.verification_status === 'passed');
    }

    // Filter by quality threshold
    candidates = candidates.filter(it => it.quality_score >= this.config.qualityThreshold);

    if (candidates.length === 0) {
      // Fallback: return highest quality regardless of verification/threshold
      return this.iterations.reduce((best, curr) =>
        curr.quality_score > best.quality_score ? curr : best
      );
    }

    // Find highest quality
    return candidates.reduce((best, curr) =>
      curr.quality_score > best.quality_score ? curr : best
    );
  }

  /**
   * Select best iteration based on configuration
   * @returns {Object} Selection result
   */
  selectBestIteration() {
    if (this.iterations.length === 0) {
      return {
        selected: null,
        reason: 'No iterations available',
      };
    }

    const criteria = this.config.selectionCriteria;
    let selected = null;
    let reason = '';

    switch (criteria) {
      case 'highest_quality_verified': {
        const optimal = this.getOptimalIteration(true);
        selected = optimal;
        reason = optimal
          ? `Highest quality verified iteration (${optimal.quality_score})`
          : 'No verified iterations above threshold, using best available';

        if (!optimal) {
          selected = this.getOptimalIteration(false);
          reason = 'No verified iterations, selected highest quality overall';
        }
        break;
      }

      case 'highest_quality': {
        selected = this.getOptimalIteration(false);
        reason = `Highest quality iteration (${selected.quality_score})`;
        break;
      }

      case 'most_recent_above_threshold': {
        const aboveThreshold = this.iterations
          .filter(it => it.quality_score >= this.config.qualityThreshold)
          .reverse();

        selected = aboveThreshold[0] || this.iterations[this.iterations.length - 1];
        reason = aboveThreshold[0]
          ? `Most recent iteration above threshold (${selected.quality_score})`
          : 'No iterations above threshold, using final iteration';
        break;
      }

      default:
        selected = this.iterations[this.iterations.length - 1];
        reason = 'Using final iteration (unknown selection criteria)';
    }

    return {
      selected,
      reason,
    };
  }

  /**
   * Generate analytics summary
   * @returns {AnalyticsSummary}
   */
  generateSummary() {
    this.endTime = this.endTime || new Date().toISOString();

    const optimalIteration = this.getOptimalIteration(false);
    const selection = this.selectBestIteration();
    const diminishingReturns = this.detectDiminishingReturns();

    const totalTokens = this.iterations.reduce((sum, it) => sum + it.tokens_used, 0);
    const totalCost = this.iterations.reduce((sum, it) => sum + it.token_cost_usd, 0);
    const totalTime = this.iterations.reduce((sum, it) => sum + it.execution_time_ms, 0);

    /** @type {AnalyticsSummary} */
    const summary = {
      loop_id: this.loopId,
      task_description: this.taskDescription,
      start_time: this.startTime,
      end_time: this.endTime,
      iterations: this.iterations,
      total_iterations: this.iterations.length,
      optimal_iteration: optimalIteration ? optimalIteration.iteration_number : null,
      final_iteration: this.iterations.length > 0
        ? this.iterations[this.iterations.length - 1].iteration_number
        : 0,
      selected_iteration: selection.selected ? selection.selected.iteration_number : null,
      selection_reason: selection.reason,
      total_tokens: totalTokens,
      total_cost_usd: totalCost,
      total_time_ms: totalTime,
      diminishing_returns_detected: diminishingReturns.detected,
      diminishing_returns_iteration: diminishingReturns.iteration,
      quality_trajectory: this.getTrajectory(),
    };

    return summary;
  }

  /**
   * Generate quality chart (ASCII)
   * @returns {string} ASCII quality chart
   */
  generateQualityChart() {
    if (this.iterations.length === 0) {
      return 'No data';
    }

    const maxScore = Math.max(...this.iterations.map(it => it.quality_score));
    const minScore = Math.min(...this.iterations.map(it => it.quality_score));
    const range = maxScore - minScore;

    if (range === 0) {
      return `Quality: ${maxScore} (constant)`;
    }

    const height = 10;
    const lines = [];

    // Create chart lines from top to bottom
    for (let row = height; row >= 0; row--) {
      const threshold = minScore + (range * row / height);
      let line = `${threshold.toFixed(0).padStart(3)} |`;

      for (const iteration of this.iterations) {
        const score = iteration.quality_score;
        if (Math.abs(score - threshold) < range / (height * 2)) {
          line += iteration.verification_status === 'passed' ? '●' : '○';
        } else {
          line += ' ';
        }
      }

      lines.push(line);
    }

    // Add x-axis
    const xAxis = '    +' + '-'.repeat(this.iterations.length);
    const labels = '     ' + this.iterations.map(it => it.iteration_number % 10).join('');

    return lines.join('\n') + '\n' + xAxis + '\n' + labels;
  }

  /**
   * Generate markdown report
   * @returns {string} Markdown report
   */
  generateReport() {
    const summary = this.generateSummary();
    const chart = this.generateQualityChart();
    const diminishingReturns = this.detectDiminishingReturns();

    // Build iteration rows
    const iterationRows = this.iterations.map(it => {
      const deltaStr = it.quality_delta >= 0
        ? `+${it.quality_delta.toFixed(1)}`
        : it.quality_delta.toFixed(1);

      const verifiedMark = it.verification_status === 'passed' ? '✓' :
                          it.verification_status === 'failed' ? '✗' : '-';

      return `| ${it.iteration_number} | ${it.quality_score.toFixed(1)} | ${deltaStr} | ${it.tokens_used} | $${it.token_cost_usd.toFixed(4)} | ${verifiedMark} |`;
    }).join('\n');

    // Diminishing returns note
    const drNote = diminishingReturns.detected
      ? `**Diminishing Returns Detected:** At iteration ${diminishingReturns.iteration}\n${diminishingReturns.reason}`
      : '**Diminishing Returns:** Not detected - iterations continue to show improvement';

    // Recommendations
    const recommendations = [];

    if (summary.selected_iteration !== summary.final_iteration) {
      recommendations.push(`- Selected iteration ${summary.selected_iteration} over final iteration ${summary.final_iteration} due to higher quality`);
    }

    if (diminishingReturns.detected) {
      recommendations.push(`- Consider stopping at iteration ${diminishingReturns.iteration} to save tokens/cost`);
    }

    if (summary.quality_trajectory === 'declining') {
      recommendations.push('- Quality is declining - review feedback mechanism');
    } else if (summary.quality_trajectory === 'fluctuating') {
      recommendations.push('- Quality is fluctuating - consider more stable evaluation criteria');
    }

    if (recommendations.length === 0) {
      recommendations.push('- Loop performed well with consistent improvement');
    }

    const report = `# Ralph Loop Analytics: ${summary.loop_id}

**Task:** ${summary.task_description}
**Duration:** ${summary.start_time} → ${summary.end_time}

## Summary

| Metric | Value |
|--------|-------|
| Total Iterations | ${summary.total_iterations} |
| Selected Iteration | ${summary.selected_iteration} |
| Final Quality Score | ${summary.iterations[summary.iterations.length - 1]?.quality_score.toFixed(1) || 'N/A'} |
| Total Tokens | ${summary.total_tokens.toLocaleString()} |
| Total Cost | $${summary.total_cost_usd.toFixed(4)} |

## Iteration History

| # | Quality | Delta | Tokens | Cost | Verified |
|---|---------|-------|--------|------|----------|
${iterationRows}

## Quality Trajectory

\`\`\`
${chart}
\`\`\`

**Trajectory:** ${summary.quality_trajectory}

## Analysis

**Best Output:** Iteration ${summary.optimal_iteration} (quality: ${this.getOptimalIteration(false)?.quality_score.toFixed(1) || 'N/A'})
**Selected:** Iteration ${summary.selected_iteration} (${summary.selection_reason})

${drNote}

## Recommendations

${recommendations.join('\n')}

---

*Generated: ${new Date().toISOString()}*
`;

    return report;
  }

  /**
   * Save analytics to JSON file
   * @param {string} [filename] - Custom filename (optional)
   */
  saveAnalytics(filename = null) {
    const summary = this.generateSummary();
    const filepath = filename || join(this.config.storagePath, `${this.loopId}.json`);

    writeFileSync(filepath, JSON.stringify(summary, null, 2));

    return filepath;
  }

  /**
   * Save report to markdown file
   * @param {string} [filename] - Custom filename (optional)
   */
  saveReport(filename = null) {
    const report = this.generateReport();
    const filepath = filename || join(this.config.storagePath, `${this.loopId}-report.md`);

    writeFileSync(filepath, report);

    return filepath;
  }

  /**
   * Export all analytics (JSON + Markdown)
   * @returns {Object} Export paths
   */
  export() {
    const jsonPath = this.saveAnalytics();
    const reportPath = this.saveReport();

    return {
      json: jsonPath,
      markdown: reportPath,
    };
  }

  /**
   * Load analytics from file
   * @param {string} filepath - Path to analytics JSON
   * @returns {IterationAnalytics} Analytics instance
   */
  static load(filepath) {
    if (!existsSync(filepath)) {
      throw new Error(`Analytics file not found: ${filepath}`);
    }

    const content = readFileSync(filepath, 'utf8');
    const summary = JSON.parse(content);

    const analytics = new IterationAnalytics(
      summary.loop_id,
      summary.task_description,
      { storagePath: join(filepath, '..') }
    );

    analytics.startTime = summary.start_time;
    analytics.endTime = summary.end_time;
    analytics.iterations = summary.iterations;

    return analytics;
  }

  /**
   * Format duration in human-readable format
   * @param {number} ms - Duration in milliseconds
   * @returns {string} Formatted duration
   */
  static formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

export default IterationAnalytics;
