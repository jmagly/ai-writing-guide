# Resilience & Recovery Patterns

Structured recovery protocols for handling failures in agentic workflows.

## Research Foundation

**REF-002**: Roig (2025) Key Finding

> "Recovery capability—not initial correctness—is the dominant predictor of agentic task success."

DeepSeek V3.1 achieves 92% success via post-training for verification/recovery, not model scale.

## The PAUSE-DIAGNOSE-ADAPT-RETRY-ESCALATE Protocol

### PAUSE

On any error or unexpected result:

```
ERROR DETECTED: [error message or unexpected behavior]
STATE PRESERVED: [what state was captured]
EXECUTION HALTED: Awaiting diagnosis
```

**Do NOT**:

- Immediately retry the same operation
- Continue with partial results
- Ignore the error and proceed

### DIAGNOSE

Analyze the error systematically:

```
DIAGNOSIS:
1. Error Type: [syntax|schema|logic|loop|resource|permission]
2. Root Cause: [specific cause identified]
3. Context: [what was being attempted]
4. History: [has this error occurred before in this session?]
```

**Error Type Decision Tree**:

```
Error
├─ Malformed output? → SYNTAX ERROR
├─ Wrong data structure? → SCHEMA MISMATCH
├─ Incorrect reasoning? → LOGIC ERROR
├─ Repeated same action? → LOOP DETECTED
├─ Resource unavailable? → RESOURCE ERROR
└─ Access denied? → PERMISSION ERROR
```

### ADAPT

Choose recovery strategy based on diagnosis:

| Error Type | Recovery Strategy |
|------------|-------------------|
| **SYNTAX** | Fix formatting, validate before retry |
| **SCHEMA** | Re-inspect target, update assumptions |
| **LOGIC** | Decompose into smaller steps |
| **LOOP** | Change approach entirely |
| **RESOURCE** | Wait and retry, or use alternative |
| **PERMISSION** | Escalate to user |

**Adaptation Template**:

```
ADAPTATION:
- Original approach: [what was tried]
- Failure mode: [how it failed]
- New approach: [what will be different]
- Validation: [how success will be verified]
```

### RETRY

Execute adapted approach with verification:

```
RETRY ATTEMPT [N of 3]:
- Adapted approach: [description]
- Pre-validation: [what was checked before retry]
- Execution: [attempting...]
- Post-validation: [did it succeed?]
```

**Retry Rules**:

- Maximum 3 adapted retry attempts
- Each retry MUST use a different approach
- Same approach twice = loop, change strategy

### ESCALATE

If 3 adapted retries fail:

```
ESCALATION REQUIRED

## Recovery Summary
- Original Task: [what was requested]
- Attempts Made:
  1. [approach 1] → [failure reason]
  2. [approach 2] → [failure reason]
  3. [approach 3] → [failure reason]

## Blocking Issue
[Specific problem preventing progress]

## Human Action Needed
[What the user should do]
- Option A: [action and expected outcome]
- Option B: [action and expected outcome]

## Partial Progress (if any)
[What was accomplished before failure]
[Location of any saved state]
```

## Loop Detection

Detect and break out of loops:

### Detection Criteria

A loop is detected when:

- Same tool called 3+ times with similar arguments
- Same error returned 2+ times consecutively
- Output is identical to previous iteration
- No progress made in 3+ iterations

### Loop Breaking

```
LOOP DETECTED:
- Pattern: [what's repeating]
- Iterations: [count]
- Last 3 actions: [summary]

BREAKING LOOP:
- Abandoning current approach
- Analyzing why loop occurred
- Selecting fundamentally different strategy
```

## Recovery Checkpoints

Save state at key points for recovery:

```
CHECKPOINT: [name]
- Task progress: [what's been completed]
- Current state: [relevant state variables]
- Next step: [what would come next]
- Recovery path: [how to resume from here]
```

**When to checkpoint**:

- After successful phase completion
- Before risky operations
- After gathering critical data
- Before external API calls

## Error-Specific Recovery Patterns

### Pattern 1: File Not Found

```
ERROR: File not found: [path]

DIAGNOSIS: Resource error - expected file missing

ADAPTATION:
1. List directory to find actual files
2. Search for similar filenames
3. Ask user if path is correct

RECOVERY:
- Found similar: [actual file] - proceeding with this
- OR: Escalating to user for correct path
```

### Pattern 2: Schema Mismatch

```
ERROR: Expected [schema A], got [schema B]

DIAGNOSIS: Schema mismatch - assumptions incorrect

ADAPTATION:
1. Inspect actual schema/structure
2. Update processing logic
3. Re-attempt with correct schema

RECOVERY:
- Actual structure: [description]
- Adjusted approach: [how processing changed]
```

### Pattern 3: Rate Limit / Timeout

```
ERROR: Rate limit exceeded / Timeout

DIAGNOSIS: Resource error - external constraint

ADAPTATION:
1. Wait with exponential backoff
2. Reduce request scope
3. Use cached data if available

RECOVERY:
- Waited [duration], retrying
- OR: Using cached version from [timestamp]
- OR: Escalating - requires fresh data
```

### Pattern 4: Logic Loop

```
ERROR: Loop detected - same action repeated

DIAGNOSIS: Logic error - approach not progressing

ADAPTATION:
1. Step back and re-analyze problem
2. Try completely different strategy
3. Decompose into smaller steps

RECOVERY:
- Previous approach: [what looped]
- New approach: [fundamentally different strategy]
```

## Success Metrics

From Unified Production Plan:

| Metric | Target |
|--------|--------|
| Recovery success rate | ≥80% after initial failure |
| Auto-retry coverage | ≥2 adapted retries before escalating |
| Loop detection | Detect within 3 iterations |
| Escalation quality | Actionable human guidance |

## Integration with Agent Design Bible

This implements **Rule 7: Recovery-First Design**:

> "Build agents that can diagnose and recover from failures."

Every agent should include error handling that follows this protocol.
