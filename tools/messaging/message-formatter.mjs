/**
 * Converts AiwgEvent objects into platform-agnostic AiwgMessage structures
 * that platform adapters translate to native rendering.
 *
 * @implements @.aiwg/architecture/adrs/ADR-messaging-bot-mode.md
 */

import { Severity, ButtonStyle } from './types.mjs';

/**
 * @typedef {Object} AiwgMessage
 * @property {string} title
 * @property {string} body
 * @property {'info'|'warning'|'critical'} severity
 * @property {Array<{label: string, value: string, inline: boolean}>} fields
 * @property {Array<{id: string, label: string, style: string, command: string}>} [actions]
 * @property {string} [threadId]
 * @property {string} project
 * @property {string} timestamp
 * @property {string} [codeBlock]
 * @property {string} [linkUrl]
 * @property {string} [linkText]
 */

/**
 * Severity colors for Slack/Discord
 */
const SEVERITY_COLORS = {
  [Severity.INFO]: '#36a64f',      // Green
  [Severity.WARNING]: '#daa520',   // Goldenrod
  [Severity.CRITICAL]: '#dc3545',  // Red
};

/**
 * Severity emoji for Telegram
 */
const SEVERITY_EMOJI = {
  [Severity.INFO]: '\u2705',      // Green check
  [Severity.WARNING]: '\u26a0\ufe0f', // Warning
  [Severity.CRITICAL]: '\ud83d\udea8', // Siren
};

/**
 * Format an AiwgEvent into an AiwgMessage.
 *
 * @param {import('./event-bus.mjs').AiwgEvent} event
 * @returns {AiwgMessage}
 */
export function formatEvent(event) {
  const formatter = EVENT_FORMATTERS[event.topic] || formatGenericEvent;
  return formatter(event);
}

/**
 * Get the color for a severity level.
 *
 * @param {'info'|'warning'|'critical'} severity
 * @returns {string}
 */
export function getSeverityColor(severity) {
  return SEVERITY_COLORS[severity] || SEVERITY_COLORS[Severity.INFO];
}

/**
 * Get the emoji for a severity level.
 *
 * @param {'info'|'warning'|'critical'} severity
 * @returns {string}
 */
export function getSeverityEmoji(severity) {
  return SEVERITY_EMOJI[severity] || SEVERITY_EMOJI[Severity.INFO];
}

// ============================================================================
// Event-specific formatters
// ============================================================================

const EVENT_FORMATTERS = {
  'ralph.started': formatRalphStarted,
  'ralph.iteration': formatRalphIteration,
  'ralph.completed': formatRalphCompleted,
  'ralph.failed': formatRalphFailed,
  'ralph.aborted': formatRalphAborted,
  'gate.pending': formatGatePending,
  'gate.approved': formatGateApproved,
  'gate.rejected': formatGateRejected,
  'gate.timeout': formatGateTimeout,
  'security.critical': formatSecurityCritical,
  'health.degraded': formatHealthDegraded,
  'health.recovered': formatHealthRecovered,
  'daemon.started': formatDaemonStarted,
};

function formatRalphStarted(event) {
  const d = event.details;
  return {
    title: `Ralph Loop Started`,
    body: event.summary,
    severity: Severity.INFO,
    fields: [
      { label: 'Objective', value: d.objective || 'N/A', inline: false },
      { label: 'Max Iterations', value: String(d.maxIterations || 'N/A'), inline: true },
      { label: 'Loop ID', value: event.loopId || 'N/A', inline: true },
    ],
    project: event.project,
    timestamp: event.timestamp,
  };
}

function formatRalphIteration(event) {
  const d = event.details;
  const progress = d.progress != null ? `${d.progress}%` : 'N/A';
  return {
    title: `Iteration ${d.iteration}/${d.maxIterations}`,
    body: event.summary,
    severity: d.progress >= 80 ? Severity.INFO : Severity.WARNING,
    fields: [
      { label: 'Progress', value: progress, inline: true },
      { label: 'Status', value: d.status || 'in_progress', inline: true },
    ],
    threadId: event.loopId,
    project: event.project,
    timestamp: event.timestamp,
  };
}

function formatRalphCompleted(event) {
  const d = event.details;
  return {
    title: `Ralph Loop Completed`,
    body: event.summary,
    severity: Severity.INFO,
    fields: [
      { label: 'Iterations', value: String(d.iterations || 'N/A'), inline: true },
      { label: 'Result', value: d.success ? 'Success' : 'Partial', inline: true },
      { label: 'Loop ID', value: event.loopId || 'N/A', inline: true },
    ],
    threadId: event.loopId,
    project: event.project,
    timestamp: event.timestamp,
  };
}

