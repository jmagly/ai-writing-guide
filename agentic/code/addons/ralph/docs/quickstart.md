# Ralph Loop Quickstart

Get started with iterative AI task execution in 5 minutes.

## Before You Start: Is Ralph Right for This Task?

**Ralph is a power tool.** Before invoking it, ask yourself:

| Question | If NO |
|----------|-------|
| Is my task well-defined with clear requirements? | Document requirements first |
| Can I write a command that verifies success? | Ralph can't help with subjective goals |
| Do I have tests/linting to validate correctness? | Add verification first |
| Is this implementation work, not exploration? | Use Discovery Track for research |

**The token-burning trap**: Ralph excels at HOW to implement but thrashes on WHAT to build. If you don't have clear requirements, Ralph will hallucinate features, contradict itself, and burn tokens producing junk.

**Safe to proceed?** Read on. **Unsure?** See [When to Use Ralph](when-to-use-ralph.md) first.

---

## What is Ralph?

Ralph (from the "Ralph Wiggum methodology") executes AI tasks in a loop until completion criteria are met:

1. **Execute** your task
2. **Verify** if completion criteria are met
3. **Learn** from failures
4. **Iterate** until success (or limits reached)

**Philosophy**: "Iteration beats perfection" - errors become learning data within the loop rather than session-ending failures.

## Installation

```bash
# Install Ralph addon
aiwg use ralph

# Or install alongside SDLC framework
aiwg use sdlc
aiwg install-plugin ralph
```

## Your First Ralph Loop

### Example 1: Fix Failing Tests

```
/ralph "Fix all failing tests" --completion "npm test passes"
```

Ralph will:
1. Run your tests to see what's failing
2. Analyze and fix the issues
3. Run tests again
4. Repeat until all tests pass (or max iterations reached)

### Example 2: Fix TypeScript Errors

```
/ralph "Fix all TypeScript errors" --completion "npx tsc --noEmit passes"
```

### Example 3: Improve Test Coverage

```
/ralph "Add tests to reach 80% coverage" --completion "coverage report shows >80%"
```

### Example 4: Fix Lint Errors

```
/ralph "Fix all ESLint errors" --completion "npm run lint passes"
```

## Interactive Mode

Not sure about completion criteria? Use interactive mode:

```
/ralph --interactive
```

Ralph will ask you:
- What task should I execute?
- How do I verify it's complete?
- Any files I should avoid?
- Other constraints?

## Natural Language

You can also trigger Ralph with natural language:

- "ralph this: fix all the lint errors"
- "keep trying until the tests pass"
- "loop until coverage is above 80%"
- "ralph it" (after describing a task)

## Monitoring Progress

### Check Status
```
/ralph-status
```

Shows current iteration, progress, and learnings.

### Check Detailed History
```
/ralph-status --verbose
```

Shows full iteration history.

## Managing Loops

### Abort If Stuck
```
/ralph-abort
```

Stops the loop, keeps all changes.

### Abort and Revert
```
/ralph-abort --revert
```

Stops the loop and reverts all changes.

### Resume After Interruption
```
/ralph-resume
```

Continues from the last checkpoint.

### Resume with More Iterations
```
/ralph-resume --max-iterations 20
```

## Key Options

| Option | Default | Description |
|--------|---------|-------------|
| `--completion` | Required | Verification command/criteria |
| `--max-iterations` | 10 | Safety limit on attempts |
| `--timeout` | 60 | Maximum minutes |
| `--interactive` | false | Ask clarifying questions |
| `--no-commit` | false | Disable auto-commits |
| `--branch` | none | Create feature branch |

## Best Practices

### 1. Be Specific
```
# Good
/ralph "Fix auth module tests" --completion "npm test -- auth"

# Too vague
/ralph "Fix tests" --completion "npm test passes"
```

### 2. Use Verifiable Criteria
```
# Good - can verify with command
--completion "npm test passes"
--completion "npx tsc --noEmit exits with code 0"

# Bad - subjective
--completion "code looks good"
```

### 3. Set Reasonable Limits
- Simple fixes: 5-10 iterations
- Migrations: 15-20 iterations
- Complex tasks: 20-30 iterations

### 4. Let Git Track Progress
Ralph auto-commits each iteration by default, creating a clear history:
```
ralph: iteration 1 - initial attempt
ralph: iteration 2 - fixed auth test
ralph: iteration 3 - fixed edge case
```

## Output Files

Ralph stores state and reports in `.aiwg/ralph/`:

```
.aiwg/ralph/
├── current-loop.json        # Current loop state
├── iterations/              # Individual iteration details
│   ├── iteration-1.json
│   └── iteration-2.json
└── completion-2025-01-15.md # Completion report
```

## Next Steps

- Read [When to Use Ralph](when-to-use-ralph.md) to understand Ralph's sweet spot
- Read [Best Practices](best-practices.md) for effective prompt engineering
- See [Examples](examples/) for common patterns
- Check [Troubleshooting](troubleshooting.md) if you get stuck

## Quick Reference

```bash
# Start a loop
/ralph "task" --completion "criteria"

# Interactive start
/ralph --interactive

# Check status
/ralph-status

# Resume interrupted loop
/ralph-resume

# Abort loop
/ralph-abort
```
