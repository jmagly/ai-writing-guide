# HITL Gate Integration for Agent Persistence Framework

This document explains how Human-in-the-Loop (HITL) gates integrate with the Agent Persistence framework to enable human oversight of agent recovery processes.

## Overview

The Agent Persistence framework uses three specialized HITL gates to manage human intervention points:

| Gate ID | Purpose | Trigger |
|---------|---------|---------|
| `GATE-AP-RECOVERY` | Recovery escalation after max attempts | Recovery attempts >= 3 |
| `GATE-AP-FALSE-POSITIVE` | Override incorrect detections | User reports false positive |
| `GATE-AP-DESTRUCTIVE` | Approve/reject destructive actions | Pre-action approval |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Agent Task Execution                                        │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────────────────┐
│ Laziness Detection Agent                                    │
│ • Monitors file writes                                      │
│ • Detects avoidance patterns                                │
│ • Signals Recovery Orchestrator                             │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ↓ (avoidance detected)
┌─────────────────────────────────────────────────────────────┐
│ Recovery Orchestrator                                       │
│ • PAUSE → DIAGNOSE → ADAPT → RETRY → ESCALATE              │
│ • Max 3 recovery attempts                                   │
│ • Coordinates with agents                                   │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ↓ (max attempts or CRITICAL)
┌─────────────────────────────────────────────────────────────┐
│ HITL Gate: GATE-AP-RECOVERY                                 │
│ • Display full recovery context                             │
│ • Present options to human                                  │
│ • Block until decision made                                 │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ├─ Approve ─→ Resume with guidance
                  ├─ Reject ──→ Halt, assign to human
                  ├─ Retry ───→ Reset counter, retry
                  └─ Abort ───→ Terminate task
```

## Gate Definitions

### GATE-AP-RECOVERY: Recovery Escalation

**Location**: `@agentic/code/addons/agent-persistence/gates/recovery-escalation-gate.yaml`

**Purpose**: Request human intervention after agent exhausts 3 recovery attempts.

**Trigger Conditions**:
- `recovery_attempts >= 3` (max attempts reached)
- `confidence < 0.5` (diagnosis uncertain)
- `severity === "CRITICAL"` (critical security violation)
- `infinite_loop_detected === true` (agent repeating same fix)
- `non_deterministic_failure === true` (flaky test detected)

**Human Options**:
1. **Approve** - Override and let agent continue with human guidance
2. **Reject** - Require manual fix from human developer
3. **Retry** - Reset recovery counter for 3 more attempts
4. **View** - Show detailed recovery attempt logs
5. **Delegate** - Assign to different specialized agent
6. **Abort** - Stop task entirely and clean up

**Display Format**:
```
╭─────────────────────────────────────────────────────────────╮
│ HUMAN INTERVENTION REQUIRED                                 │
│ Recovery Escalation Gate: GATE-AP-RECOVERY                  │
├─────────────────────────────────────────────────────────────┤
│ Context:                                                    │
│   • Task: Implement JWT authentication                      │
│   • Pattern: hardcoded_test_bypass (CRITICAL)               │
│   • Recovery Attempts: 3 / 3                                │
│   • Agent: Software Implementer                             │
│                                                              │
│ Detection Details:                                          │
│   • File(s): src/auth/login.ts                              │
│   • Original Error: jwt.verify() throws 'invalid signature' │
│   • Detection Time: 2026-02-03T10:30:00Z                    │
│                                                              │
│ Recovery History:                                           │
│   Iteration 1: Removed bypass, added NODE_ENV check         │
│   Iteration 2: Removed NODE_ENV, added JWT_SECRET check     │
│   Iteration 3: Fixed token format, hit algorithm error      │
│                                                              │
│ Current State:                                              │
│   • Tests: Failing - "invalid algorithm"                    │
│   • Coverage: 85% (maintained)                              │
│   • Confidence: 0.50 (low)                                  │
├─────────────────────────────────────────────────────────────┤
│ Options:                                                    │
│   [a] Approve - Override and allow agent to continue        │
│   [r] Reject - Require manual fix from human                │
│   [t] Retry - Reset counter, give agent another chance      │
│   [v] View - Show detailed recovery attempt logs            │
│   [d] Delegate - Assign to different agent                  │
│   [q] Abort - Stop task entirely                            │
╰─────────────────────────────────────────────────────────────╯

