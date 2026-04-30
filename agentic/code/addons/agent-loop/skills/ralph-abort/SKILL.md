---
namespace: aiwg
name: ralph-abort
platforms: [all]
description: Abort a running agent loop and optionally revert changes
commandHint:
  argumentHint: '[--keep-changes] [--revert] [--force --interactive --guidance "text"]'
  allowedTools: "Read, Write, Bash"
  model: sonnet
  category: automation
---

# Al Abort

Abort a running or paused agent loop.

## Usage

```
/ralph-abort               # Abort, keep changes
/ralph-abort --revert      # Abort and revert all changes
/ralph-abort --force       # Abort even if no active loop
```

## Parameters

### --keep-changes (default)
Stop the loop but keep all file changes made during iterations.

### --revert
Revert all changes made during the agent loop using git:
- Identify commits made during loop (prefix: `ralph: iteration`)
- Reset to commit before loop started
- **Warning**: This discards work

### --force
Abort even if state indicates no active loop (for cleanup).

## Your Actions

### Standard Abort

1. Read `.aiwg/ralph/current-loop.json`
2. Verify there's an active loop
3. Mark loop as aborted
4. Generate partial completion report
5. Confirm to user

**Output**:
```
Agent Loop: ABORTED

Task: {task}
Iterations completed: {N}
Duration: {time}

Changes have been kept. To revert:
  git reset --hard HEAD~{N}

Partial report: .aiwg/ralph/completion-{timestamp}.md
```

### With --revert

1. Read loop state
2. Find all `ralph: iteration` commits from this loop
3. Confirm with user before reverting
4. Reset git to pre-loop state
5. Clean up state files

**Confirmation prompt**:
```
This will revert {N} commits:
- ralph: iteration 1 - initial attempt
- ralph: iteration 2 - fixed auth
- ralph: iteration 3 - in progress

Files to be reverted:
- src/auth.ts
- test/auth.test.ts

Type 'yes' to confirm revert:
```

**After revert**:
```
Agent Loop: ABORTED + REVERTED

Reverted {N} commits.
Working directory restored to pre-loop state.

State cleaned: .aiwg/ralph/current-loop.json archived
```

## Error Handling

**No active loop**:
```
No active agent loop to abort.

Use --force to clean up stale state files if needed.
```

**Git not available**:
```
Git not available for --revert option.

Loop aborted, but changes cannot be reverted automatically.
Manual cleanup may be needed.
```

**Dirty working directory (for --revert)**:
```
Cannot revert: uncommitted changes exist.

Options:
1. Commit or stash changes first
2. Use /ralph-abort without --revert to keep current state
```

## State Changes

After abort:
- `current-loop.json` marked with `status: "aborted"`
- `active: false`
- Completion report generated with partial results
- Loop can no longer be resumed

## Related

- `/ralph-status` - Check loop status before aborting
- `/ralph-resume` - Continue instead of abort

## References

- @$AIWG_ROOT/agentic/code/addons/ralph/README.md — Ralph addon overview and loop executor documentation
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/human-authorization.md — Authorization rules for irreversible actions like revert
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference for ralph-abort and related commands
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/README.md — SDLC framework context
