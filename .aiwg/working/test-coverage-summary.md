# Extension System Test Coverage - Quick Reference

**Date**: 2026-01-22
**Context**: UC-010 Extension Registry Architecture

---

## TL;DR

✅ **Strong foundation**: Catalog loader and Smith patterns have excellent test coverage
⚠️ **Critical gap**: No extension registry or CLI router tests yet
🎯 **Strategy**: TDD - Write registry tests first, then refactor with safety net

---

## Test Files by Risk Level

### Will Break (HIGH RISK)

| File | Lines | Why | Fix |
|------|-------|-----|-----|
| `test/integration/claude-code-deployment.test.ts` | ? | Hardcoded paths | Update expected paths |
| `test/integration/factory-deployment.test.ts` | ? | Hardcoded paths | Update expected paths |
| `test/unit/smiths/skillsmith.test.ts` | 179 | Tests `.claude/skills` paths | Use registry paths |
| `test/unit/extensions/sdlc-extensions.test.ts` | 296 | Hardcoded extension path | Load from registry |

### May Break (MEDIUM RISK)

| File | Lines | Why | Fix |
|------|-------|-----|-----|
| `test/unit/cli/workflow-orchestrator.test.ts` | 451 | Calls CLI commands | Verify routing works |
| `test/unit/plugin/plugin-status.test.ts` | ? | Directory structure | Verify detection works |

### Safe (LOW RISK)

| File | Lines | Why | Fix |
|------|-------|-----|-----|
| `test/unit/catalog/loader.test.ts` | 490 | Well-isolated mocks | None needed |
| `test/unit/smithing/agentic-definition.test.ts` | 673 | Schema validation | None needed |

---

## Tests to Create (TDD Order)

### Phase 1: Core Registry

1. `test/unit/registry/extension-registry.test.ts` - Discovery, registration, loading
2. `test/unit/registry/extension-manifest.test.ts` - Schema validation
3. `test/unit/registry/extension-handler.test.ts` - Handler execution
4. `test/unit/registry/extension-discovery.test.ts` - Discovery mechanism

### Phase 2: CLI Router

5. `test/unit/cli/router.test.ts` - Characterization tests (capture current behavior)
6. `test/integration/extension-lifecycle.test.ts` - Full lifecycle tests
7. `test/integration/extension-conflicts.test.ts` - Conflict resolution

### Phase 3: Support Infrastructure

8. `test/fixtures/extensions/` - Valid/invalid extension fixtures
9. `test/factories/extension-factory.ts` - Dynamic test data
10. `test/mocks/extension-registry.mock.ts` - Mock registry

---

## Coverage Targets

| Module | Lines | Functions | Branches | Critical |
|--------|-------|-----------|----------|----------|
| Overall | 80% | 90% | 70% | - |
| Extension Registry | 85% | 90% | 75% | 100% |
| CLI Router | 80% | 90% | 70% | 100% |

**Critical Paths** (100% required):
- Extension manifest validation
- Command routing logic
- Conflict resolution
- Dependency resolution
- Error handling

---

## Refactoring Checklist

### Pre-Refactoring

- [ ] Create extension registry tests (TDD)
- [ ] Create CLI router characterization tests
- [ ] Create test fixtures and factories
- [ ] Verify all existing tests pass (baseline)

### During Refactoring

- [ ] Run tests after each change
- [ ] Maintain 80%+ coverage
- [ ] Update at-risk tests incrementally
- [ ] Keep CLI behavior identical

### Post-Refactoring

- [ ] All tests pass
- [ ] Coverage meets targets
- [ ] Integration tests pass
- [ ] Smoke tests pass

---

## Key Test Patterns

### Good Examples to Follow

**Catalog Loader** (`test/unit/catalog/loader.test.ts`):
- ✅ Comprehensive mocking (fs, fs/promises)
- ✅ Tests all scenarios (builtin, discovered, custom)
- ✅ Tests merge priority correctly
- ✅ Tests search and filters
- ✅ 490 lines, excellent coverage

**Smith Definitions** (`test/unit/smithing/agentic-definition.test.ts`):
- ✅ Schema validation
- ✅ Real file loading (with graceful skip)
- ✅ All edge cases covered
- ✅ 673 lines, comprehensive

**Workflow Orchestrator** (`test/unit/cli/workflow-orchestrator.test.ts`):
- ✅ Integration-style unit tests
- ✅ File creation/cleanup
- ✅ Progress callback testing
- ✅ 451 lines, thorough

---

## Quick Command Reference

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test test/unit/catalog/loader.test.ts

# Run tests in watch mode
npm run test:watch

# Run only extension tests (after creating)
npm test -- test/unit/registry/

# Check coverage thresholds
npm run test:coverage -- --reporter=text-summary
```

---

## Next Steps

1. **Review full analysis**: @.aiwg/working/extension-system-test-coverage-analysis.md
2. **Create registry tests**: Start with `extension-registry.test.ts` (TDD)
3. **Create CLI characterization tests**: Capture current behavior
4. **Begin refactoring**: With tests as safety net

---

**Status**: Ready to Begin
**Confidence**: HIGH - Strong test foundation
