# Quality Evidence Gate

## Purpose

Enforces minimum evidence quality standards at SDLC phase transitions. Prevents phases from advancing when artifacts contain unsupported claims, unassessed citations, or GRADE-violating hedging language.

## Overview

This flow integrates GRADE evidence quality checks into the existing gate-criteria-by-phase structure. At each phase transition, the Quality Evidence Gate validates that all research-backed claims in phase deliverables meet minimum quality thresholds.

## Gate Requirements by Phase

### Inception -> Elaboration (LOM Gate)

| Check | Requirement | Enforcement |
|-------|-------------|-------------|
| Source coverage | All cited sources have GRADE assessments | WARN |
| Hedging compliance | No GRADE violations in vision/requirements docs | WARN |
| Evidence gaps | Research TODO items documented for unsupported claims | REQUIRED |
| Corpus health | Overall corpus assessment rate > 50% | INFORM |

### Elaboration -> Construction (ABM Gate)

| Check | Requirement | Enforcement |
|-------|-------------|-------------|
| Source coverage | All cited sources have GRADE assessments | REQUIRED |
| Hedging compliance | Zero BLOCK-level GRADE violations | BLOCK |
| Architecture evidence | ADRs cite MODERATE+ evidence for key decisions | WARN |
| Evidence gaps | No critical research gaps in architecture rationale | REQUIRED |
| Corpus health | Overall corpus assessment rate > 75% | WARN |

### Construction -> Transition (OCM Gate)

| Check | Requirement | Enforcement |
|-------|-------------|-------------|
| Source coverage | 100% of cited sources assessed | REQUIRED |
| Hedging compliance | Zero GRADE violations (BLOCK or WARN level) | BLOCK |
| Documentation quality | All user-facing docs pass citation check | REQUIRED |
| API documentation | No fabricated references in API docs | BLOCK |
| Corpus health | Overall corpus assessment rate > 90% | REQUIRED |

### Transition -> Release (PRM Gate)

| Check | Requirement | Enforcement |
|-------|-------------|-------------|
| Full compliance | All quality checks from previous gates still passing | BLOCK |
| Release notes | No unsupported claims in release documentation | BLOCK |
| External citations | All external references verified (DOI, URL) | REQUIRED |

## Gate Execution Process

When a phase transition gate is triggered:

1. **Identify phase artifacts**
   - Collect all markdown files created/modified during the phase
   - Include: requirements, architecture, test plans, documentation
   - Exclude: working files, ralph state, debug memory

2. **Run citation extraction**
   - Extract all REF-XXX citations from phase artifacts
   - Build citation-to-source mapping
   - Identify unassessed sources

3. **Run GRADE compliance check**
   - For each citation, verify hedging language matches GRADE level
   - Categorize violations by severity (BLOCK, WARN, INFORM)
   - Generate compliance report

4. **Evaluate gate criteria**
   - Check phase-specific requirements (table above)
   - Calculate pass/fail for each check
   - Determine overall gate verdict

5. **Present to human gate**
   - Include quality report in gate display
   - Show violation count and severity breakdown
   - Provide actionable fix suggestions

6. **Gate verdict**
   - **PASS**: All REQUIRED and BLOCK checks pass
   - **CONDITIONAL**: WARN-level issues exist, proceed with documented caveats
   - **FAIL**: Any BLOCK-level check fails, must remediate before proceeding

## Quality Report Format

```markdown
## Evidence Quality Gate Report

**Phase**: Elaboration -> Construction (ABM)
**Date**: 2026-01-25
**Status**: CONDITIONAL

### Summary

| Check | Status | Details |
|-------|--------|---------|
| Source coverage | PASS | 45/45 sources assessed |
| Hedging compliance | PASS | 0 BLOCK violations |
| Architecture evidence | WARN | 2 ADRs cite LOW evidence |
| Evidence gaps | PASS | All gaps documented |
| Corpus health | PASS | 82% assessed |

### GRADE Distribution

| Level | Count | Percentage |
|-------|-------|------------|
| HIGH | 12 | 27% |
| MODERATE | 18 | 40% |
| LOW | 10 | 22% |
| VERY LOW | 5 | 11% |

### Warnings (2)

1. **ADR-003** (line 45): Architecture decision cites REF-038 (GRADE: LOW)
   - Claim: "Studies suggest that event sourcing improves auditability"
   - Recommendation: Strengthen evidence or add caveat about evidence limitations

2. **ADR-007** (line 23): Architecture decision cites REF-041 (GRADE: LOW)
   - Claim: "Research indicates CQRS reduces query complexity"
   - Recommendation: Add additional MODERATE+ sources or hedge more conservatively

### Recommendation

CONDITIONAL PASS - Proceed to Construction with documented caveats on ADR-003 and ADR-007.
```

## Integration with Existing Gates

This flow extends `gate-criteria-by-phase.md` by adding evidence quality checks to each gate's exit criteria. It does not replace existing gate criteria but adds a new dimension of validation.

### Integration Points

```yaml
gate_integration:
  lom_gate:
    additional_criteria:
      - quality_evidence_gate.inception_checks
    position: after_risk_assessment

  abm_gate:
    additional_criteria:
      - quality_evidence_gate.elaboration_checks
    position: after_test_strategy

  ocm_gate:
    additional_criteria:
      - quality_evidence_gate.construction_checks
    position: after_security_compliance

  prm_gate:
    additional_criteria:
      - quality_evidence_gate.transition_checks
    position: after_release_criteria
```

## Agent Involvement

| Agent | Role in Gate |
|-------|-------------|
| Quality Assessor | Run GRADE assessments for unassessed sources |
| Citation Verifier | Verify citation existence and hedging compliance |
| Technical Writer | Fix hedging language violations in documentation |
| Architecture Designer | Address evidence gaps in ADRs |

## Configuration

```yaml
flow:
  name: quality-evidence-gate
  type: gate-extension
  extends: gate-criteria-by-phase
  config:
    min_corpus_assessment_rate:
      inception: 0.50
      elaboration: 0.75
      construction: 0.90
      transition: 1.00
    block_on_grade_violation: true
    allow_conditional_pass: true
    generate_report: true
    report_path: ".aiwg/reports/quality-evidence-gate-{phase}.md"
```

## References

- @agentic/code/frameworks/sdlc-complete/flows/gate-criteria-by-phase.md - Base gate criteria
- @agentic/code/frameworks/sdlc-complete/agents/quality-assessor.md - Quality Assessor
- @agentic/code/frameworks/sdlc-complete/agents/citation-verifier.md - Citation Verifier
- @.aiwg/research/docs/grade-assessment-guide.md - GRADE methodology
- @agentic/code/frameworks/sdlc-complete/schemas/research/quality-dimensions.yaml - Quality schema
- @.claude/rules/citation-policy.md - Citation policy
- @.claude/rules/hitl-gates.md - HITL gate rules
