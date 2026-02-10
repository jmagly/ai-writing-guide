# Multi-Loop Ralph Migration Guide

**Version**: 1.0.0
**Status**: APPROVED
**Created**: 2026-02-02

## Overview

This guide explains how to migrate from single-loop Ralph to multi-loop Ralph architecture. The migration is designed to be **non-breaking** and **backward compatible**.

## References

- @.aiwg/working/multi-loop-ralph-plan.md - Architecture specification
- @.aiwg/testing/multi-loop-ralph-test-strategy.md - Testing approach
- @docs/cli-reference.md - CLI command documentation

## What's Changing

### Before (Single Loop)

```
.aiwg/
└── ralph/
    ├── current-loop.json        # Single global state
    ├── iterations/              # Shared across all runs
    ├── checkpoints/
    └── debug-memory/
```

### After (Multi Loop)

```
.aiwg/
└── ralph/
    ├── registry.json            # NEW: Active loop registry
    ├── loops/                   # NEW: Per-loop isolation
    │   ├── ralph-task1-a1b2/
    │   │   ├── state.json       # Loop-specific state
    │   │   ├── iterations/
    │   │   ├── checkpoints/
    │   │   └── debug-memory/
    │   └── ralph-task2-c3d4/
    │       └── ...
    ├── shared/                  # NEW: Cross-loop resources
    │   ├── patterns/
    │   └── memory/
    ├── archive/                 # NEW: Completed loops
    └── current-loop.json        # DEPRECATED: Symlink for compat
```

## Migration Phases

### Phase 0: Pre-Migration Checklist

**Before migrating, verify:**

- [ ] No active Ralph loops running
- [ ] All important work committed to git
- [ ] Backup of `.aiwg/ralph/` directory created
- [ ] AIWG version >= 2026.2.0 installed
- [ ] Node.js version >= 20.x

```bash
# Check AIWG version
aiwg version

# Create backup
cp -r .aiwg/ralph .aiwg/ralph.backup.$(date +%Y%m%d)

# Verify no active loops
aiwg ralph-status
```

### Phase 1: Automatic Migration (Recommended)

The migration happens automatically on first use of multi-loop commands:

```bash
# First time you run a ralph command after upgrade
aiwg ralph "Fix tests" --completion "npm test passes"

# Output:
# ℹ Detected legacy Ralph structure
# ℹ Migrating to multi-loop architecture...
# ✓ Created registry.json
# ✓ Migrated existing state to ralph-default-loop-abc123
# ✓ Created backward compatibility symlink
# ✓ Migration complete
# Loop started: ralph-fix-tests-def456
```

**What happens automatically:**

1. Creates `registry.json`
2. Creates `loops/` directory structure
3. Migrates existing `current-loop.json` → `loops/ralph-default-loop-{id}/state.json`
4. Creates symlink: `current-loop.json` → `loops/ralph-default-loop-{id}/state.json`
5. Migrates iterations, checkpoints, debug-memory to loop directory
6. Creates `shared/` and `archive/` directories

### Phase 2: Manual Migration (If Needed)

If automatic migration fails or you want control:

```bash
# Run migration explicitly
aiwg ralph-migrate

# Output:
# Migrating Ralph to multi-loop architecture...
#
# Current structure:
#   State file: .aiwg/ralph/current-loop.json
#   Iterations: 5
#   Checkpoints: 3
#
# Migration plan:
#   ✓ Create registry.json
#   ✓ Create loops/ directory
#   ✓ Migrate state to loops/ralph-default-loop-a1b2c3d4/
#   ✓ Move iterations to loop directory
#   ✓ Move checkpoints to loop directory
#   ✓ Move debug-memory to loop directory
#   ✓ Create backward compatibility symlink
#   ✓ Create shared/ and archive/ directories
#
# Proceed? (y/n): y
#
# ✓ Migration complete in 1.2s
#
# Your existing loop is now: ralph-default-loop-a1b2c3d4
# Use: aiwg ralph-status --loop-id ralph-default-loop-a1b2c3d4
```

### Phase 3: Verify Migration

```bash
# Check migration status
aiwg ralph-migrate --status

# Output:
# Migration Status: COMPLETE
#
# Registry: .aiwg/ralph/registry.json
#   Active loops: 1
#   Total completed: 0
#   Total aborted: 0
#
# Migrated loops:
#   ralph-default-loop-a1b2c3d4 (from legacy current-loop.json)
#     Status: paused
#     Iterations: 5
#     Created: 2026-02-01T10:00:00Z
#
# Backward compatibility:
#   ✓ Symlink: current-loop.json → loops/ralph-default-loop-a1b2c3d4/state.json
#   ✓ Legacy tools will continue to work
```

