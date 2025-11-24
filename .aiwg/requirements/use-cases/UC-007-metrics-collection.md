# Use-Case Specification: UC-007

## Metadata

- ID: UC-007
- Name: Collect and Visualize SDLC Metrics Throughout Project Lifecycle
- Owner: System Analyst
- Contributors: Metrics Analyst, Performance Engineer, Dashboard Designer
- Reviewers: Requirements Reviewer, Product Strategist
- Team: AIWG Framework Development
- Status: approved
- Created: 2025-10-18
- Updated: 2025-10-22
- Priority: P1 (High Priority - Deferred to v1.1 per Product Strategist)
- Estimated Effort: M (Medium - 35 hours)
- Related Documents:
  - Feature: FID-002 (Metrics Collection), Feature Backlog Prioritized
  - Product Strategist Review: Deferred to P1 (manual workaround acceptable for MVP)
  - SAD: Section 5.3 (Metrics Collector), Section 4.2 (Core Orchestrator)
  - UC-005: Framework Self-Improvement (velocity tracking reference)

## 1. Use-Case Identifier and Name

**ID:** UC-007
**Name:** Collect and Visualize SDLC Metrics Throughout Project Lifecycle

## 2. Scope and Level

**Scope:** AIWG Metrics Collection and Analysis System
**Level:** User Goal
**System Boundary:** AIWG framework repository, `.aiwg/` artifacts, Git history, GitHub API, metrics aggregation tools

## 3. Primary Actor(s)

**Primary Actors:**
- **Metrics Analyst**: Specialized agent that collects, aggregates, and visualizes project health metrics
- **Framework Maintainer**: Core developer monitoring AIWG framework velocity and quality trends
- **Solo Developer**: Individual using AIWG to track personal project progress and productivity
- **Enterprise Team Lead**: Manager evaluating team velocity, quality trends, and capacity planning

**Actor Goals:**
- **Metrics Analyst**: Automate metrics collection across all SDLC artifacts with <5% overhead
- **Framework Maintainer**: Validate "quality without friction" claims with quantitative velocity data
- **Solo Developer**: Understand personal productivity trends and identify improvement opportunities
- **Enterprise Team Lead**: Track team performance, predict capacity, and justify SDLC process investment

## 4. Stakeholders and Interests

| Stakeholder | Interest |
|------------|----------|
| Framework Maintainer | Prove framework value with velocity data (not assertions) |
| Prospective Enterprise Users | Evidence of velocity + quality balance (DORA metrics proof) |
| Solo Developers | Personal productivity insights (commits/day, velocity trends) |
| Product Owner | Validate vision-document.md success metrics (quantitative proof) |
| Engineering Managers | Team capacity planning data (historical velocity, trend forecasting) |
| Community Contributors | Transparency (public metrics dashboard builds trust) |

## 5. Preconditions

1. AIWG framework repository exists (`/home/manitcor/dev/ai-writing-guide/`)
2. Project has meaningful Git history (20+ commits across multiple iterations)
3. SDLC artifacts exist in `.aiwg/` directory (requirements, architecture, testing, deployment)
4. Metrics tools deployed (`.claude/commands/project-metrics.md` available)
5. GitHub API access configured (for PR metrics, deployment frequency tracking)
6. Project has completed at least 1 iteration (velocity baseline established)
7. `.aiwg/metrics/` directory initialized for historical data storage
8. Claude Code configured as Core Orchestrator (CLAUDE.md with metrics orchestration prompts)

## 6. Postconditions

**Success Postconditions:**
- Metrics dashboard generated (`.aiwg/reports/metrics-dashboard.md`) with:
  - Velocity metrics (commits/day, PRs/week, story points/iteration)
  - Quality trends (test coverage, code review approval rate, defect density)
  - DORA metrics (deployment frequency, lead time, MTTR, change failure rate)
  - Capacity planning data (team velocity trends, burndown projections)
- Historical metrics stored (`.aiwg/metrics/velocity-history.csv`, 12-month retention)
- Trend analysis completed (velocity improving/stable/declining, quality degradation alerts)
- Anomalies identified (performance drops, quality regressions, velocity spikes)
- Actionable recommendations generated (process improvements, risk mitigation, capacity adjustments)
- Framework "quality without friction" claim validated with quantitative data
- Prospective users can reference metrics dashboard as proof of framework maturity

**Failure Postconditions:**
- Metrics collection incomplete (missing data sources identified)
- User receives error with remediation steps (Git history unavailable, artifacts missing)
- Partial metrics dashboard generated with data availability notes
- Gap analysis report generated (insufficient historical data, <3 iterations)

## 7. Trigger

Framework Maintainer, Solo Developer, or Enterprise Team Lead requests metrics collection: `/project-metrics`

**Alternative Triggers:**
- Automated daily metrics collection (scheduled cron job)
- Real-time metrics update (live dashboard mode)
- Iteration retrospective (metrics included in retrospective report)
- Phase gate check (metrics validate transition criteria)

## 8. Main Success Scenario

1. **User Initiates Metrics Collection**:
   - Framework Maintainer runs: `/project-metrics`
   - User specifies optional parameters: `--timeframe 90-days` (default: all-time)
   - User optionally enables real-time mode: `--live` (dashboard updates every 60 seconds)
2. **Core Orchestrator Validates Preconditions**:
   - Verifies Git repository exists (`.git/` directory present)
   - Checks commit history depth: 45 commits (exceeds 20-commit minimum)
   - Verifies `.aiwg/` artifacts exist: requirements, architecture, testing, deployment directories
   - Confirms GitHub API token configured: `GITHUB_TOKEN` environment variable set
   - Validates iteration history: 5 iterations completed (sufficient for trend analysis)
3. **Orchestrator Launches Metrics Analyst Agent**:
   - Agent reads metrics collection workflow: `.claude/commands/project-metrics.md`
   - Agent determines data sources: Git log, `.aiwg/` artifacts, GitHub API, test reports
   - Agent initializes metrics workspace: `.aiwg/working/metrics-collection/`
   - Agent prepares output destinations: `.aiwg/reports/metrics-dashboard.md`, `.aiwg/metrics/velocity-history.csv`
4. **Metrics Analyst Collects Velocity Metrics** (Phase 1: Development Speed):
   - **Commit Velocity**: Parses Git log for last 90 days
     - Total commits: 245 commits
     - Commits per day: 2.72 commits/day (245 commits / 90 days)
     - Commits per week: 19 commits/week
     - Commit velocity trend: +15% vs previous 90-day period (improving)
   - **Pull Request Velocity**: Queries GitHub API for PR metrics
     - Total PRs merged: 38 PRs (last 90 days)
     - PRs per week: 2.95 PRs/week
     - Average PR merge time: 4.2 hours (excellent responsiveness)
     - PR velocity trend: +8% vs previous period (stable growth)
   - **Story Point Velocity**: Extracts from iteration plans (`.aiwg/planning/iteration-{N}-plan.md`)
     - Iteration 1: 32 story points delivered
     - Iteration 2: 35 story points delivered
     - Iteration 3: 38 story points delivered
     - Iteration 4: 40 story points delivered
     - Iteration 5: 38 story points delivered
     - Average velocity: 36.6 story points/iteration (2-week iterations)
     - Velocity trend: +18% from Iteration 1 to Iteration 5 (continuous improvement)
   - Saves velocity metrics to: `.aiwg/metrics/velocity-history.csv` (append mode)
5. **Metrics Analyst Collects Quality Metrics** (Phase 2: Quality Trends):
   - **Test Coverage**: Parses test coverage reports (`.aiwg/testing/coverage-reports/`)
     - Iteration 1: 72% coverage
     - Iteration 2: 78% coverage
     - Iteration 3: 85% coverage
     - Iteration 4: 88% coverage
     - Iteration 5: 92% coverage
     - Coverage trend: +20 percentage points over 5 iterations (strong improvement)
   - **Code Review Approval Rate**: Extracts from `.aiwg/working/iteration-{N}/reviews/`
     - Total code reviews: 45 reviews (5 iterations)
     - Approved on first review: 38 reviews (84% approval rate)
     - Conditional approval: 6 reviews (13%, minor fixes required)
     - Rejected: 1 review (2%, major rework needed)
     - Average review turnaround: 6.5 hours
   - **Defect Density**: Analyzes issue tracker and retrospectives
     - Production bugs (last 90 days): 3 bugs (0.012 bugs/commit)
     - Critical bugs: 0 (zero critical defects)
     - Defect resolution time: Average 8.2 hours (excellent)
     - Defect escape rate: 2.1% (post-release defects / total commits)
   - **Quality Score Aggregation**: Reads `.aiwg/quality/quality-scores.csv`
     - Artifact quality scores (1-100 scale): Architecture (95), Requirements (92), Testing (88), Documentation (90)
     - Overall quality score: 91/100 (weighted average across all artifacts)
     - Quality trend: +12 points over 5 iterations (significant improvement)
   - Saves quality metrics to: `.aiwg/metrics/quality-history.csv`
6. **Metrics Analyst Calculates DORA Metrics** (Phase 3: DORA Indicators):
   - **Deployment Frequency**: Queries GitHub API for deployment events
     - Deployments (last 90 days): 12 deployments
     - Deployment frequency: 1.33 deployments/week
     - DORA rating: Medium (industry benchmark: 1-7 deployments/week)
   - **Lead Time for Changes**: Measures commit-to-deploy time
     - Average lead time: 4.8 days (commit timestamp → deployment timestamp)
     - Median lead time: 3.2 days (50th percentile)
     - 95th percentile lead time: 9.5 days (outlier handling)
     - DORA rating: Medium (industry benchmark: 1-7 days)
   - **Mean Time to Restore (MTTR)**: Extracts from incident logs (`.aiwg/deployment/incidents/`)
     - Incidents (last 90 days): 2 incidents (low incident rate)
     - Average MTTR: 1.2 hours (excellent recovery time)
     - DORA rating: Elite (industry benchmark: <1 hour for elite performers)
   - **Change Failure Rate**: Calculates deployment failures / total deployments
     - Failed deployments: 1 failure (last 90 days)
     - Total deployments: 12 deployments
     - Change failure rate: 8.3% (1 / 12)
     - DORA rating: Medium (industry benchmark: 0-15% for medium performers)
   - Saves DORA metrics to: `.aiwg/metrics/dora-history.csv`
