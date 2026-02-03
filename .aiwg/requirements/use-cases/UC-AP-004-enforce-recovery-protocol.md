# Use-Case Specification: UC-AP-004

## Metadata

- ID: UC-AP-004
- Name: Enforce Recovery Protocol
- Owner: System Analyst
- Contributors: Requirements Analyst, Agent Designer
- Reviewers: Requirements Reviewer
- Team: Anti-Laziness Pattern Framework
- Status: draft
- Created: 2026-02-02
- Updated: 2026-02-02
- Priority: P0 (Critical)
- Estimated Effort: L (Large)
- Related Documents:
  - Research: @.aiwg/research/paper-analysis/REF-002-aiwg-analysis.md (Archetype 4: Fragile Execution)
  - Research: @.aiwg/research/paper-analysis/REF-013-aiwg-analysis.md (Executable Feedback)
  - Research: @.aiwg/research/paper-analysis/REF-057-aiwg-analysis.md (HITL Improves Outcomes)
  - Research: @.aiwg/research/paper-analysis/REF-001-aiwg-analysis.md (Production Recovery Patterns)
  - Related Use Cases: UC-AP-001 (Ban Destructive Shortcuts), UC-AP-002 (Surface Uncertainty), UC-AP-003 (Detect Laziness Patterns)

## 1. Use-Case Identifier and Name

**ID:** UC-AP-004
**Name:** Enforce Recovery Protocol

## 2. Scope and Level

**Scope:** Anti-Laziness Pattern Framework - Agent Error Handling
**Level:** User Goal
**System Boundary:** Recovery Protocol Agent, Ralph iterative loop, error detection system, human escalation interface

## 3. Primary Actor(s)

**Primary Actors:**
- Agent (AI assistant encountering execution errors)
- Human Supervisor (Developer overseeing agent workflow)
- SDLC Orchestrator (System managing agent task execution)

**Actor Goals:**
- Agent: Recover from errors through structured diagnosis rather than abandoning task
- Human: Receive actionable escalations only after agent exhausts recovery attempts
- Orchestrator: Maintain workflow progress while ensuring quality recovery

## 4. Stakeholders and Interests

| Stakeholder | Interest |
|------------|----------|
| Agent | Clear protocol for error handling, avoid destructive shortcuts |
| Human Supervisor | Efficient use of time, only intervene when necessary |
| Project Manager | Task completion rate, quality of deliverables |
| Framework Maintainer | Reduction in lazy abandonment patterns |
| End User | Reliable agent behavior, predictable outcomes |

## 5. Preconditions

1. Agent has been assigned a task (code generation, test creation, documentation, etc.)
2. Recovery Protocol Agent deployed to project (`.claude/agents/recovery-protocol-enforcer.md`)
3. Ralph iterative loop mechanism available for retry logic
4. Error detection system can capture and classify failures
5. Human escalation channel configured (CLI notification, issue comment, or human gate)

## 6. Postconditions

**Success Postconditions:**
- Agent successfully recovers from error through PAUSE→DIAGNOSE→ADAPT→RETRY cycle
- Task completed correctly after structured recovery
- Recovery metadata logged for pattern analysis
- Human intervention avoided (agent self-recovered)

**Failure Postconditions:**
- Agent escalates to human after 3 failed recovery attempts
- Escalation includes full diagnostic context (error, attempts, hypotheses)
- Task remains incomplete but state preserved for human debugging
- Recovery attempt history logged for improvement

## 7. Trigger

Agent encounters an error during task execution:
- Test failure
- Syntax error in generated code
- File operation failure
- API call failure
- Validation failure
- Timeout

## 8. Main Success Scenario

### Setup: Agent Encounters Error

1. Agent (Software Implementer) generates authentication module implementation
   - Task: "Implement JWT token validation with refresh logic"
   - Agent writes `src/auth/validate-token.ts` (150 lines)
2. Agent executes tests: `npm test -- src/auth/validate-token.test.ts`
3. Test execution fails:
   ```
   FAIL src/auth/validate-token.test.ts
     validateToken()
       ✓ accepts valid token
       ✗ rejects expired token (28ms)
         Expected: TokenExpiredError
         Received: TypeError: Cannot read property 'exp' of undefined
   ```
