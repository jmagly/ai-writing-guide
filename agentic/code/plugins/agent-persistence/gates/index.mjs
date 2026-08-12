/**
 * @file Agent Persistence HITL Gate Integration
 * @description Exports gate definitions and helper functions for agent persistence framework
 * @implements @.aiwg/requirements/use-cases/UC-AP-004-enforce-recovery-protocol.md
 * @architecture @.aiwg/architecture/agent-persistence-sad.md
 * @gates @agentic/code/addons/agent-persistence/gates/
 * @created 2026-02-03
 * @issue #262
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Gate definitions for agent persistence framework
 */
export const GATES = {
  RECOVERY_ESCALATION: 'GATE-AP-RECOVERY',
  FALSE_POSITIVE_OVERRIDE: 'GATE-AP-FALSE-POSITIVE',
  DESTRUCTIVE_ACTION: 'GATE-AP-DESTRUCTIVE'
};

/**
 * Load gate configuration from YAML file
 * @param {string} gateId - Gate identifier
 * @returns {Promise<object>} Gate configuration
 */
export async function loadGateConfig(gateId) {
  const gateFiles = {
    [GATES.RECOVERY_ESCALATION]: 'recovery-escalation-gate.yaml',
    [GATES.FALSE_POSITIVE_OVERRIDE]: 'false-positive-override-gate.yaml',
    [GATES.DESTRUCTIVE_ACTION]: 'destructive-action-gate.yaml'
  };

  const filename = gateFiles[gateId];
  if (!filename) {
    throw new Error(`Unknown gate ID: ${gateId}`);
  }

  const filepath = join(__dirname, filename);
  const content = await readFile(filepath, 'utf8');
  return yaml.load(content);
}

/**
 * Evaluate gate trigger conditions
 * @param {string} gateId - Gate identifier
 * @param {object} context - Evaluation context
 * @returns {boolean} True if gate should be triggered
 */
export function shouldTriggerGate(gateId, context) {
  switch (gateId) {
    case GATES.RECOVERY_ESCALATION:
      return evaluateRecoveryEscalation(context);

    case GATES.FALSE_POSITIVE_OVERRIDE:
      return evaluateFalsePositiveOverride(context);

    case GATES.DESTRUCTIVE_ACTION:
      return evaluateDestructiveAction(context);

    default:
      return false;
  }
}

/**
 * Evaluate recovery escalation gate trigger
 * @param {object} context
 * @returns {boolean}
 */
function evaluateRecoveryEscalation(context) {
  const {
    recovery_attempts = 0,
    confidence = 1.0,
    severity = 'LOW',
    infinite_loop_detected = false,
    non_deterministic_failure = false
  } = context;

  // Trigger if max attempts reached
  if (recovery_attempts >= 3) {
    return true;
  }

  // Trigger if confidence too low
  if (confidence < 0.5) {
    return true;
  }

  // Trigger if CRITICAL severity
  if (severity === 'CRITICAL') {
    return true;
  }

  // Trigger if infinite loop detected
  if (infinite_loop_detected) {
    return true;
  }

  // Trigger if non-deterministic failure
  if (non_deterministic_failure) {
    return true;
  }

  return false;
}

/**
 * Evaluate false positive override gate trigger
 * @param {object} context
 * @returns {boolean}
 */
function evaluateFalsePositiveOverride(context) {
  const {
    false_positive_reported = false,
    detection_confidence = 1.0
  } = context;

  // Trigger if user reports false positive
  if (false_positive_reported) {
    return true;
  }

  // Trigger if detection confidence is low (may be false positive)
  if (detection_confidence < 0.7) {
    return true;
  }

  return false;
}

/**
 * Evaluate destructive action gate trigger
 * @param {object} context
 * @returns {boolean}
 */
function evaluateDestructiveAction(context) {
  const {
    action_type,
    tests_removed = 0,
    coverage_delta = 0,
    features_removed = 0,
    assertions_weakened = 0,
    skip_patterns_added = 0,
    replacement_tests = 0,
    coverage_maintained = false,
    documented_in_requirements = false,
    approved_by_pm = false
  } = context;

  // Check auto-approve conditions first
  if (action_type === 'test_deletion') {
    if (replacement_tests >= tests_removed && coverage_maintained) {
      return false; // Auto-approve: legitimate test refactoring
    }
  }

  if (action_type === 'feature_removal') {
    if (documented_in_requirements && approved_by_pm) {
      return false; // Auto-approve: intentional scope reduction
    }
  }

  // Trigger if tests removed
  if (tests_removed > 0) {
    return true;
  }

  // Trigger if coverage regression > 2%
  if (coverage_delta < -2.0) {
    return true;
  }

  // Trigger if features removed
  if (features_removed > 0) {
    return true;
  }

  // Trigger if assertions weakened significantly
  if (assertions_weakened > 2) {
    return true;
  }

  // Trigger if skip patterns added
  if (skip_patterns_added > 0) {
    return true;
  }

  return false;
}

