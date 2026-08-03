# Skill-Factory Addon Evaluation Plan

## Overview

This document defines the evaluation criteria, test scenarios, and quality gates for the skill-factory addon skills.

## Research Compliance Validation

Each skill must demonstrate compliance with:

- **REF-001**: Production-Grade Agentic Workflows
- **REF-002**: LLM Failure Modes in Agentic Scenarios

### Archetype Mitigation Checklist

| Skill | Archetype 1 | Archetype 2 | Archetype 3 | Archetype 4 |
|-------|-------------|-------------|-------------|-------------|
| skill-builder | ☐ | ☐ | ☐ | ☐ |
| skill-enhancer | ☐ | ☐ | ☐ | ☐ |
| quality-checker | ☐ | ☐ | ☐ | ☐ |
| skill-packager | ☐ | ☐ | ☐ | ☐ |

## Evaluation Scenarios

### 1. skill-builder Evaluation

**Test Case SB-001: Basic Skill Generation**
```
Input: Extracted documentation in output/myskill_data/
Expected: Valid skill structure in output/myskill/
Grounding: Input data validated before build
Recovery: Preserve partial build on failure
```

**Test Case SB-002: Category Auto-Detection**
```
Input: Mixed documentation content
Expected: Categories correctly assigned
Grounding: Category keywords verified
Recovery: Fall back to "general" category
```

**Test Case SB-003: Template Selection**
```
Input: API-heavy documentation
Expected: API Reference template selected
Grounding: Content analysis before template
Recovery: Use standard template if detection fails
```

### 2. skill-enhancer Evaluation

**Test Case SE-001: Basic Enhancement**
```
Input: Basic SKILL.md with minimal content
Expected: Enhanced with examples, FAQ, quick reference
Grounding: Backup created before enhancement
Recovery: Restore from backup on failure
```

**Test Case SE-002: Hallucination Prevention**
```
Input: Sparse reference content
Expected: No invented features
Escalation: User prompted for sparse content
Recovery: Conservative enhancement only
```

**Test Case SE-003: API vs Local Mode**
```
Input: Any skill directory
Expected: Both modes produce similar quality
Grounding: Mode explicitly selected
Recovery: Fallback to local if API fails
```

### 3. quality-checker Evaluation

**Test Case QC-001: Full Quality Validation**
```
Input: Complete skill directory
Expected: Score with breakdown by dimension
Grounding: All validation criteria defined
Recovery: Partial validation on errors
```

**Test Case QC-002: Threshold Enforcement**
```
Input: Skill with score 65
Expected: WARN status, not PASS
Grounding: Thresholds configured
Recovery: Report partial results
```

**Test Case QC-003: Custom Rules**
```
Input: Skill with custom validation rules
Expected: Custom rules evaluated
Grounding: Rules validated before execution
Recovery: Skip invalid rules, continue
```

### 4. skill-packager Evaluation

**Test Case SP-001: Standard Packaging**
```
Input: Valid skill directory
Expected: Uploadable ZIP file
Grounding: Structure validated before packaging
Recovery: Preserve failed package attempts
```

**Test Case SP-002: Security Scan**
```
Input: Skill with potential secrets
Expected: Warning before packaging
Escalation: User confirmation required
Recovery: Don't package sensitive data
```

**Test Case SP-003: Size Validation**
```
Input: Large skill (>50MB)
Expected: Warning, compression suggestions
Grounding: Size calculated before packaging
Recovery: Suggest splitting or exclusions
```

## Quality Gates

### Gate 1: Structure Validation

- [ ] SKILL.md follows template
- [ ] Required sections present
- [ ] Checkpoint support documented
- [ ] Workflow steps defined

### Gate 2: Research Compliance

- [ ] BP-4 Single Responsibility
- [ ] BP-9 KISS principle
- [ ] All 4 archetypes addressed
- [ ] Uncertainty escalation clear

### Gate 3: Functional Testing

- [ ] Happy path works
- [ ] Error handling tested
- [ ] Recovery protocol verified
- [ ] Checkpoint creation confirmed

### Gate 4: Integration Testing

- [ ] Works with skill-architect orchestrator
- [ ] Pipeline handoff successful
- [ ] End-to-end workflow validated
- [ ] Rollback capability confirmed

## End-to-End Pipeline Test

```bash
# Full pipeline test
INPUT="output/test_data/"
SKILL_NAME="test-skill"

# 1. Build skill
skill-builder build "$INPUT" --name "$SKILL_NAME"
test -f "output/$SKILL_NAME/SKILL.md" || exit 1

# 2. Enhance skill
skill-enhancer enhance "output/$SKILL_NAME/" --mode local
test -f "output/$SKILL_NAME/SKILL.md.backup" || exit 1

# 3. Check quality
quality-checker validate "output/$SKILL_NAME/" --level standard
score=$?
[ $score -ge 60 ] || exit 1

# 4. Package skill
skill-packager package "output/$SKILL_NAME/"
test -f "output/$SKILL_NAME.zip" || exit 1

echo "Pipeline test PASSED"
```

## Metrics

### Quality Score Calculation

```
Structure (25 points)
- SKILL.md present: 5
- Required sections: 10
- Workflow steps: 5
- Configuration options: 5

Content (35 points)
- Grounding checkpoint: 10
- Uncertainty escalation: 10
- Context scope table: 5
- Recovery protocol: 10

Examples (20 points)
- Bash examples: 10
- Configuration examples: 5
- Output examples: 5

Documentation (20 points)
- References: 5
- Troubleshooting: 5
- Checkpoint structure: 5
- Integration points: 5

Total: 100 points
PASS: ≥80 | WARN: 60-79 | FAIL: <60
```

## Automated Testing (CI/CD)

```yaml
# .github/workflows/skill-factory-evaluation.yml
name: Skill Factory Evaluation
on: [push, pull_request]

jobs:
  evaluate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Structure Validation
        run: |
          for skill in skill-builder skill-enhancer quality-checker skill-packager; do
            test -f "agentic/code/addons/skill-factory/skills/$skill/SKILL.md"
          done

      - name: Content Validation
        run: |
          for skill in skill-builder skill-enhancer quality-checker skill-packager; do
            grep -q "Grounding Checkpoint" "agentic/code/addons/skill-factory/skills/$skill/SKILL.md"
            grep -q "Recovery Protocol" "agentic/code/addons/skill-factory/skills/$skill/SKILL.md"
            grep -q "Uncertainty Escalation" "agentic/code/addons/skill-factory/skills/$skill/SKILL.md"
          done

      - name: Orchestrator Validation
        run: |
          test -f "agentic/code/addons/skill-factory/agents/skill-architect.md"
          grep -q "orchestration: true" "agentic/code/addons/skill-factory/agents/skill-architect.md"
```

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-01-15 | Initial evaluation plan |