View recovery details at: .aiwg/persistence/recoveries/RS-003-recovery.yaml
```

---

### GATE-AP-FALSE-POSITIVE: False Positive Override

**Location**: `@agentic/code/addons/agent-persistence/gates/false-positive-override-gate.yaml`

**Purpose**: Allow users to override incorrect laziness detections.

**Trigger Conditions**:
- `false_positive_reported === true` (user claims false positive)
- `detection_confidence < 0.7` (low confidence may indicate error)

**Human Options**:
1. **Legitimate** - Allow change, mark as false positive
2. **Violation** - Confirm detection, block change
3. **Needs Review** - Request more context from user
4. **Diff** - Show detailed diff of changes
5. **History** - Show pattern history for this file
6. **Whitelist** - Allow pattern for this file/context

**Whitelist Management**:
- File-specific: `.aiwg/patterns/whitelists/{file}.yaml`
- Global: `.aiwg/patterns/whitelist-global.yaml`
- Expire after 90 days (re-review)
- Require justification for all whitelisting

**Pattern Learning**:
When false positives are confirmed:
1. Update pattern catalog to improve detection
2. Store example in `.aiwg/patterns/examples/legitimate/`
3. Adjust detection confidence scores
4. Notify framework maintainer if >10% false positive rate

---

### GATE-AP-DESTRUCTIVE: Destructive Action Approval

**Location**: `@agentic/code/addons/agent-persistence/gates/destructive-action-gate.yaml`

**Purpose**: Require explicit approval before destructive actions like test deletion or feature removal.

**Trigger Conditions**:
- `tests_removed > 0`
- `coverage_delta < -2.0` (>2% coverage regression)
- `features_removed > 0`
- `assertions_weakened > 2`
- `skip_patterns_added > 0`

**Auto-Approve Conditions**:
```yaml
# Legitimate test refactoring
action_type === "test_deletion" AND
  replacement_tests >= deleted_tests AND
  coverage_maintained === true

# Intentional scope reduction
action_type === "feature_removal" AND
  documented_in_requirements === true AND
  approved_by_pm === true
```

**Human Options**:
1. **Approve** - This action is intentional and justified
2. **Reject** - Agent must find non-destructive alternative
3. **View** - Show detailed changes
4. **Diff** - Compare before/after
5. **Suggest** - Propose alternative solution
6. **Abort** - Stop task entirely

**Alternative Suggestions**:

When rejecting, provide alternatives:

| Destructive Action | Alternative |
|-------------------|-------------|
| Test deletion | Fix failing tests instead of deleting |
| Test skip | Mock dependencies, fix timing issues |
| Feature removal | Use feature flag, mark deprecated first |
| Assertion weakening | Fix implementation to meet assertion |
| Coverage regression | Add tests to maintain coverage |

## Integration with Recovery Orchestrator

The Recovery Orchestrator agent coordinates with HITL gates through the gate integration module:

### Module Location

```
@agentic/code/addons/agent-persistence/gates/index.mjs
```

### Key Functions

```javascript
import { GATES, shouldTriggerGate, formatGateDisplay, logGateDecision } from '@agentic/code/addons/agent-persistence/gates/index.mjs';

// Check if gate should trigger
const shouldEscalate = shouldTriggerGate(GATES.RECOVERY_ESCALATION, {
  recovery_attempts: 3,
  confidence: 0.45,
  severity: 'HIGH'
});
// Returns: true (max attempts reached AND low confidence)

// Format gate display for human
const display = formatGateDisplay(GATES.RECOVERY_ESCALATION, {
  task_description: 'Implement JWT authentication',
  pattern_type: 'hardcoded_test_bypass',
  severity: 'CRITICAL',
  recovery_attempts: 3,
  // ... full context
});
// Returns: Formatted display string with box drawing

