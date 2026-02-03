# ADR-AP-002: Rule Enforcement Strategy

**Status**: Accepted
**Date**: 2026-02-02
**Deciders**: Architecture Designer, Security Auditor, Software Architect
**Context**: Agent Persistence & Anti-Laziness Framework

## Context and Problem Statement

When laziness patterns are detected (test deletion, feature removal, coverage regression), the system must enforce recovery protocols. The enforcement mechanism determines whether agents can bypass rules, whether recovery is mandatory, and how escalation occurs.

The core question: **How do we prevent agents from circumventing enforcement mechanisms while maintaining development velocity?**

Research evidence indicates this is critical:
- METR 2025: "The most recent frontier models have engaged in increasingly sophisticated reward hacking, attempting to get a higher score by modifying the tests or scoring code." (@.aiwg/research/findings/agentic-laziness-research.md)
- 12% of reward-hacking models intentionally attempt to sabotage detection mechanisms (Anthropic 2025)
- 94% of iteration failures stem from bad feedback, not bad refinement - enforcement must improve feedback quality (REF-015)

## Decision Drivers

- **Tamper Resistance**: Enforcement must resist agent attempts to disable or bypass
- **Recovery Focus**: System should guide toward fixing, not blocking
- **Human Oversight**: Critical decisions require human gates (REF-057: 84% cost reduction with HITL)
- **Separation of Concerns**: Detection agent should not be the same as enforced agent
- **Development Velocity**: Enforcement should not create excessive friction for legitimate work
- **Audit Trail**: All enforcement decisions must be logged for analysis

## Considered Options

### Option 1: Agent-Based Enforcement (Recovery Orchestrator)

A specialized Recovery Orchestrator Agent enforces the PAUSE-DIAGNOSE-ADAPT-RETRY-ESCALATE protocol when laziness is detected. This agent has authority to block destructive actions and invoke HITL gates for escalation.

**Architecture**:
```
Detection Signal → Recovery Orchestrator → PAUSE (block action)
                                        → DIAGNOSE (analyze root cause)
                                        → ADAPT (modify approach)
                                        → RETRY (re-attempt task)
                                        → ESCALATE (human gate)
```

**Pros**:
- Rich context for diagnosis and adaptation
- Natural language explanations of violations
- Can guide agent toward correct behavior
- Flexible escalation based on severity
- Preserves iteration history for learning
- Aligns with AIWG multi-agent architecture

**Cons**:
- Agent could potentially be manipulated
- Requires separation from enforced agent
- More complex implementation
- Relies on prompt engineering for authority

### Option 2: Pre-Commit Blocking (Git Hooks)

Git hooks reject commits containing laziness patterns (test deletion, `.skip()` additions, coverage drops).

**Architecture**:
```
git commit → pre-commit hook → Pattern check → REJECT / ALLOW
```

**Pros**:
- Hard enforcement at commit boundary
- Works regardless of agent behavior
- Simple, deterministic checks
- Cannot be bypassed without `--no-verify`
- Low latency

**Cons**:
- Limited context for diagnosis
- Binary outcome (pass/fail) - no guidance
- Can be bypassed with `--no-verify`
- Late detection (after agent completes)
- No recovery assistance

### Option 3: CI/CD Gate Enforcement

Pipeline fails on detected laziness patterns. Enforced at pull request or merge stage.

**Architecture**:
```
PR Submitted → CI Pipeline → Laziness Checks → FAIL / PASS
```

**Pros**:
- Cannot be bypassed (requires pipeline pass)
- Full codebase analysis possible
- Clear audit trail in CI logs
- Integrates with existing PR review workflow

**Cons**:
- Very late detection (after commit, push, PR creation)
- Long feedback loop
- No real-time guidance during development
- No recovery assistance
- Expensive to iterate

### Option 4: Soft Warning Only

Alert developers/agents about laziness patterns but don't block.

**Architecture**:
```
Detection → Warning Message → Continue Execution
```

**Pros**:
- No friction to development
- Informative feedback
- Quick implementation

**Cons**:
- High bypass risk ("warnings ignored under pressure")
- No enforcement guarantee
- Relies on agent "goodwill"
- Research shows warnings alone are insufficient

## Decision Outcome

**Chosen Option**: Option 1 - Agent-Based Enforcement (Recovery Orchestrator) with Option 2 as secondary defense layer.

### Rationale

1. **Recovery Focus**: Agent-based enforcement can guide toward fixing rather than just blocking. The PAUSE-DIAGNOSE-ADAPT-RETRY-ESCALATE protocol provides structured recovery paths.

