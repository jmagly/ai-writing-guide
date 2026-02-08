---
description: Conduct comprehensive PR review from multiple perspectives (PM, Developer, QA, Security)
category: version-control-git
argument-hint: <pr_link_or_number> [--interactive] [--guidance "text"] [--regression-gate] [--allow-regression]
allowed-tools: Bash(gh *), Read
---

# PR Review

**PR Link/Number**: $ARGUMENTS

> **Instructions**: Execute each task in the order given to conduct a thorough code review. Update GitHub with this review.
> **Important**: The future is now—any improvements or "future" recommendations must be addressed **immediately**.

---

## Arguments

- `<pr_link_or_number>` - GitHub PR URL or PR number (required)
- `--interactive` - Prompt for confirmation before posting review
- `--guidance "text"` - Additional review guidance or focus areas
- `--regression-gate` - Run regression check before merge approval (default: true)
- `--allow-regression` - Allow merge even if regressions detected (requires justification)

**Default behavior**: Regression gate is enabled by default. To disable: `--regression-gate=false`

---

## Task 1: Product Manager Review

**Objective**: Assess from a product management perspective, focusing on:
- **Business Value**: Does this PR clearly advance our core product goals and deliver immediate ROI?
- **User Experience**: Is the change intuitive and delightful for users right now? If not, make fixes immediately.
- **Strategic Alignment**: Does the PR align with current (and long-term, i.e., now) strategic objectives?

**Action**: Provide clear directives on how to ensure maximum user and business impact. All "future" suggestions must be implemented now.

---

## Task 2: Developer Review

**Objective**: Evaluate the code thoroughly from a senior lead engineer perspective:
1. **Code Quality & Maintainability**: Is the code structured for readability and easy maintenance? If not, refactor now.
2. **Performance & Scalability**: Will these changes operate efficiently at scale? If not, optimize immediately.
3. **Best Practices & Standards**: Note any deviation from coding standards and correct it now.

**Action**: Leave a concise yet complete review comment, ensuring all improvements happen immediately—no deferrals.

---

## Task 3: Quality Engineer Review

**Objective**: Verify the overall quality, testing strategy, and reliability of the solution:
1. **Test Coverage**: Are there sufficient tests (unit, integration, E2E)? If not, add them now.
2. **Potential Bugs & Edge Cases**: Have all edge cases been considered? If not, address them immediately.
3. **Regression Risk**: Confirm changes don't undermine existing functionality. If risk is identified, mitigate now with additional checks or tests.

**Action**: Provide a detailed QA assessment, insisting any "future" improvements be completed right away.

---

## Task 4: Security Engineer Review

**Objective**: Ensure robust security practices and compliance:
1. **Vulnerabilities**: Check for common security flaws (SQL injection, XSS, authentication bypass, etc.). Fix immediately if found.
2. **Sensitive Data**: Confirm no secrets, credentials, or PII are exposed. Remove immediately if found.
3. **Security Best Practices**: Verify adherence to OWASP guidelines and security standards. Address gaps now.

**Action**: Provide security assessment with immediate remediation for any findings. No deferring security issues.

---

## Task 5: Regression Detection Gate

**Objective**: Detect behavioral regressions introduced by this PR

**When**: Runs automatically before merge approval (unless `--regression-gate=false`)

**Process**:

1. **Identify base branch** from PR metadata
2. **Determine scope** using changed files
3. **Execute regression check**:
   ```bash
   /regression-check \
     --baseline <base-branch> \
     --scope changed-files \
     --format summary
   ```
4. **Analyze results**:
   - **No regressions**: Proceed to merge approval
   - **Minor regressions**: Flag for review, document in comment
   - **Critical regressions**: BLOCK MERGE (unless `--allow-regression`)

**Output**: Regression analysis posted as PR comment

### Regression Gate Behavior

| Regression Severity | Default Action | With `--allow-regression` |
|---------------------|----------------|---------------------------|
| **None** | Approve merge | Approve merge |
| **Minor** (warnings) | Approve with note | Approve with note |
| **Major** (behavior change) | Request changes | Approve with documented risk |
| **Critical** (test failures) | BLOCK merge | Approve with justification required |

### Example: Regression Detected (Blocking)

