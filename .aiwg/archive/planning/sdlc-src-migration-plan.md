# SDLC Framework src/ Migration Plan

**Date**: 2025-11-25
**Branch**: `refactor/sdlc-framework-src-structure`
**PR Title**: "refactor: relocate SDLC framework scripts to framework src/ directory"

## Overview

Currently, all TypeScript source code lives in the root `src/` directory. This mixes:
1. **Global tooling** (CLI, installation, deployment orchestration) - should stay at root
2. **Writing Guide framework** code - could stay at root or move to a writing framework
3. **SDLC framework** code - should move to `agentic/code/frameworks/sdlc-complete/src/`

This plan standardizes that **framework-specific code lives in `<framework>/src/`**, establishing a pattern for future frameworks.

---

## Module Classification

### GLOBAL (Stay in root `src/`)

These support the global `aiwg` CLI and installation/deployment across all frameworks:

| Directory | Files | Purpose |
|-----------|-------|---------|
| `src/cli/` | `workflow-orchestrator.ts`, `config-loader.ts`, `watch-service.ts`, `git-hooks.ts` | Global CLI orchestration |
| `src/agents/` | `agent-deployer.ts`, `agent-packager.ts`, `agent-validator.ts`, `index.ts`, `types.ts` | Agent deployment across frameworks |
| `src/plugin/` | `framework-detector.ts`, `framework-isolator.ts`, `framework-config-loader.ts`, `workspace-*.ts`, `metadata-validator.ts`, `framework-migration.ts` | Framework/workspace management |

### WRITING GUIDE FRAMEWORK (Stay in root `src/` for now)

These implement the Writing Guide's core validation/optimization features:

| Directory | Files | Purpose |
|-----------|-------|---------|
| `src/writing/` | `validation-engine.ts`, `validation-rules.ts`, `prompt-optimizer.ts`, `prompt-templates.ts`, `voice-analyzer.ts`, `voice-calibration.ts`, `content-diversifier.ts`, `example-generator.ts`, `example-templates.ts`, `pattern-library.ts`, `patterns/` | Writing quality validation |

### SDLC FRAMEWORK (Move to `agentic/code/frameworks/sdlc-complete/src/`)

These implement SDLC-specific functionality:

| Current Location | Files | Purpose |
|-----------------|-------|---------|
| `src/analysis/` | `codebase-analyzer.ts` | UC-003: Intake from codebase |
| `src/traceability/` | `traceability-checker.ts`, `id-extractor.ts`, `matrix-generator.ts` | UC-006: Requirements traceability |
| `src/security/` | `security-validator.ts`, `api-patterns.ts`, `secret-patterns.ts` | UC-011: Security validation |
| `src/orchestration/` | `agent-orchestrator.ts`, `review-synthesizer.ts` | Multi-agent SDLC orchestration |
| `src/git/` | (any git workflow files) | Git workflow orchestration |
| `src/cicd/` | `cicd-integrator.ts` | CI/CD pipeline generation |
| `src/metrics/` | `metrics-collector.ts` | DORA metrics, project tracking |
| `src/monitoring/` | `performance-monitor.ts` | SDLC performance monitoring |
| `src/recovery/` | `error-recovery.ts` | SDLC error recovery |
| `src/testing/` | `nfr-test-generator.ts`, `nfr-ground-truth-corpus.ts`, `performance-profiler.ts`, `trend-analyzer.ts`, `mocks/`, `fixtures/` | SDLC test infrastructure |
| `src/templates/` | (any template files) | SDLC template handling |
| `src/deployment/` | (any deployment files) | SDLC deployment support |

---

## New Directory Structure

### After Migration

