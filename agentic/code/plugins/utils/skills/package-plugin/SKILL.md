---
namespace: aiwg
name: package-plugin
platforms: [all]
description: Bundle a single plugin into a distributable marketplace archive, validating metadata and optionally publishing
---

# Package Plugin

You bundle a single plugin into a distributable package for the AIWG marketplace. You validate metadata, create the package archive, and optionally publish to the registry.

## Triggers

Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "bundle the voice plugin for release" → package voice plugin
- "prepare the SDLC plugin for distribution" → package sdlc plugin
- "I want to publish my plugin" → package and optionally publish
- "create the plugin archive" → package without publishing

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| Package plugin | "package plugin sdlc" | Run `aiwg package-plugin sdlc` |
| Bundle plugin | "bundle plugin voice" | Run `aiwg package-plugin voice` |
| Publish plugin | "publish plugin marketing" | Run `aiwg package-plugin marketing --publish` |
| Create package | "create plugin package utils" | Run `aiwg package-plugin utils` |
| Dry run | "validate sdlc plugin before packaging" | Run `aiwg package-plugin sdlc --dry-run` |
| With version bump | "package voice with new version" | Run `aiwg package-plugin voice --bump patch` |

## Behavior

When triggered:

1. **Extract intent**:
   - Which plugin is being packaged?
   - Should it be published after packaging, or just archived locally?
   - Is a version bump needed?
   - Is this a validation dry run?

2. **Run the appropriate command**:

   ```bash
   # Package a plugin (creates archive, no publish)
   aiwg package-plugin sdlc
   aiwg package-plugin voice
   aiwg package-plugin marketing

   # Validate only — no archive created
   aiwg package-plugin sdlc --dry-run

   # Package and publish to marketplace
   aiwg package-plugin sdlc --publish

   # Bump version before packaging
   aiwg package-plugin voice --bump patch
   aiwg package-plugin voice --bump minor

   # Specify output directory
   aiwg package-plugin sdlc --output dist/plugins/
   ```

3. **Report the result** — confirm archive path, included file count, and publish status.

## What the Package Contains

A plugin package archive (`.aiwg-plugin.tar.gz`) includes:

| Contents | Path in Archive |
|----------|----------------|
| Agent definitions | `agents/` |
| Command definitions | `commands/` |
| Skill definitions | `skills/` |
| Rule definitions | `rules/` |
| Plugin manifest | `plugin.json` |
| Changelog | `CHANGELOG.md` (if present) |

Files excluded from packages: `.aiwg/working/`, test fixtures, development-only configs.

## Pre-Package Validation

Before creating the archive, the command automatically runs:

1. `aiwg validate-metadata` — all extension definitions must pass
2. Version format check — must be valid CalVer
3. Manifest completeness — `id`, `name`, `description`, `version` required

Packaging fails if any validation step fails.

## Examples

### Example 1: Package for release

**User**: "Package the voice plugin for release"

**Extraction**: Package voice plugin, no publish

**Action**:
```bash
aiwg package-plugin voice
```

**Response**: "Packaged voice@aiwg v2026.4.0. Archive: dist/plugins/voice-2026.4.0.aiwg-plugin.tar.gz (42 files, 1.2MB). Metadata validation passed. Ready to publish with `aiwg package-plugin voice --publish`."

### Example 2: Validate before packaging

**User**: "Check if the SDLC plugin is ready to package"

**Extraction**: Dry-run validation

**Action**:
```bash
aiwg package-plugin sdlc --dry-run
```

**Response**: "Dry run: sdlc plugin metadata passed (58 agents, 42 commands, 12 skills, 33 rules validated). Ready to package. 1 warning: CHANGELOG.md not found — package will be created without it."

### Example 3: Package and publish in one step

**User**: "Publish the marketing plugin to the marketplace"

**Extraction**: Package and publish marketing plugin

**Action**:
```bash
aiwg package-plugin marketing --publish
```

**Response**: "Packaged and published marketing@aiwg v2026.4.0 to the AIWG marketplace. Archive: dist/plugins/marketing-2026.4.0.aiwg-plugin.tar.gz. Registry updated."

### Example 4: Package with version bump

**User**: "Bump and package the utils plugin with a patch version"

**Extraction**: Bump patch version then package

**Action**:
```bash
aiwg package-plugin utils --bump patch
```

**Response**: "Bumped utils version 2026.3.5 → 2026.4.0. Packaged. Archive: dist/plugins/utils-2026.4.0.aiwg-plugin.tar.gz."

## References

- @$AIWG_ROOT/src/cli/handlers/utilities.ts — Command handler
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference
- @$AIWG_ROOT/docs/contributing/versioning.md — CalVer versioning rules
