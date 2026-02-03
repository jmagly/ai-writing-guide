# Ralph Multi-Loop CLI Options

**Version**: 1.0.0
**Status**: APPROVED
**Created**: 2026-02-02

## Overview

This document details all CLI command options for multi-loop Ralph architecture, including the new `--loop-id`, `--all`, and `--force` flags.

## References

- @.aiwg/working/multi-loop-ralph-plan.md - Architecture specification
- @docs/migration/multi-loop-migration.md - Migration guide
- @docs/cli-reference.md - Complete CLI reference

## Global Concepts

### Loop ID Format

Loop IDs follow the pattern: `ralph-{task-slug}-{short-uuid}`

**Examples:**
- `ralph-fix-all-failing-tests-a1b2c3d4`
- `ralph-migrate-to-typescript-e5f6g7h8`
- `ralph-update-documentation-i9j0k1l2`

**Components:**
- Prefix: Always `ralph-`
- Task slug: First 30 chars of task, alphanumeric and hyphens only
- Short UUID: First 8 characters of UUID (for uniqueness)

### Loop States

| State | Description |
|-------|-------------|
| `running` | Loop currently executing |
| `paused` | Loop stopped, can be resumed |
| `completed` | Loop finished successfully |
| `aborted` | Loop terminated by user |
| `failed` | Loop failed (error, timeout, etc.) |

### MAX_CONCURRENT_LOOPS

**Value**: 4 (research-backed limit from REF-086, REF-088)

**Rationale**:
- 4 loops = 6 communication paths (manageable)
- 5 loops = 10 communication paths (significant overhead)
- 7 loops = 21 communication paths (excessive)

**Override**: Use `--force` flag (logs warning)

## Command: `aiwg ralph`

### Synopsis

```bash
aiwg ralph <task> [options]
```

### Description

Start a new Ralph iteration loop with the specified task and completion criteria.

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `<task>` | Yes | Natural language description of the task |

### Options

#### `--completion <criteria>` (Required)

Verifiable completion criteria for the task.

**Example:**
```bash
aiwg ralph "Fix tests" --completion "npm test passes with 0 failures"
```

#### `--loop-id <id>` (Optional)

Specify a custom loop ID instead of auto-generation.

**Default**: Auto-generated from task name
**Format**: Any valid alphanumeric string with hyphens

**Example:**
```bash
aiwg ralph "Refactor auth" \
  --completion "All auth tests pass" \
  --loop-id my-auth-refactor
```

**Use cases:**
- Resuming work across sessions with consistent ID
- Integration with external tracking systems
- Human-readable loop identification

#### `--max-iterations <n>` (Optional)

Maximum number of iterations before stopping.

**Default**: 10
**Range**: 1-100

**Example:**
```bash
aiwg ralph "Quick fix" \
  --completion "Bug resolved" \
  --max-iterations 5
```

#### `--force` (Optional)

Allow creating a loop even when MAX_CONCURRENT_LOOPS (4) is exceeded.

**Default**: false
**Warning**: Logs overhead warning

**Example:**
```bash
aiwg ralph "Fifth task" \
  --completion "Done" \
  --force
```

**Output:**
```
⚠ WARNING: Exceeding recommended MAX_CONCURRENT_LOOPS (4)
⚠ Communication paths: 10 (overhead increases quadratically)
Loop started: ralph-fifth-task-q7r8s9t0
```

**When to use:**
- Emergency fixes when all loops busy
- Temporary override with understanding of overhead
- Testing multi-loop limits

**When NOT to use:**
- Normal development (complete/abort existing loop first)
- Production workflows (respect the 4-loop limit)

### Examples

#### Basic Usage (Auto-Generated ID)

```bash
aiwg ralph "Fix all failing tests" --completion "npm test passes"
```

**Output:**
```
Loop started: ralph-fix-all-failing-tests-a1b2c3d4

Iteration 1/10
Task: Fix all failing tests
Completion: npm test passes

Starting iteration...
```

