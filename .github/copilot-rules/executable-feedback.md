# Executable Feedback Loop Rules

**Enforcement Level**: HIGH
**Scope**: All code-generating agents
**Research Basis**: REF-013 MetaGPT
**Issue**: #101

## Overview

These rules require all code-generating agents to execute tests before returning results, implementing MetaGPT's executable feedback pattern. Research shows +4.2% HumanEval improvement and -63% human revision cost.

## Research Foundation

| Finding | Impact |
|---------|--------|
| +4.2% HumanEval improvement | Execution feedback catches errors code review misses |
| -63% human revision cost (2.25 → 0.83) | Early execution prevents cascading failures |
| Debug memory pattern | Tracking execution history enables learning |

## Mandatory Rules

### Rule 1: Execute Before Return

**FORBIDDEN**:
```
Agent generates code → Returns to user
```

**REQUIRED**:
```
Agent generates code → Executes tests → Passes? → Returns to user
                                      → Fails? → Debug & retry
```

### Rule 2: Track Execution History

All code agents MUST maintain debug memory:

```yaml
debug_memory:
  executions:
    - attempt: 1
      timestamp: "2026-01-25T15:00:00Z"
      code_hash: "abc123"
      test_results:
        passed: 5
        failed: 2
        errors: 0
      failure_analysis:
        - test: "test_null_input"
          error: "TypeError: Cannot read property 'length' of null"
          root_cause: "Missing null check in validateInput()"
      fix_applied: "Added null check at line 42"
    - attempt: 2
      timestamp: "2026-01-25T15:01:00Z"
      code_hash: "def456"
      test_results:
        passed: 7
        failed: 0
        errors: 0
```

### Rule 3: Retry on Failure

When tests fail, agent MUST:

1. Analyze failure
2. Identify root cause
3. Apply fix
4. Re-execute tests
5. Repeat until pass OR max attempts

```yaml
retry_policy:
  max_attempts: 3
  backoff: none  # Immediate retry
  escalation_on_max: true
  escalation_action: human_review
```

### Rule 4: Failure Analysis is REQUIRED

**FORBIDDEN**:
```
Test failed → Retry with random changes
```

**REQUIRED**:
```yaml
failure_analysis:
  - test: "test_name"
    error_type: "TypeError"
    error_message: "Cannot read property 'x' of undefined"
    stack_trace_snippet: "at line 42 in function.ts"
    root_cause: "Variable 'user' is undefined when accessed"
    fix_strategy: "Add null check before accessing user.x"
```

### Rule 5: Test Coverage Requirements

Code agents MUST ensure minimum test coverage before returning:

| Code Type | Minimum Coverage | Required Tests |
|-----------|------------------|----------------|
| New function | 80% | Unit tests for happy path + edge cases |
| Bug fix | 100% of fix | Regression test for the bug |
| Refactor | Match original | Existing tests must pass |
| API endpoint | 90% | Integration + error cases |

### Rule 6: Debug Memory Persistence

Debug memory MUST persist across sessions:

```yaml
persistence:
  location: ".aiwg/ralph/debug-memory/"
  format: json
  retention: 30 days
  indexing:
    by_file: true
    by_error_type: true
    by_test: true
```

### Rule 7: Learning from History

Before generating code, agents SHOULD check debug memory:

```yaml
pre_generation:
  check_history: true
  lookback_window: 10  # Recent executions
  patterns_to_check:
    - similar_file_edits
    - same_test_failures
    - recurring_error_types
  apply_learnings: true
```

## Debug Memory Schema

```yaml
debug_memory:
  session_id: "session-uuid"
  file_path: "src/module/file.ts"

  executions:
    - attempt: 1
      timestamp: "ISO-8601"
      code_hash: "SHA-256"

      environment:
        node_version: "20.x"
        test_framework: "jest"

      test_results:
        total: 10
        passed: 8
        failed: 2
        errors: 0
        skipped: 0
        duration_ms: 1500

      failures:
        - test_name: "test description"
          test_file: "test/file.test.ts"
          error_type: "AssertionError"
          error_message: "Expected X but got Y"
          stack_trace: "..."

      analysis:
        root_cause: "Description of underlying issue"
        fix_strategy: "How to fix"
        confidence: 0.8

      fix_applied:
        description: "What was changed"
        diff_summary: "+5/-2 lines"

  learnings:
    patterns_identified:
      - pattern: "Null check missing"
        frequency: 3
        fix_template: "Add null check before access"

    recurring_failures:
      - test: "test_edge_case"
        occurrences: 2
        resolution: "pending"
```

## Integration Patterns

### With Test Engineer Agent

```yaml
test_engineer_protocol:
  on_code_generation:
    1. generate_tests:
        coverage_target: 80%
        include_edge_cases: true
    2. execute_tests:
        fail_fast: false
        verbose: true
    3. analyze_failures:
        depth: root_cause
        suggest_fixes: true
    4. iterate:
        max_attempts: 3
        track_in_debug_memory: true
```

### With Code Reviewer Agent

```yaml
code_reviewer_protocol:
  review_after_execution: true
  check_debug_memory: true
  flag_recurring_issues: true
  require_execution_proof: true
```

### With Ralph Loop

```yaml
ralph_integration:
  execution_gate:
    require_passing_tests: true
    allow_skip: false
  debug_memory:
    persist_per_iteration: true
    cross_iteration_learning: true
  progress_metric:
    include_test_pass_rate: true
```

## Execution Protocol

When a code agent generates code:

```
1. GENERATE code based on requirements

2. GENERATE tests if not present
   - Happy path tests
   - Edge case tests
   - Error handling tests

3. EXECUTE tests
   - Capture all output
   - Record in debug memory

4. IF tests pass:
   - Record success in debug memory
   - Return code to user

5. IF tests fail:
   a. ANALYZE failures
      - Parse error messages
      - Identify root cause
      - Check debug memory for patterns

   b. APPLY fix
      - Generate targeted fix
      - Update code

   c. INCREMENT attempt counter

   d. IF attempts < max_attempts:
      - GOTO step 3

   e. ELSE:
      - ESCALATE to human
      - Include debug memory context
```

## Escalation Protocol

When max attempts reached:

```yaml
escalation:
  include:
    - original_code
    - all_test_results
    - failure_analyses
    - fix_attempts
    - debug_memory_summary

  notification:
    channel: issue_comment
    template: |
      ## Execution Feedback Escalation

      **File**: {{file_path}}
      **Attempts**: {{attempt_count}} / {{max_attempts}}

      ### Failures
      {{failure_summary}}

      ### Analysis
      {{root_cause_analysis}}

      ### Attempted Fixes
      {{fix_attempts}}

      **Human review required**
```

## Metrics

Track these metrics for continuous improvement:

| Metric | Target | Purpose |
|--------|--------|---------|
| First-attempt pass rate | >70% | Code generation quality |
| Average attempts to pass | <2 | Iteration efficiency |
| Escalation rate | <10% | Self-sufficiency |
| Debug memory reuse | >30% | Learning effectiveness |

## Checklist

Before returning code:

- [ ] Tests generated for new code
- [ ] Tests executed (not skipped)
- [ ] All tests passing
- [ ] Debug memory updated
- [ ] Failures analyzed (if any occurred)
- [ ] Coverage meets minimum
- [ ] Learnings recorded

## References

- @.aiwg/research/findings/REF-013-metagpt.md - Research paper
- @agentic/code/addons/ralph/schemas/debug-memory.yaml - Debug memory schema
- @agentic/code/frameworks/sdlc-complete/agents/test-engineer.md - Test Engineer agent
- #101 - Implementation issue

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-01-25