// Log human decision
const auditRecord = logGateDecision(GATES.RECOVERY_ESCALATION, 'reject', {
  user: 'developer@example.com',
  reason: 'JWT configuration requires expert debugging',
  timestamp: new Date().toISOString()
});
// Returns: Audit record for .aiwg/gates/decisions.log
```

### Trigger Evaluation Logic

**Recovery Escalation**:
```javascript
function evaluateRecoveryEscalation(context) {
  const {
    recovery_attempts = 0,
    confidence = 1.0,
    severity = 'LOW',
    infinite_loop_detected = false,
    non_deterministic_failure = false
  } = context;

  // Max attempts
  if (recovery_attempts >= 3) return true;

  // Low confidence
  if (confidence < 0.5) return true;

  // Critical severity
  if (severity === 'CRITICAL') return true;

  // Infinite loop
  if (infinite_loop_detected) return true;

  // Non-deterministic failure
  if (non_deterministic_failure) return true;

  return false;
}
```

**Destructive Action**:
```javascript
function evaluateDestructiveAction(context) {
  const {
    action_type,
    tests_removed = 0,
    coverage_delta = 0,
    replacement_tests = 0,
    coverage_maintained = false
  } = context;

  // Check auto-approve first
  if (action_type === 'test_deletion') {
    if (replacement_tests >= tests_removed && coverage_maintained) {
      return false; // Legitimate refactoring
    }
  }

  // Tests removed without replacement
  if (tests_removed > 0) return true;

  // Coverage regression
  if (coverage_delta < -2.0) return true;

  return false;
}
```

## Audit Trail

All gate decisions are logged for compliance and learning:

### Audit Record Format

```yaml
gate_decision:
  gate_id: "GATE-AP-RECOVERY"
  gate_name: "Recovery Escalation Gate"
  decision: "reject"  # approve | reject | retry | abort | etc
  timestamp: "2026-02-03T10:45:00Z"
  user: "developer@example.com"
  context:
    task_description: "Implement JWT authentication"
    pattern_type: "hardcoded_test_bypass"
    severity: "CRITICAL"
    recovery_attempts: 3
    agent_confidence: 0.45
  human_feedback: "JWT configuration requires expert debugging"
  time_spent_seconds: 180
```

### Audit Log Location

```
.aiwg/gates/decisions.log
```

### Retention

| Gate Type | Retention Period | Rationale |
|-----------|------------------|-----------|
| Recovery Escalation | 90 days | Pattern learning |
| False Positive | 365 days | Detection improvement |
| Destructive Action | 365 days | Security compliance |

## Metrics Tracking

Gates track cost-benefit metrics per REF-057 Agent Laboratory:

### Cost Savings Model

| Metric | Fully Autonomous | With HITL | Savings |
|--------|------------------|-----------|---------|
| Cost multiplier | 6.0x | 1.0x | 84% |
| Error rate | 35% | 5% | 86% |
| Revision cycles | 4.2 | 0.83 | 80% |

### Gate-Specific Metrics

**Recovery Escalation**:
- `escalation_rate`: Percentage of tasks requiring escalation
- `recovery_success_rate`: Percentage resolved without human
- `average_attempts_before_escalation`: Typically 3.0
- `time_to_human_decision`: Average response time

**False Positive**:
- `false_positive_rate`: Should be <10%
- `detection_precision`: Correct detections / total detections
- `whitelist_growth_rate`: Monitor for over-whitelisting

**Destructive Action**:
- `destructive_action_rate`: Percentage of tasks requesting destructive actions
- `approval_rate`: Percentage of requests approved
- `alternative_found_rate`: Percentage where alternative was successful

## Security Requirements

### Gate Bypass Prevention

**CRITICAL**: Gates cannot be bypassed by agents or automation.

**Enforcement**:
1. Gates operate in TERMINATE mode (block execution)
2. Timeout actions are `block` or `escalate`, never `proceed`
3. Auto-approve conditions must be explicit and justified
4. All gate bypasses logged and audited
5. Human signature required for high-risk gates

### Access Control

| Gate | Minimum Role | Signature Required |
|------|-------------|-------------------|
| Recovery Escalation | Developer | No |
| False Positive | Developer | Yes |
| Destructive Action | Tech Lead | Yes (CRITICAL actions) |

## Integration Examples

### Example 1: Recovery Orchestrator Invoking Gate

```javascript
// In Recovery Orchestrator ESCALATE stage
import { GATES, shouldTriggerGate, formatGateDisplay } from '@agentic/code/addons/agent-persistence/gates/index.mjs';

