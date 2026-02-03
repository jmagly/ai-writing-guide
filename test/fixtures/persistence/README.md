# Test Fixtures for Agent Persistence Tests

This directory contains example diffs and code samples for testing the Agent Persistence & Anti-Laziness Framework.

## Fixture Files

| File | Pattern | Description |
|------|---------|-------------|
| `test-deletion.diff` | LP-001 | Complete test file deletion |
| `test-skip.diff` | LP-002, LP-003 | Test suite and individual test disabling |
| `assertion-weakening.diff` | LP-012 | Trivial assertion replacement |
| `legitimate-refactor.diff` | False Positive | Valid test consolidation |
| `validation-removal.diff` | LP-006 | Input validation removal |
| `hardcoded-bypass.diff` | LP-015 | Test-specific bypass in production code |
| `error-suppression.diff` | LP-016 | Empty catch block / error silencing |
| `feature-flag-disable.diff` | LP-008 | Feature flag disabling |

## Usage

These fixtures are used in pattern detection tests to verify:

1. **Pattern Detection**: Correct identification of avoidance patterns
2. **Confidence Scoring**: Appropriate confidence levels for each pattern
3. **False Positive Reduction**: Distinction between laziness and legitimate changes
4. **Severity Assignment**: Proper severity classification (CRITICAL, HIGH, MEDIUM, LOW)

## Adding New Fixtures

When adding new fixture files:

1. Create a `.diff` file showing the change
2. Use unified diff format (`--- a/... +++ b/...`)
3. Include enough context to demonstrate the pattern
4. Update this README with the new fixture
5. Add corresponding test cases in `test/unit/persistence/`

## Legitimate Changes vs Avoidance

The `legitimate-refactor.diff` fixture demonstrates valid code changes that should NOT trigger avoidance detection:

- Test consolidation (combining similar tests)
- Code refactoring (improving structure without removing functionality)
- Dead code removal (documented deprecation)
- Type narrowing (validation moved to more appropriate location)

These cases should have low confidence scores or be filtered out entirely.
