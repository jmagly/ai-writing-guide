/**
 * Behavior Detector for External Ralph Loop Overseer
 *
 * Detects pathological behaviors in iteration history:
 * - Stuck loops (same error 3+ times)
 * - Oscillation (undo/redo patterns)
 * - Deviation (objective drift)
 * - Resource burn (cost overruns)
 * - Regression (tests passing → failing)
 *
 * @implements Issue #25 - Autonomous Overseer
 * @references @.claude/rules/anti-laziness.md
 */

/**
 * @typedef {Object} Detection
 * @property {string} type - stuck|oscillation|deviation|resource_burn|regression
 * @property {string} severity - low|medium|high|critical
 * @property {string} message - Human-readable description
 * @property {Object} evidence - Supporting data
 * @property {string[]} recommendations - Suggested interventions
 */

/**
 * Detection thresholds
 */
export const THRESHOLDS = {
  stuck: {
    sameErrorCount: 3,
    noProgressIterations: 5,
  },
  oscillation: {
    undoRedoCycles: 2,
    fileChurnThreshold: 0.8, // 80% of files changed back
  },
  deviation: {
    objectiveSimilarity: 0.5,
    scopeCreepRatio: 1.5,
  },
  resource: {
    costMultiplier: 2.0,
    iterationMultiplier: 2.0,
  },
  regression: {
    testPassToFail: true,
    coverageDropPercent: 10,
  },
};

export class BehaviorDetector {
  /**
   * @param {Object} options
   * @param {Object} [options.thresholds] - Custom thresholds
   */
  constructor(options = {}) {
    this.thresholds = { ...THRESHOLDS, ...options.thresholds };
  }

  /**
   * Detect pathological behaviors from iteration history
   * @param {Array} history - Array of iteration results
   * @returns {Detection[]} Array of detections
   */
  detect(history) {
    if (!history || history.length === 0) {
      return [];
    }

    const detections = [];

    // Run all detection checks
    const stuckDetection = this.detectStuck(history);
    if (stuckDetection) detections.push(stuckDetection);

    const oscillationDetection = this.detectOscillation(history);
    if (oscillationDetection) detections.push(oscillationDetection);

    const deviationDetection = this.detectDeviation(history);
    if (deviationDetection) detections.push(deviationDetection);

    const resourceDetection = this.detectResourceBurn(history);
    if (resourceDetection) detections.push(resourceDetection);

    const regressionDetection = this.detectRegression(history);
    if (regressionDetection) detections.push(regressionDetection);

    return detections;
  }

  /**
   * Detect stuck loop (same error multiple times)
   * @param {Array} history
   * @returns {Detection|null}
   */
  detectStuck(history) {
    if (history.length < this.thresholds.stuck.sameErrorCount) {
      return null;
    }

    // Check recent iterations for repeated errors
    const recent = history.slice(-this.thresholds.stuck.noProgressIterations);

    // Extract error messages/patterns
    const errors = recent.map(iter => {
      const analysis = iter.analysis || {};
      return {
        message: analysis.failureClass || analysis.error || '',
        blockers: analysis.blockers || [],
        progress: analysis.completionPercentage || 0,
      };
    });

    // Count repeated error patterns
    const errorCounts = {};
    errors.forEach(({ message }) => {
      if (message) {
        errorCounts[message] = (errorCounts[message] || 0) + 1;
      }
    });

    // Find most common error
    let maxCount = 0;
    let repeatedError = null;
    for (const [error, count] of Object.entries(errorCounts)) {
      if (count > maxCount) {
        maxCount = count;
        repeatedError = error;
      }
    }

    if (maxCount >= this.thresholds.stuck.sameErrorCount) {
      // Also check if progress has stalled
      const progressDeltas = [];
      for (let i = 1; i < recent.length; i++) {
        const delta = recent[i].analysis?.completionPercentage - recent[i-1].analysis?.completionPercentage;
        progressDeltas.push(delta || 0);
      }
      const avgProgress = progressDeltas.reduce((sum, d) => sum + d, 0) / progressDeltas.length;

      if (Math.abs(avgProgress) < 0.02) { // Less than 2% progress per iteration
        return {
          type: 'stuck',
          severity: maxCount >= 5 ? 'critical' : 'high',
          message: `Loop stuck: Same error repeated ${maxCount} times with minimal progress`,
          evidence: {
            repeatedError,
            occurrences: maxCount,
            avgProgressRate: avgProgress,
            recentBlockers: errors.flatMap(e => e.blockers).slice(0, 5),
          },
          recommendations: [
            'Change approach or strategy',
            'Break task into smaller sub-tasks',
            'Request human intervention',
            'Review and address root cause of repeated error',
          ],
        };
      }
    }

    return null;
  }

