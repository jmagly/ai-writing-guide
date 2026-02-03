/**
 * Strategy Planner for External Ralph Loop
 *
 * Analyzes iteration history and metrics to recommend strategy adjustments.
 * Decides when to pivot, persist, or escalate based on patterns and trends.
 *
 * @module strategy-planner
 */

import { readFileSync, existsSync } from 'fs';

/**
 * @typedef {Object} IterationHistory
 * @property {number} iteration
 * @property {Object} analysis
 * @property {number} analysis.completionPercentage
 * @property {string[]} [blockers]
 */

/**
 * @typedef {Object} StrategyPlan
 * @property {string} approach - "persist", "pivot", "escalate"
 * @property {string} reasoning
 * @property {string[]} priorities
 * @property {Object} [adjustments]
 * @property {number} confidence - 0 to 1
 * @property {Object} metadata
 */

export class StrategyPlanner {
  /**
   * Create a strategy planner
   * @param {Object} [options]
   * @param {number} [options.stuckThreshold=3] - Iterations to consider stuck
   * @param {number} [options.oscillationThreshold=3] - Sign changes to detect oscillation
   * @param {number} [options.escalationThreshold=7] - Iterations before escalation
   * @param {boolean} [options.verbose=false] - Enable verbose logging
   */
  constructor(options = {}) {
    this.stuckThreshold = options.stuckThreshold || 3;
    this.oscillationThreshold = options.oscillationThreshold || 3;
    this.escalationThreshold = options.escalationThreshold || 7;
    this.verbose = options.verbose || false;
  }

  /**
   * Plan strategy based on iteration history and metrics
   * @param {IterationHistory[]} history
   * @param {Object} metrics - PID metrics
   * @returns {StrategyPlan}
   */
  plan(history, metrics) {
    const situation = this._analyzeSituation(history, metrics);
    const strategy = this._selectStrategy(situation, history, metrics);
    const priorities = this._buildPriorities(situation, history, metrics);
    const confidence = this._calculateConfidence(strategy, situation);

    if (this.verbose) {
      console.log('Strategy Plan:', { approach: strategy.approach, confidence, situation });
    }

    return {
      approach: strategy.approach,
      reasoning: strategy.reasoning,
      priorities,
      adjustments: strategy.adjustments || {},
      confidence,
      metadata: {
        situation,
        iterationCount: history.length,
        timestamp: Date.now(),
      },
    };
  }

  /**
   * Determine if human escalation is needed
   * @param {IterationHistory[]} history
   * @param {Object} metrics
   * @returns {boolean}
   */
  shouldEscalate(history, metrics) {
    if (history.length >= this.escalationThreshold) {
      return true;
    }

    const situation = this._analyzeSituation(history, metrics);

    // Escalate if stuck for too long
    if (situation.stuck && history.length >= this.stuckThreshold + 2) {
      return true;
    }

    // Escalate if regressing for multiple iterations
    if (situation.regressing && history.length >= 4) {
      return true;
    }

    return false;
  }

  /**
   * Analyze current situation from history
   * @private
   * @param {IterationHistory[]} history
   * @param {Object} metrics
   * @returns {Object}
   */
  _analyzeSituation(history, metrics) {
    const situation = {
      stuck: false,
      oscillating: false,
      regressing: false,
      improving: false,
      nearCompletion: false,
      hasBlockers: false,
      repeatedIssues: [],
      trend: metrics.trend || 'unknown',
    };

    // Check trend from metrics (independent of history length)
    if (metrics.trend === 'regressing') {
      situation.regressing = true;
    } else if (metrics.trend === 'improving') {
      situation.improving = true;
    }

    // Early return for empty history (but after checking trend)
    if (history.length === 0) {
      return situation;
    }

    // Check for stuck pattern (no progress for N iterations)
    if (history.length >= this.stuckThreshold) {
      const recent = history.slice(-this.stuckThreshold);
      const progressChanges = recent.map((h, i) => {
        if (i === 0) return 0;
        const prev = recent[i - 1];
        return (h.analysis?.completionPercentage || 0) - (prev.analysis?.completionPercentage || 0);
      }).filter(c => c !== 0);

      situation.stuck = progressChanges.every(c => Math.abs(c) < 5); // < 5% change
    }

    // Check for oscillation (back-and-forth changes)
    if (history.length >= this.oscillationThreshold * 2) {
      const recent = history.slice(-(this.oscillationThreshold * 2));
      const directions = recent.map((h, i) => {
        if (i === 0) return 0;
        const prev = recent[i - 1];
        return (h.analysis?.completionPercentage || 0) - (prev.analysis?.completionPercentage || 0);
      });

      let signChanges = 0;
      for (let i = 1; i < directions.length; i++) {
        if (Math.sign(directions[i]) !== Math.sign(directions[i - 1])) {
          signChanges++;
        }
      }

      situation.oscillating = signChanges >= this.oscillationThreshold;
    }

    // Check if near completion
    const lastIteration = history[history.length - 1];
    if (lastIteration?.analysis?.completionPercentage >= 80) {
      situation.nearCompletion = true;
    }

    // Check for blockers
    if (lastIteration?.blockers?.length > 0) {
      situation.hasBlockers = true;
    }

    // Detect repeated issues
    const allIssues = history.flatMap(h => h.blockers || []);
    const issueCounts = {};
    for (const issue of allIssues) {
      issueCounts[issue] = (issueCounts[issue] || 0) + 1;
    }

    situation.repeatedIssues = Object.entries(issueCounts)
      .filter(([_, count]) => count >= 2)
      .map(([issue, count]) => ({ issue, count }))
      .sort((a, b) => b.count - a.count);

    return situation;
  }

