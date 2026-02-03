# Multi-Loop Ralph Test Strategy

**Status**: APPROVED
**Version**: 1.0.0
**Created**: 2026-02-02
**Owner**: Test Engineer

## Executive Summary

This document defines the comprehensive testing strategy for the multi-loop Ralph architecture, ensuring reliable concurrent loop execution while maintaining backward compatibility with existing single-loop workflows.

## References

- @.aiwg/working/multi-loop-ralph-plan.md - Architecture specification
- @.aiwg/research/findings/REF-086-multi-agent-coordination-tax.md - Coordination limits
- @.aiwg/research/findings/REF-088-dev-multi-agent-guide-2026.md - Best practices
- @.claude/rules/executable-feedback.md - Execution testing requirements

## Testing Scope

### In Scope

1. **Core Multi-Loop Infrastructure**
   - Loop registry management
   - Loop state isolation
   - File-based locking mechanisms
   - Loop ID generation and validation
   - Archive functionality

2. **CLI Command Updates**
   - `ralph` with `--loop-id` parameter
   - `ralph-status` with `--all` and `--loop-id`
   - `ralph-abort` with loop selection
   - `ralph-resume` with loop selection
   - Backward compatibility modes

3. **Concurrency Scenarios**
   - 2-4 concurrent loops (optimal range)
   - Lock contention handling
   - Race condition prevention
   - MAX_CONCURRENT_LOOPS enforcement

4. **Cross-Loop Features**
   - Shared pattern extraction
   - Cross-task learning
   - Registry consistency

5. **Migration and Compatibility**
   - Single-loop to multi-loop migration
   - Legacy symlink behavior
   - Graceful degradation

### Out of Scope

- External Ralph loop (Level 2) - separate test strategy
- Performance optimization testing (future phase)
- Load testing beyond 10 concurrent loops
- UI/dashboard testing

## Test Categories

### Unit Tests (70% coverage target)

**Location**: `test/unit/ralph/`

#### MultiLoopStateManager (Priority: P0)

| Test Case | Purpose | Coverage |
|-----------|---------|----------|
| `createLoop_success` | Creates loop with valid config | Happy path |
| `createLoop_enforcesMaxConcurrent` | Rejects 5th loop without --force | Limit enforcement |
| `createLoop_allowsForceOverride` | Allows >4 with --force flag | Override path |
| `createLoop_generatesValidLoopId` | Validates loop ID format | ID generation |
| `createLoop_createsIsolatedDirectory` | Ensures per-loop directories | Isolation |
| `getLoop_existingLoop` | Retrieves loop by ID | Read operations |
| `getLoop_nonExistentLoop` | Throws error for missing loop | Error handling |
| `listActiveLoops_empty` | Returns empty array when no loops | Edge case |
| `listActiveLoops_multiple` | Returns all active loops | Multi-loop |
| `archiveLoop_success` | Moves loop to archive | Archive flow |
| `archiveLoop_updatesRegistry` | Removes from active list | Registry update |
| `updateRegistry_atomic` | Uses file locking | Concurrency |
| `calculateCommunicationPaths` | Correct n*(n-1)/2 calculation | Math |

**Target**: >85% line coverage

#### FileLock (Priority: P0)

| Test Case | Purpose | Coverage |
|-----------|---------|----------|
| `acquireLock_success` | Acquires lock on first attempt | Happy path |
| `acquireLock_contention` | Waits and retries when locked | Retry logic |
| `acquireLock_staleLeaseExpired` | Removes expired lease locks | Lease expiry |
| `acquireLock_staleProcessDead` | Removes locks from dead processes | Process check |
| `acquireLock_timeout` | Throws after max attempts | Timeout |
| `releaseLock_ownerOnly` | Only owner can release | Ownership |
| `releaseLock_nonExistent` | No-op for missing lock | Edge case |
| `renewLease_success` | Extends lease duration | Lease renewal |
| `renewLease_notOwner` | Fails for non-owner | Security |
| `fencingToken_monotonic` | Tokens increase monotonically | Token ordering |
| `processExists_alive` | Detects running process | Process check |
| `processExists_dead` | Detects dead process | Process check |

