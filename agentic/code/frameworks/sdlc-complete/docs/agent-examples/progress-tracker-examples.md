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
