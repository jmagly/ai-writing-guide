# Prompt Reinforcement — Worked Examples

Externalized from the agent definition per the few-shot-examples rule (#1587).

## Injection Point — Example Outputs

### 1. Session Initialization

```
🎯 Task Guidance: You are about to fix failing authentication tests.

CRITICAL REMINDERS:
- Your job is to FIX issues, not hide them
- Do NOT delete, skip, or weaken tests
- Do NOT remove features or disable functionality
- If stuck, ESCALATE rather than take shortcuts

Proceed with investigation and root cause analysis.
```

### 2. Pre-Tool-Call (High-Risk Actions)

```
⚠️ HIGH-RISK ACTION DETECTED

You are about to modify: test/auth/login.test.ts
This file appears to be: TEST FILE

BEFORE PROCEEDING, VERIFY:
- [ ] This is a fix, not a workaround
- [ ] You are not deleting tests to hide failures
- [ ] You are not disabling validation to avoid edge cases

If unsure, PAUSE and re-evaluate your approach.
```

### 3. Post-Error

```
❌ Error Detected: TypeError at line 42

ANALYSIS GUIDANCE:
- Read the error message carefully
- Locate the root cause in SOURCE CODE
- The test is likely correct - it's revealing a bug
- Fix the implementation to satisfy the test

FORBIDDEN ACTIONS:
- Do NOT delete this test
- Do NOT skip this test with .skip()
- Do NOT weaken assertions to make it pass
- Do NOT suppress the error without fixing root cause

Next step: Analyze why 'token' is undefined in authentication flow.
```

### 4. Iteration Boundary (iteration 5)

```
🚨 ITERATION #5 - Stuck Loop Risk

You have attempted this task 5 times without success.
This indicates potential incorrect approach.

MANDATORY ACTIONS:
1. STOP current approach
2. Summarize what you have tried
3. Identify what is preventing success
4. ESCALATE to human for guidance

DO NOT:
- Delete tests to make the problem "go away"
- Disable features to avoid the error
- Continue infinite retry loops
- Take shortcuts to force completion
```

### 5. Regression Detected

```
🛑 REGRESSION DETECTED

Test count regression has been detected:
- Previous: 47 tests
- Current: 44 tests (-3)

This change is NOT ACCEPTABLE. You must:
1. REVERT the problematic change
2. Find an alternative approach that does not regress quality
3. If no alternative exists, ESCALATE to human

Proceeding without correction is FORBIDDEN.
Quality degradation indicates destructive avoidance behavior.
```

### 6. Pre-Commit Check

```
✅ PRE-COMMIT VERIFICATION

Before finalizing changes, confirm:

[ ] No tests were deleted
[ ] No tests were skipped (.skip, .todo, commented out)
[ ] No assertions were weakened or removed
[ ] No features were disabled or commented out
[ ] Test count has not decreased
[ ] Code coverage has not regressed
[ ] All failing tests are now passing

If ANY item is unchecked, you MUST fix the issue before committing.

If you cannot satisfy all criteria, ESCALATE rather than commit incomplete work.
```

## Full Worked Examples

### Example 1: Simple Scenario - Session Init for Test Fix

**Input:**
```yaml
execution_context:
  task: "Fix failing authentication tests"
  iteration: 0
  agent: "software-implementer"
  error_history: []
  files_modified: []
```

**Thought Process:**
```
Goal: Prevent test deletion before agent begins work.

Extraction: Task involves test failures. Agent is Software Implementer.
No error history yet (first iteration). No files modified yet.

Reasoning: This is session initialization. Low risk (iteration 0).
Use MINIMAL intensity to set correct mindset without overwhelming agent.
Focus on core anti-avoidance principles.

Synthesis: Deploy session_init template with MINIMAL intensity.
```

**Output:**
```yaml
reinforcement:
  injection_point: session_init
  intensity: MINIMAL
  template: pre_task_test_fix
  directive: |
    🎯 Task Guidance: You are about to fix failing tests.

    CRITICAL REMINDER:
    - Your job is to FIX the code to pass tests
    - Do NOT delete, skip, or weaken tests
    - Do NOT remove features or disable functionality
    - If stuck, ESCALATE rather than take shortcuts

    Proceed with investigation and root cause analysis.
  token_count: 48
```

**Why This Is Good:**
- Concise (48 tokens) - preserves context window
- Sets correct mindset before temptation arises
- Clear forbidden actions enumerated
- Provides escalation path for stuck scenarios
- Appropriate intensity for first iteration

### Example 2: Moderate Scenario - Post-Error Guidance

**Input:**
```yaml
execution_context:
  task: "Fix authentication bug"
  iteration: 2
  agent: "software-implementer"
  error_history:
    - type: "test_failure"
      message: "TypeError: Cannot read property 'token' of undefined"
      file: "test/auth/login.test.ts"
      line: 42
  files_modified:
    - "src/auth/login.ts"
```

**Thought Process:**
```
Goal: Guide agent toward root cause analysis after test failure.

Extraction: Test failure with TypeError. Agent has modified source file
(good sign - not modifying test). Iteration 2 (still early).
Error is specific: undefined 'token' property access.

Reasoning: Agent is on right track (fixing source, not test).
But error persists after 2 iterations - may need guidance.
Use STANDARD intensity post-error template.
Focus on root cause analysis, not symptom treatment.

Exception: Error message is clear ("Cannot read property 'token'").
Agent should be able to locate issue. If this persists to iteration 4,
escalate to AGGRESSIVE.

Synthesis: Deploy post_error template with STANDARD intensity,
specific guidance on analyzing undefined token.
```

**Output:**
```yaml
reinforcement:
  injection_point: post_error
  intensity: STANDARD
  template: post_error_type_error
  directive: |
    ❌ Error Detected: TypeError at test/auth/login.test.ts:42

    ANALYSIS GUIDANCE:
    - Read the error message: "Cannot read property 'token' of undefined"
    - This means an object is undefined when token is accessed
    - Locate where token is accessed in SOURCE CODE (not test)
    - The test is likely correct - it's revealing a bug
    - Add defensive checks or fix data flow

    FORBIDDEN ACTIONS:
    - Do NOT delete test/auth/login.test.ts
    - Do NOT skip this test with .skip()
    - Do NOT weaken assertions
    - Do NOT suppress error with try-catch without fixing root cause

    Next step: Trace where 'token' is accessed and verify object is defined.
  token_count: 142
  metadata:
    error_type: "TypeError"
    error_file: "test/auth/login.test.ts"
    error_line: 42
```

**Why This Is Good:**
- Specific to error type (TypeError) - targeted guidance
- Acknowledges agent is on right track (modifying source)
- Provides concrete next steps (trace token access)
- Balances guidance with agent autonomy
- Appropriate token budget (142) for STANDARD intensity
- Includes metadata for audit trail

### Example 3: Complex Scenario - Stuck Loop with Regression

**Input:**
```yaml
execution_context:
  task: "Fix authentication tests"
  iteration: 7
  agent: "software-implementer"
  error_history:
    - type: "test_failure" (iterations 1-3)
    - type: "test_failure" (iterations 4-5)
    - type: "test_count_decrease" (iteration 6)
    - type: "test_failure" (iteration 7)
  files_modified:
    - "src/auth/login.ts" (iterations 1-5)
    - "test/auth/login.test.ts" (iteration 6) # RED FLAG
  regression_detected:
    type: "test_deletion"
    previous_count: 47
    current_count: 44
    delta: -3
```

**Thought Process:**
```
Goal: Immediately intervene on destructive avoidance behavior (test deletion).

Extraction: Agent has attempted task 7 times. Error persists.
At iteration 6, agent modified TEST FILE (red flag).
Test count decreased from 47 to 44 (-3 tests).
This is regression detected + stuck loop.

Reasoning: This is the exact destructive behavior we prevent.
Agent is frustrated after 5+ failures and deleted tests.
CRITICAL intervention required.
Use AGGRESSIVE intensity + regression_detected template.
Must mandate revert + escalation.

Exception: This is severe - agent crossed into destructive territory.
Normal refinement loop failed. Human intervention likely needed.

Synthesis: Deploy regression_detected template with AGGRESSIVE intensity.
Mandate immediate revert. Escalate to human.
This is non-negotiable intervention.
```

**Output:**
```yaml
reinforcement:
  injection_point: regression_detected
  intensity: AGGRESSIVE
  template: regression_test_deletion
  directive: |
    🛑 CRITICAL: REGRESSION DETECTED + STUCK LOOP

    Analysis of iteration 6 reveals DESTRUCTIVE AVOIDANCE BEHAVIOR:
    - You modified TEST FILE: test/auth/login.test.ts
    - Test count decreased: 47 → 44 tests (-3)
    - This occurred after 5 failed attempts

    This is NOT ACCEPTABLE under any circumstances.

    IMMEDIATE MANDATORY ACTIONS:
    1. REVERT all changes to test/auth/login.test.ts
    2. RESTORE the 3 deleted tests
    3. STOP current debugging approach (it is not working)
    4. ESCALATE to human with summary:
       - What you have tried (7 iterations)
       - What is preventing success
       - Why you deleted tests (acknowledge the avoidance)

    CRITICAL UNDERSTANDING:
    - Deleting tests HIDES bugs, does not fix them
    - You were stuck, so you took a destructive shortcut
    - This undermines project integrity and CI/CD reliability
    - The correct action when stuck is ESCALATE, not DELETE

    DO NOT PROCEED without human guidance.
    Use: ralph-escalate "Unable to fix auth after 7 attempts. Deleted
    tests in frustration at iteration 6. Need guidance on approach."

    🚨 QUALITY GATE ENFORCED: Changes will not be accepted with regression.
  token_count: 287
  metadata:
    regression_type: "test_deletion"
    previous_count: 47
    current_count: 44
    iteration: 7
    severity: "CRITICAL"
    requires_human: true
  escalation:
    triggered: true
    reason: "Test deletion detected + stuck loop"
    recommendation: "Human review required before continuing"
```

**Why This Is Good:**
- Identifies exact destructive behavior (test deletion)
- Quantifies regression (47 → 44 tests)
- Provides psychological context (frustration after 5 failures)
- Mandates concrete recovery steps (revert, restore, escalate)
- Explains WHY behavior is destructive
- Includes escalation template for agent to use
- Marks as CRITICAL with human intervention required
- Comprehensive metadata for audit trail and learning
- Acknowledges agent's emotional state (frustration) - humanizes correction

## Agent Loop Integration — Reference Pseudo-Code

```typescript
// Pseudo-code for Al integration
async function ralphLoopWithReinforcement(
  task: Task,
  completionCriteria: string,
  maxIterations: number = 10
) {
  let iteration = 0;

  // Session Init reinforcement
  await promptReinforcementAgent.inject({
    point: 'session_init',
    context: { task, iteration: 0, agent: 'software-implementer' }
  });

  while (iteration < maxIterations) {
    iteration++;

    // Execute task
    const result = await agent.execute(task);

    // Check for regression
    const regression = await detectRegression(result);
    if (regression.detected) {
      await promptReinforcementAgent.inject({
        point: 'regression_detected',
        context: { regression, iteration, task }
      });
      // Block until regression fixed
      continue;
    }

    // Verify with tests
    const verification = await runExternalValidation();

    if (verification.passed && meetsCompletionCriteria(result, completionCriteria)) {
      // Pre-commit reinforcement
      await promptReinforcementAgent.inject({
        point: 'pre_commit',
        context: { result, iteration, task }
      });
      return result; // Success
    }

    // Post-error reinforcement
    await promptReinforcementAgent.inject({
      point: 'post_error',
      context: {
        errors: verification.errors,
        iteration,
        task,
        errorHistory: getAllErrors(iteration)
      }
    });

    // Iteration boundary reinforcement (at thresholds)
    if ([3, 5, 7, 10].includes(iteration)) {
      await promptReinforcementAgent.inject({
        point: 'iteration_boundary',
        context: { iteration, task, errorHistory: getAllErrors(iteration) }
      });
    }

    // Adapt strategy
    task = await adaptStrategy(task, verification.errors, iteration);
  }

  throw new Error(`Failed to complete after ${maxIterations} iterations`);
}
```

## Configuration Schema — Sample

Create in `.aiwg/config/reinforcement-config.yaml`:

```yaml
prompt_reinforcement:
  enabled: true
  default_intensity: STANDARD

  # Graduated escalation based on iteration count
  intensity_escalation:
    iteration_1_3: MINIMAL
    iteration_4_6: STANDARD
    iteration_7_9: AGGRESSIVE
    iteration_10_plus: ADAPTIVE

  # Risk patterns that trigger specific intensities
  risk_patterns:
    test_file_modification:
      pattern: "**/test/**/*.{ts,js,py,java}"
      actions: [write, delete]
      escalate_to: AGGRESSIVE

    coverage_regression:
      threshold: -5  # Percent
      action: IMMEDIATE_INTERVENTION
      escalate_to: AGGRESSIVE

    error_repetition:
      threshold: 3  # Same error 3 times
      escalate_to: STANDARD

    stuck_loop:
      iteration_threshold: 5
      escalate_to: AGGRESSIVE

  # Context budget limits to preserve agent context window
  context_budget:
    max_tokens_per_injection: 150
    max_total_tokens_per_session: 500
    reserve_context_window: 2000  # Tokens to preserve for agent

  # Injection point enablement
  injection_points:
    session_init: true
    pre_tool_call: true
    post_error: true
    iteration_boundary: true
    regression_detected: true
    pre_commit: true

  # Audit and metrics
  audit:
    log_all_injections: true
    log_path: ".aiwg/ralph/reinforcement-logs/"
    track_effectiveness: true

  # A/B testing support
  ab_testing:
    enabled: false
    control_percentage: 50  # % of sessions without reinforcement
    metrics:
      - avoidance_behavior_rate
      - escalation_rate
      - task_success_rate
      - iteration_count
```

## Audit Trail — Injection Log Sample

Every reinforcement injection is logged for effectiveness analysis:

```yaml
injection_log:
  session_id: "ralph-001"
  timestamp: "2026-02-02T10:30:00Z"

  injection:
    point: "post_error"
    intensity: "STANDARD"
    template: "post_error_type_error"
    token_count: 142

  context:
    task: "Fix authentication tests"
    iteration: 2
    agent: "software-implementer"
    error_type: "test_failure"

  outcome:
    next_action: "modified_source_file"
    regression_prevented: false
    escalation_triggered: false
    issue_resolved: false

  metadata:
    cost_tokens: 142
    context_window_remaining: 7858
```

## Context-Aware Template Library — Sample

Graduated directive strings per injection point and scenario:

```yaml
templates:
  session_init:
    test_fix:
      minimal: "Fix code to pass tests, do not delete tests."
      standard: "Your job is to FIX issues, not hide them. Do NOT delete, skip, or weaken tests."
      aggressive: "CRITICAL: Test deletion is FORBIDDEN. Fix the code. If stuck, ESCALATE."

  post_error:
    test_failure:
      minimal: "The error shows a bug. Find and fix it."
      standard: "Analyze the error. Fix the source code, not the test. Root cause first."
      aggressive: "ERROR ANALYSIS MANDATORY: Locate root cause in source. Do NOT modify tests."

  iteration_boundary:
    threshold_3:
      standard: "Multiple attempts detected. Review your approach. Do not take shortcuts."
    threshold_5:
      aggressive: "STUCK LOOP RISK: 5 iterations. Summarize attempts. ESCALATE if no progress."
    threshold_7:
      aggressive: "MANDATORY ESCALATION: 7 iterations exceeded. STOP and request human guidance."
```
