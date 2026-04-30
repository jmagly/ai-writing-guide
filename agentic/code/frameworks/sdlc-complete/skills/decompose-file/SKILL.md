---
namespace: aiwg
name: decompose-file
platforms: [all]
description: Analyze large source files and produce decomposition plans, optionally executing refactoring with import updates and test verification

---

# decompose-file

Analyze a large source file and produce a concrete decomposition plan, optionally executing the refactoring with import updates and test verification.

## Triggers


Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "this file is too large" → file decomposition trigger
- "split into modules" → modular decomposition

## Purpose

When `/codebase-health` identifies files exceeding agent-friendly thresholds (300 LOC warning, 500 LOC error), this skill provides guided decomposition. It analyzes file structure, identifies logical groupings, maps internal dependencies, proposes a split plan, and optionally executes the refactoring.

The doc-splitter skill handles documentation splitting. This skill handles source code splitting — a fundamentally different problem requiring dependency analysis, import rewiring, and test verification.

## Behavior

When triggered, this skill:

1. **Analyze file structure**:
   - Parse the file to identify logical sections (classes, function groups, export clusters)
   - Measure each section's size in LOC
   - Identify the file's primary language and applicable parsing strategy
   - Report current file size vs. agent-friendly thresholds

2. **Map internal dependencies**:
   - Trace references between identified sections
   - Identify shared state (module-level variables, constants)
   - Detect circular dependency risks in proposed splits
   - Catalog all exports and their consumers

3. **Propose split plan**:
   - Assign each section to a proposed output file
   - Name output files descriptively (no generic names)
   - Ensure each output file is under the warning threshold (300 LOC)
   - Include shared dependencies in the most logical location
   - Add a purpose statement for each proposed file

4. **Show dependency graph**:
   - Visualize which proposed modules depend on which
   - Verify no circular dependencies exist
   - Show import direction between new modules

5. **Execute refactoring** (if `--execute` or user approves):
   - Create new files with proper imports
   - Update the original file to re-export if needed for backward compatibility
   - Find and update all import statements across the codebase
   - Add module-level purpose statements to each new file
   - Run tests to verify no breakage

## Analysis Strategies

### Language-Specific Parsing

| Language | Strategy | Boundaries |
|----------|----------|------------|
| TypeScript/JavaScript | AST via function/class/export declarations | `export`, `class`, `function`, `const` |
| Python | AST via `ast` module | `class`, `def`, top-level assignments |
| Go | Package-level function/type declarations | `func`, `type`, `var` blocks |
| Rust | `mod`, `fn`, `struct`, `impl` blocks | Module and impl boundaries |
| Java | Class and method declarations | `class`, `interface`, `enum` |

### Heuristic Fallback

For unsupported languages or when AST parsing is unavailable:

1. **Blank line groups** — consecutive blank lines often separate logical sections
2. **Comment blocks** — section header comments (`// --- Section Name ---`)
3. **Indentation changes** — top-level declarations at zero indentation
4. **Export clusters** — groups of exports at file end

## Decomposition Plan Format

```
Decomposition Plan for src/extensions/registry.ts (847 lines)

Current Structure:
  1. Imports and type definitions (lines 1-45)
  2. ExtensionRegistry class (lines 47-320)
     2a. Constructor and initialization (lines 47-85)
     2b. register() — registers an extension (lines 87-145)
     2c. lookup() — finds extension by name (lines 147-210)
     2d. listByType() — returns extensions of a type (lines 212-260)
     2e. unregister() — removes an extension (lines 262-320)
  3. Validation functions (lines 322-480)
     3a. validateExtension() (lines 322-390)
     3b. validateManifest() (lines 392-440)
     3c. checkDependencies() (lines 442-480)
  4. Discovery helpers (lines 482-620)
  5. Deployment logic (lines 622-847)

Proposed Split:

  1. src/extensions/registry.ts (185 lines)
     — ExtensionRegistry class (core registration, lookup, list, unregister)
     — Imports from: validation, discovery, deployment

  2. src/extensions/extension-validator.ts (160 lines)
     — validateExtension(), validateManifest(), checkDependencies()
     — No internal dependencies

  3. src/extensions/extension-discovery.ts (140 lines)
     — discoverExtensions(), globForType(), resolveExtensionPath()
     — Imports from: extension-validator

  4. src/extensions/extension-deployer.ts (227 lines)
     — deployToProvider(), buildProviderConfig(), writeDeploymentFiles()
     — Imports from: registry, extension-validator

Dependency Graph:
  registry → extension-validator
  registry → extension-discovery
  registry → extension-deployer
  extension-discovery → extension-validator
  extension-deployer → registry, extension-validator

Circular Dependencies: NONE ✓

All proposed files under 300 LOC warning threshold ✓
```

## Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `<file-path>` | Yes | — | File to decompose |
| `--max-lines <n>` | No | 300 | Target max lines per output file |
| `--dry-run` | No | true | Show plan without executing |
| `--execute` | No | false | Execute the plan automatically |
| `--language <lang>` | No | auto-detect | Override language detection |
| `--strategy <type>` | No | auto | `function`, `class`, or `responsibility` |
| `--preserve-exports` | No | true | Maintain backward-compatible re-exports |

## Execution Workflow

When `--execute` is used:

```
┌─────────────────────────────────────────────┐
│ 1. ANALYZE                                   │
│    • Parse file structure                    │
│    • Identify logical sections               │
│    • Map dependencies                        │
└──────────────┬──────────────────────────────┘
               ▼
┌─────────────────────────────────────────────┐
│ 2. PLAN                                      │
│    • Propose split into N files              │
│    • Verify no circular dependencies         │
│    • Show plan to user                       │
└──────────────┬──────────────────────────────┘
               ▼
┌─────────────────────────────────────────────┐
│ 3. EXECUTE                                   │
│    • Create new files with content           │
│    • Add purpose statements                  │
│    • Update original file (re-exports)       │
└──────────────┬──────────────────────────────┘
               ▼
┌─────────────────────────────────────────────┐
│ 4. REWIRE                                    │
│    • Find all imports of original file       │
│    • Update to point to new modules          │
│    • Handle re-exports for compat            │
└──────────────┬──────────────────────────────┘
               ▼
┌─────────────────────────────────────────────┐
│ 5. VERIFY                                    │
│    • Run tests                               │
│    • Check for import errors                 │
│    • Report pass/fail                        │
└─────────────────────────────────────────────┘
```

## Usage Examples

### Dry Run (Default)

```
User: "decompose src/extensions/registry.ts"

Skill analyzes the file and produces:
- Current structure map with line ranges
- Proposed split into 4 files
- Dependency graph
- Verification: no circular dependencies

Output shows the plan without making changes.
```

### Execute with Verification

```
User: "/decompose-file src/extensions/registry.ts --execute"

Skill:
1. Analyzes and shows plan
2. Creates 4 new files
3. Updates registry.ts to re-export for compatibility
4. Finds 23 files importing from registry.ts
5. Updates imports to point to specific modules
6. Runs test suite: 247 passed, 0 failed ✓

Output:
"Decomposition complete. 1 file (847 lines) → 4 files (avg 178 lines).
 All tests passing. 23 import statements updated."
```

### Custom Strategy

```
User: "/decompose-file src/services/user-service.ts --strategy class --max-lines 200"

Skill splits by class boundaries, targeting 200 lines per output file.
```

## Error Handling

### File Too Small

```
File src/utils/helper.ts is 85 lines — below the warning threshold (300).
No decomposition needed. Use --max-lines to override if desired.
```

### Circular Dependencies Detected

```
⚠ Proposed split would create circular dependency:
  module-a → module-b → module-a

Suggestions:
1. Extract shared code into a common module
2. Merge module-a and module-b sections
3. Use dependency injection to break the cycle

Adjusted plan: [shows revised plan]
```

### Tests Fail After Split

```
🚫 Tests failed after decomposition.

Failures:
  test/unit/registry.test.ts:42 — Cannot find module './registry'

Root cause: Import path not updated in test file.
Fix: Updating test imports...

Re-running tests: 247 passed, 0 failed ✓
```

## Integration

This skill uses:
- `agent-friendly-code` rule: Target thresholds for output file sizes
- `agent-generation-guardrails` rule: Prevents creating new large files during split
- `executable-feedback` rule: Runs tests after execution to verify no breakage
- `anti-laziness` rule: Does not skip the split because it is complex
- `/codebase-health` command: Identifies candidates for decomposition

## Output Locations

- Decomposition plan: `.aiwg/working/decompose-{filename}-{date}.md`
- New source files: Same directory as original file (or user-specified)

## References

- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/rules/agent-friendly-code.md — Threshold definitions
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/rules/agent-generation-guardrails.md — Runtime guardrails
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/rules/executable-feedback.md — Test after changes
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/commands/codebase-health.md — Identifies candidates
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/skills/code-chunker/SKILL.md — Navigate large files before splitting
