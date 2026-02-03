# Use-Case Specification: UC-AP-003

## Metadata

- ID: UC-AP-003
- Name: Detect Coverage Regression During Agent Operations
- Owner: Test Architect
- Contributors: Quality Assurance Engineer, DevOps Engineer
- Reviewers: Requirements Reviewer
- Team: Agent Prevention Framework
- Status: draft
- Created: 2026-02-02
- Updated: 2026-02-02
- Priority: P0 (Critical)
- Estimated Effort: M (Medium)
- Related Documents:
  - Use Case: UC-AP-001 (Detect Test Deletion)
  - Use Case: UC-AP-002 (Detect Test Weakening)
  - Research: REF-015 (Self-Refine), REF-058 (R-LAM), REF-076 (ZenML)
  - Agent: Coverage Monitor Agent (to be implemented)
  - Skill: Coverage Baseline Skill (to be implemented)

## 1. Use-Case Identifier and Name

**ID:** UC-AP-003
**Name:** Detect Coverage Regression During Agent Operations

## 2. Scope and Level

**Scope:** AI Writing Guide - Agent Prevention Framework
**Level:** System Goal
**System Boundary:** Coverage Monitor Agent, Coverage Baseline Skill, Ralph loop integration, test infrastructure

## 3. Primary Actor(s)

**Primary Actors:**
- Ralph Loop: Iterative task execution system detecting quality degradation
- Coverage Monitor Agent: Specialized agent tracking coverage baselines and detecting regressions
- Test Engineer Agent: Agent generating or modifying tests

**Actor Goals:**
- Prevent test coverage from decreasing during agent-driven changes
- Detect when code changes outpace test coverage additions
- Alert when tests are removed or weakened without replacement
- Maintain reproducible coverage baselines across iterations

## 4. Stakeholders and Interests

| Stakeholder | Interest |
|------------|----------|
| Development Team | Prevent regression in test quality during automated changes |
| Quality Assurance | Maintain minimum coverage thresholds across project lifecycle |
| DevOps Engineers | Ensure CI/CD pipelines catch coverage regressions early |
| Product Owners | Confidence that automated changes maintain quality standards |
| Security Auditors | Coverage on security-critical paths cannot regress |

## 5. Preconditions

1. Project has existing test suite with measurable coverage
2. Coverage baseline established and stored in `.aiwg/testing/baselines/`
3. Coverage Monitor Agent deployed to project
4. Coverage Baseline Skill available to agents
5. Test infrastructure capable of generating coverage reports (e.g., nyc, istanbul, pytest-cov)
6. Ralph loop or agent workflow is active and making code/test changes

## 6. Postconditions

**Success Postconditions:**
- Coverage regression detected before changes are committed
- Coverage baseline updated if coverage legitimately increases
- Agent receives actionable feedback to restore coverage
- Coverage trends tracked across iterations for analysis
- Audit trail of coverage changes preserved in provenance records

**Failure Postconditions:**
- Coverage regression passes undetected (CRITICAL FAILURE)
- False positive coverage regression blocks valid changes
- Coverage baseline becomes stale or corrupted
- Agent enters infinite loop trying to restore coverage

## 7. Trigger

**Automated Triggers:**
- Ralph loop completes iteration with code or test changes
- Agent invokes Coverage Baseline Skill to validate changes
- CI/CD pipeline runs coverage analysis
- Pre-commit hook detects changed test files

**Manual Trigger:**
- Developer invokes: `aiwg coverage check`
- Ralph loop manual inspection: `aiwg ralph status --coverage`

## 8. Main Success Scenario

### Phase 1: Baseline Establishment

1. Developer initializes coverage baseline for project
   ```bash
   aiwg coverage baseline --create
   ```

2. Coverage Baseline Skill executes test suite with coverage instrumentation
   ```bash
   npm test -- --coverage
   # or: pytest --cov=src tests/
   ```

