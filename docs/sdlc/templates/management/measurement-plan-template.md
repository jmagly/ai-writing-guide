# Measurement Plan Template

## Purpose

Define the metrics, collection methods, and reporting cadence used to monitor project health and product quality.

## Ownership & Collaboration

- Document Owner: Project Manager
- Contributor Roles: Test Architect, System Analyst, Configuration Manager
- Automation Inputs: Metric definitions, data sources, reporting cadence
- Automation Outputs: `measurement-plan.md` including inventory table

## Completion Checklist

- Metrics mapped to project objectives and risks
- Data collection methods and tools specified
- Reporting cadence and stakeholders defined
- Automation strategy documented
- Alerting thresholds established

## Document Sections

1. **Measurement Objectives**
   - State why measurement is necessary and which decisions it supports.

2. **Metric Inventory**
   - List metrics with definitions, formulas, and targets.

| Metric | Purpose | Data Source | Frequency | Target/Threshold | Owner |
| --- | --- | --- | --- | --- | --- |
| Example Metric | Explain why it matters. | Tool or artifact. | Weekly | Target value. | Person/role. |

3. **Data Collection Process**
   - Describe how data is gathered, validated, and stored.

### 3.1 Collection Method

For each metric, specify:

- **Manual or Automated**: Prefer automated (see `metrics-collection-automation.md` if available)
- **Data Source**: API, database, log files, analytics tool
- **Collection Frequency**: Real-time, per event, hourly, daily, weekly
- **Responsible System/Person**: Who/what collects the data

### 3.2 Automation Strategy

**Recommended**: Automate 90%+ of metric collection

**Automation Options**:

- **CI/CD Pipeline**: Metrics pushed during build/deploy (build duration, test results)
- **Scheduled Jobs**: Cron or Kubernetes CronJob queries APIs (Jira velocity, GitHub stats)
- **Event-Driven**: Webhooks trigger metric collection (deployment events, user signups)
- **Streaming**: Real-time event processing (user activity, system performance)

**Example Automation**:

```python
# Daily Jira velocity collection
# Runs via cron: 0 9 * * *
def collect_jira_velocity():
    jira = JIRA(server=JIRA_URL, token_auth=JIRA_TOKEN)
    sprint = jira.sprints(board_id, state='active')[0]
    velocity = calculate_velocity(sprint)
    push_to_influxdb('jira_metrics', {'velocity': velocity})
```

**Reference**: See `docs/sdlc/metrics/` catalogs for detailed integration examples

### 3.3 Data Validation

Validate metrics before storing to catch anomalies:

| Validation Type | Example | Action if Failed |
|-----------------|---------|------------------|
| Range Check | Velocity 0-200 | Alert + store with flag |
| Logic Check | DAU ≤ MAU | Alert + investigate |
| Trend Check | No 50%+ single-day change | Alert + confirm source |

### 3.4 Data Storage

**Time-Series Metrics** (most SDLC metrics):

- Tool: InfluxDB, Prometheus, CloudWatch
- Retention: 1 year for tactical metrics, 3+ years for strategic

**Event-Level Data** (audit trail):

- Tool: PostgreSQL, MySQL, data warehouse
- Retention: 3-7 years for compliance

**Dashboard Data**:

- Tool: Grafana, Tableau, Looker
- Source: Query time-series or relational database

4. **Reporting and Visualization**

### 4.1 Dashboard Strategy

**Principle**: Different audiences need different views

| Audience | Metrics | Update Frequency | Format |
|----------|---------|------------------|--------|
| Team (Daily) | Velocity, WIP, build status, deployment frequency | Real-time | Grafana dashboard, CI/CD status board |
| Stakeholders (Weekly) | Velocity trend, quality metrics, risk status | Daily refresh | Status assessment report |
| Executives (Monthly) | Product metrics, ROI, milestone progress | Weekly refresh | Executive summary dashboard |

### 4.2 Dashboard Layout

**Recommended Structure**:

```
┌─────────────────────────────────────────────────┐
│               PROJECT DASHBOARD                  │
├─────────────────────────────────────────────────┤
│  Overall Status: GREEN                           │
│  Last Updated: 2025-10-15 14:30 UTC              │
├──────────────────┬──────────────────────────────┤
│  DELIVERY        │  QUALITY                     │
├──────────────────┼──────────────────────────────┤
│  Velocity: 38    │  Test Coverage: 84%          │
│  Target: 35 ✓    │  Target: 80% ✓               │
│  Trend: ↗        │  Trend: ↗                    │
│                  │                              │
│  Deploy Freq:    │  Defect Rate:                │
│  5/week ✓        │  8% ✓                        │
├──────────────────┼──────────────────────────────┤
│  PRODUCT         │  RISKS                       │
├──────────────────┼──────────────────────────────┤
│  DAU/MAU: 28%    │  Critical: 0                 │
│  Target: > 20% ✓ │  High: 2                     │
│                  │  Trend: Decreasing ✓         │
│  NPS: 42 (Good)  │                              │
└──────────────────┴──────────────────────────────┘
```

### 4.3 Visualization Best Practices

**Trends over Snapshots**: Show sparklines (last 7 data points) not just current value

**Thresholds**: Use color coding (green, yellow, red) based on thresholds

**Context**: Include target/threshold alongside current value

**Actionability**: Link metrics to actions ("Velocity dropped 30% → Review WIP limits")

### 4.4 Report Distribution

**Daily**:

- Team dashboard (auto-refresh)
- Build/deploy status (Slack notifications)

**Weekly**:

- Status Assessment report (email to stakeholders)
- Iteration metrics summary (stand-up/demo)

**Monthly**:

- Iteration Assessment (includes metrics section)
- Executive dashboard (business metrics + delivery health)

### 4.5 Tooling Recommendations

| Use Case | Tool | Pros | Cons |
|----------|------|------|------|
| Time-series visualization | Grafana | Free, powerful, integrates with InfluxDB/Prometheus | Steep learning curve |
| Business intelligence | Tableau | Executive-friendly, drag-drop | Expensive |
| Lightweight BI | Metabase | Open-source, easy setup | Limited advanced features |
| Custom dashboards | React + Recharts | Full control | Requires development |

**Reference**: See example dashboards in `delivery-metrics-catalog.md` and `product-metrics-catalog.md`

5. **Roles and Responsibilities**
   - Define who collects, analyzes, and acts on metrics.

| Role | Responsibilities |
|------|------------------|
| Metrics Analyst | Define metrics, build collection scripts, generate reports |
| Project Manager | Review metrics weekly, escalate anomalies, track action items |
| Test Architect | Define quality metrics, set coverage targets |
| DevOps Engineer | Implement CI/CD metrics collection, maintain monitoring |
| Product Strategist | Define product metrics, track user engagement |
| Team Members | Provide context for metric anomalies, implement improvements |

6. **Review Cadence**
   - Specify when metrics are reviewed (stand-ups, demos, governance boards).

| Cadence | Audience | Metrics Reviewed | Format |
|---------|----------|------------------|--------|
| Daily | Team | WIP, build status, deployment frequency | Standup dashboard review |
| Weekly | Team + Stakeholders | Velocity, quality, risks | Status assessment |
| Monthly | Executives | Product metrics, ROI, milestones | Iteration assessment |
| Quarterly | Leadership | Strategic metrics, DORA benchmarks | Roadmap planning |

7. **Continuous Improvement**
   - Outline how metrics will be refined or retired.

**Metric Review Process**:

- **Quarterly**: Review metric inventory for relevance
- **Retire**: Metrics no longer informing decisions
- **Add**: New metrics for emerging risks or objectives
- **Refine**: Adjust thresholds based on team maturity

**Improvement Triggers**:

- Metric anomaly: Investigate root cause, update process
- Metric target missed: Adjust threshold or improve process
- Metric no longer reviewed: Candidate for retirement

8. **Alerting and Thresholds**

**Objective**: Define when metrics trigger action, not just passive observation

### 8.1 Threshold Levels

| Level | Color | Meaning | Response |
|-------|-------|---------|----------|
| Green | 🟢 | Healthy | Continue monitoring |
| Yellow | 🟡 | Caution | Investigate, prepare action |
| Red | 🔴 | Alert | Immediate action required |

### 8.2 Threshold Matrix

| Metric | Green (Good) | Yellow (Caution) | Red (Alert) | Action Owner |
|--------|--------------|------------------|-------------|--------------|
| Velocity variance | ±10% | ±10-20% | > ±20% | Project Manager: Review estimation |
| Defect escape rate | < 5% | 5-10% | > 10% | Test Architect: Increase coverage |
| Build duration | < 10 min | 10-15 min | > 15 min | Build Engineer: Optimize pipeline |
| Deployment success rate | > 95% | 90-95% | < 90% | Deployment Manager: Investigate failures |
| SLO compliance | > 99.9% | 99-99.9% | < 99% | Reliability Engineer: Page on-call |
| Change failure rate | < 15% | 15-25% | > 25% | DevOps Engineer: Review deploy process |
| WIP count | < limit | At limit | > limit | Project Manager: Finish work, don't start new |

### 8.3 Automated Alert Configuration

**Immediate Alerts** (real-time):

- SLO breach (< 99%)
- Production deployment failure
- Critical defect opened

**Daily Digest** (morning):

- Build duration trend (if > 20% increase in 7 days)
- WIP exceeds limit for 2+ days
- Code review queue > 5 PRs

**Weekly Report**:

- Velocity variance > 20%
- Defect escape rate trend (if increasing 2 consecutive weeks)
- Test coverage dropped below 80%

### 8.4 Alert Delivery

| Urgency | Channel | Recipients |
|---------|---------|------------|
| Critical (Red, production-impacting) | PagerDuty | On-call engineer, incident commander |
| High (Red, non-production) | Slack #alerts | Team channel, Project Manager |
| Medium (Yellow) | Email | Daily digest to team |
| Low (Green trending yellow) | Dashboard | Passive monitoring |

### 8.5 Alert Fatigue Prevention

**Rules**:

