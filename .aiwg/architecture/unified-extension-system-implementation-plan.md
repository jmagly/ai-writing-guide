# Unified Extension System - Implementation Plan

**Document Type:** Technical Implementation Plan
**Status:** Ready for Review
**Version:** 1.0.0
**Created:** 2026-01-22
**Expert Contributors:** Architecture Designer, Code Reviewer, Test Engineer, API Designer

## Executive Summary

This plan transforms AIWG's CLI from a **monolithic command router** (605 lines) into a **dynamic, extensible system** with unified extension management. The refactoring enables:

- **Capability-based discovery**: Find extensions by what they do, not just their name
- **Dynamic help generation**: Help text always in sync with available commands
- **Platform-aware deployment**: Single extension works across Claude, Factory, Cursor, etc.
- **Plugin ecosystem foundation**: Third-party extensions with validation and dependency management

**Total Effort**: 4 phases over ~4 weeks
**Risk Level**: Medium (with TDD mitigation)
**Breaking Changes**: None (backward compatible)

---

## 1. Problem Statement

### Current State

The CLI (`src/cli/index.mjs`, 605 lines) is a **hardcoded monolith**:

| Issue | Impact | Location |
|-------|--------|----------|
| 150-line switch/case | Every new command modifies core | lines 454-603 |
| 58-line COMMAND_ALIASES | Manual maintenance, error-prone | lines 24-82 |
| 107-line hardcoded help | Stale, out of sync with commands | lines 96-202 |
| Embedded handlers | Untestable, tightly coupled | lines 253-434 |
| Duplicate arg parsing | 6+ locations with same pattern | throughout |

### Target State

```
┌─────────────────────────────────────────────────────────────┐
│                    CLI Entry Point                          │
│                     (~50 lines)                             │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│   Router    │   │    Help     │   │   Aliases   │
│  (~100 ln)  │   │  (~100 ln)  │   │   (~60 ln)  │
└──────┬──────┘   └──────┬──────┘   └─────────────┘
       │                 │
       │                 │
       ▼                 ▼
┌─────────────────────────────────────────────────────────────┐
│              Extension Registry (~400 lines)                │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │  types  │  │ loader  │  │validator│  │  index  │        │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Architecture Overview

### 2.1 Module Structure

```
src/
├── cli/
│   ├── index.mjs              # Entry point only (~50 lines)
│   ├── router.mjs             # Registry-based routing (~100 lines)
│   ├── help.mjs               # Generated from registry (~100 lines)
│   ├── aliases.mjs            # Auto-generated aliases (~60 lines)
│   ├── runner.mjs             # Script execution utility (~50 lines)
│   ├── arg-parser.mjs         # Unified argument parsing (~80 lines)
│   ├── errors.mjs             # CLI error classes (~50 lines)
│   └── handlers/              # Command group handlers
│       ├── framework.mjs      # use, list, remove (~100 lines)
│       ├── project.mjs        # new, status, migrate (~80 lines)
│       ├── scaffolding.mjs    # add-agent, scaffold-* (~80 lines)
│       ├── utilities.mjs      # prefill-cards, validate (~100 lines)
│       ├── maintenance.mjs    # doctor, version, update (~60 lines)
│       ├── ralph.mjs          # ralph commands (~80 lines)
│       └── toolsmith.mjs      # runtime-info (~120 lines)
│
├── extensions/                # NEW: Unified extension system
│   ├── types.ts               # Extension type definitions (created)
│   ├── registry.ts            # Extension registry API (~150 lines)
│   ├── loader.ts              # Filesystem discovery (~200 lines)
│   ├── validator.ts           # Schema validation (~150 lines)
│   ├── indexer.ts             # Capability indexing (~100 lines)
│   ├── search.ts              # Semantic search (~100 lines)
│   └── migrate.ts             # Format migration (~100 lines)
│
└── registry/                  # Legacy compatibility (existing)
    └── ... (existing catalog code)
