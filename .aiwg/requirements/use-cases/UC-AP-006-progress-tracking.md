---
id: UC-AP-006
title: Progress Tracking with Anti-Regression
status: draft
priority: high
created: 2026-02-02
phase: inception
actor: Progress Tracking Agent
---

# Use Case UC-AP-006: Progress Tracking with Anti-Regression

## Summary

Track iterative task progress to detect when agents are regressing, stalling, or avoiding work rather than making genuine forward progress. Prevent infinite loops and detect when "fixes" break working functionality.

## Actors

- **Primary**: Progress Tracking Agent (or Skill)
- **Secondary**: Ralph Loop Orchestrator
- **Stakeholders**: Human developers, DevOps engineers

## Preconditions

- Ralph loop is executing iterative task
- Baseline metrics captured from iteration 0 (initial state)
- Test suite exists and is executable
- Code coverage tools configured

## Main Success Scenario

1. **Baseline Capture** (Iteration 0)
   - Progress Tracking Agent captures initial metrics:
     - Test count and pass rate
     - Code coverage percentage
     - Error/warning count
     - File count and LOC
     - Code complexity metrics
     - Build status

2. **Iteration Monitoring** (Each iteration N)
   - Agent executes test suite
   - Agent captures current metrics
   - Agent compares to iteration N-1 and baseline
   - Agent computes progress trajectory

3. **Progress Assessment**
   - Calculate delta metrics:
     - Δ test pass rate
     - Δ coverage
     - Δ error count
     - Δ complexity
   - Classify iteration outcome:
     - **Forward progress**: Tests pass ↑, coverage ↑, errors ↓
     - **Plateau**: Metrics stable (acceptable)
     - **Regression**: Tests pass ↓, coverage ↓, errors ↑
     - **Stalled**: No meaningful change for 3+ iterations

4. **Best Iteration Tracking** (per REF-015)
   - Track highest quality score across all iterations
   - Maintain reference to best artifacts
   - Update if current iteration exceeds best score

5. **Anti-Regression Alerts**
   - **CRITICAL**: Test count decreased
   - **CRITICAL**: Working tests now failing
   - **HIGH**: Coverage dropped >2%
   - **HIGH**: Error count increased
   - **MEDIUM**: File count decreased (potential code deletion)
   - **MEDIUM**: Complexity exploded (>50% increase)

6. **Progress Reporting**
   - Generate iteration report with:
     - Metric trajectory chart
     - Classification (forward/plateau/regression/stalled)
     - Best iteration reference
     - Alerts if any
   - Store report in `.aiwg/ralph/{loop-id}/progress/`

7. **Loop Termination Recommendation**
   - **Recommend stop**: Stalled for 3+ iterations
   - **Recommend stop**: Regression detected
   - **Recommend continue**: Forward progress detected
   - **Escalate**: Infinite loop pattern (metrics cycling)

## Alternative Flows

### 2a: Test Suite Unavailable

- Iteration 2: Agent cannot execute tests
- Agent logs warning
- Agent uses alternative metrics (lint errors, build status)
- Continue with reduced confidence

### 3a: Metrics Degraded

- Iteration 3: Coverage dropped from 85% to 78%
- Agent generates HIGH alert
- Agent flags iteration as regression
- Agent suggests rollback to previous iteration
- Ralph loop can auto-rollback or escalate to human

### 5a: Stalled Progress

- Iterations 5-8: No meaningful metric changes
- Agent detects stall pattern
- Agent recommends loop termination
- Agent suggests: "Consider different approach or human intervention"

### 7a: Infinite Loop Detection (per REF-076)

- Agent detects metrics cycling (e.g., iteration 8 metrics match iteration 3)
- Agent generates CRITICAL alert
- Agent forcibly terminates loop
- Agent logs infinite loop pattern for analysis

## Postconditions

### On Success
- Progress tracked for all iterations
- Best iteration identified and preserved
- Trajectory documented
- Loop terminated with optimal output

### On Regression
- Regression detected and flagged
- Best pre-regression state preserved
- Alert generated for human review
- Loop stopped before further damage

## Acceptance Criteria