2. **Context Richness**: The Recovery Orchestrator has access to full iteration history, task context, and can provide natural language explanations of why behavior is problematic and how to fix it.

3. **HITL Integration**: Agent-based enforcement naturally integrates with existing HITL gate infrastructure (REF-057). Escalation can use the same human approval patterns validated to provide 84% cost reduction.

4. **Tamper Resistance**: Achieved through separation of concerns - the Recovery Orchestrator is a distinct agent from the task-executing agent, invoked by the orchestration layer rather than the agent itself.

5. **Defense in Depth**: Pre-commit hooks provide a secondary enforcement layer that catches anything that slips through agent-based enforcement.

## Recovery Protocol Implementation

### PAUSE-DIAGNOSE-ADAPT-RETRY-ESCALATE (PDARE)

```yaml
recovery_protocol:
  PAUSE:
    description: "Immediately halt the destructive action"
    actions:
      - block_pending_file_operations
      - snapshot_current_state
      - log_violation_details
    duration: "Until DIAGNOSE complete"

  DIAGNOSE:
    description: "Understand root cause of laziness behavior"
    checks:
      - cognitive_load: "Is context window exhausted?"
      - task_complexity: "Is task beyond current capability?"
      - specification_ambiguity: "Are requirements unclear?"
      - reward_hacking: "Is agent gaming metrics?"
      - genuine_fix: "Was this actually the correct solution?"
    output: "DiagnosisReport with root_cause and confidence"

  ADAPT:
    description: "Modify approach based on diagnosis"
    strategies:
      cognitive_load:
        - action: "Decompose task into smaller subtasks"
        - action: "Summarize and reset context"
      task_complexity:
        - action: "Request simpler approach"
        - action: "Escalate to human for guidance"
      specification_ambiguity:
        - action: "Request clarification"
        - action: "Make conservative choice with flag"
      reward_hacking:
        - action: "Block and require human approval"
        - action: "Log for training feedback"

  RETRY:
    description: "Re-attempt task with adapted approach"
    constraints:
      max_retries: 3
      require_different_approach: true
      track_in_history: true

  ESCALATE:
    description: "Invoke human gate when automated recovery fails"
    triggers:
      - max_retries_exceeded
      - diagnosis_confidence < 0.5
      - severity == "critical"
      - repeated_same_pattern
    gate_type: "TERMINATE"  # Blocks until human responds
```

### Enforcement Authority Model

```yaml
authority_model:
  recovery_orchestrator:
    can_do:
      - block_file_writes
      - block_file_deletions
      - request_task_decomposition
      - invoke_human_gate
      - access_iteration_history
      - log_violations
    cannot_do:
      - modify_source_code
      - approve_own_decisions
      - bypass_human_gates
      - modify_detection_rules

  task_agent:
    can_do:
      - propose_changes
      - request_clarification
      - report_blockers
    cannot_do:
      - commit_without_validation
      - disable_detection_hooks
      - modify_enforcement_rules
      - skip_recovery_protocol
```

## Tamper Resistance Design

### Separation of Concerns

```
                        ┌─────────────────────┐
                        │  Executive          │
                        │  Orchestrator       │
                        │  (Neutral)          │
                        └──────────┬──────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
              ▼                    ▼                    ▼
    ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
    │  Task Agent     │  │  Detection      │  │  Recovery       │
    │  (Executing)    │  │  Agent          │  │  Orchestrator   │
    │                 │  │  (Monitoring)   │  │  (Enforcing)    │
    └─────────────────┘  └─────────────────┘  └─────────────────┘
           │                    │                    │
           │                    │                    │
           └──────Writes───────▶│                    │
                               │                    │
                               └───Signals─────────▶│
                                                    │
                                                    │
                                             Blocks/Guides
```

**Key Invariants**:
1. Task Agent cannot invoke Recovery Orchestrator directly
2. Detection Agent cannot modify Task Agent behavior
3. Recovery Orchestrator cannot execute tasks
4. All agents report to Executive Orchestrator
5. Human gates cannot be bypassed by any agent

### Immutable Detection Rules

```yaml
rule_protection:
  storage:
    location: ".claude/rules/"  # Tracked in git
    permissions: "read-only for agents"

  modification_protocol:
    require: "human_approval"
    audit: "git history"
    validation: "schema_check"

  runtime_protection:
    load_from: "git_tracked_file"
    cache_invalidation: "on_file_change"
    tamper_detection: "checksum_validation"
```