```
ai-writing-guide/
├── src/                              # GLOBAL + WRITING GUIDE
│   ├── cli/                          # Global CLI (workflow-orchestrator, config, watch, hooks)
│   ├── agents/                       # Global agent deployment
│   ├── plugin/                       # Global framework/workspace management
│   └── writing/                      # Writing Guide framework code
│
├── agentic/code/frameworks/
│   └── sdlc-complete/
│       ├── src/                      # NEW: SDLC framework TypeScript code
│       │   ├── analysis/
│       │   ├── traceability/
│       │   ├── security/
│       │   ├── orchestration/
│       │   ├── git/
│       │   ├── cicd/
│       │   ├── metrics/
│       │   ├── monitoring/
│       │   ├── recovery/
│       │   ├── testing/
│       │   │   ├── mocks/
│       │   │   └── fixtures/
│       │   ├── templates/
│       │   └── deployment/
│       ├── tsconfig.json             # NEW: Framework-specific TS config
│       ├── agents/
│       ├── commands/
│       ├── templates/
│       ├── flows/
│       └── ...
│
├── test/                             # Test files (mirror src/ structure)
│   ├── unit/
│   │   ├── cli/                      # Tests for global CLI
│   │   ├── agents/                   # Tests for global agents
│   │   ├── plugin/                   # Tests for global plugin
│   │   ├── writing/                  # Tests for writing guide
│   │   └── sdlc/                     # NEW: Tests for SDLC framework
│   │       ├── analysis/
│   │       ├── traceability/
│   │       ├── security/
│   │       └── ...
│   └── integration/
│       └── sdlc/                     # NEW: SDLC integration tests
```

---

## Files Requiring Updates

### Configuration Files

| File | Changes Required |
|------|-----------------|
| `tsconfig.json` | Add `agentic/code/frameworks/sdlc-complete/src/**/*.ts` to `include` |
| `agentic/code/frameworks/sdlc-complete/tsconfig.json` | NEW: Framework-specific config extending root |
| `package.json` | Update any hardcoded `src/` paths if present |
| `vitest.config.ts` | Create or update to include SDLC framework test paths |

### Documentation Files (41 files reference `src/`)

**High Priority (direct src/ references):**

| File | Changes Required |
|------|-----------------|
| `CLAUDE.md` | Update architecture section to describe new structure |
| `docs/CLI_USAGE.md` | Already focuses on CLI - minimal changes |
| `agentic/code/frameworks/sdlc-complete/README.md` | Add `src/` section describing framework code |
| `agentic/code/frameworks/sdlc-complete/.aiwg-structure.md` | Update to include `src/` directory |

**Medium Priority (implementation reports - update paths):**

| File | Changes Required |
|------|-----------------|
| `.aiwg/reports/construction-phase-final-report.md` | Update file paths |
| `.aiwg/reports/week6-*.md` | Update file paths |
| `.aiwg/reports/week7-*.md` | Update file paths |
| `.aiwg/gates/construction-ioc*/` | Update file paths in assessments |
| `IMPLEMENTATION_SUMMARY_*.md` | Update file paths |

**Low Priority (use-case docs - reference updates):**

| File | Changes Required |
|------|-----------------|
| `.aiwg/requirements/use-cases/UC-003-*.md` | Update implementation paths |
| `.aiwg/requirements/use-cases/UC-006-*.md` | Update implementation paths |
| `.aiwg/requirements/use-cases/UC-011-*.md` | Update implementation paths |

### Test Files

| Current Location | New Location |
|-----------------|--------------|
| `test/unit/analysis/` | `test/unit/sdlc/analysis/` |
| `test/unit/traceability/` | `test/unit/sdlc/traceability/` |
| `test/unit/security/` | `test/unit/sdlc/security/` |
| `test/unit/orchestration/` | `test/unit/sdlc/orchestration/` |
| `test/unit/git/` | `test/unit/sdlc/git/` |
| `test/unit/testing/` | `test/unit/sdlc/testing/` |
| `test/unit/plugin/` | Keep (global) |
| `test/unit/cli/` | Keep (global) |
| `test/unit/agents/` | Keep (global) |
| `test/unit/writing/` | Keep (global/writing guide) |
| `test/unit/templates/` | `test/unit/sdlc/templates/` |
| `test/unit/deployment/` | `test/unit/sdlc/deployment/` |

### Import Path Updates

