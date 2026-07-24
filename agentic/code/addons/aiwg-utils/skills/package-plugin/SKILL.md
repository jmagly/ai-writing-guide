---
namespace: aiwg
name: package-plugin
platforms: [all]
description: Build one built-in AIWG marketplace wrapper for a selected provider with optional clean and dry-run modes
---

# Package Plugin

You build a single built-in marketplace delivery wrapper under AIWG's generated plugin directory. The public CLI accepts a positional wrapper name and normalizes it to the internal packager contract.

## Triggers

Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "bundle the voice plugin for release" → package voice plugin
- "prepare the SDLC plugin for distribution" → package sdlc plugin
- "create the plugin wrapper" → package the generated provider wrapper

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| Package plugin | "package plugin sdlc" | Run `aiwg package-plugin sdlc` |
| Bundle plugin | "bundle plugin voice" | Run `aiwg package-plugin voice` |
| Create package | "create plugin package utils" | Run `aiwg package-plugin utils` |
| Dry run | "validate sdlc plugin before packaging" | Run `aiwg package-plugin sdlc --dry-run` |

## Behavior

When triggered:

1. **Extract intent**:
   - Which delivery wrapper is being packaged?
   - Which provider wrapper is needed?
   - Should existing generated output be cleaned first?
   - Is this a validation dry run?

2. **Run the appropriate command**:

   ```bash
   # Package a marketplace wrapper (creates archive, no publish)
   aiwg package-plugin sdlc
   aiwg package-plugin voice
   aiwg package-plugin marketing

   # Validate only — no archive created
   aiwg package-plugin sdlc --dry-run

   # Build one provider-specific wrapper
   aiwg package-plugin sdlc --provider codex

   # Clean generated output before rebuilding
   aiwg package-plugin sdlc --clean
   ```

3. **Report the result** — confirm generated wrapper path and included file counts.

## What the Package Contains

A generated plugin wrapper includes provider metadata plus the selected payload files:

| Contents | Path in Archive |
|----------|----------------|
| Agent definitions | `agents/` |
| Command definitions | `commands/` |
| Skill definitions | `skills/` |
| Rule definitions | `rules/` |
| Delivery manifest | `plugin.json` |
| Changelog | `CHANGELOG.md` (if present) |

Files excluded from packages: `.aiwg/working/`, test fixtures, development-only configs.

## Pre-Package Validation

Before creating the archive, the command automatically runs:

1. `aiwg validate-metadata` — all extension definitions must pass
2. Version format check — must be valid CalVer
3. Delivery manifest completeness — `id`, `name`, `description`, `version` required

Packaging fails if any validation step fails.

## Examples

### Example 1: Package for release

**User**: "Package the voice plugin for release"

**Extraction**: Package voice plugin, no publish

**Action**:
```bash
aiwg package-plugin voice
```

**Response**: "Generated the voice marketplace wrapper under `agentic/code/plugins/voice`."

### Example 2: Validate before packaging

**User**: "Check if the SDLC plugin is ready to package"

**Extraction**: Dry-run validation

**Action**:
```bash
aiwg package-plugin sdlc --dry-run
```

**Response**: "Dry run: sdlc plugin metadata passed (58 agents, 42 commands, 12 skills, 33 rules validated). Ready to package. 1 warning: CHANGELOG.md not found — package will be created without it."

### Example 3: Package for Codex

**User**: "Build the marketing plugin for Codex"

**Extraction**: Package marketing for the Codex provider

**Action**:
```bash
aiwg package-plugin marketing --provider codex
```

**Response**: "Generated the Codex marketing wrapper under `agentic/code/plugins/marketing`."

### Example 4: Clean rebuild

**User**: "Clean and rebuild the utils plugin"

**Extraction**: Remove prior generated output, then package

**Action**:
```bash
aiwg package-plugin utils --clean
```

**Response**: "Cleaned and regenerated the utils wrapper."

## Unsupported legacy examples

Earlier skill revisions documented `--publish`, `--bump`, and `--output`, but the public packager never implemented those flags. They are intentionally not accepted. Publish generated wrappers through the repository's release workflow, change versions in their authoritative manifests before packaging, and use the fixed generated plugin directory until a standalone packaging workflow is selected.

## References

- @$AIWG_ROOT/src/cli/handlers/subcommands.ts — Command handler
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference
- @$AIWG_ROOT/docs/contributing/versioning.md — CalVer versioning rules