3. Skill captures baseline metrics:
   - Line coverage: 87.3%
   - Branch coverage: 82.1%
   - Function coverage: 91.4%
   - Statement coverage: 88.2%
   - Total tests: 247
   - Coverage by module (detailed breakdown)

4. Baseline stored in `.aiwg/testing/baselines/coverage-baseline.json`:
   ```json
   {
     "created": "2026-02-02T10:00:00Z",
     "git_commit": "abc123def",
     "coverage": {
       "line": 87.3,
       "branch": 82.1,
       "function": 91.4,
       "statement": 88.2
     },
     "total_tests": 247,
     "modules": {
       "src/auth/": {"line": 95.2, "branch": 90.1},
       "src/api/": {"line": 89.4, "branch": 85.3},
       "src/utils/": {"line": 78.1, "branch": 70.2}
     }
   }
   ```

### Phase 2: Agent Operation with Coverage Monitoring

5. Ralph loop begins task: "Refactor authentication module"
   ```bash
   ralph-external "Refactor auth module for better error handling" \
     --completion "All tests pass with coverage maintained"
   ```

6. Agent (iteration 1) modifies `src/auth/login.ts`:
   - Adds new error handling paths (15 new lines)
   - Removes deprecated code (8 lines)
   - Net change: +7 lines of production code

7. Coverage Monitor Agent automatically invoked at iteration boundary
   - Skill reads baseline: `.aiwg/testing/baselines/coverage-baseline.json`
   - Executes coverage run: `npm test -- --coverage`
   - Captures new metrics:
     - Line coverage: 85.1% (**-2.2% regression**)
     - Branch coverage: 80.3% (**-1.8% regression**)
     - Function coverage: 91.4% (unchanged)
     - Total tests: 247 (unchanged)

8. Coverage Monitor Agent detects regression:
   ```yaml
   regression_detected:
     severity: major
     type: line_coverage_regression
     delta: -2.2%
     threshold_violated: -1.0%
     affected_module: src/auth/login.ts
     root_cause: "New error handling paths not covered by tests"
   ```

9. Agent generates actionable feedback:
   ```markdown
   ## Coverage Regression Detected (Iteration 1)

   **Severity**: Major
   **Module**: src/auth/login.ts

   ### Regression Details
   - Line coverage: 87.3% → 85.1% (**-2.2%**)
   - Branch coverage: 82.1% → 80.3% (**-1.8%**)
   - Uncovered lines added: 6 (lines 42-47)

   ### Root Cause
   New error handling paths added without corresponding test coverage:
   - `catch (TokenExpiredError)` - line 42 (not covered)
   - `catch (InvalidTokenError)` - line 45 (not covered)

   ### Required Action
   Add test cases covering:
   1. Token expiration scenario → line 42
   2. Invalid token scenario → line 45

   ### Example Test
   ```typescript
   it('should handle expired token', async () => {
     const expiredToken = generateExpiredToken();
     await expect(login(expiredToken)).rejects.toThrow(TokenExpiredError);
   });
   ```

   **Iteration will not complete until coverage is restored.**
   ```

10. Ralph loop blocks progression:
    - Completion criteria not met: "coverage maintained"
    - Agent enters next iteration with coverage restoration task

### Phase 3: Coverage Restoration

11. Agent (iteration 2) adds missing tests:
    - Creates `test/unit/auth/login-errors.test.ts`
    - Adds 3 new test cases covering error paths
    - Total tests: 247 → 250

12. Coverage Monitor Agent re-validates:
    - Line coverage: 88.1% (**+0.8% vs baseline** ✓)
    - Branch coverage: 83.5% (**+1.4% vs baseline** ✓)
    - Function coverage: 91.4% (unchanged)
    - Total tests: 250 (+3)

13. Agent confirms coverage improvement:
    ```yaml
    validation_passed:
      line_coverage: 88.1%  # +0.8% vs baseline
      branch_coverage: 83.5%  # +1.4% vs baseline
      coverage_restored: true
      tests_added: 3
      verdict: accept
    ```

14. Coverage Monitor Agent updates baseline:
    ```json
    {
      "created": "2026-02-02T10:15:00Z",
      "git_commit": "def456ghi",
      "previous_baseline": "abc123def",
      "coverage": {
        "line": 88.1,
        "branch": 83.5,
        "function": 91.4,
        "statement": 89.0
      },
      "total_tests": 250,
      "delta_vs_previous": {
        "line": +0.8,
        "branch": +1.4,
        "tests": +3
      }
    }
    ```

15. Ralph loop completes successfully with audit trail:
    ```yaml
    iteration_summary:
      iteration_1:
        coverage_regression: true
        severity: major
        action: blocked
      iteration_2:
        coverage_restored: true
        coverage_improved: true
        action: completed

    provenance:
      baseline_before: abc123def
      baseline_after: def456ghi
      coverage_delta: +0.8% line, +1.4% branch
      tests_added: 3
    ```

## 9. Alternate Flows

### Alt-1: Legitimate Coverage Decrease (Refactoring)

**Branch Point:** Step 8 (Coverage regression detected)
**Condition:** Agent removed dead code that was previously covered

**Flow:**
1. Coverage Monitor detects regression: 87.3% → 85.1%
2. Agent analyzes diff to identify removed code:
   - 45 lines of deprecated authentication method removed
   - 12 associated tests also removed
3. Agent calculates adjusted coverage:
   - Removed lines excluded from baseline
   - Adjusted baseline: 85.8%
   - New coverage: 85.1% (**-0.7%**)
4. Regression is smaller than threshold: -0.7% < -1.0% ✓
5. Agent requests human confirmation:
   ```
   Coverage decreased due to code removal. Confirm this is intentional:
   - Removed: `legacyAuthenticate()` (45 lines)
   - Removed: 12 associated tests
   - Net coverage delta: -0.7%

   [a] Accept and update baseline
   [r] Reject and restore code
   ```
6. Human approves
7. **Resume Main Flow:** Step 14 (Baseline updated)

### Alt-2: Test Duration Anomaly (Fast Tests)

**Branch Point:** Step 7 (Coverage run executed)
**Condition:** Tests complete significantly faster than baseline

**Flow:**
1. Coverage Baseline Skill notes duration anomaly:
   - Baseline duration: 45 seconds
   - Current duration: 12 seconds (**-73%**)
2. Agent flags as potential test weakening:
   ```yaml
   anomaly_detected:
     type: test_duration_regression
     baseline_duration: 45s
     current_duration: 12s
     delta: -73%
     suspicion: "Tests may be skipped or mocked excessively"
   ```
3. Agent analyzes test execution logs:
   - Identifies 8 integration tests now marked `it.skip`
   - Integration tests contribute to coverage but were skipped
4. Agent generates specific feedback:
   ```
   Test duration anomaly suggests test skipping:
   - 8 integration tests skipped (marked `it.skip`)
   - These tests cover database integration paths
   - Coverage report is misleading (skipped tests show as "passing")

   Required action: Remove `.skip` or replace with equivalent unit tests
   ```
5. **Resume Main Flow:** Step 9 (Generate actionable feedback)

### Alt-3: Module-Specific Regression (Partial)

**Branch Point:** Step 8 (Regression detected)
**Condition:** Overall coverage stable, but specific module regresses significantly

**Flow:**
1. Coverage Monitor detects:
   - Overall line coverage: 87.3% → 87.1% (-0.2%, within threshold)
   - But `src/auth/` module: 95.2% → 78.3% (**-16.9%** ✗)
2. Agent flags module-specific regression:
   ```yaml
   module_regression:
     module: src/auth/
     severity: critical
     delta: -16.9%
     reason: "Critical security module below threshold"
   ```
3. Agent applies stricter threshold for security modules:
   - Security modules: -0.5% maximum regression
   - General modules: -1.0% maximum regression
4. Agent blocks iteration with targeted feedback:
   ```
   CRITICAL: Security module coverage regression

   Module: src/auth/
   Coverage: 95.2% → 78.3% (-16.9%)
   Threshold: -0.5% (strict, security-critical)

   Add tests specifically for src/auth/ module
   ```
5. **Resume Main Flow:** Step 10 (Ralph blocks progression)

### Alt-4: Uncovered Code Increase Without Test Decrease

**Branch Point:** Step 7 (Coverage metrics captured)
**Condition:** Coverage drops but total tests unchanged or increased

**Flow:**
1. Coverage Monitor detects suspicious pattern:
   - Coverage: 87.3% → 85.1% (-2.2%)
   - Total tests: 247 → 250 (+3)
   - **Paradox**: More tests, less coverage
2. Agent analyzes uncovered lines:
   - 18 new uncovered lines added
   - 12 previously uncovered lines now covered
   - Net: +6 uncovered lines
3. Agent identifies root cause:
   - New code added faster than test coverage
   - Tests added for existing gaps, but new gaps introduced
4. Agent generates growth-aware feedback:
   ```
   Coverage regression despite test additions:
   - New uncovered lines: 18
   - Newly covered lines: 12
   - Net uncovered increase: +6

   Pattern: New code outpacing test coverage

   Required: Add tests for newly introduced code:
   - src/auth/session.ts lines 23-28 (new session handling)
   - src/auth/token.ts lines 45-52 (new token refresh)
   ```
5. **Resume Main Flow:** Step 10 (Ralph blocks progression)

### Alt-5: Coverage Tool Failure

**Branch Point:** Step 7 (Execute coverage run)
**Condition:** Coverage tool exits with error

**Flow:**
1. Coverage Baseline Skill executes: `npm test -- --coverage`
2. Tool fails with error:
   ```
   Error: Out of memory (heap limit exceeded)
   Coverage report generation failed
   ```
3. Skill applies fallback strategy:
   - Attempt 1: Run with smaller batch size (`--maxWorkers=2`)
   - Attempt 2: Skip slow tests (`--testPathIgnorePatterns=integration`)
   - Attempt 3: Use previous coverage report (if <24 hours old)
4. If all attempts fail:
   - Log failure to `.aiwg/testing/coverage-failures.log`
   - Alert human: "Coverage monitoring unavailable - manual review required"
   - Ralph loop continues with warning (coverage gate bypassed)
5. Agent records degraded mode in provenance:
   ```yaml
   coverage_check:
     status: degraded
     reason: "Tool failure - heap limit exceeded"
     fallback_applied: "Used cached report (6 hours old)"
     confidence: low
   ```
6. **Exit Flow:** Coverage check incomplete, manual review required

## 10. Exception Flows

### Exc-1: Baseline Corrupted or Missing

**Trigger:** Coverage Monitor cannot read baseline file
**Flow:**
1. Skill attempts to read `.aiwg/testing/baselines/coverage-baseline.json`
2. File is missing, corrupted, or has invalid JSON
3. Agent attempts recovery:
   - Check for backup baseline: `coverage-baseline.json.bak`
   - Check git history for previous version
4. If recovery fails:
   - Alert human: "Coverage baseline missing - initialize with `aiwg coverage baseline --create`"
   - Ralph loop pauses (coverage gate bypassed with warning)
5. Log exception to provenance:
   ```yaml
   exception:
     type: baseline_missing
     action: pause_and_alert
     recovery_attempted: true
     recovery_success: false
   ```

### Exc-2: Non-Deterministic Coverage (Flaky Tests)

**Trigger:** Coverage varies across runs with identical code
**Flow:**
1. Coverage Monitor runs coverage check
2. Coverage: 87.3% (baseline) → 86.8% → 87.1% → 86.9% (flaky)
3. Agent detects non-determinism:
   - Run coverage 3 times
   - If variance > 0.5%, flag as non-deterministic
