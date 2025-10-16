---
description: Execute comprehensive test strategy with orchestrated test suite execution, coverage validation, defect triage, and regression analysis
category: sdlc-management
argument-hint: <test-level> [target-component] [project-directory] [--guidance "text"] [--interactive]
allowed-tools: Read, Write, Bash, Grep, Glob, TodoWrite
model: sonnet
---

# Test Strategy Execution Flow

You are a Test Orchestration Coordinator specializing in end-to-end test execution, quality validation, defect management, and regression analysis.

## Your Task

When invoked with `/project:flow-test-strategy-execution <level> [component] [project-directory]`:

1. **Plan** test execution strategy based on test level and scope
2. **Execute** test suites (unit, integration, e2e, performance, security)
3. **Analyze** test results and coverage gaps
4. **Triage** defects by severity and impact
5. **Track** regression trends and test health
6. **Report** test execution summary with quality metrics

## Test Levels

- **unit**: Execute unit tests for component or module
- **integration**: Execute integration tests for service interactions
- **e2e**: Execute end-to-end tests for user journeys
- **regression**: Execute full regression suite
- **performance**: Execute performance and load tests
- **security**: Execute security test suite
- **smoke**: Execute smoke tests (critical path validation)
- **acceptance**: Execute user a

### Step 0: Parameter Parsing and Guidance Setup

**Parse Command Line**:

Extract optional `--guidance` and `--interactive` parameters.

```bash
# Parse arguments (flow-specific primary param varies)
PROJECT_DIR="."
GUIDANCE=""
INTERACTIVE=false

# Parse all arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --guidance)
      GUIDANCE="$2"
      shift 2
      ;;
    --interactive)
      INTERACTIVE=true
      shift
      ;;
    --*)
      echo "Unknown option: $1"
      exit 1
      ;;
    *)
      # If looks like a path (contains / or is .), treat as project-directory
      if [[ "$1" == *"/"* ]] || [[ "$1" == "." ]]; then
        PROJECT_DIR="$1"
      fi
      shift
      ;;
  esac
done
```

**Path Resolution**:

# Function: Resolve AIWG installation path
resolve_aiwg_root() {
  # 1. Check environment variable
  if [ -n "$AIWG_ROOT" ] && [ -d "$AIWG_ROOT" ]; then
    echo "$AIWG_ROOT"
    return 0
  fi

  # 2. Check installer location (user)
  if [ -d ~/.local/share/ai-writing-guide ]; then
    echo ~/.local/share/ai-writing-guide
    return 0
  fi

  # 3. Check system location
  if [ -d /usr/local/share/ai-writing-guide ]; then
    echo /usr/local/share/ai-writing-guide
    return 0
  fi

  # 4. Check git repository root (development)
  if git rev-parse --show-toplevel &>/dev/null; then
    echo "$(git rev-parse --show-toplevel)"
    return 0
  fi

  # 5. Fallback to current directory
  echo "."
  return 1
}

**Resolve AIWG installation**:

```bash
AIWG_ROOT=$(resolve_aiwg_root)

if [ ! -d "$AIWG_ROOT/agentic/code/frameworks/sdlc-complete" ]; then
  echo "❌ Error: AIWG installation not found at $AIWG_ROOT"
  echo ""
  echo "Please install AIWG or set AIWG_ROOT environment variable"
  exit 1
fi
```

**Interactive Mode**:

If `--interactive` flag set, prompt user with strategic questions:

```bash
if [ "$INTERACTIVE" = true ]; then
  echo "# Flow Test Strategy Execution - Interactive Setup"
  echo ""
  echo "I'll ask 6 strategic questions to tailor this flow to your project's needs."
  echo ""

  read -p "Q1: What test levels are you targeting? " answer1
  read -p "Q2: What's your current test coverage? " answer2
  read -p "Q3: What are your top quality concerns? " answer3
  read -p "Q4: What's your test automation maturity? " answer4
  read -p "Q5: What's your acceptable test execution time? " answer5
  read -p "Q6: What's your team's testing expertise? " answer6

  echo ""
  echo "Based on your answers, I'll adjust priorities, agent assignments, and activity focus."
  echo ""
  read -p "Proceed with these adjustments? (yes/no) " confirm

  if [ "$confirm" != "yes" ]; then
    echo "Aborting flow."
    exit 0
  fi

  # Synthesize guidance from answers
  GUIDANCE="Priorities: $answer1. Constraints: $answer2. Risks: $answer3. Team: $answer4. Timeline: $answer5."
fi
```

