# DORA Metrics Quickstart Guide

## Purpose

Rapid implementation guide for the four DORA metrics: Deployment Frequency, Lead Time for Changes, Change Failure Rate, and Mean Time to Recovery.

**Target Audience**: DevOps Engineers, Build Engineers, Metrics Analysts

**Timeline**: 1-2 weeks to implement basic collection

**Outcome**: Baseline metrics, automated collection, initial dashboards

---

## Overview

DORA (DevOps Research and Assessment) research identifies 4 metrics that predict high-performing software teams:

1. **Deployment Frequency**: How often you deploy to production
2. **Lead Time for Changes**: Time from commit to production
3. **Change Failure Rate**: % of deployments causing failures
4. **Mean Time to Recovery (MTTR)**: Time to restore service after incident

**Why These 4**: Proven correlation with business outcomes (profitability, productivity, customer satisfaction)

**Source**: Annual State of DevOps Reports (Google Cloud, DORA team)

---

## Performance Benchmarks

| Metric | Elite | High | Medium | Low |
|--------|-------|------|--------|-----|
| Deployment Frequency | Multiple/day | Daily-weekly | Weekly-monthly | < Monthly |
| Lead Time for Changes | < 1 hour | 1 day - 1 week | 1 week - 1 month | > 1 month |
| Change Failure Rate | 0-15% | 16-30% | 31-45% | > 45% |
| MTTR | < 1 hour | 1 hour - 1 day | 1 day - 1 week | > 1 week |

**Goal**: Move from your current level to the next higher level in 3-6 months

---

## Quickstart Steps

### Step 1: Establish Baselines (Week 1)

**Objective**: Measure current state before implementing automation

**Tasks**:

1. **Manual Data Collection** (spend 2 hours):
   - Count deployments in last 30 days (check CI/CD logs, deployment tracker)
   - Sample 10 recent PRs, calculate average time from commit to deploy
   - Count deployment failures (rollbacks, hotfixes, incidents)
   - Calculate average incident resolution time from last 5 incidents

2. **Document Baseline**:

```markdown
## DORA Baseline (2025-10-15)

| Metric | Current Value | Performance Level |
|--------|--------------|-------------------|
| Deployment Frequency | 8 per month | Medium (weekly-monthly) |
| Lead Time | 5 days | Medium (1 week - 1 month) |
| Change Failure Rate | 25% | High (16-30%) |
| MTTR | 4 hours | High (1 hour - 1 day) |

**Target for Q1 2026**: Move Deployment Frequency to "High" (daily-weekly)
```

3. **Identify Data Sources**:
   - Where are deployment logs? (GitHub Actions, Jenkins, GitLab CI)
   - Where are commits tracked? (GitHub, GitLab)
   - Where are incidents tracked? (Jira, PagerDuty, Opsgenie)

---

### Step 2: Implement Collection Scripts (Week 1-2)

**Objective**: Automate data collection for 4 metrics

#### Script 1: Deployment Frequency

**GitHub Actions Example**:

```bash
#!/bin/bash
# deployment-frequency.sh
# Run daily via cron: 0 9 * * *

REPO="owner/repo"
START_DATE=$(date -d '30 days ago' +%Y-%m-%d)

# Count production deployments in last 30 days
DEPLOY_COUNT=$(gh api "repos/$REPO/deployments" \
  --jq "[.[] | select(.environment == \"production\" and .created_at > \"$START_DATE\")] | length")

echo "{\"date\": \"$(date +%Y-%m-%d)\", \"deployment_count_30d\": $DEPLOY_COUNT}" | \
  curl -X POST https://your-metrics-api.com/dora/deployments \
    -H "Content-Type: application/json" \
    -d @-

echo "Deployment Frequency: $DEPLOY_COUNT deployments in last 30 days"
```

**Deployment to Metrics Database**:

```sql
CREATE TABLE dora_deployments (
  date DATE PRIMARY KEY,
  deployment_count_30d INT,
  deployment_frequency_per_week DECIMAL
);

INSERT INTO dora_deployments (date, deployment_count_30d, deployment_frequency_per_week)
VALUES ('2025-10-15', 8, 2.0);
```

#### Script 2: Lead Time for Changes

**Python Example** (GitHub API):

