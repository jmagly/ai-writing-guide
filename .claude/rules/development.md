---
paths:
  - "src/**"
  - "test/**"
  - "tools/**"
  - "*.ts"
  - "*.js"
  - "*.mjs"
---

# Development Rules

These rules apply when working with TypeScript/JavaScript source code.

## Project Stack

- **Runtime**: Node.js (ESM modules)
- **Language**: TypeScript/JavaScript
- **Package Manager**: npm
- **Test Framework**: Vitest
- **Linting**: ESLint, markdownlint

## Code Conventions

### File Organization

```
src/
├── cli/           # CLI entry points
├── mcp/           # MCP server implementation
├── testing/       # Test utilities and mocks
└── plugin/        # Plugin system

tools/
├── agents/        # Agent deployment scripts
├── lint/          # Markdown linting fixers
├── manifest/      # Manifest generation
└── install/       # Installation scripts

test/
├── unit/          # Unit tests
├── integration/   # Integration tests
└── fixtures/      # Test fixtures
```

### TypeScript Patterns

- Use ESM imports (`import`/`export`)
- Prefer `async`/`await` over raw promises
- Use Zod for schema validation
- Export types alongside implementations

### Testing

```bash
# Run all tests
npm test

# Run specific test file
npx vitest run test/unit/path/to/file.test.ts

# Run with coverage
npx vitest run --coverage
```

### Build

```bash
# Type check
npx tsc --noEmit

# Build
npm run build
```

## CLI Development

### Adding New Commands

1. Add command handler in `src/cli/index.mjs`
2. Add to help text in same file
3. Create implementation module if complex

### MCP Server

The MCP server (`src/mcp/server.mjs`) exposes AIWG capabilities via Model Context Protocol:

- **Tools**: workflow-run, artifact-read, artifact-write, template-render, agent-list
- **Resources**: prompts catalog, templates catalog, agents catalog
- **Prompts**: decompose-task, parallel-execution, recovery-protocol

## Markdown Linting

Custom fixers in `tools/lint/`:

```bash
# Fix table spacing (MD058)
node tools/lint/fix-md58.mjs --target . --write

# Fix code fences (MD031/MD040)
node tools/lint/fix-md-codefences.mjs --target . --write

# Run all lint checks
npm exec markdownlint-cli2 "**/*.md"
```

## Manifest System

Each documented directory has `manifest.json` tracking files:

```bash
# Generate manifest
node tools/manifest/generate-manifest.mjs <dir>

# Enrich manifests with descriptions
node tools/manifest/enrich-manifests.mjs --target . [--write]

# Sync check
node tools/manifest/sync-manifests.mjs --target . --fix
```

Note: `manifest.md` files have been deprecated - `manifest.json` serves the same purpose.

## Agentic Development Anti-Patterns

**Reference**: `@docs/references/REF-003-agentic-development-antipatterns.md`

Avoid these compensatory behaviors that lead to code cruft:

| Anti-Pattern | Symptom | Mitigation |
|--------------|---------|------------|
| **Shotgun Fix** | Multiple variants of same solution | Diagnose root cause before fixing |
| **Abandoned Experiment** | Deprecated code that still runs | Remove or make true no-op |
| **Magic Number Accumulation** | Unexplained numeric constants | Document or extract to config |
| **Defensive Duplication** | Same check in multiple places | Normalize at entry point |
| **Cruft Accumulation** | Backup files, Zone.Identifier | Use `.aiwg/working/`, clean up |

### Pre-Commit Checklist

Before committing fixes:

- [ ] Understood root cause (not just "it works now")
- [ ] Single solution path (no experimental variants left)
- [ ] Magic numbers documented or configurable
- [ ] Temporary files deleted
- [ ] Deprecated code removed (not just warned)

### Recovery Protocol

When stuck in an anti-pattern:

1. **PAUSE** - Stop making more changes
2. **INVENTORY** - List all variants/attempts created
3. **IDENTIFY** - Which ONE actually solved it?
4. **CLEAN** - Remove all others
5. **DOCUMENT** - Why did the working solution work?
