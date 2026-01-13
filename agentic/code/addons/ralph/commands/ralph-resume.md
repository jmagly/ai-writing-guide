---
description: Resume an interrupted Ralph loop from last checkpoint
category: automation
argument-hint: [--max-iterations N] [--timeout M]
allowed-tools: Task, Read, Write, Bash, Glob, Grep, TodoWrite, Edit
orchestration: true
model: opus
---

# Ralph Resume

Resume a paused or interrupted Ralph loop.

## Usage

```
/ralph-resume                       # Resume with existing settings
/ralph-resume --max-iterations 20   # Resume with higher iteration limit
/ralph-resume --timeout 120         # Resume with longer timeout
```

## Parameters

### --max-iterations N
Override the maximum iterations limit. Useful when loop stopped at limit but was making progress.

### --timeout M
Override the timeout in minutes. Useful when loop timed out but task is close to completion.

## Your Actions

### Step 1: Load State

1. Read `.aiwg/ralph/current-loop.json`
2. Verify loop can be resumed (status != 'success', status != 'aborted')
3. Load iteration history and learnings

**If no resumable loop**:
```
No Ralph loop to resume.

Status: {status}

{If success}: Loop completed successfully. Start a new loop with /ralph
{If aborted}: Loop was aborted. Start fresh with /ralph
{If no state}: No loop found. Start with /ralph "task" --completion "criteria"
```

### Step 2: Update Settings

Apply any parameter overrides:
- Update `maxIterations` if --max-iterations provided
- Update `timeoutMinutes` if --timeout provided
- Reset timeout start time for extended timeout

### Step 3: Resume Execution

Continue the Ralph loop pattern:

1. Display resume status:
```
Resuming Ralph Loop

Task: {task}
Completion: {completion}
Previous iterations: {N}
Remaining iterations: {max - N}

Last result: {lastResult}
Learnings so far: {learnings}

Continuing from iteration {N+1}...
```

2. Execute next iteration with accumulated learnings
3. Follow standard Ralph loop verification
4. Continue until success or new limits reached

### Step 4: Handle Completion

Same as `/ralph` - generate completion report on success or limit.

## Resume Context

When resuming, include in the task context:

```
## Ralph Loop Resume Context

**Original Task**: {task}
**Completion Criteria**: {completion}

**Previous Iterations**: {N}
**Accumulated Learnings**:
{for each iteration}
- Iteration {i}: {action} -> {result}. Learned: {learnings}
{end for}

**Current State**:
- Last attempt: {lastResult}
- Key insight: {most recent learning}

**Your Goal**:
Continue iterating from iteration {N+1}.
Apply learnings from previous iterations.
Verify against completion criteria after each attempt.
```

## Error Handling

**Loop completed successfully**:
```
This Ralph loop already completed successfully.

Final status: SUCCESS
Iterations: {N}
Report: .aiwg/ralph/completion-{timestamp}.md

To run again, start a new loop:
  /ralph "task" --completion "criteria"
```

**Loop was aborted**:
```
This Ralph loop was aborted and cannot be resumed.

To start fresh with the same task:
  /ralph "{original task}" --completion "{original completion}"
```

**State corrupted**:
```
Ralph loop state is corrupted or incomplete.

Options:
1. Start fresh: /ralph "task" --completion "criteria"
2. Clean up: rm -rf .aiwg/ralph/ then start new loop
```

## Example Scenarios

### Max Iterations Override

Previous loop stopped at iteration 10:
```
/ralph-resume --max-iterations 20
```
Continues with 10 more iterations available.

### Timeout Override

Previous loop timed out at 60 minutes:
```
/ralph-resume --timeout 120
```
Continues with fresh 120-minute timeout.

### Simple Resume

Loop interrupted (network, restart, etc.):
```
/ralph-resume
```
Continues from last checkpoint with original settings.

## Related

- `/ralph-status` - Check what state the loop is in
- `/ralph-abort` - Stop instead of resume
- `/ralph` - Start new loop