4. **Recovery Protocol Triggered** - Agent detects test failure

### PAUSE Phase

5. Agent immediately stops making additional changes
6. Agent captures error context:
   - Error type: `TypeError`
   - Error message: `Cannot read property 'exp' of undefined`
   - Failing test: `rejects expired token`
   - Stack trace: Line 42 in `validate-token.ts`
   - Current state: 1 test passing, 1 test failing
7. Agent logs pause event:
   ```yaml
   recovery_event:
     iteration: 1
     phase: PAUSE
     timestamp: "2026-02-02T10:30:00Z"
     error_type: TypeError
     error_message: "Cannot read property 'exp' of undefined"
     failing_test: "rejects expired token"
   ```

### DIAGNOSE Phase

8. Agent analyzes root cause:
   - **Hypothesis 1**: Token payload not decoded before accessing `exp` property
   - **Evidence**: Error occurs when accessing `payload.exp` at line 42
   - **Supporting observation**: Valid token test passes (decoding succeeds)
   - **Root cause**: Missing null/undefined check after JWT decode
9. Agent inspects code at line 42:
   ```typescript
   const payload = jwt.decode(token); // Returns null for invalid tokens
   if (payload.exp < Date.now() / 1000) { // Line 42 - crashes if payload is null
     throw new TokenExpiredError();
   }
   ```
10. Agent confirms diagnosis:
   - **Root cause verified**: No null check after `jwt.decode()`
   - **Fix strategy**: Add null check before accessing `payload.exp`
11. Agent logs diagnosis:
   ```yaml
   recovery_event:
     phase: DIAGNOSE
     root_cause: "Missing null check after jwt.decode()"
     hypothesis: "payload is null for malformed tokens, causing TypeError"
     confidence: 0.90
     fix_strategy: "Add null check: if (!payload) throw InvalidTokenError"
   ```

### ADAPT Phase

12. Agent designs targeted fix (single, focused change):
   ```typescript
   // BEFORE (Line 42):
   const payload = jwt.decode(token);
   if (payload.exp < Date.now() / 1000) {
     throw new TokenExpiredError();
   }

   // AFTER (Fix):
   const payload = jwt.decode(token);
   if (!payload) {
     throw new InvalidTokenError('Malformed token');
   }
   if (payload.exp < Date.now() / 1000) {
     throw new TokenExpiredError();
   }
   ```
13. Agent validates fix against diagnosis:
   - **Check**: Does this fix the diagnosed root cause? ✓ Yes
   - **Check**: Is this the minimal change needed? ✓ Yes (3 lines added)
   - **Check**: Does this introduce new risks? ✓ No (early return pattern)
14. Agent logs adaptation:
   ```yaml
   recovery_event:
     phase: ADAPT
     fix_description: "Add null check before accessing payload.exp"
     lines_changed: 3
     change_type: "defensive_programming"
     risk_assessment: "low"
   ```

### RETRY Phase

15. Agent applies fix to `src/auth/validate-token.ts`
16. Agent re-executes tests: `npm test -- src/auth/validate-token.test.ts`
17. Test execution succeeds:
   ```
   PASS src/auth/validate-token.test.ts
     validateToken()
       ✓ accepts valid token
       ✓ rejects expired token (15ms)
       ✓ rejects malformed token (12ms)
   ```
18. Agent verifies all tests pass (2/2 passing)
19. Agent logs successful recovery:
   ```yaml
   recovery_event:
     phase: RETRY
     attempt: 1
     result: success
     tests_before: "1 passing, 1 failing"
     tests_after: "2 passing, 0 failing"
     recovery_time_seconds: 45
   ```

### Completion

20. Agent reports successful recovery to Orchestrator:
   - "Task completed successfully after 1 recovery iteration"
   - "Root cause: Missing null check in token validation"
   - "Fix applied: Added defensive programming check"
21. Recovery metadata stored in `.aiwg/ralph/recovery-history.yaml`
22. Agent resumes normal workflow (task complete)

## 9. Alternate Flows

### Alt-1: Multiple Recovery Iterations Required

