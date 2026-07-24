---
namespace: aiwg
name: package-plugin
platforms: [all]
description: Package a built-in or standalone project-local AIWG plugin wrapper for marketplace distribution
triggers:
  - standalone plugin repository
  - publish project-local plugin
  - package project-local plugin
  - community plugin repository
---

# Package Plugin

You validate and package either a built-in marketplace wrapper or a standalone
project-local wrapper. Standalone wrappers are auto-discovered under
`.aiwg/plugins/<name>/` and emitted as deterministic provider archives.

## Triggers

Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "bundle the voice plugin for release" → package voice plugin
- "prepare the SDLC plugin for distribution" → package sdlc plugin
- "create the plugin wrapper" → package the generated provider wrapper
- "publish project-local plugin" → validate and package the repository-local wrapper
- "standalone plugin repository" → use the community/team repository workflow

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| Package plugin | "package plugin sdlc" | Run `aiwg package-plugin sdlc` |
| Bundle plugin | "bundle plugin voice" | Run `aiwg package-plugin voice` |
| Create package | "create plugin package utils" | Run `aiwg package-plugin utils` |
| Dry run | "validate sdlc plugin before packaging" | Run `aiwg package-plugin sdlc --dry-run` |
| Standalone wrapper | "package project-local plugin team-tools" | Run `aiwg package-plugin team-tools --dry-run` |
| Explicit source | "package wrapper from wrappers/team-tools" | Run `aiwg package-plugin team-tools --source wrappers/team-tools` |

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

   # Standalone/project-local wrapper (auto-discovered)
   aiwg package-plugin team-tools --provider all --output dist/plugins

   # Explicit in-repository source
   aiwg package-plugin team-tools --source wrappers/team-tools --provider codex
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

## Standalone repository contract

The wrapper must contain `manifest.json` with `type: plugin` and a
`pluginConfig` declaring `payloadType` and traversal-safe `payloadPath`. The
payload requires its own matching manifest. Sources must remain inside the
current repository; symlink escapes and output collisions are rejected.
Payload files are copied byte-for-byte into deterministic Claude and/or Codex
archives.

See `docs/customization/standalone-plugin-repository.md` for the complete
scaffold, validation, install-smoke, versioning, licensing, and publication
workflow.

## Unsupported legacy examples

`--publish` and `--bump` remain intentionally unsupported. Publish generated
archives through the repository's release workflow and change versions in the
authoritative wrapper/payload manifests before packaging.

## References

- @$AIWG_ROOT/src/cli/handlers/subcommands.ts — Command handler
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference
- @$AIWG_ROOT/docs/contributing/versioning.md — CalVer versioning rules
