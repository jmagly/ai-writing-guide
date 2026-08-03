# Testing Patterns

## Test Framework

<!-- Detected from project configuration -->
<!-- Common frameworks: jest, vitest, mocha, pytest, go test, cargo test -->

### Framework Details

**Framework**: <!-- Auto-detected: e.g., "jest" -->
**Version**: <!-- From package.json or similar -->
**Configuration**: <!-- Config file location -->

### Test Organization

```
test/
├── unit/           # Unit tests
├── integration/    # Integration tests
├── e2e/            # End-to-end tests
└── fixtures/       # Test data and mocks
```

## Common Patterns

### Test-First Development

<!-- Learned from observing test → implementation → refactor cycles -->

**Pattern**: Test → Implement → Refactor
- Write failing test first
- Implement minimal code to pass
- Refactor while keeping tests green

### Coverage Expectations

<!-- Learned from project requirements or .aiwg/testing/ -->

**Minimum Coverage**: <!-- e.g., "80% for new code" -->
**Critical Paths**: <!-- e.g., "100% for auth, payments, data access" -->

### Fixture Management

<!-- Learned from test file patterns -->

**Location**: <!-- e.g., "test/fixtures/" -->
**Factories**: <!-- e.g., "Use factory functions in test/factories/" -->
**Cleanup**: <!-- e.g., "Cleanup hooks run after each test" -->

## Testing Conventions

### Naming

<!-- Learned from existing test files -->

```typescript
// Pattern observed in codebase
describe('ModuleName', () => {
  describe('methodName', () => {
    it('should [expected behavior] when [condition]', () => {
      // ...
    });
  });
});
```

### Assertion Style

<!-- Learned from test implementations -->

**Preferred Style**: <!-- e.g., "expect() assertions" vs "assert()" -->
**Error Messages**: <!-- e.g., "Always include descriptive error messages" -->

### Mocking Strategy

<!-- Learned from test patterns -->

**When to Mock**:
- External services (APIs, databases)
- Time-dependent functions
- File system operations
- Network calls

**When to Use Real**:
- Pure functions
- Internal utilities
- Fast, deterministic operations

## Known Gotchas

### Async Test Issues

<!-- Learned from debugging async test failures -->

**Pattern**: <!-- e.g., "Always return promises or use async/await" -->
**Timeout**: <!-- e.g., "Increase timeout for integration tests: jest.setTimeout(10000)" -->

### Flaky Tests

<!-- Learned from intermittent failures -->

**Common Causes**:
- Race conditions in async code
- Shared state between tests
- Non-deterministic test data
- Timing dependencies

**Mitigations**:
- Use deterministic test data
- Clean up after each test
- Avoid hardcoded delays

### Test Performance

<!-- Learned from slow test runs -->

**Slow Tests**: <!-- e.g., "Integration tests in test/integration/ run in CI only" -->
**Parallelization**: <!-- e.g., "Unit tests run in parallel, integration tests serial" -->

## Test Data Management

### Fixtures

<!-- Learned from test/fixtures/ structure -->

**Location**: <!-- e.g., "test/fixtures/data/" -->
**Format**: <!-- e.g., "JSON files for API responses, SQL for database seeds" -->
**Updates**: <!-- e.g., "Update fixtures when API contracts change" -->

### Factories

<!-- Learned from test factory patterns -->

**Pattern**: <!-- e.g., "Factory functions in test/factories/" -->
**Usage**: <!-- e.g., "createUser({ overrides }) for test user creation" -->

## Coverage Tracking

### Tools

**Coverage Tool**: <!-- e.g., "jest --coverage" or "nyc" -->
**Reports**: <!-- e.g., "coverage/ directory, excluded from git" -->
**CI Integration**: <!-- e.g., "Coverage report uploaded to Codecov" -->

### Thresholds

**Configured Thresholds**:
- Statements: <!-- e.g., "80%" -->
- Branches: <!-- e.g., "75%" -->
- Functions: <!-- e.g., "80%" -->
- Lines: <!-- e.g., "80%" -->

## Integration Testing

### Setup/Teardown

<!-- Learned from integration test patterns -->

**Database**: <!-- e.g., "Test database seeded before each test suite" -->
**External Services**: <!-- e.g., "Mocked using nock or similar" -->
**Cleanup**: <!-- e.g., "afterAll() hook drops test database" -->

### Test Isolation

<!-- Learned from test independence requirements -->

**Pattern**: <!-- e.g., "Each test creates its own test data" -->
**Transactions**: <!-- e.g., "Wrap tests in transactions, rollback after" -->

## Debugging Failed Tests

### Strategies Learned

<!-- Captured from debugging sessions -->

1. **Run in Isolation**: <!-- e.g., "Use .only to isolate failing test" -->
2. **Increase Verbosity**: <!-- e.g., "Run with --verbose flag" -->
3. **Check Logs**: <!-- e.g., "Review test output in CI artifacts" -->
4. **Reproduce Locally**: <!-- e.g., "Use same seed data as CI" -->

### Common Resolutions

<!-- Learned from repeated debugging -->

**Issue**: <!-- e.g., "Test passes locally, fails in CI" -->
**Cause**: <!-- e.g., "Timezone difference" -->
**Fix**: <!-- e.g., "Use UTC timestamps in test data" -->

## Test Refactoring

### When to Refactor

<!-- Learned from test maintenance -->

- Tests become brittle (fail on minor changes)
- Duplication across test files
- Tests are hard to understand
- Setup/teardown is complex

### Refactoring Patterns

<!-- Learned from test improvements -->

**Extract Helper Functions**: <!-- e.g., "Common setup in test/helpers/" -->
**Use Factories**: <!-- e.g., "Replace inline data with factory functions" -->
**Parameterized Tests**: <!-- e.g., "Use test.each() for similar test cases" -->

## Continuous Learning

<!-- Track evolving test practices -->

**Recent Improvements**: <!-- e.g., "Added snapshot testing for UI components" -->
**Experiments**: <!-- e.g., "Trying property-based testing for validation logic" -->
**Pain Points**: <!-- e.g., "Integration tests still too slow, investigating parallel execution" -->
