# gap-analysis

Unified gap analysis with natural language routing to specialized skills.

## Triggers

- "gap analysis"
- "find gaps"
- "what's missing"
- "what are we missing"
- "coverage gaps"
- "ready for audit"
- "audit gaps"
- "compliance gaps"
- "security gaps"
- "test gaps"
- "requirements gaps"

## Purpose

This skill provides a single entry point for all gap analysis needs by:
- Parsing natural language to understand analysis intent
- Routing to appropriate specialized skills
- Aggregating results into unified gap matrix
- Comparing to historical reports for trending
- Generating actionable remediation roadmaps

## Behavior

When triggered, this skill:

1. **Parse analysis intent**:
   - Extract analysis target from user request
   - Identify constraints (framework, phase, scope)
   - Determine focus (audit prep, release readiness, general health)
   - Handle compound requests ("security and coverage gaps")

2. **Route to specialized skills**:
   - Map intent to skill combination
   - Launch skills in parallel where possible
   - Pass relevant context to each skill

3. **Aggregate findings**:
   - Collect gap findings from all invoked skills
   - Normalize severity classification
   - Deduplicate overlapping findings
   - Generate stable gap IDs for tracking

4. **Compare to history**:
   - Detect previous reports with matching scope
   - Calculate delta (new gaps, closed gaps, unchanged)
   - Track gap age for unchanged items

5. **Generate unified report**:
   - Executive summary with key findings
   - Gap matrix with full details
   - Historical comparison section
   - Prioritized remediation roadmap

6. **Offer criteria saving** (if custom analysis):
   - Detect custom parameters used
   - Prompt user to save for reuse
   - Generate criteria YAML file

## Intent Extraction

### Analysis Targets

| Target | Keywords | Routes To |
|--------|----------|-----------|
| Security | security, vulnerabilities, OWASP, STRIDE, threat, attack | security-assessment |
| Compliance | SOC2, HIPAA, GDPR, PCI, ISO, compliance, audit, regulatory | flow-compliance-validation |
| Traceability | requirements, coverage, implemented, tested, orphan, traced | traceability-check |
| Test Coverage | test, coverage, untested, testing gaps | test-coverage |
| Gate Readiness | gate, transition, ready, phase, LOM, ABM, IOC, PRM | gate-evaluation |
| Workspace | workspace, artifacts, documentation, alignment, freshness | workspace-health |
| General | gaps, missing, issues, problems | traceability-check + workspace-health |

### Constraint Extraction

```yaml
constraint_patterns:
  framework:
    patterns: ["for (SOC2|HIPAA|GDPR|PCI-DSS|ISO27001)", "(SOC2|HIPAA|GDPR) audit"]
    maps_to: compliance_framework

  phase:
    patterns: ["for (Inception|Elaboration|Construction|Transition)", "before (Elaboration|Construction)"]
    maps_to: target_phase

  timeline:
    patterns: ["by (next week|end of month|Q[1-4])", "urgent", "before release"]
    maps_to: priority_boost

  scope:
    patterns: ["(auth|payment|api|database) module", "for (component|module) X"]
    maps_to: analysis_scope
```

### Compound Intent Handling

When multiple targets are detected:

```yaml
compound_routing:
  "security and compliance":
    skills: [security-assessment, flow-compliance-validation]
    execution: parallel

  "ready for SOC2 audit":
    skills:
      - security-assessment
      - flow-compliance-validation (framework: soc2)
      - traceability-check
    execution: parallel

  "full gap analysis":
    skills:
      - traceability-check
      - test-coverage
      - security-assessment
      - workspace-health
    execution: parallel
```

## Skill Integration

### Invocation Pattern

Each skill is invoked via Task tool with structured output requirements:

```
Task(
    subagent_type="{appropriate-agent}",
    description="Run {skill-name} gap analysis",
    prompt="""
    Execute {skill} analysis.

    Context:
    - Scope: {scope}
    - Focus: {focus}
    - Constraints: {constraints}

    Return findings in gap matrix format:
    - Gap ID: GA-{CATEGORY}-{HASH}
    - Category: {skill-category}
    - Severity: Critical/High/Medium/Low
    - Description: What is missing or wrong
    - Impact: Business/technical impact
    - Remediation: Specific action to close gap
    - Owner: Suggested owner (team or role)
    """
)
```

