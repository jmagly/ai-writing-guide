# Gap Analysis Guide

Find what's missing in your project with a single command. Gap analysis identifies security vulnerabilities, requirements coverage issues, test gaps, compliance deficiencies, and artifact completeness - all in one unified report.

Just describe what you want to check and let the system handle the rest.

---

## Quick Examples

**Natural language:**

```text
"What are we missing for SOC2?"
"Ready for Elaboration?"
"Find all gaps"
"Security gaps in the auth module"
```

**Slash command:**

```text
/gap-analysis What security gaps do we have?
/gap-analysis --mode compliance --guidance "focus on HIPAA"
/gap-analysis --interactive
```

---

## Basic Usage

### Security Gaps

**Natural language:**

```text
"What security vulnerabilities do we have?"
```

**Slash command:**

```text
/gap-analysis security gaps
```

The system:
1. Runs OWASP Top 10 analysis
2. Checks for hardcoded secrets
3. Reviews authentication patterns
4. Scans dependencies for CVEs
5. Generates prioritized security gap report

---

### Compliance Gaps

**Natural language:**

```text
"What are we missing for SOC2 audit?"
```

**Slash command:**

```text
/gap-analysis SOC2 compliance gaps
```

Supported frameworks: SOC2, HIPAA, GDPR, PCI-DSS, ISO 27001, NIST, FedRAMP, CCPA

The system:
1. Maps requirements to your controls
2. Identifies missing controls
3. Checks evidence sufficiency
4. Prioritizes by audit risk
5. Generates compliance gap report

---

### Requirements Coverage

**Natural language:**

```text
"Which requirements aren't implemented?"
```

**Slash command:**

```text
/gap-analysis requirements coverage
```

The system:
1. Extracts requirements from `.aiwg/requirements/`
2. Scans code for implementation references
3. Checks test coverage per requirement
4. Identifies orphan requirements (no code)
5. Identifies rogue code (no requirement)

---

### Test Coverage

**Natural language:**

```text
"What's not tested?"
```

**Slash command:**

```text
/gap-analysis test coverage gaps
```

The system:
1. Analyzes test coverage metrics
2. Identifies zero-coverage critical paths
3. Flags declining coverage trends
4. Prioritizes by code criticality
5. Suggests specific tests to add

---

### Phase Readiness

**Natural language:**

```text
"Are we ready for Elaboration?"
```

**Slash command:**

```text
/gap-analysis ready for Elaboration
```

The system:
1. Checks gate criteria for the target phase
2. Inventories required artifacts
3. Validates completion status
4. Reports PASS / CONDITIONAL / FAIL
5. Lists specific blockers to resolve

---

### Full Gap Analysis

**Natural language:**

```text
"Find all gaps"
```

**Slash command:**

```text
/gap-analysis --mode full
```

The system runs everything in parallel:
- Security assessment
- Traceability check
- Test coverage analysis
- Workspace health check

---

## Add Context with --guidance

Shape the analysis with upfront context.

**Natural language:**

```text
"Security gaps" --guidance "focus on payment processing, preparing for PCI audit"
```

**Slash command:**

```text
/gap-analysis security --guidance "focus on payment processing, preparing for PCI audit"
```

The guidance affects:
- Which areas get deeper analysis
- Severity classification (audit-critical items boosted)
- Recommendations tailored to your context
- Report format and emphasis

### More Examples

```text
/gap-analysis requirements --guidance "MVP scope only, defer nice-to-haves"
→ Focuses on core requirements, deprioritizes enhancement gaps

/gap-analysis test coverage --guidance "auth and payment modules critical"
→ Prioritizes coverage gaps in security-critical code

/gap-analysis compliance --guidance "SOC2 Type II, auditor coming in 2 weeks"
→ Focuses on evidence collection, flags urgent control gaps
```

---

## Interactive Mode

Ask for guided analysis with `--interactive`.

**Natural language:**

```text
"Gap analysis" --interactive
```

**Slash command:**

```text
/gap-analysis --interactive
```

**Example conversation:**

```text
Agent: What's the primary goal of this analysis?
  1. Audit preparation
  2. Release readiness
  3. General health check
  4. Custom analysis
> 1

Agent: Which audit are you preparing for?
  1. SOC2
  2. HIPAA
  3. PCI-DSS
  4. Other
> 1

Agent: What level of detail do you need?
  1. Executive summary only
  2. Detailed findings
  3. Full audit trail
> 2

Agent: Any specific areas of concern?
> We recently added payment processing and haven't had a security review

Agent: Got it. I'll run a comprehensive SOC2-focused analysis with extra attention on:
- Payment processing security controls
- Access control and authentication
- Change management evidence
- Encryption and key management

Starting analysis...
```

---

## Historical Comparison

Gap analysis automatically compares to your previous reports.

**What you see:**

```markdown
## Historical Comparison

**Previous Report**: gap-analysis-security-2025-12-01.md

### Trend Summary

| Metric | Previous | Current | Delta |
|--------|----------|---------|-------|
| Total  | 15       | 12      | -3 ↓  |
| Critical | 2      | 1       | -1 ↓  |
| High   | 5        | 4       | -1 ↓  |

### Gaps Closed Since Last Report
- GA-SEC-a3f7b2: XSS in search endpoint (was High)
- GA-SEC-b4c9d1: Missing rate limiting (was Medium)
- GA-SEC-c5e0f2: CSRF on forms (was High)

### New Gaps Since Last Report
- GA-SEC-d6f1a3: SQL injection in new API (Critical)
```

