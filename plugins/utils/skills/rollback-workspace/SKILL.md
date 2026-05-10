---
namespace: aiwg
name: rollback-workspace
platforms: [all]
description: Restore the .aiwg/ directory from a migrate-workspace backup, listing available backups when none is specified
---

# Rollback Workspace

You restore the `.aiwg/` directory from a backup created by `migrate-workspace`. Lists available backups when no specific backup is named. The restore is safe — it will not overwrite artifacts that were created after the migration.

## Triggers

Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "undo the migration" → rollback to most recent backup
- "restore my workspace" → rollback to most recent backup
- "what backups do I have?" → list available backups
- "revert aiwg directory" → rollback to most recent backup

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| Rollback latest | "roll back the workspace migration" | Run `aiwg rollback-workspace` |
| List backups | "what workspace backups exist?" | Run `aiwg rollback-workspace --list` |
| Specific backup | "restore from the backup made on April 1st" | Run `aiwg rollback-workspace --from .aiwg/.backup-20260401-1423` |
| Dry run | "preview the rollback" | Run `aiwg rollback-workspace --dry-run` |
| Force | "rollback workspace, skip confirmation" | Run `aiwg rollback-workspace --yes` |

## Behavior

When triggered:

1. **List backups before restoring** unless a specific backup is named or the user has already confirmed:
   - Run `aiwg rollback-workspace --list` to show what is available.
   - If only one backup exists, propose it directly.
   - If multiple backups exist, ask which one to restore.

2. **Extract arguments**:
   - Is `--list` requested? Show backups and stop.
   - Is a specific `--from <path>` given? Use that backup.
   - Is `--dry-run` requested? Show what would be restored, no changes.
   - Has the user confirmed? Use `--yes` to skip the interactive prompt.

3. **Run the appropriate command**:

   ```bash
   # List available backups
   aiwg rollback-workspace --list

   # Preview rollback (no changes)
   aiwg rollback-workspace --dry-run

   # Rollback to most recent backup (prompts for confirmation)
   aiwg rollback-workspace

   # Rollback to specific backup
   aiwg rollback-workspace --from .aiwg/.backup-20260401-1423

   # Rollback, skip prompt
   aiwg rollback-workspace --yes
   ```

4. **Safety behaviour**:
   - Will not overwrite files that were created **after** the backup timestamp (new artifacts added post-migration are preserved).
   - Conflicting files (same path, newer mtime) are reported rather than silently overwritten — the user decides.
   - If no backup exists, reports clearly and suggests contacting support.

5. **Report the result** — confirm what was restored, list any skipped conflicts, and remind the user to run `aiwg status` to verify.

## Examples

### Example 1: List backups first

**User**: "Roll back my workspace migration"

**Extraction**: Rollback requested — list backups before applying

**Action** (step 1):
```bash
aiwg rollback-workspace --list
```

**Response**:
```
Available workspace backups:

  1. .aiwg/.backup-20260401-1423   (created 2026-04-01 14:23 UTC — before migration)
  2. .aiwg/.backup-20260320-0900   (created 2026-03-20 09:00 UTC — before migration)

Which backup would you like to restore from? (default: 1 — most recent)
```

After user selects → run `aiwg rollback-workspace --from .aiwg/.backup-20260401-1423`.

### Example 2: Single backup, confirm and restore

**User**: "Undo the migration"

**Extraction**: One backup found, propose it

**Action**:
```bash
aiwg rollback-workspace --list
# One result → propose it
aiwg rollback-workspace --dry-run
```

**Preview response**:
```
Rollback Preview (from .aiwg/.backup-20260401-1423)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Would restore:
  .aiwg/frameworks/sdlc-complete/requirements/ → .aiwg/requirements/
  .aiwg/frameworks/sdlc-complete/architecture/ → .aiwg/architecture/
  (+ 6 more directories)

Files added after migration (will NOT be overwritten):
  .aiwg/requirements/UC-015.md  (newer than backup)

Proceed? [y/N]
```

After user confirms → `aiwg rollback-workspace --yes`.

### Example 3: Dry run only

**User**: "Preview a workspace rollback"

**Extraction**: Dry-run only

**Action**:
```bash
aiwg rollback-workspace --dry-run
```

**Response**: Shows the planned restore table (as above) and stops. Does not prompt for confirmation.

### Example 4: No backups available

**User**: "Roll back my workspace"

**Extraction**: No backups found

**Action**:
```bash
aiwg rollback-workspace --list
```

**Response**: "No workspace backups found in `.aiwg/`. Backups are created automatically when you run `aiwg migrate-workspace`. If you have a manual backup, specify its path with `aiwg rollback-workspace --from <path>`."

### Example 5: Specific backup path

**User**: "Restore from the backup at .aiwg/.backup-20260320-0900"

**Extraction**: Explicit backup path given

**Action**:
```bash
aiwg rollback-workspace --from .aiwg/.backup-20260320-0900
```

**Response**: Runs the restore, reports what was moved back and any skipped conflicts. Confirms with `aiwg status` recommendation.

## Clarification Prompts

If the user's intent is ambiguous:

- "Which backup would you like to restore from? I found: `.backup-20260401-1423`, `.backup-20260320-0900`."
- "Would you like me to preview the rollback first before applying it?"
- "Files created after the migration will not be overwritten — is that OK, or do you need to handle those manually?"

## References

- @$AIWG_ROOT/src/cli/handlers/workspace.ts — `rollback-workspace` command handler
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/skills/migrate-workspace/SKILL.md — The migration this reverses