1. **Deduplication**: Group similar alerts
2. **Quiet Hours**: No non-critical alerts outside business hours
3. **Escalation**: If alert not acknowledged in 15 min, escalate
4. **Tuning**: Review alert false positive rate monthly, adjust thresholds
5. **Retirement**: Disable alerts that haven't fired in 90 days

**Target**: < 5% false positive rate on alerts

9. **Risks and Assumptions**
   - Capture measurement risks (data quality, tooling limits) and mitigation plans.

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data source unavailable | Metrics gaps | Multiple collection methods, cached data |
| Metric gaming (inflating values) | False sense of health | Cross-validate metrics, audit sample |
| Tool limitations | Missing data | Manual fallback process |
| Team doesn't review metrics | Metrics waste | Embed in rituals (standup, demo) |
| Alert fatigue | Ignored alerts | Tune thresholds, reduce noise |

## Appendix A: Starter Metrics Catalog

**Purpose**: Pre-defined metrics teams can adopt immediately

**Usage**: Select 5-7 metrics appropriate to project phase and objectives

### Inception Phase

Focus: Validate feasibility and planning assumptions

| Metric | Purpose | Data Source | Frequency | Target | Owner |
|--------|---------|-------------|-----------|--------|-------|
| Risk Identification Rate | Ensure comprehensive risk capture | Risk list | Weekly | Plateau by end Inception | Project Manager |
| Stakeholder Alignment Score | Confirm shared vision | Vision review feedback | After each review | 90% agreement | Vision Owner |
| Estimation Accuracy | Validate initial estimates | Iteration plan vs actual | Per iteration | ±30% (calibrating) | Project Manager |

### Elaboration Phase

Focus: Validate architecture and refine estimates

| Metric | Purpose | Data Source | Frequency | Target | Owner |
|--------|---------|-------------|-----------|--------|-------|
| Velocity (Baseline) | Establish delivery rate | Jira/Linear | Per iteration | Stable for 3 iterations | Project Manager |
| Architecture Coverage | Ensure significant scenarios addressed | Use case realization count | Per iteration | 100% by end Elaboration | Architecture Designer |
| Technical Debt Ratio | Monitor architecture quality | Static analysis | Weekly | < 5% | Build Engineer |
| Defect Discovery Rate | Validate quality processes | Defect tracking | Per iteration | < 5 defects per story | Test Architect |

### Construction Phase

Focus: Deliver features and maintain quality

| Metric | Purpose | Data Source | Frequency | Target | Owner |
|--------|---------|-------------|-----------|--------|-------|
| Deployment Frequency | Track delivery capability | CI/CD logs | Daily | ≥ 1 per week | DevOps Engineer |
| Lead Time for Changes | Measure pipeline efficiency | Git + CI/CD | Per deploy | < 2 days | DevOps Engineer |
| Change Failure Rate | Measure release quality | Deploys + incidents | Per deploy | < 15% | Deployment Manager |
| Velocity | Predict capacity | Jira/Linear | Per iteration | ±10% variance | Project Manager |
| Test Coverage | Ensure quality | Coverage tool | Per commit | ≥ 80% | Test Architect |
| Build Duration | Monitor CI health | CI/CD system | Per build | < 15 min | Build Engineer |

### Transition Phase

Focus: Production readiness and user adoption

| Metric | Purpose | Data Source | Frequency | Target | Owner |
|--------|---------|-------------|-----------|--------|-------|
| MTTR | Operational resilience | Incident logs | Per incident | < 1 hour | Reliability Engineer |
| SLO Compliance | Production performance | Monitoring | Continuous | ≥ 99% | Reliability Engineer |
| User Adoption Rate | Rollout success | Analytics | Daily | 80% target users in 30d | Product Strategist |
| NPS | User satisfaction | Survey | Weekly | ≥ 4.0 / 5.0 | Support Lead |
| Churn Rate | User retention | Activity logs | Monthly | < 5% | Product Strategist |

**Selection Guidance**: Choose metrics that:

1. Align with project objectives and risks
2. Are measurable with available data sources
3. Will inform specific decisions
4. Can be collected with reasonable effort (prefer automated)

**Metric Catalog References**:

- Delivery Metrics: `docs/sdlc/metrics/delivery-metrics-catalog.md`
- Product Metrics: `docs/sdlc/metrics/product-metrics-catalog.md`
- Quality Metrics: `docs/sdlc/metrics/quality-metrics-catalog.md`
- Operational Metrics: `docs/sdlc/metrics/operational-metrics-catalog.md`
- DORA Quickstart: `docs/sdlc/metrics/dora-metrics-quickstart.md`

## Agent Notes

- Ensure metric definitions align with Status Assessments and Test Strategy.
- Automate data collection whenever possible; link scripts or queries used.
- Revisit metrics when project goals or risks evolve.
- Verify the Automation Outputs entry is satisfied before signaling completion.
- Populate metric inventory from Appendix A or metric catalogs in `docs/sdlc/metrics/`
- Set up automated collection for DORA metrics (see DORA quickstart guide)
- Implement alerting thresholds to enable proactive issue detection