async function escalateToHuman(recoveryContext) {
  // Check if escalation gate should trigger
  const shouldEscalate = shouldTriggerGate(
    GATES.RECOVERY_ESCALATION,
    recoveryContext
  );

  if (!shouldEscalate) {
    console.log('Escalation not needed, continuing recovery');
    return { action: 'continue' };
  }

  // Format gate display
  const display = formatGateDisplay(
    GATES.RECOVERY_ESCALATION,
    recoveryContext
  );

  // Present to human (CLI, issue comment, etc)
  console.log(display);

  // Wait for human decision
  const decision = await waitForHumanInput([
    'approve', 'reject', 'retry', 'view', 'delegate', 'abort'
  ]);

  // Log decision
  logGateDecision(GATES.RECOVERY_ESCALATION, decision, {
    user: getCurrentUser(),
    ...recoveryContext
  });

  // Return action
  return { action: decision };
}
```

### Example 2: Pre-Action Destructive Gate

```javascript
// Before allowing destructive file operation
import { GATES, shouldTriggerGate } from '@agentic/code/addons/agent-persistence/gates/index.mjs';

async function beforeFileWrite(file, changes) {
  const context = analyzeChanges(changes);

  // Check if destructive action gate should trigger
  const requiresApproval = shouldTriggerGate(
    GATES.DESTRUCTIVE_ACTION,
    context
  );

  if (!requiresApproval) {
    // Auto-approved (e.g., legitimate test refactoring)
    return { allowed: true };
  }

  // Display gate and get human decision
  const decision = await showDestructiveActionGate(context);

  if (decision === 'approve') {
    return { allowed: true, logged: true };
  } else if (decision === 'reject') {
    return {
      allowed: false,
      alternatives: suggestAlternatives(context.action_type)
    };
  }
}
```

## References

### Requirements
- @.aiwg/requirements/use-cases/UC-AP-004-enforce-recovery-protocol.md
- @.aiwg/requirements/use-cases/UC-AP-001-detect-test-deletion.md

### Architecture
- @.aiwg/architecture/agent-persistence-sad.md
- @.aiwg/architecture/decisions/ADR-AP-002-rule-enforcement-strategy.md

### Rules
- @.claude/rules/hitl-gates.md - HITL gate configuration rules
- @.claude/rules/hitl-patterns.md - HITL workflow patterns
- @.claude/rules/human-gate-display.md - Gate display format
- @.claude/rules/anti-laziness.md - Anti-laziness enforcement

### Agents
- @.claude/agents/recovery-orchestrator.md - Recovery coordination
- @.claude/agents/laziness-detector.md - Pattern detection

### Gates
- @agentic/code/addons/agent-persistence/gates/recovery-escalation-gate.yaml
- @agentic/code/addons/agent-persistence/gates/false-positive-override-gate.yaml
- @agentic/code/addons/agent-persistence/gates/destructive-action-gate.yaml
- @agentic/code/addons/agent-persistence/gates/index.mjs - Integration module

### Research
- @.aiwg/research/findings/REF-057-agent-laboratory.md - HITL effectiveness (84% cost reduction)
- @.aiwg/research/findings/agentic-laziness-research.md - Laziness pattern research

### Issues
- #262 - HITL Gate Integration
- #96 - HITL Gates Implementation
- #264 - Anti-Laziness Rules

---

**Document Status**: Complete
**Last Updated**: 2026-02-03
**Issue**: #262
