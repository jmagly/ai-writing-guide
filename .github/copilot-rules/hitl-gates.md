# Human-in-the-Loop Gate Rules

**Enforcement Level**: HIGH
**Scope**: All SDLC phase transitions and critical checkpoints
**Research Basis**: REF-057 Agent Laboratory
**Issue**: #96

## Overview

These rules enforce configurable human gates at phase transitions, implementing the draft-then-edit workflow pattern that achieves 84% cost reduction vs fully autonomous operation.

## Research Foundation

| Finding | Impact |
|---------|--------|
| 84% cost reduction with HITL | Strategic human involvement dramatically reduces costs |
| 0.83 vs 4.2 revision cycles | Early human input prevents cascading errors |
| Draft-then-edit pattern | Let AI draft, human refine |

## Gate Types

| Type | Behavior | Use Case |
|------|----------|----------|
| `approval` | Blocks until human approves | Phase transitions, major decisions |
| `review` | Human reviews, auto-proceeds on timeout | Artifact quality checks |
| `escalation` | Triggered by conditions | Budget overruns, confidence drops |
| `checkpoint` | Informational, always proceeds | Progress updates |

## Mandatory Rules

### Rule 1: Phase Transitions Require Gates

**REQUIRED**: Every SDLC phase transition MUST have an approval gate:

```yaml
# Concept → Inception
gate: GATE-C2I
type: approval
mode: ALWAYS

# Inception → Elaboration
gate: GATE-I2E
type: approval
mode: ALWAYS

# Elaboration → Construction
gate: GATE-E2C
type: approval
mode: ALWAYS

# Construction → Transition
gate: GATE-C2T
type: approval
mode: ALWAYS
```

### Rule 2: Gate Modes

Use appropriate modes for different scenarios:

| Mode | When to Use |
|------|-------------|
| `ALWAYS` | Critical decisions, security-sensitive, compliance-required |
| `CONDITIONAL` | Can auto-approve under specific conditions |
| `NEVER` | Only for fully automated pipelines with human oversight elsewhere |
| `TERMINATE` | Must stop and wait indefinitely |

### Rule 3: Timeout Actions

Configure appropriate timeout behavior:

```yaml
# For approval gates - block until human responds
timeout_action: block

# For review gates - proceed after timeout
timeout_action: proceed

# For budget gates - abort on timeout
timeout_action: abort
```

### Rule 4: Cost Tracking is REQUIRED

All gates MUST track cost metrics:

```yaml
cost_tracking:
  track_enabled: true
  metrics:
    - time_to_decision
    - revision_count
    - token_cost_saved
```

### Rule 5: Audit Trail

All gate decisions MUST be logged:

```yaml
audit:
  log_decision: true
  log_rationale: true
  retention_days: 90
```

### Rule 6: Auto-Approve Conditions Must Be Explicit

When using CONDITIONAL mode, conditions must be explicit and justified:

**FORBIDDEN**:
```yaml
behavior:
  mode: CONDITIONAL
  # No conditions specified
```

**REQUIRED**:
```yaml
behavior:
  mode: CONDITIONAL
  auto_approve_conditions:
    - condition: "confidence > 0.95 AND no_critical_issues"
      reason: "High confidence with no blockers"
    - condition: "artifact_type == 'documentation' AND spell_check_passed"
      reason: "Low-risk documentation changes"
```

### Rule 7: Presentation Must Aid Decision

Gates must present sufficient context for human decision:

```yaml
presentation:
  summary_template: |
    ## Gate: {{gate_name}}

    **Artifacts Ready**: {{artifact_count}}
    **Quality Score**: {{quality_score}}
    **Open Issues**: {{issue_count}}

    {{action_required}}

  artifacts_to_show:
    - relevant/artifact/path.md

  questions:
    - id: "approved"
      question: "Do you approve proceeding to {{next_phase}}?"
      options: ["Yes", "No - needs revision", "Escalate"]
      required: true
```

## Gate Configuration Schema

All gates MUST conform to:
```
@agentic/code/frameworks/sdlc-complete/schemas/flows/hitl-gate.yaml
```

## SDLC Phase Gates

### Concept → Inception (GATE-C2I)
- **Type**: approval
- **Timeout**: 48 hours → block
- **Artifacts**: Intake form, solution profile
- **Questions**: Scope approved?

### Inception → Elaboration (GATE-I2E)
- **Type**: approval
- **Timeout**: 48 hours → block
- **Artifacts**: User stories, use cases, risk register
- **Questions**: Requirements complete?

### Elaboration → Construction (GATE-E2C)
- **Type**: approval
- **Timeout**: 48 hours → block
- **Artifacts**: SAD, ADRs, test strategy
- **Questions**: Architecture approved?

### Construction → Transition (GATE-C2T)
- **Type**: approval
- **Timeout**: 24 hours → block
- **Artifacts**: Test results, deployment plan, security assessment
- **Questions**: Ready for production?

## Integration Patterns

### With Flow Commands

```yaml
# In flow command definition
flow_phases:
  - name: elaboration
    exit_gate: GATE-E2C
    gate_config:
      mode: ALWAYS
      notification:
        channels: [cli, issue_comment]
```

### With Ralph Loop

```yaml
# Ralph iteration checkpoint
ralph_config:
  iteration_gate:
    trigger:
      type: iteration_count
      threshold: 10
    behavior:
      mode: CONDITIONAL
      auto_approve_conditions:
        - condition: "progress_rate > 0.1"
          reason: "Making progress"
```

### With Cost Budgets

```yaml
# Budget checkpoint gate
budget_gate:
  trigger:
    type: cost_threshold
    threshold: 1000  # tokens
  behavior:
    mode: ALWAYS
    timeout_action: abort
```

## Cost Savings Model

Based on Agent Laboratory research:

| Metric | Fully Autonomous | With HITL | Savings |
|--------|------------------|-----------|---------|
| Cost multiplier | 6.0x | 1.0x | 84% |
| Error rate | 35% | 5% | 86% |
| Revision cycles | 4.2 | 0.83 | 80% |

## Notification Configuration

Configure how humans are notified:

```yaml
notification:
  channels:
    - cli           # Show in terminal
    - issue_comment # Post to issue
    - slack         # Send Slack message (if configured)
  urgency: high
  message_template: |
    **Gate Activated**: {{gate_name}}
    **Action Required**: {{action_type}}
    **Timeout**: {{timeout_remaining}}
```

## Checklist

Before configuring a gate:

- [ ] Gate type matches use case
- [ ] Mode is appropriate for risk level
- [ ] Timeout and timeout_action are configured
- [ ] Cost tracking is enabled
- [ ] Audit logging is enabled
- [ ] Presentation aids human decision
- [ ] Auto-approve conditions are justified (if CONDITIONAL)

## References

- @agentic/code/frameworks/sdlc-complete/schemas/flows/hitl-gate.yaml - Schema definition
- @.aiwg/research/findings/REF-057-agent-laboratory.md - Research paper
- @agentic/code/frameworks/sdlc-complete/flows/ - Flow implementations
- #96 - Implementation issue

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-01-25
