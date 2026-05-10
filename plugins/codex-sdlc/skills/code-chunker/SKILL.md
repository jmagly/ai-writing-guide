---
namespace: aiwg
name: code-chunker
platforms: [all]
description: Map source file structure into navigable sections with line ranges and summaries for efficient agent navigation

---

# code-chunker

Analyze a source file's structure and produce a navigable map with logical sections, line ranges, and summaries for efficient agent navigation.

## Triggers


Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "map this file" → structural chunking for navigation
- "chunk for navigation" → file structure mapping

## Purpose

Agents encounter large files they cannot immediately refactor — third-party code, generated code, legacy files awaiting decomposition. Without a structural map, agents must read the entire file to find relevant sections, wasting context window space.

The code-chunker produces a "table of contents" for source files, enabling agents to read only the sections they need. The doc-splitter does this for documentation; code-chunker does it for source code.

This skill complements `/decompose-file` — chunker maps files for navigation, decomposer splits them permanently.

## Behavior

When triggered, this skill:

1. **Parse file structure**:
   - Detect language from file extension
   - Identify top-level declarations (functions, classes, interfaces, types, constants)
   - Group related declarations into logical sections
   - Calculate line ranges for each section

2. **Generate section summaries**:
   - For each section, produce a one-line description of its purpose
   - Count key elements (imports, exports, methods, functions)
   - Note dependencies between sections

3. **Produce navigable map**:
   - Output structured map with section names, line ranges, and summaries
   - Include quick-reference commands for reading specific sections
   - Provide grep suggestions for common navigation needs

4. **Cache map** (optional):
   - Store generated map in `.aiwg/working/code-maps/` for reuse during the session
   - Invalidate cache when file modification time changes

## File Map Format

```
File Map: src/extensions/registry.ts (847 lines)

Sections:

  1. Imports and type definitions (lines 1-45)
     — 12 imports, 3 type aliases, 1 interface

  2. ExtensionRegistry class (lines 47-320)
     2a. constructor() — initializes registry with providers (lines 47-85)
     2b. register() — registers an extension by type and name (lines 87-145)
     2c. lookup() — finds extension by name or capability (lines 147-210)
     2d. listByType() — returns all extensions of a given type (lines 212-260)
     2e. unregister() — removes an extension from registry (lines 262-320)

  3. Validation functions (lines 322-480)
     3a. validateExtension() — checks required fields and types (lines 322-390)
     3b. validateManifest() — validates manifest.json schema (lines 392-440)
     3c. checkDependencies() — resolves and validates dependency tree (lines 442-480)

  4. Discovery helpers (lines 482-620)
     4a. discoverExtensions() — scans directories for extensions (lines 482-540)
     4b. globForType() — finds files matching extension type patterns (lines 542-590)
     4c. resolveExtensionPath() — resolves relative paths to absolute (lines 592-620)

  5. Deployment logic (lines 622-847)
     5a. deployToProvider() — deploys extension to a platform provider (lines 622-720)
     5b. buildProviderConfig() — generates provider-specific config (lines 722-790)
     5c. writeDeploymentFiles() — writes files to provider directories (lines 792-847)

Quick Commands:
  Read lines 87-145    → register() method
  Read lines 322-390   → validateExtension()
  Read lines 622-720   → deployToProvider()
  Grep "register"      → 14 matches across sections 2, 3
  Grep "deploy"        → 8 matches in section 5
```

## Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `<file-path>` | Yes | — | File to map |
| `--depth <level>` | No | function | Granularity: `function`, `class`, `block` |
| `--format <type>` | No | map | Output: `map`, `json`, `tree` |
| `--section <n>` | No | — | Read a specific section immediately |
| `--cache` | No | true | Cache map for session reuse |

## Depth Levels

### Function (default)

Maps individual functions and methods:

```
  2b. register() — registers an extension (lines 87-145)
```

### Class

Maps at class/module level only:

```
  2. ExtensionRegistry class (lines 47-320) — 5 methods, 274 lines
```

### Block

Maps at code block level (most granular):

