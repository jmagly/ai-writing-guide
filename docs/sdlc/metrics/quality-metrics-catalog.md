# Quality Metrics Catalog

## Purpose

Define metrics for tracking code quality, test effectiveness, defect management, and technical debt.

**Scope**: Test coverage, defect metrics, code quality, technical debt

**Target Audience**: Test Architects, Quality Engineers, Build Engineers, Development Leads

**Integration**: Reference this catalog when defining quality gates and test strategies

---

## Overview

Quality metrics answer: **Are we building it right?**

**Categories**:

1. **Test Coverage Metrics** - How much code is tested (4 metrics)
2. **Defect Metrics** - Bug tracking and quality trends (4 metrics)
3. **Code Quality Metrics** - Maintainability and complexity (3 metrics)
4. **Technical Debt Metrics** - Long-term health indicators (2 metrics)

**Philosophy**: Prevent defects rather than find defects. Shift quality left.

**Critical Balance**: High coverage doesn't guarantee quality, but low coverage guarantees risk.

---

## Test Coverage Metrics

### Metric 1: Line Coverage

**Definition**: Percentage of code lines executed by tests

**Why It Matters**: Baseline coverage metric, indicates untested code

**Data Source**: Coverage tools (Jest, pytest-cov, JaCoCo, Istanbul)

**Collection Method**:

**pytest (Python)**:

```bash
pytest --cov=src --cov-report=json
cat coverage.json | jq '.totals.percent_covered'
```

**Jest (JavaScript)**:

```bash
jest --coverage --coverageReporters=json
cat coverage/coverage-summary.json | jq '.total.lines.pct'
```

**JaCoCo (Java)**:

```xml
<jacoco>
  <report>
    <counter type="LINE" missed="120" covered="880"/>
  </report>
</jacoco>
```

**Formula**: (Lines executed / Total lines) × 100

**Targets**:

| Context | Target |
|---------|--------|
| New code (PR) | ≥ 80% |
| Critical paths | ≥ 90% |
| Overall codebase | ≥ 70% |
| Legacy code | Trending up |

**Thresholds**:

- Warning: Coverage < 80% on new code
- Alert: Coverage drops > 5% from baseline
- Block: PR with < 60% coverage (configurable gate)

**Recommended Review Cadence**:

- Track: Per commit (CI pipeline)
- Review: Weekly (coverage trends)
- Deep Dive: Quarterly (identify gaps)

**Limitations**:

- High coverage ≠ good tests (can have meaningless tests)
- 100% coverage not always necessary (diminishing returns)
- Focus on critical paths, not arbitrary percentage

**Related Metrics**:

- Branch coverage (more rigorous)
- Function coverage
- Mutation score (tests quality of tests)

**Agent Automation**:

- Parse coverage reports from CI
- Flag coverage drops in PRs
- Generate uncovered code reports

---

### Metric 2: Branch Coverage

**Definition**: Percentage of code branches (if/else, switch) tested

**Why It Matters**: More rigorous than line coverage, catches untested logic paths

**Data Source**: Coverage tools (same as line coverage)

**Collection Method**:

**pytest**:

```bash
pytest --cov=src --cov-branch --cov-report=json
cat coverage.json | jq '.totals.percent_covered_display'
```

**Formula**: (Branches executed / Total branches) × 100

**Targets**:

| Context | Target |
|---------|--------|
| New code | ≥ 75% |
| Critical paths | ≥ 85% |
| Overall codebase | ≥ 65% |

**Thresholds**:

- Warning: Branch coverage < 75% on new code
- Alert: Branch coverage < 60%

**Recommended Review Cadence**:

- Track: Per commit
- Review: Weekly

**Example**:

```python
def process_payment(amount, user):
    if user.is_premium:        # Branch 1
        discount = 0.1
    else:                      # Branch 2
        discount = 0

    if amount > 100:           # Branch 3
        free_shipping = True
    else:                      # Branch 4
        free_shipping = False

    return calculate(amount, discount, free_shipping)
```

Line coverage: May hit all lines with 1 test
Branch coverage: Requires 4 tests (all combinations)

---

### Metric 3: Mutation Score

**Definition**: Percentage of code mutations (injected bugs) caught by tests

**Why It Matters**: Measures test quality, not just coverage

**Data Source**: Mutation testing tools (Stryker, PIT, mutmut)

**Collection Method**:

**Stryker (JavaScript)**:

```bash
npx stryker run
cat reports/mutation/mutation.json | jq '.mutationScore'
```

