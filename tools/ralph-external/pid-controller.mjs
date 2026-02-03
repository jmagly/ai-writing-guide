/**
 * PID Controller for External Ralph Loop
 *
 * Implements a PID-inspired control system for adaptive loop management.
 * Integrates metrics collection, gain scheduling, and alarm monitoring
 * to provide intelligent control decisions.
 *
 * @implements Issue #23 - PID-inspired Control Feedback Loop
 * @references REF-015 Self-Refine, REF-021 Reflexion
 *
 * Architecture:
 * - MetricsCollector: Extracts P/I/D values from iterations
 * - GainScheduler: Adapts gains based on task and progress
 * - ControlAlarms: Monitors for pathological behaviors
 * - PIDController: Integrates all and provides control decisions
 */

import { MetricsCollector } from './metrics-collector.mjs';
import { GainScheduler, GAIN_PROFILES } from './gain-scheduler.mjs';
import { ControlAlarms, INTERVENTION_LEVELS } from './control-alarms.mjs';

/**
 * @typedef {Object} ControlDecision
 * @property {string} action - 'continue' | 'adjust' | 'pause' | 'abort'
 * @property {number} controlSignal - Computed control output
 * @property {string} urgency - 'low' | 'normal' | 'elevated' | 'high' | 'critical'
 * @property {Object} recommendations - Specific recommendations
 * @property {Object} alarmSummary - Current alarm state
 * @property {Object} metrics - Current PID metrics
 * @property {Object} gains - Current gain values
 */

/**
 * @typedef {Object} PIDControllerOptions
 * @property {number} [windowSize=5] - Metrics window size
 * @property {number} [integralDecay=0.9] - Integral decay factor
 * @property {number} [noiseThreshold=0.05] - Deadband for noise filtering
 * @property {boolean} [adaptiveGains=true] - Enable adaptive gain scheduling
 * @property {boolean} [autoIntervene=false] - Auto-apply interventions
 * @property {Object} [thresholds] - Custom alarm thresholds
 * @property {Object} [initialProfile] - Initial gain profile
 */

export class PIDController {
  /**
   * @param {PIDControllerOptions} options
   */
  constructor(options = {}) {
    // Initialize sub-components
    this.metricsCollector = new MetricsCollector({
      windowSize: options.windowSize || 5,
      integralDecay: options.integralDecay || 0.9,
      noiseThreshold: options.noiseThreshold || 0.05,
    });

    this.gainScheduler = new GainScheduler({
      initialProfile: options.initialProfile || GAIN_PROFILES.standard,
      adaptiveEnabled: options.adaptiveGains !== false,
      transitionSmoothing: options.transitionSmoothing || 0.3,
    });

    this.alarms = new ControlAlarms({
      thresholds: options.thresholds || {},
      autoIntervene: options.autoIntervene || false,
      onAlarm: (alarm) => this.handleAlarm(alarm),
    });

    // Controller state
    this.isInitialized = false;
    this.taskConfig = null;
    this.lastDecision = null;

    // Event callbacks
    this.onDecision = options.onDecision || (() => {});
    this.onAlarm = options.onAlarm || (() => {});

    // History for analysis
    this.decisionHistory = [];
  }

  /**
   * Initialize controller for a new task
   * @param {Object} taskConfig
   * @param {string} taskConfig.objective - Task objective
   * @param {string} taskConfig.completionCriteria - Completion criteria
   * @param {number} taskConfig.maxIterations - Maximum iterations
   * @param {number} [taskConfig.estimatedComplexity] - 1-10 complexity scale
   * @param {boolean} [taskConfig.securitySensitive] - Is security-critical
   * @param {boolean} [taskConfig.breakingChanges] - May cause breaking changes
   */
  initialize(taskConfig) {
    this.taskConfig = taskConfig;

    // Assess task complexity and set initial gains
    this.gainScheduler.assessTaskComplexity({
      estimatedIterations: taskConfig.maxIterations,
      filesAffected: taskConfig.estimatedFilesAffected || 10,
      hasTests: taskConfig.hasTests !== false,
      securitySensitive: taskConfig.securitySensitive || false,
      breakingChanges: taskConfig.breakingChanges || false,
      domainComplexity: this.mapComplexity(taskConfig.estimatedComplexity),
    });

    this.isInitialized = true;

    return {
      initialProfile: this.gainScheduler.getEffectiveGains(),
      taskComplexity: this.gainScheduler.taskComplexity,
    };
  }

