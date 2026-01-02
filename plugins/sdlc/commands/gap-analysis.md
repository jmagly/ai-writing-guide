---
description: Unified gap analysis with natural language routing to existing skills
category: sdlc-analysis
argument-hint: [context] [--mode <mode>] [--criteria <name>] [--guidance "text"] [--interactive] [--no-history]
allowed-tools: Task, Read, Write, Glob, Grep, TodoWrite
orchestration: true
model: opus
---

# Gap Analysis

## Task

Provide unified gap analysis by interpreting natural language requests, routing to appropriate specialized skills, and generating consolidated reports with historical trending.

When invoked with `/gap-analysis [context]`:

1. **Parse** user context to determine analysis intent
2. **Route** to appropriate specialized skills (parallel where possible)
3. **Aggregate** findings into unified gap matrix
4. **Compare** to historical reports for trending
5. **Generate** prioritized remediation roadmap
6. **Offer** to save custom criteria for reuse

## Your Role

**You are the Gap Analysis Orchestrator.** You interpret user requests, dispatch specialized agents, and synthesize results into actionable gap reports.

You do NOT perform gap detection yourself. You route to:
- `traceability-check` skill for requirements coverage
- `security-assessment` skill for security vulnerabilities
- `gate-evaluation` skill for phase readiness
- `test-coverage` skill for test gaps
- `workspace-health` skill for artifact alignment
- `flow-compliance-validation` for framework compliance

## Parameters

- **`[context]`** (optional): Natural language description of what to analyze
  - Examples: "What are we missing for SOC2?", "Ready for Elaboration?", "Find all gaps"
- **`--mode <mode>`** (optional): Force specific analysis mode
  - Values: `security`, `compliance`, `traceability`, `coverage`, `gate`, `health`, `full`
- **`--criteria <name>`** (optional): Use saved criteria from `.aiwg/gap-criteria/{name}.yaml`
- **`--guidance "text"`** (optional): Additional strategic direction
- **`--interactive`** (optional): Ask 6 strategic questions before analysis
- **`--no-history`** (optional): Skip historical comparison

## Natural Language Understanding

### Intent Detection

Parse user context to identify analysis targets:

| User Says | Detected Intent | Routes To |
|-----------|-----------------|-----------|
| "security gaps", "vulnerabilities", "OWASP" | security | security-assessment |
| "SOC2", "HIPAA", "compliance", "audit" | compliance | flow-compliance-validation |
| "requirements coverage", "orphan requirements" | traceability | traceability-check |
| "test coverage", "untested code" | coverage | test-coverage |
| "ready for Elaboration", "phase gate" | gate | gate-evaluation |
| "artifact gaps", "documentation" | health | workspace-health |
| "find all gaps", "what's missing" | full | all skills parallel |

### Constraint Extraction

Extract additional context from user request:

