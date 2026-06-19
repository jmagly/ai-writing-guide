# Technical Debt Analyst — Worked Examples

Externalized from the agent definition per the few-shot-examples rule (#1587).

### Example 1: Debt Inventory Report (Simple)

**Input:**
Run a technical debt assessment on the `src/auth/` directory and produce a prioritized inventory.

**Output:**
```markdown
# Technical Debt Inventory — Auth Module
**Date**: 2026-02-27
**Scope**: src/auth/

## Executive Summary

| Metric | Value |
|--------|-------|
| Total Debt Items | 6 |
| Critical (Blocking) | 1 |
| High Priority | 2 |
| Estimated Remediation Cost | 12 developer-days |
| Estimated Annual Drag | 8 developer-days/year |

## Complexity Hotspots

| File | Cyclomatic | Coverage | Churn (90d) |
|------|-----------|----------|-------------|
| src/auth/token-manager.ts | 22 | 38% | 24 changes |
| src/auth/session.ts | 17 | 61% | 11 changes |
| src/auth/middleware.ts | 14 | 72% | 8 changes |

## Debt Register

### DEBT-001: Token Manager Complexity (CRITICAL)
- **Category**: Accidental
- **Type**: Code Quality
- **Location**: `src/auth/token-manager.ts`
- **Description**: Single 340-line function handles token creation, validation, refresh, and revocation with 22 branches. Added piece by piece over 18 months.
- **Impact**: 3 hours/week debugging token-related issues; 38% coverage makes changes risky
- **Remediation**: Extract to 4 focused classes (TokenFactory, TokenValidator, TokenRefresher, TokenRevoker)
- **Effort**: M (4 days)
- **Priority Score**: 87

### DEBT-002: Missing Session Cleanup (HIGH)
- **Category**: Intentional (documented 2025-06-12 as TODO)
- **Type**: Architecture
- **Location**: `src/auth/session.ts:L89`
- **Description**: Sessions are never purged from the store. Originally deferred pending Redis migration decision.
- **Impact**: Memory growth of ~50MB/week; will cause OOM in high-traffic periods
- **Remediation**: Add TTL-based cleanup job; 1 hour after Redis migration (DEBT-005)
- **Effort**: S (2 days including DEBT-005 dependency)
- **Priority Score**: 74

## Refactoring Priority Matrix

| Item | Impact | Effort | Risk | ROI Period | Recommendation |
|------|--------|--------|------|------------|----------------|
| DEBT-001 | High | M | Medium | 3 months | Do in next sprint |
| DEBT-002 | High | S | Low | 1 month | Do after DEBT-005 |
```

**Why This Is Good:**
- Concrete metrics (lines, complexity scores, coverage %) rather than vague descriptions
- Distinguishes intentional from accidental debt with evidence
- ROI period makes business case without requiring manager to calculate it
- Priority score and recommendation eliminate ambiguity about what to do next

---

### Example 2: Refactoring Priority Matrix (Moderate)

**Input:**
We have 23 items in our debt register. Help us build a prioritized refactoring matrix that the team can use for sprint planning.

**Output:**
```markdown
# Refactoring Priority Matrix
**Generated**: 2026-02-27
**Team Velocity**: 40 story points/sprint (2 weeks)
**Debt Budget**: 20% of velocity = 8 points/sprint

## Scoring Methodology

Priority Score = (Weekly Dev Hours Lost × 52 + Defect Risk Score) / Effort Days

| Factor | Weight | How Measured |
|--------|--------|--------------|
| Weekly dev hours lost | 60% | Git blame + team survey |
| Defect risk (churn × complexity) | 25% | git log + radon/cr |
| Onboarding friction | 15% | New hire time-to-productivity |

## Priority Matrix (Top 10 of 23)

| Rank | ID | Component | Impact | Effort | Risk | Score | Sprint |
|------|----|-----------|--------|--------|------|-------|--------|
| 1 | DEBT-001 | token-manager.ts | 3h/wk | 4d | Med | 87 | Q1 S1 |
| 2 | DEBT-007 | api-router circular deps | 2h/wk | 3d | Low | 82 | Q1 S1 |
| 3 | DEBT-012 | duplicate validation logic | 1.5h/wk | 2d | Low | 71 | Q1 S2 |
| 4 | DEBT-002 | session cleanup | 1h/wk | 2d | Low | 68 | Q1 S2 |
| 5 | DEBT-019 | god object: UserService | 2h/wk | 8d | High | 61 | Q2 S1 |

## Defer List (Lower Priority)

| ID | Component | Reason to Defer | Revisit |
|----|-----------|-----------------|---------|
| DEBT-009 | Legacy CSV parser | Low churn, stable, no new features planned | Q3 |
| DEBT-015 | Old config format | Migration in progress (separate track) | After FEAT-44 |

## Sprint Allocation Plan

**Q1 Sprint 1** (8 debt points):
- DEBT-001 token-manager refactor: 4 days
- DEBT-007 circular dependency removal: 3 days

**Q1 Sprint 2** (6 debt points):
- DEBT-012 validation consolidation: 2 days
- DEBT-002 session cleanup: 2 days

## Expected Outcomes

| Quarter | Debt Points | Expected Velocity Gain |
|---------|-------------|----------------------|
| Q1 | 16 points | +3 story points/sprint |
| Q2 | 20 points | +5 story points/sprint |
| Q3 | 12 points | +2 story points/sprint |
```

**Why This Is Good:**
- Scoring methodology is transparent and reproducible
- Sprint allocation is concrete — teams can drop it directly into planning
- Defer list is explicit rather than implied, preventing low-value work from creeping in
- Velocity gain projections tie debt work to business outcomes

---

### Example 3: Debt-to-Feature Ratio Analysis (Complex)

**Input:**
Our CTO wants to understand whether our technical debt is actually slowing us down. Analyze the last 6 months of git history and correlate debt metrics with delivery velocity.

**Output:**
```markdown
# Technical Debt Impact Analysis
**Period**: 2025-09-01 to 2026-02-27
**Data Sources**: git log, JIRA velocity reports, defect tracker

## Methodology

Correlated three independent data sources:
1. Code complexity metrics per component (radon/cr)
2. Change frequency per component (git log)
3. Defect density per component (JIRA bug labels)

High complexity + high churn + high defects = confirmed debt drag.

## Findings

### Velocity Trend

| Quarter | Story Points Delivered | Defects Introduced | Defect Fix Time |
|---------|----------------------|---------------------|-----------------|
| Q3 2025 | 142 | 23 | avg 4.2 hours |
| Q4 2025 | 131 | 31 | avg 5.8 hours |
| Q1 2026 | 118 | 38 | avg 7.1 hours |

Velocity declined 17% while defect rate grew 65% — consistent with debt accumulation pattern.

### Highest-Drag Components

| Component | Complexity | Churn | Defects | Hours Lost/Sprint |
|-----------|-----------|-------|---------|-------------------|
| src/billing/ | CC=28 avg | 47 changes | 14 bugs | 18 hours |
| src/auth/ | CC=22 avg | 24 changes | 8 bugs | 12 hours |
| src/reporting/ | CC=19 avg | 31 changes | 11 bugs | 10 hours |

**Total debt drag: 40 developer-hours per sprint = 1 full developer equivalent.**

### Root Cause Analysis

```
src/billing/ churn pattern:
- 71% of changes are bug fixes (identified via commit message analysis)
- Only 29% are feature work
- Normal healthy ratio: <30% bug fixes

Interpretation: billing module is in maintenance mode despite being
actively needed for new features. Refactoring is prerequisite for
the Q2 subscription overhaul (FEAT-61).
```

### ROI Projection

If the top 3 drag components are refactored (estimated 22 developer-days):

| Metric | Current | Projected Post-Refactor |
|--------|---------|------------------------|
| Defects/sprint | 6.3 | 2.1 (-67%) |
| Velocity | 118 pts/sprint | 138 pts/sprint (+17%) |
| Fix cycle time | 7.1 hours | 3.5 hours |
| Break-even | — | Sprint 8 (~4 months) |

At current burn rate, the refactoring pays for itself in 4 months and delivers net positive return for the remaining 8 months of the year: **+82 story points** of recovered capacity.

## Recommendation

Allocate 25% of Q1 velocity to debt remediation, targeting billing and auth modules. Frame to stakeholders as infrastructure investment with measurable velocity ROI, not cleanup work.
```

**Why This Is Good:**
- Uses three independent data sources to avoid confirmation bias
- Quantifies debt as "1 full developer equivalent" — makes it concrete for non-technical stakeholders
- Root cause analysis traces symptoms (churn) back to causes (bug-dominated work)
- ROI projection expressed in story points, the unit the team actually tracks
- Recommendation includes stakeholder framing, not just technical advice
