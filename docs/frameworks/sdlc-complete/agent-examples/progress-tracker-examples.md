# Progress Tracker — Worked Examples

Externalized from the agent definition per the few-shot-examples rule (#1587).

### Example 1: Baseline Capture (Simple)

**Input:**
Agent loop starting. Capture baseline metrics for authentication module.

**Thought Process:**
```
Goal: Capture iteration 0 baseline metrics before any changes

Extraction: From test execution:
- test_count: 8
- tests_passed: 5
- tests_failed: 3
- coverage_percentage: 65%
- error_count: 12
- file_count: 3
- loc_total: 450

Reasoning: This baseline represents the initial state. All future iterations
will be compared against these metrics to detect progress or regression.

Synthesis: Baseline captured successfully. Ready to track iteration 1+.
```

**Output:**
```yaml
iteration_metrics:
  iteration: 0
  timestamp: "2026-02-02T10:00:00Z"
  classification: baseline

  testing:
    test_count: 8
    tests_passed: 5
    tests_failed: 3
    tests_skipped: 0
    pass_rate: 62.5
    coverage_percentage: 65.0
    coverage_lines_covered: 292
    coverage_lines_total: 450

  quality:
    lint_errors: 8
    lint_warnings: 4
    type_errors: 0
    build_status: success

  codebase:
    file_count: 3
    loc_total: 450
    complexity_score: 12.5

  quality_score: 0.60
  is_best_iteration: false

baseline_stored: true
next_action: await_iteration_1
```

**Why This Is Good:**
- Captures comprehensive baseline before any work
- Documents all metric categories
- Sets foundation for delta calculations
- Clear classification as baseline

---

### Example 2: Regression Detection (Moderate)

**Input:**
Iteration 3 complete. Previous iterations:
- Iteration 1: 8 tests, 6 pass (75%), coverage 70%
- Iteration 2: 10 tests, 8 pass (80%), coverage 75%
- Iteration 3: 9 tests, 7 pass (77.8%), coverage 72%

**Thought Process:**
```
Goal: Assess iteration 3 progress and check for regression

Extraction: From iteration 3 metrics:
- test_count: 9 (was 10)
- tests_passed: 7 (was 8)
- pass_rate: 77.8% (was 80%)
- coverage: 72% (was 75%)

Exception: Wait, test count DECREASED from 10 to 9. This is a CRITICAL
regression - tests are being deleted, not added.

Reasoning: Multiple regression indicators detected:
1. Test count decreased 10→9 (CRITICAL: test deletion)
2. Pass count decreased 8→7 (HIGH: functionality lost)
3. Coverage dropped 75%→72% (HIGH: exceeds -2% threshold)

Synthesis: Iteration 3 shows CRITICAL regression across 3 dimensions.
Recommend immediate rollback to iteration 2 (best so far).
```

**Output:**
```yaml
iteration_metrics:
  iteration: 3
  timestamp: "2026-02-02T10:15:00Z"
  classification: regression

  testing:
    test_count: 9
    tests_passed: 7
    tests_failed: 2
    pass_rate: 77.8
    coverage_percentage: 72.0

  deltas:
    from_previous:
      test_count_delta: -1
      pass_rate_delta: -2.2
      coverage_delta: -3.0
    from_baseline:
      test_count_delta: +1
      pass_rate_delta: +15.3
      coverage_delta: +7.0

  quality_score: 0.75

  alerts:
    - severity: CRITICAL
      type: test_deletion
      message: "Test count decreased from 10 to 9"
      triggered_at: iteration_3

    - severity: HIGH
      type: coverage_regression
      message: "Coverage dropped 75%→72% (exceeds -2% threshold)"
      triggered_at: iteration_3

    - severity: HIGH
      type: functionality_loss
      message: "Passing tests decreased from 8 to 7"
      triggered_at: iteration_3

best_iteration_tracker:
  current_best: iteration_2
  best_quality_score: 0.80
  current_iteration_score: 0.75

recommendation:
  action: rollback
  target_iteration: 2
  reason: "Multiple CRITICAL regressions detected"
  confidence: 0.95
```

**Why This Is Good:**
- Detected test deletion immediately
- Identified multiple regression dimensions
- Provided clear rollback recommendation
- Preserved best iteration reference
- Calculated deltas from both previous and baseline

---

### Example 3: Best Output Selection on Loop Completion (Complex)

**Input:**
Agent loop completed with 5 iterations. Select best output.

Iteration history:
- Iteration 1: quality_score=0.65, tests=6/8, coverage=68%
- Iteration 2: quality_score=0.82, tests=9/10, coverage=78%
- Iteration 3: quality_score=0.88, tests=10/10, coverage=85% ← PEAK
- Iteration 4: quality_score=0.85, tests=10/10, coverage=83%
- Iteration 5: quality_score=0.81, tests=9/10, coverage=80% (final)

**Thought Process:**
```
Goal: Select the best iteration output from 5 iterations based on quality scores

Extraction: From iteration history:
- Highest quality: Iteration 3 (0.88)
- Final iteration: Iteration 5 (0.81)
- Quality degraded after iteration 3

Reasoning: Per REF-015 Self-Refine, quality fluctuates during refinement.
Peak quality occurred at iteration 3 (0.88), then degraded in iterations 4-5.
We MUST select iteration 3, not the final iteration.

Exception: The final iteration (5) has LOWER quality (0.81) than iteration 3.
This is exactly the pattern REF-015 warns about - over-refinement degradation.

Synthesis: Iteration 3 is the optimal output with quality_score=0.88,
exceeding final iteration by +8.6%. This demonstrates the importance of
non-monotonic selection.
```

**Output:**
```yaml
best_output_selection:
  loop_id: ralph-001
  total_iterations: 5
  selected_iteration: 3
  final_iteration: 5

  quality_trajectory:
    iteration_1: 0.65
    iteration_2: 0.82
    iteration_3: 0.88  # ← SELECTED (PEAK)
    iteration_4: 0.85
    iteration_5: 0.81  # (final)

  selection_criteria:
    primary: highest_quality_score
    threshold: 0.70
    verification_required: true

  selected_iteration_details:
    iteration: 3
    quality_score: 0.88
    timestamp: "2026-02-02T10:20:00Z"
    testing:
      test_count: 10
      tests_passed: 10
      pass_rate: 100.0
      coverage_percentage: 85.0
    quality:
      lint_errors: 0
      build_status: success
    artifacts_path: ".aiwg/ralph/ralph-001/iterations/iteration-003/"

  comparison_to_final:
    final_quality: 0.81
    selected_quality: 0.88
    delta: +0.07
    improvement_percentage: 8.6
    reason_final_not_selected: "Quality degraded after iteration 3"

  selection_rationale:
    - "Iteration 3 achieved peak quality (0.88)"
    - "All tests passing (10/10)"
    - "Highest coverage (85%)"
    - "Quality degraded in iterations 4-5"
    - "Per REF-015, select peak quality, not final iteration"

  degradation_analysis:
    degradation_started: iteration_4
    pattern: over_refinement
    iterations_after_peak: 2
    quality_loss: -7.95%

  artifacts_applied:
    - source: ".aiwg/ralph/ralph-001/iterations/iteration-003/"
    - destination: ".aiwg/output/"
    - files_copied: ["src/auth/login.ts", "test/auth/login.test.ts"]

  report_generated: ".aiwg/ralph/ralph-001/reports/output-selection.md"
```

**Why This Is Good:**
- Selected best iteration (3), not final (5)
- Quantified improvement over final (+8.6%)
- Identified degradation pattern (over-refinement)
- Provided clear rationale with REF-015 citation
- Detailed comparison and artifact paths
- Demonstrates non-monotonic selection principle

---

### Example 4: Conversation Pattern (Al Orchestrator integration)

```
Al Orchestrator → Progress Tracker: "Iteration 1 complete"
Progress Tracker → Al Orchestrator: "Forward progress detected, continue"

Al Orchestrator → Progress Tracker: "Iteration 3 complete"
Progress Tracker → Al Orchestrator: "ALERT: Coverage regression, recommend rollback"

Al Orchestrator → Progress Tracker: "Loop complete, select best output"
Progress Tracker → Al Orchestrator: "Selected iteration 2 (quality: 0.88 vs final 0.81)"
```

## Reference Templates and Formulas

Externalized from the agent definition (#1600). The agent definition keeps the
rules and weights; these are the full demonstrative templates.

### Quality Score Calculation (full formula)

```yaml
quality_score_formula:
  dimensions:
    validation:
      weight: 0.30
      components:
        - all_tests_pass: 100 if all pass, else (passed/total)*100
        - build_success: 100 if success, else 0
        - no_lint_errors: 100 if 0 errors, else max(0, 100 - errors*5)

    completeness:
      weight: 0.25
      components:
        - coverage_percentage: coverage_percentage
        - test_count_vs_baseline: (current/baseline)*100

    correctness:
      weight: 0.25
      components:
        - pass_rate: pass_rate
        - error_count_inverted: max(0, 100 - error_count*2)

    readability:
      weight: 0.10
      components:
        - lint_warnings_inverted: max(0, 100 - warnings*3)
        - complexity_reasonable: max(0, 100 - complexity*5)

    efficiency:
      weight: 0.10
      components:
        - loc_appropriate: if loc within 20% of baseline: 100, else reduced
        - no_code_bloat: if loc_delta > 50%: 50, else 100

  calculation:
    1_compute_each_dimension_score
    2_weighted_sum = sum(dimension_score * weight)
    3_normalize_to_0_1_scale
    4_threshold_for_acceptance = 0.70
```

### Iteration Report Template

```markdown
## Iteration {N} Progress Report

**Timestamp**: {timestamp}
**Classification**: {forward|plateau|regression|stalled}
**Quality Score**: {quality_score}

### Metrics

| Metric | Current | Previous | Delta | Baseline | Delta from Baseline |
|--------|---------|----------|-------|----------|---------------------|
| Test Count | {curr} | {prev} | {delta} | {base} | {delta_base} |
| Pass Rate | {curr}% | {prev}% | {delta}% | {base}% | {delta_base}% |
| Coverage | {curr}% | {prev}% | {delta}% | {base}% | {delta_base}% |
| Errors | {curr} | {prev} | {delta} | {base} | {delta_base} |

### Quality Score Breakdown

| Dimension | Score | Weight | Contribution |
|-----------|-------|--------|--------------|
| Validation | {score} | 0.30 | {contrib} |
| Completeness | {score} | 0.25 | {contrib} |
| Correctness | {score} | 0.25 | {contrib} |
| Readability | {score} | 0.10 | {contrib} |
| Efficiency | {score} | 0.10 | {contrib} |
| **Total** | **{total}** | 1.00 | **{total}** |

### Alerts

{alert_list or "No alerts"}

### Best Iteration Tracker

- **Current Best**: Iteration {best_iteration} (quality: {best_quality})
- **This Iteration**: Iteration {curr} (quality: {curr_quality})
- **Best Preserved**: {yes|no}

### Recommendation

**Action**: {continue|stop|rollback|escalate}
**Reason**: {detailed_rationale}
**Confidence**: {confidence_score}
```

### Loop Termination Recommendations (full logic)

```yaml
termination_logic:
  recommend_stop:
    conditions:
      - stalled: true
      - infinite_loop_detected: true
      - critical_regression: true
    message: "Loop should terminate due to {reason}"

  recommend_continue:
    conditions:
      - forward_progress: true
      - quality_score < target_threshold
      - iteration_count < max_iterations
    message: "Continue - forward progress detected"

  recommend_rollback:
    conditions:
      - regression_detected: true
      - current_quality < best_quality - 0.1
    message: "Rollback to iteration {best} due to regression"

  escalate:
    conditions:
      - infinite_loop_pattern: true
      - metric_cycling: true
      - uncertainty_high: true
    message: "Escalate to human - {issue} detected"
```

### Agent Loop Hook Points (full integration config)

```yaml
ralph_integration:
  hooks:
    pre_loop:
      - progress_tracking.capture_baseline

    post_iteration:
      - progress_tracking.capture_metrics
      - progress_tracking.assess_progress
      - progress_tracking.update_best_iteration
      - progress_tracking.check_alerts
      - progress_tracking.generate_iteration_report

    loop_decision:
      - progress_tracking.recommend_termination
        # Returns: {action: continue|stop|rollback|escalate, reason: string}

    post_loop:
      - progress_tracking.select_best_output
      - progress_tracking.generate_final_report
      - progress_tracking.apply_selected_artifacts
```

### Baseline Capture (full config)

```yaml
baseline_capture:
  triggers:
    - ralph_loop_start
    - baseline_request

  metrics_to_capture:
    testing:
      - test_count
      - tests_passed
      - tests_failed
      - tests_skipped
      - pass_rate
      - coverage_percentage
      - coverage_lines_covered
      - coverage_lines_total

    quality:
      - lint_errors
      - lint_warnings
      - type_errors
      - build_status

    codebase:
      - file_count
      - loc_total
      - complexity_score

  storage:
    path: ".aiwg/ralph/{loop_id}/progress/iteration-000-baseline.json"
    format: yaml
```

### Iteration Monitoring (full step config)

```yaml
iteration_monitoring:
  steps:
    1_execute_tests:
      - run: npm test
      - capture: stdout/stderr
      - parse: test framework output

    2_capture_metrics:
      - test_count: from test output
      - pass_rate: calculated from results
      - coverage: from coverage report
      - error_count: from linter/compiler
      - complexity: from complexity tools

    3_calculate_deltas:
      - from_previous: iteration N vs N-1
      - from_baseline: iteration N vs iteration 0

    4_compute_quality_score:
      - validation: 0.30 weight
      - completeness: 0.25 weight
      - correctness: 0.25 weight
      - readability: 0.10 weight
      - efficiency: 0.10 weight

    5_classify_iteration:
      - forward: tests↑, coverage↑, errors↓
      - plateau: metrics stable
      - regression: tests↓, coverage↓, errors↑
      - stalled: no change for 3+ iterations

    6_update_best_tracker:
      - if quality_score > current_best:
          current_best = iteration_N
```

### Best Iteration Tracking (full config, REF-015)

```yaml
best_iteration_tracking:
  initialize:
    current_best: null
    best_quality_score: 0.0
    best_artifacts_path: null

  update_on_each_iteration:
    if quality_score > best_quality_score:
      current_best = iteration_N
      best_quality_score = quality_score
      best_artifacts_path = snapshot_path

  preserve_artifacts:
    snapshot_all_iterations: true
    snapshot_path: ".aiwg/ralph/{loop_id}/iterations/iteration-{N:03d}/"
    include:
      - all_modified_files
      - test_results
      - coverage_report
      - metrics.json

  selection_algorithm:
    # DO NOT use final iteration blindly
    on_loop_completion:
      - load_all_iterations
      - find_max_quality_score
      - select_that_iteration
      - log_selection_decision
      - apply_selected_artifacts
```

### Infinite Loop Detection (full config, REF-076)

```yaml
infinite_loop_detection:
  metric_signature:
    components:
      - test_count
      - pass_rate
      - coverage_percentage
      - error_count

  detection:
    window: 5  # Check last 5 iterations
    trigger:
      - current_signature matches previous_signature
      - iteration_count > 10

  action:
    severity: CRITICAL
    response: force_terminate
    message: "Infinite loop detected: metrics cycling"
    preserve_state: true
```

### Stall Detection (full config)

```yaml
stall_detection:
  criteria:
    - last_3_iterations.all(classification == plateau)
    - quality_score_variance < 0.02
    - no_metric_improvement

  recommendation:
    action: suggest_termination
    message: "No meaningful progress for 3 iterations"
    alternatives:
      - "Consider different approach"
      - "Request human intervention"
      - "Try alternative strategy"
```

### Anti-Regression Alerts (full trigger config)

```yaml
alert_triggers:
  CRITICAL:
    - test_count_decreased:
        condition: "test_count < previous_iteration.test_count"
        message: "Test count decreased from {prev} to {curr}"
        action: immediate_alert_and_rollback

    - working_tests_failing:
        condition: "tests_passed < previous_iteration.tests_passed"
        message: "Previously passing tests now failing"
        action: immediate_alert_and_rollback

  HIGH:
    - coverage_regression:
        condition: "coverage_delta < -2.0"
        message: "Coverage dropped {delta}%"
        action: alert_and_flag_iteration

    - error_increase:
        condition: "error_count > previous + 5"
        message: "Error count increased by {delta}"
        action: alert_regression

  MEDIUM:
    - file_deletion:
        condition: "file_count < previous_iteration.file_count"
        message: "File count decreased (potential code deletion)"
        action: alert_and_review

    - complexity_explosion:
        condition: "complexity_delta > 0.5"
        message: "Complexity increased >50%"
        action: alert_complexity
```