## Backward Compatibility Guarantees

### What Continues to Work

✅ **Existing scripts and tools**
- Tools reading `current-loop.json` work via symlink
- Read-only access fully compatible
- No changes needed to monitoring scripts

✅ **Single-loop workflows**
- If only one loop exists, `--loop-id` is optional
- Commands auto-detect the single active loop
- Same UX as before for single-loop use

✅ **Existing state files**
- All state data preserved during migration
- Iteration history intact
- Checkpoints usable for recovery

### What Changes (Gracefully)

⚠️ **Multiple concurrent loops**
- Commands now prompt if `--loop-id` not specified
- Old tools see only the symlinked loop
- New multi-loop features require explicit loop ID

⚠️ **Writing to current-loop.json**
- Symlink still writable
- Only updates the default loop
- Other loops unaffected

## Using Multi-Loop Features

### Starting New Loops

```bash
# Start loop with auto-generated ID
aiwg ralph "Fix authentication" --completion "All auth tests pass"
# → Loop ID: ralph-fix-authentication-a1b2c3d4

# Start loop with custom ID
aiwg ralph "Refactor API" \
  --completion "npm test && npm run lint" \
  --loop-id my-api-refactor
# → Loop ID: my-api-refactor
```

### Managing Multiple Loops

```bash
# List all active loops
aiwg ralph-status --all

# Output:
# Active Ralph Loops (3):
#
# Loop ID: ralph-fix-authentication-a1b2c3d4
#   Task: Fix authentication
#   Status: running
#   Iteration: 3 / 10
#   Started: 2 hours ago
#
# Loop ID: ralph-refactor-api-e5f6g7h8
#   Task: Refactor API
#   Status: running
#   Iteration: 5 / 15
#   Started: 1 hour ago
#
# Loop ID: ralph-update-docs-i9j0k1l2
#   Task: Update documentation
#   Status: paused
#   Iteration: 2 / 5
#   Started: 3 hours ago

# Check specific loop
aiwg ralph-status --loop-id ralph-fix-authentication-a1b2c3d4

# Abort specific loop
aiwg ralph-abort --loop-id ralph-update-docs-i9j0k1l2

# Resume specific loop
aiwg ralph-resume --loop-id ralph-update-docs-i9j0k1l2
```

### Concurrent Loop Limit

```bash
# Try to start 5th concurrent loop
aiwg ralph "Fifth task" --completion "Done"

# Output:
# ✗ Error: Cannot create loop: 4 loops already active (max: 4).
# Adding another would create 10 communication paths (REF-088).
#
# Active loops:
#   1. ralph-fix-authentication-a1b2c3d4
#   2. ralph-refactor-api-e5f6g7h8
#   3. ralph-update-docs-i9j0k1l2
#   4. ralph-add-tests-m3n4o5p6
#
# Options:
#   - Complete or abort one of the above loops
#   - Use --force to override (not recommended)

# Force override (logs warning)
aiwg ralph "Fifth task" --completion "Done" --force

# Output:
# ⚠ WARNING: Exceeding recommended MAX_CONCURRENT_LOOPS (4)
# ⚠ Communication paths: 10 (overhead increases quadratically)
# Loop started: ralph-fifth-task-q7r8s9t0
```

## Rollback Procedure

If you need to rollback to single-loop:

### Option 1: Use Backup

```bash
# Remove multi-loop structure
rm -rf .aiwg/ralph

# Restore backup
cp -r .aiwg/ralph.backup.20260202 .aiwg/ralph
```

### Option 2: Downgrade AIWG

```bash
# Install previous version
npm install -g aiwg@2026.1.5

# Legacy structure automatically used
aiwg ralph "Task" --completion "Done"
```

### Option 3: Manual Rollback

```bash
# Run rollback command
aiwg ralph-rollback

# Output:
# Rolling back multi-loop migration...
#
# Current structure:
#   Registry: 2 active loops
#   Migrated from: ralph-default-loop-a1b2c3d4
#
# Rollback plan:
#   ✓ Restore loops/ralph-default-loop-a1b2c3d4/ to root
#   ✓ Remove registry.json
#   ✓ Remove loops/ directory
#   ✓ Remove symlink
#   ⚠ WARNING: Other active loops will be archived
#
# Other active loops:
#   - ralph-fix-auth-e5f6g7h8 (3 iterations) → will be archived
#
# Proceed? (y/n): y
#
# ✓ Rollback complete
# ✓ Archived 1 non-default loop
#
# Rollback successful. You're back to single-loop mode.
```