All moved files will need import path updates:
- Relative imports within SDLC framework stay relative
- Cross-framework imports use absolute paths or aliases
- Test files update to new source locations

---

## Migration Steps

### Phase 1: Setup (PR #1)

1. Create branch `refactor/sdlc-framework-src-structure`
2. Create `agentic/code/frameworks/sdlc-complete/src/` directory
3. Create `agentic/code/frameworks/sdlc-complete/tsconfig.json`
4. Update root `tsconfig.json` to include new path
5. Create/update `vitest.config.ts` if needed

### Phase 2: Move SDLC Code (PR #1 continued)

1. Move directories (preserving git history):
   ```bash
   git mv src/analysis agentic/code/frameworks/sdlc-complete/src/
   git mv src/traceability agentic/code/frameworks/sdlc-complete/src/
   git mv src/security agentic/code/frameworks/sdlc-complete/src/
   git mv src/orchestration agentic/code/frameworks/sdlc-complete/src/
   git mv src/git agentic/code/frameworks/sdlc-complete/src/
   git mv src/cicd agentic/code/frameworks/sdlc-complete/src/
   git mv src/metrics agentic/code/frameworks/sdlc-complete/src/
   git mv src/monitoring agentic/code/frameworks/sdlc-complete/src/
   git mv src/recovery agentic/code/frameworks/sdlc-complete/src/
   git mv src/testing agentic/code/frameworks/sdlc-complete/src/
   git mv src/templates agentic/code/frameworks/sdlc-complete/src/
   git mv src/deployment agentic/code/frameworks/sdlc-complete/src/
   ```

2. Update all import paths in moved files

3. Verify TypeScript compilation: `npm run build`

### Phase 3: Move Tests (PR #1 continued)

1. Create `test/unit/sdlc/` directory
2. Move corresponding test directories
3. Update import paths in test files
4. Verify tests pass: `npm test`

### Phase 4: Documentation Updates (PR #1 continued)

1. Update `CLAUDE.md` architecture section
2. Update `agentic/code/frameworks/sdlc-complete/README.md`
3. Update `.aiwg-structure.md`
4. Update implementation reports (bulk find/replace)

### Phase 5: Validation

1. Run full test suite
2. Run TypeScript compilation
3. Test `aiwg -deploy-agents --mode sdlc`
4. Test `aiwg -new` scaffolding
5. Verify no broken imports

---

## Acceptance Criteria

- [ ] All SDLC-specific code moved to `agentic/code/frameworks/sdlc-complete/src/`
- [ ] Global CLI/deployment code remains in root `src/`
- [ ] Writing Guide code remains in root `src/writing/`
- [ ] All TypeScript compiles without errors
- [ ] All tests pass (or known failures documented)
- [ ] Documentation updated to reflect new structure
- [ ] `aiwg` CLI commands work correctly
- [ ] Pattern documented for future framework additions

---

## Future Considerations

### Writing Guide Framework

If the Writing Guide becomes a separate framework, it could move to:
```
agentic/content/frameworks/writing-guide/src/
```

For now, keeping in root `src/writing/` is appropriate since it's the "default" framework.

### Framework Discovery

The `src/plugin/framework-detector.ts` should be updated to:
1. Look for `<framework>/src/` when detecting frameworks
2. Support framework-specific build/test commands
3. Handle framework dependencies

### Shared Code

If code is truly shared between frameworks, consider:
- `src/shared/` for common utilities
- Or npm package extraction for reusable components

---

## Estimated Effort

| Task | Estimated Hours |
|------|-----------------|
| Setup (tsconfig, directories) | 1h |
| Move SDLC code + fix imports | 2-3h |
| Move tests + fix imports | 1-2h |
| Documentation updates | 1-2h |
| Validation and testing | 1h |
| **Total** | **6-9h** |

---

## Document Control

| Field | Value |
|-------|-------|
| **Author** | Claude Code |
| **Status** | DRAFT - Pending Review |
| **Next Action** | Create branch and begin Phase 1 |
