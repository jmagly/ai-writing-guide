/**
 * Control Alarms for PID Control System
 *
 * Monitors PID metrics and system state to detect pathological
 * behaviors and trigger appropriate interventions.
 *
 * @implements Issue #23 - PID-inspired Control Feedback Loop
 * @implements Issue #25 - Autonomous Oversight Layer (partial)
 * @references REF-015 Self-Refine, REF-021 Reflexion
 *
 * Alarm Types:
 * - Stuck Loop: No progress for multiple iterations
 * - Oscillation: Alternating improvement/regression
 * - Regression: Consistent negative progress
 * - Resource Burn: Excessive iterations without completion
 * - Quality Degradation: Declining quality scores
 */

/**
 * @typedef {Object} Alarm
 * @property {string} id - Unique alarm ID
 * @property {string} type - Alarm type
 * @property {string} severity - 'info' | 'warning' | 'critical' | 'emergency'
 * @property {string} message - Human-readable description
 * @property {number} timestamp - When alarm was raised
 * @property {Object} context - Additional context data
 * @property {boolean} acknowledged - Whether alarm has been acknowledged
 * @property {string[]} interventions - Suggested interventions
 */

/**
 * @typedef {Object} AlarmThresholds
 * @property {number} stuckIterations - Iterations without progress before alarm
 * @property {number} oscillationCount - Oscillation cycles before alarm
 * @property {number} regressionRate - Rate of regression before alarm
 * @property {number} maxIterationsPercent - % of max iterations before resource alarm
 * @property {number} qualityDropThreshold - Quality score drop threshold
 */

/**
 * Default alarm thresholds
 */
export const DEFAULT_THRESHOLDS = {
  stuckIterations: 3,
  oscillationCount: 2,
  regressionRate: 0.1,
  maxIterationsPercent: 0.8,
  qualityDropThreshold: 0.15,
  integralWindupLimit: 4.0,
  derivativeSpike: 0.2,
  minProgressRate: 0.02,
};

/**
 * Intervention levels
 */
export const INTERVENTION_LEVELS = {
  NONE: 'none',
  ADJUST: 'adjust',      // Adjust parameters
  NUDGE: 'nudge',        // Suggest new approach
  PAUSE: 'pause',        // Pause and request human review
  ABORT: 'abort',        // Abort the loop
};

