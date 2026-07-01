---
namespace: aiwg
name: update
platforms: [all]
description: Update AIWG to the latest stable version and re-deploy all installed frameworks from the registry

---

# AIWG Update

You update AIWG to the latest stable version and re-deploy all installed frameworks from the registry.

## Triggers

Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "refresh frameworks" → run `aiwg update`
- "redeploy everything" → run `aiwg update --all`
- "get the latest aiwg" → run `aiwg update`
- "reinstall my frameworks" → run `aiwg update --skip-check`
- "what would update change" → run `aiwg update --dry-run`

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| Update request | "update aiwg" / "upgrade aiwg" | Run `aiwg update` |
| Refresh request | "refresh frameworks" | Run `aiwg update` |
| Full redeploy | "redeploy everything" | Run `aiwg update --all` |
| Dry run | "what would update change" | Run `aiwg update --dry-run` |
| Provider-scoped | "update for copilot" | Run `aiwg update --provider copilot` |
| Skip version check | "just redeploy my frameworks" | Run `aiwg update --skip-check` |

## Behavior

When triggered:

1. **Extract intent**:
   - Should this update everything (`--all`) or only the currently installed frameworks (default)?
   - Is a specific provider mentioned?
   - Is this a preview only (`--dry-run`) or should changes be applied?
   - Is the user asking to redeploy without updating the package (`--skip-check`)?

2. **Run the appropriate command**:

   ```bash
   # Default: check for updates + re-deploy installed frameworks
   aiwg update

   # Re-deploy all frameworks (equivalent to `aiwg use all`)
   aiwg update --all

   # Preview what would be updated (no changes)
   aiwg update --dry-run

   # Re-deploy to a specific provider
   aiwg update --provider copilot

   # Skip version check, only re-deploy
   aiwg update --skip-check

   # Combine flags
   aiwg update --all --provider cursor
   ```

   Execution sequence:
   1. Check npm/git for a newer version (unless `--skip-check`)
   2. Read `.aiwg/frameworks/registry.json` to find installed frameworks
   3. Re-deploy each installed framework via `aiwg use <framework> [--provider <name>]`
   4. Print update summary with per-framework pass/fail status

3. **Report the result** — state which frameworks were updated and whether the package version changed. Flag any deployment failures with remediation (usually `aiwg doctor`).

## Difference from `aiwg sync`

`aiwg update` and `aiwg sync` overlap but serve different intents:

| | `aiwg update` | `aiwg sync` |
|---|---|---|
| Target channel | Stable only (default) | Follows configured channel |
| Scope | Installed frameworks only (default) | All deployed frameworks |
| Typical use | "Get the latest stable release" | "Keep this session current" |

Use `aiwg update` when bumping to a new stable release. Use `aiwg sync` during active development sessions to stay current with the configured channel.

## Examples

### Example 1: Standard update

**User**: "Update AIWG"

**Extraction**: Standard update, no flags

**Action**:
```bash
aiwg update
```

**Response**: "Updated AIWG 2026.3.12 → 2026.3.15. Re-deployed sdlc-complete and media-marketing-kit to claude-code. Both frameworks updated successfully."

### Example 2: Dry run preview

**User**: "What would `aiwg update` change?"

**Extraction**: Preview requested, no changes

**Action**:
```bash
aiwg update --dry-run
```

**Response**: "Dry run: would update from v2026.3.12 to v2026.3.15 and re-deploy the following frameworks: sdlc-complete, media-marketing-kit."

### Example 3: Full redeploy to a provider

**User**: "Redeploy all frameworks to Cursor"

**Extraction**: Full redeploy (`--all`), provider = cursor

**Action**:
```bash
aiwg update --all --provider cursor
```

**Response**: "Re-deployed all frameworks to cursor: sdlc-complete, media-marketing-kit, research-complete. Artifacts written to `.cursor/agents/`, `.cursor/commands/`, `.cursor/rules/`."

### Example 4: Redeploy without version check

**User**: "Just reinstall my frameworks — don't check for updates"

**Extraction**: Skip npm check, only redeploy installed frameworks

**Action**:
```bash
aiwg update --skip-check
```

**Response**: "Skipped version check. Re-deployed sdlc-complete to claude-code. 1/1 frameworks updated."

### Example 5: No frameworks installed

**User**: "Update AIWG"

**Extraction**: Standard update, but registry is empty or missing

**Action**:
```bash
aiwg update
```

**Response**: "No frameworks found in `.aiwg/frameworks/registry.json`. To deploy a framework first, run `aiwg use sdlc` or `aiwg use all`."

## Clarification Prompts

If the request is ambiguous between update and sync:

- "Would you like to update to the latest stable release (`aiwg update`) or sync the current session to your configured channel (`aiwg sync`)?"

## References

- @$AIWG_ROOT/src/cli/handlers/utilities.ts — Update command handler (updateHandler)
- @$AIWG_ROOT/src/update/checker.mjs — npm/git update check logic
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference
