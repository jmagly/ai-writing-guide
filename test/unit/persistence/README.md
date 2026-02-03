# Agent Persistence Framework Test Suite

Comprehensive test coverage for the Agent Persistence & Anti-Laziness Framework implementing issue #263.

## Test Files

| File | Test Count | Coverage Area | Status |
|------|-----------|---------------|--------|
| `pattern-detection.test.ts` | 15+ | Advanced pattern detection, confidence scoring, false positives | ✓ Complete |
| `recovery-protocol.test.ts` | 14+ | PDARE protocol, state machine, recovery history | ✓ Complete |
| `best-output-selection.test.ts` | 18+ | Quality tracking, peak selection, degradation detection | ✓ Complete |
| `meta-tests.test.ts` | 16+ | Framework self-validation, anti-laziness checks | ✓ Complete |

## Coverage Areas

### Pattern Detection Tests (`pattern-detection.test.ts`)

**Tests advanced scenarios beyond basic pattern matching:**

- **Confidence Scoring**
  - High confidence (>0.9) for unambiguous patterns
  - Medium confidence (0.7-0.9) for ambiguous patterns
  - Low confidence (<0.7) when context is unclear

- **False Positive Reduction**
  - Test consolidation (legitimate refactoring)
  - Dead code removal
  - Type narrowing vs validation removal
  - Unit test mocking vs integration over-mocking

- **Pattern Combinations**
  - Compound avoidance detection (multiple patterns)
  - Severity escalation for pattern combinations

- **Edge Cases**
  - Unicode in diffs
  - Very long lines
  - Malformed diffs

### Recovery Protocol Tests (`recovery-protocol.test.ts`)

**Tests the PAUSE→DIAGNOSE→ADAPT→RETRY→ESCALATE protocol:**

- **Protocol Stages**
  - Full PDARE cycle completion
  - Escalation after max attempts
  - State machine transitions

- **Diagnosis Categories**
  - Cognitive overload
  - Misunderstanding
  - Knowledge gap
  - Task complexity

- **Adaptation Strategies**
  - Concrete action step generation
  - Strategy tailored to diagnosis

- **Recovery History**
  - Outcome persistence for learning
  - Cross-session pattern analysis

### Best Output Selection Tests (`best-output-selection.test.ts`)

**Tests non-monotonic quality tracking (REF-015 Self-Refine):**

- **Quality Trajectory Tracking**
  - Quality across iterations
  - Improvement trend detection
  - Degradation detection

- **Peak Selection**
  - Select peak quality over final iteration
  - Tie-breaking (prefer earlier)

- **Degradation Detection**
  - Over-refinement degradation
  - Scope creep degradation
  - Fluctuation handling

- **Selection Reporting**
  - Comprehensive selection reports
  - Quality delta calculation

### Meta-Tests (`meta-tests.test.ts`)

**Validates the framework doesn't exhibit avoidance patterns:**

- **MT-01: No Skipped Tests**
- **MT-02: No Trivial Assertions**
- **MT-03: Coverage Baseline Established**
- **MT-04: Pattern Catalog Validation**
- **MT-05: No Empty Catch Blocks**
- **MT-06: No TODO/FIXME in Critical Paths**
- **MT-07: Implementation Completeness**
- **MT-08: Test Quality Metrics**

## Test Fixtures (`../../../test/fixtures/persistence/`)

Example diffs for pattern detection testing:

| Fixture | Pattern | Purpose |
|---------|---------|---------|
| `test-deletion.diff` | LP-001 | Complete test file deletion |
| `test-skip.diff` | LP-002, LP-003 | Test suite/individual test disabling |
| `assertion-weakening.diff` | LP-012 | Trivial assertion replacement |
| `legitimate-refactor.diff` | False Positive | Valid test consolidation |
| `validation-removal.diff` | LP-006 | Input validation removal |
| `hardcoded-bypass.diff` | LP-015 | Test-specific bypass |
| `error-suppression.diff` | LP-016 | Empty catch / error silencing |
| `feature-flag-disable.diff` | LP-008 | Feature flag disabling |

## Running Tests

```bash
# Run all persistence tests
npm test -- test/unit/persistence/

# Run specific test file
npm test -- test/unit/persistence/pattern-detection.test.ts

# Run with coverage
npm test -- --coverage test/unit/persistence/

# Run meta-tests only
npm test -- test/unit/persistence/meta-tests.test.ts
```

## Test Strategy Alignment

These tests implement sections from `@.aiwg/testing/agent-persistence-test-strategy.md`:

- **Section 2.2**: Unit Tests (70% - 210 tests target)
- **Section 4.3**: Meta-Testing for Anti-Laziness
- **Section 5.2**: Agent Simulation Harness (mocked implementations)

## Dependencies

Tests use:
- **Vitest**: Test framework
- **glob**: File pattern matching (for meta-tests)
- **fs/promises**: File system operations (for meta-tests)

## Path Aliases

Configured in `vitest.config.js`:

```javascript
alias: {
  '@': './src',
  '@sdlc': './agentic/code/frameworks/sdlc-complete/src',
  '@global': './src'
}
```

## Test Conventions

1. **File naming**: `*.test.ts`
2. **Organization**: Nested `describe()` blocks by feature area
3. **Test naming**: Specific, descriptive `it()` descriptions
4. **Assertions**: Specific matchers (`.toBe()`, `.toEqual()`) over generic (`.toBeTruthy()`)
5. **Async**: All async tests use `async/await`

## Coverage Targets

| Metric | Target | Current |
|--------|--------|---------|
| Line Coverage | 80% | TBD |
| Branch Coverage | 75% | TBD |
| Function Coverage | 80% | TBD |

## Next Steps

1. Implement actual Recovery Orchestrator to replace mock
2. Implement Best Output Selector to replace mock
3. Add integration tests (agent-to-agent communication)
4. Add E2E tests (full workflow scenarios)
5. Achieve 80% code coverage on implementation

## Related Files

- `@src/hooks/laziness-detection.ts` - Implementation under test
- `@.aiwg/patterns/laziness-patterns.yaml` - Pattern catalog
- `@.aiwg/testing/agent-persistence-test-strategy.md` - Test strategy
- `@.aiwg/requirements/use-cases/UC-AP-*.md` - Requirements
