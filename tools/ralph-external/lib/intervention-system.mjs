/**
 * Intervention System for External Ralph Loop Overseer
 *
 * Handles interventions based on behavior detections:
 * - LOG: Record observation only
 * - WARN: Inject warning into next prompt
 * - REDIRECT: Force strategy change
 * - PAUSE: Halt for human approval
 * - ABORT: Cancel execution, rollback
 *
 * @implements Issue #25 - Autonomous Overseer
 * @references @.claude/rules/anti-laziness.md
 */

/**
 * Intervention levels (severity-based)
 */
export const INTERVENTION_LEVELS = {
  LOG: 'log',           // Record only, no action
  WARN: 'warn',         // Inject warning in prompt
  REDIRECT: 'redirect', // Force strategy change
  PAUSE: 'pause',       // Require human approval
  ABORT: 'abort',       // Cancel and rollback
};

/**
 * @typedef {Object} Intervention
 * @property {string} level - Intervention level
 * @property {string} reason - Why intervention was triggered
 * @property {Object} detection - Original detection
 * @property {string} timestamp - When intervention occurred
 * @property {string} [action] - Action taken (for LOG level)
 * @property {string} [warning] - Warning text (for WARN level)
 * @property {string} [strategyOverride] - New strategy (for REDIRECT level)
 * @property {boolean} [requiresApproval] - Needs human approval (for PAUSE level)
 */

export class InterventionSystem {
  /**
   * @param {Object} options
   * @param {Function} [options.onIntervention] - Callback when intervention occurs
   * @param {Function} [options.onPause] - Callback when pause triggered
   * @param {Function} [options.onAbort] - Callback when abort triggered
   */
  constructor(options = {}) {
    this.onIntervention = options.onIntervention || (() => {});
    this.onPause = options.onPause || (() => {});
    this.onAbort = options.onAbort || (() => {});

    this.interventionLog = [];
    this.isPaused = false;
    this.pauseReason = null;
  }

  /**
   * Intervene based on detection
   * @param {Object} detection - Detection from BehaviorDetector
   * @returns {Intervention}
   */
  intervene(detection) {
    const level = this.determineLevel(detection);

    const intervention = {
      level,
      reason: detection.message,
      detection,
      timestamp: new Date().toISOString(),
    };

    // Execute intervention based on level
    switch (level) {
      case INTERVENTION_LEVELS.LOG:
        intervention.action = 'Logged detection for monitoring';
        break;

      case INTERVENTION_LEVELS.WARN:
        intervention.warning = this.buildWarning(detection);
        break;

      case INTERVENTION_LEVELS.REDIRECT:
        intervention.strategyOverride = this.buildStrategyOverride(detection);
        break;

      case INTERVENTION_LEVELS.PAUSE:
        intervention.requiresApproval = true;
        this.isPaused = true;
        this.pauseReason = detection.message;
        this.onPause(intervention);
        break;

      case INTERVENTION_LEVELS.ABORT:
        intervention.requiresApproval = true;
        intervention.abortReason = detection.message;
        this.onAbort(intervention);
        break;
    }

    // Record intervention
    this.interventionLog.push(intervention);

    // Keep log bounded
    if (this.interventionLog.length > 100) {
      this.interventionLog = this.interventionLog.slice(-100);
    }

    // Callback
    this.onIntervention(intervention);

    return intervention;
  }

  /**
   * Determine intervention level based on detection severity
   * @param {Object} detection
   * @returns {string} Intervention level
   */
  determineLevel(detection) {
    const { severity, type } = detection;

    // Severity-based mapping
    switch (severity) {
      case 'critical':
        // Critical issues pause or abort depending on type
        if (type === 'resource_burn' || type === 'regression') {
          return INTERVENTION_LEVELS.ABORT;
        }
        return INTERVENTION_LEVELS.PAUSE;

      case 'high':
        // High severity issues require redirection or pause
        if (type === 'stuck' || type === 'oscillation') {
          return INTERVENTION_LEVELS.REDIRECT;
        }
        return INTERVENTION_LEVELS.WARN;

      case 'medium':
        return INTERVENTION_LEVELS.WARN;

      case 'low':
      default:
        return INTERVENTION_LEVELS.LOG;
    }
  }