  /**
   * Map numeric complexity to category
   * @param {number} complexity - 1-10 scale
   * @returns {string}
   */
  mapComplexity(complexity) {
    if (!complexity) return 'medium';
    if (complexity <= 3) return 'low';
    if (complexity <= 7) return 'medium';
    return 'high';
  }

  /**
   * Process an iteration and return control decision
   * @param {Object} iteration - Iteration data from orchestrator
   * @param {Object} state - Current system state
   * @returns {ControlDecision}
   */
  process(iteration, state = {}) {
    if (!this.isInitialized) {
      throw new Error('PIDController not initialized. Call initialize() first.');
    }

    // Collect metrics from iteration
    const metrics = this.metricsCollector.collect(iteration);

    // Get trend analysis
    const trend = this.metricsCollector.getTrend();

    // Update gains based on current state
    const systemState = {
      proportional: metrics.proportional,
      integral: metrics.integral,
      derivative: metrics.derivative,
      trend: trend.trend,
      iterationNumber: state.currentIteration || iteration.number || 1,
      maxIterations: state.maxIterations || this.taskConfig?.maxIterations || 10,
    };

    const gains = this.gainScheduler.update(systemState);

    // Calculate control output
    const controlOutput = this.gainScheduler.calculateControlOutput(metrics);

    // Check for alarms
    const newAlarms = this.alarms.check(metrics, systemState);

    // Determine action based on alarms and control signal
    const decision = this.makeDecision(controlOutput, newAlarms, systemState);

    // Store decision
    this.lastDecision = decision;
    this.decisionHistory.push({
      ...decision,
      iterationNumber: systemState.iterationNumber,
    });

    // Keep history bounded
    if (this.decisionHistory.length > 50) {
      this.decisionHistory = this.decisionHistory.slice(-50);
    }

    // Emit decision event
    this.onDecision(decision);

    return decision;
  }

  /**
   * Make control decision based on all inputs
   * @param {Object} controlOutput
   * @param {Array} newAlarms
   * @param {Object} systemState
   * @returns {ControlDecision}
   */
  makeDecision(controlOutput, newAlarms, systemState) {
    const alarmSummary = this.alarms.getSummary();
    const highestAlarm = this.alarms.getHighestSeverityAlarm();

    // Default action is continue
    let action = 'continue';
    let urgency = controlOutput.recommendations.urgency;

    // Override based on alarms
    if (highestAlarm) {
      switch (highestAlarm.severity) {
        case 'emergency':
          action = 'abort';
          urgency = 'critical';
          break;
        case 'critical':
          action = 'pause';
          urgency = 'critical';
          break;
        case 'warning':
          action = 'adjust';
          urgency = 'high';
          break;
        default:
          // info alarms don't change action
          break;
      }
    }

    // Check iteration budget
    const iterationProgress = systemState.iterationNumber / systemState.maxIterations;
    if (iterationProgress >= 0.95 && systemState.proportional > 0.3) {
      action = 'pause';
      urgency = 'critical';
    }

    // Build recommendations
    const recommendations = {
      ...controlOutput.recommendations,
      alarmInterventions: highestAlarm?.interventions || [],
      profileChange: this.gainScheduler.currentProfile.name !== this.lastDecision?.gains?.name,
      newProfile: this.gainScheduler.currentProfile.name,
    };

    return {
      action,
      controlSignal: controlOutput.controlSignal,
      urgency,
      recommendations,
      alarmSummary,
      metrics: {
        proportional: systemState.proportional,
        integral: systemState.integral,
        derivative: systemState.derivative,
        trend: this.metricsCollector.getTrend().trend,
        velocity: this.metricsCollector.getVelocity(),
      },
      gains: this.gainScheduler.getEffectiveGains(),
      controlOutput,
      timestamp: Date.now(),
    };
  }

  /**
   * Handle alarm events
   * @param {Object} alarm
   */
  handleAlarm(alarm) {
    this.onAlarm(alarm);
  }

  /**
   * Get intervention recommendation for current state
   * @returns {Object}
   */
  getInterventionRecommendation() {
    const decision = this.lastDecision;
    if (!decision) {
      return { level: INTERVENTION_LEVELS.NONE, reason: 'No decision available' };
    }

    const highestAlarm = this.alarms.getHighestSeverityAlarm();

    if (!highestAlarm) {
      return { level: INTERVENTION_LEVELS.NONE, reason: 'No active alarms' };
    }

    const level = this.alarms.suggestIntervention(highestAlarm);

    return {
      level,
      reason: highestAlarm.message,
      alarm: highestAlarm,
      suggestedActions: highestAlarm.interventions,
    };
  }

