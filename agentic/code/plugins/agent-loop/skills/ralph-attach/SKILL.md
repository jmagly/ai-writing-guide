---
namespace: aiwg
name: ralph-attach
platforms: [all]
description: Attach to a running agent loop's live output stream
commandHint:
  argumentHint: "[--loop-id <id>]"
  allowedTools: Read
  model: haiku
  category: automation
  platforms: [claude-code, hermes, openclaw]
  modelRole: efficiency
  modelTier: economy
---

# Al Attach

Attach to a running external agent loop and tail its output log in real time. Press Ctrl+C to detach without interrupting the loop.

## Natural Language Triggers

Users may say:
- "ralph attach"
- "attach to ralph"
- "follow ralph"
- "watch ralph output"
- "tail the agent loop"
- "stream ralph progress"

## Parameters

### --loop-id (optional)
The ID of the loop to attach to. If omitted, attaches to the most recently started active loop.

```
/ralph-attach --loop-id abc123
```

When multiple loops are active, you must specify `--loop-id`. Run `/ralph-status` first to list active loop IDs.

## Behavior

When triggered:

1. Read `.aiwg/ralph-external/loops/` to find active loop state files
2. If `--loop-id` is not provided, select the loop with the most recent `startedAt` timestamp that has `status: "running"`
3. If no active loop is found, report clearly and exit
4. If multiple loops are active and no `--loop-id` is given, list them and prompt the user to specify
5. Resolve the loop's `logFile` path from its state JSON (typically `.aiwg/ralph-external/logs/<loop-id>.log`)
6. Begin reading the log file from the current end, streaming new lines as they are appended
7. Display each new line to the user as it arrives, prefixed with a timestamp
8. Continue until the user presses Ctrl+C or the loop reaches a terminal state (`succeeded`, `failed`, `aborted`)
9. On loop completion, print a final status banner and exit cleanly

**Output format while tailing**:
```
[10:42:01] Agent loop abc123 — ACTIVE (iteration 3/10)
[10:42:01] Running verification: npm test
[10:42:03] PASS src/auth/auth.test.ts
[10:42:03] Tests: 12 passed, 0 failed
[10:42:04] Iteration 3: VERIFIED — criteria met
[10:42:04] Agent loop: SUCCESS
```

**On loop completion**:
```
═══════════════════════════════════════════
Agent Loop Completed: SUCCESS
Loop ID: abc123
Iterations: 3
Duration: 4m 12s
Report: .aiwg/ralph-external/reports/abc123.md
═══════════════════════════════════════════

Detached from loop abc123.
```

## Error Handling

**No active loops**:
```
No active agent loops found.

Start one with:
  aiwg ralph "your task" --completion "criteria"

Or check completed loops with:
  /ralph-status --all
```

**Loop ID not found**:
```
Loop 'xyz999' not found in .aiwg/ralph-external/loops/.

Active loops:
  abc123 — Fix auth tests (running, iteration 2/10)
  def456 — Migrate to ESM (running, iteration 5/20)

Attach with: /ralph-attach --loop-id abc123
```

**Log file missing or unreadable**:
```
Cannot read log for loop abc123.

Expected: .aiwg/ralph-external/logs/abc123.log
Check that the loop process is still running and has write access to the log directory.
```

**Multiple loops active (no --loop-id)**:
```
Multiple active agent loops. Specify which to attach to:

  abc123 — Fix auth tests (running, iteration 2/10, started 10:38)
  def456 — Migrate to ESM (running, iteration 5/20, started 09:15)

Usage: /ralph-attach --loop-id <id>
```

## State File Location

- Loop states: `.aiwg/ralph-external/loops/<loop-id>.json`
- Loop logs:   `.aiwg/ralph-external/logs/<loop-id>.log`
- Reports:     `.aiwg/ralph-external/reports/<loop-id>.md`

## Examples

### Example 1: Attach to the only active loop
```
/ralph-attach
```
**Response**: Streams live output from the single running agent loop.

### Example 2: Attach to a specific loop by ID
```
/ralph-attach --loop-id abc123
```
**Response**: Streams output only from loop `abc123`.

### Example 3: Detach without stopping
Press `Ctrl+C` while attached.
**Response**: Returns to normal prompt; the agent loop continues running unaffected.

## Related

- `/ralph-status` — Check loop IDs and current iteration progress
- `/ralph-abort` — Stop a loop entirely
- `/ralph-resume` — Resume a paused loop
- `/ralph-external` — Start a new crash-resilient external loop

## References

- @$AIWG_ROOT/src/cli/handlers/ralph.ts — Al handler (attachToLoopOutput)
- @$AIWG_ROOT/src/cli/handlers/ralph-launcher.ts — Loop launcher and state management
- @$AIWG_ROOT/${CLAUDE_PLUGIN_ROOT}/README.md — Al documentation
- @$AIWG_ROOT/tools/ralph-external/README.md — External loop architecture
