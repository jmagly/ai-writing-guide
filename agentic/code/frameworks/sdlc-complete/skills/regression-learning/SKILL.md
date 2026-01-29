# regression-learning

Cross-task learning skill for improving regression detection over time through pattern recognition, test prioritization, and historical analysis.

## Triggers

- "learn from regressions"
- "improve regression detection"
- "analyze regression patterns"
- "prioritize regression tests"
- "what tests should I run"
- "predict regression risk"
- "similar past failures"

## Purpose

This skill integrates with Ralph's cross-task learning system to continuously improve regression detection by:
- Learning from past regression patterns (REG-XXXX records)
- Identifying high-risk code patterns and hot spots
- Prioritizing tests by regression likelihood
- Building a taxonomy of root causes
- Suggesting fixes based on past resolutions
- Adapting test strategies based on effectiveness

Based on REF-013 MetaGPT's executable feedback pattern, this skill creates a persistent memory that accumulates knowledge across iterations and projects.

## Behavior

When triggered, this skill:

1. **Pattern Recognition**:
   - Analyze historical regression records
   - Identify recurring error patterns
   - Map code patterns to failure types
   - Detect hot spots in codebase
   - Build regression taxonomy

2. **Test Prioritization**:
   - Rank tests by regression detection likelihood
   - Prioritize based on:
     - Historical failure correlation
     - Code change patterns
     - Component risk scores
     - Recent regression trends
   - Generate optimal test execution order

3. **Root Cause Memory**:
   - Store root cause analyses from REG-XXXX
   - Link similar regressions across time
   - Build fix template library
   - Track fix effectiveness
   - Enable cross-project learning

4. **Predictive Analysis**:
   - Predict regression probability for code changes
   - Flag high-risk modifications
   - Suggest additional test coverage
   - Recommend preventive actions

5. **Feedback Loop**:
   - Learn from false positives/negatives
   - Adjust confidence thresholds
   - Incorporate human corrections
   - Track prediction accuracy
   - Improve over time

## Learning Schema

### Learning Record

```yaml
# .aiwg/ralph/learning/regression-patterns.yaml

learning_records:
  - pattern_id: "RP-001"
    pattern_name: "null_access_without_check"
    category: null_undefined_access

    occurrences:
      - regression_id: "REG-0023"
        file: "src/auth/validate.ts"
        root_cause: "Missing null check before property access"
        fix: "Added early return for null/undefined"
        effectiveness: 1.0  # 100% success rate

      - regression_id: "REG-0047"
        file: "src/api/users.ts"
        root_cause: "Null user object accessed"
        fix: "Added null guard clause"
        effectiveness: 1.0

      - regression_id: "REG-0091"
        file: "src/payments/process.ts"
        root_cause: "Transaction object null"
        fix: "Added null check with error throw"
        effectiveness: 1.0

    statistics:
      total_occurrences: 3
      avg_fix_time_hours: 1.5
      recurrence_rate: 0.0  # 0% recurrence after fix
      detection_methods:
        automated_test: 3
        production: 0

    fix_template:
      pattern: |
        // Before: obj.property
        // After:
        if (!obj) {
          throw new Error('Object is null or undefined');
        }
        // Or: if (!obj) return defaultValue;

      applicability_rules:
        - language: typescript
        - pattern: "Cannot read property .* of null"
        - context: function_entry

    confidence: 0.95
    last_updated: "2026-01-28T15:30:00Z"
```

### Hot Spot Tracking

```yaml
# .aiwg/ralph/learning/code-hotspots.yaml

hotspots:
  - file: "src/auth/validate.ts"
    risk_score: 8.5  # 0-10 scale

    regression_history:
      - REG-0023: null_access_without_check
      - REG-0056: type_mismatch
      - REG-0112: missing_validation

    total_regressions: 3
    regressions_per_kloc: 2.1  # Per 1000 lines of code

    recent_changes:
      last_30_days: 8
      last_7_days: 2

    contributors: 3

    risk_factors:
      high_complexity: true
      frequent_changes: true
      multiple_regressions: true
      critical_path: true

    recommended_actions:
      - "Increase test coverage (current: 65%, target: 80%)"
      - "Add null checks at function entry"
      - "Refactor complex validation logic"
      - "Add integration tests"

    test_priority: critical  # Run tests for this file first
```

### Test Effectiveness Tracking

