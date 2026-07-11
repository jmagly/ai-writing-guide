---
enforcement: medium
---

# Best Output Selection Rules

**Enforcement Level**: MEDIUM
**Scope**: Agent loops and iterative refinement
**Research Basis**: REF-015 Self-Refine; the LFD control-pattern research cluster (external corpus: section9/research-papers REF-1398–REF-1406 / REF-1500–REF-1542, pending local induction)
**Issue**: #168, #1585

## Overview

These rules enforce non-monotonic output selection - tracking the highest quality output across all iterations rather than simply accepting the final iteration result.

## Research Foundation

From REF-015 Self-Refine (Madaan et al., 2023):
- Quality can fluctuate during iterative refinement
- Final iteration is not always the best
- Peak quality often occurs at iteration 2-3, may degrade later
- Selecting from history improves overall output quality

**Example Quality Trajectory**:
```
Iteration 1: 72% quality
Iteration 2: 85% quality ← PEAK
Iteration 3: 83% quality (degraded)
Final output: 83% (suboptimal)
Best selection: 85% (iteration 2)
```

## Mandatory Rules

### Rule 1: Preserve All Iteration Outputs

**REQUIRED**:
Every iteration's output MUST be preserved until loop completion.

```yaml
iteration_history:
  - iteration: 1
    artifacts:
      - path: ".aiwg/working/iteration-1/output.md"
        content_hash: "abc123"
    quality_score: 0.72
    timestamp: "2026-01-25T10:00:00Z"

  - iteration: 2
    artifacts:
      - path: ".aiwg/working/iteration-2/output.md"
        content_hash: "def456"
    quality_score: 0.85  # Best so far
    timestamp: "2026-01-25T10:05:00Z"

  - iteration: 3
    artifacts:
      - path: ".aiwg/working/iteration-3/output.md"
        content_hash: "ghi789"
    quality_score: 0.83  # Degraded
    timestamp: "2026-01-25T10:10:00Z"
```

### Rule 2: Track Running Best

**REQUIRED**:
Maintain a reference to the best iteration throughout the loop.

```yaml
best_tracker:
  current_best:
    iteration: 2
    quality_score: 0.85
    artifacts_path: ".aiwg/working/iteration-2/"

  update_rule: |
    IF new_iteration.quality_score > current_best.quality_score:
      current_best = new_iteration
```

### Rule 3: Select Best, Not Final

**REQUIRED**:
On loop completion, select the highest quality output regardless of iteration number.

```yaml
selection_algorithm:
  on_loop_completion:
    - compare: current_best vs final_iteration
    - select: higher_quality_score
    - log: selection_decision
    - apply: selected_artifacts

  selection_criteria:
    primary: quality_score
    tiebreaker: earlier_iteration  # Prefer earlier if equal
```

**FORBIDDEN**:
```yaml
# Do NOT simply use final iteration
final_output: iterations[-1].artifacts  # Wrong!
```

**REQUIRED**:
```yaml
# Select best quality regardless of recency
final_output: max(iterations, key=quality_score).artifacts
```

### Rule 4: Log Selection Decisions

**REQUIRED**:
Document why a particular iteration was selected.

```markdown
## Output Selection Report

**Loop ID**: ralph-001
**Total Iterations**: 3
**Selected Iteration**: 2

### Quality Scores
| Iteration | Quality | Status |
|-----------|---------|--------|
| 1 | 72% | |
| 2 | 85% | ✓ SELECTED |
| 3 | 83% | (final) |

### Selection Rationale
Iteration 2 selected because:
- Highest quality score (85% vs 83% final)
- Quality degraded in iteration 3
- All validation checks passed

### Artifacts Applied
- .aiwg/architecture/sad.md (from iteration 2)
```

### Rule 5: Support Manual Override

**REQUIRED**:
Allow human override of automatic selection.

