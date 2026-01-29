# Regression Register

## Purpose

Maintain a comprehensive, living record of all regression defects discovered across the project lifecycle. The regression register serves as the single source of truth for regression tracking, trend analysis, and quality metrics.

## Ownership

- Owner: Test Engineer (register maintenance)
- Contributors: Test Architect (analysis), Software Implementer (fixes)
- Reviewers: Quality Manager (monthly review), Technical Lead (trend review)

## Phase 1: Active Regressions (ESSENTIAL)

### Active Regressions Table

Current regressions requiring attention:

| ID | Type | Severity | Status | Introduced | Detected | MTTD | Affected Component | Trigger | Assigned To |
|----|------|----------|--------|------------|----------|------|-------------------|---------|-------------|
| REG-{id} | {type} | {P0-P3} | {Active/Fixed} | {date} | {date} | {days} | {component} | {PR/commit} | {owner} |

<!-- EXAMPLE:
| ID | Type | Severity | Status | Introduced | Detected | MTTD | Affected Component | Trigger | Assigned To |
|----|------|----------|--------|------------|----------|------|-------------------|---------|-------------|
| REG-042 | Functional | P1 | Fixed | 2025-12-15 | 2025-12-18 | 3d | Authentication | PR #3241 | Jane Doe |
| REG-043 | Performance | P2 | Active | 2025-12-20 | 2025-12-23 | 3d | Search Service | PR #3289 | John Smith |
| REG-044 | Integration | P0 | Active | 2026-01-05 | 2026-01-06 | 1d | Payment Gateway | Stripe SDK v5.2 | Alice Johnson |
| REG-045 | Security | P1 | Fixed | 2026-01-08 | 2026-01-10 | 2d | Session Management | PR #3402 | Bob Wilson |
| REG-046 | Functional | P2 | Active | 2026-01-12 | 2026-01-15 | 3d | User Profile | PR #3450 | Carol Davis |
-->

<!-- ANTI-PATTERN: Incomplete tracking -->
| ID | Type | Status |
|----|------|--------|
| REG-999 | Bug | Open |

<!-- BETTER: Complete context for triage and resolution -->
| ID | Type | Severity | Status | Introduced | Detected | MTTD | Affected Component | Trigger | Assigned To |
|----|------|----------|--------|------------|----------|------|-------------------|---------|-------------|
| REG-999 | Integration | P0 | Active | 2026-01-10 | 2026-01-12 | 2d | OAuth SSO | Auth0 v5.2.0 upgrade | Security Team |

<!-- WHY: Full context enables prioritization, root cause analysis, and pattern detection -->

### Status Definitions

- **Active**: Regression detected, not yet fixed
- **Fixed**: Fix implemented and deployed to test environment, awaiting verification
- **Verified**: Fix verified by testing, awaiting production deployment
- **Closed**: Fix deployed to production and verified
- **Deferred**: Decided to defer fix to future iteration

### Severity Definitions

- **P0 (Critical)**: System unusable, data loss, security breach, complete feature failure - fix immediately
- **P1 (High)**: Major feature broken, significant user impact, no workaround - fix this iteration
- **P2 (Medium)**: Feature degraded, workaround exists - fix next iteration
- **P3 (Low)**: Cosmetic issue, minor inconvenience - fix when convenient

### Type Definitions

- **Functional**: Feature doesn't work as previously specified
- **Performance**: Unacceptable slowness or resource usage degradation
- **Security**: New vulnerability or security feature regression
- **Usability**: User experience degradation
- **Compatibility**: Breaks compatibility with browser/OS/device
- **Data**: Incorrect calculation or data integrity issue
- **Integration**: Fails to integrate with external system
- **Documentation**: Inaccurate or missing documentation after code change

## Phase 2: Recently Resolved (EXPAND WHEN READY)

<details>
<summary>Click to expand recently resolved regressions (last 30 days)</summary>

### Resolved Regressions Table

Regressions fixed and verified in the last 30 days:

| ID | Type | Severity | Introduced | Detected | Fixed | Verified | MTTD | MTTR | Component | Root Cause Summary |
|----|------|----------|------------|----------|-------|----------|------|------|-----------|-------------------|
| REG-{id} | {type} | {P0-P3} | {date} | {date} | {date} | {date} | {days} | {days} | {component} | {summary} |