- [ ] Progress Tracking Agent captures all required metrics per iteration
- [ ] Baseline metrics captured at iteration 0
- [ ] Delta metrics computed correctly
- [ ] Progress classification accurate (forward/plateau/regression/stalled)
- [ ] Best iteration tracking per REF-015 Self-Refine
- [ ] Anti-regression alerts trigger on:
  - [ ] Test count decrease
  - [ ] Coverage drop >2%
  - [ ] Working feature now broken
  - [ ] Error count increase after "fix"
- [ ] Infinite loop detection per REF-076
- [ ] Progress reports stored in `.aiwg/ralph/{loop-id}/progress/`
- [ ] Loop termination recommendations accurate

## Non-Functional Requirements

### Performance
- Metric collection overhead <5% of iteration time
- Progress assessment completes within 5 seconds

### Reliability
- Handles missing test suite gracefully
- Robust to partial metric availability
- Does not false-positive on legitimate refactoring

### Usability
- Clear progress classification (human-readable)
- Actionable recommendations
- Visual trajectory charts (optional)

## Tracking Metrics

### Core Metrics (per iteration)

```yaml
iteration_metrics:
  iteration: N
  timestamp: ISO-8601

  testing:
    test_count: integer
    tests_passed: integer
    tests_failed: integer
    tests_skipped: integer
    pass_rate: percentage
    coverage_percentage: percentage
    coverage_lines_covered: integer
    coverage_lines_total: integer

  quality:
    lint_errors: integer
    lint_warnings: integer
    type_errors: integer
    build_status: success | failure

  codebase:
    file_count: integer
    loc_total: integer
    loc_added: integer (vs iteration N-1)
    loc_deleted: integer (vs iteration N-1)
    complexity_score: number (cyclomatic complexity)

  execution:
    build_time_ms: integer
    test_time_ms: integer

  classification:
    progress_type: forward | plateau | regression | stalled
    quality_score: 0.0-1.0
    is_best_iteration: boolean
```

### Trajectory Metrics (across iterations)

```yaml
trajectory:
  iterations: [1, 2, 3, 4, 5]
  pass_rate_trajectory: [0.60, 0.75, 0.85, 0.85, 0.83]
  coverage_trajectory: [70, 75, 80, 82, 81]
  error_trajectory: [15, 10, 5, 4, 6]

  best_iteration: 3
  best_quality_score: 0.89

  alerts:
    - iteration: 5
      severity: HIGH
      type: regression
      message: "Coverage dropped from 82% to 81%, errors increased 4→6"
```

## Integration with Ralph Loop

### Ralph Loop Hooks

```yaml
ralph_integration:
  hooks:
    pre_iteration:
      - progress_tracking.capture_baseline (iteration 0 only)

    post_iteration:
      - progress_tracking.capture_metrics
      - progress_tracking.assess_progress
      - progress_tracking.update_best_iteration
      - progress_tracking.check_alerts

    loop_decision:
      - progress_tracking.recommend_termination
        # Returns: continue | stop | escalate
```

### Best Output Selection

Per REF-015 Self-Refine:

```yaml
best_output_selection:
  algorithm: non_monotonic_selection
  # Do NOT simply use final iteration
  # Select iteration with highest quality score

  on_loop_completion:
    - identify_best_iteration
    - restore_artifacts_from_best
    - generate_selection_report:
        selected_iteration: N
        reason: "Highest quality score: 0.89"
        final_iteration_score: 0.83
        improvement_over_final: +7.2%
```

## Anti-Regression Detection Rules

### Rule 1: Test Regression

```yaml
test_regression:
  trigger:
    - test_count < previous_iteration.test_count
    - tests_passed < previous_iteration.tests_passed
  severity: CRITICAL
  action: alert_and_recommend_rollback
```

### Rule 2: Coverage Regression

```yaml
coverage_regression:
  trigger:
    - coverage_delta < -2.0  # Dropped >2%
  severity: HIGH
  action: alert_and_flag_iteration
```

### Rule 3: Error Increase

```yaml
error_increase:
  trigger:
    - (lint_errors + type_errors) > previous_iteration
    - error_delta > 5
  severity: HIGH
  action: alert_regression
```

### Rule 4: Stalled Progress

```yaml
stalled_detection:
  trigger:
    - last_3_iterations.all(classification == plateau)
    - quality_score_variance < 0.02
  severity: MEDIUM
  action: recommend_termination
  message: "No meaningful progress for 3 iterations"
```

### Rule 5: Infinite Loop (per REF-076)

