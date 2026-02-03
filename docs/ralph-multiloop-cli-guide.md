# Ralph Multi-Loop CLI Guide

Multi-loop support enables running up to 4 concurrent Ralph loops with isolated state and automatic detection for single-loop scenarios.

## Quick Start

### Single Loop (Backward Compatible)

```bash
# Create a loop - same as before
aiwg ralph "Fix failing tests" --completion "npm test passes"

# Check status - auto-detects the single loop
aiwg ralph-status

# Abort - auto-detects the single loop
aiwg ralph-abort

# Resume - auto-detects the single loop
aiwg ralph-resume
```

### Multiple Loops

```bash
# Create first loop
aiwg ralph "Fix tests" --completion "npm test passes"

# Create second loop
aiwg ralph "Add coverage" --completion "coverage >= 80%"

# List all active loops
aiwg ralph list

# Check specific loop status
aiwg ralph-status --loop-id ralph-fix-tests-a1b2c3d4

# Check all loops
aiwg ralph-status --all

# Abort specific loop
aiwg ralph-abort --loop-id ralph-fix-tests-a1b2c3d4

# Resume specific loop
aiwg ralph-resume --loop-id ralph-add-coverage-e5f6g7h8
```

## Commands

### `aiwg ralph`

Create a new Ralph loop.

**Usage:**
```bash
aiwg ralph "<task>" --completion "<criteria>" [options]
```

**Options:**
- `--completion <criteria>` - Verification command/criteria (required)
- `--max-iterations <N>` - Maximum iterations (default: 10)
- `--timeout <minutes>` - Maximum time (default: 60)
- `--loop-id <id>` - Custom loop ID (optional, auto-generated if omitted)
- `--force, -f` - Override MAX_CONCURRENT_LOOPS limit
- `--branch <name>` - Create feature branch for loop work
- `--no-commit` - Disable auto-commits
- `--interactive, -i` - Interactive setup mode

**Examples:**
```bash
# Basic loop
aiwg ralph "Fix tests" --completion "npm test passes"

# Custom loop ID
aiwg ralph "Refactor auth" --completion "tsc passes" --loop-id auth-refactor

# Force override limit (not recommended)
aiwg ralph "Fifth task" --completion "done" --force

# With branch and extended timeout
aiwg ralph "Convert to TS" --completion "tsc passes" \
  --branch typescript-migration \
  --max-iterations 20 \
  --timeout 120
```

**Concurrent Loop Limit:**
- Maximum 4 concurrent loops (MAX_CONCURRENT_LOOPS)
- Creating a 5th loop requires `--force` flag
- Limit prevents O(n²) communication overhead (REF-088)

### `aiwg ralph list`

List all active Ralph loops.

**Usage:**
```bash
aiwg ralph list [--all]
```

**Options:**
- `--all` - Same as default (shows all loops)

**Output:**
```
═══════════════════════════════════════════
Active Ralph Loops (2/4)
═══════════════════════════════════════════

Loop ID: ralph-fix-tests-a1b2c3d4
  Task: Fix failing tests
  Status: RUNNING
  Iteration: 3/10
  Elapsed: 12m
  Priority: medium

Loop ID: ralph-add-coverage-e5f6g7h8
  Task: Add test coverage
  Status: RUNNING
  Iteration: 1/5
  Elapsed: 2m
  Priority: high
  Tags: testing, quality

Commands:
  aiwg ralph-status --loop-id <id>  Show detailed status
  aiwg ralph-abort --loop-id <id>   Abort specific loop
  aiwg ralph-resume --loop-id <id>  Resume specific loop
```

### `aiwg ralph-status`

Check loop status.

**Usage:**
```bash
aiwg ralph-status [--loop-id <id>] [--all] [--json] [--verbose]
```

**Options:**
- `--loop-id <id>` - Show specific loop (required when multiple loops exist)
- `--all` - Show all loops summary
- `--json` - Output as JSON
- `--verbose, -v` - Show full state details

**Auto-Detection:**
- **Single loop**: Automatically shows that loop
- **Multiple loops**: Requires `--loop-id` or `--all`
- **No loops**: Shows helpful message

**Examples:**
```bash
# Auto-detect (works when only one loop exists)
aiwg ralph-status

# Specific loop
aiwg ralph-status --loop-id ralph-fix-tests-a1b2c3d4

# All loops summary
aiwg ralph-status --all

# JSON output for scripting
aiwg ralph-status --loop-id ralph-fix-tests-a1b2c3d4 --json

# Full state details
aiwg ralph-status --loop-id ralph-fix-tests-a1b2c3d4 --verbose
```