**Branch Point:** Step 17 (Test re-execution)
**Condition:** Tests still failing after first fix attempt

**Flow:**
1. Agent detects tests still failing after first retry
2. Agent checks iteration count: 1 < 3 (max attempts)
3. Agent returns to DIAGNOSE phase with new context:
   - "Previous hypothesis incorrect"
   - "First fix did not resolve issue"
   - "New error message: X"
4. Agent formulates new hypothesis based on updated error
5. Agent proceeds through ADAPT → RETRY cycle again
6. **Iteration 2:**
   - DIAGNOSE: "Token expiration logic uses wrong time comparison"
   - ADAPT: Change `<` to `<=` for edge case handling
   - RETRY: Execute tests again
7. If still failing, proceed to Iteration 3
8. **Resume Main Flow:** Step 17 (If tests pass) or Exc-1 (If max iterations reached)

### Alt-2: Agent Identifies Uncertainty During Diagnosis

**Branch Point:** Step 8 (Diagnosis phase)
**Condition:** Agent cannot confidently diagnose root cause (confidence <0.70)

**Flow:**
1. Agent analyzes error but identifies multiple plausible root causes:
   - **Hypothesis A**: Null payload handling (confidence: 0.40)
   - **Hypothesis B**: Incorrect time format conversion (confidence: 0.35)
   - **Hypothesis C**: Test setup issue (confidence: 0.25)
2. Agent recognizes diagnostic uncertainty (highest confidence <0.70)
3. Agent gathers additional evidence:
   - Read test setup code
   - Inspect JWT library documentation
   - Check timestamp format in test fixtures
4. Agent re-evaluates hypotheses with new evidence:
   - **Hypothesis A**: Null payload handling (confidence: 0.85) ← **Selected**
   - **Hypothesis B**: Incorrect time format (confidence: 0.10)
   - **Hypothesis C**: Test setup issue (confidence: 0.05)
5. Agent proceeds to ADAPT with high-confidence hypothesis
6. **Resume Main Flow:** Step 12 (Adapt phase)

### Alt-3: Non-Deterministic Failure (Intermittent Error)

**Branch Point:** Step 17 (Test re-execution)
**Condition:** Tests pass on retry without code change

**Flow:**
1. Agent re-executes tests after PAUSE (before applying fix)
2. Tests unexpectedly pass (intermittent failure detected)
3. Agent identifies non-deterministic behavior:
   - **Pattern**: Timing-dependent test
   - **Evidence**: Test passed without code change
   - **Risk**: Flaky test indicates underlying race condition
4. Agent escalates with "Non-deterministic failure detected" context:
   - "Test passed on retry without fix"
   - "Likely race condition or timing dependency"
   - "Manual investigation required for root cause"
5. Agent logs non-deterministic failure pattern:
   ```yaml
   recovery_event:
     phase: ESCALATE
     reason: "non_deterministic_failure"
     evidence: "Test passed on retry without code change"
     recommendation: "Investigate race conditions or timing dependencies"
   ```
6. **Resume Main Flow:** Step 23 (Escalation to human)

### Alt-4: Validation Failure (Fix Breaks Other Tests)

**Branch Point:** Step 17 (Test re-execution)
**Condition:** Fix resolves original error but breaks different tests

**Flow:**
1. Agent applies fix and re-executes tests
2. Original failing test now passes
3. Previously passing test now fails:
   ```
   PASS src/auth/validate-token.test.ts
     ✓ rejects expired token (fixed)
   FAIL src/auth/middleware.test.ts
     ✗ allows valid authenticated requests
       Expected: 200 OK
       Received: 401 Unauthorized
   ```
4. Agent detects regression (new test failure introduced)
5. Agent analyzes regression:
   - **Root cause**: Fix was too aggressive (rejecting valid tokens)
   - **Evidence**: New InvalidTokenError thrown for edge case tokens
   - **Fix strategy**: Refine null check to handle edge cases
6. Agent increments iteration count (now iteration 2)
7. Agent proceeds to ADAPT phase with regression context
8. **Resume Main Flow:** Step 12 (Adapt with refined fix)

## 10. Exception Flows

