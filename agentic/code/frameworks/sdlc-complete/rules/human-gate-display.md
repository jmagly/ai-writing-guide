# Human Gate Display Rules

**Enforcement Level**: MEDIUM
**Scope**: All human approval gate interactions
**Research Basis**: REF-057 Agent Laboratory (35% oversight improvement)
**Issue**: #139

## Overview

These rules define the enhanced display format for human approval gates, providing rich context, interactive options, and improved user experience per Agent Laboratory research showing 35% improvement in oversight effectiveness.

## Gate Display Structure

### Required Sections

Every human gate display MUST include:

1. **Header** - Gate identification
2. **Context** - What's being approved
3. **Deliverables** - Artifacts produced
4. **Next Steps** - What happens after approval
5. **Options** - Available actions

### Display Template

```
╭─────────────────────────────────────────────────────────╮
│ Human Approval Gate                                     │
│ Phase: {fromPhase} → {toPhase}                          │
│ Gate: {gateName}                                        │
├─────────────────────────────────────────────────────────┤
│ Context:                                                │
│   • {artifactCount} artifacts created                   │
│   • {validationErrors} validation errors                │
│   • {warningCount} warnings                             │
│                                                          │
│ Deliverables:                                           │
│   {deliverablesList}                                    │
│                                                          │
│ Next Steps (if approved):                               │
│   {nextStepsList}                                       │
├─────────────────────────────────────────────────────────┤
│ Options:                                                │
│   [a] Approve and continue                              │
│   [r] Reject and provide feedback                       │
│   [v] View detailed artifact summary                    │
│   [d] Show diff from previous iteration                 │
│   [e] Edit specific artifact                            │
│   [s] Skip this gate (continue without approval)        │
│   [q] Quit workflow                                     │
╰─────────────────────────────────────────────────────────╯
```

## Required Options

All human gates MUST provide these options:

| Key | Action | Description |
|-----|--------|-------------|
| `a` | Approve | Continue workflow with approval logged |
| `r` | Reject | Provide feedback, return to agent |
| `v` | View | Show detailed artifact summaries |
| `d` | Diff | Show changes from previous iteration |
| `e` | Edit | Open artifact in editor |
| `s` | Skip | Continue without approval (logged as skip) |
| `q` | Quit | Abort workflow entirely |

## Context Information

### Required Context Fields

```yaml
context:
  artifact_count: integer      # Number of artifacts produced
  validation_errors: integer   # Errors found
  warnings: integer            # Warnings found
  iteration: integer          # Current iteration number
  time_elapsed: string        # Time spent in phase
```

### Deliverables Display

Each deliverable MUST show:
- Status indicator (✓ validated, ⚠ warning, ✗ error)
- File path
- Brief description (optional)

```
Deliverables:
  ✓ .aiwg/requirements/use-cases/UC-001-login.md
  ✓ .aiwg/requirements/use-cases/UC-002-register.md
  ⚠ .aiwg/requirements/nfr-modules/security.md (1 warning)
```

## Interaction Patterns

### Approval Flow

```yaml
on_approve:
  - log_decision (action: approve, timestamp, user)
  - update_provenance
  - proceed_to_next_phase
  - display_confirmation
```

### Rejection Flow

```yaml
on_reject:
  - prompt_for_feedback
  - log_decision (action: reject, timestamp, feedback)
  - return_to_previous_agent
  - include_feedback_in_context
  - increment_iteration_counter
```

### Skip Flow

```yaml
on_skip:
  - warn_about_skipping
  - log_decision (action: skip, timestamp, reason)
  - add_skip_to_audit_trail
  - proceed_without_formal_approval
```

## View Mode: Artifact Preview

When user selects View:

```
╭─────────────────────────────────────────────────────────╮
│ Artifact: .aiwg/requirements/use-cases/UC-001-login.md  │
├─────────────────────────────────────────────────────────┤
│ # UC-001: User Login                                    │
│                                                          │
│ ## Primary Actor                                        │
│ End User                                                │
│                                                          │
│ ## Preconditions                                        │
│ - User has registered account                           │
│ - User is not currently authenticated                   │
│                                                          │
│ ## Main Flow                                            │
│ 1. User navigates to login page                         │
│ 2. User enters email and password                       │
│ 3. System validates credentials                         │
│ ...                                                      │
│                                                          │
│ [ENTER] more | [b] back | [n] next artifact             │
╰─────────────────────────────────────────────────────────╯
```

## View Mode: Diff Display

When user selects Diff:

```
╭─────────────────────────────────────────────────────────╮
│ Changes from iteration 2 → 3                            │
├─────────────────────────────────────────────────────────┤
│ Modified: UC-001-login.md                               │
│   + Added security NFR reference (line 42)              │
│   + Added password complexity requirement (line 58)     │
│   ~ Updated preconditions (line 15-18)                  │
│                                                          │
│ Added: UC-003-password-reset.md                         │
│   New use case based on feedback                        │
│                                                          │
│ Deleted: (none)                                         │
│                                                          │
│ Summary: 1 modified, 1 added, 0 deleted                 │
├─────────────────────────────────────────────────────────┤
│ [b] back to gate | [v] view full diff                   │
╰─────────────────────────────────────────────────────────╯
```

## Configuration

Gates can be configured via aiwg.yml:

```yaml
human_gates:
  display:
    verbosity: detailed      # minimal | normal | detailed
    colors: true             # Enable terminal colors
    box_style: round         # single | double | round | bold
    auto_clear: true         # Clear screen before display

  options:
    show_edit: true          # Show edit option
    show_skip: true          # Show skip option
    show_diff: true          # Show diff option

  logging:
    log_all_decisions: true
    log_path: ".aiwg/gates/decisions.log"

  defaults:
    timeout_minutes: 60      # Auto-reject after timeout
    require_comment: false   # Require comment on approve
```

## Logging Requirements

All gate decisions MUST be logged:

```yaml
gate_decision:
  gate_id: string
  gate_name: string
  phase_transition: string
  action: approve | reject | skip | quit
  timestamp: datetime
  user: string
  feedback: string (if reject)
  artifacts_reviewed:
    - path: string
      viewed: boolean
      edited: boolean
  time_spent_seconds: integer
```

## Agent Protocol

### Before Displaying Gate

```yaml
prepare_gate:
  - collect_deliverables
  - run_validations
  - compute_diff (if not first iteration)
  - prepare_next_steps
  - format_display
```

### During Gate Interaction

```yaml
handle_interaction:
  - track_time_spent
  - record_artifacts_viewed
  - record_artifacts_edited
  - handle_user_input
```

### After Gate Decision

```yaml
after_decision:
  - log_decision
  - update_provenance
  - notify_relevant_agents
  - proceed_or_return
```

## Accessibility

Gates SHOULD support:
- Screen reader compatibility
- Keyboard-only navigation
- High contrast mode
- Configurable text size

## References

- @.aiwg/research/findings/REF-057-agent-laboratory.md - Oversight effectiveness
- @.claude/rules/hitl-gates.md - Gate rules
- @agentic/code/frameworks/sdlc-complete/schemas/flows/error-handling.yaml - Error recovery
- #139 - Implementation issue

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-01-25
