# Example: Test Fix Loop

Fix failing tests iteratively until all pass.

## Scenario

Your test suite is failing and you want Ralph to keep fixing until everything passes.

## Basic Usage

```bash
/ralph "Fix all failing tests" --completion "npm test passes"
```

## With Specific Test File

```bash
/ralph "Fix failing tests in auth module" \
  --completion "npm test -- --testPathPattern=auth passes"
```

## With Jest

```bash
/ralph "Fix all Jest test failures" \
  --completion "jest --passWithNoTests exits with code 0"
```

## With Pytest

```bash
/ralph "Fix all pytest failures" \
  --completion "pytest exits with code 0"
```

## With Coverage Requirement

```bash
/ralph "Fix tests and maintain 80% coverage" \
  --completion "npm test -- --coverage --coverageThreshold='{\"global\":{\"lines\":80}}'"
```

## Iteration Example

**Iteration 1**:
- Ralph runs tests, sees 5 failures
- Analyzes error messages
- Fixes obvious issues
- Result: 3 tests still failing

**Iteration 2**:
- Sees remaining 3 failures
- Identifies mock setup issue
- Fixes mocks
- Result: 1 test still failing

**Iteration 3**:
- Analyzes last failure (edge case)
- Fixes edge case handling
- Result: All tests pass!

## Expected Output

```
═══════════════════════════════════════════
Ralph Loop: SUCCESS
═══════════════════════════════════════════

Task: Fix all failing tests
Status: SUCCESS
Iterations: 3
Duration: 4m 32s

Verification:
$ npm test

Test Suites: 8 passed, 8 total
Tests:       42 passed, 42 total
Time:        12.5s

Files modified: 4
- src/auth/login.ts
- src/auth/logout.ts
- test/auth/login.test.ts
- test/mocks/user.mock.ts

Report: .aiwg/ralph/completion-2025-01-15T10-30.md
═══════════════════════════════════════════
```

## Tips

- Be specific about which tests if you have a large suite
- Include coverage thresholds if important
- Max 10 iterations is usually enough for test fixes
