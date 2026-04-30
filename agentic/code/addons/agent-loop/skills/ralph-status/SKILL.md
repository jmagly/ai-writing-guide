---
namespace: aiwg
name: ralph-status
platforms: [all]
description: Check status of current or previous agent loop
commandHint:
  argumentHint: '[--verbose] [--latest] [--all --interactive --guidance "text"]'
  allowedTools: "Read, Glob, Bash"
  model: haiku
  category: automation
---

# Al Status

Check the status of agent loops.

## Usage

```
/ralph-status              # Current loop status
/ralph-status --verbose    # Detailed iteration history
/ralph-status --latest     # Show latest completion report
/ralph-status --all        # List all completion reports
```

## Your Actions

### Default (Current Loop)

1. Read `.aiwg/ralph/current-loop.json`
2. Display status summary

**If active loop exists**:
```
Agent Loop: ACTIVE

Task: {task}
Completion: {completion}
Progress: {current}/{max} iterations
Duration: {elapsed}
Status: {running | paused}

Last iteration:
  Result: {result}
  Learnings: {learnings}

Use /ralph-resume to continue or /ralph-abort to stop.
```

**If no active loop**:
```
No active agent loop.

Use /ralph "task" --completion "criteria" to start one.
```

### --verbose

Include full iteration history:

```
Agent Loop: ACTIVE

Task: {task}
Completion: {completion}
Progress: {current}/{max} iterations

Iteration History:
| # | Time | Action | Result | Learnings |
|---|------|--------|--------|-----------|
| 1 | 10:30 | Initial attempt | 3 failures | Need auth mocks |
| 2 | 10:32 | Added mocks | 1 failure | Date edge case |
| 3 | 10:34 | Fixed date | In progress... | - |
```

### --latest

Read and display most recent completion report:

1. Find latest `completion-*.md` in `.aiwg/ralph/`
2. Display contents

### --all

List all completion reports:

```
Agent Loop History

| Date | Task | Status | Iterations |
|------|------|--------|------------|
| 2025-01-15 10:45 | Fix auth tests | SUCCESS | 3 |
| 2025-01-14 15:20 | Migrate to ESM | SUCCESS | 8 |
| 2025-01-13 09:00 | Add coverage | MAX_ITER | 10 |

View report: /ralph-status --report 2025-01-15
```

## State File Location

- Current loop: `.aiwg/ralph/current-loop.json`
- Iterations: `.aiwg/ralph/iterations/`
- Reports: `.aiwg/ralph/completion-*.md`

## Error Handling

**No state directory**:
```
Al has not been used in this project yet.

Get started with:
  /ralph "your task" --completion "verification command"

Or:
  /ralph --interactive
```

**Corrupted state**:
```
agent loop state file is corrupted.

Options:
1. Delete and start fresh: rm -rf .aiwg/ralph/
2. Check file manually: cat .aiwg/ralph/current-loop.json
```

## References

- @$AIWG_ROOT/agentic/code/addons/ralph/README.md — Ralph addon overview and loop executor documentation
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference for ralph-status and related commands
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/vague-discretion.md — Loop completion and iteration limit rules
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/README.md — SDLC framework context