- **Framework**: "for SOC2" → compliance_framework: soc2
- **Phase**: "for Elaboration" → target_phase: elaboration
- **Scope**: "auth module" → analysis_scope: src/auth/**
- **Urgency**: "urgent", "before release" → priority_boost: true

### Compound Requests

Handle multiple intents in single request:

```
"security and compliance gaps for SOC2 audit"
→ Routes to: security-assessment + flow-compliance-validation
→ Framework: soc2
→ Execution: parallel
```

## Interactive Mode (--interactive)

When `--interactive` is specified, ask these questions using AskUserQuestion:

```
Q1: What's the primary goal of this analysis?
    - Audit preparation
    - Release readiness
    - General health check
    - Custom analysis

Q2: Which areas are most critical?
    - Security
    - Quality/Testing
    - Compliance
    - Requirements coverage
    - All equally

Q3: What's driving this analysis?
    - Upcoming milestone
    - External audit
    - Team concern
    - Routine check

Q4: Are there specific artifacts or areas to focus on?
    [Free text]

Q5: What level of detail do you need?
    - Executive summary only
    - Detailed findings
    - Full audit trail

Q6: Any known gaps you want validated?
    [Free text]
```

Synthesize answers into analysis configuration.

## Workflow

### Step 1: Parse Request and Confirm

**Actions**:

1. Extract analysis intent from user context
2. Identify constraints (framework, phase, scope)
3. Load criteria if `--criteria` specified
4. Apply `--guidance` if provided

**Communicate to User**:

```
Understood. I'll run gap analysis focused on {detected_intent}.

Analysis will cover:
- {skill_1}: {focus_1}
- {skill_2}: {focus_2}

{If historical}: Will compare to previous report from {date}.

Starting analysis...
```

### Step 2: Dispatch Specialized Skills

**Launch skills via Task tool** based on detected intent:

#### For Security Intent

```
Task(
    subagent_type="security-architect",
    description="Security gap analysis",
    prompt="""
    Execute security assessment following security-assessment skill.

    Context:
    - Scope: {scope}
    - Focus: {focus_areas}
    - Compliance target: {framework if applicable}

    Return findings in gap matrix format:
    - Gap ID: GA-SEC-{hash}
    - Category: security
    - Severity: Critical/High/Medium/Low
    - Description
    - Impact
    - Remediation
    - Owner suggestion

    Output: structured gap findings
    """
)
```

#### For Traceability Intent

```
Task(
    subagent_type="requirements-analyst",
    description="Traceability gap analysis",
    prompt="""
    Execute traceability check following traceability-check skill.

    Context:
    - Scope: {scope}
    - Requirement patterns: {patterns}

    Return findings in gap matrix format:
    - Gap ID: GA-TRC-{hash}
    - Category: traceability
    - Severity: Critical/High/Medium/Low
    - Description (orphan requirement, untested code, etc.)
    - Impact
    - Remediation
    - Owner suggestion

    Output: structured gap findings + coverage statistics
    """
)
```

#### For Coverage Intent

```
Task(
    subagent_type="test-architect",
    description="Test coverage gap analysis",
    prompt="""
    Execute test coverage analysis following test-coverage skill.

    Context:
    - Scope: {scope}
    - Critical paths: {critical_paths}
    - Threshold: {min_threshold}

    Return findings in gap matrix format:
    - Gap ID: GA-CVR-{hash}
    - Category: coverage
    - Severity: Critical/High/Medium/Low
    - Description (file, coverage %, type)
    - Impact
    - Remediation
    - Owner suggestion

    Output: structured gap findings + coverage report
    """
)
```

#### For Gate Intent

```
Task(
    subagent_type="executive-orchestrator",
    description="Gate readiness gap analysis",
    prompt="""
    Execute gate evaluation following gate-evaluation skill.

    Context:
    - Target phase: {phase}
    - Gate: {gate_name}

    Return findings in gap matrix format:
    - Gap ID: GA-ART-{hash}
    - Category: artifact
    - Severity: Critical (blocking) / High (conditional) / Medium / Low
    - Description (missing artifact, incomplete criterion)
    - Impact
    - Remediation
    - Owner suggestion

    Output: structured gap findings + gate status (PASS/CONDITIONAL/FAIL)
    """
)
```

#### For Compliance Intent

```
Task(
    subagent_type="privacy-officer",
    description="Compliance gap analysis",
    prompt="""
    Execute compliance validation following flow-compliance-validation.

    Context:
    - Framework: {framework}
    - Focus controls: {control_categories}

    Return findings in gap matrix format:
    - Gap ID: GA-CMP-{hash}
    - Category: compliance
    - Severity: Critical/High/Medium/Low
    - Description (missing control, insufficient evidence)
    - Impact
    - Remediation
    - Owner suggestion

    Output: structured gap findings + compliance status
    """
)
```

#### For Health/Workspace Intent

```
Task(
    subagent_type="documentation-archivist",
    description="Workspace health gap analysis",
    prompt="""
    Execute workspace health check following workspace-health skill.

    Context:
    - Scope: {scope}

    Return findings in gap matrix format:
    - Gap ID: GA-ART-{hash}
    - Category: artifact
    - Severity: Critical/High/Medium/Low
    - Description (stale doc, missing artifact, misalignment)
    - Impact
    - Remediation
    - Owner suggestion

    Output: structured gap findings + health status
    """
)
```

**Execution Strategy**:
- Launch independent skills in parallel (single message, multiple Task calls)
- Gate evaluation may run after others if it depends on their results

**Progress Communication**:

```
[..] Analyzing security vulnerabilities...
[..] Checking requirements coverage...
[..] Evaluating test coverage...
```

### Step 3: Aggregate Results

**Actions**:

1. Collect findings from all dispatched skills
2. Normalize severity using classification rules:
   ```yaml
   Critical: CVSS 9.0+, blocking gate, zero coverage critical path
   High: CVSS 7.0-8.9, orphan critical req, conditional gate
   Medium: CVSS 4.0-6.9, untested requirement, below threshold
   Low: CVSS <4.0, rogue code, stale doc
   ```
3. Generate stable gap IDs: `GA-{CAT}-{hash}`
4. Deduplicate overlapping findings
5. Sort by severity, then category

### Step 4: Historical Comparison

**If `--no-history` NOT specified**:

1. Detect previous reports:
   ```
   .aiwg/reports/gap-analysis-{scope}-*.md
   ```

2. Load most recent matching report

3. Calculate delta:
   - **Closed**: Gap IDs in previous, not in current
   - **New**: Gap IDs in current, not in previous
   - **Unchanged**: Gap IDs in both (track age)

4. Generate trend summary:
   ```
   | Metric | Previous | Current | Delta |
   |--------|----------|---------|-------|
   | Total  | 15       | 12      | -3 ↓  |
   ```

### Step 5: Generate Report

**Write to**: `.aiwg/reports/gap-analysis-{scope}-{YYYY-MM-DD}.md`

**Report Structure**:

```markdown
# Gap Analysis Report

**Date**: {date}
**Scope**: {scope}
**Requested By**: {user_context}
**Analysis Type**: {detected_intents}

---

## Executive Summary

| Metric | Value | Status |
|--------|-------|--------|
| Total Gaps | {count} | {emoji} |
| Critical | {count} | {emoji} |
| High | {count} | {emoji} |
| Medium | {count} | {emoji} |
| Low | {count} | {emoji} |

**Overall Assessment**: {assessment}

**Key Findings**:
1. {finding_1}
2. {finding_2}
3. {finding_3}

---

## Gap Matrix

| ID | Category | Severity | Description | Impact | Remediation | Owner | Status |
|----|----------|----------|-------------|--------|-------------|-------|--------|
{gap_rows}

---

## Findings by Category

### Security Gaps ({count})
{security_findings}

### Traceability Gaps ({count})
{traceability_findings}

### Coverage Gaps ({count})
{coverage_findings}

### Compliance Gaps ({count})
{compliance_findings}

### Artifact Gaps ({count})
{artifact_findings}

---

## Historical Comparison

**Previous Report**: {previous_path} ({previous_date})

### Trend Summary
{trend_table}

### Gaps Closed Since Last Report
{closed_gaps_table}

### New Gaps Since Last Report
{new_gaps_table}

### Unchanged Gaps (with age)
{unchanged_gaps_table}

---

## Remediation Roadmap

### Immediate (This Week)
{critical_items}

### Short-term (This Sprint)
{high_items}

### Medium-term (This Quarter)
{medium_items}

---

## Appendix: Analysis Metadata

**Skills Invoked**: {skill_list}
**Criteria Used**: {criteria_name}
**Report Generated By**: gap-analysis v1.0.0
```

### Step 6: Offer Criteria Saving (if custom analysis)

If custom parameters were detected (not using predefined mode or saved criteria):

```
---

This analysis used custom parameters:
- Skills: {skill_list}
- Focus: {focus_areas}
- Thresholds: {thresholds}

Would you like to save these criteria for future use?

If yes, provide a name and I'll save to: .aiwg/gap-criteria/{name}.yaml
Then invoke with: /gap-analysis --criteria {name}
```

If user provides name, generate criteria YAML:

```yaml
name: {name}
version: "1.0"
description: "{user_context}"
created: "{date}"

scope:
  skills: {skill_list}
  {skill_specific_config}

history:
  compare_to_previous: true
```

## Output Examples

### Security Analysis

```
User: /gap-analysis What security gaps do we have?

Output:
Security Gap Analysis Complete

Total Gaps: 8
- Critical: 1 (SQL injection in auth endpoint)
- High: 3 (missing rate limiting, weak password policy, no MFA)
- Medium: 3 (verbose error messages, missing security headers)
- Low: 1 (outdated dependency with low-severity CVE)

Historical: -2 from last security check (fixed XSS and CSRF)

Report: .aiwg/reports/gap-analysis-security-2025-12-08.md
```

### Phase Readiness

```
User: /gap-analysis Ready for Elaboration?

Output:
Elaboration Readiness: CONDITIONAL

Gate Status: 4/6 criteria passed

Blocking Gaps:
- GA-ART-f1b8a4: Risk register incomplete (High)
- GA-ART-d7c3e5: Architecture sketch missing (High)

Non-blocking:
- GA-TRC-c4e8d1: 2 use cases need detail (Medium)

Recommendation: Address 2 high-priority artifact gaps before transition.

Report: .aiwg/reports/gap-analysis-lom-2025-12-08.md
```

### Comprehensive Analysis

```
User: /gap-analysis Find all gaps

Output:
Comprehensive Gap Analysis Complete

Total Gaps: 28
| Category | Count | Critical | High | Medium | Low |
|----------|-------|----------|------|--------|-----|
| Security | 8 | 1 | 3 | 3 | 1 |
| Traceability | 7 | 0 | 2 | 4 | 1 |
| Coverage | 9 | 1 | 2 | 5 | 1 |
| Artifacts | 4 | 0 | 1 | 2 | 1 |

Historical: -5 gaps since last full analysis
- 7 closed, 2 new

Top 3 Priorities:
1. GA-SEC-a3f7b2: SQL injection (Critical, Backend)
2. GA-CVR-b2a9f0: Zero coverage on payment module (Critical, QA)
3. GA-SEC-c4e8d1: Missing rate limiting (High, Backend)

Report: .aiwg/reports/gap-analysis-full-2025-12-08.md
```

## Error Handling

### No Analysis Target

If user context is empty and no `--mode` specified:

```
I need more context to run gap analysis. Please specify:

1. What to analyze:
   - "security gaps" - vulnerabilities and controls
   - "compliance gaps for {framework}" - SOC2, HIPAA, etc.
   - "requirements coverage" - traceability
   - "test gaps" - coverage analysis
   - "ready for {phase}" - gate readiness
   - "find all gaps" - comprehensive

2. Or use --interactive for guided analysis

Example: /gap-analysis What security gaps do we have?
```

### Missing SDLC Artifacts

If `.aiwg/` directory not found:

```
No SDLC artifacts found (.aiwg/ directory missing).

Gap analysis requires project artifacts. To get started:
- /intake-wizard - Generate project intake
- /intake-from-codebase - Analyze existing code

For security-only analysis without SDLC artifacts:
/security-audit
```

### Criteria Not Found

If `--criteria {name}` specified but file not found:

```
Criteria '{name}' not found.

Searched:
- .aiwg/gap-criteria/{name}.yaml
- ~/.config/aiwg/gap-criteria/{name}.yaml

Available criteria:
{list of found criteria files}

To create new criteria, run analysis and save when prompted.
```

## Quality Gates

Before completing, verify:

- [ ] All dispatched skills returned results
- [ ] Findings aggregated and deduplicated
- [ ] Gap IDs are stable (deterministic hashing)
- [ ] Severity classification applied consistently
- [ ] Historical comparison accurate (if applicable)
- [ ] Report written to .aiwg/reports/
- [ ] User received summary with key findings

## References

- Gap Analysis Skill: plugins/sdlc/skills/gap-analysis/SKILL.md
- Traceability Skill: plugins/sdlc/skills/traceability-check/SKILL.md
- Security Skill: plugins/sdlc/skills/security-assessment/SKILL.md
- Gate Evaluation: plugins/sdlc/skills/gate-evaluation/SKILL.md
- Test Coverage: plugins/sdlc/skills/test-coverage/SKILL.md
- Workspace Health: plugins/utils/skills/workspace-health/SKILL.md