```

### 2.2 Extension Type Hierarchy

The unified `Extension` interface (1329 lines in `src/extensions/types.ts`) supports:

| Type | Metadata Interface | Key Fields |
|------|-------------------|------------|
| `agent` | `AgentMetadata` | role, model, tools, workflow |
| `command` | `CommandMetadata` | template, arguments, options |
| `skill` | `SkillMetadata` | triggerPhrases, autoTrigger |
| `hook` | `HookMetadata` | event, priority, canBlock |
| `tool` | `ToolMetadata` | category, executable, aliases |
| `mcp-server` | `MCPServerMetadata` | transport, capabilities |
| `framework` | `FrameworkMetadata` | domain, includes |
| `addon` | `AddonMetadata` | entry, provides |
| `template` | `TemplateMetadata` | format, variables |
| `prompt` | `PromptMetadata` | category, purpose |

### 2.3 Capability Index

The `CapabilityIndex` enables semantic search:

```typescript
interface CapabilityIndex {
  capabilities: Record<string, string[]>;  // capability → extension IDs
  keywords: Record<string, string[]>;       // keyword → extension IDs
  categories: Record<string, string[]>;     // category → extension IDs
  types: Record<ExtensionType, string[]>;   // type → extension IDs
  platforms: Record<string, string[]>;      // platform → extension IDs
  searchIndex: Record<string, string[]>;    // term → extension IDs
}
```

---

## 3. Implementation Phases

### Phase 1: Extract Without Breaking (Week 1)

**Goal**: Split `cli/index.mjs` into modules with zero behavior change.

#### Tasks

| Task | Output | Lines | Risk |
|------|--------|-------|------|
| Extract COMMAND_ALIASES | `cli/aliases.mjs` | ~60 | Low |
| Extract runScript() | `cli/runner.mjs` | ~50 | Low |
| Extract handleUse | `cli/handlers/framework.mjs` | ~100 | Medium |
| Extract handleRuntimeInfo | `cli/handlers/toolsmith.mjs` | ~120 | Medium |
| Group switch cases | `cli/handlers/*.mjs` | ~400 | Medium |
| Update imports | `cli/index.mjs` | ~50 | Low |

#### Verification

```bash
# All existing commands work identically
npm test
aiwg help
aiwg use sdlc --dry-run
aiwg doctor
```

#### Rollback

Branch: `refactor/cli-extraction`

---

### Phase 2: Create Extension Registry (Week 2)

**Goal**: Build registry infrastructure without yet using it.

#### Tasks

| Task | Output | Lines | Dependencies |
|------|--------|-------|--------------|
| Extension types | `src/extensions/types.ts` | 1329 | **DONE** |
| Extension loader | `src/extensions/loader.ts` | ~200 | types.ts |
| Extension validator | `src/extensions/validator.ts` | ~150 | types.ts |
| Registry API | `src/extensions/registry.ts` | ~150 | loader, validator |
| Capability indexer | `src/extensions/indexer.ts` | ~100 | registry |

#### Registry API

```typescript
// src/extensions/registry.ts
export class ExtensionRegistry {
  // Discovery
  async discover(paths: string[]): Promise<Extension[]>;

  // CRUD
  async register(ext: Extension): Promise<void>;
  async unregister(id: string): Promise<void>;
  async get(id: string): Promise<Extension | null>;
  async list(filter?: ExtensionFilter): Promise<Extension[]>;

  // Search
  async search(query: CapabilityQuery): Promise<CapabilitySearchResult>;

  // Index
  async rebuildIndex(): Promise<void>;
  getIndex(): CapabilityIndex;
}
```

#### Verification

```bash
# Registry can load existing manifests
npm test -- test/unit/extensions/
npm run test:coverage
```

#### Rollback

Branch: `refactor/extension-registry`

---

### Phase 3: Registry-Based Routing (Week 3)

**Goal**: Route commands via registry lookup.

#### Tasks

| Task | Output | Lines | Dependencies |
|------|--------|-------|--------------|
| ArgParser utility | `cli/arg-parser.mjs` | ~80 | None |
| CLIError classes | `cli/errors.mjs` | ~50 | None |
| Help generator | `cli/help.mjs` | ~100 | registry |
| Router update | `cli/router.mjs` | ~120 | registry, handlers |
| Migrate 5 commands | handlers/*.mjs | ~200 | router |

#### Router Implementation

```javascript
// cli/router.mjs
export async function routeCommand(command, args) {
  const registry = await getRegistry();
  const ext = await registry.get(command);

  if (ext?.type === 'command') {
    const handler = await loadHandler(ext);
    return handler.execute(args);
  }

  // Fall back to legacy handlers during migration
  return legacyRoute(command, args);
}
```

#### Verification

```bash
# Both old and new routing work
npm test
aiwg help  # Should show generated help
aiwg --help  # Same output
```

#### Rollback

Branch: `refactor/registry-routing`

---

### Phase 4: Full Integration (Week 4)

**Goal**: All extension types unified, legacy code removed.

#### Tasks

| Task | Output | Lines | Dependencies |
|------|--------|-------|--------------|
| Migrate all commands | handlers/*.mjs | ~300 | Phase 3 |
| Remove switch/case | cli/index.mjs | -150 | All handlers |
| Agent deployment | handlers/framework.mjs | ~50 | registry |
| Skill deployment | handlers/framework.mjs | ~50 | registry |
| Hook support | cli/hooks.mjs | ~100 | registry |
| Update help text | auto-generated | 0 | Phase 3 |

#### Verification

```bash
# Full test suite
npm test
npm run test:coverage  # Must maintain 80%+

# Smoke tests
aiwg help
aiwg use sdlc
aiwg doctor
aiwg version
```

#### Rollback

Branch: `refactor/full-integration`

---

## 4. Test Strategy

### 4.1 Current Test Coverage

| Category | Files | Coverage | Status |
|----------|-------|----------|--------|
| Catalog loader | 1 | 490 lines | Excellent |
| Smith definitions | 1 | 673 lines | Excellent |
| Workflow orchestrator | 1 | 451 lines | Good |
| Extension tests | 1 | 296 lines | Limited |
| **CLI router** | 0 | - | **MISSING** |
| **Extension registry** | 0 | - | **MISSING** |

### 4.2 Tests to Create (TDD Order)

#### Phase 2 Prerequisites

| Test File | Purpose | Priority |
|-----------|---------|----------|
| `test/unit/extensions/types.test.ts` | Type guards work | P0 |
| `test/unit/extensions/validator.test.ts` | Validation rules | P0 |
| `test/unit/extensions/loader.test.ts` | Discovery works | P0 |
| `test/unit/extensions/registry.test.ts` | CRUD operations | P0 |
| `test/unit/extensions/indexer.test.ts` | Search works | P1 |

#### Phase 3 Prerequisites

| Test File | Purpose | Priority |
|-----------|---------|----------|
| `test/unit/cli/arg-parser.test.ts` | Arg parsing | P0 |
| `test/unit/cli/router.test.ts` | Characterization tests | P0 |
| `test/integration/cli-commands.test.ts` | E2E commands | P1 |

### 4.3 At-Risk Tests

| Test | Risk | Mitigation |
|------|------|------------|
| `test/integration/claude-code-deployment.test.ts` | HIGH | Update paths |
| `test/unit/smiths/skillsmith.test.ts` | HIGH | Use registry paths |
| `test/unit/extensions/sdlc-extensions.test.ts` | HIGH | Load from registry |
| `test/unit/cli/workflow-orchestrator.test.ts` | MEDIUM | Verify routing |

### 4.4 Coverage Targets

| Module | Lines | Functions | Branches | Critical |
|--------|-------|-----------|----------|----------|
| `src/extensions/` | 85% | 90% | 75% | 100% |
| `src/cli/router.mjs` | 80% | 90% | 70% | 100% |
| `src/cli/handlers/` | 80% | 90% | 70% | - |

---

## 5. Extracted Patterns

### 5.1 ArgParser (from Code Review)

**Problem**: 6+ locations with duplicate `indexOf`/`slice` patterns.

**Solution**:

```javascript
// src/cli/arg-parser.mjs
export class ArgParser {
  constructor(args) {
    this.args = args;
    this.flags = new Set();
    this.options = new Map();
    this.positional = [];
    this.#parse();
  }

  hasFlag(name) { return this.flags.has(name); }
  getOption(name, defaultValue = null) {
    return this.options.get(name) ?? defaultValue;
  }
  getPositional(index) { return this.positional[index]; }
}
```

### 5.2 CLIError (from Code Review)

**Problem**: Inconsistent error handling across commands.

**Solution**:

```javascript
// src/cli/errors.mjs
export class CLIError extends Error {
  constructor(message, { suggestion, exitCode = 1 } = {}) {
    super(message);
    this.suggestion = suggestion;
    this.exitCode = exitCode;
  }
}

export function handleCLIError(error) {
  if (error instanceof CLIError) {
    console.error(`Error: ${error.message}`);
    if (error.suggestion) console.log(error.suggestion);
    process.exit(error.exitCode);
  }
  // ... generic handling
}
```

### 5.3 Command Registry (from Architecture)

**Problem**: 150-line switch/case monolith.

**Solution**:

```javascript
// src/cli/router.mjs
const COMMAND_REGISTRY = new Map([
  ['use', { handler: handleUse, type: 'inline' }],
  ['list', { handler: 'tools/plugin/plugin-status-cli.mjs', type: 'script' }],
  ['mcp', { handler: () => import('../mcp/cli.mjs'), type: 'module' }],
]);

export async function routeCommand(command, args) {
  const config = COMMAND_REGISTRY.get(command);
  if (!config) throw new CLIError(`Unknown command: ${command}`);
  // ... dispatch based on type
}
```

### 5.4 Auto-Generated Aliases (from Code Review)

**Problem**: 58 lines of manual alias maintenance.

**Solution**:

```javascript
// src/cli/aliases.mjs
function generateAliases(commands) {
  const aliases = {};
  for (const cmd of commands) {
    aliases[cmd] = cmd;
    aliases[`-${cmd}`] = cmd;
    aliases[`--${cmd}`] = cmd;
  }
  return aliases;
}

export const COMMAND_ALIASES = generateAliases([
  'new', 'status', 'use', 'doctor', 'version', 'help', /* ... */
]);
```

---

## 6. Migration Paths

### 6.1 Manifest Migration

Existing formats automatically converted to unified schema:

| Source Format | Migration Function | Status |
|---------------|-------------------|--------|
| Agent frontmatter | `migrateAgentFrontmatter()` | Defined |
| Command frontmatter | `migrateCommandFrontmatter()` | Defined |
| Skill YAML | `migrateSkillYAML()` | Planned |
| manifest.json v1 | `migrateManifestV1()` | Defined |

### 6.2 Backward Compatibility

During migration, both systems run in parallel:

```javascript
async function routeCommand(command, args) {
  // Try new registry first
  const ext = await registry.get(command);
  if (ext) return newHandler(ext, args);

  // Fall back to legacy switch/case
  return legacyRoute(command, args);
}
```

### 6.3 Deprecation Timeline

| Item | Deprecated | Removed |
|------|------------|---------|
| Legacy switch/case | Phase 3 | Phase 4 |
| Manual COMMAND_ALIASES | Phase 3 | Phase 4 |
| Hardcoded help text | Phase 3 | Phase 4 |

---

## 7. Risk Mitigation

### 7.1 Breaking Change Prevention

| Strategy | Implementation |
|----------|----------------|
| Parallel routing | Old + new systems during migration |
| Alias preservation | Aliases moved to command metadata |
| Script path compatibility | `runScript()` unchanged |
| Phased rollout | Each phase independently testable |

### 7.2 Rollback Strategy

Each phase creates a separate branch:

```bash
main
├── refactor/cli-extraction      # Phase 1
├── refactor/extension-registry  # Phase 2
├── refactor/registry-routing    # Phase 3
└── refactor/full-integration    # Phase 4
```

If issues arise, revert to previous phase branch.

### 7.3 Feature Flags

```bash
# Enable new router for testing
AIWG_USE_NEW_ROUTER=1 aiwg use sdlc