7. **Metrics Analyst Identifies Trends and Anomalies** (Phase 4: Analysis):
   - **Velocity Trend Analysis**:
     - Commit velocity: +15% (last 90 days vs previous 90 days) - **Improving**
     - Story point velocity: +18% (Iteration 1 → Iteration 5) - **Improving**
     - PR velocity: +8% (last 90 days vs previous) - **Stable Growth**
     - **Interpretation**: Velocity consistently improving, no signs of slowdown
   - **Quality Trend Analysis**:
     - Test coverage: +20 percentage points (72% → 92%) - **Strong Improvement**
     - Code review approval rate: 84% (stable across iterations) - **Consistent Quality**
     - Defect escape rate: 2.1% (below 5% industry benchmark) - **High Quality**
     - **Interpretation**: Quality improving faster than velocity (sustainable growth)
   - **Anomaly Detection**:
     - Iteration 4 → Iteration 5: Story points dropped from 40 → 38 (-5%) - **Minor Variance**
       - Root cause analysis: Iteration 5 included high-complexity features (FID-005 rollback research)
       - Action: Expected variance, not concerning (within 20% buffer tolerance)
     - No performance degradation detected (velocity and quality both improving)
     - No quality regressions detected (all quality metrics stable or improving)
   - **Capacity Planning Projections**:
     - Next iteration forecast: 38-42 story points (based on 5-iteration moving average)
     - Quarterly capacity: ~480 story points (12 weeks, 6 iterations @ 40 SP/iteration)
     - Team capacity utilization: 95% (optimal, low burnout risk)
8. **Metrics Analyst Generates Recommendations** (Phase 5: Actionable Insights):
   - **Process Improvement Recommendations**:
     - **Recommendation 1**: Increase deployment frequency from 1.33/week to 3/week (target: DORA High rating)
       - Rationale: Lead time is acceptable (4.8 days), but deployment batching introduces risk
       - Action: Implement continuous deployment pipeline (automate release workflow)
       - Impact: Reduce change failure rate from 8.3% to <5% (smaller, safer deployments)
     - **Recommendation 2**: Maintain current velocity (36.6 SP/iteration) - do not increase scope
       - Rationale: Quality improving faster than velocity (sustainable pace validated)
       - Action: Continue dual-track iteration pattern (Discovery + Delivery)
       - Impact: Preserve quality gains, avoid burnout, maintain 92% test coverage
     - **Recommendation 3**: Automate retrospective action item tracking
       - Rationale: 3-5 action items per retrospective, unclear completion rate
       - Action: Create FID-008 (Action Item Tracker) for iteration 6
       - Impact: Close continuous improvement loop (validate action items drive velocity improvements)
   - **Risk Mitigation Recommendations**:
     - **Risk**: Velocity may plateau as framework matures (complexity increases)
       - Likelihood: Medium (common pattern in maturing projects)
       - Mitigation: Prioritize technical debt reduction (20% capacity per iteration)
       - Monitoring: Track velocity slope (alert if velocity drops >10% over 3 iterations)
     - **Risk**: Quality maintenance cost may increase (test suite growth)
       - Likelihood: Low (test coverage already high at 92%)
       - Mitigation: Implement test execution optimization (parallel test runs)
       - Monitoring: Track test execution time (alert if exceeds 10 minutes)
   - Saves recommendations to: `.aiwg/working/metrics-collection/recommendations.md`
9. **Metrics Analyst Generates Dashboard** (Phase 6: Visualization):
   - Creates comprehensive metrics dashboard: `.aiwg/reports/metrics-dashboard.md`
   - Dashboard includes:
     - **Executive Summary**: "Velocity +18%, Quality +20%, DORA Medium (target: High)"
     - **Velocity Trends**: Line charts (commits/day, PRs/week, story points/iteration)
     - **Quality Trends**: Stacked bar charts (test coverage, code review approval rate)
     - **DORA Metrics**: Quadrant chart (deployment frequency, lead time, MTTR, change failure rate)
     - **Capacity Planning**: Burndown chart (quarterly forecast, iteration velocity projection)
     - **Recommendations**: Bulleted action items (process improvements, risk mitigation)
   - Dashboard format: Markdown with embedded mermaid.js charts (GitHub-compatible)
   - Dashboard word count: 2,800 words (comprehensive yet scannable)
10. **Metrics Analyst Updates Historical Data** (Phase 7: Data Persistence):
    - Appends current metrics to historical CSV files:
      - `.aiwg/metrics/velocity-history.csv` (90-day rolling window)
      - `.aiwg/metrics/quality-history.csv` (all-time quality scores)
      - `.aiwg/metrics/dora-history.csv` (quarterly DORA snapshots)
    - Archives raw metrics data: `.aiwg/working/metrics-collection/raw-data-2025-10-22.json`
    - Applies data retention policy: Deletes CSV rows older than 12 months (NFR-DATA-003)
    - Maintains audit trail: Permanent retention in `.aiwg/metrics/audit-trail.log`
11. **Core Orchestrator Reports Metrics Summary**:
    - Orchestrator confirms metrics collection success
    - Reports execution time: 45 seconds (well under 90-second target for NFR-PERF-005)
    - Displays high-level summary:
      - "Velocity: +18% (improving) | Quality: 91/100 (+12 pts) | DORA: Medium (2/4 Elite)"
      - "Deployment frequency: 1.33/week | Lead time: 4.8 days | MTTR: 1.2 hours | CFR: 8.3%"
      - "Recommendations: 3 process improvements, 2 risk mitigations"
    - Provides dashboard link: "Full dashboard: .aiwg/reports/metrics-dashboard.md"
12. **Framework Maintainer Reviews Dashboard**:
    - Opens dashboard file: `.aiwg/reports/metrics-dashboard.md`
    - Reviews velocity trends: "Velocity improving consistently (+18% over 5 iterations)"
    - Reviews quality trends: "Test coverage 92%, defect escape rate 2.1% (excellent)"
    - Reviews DORA metrics: "MTTR elite (1.2 hours), deployment frequency needs improvement"
    - Reviews recommendations: "Increase deployment frequency to 3/week - actionable"
13. **Maintainer Validates "Quality Without Friction" Claim**:
    - Compares velocity trend (+18%) vs quality trend (+20 percentage points)
    - **Conclusion**: Quality improving faster than velocity - framework delivers on promise
    - Quantitative proof: Framework maintains high quality (91/100) while increasing velocity
    - Validates vision-document.md success metrics (lines 136-167): "Ship weekly, test comprehensively, maintain 80%+ coverage"
14. **Maintainer Creates Action Items from Recommendations**:
    - Creates FID-008 (Action Item Tracker) for iteration 6 backlog
    - Creates FID-009 (Continuous Deployment Pipeline) for v1.1 roadmap
    - Updates iteration 6 plan: Allocate 20% capacity to technical debt reduction
15. **Maintainer Publishes Metrics Dashboard to Community**:
    - Commits dashboard to Git: `git add .aiwg/reports/metrics-dashboard.md`
    - Creates commit: `git commit -m "docs(metrics): add Iteration 5 metrics dashboard"`
    - Publishes to GitHub Discussions: "Iteration 5 Metrics - Velocity +18%, Quality 91/100"
    - Community feedback: "Impressive velocity improvement with quality gains! Framework works as advertised."
    - Prospective user adoption: +40% increase (trust builder per Product Strategist review)

## 9. Alternate Flows

### Alt-1: Real-Time Metrics Dashboard (Live Mode)

**Branch Point:** Step 1 (User initiates metrics collection)
**Condition:** User enables live dashboard mode: `--live`

**Flow:**
1. Framework Maintainer runs: `/project-metrics --live`
2. Core Orchestrator validates preconditions (same as main flow)
3. Orchestrator launches Metrics Analyst in live mode:
   - Agent creates persistent metrics server (runs in background)
   - Server refreshes metrics every 60 seconds (NFR-FRESH-001)
   - Server updates dashboard file: `.aiwg/reports/metrics-dashboard-live.md`
4. Orchestrator provides live dashboard URL: "Live dashboard: http://localhost:8080/metrics"
5. Framework Maintainer opens dashboard in browser:
   - Dashboard displays real-time velocity metrics (auto-refresh every 60 seconds)
   - Dashboard shows live commit activity (updates as commits pushed)
   - Dashboard tracks active PR status (updates as PRs merged)
6. Maintainer works on project (commits code, merges PRs)
7. Live dashboard updates automatically:
   - Commit velocity: 2.72 → 2.85 commits/day (new commits detected)
   - PR velocity: 2.95 → 3.10 PRs/week (recent PR merged)
   - Story point burndown: 12/40 → 15/40 story points completed (iteration progress)
8. Maintainer stops live dashboard: Ctrl+C in terminal
9. Orchestrator archives final snapshot: `.aiwg/metrics/live-session-2025-10-22.csv`
10. **Resume Main Flow:** Step 11 (Orchestrator reports metrics summary)

### Alt-2: Custom Metrics Definition (User-Defined KPIs)

**Branch Point:** Step 3 (Orchestrator launches Metrics Analyst)
**Condition:** User provides custom metrics configuration file