### Agent Assignments

| Skill | Invocation Agent |
|-------|------------------|
| traceability-check | requirements-analyst |
| security-assessment | security-architect |
| gate-evaluation | executive-orchestrator |
| test-coverage | test-architect |
| workspace-health | documentation-archivist |
| flow-compliance-validation | privacy-officer |

### Parallel Execution

```
Independent (parallel):
├── security-assessment
├── traceability-check
├── test-coverage
└── workspace-health

Sequential (after parallel complete):
├── gate-evaluation (may depend on other results)
└── Report synthesis (aggregates all findings)
```

## Severity Classification

### Unified Severity Levels

| Severity | Definition | Response SLA | Score |
|----------|------------|--------------|-------|
| Critical | Blocks production, high risk of immediate impact | 24-48 hours | 4 |
| High | Should block release, significant risk if unaddressed | 1-2 weeks | 3 |
| Medium | Address in near term, moderate risk | This quarter | 2 |
| Low | Address as capacity allows, minimal immediate risk | Backlog | 1 |

### Normalization Rules

```yaml
severity_mapping:
  # From security-assessment (CVSS)
  cvss_9.0+: Critical
  cvss_7.0-8.9: High
  cvss_4.0-6.9: Medium
  cvss_0.1-3.9: Low

  # From traceability-check
  orphan_critical_requirement: Critical
  orphan_requirement: High
  untested_critical_code: High
  untested_requirement: Medium
  untested_code: Medium
  rogue_code: Low

  # From gate-evaluation
  blocking_criteria: Critical
  conditional_criteria: High
  missing_artifact: Medium
  stale_artifact: Low

  # From test-coverage
  zero_coverage_critical_path: Critical
  below_50_critical: High
  below_threshold: Medium
  declining_coverage: Low
```

## Gap ID Generation

### Stable ID Format

`GA-{CATEGORY}-{HASH}`

Where:
- `CATEGORY`: SEC, TRC, CVR, CMP, ART (3-letter code)
- `HASH`: MD5 of identifying attributes, first 6 chars

### Hash Inputs by Category

```yaml
gap_id_inputs:
  security:
    hash_of: [file_path, vulnerability_type, location]
    example: "GA-SEC-a3f7b2"

  traceability:
    hash_of: [requirement_id, gap_type]
    example: "GA-TRC-c4e8d1"

  coverage:
    hash_of: [file_path, coverage_type]
    example: "GA-CVR-b2a9f0"

  compliance:
    hash_of: [framework, control_id]
    example: "GA-CMP-d7c3e5"

  artifact:
    hash_of: [artifact_type, artifact_name]
    example: "GA-ART-f1b8a4"
```

## Historical Comparison

### Report Detection

```yaml
historical_detection:
  report_pattern: ".aiwg/reports/gap-analysis-{scope}-*.md"

  scope_matching:
    exact: "gap-analysis-soc2-*.md" for SOC2 analysis
    fuzzy: "gap-analysis-security-*.md" includes security-focused
    general: "gap-analysis-full-*.md" for general analysis

  recency_preference:
    1. Most recent with matching scope
    2. Most recent with similar scope
    3. Skip comparison if no match
```

### Delta Calculation

```yaml
delta_algorithm:
  closed_gaps:
    definition: In previous report, not in current
    display: "Gaps Closed Since Last Report"

  new_gaps:
    definition: In current report, not in previous
    display: "New Gaps Since Last Report"

  unchanged_gaps:
    definition: In both reports
    tracking:
      - age_days: days since first detected
      - severity_change: severity in previous vs current
    display: "Unchanged Gaps (with age)"
```

### Trend Visualization

```markdown
### Trend Summary

| Metric | Previous | Current | Delta |
|--------|----------|---------|-------|
| Total Gaps | 15 | 12 | -3 ↓ |
| Critical | 2 | 1 | -1 ↓ |
| High | 5 | 4 | -1 ↓ |
| Medium | 6 | 5 | -1 ↓ |
| Low | 2 | 2 | 0 → |
```

## Report Format

### Output Location

`.aiwg/reports/gap-analysis-{scope}-{YYYY-MM-DD}.md`

### Report Structure

