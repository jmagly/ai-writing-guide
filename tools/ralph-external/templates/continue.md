# External Ralph Loop - Continuation (Iteration {{iteration}}/{{maxIterations}})

## Task Objective
{{objective}}

## Completion Criteria
{{completionCriteria}}

---

## Previous Session Summary

**Status**: {{previousStatus}}

### What Happened
{{previousOutput}}

### Last Analysis
{{lastAnalysis}}

---

## Accumulated Learnings

{{learnings}}

## Files Modified So Far
- {{filesModified}}

---

## Instructions

Continue working toward the objective. This is a **continuation** of previous work.

### First Steps

1. **Check internal Ralph state**:
   ```
   /ralph-status
   ```
   If active, resume with `/ralph-resume`.

2. **Check matric-memory for context**:
   ```
   matric-memory get "ralph:external:{{loopId}}:*"
   ```

3. **Review git history** for recent progress:
   ```
   git log --oneline -10
   ```

### Continue Implementation

If internal Ralph is not active, start a new internal loop:

```
/ralph "{{objective}}" --completion "{{completionCriteria}}" --max-iterations 10
```

### Apply Learnings

Use the accumulated learnings above to avoid repeating mistakes and build on previous progress.

### Completion Signaling

When complete, output:
```json
{"ralph_external_completion": true, "success": true, "reason": "Task completed", "iterations": N}
```

If blocked, output:
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

## Begin Continuation

Review the previous session state and continue from where it left off.