```yaml
infinite_loop_detection:
  trigger:
    - metric_signature_matches_previous_iteration(window=5)
    - iteration_count > 10
  severity: CRITICAL
  action: force_terminate
  message: "Infinite loop detected: metrics cycling"
```

## Reproducibility Integration (per REF-058)

### Checkpoint Correlation

```yaml
reproducibility:
  checkpoint_integration:
    - store_metrics_with_checkpoint
    - enable_replay_from_best_iteration
    - validate_reproducibility:
        re_run_best_iteration: true
        verify_metrics_match: true
```

## Example Scenario

### Scenario: Regression Detected

```
Iteration 1: 10 tests, 6 pass, 60% coverage → Forward progress
Iteration 2: 10 tests, 8 pass, 75% coverage → Forward progress
Iteration 3: 10 tests, 9 pass, 82% coverage → Forward progress (BEST)
Iteration 4: 10 tests, 9 pass, 81% coverage → Plateau
Iteration 5:  9 tests, 7 pass, 78% coverage → REGRESSION DETECTED

Alert: CRITICAL - Test count decreased (10→9), coverage dropped (82%→78%)
Recommendation: Rollback to iteration 3 (best iteration)
Action: Ralph loop stops, preserves iteration 3 artifacts
```

## Technical Notes

### Metric Collection

Use existing tooling where possible:
- Test results: Parse JUnit XML, TAP, or test framework output
- Coverage: Parse `lcov.info`, `coverage.json`, or Istanbul reports
- Complexity: `eslint-plugin-complexity`, `radon` (Python), `gocyclo` (Go)
- Build status: Exit codes from build commands

### Storage Location

```
.aiwg/ralph/{loop-id}/
├── progress/
│   ├── iteration-001-metrics.json
│   ├── iteration-002-metrics.json
│   ├── iteration-003-metrics.json (BEST)
│   └── trajectory.json
├── artifacts/
│   ├── iteration-001/
│   ├── iteration-002/
│   └── iteration-003/  # Preserved as best
└── reports/
    └── progress-summary.md
```

## Reasoning

1. **Problem Analysis**: Ralph loops can stall, regress, or enter infinite loops (REF-076). Without progress tracking, loops waste resources and may degrade working code.

2. **Constraint Identification**: Must detect regressions without false positives. Must handle missing metrics gracefully. Must not add significant overhead.

3. **Alternative Consideration**:
   - **Option A**: Human reviews every iteration → Too slow, defeats automation
   - **Option B**: Fixed iteration limit → May stop before completion or run too long
   - **Option C**: Automated progress tracking → Optimal balance (SELECTED)

4. **Decision Rationale**: Automated progress tracking enables early detection of regressions and infinite loops while preserving best outputs per REF-015.

5. **Risk Assessment**:
   - **Risk**: False positives on legitimate refactoring
   - **Mitigation**: Multi-metric assessment, threshold tuning
   - **Risk**: Overhead slows iterations
   - **Mitigation**: Async metric collection, caching

## References

- @.aiwg/research/findings/REF-076-production-challenges.md - ZenML infinite loop detection
- @.aiwg/research/findings/REF-015-self-refine.md - Best iteration selection pattern
- @.aiwg/research/findings/REF-058-r-lam.md - Reproducibility and progress tracking
- @.claude/rules/best-output-selection.md - Non-monotonic selection rules
- @.claude/rules/reproducibility.md - Checkpoint integration
- @agentic/code/addons/ralph/schemas/iteration-analytics.yaml - Iteration tracking schema
- @agentic/code/frameworks/sdlc-complete/agents/progress-tracking-agent.md - Agent definition (to be created)

## Implementation Notes

**CRITICAL**: This use case describes an **agentic capability**, not a passive monitoring system.

Implementation should be:
1. **Progress Tracking Agent** OR **Progress Tracking Skill**
2. Integrated with Ralph loop hooks (`post_iteration`, `loop_decision`)
3. Capable of autonomous decision-making (recommend stop/continue/escalate)
4. Storing structured data for reproducibility

See: @agentic/code/frameworks/sdlc-complete/agents/ for agent implementation patterns.

---

**Status**: Draft
**Next Steps**:
1. Create Progress Tracking Agent definition
2. Define metric collection interfaces
3. Implement Ralph loop integration hooks
4. Add to SDLC workflow schemas