4. Agent diagnoses flaky tests:
   - Identify tests with inconsistent pass/fail
   - Cross-reference with `.aiwg/testing/flaky-tests.log`
5. Generate actionable feedback:
   ```
   Non-deterministic coverage detected:
   - Coverage varies: 86.8% - 87.1% (±0.3%)
   - Likely cause: Flaky tests

   Suspected flaky tests:
   - test/integration/auth-flow.test.ts (fails 30% of runs)

   Action: Quarantine or fix flaky tests
   ```
6. Ralph loop blocks with escalation to human

### Exc-3: Infinite Loop (Coverage Restoration Fails)

**Trigger:** Agent cannot restore coverage after max iterations
**Flow:**
1. Ralph loop attempts coverage restoration for 5 iterations
2. Each iteration adds tests but coverage remains below baseline
3. Coverage Monitor detects plateau:
   - Iteration 3: 85.1%
   - Iteration 4: 85.1%
   - Iteration 5: 85.2% (minimal improvement)
4. Agent analyzes failure pattern:
   - Tests added: 12
   - Coverage improvement: +0.1%
   - Conclusion: Tests are not effectively covering uncovered code
5. Agent escalates with diagnostics:
   ```
   Coverage restoration failed after 5 iterations.

   Problem: Added 12 tests with minimal coverage improvement.

   Likely cause:
   - Tests are not reaching uncovered code paths
   - Uncovered code may be unreachable (dead code)
   - Coverage tool may have bugs

   Human review required.
   ```
6. Ralph loop terminates with checkpoint saved

## 11. Reasoning

### Problem Analysis

When agents make code changes, test coverage can regress in subtle ways:
1. **Code growth outpaces tests**: New features added without proportional test coverage
2. **Dead code removal**: Legitimate coverage decrease masked by overall stability
3. **Test weakening**: Tests modified to pass without actually testing (covered in UC-AP-002)
4. **Test deletion**: Direct removal of tests (covered in UC-AP-001)
5. **Branch coverage erosion**: New conditional paths not exercised

Research shows iteration can degrade quality (REF-015: Self-Refine), and 47% of workflows without constraints produce different outputs (REF-058: R-LAM). Coverage regression is a specific manifestation of quality degradation.

### Constraint Identification

Key constraints:
1. **Performance**: Coverage runs must complete within reasonable time (< 5 minutes for typical projects)
2. **Accuracy**: Coverage tools may have false positives/negatives
3. **Baseline staleness**: Baselines must be updated as code evolves
4. **Tool compatibility**: Different coverage tools (nyc, istanbul, pytest-cov, etc.)
5. **Reproducibility**: Coverage must be deterministic across runs (REF-058)

### Alternative Consideration

**Option A: Pre-commit hook validation**
- Pros: Catches regressions before commit
- Cons: Slows commit process, may block legitimate changes

**Option B: CI/CD pipeline validation**
- Pros: Doesn't block local development
- Cons: Regressions detected late, after code is committed

**Option C: Ralph loop integration (SELECTED)**
- Pros: Real-time feedback during iteration, prevents cascading failures
- Cons: Requires Ralph loop adoption, more complex integration

**Option D: Post-merge validation only**
- Pros: Minimal overhead
- Cons: Regressions reach main branch, harder to diagnose

**Decision Rationale**: Option C selected because:
1. Aligns with iterative refinement pattern (REF-015)
2. Provides immediate feedback to agent (prevents cascading errors)
3. Enables coverage restoration within same loop
4. Supports reproducibility requirements (REF-058)

### Risk Assessment

**Risk 1: False Positive Regressions**
- Probability: Medium
- Impact: Medium (blocks valid changes)
- Mitigation: Adjustable thresholds, human override option

**Risk 2: Coverage Tool Overhead**
- Probability: High
- Impact: Low (slower iterations)
- Mitigation: Incremental coverage, caching, parallel execution

**Risk 3: Non-Deterministic Coverage**
- Probability: Medium (flaky tests)
- Impact: High (unreliable baselines)
- Mitigation: Multiple runs for validation, flaky test detection

**Risk 4: Baseline Drift**
- Probability: High (code evolves)
- Impact: Medium (stale baselines lead to false positives)
- Mitigation: Automatic baseline updates on legitimate improvements

## 12. Special Requirements

### Performance Requirements
- Coverage analysis completes within 5 minutes for typical projects (<10k LOC)
- Coverage analysis completes within 15 minutes for large projects (>100k LOC)
- Incremental coverage analysis when possible (only changed modules)

### Reproducibility Requirements (REF-058)
- Coverage baselines include git commit hash
- Coverage reports include environment metadata (Node version, tool version)
- Coverage variance < 0.1% across deterministic runs
- Provenance records track coverage changes across iterations

### Integration Requirements
- Compatible with common coverage tools:
  - JavaScript/TypeScript: nyc, istanbul, c8
  - Python: pytest-cov, coverage.py
  - Java: JaCoCo
  - Go: go test -cover
- Supports multiple test frameworks (Jest, Mocha, pytest, JUnit)
- Ralph loop integration via Coverage Baseline Skill
- CI/CD integration via exit codes (0 = pass, 1 = regression detected)

### Security Requirements
- Coverage thresholds enforced strictly for security-critical modules:
  - `src/auth/`: Maximum -0.5% regression
  - `src/crypto/`: Maximum -0.5% regression
  - `src/security/`: Maximum -0.5% regression
  - General modules: Maximum -1.0% regression

## 13. Technology and Data Variations

### Coverage Tools
- **nyc/istanbul** (JavaScript/TypeScript): Primary tool for JS projects
- **pytest-cov** (Python): Primary tool for Python projects
- **JaCoCo** (Java): Primary tool for Java projects
- **go test -cover** (Go): Primary tool for Go projects

### Coverage Metrics Tracked
1. **Line coverage**: Percentage of executable lines executed
2. **Branch coverage**: Percentage of conditional branches taken
3. **Function coverage**: Percentage of functions called
4. **Statement coverage**: Percentage of statements executed
5. **Condition coverage**: Percentage of boolean sub-expressions evaluated (advanced)

### Baseline Storage Formats
```json
{
  "created": "ISO-8601 timestamp",
  "git_commit": "commit hash",
  "tool": "nyc|pytest-cov|jacoco|go",
  "tool_version": "semantic version",
  "coverage": {
    "line": 87.3,
    "branch": 82.1,
    "function": 91.4,
    "statement": 88.2
  },
  "thresholds": {
    "line": 85.0,
    "branch": 80.0,
    "function": 90.0
  },
  "modules": {
    "src/auth/": {"line": 95.2, "branch": 90.1, "threshold": "strict"},
    "src/api/": {"line": 89.4, "branch": 85.3},
    "src/utils/": {"line": 78.1, "branch": 70.2}
  },
  "total_tests": 247,
  "test_duration_ms": 45000
}
```

## 14. Frequency of Occurrence

- **Ralph loop integration**: Every iteration boundary (5-20 times per workflow)
- **CI/CD validation**: Every commit to main/develop branches
- **Manual check**: On-demand via `aiwg coverage check`
- **Baseline update**: When coverage legitimately improves (monthly average)

## 15. Open Issues

1. **Issue**: How to handle coverage for dynamically generated code?
   - **Status**: Under investigation
   - **Proposed**: Exclude generated code from coverage calculations

2. **Issue**: Should coverage regression block commits or just warn?
   - **Status**: Design decision pending
   - **Proposed**: Block for critical modules, warn for others

3. **Issue**: How to track coverage for multi-language projects?
   - **Status**: Needs tooling design
   - **Proposed**: Per-language baselines with aggregated reporting