# Force legacy mode
AIWG_LEGACY_MODE=1 aiwg help
```

---

## 8. Success Metrics

### 8.1 Code Quality

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| Max file size | 605 lines | ~150 lines | ≤200 |
| CLI entry point | 605 lines | ~50 lines | ≤60 |
| Test coverage | 0% (CLI) | 80%+ | 80% |
| Cyclomatic complexity | High | Low | ≤10 |

### 8.2 Functionality

| Metric | Before | After |
|--------|--------|-------|
| Adding new command | Modify 3 files | Add manifest only |
| Help text freshness | Manual sync | Auto-generated |
| Extension discovery | Hardcoded paths | Semantic search |
| Platform support | Per-command | Per-extension |

### 8.3 Developer Experience

| Metric | Before | After |
|--------|--------|-------|
| Time to add command | ~30 min | ~5 min |
| Test isolation | Impossible | Full mocking |
| Error messages | Inconsistent | Standardized |
| Documentation | Manual | Generated |

---

## 9. Deliverables Summary

### Created (This Analysis)

| Artifact | Location | Status |
|----------|----------|--------|
| Extension types | `src/extensions/types.ts` | Complete |
| Extension schema doc | `.aiwg/architecture/unified-extension-schema.md` | Complete |
| Test coverage analysis | `.aiwg/working/extension-system-test-coverage-analysis.md` | Complete |
| Test coverage summary | `.aiwg/working/test-coverage-summary.md` | Complete |
| Implementation plan | `.aiwg/architecture/unified-extension-system-implementation-plan.md` | Complete |

### To Create (Phase 1)

| Artifact | Location | Owner |
|----------|----------|-------|
| CLI aliases module | `src/cli/aliases.mjs` | Developer |
| CLI runner module | `src/cli/runner.mjs` | Developer |
| CLI handlers | `src/cli/handlers/*.mjs` | Developer |
| Unit tests | `test/unit/cli/*.test.ts` | Developer |

### To Create (Phase 2)

| Artifact | Location | Owner |
|----------|----------|-------|
| Extension loader | `src/extensions/loader.ts` | Developer |
| Extension validator | `src/extensions/validator.ts` | Developer |
| Extension registry | `src/extensions/registry.ts` | Developer |
| Registry tests | `test/unit/extensions/*.test.ts` | Developer |

---

## 10. References

### Expert Reports

- **Architecture Designer**: Module structure, dependency graph, migration path
- **Code Reviewer**: Code smells, refactoring opportunities, pattern extraction
- **Test Engineer**: Coverage analysis, at-risk tests, TDD strategy
- **API Designer**: Extension schema, type definitions, validation rules

### Key Files

- `@src/cli/index.mjs` - Current CLI (605 lines, target for refactoring)
- `@src/extensions/types.ts` - New extension types (1329 lines, created)
- `@.aiwg/architecture/unified-extension-schema.md` - Schema documentation
- `@test/unit/catalog/loader.test.ts` - Example of well-tested module

### Related ADRs

- ADR-001: Unified Extension Registry (proposed in this plan)

---

## 11. Next Steps

### Immediate (This Week)

1. **Review this plan** with stakeholders
2. **Create Phase 1 branch**: `git checkout -b refactor/cli-extraction`
3. **Write characterization tests**: Capture current CLI behavior
4. **Begin extraction**: Start with `aliases.mjs` (lowest risk)

### Phase 1 Checklist

- [ ] Create `src/cli/aliases.mjs`
- [ ] Create `src/cli/runner.mjs`
- [ ] Create `src/cli/handlers/framework.mjs`
- [ ] Create `src/cli/handlers/toolsmith.mjs`
- [ ] Create remaining handlers
- [ ] Update `src/cli/index.mjs` to use imports
- [ ] Write unit tests for all handlers
- [ ] Verify all existing tests pass

---

**Document Status**: Ready for Review
**Confidence Level**: HIGH
**Risk Assessment**: Medium (mitigated by TDD approach)
