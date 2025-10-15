# Status Assessment Template

## Purpose

Provide a concise snapshot of project health at regular intervals, highlighting progress, risks, and required decisions.

## Ownership & Collaboration

- Document Owner: Project Manager
- Contributor Roles: System Analyst, Test Architect
- Automation Inputs: Progress metrics, risk updates, change log
- Automation Outputs: `status-assessment.md` covering sections 1-10

## Completion Checklist

- Progress against plan quantified and contextualized
- Top risks, issues, and change requests summarized with owners
- Decision requests clearly articulated for stakeholders
- Trends analyzed (not just point-in-time snapshots)
- RAG status indicators applied consistently

## Document Sections

1. **Reporting Period**
   - Dates covered, iteration or milestone name, report author.

2. **Overall Status**
   - Traffic-light assessment (Green/Yellow/Red) with rationale.

**RAG (Red/Amber/Green) Status Indicators**:

| Status | Symbol | Meaning | Action |
|--------|--------|---------|--------|
| Green | 🟢 | On track, no issues | Continue monitoring |
| Yellow | 🟡 | Caution, potential issues | Monitor closely, prepare mitigation |
| Red | 🔴 | Critical issues, off track | Immediate action required |

**Overall Status Criteria**:

- **Green**: All key metrics on target, no critical risks, schedule on track
- **Yellow**: 1-2 metrics off target OR 1 high risk OR minor schedule slip (< 1 week)
- **Red**: 3+ metrics off target OR critical risk OR major schedule slip (> 1 week)

3. **Summary of Progress**
   - Achievements, completed tasks, and deliverables produced.

**Format**: Use bullet points with completion indicators

**Example**:

- ✓ Completed 12 of 15 planned stories (80%)
- ✓ Deployed to staging environment successfully
- ✓ Architecture spike: Database sharding strategy validated
- ⚠ Integration testing delayed (waiting for API keys)
- ✗ User onboarding flow incomplete (blocked by design review)

4. **Schedule and Effort Metrics**

### 4.1 Velocity Trend

| Iteration | Planned | Completed | Variance | Status |
|-----------|---------|-----------|----------|--------|
| Iter-1 | 40 pts | 32 pts | -20% | 🔴 |
| Iter-2 | 40 pts | 38 pts | -5% | 🟡 |
| **Iter-3** (current) | **40 pts** | **42 pts** | **+5%** | 🟢 |

**Trend**: Improving ✓ (32 → 38 → 42)

**Sparkline**: `▃▅█` (last 3 iterations)

**Average (last 3)**: 37 pts

**Prediction (next iter)**: 40 pts ±10%

**Analysis**: Velocity stabilized after Iter-1 estimation issues. Team now calibrated.

### 4.2 Effort Tracking

| Category | Planned (hrs) | Actual (hrs) | Variance | Status |
|----------|---------------|--------------|----------|--------|
| Development | 80 | 85 | +6% | 🟢 |
| Testing | 30 | 25 | -17% | 🟢 |
| Support | 10 | 20 | +100% | 🔴 |

**Alert**: Support effort doubled - investigate support ticket spike

**Action**: Review support backlog, identify recurring issues

### 4.3 Key Delivery Metrics

| Metric | Current | Target | Trend | Status |
|--------|---------|--------|-------|--------|
| Deployment Frequency | 5/week | 3/week | ↗ | 🟢 |
| Lead Time | 1.8 days | < 2 days | → | 🟢 |
| WIP Count | 6 | < 8 | ↘ | 🟢 |
| Build Duration | 12 min | < 15 min | ↗ +2min | 🟡 |

**Trends**:

- ↗ Increasing (good if metric should go up)
- ↘ Decreasing (good if metric should go down)
- → Stable
- ⚠ Concerning trend (action needed)

**Note**: Build duration increasing - investigate in build optimization session

5. **Quality Metrics**

### 5.1 Defect Trend

| Week | New | Resolved | Open | Net Change | Trend |
|------|-----|----------|------|------------|-------|
| Week 1 | 5 | 3 | 12 | +2 | ↗ |
| Week 2 | 8 | 6 | 14 | +2 | ↗ |
| **Week 3** | **4** | **7** | **11** | **-3** | ↘ ✓ |

**Trend**: Decreasing ✓ (backlog shrinking)

**Sparkline**: `▃▅█▇` (open defects over last 4 weeks)

**Threshold Alert**: None (< 15 open defects threshold)

**Defect Aging**:

- 0-3 days: 6 defects (fresh)
- 4-7 days: 3 defects (aging)
- 8-14 days: 2 defects (stale) ⚠

**Action**: Triage 2 stale defects in next planning meeting

### 5.2 Test Coverage Trend

```
Coverage: 85% ████████░░ ↑ +3% from last week ✓
```

**Sparkline**: `▃▅▆█` (increasing over last 4 weeks)