**PIT (Java)**:

```bash
mvn org.pitest:pitest-maven:mutationCoverage
cat target/pit-reports/mutations.xml | grep 'mutationScore'
```

**Formula**: (Mutations killed / Total mutations) × 100

**How It Works**:

1. Tool injects bugs (mutations) into code
2. Runs test suite against mutated code
3. If tests fail → mutation "killed" (good)
4. If tests pass → mutation "survived" (bad, test gap)

**Targets**:

| Context | Target |
|---------|--------|
| Critical code | ≥ 80% |
| General code | ≥ 60% |
| Low-risk code | ≥ 40% |

**Thresholds**:

- Warning: Mutation score < 60% on critical code
- Investigation: Mutation score < 40%

**Recommended Review Cadence**:

- Track: Weekly (expensive to run)
- Review: Monthly (identify weak tests)

**Example**:

```python
def calculate_discount(price, is_member):
    if is_member:
        return price * 0.9  # Mutation: change 0.9 to 0.8
    return price
```

Test: `assert calculate_discount(100, True) == 90`

Mutation: Changes `0.9` to `0.8`
Result: Test fails (90 ≠ 80) → Mutation killed (good)

**Limitations**:

- Expensive (10-100x slower than regular tests)
- Run on subset or in CI nightly

---

### Metric 4: Test Execution Time

**Definition**: Duration to run full test suite

**Why It Matters**: Long test suites slow feedback, discourage running tests

**Data Source**: Test framework output, CI logs

**Collection Method**:

**pytest**:

```bash
pytest --durations=0 --json-report --json-report-file=report.json
cat report.json | jq '.duration'
```

**Jest**:

```bash
jest --json --outputFile=test-results.json
cat test-results.json | jq '.testResults[].perfStats.runtime' | awk '{s+=$1} END {print s}'
```

**Formula**: Sum of all test execution times

**Targets**:

| Test Type | Target |
|-----------|--------|
| Unit tests | < 5 minutes |
| Integration tests | < 15 minutes |
| End-to-end tests | < 30 minutes |
| Full suite | < 20 minutes (parallel) |

**Thresholds**:

- Warning: Test suite > 15 minutes
- Alert: Test suite > 30 minutes
- Investigation: Duration increases > 50%

**Recommended Review Cadence**:

- Track: Per CI run
- Review: Weekly (identify slow tests)
- Optimize: Quarterly

**Optimization Strategies**:

- Parallelize test execution
- Run fast tests first (fail fast)
- Move slow tests to nightly suite
- Mock external dependencies
- Use test fixtures efficiently

**Related Metrics**:

- Slowest tests (--durations flag)
- Flaky test rate

---

## Defect Metrics

### Metric 5: Defect Density

**Definition**: Defects per unit of code (typically per KLOC - thousand lines of code)

**Why It Matters**: Normalizes defect counts for codebase size

**Data Source**: Defect tracking system + codebase analysis

**Collection Method**:

```bash
# Count lines of code
cloc src/ --json | jq '.SUM.code'

# Count defects
curl -H "Authorization: Bearer $TOKEN" \
  https://jira.example.com/rest/api/2/search?jql=type=Bug+AND+status!=Closed \
  | jq '.total'
```

**SQL Example**:

```sql
SELECT
  COUNT(*) AS total_defects,
  (SELECT SUM(lines_of_code) FROM codebase_metrics) AS total_loc,
  ROUND(COUNT(*) * 1000.0 / (SELECT SUM(lines_of_code) FROM codebase_metrics), 2) AS defects_per_kloc
FROM defects
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
```

**Formula**: (Total defects / Lines of code) × 1000

**Targets**:

| Industry Benchmark | Defects per KLOC |
|-------------------|------------------|
| Best-in-class | < 0.5 |
| Industry average | 1-5 |
| Poor quality | > 10 |

**Thresholds**:

- Warning: Density > 2 per KLOC
- Alert: Density > 5 per KLOC
- Investigation: Density doubles from baseline

**Recommended Review Cadence**:

- Calculate: Monthly
- Review: Quarterly (trend analysis)

**Segmentation**:

- By module (identify hot spots)
- By severity (critical vs minor)
- By defect type (functional vs performance)

---

### Metric 6: Defect Escape Rate

**Definition**: Percentage of defects found in production (vs pre-production)

**Why It Matters**: Measures test effectiveness, indicates quality gate gaps

**Data Source**: Defect tracking system