  /**
   * Select strategy based on situation
   * @private
   * @param {Object} situation
   * @param {IterationHistory[]} history
   * @param {Object} metrics
   * @returns {Object}
   */
  _selectStrategy(situation, history, metrics) {
    // Critical: Has blockers - debug first
    if (situation.hasBlockers) {
      return {
        approach: 'pivot',
        reasoning: 'Detected blockers preventing progress. Need to address root causes.',
        adjustments: {
          focus: 'blocker_resolution',
          toolSelection: 'debug-focused',
        },
      };
    }

    // Stuck for multiple iterations - pivot
    if (situation.stuck) {
      return {
        approach: 'pivot',
        reasoning: `No meaningful progress for ${this.stuckThreshold}+ iterations. Try different approach.`,
        adjustments: {
          temperature: 0.8, // Increase creativity
          reframeProblem: true,
        },
      };
    }

    // Oscillating - stabilize
    if (situation.oscillating) {
      return {
        approach: 'pivot',
        reasoning: 'Detected oscillation pattern. Need to break the cycle.',
        adjustments: {
          constrainScope: true,
          requireProgressCommits: true,
        },
      };
    }

    // Regressing - investigate and correct
    if (situation.regressing) {
      return {
        approach: 'pivot',
        reasoning: 'Progress is regressing. Review recent changes and revert if needed.',
        adjustments: {
          reviewRecentChanges: true,
          considerRollback: true,
        },
      };
    }

    // Near completion - persist to finish
    if (situation.nearCompletion) {
      return {
        approach: 'persist',
        reasoning: 'Near completion (>80%). Continue current approach to finish.',
        adjustments: {
          focusOnCompletion: true,
          validateThoroughly: true,
        },
      };
    }

    // Improving - keep going
    if (situation.improving) {
      return {
        approach: 'persist',
        reasoning: 'Making good progress. Continue current strategy.',
        adjustments: {},
      };
    }

    // Default: early iterations, normal progress
    return {
      approach: 'persist',
      reasoning: 'Normal progress pattern. Continue with current strategy.',
      adjustments: {},
    };
  }

  /**
   * Build priority list based on situation
   * @private
   * @param {Object} situation
   * @param {IterationHistory[]} history
   * @param {Object} metrics
   * @returns {string[]}
   */
  _buildPriorities(situation, history, metrics) {
    const priorities = [];

    // Highest priority: blockers
    if (situation.repeatedIssues && situation.repeatedIssues.length > 0) {
      priorities.push(`Address repeated issue: "${situation.repeatedIssues[0].issue}"`);
    } else if (situation.hasBlockers) {
      priorities.push('Identify and resolve current blockers');
    }

    // High priority: stuck or regressing
    if (situation.stuck) {
      priorities.push('Try fundamentally different approach');
      priorities.push('Simplify scope or break down task');
    }

    if (situation.regressing) {
      priorities.push('Review recent changes for issues');
      priorities.push('Consider reverting problematic changes');
    }

    // Medium priority: oscillation
    if (situation.oscillating) {
      priorities.push('Stabilize progress with incremental commits');
      priorities.push('Avoid large refactors mid-iteration');
    }

    // Near completion priorities
    if (situation.nearCompletion) {
      priorities.push('Complete remaining tasks');
      priorities.push('Validate all acceptance criteria');
      priorities.push('Run final tests and checks');
    }

    // Default: normal progress
    if (priorities.length === 0) {
      priorities.push('Continue current implementation');
      priorities.push('Maintain test coverage');
      priorities.push('Document progress');
    }

    return priorities;
  }

  /**
   * Calculate confidence in strategy recommendation
   * @private
   * @param {Object} strategy
   * @param {Object} situation
   * @returns {number} 0 to 1
   */
  _calculateConfidence(strategy, situation) {
    let confidence = 0.5; // Base confidence

    // High confidence for clear situations
    if (situation.hasBlockers) {
      confidence = 0.9; // Very clear: fix blockers
    } else if (situation.stuck) {
      confidence = 0.85; // Clear: need to pivot
    } else if (situation.nearCompletion) {
      confidence = 0.9; // Clear: finish up
    } else if (situation.improving) {
      confidence = 0.8; // Clear: keep going
    } else if (situation.regressing) {
      confidence = 0.75; // Pretty clear: investigate
    } else if (situation.oscillating) {
      confidence = 0.7; // Moderate: stabilize
    }

    return confidence;
  }

  /**
   * Get summary of strategy plan
   * @param {StrategyPlan} plan
   * @returns {string}
   */
  getSummary(plan) {
    return `Strategy: ${plan.approach.toUpperCase()}\nReasoning: ${plan.reasoning}\nConfidence: ${(plan.confidence * 100).toFixed(0)}%\nPriorities:\n${plan.priorities.map((p, i) => `  ${i + 1}. ${p}`).join('\n')}`;
  }

  /**
   * Format strategy plan as markdown
   * @param {StrategyPlan} plan
   * @returns {string}
   */
  formatMarkdown(plan) {
    let md = `## Strategy Plan\n\n`;
    md += `**Approach:** ${plan.approach}\n\n`;
    md += `**Reasoning:** ${plan.reasoning}\n\n`;
    md += `**Confidence:** ${(plan.confidence * 100).toFixed(0)}%\n\n`;
    md += `### Priorities\n\n`;
    plan.priorities.forEach((p, i) => {
      md += `${i + 1}. ${p}\n`;
    });

    if (Object.keys(plan.adjustments).length > 0) {
      md += `\n### Adjustments\n\n`;
      Object.entries(plan.adjustments).forEach(([key, value]) => {
        md += `- **${key}:** ${value}\n`;
      });
    }

    return md;
  }
}

export default StrategyPlanner;