  /**
   * Get prompt adjustments based on control state
   * @returns {Object}
   */
  getPromptAdjustments() {
    const decision = this.lastDecision;
    if (!decision) {
      return { adjustments: [], context: '' };
    }

    const adjustments = [];
    const contextParts = [];

    // Add urgency context
    if (decision.urgency === 'critical' || decision.urgency === 'high') {
      adjustments.push('Focus on completing the most critical remaining work');
      contextParts.push(`Urgency level: ${decision.urgency}`);
    }

    // Add trend-based adjustments
    switch (decision.metrics.trend) {
      case 'regressing':
        adjustments.push('Recent progress has regressed - reconsider current approach');
        contextParts.push('Progress has been going backwards');
        break;
      case 'oscillating':
        adjustments.push('Progress has been oscillating - commit to one approach');
        contextParts.push('Making and then undoing changes');
        break;
      case 'stable':
        if (decision.metrics.proportional > 0.5) {
          adjustments.push('Progress has stalled - try a different approach');
          contextParts.push('Not making progress on remaining work');
        }
        break;
    }

    // Add repeated issues context
    const repeatedIssues = this.metricsCollector.getRepeatedIssues();
    if (repeatedIssues.length > 0) {
      const issueList = repeatedIssues.slice(0, 3).map(i => i.issue).join('; ');
      adjustments.push(`Address recurring issues: ${issueList}`);
      contextParts.push(`Issues appearing multiple times: ${repeatedIssues.length}`);
    }

    // Add velocity context
    const velocity = decision.metrics.velocity;
    if (velocity < 0) {
      adjustments.push('Progress rate is negative - recent changes may have caused regression');
    } else if (velocity > 0.1) {
      adjustments.push('Good progress rate - continue current approach');
    }

    return {
      adjustments,
      context: contextParts.join('. '),
      metrics: decision.metrics,
      gains: decision.gains,
    };
  }

  /**
   * Acknowledge an alarm
   * @param {string} alarmId
   */
  acknowledgeAlarm(alarmId) {
    this.alarms.acknowledgeAlarm(alarmId);
  }

  /**
   * Clear an alarm
   * @param {string} type
   */
  clearAlarm(type) {
    this.alarms.clearAlarm(type);
  }

  /**
   * Get current state summary
   * @returns {Object}
   */
  getSummary() {
    return {
      initialized: this.isInitialized,
      taskConfig: this.taskConfig,
      lastDecision: this.lastDecision,
      metricsSummary: this.metricsCollector.getSummary(),
      gainProfile: this.gainScheduler.getEffectiveGains(),
      alarmSummary: this.alarms.getSummary(),
      decisionCount: this.decisionHistory.length,
    };
  }

  /**
   * Get decision history
   * @returns {Array}
   */
  getDecisionHistory() {
    return [...this.decisionHistory];
  }

  /**
   * Reset controller for new task
   */
  reset() {
    this.metricsCollector.reset();
    this.gainScheduler.reset();
    this.alarms.reset();
    this.isInitialized = false;
    this.taskConfig = null;
    this.lastDecision = null;
    this.decisionHistory = [];
  }

  /**
   * Export full state for persistence
   * @returns {Object}
   */
  exportState() {
    return {
      isInitialized: this.isInitialized,
      taskConfig: this.taskConfig,
      lastDecision: this.lastDecision,
      decisionHistory: this.decisionHistory,
      metricsState: this.metricsCollector.exportState(),
      gainState: this.gainScheduler.exportState(),
      alarmState: this.alarms.exportState(),
    };
  }

  /**
   * Import state from persistence
   * @param {Object} state
   */
  importState(state) {
    if (typeof state.isInitialized === 'boolean') {
      this.isInitialized = state.isInitialized;
    }
    if (state.taskConfig) {
      this.taskConfig = state.taskConfig;
    }
    if (state.lastDecision) {
      this.lastDecision = state.lastDecision;
    }
    if (state.decisionHistory) {
      this.decisionHistory = state.decisionHistory;
    }
    if (state.metricsState) {
      this.metricsCollector.importState(state.metricsState);
    }
    if (state.gainState) {
      this.gainScheduler.importState(state.gainState);
    }
    if (state.alarmState) {
      this.alarms.importState(state.alarmState);
    }
  }
}

// Re-export components for direct access
export { MetricsCollector } from './metrics-collector.mjs';
export { GainScheduler, GAIN_PROFILES } from './gain-scheduler.mjs';
export { ControlAlarms, INTERVENTION_LEVELS } from './control-alarms.mjs';

export default PIDController;