```yaml
# .aiwg/ralph/learning/test-effectiveness.yaml

test_effectiveness:
  - test_path: "test/auth/validate.test.ts"

    regression_detection_rate: 0.85  # 85% of regressions caught

    detected_regressions:
      - REG-0023
      - REG-0056
      - REG-0112

    missed_regressions:
      - REG-0089: "Escaped to production"

    false_positive_rate: 0.02  # 2% false alarms

    execution_stats:
      avg_duration_ms: 450
      success_rate: 0.98
      flakiness_score: 0.01  # Very stable

    priority_score: 9.2  # High value test

    recommendations:
      - "Add edge case: empty string input"
      - "Test concurrent validation requests"
```

## Regression Pattern Taxonomy

### Pattern Categories

| Category | Description | Detection | Fix Template | Effectiveness |
|----------|-------------|-----------|--------------|---------------|
| **null_undefined_access** | Accessing properties of null/undefined | `Cannot read property .* of null` | Add null check | 95% |
| **type_mismatch** | Type coercion or wrong type | `Expected .* but got .*` | Add type validation | 90% |
| **off_by_one** | Array bounds or loop conditions | `Index out of bounds` | Fix boundary conditions | 88% |
| **race_condition** | Timing-dependent failures | `Intermittent failures` | Add synchronization | 75% |
| **missing_validation** | Inputs not validated | `Validation error` | Add input checks | 92% |
| **logic_error** | Incorrect business logic | `Wrong behavior` | Fix logic | 85% |
| **resource_leak** | Resources not released | `Memory leak / handles` | Add cleanup | 80% |
| **api_misuse** | Incorrect API usage | `API error` | Fix API call | 90% |
| **configuration_error** | Wrong config values | `Config mismatch` | Update config | 95% |

## Test Prioritization Algorithm

```yaml
test_prioritization:
  algorithm: weighted_risk_score

  factors:
    code_change_correlation: 0.30      # How often this test catches changes
    historical_regression_detection: 0.25  # Past regression detection rate
    code_hotspot_coverage: 0.20        # Tests high-risk code
    recent_failure_trend: 0.15         # Recently failing pattern
    execution_efficiency: 0.10         # Fast tests preferred

  output:
    - test_priority: critical | high | medium | low
    - execution_order: [test1, test2, ...]
    - skip_recommendations: [low-value tests]
    - expand_coverage: [high-risk areas]
```

### Example Prioritization

```yaml
# After code change to src/auth/validate.ts

prioritized_tests:
  critical:  # Run first
    - test/auth/validate.test.ts
    - test/integration/auth-flow.test.ts
    reason: "High regression detection rate for this file"

  high:  # Run next
    - test/api/login.test.ts
    - test/api/register.test.ts
    reason: "Depends on auth module"

  medium:  # Run if time allows
    - test/unit/utils.test.ts
    reason: "Low correlation with auth changes"

  low:  # Skip in fast-feedback mode
    - test/ui/theme.test.ts
    reason: "No historical correlation"

  skip_in_fast_mode:
    - test/e2e/full-flow.test.ts
    reason: "Slow (5 min), low failure rate for auth changes"
```

## Predictive Regression Analysis

### Risk Prediction

```yaml
# On code change: src/payments/process.ts

regression_prediction:
  file: "src/payments/process.ts"
  change_type: modification
  lines_changed: 45

  risk_analysis:
    overall_risk: HIGH  # critical | high | medium | low
    confidence: 0.82

    risk_factors:
      - factor: "Known hotspot (REG-0034, REG-0067)"
        weight: 0.35
      - factor: "Large change (45 lines)"
        weight: 0.25
      - factor: "Critical payment logic"
        weight: 0.20
      - factor: "Recent regression (REG-0103, 5 days ago)"
        weight: 0.20

    similar_past_changes:
      - commit: "abc123"
        changes: 38 lines
        result: "Regression REG-0067"
        time_to_detect: 2 hours

      - commit: "def456"
        changes: 52 lines
        result: "Clean - no regressions"

    recommendations:
      - "Run full payment test suite (priority: critical)"
      - "Add integration tests for new code paths"
      - "Manual QA recommended before deploy"
      - "Consider pair review with payments expert"
      - "Check for null handling (pattern RP-001)"

    suggested_tests:
      - test/payments/process.test.ts
      - test/integration/payment-flow.test.ts
      - test/regression/REG-0067-refund-handling.test.ts
```

## Integration with Ralph

### Debug Memory Integration

```yaml
# Ralph uses this skill to improve across iterations

ralph_integration:
  on_test_failure:
    - query_similar_past_failures
    - retrieve_fix_templates
    - apply_learned_patterns
    - update_pattern_effectiveness

  on_test_success:
    - record_successful_fix
    - increment_fix_effectiveness
    - update_confidence_scores

  on_regression_detected:
    - create_regression_record: REG-XXXX
    - analyze_root_cause
    - store_in_learning_memory
    - update_hotspot_scores
    - adjust_test_priorities

  cross_iteration_learning:
    enabled: true
    memory_path: .aiwg/ralph/learning/
    retention_days: 365
    share_across_projects: true  # Learn from all projects
```