#### With Custom Loop ID

```bash
aiwg ralph "Migrate to TypeScript" \
  --completion "All files converted, tsc passes" \
  --loop-id typescript-migration
```

**Output:**
```
Loop started: typescript-migration

Iteration 1/10
Task: Migrate to TypeScript
Completion: All files converted, tsc passes
```

#### With Iteration Limit

```bash
aiwg ralph "Quick documentation update" \
  --completion "README.md updated" \
  --max-iterations 3
```

#### Forcing 5th Concurrent Loop

```bash
# Assuming 4 loops already active
aiwg ralph "Emergency security fix" \
  --completion "CVE patched" \
  --force
```

### Error Cases

#### Too Many Concurrent Loops (Without --force)

```bash
$ aiwg ralph "Fifth task" --completion "Done"

✗ Error: Cannot create loop: 4 loops already active (max: 4).
Adding another would create 10 communication paths (REF-088).

Active loops:
  1. ralph-fix-authentication-a1b2c3d4
  2. ralph-refactor-api-e5f6g7h8
  3. ralph-update-docs-i9j0k1l2
  4. ralph-add-tests-m3n4o5p6

Options:
  - Complete or abort one of the above loops
  - Use --force to override (not recommended)
```

#### Duplicate Loop ID

```bash
$ aiwg ralph "New task" --loop-id existing-loop-id --completion "Done"

✗ Error: Loop ID 'existing-loop-id' already exists.
Choose a different ID or omit --loop-id for auto-generation.
```

#### Invalid Loop ID Format

```bash
$ aiwg ralph "Task" --loop-id "invalid id with spaces" --completion "Done"

✗ Error: Invalid loop ID format.
Must contain only lowercase letters, numbers, and hyphens.

Valid examples:
  - my-custom-loop
  - auth-refactor-2024
  - quick-fix
```

---

## Command: `aiwg ralph-status`

### Synopsis

```bash
aiwg ralph-status [options]
```

### Description

Show status of Ralph loop(s).

### Options

#### `--loop-id <id>` (Optional)

Show status of specific loop.

**Example:**
```bash
aiwg ralph-status --loop-id ralph-fix-tests-a1b2c3d4
```

**Output:**
```
Loop: ralph-fix-tests-a1b2c3d4
Task: Fix all failing tests
Status: running
Iteration: 5 / 10
Started: 2026-02-02 14:00:00 (2 hours ago)
Owner: agent-1
PID: 12345

Completion criteria:
  npm test passes

Recent iterations:
  Iteration 5: In progress...
  Iteration 4: Failed (test timeout)
  Iteration 3: Failed (syntax error)
  Iteration 2: Failed (import error)
  Iteration 1: Failed (missing dependency)
```

#### `--all` (Optional)

Show status of all active loops.

**Example:**
```bash
aiwg ralph-status --all
```

**Output:**
```
Active Ralph Loops (3):

─────────────────────────────────────────────────────────
Loop ID: ralph-fix-tests-a1b2c3d4
  Task: Fix all failing tests
  Status: running
  Iteration: 5 / 10
  Started: 2 hours ago
  Owner: agent-1

Loop ID: ralph-refactor-api-e5f6g7h8
  Task: Refactor API
  Status: running
  Iteration: 8 / 15
  Started: 1 hour ago
  Owner: agent-2

Loop ID: ralph-update-docs-i9j0k1l2
  Task: Update documentation
  Status: paused
  Iteration: 2 / 5
  Started: 3 hours ago
  Owner: agent-3
─────────────────────────────────────────────────────────

Total active: 3 / 4 (1 slot available)
Communication paths: 3 (optimal range)
```

### Examples

#### Default Behavior (Single Loop)

```bash
# If only one loop exists, shows that loop
$ aiwg ralph-status

Loop: ralph-fix-tests-a1b2c3d4
Task: Fix all failing tests
Status: running
Iteration: 3 / 10
...
```

#### Default Behavior (Multiple Loops)

