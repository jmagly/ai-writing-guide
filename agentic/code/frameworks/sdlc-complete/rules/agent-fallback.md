# Agent Fallback Rules

**Enforcement Level**: HIGH
**Scope**: All agent invocations and routing decisions
**Research Basis**: REF-001 Production Agentic Systems
**Issue**: #141

## Overview

These rules define graceful degradation behavior when specialized agents fail or are unavailable. Ensures system continues operating with reduced capability rather than failing completely.

## Agent Capability Matrix

### Capability Definitions

| Capability | Primary Agent | Fallback 1 | Fallback 2 | Generic Fallback |
|------------|---------------|------------|------------|------------------|
| requirements | Requirements Analyst | System Analyst | Product Strategist | general-purpose |
| architecture | Architecture Designer | Technical Researcher | Domain Expert | general-purpose |
| testing | Test Engineer | Test Architect | Debugger | general-purpose |
| security | Security Auditor | Security Architect | Security Gatekeeper | general-purpose |
| code | Software Implementer | Debugger | Code Reviewer | general-purpose |
| documentation | Technical Writer | Documentation Synthesizer | API Documenter | general-purpose |
| devops | DevOps Engineer | Build Engineer | Cloud Architect | general-purpose |
| review | Code Reviewer | Security Auditor | Test Engineer | general-purpose |

### Capability Matching

```yaml
capability_matrix:
  requirements:
    description: "Gathering, analyzing, and documenting requirements"
    tools_required:
      - Read
      - Write
      - Grep
    primary: Requirements Analyst
    fallbacks:
      - agent: System Analyst
        capability_coverage: 85%
      - agent: Product Strategist
        capability_coverage: 60%
      - agent: general-purpose
        capability_coverage: 40%

  architecture:
    description: "System design and architectural decisions"
    tools_required:
      - Read
      - Write
      - Grep
      - Glob
    primary: Architecture Designer
    fallbacks:
      - agent: Technical Researcher
        capability_coverage: 70%
      - agent: Domain Expert
        capability_coverage: 50%
      - agent: general-purpose
        capability_coverage: 35%

  testing:
    description: "Test creation, execution, and validation"
    tools_required:
      - Read
      - Write
      - Bash
      - Grep
    primary: Test Engineer
    fallbacks:
      - agent: Test Architect
        capability_coverage: 80%
      - agent: Debugger
        capability_coverage: 60%
      - agent: general-purpose
        capability_coverage: 30%

  security:
    description: "Security analysis, auditing, and compliance"
    tools_required:
      - Read
      - Write
      - Grep
      - Bash
    primary: Security Auditor
    fallbacks:
      - agent: Security Architect
        capability_coverage: 85%
      - agent: Security Gatekeeper
        capability_coverage: 70%
      - agent: general-purpose
        capability_coverage: 25%

  code:
    description: "Code implementation and modification"
    tools_required:
      - Read
      - Write
      - Edit
      - Bash
    primary: Software Implementer
    fallbacks:
      - agent: Debugger
        capability_coverage: 75%
      - agent: Code Reviewer
        capability_coverage: 50%
      - agent: general-purpose
        capability_coverage: 40%
```

## Fallback Triggers

### When to Activate Fallback

| Trigger | Description | Action |
|---------|-------------|--------|
| Agent unavailable | Agent type not found in registry | Use next in fallback chain |
| Tool permission denied | Required tool not authorized | Downgrade to fallback with lesser tools |
| Timeout exceeded | Agent took too long | Cancel and retry with fallback |
| Error threshold | >3 consecutive errors | Switch to more general agent |
| Quality below threshold | Output quality <70% | Try alternative specialist |

### Trigger Configuration

```yaml
fallback_triggers:
  unavailable:
    action: immediate_fallback
    log_level: warning

  timeout:
    threshold_ms: 300000  # 5 minutes
    action: cancel_and_fallback
    retry_count: 1
    log_level: warning

  error_threshold:
    max_consecutive_errors: 3
    action: switch_to_fallback
    cooldown_ms: 60000
    log_level: error

  quality_threshold:
    min_quality_score: 70
    action: try_alternative
    max_alternatives: 2
    log_level: warning

  permission_denied:
    action: downgrade_capability
    log_level: info
```

## Fallback Routing Logic

### Decision Flow

```
1. Identify required capability
2. Check if primary agent available
   ├── YES: Use primary agent
   │   └── Monitor for failure triggers
   └── NO: Enter fallback chain
       ├── Check Fallback 1
       │   └── Available? Use with capability warning
       ├── Check Fallback 2
       │   └── Available? Use with degradation notice
       └── Use generic fallback
           └── Log significant capability reduction
```

