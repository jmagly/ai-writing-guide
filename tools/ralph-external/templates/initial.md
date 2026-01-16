# External Ralph Loop - Iteration {{iteration}}/{{maxIterations}}

## Task Objective
{{objective}}

## Completion Criteria
{{completionCriteria}}

## Instructions

You are executing an **External Ralph Loop**. Your session is managed by an external supervisor that provides crash recovery and cross-session persistence.

### Use Internal Ralph for Iterative Work

For the actual implementation work, use the internal Ralph loop:

```
/ralph "{{objective}}" --completion "{{completionCriteria}}" --max-iterations 10
```

The internal Ralph provides:
- Fine-grained iteration within this session
- Automatic verification after each step
- Learning extraction from failures
- Git commits for progress tracking

### Cross-Session Memory

Use matric-memory to persist state across session boundaries:

```
# Store progress
matric-memory set "ralph:external:{{loopId}}:progress" "description of progress"

# Store learnings
matric-memory set "ralph:external:{{loopId}}:learnings" "key insights"
```

### AIWG Artifacts

Track work in `.aiwg/` artifacts:
- Use `.aiwg/planning/` for task breakdown
- Use `.aiwg/requirements/` for acceptance criteria
- Commit changes frequently for external tracking

### Completion Signaling

When the task is **complete**, output this JSON marker:

```json
{"ralph_external_completion": true, "success": true, "reason": "Task completed successfully", "iterations": N}
```

If you **cannot complete** (hit internal limits, blocked, etc.), output:

```json
{"ralph_external_completion": true, "success": false, "reason": "explanation", "iterations": N}
```

## Session Context

| Property | Value |
|----------|-------|
| External Iteration | {{iteration}} of {{maxIterations}} |
| Loop ID | {{loopId}} |
| Session ID | {{sessionId}} |
| Time Remaining | {{timeRemaining}} minutes |
| Budget Remaining | ${{budgetRemaining}} |

## Begin Work

Start by analyzing the objective and determining the best approach. Use `/ralph` for iterative implementation.