**Flow:**
1. Framework Maintainer creates custom metrics config: `.aiwg/metrics/custom-kpis.yaml`
   ```yaml
   custom_metrics:
     - name: "Documentation Coverage"
       source: ".aiwg/architecture/"
       calculation: "count(*.md files) / count(components in SAD)"
       target: "100%"
     - name: "ADR Freshness"
       source: ".aiwg/architecture/decisions/"
       calculation: "days_since_last_ADR"
       target: "<30 days"
     - name: "Security Review Frequency"
       source: ".aiwg/security/reviews/"
       calculation: "reviews_per_iteration"
       target: "1 review/iteration"
   ```
2. Maintainer runs: `/project-metrics --custom-config .aiwg/metrics/custom-kpis.yaml`
3. Metrics Analyst reads custom config file
4. Analyst validates config format: YAML schema validation passes
5. Analyst collects custom metrics:
   - **Documentation Coverage**: 45 MD files / 50 components = 90%
   - **ADR Freshness**: 12 days since last ADR (within 30-day target)
   - **Security Review Frequency**: 1.2 reviews/iteration (exceeds target)
6. Analyst appends custom metrics to dashboard: `.aiwg/reports/metrics-dashboard.md`
7. Dashboard includes "Custom KPIs" section with user-defined metrics
8. **Resume Main Flow:** Step 10 (Metrics Analyst updates historical data)

### Alt-3: Insufficient Historical Data (First-Time Collection)

**Branch Point:** Step 2 (Orchestrator validates preconditions)
**Condition:** Project has <3 iterations completed (insufficient trend data)

**Flow:**
1. Metrics Analyst attempts to collect velocity metrics
2. Iteration history check: Only 2 iterations completed (below 3-iteration minimum)
3. Analyst detects insufficient data for trend analysis
4. Analyst generates partial metrics dashboard:
   - **Velocity Metrics**: Current iteration data only (no trend analysis)
     - Iteration 1: 32 story points
     - Iteration 2: 35 story points
     - Trend: Insufficient data (need 3+ iterations for trend line)
   - **Quality Metrics**: Snapshot metrics only (no historical comparison)
     - Current test coverage: 78%
     - Current code review approval: 90%
     - Trend: Insufficient data
   - **DORA Metrics**: Current quarter only (no quarter-over-quarter comparison)
5. Analyst adds data availability notes to dashboard:
   - "Note: Trend analysis requires 3+ iterations. Current iteration count: 2."
   - "Recommendation: Re-run `/project-metrics` after iteration 3 completion."
6. Orchestrator prompts Framework Maintainer:
   - "Insufficient historical data for trend analysis. Continue with snapshot metrics? (y/n)"
7. Maintainer confirms: "Yes, generate snapshot dashboard"
8. Analyst generates snapshot-only dashboard: `.aiwg/reports/metrics-dashboard-snapshot.md`
9. **Resume Main Flow:** Step 11 (Orchestrator reports metrics summary with data limitations noted)

### Alt-4: Multi-Project Metrics Aggregation (Workspace Mode)

**Branch Point:** Step 4 (Metrics Analyst collects velocity metrics)
**Condition:** User requests cross-project metrics aggregation (requires FID-007 Workspace Management)

**Flow:**
1. Framework Maintainer runs: `/project-metrics --workspace ~/.aiwg/workspaces/all-projects.yaml`
2. Metrics Analyst reads workspace configuration: `all-projects.yaml`
   - Project 1: `/home/user/dev/project-a` (AIWG-enabled)
   - Project 2: `/home/user/dev/project-b` (AIWG-enabled)
   - Project 3: `/home/user/dev/project-c` (AIWG-enabled)
3. Analyst iterates through all projects in workspace:
   - Collects velocity metrics from project-a: 2.5 commits/day, 35 SP/iteration
   - Collects velocity metrics from project-b: 3.1 commits/day, 42 SP/iteration
   - Collects velocity metrics from project-c: 1.8 commits/day, 28 SP/iteration
4. Analyst aggregates cross-project metrics:
   - **Aggregate Commit Velocity**: 7.4 commits/day (sum across 3 projects)
   - **Aggregate Story Point Velocity**: 105 SP/iteration (sum across 3 projects)
   - **Team Capacity**: 105 SP/iteration ÷ 3 projects = 35 SP/project average
5. Analyst generates workspace-level dashboard: `.aiwg/reports/workspace-metrics-dashboard.md`
6. Dashboard includes per-project breakdown + aggregate rollup
7. **Resume Main Flow:** Step 11 (Orchestrator reports workspace-level metrics summary)
8. **Note**: This alternate flow requires FID-007 (Workspace Management) as dependency

## 10. Exception Flows

### Exc-1: Git History Unavailable (Missing Commits)

**Trigger:** Step 4 (Metrics Analyst collects velocity metrics)
**Condition:** Git repository has <20 commits (insufficient data)

**Flow:**
1. Metrics Analyst attempts to parse Git log
2. Commit count check: 12 commits (below 20-commit minimum)
3. Analyst detects insufficient commit history
4. Orchestrator prompts Framework Maintainer:
   - "Insufficient Git history (12 commits, minimum 20 required). Metrics collection blocked."
   - "Recommendations:"
     - "1. Continue project development (add 8+ commits)"
     - "2. Generate snapshot metrics with disclaimer (y/n)"
5. Maintainer chooses: "Generate snapshot metrics"
6. Analyst generates limited-data dashboard:
   - Commit velocity: 0.8 commits/day (12 commits / 15 days of history)
   - Note: "Insufficient data for reliable velocity calculation (minimum 20 commits required)"
7. Orchestrator saves partial dashboard: `.aiwg/reports/metrics-dashboard-limited.md`
8. Error logged to: `.aiwg/working/metrics-collection/errors.log`
9. **Resume Main Flow:** Step 15 (Maintainer reviews limited dashboard with caveats)

### Exc-2: SDLC Artifacts Missing (Incomplete `.aiwg/` Directory)

**Trigger:** Step 5 (Metrics Analyst collects quality metrics)
**Condition:** `.aiwg/testing/coverage-reports/` directory missing (no test coverage data)

**Flow:**
1. Metrics Analyst attempts to read test coverage reports
2. Directory check: `.aiwg/testing/coverage-reports/` does not exist
3. Analyst detects missing quality data source
4. Analyst logs missing data: `.aiwg/working/metrics-collection/missing-data.log`
   - "Missing: .aiwg/testing/coverage-reports/ (test coverage metrics unavailable)"
5. Analyst continues metrics collection with partial data:
   - Velocity metrics: Available (Git log + iteration plans)
   - Quality metrics: Partial (test coverage unavailable, code review data available)
   - DORA metrics: Partial (deployment frequency available, MTTR unavailable)
6. Analyst generates partial dashboard with data availability section:
   - "Data Availability: Velocity (100%), Quality (50%), DORA (75%)"
   - "Missing Data Sources: Test coverage reports, incident logs"
7. Orchestrator prompts Framework Maintainer:
   - "Metrics collection complete with partial data. Missing: test coverage reports."
   - "Recommendation: Create `.aiwg/testing/coverage-reports/` directory and populate with test coverage data."
8. Maintainer reviews partial dashboard: `.aiwg/reports/metrics-dashboard-partial.md`
9. **Resume Main Flow:** Step 15 (Maintainer creates action item to populate missing data sources)

### Exc-3: GitHub API Rate Limit Exceeded

**Trigger:** Step 4 (Metrics Analyst collects velocity metrics - PR metrics)
**Condition:** GitHub API returns 403 Forbidden (rate limit exceeded)

**Flow:**
1. Metrics Analyst queries GitHub API for PR metrics
2. GitHub API response: "403 Forbidden - Rate limit exceeded. Retry after 3600 seconds."
3. Analyst detects rate limit error
4. Orchestrator prompts Framework Maintainer:
   - "GitHub API rate limit exceeded. Options:"
     - "1. Wait 60 minutes and retry (recommended)"
     - "2. Use cached PR data (last collected: 2025-10-21)"
     - "3. Skip PR metrics (generate dashboard without PR data)"
5. Maintainer chooses: "Use cached PR data"
6. Analyst reads cached PR metrics: `.aiwg/metrics/pr-cache-2025-10-21.json`
7. Analyst includes cached data disclaimer in dashboard:
   - "PR Metrics: Cached data from 2025-10-21 (GitHub API rate limit exceeded)"
   - "Note: Data may be 1 day stale. Re-run metrics collection in 60 minutes for fresh data."
8. Analyst generates dashboard with cached PR data
9. **Resume Main Flow:** Step 6 (Metrics Analyst calculates DORA metrics with cached PR data)

### Exc-4: Metric Calculation Timeout (Large Project >10GB Artifacts)

**Trigger:** Step 4 (Metrics Analyst collects velocity metrics)
**Condition:** Project has >10,000 commits, >1,000 SDLC artifacts (metrics collection exceeds 5-minute timeout)

**Flow:**
1. Metrics Analyst begins collecting velocity metrics
2. Git log parsing exceeds 5-minute timeout (large repository)
3. Orchestrator detects timeout
4. Orchestrator chunks metrics collection into parallel tasks:
   - Task 1: Velocity metrics (commits, PRs, story points)
   - Task 2: Quality metrics (test coverage, code review)
   - Task 3: DORA metrics (deployment frequency, lead time)
5. Orchestrator launches 3 parallel Metrics Analyst instances (Task tool)
6. Parallel execution completes in 2.5 minutes (50% time reduction)
7. Orchestrator merges parallel results into unified dashboard
8. **Resume Main Flow:** Step 9 (Metrics Analyst generates dashboard from merged parallel data)

### Exc-5: Artifact Parse Error (Corrupted Iteration Plan JSON)

**Trigger:** Step 4 (Metrics Analyst collects velocity metrics - story point extraction)
**Condition:** Iteration plan file corrupted (invalid JSON frontmatter)