**Target**: 100% line coverage (critical safety code)

#### LoopID (Priority: P1)

| Test Case | Purpose | Coverage |
|-----------|---------|----------|
| `generateLoopId_validFormat` | Matches `ralph-{slug}-{uuid}` | Format validation |
| `generateLoopId_slugTruncation` | Truncates at 30 chars | Length limit |
| `generateLoopId_specialCharsRemoved` | Removes non-alphanumeric | Sanitization |
| `generateLoopId_uniqueness` | No collisions in 1000 attempts | Collision check |
| `validateLoopId_valid` | Accepts valid IDs | Validation |
| `validateLoopId_invalid` | Rejects malformed IDs | Validation |

**Target**: >90% line coverage

### Integration Tests (25% coverage target)

**Location**: `test/integration/ralph/`

#### Concurrent Loops (Priority: P0)

| Test Case | Purpose | Duration |
|-----------|---------|----------|
| `concurrent_2loops_noConflict` | 2 loops run without interfering | 30s |
| `concurrent_4loops_optimal` | 4 loops (max recommended) succeed | 60s |
| `concurrent_lockContention` | Multiple loops updating registry | 45s |
| `concurrent_isolatedState` | Each loop has independent state | 30s |
| `concurrent_sharedPatterns` | Cross-loop learning extraction | 40s |
| `concurrent_archiveWhileRunning` | Archive one while others run | 35s |

**Target**: >80% scenario coverage

#### Backward Compatibility (Priority: P0)

| Test Case | Purpose | Duration |
|-----------|---------|----------|
| `migration_singleToMulti` | Migrates existing current-loop.json | 20s |
| `migration_preservesState` | All fields transferred correctly | 15s |
| `migration_createsSymlink` | Symlink created for legacy tools | 10s |
| `legacy_commandsWork` | Old commands work with migration | 25s |
| `legacy_autoDetectSingleLoop` | Auto-uses only loop if one exists | 15s |
| `legacy_promptsWhenMultiple` | Prompts user when >1 loop | 20s |

**Target**: 100% migration paths covered

#### CLI Commands (Priority: P1)

| Test Case | Purpose | Duration |
|-----------|---------|----------|
| `cli_ralph_createNewLoop` | `aiwg ralph` creates loop | 10s |
| `cli_ralph_withLoopId` | `--loop-id` overrides generation | 10s |
| `cli_status_all` | `--all` shows all loops | 8s |
| `cli_status_specific` | `--loop-id` shows one loop | 8s |
| `cli_abort_specific` | Aborts only target loop | 12s |
| `cli_resume_specific` | Resumes only target loop | 12s |
| `cli_help_showsLoopOptions` | Help text includes --loop-id | 5s |

**Target**: >90% command coverage

### End-to-End Tests (5% coverage target)

**Location**: `test/e2e/ralph/`

| Test Case | Purpose | Duration |
|-----------|---------|----------|
| `e2e_parallelTasks` | 3 loops solving different tasks | 5min |
| `e2e_recoveryAfterCrash` | Loop recovery works correctly | 3min |
| `e2e_crossLoopLearning` | Patterns shared between loops | 4min |
| `e2e_maxConcurrentEnforced` | 5th loop properly rejected | 2min |

**Target**: 4 critical user journeys

## Test Data and Fixtures

### Registry Fixtures

```json
// test/fixtures/ralph/registry-empty.json
{
  "version": "2.0.0",
  "max_concurrent_loops": 4,
  "updated_at": "2026-02-02T00:00:00Z",
  "active_loops": [],
  "total_active": 0,
  "total_completed": 0,
  "total_aborted": 0
}

// test/fixtures/ralph/registry-full.json
{
  "version": "2.0.0",
  "max_concurrent_loops": 4,
  "updated_at": "2026-02-02T00:00:00Z",
  "active_loops": [
    { "loop_id": "ralph-task1-a1b2c3d4", "status": "running", ... },
    { "loop_id": "ralph-task2-e5f6g7h8", "status": "running", ... },
    { "loop_id": "ralph-task3-i9j0k1l2", "status": "running", ... },
    { "loop_id": "ralph-task4-m3n4o5p6", "status": "paused", ... }
  ],
  "total_active": 4,
  "total_completed": 15,
  "total_aborted": 3
}
```

