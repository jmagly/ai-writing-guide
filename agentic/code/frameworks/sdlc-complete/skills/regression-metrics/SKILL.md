# regression-metrics

Track and analyze regression statistics, trends, and health indicators.

## Triggers

- "regression metrics"
- "show regression stats"
- "regression trends"
- "regression health"
- "how many regressions"
- "regression dashboard"

## Purpose

This skill provides regression analytics by:
- Tracking regression occurrence rates
- Measuring time-to-detection and time-to-fix
- Analyzing regression patterns and hotspots
- Identifying high-risk areas
- Trending regression metrics over time
- Generating regression health dashboards

## Behavior

When triggered, this skill:

1. **Collects regression data**:
   - Parse regression test results
   - Load historical regression records
   - Gather bisect findings
   - Import baseline comparisons
   - Aggregate issue tracker data

2. **Calculates key metrics**:
   - Regression rate (per sprint/release)
   - Mean time to detect (MTTD)
   - Mean time to fix (MTTF)
   - Regression recurrence rate
   - Escape rate (production regressions)

3. **Identifies patterns**:
   - Common root causes
   - High-regression components
   - Time-of-day/sprint patterns
   - Correlation with code changes

4. **Analyzes trends**:
   - Regression rate over time
   - Detection speed improvements
   - Fix time trends
   - Quality trajectory

5. **Generates visualizations**:
   - Regression heatmaps
   - Trend charts
   - Burn-down tracking
   - Risk matrices

6. **Produces actionable insights**:
   - Prioritize high-risk areas
   - Recommend test improvements
   - Suggest process changes
   - Set quality goals

## Key Metrics

### Regression Rate

```yaml
regression_rate:
  description: Number of regressions per time period
  formula: regressions_detected / time_period
  units: regressions per sprint/week/release

  targets:
    excellent: "< 2 per sprint"
    good: "2-5 per sprint"
    acceptable: "5-10 per sprint"
    poor: "> 10 per sprint"

  calculation:
    count: new regressions introduced
    period: sprint, release, or month
    exclude: known issues, flaky tests
```

### Mean Time to Detect (MTTD)

```yaml
mttd:
  description: Average time from regression introduction to detection
  formula: sum(detection_time) / regression_count
  units: hours or days

  targets:
    excellent: "< 4 hours"
    good: "< 24 hours"
    acceptable: "< 7 days"
    poor: "> 7 days"

  calculation:
    detection_time: commit_time_to_failure_report
    includes: automated and manual detection
```

### Mean Time to Fix (MTTF)

```yaml
mttf:
  description: Average time from detection to fix deployment
  formula: sum(fix_time) / regression_count
  units: hours or days

  targets:
    critical: "< 4 hours"
    high: "< 24 hours"
    medium: "< 7 days"
    low: "< 30 days"

  calculation:
    fix_time: detection_to_fix_deployed
    severity_weighted: true
```

### Escape Rate

```yaml
escape_rate:
  description: Percentage of regressions reaching production
  formula: (production_regressions / total_regressions) * 100
  units: percentage

  targets:
    excellent: "< 5%"
    good: "5-10%"
    acceptable: "10-20%"
    poor: "> 20%"

  calculation:
    production_regressions: found by users/monitoring
    total_regressions: all detected including pre-release
```

### Recurrence Rate

```yaml
recurrence_rate:
  description: Percentage of regressions that recur after fix
  formula: (recurring_regressions / total_fixed) * 100
  units: percentage

  targets:
    excellent: "< 5%"
    good: "5-10%"
    acceptable: "10-15%"
    poor: "> 15%"

  indicates:
    - insufficient test coverage
    - lack of regression tests
    - poor fix quality
```

## Metrics Dashboard

```markdown
# Regression Metrics Dashboard

**Period**: Last 30 Days (2025-12-29 to 2026-01-28)
**Project**: User Service

## Executive Summary

| Metric | Current | Target | Status | Trend |
|--------|---------|--------|--------|-------|
| Regression Rate | 4.2/sprint | < 5 | ✅ Good | ↓ Improving |
| MTTD | 8.5 hours | < 24h | ✅ Good | ↓ Improving |
| MTTF | 18.7 hours | < 24h | ⚠️ Close | → Stable |
| Escape Rate | 12% | < 10% | ⚠️ Above Target | ↑ Worsening |
| Recurrence Rate | 7% | < 10% | ✅ Good | → Stable |

**Overall Health**: ⚠️ Good with Concerns
**Priority Focus**: Reduce production escapes

## Regression Trend (Last 6 Sprints)

```
Sprint 8:  ██████████ 10 regressions
Sprint 9:  ████████   8 regressions
Sprint 10: ██████     6 regressions
Sprint 11: █████      5 regressions
Sprint 12: ████       4 regressions
Sprint 13: ████       4 regressions
           ↓ -60% improvement since Sprint 8