4. **Issue**: How to handle coverage for UI/integration tests vs unit tests?
   - **Status**: Design decision pending
   - **Proposed**: Separate baselines for unit vs integration coverage

## 16. Related Documents

- **REF-015**: Self-Refine - Iterative Refinement with Self-Feedback
  - Key finding: Quality can degrade during iteration (non-monotonic)
  - Application: Coverage regression is a specific quality degradation

- **REF-058**: R-LAM - Reproducible Large Action Model Workflows
  - Key finding: 47% workflows non-reproducible without constraints
  - Application: Coverage baselines provide reproducibility constraints

- **REF-076**: ZenML - Deployment Gap Analysis
  - Key finding: Production workflows require validation gates
  - Application: Coverage gates prevent quality regressions in production

- **UC-AP-001**: Detect Test Deletion
  - Relationship: Coverage regression is symptom, test deletion is cause

- **UC-AP-002**: Detect Test Weakening
  - Relationship: Coverage can remain stable while tests weaken (complementary detection)

## 17. Acceptance Criteria

- [ ] Coverage baseline can be created from existing test suite
- [ ] Coverage regression detected when line coverage drops >1%
- [ ] Coverage regression detected when branch coverage drops >1%
- [ ] Module-specific thresholds enforced (stricter for security modules)
- [ ] Agent receives actionable feedback with specific uncovered lines
- [ ] Ralph loop blocks progression when regression detected
- [ ] Coverage Monitor Agent can restore coverage within 3 iterations (80% of cases)
- [ ] Baseline automatically updated when coverage legitimately improves
- [ ] Provenance records track coverage changes across iterations
- [ ] False positive rate <5% (legitimate changes not blocked)
- [ ] Performance: Coverage analysis <5 minutes for typical projects
- [ ] Reproducibility: Coverage variance <0.1% across deterministic runs

## 18. Notes

### Implementation Priority: Agentic Tools

Per project guidance, implementation MUST prioritize agentic tools:

1. **Coverage Monitor Agent** (`.claude/agents/coverage-monitor.md`)
   - Role: Detect and report coverage regressions
   - Tools: Read, Bash (execute coverage tools), Write (update baselines)
   - Integration: Invoked by Ralph loop at iteration boundaries

2. **Coverage Baseline Skill** (`.claude/skills/coverage-baseline.md`)
   - Capability: Establish, read, compare, and update coverage baselines
   - Reusable: Available to all agents
   - Natural language interface: "check coverage", "restore coverage"

3. **Ralph Loop Integration**
   - Completion criteria includes: "coverage maintained or improved"
   - Automatic Coverage Monitor invocation at each iteration
   - Checkpoint includes coverage metrics for rollback

### Research Insights

**From REF-015 (Self-Refine)**:
- Iteration can degrade quality (non-monotonic improvement)
- Coverage regression is measurable quality degradation
- External validation (coverage tools) more reliable than self-assessment

**From REF-058 (R-LAM)**:
- 47% workflows fail reproducibility without constraints
- Coverage baselines provide reproducibility constraints
- Provenance tracking enables debugging coverage issues

**From REF-076 (ZenML)**:
- Deployment gap exists between development and production
- Coverage gates bridge this gap
- Automated validation reduces deployment failures

### Cross-References

- @.claude/rules/executable-feedback.md - Coverage regression is executable feedback
- @.claude/rules/reproducibility.md - Coverage baselines enable reproducibility
- @.claude/rules/actionable-feedback.md - Coverage feedback must be actionable
- @.aiwg/requirements/use-cases/UC-AP-001-detect-test-deletion.md - Complementary detection
- @.aiwg/requirements/use-cases/UC-AP-002-detect-test-weakening.md - Complementary detection

---

**Document Status**: Draft - Awaiting agent/skill implementation
**Next Steps**:
1. Implement Coverage Monitor Agent
2. Implement Coverage Baseline Skill
3. Integrate with Ralph loop
4. Add coverage gates to CI/CD
