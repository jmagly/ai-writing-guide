# Delivery Metrics Catalog

## Purpose

Define concrete metrics for tracking software delivery performance, team efficiency, and engineering excellence.

**Scope**: DORA metrics, velocity, flow, and quality-adjusted delivery

**Target Audience**: Project Managers, Build Engineers, DevOps Engineers, Metrics Analysts

**Integration**: Reference this catalog when populating Measurement Plan metric inventory

---

## Overview

Delivery metrics answer: **How efficiently are we shipping value?**

**Categories**:

1. **DORA Metrics** - Industry-standard software delivery performance (4 metrics)
2. **Velocity Metrics** - Predictable capacity and throughput (3 metrics)
3. **Flow Metrics** - Work efficiency and bottleneck identification (3 metrics)

**Philosophy**: Measure outcomes (features delivered) not outputs (lines of code written)

**Critical Balance**: Speed (deployment frequency, lead time) must balance with Quality (change failure rate, defect escape rate)

---

## DORA Metrics

### Background

DORA (DevOps Research and Assessment) research identifies 4 key metrics predicting high-performing software teams:

1. Deployment Frequency
2. Lead Time for Changes
3. Change Failure Rate
4. Mean Time to Recovery (MTTR)

**Source**: Annual State of DevOps Reports (Google Cloud, DORA research team)

**Validation**: Proven correlation with business outcomes (profitability, productivity, customer satisfaction)

**Elite vs Low Performers**: Elite teams deploy **multiple times per day** with **< 1 hour** lead time and **< 15%** change failure rate. Low teams deploy **< once per month** with **> 6 months** lead time and **> 45%** failure rate.

---

### Metric 1: Deployment Frequency

**Definition**: How often code is deployed to production

**Why It Matters**:

- Indicates team's ability to deliver value frequently
- Small, frequent deployments reduce risk
- Faster feedback loop from users

**Data Source**: CI/CD pipeline logs, deployment tracking system

**Collection Method**:

**GitHub Actions**:

```bash
gh api repos/:owner/:repo/deployments \
  --jq '[.[] | select(.environment == "production" and .created_at > (now - 7*86400 | todate))] | length'
```

**CI/CD Log Query**:

```bash
grep "deploy.*production.*success" /var/log/ci.log | wc -l
```

**SQL Example**:

```sql
SELECT COUNT(*)
FROM deployments
WHERE environment = 'production'
  AND deployed_at >= CURRENT_DATE - INTERVAL '7 days'
```

**Formula**: Count production deployments / time period

**Targets (DORA Benchmarks)**:

| Performance Level | Deployment Frequency |
|-------------------|---------------------|
| Elite | Multiple per day |
| High | Once per day to once per week |
| Medium | Once per week to once per month |
| Low | Less than once per month |

**Thresholds for Alerting**:

- Warning: < 1 deployment per week (Construction phase)
- Alert: < 3 deployments per month
- Critical: Deployment frequency drops 50% from baseline

**Recommended Review Cadence**:

- Track: Daily (team dashboard)
- Review: Weekly (iteration planning)
- Analyze: Monthly (process improvements)

**Related Metrics**:

- Deployment success rate (% deployments that succeed)
- Deployment duration (time to execute deployment)
- Rollback frequency (% deployments requiring rollback)

**Agent Automation**:

- Auto-query CI/CD API for deployment counts
- Generate deployment frequency trend charts
- Alert if frequency drops below threshold

---

### Metric 2: Lead Time for Changes

**Definition**: Time from code commit to production deployment

**Why It Matters**:

- Measures efficiency of delivery pipeline
- Long lead times indicate process bottlenecks
- Short lead times enable faster market response

**Data Source**: Version control (Git) + CI/CD logs + deployment tracking

**Collection Method**:

**Python Example**:

```python
from datetime import datetime

def calculate_lead_time(commit_sha, github_api, cicd_api):
    # Get commit time
    commit = github_api.get_commit(commit_sha)
    commit_time = commit['commit']['author']['date']

    # Get deployment time
    deployment = cicd_api.get_deployment_for_commit(commit_sha)
    deploy_time = deployment['deployed_at']

    # Calculate lead time
    lead_time = (deploy_time - commit_time).total_seconds() / 3600
    return lead_time
```

**SQL Example**:

```sql
SELECT
  pr.id,
  d.deployed_at - pr.first_commit_time AS total_lead_time,
  pr.merge_time - pr.first_commit_time AS code_complete_time,
  d.deployed_at - pr.merge_time AS deployment_lag
FROM pull_requests pr
JOIN deployments d ON d.commit_sha = pr.merge_commit_sha
WHERE d.deployed_at > NOW() - INTERVAL '30 days'
ORDER BY total_lead_time DESC
```

**Formula**: Deployment time - Commit time

**Lead Time Components** (for bottleneck analysis):

1. Coding Time: First commit to PR opened
2. Review Time: PR opened to PR approved
3. Merge Lag: PR approved to merged
4. CI/CD Time: Merge to build complete
5. Deployment Time: Build complete to production deploy

**Targets (DORA Benchmarks)**:

| Performance Level | Lead Time |
|-------------------|-----------|
| Elite | Less than 1 hour |
| High | 1 day to 1 week |
| Medium | 1 week to 1 month |
| Low | More than 1 month |

**Thresholds for Alerting**:

- Warning: Lead time > 5 days (Construction phase)
- Alert: Lead time > 10 days
- Investigation: Lead time doubles from baseline

**Recommended Review Cadence**:

- Monitor: Daily (CI/CD dashboard)
- Review: Weekly (identify bottlenecks)
- Trend Analysis: Monthly (process improvements)

**Bottleneck Identification**:

| Stage | Target | Threshold | Common Issues |
|-------|--------|-----------|---------------|
| Code Review | < 4 hours | > 24 hours | Too few reviewers, large PRs |
| CI/CD Pipeline | < 15 min | > 30 min | Slow tests, serial execution |
| Deployment Wait | < 1 hour | > 4 hours | Manual approvals, limited deploy windows |

**Related Metrics**:

- Cycle time (work started to done, different from lead time)
- Code review queue depth (leading indicator)
- Build duration (CI/CD efficiency)

**Agent Automation**:

- Auto-calculate from Git + CI/CD data
- Identify bottleneck stage automatically
- Recommend process improvements

---

### Metric 3: Change Failure Rate

**Definition**: Percentage of production deployments causing failure (requiring rollback, hotfix, or incident)

**Why It Matters**:

- Measures quality of releases
- High failure rate indicates insufficient testing or rushed deployments
- Balances speed (deployment frequency) with quality

**Data Source**: Deployment logs + incident management system

**Collection Method**:

**Python Calculation**:

```python
def calculate_change_failure_rate(deployments, incidents):
    total_deployments = len(deployments)

    failed_deployment_ids = set(
        i['caused_by_deployment_id']
        for i in incidents
        if i['caused_by_deployment_id']
    )
    failed_deployments = len(failed_deployment_ids)

    failure_rate = (failed_deployments / total_deployments) * 100
    return round(failure_rate, 2)
```

**SQL Example**:

```sql
SELECT
  COUNT(DISTINCT d.id) AS total_deployments,
  COUNT(DISTINCT CASE WHEN i.id IS NOT NULL THEN d.id END) AS failed_deployments,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN i.id IS NOT NULL THEN d.id END) / COUNT(DISTINCT d.id), 2) AS failure_rate
FROM deployments d
LEFT JOIN incidents i ON i.deployment_id = d.id AND i.severity IN ('critical', 'high')
WHERE d.environment = 'production'
  AND d.deployed_at > NOW() - INTERVAL '30 days'
```

**Formula**: (Failed deployments / Total deployments) × 100

**What Counts as Failure**:

1. Rollback: Deployment reverted within 24 hours
2. Hotfix: Emergency fix deployed within 24 hours
3. Incident: Production incident (SEV1/SEV2) caused by deployment
4. SLO Breach: Deployment causes SLO violation

**Targets (DORA Benchmarks)**:

| Performance Level | Change Failure Rate |
|-------------------|---------------------|
| Elite | 0-15% |
| High | 16-30% |
| Medium | 31-45% |
| Low | Greater than 45% |

**Thresholds for Alerting**:

- Warning: Failure rate > 20% (last 10 deployments)
- Alert: Failure rate > 30%
- Critical: 2 consecutive deployment failures

**Recommended Review Cadence**:

- Track: Per deployment (immediate feedback)
- Review: Weekly (identify failure patterns)
- Deep Dive: Monthly (process improvements)

**Root Cause Categories** (track for pattern analysis):