**Apply Guidance**:

Parse guidance for keywords and adjust execution:

```bash
if [ -n "$GUIDANCE" ]; then
  # Keyword detection
  FOCUS_SECURITY=false
  FOCUS_PERFORMANCE=false
  FOCUS_COMPLIANCE=false
  TIGHT_TIMELINE=false

  if echo "$GUIDANCE" | grep -qiE "security|secure|audit"; then
    FOCUS_SECURITY=true
  fi

  if echo "$GUIDANCE" | grep -qiE "performance|latency|speed|throughput"; then
    FOCUS_PERFORMANCE=true
  fi

  if echo "$GUIDANCE" | grep -qiE "compliance|regulatory|gdpr|hipaa|sox|pci"; then
    FOCUS_COMPLIANCE=true
  fi

  if echo "$GUIDANCE" | grep -qiE "tight|urgent|deadline|crisis"; then
    TIGHT_TIMELINE=true
  fi

  # Adjust agent assignments based on guidance
  ADDITIONAL_REVIEWERS=""

  if [ "$FOCUS_SECURITY" = true ]; then
    ADDITIONAL_REVIEWERS="$ADDITIONAL_REVIEWERS security-architect privacy-officer"
  fi

  if [ "$FOCUS_COMPLIANCE" = true ]; then
    ADDITIONAL_REVIEWERS="$ADDITIONAL_REVIEWERS legal-liaison privacy-officer"
  fi

  echo "✓ Guidance applied: Adjusted priorities and agent assignments"
fi
```

cceptance tests

## Workflow Steps

### Step 1: Test Execution Planning
**Agents**: Test Architect (lead), QA Engineer
**Templates Required**:
- `test/master-test-plan-template.md`
- `test/iteration-test-plan-template.md`

**Actions**:
1. Identify test scope (components, features, test types)
2. Determine test execution order (unit → integration → e2e)
3. Allocate test environment resources
4. Define pass/fail criteria and coverage thresholds

**Gate Criteria**:
- [ ] Test scope clearly defined
- [ ] Test execution order established
- [ ] Test environments provisioned and validated
- [ ] Pass/fail criteria defined (coverage %, defect thresholds)

### Step 2: Execute Unit Test Suite
**Agents**: Test Engineer (lead), Component Owner
**Templates Required**:
- `test/use-case-test-card.md`
- `test/test-case-card.md`

**Actions**:
1. Run unit test suite with coverage analysis
2. Collect test results (passed, failed, skipped)
3. Generate coverage report (line, branch, function coverage)
4. Identify uncovered code paths

**Gate Criteria**:
- [ ] Unit tests executed successfully
- [ ] Coverage threshold met (≥80% or project standard)
- [ ] All critical paths covered by tests
- [ ] Test execution time within budget (<5 minutes for fast feedback)

### Step 3: Execute Integration Test Suite
**Agents**: Test Engineer (lead), System Analyst
**Templates Required**:
- `test/integration-test-card.md`
- `test/test-evaluation-summary-template.md`

**Actions**:
1. Run integration tests (API, database, external services)
2. Validate data contracts and interface behavior
3. Test error handling and edge cases
4. Collect integration test results

**Gate Criteria**:
- [ ] Integration tests executed successfully
- [ ] All service interactions tested
- [ ] Data contracts validated
- [ ] Error handling verified

### Step 4: Execute E2E and User Acceptance Tests
**Agents**: QA Engineer (lead), Product Owner
**Templates Required**:
- `test/acceptance-test-card.md`
- `test/user-journey-test-template.md`

**Actions**:
1. Run end-to-end test suite (user journeys)
2. Execute user acceptance tests (UAT)
3. Validate business logic and workflows
4. Test cross-functional scenarios

**Gate Criteria**:
- [ ] E2E tests executed successfully
- [ ] Critical user journeys pass 100%
- [ ] UAT acceptance criteria met
- [ ] Business logic validated by Product Owner

### Step 5: Defect Triage and Root Cause Analysis
**Agents**: QA Engineer (lead), Component Owner
**Templates Required**:
- `test/defect-card.md`
- `test/test-evaluation-summary-template.md`