**Flow:**
1. Metrics Analyst attempts to parse iteration plan: `.aiwg/planning/iteration-5-plan.md`
2. JSON frontmatter parse error: "Unexpected token in JSON at position 245"
3. Analyst detects corrupted artifact
4. Analyst logs parse error: `.aiwg/working/metrics-collection/parse-errors.log`
   - "Parse Error: .aiwg/planning/iteration-5-plan.md (invalid JSON frontmatter)"
5. Analyst falls back to regex extraction:
   - Searches iteration plan for story point pattern: `story_points: (\d+)`
   - Regex match found: `story_points: 38`
   - Extracts story points via fallback method (38 story points)
6. Analyst logs fallback success: "Fallback extraction succeeded for iteration-5-plan.md"
7. Analyst includes data quality note in dashboard:
   - "Data Quality Note: Iteration 5 story points extracted via fallback (regex). Verify accuracy manually."
8. **Resume Main Flow:** Step 5 (Metrics Analyst collects quality metrics with fallback data)

### Exc-6: Insufficient Data for Trend Calculation (<3 Data Points)

**Trigger:** Step 7 (Metrics Analyst identifies trends and anomalies)
**Condition:** Only 2 iterations completed (cannot calculate 3-point moving average)

**Flow:**
1. Metrics Analyst attempts to calculate velocity trend
2. Iteration count check: 2 iterations (below 3-iteration minimum for trend analysis)
3. Analyst detects insufficient data for statistical trend calculation
4. Analyst generates snapshot comparison instead of trend:
   - Iteration 1: 32 story points
   - Iteration 2: 35 story points
   - Change: +3 story points (+9.4%)
   - Trend: Cannot calculate (need 3+ iterations for trend line)
5. Analyst includes data limitation disclaimer in dashboard:
   - "Trend Analysis: Insufficient data (2 iterations). Trend calculation requires 3+ iterations."
   - "Current Snapshot: +9.4% velocity improvement (Iteration 1 → Iteration 2)"
6. Analyst recommends action: "Re-run metrics collection after iteration 3 completion for trend analysis."
7. **Resume Main Flow:** Step 8 (Metrics Analyst generates recommendations based on snapshot data)

## 11. Special Requirements

### Performance Requirements

| Requirement | Target | Rationale |
|------------|--------|-----------|
| NFR-PERF-005: Traceability validation time | <90s for 10k traceability nodes | Workflow responsiveness (large enterprise projects) |
| NFR-PERF-006: Metrics collection overhead | <5% performance impact | System responsiveness (background collection acceptable) |
| NFR-MT-01: Metrics collection time | <2 minutes for 1,000 commits | Productivity (no workflow interruption) |
| NFR-MT-04: Dashboard load time | <3 seconds | User experience (instant feedback) |

### Quality Requirements

| Requirement | Target | Rationale |
|------------|--------|-----------|
| NFR-ACC-003: Traceability accuracy | 99% orphan detection | Compliance validation (audit trail integrity) |
| NFR-MT-05: Metrics accuracy | 98%+ accuracy (validated against Git log) | Decision reliability (trustworthy data) |
| NFR-MT-06: Historical data integrity | Zero data loss (12-month retention) | Trend analysis accuracy (long-term insights) |

### Usability Requirements

| Requirement | Target | Rationale |
|------------|--------|-----------|
| NFR-USE-002: Feedback clarity | Line numbers + specific suggestions | Actionability (clear remediation steps) |
| NFR-MT-07: Dashboard readability | 2,000-3,000 word dashboard, scannable format | Comprehension (executive summary + deep-dive sections) |
| NFR-MT-08: Recommendation actionability | 3-5 actionable recommendations per dashboard | Focus (avoid overwhelming improvement backlog) |

### Data Requirements

| Requirement | Target | Rationale |
|------------|--------|-----------|
| NFR-DATA-003: Metrics retention | 12-month historical data | Trend analysis (year-over-year comparisons) |
| NFR-FRESH-001: Real-time metric updates | <1 second update latency (live mode) | Live dashboard responsiveness |
| NFR-MT-02: Data freshness | Real-time updates (live mode) or daily batch (scheduled mode) | Decision accuracy (up-to-date insights) |

## 12. Related Business Rules

**BR-MT-001: Metrics Collection Frequency**
- **Default Mode**: On-demand collection (`/project-metrics` command)
- **Scheduled Mode**: Daily automated collection (cron job: 2 AM local time)
- **Live Mode**: Real-time updates (60-second refresh interval)
- **Rationale**: Flexibility for different use cases (on-demand for solo developers, scheduled for teams, live for sprint planning)

**BR-MT-002: Historical Data Retention Policy**
- **Velocity Metrics**: 12-month rolling window (NFR-DATA-003)
- **Quality Metrics**: Permanent retention (all-time quality scores)
- **DORA Metrics**: Quarterly snapshots (4 quarters retained)
- **Audit Trail**: Permanent retention (compliance requirement)
- **Rationale**: Balance trend analysis needs with storage efficiency

**BR-MT-003: Metrics Dashboard Format**
- **Executive Summary**: <300 words (high-level KPIs, trend direction)
- **Velocity Section**: 500-700 words (commits, PRs, story points with trend charts)
- **Quality Section**: 500-700 words (test coverage, code review, defect density)
- **DORA Section**: 400-600 words (4 DORA metrics with industry benchmarks)
- **Recommendations**: 300-500 words (3-5 actionable process improvements)
- **Total Length**: 2,000-3,000 words (comprehensive yet scannable)
- **Format**: Markdown with embedded mermaid.js charts (GitHub-compatible)

**BR-MT-004: Anomaly Detection Thresholds**
- **Velocity Drop**: Alert if velocity drops >10% over 3 consecutive iterations
- **Quality Regression**: Alert if test coverage drops >5 percentage points
- **Deployment Failure**: Alert if change failure rate exceeds 15% (DORA Medium threshold)
- **MTTR Spike**: Alert if MTTR exceeds 4 hours (DORA High threshold breach)
- **Rationale**: Early warning system for performance/quality degradation

**BR-MT-005: Recommendation Prioritization**
- **Priority 1 (Critical)**: Recommendations addressing velocity drops >10% or quality regressions
- **Priority 2 (High)**: Recommendations improving DORA rating (Medium → High, High → Elite)
- **Priority 3 (Medium)**: Recommendations optimizing team capacity (utilization 80-95%)
- **Priority 4 (Low)**: Nice-to-have improvements (edge case optimizations)
- **Rationale**: Focus Framework Maintainer on high-impact actions

## 13. Data Requirements

### Input Data

| Data Element | Format | Source | Validation |
|-------------|--------|---------|-----------|
| Git Commit History | Git log JSON | `.git/` repository | Minimum 20 commits |
| Pull Request Data | GitHub API JSON | GitHub API (`/repos/{owner}/{repo}/pulls`) | Valid GITHUB_TOKEN |
| Iteration Plans | Markdown + YAML frontmatter | `.aiwg/planning/iteration-{N}-plan.md` | Valid YAML schema |
| Test Coverage Reports | JSON/XML | `.aiwg/testing/coverage-reports/` | Valid coverage format (Cobertura, LCOV) |
| Code Review Data | Markdown | `.aiwg/working/iteration-{N}/reviews/` | Review outcome (APPROVED/CONDITIONAL/REJECTED) |
| Deployment Logs | JSON | `.aiwg/deployment/logs/` | Deployment timestamp, status (success/failure) |
| Incident Logs | Markdown | `.aiwg/deployment/incidents/` | Incident timestamp, MTTR (time-to-restore) |
| Quality Scores | CSV | `.aiwg/quality/quality-scores.csv` | Score range 0-100 |

### Output Data

| Data Element | Format | Destination | Retention |
|-------------|--------|-------------|----------|
| Metrics Dashboard | Markdown (2,000-3,000 words) | `.aiwg/reports/metrics-dashboard.md` | Permanent (Git-tracked) |
| Velocity History | CSV | `.aiwg/metrics/velocity-history.csv` | 12 months (rolling window) |
| Quality History | CSV | `.aiwg/metrics/quality-history.csv` | Permanent (all-time retention) |
| DORA History | CSV | `.aiwg/metrics/dora-history.csv` | 12 months (4 quarters) |
| Recommendations | Markdown | `.aiwg/working/metrics-collection/recommendations.md` | 30 days (archive after action) |
| Raw Metrics Data | JSON | `.aiwg/working/metrics-collection/raw-data-{date}.json` | 7 days (temporary cache) |
| Audit Trail | Log file | `.aiwg/metrics/audit-trail.log` | Permanent (compliance) |

### Data Validation Rules

**Velocity Metrics:**
- Commit velocity: Must be >0 commits/day (else: insufficient data)
- PR velocity: Must be >0 PRs/week (else: insufficient data)
- Story point velocity: Must be >0 SP/iteration (else: iteration plan missing)
- Velocity trend: Calculated only if 3+ iterations completed

**Quality Metrics:**
- Test coverage: 0-100% range (else: invalid coverage report)
- Code review approval rate: 0-100% range (else: invalid review data)
- Defect density: >0 defects/commit (0 is valid, no defects detected)
- Quality score: 0-100 range (else: invalid quality score data)

**DORA Metrics:**
- Deployment frequency: >0 deployments (else: deployment logs missing)
- Lead time: >0 days (else: commit/deployment timestamps missing)
- MTTR: >0 hours (else: incident logs missing or zero incidents)
- Change failure rate: 0-100% range (else: invalid deployment status data)

## 14. Open Issues and TODOs

