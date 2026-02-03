/**
 * Autonomous Overseer for External Ralph Loop
 *
 * Coordinates behavior detection, intervention, and escalation
 * to prevent pathological loop behaviors:
 * - Stuck loops
 * - Oscillation
 * - Objective deviation
 * - Resource burn
 * - Quality regression
 *
 * Runs health checks after each iteration and maintains audit trail.
 *
 * @implements Issue #25 - Autonomous Overseer
 * @references @.claude/rules/anti-laziness.md
 * @references @.claude/rules/hitl-patterns.md
 */

import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { BehaviorDetector } from './behavior-detector.mjs';
import { InterventionSystem } from './intervention-system.mjs';
import { EscalationHandler, ESCALATION_LEVELS } from './escalation-handler.mjs';

/**
 * @typedef {Object} HealthCheck
 * @property {number} iterationNumber - Iteration number
 * @property {string} timestamp - ISO timestamp
 * @property {Array} detections - Behavior detections
 * @property {Array} interventions - Interventions applied
 * @property {string} status - healthy|warning|critical|paused|aborted
 * @property {Object} metrics - Health metrics
 */

/**
 * @typedef {Object} OverseerOptions
 * @property {string} [storagePath] - Path to store overseer logs
 * @property {Object} [detectorOptions] - Options for BehaviorDetector
 * @property {Object} [interventionOptions] - Options for InterventionSystem
 * @property {Object} [escalationOptions] - Options for EscalationHandler
 * @property {boolean} [autoEscalate=true] - Auto-escalate critical issues
 * @property {Function} [onHealthCheck] - Callback after each health check
 */

const DEFAULT_STORAGE_PATH = '.aiwg/ralph-external/overseer';

export class Overseer {
  /**
   * @param {string} loopId - Ralph loop identifier
   * @param {string} taskDescription - Task description
   * @param {OverseerOptions} options
   */
  constructor(loopId, taskDescription, options = {}) {
    this.loopId = loopId;
    this.taskDescription = taskDescription;
    this.storagePath = options.storagePath || DEFAULT_STORAGE_PATH;

    // Initialize components
    this.detector = new BehaviorDetector(options.detectorOptions || {});

    this.interventionSystem = new InterventionSystem({
      ...options.interventionOptions,
      onPause: (intervention) => this.handlePause(intervention),
      onAbort: (intervention) => this.handleAbort(intervention),
    });

    this.escalationHandler = new EscalationHandler({
      ...options.escalationOptions,
      repo: 'roctinam/ai-writing-guide', // Default repo
    });

    // Options
    this.autoEscalate = options.autoEscalate !== false;
    this.onHealthCheck = options.onHealthCheck || (() => {});

    // State
    this.healthCheckLog = [];
    this.iterationHistory = [];
    this.currentStatus = 'healthy';

    this.ensureStorageDir();
  }

  /**
   * Ensure storage directory exists
   */
  ensureStorageDir() {
    if (!existsSync(this.storagePath)) {
      mkdirSync(this.storagePath, { recursive: true });
    }
  }

  /**
   * Run health check on iteration result
   * @param {Object} iterationResult - Result from orchestrator
   * @returns {HealthCheck}
   */
  async check(iterationResult) {
    const iterationNumber = iterationResult.number || this.iterationHistory.length + 1;

    // Add to history
    this.iterationHistory.push(iterationResult);

    // Run behavior detection
    const detections = this.detector.detect(this.iterationHistory);

    // Process interventions
    const interventions = [];
    for (const detection of detections) {
      const intervention = this.interventionSystem.intervene(detection);
      interventions.push(intervention);

      // Auto-escalate if enabled and intervention is critical
      if (this.autoEscalate && this.shouldEscalate(intervention)) {
        await this.escalate(intervention, iterationResult);
      }
    }

    // Determine overall health status
    const status = this.determineStatus(detections, interventions);

    // Create health check record
    const healthCheck = {
      iterationNumber,
      timestamp: new Date().toISOString(),
      detections,
      interventions,
      status,
      metrics: this.computeMetrics(),
    };

    // Log health check
    this.healthCheckLog.push(healthCheck);
    this.currentStatus = status;

    // Persist log
    this.saveLog();

    // Callback
    this.onHealthCheck(healthCheck);

    return healthCheck;
  }

  /**
   * Determine if intervention should trigger escalation
   * @param {Object} intervention
   * @returns {boolean}
   */
  shouldEscalate(intervention) {
    const { level, detection } = intervention;

    // Always escalate PAUSE and ABORT
    if (level === 'pause' || level === 'abort') {
      return true;
    }

    // Escalate REDIRECT if stuck or oscillating for too long
    if (level === 'redirect') {
      const { type, severity } = detection;
      if ((type === 'stuck' || type === 'oscillation') && severity === 'critical') {
        return true;
      }
    }

    return false;
  }