```markdown
## 🚨 Regression Gate: BLOCKED

**Baseline**: main (commit abc123)
**Changed Files**: 5 files
**Tests Affected**: 12 tests

### Critical Regressions

1. **test/unit/auth/login.test.ts::validateCredentials**
   - Status: PASS → FAIL
   - Error: "Expected 200, received 401"
   - Impact: Breaks user authentication
   - **Action**: FIX REQUIRED BEFORE MERGE

2. **test/integration/api/payments.test.ts::processPayment**
   - Status: PASS → FAIL
   - Error: "Transaction timeout"
   - Impact: Payment processing broken
   - **Action**: FIX REQUIRED BEFORE MERGE

### Verdict

❌ **MERGE BLOCKED** - Critical regressions must be resolved.

To override (not recommended): Use `--allow-regression` and provide justification in PR description.

See full report: [regression-2026-01-25T15-30-00Z.md]
```

### Example: Regression Detected (Warning)

```markdown
## ⚠️ Regression Gate: WARNING

**Baseline**: main (commit abc123)
**Changed Files**: 3 files
**Tests Affected**: 8 tests

### Behavior Changes Detected

1. **test/integration/api/users.test.ts::createUser**
   - Performance: 150ms → 450ms (+200%)
   - Severity: MAJOR
   - **Action**: INVESTIGATE before merge

### Verdict

⚠️ **MERGE WITH CAUTION** - Behavior changes detected but not blocking.

Recommendation: Review performance regression and document if intentional.

See full report: [regression-2026-01-25T15-30-00Z.md]
```

### Example: No Regressions

```markdown
## ✅ Regression Gate: PASSED

**Baseline**: main (commit abc123)
**Changed Files**: 2 files
**Tests Affected**: 5 tests
**Result**: All tests passing, no behavioral changes detected

### Verdict

✅ **REGRESSION CHECK PASSED** - Safe to merge from regression perspective.
```

**Integration with Regression Analyst**:

For deep regression analysis or complex regressions, escalate to @agentic/code/frameworks/sdlc-complete/agents/regression-analyst.md for:
- Root cause analysis
- Regression pattern identification
- Fix recommendations
- Historical regression correlation

---

## Task 6: Review Summary

**Objective**: Synthesize all review feedback into actionable summary

**Required Sections**:

1. **Overall Verdict**: Approve / Request Changes / Comment
2. **Critical Issues**: Must be fixed before merge
3. **Major Issues**: Should be fixed before merge
4. **Minor Issues**: Can be addressed in follow-up
5. **Regression Status**: Results from regression gate
6. **Merge Recommendation**: Clear approve/block decision with rationale

### Example Summary

```markdown
## PR Review Summary

**Verdict**: REQUEST CHANGES

### Critical Issues (MUST FIX)
1. ❌ **Regression**: Authentication tests failing (see regression report)
2. ❌ **Security**: API key exposed in config file (line 42)

### Major Issues (SHOULD FIX)
1. ⚠️ **Performance**: Database query in loop (lines 156-178)
2. ⚠️ **Test Coverage**: New function missing unit tests

### Minor Issues (NICE TO HAVE)
1. 💡 **Code Style**: Inconsistent variable naming
2. 💡 **Documentation**: JSDoc comments missing

### Regression Status
❌ **2 CRITICAL REGRESSIONS DETECTED** - See detailed report above

### Merge Recommendation
🚫 **BLOCK MERGE**

**Rationale**:
- Critical regressions break authentication flow
- Security vulnerability exposes API credentials
- Must be resolved before merge

**Next Steps**:
1. Fix authentication regression
2. Remove exposed API key
3. Re-run regression check
4. Address major issues or create follow-up tickets
```

---

## Post-Review Actions

After completing review:

1. **Post review comment** to PR with summary
2. **Add labels** based on severity:
   - `regression-risk` if regressions detected
   - `security-issue` if vulnerabilities found
   - `needs-tests` if coverage insufficient
   - `performance-concern` if performance issues found
3. **Set PR status**:
   - Approve (if all checks pass)
   - Request Changes (if critical/major issues)
   - Comment (if minor issues only)
4. **Save review artifacts**:
   - Regression report (if gate enabled)
   - Review summary
   - Issue tracking links

---

## References

- @agentic/code/frameworks/sdlc-complete/commands/regression-check.md - Regression detection command
- @agentic/code/frameworks/sdlc-complete/agents/regression-analyst.md - Deep regression analysis agent
- @agentic/code/frameworks/sdlc-complete/schemas/testing/regression.yaml - Regression detection schema
- @.claude/rules/executable-feedback.md - Executable feedback loop implementation
- @.claude/rules/test-first-development.md - Test-first principles
