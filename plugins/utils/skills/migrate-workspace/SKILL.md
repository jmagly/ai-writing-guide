---
namespace: aiwg
name: migrate-workspace
platforms: [all]
description: Migrate the .aiwg/ directory from single-framework layout to the multi-framework layout with an automatic backup
---

# Migrate Workspace

You upgrade the `.aiwg/` directory from the old single-framework layout to the new multi-framework layout, moving artifacts into framework-scoped subdirectories. A backup is always created before any changes are applied.

## Triggers

Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "upgrade my aiwg structure" → run migration
- "move to multi-framework layout" → run migration
- "preview workspace migration" → dry-run only
- "what would migrate?" → dry-run only

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| Full migration | "migrate my workspace" | Run `aiwg migrate-workspace` |
| Dry run | "preview the workspace migration" | Run `aiwg migrate-workspace --dry-run` |
| Forced | "migrate workspace, skip confirmation" | Run `aiwg migrate-workspace --yes` |
| Check needed | "do I need to migrate?" | Run `aiwg migrate-workspace --dry-run` |

## Behavior

When triggered:

1. **Always dry-run first** unless the user explicitly confirms or passes `--yes`:
   - Run `aiwg migrate-workspace --dry-run` to show what would move.
   - Report the planned changes to the user.
   - Ask for confirmation before proceeding.

2. **Extract arguments**:
   - Is `--dry-run` requested? Report only, no changes.
   - Has the user already confirmed? Use `--yes` to skip the interactive prompt.
   - Is there a specific backup path? (optional)

3. **Run the appropriate command**:

   ```bash
   # Preview only — no changes
   aiwg migrate-workspace --dry-run

   # Full migration (prompts for confirmation)
   aiwg migrate-workspace

   # Full migration, skip prompt
   aiwg migrate-workspace --yes
   ```

4. **What the migration does**:
   - Creates a timestamped backup at `.aiwg/.backup-<timestamp>/`
   - Creates framework-scoped subdirectories under `.aiwg/frameworks/<name>/`
   - Moves existing flat artifacts into the appropriate scoped location
   - Updates `.aiwg/frameworks/registry.json`
   - Leaves a `MIGRATION.md` log at `.aiwg/` root

5. **Safety guarantee**: The backup is created before any file is moved. If migration fails partway through, `aiwg rollback-workspace` can restore from the backup.

6. **Report the result** — show what was moved, backup location, and how to rollback if needed.

## Examples

### Example 1: Dry run first (default approach)

**User**: "Migrate my workspace"

**Extraction**: Migration requested — dry-run before applying

**Action** (step 1):
```bash
aiwg migrate-workspace --dry-run
```

**Response**:
```
Workspace Migration Preview
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Would move:
  .aiwg/requirements/ → .aiwg/frameworks/sdlc-complete/requirements/
  .aiwg/architecture/ → .aiwg/frameworks/sdlc-complete/architecture/
  .aiwg/testing/      → .aiwg/frameworks/sdlc-complete/testing/
  (+ 5 more directories)

Would create backup: .aiwg/.backup-20260401-1423/
No files would be deleted.

Proceed with migration? [y/N]
```

After user confirms → run `aiwg migrate-workspace --yes`.

### Example 2: Dry run only

**User**: "What would the workspace migration do?"

**Extraction**: Preview-only, no confirmation needed

**Action**:
```bash
aiwg migrate-workspace --dry-run
```

**Response**: Shows the planned moves table (as above) and stops. Does not prompt for confirmation.

### Example 3: Already on new layout

**User**: "Do I need to migrate my workspace?"

**Extraction**: Check whether migration is needed

**Action**:
```bash
aiwg migrate-workspace --dry-run
```

**Response**: "Your workspace is already on the multi-framework layout. No migration needed."

### Example 4: Migration with confirmation

**User**: "Go ahead and migrate the workspace"

**Extraction**: User has already seen dry-run output and is confirming

**Action**:
```bash
aiwg migrate-workspace --yes
```

**Response**:
```
Backup created: .aiwg/.backup-20260401-1423/
Migrating 8 directories...
  requirements/  moved
  architecture/  moved
  testing/       moved
  (+ 5 more)
registry.json updated.
Migration complete. To undo: aiwg rollback-workspace
```

## Clarification Prompts

If the user's intent is ambiguous:

- "Would you like me to preview the migration first, or go ahead and apply it?"
- "Have you already reviewed the dry-run output, or should I run it first?"

## References

- @$AIWG_ROOT/src/cli/handlers/workspace.ts — `migrate-workspace` command handler
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/skills/rollback-workspace/SKILL.md — Undoing a migration