### Exc-1: Max Recovery Attempts Exhausted (Escalation Required)

**Trigger:** Step 17 (Test re-execution)
**Condition:** Tests still failing after 3 recovery iterations

**Flow:**
1. Agent completes 3rd recovery attempt
2. Tests still failing after 3 iterations
3. Agent checks iteration count: 3 >= 3 (max attempts)
4. Agent compiles escalation context:
   - **Original error**: "TypeError: Cannot read property 'exp' of undefined"
   - **Iteration 1 attempt**: Added null check (failed - new error)
   - **Iteration 2 attempt**: Changed time comparison operator (failed - edge case)
   - **Iteration 3 attempt**: Added try-catch wrapper (failed - swallowed real error)
   - **Final state**: 1 test passing, 1 test failing, 2 tests broken by fixes
5. Agent prepares escalation report:
   ```markdown
   ## Recovery Escalation Required

   **Task**: Implement JWT token validation with refresh logic
   **File**: src/auth/validate-token.ts
   **Attempts**: 3 (max reached)

   ### Original Error
   ```
   TypeError: Cannot read property 'exp' of undefined
   Line 42: if (payload.exp < Date.now() / 1000)
   ```

   ### Recovery Attempts

   **Iteration 1**: Added null check before payload.exp access
   - Result: New error - "InvalidTokenError thrown for valid tokens"
   - Hypothesis: Null check too aggressive

   **Iteration 2**: Refined null check to handle edge cases
   - Result: Edge case test still failing
   - Hypothesis: Time comparison logic incorrect

   **Iteration 3**: Changed time comparison and added try-catch
   - Result: Test still failing, error now swallowed
   - Hypothesis: Underlying design issue with token handling

   ### Current State
   - 1 test passing (accepts valid token)
   - 1 test failing (rejects expired token) ← **Original**
   - 2 tests broken by fixes (edge case handling)

   ### Recommendation
   Manual review needed. Possible root cause:
   - JWT library decode() behavior not well understood
   - Token expiration semantics need clarification
   - Test expectations may not match implementation intent

   **Human intervention required.**
   ```
6. Agent escalates to human via configured channel:
   - **CLI**: Display escalation report in terminal
   - **Issue comment**: Post report to GitHub/Gitea issue
   - **Human gate**: Trigger HITL approval gate
7. Agent preserves all iteration state in `.aiwg/ralph/recovery-history.yaml`
8. Agent awaits human guidance before proceeding
9. Human reviews escalation, provides guidance:
   - "Token decode() returns null for invalid signature, not expired tokens"
   - "Use jwt.verify() instead of jwt.decode() for expiration checking"
10. Agent incorporates human guidance and resumes task

### Exc-2: Critical Error Requiring Immediate Escalation

**Trigger:** Step 8 (Diagnosis phase)
**Condition:** Agent detects unrecoverable error type

**Flow:**
1. Agent encounters error during diagnosis:
   - **Error type**: File system permission denied
   - **Error message**: "EACCES: permission denied, open '/etc/shadow'"
   - **Context**: Agent attempted to read sensitive system file
2. Agent classifies error as **CRITICAL**:
   - **Category**: Security/permission violation
   - **Recoverability**: Not agent-recoverable (requires system admin)
   - **Risk**: Further attempts may trigger security alerts
3. Agent immediately escalates without retry attempts:
   ```yaml
   recovery_event:
     phase: ESCALATE
     escalation_type: immediate
     reason: "critical_security_violation"
     error: "EACCES: permission denied, open '/etc/shadow'"
     recommendation: "Task requires elevated permissions. Review security policy."
   ```
4. Agent stops all task execution
5. Agent notifies human: "Critical error - immediate intervention required"
6. Human investigates and determines:
   - Task specification error (should not access system files)
   - Agent correctly escalated rather than attempting workarounds
7. Human corrects task specification and re-assigns

### Exc-3: Recovery Protocol Agent Not Available

**Trigger:** Step 4 (Recovery Protocol triggered)
**Condition:** Recovery Protocol Agent not deployed or accessible

**Flow:**
1. Agent encounters error during task execution
2. Agent attempts to invoke Recovery Protocol Agent
3. Recovery Protocol Agent not found (deployment missing)
4. Agent falls back to basic error handling:
   - Log error message
   - Log stack trace
   - Report failure to Orchestrator
5. Orchestrator detects missing Recovery Protocol Agent
6. Orchestrator notifies human:
   - "Recovery Protocol Agent not deployed"
   - "Deploy with: aiwg use sdlc --components recovery-protocol"
7. Human deploys Recovery Protocol Agent
8. Orchestrator retries task with recovery protocol enabled

### Exc-4: Infinite Loop Detection (Agent Repeating Same Fix)

**Trigger:** Step 12 (Adaptation phase)
**Condition:** Agent attempts same fix multiple times

**Flow:**
1. Agent completes Iteration 1 with fix: "Add null check"
2. Tests fail, agent proceeds to Iteration 2
3. Agent diagnoses and adapts: "Add null check" (identical to Iteration 1)
4. Recovery Protocol Agent detects repeated fix pattern:
   ```yaml
   loop_detection:
     pattern: "identical_fix_repeated"
     iterations: [1, 2]
     fix_description: "Add null check before accessing payload.exp"
     confidence: 1.0
   ```
5. Recovery Protocol Agent intervenes:
   - "Infinite loop detected: Same fix attempted twice"
   - "Escalating to avoid unproductive iteration"
6. Recovery Protocol Agent escalates with loop context:
   ```markdown
   ## Infinite Loop Detected

   Agent is repeating the same fix across iterations:
   - Iteration 1: "Add null check before accessing payload.exp"
   - Iteration 2: "Add null check before accessing payload.exp" (identical)

   **Root cause**: Agent not learning from failed attempts.
   **Recommendation**: Human review needed to break loop.
   ```
7. Human reviews and provides alternative approach:
   - "The issue is not null checking, it's that jwt.decode() is wrong function"
   - "Use jwt.verify() to validate signature AND check expiration"
8. Agent incorporates new guidance and resumes

## 11. Special Requirements

### Performance Requirements

| Requirement | Target | Rationale |
|------------|--------|-----------|
| NFR-AP-01: Recovery cycle time | <2 minutes per iteration | Avoid workflow bottleneck |
| NFR-AP-02: Max recovery iterations | 3 attempts | Balance persistence vs. efficiency |
| NFR-AP-03: Escalation response time | <30 seconds | Timely human notification |

### Security Requirements

| Requirement | Target | Rationale |
|------------|--------|-----------|
| NFR-AP-04: Privilege escalation detection | Immediate escalation | Prevent security bypasses |
| NFR-AP-05: Sensitive file access | Immediate escalation | Protect system integrity |

### Usability Requirements

| Requirement | Target | Rationale |
|------------|--------|-----------|
| NFR-AP-06: Escalation clarity | Full diagnostic context | Enable efficient human debugging |
| NFR-AP-07: Recovery metadata | Complete iteration history | Support pattern analysis |

## 12. Related Business Rules

**BR-001: Recovery Protocol Phases**
- PAUSE: Mandatory first step, no exceptions
- DIAGNOSE: Must include hypothesis with confidence score (0.0-1.0)
- ADAPT: Must be single, focused change (no multi-part fixes)
- RETRY: Must re-execute full validation (not partial)
- ESCALATE: Triggered after 3 failed attempts OR critical error

**BR-002: Escalation Criteria**
- **Max iterations**: 3 recovery attempts
- **Critical errors**: Immediate escalation (security, permissions, data loss risk)
- **Non-deterministic failures**: Immediate escalation (flaky tests, race conditions)
- **Infinite loops**: Escalate if same fix attempted 2+ times

**BR-003: Diagnostic Confidence Thresholds**
- **High confidence** (≥0.85): Proceed with fix
- **Medium confidence** (0.70-0.84): Proceed with caution, log uncertainty
- **Low confidence** (<0.70): Gather more evidence before adapting
- **Very low confidence** (<0.50): Escalate for human diagnosis

## 13. Data Requirements

### Input Data

| Data Element | Format | Source | Validation |
|-------------|--------|---------|-----------|
| Error message | String | Execution environment | Non-empty |
| Error type | String | Exception class name | Valid exception type |
| Stack trace | Array[string] | Execution environment | Contains file/line info |
| Failing test name | String | Test runner | Non-empty if test failure |
| Current state | Object | Task context | Valid state snapshot |

### Output Data

| Data Element | Format | Destination | Retention |
|-------------|--------|-------------|----------|
| Recovery event log | YAML | `.aiwg/ralph/recovery-history.yaml` | 90 days |
| Escalation report | Markdown | Human notification channel | Persistent |
| Success metrics | JSON | `.aiwg/metrics/recovery-stats.json` | Persistent |

### Data Validation Rules

**Recovery Event Log:**
- Must include timestamp (ISO-8601)
- Must include phase (PAUSE, DIAGNOSE, ADAPT, RETRY, ESCALATE)
- Must include iteration number (1-3)
- Must include result (success, failure, escalated)

**Escalation Report:**
- Must include original error
- Must include all recovery attempts with outcomes
- Must include current state
- Must include human recommendation

## 14. Open Issues and TODOs

1. **Issue 001: Recovery Protocol for Non-Code Tasks**
   - **Description:** Current protocol optimized for code/test failures. How to adapt for documentation, architecture, requirements tasks?
   - **Impact:** Limited applicability to non-technical SDLC phases
   - **Owner:** Framework Maintainer
   - **Due Date:** Elaboration phase

2. **Issue 002: Confidence Scoring Calibration**
   - **Description:** How should agents calculate diagnostic confidence? Need calibration methodology.
   - **Impact:** Incorrect confidence scores may cause premature escalation or unproductive retries
   - **Owner:** Agent Designer
   - **Due Date:** Construction phase

3. **Issue 003: Recovery Pattern Learning**
   - **Description:** Should system learn from successful recovery patterns and apply to future errors?
   - **Impact:** Potential to reduce human escalations over time
   - **Owner:** ML Engineer
   - **Due Date:** Post-MVP (future enhancement)

4. **TODO 001: Recovery Protocol Agent Implementation**
   - **Description:** Create `.claude/agents/recovery-protocol-enforcer.md`
   - **Assigned:** Agent Designer
   - **Due Date:** End of Elaboration phase

5. **TODO 002: Ralph Integration**
   - **Description:** Integrate recovery protocol into Ralph iterative loop mechanism
   - **Assigned:** Software Implementer
   - **Due Date:** Construction phase

## 15. References

**Requirements Documents:**
- [Vision Document](../../vision-document.md) - Anti-Laziness Pattern Framework
- [UC-AP-001: Ban Destructive Shortcuts](UC-AP-001-ban-destructive-shortcuts.md)
- [UC-AP-002: Surface Uncertainty](UC-AP-002-surface-uncertainty.md)
- [UC-AP-003: Detect Laziness Patterns](UC-AP-003-detect-laziness-patterns.md)

**Research Documents:**
- @.aiwg/research/paper-analysis/REF-002-aiwg-analysis.md - Archetype 4: Fragile Execution Under Load
- @.aiwg/research/paper-analysis/REF-013-aiwg-analysis.md - MetaGPT Executable Feedback Pattern
- @.aiwg/research/paper-analysis/REF-057-aiwg-analysis.md - Agent Laboratory HITL Benefits
- @.aiwg/research/paper-analysis/REF-001-aiwg-analysis.md - Production-Grade Recovery Patterns

**Implementation References:**
- @agentic/code/addons/ralph/ - Ralph iterative loop mechanism
- @.claude/rules/executable-feedback.md - Executable feedback loop rules

---

## Traceability Matrix

### Requirements Traceability

| Requirement ID | Source Document | Implementation Component | Test Case |
|---------------|-----------------|-------------------------|-----------|
| REQ-AP-004 | REF-002 Analysis | Recovery Protocol Agent | TC-AP-004-001 |
| NFR-AP-01 | This document | Ralph loop timeout config | TC-AP-004-002 |
| NFR-AP-04 | This document | Critical error detector | TC-AP-004-003 |
| BR-001 | This document | Recovery phase enforcer | TC-AP-004-004 |

