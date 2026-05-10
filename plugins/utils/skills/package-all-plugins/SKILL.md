---
namespace: aiwg
name: package-all-plugins
platforms: [all]
description: Batch package every plugin in the workspace in a single release-prep operation
---

# Package All Plugins

You run `package-plugin` for every plugin in the workspace in a single batch operation. Used for release preparation to generate all plugin packages at once.

## Triggers

Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "package everything for the release" → batch package all plugins
- "build all plugin archives" → batch package all plugins
- "release prep — package the plugins" → batch package all plugins
- "bundle all the plugins before tagging" → batch package all plugins

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| Package all | "package all plugins" | Run `aiwg package-all-plugins` |
| Bundle all | "bundle all plugins" | Run `aiwg package-all-plugins` |
| Publish all | "publish all plugins" | Run `aiwg package-all-plugins --publish` |
| Batch package | "batch package plugins" | Run `aiwg package-all-plugins` |
| Dry run all | "validate all plugins before packaging" | Run `aiwg package-all-plugins --dry-run` |
| Skip failures | "package all, skip broken ones" | Run `aiwg package-all-plugins --continue-on-error` |

## Behavior

When triggered:

1. **Extract intent**:
   - Should packages be published after creation, or archived locally only?
   - Should the batch abort on first failure, or continue and report all failures?
   - Is this a dry run (validate only)?

2. **Run the appropriate command**:

   ```bash
   # Package all plugins (archive only, no publish)
   aiwg package-all-plugins

   # Validate all plugins — no archives created
   aiwg package-all-plugins --dry-run

   # Package and publish all to marketplace
   aiwg package-all-plugins --publish

   # Continue on individual failures, report all at end
   aiwg package-all-plugins --continue-on-error

   # Specify output directory for all archives
   aiwg package-all-plugins --output dist/plugins/

   # Bump all versions before packaging
   aiwg package-all-plugins --bump patch
   ```

3. **Report the result** — list each plugin with its status (packaged, failed, skipped), total count, and any errors.

## Output Format

```
Packaging all plugins (4)...

  sdlc       ✓ packaged   dist/plugins/sdlc-2026.4.0.aiwg-plugin.tar.gz
  voice      ✓ packaged   dist/plugins/voice-2026.4.0.aiwg-plugin.tar.gz
  marketing  ✓ packaged   dist/plugins/marketing-2026.4.0.aiwg-plugin.tar.gz
  utils      ✗ failed     validate-metadata: 1 error in soul-blend/SKILL.md

Packaged: 3 / 4
Failed:   1 (utils)
```

## Failure Behavior

By default (`--abort-on-error`), the batch stops at the first failure and reports the error. Use `--continue-on-error` to package all plugins and collect all errors for a single remediation pass.

## Relationship to `package-plugin`

`package-all-plugins` is a thin loop over `package-plugin`. Each plugin runs through the same validation and packaging logic as a single `package-plugin` call. Flags like `--dry-run`, `--publish`, and `--bump` are forwarded to each plugin invocation.

## Examples

### Example 1: Release preparation

**User**: "Package all plugins for the release"

**Extraction**: Full batch, no publish

**Action**:
```bash
aiwg package-all-plugins
```

**Response**: "Packaged 4/4 plugins. Archives in dist/plugins/: sdlc-2026.4.0, voice-2026.4.0, marketing-2026.4.0, utils-2026.4.0. All metadata validation passed."

### Example 2: Validate everything before tagging

**User**: "Validate all plugins before I tag the release"

**Extraction**: Dry-run requested

**Action**:
```bash
aiwg package-all-plugins --dry-run
```

**Response**: "Dry run: 4 plugins validated. 3 passed. 1 error: utils plugin — soul-blend/SKILL.md missing required field `id`. Fix and re-run."

### Example 3: Package and publish in one step

**User**: "Package and publish everything for the release"

**Extraction**: Batch package and publish

**Action**:
```bash
aiwg package-all-plugins --publish
```

**Response**: "Packaged and published 4/4 plugins to the AIWG marketplace. sdlc, voice, marketing, utils — all at v2026.4.0."

### Example 4: Continue through failures

**User**: "Package all plugins but don't stop if one fails — I want to see all the errors at once"

**Extraction**: Batch with `--continue-on-error`

**Action**:
```bash
aiwg package-all-plugins --continue-on-error
```

**Response**: "Packaged 3/4 plugins. 1 failure: utils — validate-metadata error in soul-blend/SKILL.md line 4 (missing `id`). All other packages created in dist/plugins/."

## References

- @$AIWG_ROOT/src/cli/handlers/utilities.ts — Command handler
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/skills/package-plugin/SKILL.md — Single-plugin packaging