### State Fixtures

```json
// test/fixtures/ralph/loop-state-running.json
{
  "loopId": "ralph-fix-tests-a1b2c3d4",
  "task": "Fix all failing tests",
  "status": "running",
  "iteration": 3,
  "maxIterations": 10,
  "startedAt": "2026-02-02T14:00:00Z",
  "owner": "agent-1",
  "pid": 12345
}
```

### Lock Fixtures

```json
// test/fixtures/ralph/lock-valid.json
{
  "pid": 12345,
  "loopId": "ralph-task-abc123",
  "timestamp": 1706876400000,
  "leaseExpiry": 1706876430000,
  "fencingToken": 42
}

// test/fixtures/ralph/lock-expired.json
{
  "pid": 12345,
  "loopId": "ralph-task-abc123",
  "timestamp": 1706870000000,
  "leaseExpiry": 1706870030000,
  "fencingToken": 41
}
```

## Concurrency Testing Strategy

### Approach

1. **Controlled Concurrency**
   - Use test harness to spawn exactly N concurrent operations
   - Track all operations with unique IDs
   - Verify no data corruption or lost updates

2. **Lock Contention Simulation**
   - Simultaneous registry updates from multiple loops
   - Verify only one succeeds at a time
   - Ensure all eventually succeed

3. **Race Condition Detection**
   - Run same test 100 times in parallel
   - Flag any inconsistent outcomes
   - Use deterministic timestamps for reproducibility

### Test Matrix

| Loops | Registry Updates | Expected Behavior |
|-------|------------------|-------------------|
| 2 | Simultaneous | Both succeed, serialized |
| 4 | Sequential | All succeed in order |
| 4 | Simultaneous | All succeed, any order |
| 5 | Without --force | 5th fails with error |
| 5 | With --force | All succeed, warning logged |

### Lock Testing Matrix

| Scenario | Lock State | Expected Behavior |
|----------|------------|-------------------|
| Fresh | None | Acquire immediately |
| Contention | Valid, not expired | Wait and retry |
| Stale (lease) | Expired lease | Remove and acquire |
| Stale (process) | Dead process | Remove and acquire |
| Ownership | Different owner | Cannot release |
| Renewal | Same owner | Lease extended |

## Coverage Targets

| Category | Target | Rationale |
|----------|--------|-----------|
| **Overall** | **>80%** | Industry standard for critical infrastructure |
| Unit tests | >85% | High confidence in core logic |
| Integration tests | >80% | Verify component interaction |
| E2E tests | 100% | All critical paths covered |
| File locking | 100% | Safety-critical, zero tolerance |
| Registry operations | >95% | Core coordination mechanism |
| CLI commands | >90% | Primary user interface |

## Test Environment Setup

### Prerequisites

```bash
# Install dependencies
npm install --save-dev \
  jest \
  @types/jest \
  @jest/globals \
  mock-fs

# Set test environment variables
export AIWG_TEST_MODE=true
export AIWG_TEST_ROOT=/tmp/ralph-test
```

### Test Isolation

Each test MUST:
1. Create isolated `.aiwg/ralph/` directory in temp location
2. Clean up after completion (or on failure)
3. Use deterministic UUIDs for reproducibility
4. Mock system time for lease testing

### Test Execution

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- multi-loop-state-manager.test.mjs

# Run in watch mode
npm test -- --watch
```

## CI/CD Integration

### Pre-Commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Run unit tests (fast)
npm run test:unit
if [ $? -ne 0 ]; then
  echo "Unit tests failed - commit rejected"
  exit 1
fi
```

### GitHub Actions Workflow