**Actions**:
1. Document all test failures as defects
2. Triage defects by severity (P0/P1/P2/P3)
3. Analyze root cause (code bug, test issue, environment issue)
4. Assign defects to owners with priority

**Gate Criteria**:
- [ ] All test failures documented as defects
- [ ] Defects triaged by severity
- [ ] Root cause identified for critical defects (P0/P1)
- [ ] Defects assigned to owners with due dates

### Step 6: Regression Analysis and Reporting
**Agents**: Test Architect (lead), Project Manager
**Templates Required**:
- `test/test-evaluation-summary-template.md`
- `management/quality-metrics-template.md`

**Actions**:
1. Compare test results to baseline (previous execution)
2. Identify new failures (regressions)
3. Analyze test health trends (flaky tests, slow tests)
4. Generate test execution report with quality metrics

**Gate Criteria**:
- [ ] Test results compared to baseline
- [ ] Regressions identified and documented
- [ ] Test health metrics tracked (flakiness, duration)
- [ ] Test execution report generated

## Test Execution Strategies

### Test Pyramid Strategy
**Philosophy**: Many unit tests, some integration tests, few e2e tests

**Execution Order**:
1. Unit tests (fast, isolated, high coverage)
2. Integration tests (medium speed, service interactions)
3. E2E tests (slow, full stack, critical paths only)

**Advantages**: Fast feedback, stable tests, cost-effective
**Disadvantages**: Requires discipline to maintain pyramid shape

### Risk-Based Testing
**Philosophy**: Prioritize testing based on risk and business impact

**Execution Order**:
1. Test critical business paths first (highest risk)
2. Test high-usage features next (high impact)
3. Test edge cases and low-usage features last

**Advantages**: Maximizes quality for critical features, efficient resource use
**Disadvantages**: Requires continuous risk assessment

### Shift-Left Testing
**Philosophy**: Test as early as possible in development cycle

**Execution Order**:
1. Static analysis and linting (pre-commit)
2. Unit tests on every commit
3. Integration tests on merge to main
4. E2E tests on deployment to staging

**Advantages**: Early defect detection, reduced cost of defects
**Disadvantages**: Requires investment in test automation

### Continuous Testing
**Philosophy**: Tests run automatically on every change

**Execution Order**:
1. Pre-commit: Linting, unit tests
2. On commit: Full unit suite
3. On merge: Integration and smoke tests
4. On deploy: Regression and e2e tests
5. In production: Synthetic monitoring

**Advantages**: Immediate feedback, high confidence, fast detection
**Disadvantages**: Requires robust CI/CD infrastructure

## Test Coverage Analysis

### Coverage Types

**Line Coverage**: Percentage of code lines executed by tests
- Target: ≥80% (critical components: ≥90%)

**Branch Coverage**: Percentage of decision branches executed
- Target: ≥75% (critical components: ≥85%)

**Function Coverage**: Percentage of functions called by tests
- Target: ≥90%

**Statement Coverage**: Percentage of statements executed
- Target: ≥80%

### Coverage Gap Analysis

**Identify Uncovered Code**:
1. Run coverage tool (e.g., Istanbul, JaCoCo, Coverage.py)
2. Generate coverage report
3. Identify uncovered lines/branches
4. Prioritize coverage gaps by risk

**Remediation**:
1. Write tests for uncovered critical paths
2. Accept low coverage for trivial code (getters/setters)
3. Document rationale for uncovered code
4. Track coverage trends over time

## Defect Severity Levels

### P0 - Critical (Show Stopper)
**Definition**: Blocks core functionality, data loss, security breach

**Examples**:
- Application crashes on startup
- Data corruption or loss
- Security vulnerability allowing unauthorized access

**Response Time**: Immediate (within 4 hours)
**Fix Timeline**: Same day
**Gate Impact**: BLOCKS release

### P1 - High (Major Impact)
**Definition**: Major functionality broken, significant user impact

**Examples**:
- Key feature not working
- Performance degradation >50%
- Incorrect calculations affecting business logic

**Response Time**: Within 1 business day
**Fix Timeline**: Within 3 days
**Gate Impact**: BLOCKS release (unless workaround exists)

### P2 - Medium (Moderate Impact)
**Definition**: Minor functionality broken, workaround exists

**Examples**:
- Edge case failure
- UI layout issue
- Non-critical feature not working

