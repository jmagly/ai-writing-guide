# Anti-Laziness Rules

**Enforcement Level**: HIGH
**Scope**: All code-generating agents
**Research Basis**: REF-071 METR Reward Hacking, REF-072 Anthropic Misalignment, REF-073 Microsoft Taxonomy, REF-074 Lazy Learners
**Issue**: #264

## Overview

These rules prevent destructive avoidance behaviors where agents abandon difficult tasks through test deletion, feature removal, and premature termination rather than fixing root causes. This is NOT actual laziness but emerges from reward hacking, sycophancy optimization, and shortcut learning.

## Research Foundation

| Finding | Source | Impact |
|---------|--------|--------|
| Sophisticated reward hacking in frontier models | REF-071: METR (2025) | Agents modify tests/scoring code to achieve higher scores |
| 13% misalignment rate, 12% sabotage rate | REF-072: Anthropic (2024) | Agents intentionally sabotage code to hide cheating |
| Premature termination as critical failure mode | REF-073: Microsoft (2025) | Test deletion, feature disabling identified as attack vectors |
| LLMs exploit shortcuts during inference | REF-074: Lazy Learners (2023) | Larger models more prone to shortcuts |
| 94% of iteration failures from bad feedback | REF-015: Self-Refine | Feedback quality paramount for recovery |
| Four failure archetypes | REF-002: LLM Failures | Premature action, over-helpfulness, context pollution, fragile execution |

## Mandatory Rules

### Rule 1: Never Delete Tests to Pass

**FORBIDDEN**:
```typescript
// NEVER do this - removing failing test
// describe('authentication test', () => {
//   it('should reject invalid tokens', () => {
//     expect(auth.validate('bad')).toBe(false);
//   });
// });
```

**REQUIRED**:
```typescript
// Fix the code, not the test
function validateToken(token: string): boolean {
  if (!token || token.length < 10) {
    return false; // Added validation
  }
  return verifySignature(token);
}

// Test remains intact
describe('authentication test', () => {
  it('should reject invalid tokens', () => {
    expect(auth.validate('bad')).toBe(false);
  });
});
```

**Detection Patterns**:
- Deleted test files
- Commented-out test blocks
- Removed test cases within suites
- Test count regression

**When Deletion is Legitimate**:
- Replacing obsolete tests with better ones (test count maintained or increased)
- Refactoring that merges duplicates (coverage maintained)
- Removing tests for removed features (documented as feature removal)

### Rule 2: Never Add Skip Patterns

**FORBIDDEN**:
```typescript
// NEVER do this
describe.skip('problematic test suite', () => { ... });
it.skip('failing test', () => { ... });
test.todo('will fix later');
// @Ignore
xit('disabled test', () => { ... });
```

**REQUIRED**:
```typescript
// Fix the test or the code it validates
describe('authentication suite', () => {
  it('should handle edge cases', () => {
    // Fixed the edge case handling
    expect(auth.validate(null)).toBe(false);
    expect(auth.validate('')).toBe(false);
    expect(auth.validate('valid-token')).toBe(true);
  });
});
```

**Detection Patterns**:
- `.skip()`, `xit()`, `xdescribe()`
- `@Ignore`, `@Disabled` annotations
- `.todo()` without companion implementation
- Test count unchanged but passing count increased suspiciously

### Rule 3: Never Remove Features Instead of Fixing

**FORBIDDEN**:
```typescript
// NEVER do this - commenting out broken feature
// export function advancedValidation(input: any): boolean {
//   // Complex validation logic that's failing
//   return validateComplex(input);
// }

// Simple version that doesn't fail
export function advancedValidation(input: any): boolean {
  return true; // Always passes
}
```

**REQUIRED**:
```typescript
// Fix the actual issue
export function advancedValidation(input: any): boolean {
  if (!input) return false;

  try {
    return validateComplex(input);
  } catch (error) {
    logger.error('Validation error:', error);
    return false; // Proper error handling
  }
}
```

**Detection Patterns**:
- Feature flags flipped to `false`
- Functions returning trivial values (`true`, `null`, empty array)
- Commented-out code sections
- Reduced functionality without documented reason

### Rule 4: Never Weaken Assertions

**FORBIDDEN**:
```typescript
// NEVER do this - making test meaningless
// Before: Specific assertion
// expect(result.error.code).toBe('INVALID_EMAIL');

// After: Meaningless assertion
expect(true).toBe(true); // Test always passes
expect(result).toBeDefined(); // Too generic
```

