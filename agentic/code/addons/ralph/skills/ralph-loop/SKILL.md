---
name: ralph-loop
description: Detect requests for iterative AI task loops and invoke the Ralph command
version: 1.0.0
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

## Invocation

Once task and completion are extracted/confirmed:

```
/ralph "{task}" --completion "{completion}"
```

With optional parameters if the user specified them:
- `--max-iterations N` if user mentioned iteration limit
- `--timeout M` if user mentioned time limit
- `--interactive` if task needs clarification

## Integration Notes

- This skill has **high priority** - ralph-related phrases should route here
- The skill is **exclusive** - once triggered, handle the entire request
- Always confirm extraction before invoking if there's ambiguity
- Prefer inferring completion criteria over asking (ask only if truly unclear)

## Related

- `/ralph` command - the actual loop executor
- `/ralph-status` - check loop progress
- `/ralph-resume` - continue interrupted loops