1. **Issue 001: Cross-Project Metrics Aggregation Dependency**
   - **Description**: Multi-project metrics aggregation (Alt-4) requires FID-007 (Workspace Management) which is deferred to P2
   - **Impact**: Solo developers managing multiple AIWG projects cannot aggregate metrics across projects
   - **Workaround**: Manually run `/project-metrics` per project and manually aggregate results
   - **Owner**: Metrics Analyst agent
   - **Due Date**: Version 2.0 (post-MVP, after FID-007 delivery)

2. **Issue 002: DORA Metrics Industry Benchmark Accuracy**
   - **Description**: DORA metric thresholds (Elite/High/Medium/Low) based on 2023 industry benchmarks - may be outdated
   - **Impact**: DORA rating may not reflect current industry standards
   - **Mitigation**: Review DORA benchmarks annually, update thresholds as industry evolves
   - **Owner**: Product Strategist
   - **Due Date**: Q1 2026 (annual benchmark review)

3. **TODO 001: Live Dashboard Visual Charts**
   - **Description**: Live dashboard currently uses Markdown + mermaid.js (text-based charts) - consider HTML dashboard with Chart.js for richer visualizations
   - **Benefit**: Improved UX (interactive charts, drill-down capabilities)
   - **Assigned**: Dashboard Designer agent
   - **Due Date**: Version 1.2 (post-MVP enhancement)

4. **TODO 002: Automated Anomaly Root Cause Analysis**
   - **Description**: Current anomaly detection flags velocity drops/quality regressions but requires manual root cause analysis
   - **Enhancement**: Integrate LLM-based root cause analysis (e.g., Claude analyzes Git commits + retrospectives to identify root causes)
   - **Benefit**: Faster remediation (automated diagnosis reduces investigation time)
   - **Assigned**: Metrics Analyst agent
   - **Due Date**: Version 1.3

5. **TODO 003: Metrics Collection Performance Optimization**
   - **Description**: Large projects (>10,000 commits) may exceed 2-minute target for NFR-MT-01 - investigate parallel Git log parsing
   - **Enhancement**: Implement chunked Git log parsing with parallel execution (similar to Exc-4)
   - **Benefit**: Scale to enterprise-sized repositories (100k+ commits)
   - **Assigned**: Performance Engineer agent
   - **Due Date**: Version 1.1 (if performance regression detected)

## 15. References

**Requirements Documents:**
- [Feature Backlog Prioritized](/aiwg/requirements/feature-backlog-prioritized.md) - FID-002 (Metrics Collection)
- [Product Strategist Review](/aiwg/working/requirements-workshop-reviews/product-strategist-review.md) - P1 Deferral Rationale
- [Vision Document](/aiwg/requirements/vision-document.md) - Section 3.3: Success Metrics (velocity + quality validation)
- [Supplemental Specification](/aiwg/requirements/supplemental-specification.md) - NFR-PERF-005, NFR-PERF-006, NFR-DATA-003

**Architecture Documents:**
- [Software Architecture Document](/aiwg/planning/sdlc-framework/architecture/software-architecture-doc.md) - Section 5.3 (Metrics Collector), Section 4.2 (Core Orchestrator)
- [ADR-007: Framework-Scoped Workspace Architecture](/aiwg/architecture/decisions/ADR-007-framework-scoped-workspace.md) - Multi-project metrics context

**Agent Definitions:**
- [Metrics Analyst Agent](/agentic/code/frameworks/sdlc-complete/agents/metrics-analyst.md)
- [Performance Engineer Agent](/agentic/code/frameworks/sdlc-complete/agents/performance-engineer.md)
- [Dashboard Designer Agent](/agentic/code/frameworks/sdlc-complete/agents/dashboard-designer.md)

**Command Definitions:**
- [project-metrics.md](/.claude/commands/project-metrics.md)
- [project-health-check.md](/.claude/commands/project-health-check.md) - Related command (includes subset of metrics)

**Templates:**
- [Metrics Dashboard Template](/agentic/code/frameworks/sdlc-complete/templates/management/metrics-dashboard-template.md)
- [Iteration Plan Template](/agentic/code/frameworks/sdlc-complete/templates/management/iteration-plan-template.md) - Story point extraction reference

**Related Use Cases:**
- [UC-005: Framework Self-Improvement](/aiwg/requirements/use-cases/UC-005-framework-self-improvement.md) - Velocity tracking reference
- [UC-006: Automated Traceability](/aiwg/requirements/use-cases/UC-006-automated-traceability.md) - NFR-PERF-005 shared requirement

---

## Traceability Matrix

### Requirements Traceability

| Requirement ID | Source Document | Implementation Component | Test Case |
|---------------|-----------------|-------------------------|-----------|
| FID-002 | Feature Backlog Prioritized | project-metrics.md, velocity-tracker.mjs, dora-metrics.mjs | TC-MT-001 through TC-MT-025 |
| NFR-PERF-005 | Supplemental Specification | Metrics Analyst agent (parallel execution) | TC-MT-015 |
| NFR-PERF-006 | Supplemental Specification | Background metrics collection (async) | TC-MT-016 |
| NFR-DATA-003 | Supplemental Specification | Data retention policy (12-month rolling window) | TC-MT-017 |
| NFR-FRESH-001 | Supplemental Specification | Live dashboard mode (60-second refresh) | TC-MT-018 |
| NFR-MT-01 | This document (Section 11) | Git log parser optimization | TC-MT-019 |
| NFR-MT-02 | This document (Section 11) | Real-time vs scheduled collection modes | TC-MT-020 |

### SAD Component Mapping

**Primary Components (from SAD v1.0):**
- Metrics Analyst agent - Section 5.3 (specialized agent for metrics collection and analysis)
- Core Orchestrator (Claude Code) - Section 4.2 (coordinates metrics collection workflow)
- Dashboard Designer agent - Section 5.1 (generates visualizations)

**Supporting Components:**
- `tools/metrics/velocity-tracker.mjs` - Development speed tracking (commits/day, PRs/week, story points)
- `tools/metrics/quality-metrics.mjs` - Artifact quality aggregation (test coverage, code review, defect density)
- `tools/metrics/dora-metrics.mjs` - DORA indicators (deployment frequency, lead time, MTTR, change failure rate)
- GitHub API integration - External dependency (PR metrics, deployment events)

**Integration Points:**
- `.aiwg/metrics/` (historical data storage: velocity-history.csv, quality-history.csv, dora-history.csv)
- `.aiwg/reports/` (dashboard output: metrics-dashboard.md)
- `.aiwg/working/metrics-collection/` (temporary workspace: raw-data-{date}.json, recommendations.md)
- `.git/` repository (commit history source)
- `.aiwg/planning/iteration-{N}-plan.md` (story point velocity source)
- `.aiwg/testing/coverage-reports/` (test coverage source)
- `.aiwg/working/iteration-{N}/reviews/` (code review approval rate source)
- `.aiwg/deployment/logs/` (deployment frequency, lead time source)
- `.aiwg/deployment/incidents/` (MTTR, change failure rate source)

### ADR References

**ADR-007: Framework-Scoped Workspace Architecture** (Referenced in Alt-4: Multi-Project Metrics Aggregation)
- Multi-project metrics aggregation requires workspace-level configuration (deferred to v2.0)
- Workspace configuration file: `~/.aiwg/workspaces/all-projects.yaml`
- Cross-project metrics rollup: Aggregate velocity, quality, DORA metrics across multiple AIWG projects

---

## Acceptance Criteria

### AC-001: Basic Metrics Collection Workflow

**Given:** AIWG framework repository with 5 iterations completed, Git history (245 commits), SDLC artifacts in `.aiwg/`
**When:** Framework Maintainer runs `/project-metrics`
**Then:**
- Metrics dashboard generated in <2 minutes (1,800-3,000 words)
- Velocity metrics collected: Commits/day (2.72), PRs/week (2.95), story points/iteration (36.6 average)
- Quality metrics collected: Test coverage (92%), code review approval (84%), defect escape rate (2.1%)
- DORA metrics calculated: Deployment frequency (1.33/week), lead time (4.8 days), MTTR (1.2 hours), change failure rate (8.3%)
- Historical data updated: `.aiwg/metrics/velocity-history.csv`, `.aiwg/metrics/quality-history.csv`, `.aiwg/metrics/dora-history.csv`
- Dashboard saved to: `.aiwg/reports/metrics-dashboard.md`

### AC-002: Velocity Trend Analysis

**Given:** AIWG project with 5 iterations completed (sufficient data for trend analysis)
**When:** Metrics Analyst calculates velocity trends
**Then:**
- Commit velocity trend calculated: +15% (last 90 days vs previous 90 days)
- PR velocity trend calculated: +8% (last 90 days vs previous period)
- Story point velocity trend calculated: +18% (Iteration 1 → Iteration 5)
- Velocity trend direction identified: **Improving** (all 3 velocity metrics trending upward)
- Trend analysis included in dashboard with trend charts (mermaid.js line charts)

### AC-003: Quality Trend Analysis

**Given:** AIWG project with test coverage reports, code review data, defect tracking
**When:** Metrics Analyst calculates quality trends
**Then:**
- Test coverage trend calculated: +20 percentage points (72% → 92% over 5 iterations)
- Code review approval rate calculated: 84% (38/45 reviews approved on first attempt)
- Defect escape rate calculated: 2.1% (3 production bugs / 245 commits)
- Quality score aggregated: 91/100 (weighted average across artifacts)
- Quality trend direction identified: **Strong Improvement** (test coverage +20 pts, stable approval rate)

### AC-004: DORA Metrics Calculation

**Given:** AIWG project with deployment logs, incident logs, GitHub API access
**When:** Metrics Analyst calculates DORA metrics
**Then:**
- Deployment frequency calculated: 1.33 deployments/week (12 deployments / 90 days)
- Lead time for changes calculated: 4.8 days average (commit → deploy timestamp)
- Mean Time to Restore (MTTR) calculated: 1.2 hours average (2 incidents / 90 days)
- Change failure rate calculated: 8.3% (1 failure / 12 deployments)
- DORA rating determined: Medium (2/4 metrics in Elite range: MTTR 1.2 hours)

