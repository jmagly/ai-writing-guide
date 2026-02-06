# Criticality-Based Panel Sizing Rules

**Enforcement Level**: MEDIUM
**Scope**: Ensemble review pattern selection
**Research Basis**: REF-017 Self-Consistency
**Issue**: #161

## Overview

These rules define how task criticality determines ensemble review panel sizes, ensuring high-stakes decisions receive proportionally thorough review while routine changes remain efficient.

## Research Foundation

From REF-017 Self-Consistency (Wang et al., 2022):
- Panel size impacts both accuracy and cost
- 5 reviewers provide optimal accuracy/cost balance for most tasks
- Critical decisions benefit from larger panels
- Low-risk changes can use smaller panels efficiently

## Criticality Levels

### Level Definitions

| Level | Panel Size | Threshold | Description |
|-------|-----------|-----------|-------------|
| **CRITICAL** | 7 | 0.85 | Irreversible changes, security, compliance |
| **HIGH** | 5 | 0.80 | Architecture, public APIs, data models |
| **STANDARD** | 5 | 0.60 | Feature implementation, refactoring |
| **LOW** | 3 | 0.67 | Documentation, minor fixes, config |

### Automatic Criticality Detection

The following patterns trigger automatic criticality escalation:

#### CRITICAL Triggers

```yaml
critical_triggers:
  file_patterns:
    - "**/security/**"
    - "**/auth/**"
    - "**/encryption/**"
    - "**/compliance/**"
    - "**/*.pem"
    - "**/*.key"
    - "**/secrets/**"

  content_patterns:
    - "DELETE.*CASCADE"
    - "DROP TABLE"
    - "TRUNCATE"
    - "rm -rf"
    - "force push"
    - "breaking change"

  artifact_types:
    - security_gate
    - compliance_attestation
    - data_deletion_request
```

#### HIGH Triggers

```yaml
high_triggers:
  file_patterns:
    - "**/api/**"
    - "**/schema/**"
    - "**/migration/**"
    - "**/architecture/**"
    - "**/*.proto"
    - "**/contracts/**"

  artifact_types:
    - architecture_decision_record
    - api_contract
    - database_migration
    - public_interface
```

#### LOW Triggers

```yaml
low_triggers:
  file_patterns:
    - "**/docs/**"
    - "**/*.md"
    - "**/README*"
    - "**/.gitignore"
    - "**/comments/**"

  artifact_types:
    - documentation_update
    - comment_addition
    - typo_fix
    - formatting_change
```

## Panel Configuration by Criticality

### CRITICAL Configuration

```yaml
critical_review:
  panel_size: 7
  threshold: 0.85
  timeout_minutes: 60

  reviewer_composition:
    required:
      - security_auditor
      - architecture_designer
      - domain_expert
    optional:
      - test_engineer
      - code_reviewer
      - compliance_officer
      - technical_writer

  confidence_levels:
    high:
      threshold: 0.90
      action: accept
    medium:
      threshold: 0.80
      action: flag_for_human_review
    low:
      threshold: 0.70
      action: require_human_decision
    escalate:
      threshold: 0.70
      action: escalate_to_stakeholders

  escalation:
    on_low_confidence: true
    on_any_dissent: true
    human_required: true
```

### HIGH Configuration

```yaml
high_review:
  panel_size: 5
  threshold: 0.80
  timeout_minutes: 30

  reviewer_composition:
    required:
      - architecture_designer
      - code_reviewer
    optional:
      - test_engineer
      - domain_expert
      - technical_writer

  confidence_levels:
    high:
      threshold: 0.85
      action: accept
    medium:
      threshold: 0.70
      action: accept_with_note
    low:
      threshold: 0.60
      action: flag_for_review
    escalate:
      threshold: 0.60
      action: escalate_to_critical

  escalation:
    on_low_confidence: true
    expand_to_panel: 7
```

### STANDARD Configuration

```yaml
standard_review:
  panel_size: 5
  threshold: 0.60
  timeout_minutes: 15

  reviewer_composition:
    required:
      - code_reviewer
    optional:
      - test_engineer
      - architecture_designer
      - technical_writer
      - domain_expert

  confidence_levels:
    high:
      threshold: 0.80
      action: accept
    medium:
      threshold: 0.60
      action: accept_with_note
    low:
      threshold: 0.50
      action: flag_for_review
    escalate:
      threshold: 0.50
      action: expand_panel
```

### LOW Configuration

```yaml
low_review:
  panel_size: 3
  threshold: 0.67
  timeout_minutes: 5

  reviewer_composition:
    required:
      - code_reviewer
    optional:
      - technical_writer
      - test_engineer

  confidence_levels:
    high:
      threshold: 0.80
      action: accept
    medium:
      threshold: 0.67
      action: accept
    low:
      threshold: 0.50
      action: escalate_to_standard
```

## Criticality Override

### Manual Override

Humans can override automatic criticality:

```markdown
---
review:
  criticality: CRITICAL
  override_reason: "Contains sensitive customer data logic"
---
```

### Override Audit

All criticality overrides MUST be logged:

```yaml
override_log:
  artifact: "path/to/file.ts"
  detected_criticality: STANDARD
  override_criticality: CRITICAL
  reason: "Contains sensitive customer data logic"
  override_by: "human_reviewer"
  timestamp: "2026-01-25T10:00:00Z"
```

## Integration with Ensemble Review

This criticality system integrates with `@agentic/code/frameworks/sdlc-complete/schemas/flows/ensemble-review.yaml`:

1. **Pattern Selection**: Criticality determines which review pattern to use
2. **Panel Sizing**: Panel size scales with criticality
3. **Threshold Adjustment**: Higher criticality = stricter thresholds
4. **Escalation Path**: Low confidence at any level can escalate upward

## Validation

### Pre-Review Validation

Before initiating ensemble review:

- [ ] Criticality level determined (auto or manual)
- [ ] Panel size matches criticality
- [ ] Required reviewers available
- [ ] Timeout configured appropriately

### Post-Review Validation

After completing ensemble review:

- [ ] Agreement meets threshold for criticality
- [ ] Escalation rules applied if needed
- [ ] Override reasons documented if applicable
- [ ] Audit trail complete

## References

- @agentic/code/frameworks/sdlc-complete/schemas/flows/ensemble-review.yaml - Ensemble review patterns
- @.aiwg/research/findings/REF-017-self-consistency.md - Research foundation
- @.aiwg/research/synthesis/topic-05-verification.md - Verification patterns
- #161 - Implementation issue

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-01-25