  /**
   * Build warning message for prompt injection
   * @param {Object} detection
   * @returns {string}
   */
  buildWarning(detection) {
    const { type, message, recommendations } = detection;

    let warning = `⚠️ OVERSEER WARNING: ${message}\n\n`;

    if (recommendations && recommendations.length > 0) {
      warning += 'Recommended actions:\n';
      recommendations.forEach((rec, idx) => {
        warning += `${idx + 1}. ${rec}\n`;
      });
    }

    // Add type-specific guidance
    switch (type) {
      case 'stuck':
        warning += '\nYou are making the same error repeatedly. Stop and try a different approach.';
        break;
      case 'oscillation':
        warning += '\nYou are undoing and redoing changes. Pick one direction and commit to it.';
        break;
      case 'deviation':
        warning += '\nYour recent work may have drifted from the original objective. Refocus.';
        break;
      case 'resource_burn':
        warning += '\nYou are approaching your iteration budget. Focus on critical remaining work.';
        break;
      case 'regression':
        warning += '\nTests or coverage are regressing. Fix the code, not the tests.';
        break;
    }

    return warning;
  }

  /**
   * Build strategy override for redirection
   * @param {Object} detection
   * @returns {string}
   */
  buildStrategyOverride(detection) {
    const { type, evidence } = detection;

    let strategy = '';

    switch (type) {
      case 'stuck':
        strategy = 'OVERRIDE: Change approach immediately. ';
        strategy += 'The current method is not working. ';
        if (evidence.repeatedError) {
          strategy += `You have hit "${evidence.repeatedError}" ${evidence.occurrences} times. `;
        }
        strategy += 'Try a completely different solution strategy.';
        break;

      case 'oscillation':
        strategy = 'OVERRIDE: Stop alternating between approaches. ';
        strategy += 'Analyze which approach is better and commit to it. ';
        strategy += 'No more back-and-forth changes.';
        break;

      case 'deviation':
        strategy = 'OVERRIDE: Return to original objective. ';
        if (evidence.originalObjective) {
          strategy += `Original objective: "${evidence.originalObjective}". `;
        }
        strategy += 'All work must align with this goal.';
        break;

      default:
        strategy = 'OVERRIDE: Reassess current approach and adjust strategy.';
    }

    return strategy;
  }

  /**
   * Inject warning into prompt
   * @param {string} prompt - Original prompt
   * @param {string} warning - Warning message
   * @returns {string} Modified prompt with warning
   */
  injectWarning(prompt, warning) {
    // Prepend warning to prompt with clear demarcation
    return `${warning}\n\n${'='.repeat(80)}\n\nORIGINAL TASK:\n${prompt}`;
  }

  /**
   * Resume from pause
   * @param {string} approvalReason - Why resuming was approved
   * @returns {boolean} Success
   */
  resume(approvalReason) {
    if (!this.isPaused) {
      return false;
    }

    this.interventionLog.push({
      level: 'resume',
      reason: approvalReason,
      timestamp: new Date().toISOString(),
      previousPauseReason: this.pauseReason,
    });

    this.isPaused = false;
    this.pauseReason = null;

    return true;
  }

  /**
   * Check if system is paused
   * @returns {boolean}
   */
  getPauseStatus() {
    return {
      isPaused: this.isPaused,
      reason: this.pauseReason,
    };
  }

  /**
   * Get intervention log
   * @param {number} [limit] - Max entries to return
   * @returns {Array}
   */
  getLog(limit = null) {
    if (limit) {
      return this.interventionLog.slice(-limit);
    }
    return [...this.interventionLog];
  }

  /**
   * Get summary of interventions by level
   * @returns {Object}
   */
  getSummary() {
    const summary = {
      total: this.interventionLog.length,
      byLevel: {},
      byType: {},
      isPaused: this.isPaused,
      pauseReason: this.pauseReason,
    };

    this.interventionLog.forEach(intervention => {
      // Count by level
      const level = intervention.level;
      summary.byLevel[level] = (summary.byLevel[level] || 0) + 1;

      // Count by detection type
      if (intervention.detection) {
        const type = intervention.detection.type;
        summary.byType[type] = (summary.byType[type] || 0) + 1;
      }
    });

    return summary;
  }

  /**
   * Clear intervention log
   */
  clearLog() {
    this.interventionLog = [];
  }

  /**
   * Reset intervention system
   */
  reset() {
    this.interventionLog = [];
    this.isPaused = false;
    this.pauseReason = null;
  }

  /**
   * Export state for persistence
   * @returns {Object}
   */
  exportState() {
    return {
      interventionLog: this.interventionLog,
      isPaused: this.isPaused,
      pauseReason: this.pauseReason,
    };
  }

  /**
   * Import state from persistence
   * @param {Object} state
   */
  importState(state) {
    if (state.interventionLog) {
      this.interventionLog = state.interventionLog;
    }
    if (typeof state.isPaused === 'boolean') {
      this.isPaused = state.isPaused;
    }
    if (state.pauseReason) {
      this.pauseReason = state.pauseReason;
    }
  }
}

export default InterventionSystem;