/**
 * Format gate display per @.claude/rules/human-gate-display.md
 * @param {string} gateId - Gate identifier
 * @param {object} context - Display context
 * @returns {string} Formatted gate display
 */
export function formatGateDisplay(gateId, context) {
  switch (gateId) {
    case GATES.RECOVERY_ESCALATION:
      return formatRecoveryEscalationDisplay(context);

    case GATES.FALSE_POSITIVE_OVERRIDE:
      return formatFalsePositiveDisplay(context);

    case GATES.DESTRUCTIVE_ACTION:
      return formatDestructiveActionDisplay(context);

    default:
      return 'Unknown gate';
  }
}

/**
 * Format recovery escalation gate display
 * @param {object} context
 * @returns {string}
 */
function formatRecoveryEscalationDisplay(context) {
  const {
    task_description = 'Unknown task',
    pattern_type = 'Unknown pattern',
    severity = 'UNKNOWN',
    recovery_attempts = 0,
    agent_name = 'Unknown agent',
    affected_files = [],
    original_error = 'Unknown error',
    detection_timestamp = new Date().toISOString(),
    recovery_attempts_summary = 'No attempts recorded',
    test_status = 'Unknown',
    coverage_status = 'Unknown',
    agent_confidence = 0.0,
    session_id = 'unknown'
  } = context;

  return `
╭─────────────────────────────────────────────────────────────╮
│ HUMAN INTERVENTION REQUIRED                                 │
│ Recovery Escalation Gate: GATE-AP-RECOVERY                  │
├─────────────────────────────────────────────────────────────┤
│ Context:                                                    │
│   • Task: ${task_description}                              │
│   • Pattern: ${pattern_type} (${severity})                │
│   • Recovery Attempts: ${recovery_attempts} / 3            │
│   • Agent: ${agent_name}                                   │
│                                                              │
│ Detection Details:                                          │
│   • File(s): ${affected_files.join(', ')}                  │
│   • Original Error: ${original_error}                      │
│   • Detection Time: ${detection_timestamp}                 │
│                                                              │
│ Recovery History:                                           │
│   ${recovery_attempts_summary}                             │
│                                                              │
│ Current State:                                              │
│   • Tests: ${test_status}                                  │
│   • Coverage: ${coverage_status}                           │
│   • Confidence: ${(agent_confidence * 100).toFixed(1)}%    │
├─────────────────────────────────────────────────────────────┤
│ Options:                                                    │
│   [a] Approve - Override and allow agent to continue        │
│   [r] Reject - Require manual fix from human                │
│   [t] Retry - Reset counter, give agent another chance      │
│   [v] View - Show detailed recovery attempt logs            │
│   [d] Delegate - Assign to different agent                  │
│   [q] Abort - Stop task entirely                            │
╰─────────────────────────────────────────────────────────────╯

View recovery details at: .aiwg/persistence/recoveries/${session_id}-recovery.yaml
`.trim();
}

/**
 * Format false positive override gate display
 * @param {object} context
 * @returns {string}
 */
function formatFalsePositiveDisplay(context) {
  const {
    pattern_type = 'Unknown pattern',
    severity = 'UNKNOWN',
    file_path = 'Unknown file',
    detection_id = 'unknown',
    change_summary = 'No summary available',
    user_justification = 'No justification provided',
    matching_rule = 'Unknown rule',
    detection_confidence = 0.0,
    detection_context = 'No context',
    test_delta = 0,
    coverage_delta = 0,
    risk_assessment = 'Unknown'
  } = context;

  return `
╭─────────────────────────────────────────────────────────────╮
│ FALSE POSITIVE REVIEW                                       │
│ Gate: GATE-AP-FALSE-POSITIVE                                │
├─────────────────────────────────────────────────────────────┤
│ Detection Details:                                          │
│   • Pattern: ${pattern_type}                               │
│   • Severity: ${severity}                                  │
│   • File: ${file_path}                                     │
│   • Detection ID: ${detection_id}                          │
│                                                              │
│ Change Summary:                                             │
│   ${change_summary}                                        │
│                                                              │
│ User's Justification:                                       │
│   ${user_justification}                                    │
│                                                              │
│ Pattern Matching Details:                                   │
│   • Rule: ${matching_rule}                                 │
│   • Confidence: ${(detection_confidence * 100).toFixed(1)}%│
│   • Context: ${detection_context}                          │
│                                                              │
│ Impact if Allowed:                                          │
│   • Test Count: ${test_delta >= 0 ? '+' : ''}${test_delta}│
│   • Coverage: ${coverage_delta >= 0 ? '+' : ''}${coverage_delta}%│
│   • Risk Level: ${risk_assessment}                         │
├─────────────────────────────────────────────────────────────┤
│ Options:                                                    │
│   [l] Legitimate - Allow change, mark as false positive     │
│   [v] Violation - Confirm detection, block change           │
│   [r] Needs Review - Request more context from user         │
│   [d] Diff - Show detailed diff of changes                  │
│   [h] History - Show pattern history for this file          │
│   [w] Whitelist - Allow pattern for this file/context      │
╰─────────────────────────────────────────────────────────────╯
`.trim();
}