**Single Loop Output:**
```
═══════════════════════════════════════════
Ralph Loop Status: ralph-fix-tests-a1b2c3d4
═══════════════════════════════════════════

Task: Fix failing tests
Completion: npm test passes

Status: RUNNING
Iteration: 3/10
Elapsed: 12m 30s
Remaining: 47m 30s

Last result: 3 tests still failing
Current learnings: Fixed auth tests, working on validation

Iteration History:
────────────────────────────────────────
  1. Fixed import errors
     Result: 5 tests passing, 8 failing
  2. Updated test mocks
     Result: 8 tests passing, 5 failing
  3. Fixed validation logic
     Result: 10 tests passing, 3 failing

═══════════════════════════════════════════
```

**Multiple Loops Output (--all):**
```
═══════════════════════════════════════════
All Active Ralph Loops (2)
═══════════════════════════════════════════

Loop ID: ralph-fix-tests-a1b2c3d4
  Task: Fix failing tests
  Status: RUNNING
  Iteration: 3/10
  Elapsed: 12m 30s

Loop ID: ralph-add-coverage-e5f6g7h8
  Task: Add test coverage
  Status: RUNNING
  Iteration: 1/5
  Elapsed: 2m 15s

Use --loop-id <id> to see detailed status for a specific loop.
```

### `aiwg ralph-abort`

Abort a running loop.

**Usage:**
```bash
aiwg ralph-abort [--loop-id <id>] [--revert] [--keep-changes] [--force]
```

**Options:**
- `--loop-id <id>` - Abort specific loop (required when multiple loops exist)
- `--revert` - Show git commands to revert loop commits
- `--keep-changes` - Keep changes in working directory (default)
- `--force, -f` - Force abort inactive loop

**Auto-Detection:**
- **Single loop**: Automatically aborts that loop
- **Multiple loops**: Requires `--loop-id`

**Examples:**
```bash
# Auto-detect (works when only one loop exists)
aiwg ralph-abort

# Specific loop
aiwg ralph-abort --loop-id ralph-fix-tests-a1b2c3d4

# With revert instructions
aiwg ralph-abort --loop-id ralph-fix-tests-a1b2c3d4 --revert
```

**Output:**
```
═══════════════════════════════════════════
Ralph Loop Aborted: ralph-fix-tests-a1b2c3d4
═══════════════════════════════════════════

Task: Fix failing tests
Iterations completed: 3

Changes kept in working directory.
Use --revert to undo ralph commits.

State saved to: .aiwg/ralph/loops/ralph-fix-tests-a1b2c3d4/state.json

To start fresh: aiwg ralph "task" --completion "criteria"
```

### `aiwg ralph-resume`

Resume a paused or interrupted loop.

**Usage:**
```bash
aiwg ralph-resume [--loop-id <id>] [--max-iterations <N>] [--timeout <minutes>]
```

**Options:**
- `--loop-id <id>` - Resume specific loop (required when multiple loops exist)
- `--max-iterations <N>` - Override max iterations
- `--timeout <minutes>` - Override timeout (resets timer)

**Auto-Detection:**
- **Single loop**: Automatically resumes that loop
- **Multiple loops**: Requires `--loop-id`

**Examples:**
```bash
# Auto-detect (works when only one loop exists)
aiwg ralph-resume

# Specific loop
aiwg ralph-resume --loop-id ralph-fix-tests-a1b2c3d4

# With extended limits
aiwg ralph-resume --loop-id ralph-fix-tests-a1b2c3d4 \
  --max-iterations 20 \
  --timeout 120
```

**Output:**
```
═══════════════════════════════════════════
Resuming Ralph Loop: ralph-fix-tests-a1b2c3d4
═══════════════════════════════════════════

Task: Fix failing tests
Completion: npm test passes
Previous iterations: 3
Remaining iterations: 7

Last result: 3 tests still failing
Learnings so far: Fixed auth tests, working on validation

To continue in an agentic environment:
──────────────────────────────────────────────────
/ralph-resume --loop-id ralph-fix-tests-a1b2c3d4
──────────────────────────────────────────────────
```

## State Management

### Directory Structure