```yaml
manual_override:
  enabled: true
  options:
    - use_best: "Select highest quality"
    - use_final: "Use final iteration"
    - use_specific: "Select iteration N"

  audit:
    log_override: true
    require_reason: true
```

### Rule 6: Record Hypothesis Before Change

**REQUIRED for autonomous loops with more than one iteration**:
Before making a new change, record a falsifiable experiment entry. This prevents
random-walk refinement and makes compaction-safe audit trails possible.

```yaml
iteration_experiment:
  iteration: 4
  hypothesis: "The failing integration test is caused by stale fixture setup, not the API handler."
  expected_failure_mode: "If wrong, unit tests pass but integration still fails with the same fixture error."
  distinguishing_diagnostic: "Run the single failing integration test after only fixture setup changes."
  structural_variant: "fixture-isolation"
```

The fields MUST be captured before the action they justify. A later summary may
compress wording, but it must preserve the hypothesis, expected failure mode,
diagnostic, and result for every material strategy change.

### Rule 7: Stop on Budget Exhaustion With Best-Output Report

When a loop exhausts a declared wall-clock, token, spend, tool-call, or
iteration budget, it MUST stop and emit a best-output report. Budget exhaustion
is not a reason to use the final iteration if an earlier iteration scored
higher.

```yaml
budget_stop_report:
  stop_reason: "total_tokens_exhausted"
  budgets:
    tokens: { limit: 200000, observed: 199240 }
    wall_clock_minutes: { limit: 90, observed: 84 }
    spend_usd: { limit: 15.00, observed: 12.70 }
  selected_iteration: 5
  final_iteration: 7
  best_score: 0.88
  final_score: 0.81
  hypothesis_outcomes:
    - iteration: 5
      result: "accepted_best"
  next_recommended_action: "Raise budget only if holdout score remains below threshold after human review."
```

Rate caps throttle activity; hard budget stops end the loop. The completion
report must clearly identify which one occurred.

## Quality Scoring

### Scoring Dimensions

Quality score MUST incorporate multiple dimensions:

| Dimension | Weight | Description |
|-----------|--------|-------------|
| Validation | 0.30 | Passes all validation checks |
| Completeness | 0.25 | All required sections present |
| Correctness | 0.25 | Accurate information/behavior |
| Readability | 0.10 | Clear, well-structured |
| Efficiency | 0.10 | Appropriate length/complexity |

Eval-driven loops MAY replace these weights with a declared loss function, but
the declaration must include the target, constraints, instruments, stop
conditions, and any hidden holdout policy. Self-reported quality is secondary
to mechanical evidence when both exist.

When an eval harness is declared, score/lint/probe/status results MUST be
captured as part of the iteration evidence. `score` may influence
`quality_score`; `lint` may force `VOID`; `probe` records the generalization or
integrity signal; `status` records budget, burn-rate, and best-iteration
context. Detailed holdout or lint diagnostics remain outside
optimizer-readable output and cannot be used as iteration hints.