| Failure Type | Example | Prevention |
|--------------|---------|------------|
| Insufficient Testing | Bug escaped QA | Increase test coverage |
| Config Error | Wrong environment variable | Config validation in CI |
| Dependency Issue | Upstream API changed | Contract testing, version pinning |
| Infrastructure | Resource exhaustion | Capacity planning, load testing |
| Human Error | Wrong deployment sequence | Automation, runbooks |

**Related Metrics**:

- Deployment success rate (inverse: 100% - failure rate)
- Test coverage (should be inverse correlated)
- Pre-production defect catch rate

**Agent Automation**:

- Auto-correlate deployments with incidents
- Categorize failure types
- Recommend prevention strategies

---

### Metric 4: Mean Time to Recovery (MTTR)

**Definition**: Average time to restore service after production incident

**Why It Matters**:

- Measures operational resilience
- Fast recovery minimizes customer impact
- Indicates effectiveness of incident response and runbooks

**Data Source**: Incident management system (PagerDuty, Jira Service Desk, OpsGenie)

**Collection Method**:

**SQL Query**:

```sql
SELECT
  AVG(resolved_at - detected_at) AS avg_mttr,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY resolved_at - detected_at) AS median_mttr,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY resolved_at - detected_at) AS p95_mttr
FROM incidents
WHERE severity IN ('critical', 'high')
  AND resolved_at IS NOT NULL
  AND resolved_at > NOW() - INTERVAL '30 days'
```

**Python Example**:

```python
def calculate_mttr(incidents):
    recovery_times = []

    for incident in incidents:
        if incident['severity'] in ['critical', 'high'] and incident['resolved_at']:
            delta = incident['resolved_at'] - incident['detected_at']
            recovery_times.append(delta.total_seconds() / 3600)

    if not recovery_times:
        return None

    return {
        'mean_hours': sum(recovery_times) / len(recovery_times),
        'median_hours': sorted(recovery_times)[len(recovery_times) // 2],
        'max_hours': max(recovery_times),
        'incident_count': len(recovery_times)
    }
```

**Formula**: (Resolution time - Detection time) averaged across incidents

**MTTR Components** (for bottleneck analysis):

1. Detection Time: Issue occurs to alert fires
2. Response Time: Alert fires to responder engaged
3. Diagnosis Time: Responder engaged to root cause identified
4. Fix Time: Root cause identified to fix deployed
5. Validation Time: Fix deployed to service confirmed healthy

**Targets (DORA Benchmarks)**:

| Performance Level | MTTR |
|-------------------|------|
| Elite | Less than 1 hour |
| High | 1 hour to 1 day |
| Medium | 1 day to 1 week |
| Low | More than 1 week |

**Thresholds for Alerting**:

- Warning: MTTR > 4 hours (critical incidents)
- Alert: MTTR > 1 day
- Process Review: MTTR increases 50% from baseline

**Recommended Review Cadence**:

- Track: Per incident (immediate postmortem)
- Review: Weekly (identify bottleneck stages)
- Trend Analysis: Monthly (process improvements)

**Bottleneck Analysis Table**:

| Stage | Target | Common Issues |
|-------|--------|---------------|
| Detection | < 5 min | Insufficient monitoring, alert fatigue |
| Response | < 15 min | Unclear on-call, poor escalation |
| Diagnosis | < 30 min | Poor observability, no runbooks |
| Fix | < 2 hours | No rollback plan, manual processes |
| Validation | < 15 min | No automated health checks |

**Related Metrics**:

- Mean Time to Detect (MTTD): How fast do we notice?
- Mean Time to Acknowledge (MTTA): How fast do we respond?
- Mean Time Between Failures (MTBF): How often do incidents occur?

**Agent Automation**:

- Parse incident tickets, calculate MTTR
- Identify bottleneck stages automatically
- Generate runbook improvement recommendations

---

## Velocity Metrics

### Metric 5: Story Point Velocity

**Definition**: Story points completed per iteration

**Why It Matters**:

- Predicts team capacity for planning
- Enables roadmap forecasting
- Indicates team health (consistent = healthy, erratic = problems)

**Data Source**: Project management tool (Jira, Linear, GitHub Projects)

**Collection Method**:

**Jira API Example**:

```python
from jira import JIRA

def get_velocity(jira_client, sprint_id):
    jql = f'sprint = {sprint_id} AND status = Done'
    issues = jira_client.search_issues(jql)

    velocity = sum(
        int(issue.fields.customfield_10016 or 0)
        for issue in issues
    )

    return {
        'sprint_id': sprint_id,
        'velocity': velocity,
        'issue_count': len(issues)
    }
```

