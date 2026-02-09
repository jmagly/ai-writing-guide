/**
 * Messaging subsystem type definitions and constants.
 *
 * @implements @.aiwg/architecture/adrs/ADR-messaging-bot-mode.md
 */

/**
 * Severity levels for events and messages
 * @enum {string}
 */
export const Severity = Object.freeze({
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical',
});

/**
 * Event topics emitted by AIWG subsystems
 * @enum {string}
 */
export const EventTopic = Object.freeze({
  // Ralph lifecycle
  RALPH_STARTED: 'ralph.started',
  RALPH_ITERATION: 'ralph.iteration',
  RALPH_COMPLETED: 'ralph.completed',
  RALPH_FAILED: 'ralph.failed',
  RALPH_ABORTED: 'ralph.aborted',

  // HITL gates
  GATE_PENDING: 'gate.pending',
  GATE_APPROVED: 'gate.approved',
  GATE_REJECTED: 'gate.rejected',
  GATE_TIMEOUT: 'gate.timeout',

  // Security
  SECURITY_CRITICAL: 'security.critical',
  SECURITY_WARNING: 'security.warning',
  SECURITY_SCAN_DONE: 'security.scan_done',

  // Health
  HEALTH_CHECK: 'health.check',
  HEALTH_DEGRADED: 'health.degraded',
  HEALTH_RECOVERED: 'health.recovered',

  // Build
  BUILD_FAILED: 'build.failed',
  BUILD_PASSED: 'build.passed',

  // Daemon
  DAEMON_STARTED: 'daemon.started',
  DAEMON_STOPPING: 'daemon.stopping',

  // Chat
  CHAT_MESSAGE: 'chat.message',
  CHAT_RESPONSE: 'chat.response',
  CHAT_ERROR: 'chat.error',
});

/**
 * Command permission levels
 * @enum {string}
 */
export const CommandPermission = Object.freeze({
  READ: 'read',
  WRITE: 'write',
});

/**
 * Default command definitions with permission levels
 */
export const COMMANDS = Object.freeze({
  status: { permission: CommandPermission.READ, description: 'Show project status' },
  'ralph-status': { permission: CommandPermission.READ, description: 'Show Ralph loop status' },
  approve: { permission: CommandPermission.WRITE, description: 'Approve a pending HITL gate' },
  reject: { permission: CommandPermission.WRITE, description: 'Reject a pending HITL gate' },
  health: { permission: CommandPermission.READ, description: 'Run health check' },
  help: { permission: CommandPermission.READ, description: 'List available commands' },
  ask: { permission: CommandPermission.READ, description: 'Ask AI a question (e.g., /ask what is our test coverage?)' },
});

/**
 * Button styles for interactive messages
 * @enum {string}
 */
export const ButtonStyle = Object.freeze({
  PRIMARY: 'primary',
  DANGER: 'danger',
  DEFAULT: 'default',
});