**Skip historical comparison:**

```text
/gap-analysis security --no-history
```

---

## Save Custom Criteria

After running a custom analysis, you can save the configuration for reuse.

**Example flow:**

```text
> /gap-analysis security --guidance "SOC2 audit prep, focus on access controls"

[Analysis completes...]

This analysis used custom parameters:
- Skills: security-assessment, traceability-check
- Focus: access_control, cryptography, logging
- Severity boost: auth paths

Would you like to save these criteria for future use?
1. Save as new criteria (enter name)
2. Skip

> 1
> soc2-audit-prep

Saved to: .aiwg/gap-criteria/soc2-audit-prep.yaml

Next time, run: /gap-analysis --criteria soc2-audit-prep
```

**Use saved criteria:**

```text
/gap-analysis --criteria soc2-audit-prep
```

---

## Output Reports

All reports saved to `.aiwg/reports/`:

```text
.aiwg/reports/
├── gap-analysis-security-2025-12-08.md
├── gap-analysis-soc2-2025-12-08.md
├── gap-analysis-full-2025-12-08.md
└── gap-analysis-lom-2025-12-08.md
```

### Report Structure

```markdown
# Gap Analysis Report

**Date**: 2025-12-08
**Scope**: Security Analysis
**Status**: 1 Critical | 3 High | 5 Medium | 2 Low

## Executive Summary

| Metric | Value | Status |
|--------|-------|--------|
| Total Gaps | 11 | ⚠️ |
| Critical | 1 | 🔴 |
| High | 3 | 🟠 |

**Key Findings**:
1. SQL injection vulnerability in payment API (Critical)
2. Missing MFA for admin accounts (High)
3. Excessive session timeout (Medium)

## Gap Matrix

| ID | Category | Severity | Description | Remediation | Owner |
|----|----------|----------|-------------|-------------|-------|
| GA-SEC-a3f7b2 | Security | Critical | SQL injection | Parameterized queries | Backend |
| GA-SEC-b4c9d1 | Security | High | No MFA | Implement TOTP | Auth Team |

## Remediation Roadmap

### Immediate (This Week)
- [ ] GA-SEC-a3f7b2: SQL injection - Backend Team

### Short-term (This Sprint)
- [ ] GA-SEC-b4c9d1: MFA implementation - Auth Team
```

---

## Severity Levels

| Severity | Definition | Response Time |
|----------|------------|---------------|
| **Critical** | Blocks production, high risk of immediate impact | 24-48 hours |
| **High** | Should block release, significant risk | 1-2 weeks |
| **Medium** | Address in near term, moderate risk | This quarter |
| **Low** | Address as capacity allows | Backlog |

---

## Quick Reference

| Action | Natural Language | Slash Command |
|--------|------------------|---------------|
| Security gaps | "security vulnerabilities" | `/gap-analysis security` |
| Compliance | "SOC2 compliance gaps" | `/gap-analysis --mode compliance` |
| Requirements | "requirements coverage" | `/gap-analysis traceability` |
| Test coverage | "what's not tested" | `/gap-analysis coverage` |
| Phase readiness | "ready for Elaboration" | `/gap-analysis ready for Elaboration` |
| Full analysis | "find all gaps" | `/gap-analysis --mode full` |
| With guidance | + `--guidance "context"` | + `--guidance "context"` |
| Interactive | + `--interactive` | + `--interactive` |
| No history | "skip comparison" | + `--no-history` |
| Use saved | - | `--criteria {name}` |

---

## What Happens Behind the Scenes

```
Your request
      ↓
┌─────────────────────────────┐
│  Intent Parser              │
│                             │
│  - Detects analysis type    │
│  - Extracts constraints     │
│  - Loads saved criteria     │
└──────────────┬──────────────┘
               ↓
┌─────────────────────────────┐
│  Skill Router               │
│                             │
│  - security-assessment      │
│  - traceability-check       │
│  - test-coverage            │
│  - gate-evaluation          │
│  - workspace-health         │
│  - compliance-validation    │
└──────────────┬──────────────┘
               ↓ (parallel)
┌─────────────────────────────┐
│  Result Aggregation         │
│                             │
│  - Normalize severity       │
│  - Deduplicate findings     │
│  - Generate stable IDs      │
│  - Compare to history       │
└──────────────┬──────────────┘
               ↓
┌─────────────────────────────┐
│  Report Generation          │
│                             │
│  - Unified gap matrix       │
│  - Historical comparison    │
│  - Remediation roadmap      │
│  - Save to .aiwg/reports/   │
└─────────────────────────────┘
```

---

## Related Commands

| Command | Purpose |
|---------|---------|
| `/project-status` | Overall project phase and progress |
| `/project-health-check` | Multi-dimensional health metrics |
| `/check-traceability` | Deep-dive on requirements coverage |
| `/security-audit` | Comprehensive security assessment |
| `/flow-compliance-validation` | Full compliance workflow |
| `/flow-gate-check` | Phase gate validation |

---

## Tips for Best Results

1. **Be specific about what you're checking** - "security gaps in auth" vs just "security gaps"

2. **Use --guidance for context** - "preparing for audit", "MVP scope", "focus on critical paths"

3. **Run regularly** - Historical trending shows improvement over time

4. **Save criteria for recurring checks** - SOC2 prep, release validation, sprint health

5. **Start with --interactive if unsure** - The system helps you figure out what to check

6. **Check phase readiness before transitions** - "Ready for Elaboration?" catches blockers early