```markdown
# Gap Analysis Report

**Date**: YYYY-MM-DD
**Scope**: {analysis_scope}
**Requested By**: {user_context}
**Analysis Type**: {detected_intents}

---

## Executive Summary

| Metric | Value | Status |
|--------|-------|--------|
| Total Gaps | {count} | {status_emoji} |
| Critical | {count} | {status_emoji} |
| High | {count} | {status_emoji} |
| Medium | {count} | {status_emoji} |
| Low | {count} | {status_emoji} |

**Overall Assessment**: {assessment_text}

**Key Findings**:
1. {finding_1}
2. {finding_2}
3. {finding_3}

---

## Gap Matrix

| ID | Category | Severity | Description | Impact | Remediation | Owner | Status |
|----|----------|----------|-------------|--------|-------------|-------|--------|
| GA-SEC-a3f7b2 | Security | Critical | SQL injection in API | Data breach risk | Parameterized queries | Backend | Open |
| GA-TRC-c4e8d1 | Traceability | High | UC-003 not implemented | Missing feature | Implement in Sprint 5 | Dev | Open |
| ... | ... | ... | ... | ... | ... | ... | ... |

---

## Findings by Category

### Security Gaps ({count})

[Detailed findings from security-assessment]

### Traceability Gaps ({count})

[Detailed findings from traceability-check]

### Coverage Gaps ({count})

[Detailed findings from test-coverage]

### Compliance Gaps ({count})

[Detailed findings from flow-compliance-validation if invoked]

### Artifact Gaps ({count})

[Detailed findings from workspace-health]

---

## Historical Comparison

**Previous Report**: {previous_report_path} ({previous_date})

### Trend Summary

| Metric | Previous | Current | Delta |
|--------|----------|---------|-------|
| Total | {prev} | {curr} | {delta} |
| Critical | {prev} | {curr} | {delta} |

### Gaps Closed Since Last Report

| ID | Category | Severity | Description | Closed Date |
|----|----------|----------|-------------|-------------|

### New Gaps Since Last Report

| ID | Category | Severity | Description | First Detected |
|----|----------|----------|-------------|----------------|

### Unchanged Gaps (with age)

| ID | Category | Severity | Description | Age (days) |
|----|----------|----------|-------------|------------|

---

## Remediation Roadmap

### Immediate (This Week)
- [ ] {critical_gap_1} - Owner: {owner}
- [ ] {critical_gap_2} - Owner: {owner}

### Short-term (This Sprint)
- [ ] {high_gap_1} - Owner: {owner}
- [ ] {high_gap_2} - Owner: {owner}

### Medium-term (This Quarter)
- [ ] {medium_gap_1} - Owner: {owner}

---

## Appendix: Analysis Metadata

**Skills Invoked**: {skill_list}
**Criteria Used**: {criteria_name | "default"}
**Report Generated By**: gap-analysis skill v1.0.0
```

## Custom Criteria

### Save Workflow

After custom analysis, if custom parameters were detected:

```markdown
---

## Save Analysis Criteria?

This analysis used custom parameters:
- **Skills**: {skill_list}
- **Focus areas**: {focus_areas}
- **Patterns**: {patterns}
- **Thresholds**: {thresholds}

Would you like to save these criteria for future use?

1. **Save as new criteria**: Enter a name (e.g., "soc2-audit-prep")
2. **Skip**: Don't save (report still saved)

If saved, invoke later with: `/gap-analysis --criteria {name}`
```

### Criteria Schema

Location: `.aiwg/gap-criteria/{name}.yaml`

```yaml
name: soc2-audit-prep
version: "1.0"
description: "Custom criteria for SOC2 audit preparation"
created: "2025-12-08"
author: "DevOps Team"

scope:
  skills:
    - security-assessment
    - traceability-check
    - test-coverage

  security:
    focus_categories:
      - access_control
      - cryptography
      - logging
    owasp_categories: [A01, A02, A07, A09]
    severity_threshold: Medium

  traceability:
    requirement_patterns:
      - "UC-*"
      - "NFR-SEC-*"
    ignore_patterns:
      - "US-SPIKE-*"

  coverage:
    critical_paths:
      - "src/auth/**"
      - "src/api/payments/**"
    min_threshold: 85

severity_overrides:
  - pattern: "src/auth/**"
    boost: 1
  - pattern: "NFR-SEC-*"
    boost: 1

history:
  compare_to_previous: true
  stale_threshold_days: 14

report:
  include_remediation_roadmap: true
  executive_summary_max_items: 5
```