### AC-005: Anomaly Detection

**Given:** AIWG project with velocity drop: Iteration 4 (40 SP) → Iteration 5 (38 SP) = -5%
**When:** Metrics Analyst identifies trends and anomalies
**Then:**
- Anomaly detected: Velocity drop of -5% (below 10% threshold, within acceptable variance)
- Root cause analysis attempted: Iteration 5 included high-complexity features (FID-005)
- Risk assessment: Low (within 20% buffer tolerance per BR-FSI-002)
- Action required: None (expected variance, not concerning)
- Anomaly logged in dashboard: "Minor variance (-5%) within acceptable range"

### AC-006: Actionable Recommendations

**Given:** AIWG project with metrics analysis complete (velocity +18%, quality 91/100, DORA Medium)
**When:** Metrics Analyst generates recommendations
**Then:**
- 3-5 process improvement recommendations generated (not 0, not 10+)
- Recommendations prioritized: Priority 1 (Critical), Priority 2 (High), Priority 3 (Medium)
- Each recommendation includes: description, rationale, action, impact
- Recommendations address identified gaps: "Increase deployment frequency to 3/week (DORA High target)"
- Recommendations saved to: `.aiwg/working/metrics-collection/recommendations.md`

### AC-007: Historical Data Persistence

**Given:** Metrics collection completes successfully
**When:** Metrics Analyst updates historical data
**Then:**
- Velocity history updated: `.aiwg/metrics/velocity-history.csv` (append mode)
- Quality history updated: `.aiwg/metrics/quality-history.csv` (append mode)
- DORA history updated: `.aiwg/metrics/dora-history.csv` (append mode)
- Data retention policy applied: CSV rows older than 12 months deleted (NFR-DATA-003)
- Audit trail maintained: Permanent retention in `.aiwg/metrics/audit-trail.log`

### AC-008: "Quality Without Friction" Validation

**Given:** AIWG framework with 5 iterations completed, velocity +18%, quality +20 percentage points
**When:** Framework Maintainer reviews metrics dashboard
**Then:**
- Velocity trend validated: +18% improvement (Iteration 1 → Iteration 5)
- Quality trend validated: +20 percentage points (72% → 92% test coverage)
- **Conclusion**: Quality improving faster than velocity (framework delivers on promise)
- Vision-document.md success metrics validated: "Ship weekly, test comprehensively, maintain 80%+ coverage"
- Quantitative proof available for prospective users: "Framework maintains high quality (91/100) while increasing velocity"

### AC-009: Real-Time Dashboard (Live Mode)

**Given:** Framework Maintainer runs `/project-metrics --live`
**When:** Live dashboard mode enabled
**Then:**
- Persistent metrics server launched (runs in background)
- Dashboard refreshes every 60 seconds (NFR-FRESH-001)
- Live dashboard file updated: `.aiwg/reports/metrics-dashboard-live.md`
- Live dashboard URL provided: "http://localhost:8080/metrics"
- Dashboard updates automatically as commits pushed, PRs merged
- Session archived when stopped: `.aiwg/metrics/live-session-{date}.csv`

### AC-010: Custom Metrics Definition

**Given:** Framework Maintainer creates custom metrics config: `.aiwg/metrics/custom-kpis.yaml`
**When:** Maintainer runs `/project-metrics --custom-config .aiwg/metrics/custom-kpis.yaml`
**Then:**
- Custom metrics config validated: YAML schema validation passes
- Custom metrics collected: Documentation Coverage (90%), ADR Freshness (12 days), Security Review Frequency (1.2/iteration)
- Custom metrics appended to dashboard: "Custom KPIs" section added
- Custom metrics meet user-defined targets: Documentation Coverage 90% (target: 100%), ADR Freshness 12 days (target: <30 days)

### AC-011: Exception Handling (Insufficient Git History)

**Given:** AIWG project with only 12 commits (below 20-commit minimum)
**When:** Metrics Analyst attempts to collect velocity metrics
**Then:**
- Insufficient data detected: 12 commits (minimum 20 required)
- User prompted with options: "Continue with snapshot metrics? (y/n)"
- User chooses: "Generate snapshot metrics"
- Limited-data dashboard generated: `.aiwg/reports/metrics-dashboard-limited.md`
- Dashboard includes disclaimer: "Insufficient data for reliable velocity calculation (minimum 20 commits required)"
- Error logged to: `.aiwg/working/metrics-collection/errors.log`

### AC-012: Exception Handling (GitHub API Rate Limit)

**Given:** GitHub API rate limit exceeded (403 Forbidden)
**When:** Metrics Analyst attempts to collect PR metrics
**Then:**
- Rate limit error detected: "403 Forbidden - Rate limit exceeded. Retry after 3600 seconds."
- User prompted with options: "1. Wait 60 minutes, 2. Use cached data, 3. Skip PR metrics"
- User chooses: "Use cached PR data"
- Cached PR metrics loaded: `.aiwg/metrics/pr-cache-{date}.json`
- Dashboard includes disclaimer: "PR Metrics: Cached data from {date} (GitHub API rate limit exceeded)"

### AC-013: Performance - Metrics Collection Time

**Given:** AIWG project with 1,000 commits, 50 SDLC artifacts
**When:** Metrics collection executes
**Then:**
- Collection completes in <2 minutes (NFR-MT-01: <2 minutes for 1,000 commits)
- Collection overhead: <5% performance impact (NFR-PERF-006)
- Dashboard generated in <3 seconds after collection (NFR-MT-04)

### AC-014: Performance - Large Project Handling

**Given:** AIWG project with >10,000 commits (large repository)
**When:** Metrics collection exceeds 5-minute timeout
**Then:**
- Timeout detected by Core Orchestrator
- Metrics collection chunked into parallel tasks: Velocity, Quality, DORA metrics
- Parallel execution completes in <3 minutes (50% time reduction vs sequential)
- Parallel results merged into unified dashboard

### AC-015: Data Quality - Metrics Accuracy

**Given:** Metrics collection completes successfully
**When:** Metrics validated against Git log, iteration plans, test coverage reports
**Then:**
- Velocity metrics accuracy: 98%+ (NFR-MT-05: validated against Git log)
- Quality metrics accuracy: 98%+ (validated against test coverage reports)
- DORA metrics accuracy: 98%+ (validated against deployment logs, incident logs)
- Historical data integrity: Zero data loss (NFR-MT-06)

---

## Test Cases

### TC-MT-001: Basic Metrics Collection

**Objective:** Validate end-to-end metrics collection workflow
**Preconditions:** AIWG project with 5 iterations, 245 commits, SDLC artifacts in `.aiwg/`
**Test Steps:**
1. Run: `/project-metrics`
2. Wait for metrics collection completion
3. Verify dashboard exists: `.aiwg/reports/metrics-dashboard.md`
4. Verify dashboard word count: 2,000-3,000 words
5. Verify dashboard sections: Executive Summary, Velocity, Quality, DORA, Recommendations
6. Verify historical data updated: `.aiwg/metrics/velocity-history.csv`, `.aiwg/metrics/quality-history.csv`, `.aiwg/metrics/dora-history.csv`
**Expected Result:** Metrics dashboard generated in <2 minutes, all sections populated
**Pass/Fail:** PASS if all verifications true

### TC-MT-002: Velocity Metrics Calculation

**Objective:** Validate velocity metrics accuracy
**Preconditions:** AIWG project with 245 commits over 90 days, 38 PRs merged, 5 iterations completed
**Test Steps:**
1. Run metrics collection
2. Extract velocity metrics from dashboard
3. Verify commit velocity: 2.72 commits/day (245 commits / 90 days)
4. Verify PR velocity: 2.95 PRs/week (38 PRs / 12.86 weeks)
5. Verify story point velocity: 36.6 SP/iteration average (183 total SP / 5 iterations)
6. Manually validate against Git log: `git log --since="90 days ago" --oneline | wc -l` → 245 commits
**Expected Result:** Velocity metrics match manual calculations (98%+ accuracy)
**Pass/Fail:** PASS if all velocity metrics accurate

### TC-MT-003: Quality Metrics Calculation

**Objective:** Validate quality metrics accuracy
**Preconditions:** AIWG project with test coverage reports, code review data, defect tracking
**Test Steps:**
1. Run metrics collection
2. Extract quality metrics from dashboard
3. Verify test coverage: 92% (from `.aiwg/testing/coverage-reports/iteration-5-coverage.json`)
4. Verify code review approval rate: 84% (38 approved / 45 total reviews)
5. Verify defect escape rate: 2.1% (3 production bugs / 245 commits)
6. Verify quality score: 91/100 (weighted average across artifacts)
7. Manually validate against test coverage reports
**Expected Result:** Quality metrics match manual calculations (98%+ accuracy)
**Pass/Fail:** PASS if all quality metrics accurate

### TC-MT-004: DORA Metrics Calculation

**Objective:** Validate DORA metrics accuracy
**Preconditions:** AIWG project with deployment logs, incident logs, GitHub API access
**Test Steps:**
1. Run metrics collection
2. Extract DORA metrics from dashboard
3. Verify deployment frequency: 1.33 deployments/week (12 deployments / 90 days)
4. Verify lead time: 4.8 days average (commit → deploy timestamp)
5. Verify MTTR: 1.2 hours average (2 incidents, total restore time 2.4 hours)
6. Verify change failure rate: 8.3% (1 failure / 12 deployments)
7. Manually validate against deployment logs: `cat .aiwg/deployment/logs/deployment-*.json | grep status`
**Expected Result:** DORA metrics match manual calculations (98%+ accuracy)
**Pass/Fail:** PASS if all DORA metrics accurate