<!-- EXAMPLE:
| ID | Type | Severity | Introduced | Detected | Fixed | Verified | MTTD | MTTR | Component | Root Cause |
|----|------|----------|------------|----------|-------|----------|------|------|-----------|------------|
| REG-038 | Functional | P1 | 2025-11-20 | 2025-11-22 | 2025-11-25 | 2025-11-26 | 2d | 4d | Email Service | Config error in SMTP settings |
| REG-039 | Performance | P2 | 2025-11-25 | 2025-11-28 | 2025-12-02 | 2025-12-03 | 3d | 5d | Database | Missing index after schema migration |
| REG-040 | Integration | P1 | 2025-12-01 | 2025-12-02 | 2025-12-05 | 2025-12-06 | 1d | 4d | Analytics | GA4 API version mismatch |
| REG-041 | Security | P0 | 2025-12-10 | 2025-12-10 | 2025-12-11 | 2025-12-12 | 0d | 2d | CORS | Overly permissive origin whitelist |
-->

**Metrics for Resolved Regressions (Last 30 Days)**:

- Total Resolved: {count}
- Average MTTD: {days}
- Average MTTR: {days}
- Fastest Resolution: {REG-ID} ({days})
- Slowest Resolution: {REG-ID} ({days})

<!-- EXAMPLE:
- Total Resolved: 4
- Average MTTD: 1.5 days
- Average MTTR: 3.75 days
- Fastest: REG-041 (2 days)
- Slowest: REG-039 (5 days)
-->

</details>

## Phase 3: Metrics and Patterns (ADVANCED)

<details>
<summary>Click to expand regression metrics and trend analysis</summary>

### Overall Metrics

**All-Time Statistics** (since project start):

- Total Regressions Tracked: {count}
- Active Regressions: {count}
- Resolved Regressions: {count}
- Deferred Regressions: {count}

<!-- EXAMPLE:
- Total: 46
- Active: 5
- Resolved: 38
- Deferred: 3
-->

**Current Regression Rate**: {percentage}

Formula: (Regressions detected in period) / (Code changes in period) × 100

<!-- EXAMPLE: Current Rate: 8.3% (12 regressions / 145 PRs merged in last 30 days) -->

**Regression Escape Rate**: {percentage}

Formula: (Regressions escaped to production) / (Total regressions detected) × 100

<!-- EXAMPLE: Escape Rate: 15% (7 production escapes / 46 total regressions) -->

**Mean Time to Detect (MTTD)**: {days}

Average time from code change introduction to regression detection.

<!-- EXAMPLE: MTTD: 2.1 days (median: 1.5 days) -->

**Mean Time to Resolve (MTTR)**: {days}

Average time from detection to fix verification.

<!-- EXAMPLE: MTTR: 4.3 days (median: 3.5 days) -->

### Trends Over Time

**Regression Count by Month**:

| Month | Regressions | Changes | Rate | MTTD | MTTR |
|-------|-------------|---------|------|------|------|
| {YYYY-MM} | {count} | {count} | {%} | {days} | {days} |

<!-- EXAMPLE:
| Month | Regressions | Changes | Rate | MTTD | MTTR |
|-------|-------------|---------|------|------|------|
| 2025-10 | 8 | 120 | 6.7% | 1.8d | 3.2d |
| 2025-11 | 10 | 135 | 7.4% | 2.0d | 3.8d |
| 2025-12 | 12 | 145 | 8.3% | 2.3d | 4.7d |
| 2026-01 | 5 | 62 | 8.1% | 1.9d | 3.9d |

Trend: Regression rate stable around 8%, but MTTR increasing (concerning)
-->

**Regressions by Severity**:

| Severity | Count | % of Total | Avg MTTR |
|----------|-------|------------|----------|
| P0 (Critical) | {count} | {%} | {days} |
| P1 (High) | {count} | {%} | {days} |
| P2 (Medium) | {count} | {%} | {days} |
| P3 (Low) | {count} | {%} | {days} |