### Learning Storage Structure

```
.aiwg/ralph/learning/
├── regression-patterns.yaml       # Pattern taxonomy
├── code-hotspots.yaml            # Risk scoring
├── test-effectiveness.yaml       # Test value metrics
├── fix-templates/                # Reusable fix patterns
│   ├── null-check.template
│   ├── type-validation.template
│   └── error-handling.template
├── prediction-models/            # ML models (if applicable)
│   └── risk-predictor.json
└── analytics/
    ├── pattern-trends.json       # Pattern frequency over time
    └── effectiveness-metrics.json # Fix success rates
```

## Usage Examples

### Analyze Regression Patterns

```
User: "Analyze regression patterns"

Skill executes:
1. Load all REG-XXXX records from .aiwg/testing/regressions/
2. Group by root cause category
3. Identify recurring patterns
4. Build pattern taxonomy
5. Generate recommendations

Output:
"Regression Pattern Analysis

Total Regressions: 47 (last 90 days)

Top Patterns:
1. null_undefined_access (12 occurrences, 25.5%)
   - Files: validate.ts, users.ts, process.ts
   - Fix template success rate: 95%
   - Avg time to fix: 1.5 hours

2. missing_validation (8 occurrences, 17.0%)
   - Files: api/*.ts
   - Fix template success rate: 92%
   - Avg time to fix: 2.0 hours

3. type_mismatch (6 occurrences, 12.8%)
   - Files: converters/*.ts
   - Fix template success rate: 90%
   - Avg time to fix: 1.0 hours

Code Hotspots:
- src/auth/validate.ts: 8.5 risk score (3 regressions)
- src/api/users.ts: 7.2 risk score (2 regressions)
- src/payments/process.ts: 8.0 risk score (2 regressions)

Recommendations:
- Increase test coverage in auth module (current: 65%)
- Add null checks at function boundaries
- Implement stricter TypeScript settings
- Refactor validate.ts (high complexity)

See full report: .aiwg/ralph/learning/pattern-analysis.md"
```

### Prioritize Tests for Change

```
User: "What tests should I run after changing src/auth/validate.ts?"

Skill analyzes:
"Test Prioritization for src/auth/validate.ts

Based on learning history:

Critical Priority (run first):
✓ test/auth/validate.test.ts
  - Regression detection rate: 85%
  - Detected: REG-0023, REG-0056, REG-0112
  - Duration: 450ms

✓ test/integration/auth-flow.test.ts
  - Regression detection rate: 75%
  - Detected: REG-0089
  - Duration: 2.1s

High Priority:
- test/api/login.test.ts
- test/api/register.test.ts

Recommended Additions:
- Add test for null input handling (pattern RP-001)
- Add test for concurrent requests (gap identified)

Skip in Fast Mode:
- test/ui/theme.test.ts (no correlation)
- test/e2e/full-flow.test.ts (5 min, low value for this change)

Estimated total time:
- Critical tests: 2.6s
- + High priority: 5.2s
- Full suite: 45s"
```

### Predict Regression Risk

```
User: "Predict regression risk for my changes"

Skill analyzes current diff:
"Regression Risk Prediction

Files Changed:
- src/payments/process.ts (+45 lines)
- src/payments/refund.ts (+12 lines)

Risk Assessment: HIGH (confidence: 82%)

Risk Factors:
1. Known hotspot (8.0 risk score)
   - Previous: REG-0034, REG-0067, REG-0103
2. Large change (45 lines in critical module)
3. Recent regression (REG-0103, 5 days ago)
4. Pattern match: Similar to commit abc123 → REG-0067

Predicted Failure Points:
- Null handling in refund flow (pattern RP-001)
- Type validation for amounts (pattern RP-005)
- Error handling for API timeouts (pattern RP-012)

Recommendations:
✓ Run full payment test suite (20 tests, 8.5s)
✓ Add integration test for refund edge cases
✓ Manual QA for payment flows
✓ Consider pair review with @payments-expert

Apply fix templates:
- null-check.template for refund object
- error-handling.template for API calls

Proceed with caution. Consider creating feature branch
for additional testing."
```

### Find Similar Past Failures