  /**
   * Detect oscillation (undo/redo patterns)
   * @param {Array} history
   * @returns {Detection|null}
   */
  detectOscillation(history) {
    if (history.length < 4) {
      return null;
    }

    // Look for file change patterns
    const recent = history.slice(-6);
    const fileChanges = recent.map(iter => {
      const artifacts = iter.analysis?.artifactsModified || [];
      return new Set(artifacts);
    });

    // Detect undo/redo cycles
    let undoRedoCount = 0;
    for (let i = 2; i < fileChanges.length; i++) {
      const curr = fileChanges[i];
      const prev = fileChanges[i - 1];
      const prevPrev = fileChanges[i - 2];

      // Check if current changes revert previous changes
      const revertedCount = Array.from(prevPrev).filter(f =>
        curr.has(f) && !prev.has(f)
      ).length;

      const totalPrevPrev = prevPrev.size;
      if (totalPrevPrev > 0) {
        const revertRatio = revertedCount / totalPrevPrev;
        if (revertRatio >= this.thresholds.oscillation.fileChurnThreshold) {
          undoRedoCount++;
        }
      }
    }

    if (undoRedoCount >= this.thresholds.oscillation.undoRedoCycles) {
      return {
        type: 'oscillation',
        severity: 'high',
        message: `Oscillation detected: ${undoRedoCount} undo/redo cycles in recent iterations`,
        evidence: {
          undoRedoCycles: undoRedoCount,
          recentFileChanges: recent.map(iter => iter.analysis?.artifactsModified || []),
        },
        recommendations: [
          'Commit to one approach instead of alternating',
          'Review feedback quality - may be conflicting',
          'Pause and assess which approach is better',
          'Request human decision on direction',
        ],
      };
    }

    return null;
  }

  /**
   * Detect objective deviation (scope creep)
   * @param {Array} history
   * @returns {Detection|null}
   */
  detectDeviation(history) {
    if (history.length < 2) {
      return null;
    }

    const first = history[0];
    const recent = history.slice(-3);

    const originalObjective = first.context?.objective || '';

    // Check if recent work deviates from original objective
    let deviationScore = 0;
    const deviationExamples = [];

    for (const iter of recent) {
      const learnings = iter.analysis?.learnings || '';
      const artifacts = iter.analysis?.artifactsModified || [];

      // Simple keyword-based similarity (in production, use better NLP)
      const originalWords = new Set(originalObjective.toLowerCase().split(/\s+/));
      const learningWords = new Set(learnings.toLowerCase().split(/\s+/));

      const commonWords = Array.from(originalWords).filter(w => learningWords.has(w));
      const similarity = originalWords.size > 0
        ? commonWords.length / originalWords.size
        : 1.0;

      if (similarity < this.thresholds.deviation.objectiveSimilarity) {
        deviationScore++;
        deviationExamples.push({
          iteration: iter.number || history.indexOf(iter),
          similarity,
          artifacts,
        });
      }
    }

    if (deviationScore >= 2) {
      return {
        type: 'deviation',
        severity: 'medium',
        message: `Objective deviation: Recent work may have drifted from original objective`,
        evidence: {
          originalObjective,
          deviationExamples,
          averageSimilarity: deviationExamples.reduce((sum, e) => sum + e.similarity, 0) / deviationExamples.length,
        },
        recommendations: [
          'Review original objective and criteria',
          'Realign current work with stated goals',
          'Confirm scope with human if uncertain',
          'Document any necessary scope changes',
        ],
      };
    }

    return null;
  }