export class ControlAlarms {
  /**
   * @param {Object} options
   * @param {AlarmThresholds} [options.thresholds] - Custom thresholds
   * @param {Function} [options.onAlarm] - Callback when alarm is raised
   * @param {boolean} [options.autoIntervene=false] - Auto-apply interventions
   */
  constructor(options = {}) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...options.thresholds };
    this.onAlarm = options.onAlarm || (() => {});
    this.autoIntervene = options.autoIntervene || false;

    // Active alarms
    this.activeAlarms = new Map();

    // Alarm history
    this.alarmHistory = [];

    // State tracking for pattern detection
    this.progressHistory = [];
    this.qualityHistory = [];

    // Counter for unique alarm IDs
    this.alarmCounter = 0;
  }

  /**
   * Check for alarms based on current metrics and state
   * @param {Object} metrics - Current PID metrics
   * @param {Object} state - Current system state
   * @returns {Alarm[]} - New alarms raised
   */
  check(metrics, state) {
    const newAlarms = [];

    // Update tracking history
    this.updateHistory(metrics);

    // Check each alarm condition
    const checks = [
      this.checkStuckLoop(metrics, state),
      this.checkOscillation(metrics, state),
      this.checkRegression(metrics, state),
      this.checkResourceBurn(state),
      this.checkQualityDegradation(metrics, state),
      this.checkIntegralWindup(metrics),
      this.checkDerivativeSpike(metrics),
    ];

    for (const alarm of checks) {
      if (alarm && !this.isAlarmActive(alarm.type)) {
        this.raiseAlarm(alarm);
        newAlarms.push(alarm);
      }
    }

    return newAlarms;
  }

  /**
   * Update progress tracking history
   * @param {Object} metrics
   */
  updateHistory(metrics) {
    this.progressHistory.push({
      proportional: metrics.proportional,
      derivative: metrics.derivative,
      timestamp: metrics.timestamp || Date.now(),
    });

    if (metrics.raw?.qualityScore !== undefined) {
      this.qualityHistory.push({
        quality: metrics.raw.qualityScore,
        timestamp: metrics.timestamp || Date.now(),
      });
    }

    // Keep bounded history
    const maxHistory = 20;
    if (this.progressHistory.length > maxHistory) {
      this.progressHistory = this.progressHistory.slice(-maxHistory);
    }
    if (this.qualityHistory.length > maxHistory) {
      this.qualityHistory = this.qualityHistory.slice(-maxHistory);
    }
  }

  /**
   * Check for stuck loop condition
   * @param {Object} metrics
   * @param {Object} state
   * @returns {Alarm|null}
   */
  checkStuckLoop(metrics, state) {
    if (this.progressHistory.length < this.thresholds.stuckIterations) {
      return null;
    }

    const recent = this.progressHistory.slice(-this.thresholds.stuckIterations);

    // Check if error hasn't changed significantly
    const firstError = recent[0].proportional;
    const lastError = recent[recent.length - 1].proportional;
    const errorChange = Math.abs(firstError - lastError);

    // Also check derivative is near zero
    const avgDerivative = recent.reduce((sum, p) => sum + Math.abs(p.derivative), 0) / recent.length;

    if (errorChange < this.thresholds.minProgressRate && avgDerivative < 0.02) {
      return this.createAlarm({
        type: 'stuck_loop',
        severity: lastError > 0.5 ? 'critical' : 'warning',
        message: `Loop stuck for ${this.thresholds.stuckIterations} iterations with error=${lastError.toFixed(2)}`,
        context: {
          iterationsStuck: this.thresholds.stuckIterations,
          errorLevel: lastError,
          errorChange,
        },
        interventions: [
          'Change approach or strategy',
          'Break task into smaller sub-tasks',
          'Request human guidance',
          'Increase iteration budget',
        ],
      });
    }

    return null;
  }

  /**
   * Check for oscillation pattern
   * @param {Object} metrics
   * @param {Object} state
   * @returns {Alarm|null}
   */
  checkOscillation(metrics, state) {
    if (this.progressHistory.length < 4) {
      return null;
    }

    const recent = this.progressHistory.slice(-6);
    let oscillationCount = 0;

    for (let i = 1; i < recent.length - 1; i++) {
      const prev = recent[i - 1].proportional;
      const curr = recent[i].proportional;
      const next = recent[i + 1].proportional;

      // Detect direction change
      const prevDir = curr - prev;
      const nextDir = next - curr;

      if (prevDir * nextDir < 0 && Math.abs(prevDir) > 0.03 && Math.abs(nextDir) > 0.03) {
        oscillationCount++;
      }
    }

    if (oscillationCount >= this.thresholds.oscillationCount) {
      return this.createAlarm({
        type: 'oscillation',
        severity: 'warning',
        message: `Oscillation detected: ${oscillationCount} direction changes in recent iterations`,
        context: {
          oscillationCount,
          pattern: recent.map(p => p.proportional.toFixed(2)),
        },
        interventions: [
          'Increase PID damping (Kd)',
          'Reduce proportional gain (Kp)',
          'Switch to conservative profile',
          'Add constraints to prevent overshooting',
        ],
      });
    }

    return null;
  }

  /**
   * Check for regression pattern
   * @param {Object} metrics
   * @param {Object} state
   * @returns {Alarm|null}
   */
  checkRegression(metrics, state) {
    if (metrics.derivative > this.thresholds.regressionRate) {
      const severity = metrics.derivative > 0.2 ? 'critical' : 'warning';

      return this.createAlarm({
        type: 'regression',
        severity,
        message: `Regression detected: error increasing at rate ${metrics.derivative.toFixed(3)} per iteration`,
        context: {
          regressionRate: metrics.derivative,
          currentError: metrics.proportional,
        },
        interventions: [
          'Revert recent changes',
          'Analyze what caused regression',
          'Switch to recovery mode',
          'Request human review of approach',
        ],
      });
    }

    return null;
  }

  /**
   * Check for resource burn (too many iterations)
   * @param {Object} state
   * @returns {Alarm|null}
   */
  checkResourceBurn(state) {
    if (!state.iterationNumber || !state.maxIterations) {
      return null;
    }

    const progress = state.iterationNumber / state.maxIterations;

    if (progress >= this.thresholds.maxIterationsPercent) {
      const severity = progress >= 0.95 ? 'emergency' : 'critical';

      return this.createAlarm({
        type: 'resource_burn',
        severity,
        message: `Used ${(progress * 100).toFixed(0)}% of iteration budget (${state.iterationNumber}/${state.maxIterations})`,
        context: {
          iterationsUsed: state.iterationNumber,
          maxIterations: state.maxIterations,
          percentUsed: progress,
        },
        interventions: [
          'Increase max iterations if task is viable',
          'Consider aborting if no progress',
          'Break into smaller tasks',
          'Request human decision on continuation',
        ],
      });
    }

    return null;
  }

  /**
   * Check for quality degradation
   * @param {Object} metrics
   * @param {Object} state
   * @returns {Alarm|null}
   */
  checkQualityDegradation(metrics, state) {
    if (this.qualityHistory.length < 3) {
      return null;
    }

    const recent = this.qualityHistory.slice(-5);
    const first = recent[0].quality;
    const last = recent[recent.length - 1].quality;
    const drop = first - last;

    if (drop > this.thresholds.qualityDropThreshold) {
      return this.createAlarm({
        type: 'quality_degradation',
        severity: drop > 0.25 ? 'critical' : 'warning',
        message: `Quality score dropped by ${(drop * 100).toFixed(1)}% (${first.toFixed(2)} → ${last.toFixed(2)})`,
        context: {
          qualityDrop: drop,
          initialQuality: first,
          currentQuality: last,
          trend: recent.map(q => q.quality.toFixed(2)),
        },
        interventions: [
          'Review recent changes for quality issues',
          'Run additional validation',
          'Consider reverting to higher quality state',
          'Focus on quality over completion',
        ],
      });
    }

    return null;
  }

  /**
   * Check for integral windup
   * @param {Object} metrics
   * @returns {Alarm|null}
   */
  checkIntegralWindup(metrics) {
    if (metrics.integral > this.thresholds.integralWindupLimit) {
      return this.createAlarm({
        type: 'integral_windup',
        severity: 'warning',
        message: `Integral accumulation at ${metrics.integral.toFixed(2)} (limit: ${this.thresholds.integralWindupLimit})`,
        context: {
          integralValue: metrics.integral,
          limit: this.thresholds.integralWindupLimit,
        },
        interventions: [
          'Address persistent blockers',
          'Reset integral accumulator',
          'Check for repeated failing patterns',
          'Review and resolve recurring issues',
        ],
      });
    }

    return null;
  }

  /**
   * Check for derivative spike
   * @param {Object} metrics
   * @returns {Alarm|null}
   */
  checkDerivativeSpike(metrics) {
    if (Math.abs(metrics.derivative) > this.thresholds.derivativeSpike) {
      const direction = metrics.derivative > 0 ? 'positive' : 'negative';
      const meaning = metrics.derivative > 0 ? 'rapid regression' : 'rapid improvement';

      return this.createAlarm({
        type: 'derivative_spike',
        severity: metrics.derivative > 0 ? 'warning' : 'info',
        message: `Derivative spike detected: ${direction} ${Math.abs(metrics.derivative).toFixed(3)} (${meaning})`,
        context: {
          derivativeValue: metrics.derivative,
          direction,
          meaning,
        },
        interventions: metrics.derivative > 0
          ? ['Investigate cause of sudden regression', 'Consider reverting recent changes']
          : ['Validate sudden improvement is real', 'Document what caused rapid progress'],
      });
    }

    return null;
  }

  /**
   * Create an alarm object
   * @param {Object} params
   * @returns {Alarm}
   */
  createAlarm(params) {
    return {
      id: `alarm-${++this.alarmCounter}-${Date.now()}`,
      type: params.type,
      severity: params.severity,
      message: params.message,
      timestamp: Date.now(),
      context: params.context || {},
      acknowledged: false,
      interventions: params.interventions || [],
    };
  }

  /**
   * Raise an alarm
   * @param {Alarm} alarm
   */
  raiseAlarm(alarm) {
    this.activeAlarms.set(alarm.type, alarm);
    this.alarmHistory.push(alarm);

    // Keep history bounded
    if (this.alarmHistory.length > 100) {
      this.alarmHistory = this.alarmHistory.slice(-100);
    }

    // Call callback
    this.onAlarm(alarm);

    // Auto-intervene if enabled
    if (this.autoIntervene) {
      this.suggestIntervention(alarm);
    }
  }

  /**
   * Check if an alarm type is currently active
   * @param {string} type
   * @returns {boolean}
   */
  isAlarmActive(type) {
    return this.activeAlarms.has(type);
  }

  /**
   * Acknowledge an alarm
   * @param {string} alarmId
   */
  acknowledgeAlarm(alarmId) {
    for (const alarm of this.activeAlarms.values()) {
      if (alarm.id === alarmId) {
        alarm.acknowledged = true;
        break;
      }
    }
  }

  /**
   * Clear an alarm
   * @param {string} type
   */
  clearAlarm(type) {
    this.activeAlarms.delete(type);
  }

  /**
   * Clear all alarms
   */
  clearAllAlarms() {
    this.activeAlarms.clear();
  }

  /**
   * Suggest intervention level based on alarm severity
   * @param {Alarm} alarm
   * @returns {string} - Intervention level
   */
  suggestIntervention(alarm) {
    switch (alarm.severity) {
      case 'emergency':
        return INTERVENTION_LEVELS.ABORT;
      case 'critical':
        return INTERVENTION_LEVELS.PAUSE;
      case 'warning':
        return INTERVENTION_LEVELS.NUDGE;
      case 'info':
        return INTERVENTION_LEVELS.ADJUST;
      default:
        return INTERVENTION_LEVELS.NONE;
    }
  }

  /**
   * Get all active alarms
   * @returns {Alarm[]}
   */
  getActiveAlarms() {
    return Array.from(this.activeAlarms.values());
  }

  /**
   * Get highest severity active alarm
   * @returns {Alarm|null}
   */
  getHighestSeverityAlarm() {
    const severityOrder = ['emergency', 'critical', 'warning', 'info'];
    const alarms = this.getActiveAlarms();

    for (const severity of severityOrder) {
      const alarm = alarms.find(a => a.severity === severity);
      if (alarm) return alarm;
    }

    return null;
  }

  /**
   * Get alarm summary
   * @returns {Object}
   */
  getSummary() {
    const alarms = this.getActiveAlarms();

    return {
      activeCount: alarms.length,
      bySeverity: {
        emergency: alarms.filter(a => a.severity === 'emergency').length,
        critical: alarms.filter(a => a.severity === 'critical').length,
        warning: alarms.filter(a => a.severity === 'warning').length,
        info: alarms.filter(a => a.severity === 'info').length,
      },
      types: alarms.map(a => a.type),
      highestSeverity: this.getHighestSeverityAlarm()?.severity || 'none',
      totalHistorical: this.alarmHistory.length,
    };
  }

  /**
   * Update thresholds
   * @param {Partial<AlarmThresholds>} thresholds
   */
  updateThresholds(thresholds) {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * Reset alarm system
   */
  reset() {
    this.activeAlarms.clear();
    this.alarmHistory = [];
    this.progressHistory = [];
    this.qualityHistory = [];
    this.alarmCounter = 0;
  }

  /**
   * Export state for persistence
   * @returns {Object}
   */
  exportState() {
    return {
      activeAlarms: Array.from(this.activeAlarms.entries()),
      alarmHistory: this.alarmHistory,
      progressHistory: this.progressHistory,
      qualityHistory: this.qualityHistory,
      thresholds: this.thresholds,
      alarmCounter: this.alarmCounter,
    };
  }

  /**
   * Import state from persistence
   * @param {Object} state
   */
  importState(state) {
    if (state.activeAlarms) {
      this.activeAlarms = new Map(state.activeAlarms);
    }
    if (state.alarmHistory) {
      this.alarmHistory = state.alarmHistory;
    }
    if (state.progressHistory) {
      this.progressHistory = state.progressHistory;
    }
    if (state.qualityHistory) {
      this.qualityHistory = state.qualityHistory;
    }
    if (state.thresholds) {
      this.thresholds = state.thresholds;
    }
    if (state.alarmCounter) {
      this.alarmCounter = state.alarmCounter;
    }
  }
}

export default ControlAlarms;