> **Status (#1772)**: the eval-harness contract, the `VOID` iteration status,
> and the holdout-leakage adversarial tests are **spec-only / not yet
> implemented** in the runtime (`tools/ralph-external/` has no `VOID` status;
> `verification_status` is `passed|failed|skipped`). The MUSTs in this
> paragraph apply **only when an eval harness is present**; until the harness is
> built they are the target contract, not an active runtime gate. Build tracked
> in #1772.

When a loop declares a random, chance, or random-tool-shortlist baseline, the
best-output report SHOULD include lift over that baseline. Raw quality,
quality-per-1K-token, and quality-per-minute are not enough to show progress
over random-walk behavior when a baseline is available.

```yaml
baseline_comparison:
  baseline_type: "random_walk"
  baseline_quality_score: 0.50
  quality_lift: 0.30
  token_efficiency_lift: 0.55
  speed_efficiency_lift: 0.55
```

### Score Calculation

```yaml
quality_score:
  formula: |
    weighted_sum(
      validation * 0.30,
      completeness * 0.25,
      correctness * 0.25,
      readability * 0.10,
      efficiency * 0.10
    )

  normalization: 0.0 to 1.0
  threshold_for_acceptance: 0.70
```

## Integration with Al

### Iteration Snapshot

After each iteration, Al MUST:

1. **Snapshot artifacts**
   ```bash
   cp -r .aiwg/working/current/* .aiwg/working/iteration-N/
   ```

2. **Calculate quality score**
   ```yaml
   quality_check:
     - run_validation
     - check_completeness
     - evaluate_correctness
     - calculate_weighted_score
   ```

3. **Update best tracker**
   ```yaml
   if quality_score > best_tracker.quality_score:
     best_tracker.update(iteration_N)
   ```

4. **Persist experiment record**
   ```yaml
   experiment_record:
     hypothesis: "<recorded before change>"
     expected_failure_mode: "<recorded before change>"
     distinguishing_diagnostic: "<recorded before change>"
     result: "<observation after validation>"
     probe_or_generalization_signal: "<dev/probe/holdout aggregate if available>"
   ```

### Loop Completion

On completion:

1. **Compare best vs final**
   ```yaml
   comparison:
     best_iteration: 2 (85%)
     final_iteration: 3 (83%)
     delta: -2%
     decision: use_best
   ```

2. **Apply selected output**
   ```bash
   cp -r .aiwg/working/iteration-2/* .aiwg/output/
   ```

3. **Generate selection report**
   ```markdown
   # Output Selection Report
   ...
   ```

## Degradation Patterns

### Common Causes

| Pattern | Cause | Mitigation |
|---------|-------|------------|
| Over-refinement | Too many iterations | Early stopping |
| Scope creep | Adding unnecessary features | Strict requirements |
| Style drift | Changing approach mid-loop | Consistent prompts |
| Information loss | Summarizing too aggressively | Preserve details |

### Detection

```yaml
degradation_detection:
  triggers:
    - quality_delta < -0.05  # 5% drop
    - consecutive_decreases >= 2
    - validation_failures_increased

  actions:
    - flag_degradation
    - consider_early_stopping
    - preserve_pre_degradation_best
```

## Storage

```
.aiwg/ralph/{loop_id}/
├── iterations/
│   ├── iteration-1/
│   │   ├── artifacts/
│   │   └── metrics.json
│   ├── iteration-2/
│   │   ├── artifacts/
│   │   └── metrics.json
│   └── iteration-3/
│       ├── artifacts/
│       └── metrics.json
├── best-tracker.json
├── selection-report.md
└── final-output/
    └── (selected artifacts)
```

## Validation Checklist

Before completing an agent loop:

- [ ] All iteration outputs preserved
- [ ] Quality score calculated for each iteration
- [ ] Best tracker maintained throughout
- [ ] Selection based on quality, not recency
- [ ] Hypothesis-before-change fields captured before material changes
- [ ] Eval harness result captured when score/lint/probe/status instruments are declared
- [ ] VOID results excluded from best-output selection unless a human override explicitly accepts them *(applies only when an eval harness is declared; VOID is spec-only until the harness is built — #1772)*
- [ ] Budget exhaustion, if any, stopped the loop and produced a best-output report
- [ ] Selection decision logged with rationale
- [ ] Override option available if needed
- [ ] Degradation patterns detected

## References

- @$AIWG_ROOT/agentic/code/addons/agent-loop/schemas/iteration-analytics.yaml - Iteration tracking
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/schemas/research/quality-dimensions.yaml - Quality scoring
- @.aiwg/research/findings/REF-015-self-refine.md - Research foundation
- @.aiwg/research/reports/issue-1585-lfd-control-patterns-research-brief.md - LFD control-pattern synthesis
- @.aiwg/architecture/adr-lfd-control-patterns-for-agent-loops.md - Tiered loop-control ADR
- #168 - Implementation issue
- #1585 - LFD control patterns for agent loops

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-01-25
