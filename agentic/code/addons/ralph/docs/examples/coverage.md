# Example: Coverage Improvement Loop

Iteratively add tests until coverage threshold is met.

## Scenario

Your code coverage is below target and you want Ralph to keep adding tests until coverage meets the threshold.

## Basic Coverage Target

```bash
/ralph "Add tests to reach 80% code coverage" \
  --completion "npm run coverage shows line coverage >= 80%" \
  --max-iterations 20
```

## With Jest Coverage Threshold

```bash
/ralph "Add unit tests until 80% coverage" \
  --completion "npm test -- --coverage --coverageThreshold='{\"global\":{\"lines\":80,\"branches\":70}}'" \
  --max-iterations 25
```

## Specific Module Coverage

```bash
/ralph "Add tests for src/auth/ to reach 90% coverage" \
  --completion "npm test -- --coverage --collectCoverageFrom='src/auth/**/*.ts' shows >= 90%"
```

## Python Coverage

```bash
/ralph "Add pytest tests to reach 80% coverage" \
  --completion "pytest --cov=src --cov-fail-under=80" \
  --max-iterations 20
```

## Coverage + Tests Pass

```bash
/ralph "Add tests until 80% coverage, ensuring all tests pass" \
  --completion "npm test -- --coverage --coverageThreshold='{\"global\":{\"lines\":80}}' passes"
```

## Iteration Example

**Iteration 1** (Starting: 45%):
- Analyzes uncovered code
- Adds tests for main utility functions
- Result: 52% coverage

**Iteration 2**:
- Adds tests for auth module
- Result: 61% coverage

**Iteration 3**:
- Adds tests for API handlers
- Result: 68% coverage

**Iteration 4**:
- Adds edge case tests
- Result: 74% coverage

**Iteration 5**:
- Adds error handling tests
- Result: 79% coverage

**Iteration 6**:
- Adds final corner cases
- Result: 82% coverage - SUCCESS!

## Expected Output

```
═══════════════════════════════════════════
Ralph Loop: SUCCESS
═══════════════════════════════════════════

Task: Add tests to reach 80% code coverage
Status: SUCCESS
Iterations: 6
Duration: 18m 45s

Verification:
$ npm test -- --coverage

Coverage Summary:
  Lines:    82.3%
  Branches: 76.1%
  Functions: 85.2%

Tests: 67 passed, 67 total

Files modified: 12
- test/utils.test.ts (new)
- test/auth/login.test.ts (expanded)
- test/auth/logout.test.ts (new)
- test/api/users.test.ts (expanded)
- ... (8 more test files)

Report: .aiwg/ralph/completion-2025-01-15T09-15.md
═══════════════════════════════════════════
```

## Tips

- Coverage improvement is iterative by nature - expect 15-25 iterations
- Set realistic thresholds (going from 20% to 80% takes many iterations)
- Include branch coverage for more thorough testing
- Focus on specific modules if overall coverage is too broad
- Consider using `--timeout 120` for longer coverage loops
