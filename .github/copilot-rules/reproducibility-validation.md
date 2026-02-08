# Reproducibility Validation Rules

**Enforcement Level**: HIGH
**Scope**: All critical workflows and compliance-sensitive operations
**Research Basis**: REF-058 R-LAM (47% workflows non-reproducible)
**Issues**: #125

## Overview

These rules define how agents validate workflow reproducibility and detect sources of non-determinism. Research shows 47% of agent workflows produce different outputs on re-run.

## Research Foundation

| Finding | Impact |
|---------|--------|
| 47% non-reproducible | Nearly half of workflows fail reproducibility |
| Temperature sensitivity | LLM temperature > 0 causes variation |
| Retrieval ordering | Non-deterministic retrieval causes drift |
| Timestamp sensitivity | Time-dependent logic breaks replay |

## Mandatory Rules

### Rule 1: Critical Workflows MUST Pass Reproducibility Check

Before releasing artifacts from critical workflows:

```yaml
validation:
  reproducibility_check:
    required_for:
      - test_generation
      - security_audits
      - compliance_checks
      - ci_cd_pipelines
    threshold: 0.95  # 95% match rate minimum
    runs: 5          # Number of verification runs
```

### Rule 2: Non-Determinism Sources MUST Be Documented

When a workflow cannot be fully reproducible, document why:

**Acceptable non-determinism**:
- Creative content generation
- Exploratory analysis
- Interactive sessions

**Unacceptable for critical workflows**:
- Test generation
- Security validation
- Compliance documentation

### Rule 3: Reproducibility Report Required for Compliance

For compliance-sensitive workflows, generate reproducibility report:

```yaml
reproducibility_report:
  workflow: "security-audit"
  runs: 5
  match_rate: 0.98
  non_deterministic_sources: []
  execution_mode: strict
  verdict: PASS
```

## Validation Process

### Pre-Execution Validation

Before running critical workflows:

1. **Check execution mode** - Is strict/seeded mode configured?
2. **Verify seed** - Is random seed set for seeded mode?
3. **Validate configuration** - Are all determinism settings correct?

```yaml
pre_execution_check:
  - mode_is_strict_or_seeded
  - seed_is_configured (if seeded)
  - temperature_is_zero (if strict)
  - timestamp_is_fixed (if strict)
```

### Post-Execution Validation

After workflow completion:

1. **Capture outputs** - Record all generated artifacts
2. **Re-run workflow** - Execute again with same configuration
3. **Compare outputs** - Check for differences
4. **Report variance** - Generate reproducibility report

### Variance Detection

Detect these common sources of variance:

| Source | Detection Method | Mitigation |
|--------|------------------|------------|
| LLM Temperature | Check config | Set temperature=0 |
| Random operations | Trace random calls | Use seeded RNG |
| Timestamp logic | Check date usage | Fix timestamp |
| Retrieval ordering | Compare orders | Sort by stable key |
| External APIs | Check responses | Mock or cache |

## Thresholds

| Workflow Type | Minimum Match Rate | Required Mode |
|---------------|-------------------|---------------|
| Compliance audit | 100% | strict |
| Security scan | 100% | strict |
| Test generation | 95% | strict or seeded |
| Documentation | 90% | seeded |
| Creative content | N/A | any |

## Agent Integration

### Before Critical Workflow

```yaml
# Agent checks reproducibility requirements
agent_protocol:
  before_critical_workflow:
    - verify_execution_mode
    - ensure_determinism_settings
    - create_baseline_checkpoint
```

### During Workflow

```yaml
# Agent maintains reproducibility
agent_protocol:
  during_workflow:
    - log_all_non_deterministic_calls
    - capture_intermediate_states
    - record_external_interactions
```

### After Workflow

```yaml
# Agent validates reproducibility
agent_protocol:
  after_workflow:
    - capture_final_outputs
    - optionally_re_run_for_validation
    - generate_reproducibility_report
    - flag_variance_issues
```

## Recommendations

When variance is detected, recommend fixes:

| Issue | Recommendation |
|-------|----------------|
| Temperature > 0 | Set temperature=0 for deterministic output |
| Unseeded random | Set AIWG_SEED environment variable |
| Timestamp drift | Use fixed timestamp or mock |
| Retrieval variance | Sort results by document ID |
| API response drift | Use response caching |

## Validation Schema

```yaml
# Reproducibility validation result
type: object
required:
  - workflow
  - runs
  - match_rate
  - verdict
properties:
  workflow:
    type: string
  runs:
    type: integer
    minimum: 2
  match_rate:
    type: number
    minimum: 0
    maximum: 1
  threshold:
    type: number
    default: 0.95
  non_deterministic_sources:
    type: array
    items:
      type: string
  recommendations:
    type: array
    items:
      type: object
      properties:
        issue:
          type: string
        fix:
          type: string
  execution_mode:
    type: string
    enum: [strict, seeded, logged, default]
  verdict:
    type: string
    enum: [PASS, FAIL, WARNING]
```

## Checklist

Before releasing critical workflow outputs:

- [ ] Execution mode is strict or seeded
- [ ] Random seed is configured (if seeded)
- [ ] Temperature is 0 (if strict)
- [ ] Reproducibility check passed (if required)
- [ ] Variance sources documented (if any)
- [ ] Report generated (for compliance)

## References

- @.aiwg/research/findings/REF-058-r-lam.md - R-LAM research
- @.claude/rules/reproducibility.md - Base reproducibility rules
- @agentic/code/frameworks/sdlc-complete/schemas/flows/execution-mode.yaml - Mode configuration
- @agentic/code/frameworks/sdlc-complete/schemas/flows/execution-snapshot.yaml - Snapshot format
- #125 - Implementation issue

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-01-25