```bash
# If multiple loops exist, prompts for selection
$ aiwg ralph-status

Multiple active loops found. Please specify:

  aiwg ralph-status --loop-id <id>  (show specific loop)
  aiwg ralph-status --all           (show all loops)

Active loops:
  1. ralph-fix-tests-a1b2c3d4 (running, 5/10)
  2. ralph-refactor-api-e5f6g7h8 (running, 8/15)
  3. ralph-update-docs-i9j0k1l2 (paused, 2/5)
```

#### Specific Loop

```bash
aiwg ralph-status --loop-id ralph-refactor-api-e5f6g7h8
```

#### All Loops with Summary

```bash
aiwg ralph-status --all
```

---

## Command: `aiwg ralph-abort`

### Synopsis

```bash
aiwg ralph-abort [options]
```

### Description

Abort a running or paused Ralph loop.

### Options

#### `--loop-id <id>` (Optional, Required if Multiple Loops)

Specify which loop to abort.

**Example:**
```bash
aiwg ralph-abort --loop-id ralph-fix-tests-a1b2c3d4
```

**Output:**
```
Aborting loop: ralph-fix-tests-a1b2c3d4

Task: Fix all failing tests
Current iteration: 5 / 10
Status: running

Are you sure you want to abort this loop? (y/n): y

✓ Loop aborted
✓ State saved to .aiwg/ralph/loops/ralph-fix-tests-a1b2c3d4/
✓ Moved to archive: .aiwg/ralph/archive/ralph-fix-tests-a1b2c3d4/

You can review the state in the archive directory.
```

#### `--force` (Optional)

Skip confirmation prompt.

**Example:**
```bash
aiwg ralph-abort --loop-id ralph-fix-tests-a1b2c3d4 --force
```

### Examples

#### Abort Single Loop (Auto-Detected)

```bash
# If only one loop exists
$ aiwg ralph-abort

Aborting loop: ralph-fix-tests-a1b2c3d4
...
Are you sure? (y/n): y
✓ Loop aborted
```

#### Abort Specific Loop (Multiple Loops)

```bash
$ aiwg ralph-abort --loop-id ralph-update-docs-i9j0k1l2

Aborting loop: ralph-update-docs-i9j0k1l2
Task: Update documentation
Current iteration: 2 / 5
Status: paused

Are you sure you want to abort this loop? (y/n): y

✓ Loop aborted
✓ Archived to .aiwg/ralph/archive/ralph-update-docs-i9j0k1l2/
```

#### Abort Without Confirmation

```bash
aiwg ralph-abort --loop-id ralph-fix-tests-a1b2c3d4 --force
```

### Error Cases

#### No Loop Specified (Multiple Loops)

```bash
$ aiwg ralph-abort

✗ Error: Multiple loops active. Please specify which to abort:

  aiwg ralph-abort --loop-id <id>

Active loops:
  1. ralph-fix-tests-a1b2c3d4 (running, 5/10)
  2. ralph-refactor-api-e5f6g7h8 (running, 8/15)
```

#### Loop Not Found

```bash
$ aiwg ralph-abort --loop-id nonexistent-loop

✗ Error: Loop 'nonexistent-loop' not found.

Use: aiwg ralph-status --all
to see active loops.
```

---

## Command: `aiwg ralph-resume`

### Synopsis

```bash
aiwg ralph-resume [options]
```

### Description

Resume a paused Ralph loop.

### Options

#### `--loop-id <id>` (Optional, Required if Multiple Loops)

Specify which loop to resume.

**Example:**
```bash
aiwg ralph-resume --loop-id ralph-update-docs-i9j0k1l2
```

**Output:**
```
Resuming loop: ralph-update-docs-i9j0k1l2

Task: Update documentation
Completion: README.md and docs/ updated
Status: paused
Last iteration: 2 / 5
Last update: 3 hours ago

✓ Loop resumed
Continuing from iteration 3...
```

### Examples

#### Resume Single Paused Loop (Auto-Detected)