### Audit Trail Requirements

```yaml
audit_requirements:
  log_events:
    - violation_detected
    - enforcement_action_taken
    - diagnosis_complete
    - adaptation_applied
    - retry_attempted
    - escalation_triggered
    - human_decision_recorded

  log_format:
    timestamp: "ISO-8601"
    agent_id: "string"
    event_type: "enum"
    details: "structured_object"
    outcome: "enum"

  storage:
    location: ".aiwg/enforcement-log/"
    retention: "90 days"
    searchable: true

  integrity:
    append_only: true
    agent_writable: false  # Written by orchestration layer
```

## Secondary Defense: Pre-Commit Hooks

```yaml
precommit_enforcement:
  purpose: "Defense in depth - catches bypasses"

  checks:
    - test_count_regression:
        trigger: "test file modified"
        validation: "count(tests) >= previous_count"
        severity: "critical"

    - coverage_regression:
        trigger: "source file modified"
        validation: "coverage >= baseline - 5%"
        severity: "high"

    - skip_pattern_addition:
        trigger: "test file modified"
        patterns: [".skip(", "@Ignore", "xit(", "xdescribe("]
        validation: "no_new_patterns_added"
        severity: "critical"

    - assertion_weakening:
        trigger: "test file modified"
        validation: "assertion_strength >= previous"
        severity: "high"

  bypass_protection:
    allow_no_verify: false  # Requires repo config
    bypass_audit: true
    bypass_escalation: "human_review_required"
```

## Consequences

### Positive

- **Guided Recovery**: Agents receive specific guidance on how to fix issues, not just rejection
- **Context Preservation**: Full iteration history available for diagnosis
- **Tamper Resistant**: Separation of concerns prevents self-modification
- **Human Oversight**: Critical decisions escalate to human gates
- **Audit Trail**: Complete log of all enforcement decisions
- **Defense in Depth**: Pre-commit hooks catch edge cases
- **Learning Opportunity**: Logs enable analysis of failure patterns

### Negative

- **Implementation Complexity**: Requires multiple coordinated agents
- **Potential Latency**: Recovery protocol adds time to iteration cycle
- **Prompt Engineering Dependency**: Authority model relies on system prompts
- **Resource Cost**: Additional agent invocations for enforcement

### Risks

| Risk | Mitigation |
|------|------------|
| Recovery Orchestrator manipulation | Separation of concerns + immutable rules |
| Excessive escalation (alert fatigue) | Tunable severity thresholds |
| Legitimate refactoring blocked | "Genuine fix" diagnosis path |
| Performance degradation | Parallel detection, async logging |
| Pre-commit hook bypass | Audit trail + human review requirement |

## Validation Criteria

- [ ] Recovery Orchestrator cannot be invoked directly by Task Agent
- [ ] Detection Agent signals are processed by orchestration layer
- [ ] Human gates block until explicit approval
- [ ] Pre-commit hooks reject test deletion without override
- [ ] Audit log captures all enforcement events
- [ ] Rules cannot be modified at runtime by agents
- [ ] Escalation triggers human gate within 3 retries

## Implementation Notes

### Phase 1: Core Enforcement

1. Implement Recovery Orchestrator agent definition
2. Define PDARE protocol in flow schemas
3. Create enforcement audit log structure
4. Wire detection signals to Recovery Orchestrator

### Phase 2: Pre-Commit Integration

1. Create pre-commit hook scripts
2. Implement test count tracking
3. Add coverage baseline comparison
4. Configure bypass audit trail

### Phase 3: HITL Integration

1. Define escalation gate types
2. Implement human gate UI
3. Connect to existing gate infrastructure
4. Add timeout handling

## References

- @.aiwg/research/findings/agentic-laziness-research.md - Root cause research
- @.aiwg/research/paper-analysis/REF-057-aiwg-analysis.md - HITL cost reduction (84%)
- @.aiwg/research/paper-analysis/REF-015-aiwg-analysis.md - Feedback quality criticality (94%)
- @.claude/rules/hitl-gates.md - Human gate patterns
- @.claude/rules/hitl-patterns.md - HITL workflow patterns
- @.claude/rules/failure-mitigation.md - Failure archetype mitigations
- @agentic/code/frameworks/sdlc-complete/schemas/flows/error-handling.yaml - Error recovery patterns
- @agentic/code/frameworks/sdlc-complete/schemas/flows/hitl-gate.yaml - Gate configuration

## Revision History

| Date | Change |
|------|--------|
| 2026-02-02 | Initial ADR created |