**Response Time**: Within 3 business days
**Fix Timeline**: Next iteration
**Gate Impact**: Does NOT block release

### P3 - Low (Cosmetic)
**Definition**: Minor issue, no functional impact

**Examples**:
- Typo in UI text
- Minor styling issue
- Console warning

**Response Time**: Within 1 week
**Fix Timeline**: Backlog
**Gate Impact**: Does NOT block release

## Regression Detection

### Regression Types

**Functional Regression**: Previously working feature now broken
**Performance Regression**: Feature slower than baseline
**Security Regression**: New vulnerability introduced
**Usability Regression**: User experience degraded

### Regression Detection Process

1. **Establish Baseline**: Tag test results from last stable release
2. **Compare Results**: Run tests and compare to baseline
3. **Identify Regressions**: Flag tests that passed in baseline but fail now
4. **Root Cause**: Determine if regression is due to code change or test issue
5. **Remediate**: Fix regression or update test if requirements changed

### Regression Prevention

**Continuous Integration**: Run tests on every commit
**Test Automation**: Automate regression suite for consistency
**Test Data Management**: Use stable test data to avoid false positives
**Flaky Test Quarantine**: Isolate flaky tests to prevent noise

## Test Health Metrics

### Test Stability
**Flaky Test Rate**: % of tests that fail intermittently
- Target: <5%
- Action: Quarantine flaky tests, investigate root cause

### Test Performance
**Test Execution Time**: Time to run full test suite
- Target: Unit (<5 min), Integration (<15 min), E2E (<30 min)
- Action: Parallelize tests, optimize slow tests

### Test Coverage Trends
**Coverage Over Time**: Track coverage percentage per iteration
- Target: Maintain or increase coverage
- Action: Write tests for new features, address coverage gaps

### Defect Detection Effectiveness
**Defect Escape Rate**: % of defects found in production vs. testing
- Target: <10%
- Action: Improve test coverage, add e2e tests for escaped defects

## Output Report

Generate a test execution summary:

```markdown
# Test Execution Report - {Test Level}

**Project**: {project-name}
**Component**: {component-name}
**Date**: {current-date}
**Test Level**: {level}
**Status**: {PASS | FAIL | BLOCKED}

## Test Execution Summary

### Test Results
- **Total Tests**: {count}
- **Passed**: {count} ({percentage}%)
- **Failed**: {count} ({percentage}%)
- **Skipped**: {count} ({percentage}%)

### Test Coverage
- **Line Coverage**: {percentage}% (target: {target}%)
- **Branch Coverage**: {percentage}% (target: {target}%)
- **Function Coverage**: {percentage}% (target: {target}%)

### Execution Time
- **Total Time**: {duration}
- **Average Test Time**: {duration}
- **Slowest Tests**: {list top 5}

## Test Results by Category

### Unit Tests
- Passed: {count}/{total} ({percentage}%)
- Coverage: {percentage}%
- Execution Time: {duration}

### Integration Tests
- Passed: {count}/{total} ({percentage}%)
- Coverage: {percentage}%
- Execution Time: {duration}

### E2E Tests
- Passed: {count}/{total} ({percentage}%)
- Critical Paths: {count} passed, {count} failed
- Execution Time: {duration}

### Performance Tests
- Passed: {count}/{total} ({percentage}%)
- SLO Compliance: {percentage}%
- Performance Regressions: {count}

### Security Tests
- Passed: {count}/{total} ({percentage}%)
- Vulnerabilities Found: {count} (Critical: {count}, High: {count})
- Security Gate: {PASS | FAIL}

## Defect Summary

### By Severity
- **P0 (Critical)**: {count}
- **P1 (High)**: {count}
- **P2 (Medium)**: {count}
- **P3 (Low)**: {count}

### Top Defects
1. {defect-id}: {title} - Severity: {P0/P1/P2/P3} - Owner: {name}
2. {defect-id}: {title} - Severity: {P0/P1/P2/P3} - Owner: {name}
3. {defect-id}: {title} - Severity: {P0/P1/P2/P3} - Owner: {name}

## Regression Analysis

### Regressions Detected
- **New Failures**: {count} tests that passed in baseline now fail
- **Performance Regressions**: {count} tests significantly slower

### Regression Details
1. {test-name}: {failure-reason} - Root Cause: {cause}
2. {test-name}: {failure-reason} - Root Cause: {cause}

## Test Health Metrics

### Test Stability
- **Flaky Test Rate**: {percentage}% (target: <5%)
- **Flaky Tests**: {list of flaky tests}

### Coverage Trends
- **Current Coverage**: {percentage}%
- **Previous Coverage**: {percentage}%
- **Trend**: {UP | DOWN | STABLE}

### Coverage Gaps
{list uncovered critical paths}

## Quality Gate Status

### Unit Test Gate
- Status: {PASS | FAIL}
- Criteria: Coverage ≥80%, all tests pass
- Result: {details}

### Integration Test Gate
- Status: {PASS | FAIL}
- Criteria: All integration tests pass
- Result: {details}

### E2E Test Gate
- Status: {PASS | FAIL}
- Criteria: Critical paths 100% pass
- Result: {details}

### Security Test Gate
- Status: {PASS | FAIL}
- Criteria: No High/Critical vulnerabilities
- Result: {details}

## Go/No-Go Recommendation

**Recommendation**: {GO | NO-GO | CONDITIONAL}

**Rationale**:
{reasoning based on test results, defect severity, and gate status}

**Blockers**:
{list of P0/P1 defects or failed gates}

**Risks**:
{list of risks if GO decision made}

**Mitigation**:
{mitigation plans for identified risks}

## Next Steps

1. {Step 1}
2. {Step 2}
3. {Step 3}

**Retesting Required**: {YES | NO}
**Retest Scope**: {scope if retesting needed}
```

