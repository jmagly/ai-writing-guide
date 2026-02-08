---
name: ralph-loop
description: Detect requests for iterative AI task loops and invoke the Ralph command
version: 2.0.0
triggers:
  - "ralph this"
  - "ralph:"
  - "ralph it"
  - "keep trying until"
  - "loop until"
  - "iterate until"
  - "run until passes"
  - "fix until green"
  - "keep fixing until"
  - "keep going until"
  - "iterate on"
---

# Ralph Loop Skill

You detect when users want iterative task execution and route to the `/ralph` command.

## Trigger Patterns

| Pattern | Example | Action |
|---------|---------|--------|
| `ralph this: X` | "ralph this: fix all lint errors" | Extract task, infer completion |
| `ralph: X` | "ralph: migrate to TypeScript" | Extract task, infer completion |
| `ralph it` | "ralph it" (after task description) | Use conversation context |
| `keep trying until X` | "keep trying until tests pass" | Task = current context, completion = X |
| `loop until X` | "loop until coverage >80%" | Task = improve coverage, completion = X |
| `iterate until X` | "iterate until no errors" | Task = fix errors, completion = X |
| `run until passes` | "run until passes" | Infer test command |
| `fix until green` | "fix until green" | Task = fix tests, completion = tests pass |
| `keep fixing until X` | "keep fixing until lint is clean" | Task = fix lint, completion = X |

## Extraction Logic

### Task Extraction

**From explicit task**:
- "ralph this: fix all TypeScript errors" → Task: "fix all TypeScript errors"
- "ralph: migrate src/ to ESM" → Task: "migrate src/ to ESM"

**From context**:
- "ralph it" after discussing a refactor → Use previous conversation as task context

### Completion Inference

When user doesn't specify explicit verification:

| Task Pattern | Inferred Completion |
|--------------|---------------------|
| "fix tests" | "npm test passes" |
| "fix lint" / "fix linting" | "npm run lint passes" |
| "fix types" / "fix TypeScript" | "npx tsc --noEmit passes" |
| "fix build" | "npm run build succeeds" |
| "add tests" | "test coverage increases" |
| "migrate to ESM" | "node runs without errors" |
| "refactor X" | "npm test passes" (preserve behavior) |

### Examples

**User**: "ralph this: migrate all files in lib/ to ESM"
**Extraction**:
- Task: "migrate all files in lib/ to ESM"
- Completion (inferred): "node --experimental-vm-modules lib/index.js runs without errors"

**Action**: Invoke `/ralph "migrate all files in lib/ to ESM" --completion "node --experimental-vm-modules lib/index.js succeeds"`

---

**User**: "keep fixing until the tests are green"
**Extraction**:
- Task: "fix failing tests" (from context or implied)
- Completion: "npm test passes with 0 failures"

**Action**: Invoke `/ralph "fix failing tests" --completion "npm test passes"`

---

**User**: "ralph it" (after discussing adding auth validation)
**Extraction**:
- Task: (from conversation context about auth validation)
- Completion: (infer based on task type)

**Action**: Invoke `/ralph "{context-based task}" --completion "{inferred criteria}"`

---

**User**: "loop until coverage is above 80%"
**Extraction**:
- Task: "add tests to improve coverage"
- Completion: "npm run coverage shows >80%"

**Action**: Invoke `/ralph "add tests to improve coverage" --completion "coverage report shows >80%"`

## Clarification Prompts

If extraction is ambiguous, ask the user:

```
I'll start a Ralph loop for: {extracted task}

What command verifies completion?
1. npm test (Recommended for test fixes)
2. npx tsc --noEmit (For type errors)
3. npm run lint (For lint errors)
4. npm run build (For build issues)
5. Custom command...
```

Or if task is unclear:

```
I detected a Ralph loop request. To start iterating:

What task should I repeat until success?
What command tells me when it's done?
```

## Multi-Loop Support

**Version 2.0** adds concurrent loop execution with registry tracking.

### Concurrency Limits

- **MAX_CONCURRENT_LOOPS**: 4 (per REF-086)
- **Research basis**: 17.2x error trap beyond 4 concurrent agents
- **Communication overhead**: n*(n-1)/2 paths = 6 at max capacity

### Loop ID Format

All loops have unique identifiers:
- Pattern: `ralph-{slug}-{uuid8}`
- Example: `ralph-fix-tests-a1b2c3d4`

### --loop-id Parameter

Users can optionally specify a loop ID:

```
/ralph "fix tests" --completion "npm test passes" --loop-id ralph-my-fixes-12345678
```

If not provided, ID is auto-generated from task description.

### Registry Tracking

All active loops tracked in `.aiwg/ralph/registry.json`:

```json
{
  "version": "2.0.0",
  "max_concurrent_loops": 4,
  "active_loops": [
    {
      "loop_id": "ralph-fix-tests-a1b2c3d4",
      "status": "running",
      "iteration": 5,
      "task": "fix all TypeScript errors",
      "started_at": "2026-02-02T21:00:00Z",
      "pid": 12345
    }
  ]
}
```

### Concurrent Loop Behavior

**When starting a new loop**:

1. Check registry: `active_loops.length < 4`
2. If at limit: Show error with active loop list
3. If space available: Register new loop and start

**User sees**:

```
Error: Maximum concurrent loops (4) reached

Active loops:
1. ralph-fix-tests-a1b2c3d4 (iteration 5) - fix TypeScript errors
2. ralph-add-docs-b2c3d4e5 (iteration 3) - add JSDoc comments
3. ralph-refactor-c3d4e5f6 (iteration 8) - refactor API module
4. ralph-migrate-d4e5f6a7 (iteration 2) - migrate to ESM

Abort one with: aiwg ralph-abort {loop_id}
```

### Loop Status Commands

**Check all active loops**:
```
aiwg ralph-status --all
```

**Check specific loop**:
```
aiwg ralph-status ralph-fix-tests-a1b2c3d4
```

**Abort a loop**:
```
aiwg ralph-abort ralph-fix-tests-a1b2c3d4
```

**Resume a paused loop**:
```
aiwg ralph-resume ralph-fix-tests-a1b2c3d4
```

### Directory Structure

Multi-loop structure per loop:

```
.aiwg/ralph/
├── registry.json                    # Multi-loop registry
└── loops/
    ├── ralph-fix-tests-a1b2c3d4/
    │   ├── state.json
    │   ├── checkpoints/
    │   │   ├── iteration-001.json.gz
    │   │   └── iteration-002.json.gz
    │   └── analytics/
    │       └── analytics.json
    └── ralph-add-docs-b2c3d4e5/
        ├── state.json
        └── ...
```

## Invocation

Once task and completion are extracted/confirmed:

```
/ralph "{task}" --completion "{completion}"
```

With optional parameters if the user specified them:
- `--max-iterations N` if user mentioned iteration limit
- `--timeout M` if user mentioned time limit
- `--interactive` if task needs clarification
- `--loop-id {id}` if user wants custom loop ID

### Multi-Loop Examples

**Parallel bug fixes**:
```
User: "ralph: fix TypeScript errors in src/"
→ Loop 1: ralph-fix-ts-errors-a1b2c3d4

User: "also ralph: add missing tests in lib/"
→ Loop 2: ralph-add-tests-b2c3d4e5

Both running in parallel until completion criteria met.
```

**Sequential with manual abort**:
```
User: "ralph: refactor entire auth module"
→ Loop 1: ralph-refactor-auth-c3d4e5f6 (running)

User: "actually, abort that and just fix the login bug"
→ aiwg ralph-abort ralph-refactor-auth-c3d4e5f6
→ Loop 2: ralph-fix-login-d4e5f6a7 (running)
```

## Integration Notes

- This skill has **high priority** - ralph-related phrases should route here
- The skill is **exclusive** - once triggered, handle the entire request
- Always confirm extraction before invoking if there's ambiguity
- Prefer inferring completion criteria over asking (ask only if truly unclear)
- Check registry capacity before starting new loops
- Show helpful errors with active loop list when at capacity

## Related

- `/ralph` command - the actual loop executor
- `/ralph-status` - check loop progress
- `/ralph-resume` - continue interrupted loops
- `/ralph-abort` - abort active loops
- `@agentic/code/addons/ralph/schemas/loop-registry.yaml` - Registry schema
- `@agentic/code/addons/ralph/schemas/loop-state.yaml` - Loop state schema
- `@.aiwg/research/findings/REF-086-cognitive-load-limits.md` - Concurrency research

## Version History

- **2.0.0**: Added multi-loop support with registry tracking (Issue #268)
- **1.0.0**: Initial single-loop implementation