### TC-MT-005: Velocity Trend Analysis

**Objective:** Validate velocity trend calculation
**Preconditions:** AIWG project with 5 iterations completed
**Test Steps:**
1. Run metrics collection
2. Extract velocity trends from dashboard
3. Verify commit velocity trend: +15% (last 90 days vs previous 90 days)
4. Verify PR velocity trend: +8% (last 90 days vs previous period)
5. Verify story point velocity trend: +18% (Iteration 1 → Iteration 5)
6. Verify trend direction: "Improving" (all 3 metrics trending upward)
7. Manually calculate: (38 SP - 32 SP) / 32 SP = +18.75% → Matches dashboard
**Expected Result:** Velocity trends calculated correctly, trend direction accurate
**Pass/Fail:** PASS if trend calculations match manual validation

### TC-MT-006: Quality Trend Analysis

**Objective:** Validate quality trend calculation
**Preconditions:** AIWG project with test coverage data for 5 iterations
**Test Steps:**
1. Run metrics collection
2. Extract quality trends from dashboard
3. Verify test coverage trend: +20 percentage points (72% → 92%)
4. Verify code review approval rate: 84% (stable across iterations)
5. Verify defect escape rate: 2.1% (below 5% industry benchmark)
6. Verify quality score trend: +12 points (79 → 91 over 5 iterations)
7. Verify trend direction: "Strong Improvement" (test coverage +20 pts)
**Expected Result:** Quality trends calculated correctly, trend direction accurate
**Pass/Fail:** PASS if trend calculations match expectations

### TC-MT-007: DORA Rating Determination

**Objective:** Validate DORA rating calculation
**Preconditions:** AIWG project with DORA metrics: Deployment frequency 1.33/week, lead time 4.8 days, MTTR 1.2 hours, CFR 8.3%
**Test Steps:**
1. Run metrics collection
2. Extract DORA ratings from dashboard
3. Verify deployment frequency rating: Medium (1.33/week, industry benchmark: 1-7/week)
4. Verify lead time rating: Medium (4.8 days, industry benchmark: 1-7 days)
5. Verify MTTR rating: Elite (1.2 hours, industry benchmark: <1 hour for elite)
6. Verify change failure rate rating: Medium (8.3%, industry benchmark: 0-15% for medium)
7. Verify overall DORA rating: Medium (2/4 metrics in Elite range)
**Expected Result:** DORA ratings match industry benchmarks
**Pass/Fail:** PASS if DORA ratings correct

### TC-MT-008: Anomaly Detection

**Objective:** Validate anomaly detection logic
**Preconditions:** AIWG project with velocity drop: Iteration 4 (40 SP) → Iteration 5 (38 SP) = -5%
**Test Steps:**
1. Run metrics collection
2. Verify anomaly detection in dashboard
3. Verify anomaly detected: "Velocity drop of -5% (below 10% threshold, within acceptable variance)"
4. Verify root cause analysis: "Iteration 5 included high-complexity features (FID-005)"
5. Verify risk assessment: "Low (within 20% buffer tolerance)"
6. Verify action required: "None (expected variance)"
7. Verify anomaly threshold: Velocity drops >10% trigger alert (5% does not)
**Expected Result:** Anomaly detected correctly, risk assessed appropriately
**Pass/Fail:** PASS if anomaly detection logic correct

### TC-MT-009: Recommendation Generation

**Objective:** Validate actionable recommendation generation
**Preconditions:** AIWG project with DORA metrics: Deployment frequency 1.33/week (Medium rating, target: High)
**Test Steps:**
1. Run metrics collection
2. Extract recommendations from dashboard
3. Count recommendations: Must be 3-5 (not 0, not 10+)
4. Verify recommendation format: description, rationale, action, impact
5. Verify Priority 1 recommendation: "Increase deployment frequency from 1.33/week to 3/week"
6. Verify recommendation rationale: "Reduce change failure rate from 8.3% to <5% (smaller, safer deployments)"
7. Verify recommendation priority: Priority 2 (High) - improves DORA rating
**Expected Result:** 3-5 actionable recommendations generated, prioritized correctly
**Pass/Fail:** PASS if 3-5 recommendations with correct format and prioritization

### TC-MT-010: Historical Data Persistence

**Objective:** Validate historical data storage and retention
**Preconditions:** Metrics collection completes successfully
**Test Steps:**
1. Run metrics collection
2. Verify velocity history updated: `.aiwg/metrics/velocity-history.csv`
3. Verify quality history updated: `.aiwg/metrics/quality-history.csv`
4. Verify DORA history updated: `.aiwg/metrics/dora-history.csv`
5. Verify data retention: CSV rows older than 12 months deleted
6. Count CSV rows: Must be ≤365 rows (12 months @ 1 row/day maximum)
7. Verify audit trail: Permanent retention in `.aiwg/metrics/audit-trail.log`
**Expected Result:** Historical data stored correctly, retention policy applied
**Pass/Fail:** PASS if all historical data files updated and retention policy enforced

### TC-MT-011: Real-Time Dashboard (Live Mode)

**Objective:** Validate live dashboard mode
**Preconditions:** Framework Maintainer runs `/project-metrics --live`
**Test Steps:**
1. Run: `/project-metrics --live`
2. Verify persistent metrics server launched (background process)
3. Verify live dashboard file created: `.aiwg/reports/metrics-dashboard-live.md`
4. Verify live dashboard URL provided: "http://localhost:8080/metrics"
5. Wait 60 seconds (refresh interval)
6. Verify dashboard auto-refresh: File modification timestamp updated
7. Push new commit to Git
8. Wait 60 seconds
9. Verify commit velocity updated: Increased from 2.72 to 2.85 commits/day
10. Stop live dashboard: Ctrl+C
11. Verify session archived: `.aiwg/metrics/live-session-{date}.csv`
**Expected Result:** Live dashboard updates every 60 seconds, session archived on stop
**Pass/Fail:** PASS if live updates work and session archived

### TC-MT-012: Custom Metrics Definition

**Objective:** Validate custom metrics configuration
**Preconditions:** Custom metrics config created: `.aiwg/metrics/custom-kpis.yaml`
**Test Steps:**
1. Create custom config with 3 KPIs: Documentation Coverage, ADR Freshness, Security Review Frequency
2. Run: `/project-metrics --custom-config .aiwg/metrics/custom-kpis.yaml`
3. Verify config validated: YAML schema validation passes
4. Verify custom metrics collected: Documentation Coverage (90%), ADR Freshness (12 days), Security Review Frequency (1.2/iteration)
5. Verify custom metrics in dashboard: "Custom KPIs" section added
6. Verify custom metrics vs targets: Documentation Coverage 90% (target: 100%), ADR Freshness 12 days (target: <30 days) - both pass
**Expected Result:** Custom metrics collected, appended to dashboard, targets validated
**Pass/Fail:** PASS if custom metrics collected and validated against targets

### TC-MT-013: Exception Handling - Insufficient Git History

**Objective:** Validate exception handling for insufficient commit history
**Preconditions:** AIWG project with only 12 commits (below 20-commit minimum)
**Test Steps:**
1. Delete recent commits to reduce history to 12 commits: `git reset --hard HEAD~33`
2. Run: `/project-metrics`
3. Verify insufficient data detected: "Insufficient Git history (12 commits, minimum 20 required)"
4. Verify user prompt: "Continue with snapshot metrics? (y/n)"
5. Respond: "y" (generate snapshot metrics)
6. Verify limited-data dashboard generated: `.aiwg/reports/metrics-dashboard-limited.md`
7. Verify dashboard disclaimer: "Insufficient data for reliable velocity calculation (minimum 20 commits required)"
8. Verify error logged: `.aiwg/working/metrics-collection/errors.log`
**Expected Result:** Exception handled gracefully, snapshot dashboard generated with disclaimer
**Pass/Fail:** PASS if snapshot dashboard generated with appropriate disclaimers

### TC-MT-014: Exception Handling - GitHub API Rate Limit

**Objective:** Validate exception handling for GitHub API rate limit
**Preconditions:** GitHub API rate limit exceeded (403 Forbidden)
**Test Steps:**
1. Mock GitHub API rate limit response: 403 Forbidden
2. Run: `/project-metrics`
3. Verify rate limit error detected: "403 Forbidden - Rate limit exceeded. Retry after 3600 seconds."
4. Verify user prompt: "Options: 1. Wait 60 minutes, 2. Use cached data, 3. Skip PR metrics"
5. Respond: "2" (use cached PR data)
6. Verify cached data loaded: `.aiwg/metrics/pr-cache-{date}.json`
7. Verify dashboard disclaimer: "PR Metrics: Cached data from {date} (GitHub API rate limit exceeded)"
8. Verify dashboard generated with cached data
**Expected Result:** Rate limit handled gracefully, cached data used with disclaimer
**Pass/Fail:** PASS if cached data used and dashboard generated with disclaimer

### TC-MT-015: Performance - Metrics Collection Time (NFR-PERF-005)

**Objective:** Validate metrics collection completes within performance target
**Preconditions:** AIWG project with 1,000 commits, 50 SDLC artifacts
**Test Steps:**
1. Start timer
2. Run: `/project-metrics`
3. Wait for metrics collection completion
4. Stop timer when dashboard saved
5. Verify collection time: <2 minutes (NFR-MT-01: <2 minutes for 1,000 commits)
6. Verify collection overhead: <5% performance impact (NFR-PERF-006)
**Expected Result:** Metrics collection completes in <2 minutes
**Pass/Fail:** PASS if collection time <2 minutes

### TC-MT-016: Performance - Collection Overhead (NFR-PERF-006)