  /**
   * Detect resource burn (excessive cost/iterations)
   * @param {Array} history
   * @returns {Detection|null}
   */
  detectResourceBurn(history) {
    if (history.length === 0) {
      return null;
    }

    const first = history[0];
    const current = history[history.length - 1];

    const estimatedIterations = first.context?.maxIterations || 10;
    const actualIterations = history.length;
    const iterationRatio = actualIterations / estimatedIterations;

    // Check iteration budget
    if (iterationRatio >= this.thresholds.resource.iterationMultiplier) {
      const progressPercent = current.analysis?.completionPercentage || 0;

      return {
        type: 'resource_burn',
        severity: iterationRatio >= 2.5 ? 'critical' : 'high',
        message: `Resource burn: Used ${actualIterations}/${estimatedIterations} iterations (${(iterationRatio * 100).toFixed(0)}% of budget)`,
        evidence: {
          estimatedIterations,
          actualIterations,
          iterationRatio,
          completionPercent: progressPercent,
          efficiency: progressPercent / actualIterations,
        },
        recommendations: [
          progressPercent < 0.5
            ? 'Consider aborting if little progress made'
            : 'Increase iteration budget if task is viable',
          'Analyze why estimates were incorrect',
          'Break remaining work into smaller tasks',
          'Request human decision on continuation',
        ],
      };
    }

    return null;
  }

  /**
   * Detect regression (tests passing → failing, coverage drop)
   * @param {Array} history
   * @returns {Detection|null}
   */
  detectRegression(history) {
    if (history.length < 2) {
      return null;
    }

    const recent = history.slice(-5);

    // Check for test regressions
    let testRegressions = [];
    for (let i = 1; i < recent.length; i++) {
      const prev = recent[i - 1].analysis || {};
      const curr = recent[i].analysis || {};

      const prevPassing = prev.testsPassing !== undefined;
      const currPassing = curr.testsPassing !== undefined;

      if (prevPassing && currPassing) {
        if (prev.testsPassing && !curr.testsPassing) {
          testRegressions.push({
            iteration: i,
            message: 'Tests went from passing to failing',
          });
        }
      }

      // Check coverage drops
      if (prev.coveragePercent && curr.coveragePercent) {
        const coverageDrop = prev.coveragePercent - curr.coveragePercent;
        if (coverageDrop >= this.thresholds.regression.coverageDropPercent) {
          testRegressions.push({
            iteration: i,
            message: `Coverage dropped ${coverageDrop.toFixed(1)}%`,
            from: prev.coveragePercent,
            to: curr.coveragePercent,
          });
        }
      }
    }

    if (testRegressions.length > 0) {
      return {
        type: 'regression',
        severity: testRegressions.length >= 2 ? 'critical' : 'high',
        message: `Regression detected: ${testRegressions.length} quality regressions in recent iterations`,
        evidence: {
          regressions: testRegressions,
        },
        recommendations: [
          'Stop making changes that break tests',
          'Fix tests instead of deleting or disabling them',
          'Review anti-laziness rules (@.claude/rules/anti-laziness.md)',
          'Restore previous working state if needed',
        ],
      };
    }

    return null;
  }

  /**
   * Update detection thresholds
   * @param {Object} thresholds - Partial threshold updates
   */
  updateThresholds(thresholds) {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * Get current thresholds
   * @returns {Object}
   */
  getThresholds() {
    return { ...this.thresholds };
  }
}

export default BehaviorDetector;