<!-- EXAMPLE:
| Severity | Count | % of Total | Avg MTTR |
|----------|-------|------------|----------|
| P0 | 6 | 13% | 1.8d |
| P1 | 18 | 39% | 3.5d |
| P2 | 15 | 33% | 5.2d |
| P3 | 7 | 15% | 7.8d |

Pattern: Critical regressions resolved fastest (1.8d avg), lower priority takes longer
-->

**Regressions by Type**:

| Type | Count | % of Total | Avg MTTD |
|------|-------|------------|----------|
| Functional | {count} | {%} | {days} |
| Performance | {count} | {%} | {days} |
| Security | {count} | {%} | {days} |
| Integration | {count} | {%} | {days} |
| Other | {count} | {%} | {days} |

<!-- EXAMPLE:
| Type | Count | % of Total | Avg MTTD |
|------|-------|------------|----------|
| Functional | 26 | 57% | 2.3d |
| Performance | 8 | 17% | 3.5d |
| Integration | 6 | 13% | 1.8d |
| Security | 4 | 9% | 1.0d |
| Other | 2 | 4% | 2.5d |

Pattern: Security regressions detected fastest (1.0d), performance slowest (3.5d)
-->

**Most Affected Components**:

| Component | Regressions | % of Total | Latest |
|-----------|-------------|------------|--------|
| {component 1} | {count} | {%} | {REG-ID} |
| {component 2} | {count} | {%} | {REG-ID} |
| {component 3} | {count} | {%} | {REG-ID} |

<!-- EXAMPLE:
| Component | Regressions | % of Total | Latest |
|-----------|-------------|------------|--------|
| Authentication | 12 | 26% | REG-045 |
| Payment Gateway | 8 | 17% | REG-044 |
| Search Service | 6 | 13% | REG-043 |
| User Profile | 5 | 11% | REG-046 |
| Other | 15 | 33% | - |

Pattern: Authentication has highest regression rate (26%), indicating quality concern
-->

**Detection Method Breakdown**:

| Detection Method | Count | % of Total | Avg MTTD |
|------------------|-------|------------|----------|
| Automated Regression Test | {count} | {%} | {days} |
| Manual Testing | {count} | {%} | {days} |
| Production Monitoring | {count} | {%} | {days} |
| User Report | {count} | {%} | {days} |
| Code Review | {count} | {%} | {days} |

<!-- EXAMPLE:
| Detection Method | Count | % of Total | Avg MTTD |
|------------------|-------|------------|----------|
| Automated Test | 22 | 48% | 1.2d |
| Manual Testing | 12 | 26% | 3.5d |
| Production Monitoring | 7 | 15% | 0.8d |
| User Report | 4 | 9% | 7.2d |
| Code Review | 1 | 2% | 0.1d |

Pattern: Automated tests catch nearly half (48%), monitoring fastest (0.8d MTTD)
-->

**Root Cause Distribution**:

| Root Cause Category | Count | % of Total |
|---------------------|-------|------------|
| Inadequate test coverage | {count} | {%} |
| Refactoring side effects | {count} | {%} |
| Dependency/library changes | {count} | {%} |
| Configuration mismatch | {count} | {%} |
| Code merge conflicts | {count} | {%} |
| Design flaw exposed | {count} | {%} |
| Other | {count} | {%} |

<!-- EXAMPLE:
| Root Cause | Count | % of Total |
|------------|-------|------------|
| Inadequate test coverage | 18 | 39% |
| Refactoring side effects | 12 | 26% |
| Dependency changes | 8 | 17% |
| Configuration mismatch | 4 | 9% |
| Merge conflicts | 2 | 4% |
| Design flaw | 2 | 4% |

Pattern: 39% due to test gaps - primary improvement opportunity
-->

### Quality Alerts

**Current Alerts** (thresholds exceeded):

- [ ] Regression rate > 10%: {current rate}
- [ ] MTTD > 3 days: {current MTTD}
- [ ] MTTR > 5 days: {current MTTR}
- [ ] Escape rate > 20%: {current escape rate}
- [ ] Active P0 regressions > 2: {current P0 count}
- [ ] Same component regressed > 3 times in 30 days: {component name}