```yaml
# .github/workflows/test-ralph-multiloop.yml
name: Multi-Loop Ralph Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit

      - name: Run integration tests
        run: npm run test:integration

      - name: Generate coverage report
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Quality Gates

### Definition of Done

Multi-loop implementation is complete when:

- [ ] All unit tests pass with >85% coverage
- [ ] All integration tests pass with >80% coverage
- [ ] All E2E tests pass (4/4 scenarios)
- [ ] File locking has 100% test coverage
- [ ] Concurrency tests run 100x without failure
- [ ] Backward compatibility verified
- [ ] CLI help updated and tested
- [ ] Migration guide validated

### Regression Prevention

After implementation:
- [ ] Add new tests to CI/CD pipeline
- [ ] Run full suite on every PR
- [ ] Require passing tests for merge
- [ ] Monitor coverage trends (no decrease)

## Test Execution Schedule

### During Development

| Phase | Tests to Run | Frequency |
|-------|-------------|-----------|
| Code changes | Unit tests | Every save (watch mode) |
| Feature complete | Integration tests | Every commit |
| PR submitted | Full suite | Automated |

### Post-Deployment

| Test Type | Frequency | Owner |
|-----------|-----------|-------|
| Smoke tests | Daily | CI/CD |
| Full suite | Weekly | Test Engineer |
| E2E tests | Weekly | QA Team |
| Performance | Monthly | DevOps |

## Risk Mitigation

### High-Risk Areas

| Risk | Mitigation | Test Coverage |
|------|------------|---------------|
| Race conditions | File locking + unit tests | 100% lock tests |
| Data corruption | Atomic writes + fixtures | >95% state tests |
| Backward compat breaking | Legacy test suite | 100% migration paths |
| Deadlocks | Lease expiry + timeout tests | >90% lock scenarios |
| MAX_CONCURRENT violation | Enforcement tests + E2E | 100% limit tests |

### Test Data Validation

All test fixtures MUST:
- Use realistic data patterns
- Include edge cases (empty, max length, special chars)
- Cover error states
- Be version-controlled
- Be documented

## Success Metrics

### Quantitative

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Overall coverage | >80% | TBD | Pending |
| Unit coverage | >85% | TBD | Pending |
| Integration coverage | >80% | TBD | Pending |
| E2E coverage | 100% | TBD | Pending |
| Lock coverage | 100% | TBD | Pending |
| CI/CD pass rate | >95% | TBD | Pending |

### Qualitative

- [ ] All critical paths tested
- [ ] Concurrency scenarios validated
- [ ] Backward compatibility proven
- [ ] Documentation validated through tests
- [ ] Migration tested on real projects

## Appendix A: Test Naming Conventions

### Unit Tests

Format: `{function}_{scenario}_{expectedBehavior}`

Examples:
- `createLoop_validConfig_success`
- `createLoop_maxConcurrent_throwsError`
- `acquireLock_staleProcess_removes`

### Integration Tests

Format: `{feature}_{scenario}`

Examples:
- `concurrent_4loops_noConflict`
- `migration_singleToMulti`
- `cli_status_all`

### E2E Tests

Format: `e2e_{userJourney}`

Examples:
- `e2e_parallelTasks`
- `e2e_recoveryAfterCrash`

## Appendix B: Coverage Tools

### Jest Configuration

```javascript
// jest.config.mjs
export default {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'tools/ralph/multi-loop-state-manager.mjs',
    'tools/ralph/file-lock.mjs',
    'tools/ralph/loop-id.mjs',
  ],
  coverageThresholds: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    },
    'tools/ralph/file-lock.mjs': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    }
  }
};
```

## Appendix C: Mock Examples

### Mock FileSystem

```javascript
import mockFs from 'mock-fs';

beforeEach(() => {
  mockFs({
    '.aiwg': {
      'ralph': {
        'registry.json': JSON.stringify(registryFixture),
        'loops': {}
      }
    }
  });
});

afterEach(() => {
  mockFs.restore();
});
```

### Mock Process

```javascript
const mockProcessExists = jest.fn((pid) => {
  return pid !== 99999; // 99999 is dead process
});

jest.mock('./file-lock.mjs', () => ({
  ...jest.requireActual('./file-lock.mjs'),
  processExists: mockProcessExists
}));
```

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-02-02 | Test Engineer | Initial test strategy |