```python
#!/usr/bin/env python3
# lead-time.py
# Run daily via cron

import requests
from datetime import datetime, timedelta
import statistics

GITHUB_TOKEN = "ghp_xxxxx"
REPO = "owner/repo"

headers = {"Authorization": f"token {GITHUB_TOKEN}"}

# Get merged PRs from last 7 days
since = (datetime.now() - timedelta(days=7)).isoformat()
url = f"https://api.github.com/repos/{REPO}/pulls?state=closed&since={since}"

prs = requests.get(url, headers=headers).json()
lead_times = []

for pr in prs:
    if not pr.get('merged_at'):
        continue

    # Get first commit time
    commits_url = pr['commits_url']
    commits = requests.get(commits_url, headers=headers).json()
    first_commit_time = datetime.fromisoformat(commits[0]['commit']['author']['date'].rstrip('Z'))

    # Get merge time (proxy for deploy time)
    merge_time = datetime.fromisoformat(pr['merged_at'].rstrip('Z'))

    lead_time_hours = (merge_time - first_commit_time).total_seconds() / 3600
    lead_times.append(lead_time_hours)

if lead_times:
    avg_lead_time = statistics.mean(lead_times)
    median_lead_time = statistics.median(lead_times)
    p95_lead_time = statistics.quantiles(lead_times, n=20)[18]  # 95th percentile

    print(f"Average Lead Time: {avg_lead_time:.1f} hours")
    print(f"Median Lead Time: {median_lead_time:.1f} hours")
    print(f"P95 Lead Time: {p95_lead_time:.1f} hours")

    # Store in database or send to metrics API
else:
    print("No merged PRs in last 7 days")
```

#### Script 3: Change Failure Rate

**SQL Query** (assuming deployment and incident tracking):

```sql
-- change-failure-rate.sql
-- Run weekly

WITH recent_deployments AS (
  SELECT
    id,
    deployed_at
  FROM deployments
  WHERE environment = 'production'
    AND deployed_at >= CURRENT_DATE - INTERVAL '30 days'
),
failed_deployments AS (
  SELECT DISTINCT d.id
  FROM recent_deployments d
  LEFT JOIN incidents i ON i.deployment_id = d.id
  WHERE i.severity IN ('critical', 'high')
     OR i.caused_by_deployment = true
)
SELECT
  COUNT(d.id) AS total_deployments,
  COUNT(f.id) AS failed_deployments,
  ROUND(100.0 * COUNT(f.id) / COUNT(d.id), 2) AS change_failure_rate
FROM recent_deployments d
LEFT JOIN failed_deployments f ON d.id = f.id;
```

**Manual Tracking** (if no incident system):

```bash
# Create CSV: deployments.csv
date,deployment_id,failed
2025-10-01,deploy-123,no
2025-10-03,deploy-124,yes
2025-10-05,deploy-125,no

# Calculate failure rate
awk -F',' 'NR>1 {total++; if($3=="yes") failed++} END {print "Failure Rate:", (failed/total)*100 "%"}' deployments.csv
```

#### Script 4: MTTR (Mean Time to Recovery)

**SQL Query** (from incident system):

```sql
-- mttr.sql
-- Run weekly

SELECT
  AVG(EXTRACT(EPOCH FROM (resolved_at - detected_at)) / 3600) AS avg_mttr_hours,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY resolved_at - detected_at) AS median_mttr,
  COUNT(*) AS incident_count
FROM incidents
WHERE severity IN ('critical', 'high')
  AND resolved_at IS NOT NULL
  AND detected_at >= CURRENT_DATE - INTERVAL '30 days';
```

**PagerDuty API Example**:

```bash
#!/bin/bash
# mttr-pagerduty.sh

PAGERDUTY_TOKEN="xxxxx"
SINCE=$(date -d '30 days ago' -Iseconds)

curl -H "Authorization: Token token=$PAGERDUTY_TOKEN" \
  -H "Accept: application/vnd.pagerduty+json;version=2" \
  "https://api.pagerduty.com/incidents?since=$SINCE&statuses[]=resolved" | \
  jq '.incidents[] | {
    created_at,
    resolved_at,
    duration_seconds: (((.resolved_at | fromdateiso8601) - (.created_at | fromdateiso8601)))
  }' | \
  jq -s 'map(.duration_seconds) | add / length / 3600'
```

---

