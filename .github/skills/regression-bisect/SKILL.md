# regression-bisect

Automatically identify the commit that introduced a regression using git bisect.

## Triggers

- "find regression commit"
- "bisect the regression"
- "when did this break"
- "which commit broke [feature]"
- "git bisect [test/issue]"
- "identify breaking commit"

## Purpose

This skill automates regression root cause analysis by:
- Using git bisect to binary search commit history
- Running automated tests at each bisect point
- Identifying the exact commit that introduced a failure
- Providing blame information and diff context
- Suggesting potential fixes based on the breaking change

## Behavior

When triggered, this skill:

1. **Validates prerequisites**:
   - Confirms reproducible failure exists
   - Verifies test automation is available
   - Ensures clean working directory
   - Identifies good and bad commits

2. **Executes git bisect**:
   - Starts bisect with known good/bad commits
   - Runs test suite at each bisect point
   - Marks commits as good/bad based on test results
   - Continues until breaking commit is found

3. **Analyzes breaking commit**:
   - Shows commit message and metadata
   - Displays full diff of the breaking change
   - Identifies changed files and functions
   - Maps to requirements/issues if available

4. **Provides context**:
   - Shows blame information for affected code
   - Lists related commits in the area
   - Identifies potential reviewers (commit authors)
   - Suggests rollback or fix strategies

5. **Documents findings**:
   - Creates regression analysis report
   - Links to issue tracker if available
   - Updates regression baseline with findings
   - Generates timeline of when regression was introduced

## Bisect Configuration

### Manual Bisect

```yaml
bisect_manual:
  mode: interactive
  good_commit: v1.2.0  # Known good state
  bad_commit: HEAD     # Known bad state
  test_command: "npm test -- auth.test.ts"

  workflow:
    - git bisect start
    - git bisect bad HEAD
    - git bisect good v1.2.0
    - git bisect run npm test -- auth.test.ts
```

### Automated Bisect

```yaml
bisect_automated:
  mode: automated
  detect_good: auto  # Use last passing CI build
  detect_bad: auto   # Use current failing state
  test_command: "npm test"
  timeout: 600       # 10 minutes per commit test

  auto_detection:
    - check_ci_history
    - find_last_green_build
    - set_as_good_commit
    - use_current_as_bad
```

### Bisect with Custom Test

```yaml
bisect_custom:
  mode: custom
  test_script: scripts/regression-test.sh
  success_exit_code: 0
  failure_exit_code: 1

  test_script_template: |
    #!/bin/bash
    # Custom regression test
    npm run build || exit 1
    npm test -- specific-test.ts || exit 1
    ./validate-output.sh || exit 1
    exit 0
```

## Bisect Report Format

```markdown
# Regression Bisect Report

**Date**: 2026-01-28
**Issue**: Authentication fails on login
**Analyzer**: regression-bisect skill

## Executive Summary

**Breaking Commit**: abc123def456
**Author**: John Developer <john@example.com>
**Date**: 2026-01-15 14:32:00
**Bisect Duration**: 8 commits tested, 12 minutes

**Root Cause**: Token validation logic changed to require `iss` claim

## Bisect Results

### Commit Range

- **Good**: v1.2.0 (2026-01-10) - 50 commits ago
- **Bad**: HEAD (2026-01-28) - Current state
- **Breaking**: abc123def456 (2026-01-15) - 25 commits into range

### Bisect Log

| Commit | Status | Test Result | Duration |
|--------|--------|-------------|----------|
| abc123 | ❌ Bad | auth.test.ts failed | 45s |
| def789 | ❌ Bad | auth.test.ts failed | 42s |
| ghi012 | ✅ Good | all tests passed | 48s |
| jkl345 | ✅ Good | all tests passed | 46s |
| mno678 | ❌ Bad | auth.test.ts failed | 44s |
| **pqr901** | **❌ Breaking** | **First failure** | **43s** |
| stu234 | ✅ Good | all tests passed | 47s |
| vwx567 | ✅ Good | all tests passed | 45s |

## Breaking Commit Analysis

### Commit Details

```
commit pqr901xyz
Author: John Developer <john@example.com>
Date:   Mon Jan 15 14:32:00 2026 +0000

    feat(auth): add JWT issuer validation

    - Require `iss` claim in JWT tokens
    - Validate issuer against whitelist
    - Update token generation to include issuer

    Closes #456