  /**
   * Escalate to human
   * @param {Object} intervention
   * @param {Object} iterationResult
   */
  async escalate(intervention, iterationResult) {
    const level = this.mapInterventionToEscalationLevel(intervention);

    const context = {
      loopId: this.loopId,
      taskDescription: this.taskDescription,
      iterationNumber: iterationResult.number || this.iterationHistory.length,
      level,
      reason: intervention.reason,
      detection: intervention.detection,
      intervention,
    };

    await this.escalationHandler.escalate(level, context);
  }

  /**
   * Map intervention level to escalation level
   * @param {Object} intervention
   * @returns {string}
   */
  mapInterventionToEscalationLevel(intervention) {
    const { level, detection } = intervention;

    if (level === 'abort') {
      return ESCALATION_LEVELS.EMERGENCY;
    }

    if (level === 'pause') {
      return ESCALATION_LEVELS.CRITICAL;
    }

    if (level === 'redirect') {
      return detection.severity === 'critical'
        ? ESCALATION_LEVELS.CRITICAL
        : ESCALATION_LEVELS.WARNING;
    }

    return ESCALATION_LEVELS.INFO;
  }

  /**
   * Handle pause intervention
   * @param {Object} intervention
   */
  handlePause(intervention) {
    this.currentStatus = 'paused';
    console.log(`\n${'='.repeat(80)}`);
    console.log('OVERSEER: LOOP PAUSED');
    console.log(`Reason: ${intervention.reason}`);
    console.log(`${'='.repeat(80)}\n`);
  }

  /**
   * Handle abort intervention
   * @param {Object} intervention
   */
  handleAbort(intervention) {
    this.currentStatus = 'aborted';
    console.log(`\n${'='.repeat(80)}`);
    console.log('OVERSEER: LOOP ABORTED');
    console.log(`Reason: ${intervention.reason}`);
    console.log(`${'='.repeat(80)}\n`);
  }

  /**
   * Determine overall health status
   * @param {Array} detections
   * @param {Array} interventions
   * @returns {string}
   */
  determineStatus(detections, interventions) {
    // Check intervention system pause state
    const pauseStatus = this.interventionSystem.getPauseStatus();
    if (pauseStatus.isPaused) {
      return 'paused';
    }

    // Check for abort interventions
    const hasAbort = interventions.some(i => i.level === 'abort');
    if (hasAbort) {
      return 'aborted';
    }

    // Check for critical detections
    const hasCritical = detections.some(d => d.severity === 'critical');
    if (hasCritical) {
      return 'critical';
    }

    // Check for warnings
    const hasWarning = detections.some(d => d.severity === 'high' || d.severity === 'medium');
    if (hasWarning) {
      return 'warning';
    }

    return 'healthy';
  }

  /**
   * Compute health metrics
   * @returns {Object}
   */
  computeMetrics() {
    const totalIterations = this.iterationHistory.length;

    const detectionCounts = {};
    this.healthCheckLog.forEach(check => {
      check.detections.forEach(det => {
        detectionCounts[det.type] = (detectionCounts[det.type] || 0) + 1;
      });
    });

    const interventionCounts = {};
    this.healthCheckLog.forEach(check => {
      check.interventions.forEach(int => {
        interventionCounts[int.level] = (interventionCounts[int.level] || 0) + 1;
      });
    });

    return {
      totalIterations,
      totalHealthChecks: this.healthCheckLog.length,
      detectionCounts,
      interventionCounts,
      currentStatus: this.currentStatus,
    };
  }

  /**
   * Get current health status
   * @returns {Object}
   */
  getHealth() {
    const latestCheck = this.healthCheckLog[this.healthCheckLog.length - 1] || null;

    return {
      loopId: this.loopId,
      taskDescription: this.taskDescription,
      status: this.currentStatus,
      totalIterations: this.iterationHistory.length,
      latestHealthCheck: latestCheck,
      metrics: this.computeMetrics(),
      isPaused: this.interventionSystem.getPauseStatus().isPaused,
    };
  }

  /**
   * Get full overseer log
   * @returns {Array}
   */
  getLog() {
    return [...this.healthCheckLog];
  }

  /**
   * Get intervention log
   * @returns {Array}
   */
  getInterventionLog() {
    return this.interventionSystem.getLog();
  }

  /**
   * Get escalation log
   * @returns {Array}
   */
  getEscalationLog() {
    return this.escalationHandler.getLog();
  }

  /**
   * Save overseer log to disk
   */
  saveLog() {
    const logPath = join(this.storagePath, `${this.loopId}-overseer-log.json`);

    const logData = {
      loopId: this.loopId,
      taskDescription: this.taskDescription,
      healthCheckLog: this.healthCheckLog,
      interventionLog: this.interventionSystem.getLog(),
      escalationLog: this.escalationHandler.getLog(),
      metrics: this.computeMetrics(),
      lastUpdated: new Date().toISOString(),
    };

    writeFileSync(logPath, JSON.stringify(logData, null, 2));
  }