```
  2b-i.   register() parameter validation (lines 87-95)
  2b-ii.  register() type checking (lines 96-120)
  2b-iii. register() storage and indexing (lines 121-145)
```

## Output Formats

### Map (default)

Human-readable section listing with line ranges and summaries. See File Map Format above.

### JSON

```json
{
  "file": "src/extensions/registry.ts",
  "loc": 847,
  "language": "typescript",
  "sections": [
    {
      "id": "1",
      "name": "Imports and type definitions",
      "start": 1,
      "end": 45,
      "summary": "12 imports, 3 type aliases, 1 interface",
      "children": []
    },
    {
      "id": "2",
      "name": "ExtensionRegistry class",
      "start": 47,
      "end": 320,
      "summary": "Main registry class with 5 methods",
      "children": [
        {
          "id": "2a",
          "name": "constructor()",
          "start": 47,
          "end": 85,
          "summary": "Initializes registry with providers"
        }
      ]
    }
  ]
}
```

### Tree

```
src/extensions/registry.ts (847 lines)
├── Imports and types (1-45)
├── ExtensionRegistry (47-320)
│   ├── constructor() (47-85)
│   ├── register() (87-145)
│   ├── lookup() (147-210)
│   ├── listByType() (212-260)
│   └── unregister() (262-320)
├── Validation (322-480)
│   ├── validateExtension() (322-390)
│   ├── validateManifest() (392-440)
│   └── checkDependencies() (442-480)
├── Discovery (482-620)
│   ├── discoverExtensions() (482-540)
│   ├── globForType() (542-590)
│   └── resolveExtensionPath() (592-620)
└── Deployment (622-847)
    ├── deployToProvider() (622-720)
    ├── buildProviderConfig() (722-790)
    └── writeDeploymentFiles() (792-847)
```

## Language Detection

| Extension | Language | Parsing Strategy |
|-----------|----------|-----------------|
| `.ts`, `.tsx` | TypeScript | `export`, `class`, `function`, `interface`, `type`, `const` declarations |
| `.js`, `.jsx`, `.mjs` | JavaScript | `export`, `class`, `function`, `const` declarations |
| `.py` | Python | `class`, `def`, top-level assignments, decorators |
| `.go` | Go | `func`, `type`, `var`, `const` blocks |
| `.rs` | Rust | `fn`, `struct`, `impl`, `mod`, `enum`, `trait` |
| `.java` | Java | `class`, `interface`, `enum`, method declarations |
| Other | Heuristic | Blank lines, comment blocks, indentation patterns |

## Usage Examples

### Basic File Map

```
User: "map src/extensions/registry.ts"

Skill produces the navigable map showing 5 sections with line ranges.
Agent can then read only the section needed:
  "Read lines 87-145 of src/extensions/registry.ts"
```

### Section Navigation

```
User: "/code-chunker src/extensions/registry.ts --section 3"

Skill:
1. Generates map (or uses cached version)
2. Immediately reads and displays section 3 (Validation functions, lines 322-480)

Output: Full content of lines 322-480 with the map as header context.
```

### JSON for Agent Consumption

```
User: "/code-chunker src/large-file.py --format json"

Skill produces JSON map that another agent or script can consume
to programmatically navigate the file.
```

### Auto-Trigger on Large File Read

When an agent attempts to read a file over 300 lines, the code-chunker can be
invoked automatically to provide a map first:

```
Agent reads src/legacy/monolith.ts (920 lines)
→ Auto-chunk: "File is 920 lines. Here's the structure map.
   Which section do you need?"
```

## Integration

This skill uses:
- `agent-friendly-code` rule: Threshold for when to suggest chunking
- `rlm-context-management` rule: Aligns with Rule 2 (programmatic access over full-context loading)
- `/decompose-file` skill: Chunker maps → decomposer splits permanently
- `/codebase-health` command: Identifies files that benefit from chunking

## Output Locations

- Cached maps: `.aiwg/working/code-maps/{filename}-map.json`

## References

- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/rules/agent-friendly-code.md — Thresholds triggering chunker use
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/skills/decompose-file/SKILL.md — Permanent splitting
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/commands/codebase-health.md — File size scanning