### Criteria Resolution Order

1. `--criteria {name}` flag value
2. `.aiwg/gap-criteria/{name}.yaml` (project)
3. `~/.config/aiwg/gap-criteria/{name}.yaml` (user)
4. Built-in defaults

## Usage Examples

### Natural Language Analysis

```
User: "What are we missing for SOC2 audit?"

Skill parses:
- Target: compliance (SOC2)
- Framework: soc2
- Focus: audit prep

Routes to:
- security-assessment (access controls, logging)
- flow-compliance-validation (soc2)
- traceability-check (control requirements)

Output:
"SOC2 Audit Gap Analysis Complete

Total Gaps: 12
- Critical: 1 (missing MFA)
- High: 4 (logging gaps, access review)
- Medium: 5 (documentation)
- Low: 2 (process improvements)

Report: .aiwg/reports/gap-analysis-soc2-2025-12-08.md"
```

### Phase Readiness Check

```
User: "Are we ready for Elaboration?"

Skill parses:
- Target: gate_readiness
- Phase: elaboration
- Gate: LOM (Lifecycle Objective Milestone)

Routes to:
- gate-evaluation (LOM criteria)
- workspace-health (required artifacts)

Output:
"Elaboration Readiness: CONDITIONAL

3 blocking gaps:
- GA-ART-f1b8a4: Risk register incomplete (High)
- GA-ART-d7c3e5: Architecture sketch missing (High)
- GA-TRC-c4e8d1: 2 critical requirements undefined (Medium)

Report: .aiwg/reports/gap-analysis-lom-2025-12-08.md"
```

### General Gap Check

```
User: "Find all gaps"

Skill parses:
- Target: general (all)
- Focus: comprehensive

Routes to (parallel):
- traceability-check
- test-coverage
- security-assessment
- workspace-health

Output:
"Comprehensive Gap Analysis Complete

Total Gaps: 28
- Security: 8 gaps
- Traceability: 7 gaps
- Coverage: 9 gaps
- Artifacts: 4 gaps

Historical: -5 from last analysis (3 closed, 2 new)

Report: .aiwg/reports/gap-analysis-full-2025-12-08.md"
```

### With Saved Criteria

```
User: "/gap-analysis --criteria soc2-audit-prep"

Skill loads:
- .aiwg/gap-criteria/soc2-audit-prep.yaml

Applies:
- Focus: access_control, cryptography, logging
- Coverage threshold: 85%
- Severity boost for auth paths

Output:
"SOC2 Audit Prep Gap Analysis (using saved criteria)

Total Gaps: 9
- Critical: 0
- High: 3
- Medium: 4
- Low: 2

vs. Previous: -3 gaps (2 closed, 0 new since last SOC2 check)

Report: .aiwg/reports/gap-analysis-soc2-2025-12-08.md"
```

## Integration

This skill uses:
- `traceability-check`: Requirements coverage gaps
- `security-assessment`: Security vulnerability gaps
- `gate-evaluation`: Phase readiness gaps
- `test-coverage`: Test coverage gaps
- `workspace-health`: Artifact alignment gaps
- `flow-compliance-validation`: Compliance framework gaps
- `artifact-metadata`: Get artifact info for report generation
- `project-awareness`: Detect project structure and phase

## Output Locations

- Gap analysis report: `.aiwg/reports/gap-analysis-{scope}-{date}.md`
- Saved criteria: `.aiwg/gap-criteria/{name}.yaml`
- Historical reports: `.aiwg/reports/gap-analysis-*.md` (auto-detected)

## References

- Traceability skill: plugins/sdlc/skills/traceability-check/SKILL.md
- Security skill: plugins/sdlc/skills/security-assessment/SKILL.md
- Gate evaluation: plugins/sdlc/skills/gate-evaluation/SKILL.md
- Test coverage: plugins/sdlc/skills/test-coverage/SKILL.md
- Workspace health: plugins/utils/skills/workspace-health/SKILL.md