```bash
# If only one paused loop exists
$ aiwg ralph-resume

Resuming loop: ralph-update-docs-i9j0k1l2
...
✓ Loop resumed
```

#### Resume Specific Loop

```bash
$ aiwg ralph-resume --loop-id ralph-refactor-api-e5f6g7h8

Resuming loop: ralph-refactor-api-e5f6g7h8
Task: Refactor API
Status: paused
Last iteration: 8 / 15

✓ Loop resumed
Continuing from iteration 9...
```

### Error Cases

#### No Loop Specified (Multiple Paused Loops)

```bash
$ aiwg ralph-resume

✗ Error: Multiple paused loops found. Please specify which to resume:

  aiwg ralph-resume --loop-id <id>

Paused loops:
  1. ralph-update-docs-i9j0k1l2 (2/5, paused 3h ago)
  2. ralph-refactor-api-e5f6g7h8 (8/15, paused 1h ago)
```

#### Loop Not Paused

```bash
$ aiwg ralph-resume --loop-id ralph-fix-tests-a1b2c3d4

✗ Error: Loop 'ralph-fix-tests-a1b2c3d4' is not paused (status: running).

Only paused loops can be resumed.
Use: aiwg ralph-status --all to see loop states.
```

---

## Helper Commands

### `aiwg ralph-migrate`

Migrate legacy single-loop structure to multi-loop.

```bash
aiwg ralph-migrate [--status]
```

**Options:**
- `--status`: Show migration status without migrating

**See:** @docs/migration/multi-loop-migration.md

### `aiwg ralph-rollback`

Rollback multi-loop migration to single-loop.

```bash
aiwg ralph-rollback
```

**Warning**: Archives all loops except default.

**See:** @docs/migration/multi-loop-migration.md

### `aiwg ralph-rebuild-registry`

Rebuild registry from loops directory (recovery tool).

```bash
aiwg ralph-rebuild-registry
```

**Use case**: Registry corrupted or out of sync.

---

## Environment Variables

### `RALPH_LOOP_ID`

Set default loop ID for commands.

**Example:**
```bash
export RALPH_LOOP_ID=ralph-fix-tests-a1b2c3d4

# Now omit --loop-id in commands
aiwg ralph-status
aiwg ralph-abort
```

### `RALPH_AUTO_MIGRATE`

Auto-migrate on first use without prompting.

**Values**: `true`, `false`
**Default**: `true`

**Example:**
```bash
export RALPH_AUTO_MIGRATE=false
```

---

## Quick Reference

### Common Workflows

#### Start and Monitor Loop

```bash
# Start
aiwg ralph "Fix bugs" --completion "npm test passes"

# Check status
aiwg ralph-status --all

# If needed, abort
aiwg ralph-abort --loop-id <id>
```

#### Resume Previous Work

```bash
# List paused loops
aiwg ralph-status --all | grep paused

# Resume
aiwg ralph-resume --loop-id <id>
```

#### Manage Multiple Loops

```bash
# Start 3 concurrent tasks
aiwg ralph "Task 1" --completion "Done" --loop-id task1
aiwg ralph "Task 2" --completion "Done" --loop-id task2
aiwg ralph "Task 3" --completion "Done" --loop-id task3

# Monitor all
watch -n 5 'aiwg ralph-status --all'

# Abort one
aiwg ralph-abort --loop-id task2
```

### Command Summary Table

| Command | Purpose | Key Options |
|---------|---------|-------------|
| `ralph` | Start loop | `--loop-id`, `--force`, `--max-iterations` |
| `ralph-status` | Show status | `--loop-id`, `--all` |
| `ralph-abort` | Stop loop | `--loop-id`, `--force` |
| `ralph-resume` | Resume loop | `--loop-id` |
| `ralph-migrate` | Migrate to multi-loop | `--status` |
| `ralph-rollback` | Rollback migration | (none) |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-02-02 | Documentation Team | Initial CLI options reference |