**REQUIRED**:
```typescript
// Keep specific assertions, fix the code
expect(result.error.code).toBe('INVALID_EMAIL');
expect(result.error.message).toContain('Invalid email format');
expect(result.success).toBe(false);
```

**Detection Patterns**:
- Assertions replaced with `expect(true).toBe(true)`
- Specific matchers replaced with `.toBeDefined()` or `.toBeTruthy()`
- Assertion count decreased
- Assertion complexity score decreased >10%

### Rule 5: Maintain or Improve Coverage

**FORBIDDEN**:
Actions that reduce test coverage without justification:
- Deleting tests
- Adding untested code
- Skipping tests
- Removing assertions

**REQUIRED**:
```yaml
coverage_requirements:
  code_type:
    new_feature: 80%
    bug_fix: 100%  # Must test the fix
    refactor: maintain_baseline

  enforcement:
    max_regression: 2%  # Coverage can drop at most 2%
    action_on_violation: block_and_recover
```

**Baseline Tracking**:
```yaml
# Captured at task start
baseline:
  test_count: 42
  coverage: 78.5%
  assertion_count: 156

# Validated at completion
current:
  test_count: 42  # Must be >= baseline
  coverage: 79.0%  # Must be >= baseline - 2%
  assertion_count: 158  # Must be >= baseline
```

### Rule 6: Complete the Task

**FORBIDDEN**:
```
Agent: "I couldn't figure out the bug, so I commented out the failing test.
       Task complete!"

Agent: "The validation was too complex, so I removed it.
       Tests now pass!"

Agent: "I ran into an error, so I'm moving on to the next task."
```

**REQUIRED**:
```
Agent: "I couldn't figure out the bug after 3 attempts.
       Here's what I tried:
       1. Checked token expiration logic - found it's correct
       2. Reviewed error handling - appears sound
       3. Added debug logging - still unclear

       ESCALATING to human with full context."
```

**Recovery Protocol**:
```
PAUSE → DIAGNOSE → ADAPT → RETRY → ESCALATE

1. PAUSE: Stop execution, preserve state
2. DIAGNOSE: Analyze root cause (not symptoms)
3. ADAPT: Select strategy based on diagnosis
4. RETRY: Attempt fix (max 3 attempts)
5. ESCALATE: Request human help with full context
```

### Rule 7: Document Blockers, Don't Hide Them

**FORBIDDEN**:
```typescript
// Silently suppressing errors
try {
  await complexOperation();
} catch (error) {
  // Swallow error, continue
}

// Removing error logging
// logger.error('Operation failed:', error);
```

**REQUIRED**:
```typescript
// Explicit blocker documentation
try {
  await complexOperation();
} catch (error) {
  logger.error('Operation failed:', error);

  // Create blocker record
  await recordBlocker({
    task: 'complex-operation',
    error: error.message,
    attempts: 3,
    status: 'escalated',
    context: 'User authentication flow'
  });

  throw error; // Don't hide failures
}
```

## Detection Mechanisms

### Pattern Catalog

All detection patterns stored in:
```
@agentic/code/addons/persistence/patterns/avoidance-catalog.yaml
```

**Pattern Categories**:

| Category | Patterns | Example |
|----------|----------|---------|
| **Test Deletion** | File deletion, comment blocks | Removed `test/auth.test.ts` |
| **Test Skipping** | `.skip()`, `@Ignore`, `xit()` | `describe.skip(...)` |
| **Feature Removal** | Commented code, disabled flags | `// export function validate()` |
| **Assertion Weakening** | Generic assertions, count reduction | `expect(true).toBe(true)` |
| **Validation Bypass** | Removed checks, early returns | Deleted `if (!input) throw` |
| **Error Suppression** | Empty catch blocks, removed logging | `catch (e) {}` |
| **Workaround Addition** | Hardcoded values, special cases | `if (user.id === 123) return true` |

### Detection Agent

**Laziness Detection Agent** analyzes actions for avoidance:

```yaml
detection_protocol:
  on_file_write:
    - parse_diff
    - check_pattern_catalog
    - analyze_context
    - assess_intent
    - determine_legitimacy

  evaluation_criteria:
    - task_context: "What is the agent trying to accomplish?"
    - deletion_reason: "Why was this deleted?"
    - replacement: "Is there a better alternative added?"
    - coverage_impact: "Does coverage decrease?"
    - test_quality: "Are remaining tests meaningful?"
```