function formatRalphFailed(event) {
  const d = event.details;
  return {
    title: `Ralph Loop Failed`,
    body: event.summary,
    severity: Severity.CRITICAL,
    fields: [
      { label: 'Reason', value: d.reason || 'Unknown', inline: false },
      { label: 'Iterations', value: String(d.iterations || 'N/A'), inline: true },
      { label: 'Loop ID', value: event.loopId || 'N/A', inline: true },
    ],
    codeBlock: d.lastError || undefined,
    threadId: event.loopId,
    project: event.project,
    timestamp: event.timestamp,
  };
}

function formatRalphAborted(event) {
  return {
    title: `Ralph Loop Aborted`,
    body: event.summary,
    severity: Severity.WARNING,
    fields: [
      { label: 'Reason', value: event.details.reason || 'User request', inline: false },
      { label: 'Loop ID', value: event.loopId || 'N/A', inline: true },
    ],
    threadId: event.loopId,
    project: event.project,
    timestamp: event.timestamp,
  };
}

function formatGatePending(event) {
  const d = event.details;
  return {
    title: `HITL Gate: Approval Required`,
    body: event.summary,
    severity: Severity.WARNING,
    fields: [
      { label: 'Gate', value: d.gateName || event.gateId || 'N/A', inline: true },
      { label: 'Quality Score', value: d.qualityScore != null ? `${d.qualityScore}%` : 'N/A', inline: true },
      { label: 'Artifacts', value: String(d.artifactCount || 0), inline: true },
    ],
    actions: [
      {
        id: `approve_${event.gateId}`,
        label: 'Approve',
        style: ButtonStyle.PRIMARY,
        command: `approve ${event.gateId}`,
      },
      {
        id: `reject_${event.gateId}`,
        label: 'Reject',
        style: ButtonStyle.DANGER,
        command: `reject ${event.gateId}`,
      },
    ],
    project: event.project,
    timestamp: event.timestamp,
  };
}

function formatGateApproved(event) {
  return {
    title: `Gate Approved`,
    body: event.summary,
    severity: Severity.INFO,
    fields: [
      { label: 'Gate', value: event.gateId || 'N/A', inline: true },
      { label: 'Approved By', value: event.details.approvedBy || 'N/A', inline: true },
    ],
    project: event.project,
    timestamp: event.timestamp,
  };
}

function formatGateRejected(event) {
  return {
    title: `Gate Rejected`,
    body: event.summary,
    severity: Severity.WARNING,
    fields: [
      { label: 'Gate', value: event.gateId || 'N/A', inline: true },
      { label: 'Rejected By', value: event.details.rejectedBy || 'N/A', inline: true },
      { label: 'Reason', value: event.details.reason || 'N/A', inline: false },
    ],
    project: event.project,
    timestamp: event.timestamp,
  };
}

function formatGateTimeout(event) {
  return {
    title: `Gate Timed Out`,
    body: event.summary,
    severity: Severity.CRITICAL,
    fields: [
      { label: 'Gate', value: event.gateId || 'N/A', inline: true },
      { label: 'Action', value: event.details.timeoutAction || 'block', inline: true },
    ],
    project: event.project,
    timestamp: event.timestamp,
  };
}

function formatSecurityCritical(event) {
  return {
    title: `Security Alert: Critical Finding`,
    body: event.summary,
    severity: Severity.CRITICAL,
    fields: [
      { label: 'Finding', value: event.details.finding || 'N/A', inline: false },
      { label: 'File', value: event.details.file || 'N/A', inline: true },
      { label: 'Severity', value: 'CRITICAL', inline: true },
    ],
    project: event.project,
    timestamp: event.timestamp,
  };
}

function formatHealthDegraded(event) {
  return {
    title: `System Health Degraded`,
    body: event.summary,
    severity: Severity.WARNING,
    fields: [
      { label: 'Component', value: event.details.component || 'N/A', inline: true },
      { label: 'Status', value: event.details.status || 'degraded', inline: true },
    ],
    project: event.project,
    timestamp: event.timestamp,
  };
}

function formatHealthRecovered(event) {
  return {
    title: `System Health Recovered`,
    body: event.summary,
    severity: Severity.INFO,
    fields: [
      { label: 'Component', value: event.details.component || 'N/A', inline: true },
    ],
    project: event.project,
    timestamp: event.timestamp,
  };
}

function formatDaemonStarted(event) {
  const d = event.details;
  return {
    title: `AIWG Daemon Started`,
    body: event.summary,
    severity: Severity.INFO,
    fields: [
      { label: 'PID', value: String(d.pid || process.pid), inline: true },
      { label: 'Adapters', value: (d.adapters || []).join(', ') || 'none', inline: true },
    ],
    project: event.project,
    timestamp: event.timestamp,
  };
}

function formatGenericEvent(event) {
  return {
    title: event.topic,
    body: event.summary,
    severity: event.severity || Severity.INFO,
    fields: Object.entries(event.details || {}).map(([key, value]) => ({
      label: key,
      value: String(value),
      inline: true,
    })),
    project: event.project,
    timestamp: event.timestamp,
  };
}