### Routing Protocol

```yaml
routing_protocol:
  steps:
    - identify_capability_required
    - lookup_primary_agent
    - check_availability:
        checks:
          - agent_registered
          - tools_permitted
          - not_in_cooldown
    - on_unavailable:
        - iterate_fallback_chain
        - select_first_available
        - log_fallback_activation
        - notify_user_of_degradation
    - invoke_selected_agent
    - monitor_execution
    - on_failure:
        - log_failure_reason
        - activate_next_fallback
        - continue_or_abort
```

## Graceful Degradation Modes

### Mode Definitions

| Mode | Description | User Impact |
|------|-------------|-------------|
| Full | All specialized agents available | Optimal performance |
| Reduced | Some specialists unavailable | Slightly lower quality |
| Minimal | Only generic agents available | Basic functionality only |
| Emergency | Critical path only | Essential operations only |

### Mode Transitions

```yaml
degradation_modes:
  full:
    available_capabilities: all
    quality_expectation: 95%
    user_notice: none

  reduced:
    trigger: "1-2 specialists unavailable"
    available_capabilities: "most"
    quality_expectation: 80%
    user_notice: "Some specialized agents unavailable. Using fallbacks."

  minimal:
    trigger: ">50% specialists unavailable"
    available_capabilities: "basic"
    quality_expectation: 60%
    user_notice: "Operating in degraded mode. Quality may be reduced."

  emergency:
    trigger: "Critical agents unavailable"
    available_capabilities: "critical_path_only"
    quality_expectation: 40%
    user_notice: "Emergency mode: Only essential operations available."
    actions:
      - disable_non_critical_workflows
      - alert_operators
      - log_emergency_state
```

## Logging Requirements

### Fallback Events

Every fallback activation MUST log:

```yaml
fallback_log:
  timestamp: datetime
  original_agent: string
  fallback_agent: string
  trigger: string
  capability: string
  capability_coverage: percentage
  degradation_mode: string
  task_context: string
```

### Log Aggregation

Track fallback patterns for system health:

```yaml
fallback_metrics:
  daily:
    - total_fallback_activations
    - fallback_by_trigger_type
    - fallback_by_capability
    - average_capability_coverage
    - emergency_mode_entries

  alerts:
    - frequent_fallbacks: ">10/hour for same agent"
    - cascading_failures: ">3 consecutive fallbacks"
    - emergency_mode: "any entry"
```

## Agent Protocol

### Before Invocation

```yaml
pre_invocation:
  - check_agent_registry
  - verify_tool_permissions
  - check_cooldown_status
  - prepare_fallback_chain
  - set_timeout_timer
```

### During Execution

```yaml
during_execution:
  - monitor_progress
  - track_error_count
  - check_quality_signals
  - watch_for_timeout
```

### On Failure

```yaml
on_failure:
  - capture_failure_context
  - log_failure_event
  - select_fallback_agent
  - notify_user_if_degraded
  - retry_with_fallback
  - update_agent_health_status
```

## User Communication

### Degradation Notices

```markdown
## Standard Notice
> Using [Fallback Agent] instead of [Primary Agent].
> Some specialized capabilities may be reduced.

## Significant Degradation
> ⚠️ Operating in degraded mode. [Primary Agent] unavailable.
> Using [Fallback Agent] with ~[X]% capability coverage.
> Consider: [mitigation suggestion]

## Emergency Mode
> 🚨 Emergency mode activated. Multiple agents unavailable.
> Only essential operations are available.
> Contact system administrator if this persists.
```

## Testing Fallback Scenarios

### Required Tests

| Scenario | Test Method |
|----------|-------------|
| Primary unavailable | Mock registry to exclude agent |
| Timeout | Inject delay in agent response |
| Error cascade | Simulate consecutive failures |
| Permission denied | Restrict tool access |
| Quality failure | Return low-quality output |

### Validation Checklist

- [ ] Fallback chain correctly ordered
- [ ] Capability coverage accurately reported
- [ ] User notifications appropriate
- [ ] Logging captures all events
- [ ] Recovery returns to primary when available

## References

- @.aiwg/research/findings/REF-001-production-agentic.md - Reliability patterns
- @agentic/code/frameworks/sdlc-complete/schemas/flows/agent-capability-matrix.yaml - Capability definitions
- @.claude/rules/failure-mitigation.md - Failure handling
- #141 - Implementation issue

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-01-25