**Target**: > 80% ✓

**Alert**: None

### 5.3 Build Health

| Metric | Current | Target | Trend | Status |
|--------|---------|--------|-------|--------|
| Build Success Rate | 94% | > 90% | → | 🟢 |
| Avg Build Duration | 12 min | < 15 min | ↗ +2min | 🟡 |
| Change Failure Rate | 12% | < 15% | ↘ | 🟢 |
| Test Execution Time | 8 min | < 10 min | → | 🟢 |

**Quality Gate Status**: PASSING ✓

**Note**: Build duration creeping up - schedule optimization session

### 5.4 Code Quality

| Metric | Current | Target | Trend | Status |
|--------|---------|--------|-------|--------|
| Technical Debt Ratio | 4.2% | < 5% | ↘ | 🟢 |
| Code Duplication | 3.1% | < 5% | → | 🟢 |
| Avg Cyclomatic Complexity | 8.5 | < 10 | ↘ | 🟢 |

**Analysis**: Code quality stable, technical debt decreasing

6. **Risks and Issues**
   - Table listing ID, description, impact, owner, and status.

| ID | Type | Description | Impact | Trend | Owner | Status |
|----|------|-------------|--------|-------|-------|--------|
| R-001 | Risk | API vendor may deprecate endpoint | High | → | Tech Lead | Monitoring |
| R-002 | Risk | Team member leaving in 4 weeks | Medium | ⚠ | Manager | Mitigation planned |
| I-003 | Issue | Database performance degrading | High | ↗ | DevOps | In progress |
| I-004 | Issue | Flaky integration tests | Medium | ↘ | QA Lead | 60% resolved |

**Risk Trend**:

- Total risks: 2 (stable)
- Critical: 0
- High: 2 (R-001, I-003)
- Medium: 2 (R-002, I-004)

**Action Items**:

- R-002: Begin knowledge transfer, identify backup
- I-003: Database optimization sprint scheduled for next iteration

7. **Change Requests**
   - List pending or approved scope changes with impact assessment.

| ID | Description | Impact | Status | Decision Date |
|----|-------------|--------|--------|---------------|
| CR-001 | Add OAuth provider support | +3 weeks | Approved | 2025-10-10 |
| CR-002 | Change UI framework | +6 weeks | Pending | TBD |
| CR-003 | Remove deprecated API | -1 week | Approved | 2025-10-12 |

**Net Schedule Impact**: +2 weeks (CR-001 + CR-003 approved)

8. **Upcoming Work**
   - Preview next iteration goals or key tasks.

**Next Iteration Goals** (Iteration 4, 2025-10-20 to 2025-11-03):

- Complete user onboarding flow (blocked item from current iteration)
- Implement OAuth provider support (CR-001)
- Address database performance (I-003)
- Continue feature development (8 stories planned)

**Dependencies**:

- Design review for onboarding flow (scheduled 2025-10-18)
- Database migration approval (pending DBA review)

9. **Decisions Needed**
   - Explicitly state decisions or escalations required, with due dates.

| Decision | Options | Recommendation | Owner | Due Date |
|----------|---------|----------------|-------|----------|
| UI Framework Change (CR-002) | A) Approve (+6 weeks), B) Reject | Reject (timeline impact too high) | Steering Committee | 2025-10-20 |
| Database Migration Timing | A) This iteration, B) Next iteration | This iteration (performance critical) | Tech Lead | 2025-10-18 |
| Staffing Backup (R-002) | A) Hire contractor, B) Reallocate internal | TBD (need cost analysis) | Manager | 2025-10-25 |

10. **Notes and Attachments**
    - Link to supporting artifacts, dashboards, or detailed reports.

**Dashboards**:

- [Project Metrics Dashboard](https://grafana.example.com/dashboard/project-metrics)
- [DORA Metrics](https://grafana.example.com/dashboard/dora)
- [Quality Gates](https://sonar.example.com/dashboard?id=project)

**Related Artifacts**:

- [Iteration Plan (Iter-3)](./iteration-plan-iter3.md)
- [Risk List](./risk-list.md)
- [Measurement Plan](./measurement-plan.md)

**Next Status Assessment**: 2025-10-22 (weekly)

## Agent Notes

- Keep report concise—use tables and bullet lists for quick consumption.
- Maintain consistent risk/issue IDs with the central logs.
- Highlight variances early to enable timely corrective actions.
- Always include trend indicators (↗↘→) not just current values.
- Use sparklines or mini-charts to visualize trends when possible.
- Apply RAG status consistently across all metrics.
- Link to dashboards for real-time metric access.
- Flag metrics approaching thresholds (yellow status) proactively.
- Provide context for anomalies (why did velocity drop? why did defects spike?).
- Verify the Automation Outputs entry is satisfied before signaling completion.