### Step 3: Store Metrics (Week 2)

**Option A: Simple Time-Series Database (InfluxDB)**

```bash
# Install InfluxDB
docker run -d -p 8086:8086 influxdb:2.0

# Create bucket
influx bucket create -n dora_metrics

# Write metrics
influx write -b dora_metrics \
  "deployment_frequency,team=platform count=8 $(date +%s)000000000"

influx write -b dora_metrics \
  "lead_time_hours,team=platform avg=120 $(date +%s)000000000"

influx write -b dora_metrics \
  "change_failure_rate,team=platform percent=25 $(date +%s)000000000"

influx write -b dora_metrics \
  "mttr_hours,team=platform avg=4 $(date +%s)000000000"
```

**Option B: Simple PostgreSQL Table**

```sql
CREATE TABLE dora_metrics (
  id SERIAL PRIMARY KEY,
  metric_name VARCHAR(50) NOT NULL,
  metric_value DECIMAL NOT NULL,
  team VARCHAR(50),
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- Insert metrics
INSERT INTO dora_metrics (metric_name, metric_value, team)
VALUES
  ('deployment_frequency_30d', 8, 'platform'),
  ('lead_time_hours_avg', 120, 'platform'),
  ('change_failure_rate_pct', 25, 'platform'),
  ('mttr_hours_avg', 4, 'platform');
```

**Option C: CSV Files (Simplest)**

```bash
# Create metrics CSV
echo "date,deployment_frequency,lead_time_hours,change_failure_rate,mttr_hours" > dora_metrics.csv
echo "2025-10-15,8,120,25,4" >> dora_metrics.csv
```

---

### Step 4: Create Dashboard (Week 2)

**Option A: Grafana + InfluxDB**

```yaml
# grafana-dashboard.json (simplified)
{
  "dashboard": {
    "title": "DORA Metrics",
    "panels": [
      {
        "title": "Deployment Frequency (30d)",
        "targets": [{"query": "from(bucket:\"dora_metrics\") |> range(start: -30d) |> filter(fn: (r) => r._measurement == \"deployment_frequency\")"}]
      },
      {
        "title": "Lead Time (Average Hours)",
        "targets": [{"query": "from(bucket:\"dora_metrics\") |> range(start: -30d) |> filter(fn: (r) => r._measurement == \"lead_time_hours\")"}]
      },
      {
        "title": "Change Failure Rate (%)",
        "targets": [{"query": "from(bucket:\"dora_metrics\") |> range(start: -30d) |> filter(fn: (r) => r._measurement == \"change_failure_rate\")"}]
      },
      {
        "title": "MTTR (Average Hours)",
        "targets": [{"query": "from(bucket:\"dora_metrics\") |> range(start: -30d) |> filter(fn: (r) => r._measurement == \"mttr_hours\")"}]
      }
    ]
  }
}
```

**Option B: Google Sheets (No Infrastructure)**

1. Store metrics in Google Sheets (manually or via Google Sheets API)
2. Create charts for each metric
3. Share dashboard link with team

**Option C: Simple HTML Dashboard**

```html
<!DOCTYPE html>
<html>
<head>
  <title>DORA Metrics Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
  <h1>DORA Metrics</h1>
  <canvas id="doraChart" width="800" height="400"></canvas>
  <script>
    const ctx = document.getElementById('doraChart').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Deploy Freq (30d)', 'Lead Time (hrs)', 'Change Fail %', 'MTTR (hrs)'],
        datasets: [{
          label: 'Current',
          data: [8, 120, 25, 4],
          backgroundColor: ['#3498db', '#e74c3c', '#f39c12', '#2ecc71']
        }]
      }
    });
  </script>
</body>
</html>
```

---

### Step 5: Weekly Review (Ongoing)

**Objective**: Track trends, identify improvements

**Weekly Review Agenda** (15 minutes):

1. **Compare to Baseline**:
   - Deployment Frequency: Increasing? (target: weekly → daily)
   - Lead Time: Decreasing? (target: < 1 day)
   - Change Failure Rate: Stable or decreasing? (target: < 15%)
   - MTTR: Decreasing? (target: < 1 hour)

2. **Identify Blockers**:
   - Low Deployment Frequency: Manual approval gates? Slow tests?
   - High Lead Time: Code review bottleneck? Slow CI/CD?
   - High Change Failure Rate: Insufficient testing? Rushing?
   - High MTTR: Poor monitoring? Unclear runbooks?