```

**Analysis**: Significant improvement trend. Stabilizing around 4-5 per sprint.

## Detection Speed Trend

```
Week 1: 24h ████████████████████████
Week 2: 18h ██████████████████
Week 3: 12h ████████████
Week 4:  9h █████████
Week 5:  8h ████████
        ↓ -67% improvement in 5 weeks
```

**Analysis**: Automation improvements paying off. Most regressions now caught within hours.

## Component Heatmap

Regressions by component (last 30 days):

| Component | Regressions | Change | Risk Level |
|-----------|-------------|--------|------------|
| src/auth/ | 🔴🔴🔴 3 | +1 | High |
| src/api/ | 🟡🟡 2 | 0 | Medium |
| src/db/ | 🟡🟡 2 | -1 | Medium |
| src/user/ | 🟡 1 | -2 | Low |
| src/utils/ | 🟢 0 | 0 | Low |

**Hotspot Alert**: `src/auth/` showing increased regression rate

## Root Cause Analysis

| Root Cause | Count | % | Trend |
|------------|-------|---|-------|
| Missing test coverage | 5 | 42% | → |
| Integration not tested | 3 | 25% | ↑ |
| Edge case not considered | 2 | 17% | ↓ |
| Flaky test masking issue | 1 | 8% | → |
| Breaking dependency change | 1 | 8% | → |

**Insight**: 67% of regressions preventable with better coverage/integration testing

## Severity Distribution

| Severity | Count | MTTF | Status |
|----------|-------|------|--------|
| Critical | 1 | 3.2h | ✅ Fast response |
| High | 4 | 12.5h | ✅ Within target |
| Medium | 6 | 28.4h | ⚠️ Above target |
| Low | 1 | 72h | ✅ Acceptable |

## Time-to-Detection Analysis

```
Detection Method:
  Automated Tests: 75% (avg 4.2h detection)
  Manual Testing:  17% (avg 32h detection)
  Production:       8% (avg 96h detection)
```

**Insight**: Automation catching most issues early. Need to reduce production escapes.

## Time-to-Fix Analysis

```
Fix Duration by Severity:
  Critical: ▓▓▓ 3.2h (target: 4h) ✅
  High:     ▓▓▓▓▓▓ 12.5h (target: 24h) ✅
  Medium:   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 28.4h (target: 24h) ⚠️
  Low:      ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 72h ✅
```

**Issue**: Medium-severity regressions taking slightly longer than target

## Regression Recurrence

| Original Issue | Recurred | Reason |
|----------------|----------|--------|
| AUTH-101 | ✅ Yes | Missing regression test |
| API-205 | ❌ No | Regression test added |
| DB-089 | ❌ No | Regression test added |
| USER-145 | ❌ No | Regression test added |

**Recurrence Rate**: 25% (1 of 4) - One regression lacked test

## Production Escapes

Regressions that reached production:

| Issue | Severity | Detection | Impact | MTTD |
|-------|----------|-----------|--------|------|
| AUTH-203 | High | User report | 500 users | 12h |

**Analysis**: 1 escape this period. Auth module regression bypassed staging tests.

## Recommendations

### High Priority

1. **Add integration tests for auth flows**
   - Reason: 3 regressions in auth, 1 production escape
   - Impact: Reduce auth regressions by ~60%
   - Effort: 2 days

2. **Improve staging test coverage**
   - Reason: Production escape indicates gap
   - Impact: Reduce escape rate to <5%
   - Effort: 1 week

3. **Reduce medium-severity MTTF**
   - Reason: 28.4h vs 24h target
   - Impact: Faster user impact resolution
   - Effort: Process improvement

### Medium Priority

4. **Add regression tests for all fixes**
   - Reason: 25% recurrence rate on fixes without tests
   - Impact: Zero recurrence for tested fixes
   - Effort: Ongoing discipline

5. **Monitor auth module closely**
   - Reason: Highest regression count
   - Impact: Early detection of issues
   - Effort: Weekly review

## Historical Comparison

| Period | Reg Rate | MTTD | MTTF | Escape % |
|--------|----------|------|------|----------|
| 3 months ago | 8.2 | 36h | 48h | 18% |
| 2 months ago | 6.5 | 24h | 36h | 15% |
| 1 month ago | 5.1 | 12h | 24h | 13% |
| Current | 4.2 | 8.5h | 18.7h | 12% |

**Trend**: All metrics improving. Regression rate down 49%, detection 76% faster.

## Goals for Next Period

| Metric | Current | Goal | Strategy |
|--------|---------|------|----------|
| Regression Rate | 4.2 | < 4 | Improve auth testing |
| MTTD | 8.5h | < 8h | Add more automation |
| MTTF | 18.7h | < 18h | Faster review process |
| Escape Rate | 12% | < 10% | Better staging tests |

## Data Sources

- Regression tests: `.aiwg/testing/regression-results/`
- Bisect reports: `.aiwg/testing/regression-bisect-*/`
- Baseline comparisons: `.aiwg/testing/baseline-comparisons/`
- Issue tracker: GitHub Issues (label: regression)
- CI/CD logs: GitHub Actions
```