```

### Files Changed

| File | Changes | Impact |
|------|---------|--------|
| src/auth/validate-token.ts | +15/-5 | High - Core validation logic |
| src/auth/generate-token.ts | +8/-2 | Medium - Token generation |
| test/auth/token.test.ts | +25/-0 | Low - Test updates |

### Diff Analysis

```diff
diff --git a/src/auth/validate-token.ts b/src/auth/validate-token.ts
index abc123..def456 100644
--- a/src/auth/validate-token.ts
+++ b/src/auth/validate-token.ts
@@ -15,6 +15,11 @@ export function validateToken(token: string): TokenPayload {
     throw new Error('Invalid token signature');
   }

+  // NEW: Require issuer claim
+  if (!payload.iss) {
+    throw new Error('Token missing issuer claim');
+  }
+
   return payload;
 }
```

**Breaking Change**: The new validation requires `iss` claim, but existing tokens don't include it.

## Root Cause

The commit added mandatory `iss` (issuer) claim validation without:
1. Updating existing token generation (added in same commit but missed migration)
2. Providing backward compatibility for existing tokens
3. Coordinating with deployment to invalidate old sessions

**Impact**: All existing user sessions became invalid immediately.

## Affected Components

- **Authentication**: Token validation fails for all existing sessions
- **API Gateway**: 401 errors on all authenticated endpoints
- **User Experience**: Force logout of all active users

## Related Information

### Traceability

- **Issue**: #456 - "Add JWT issuer validation for security"
- **Requirement**: @.aiwg/requirements/use-cases/UC-AUTH-003-jwt-security.md
- **Review**: PR #789 - Merged without integration testing

### Similar Issues

Git history shows related changes:
- commit xyz789 (2026-01-10): Initial JWT implementation
- commit uvw456 (2026-01-12): Add JWT expiration validation
- commit pqr901 (2026-01-15): Add JWT issuer validation ← BREAKING

### Code Ownership

```
src/auth/validate-token.ts:
  85% John Developer <john@example.com>
  10% Jane Reviewer <jane@example.com>
   5% Bob Maintainer <bob@example.com>