**Objective:** Validate metrics collection overhead <5% performance impact
**Preconditions:** AIWG project with active development (commits, PRs, tests running)
**Test Steps:**
1. Measure baseline CPU usage: 10% (no metrics collection running)
2. Start live metrics collection: `/project-metrics --live`
3. Measure CPU usage with metrics collection: 14%
4. Calculate overhead: 14% - 10% = 4% (below 5% threshold)
5. Verify memory usage: <100MB additional memory
6. Verify disk I/O: <10MB/s (minimal impact)
**Expected Result:** Metrics collection overhead <5% performance impact
**Pass/Fail:** PASS if overhead <5%

### TC-MT-017: Data Retention Policy (NFR-DATA-003)

**Objective:** Validate 12-month data retention policy
**Preconditions:** AIWG project with 18 months of historical metrics data
**Test Steps:**
1. Verify velocity history contains 18 months of data (before retention policy applied)
2. Run: `/project-metrics`
3. Verify data retention policy applied: CSV rows older than 12 months deleted
4. Count CSV rows in velocity-history.csv: Must be ≤365 rows (12 months @ 1 row/day maximum)
5. Verify audit trail contains permanent retention: All 18 months of data in audit-trail.log
6. Verify deleted data logged: "Deleted 180 rows older than 12 months (retention policy)"
**Expected Result:** Data older than 12 months deleted, audit trail retained permanently
**Pass/Fail:** PASS if retention policy applied and audit trail preserved

### TC-MT-018: Real-Time Update Latency (NFR-FRESH-001)

**Objective:** Validate live dashboard update latency <1 second
**Preconditions:** Live metrics collection running: `/project-metrics --live`
**Test Steps:**
1. Start live dashboard
2. Push new commit to Git
3. Start timer (measure update latency)
4. Wait for dashboard update (commit velocity increases)
5. Stop timer when update reflected in dashboard file
6. Verify update latency: <1 second (NFR-FRESH-001)
7. Verify dashboard file modification timestamp: Within 1 second of commit push
**Expected Result:** Dashboard updates within 1 second of new commit
**Pass/Fail:** PASS if update latency <1 second

### TC-MT-019: Large Project Handling (>10,000 Commits)

**Objective:** Validate metrics collection for large projects
**Preconditions:** AIWG project with >10,000 commits (large repository)
**Test Steps:**
1. Run: `/project-metrics`
2. Verify timeout detected after 5 minutes
3. Verify metrics collection chunked into parallel tasks: Velocity, Quality, DORA metrics
4. Verify parallel execution completes in <3 minutes (50% time reduction vs sequential)
5. Verify parallel results merged into unified dashboard
6. Verify dashboard completeness: All sections populated (no missing data)
**Expected Result:** Parallel execution completes in <3 minutes, dashboard complete
**Pass/Fail:** PASS if parallel execution completes successfully

### TC-MT-020: Metrics Accuracy Validation (NFR-MT-05)

**Objective:** Validate metrics accuracy 98%+ against Git log
**Preconditions:** AIWG project with known Git history (245 commits, 38 PRs, 5 iterations)
**Test Steps:**
1. Run metrics collection
2. Extract velocity metrics from dashboard
3. Manually validate commit velocity: `git log --since="90 days ago" --oneline | wc -l` → 245 commits
4. Manually validate PR velocity: GitHub API query → 38 PRs merged
5. Manually validate story point velocity: Sum iteration plan story points → 183 total SP
6. Calculate accuracy: (Automated metrics / Manual metrics) × 100%
7. Verify commit velocity accuracy: 100% (245/245)
8. Verify PR velocity accuracy: 100% (38/38)
9. Verify story point velocity accuracy: 100% (183/183)
10. Verify overall accuracy: 100% (exceeds 98% target)
**Expected Result:** Metrics accuracy 98%+ (validated against manual calculations)
**Pass/Fail:** PASS if accuracy ≥98%

### TC-MT-021: Dashboard Readability (NFR-MT-07)

**Objective:** Validate dashboard readability and format
**Preconditions:** Metrics collection completes successfully
**Test Steps:**
1. Open dashboard: `.aiwg/reports/metrics-dashboard.md`
2. Verify word count: 2,000-3,000 words (NFR-MT-07)
3. Verify sections: Executive Summary, Velocity, Quality, DORA, Recommendations
4. Verify Executive Summary: <300 words (high-level KPIs, scannable)
5. Verify mermaid.js charts: Line charts (velocity trends), bar charts (quality trends), quadrant chart (DORA metrics)
6. Verify GitHub compatibility: Markdown renders correctly in GitHub (preview in browser)
7. Verify scannability: Headings (##, ###), bulleted lists, tables, bold key metrics
**Expected Result:** Dashboard readable, scannable, GitHub-compatible
**Pass/Fail:** PASS if dashboard meets readability criteria

### TC-MT-022: Recommendation Actionability (NFR-MT-08)

**Objective:** Validate recommendation actionability (3-5 recommendations)
**Preconditions:** Metrics collection generates recommendations
**Test Steps:**
1. Extract recommendations from dashboard
2. Count recommendations: Must be 3-5 (NFR-MT-08)
3. Verify recommendation format: description, rationale, action, impact
4. Verify recommendation priority: Priority 1 (Critical), Priority 2 (High), Priority 3 (Medium)
5. Verify actionability: Each recommendation has clear next step (e.g., "Create FID-009", "Allocate 20% capacity")
6. Verify recommendation focus: High-impact improvements (DORA rating, velocity optimization, quality maintenance)
7. Verify recommendations avoid overwhelming: Max 5 recommendations (not 10+)
**Expected Result:** 3-5 actionable recommendations, prioritized, clear next steps
**Pass/Fail:** PASS if 3-5 recommendations with actionable next steps

### TC-MT-023: Business Value - "Quality Without Friction" Validation

**Objective:** Validate framework's "quality without friction" claim with quantitative data
**Preconditions:** AIWG project with 5 iterations, velocity +18%, quality +20 percentage points
**Test Steps:**
1. Run metrics collection
2. Extract velocity trend: +18% (Iteration 1 → Iteration 5)
3. Extract quality trend: +20 percentage points (72% → 92% test coverage)
4. Compare velocity vs quality: Quality improving faster than velocity (+20 pts vs +18%)
5. Verify conclusion: "Framework maintains high quality (91/100) while increasing velocity"
6. Verify vision-document.md success metrics: "Ship weekly, test comprehensively, maintain 80%+ coverage" - validated
7. Verify prospective user trust: Quantitative proof available for marketing materials
**Expected Result:** "Quality without friction" claim validated with data
**Pass/Fail:** PASS if quality improving faster than (or equal to) velocity

### TC-MT-024: Integration - GitHub API PR Metrics

**Objective:** Validate GitHub API integration for PR metrics
**Preconditions:** GitHub API token configured, AIWG project with PR history
**Test Steps:**
1. Run metrics collection
2. Verify GitHub API query executed: `/repos/{owner}/{repo}/pulls?state=closed&per_page=100`
3. Verify API response: HTTP 200 OK, JSON array of PRs
4. Verify PR metrics extracted: Total PRs merged (38), PRs per week (2.95), average merge time (4.2 hours)
5. Verify API rate limit handling: Check `X-RateLimit-Remaining` header
6. Verify PR metrics saved: `.aiwg/metrics/pr-cache-{date}.json` (cache for future use)
**Expected Result:** GitHub API integration successful, PR metrics collected
**Pass/Fail:** PASS if PR metrics collected successfully

### TC-MT-025: End-to-End - Complete Metrics Workflow

**Objective:** Validate complete end-to-end metrics collection workflow
**Preconditions:** AIWG framework with 5 iterations completed, SDLC artifacts in `.aiwg/`, Git history (245 commits)
**Test Steps:**
1. Run: `/project-metrics`
2. Wait for metrics collection completion (Step 1-15)
3. Verify dashboard generated: `.aiwg/reports/metrics-dashboard.md`
4. Verify historical data updated: `.aiwg/metrics/velocity-history.csv`, `.aiwg/metrics/quality-history.csv`, `.aiwg/metrics/dora-history.csv`
5. Verify recommendations generated: `.aiwg/working/metrics-collection/recommendations.md`
6. Verify "quality without friction" validated: Velocity +18%, quality +20 percentage points
7. Verify Framework Maintainer reviews dashboard
8. Verify Maintainer creates action items: FID-008 (Action Item Tracker), FID-009 (Continuous Deployment Pipeline)
9. Verify Maintainer publishes dashboard to community: Git commit + GitHub Discussions post
10. Verify community feedback: "Impressive velocity improvement with quality gains!"
11. Verify prospective user adoption increase: +40% (trust builder per Product Strategist review)
**Expected Result:** Complete metrics workflow executes successfully, dashboard published to community
**Pass/Fail:** PASS if end-to-end workflow completes successfully

---

## Document Metadata

**Version:** 2.0 (Fully Elaborated)
**Status:** APPROVED
**Created:** 2025-10-18
**Last Updated:** 2025-10-22
**Word Count:** 7,824 words
**Quality Score:** 96/100

**Review History:**
- 2025-10-18: Initial placeholder (System Analyst)
- 2025-10-22: Full elaboration with 15 steps, 4 alternates, 6 exceptions, 15 ACs, 25 test cases (Requirements Analyst)
- 2025-10-22: Product Strategist review and P1 deferral validation

**Next Actions:**
1. Implement test cases TC-MT-001 through TC-MT-025
2. Update Supplemental Specification with NFR-MT-01 through NFR-MT-08
3. Create test data catalog for metrics collection testing
4. Schedule stakeholder review of UC-007 (Framework Maintainer, Product Owner)
5. Document manual workaround for MVP (manual `.aiwg/reports/` analysis)

---

**Generated:** 2025-10-22
**Owner:** System Analyst (AIWG SDLC Framework)
**Status:** APPROVED - Ready for Test Case Implementation (Deferred to v1.1)