## Usage Examples

### View Current Metrics

```
User: "Show regression metrics"

Skill executes:
1. Aggregate data from last 30 days
2. Calculate key metrics
3. Generate dashboard
4. Identify trends

Output:
"Regression Metrics (Last 30 Days)

Overall Health: ⚠️ Good with Concerns

Key Metrics:
- Regression Rate: 4.2/sprint ✅ (target < 5)
- MTTD: 8.5 hours ✅ (target < 24h)
- MTTF: 18.7 hours ⚠️ (target < 24h)
- Escape Rate: 12% ⚠️ (target < 10%)

Hotspots:
🔴 src/auth/ - 3 regressions this period
🟡 src/api/ - 2 regressions

Top Recommendation: Add integration tests for auth

Full dashboard: .aiwg/testing/regression-metrics-dashboard.md"
```

### Regression Trends

```
User: "Regression trends over time"

Skill analyzes:
- Last 6 sprints of data
- Calculate trend direction
- Identify patterns

Output:
"Regression Trends (Last 6 Sprints)

Sprint 8:  10 regressions
Sprint 9:   8 regressions (-20%)
Sprint 10:  6 regressions (-25%)
Sprint 11:  5 regressions (-17%)
Sprint 12:  4 regressions (-20%)
Sprint 13:  4 regressions (stable)

Overall: ↓ -60% improvement
Status: Stabilizing around 4-5/sprint

MTTD: 36h → 8.5h (-76%)
MTTF: 48h → 18.7h (-61%)

Conclusion: Strong improvement trend. Approaching best-in-class levels."
```

### Component Heatmap

```
User: "Which components have most regressions?"

Skill generates:
"Component Regression Heatmap (Last 30 Days)

High Risk:
🔴 src/auth/ - 3 regressions (+1 from last period)
   Most common: Missing integration tests

Medium Risk:
🟡 src/api/ - 2 regressions (no change)
🟡 src/db/ - 2 regressions (-1 from last period)

Low Risk:
🟢 src/user/ - 1 regression (-2 from last period)
🟢 src/utils/ - 0 regressions

Recommendation: Focus testing efforts on auth module"
```

## Integration

This skill uses:
- `regression-bisect`: Import bisect findings
- `regression-baseline`: Analyze baseline drift patterns
- `test-coverage`: Correlate coverage with regression rates
- `project-awareness`: Detect sprint/release boundaries

## Agent Orchestration

```yaml
agents:
  analysis:
    agent: metrics-analyst
    focus: Statistical analysis and trends

  visualization:
    agent: technical-writer
    focus: Dashboard and report generation

  recommendations:
    agent: test-architect
    focus: Process improvement suggestions
```

## Configuration

### Metric Collection

```yaml
collection_config:
  data_sources:
    - regression_test_results
    - bisect_reports
    - baseline_comparisons
    - issue_tracker
    - ci_cd_logs

  update_frequency: daily
  retention: 90 days
  aggregation: sprint, week, month
```

### Thresholds

```yaml
thresholds:
  regression_rate:
    excellent: 2
    good: 5
    acceptable: 10

  mttd_hours:
    excellent: 4
    good: 24
    acceptable: 168  # 7 days

  mttf_hours:
    critical: 4
    high: 24
    medium: 168  # 7 days

  escape_rate_percent:
    excellent: 5
    good: 10
    acceptable: 20
```

### Alert Rules

```yaml
alerts:
  regression_spike:
    condition: regression_rate > 10
    severity: high
    notification: team-channel

  escape_rate_high:
    condition: escape_rate > 20%
    severity: critical
    notification: leadership

  mttd_degrading:
    condition: mttd_trend_increase > 50%
    severity: medium
    notification: test-team
```

## Output Locations

- Dashboards: `.aiwg/testing/regression-metrics-dashboard.md`
- Trends: `.aiwg/testing/regression-trends.json`
- Heatmaps: `.aiwg/testing/regression-heatmap.json`
- Historical data: `.aiwg/testing/metrics-history/`

## References

- @agentic/code/frameworks/sdlc-complete/schemas/metrics/regression-metrics-schema.yaml
- @agentic/code/frameworks/sdlc-complete/agents/metrics-analyst.md
- @agentic/code/frameworks/sdlc-complete/commands/metrics-dashboard.md