**Collection Method**:

```sql
SELECT
  COUNT(*) FILTER (WHERE environment = 'production') AS production_defects,
  COUNT(*) AS total_defects,
  ROUND(100.0 * COUNT(*) FILTER (WHERE environment = 'production') / COUNT(*), 2) AS escape_rate
FROM defects
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
```

**Formula**: (Production defects / Total defects) × 100

**Targets**:

| Quality Level | Escape Rate |
|--------------|-------------|
| Excellent | < 5% |
| Good | 5-10% |
| Acceptable | 10-15% |
| Poor | > 15% |

**Thresholds**:

- Warning: Escape rate > 10%
- Alert: Escape rate > 15%
- Critical: Escape rate increasing trend

**Recommended Review Cadence**:

- Track: Per release
- Review: Monthly
- Deep Dive: Quarterly (root cause analysis)

**Root Cause Analysis**:

| Defect Origin | Prevention |
|--------------|------------|
| Insufficient test coverage | Increase coverage targets |
| Test environment mismatch | Prod-like staging environment |
| Manual testing gaps | Automate regression tests |
| Performance issues | Load testing in CI |
| Configuration errors | Config validation |

---

### Metric 7: Defect Age

**Definition**: Time from defect opened to closed

**Why It Matters**: Long-open defects indicate process issues or low prioritization

**Data Source**: Defect tracking system

**Collection Method**:

```sql
SELECT
  AVG(closed_at - created_at) AS avg_age,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY closed_at - created_at) AS median_age,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY closed_at - created_at) AS p95_age
FROM defects
WHERE closed_at IS NOT NULL
  AND created_at >= CURRENT_DATE - INTERVAL '90 days'
```

**Formula**: Closed time - Created time (in days)

**Targets**:

| Severity | Target Age |
|----------|-----------|
| Critical | < 1 day |
| High | < 3 days |
| Medium | < 7 days |
| Low | < 30 days |

**Thresholds**:

- Warning: Median age > 7 days (medium/high defects)
- Alert: Critical defect open > 24 hours
- Investigation: Defect age increasing trend

**Recommended Review Cadence**:

- Track: Daily (critical defects)
- Review: Weekly (aging defects)
- Triage: Daily standup

**Aging Buckets**:

- 0-3 days: Fresh
- 4-7 days: Aging
- 8-14 days: Stale
- 15+ days: Ancient (triage needed)

---

### Metric 8: Flaky Test Rate

**Definition**: Percentage of tests that intermittently fail

**Why It Matters**: Flaky tests erode confidence, cause CI failures, waste time

**Data Source**: CI logs, test result history

**Collection Method**:

**GitHub Actions Example**:

```bash
# Query test results for last 50 runs
gh api repos/:owner/:repo/actions/runs --paginate \
  | jq -r '.workflow_runs[] | select(.conclusion == "failure") | .id' \
  | xargs -I {} gh api repos/:owner/:repo/actions/runs/{}/jobs \
  | jq '.jobs[].steps[] | select(.name | contains("test")) | .conclusion'
```

**SQL Example**:

```sql
WITH test_results AS (
  SELECT
    test_name,
    COUNT(*) AS total_runs,
    COUNT(*) FILTER (WHERE status = 'fail') AS failures
  FROM ci_test_results
  WHERE run_date >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY test_name
)
SELECT
  test_name,
  total_runs,
  failures,
  ROUND(100.0 * failures / total_runs, 2) AS failure_rate
FROM test_results
WHERE failures > 0 AND failures < total_runs  -- Flaky: sometimes pass, sometimes fail
ORDER BY failure_rate DESC
```

**Formula**: (Tests with intermittent failures / Total tests) × 100

**Targets**:

| Quality Level | Flaky Rate |
|--------------|-----------|
| Excellent | < 1% |
| Good | 1-3% |
| Acceptable | 3-5% |
| Poor | > 5% |

**Thresholds**:

- Warning: Flaky rate > 3%
- Alert: Flaky rate > 5%
- Action: Quarantine test (mark as flaky, investigate)

**Recommended Review Cadence**:

- Track: Per CI run
- Review: Weekly (flaky test list)
- Fix: Immediately (flaky tests are technical debt)

**Common Causes**:

- Race conditions (timing issues)
- Test interdependence (order matters)
- External dependencies (network, database)
- Non-deterministic code (random, time-based)

**Remediation**:

- Add retries with exponential backoff
- Mock external dependencies
- Use fixed seeds for random data
- Quarantine and rewrite test

---

## Code Quality Metrics

### Metric 9: Cyclomatic Complexity

**Definition**: Number of independent paths through code

**Why It Matters**: High complexity = hard to test, maintain, understand

**Data Source**: Static analysis tools (SonarQube, ESLint, Radon, Pylint)

**Collection Method**:

**Radon (Python)**:

```bash
radon cc src/ -a -j | jq '.[] | .[] | .complexity' | awk '{s+=$1; c++} END {print s/c}'
```

**ESLint (JavaScript)**:

```bash
eslint src/ --format json | jq '.[].messages[] | select(.ruleId == "complexity") | .message'
```

**Formula**: Count of decision points + 1

**Complexity Levels**:

| Complexity | Risk | Action |
|-----------|------|--------|
| 1-10 | Low | Simple, easy to test |
| 11-20 | Moderate | Consider refactoring |
| 21-50 | High | Refactor recommended |
| > 50 | Very High | Refactor urgently |

**Targets**:

- Average complexity: < 10
- Max complexity per function: < 20
- Functions > 20: < 5% of codebase

**Thresholds**:

- Warning: Average complexity > 15
- Alert: Any function > 50
- Code Review: Flag functions > 20

**Recommended Review Cadence**:

- Track: Per commit (CI)
- Review: Weekly (complexity trends)
- Refactor: When above threshold

**Example**:

```python
def calculate_discount(price, user, promo_code):
    if user.is_premium:             # +1
        if promo_code == 'VIP':     # +1
            return price * 0.7
        elif promo_code == 'SAVE10': # +1
            return price * 0.85
        else:
            return price * 0.9
    elif user.is_member:            # +1
        if promo_code == 'MEMBER':  # +1
            return price * 0.85
        else:
            return price * 0.95
    else:
        return price

# Complexity = 6 (moderate, consider refactoring)
```

---

### Metric 10: Code Duplication

**Definition**: Percentage of duplicated code blocks

**Why It Matters**: Duplication increases maintenance burden, bug propagation

**Data Source**: Static analysis tools (SonarQube, PMD, jscpd)

**Collection Method**:

**jscpd (JavaScript)**:

```bash
jscpd src/ --format json --output report.json
cat report.json | jq '.statistics.total.percentage'
```

**SonarQube API**:

```bash
curl -u $SONAR_TOKEN: \
  "https://sonar.example.com/api/measures/component?component=$PROJECT&metricKeys=duplicated_lines_density" \
  | jq '.component.measures[0].value'
```

**Formula**: (Duplicated lines / Total lines) × 100

**Targets**:

| Quality Level | Duplication |
|--------------|-------------|
| Excellent | < 3% |
| Good | 3-5% |
| Acceptable | 5-10% |
| Poor | > 10% |

**Thresholds**:

- Warning: Duplication > 5%
- Alert: Duplication > 10%
- Code Review: Flag duplicate blocks > 10 lines

**Recommended Review Cadence**:

- Track: Weekly
- Review: Monthly (refactoring targets)
- Reduce: Refactoring sprints

**Remediation**:

- Extract to shared functions/modules
- Use inheritance or composition
- Create utility libraries

---

### Metric 11: Maintainability Index

**Definition**: Composite score combining complexity, duplication, and volume

**Why It Matters**: Single metric for overall code health

**Data Source**: Static analysis tools (Visual Studio, Radon, SonarQube)

**Formula** (Microsoft definition):

```
MI = MAX(0, (171 - 5.2 * ln(HV) - 0.23 * CC - 16.2 * ln(LOC)) * 100 / 171)

Where:
HV = Halstead Volume (code complexity metric)
CC = Cyclomatic Complexity
LOC = Lines of Code
```

**Maintainability Index Scale**:

| Score | Color | Interpretation |
|-------|-------|----------------|
| 80-100 | Green | Highly maintainable |
| 60-79 | Yellow | Moderately maintainable |
| 0-59 | Red | Difficult to maintain |

**Targets**:

- Average MI: > 70
- Minimum MI per module: > 50

**Thresholds**:

- Warning: MI < 60 for any module
- Alert: Average MI < 70
- Refactor: MI < 50

**Recommended Review Cadence**:

- Track: Weekly
- Review: Monthly
- Trend: Quarterly

---

## Technical Debt Metrics

### Metric 12: Technical Debt Ratio

**Definition**: Ratio of remediation cost to development cost