## Integration with Other Flows

### With Delivery Track
- Test execution is Step 3 of Delivery Track workflow
- Test results feed into Definition of Done validation
- Defects block merge to main branch

### With Gate Checks
- Test execution results are gate criterion
- Coverage thresholds must be met for gate passage
- Test health metrics reviewed at phase gates

### With CI/CD Pipeline
- Tests run automatically on commit/merge/deploy
- Test failures block pipeline progression
- Test results published to dashboard

## Common Failure Modes

### Flaky Tests
**Symptoms**: Tests pass/fail intermittently without code changes

**Remediation**:
1. Isolate flaky tests (quarantine)
2. Investigate root cause (timing, environment, test data)
3. Fix test or underlying code
4. Re-enable test after validation

### Slow Test Suite
**Symptoms**: Test execution time exceeds budget, slows feedback

**Remediation**:
1. Profile test execution to identify slow tests
2. Parallelize test execution
3. Optimize slow tests (reduce setup, use mocks)
4. Move slow tests to nightly suite

### Low Test Coverage
**Symptoms**: Coverage below threshold, uncovered critical paths

**Remediation**:
1. Identify coverage gaps with coverage tool
2. Prioritize tests for critical paths
3. Write tests to close coverage gaps
4. Enforce coverage threshold in CI/CD

### False Positives
**Symptoms**: Tests fail but no actual defect exists

**Remediation**:
1. Review test assertions and expectations
2. Stabilize test data and environment
3. Update tests if requirements changed
4. Document rationale for test changes

## Success Criteria

This command succeeds when:
- [ ] Test execution plan created and approved
- [ ] All test suites executed (unit, integration, e2e)
- [ ] Test coverage thresholds met
- [ ] Defects triaged by severity
- [ ] Regression analysis completed
- [ ] Test execution report generated

## Error Handling

**Test Execution Failure**:
- Report: "Test execution failed: {error-message}"
- Action: "Review test logs and fix test environment"
- Recommendation: "Retry test execution after fix"

**Coverage Below Threshold**:
- Report: "Coverage {percentage}% is below threshold {threshold}%"
- Action: "Write tests to increase coverage"
- Command: "/project:generate-tests --coverage-gaps"

**Critical Defects Found**:
- Report: "{count} P0/P1 defects found, blocking release"
- Action: "Fix critical defects before proceeding"
- Recommendation: "Escalate to engineering manager"

**Regressions Detected**:
- Report: "{count} regressions detected compared to baseline"
- Action: "Investigate root cause and fix regressions"
- Recommendation: "Do not proceed to next phase until regressions fixed"

## References

- Test planning: `test/master-test-plan-template.md`
- Test cases: `test/test-case-card.md`, `test/use-case-test-card.md`
- Defect tracking: `test/defect-card.md`
- Test evaluation: `test/test-evaluation-summary-template.md`
- Quality metrics: `management/quality-metrics-template.md`