/**
 * Format destructive action gate display
 * @param {object} context
 * @returns {string}
 */
function formatDestructiveActionDisplay(context) {
  const {
    task_description = 'Unknown task',
    agent_name = 'Unknown agent',
    action_type = 'Unknown action',
    severity = 'UNKNOWN',
    action_description = 'No description',
    file_count = 0,
    tests_removed = 0,
    coverage_delta = 0,
    features_list = 'None',
    agent_justification = 'No justification provided',
    risk_level = 'Unknown',
    reversible = 'Unknown',
    prod_impact = 'Unknown',
    affected_files = []
  } = context;

  return `
╭─────────────────────────────────────────────────────────────╮
│ DESTRUCTIVE ACTION APPROVAL REQUIRED                        │
│ Gate: GATE-AP-DESTRUCTIVE                                   │
├─────────────────────────────────────────────────────────────┤
│ Context:                                                    │
│   • Task: ${task_description}                              │
│   • Agent: ${agent_name}                                   │
│   • Action Type: ${action_type}                            │
│   • Severity: ${severity}                                  │
│                                                              │
│ Requested Action:                                           │
│   ${action_description}                                    │
│                                                              │
│ Impact Analysis:                                            │
│   • Files Affected: ${file_count}                          │
│   • Tests Removed: ${tests_removed}                        │
│   • Coverage Impact: ${coverage_delta >= 0 ? '+' : ''}${coverage_delta}%│
│   • Features Affected: ${features_list}                    │
│                                                              │
│ Agent's Justification:                                      │
│   ${agent_justification}                                   │
│                                                              │
│ Risk Assessment:                                            │
│   • Risk Level: ${risk_level}                              │
│   • Reversibility: ${reversible}                           │
│   • Production Impact: ${prod_impact}                      │
├─────────────────────────────────────────────────────────────┤
│ Options:                                                    │
│   [a] Approve - This action is intentional                  │
│   [r] Reject - Find alternative approach                    │
│   [v] View - Show detailed changes                          │
│   [d] Diff - Compare before/after                           │
│   [s] Suggest - Propose alternative solution                │
│   [q] Abort - Stop task entirely                            │
╰─────────────────────────────────────────────────────────────╯

Affected files: ${affected_files.join(', ')}
`.trim();
}

/**
 * Log gate decision to audit trail
 * @param {string} gateId - Gate identifier
 * @param {string} decision - Decision made (approve/reject/etc)
 * @param {object} context - Decision context
 * @returns {object} Audit record
 */
export function logGateDecision(gateId, decision, context) {
  const auditRecord = {
    gate_id: gateId,
    gate_name: getGateName(gateId),
    decision,
    timestamp: new Date().toISOString(),
    user: context.user || 'unknown',
    context: {
      ...context,
      // Remove sensitive data
      user: undefined
    }
  };

  // In production, this would write to .aiwg/gates/decisions.log
  // For now, return the record for logging by caller
  return auditRecord;
}

/**
 * Get human-readable gate name
 * @param {string} gateId
 * @returns {string}
 */
function getGateName(gateId) {
  const names = {
    [GATES.RECOVERY_ESCALATION]: 'Recovery Escalation Gate',
    [GATES.FALSE_POSITIVE_OVERRIDE]: 'False Positive Override Gate',
    [GATES.DESTRUCTIVE_ACTION]: 'Destructive Action Approval Gate'
  };
  return names[gateId] || 'Unknown Gate';
}

/**
 * Export all gates
 */
export default {
  GATES,
  loadGateConfig,
  shouldTriggerGate,
  formatGateDisplay,
  logGateDecision
};