**Why It Matters**: Quantifies long-term health and sustainability

**Data Source**: Static analysis tools (SonarQube)

**Collection Method**:

**SonarQube API**:

```bash
curl -u $SONAR_TOKEN: \
  "https://sonar.example.com/api/measures/component?component=$PROJECT&metricKeys=sqale_debt_ratio" \
  | jq '.component.measures[0].value'
```

**Formula**:

```
Technical Debt Ratio = (Remediation Cost / Development Cost) × 100

Where:
Remediation Cost = Time to fix all issues (estimated)
Development Cost = Time to build codebase (lines of code × time per line)
```

**Targets**:

| Quality Level | Debt Ratio |
|--------------|-----------|
| Excellent | < 5% |
| Good | 5-10% |
| Acceptable | 10-20% |
| Poor | > 20% |

**Thresholds**:

- Warning: Debt ratio > 10%
- Alert: Debt ratio > 20%
- Action: Debt ratio increasing

**Recommended Review Cadence**:

- Track: Weekly
- Review: Monthly
- Plan: Quarterly (debt paydown sprints)

**Debt Categories** (track separately):

- Code smells: Minor maintainability issues
- Bugs: Defects not yet fixed
- Vulnerabilities: Security issues
- Hotspots: High-risk areas

---

### Metric 13: Code Churn

**Definition**: Amount of code rewritten or deleted shortly after being written

**Why It Matters**: High churn indicates instability, rework, poor design

**Data Source**: Version control (Git)

**Collection Method**:

```bash
# Lines changed in last 30 days on files also changed in previous 30 days
git log --since="30 days ago" --numstat --pretty=format:'' \
  | awk '{added+=$1; deleted+=$2} END {print added+deleted}'
```

**Formula**: (Lines added + Lines deleted) in time period for recently modified files

**Targets**:

| Context | Target |
|---------|--------|
| Stable code | < 5% churn per quarter |
| Active development | 10-20% churn |
| Refactoring | 30-50% churn (temporary) |

**Thresholds**:

- Warning: Churn > 30% on mature codebase
- Investigation: Files with > 5 rewrites in 30 days

**Recommended Review Cadence**:

- Track: Weekly
- Review: Monthly (identify unstable areas)

**High Churn Indicators**:

- Poor initial design
- Unclear requirements
- Technical debt accumulation
- Learning curve (new team members)

---

## Summary Table

| Metric | Category | Data Source | Frequency | Target | Critical Threshold |
|--------|----------|-------------|-----------|--------|--------------------|
| Line Coverage | Test Coverage | Coverage tools | Per commit | ≥ 80% | < 60% |
| Branch Coverage | Test Coverage | Coverage tools | Per commit | ≥ 75% | < 60% |
| Mutation Score | Test Coverage | Mutation tools | Weekly | ≥ 60% | < 40% |
| Test Execution Time | Test Coverage | Test framework | Per run | < 20 min | > 30 min |
| Defect Density | Defect Metrics | Jira + codebase | Monthly | < 2 per KLOC | > 5 per KLOC |
| Defect Escape Rate | Defect Metrics | Jira | Per release | < 10% | > 15% |
| Defect Age | Defect Metrics | Jira | Daily | < 7 days | > 14 days |
| Flaky Test Rate | Defect Metrics | CI logs | Per run | < 3% | > 5% |
| Cyclomatic Complexity | Code Quality | Static analysis | Per commit | < 10 avg | > 20 any function |
| Code Duplication | Code Quality | Static analysis | Weekly | < 5% | > 10% |
| Maintainability Index | Code Quality | Static analysis | Weekly | > 70 | < 60 |
| Technical Debt Ratio | Tech Debt | SonarQube | Weekly | < 10% | > 20% |
| Code Churn | Tech Debt | Git | Weekly | < 20% | > 30% mature code |

---

## Conclusion

Quality metrics enable proactive quality management, not just reactive defect fixing.

**Key Takeaways**:

1. Test coverage is necessary but not sufficient (add mutation testing)
2. Track defects by age and escape rate, not just count
3. Code quality metrics predict future maintenance burden
4. Technical debt must be measured and managed

**Next Steps**:

1. Select 5-7 quality metrics appropriate to project phase
2. Integrate into CI pipeline (automated collection)
3. Set quality gates (block merges below thresholds)
4. Review trends weekly
5. Plan debt paydown sprints quarterly

**Critical Success Factor**: Shift quality left. Prevent defects, don't just find them.
