---
namespace: aiwg
name: package-all-plugins
platforms: [all]
description: Batch package every AIWG/Codex marketplace wrapper in the workspace into distributable plugin archives — runs package-plugin for all wrappers at once
---

# Package All Plugins

You run `package-plugin` for every marketplace wrapper in the workspace in a single batch operation. This is **plugin packaging** — it produces AIWG/Codex plugin archives that wrap extension, addon, or framework payloads. It is **not** native/language-toolchain release packaging (Rust crates, `.deb`/`.rpm`, container images, GHCR, or release-asset checksums). For native or full release-pipeline work use `flow-release` / `release-publication-verify`, not this skill.

## Triggers

Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description). These intentionally all name **plugins** so the skill ranks for plugin packaging and not for native release-engineering queries:

- "package all the plugins" → batch package all plugins
- "build all plugin archives" → batch package all plugins
- "bundle all plugins" → batch package all plugins
- "batch package the plugins" → batch package all plugins

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| Package all | "package all plugins" | Run `aiwg package-all-plugins` |
| Bundle all | "bundle all plugins" | Run `aiwg package-all-plugins` |
| Batch package | "batch package plugins" | Run `aiwg package-all-plugins` |
| Dry run all | "validate all plugins before packaging" | Run `aiwg package-all-plugins --dry-run` |

## Behavior

When triggered:

1. **Extract intent**:
   - Which provider wrappers should be generated?
   - Should existing generated output be cleaned first?
   - Is this a dry run (validate only)?

2. **Run the appropriate command**:

   ```bash
   # Package all plugins (archive only, no publish)
   aiwg package-all-plugins

   # Validate all plugins — no archives created
   aiwg package-all-plugins --dry-run

   # Package all Codex wrappers
   aiwg package-all-plugins --provider codex

   # Clean generated output before rebuilding
   aiwg package-all-plugins --clean
   ```

3. **Report the result** — list each marketplace wrapper with its status (packaged, failed, skipped), total count, and any errors.

## Output Format

```
Packaging all plugins (4)...

  sdlc       ✓ generated   agentic/code/plugins/sdlc
  voice      ✓ generated   agentic/code/plugins/voice
  marketing  ✓ generated   agentic/code/plugins/marketing
  utils      ✗ failed      source validation error

Packaged: 3 / 4
Failed:   1 (utils)
```

## Failure Behavior

The batch reports an error and exits non-zero when packaging cannot complete.

## Relationship to `package-plugin`

`package-all-plugins` uses the same packager as `package-plugin`. Supported shared flags are `--provider`, `--clean`, and `--dry-run`.

## Examples

### Example 1: Release preparation

**User**: "Package all plugins for the release"

**Extraction**: Full batch, no publish

**Action**:
```bash
aiwg package-all-plugins
```

**Response**: "Generated 4/4 wrappers under `agentic/code/plugins/`."

### Example 2: Validate everything before tagging

**User**: "Validate all plugins before I tag the release"

**Extraction**: Dry-run requested

**Action**:
```bash
aiwg package-all-plugins --dry-run
```

**Response**: "Dry run: 4 plugins validated. 3 passed. 1 error: utils plugin — soul-blend/SKILL.md missing required field `id`. Fix and re-run."

### Example 3: Package every Codex wrapper

**User**: "Package every plugin for Codex"

**Extraction**: Batch package for Codex

**Action**:
```bash
aiwg package-all-plugins --provider codex
```

**Response**: "Generated every supported Codex plugin wrapper."

### Example 4: Clean rebuild

**User**: "Clean and rebuild all plugin wrappers"

**Extraction**: Clean existing generated output and rebuild

**Action**:
```bash
aiwg package-all-plugins --clean
```

**Response**: "Cleaned and regenerated all supported plugin wrappers."

## Unsupported legacy examples

Earlier skill revisions documented `--publish`, `--bump`, `--output`, `--continue-on-error`, and `--abort-on-error`; the packager never implemented those flags. They are intentionally removed from the command contract. Use the repository release workflow for publication and update authoritative manifests separately before packaging.

## References

- @$AIWG_ROOT/src/cli/handlers/subcommands.ts — Command handler
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/skills/package-plugin/SKILL.md — Single-plugin packaging