**Formula**: Sum of story points for all stories marked "Done" in iteration

**Baseline Establishment**:

- Measure for 3-5 iterations to establish baseline
- New teams: volatile velocity (estimation calibration)
- Mature teams: stable velocity (±10% variance)

**Targets**:

- No universal target (varies by team size, story point scale)
- Process Target: Stable velocity (±10% variance) within 3 iterations
- Improvement Target: 5-10% increase per quarter (skill growth, process improvement)

**Thresholds for Alerting**:

- Warning: Velocity drops > 20% from average
- Alert: Velocity drops > 30% from average
- Investigation: Velocity variance > 30% for 2 consecutive iterations

**Recommended Review Cadence**:

- Calculate: End of each iteration
- Review: Iteration planning (trend analysis)
- Forecast: Quarterly planning

**Common Issues**:

| Velocity Pattern | Diagnosis | Action |
|------------------|-----------|--------|
| Consistently low | Overcommitment | Reduce iteration scope |
| Erratic (high variance) | Estimation inconsistency | Estimation workshop, WIP limits |
| Declining trend | Accumulating tech debt | Address debt, refactoring |
| Increasing rapidly | Gaming estimates | Recalibrate estimation |

**Related Metrics**:

- Throughput (# stories completed, complements velocity)
- Commitment accuracy (planned vs completed points)
- Velocity per person (team efficiency)

**Agent Automation**:

- Auto-query Jira/Linear API for velocity
- Detect velocity anomalies
- Forecast completion dates

---

### Metric 6: Throughput

**Definition**: Number of work items (stories, tasks, bugs) completed per iteration

**Why It Matters**:

- Complements velocity (measures output, not estimated effort)
- Less gameable than story points
- Useful when estimates are inconsistent

**Data Source**: Project management tool

**Collection Method**:

**SQL Query**:

```sql
SELECT
  iteration_id,
  COUNT(*) AS throughput,
  COUNT(*) FILTER (WHERE type = 'Story') AS stories,
  COUNT(*) FILTER (WHERE type = 'Bug') AS bugs,
  COUNT(*) FILTER (WHERE type = 'Task') AS tasks
FROM work_items
WHERE status = 'Done'
  AND completed_date >= iteration_start_date
  AND completed_date <= iteration_end_date
GROUP BY iteration_id
ORDER BY iteration_id
```

**Formula**: Count of work items transitioned to "Done" during iteration

**Baseline**: Measure for 3-5 iterations (typical: 8-12 items per 2-week iteration for 5-person team)

**Targets**:

- No universal target (depends on item size, team size)
- Process Target: Stable throughput over time
- Balance: More items = smaller slices = faster feedback (generally good)

**Thresholds for Alerting**:

- Warning: Throughput drops > 30% from average
- Alert: Throughput < 5 items per iteration (may indicate large, slow items)

**Recommended Review Cadence**:

- Calculate: Iteration end
- Review: Alongside velocity for holistic view

**Use Cases**:

- Kanban teams: Throughput more relevant than velocity
- Bug fixing: Count bugs fixed per week
- Cross-team comparison: More standardized than story points

**Related Metrics**:

- Average item size (velocity / throughput)
- Work item age (created to done time)

---

### Metric 7: Cycle Time

**Definition**: Time from work start to completion (in-progress to done)

**Why It Matters**:

- Indicates work efficiency
- Identifies bottlenecks
- Predicts when current work will complete

**Data Source**: Project management tool workflow transitions

**Collection Method**:

**Jira Changelog Query**:

```python
def get_cycle_time(jira_client, issue_key):
    issue = jira_client.issue(issue_key, expand='changelog')

    in_progress_time = None
    done_time = None

    for history in issue.changelog.histories:
        for item in history.items:
            if item.field == 'status':
                if item.toString == 'In Progress' and not in_progress_time:
                    in_progress_time = history.created
                elif item.toString == 'Done':
                    done_time = history.created

    if in_progress_time and done_time:
        return (done_time - in_progress_time).days
    return None
```

**Formula**: Done time - In Progress time

**Targets**:

- Small items: < 3 days
- Medium items: 3-7 days
- Large items: 1-2 weeks (should be decomposed)

**Thresholds for Alerting**:

- Warning: Cycle time > 10 days for any item
- Alert: Cycle time > 10 days for 3+ items simultaneously
- Investigation: Average cycle time increases 50%

**Recommended Review Cadence**:

- Monitor: Daily (identify stuck items)
- Review: Weekly (process improvement)

**Use Cases**:

- Identify work stuck in progress
- Find bottlenecks (coding, review, testing stages)
- Forecast completion (items in progress with historical cycle time)

**Related Metrics**:

- Lead time (request to delivery, includes wait time)
- Work in Progress (WIP) - inversely correlated with cycle time

---

## Flow Metrics

### Metric 8: Work In Progress (WIP)

**Definition**: Number of work items simultaneously in progress

**Why It Matters**:

- High WIP indicates context switching, slow completion
- Low WIP enables focus, faster flow
- Leading indicator (predicts velocity drop before it happens)

**Data Source**: Project management board

**Collection Method**:

**SQL Query**:

```sql
SELECT COUNT(*)
FROM work_items
WHERE status IN ('In Progress', 'In Review', 'In Testing')
  AND iteration_id = CURRENT_ITERATION
```

**By Person**:

```sql
SELECT assignee, COUNT(*) AS wip_count
FROM work_items
WHERE status IN ('In Progress', 'In Review')
GROUP BY assignee
HAVING COUNT(*) > 2
```

**Formula**: Count items in active states (In Progress, In Review, In Testing)

**Targets**:

- Team WIP Limit: Team size × 1.5 (e.g., 5-person team = 7-8 WIP limit)
- Individual WIP Limit: 1-2 items per person
- Pull-Based Flow: New work only started when WIP drops below limit

**Thresholds for Alerting**:

- Warning: WIP > team limit
- Alert: WIP > team limit for 2+ days
- Action: Stop starting new work, finish existing items

**Recommended Review Cadence**:

- Monitor: Daily (real-time dashboard)
- Review: Daily standup
- Adjust: Quarterly (based on retrospective)

**Impact of High WIP**:

- Increased cycle time (items take longer)
- Context switching overhead
- Delayed feedback
- Lower quality (rushing to juggle items)

**Related Metrics**:

- Cycle time (should decrease when WIP decreases)
- Throughput (should increase when WIP controlled)

**Agent Automation**:

- Monitor WIP continuously
- Alert when limit exceeded
- Recommend which items to finish first

---

### Metric 9: Code Review Queue Depth

**Definition**: Number of pull requests (PRs) awaiting review

**Why It Matters**:

- Leading indicator of delivery slowdown
- Long queue = delayed merges = longer lead time
- High queue = bottleneck in review process

**Data Source**: Version control system (GitHub, GitLab, Bitbucket)

**Collection Method**:

**GitHub API**:

```bash
gh api repos/:owner/:repo/pulls \
  --jq '[.[] | select(.draft == false and .review_comments == 0)] | length'
```

**Python Example**:

```python
def get_review_queue(repo, github_token):
    headers = {'Authorization': f'token {github_token}'}
    url = f'https://api.github.com/repos/{repo}/pulls'

    prs = requests.get(url, headers=headers).json()

    queue_by_reviewer = {}
    for pr in prs:
        if pr['draft'] or pr['merged_at']:
            continue

        for reviewer in pr['requested_reviewers']:
            name = reviewer['login']
            queue_by_reviewer[name] = queue_by_reviewer.get(name, 0) + 1

    return queue_by_reviewer
```

**Formula**: Count open, non-draft PRs awaiting review

**Targets**:

- Team Queue: < 5 PRs awaiting review
- Per Reviewer: < 3 PRs assigned to any individual
- Age: No PR waits > 24 hours for first review

**Thresholds for Alerting**:

- Warning: Queue depth > 5 PRs
- Alert: Queue depth > 10 PRs
- Critical: Any PR waiting > 48 hours

**Recommended Review Cadence**:

- Monitor: Continuously (real-time dashboard)
- Review: Daily (identify stuck PRs)
- Adjust: Weekly (review capacity)

**Bottleneck Indicators**:

- Queue growing: Review capacity insufficient
- Specific reviewers overloaded: Review responsibility imbalance
- PRs stuck for days: PR too large or unclear

**Related Metrics**:

- Code review time (PR opened to approved)
- PR size (lines changed, inversely correlated with review speed)

**Agent Automation**:

- Monitor review queue depth
- Identify overloaded reviewers
- Assign reviewers based on capacity

---

### Metric 10: Build Duration

**Definition**: Time to execute CI/CD build pipeline

**Why It Matters**:

- Long builds slow feedback loop
- Leading indicator of delivery issues
- Build duration creep indicates technical debt

**Data Source**: CI/CD system (GitHub Actions, Jenkins, CircleCI, GitLab CI)

**Collection Method**:

**GitHub Actions**:

```bash
gh api repos/:owner/:repo/actions/runs \
  --jq '.workflow_runs[] | {id, conclusion, duration: (.updated_at | fromdateiso8601) - (.run_started_at | fromdateiso8601)}'
```

**Formula**: Build end time - Build start time

**Targets**:

- PR Validation: < 10 minutes (fast feedback)
- Main Branch: < 15 minutes
- Full Release Build: < 30 minutes
- Trend: Duration should not increase > 10% per quarter

**Thresholds for Alerting**:

- Warning: Build duration > 15 minutes
- Alert: Build duration > 20 minutes
- Critical: Build duration > 30 minutes or +50% from baseline

**Recommended Review Cadence**:

- Monitor: Per build (CI dashboard)
- Review: Weekly (identify slow stages)
- Deep Dive: Quarterly (optimization sprint)

**Bottleneck Analysis**:

| Build Stage | Target | Common Issues |
|-------------|--------|---------------|
| Checkout | < 30 sec | Large repo, no shallow clone |
| Dependencies | < 2 min | No caching, too many deps |
| Compilation | < 3 min | No incremental builds |
| Unit Tests | < 5 min | Slow tests, serial execution |
| Integration Tests | < 5 min | Heavy tests, no parallelization |
| Package/Deploy | < 2 min | Large artifacts, slow registry |

**Optimization Strategies**:

- Parallelize test execution
- Cache dependencies
- Incremental builds
- Prune slow tests (move to nightly suite)

**Related Metrics**:

- Build success rate (% builds that pass)
- Flaky test rate (tests intermittently fail)

**Agent Automation**:

- Analyze build logs, identify slow stages
- Recommend parallelization opportunities
- Detect build duration regression

---

## Summary Table

| Metric | Category | Data Source | Frequency | Elite Target | Agent Auto-Collectable |
|--------|----------|-------------|-----------|--------------|------------------------|
| Deployment Frequency | DORA | CI/CD Logs | Daily | Multiple/day | Yes |
| Lead Time for Changes | DORA | Git + CI/CD | Per Deploy | < 1 hour | Yes |
| Change Failure Rate | DORA | Deploys + Incidents | Per Deploy | 0-15% | Partial |
| MTTR | DORA | Incident System | Per Incident | < 1 hour | Yes |
| Story Point Velocity | Velocity | Jira/Linear | Per Iteration | Stable ±10% | Yes |
| Throughput | Velocity | Jira/Linear | Per Iteration | Stable | Yes |
| Cycle Time | Velocity | Jira/Linear | Per Item | < 3 days | Yes |
| Work In Progress (WIP) | Flow | Jira/Linear | Daily | 1.5 × team size | Yes |
| Code Review Queue Depth | Flow | GitHub/GitLab | Continuous | < 5 PRs | Yes |
| Build Duration | Flow | CI/CD System | Per Build | < 10 min | Yes |

---

## Integration with SDLC Framework

### Phase-Specific Metrics

**Inception**:

- Focus: Estimation accuracy, risk identification rate
- Minimal delivery metrics (no code yet)

**Elaboration**:

- Focus: Velocity baseline, architecture spike completion
- Track: Story point velocity (establish baseline), cycle time

**Construction**:

- Focus: All DORA + velocity + flow metrics
- Track: Full suite (10 metrics above)

**Transition**:

- Focus: DORA metrics (especially MTTR, change failure rate)
- Track: Deployment frequency, production incident metrics

### Template Integration

**Measurement Plan**: Populate metric inventory with metrics from this catalog

**Status Assessment**: Report velocity, throughput, cycle time (Section 4), change failure rate, build duration (Section 5)

**Iteration Assessment**: Compare planned vs actual velocity (Section 3), include build success rate (Section 6)

---

## Conclusion

Delivery metrics provide objective evidence of team performance and process health. These 10 metrics form the foundation for data-driven decision making in software delivery.

**Next Steps**:

1. Select metrics appropriate to current phase
2. Establish baselines (measure for 3 iterations)
3. Automate collection (manual measurement fails)
4. Review regularly (metrics without action are waste)
5. Iterate (adjust as project matures)

**Critical Success Factors**:

- Measure outcomes, not outputs
- Automate collection
- Set thresholds to trigger action
- Review trends, not point-in-time values
- Balance speed with quality