<!-- EXAMPLE:
Current Alerts:

- [ ] Regression rate: 8.3% (OK, threshold 10%)
- [x] MTTD: 2.3 days (OK, threshold 3 days)
- [x] MTTR: 4.7 days (WARNING - approaching threshold of 5 days)
- [ ] Escape rate: 15% (OK, threshold 20%)
- [x] Active P0: 1 (OK, threshold 2)
- [x] Authentication: 3 regressions in last 30 days (ALERT - investigate)
-->

**Alert Actions**:

When alerts triggered:

1. **Regression rate > 10%**: Review recent changes for quality issues, consider code freeze
2. **MTTD > 3 days**: Improve test automation coverage, increase test frequency
3. **MTTR > 5 days**: Allocate more dev capacity to regression fixes, streamline fix process
4. **Escape rate > 20%**: Review pre-production testing rigor, add smoke tests
5. **Active P0 > 2**: Declare regression crisis, daily standup until resolved
6. **Component repeated regressions**: Deep-dive quality review of component, refactor or rewrite

</details>

## Related Templates and References

- @agentic/code/frameworks/sdlc-complete/templates/test/regression-report.md - Periodic analysis reports
- @agentic/code/frameworks/sdlc-complete/templates/test/defect-card.md - Individual regression details
- @agentic/code/frameworks/sdlc-complete/templates/test/regression-test-set-card.md - Regression test suites
- @agentic/code/frameworks/sdlc-complete/templates/test/test-evaluation-summary-template.md - Test cycle summaries
- @agentic/code/frameworks/sdlc-complete/commands/regression-track.md - Update register (if available)

## Register Maintenance

### Update Frequency

- **Daily**: Add new regressions as detected
- **Weekly**: Update status of active regressions
- **Monthly**: Generate regression analysis report, review trends

### Adding New Regressions

When a regression is detected:

1. Assign next sequential ID: REG-{project}-{number}
2. Add row to Active Regressions table
3. Create detailed defect card (DEF-{id}) if needed
4. Link to regression test case (TC-{id})
5. Assign to responsible developer
6. Update metrics

### Updating Regression Status

When status changes:

1. Update Status column in Active Regressions table
2. If Fixed → add Fix date, calculate MTTR
3. If Verified → move to Recently Resolved table
4. If Closed → archive (can remove from Recently Resolved after 30 days)
5. If Deferred → update with deferral reason and target date
6. Recalculate metrics

### Archival Policy

- **Active Regressions**: Keep all until closed
- **Recently Resolved**: Keep last 30 days
- **Archived**: Move closed regressions >30 days to archive file
- **Metrics**: Retain all-time metrics for trend analysis

## Automation Notes

For agents maintaining the regression register:

### Automated Updates

Agents SHOULD automatically:

1. **Add new regressions** when regression tests fail
2. **Update MTTD** when regression detected
3. **Update status** when fixes merged/deployed
4. **Update MTTR** when fix verified
5. **Move to Resolved** when verified
6. **Recalculate metrics** on each update
7. **Trigger alerts** when thresholds exceeded

### Manual Reviews Required

Humans MUST review:

1. **Severity assignment** - Agent can suggest, human confirms
2. **Root cause analysis** - Requires investigation
3. **Deferral decisions** - Business priority judgment
4. **Trend interpretation** - Context-dependent analysis
5. **Process improvements** - Strategic decisions

### Integration Points

- Test execution results (automated test failures)
- Defect tracking system (DEF-{id} cards)
- Code repository (PRs, commits, deployment dates)
- Production monitoring (alerting, metrics)
- Regression test suites (TS-REG-{id})

## Checklist: Register Health

Monthly register review checklist:

- [ ] All active regressions have assigned owners
- [ ] All regressions have accurate MTTD and status
- [ ] No stale regressions (>30 days in Active without update)
- [ ] Metrics calculated correctly
- [ ] Trends reviewed and documented
- [ ] Alerts addressed or escalated
- [ ] Recently Resolved cleaned (only last 30 days)
- [ ] High-regression components flagged for review
- [ ] Root cause patterns identified
- [ ] Process improvements proposed based on patterns

Register is healthy when all checklist items pass.