```
.aiwg/ralph/
├── registry.json                    # Central registry of all loops
├── loops/
│   ├── ralph-fix-tests-a1b2c3d4/
│   │   ├── state.json               # Loop state
│   │   ├── iterations/              # Iteration history
│   │   │   ├── iteration-1.json
│   │   │   ├── iteration-2.json
│   │   │   └── iteration-3.json
│   │   ├── checkpoints/             # State checkpoints
│   │   └── debug-memory/            # Executable feedback memory
│   ├── ralph-add-coverage-e5f6g7h8/
│   │   └── ...
│   └── ...
├── archive/                         # Completed/aborted loops
│   └── ralph-old-loop-x1y2z3w4/
└── shared/                          # Cross-loop shared resources
    ├── patterns/                    # Shared failure patterns
    └── memory/                      # Shared learnings
```

### Registry Format

`.aiwg/ralph/registry.json`:

```json
{
  "version": "2.0.0",
  "max_concurrent_loops": 4,
  "updated_at": "2026-02-02T10:30:00Z",
  "active_loops": [
    {
      "loop_id": "ralph-fix-tests-a1b2c3d4",
      "task_summary": "Fix failing tests",
      "status": "running",
      "started_at": "2026-02-02T10:00:00Z",
      "owner": "developer",
      "pid": 12345,
      "iteration": 3,
      "max_iterations": 10,
      "completion_criteria": "npm test passes",
      "priority": "medium",
      "tags": ["testing"]
    }
  ],
  "total_active": 1,
  "total_completed": 5,
  "total_aborted": 2
}
```

### Loop State Format

`.aiwg/ralph/loops/<loop-id>/state.json`:

```json
{
  "loopId": "ralph-fix-tests-a1b2c3d4",
  "active": true,
  "task": "Fix failing tests",
  "completion": "npm test passes",
  "maxIterations": 10,
  "timeoutMinutes": 60,
  "timeoutMs": 3600000,
  "startTime": "2026-02-02T10:00:00Z",
  "startTimeMs": 1738491600000,
  "currentIteration": 3,
  "autoCommit": true,
  "branch": null,
  "completed": false,
  "status": "running",
  "iterations": [
    {
      "iteration": 1,
      "action": "Fixed import errors",
      "result": "5 tests passing, 8 failing"
    }
  ],
  "lastResult": "3 tests still failing",
  "learnings": "Fixed auth tests, working on validation"
}
```

## Backward Compatibility

All commands maintain backward compatibility with single-loop scenarios:

| Scenario | Behavior |
|----------|----------|
| **No loops exist** | Show helpful message with creation example |
| **Single loop exists** | Auto-detect and operate on that loop |
| **Multiple loops exist** | Require explicit `--loop-id` (except `list` and `--all` flags) |

### Migration from Single-Loop

Existing single-loop state (`.aiwg/ralph/current-loop.json`) is NOT automatically migrated. The multi-loop system uses a different structure (`.aiwg/ralph/loops/<loop-id>/`).

To migrate manually:
1. Complete or abort existing loop
2. Start fresh with new multi-loop commands

## Error Messages

### Multiple Loops Without --loop-id

```
Error: Multiple Ralph loops active (2). Specify --loop-id <id>

Active Ralph Loops:
────────────────────────────────────────
ralph-fix-tests-a1b2c3d4
  Task: Fix failing tests
  Status: running
  Iteration: 3/10

ralph-add-coverage-e5f6g7h8
  Task: Add test coverage
  Status: running
  Iteration: 1/5
```

### MAX_CONCURRENT_LOOPS Exceeded

```
Error: Cannot create loop: 4 loops already active (max: 4).
Adding another would create 10 communication paths (REF-088).
Use --force to override or complete/abort an existing loop.

Active loops:
ralph-loop-1
ralph-loop-2
ralph-loop-3
ralph-loop-4
```

### Invalid Loop ID

```
Error: Loop not found: nonexistent-loop

Available loops:
────────────────────────────────────────
ralph-fix-tests-a1b2c3d4
  Task: Fix failing tests
  ...
```

## Best Practices

### Loop ID Naming

Loop IDs are auto-generated from task names:
- Format: `ralph-<slugified-task>-<short-uuid>`
- Example: `ralph-fix-failing-tests-a1b2c3d4`

For custom IDs, use `--loop-id`:
```bash
aiwg ralph "Refactor auth" --completion "tsc" --loop-id auth-refactor-2024
```

### Concurrent Loop Organization