## Troubleshooting

### Issue: "No such file or directory: current-loop.json"

**Cause**: Migration created loops but symlink broken

**Fix**:
```bash
# Recreate symlink
cd .aiwg/ralph
ln -sf loops/ralph-default-loop-*/state.json current-loop.json
```

### Issue: "Cannot acquire lock: timeout"

**Cause**: Another process holds lock, or stale lock file

**Fix**:
```bash
# Check for stale lock
ls -la .aiwg/ralph/registry.json.lock

# If exists and no process running, remove manually
rm .aiwg/ralph/registry.json.lock
```

### Issue: "Loop ID not found"

**Cause**: Loop may be archived or ID mistyped

**Fix**:
```bash
# List all active loops
aiwg ralph-status --all

# Check archive
ls .aiwg/ralph/archive/

# If archived, cannot resume (create new loop)
```

### Issue: Migration fails midway

**Cause**: Interrupted migration or permission issue

**Fix**:
```bash
# Reset to backup
rm -rf .aiwg/ralph
cp -r .aiwg/ralph.backup.* .aiwg/ralph

# Try migration again
aiwg ralph-migrate
```

### Issue: "MAX_CONCURRENT_LOOPS exceeded" but only 2 loops active

**Cause**: Registry out of sync with actual loops

**Fix**:
```bash
# Rebuild registry from loops directory
aiwg ralph-rebuild-registry

# Output:
# Scanning .aiwg/ralph/loops/ for active loops...
# Found: 2 loops
# Rebuilding registry...
# ✓ Registry rebuilt
```

## FAQ

### Do I need to migrate immediately?

No. Migration happens automatically when you first use multi-loop commands. Single-loop workflows continue working indefinitely.

### Can I have both old and new structure?

Yes, temporarily. The symlink allows old tools to work while you use new multi-loop features. Eventually, you should migrate fully.

### Will my existing loops be lost?

No. Migration preserves all state, iterations, checkpoints, and debug memory. Everything moves to the new structure intact.

### Can I run old and new AIWG versions?

Not recommended. Stick to one version. If you need both, use separate projects.

### What happens to my .gitignore?

Migration doesn't change `.gitignore`. You may want to add:

```gitignore
# Multi-loop Ralph
.aiwg/ralph/loops/*/
.aiwg/ralph/archive/
.aiwg/ralph/registry.json.lock
```

### How do I know which loop I'm in?

```bash
# Check current directory context (if set)
echo $RALPH_LOOP_ID

# Or list all and check status
aiwg ralph-status --all
```

### Can I merge loops?

Not currently supported. Each loop is independent. Create a new loop for combined work.

### What about external Ralph loops?

External Ralph (Level 2) will receive multi-loop support in a future update. Migration for external loops will follow the same pattern.

### Performance impact?

Negligible for 1-4 loops. File locking adds <10ms overhead. Cross-loop learning extraction adds ~50ms per completed loop.

## Migration Checklist

### Pre-Migration

- [ ] Backup `.aiwg/ralph/` directory
- [ ] Verify no active loops running
- [ ] Update AIWG to >= 2026.2.0
- [ ] Review this migration guide

### During Migration

- [ ] Run `aiwg ralph-migrate` or let it happen automatically
- [ ] Verify migration success with `aiwg ralph-migrate --status`
- [ ] Test existing loop works: `aiwg ralph-status`
- [ ] Test new loop creation: `aiwg ralph "Test" --completion "Done"`

### Post-Migration

- [ ] Update `.gitignore` if needed
- [ ] Update CI/CD scripts if they reference `current-loop.json` directly
- [ ] Update documentation/runbooks
- [ ] Train team on new multi-loop commands
- [ ] Monitor for any issues in first week

## Support

If you encounter issues not covered here:

1. Check `.aiwg/ralph/registry.json` for loop state
2. Review logs in `.aiwg/ralph/loops/{loop-id}/`
3. Try `aiwg doctor` for diagnostic info
4. Open issue: https://github.com/jmagly/aiwg/issues
5. Join Discord: https://discord.gg/BuAusFMxdA

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-02-02 | Documentation Team | Initial migration guide |