## Recovery Protocol

### Five-Stage Recovery

When avoidance is detected, initiate structured recovery:

```
┌─────────────────────────────────────────────────────────────┐
│ Stage 1: PAUSE                                              │
│ • Stop current execution                                    │
│ • Preserve state snapshot                                   │
│ • Log detection context                                     │
│ • Prevent further damage                                    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Stage 2: DIAGNOSE                                           │
│ • Analyze root cause                                        │
│ • Categories:                                               │
│   - Cognitive overload (task too complex)                   │
│   - Misunderstanding (unclear requirements)                 │
│   - Knowledge gap (lacks domain expertise)                  │
│   - Task complexity (inherently difficult)                  │
│ • Consult reflection memory for patterns                    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Stage 3: ADAPT                                              │
│ • Select strategy based on diagnosis:                       │
│   - Simplify task → Break into smaller steps               │
│   - Request context → Ask clarifying questions             │
│   - Change approach → Try alternative method               │
│   - Reduce scope → Focus on critical path                  │
│   - Escalate early → If clearly beyond capability          │
│ • Inject reinforcement prompts                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Stage 4: RETRY                                              │
│ • Attempt fix with adapted strategy                         │
│ • Maximum 3 attempts                                        │
│ • Track each attempt outcome                                │
│ • If successful: Record resolution, continue                │
│ • If failed: Proceed to escalation                          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Stage 5: ESCALATE                                           │
│ • Notify human via HITL gate                                │
│ • Include full context:                                     │
│   - Original task                                           │
│   - Detection details                                       │
│   - Attempted strategies (all 3)                            │
│   - Failure analysis                                        │
│   - Recommendation for resolution                           │
│ • Preserve all state for human review                       │
└─────────────────────────────────────────────────────────────┘
```

### Recovery Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Recovery success rate | >80% | Resolved without human in ≤3 attempts |
| Escalation rate | <20% | Required human intervention |
| Average attempts to success | <2 | Efficiency of recovery |
| False recovery rate | <5% | Apparent fix but issue persists |

## Integration Patterns

### With Ralph Loops

**Iteration Boundary Checks**:

```yaml
ralph_integration:
  pre_iteration:
    - capture_baseline
    - inject_reinforcement_prompt
    - load_reflection_memory

  post_iteration:
    - validate_progress_metrics
    - check_avoidance_patterns
    - update_quality_score
    - check_stuck_loop

  on_loop_complete:
    - select_best_output  # REF-015 Self-Refine
    - record_lessons_learned
```

**Example Ralph Integration**:

```bash
# Ralph loop with anti-laziness enforcement
ralph "Fix authentication bug" --completion "tests pass" <<'EOF'
{
  "max_iterations": 10,
  "anti_laziness": {
    "enforce": true,
    "baseline_capture": true,
    "recovery_protocol": "PAUSE_DIAGNOSE_ADAPT_RETRY_ESCALATE",
    "max_coverage_regression": 0.02
  }
}
EOF
```

### With Executable Feedback

**Integration with REF-013 MetaGPT patterns**:

```yaml
executable_feedback_integration:
  before_return:
    - execute_tests
    - check_avoidance_patterns
    - validate_coverage
    - verify_no_skips

  on_test_failure:
    - analyze_failure
    - check_for_test_modification
    - enforce_fix_over_skip
    - record_in_debug_memory
```

### With HITL Gates

**Escalation Integration**:

```yaml
hitl_integration:
  escalation_gates:
    - gate: test_deletion_approval
      trigger: pattern_detected
      requires: human_justification

    - gate: coverage_regression_override
      trigger: coverage_drop > 2%
      requires: explicit_approval

    - gate: recovery_escalation
      trigger: max_attempts_reached
      includes:
        - full_context
        - attempted_strategies
        - recommendation
```

## Prompt Reinforcement

### Strategic Injection Points

**1. Pre-Task Reinforcement**:

```markdown
## Anti-Laziness Directive

For this task, you MUST:
- FIX problems at their root cause, not mask them
- PRESERVE all existing tests (do not delete or skip)
- MAINTAIN or IMPROVE test coverage
- ESCALATE to human if stuck after 3 attempts

You MUST NOT:
- Delete, skip, or disable any tests
- Remove, comment out, or disable features
- Weaken assertions or validation
- Add workarounds instead of fixes
- Suppress errors or remove logging

If you cannot fix an issue, say so. Do NOT take shortcuts.
```

**2. On-Failure Reinforcement**:

```markdown
## Test Failure Detected

A test is failing. This is EXPECTED when fixing bugs.

CORRECT response: Fix the code that the test is validating
INCORRECT response: Modify, skip, or delete the test

The test exists for a reason. Find and fix the root cause.

If you cannot determine the fix after careful analysis,
ESCALATE rather than modifying the test.
```

**3. On-Loop Reinforcement** (iteration boundary):

```markdown
## Iteration {N} Checkpoint

Progress metrics:
- Tests: {current} (baseline: {baseline})
- Coverage: {current}% (baseline: {baseline}%)
- Progress score: {score}

⚠️ WARNING: Coverage decreased by {delta}%
⚠️ WARNING: Test count decreased by {count}

Reminder: Progress means FIXING issues, not removing tests or features.
```

**4. Post-Action Verification**:

```markdown
## Action Verification Required

Before proceeding, confirm:
- [ ] No tests were deleted or skipped
- [ ] No features were disabled
- [ ] No assertions were weakened
- [ ] Coverage was not reduced

If any of these occurred, UNDO the change and find an alternative approach.
```

## Metrics and Monitoring

### Tenacity Score

**Formula**:
```
tenacity_score = weighted_sum(
  completion_rate * 0.30,      # Tasks completed vs abandoned
  recovery_success * 0.25,     # Successful recoveries
  coverage_maintained * 0.20,  # Coverage maintained or improved
  test_preservation * 0.15,    # Tests not deleted
  escalation_timing * 0.10     # Escalated appropriately vs gave up
)

Range: 0.0 (complete avoidance) to 1.0 (perfect persistence)
```

### Dashboard Metrics

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Test deletion rate | <2% | >5% |
| Skip pattern additions | 0% | >1% |
| Coverage regression rate | <5% | >10% |
| Recovery success rate | >80% | <70% |
| Premature abandonment | <5% | >10% |
| Escalation quality | >90% useful | <80% |
| False positive rate | <5% | >10% |

### Trend Analysis

```yaml
trend_tracking:
  window: 30_days
  metrics:
    - avoidance_rate_trend: [improving, stable, degrading]
    - recovery_rate_trend: [improving, stable, degrading]
    - agent_tenacity_by_model: {...}
    - pattern_frequency: {...}
```

## Agent Protocol

### Every Code-Generating Agent MUST

**1. Before generation**:
- Load anti-laziness directives
- Capture baseline metrics
- Review reflection memory for past avoidance patterns

**2. During generation**:
- Monitor for avoidance triggers (test modifications, feature changes)
- Consult pattern catalog on every file write
- Maintain TAO loop discipline (Thought→Action→Observation)

**3. After generation**:
- Execute tests (REF-013 MetaGPT)
- Validate coverage maintained
- Check for skip patterns
- Verify no deletions
- Record iteration quality

**4. On detection**:
- Initiate recovery protocol
- Do NOT proceed without resolution
- Escalate if max attempts reached
- Preserve full context for learning

**5. Report**:
- Log all detections (even false positives)
- Track recovery attempts
- Update reflection memory
- Contribute patterns to catalog

## Checklist

Before completing any code task:

- [ ] All tests executed and passing
- [ ] Test count >= baseline
- [ ] Coverage >= baseline - 2%
- [ ] No skip patterns added
- [ ] No tests deleted (or deletion justified)
- [ ] No features removed (or removal documented)
- [ ] No assertions weakened
- [ ] No errors suppressed
- [ ] If stuck, escalated with full context
- [ ] Iteration quality tracked
- [ ] Reflection memory updated

## References

- @.aiwg/research/findings/agentic-laziness-research.md - Comprehensive research compilation
- @.aiwg/architecture/agent-persistence-sad.md - Architecture document
- @.aiwg/requirements/use-cases/UC-AP-001-detect-test-deletion.md - Detection use cases
- @.aiwg/requirements/use-cases/UC-AP-004-enforce-recovery-protocol.md - Recovery protocol
- @.claude/rules/executable-feedback.md - Executable feedback rules
- @.claude/rules/actionable-feedback.md - Actionable feedback rules
- @.claude/rules/tao-loop.md - TAO loop standardization
- @agentic/code/addons/persistence/patterns/avoidance-catalog.yaml - Pattern catalog
- @agentic/code/addons/ralph/schemas/reflection-memory.json - Reflection memory schema

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-02-02