3. **Action Items**:
   - Pick 1 metric to improve this week
   - Assign owner
   - Track in next week's review

---

## Common Issues and Solutions

### Issue 1: Missing Data Sources

**Problem**: Don't have deployment tracking or incident system

**Solution**:

- Start manual tracking (CSV or spreadsheet)
- Tag production deployments in Git (e.g., `git tag prod-2025-10-15`)
- Use Jira or GitHub Issues for incident tracking
- Implement proper tooling incrementally

### Issue 2: High Lead Time

**Problem**: Takes 5+ days from commit to deploy

**Root Causes**:

- Manual approval gates → Automate approvals or reduce gates
- Slow CI/CD pipeline → Parallelize tests, optimize builds
- Code review bottleneck → Add reviewers, reduce PR size
- Infrequent deployments → Increase deployment frequency

**Quick Win**: Deploy main branch automatically after tests pass (remove manual gate)

### Issue 3: High Change Failure Rate

**Problem**: 30%+ deployments fail

**Root Causes**:

- Insufficient testing → Increase test coverage (target: 80%+)
- Prod-staging mismatch → Make staging identical to prod
- Configuration errors → Validate config in CI
- Large deploys → Deploy smaller, more frequent changes

**Quick Win**: Add smoke tests that run post-deployment

### Issue 4: High MTTR

**Problem**: Takes 4+ hours to resolve incidents

**Root Causes**:

- Slow detection → Add health checks, alerting
- Unclear ownership → Define on-call rotation, escalation
- Poor observability → Add logging, tracing, metrics
- No rollback plan → Automate rollback, feature flags

**Quick Win**: Implement one-click rollback

---

## Improvement Roadmap

### Month 1: Establish Baseline

- Implement collection scripts
- Create dashboard
- Document current state

### Month 2-3: Low-Hanging Fruit

- Increase deployment frequency (remove manual gates)
- Reduce lead time (parallelize CI, smaller PRs)
- Reduce MTTR (add monitoring, runbooks)

### Month 4-6: Process Changes

- Shift testing left (pre-commit hooks, fast tests)
- Improve code review process (pair programming, mob reviews)
- Implement feature flags (decouple deploy from release)
- Add chaos testing (proactively find issues)

### Month 7-12: Cultural Changes

- Blameless postmortems (learn from failures)
- Error budgets (balance speed and reliability)
- Continuous improvement (regular retrospectives)
- Team autonomy (empower teams to improve metrics)

---

## Success Criteria

**After 1 Week**:

- Baseline established
- Automated collection running
- Dashboard visible to team

**After 1 Month**:

- Metrics reviewed weekly
- 1 metric shows improvement

**After 3 Months**:

- Moved 1 level up on 2+ metrics (e.g., Medium → High)
- Team uses metrics to drive decisions

**After 6 Months**:

- Deployment Frequency: High or Elite
- Lead Time: High or Elite
- Change Failure Rate: < 20%
- MTTR: < 2 hours

---

## Resources

**DORA Research**:

- State of DevOps Reports: https://dora.dev/research/
- DORA Metrics Calculator: https://cloud.google.com/blog/products/devops-sre/using-the-four-keys-to-measure-your-devops-performance

**Tools**:

- Four Keys (Open Source DORA Metrics): https://github.com/GoogleCloudPlatform/fourkeys
- Sleuth (Commercial DORA Tracking): https://www.sleuth.io/
- LinearB (Commercial): https://linearb.io/

**Books**:

- "Accelerate" by Nicole Forsgren, Jez Humble, Gene Kim
- "The DevOps Handbook" by Gene Kim, Jez Humble, Patrick Debois
- "Site Reliability Engineering" (Google SRE Book)

---

## Conclusion

DORA metrics are the industry-standard way to measure software delivery performance. Start simple (manual baseline), automate incrementally, and use metrics to drive continuous improvement.

**Key Takeaways**:

1. Start with baseline (manual is fine)
2. Automate collection incrementally
3. Review weekly, improve continuously
4. Focus on one metric at a time
5. Celebrate improvements, learn from setbacks

**Remember**: The goal is not perfect metrics. The goal is continuous improvement.