Organize loops by:
- **Priority**: Use tags and priority field
- **Dependencies**: Avoid loops that modify same files
- **Resources**: Consider test runner, build tool concurrency
- **Timeouts**: Stagger start times to avoid simultaneous failures

Example:
```bash
# High priority
aiwg ralph "Fix P0 security bug" --completion "test passes" \
  --max-iterations 5 --timeout 30

# Low priority
aiwg ralph "Refactor logging" --completion "tsc passes" \
  --max-iterations 20 --timeout 180
```

### Monitoring Multiple Loops

```bash
# Quick status of all loops
aiwg ralph-status --all

# Watch specific loop
watch -n 10 'aiwg ralph-status --loop-id ralph-fix-tests-a1b2c3d4'

# JSON output for scripting
aiwg ralph-status --all --json | jq '.[] | select(.status == "running")'
```

### Cleanup

Archive completed loops periodically:
```bash
# Completed loops are moved to .aiwg/ralph/archive/
# Remove old archives manually:
rm -rf .aiwg/ralph/archive/ralph-old-loop-*
```

## Scripting Examples

### Check if Any Loops Are Running

```bash
#!/bin/bash

STATUS=$(aiwg ralph-status --all --json 2>/dev/null)
if [ $? -eq 0 ]; then
  COUNT=$(echo "$STATUS" | jq 'length')
  if [ "$COUNT" -gt 0 ]; then
    echo "$COUNT Ralph loops are active"
  else
    echo "No Ralph loops are running"
  fi
else
  echo "No Ralph loops are running"
fi
```

### Wait for Specific Loop to Complete

```bash
#!/bin/bash

LOOP_ID="ralph-fix-tests-a1b2c3d4"

while true; do
  STATUS=$(aiwg ralph-status --loop-id "$LOOP_ID" --json 2>/dev/null)

  if [ $? -ne 0 ]; then
    echo "Loop not found or completed"
    break
  fi

  STATE=$(echo "$STATUS" | jq -r '.status')

  if [ "$STATE" = "success" ] || [ "$STATE" = "aborted" ] || [ "$STATE" = "failed" ]; then
    echo "Loop completed with status: $STATE"
    break
  fi

  ITERATION=$(echo "$STATUS" | jq -r '.currentIteration')
  echo "Loop still running (iteration $ITERATION)..."
  sleep 10
done
```

### Abort All Running Loops

```bash
#!/bin/bash

LOOPS=$(aiwg ralph-status --all --json | jq -r '.[].loopId')

for LOOP_ID in $LOOPS; do
  echo "Aborting $LOOP_ID..."
  aiwg ralph-abort --loop-id "$LOOP_ID"
done
```

## Troubleshooting

### "Multiple loops active" Error

**Symptom**: Commands fail with "Multiple Ralph loops active. Specify --loop-id"

**Solution**: Use `aiwg ralph list` to see all loops, then specify `--loop-id`

```bash
# See all loops
aiwg ralph list

# Use specific loop ID
aiwg ralph-status --loop-id ralph-fix-tests-a1b2c3d4
```

### Cannot Create More Loops

**Symptom**: "Cannot create loop: 4 loops already active"

**Solution**: Complete or abort an existing loop, or use `--force`

```bash
# See active loops
aiwg ralph list

# Abort one
aiwg ralph-abort --loop-id ralph-old-loop-x1y2z3w4

# Or force override (not recommended)
aiwg ralph "New task" --completion "done" --force
```

### Loop State Corruption

**Symptom**: Loop exists in registry but state file missing

**Solution**: Manually remove from registry

```bash
# Edit .aiwg/ralph/registry.json
# Remove the corrupted loop entry from "active_loops" array

# Or recreate state directory
mkdir -p .aiwg/ralph/loops/ralph-fix-tests-a1b2c3d4
```

## References

- REF-088: O(n²) communication overhead in multi-loop systems
- @tools/ralph/registry-sync.mjs - Registry implementation
- @tools/ralph/state-manager-sync.mjs - State manager implementation
- @test/unit/ralph/ralph-cli-multiloop.test.mjs - Test suite

## See Also

- [Ralph External Loop Guide](./ralph-external-guide.md) - External (crash-resilient) Ralph loops
- [Ralph Analytics Guide](./ralph-analytics-guide.md) - Loop metrics and reporting
- [Ralph Debugging Guide](./ralph-debugging-guide.md) - Debug memory and executable feedback