  /**
   * Generate markdown report
   * @returns {string}
   */
  generateReport() {
    const health = this.getHealth();
    const metrics = health.metrics;

    let report = `# Overseer Report: ${this.loopId}\n\n`;
    report += `**Task:** ${this.taskDescription}\n`;
    report += `**Status:** ${health.status}\n`;
    report += `**Iterations:** ${health.totalIterations}\n`;
    report += `**Last Updated:** ${new Date().toISOString()}\n\n`;

    report += `## Health Summary\n\n`;
    report += `| Metric | Value |\n`;
    report += `|--------|-------|\n`;
    report += `| Total Iterations | ${metrics.totalIterations} |\n`;
    report += `| Health Checks | ${metrics.totalHealthChecks} |\n`;
    report += `| Current Status | ${metrics.currentStatus} |\n`;
    report += `| Is Paused | ${health.isPaused ? 'Yes' : 'No'} |\n\n`;

    // Detections
    if (Object.keys(metrics.detectionCounts).length > 0) {
      report += `## Detections\n\n`;
      report += `| Type | Count |\n`;
      report += `|------|-------|\n`;
      for (const [type, count] of Object.entries(metrics.detectionCounts)) {
        report += `| ${type} | ${count} |\n`;
      }
      report += '\n';
    }

    // Interventions
    if (Object.keys(metrics.interventionCounts).length > 0) {
      report += `## Interventions\n\n`;
      report += `| Level | Count |\n`;
      report += `|-------|-------|\n`;
      for (const [level, count] of Object.entries(metrics.interventionCounts)) {
        report += `| ${level} | ${count} |\n`;
      }
      report += '\n';
    }

    // Recent detections
    const recentChecks = this.healthCheckLog.slice(-5);
    if (recentChecks.length > 0) {
      report += `## Recent Health Checks\n\n`;
      recentChecks.forEach(check => {
        report += `### Iteration ${check.iterationNumber} (${check.timestamp})\n\n`;
        report += `**Status:** ${check.status}\n\n`;

        if (check.detections.length > 0) {
          report += `**Detections:**\n`;
          check.detections.forEach(det => {
            report += `- [${det.severity}] ${det.type}: ${det.message}\n`;
          });
          report += '\n';
        }

        if (check.interventions.length > 0) {
          report += `**Interventions:**\n`;
          check.interventions.forEach(int => {
            report += `- [${int.level}] ${int.reason}\n`;
          });
          report += '\n';
        }
      });
    }

    report += `---\n`;
    report += `*Generated by Ralph External Loop Overseer*\n`;

    return report;
  }

  /**
   * Load overseer log from disk
   * @param {string} loopId
   * @param {string} [storagePath]
   * @returns {Overseer}
   */
  static load(loopId, storagePath = DEFAULT_STORAGE_PATH) {
    const logPath = join(storagePath, `${loopId}-overseer-log.json`);

    if (!existsSync(logPath)) {
      throw new Error(`Overseer log not found: ${logPath}`);
    }

    const logData = JSON.parse(readFileSync(logPath, 'utf8'));

    const overseer = new Overseer(
      logData.loopId,
      logData.taskDescription,
      { storagePath }
    );

    // Restore logs
    overseer.healthCheckLog = logData.healthCheckLog || [];

    if (logData.interventionLog) {
      overseer.interventionSystem.importState({ interventionLog: logData.interventionLog });
    }

    if (logData.escalationLog) {
      overseer.escalationHandler.importState({ escalationLog: logData.escalationLog });
    }

    // Restore status
    const lastCheck = overseer.healthCheckLog[overseer.healthCheckLog.length - 1];
    if (lastCheck) {
      overseer.currentStatus = lastCheck.status;
    }

    return overseer;
  }

  /**
   * Export full state for persistence
   * @returns {Object}
   */
  exportState() {
    return {
      loopId: this.loopId,
      taskDescription: this.taskDescription,
      healthCheckLog: this.healthCheckLog,
      iterationHistory: this.iterationHistory,
      currentStatus: this.currentStatus,
      interventionState: this.interventionSystem.exportState(),
      escalationState: this.escalationHandler.exportState(),
    };
  }

  /**
   * Import state from persistence
   * @param {Object} state
   */
  importState(state) {
    if (state.loopId) this.loopId = state.loopId;
    if (state.taskDescription) this.taskDescription = state.taskDescription;
    if (state.healthCheckLog) this.healthCheckLog = state.healthCheckLog;
    if (state.iterationHistory) this.iterationHistory = state.iterationHistory;
    if (state.currentStatus) this.currentStatus = state.currentStatus;

    if (state.interventionState) {
      this.interventionSystem.importState(state.interventionState);
    }

    if (state.escalationState) {
      this.escalationHandler.importState(state.escalationState);
    }
  }
}

export default Overseer;