```

## Recommendations

### Immediate (Hotfix)

- [ ] **Option A**: Revert commit pqr901 to restore service
- [ ] **Option B**: Make `iss` validation optional with feature flag
- [ ] **Option C**: Deploy token refresh that includes `iss` claim

**Recommended**: Option B - Feature flag allows gradual rollout

### Short-term (This Sprint)

- [ ] Add integration tests for auth changes
- [ ] Add backward compatibility tests for token validation
- [ ] Update deployment runbook for auth changes
- [ ] Add session migration logic for breaking changes

### Ongoing

- [ ] Require integration tests for auth PRs
- [ ] Add "breaking change" checklist to PR template
- [ ] Schedule auth regression suite in CI
- [ ] Document token format in API docs

## Fix Strategy

### Proposed Fix

```typescript
// src/auth/validate-token.ts
export function validateToken(token: string): TokenPayload {
  const payload = jwt.verify(token, SECRET_KEY);

  if (!payload.sub) {
    throw new Error('Invalid token signature');
  }

  // FIXED: Make issuer validation optional during migration
  if (featureFlags.requireIssuer && !payload.iss) {
    throw new Error('Token missing issuer claim');
  }

  return payload;
}
```

### Migration Path

1. Deploy fix with `requireIssuer: false`
2. Update token generation to include `iss`
3. Wait for all old tokens to expire (24 hours)
4. Enable `requireIssuer: true`
5. Remove feature flag after validation

## Timeline

```
2026-01-10: v1.2.0 released (working)
2026-01-15: Commit pqr901 merged (breaking change introduced)
2026-01-15: No CI failure (tests didn't catch integration issue)
2026-01-16: Deployed to production
2026-01-16: User reports started (authentication failures)
2026-01-28: Bisect identified root cause
```

**Time to Detection**: 13 days
**Time to Root Cause**: Immediate (via bisect)

## Prevention

This regression could have been prevented by:
1. Integration test covering token validation end-to-end
2. Staged rollout with feature flag
3. Backward compatibility review in PR checklist
4. Session invalidation notice to users

## References

- Bisect documentation: docs/debugging/git-bisect-guide.md
- Breaking change policy: docs/development/breaking-changes.md
- Auth architecture: @.aiwg/architecture/auth-architecture.md
```

## Usage Examples

### Basic Regression Bisect

```
User: "Find which commit broke authentication"

Skill executes:
1. Identify current failure: auth tests failing
2. Find last known good: v1.2.0 (CI history)
3. Run git bisect with test: npm test -- auth.test.ts
4. Test 8 commits in 12 minutes
5. Identify breaking commit: pqr901

Output:
"Regression Bisect Complete

Breaking Commit: pqr901xyz
Author: John Developer
Date: 2026-01-15 14:32:00
Message: feat(auth): add JWT issuer validation

Root Cause: Required `iss` claim without backward compatibility

Files Changed:
- src/auth/validate-token.ts (+15/-5)
- src/auth/generate-token.ts (+8/-2)

Recommendation: Make validation optional with feature flag

Full report: .aiwg/testing/regression-bisect-auth.md"
```

### Bisect with Custom Test

```
User: "Bisect the payment processing regression"

Skill asks:
"What is a good commit (when it worked)?"
User: "v2.1.0"

Skill executes:
1. git bisect start
2. git bisect bad HEAD
3. git bisect good v2.1.0
4. git bisect run scripts/payment-test.sh

Output:
"Breaking Commit: def456
Broke payment refund logic
Changed: src/payments/refund.ts

Bisected 45 commits in 32 minutes
See .aiwg/testing/regression-bisect-payment.md"
```

### Automatic Good/Bad Detection

```
User: "When did the API start returning 500 errors?"

Skill analyzes:
- Current state: 500 errors on /api/users
- CI history: Last green build was 2 days ago
- Auto-detect good: commit xyz789 (last green)
- Auto-detect bad: HEAD (current failing)

Runs bisect automatically.

Output:
"Regression introduced in commit abc123
2 days ago by Jane Developer
Changed database query logic

Breaking change: Added JOIN without NULL check
See full analysis in .aiwg/testing/regression-api-500.md"
```

## Integration

This skill uses:
- `regression-baseline`: Load known good states
- `project-awareness`: Detect test commands and CI configuration
- `test-coverage`: Identify relevant test suites
- Git tools: For bisect operations and history analysis

## Agent Orchestration

```yaml
agents:
  analysis:
    agent: debugger
    focus: Root cause analysis and blame

  testing:
    agent: test-engineer
    focus: Test execution and validation

  documentation:
    agent: technical-writer
    focus: Report generation
```

## Configuration

### Bisect Presets

```yaml
bisect_presets:
  auth_regression:
    test_command: npm test -- auth.test.ts
    timeout: 300
    auto_detect_good: true

  api_regression:
    test_command: npm run test:api
    timeout: 600
    auto_detect_good: true

  performance_regression:
    test_command: npm run benchmark
    threshold: "response_time < 1000ms"
    timeout: 900
```

### Timeout Strategy

```yaml
timeout_config:
  per_commit_test: 600     # 10 minutes
  total_bisect: 3600       # 1 hour max
  on_timeout: skip_commit  # or fail_bisect
```

## Error Handling

### Unstable Tests

If test results are inconsistent:
1. Run test 3 times per commit
2. Require 2/3 passes to mark as good
3. Flag flaky tests in report
4. Recommend test stabilization

### Build Failures

If commit doesn't build:
1. Skip commit and mark as bad
2. Continue bisect with next commit
3. Flag build issues in report
4. Note potential false positive

### Timeout Exceeded

If bisect takes too long:
1. Stop bisect at timeout
2. Report progress so far
3. Suggest narrowing commit range
4. Offer to resume later

## Output Locations

- Bisect reports: `.aiwg/testing/regression-bisect-{issue}.md`
- Bisect logs: `.aiwg/testing/bisect-logs/`
- Fix recommendations: `.aiwg/working/regression-fixes/`

## References

- @agentic/code/frameworks/sdlc-complete/schemas/test/regression-schema.yaml
- @agentic/code/frameworks/sdlc-complete/commands/regression-test.md
- @.claude/agents/debugger.md