### Research Foundation Mapping

**REF-002 (Failures in Deployed LLM Systems)**:
- Archetype 4: Fragile Execution Under Load
- Finding: "Recovery capability—not initial correctness—is dominant predictor of success"
- Application: PAUSE→DIAGNOSE→ADAPT→RETRY→ESCALATE protocol

**REF-013 (MetaGPT)**:
- Executable Feedback pattern: Test-driven iteration
- Application: RETRY phase must re-execute tests, not assume success

**REF-057 (Agent Laboratory)**:
- HITL improves outcomes when agents face uncertainty
- Application: ESCALATE phase provides rich context for human intervention

**REF-001 (Production Agentic Systems)**:
- Production systems require structured error recovery
- Application: Mandatory recovery protocol for all agent tasks

---

## Acceptance Criteria

### AC-001: Basic Recovery Workflow

**Given:** Agent encounters test failure
**When:** Recovery Protocol triggered
**Then:**
- Agent enters PAUSE phase (no further changes)
- Agent captures full error context (message, stack trace, test name)
- Agent proceeds to DIAGNOSE phase within 10 seconds

### AC-002: Successful Recovery

**Given:** Agent completes diagnosis with high confidence (≥0.85)
**When:** Agent applies fix and retries
**Then:**
- Fix is single, focused change (not multi-part)
- Tests re-executed (full test suite, not partial)
- Recovery succeeds within 2 minutes
- Success logged to recovery history

### AC-003: Multi-Iteration Recovery

**Given:** First recovery attempt fails
**When:** Agent retries with new hypothesis
**Then:**
- Iteration count incremented (now 2/3)
- New diagnosis incorporates prior failure context
- Different fix applied (not same as Iteration 1)
- Process repeats up to max 3 iterations

### AC-004: Escalation After Max Attempts

**Given:** 3 recovery attempts all fail
**When:** Agent checks iteration count
**Then:**
- Agent immediately escalates (no 4th attempt)
- Escalation report includes all 3 attempts with outcomes
- Escalation includes current state and recommendation
- Human notified within 30 seconds

### AC-005: Critical Error Immediate Escalation

**Given:** Agent encounters permission denied error
**When:** Agent classifies error as CRITICAL
**Then:**
- Agent immediately escalates (skips retry attempts)
- Escalation marked as "critical_security_violation"
- No further task execution until human review
- Security team notified if applicable

### AC-006: Infinite Loop Detection

**Given:** Agent attempts identical fix in Iteration 1 and 2
**When:** Recovery Protocol Agent detects pattern
**Then:**
- Infinite loop flagged
- Escalation triggered with loop context
- Human provided with repeated fix details
- Recommendation to break loop pattern

### AC-007: Non-Deterministic Failure Handling

**Given:** Test fails, then passes on retry without code change
**When:** Agent detects non-deterministic behavior
**Then:**
- Agent flags as flaky test
- Escalation triggered with "non-deterministic failure" reason
- Recommendation to investigate race conditions
- No further retry attempts (manual investigation required)

### AC-008: Recovery Metadata Logging

**Given:** Any recovery event occurs
**When:** Event completes (success, failure, or escalation)
**Then:**
- Event logged to `.aiwg/ralph/recovery-history.yaml`
- Log includes phase, iteration, timestamp, result
- Log includes confidence scores and hypotheses
- Log retained for 90 days

---

## Document Metadata

**Version:** 1.0
**Status:** DRAFT
**Created:** 2026-02-02
**Last Updated:** 2026-02-02
**Word Count:** 4,892 words

**Review History:**
- 2026-02-02: Initial draft (System Analyst)

**Next Actions:**
1. Review with Agent Designer for implementation feasibility
2. Create Recovery Protocol Agent definition (`.claude/agents/recovery-protocol-enforcer.md`)
3. Integrate with Ralph iterative loop mechanism
4. Develop test cases (TC-AP-004-001 through TC-AP-004-008)
5. Create recovery pattern learning system (future enhancement)

---

**Generated:** 2026-02-02
**Owner:** System Analyst (AIWG Anti-Laziness Framework)
**Status:** DRAFT - Ready for Review