```
User: "Similar past failures for this error?"

Current error: "TypeError: Cannot read property 'amount' of undefined"

Skill searches learning memory:
"Similar Past Failures Found

Pattern: null_undefined_access (RP-001)
Occurrences: 12 total

Most Similar:
1. REG-0023: "Cannot read property 'length' of null"
   - File: src/auth/validate.ts
   - Fix: Added null check at function entry
   - Time to fix: 1.2 hours
   - Code:
     ```typescript
     if (!input) {
       throw new Error('Input is null or undefined');
     }
     ```

2. REG-0067: "Cannot read property 'total' of undefined"
   - File: src/payments/process.ts
   - Fix: Added null guard with default value
   - Time to fix: 0.8 hours
   - Code:
     ```typescript
     const total = transaction?.total ?? 0;
     ```

3. REG-0091: "Cannot read property 'id' of null"
   - File: src/api/users.ts
   - Fix: Early return for null case
   - Time to fix: 0.5 hours

Fix Template (95% success rate):
```typescript
// Pattern: obj.property causing error
// Fix: Add null/undefined check

if (!obj) {
  throw new Error('Object is required');
}
// OR
if (!obj) return defaultValue;
// OR
const value = obj?.property ?? defaultValue;
```

Apply this fix? [y/N]"
```

## Cross-Project Learning

### Shared Learning Pool

```yaml
# Enable learning across multiple projects

cross_project_learning:
  enabled: true

  shared_memory:
    location: ~/.aiwg/global-learning/

    shared_patterns:
      - null_undefined_access
      - type_mismatch
      - missing_validation
      - off_by_one
      - race_condition

    project_contributions:
      - project: "ai-writing-guide"
        patterns_contributed: 12
        patterns_consumed: 8

      - project: "payment-gateway"
        patterns_contributed: 15
        patterns_consumed: 12

  privacy:
    anonymize_file_paths: true
    anonymize_business_logic: true
    share_only_patterns: true  # Not sensitive code
```

## Agent Orchestration

```yaml
agents:
  pattern_analysis:
    agent: test-architect
    focus: Identify and categorize regression patterns

  risk_prediction:
    agent: reliability-engineer
    focus: Predict regression likelihood

  test_prioritization:
    agent: test-engineer
    focus: Optimize test execution order

  fix_suggestion:
    agent: software-implementer
    focus: Apply learned fix templates
```

## Configuration

```yaml
# .aiwg/config/regression-learning.yaml

regression_learning:
  enabled: true

  learning_sources:
    - .aiwg/testing/regressions/  # REG-XXXX records
    - .aiwg/ralph/debug-memory/   # Execution history
    - .aiwg/ralph/learning/       # Accumulated patterns

  pattern_detection:
    min_occurrences: 2  # Minimum to consider a pattern
    confidence_threshold: 0.70

  test_prioritization:
    enabled: true
    algorithm: weighted_risk_score

  risk_prediction:
    enabled: true
    confidence_threshold: 0.75

  cross_project_learning:
    enabled: false  # Privacy consideration

  retention:
    regression_records: 365 days
    pattern_library: forever
    effectiveness_metrics: 180 days
```

## Metrics

Track learning effectiveness:

| Metric | Target | Purpose |
|--------|--------|---------|
| pattern_accuracy | >85% | Pattern matching correct |
| fix_template_success_rate | >90% | Fixes work first time |
| prediction_accuracy | >75% | Risk predictions correct |
| test_prioritization_efficiency | >50% | Time saved by prioritization |
| false_positive_rate | <10% | Spurious alerts |
| cross_project_reuse | >30% | Patterns used across projects |

## Output Locations

- Learning memory: `.aiwg/ralph/learning/`
- Pattern analysis reports: `.aiwg/ralph/learning/analytics/`
- Fix templates: `.aiwg/ralph/learning/fix-templates/`
- Global learning: `~/.aiwg/global-learning/` (if enabled)

## References

- @agentic/code/addons/ralph/schemas/debug-memory.yaml - Debug memory structure
- @agentic/code/frameworks/sdlc-complete/schemas/testing/regression.yaml - Regression schema
- @.claude/rules/executable-feedback.md - Feedback loop patterns
- @.aiwg/research/findings/REF-013-metagpt.md - MetaGPT executable feedback
- @.aiwg/research/findings/REF-015-self-refine.md - Self-Refine learning patterns
- @agentic/code/frameworks/sdlc-complete/skills/regression-baseline/SKILL.md - Baseline management
- @agentic/code/frameworks/sdlc-complete/skills/regression-bisect/SKILL.md - Root cause analysis
- @agentic/code/frameworks/sdlc-complete/skills/regression-metrics/SKILL.md - Metrics tracking
