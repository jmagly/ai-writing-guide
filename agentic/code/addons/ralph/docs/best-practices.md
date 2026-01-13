# Ralph Loop Best Practices

Master iterative AI task execution with these guidelines.

## Writing Effective Tasks

### Be Specific and Actionable

| Vague (Avoid) | Specific (Good) |
|---------------|-----------------|
| "Fix the code" | "Fix failing tests in src/auth/" |
| "Improve performance" | "Reduce p95 latency below 100ms" |
| "Add tests" | "Add unit tests for UserService class" |
| "Clean up" | "Remove unused imports from src/" |

### Provide Context

Good task descriptions include:
- **What** needs to be done
- **Where** (which files/modules)
- **Constraints** (if any)

```
/ralph "Migrate src/utils/*.js files to TypeScript, maintaining existing function signatures and adding explicit return types" --completion "npx tsc --noEmit passes"
```

### Scope Appropriately

| Scope | Example | Risk |
|-------|---------|------|
| Too broad | "Refactor entire codebase" | Will hit limits |
| Too narrow | "Add semicolon to line 42" | Overkill for Ralph |
| Just right | "Convert CommonJS to ESM in src/lib/" | Achievable |

## Writing Effective Completion Criteria

### Rule: Must Be Verifiable

The completion criteria MUST be checkable by running a command. If you can't verify it programmatically, Ralph can't either.

| Subjective (Bad) | Verifiable (Good) |
|------------------|-------------------|
| "Code is clean" | "npm run lint passes" |
| "Tests are good" | "npm test exits with code 0" |
| "Performance is fast" | "lighthouse score >90" |
| "Types are correct" | "npx tsc --noEmit passes" |

### Common Verification Patterns

#### Testing
```bash
# All tests pass
--completion "npm test passes"

# Specific test file
--completion "npm test -- auth.test.ts passes"

# With coverage threshold
--completion "npm test -- --coverage --coverageThreshold='{\"global\":{\"lines\":80}}'"

# Specific framework
--completion "jest passes"
--completion "pytest exits with code 0"
--completion "go test ./... passes"
```

#### Type Checking
```bash
# TypeScript
--completion "npx tsc --noEmit exits with code 0"

# Python
--completion "mypy . passes"

# Rust
--completion "cargo check passes"
```

#### Linting
```bash
# ESLint
--completion "npm run lint passes"
--completion "eslint src/ --max-warnings 0"

# Python
--completion "ruff check . passes"
--completion "black --check . passes"
```

#### Building
```bash
# Node
--completion "npm run build succeeds"

# Rust
--completion "cargo build --release passes"

# Go
--completion "go build ./... passes"
```

### Compound Criteria

Combine multiple checks with AND:

```bash
--completion "npm test passes AND npm run lint passes AND npx tsc --noEmit passes"
```

Ralph will verify ALL conditions are met.

## Setting Iteration Limits

### Choosing Max Iterations

| Task Type | Typical Iterations | Recommended Max |
|-----------|-------------------|-----------------|
| Fix 1-3 test failures | 2-4 | 10 |
| Fix lint errors | 2-3 | 10 |
| Fix type errors | 3-8 | 15 |
| Small migration | 5-10 | 15 |
| Large migration | 10-20 | 25 |
| Coverage improvement | 5-15 | 20 |
| Greenfield scaffold | 10-30 | 40 |

### When to Increase Limits

Increase `--max-iterations` if:
- Task was making steady progress when it hit the limit
- Each iteration fixes some issues but reveals more
- Task is inherently iterative (like improving coverage)

```bash
/ralph-resume --max-iterations 25
```

### When to Split Tasks

Split into smaller tasks if:
- Hitting limits without meaningful progress
- Errors are in unrelated areas
- Task scope is too broad

```bash
# Instead of
/ralph "Fix all tests" --completion "npm test passes"

# Split into
/ralph "Fix auth tests" --completion "npm test -- auth passes"
/ralph "Fix utils tests" --completion "npm test -- utils passes"
```

## Git Workflow

### Auto-Commit (Default)

Ralph commits after each iteration:
```
ralph: iteration 1 - initial implementation
ralph: iteration 2 - fix auth test
ralph: iteration 3 - fix edge case
```

**Benefits**:
- Easy rollback to any iteration
- Clear progress history
- Supports `/ralph-resume`
- Blame-able history

### Using Branches

For larger changes, use a branch:

```bash
/ralph "big refactor" --completion "..." --branch "refactor-auth"
```

Creates `ralph/refactor-auth` branch, preserving main.

### Final Squash (Optional)

After successful completion, you can squash the commits:

```bash
git rebase -i HEAD~{N}
# Squash all "ralph: iteration" commits into one
```

### Disabling Auto-Commit

If you prefer manual commits:

```bash
/ralph "task" --completion "..." --no-commit
```

## Common Patterns

### Test Fix Loop

```bash
/ralph "Fix all failing tests" --completion "npm test passes"
```

### Migration Loop

```bash
/ralph "Migrate src/ from CommonJS to ESM" \
  --completion "node --experimental-vm-modules src/index.mjs runs" \
  --max-iterations 20
```

### Coverage Loop

```bash
/ralph "Add tests to reach 80% coverage" \
  --completion "npm run coverage -- --coverageThreshold='{\"global\":{\"lines\":80}}'" \
  --max-iterations 30
```

### Lint Cleanup Loop

```bash
/ralph "Fix all ESLint errors and warnings" \
  --completion "eslint src/ --max-warnings 0"
```

### Type Safety Loop

```bash
/ralph "Add TypeScript types to all exported functions" \
  --completion "npx tsc --noEmit && npm run lint:types"
```

### Dependency Update Loop

```bash
/ralph "Update all dependencies and fix breaking changes" \
  --completion "npm test passes && npm run build succeeds"
```

## Anti-Patterns to Avoid

### Subjective Criteria

```bash
# BAD - cannot verify
/ralph "Make the code better" --completion "code looks good"
```

### Missing Completion Criteria

```bash
# BAD - no way to know when done
/ralph "Fix things"
```

### Infinite Scope

```bash
# BAD - will never complete
/ralph "Add all missing features" --completion "product is complete"
```

### Ignoring Limits

```bash
# BAD - if 10 didn't work, 100 probably won't either
/ralph "..." --completion "..." --max-iterations 100
```

### External Dependencies

```bash
# RISKY - depends on external service
/ralph "Fix API integration" --completion "curl api.example.com/health returns 200"
```

## Debugging Failed Loops

### Check Iteration History

```bash
/ralph-status --verbose
```

Look for:
- Is the same error repeating?
- Is there progress between iterations?
- Are learnings actionable?

### Manual Verification

Run the verification command yourself:

```bash
npm test
echo $?  # Should be 0 for success
```

### Examine Learnings

Read `.aiwg/ralph/current-loop.json` to see accumulated learnings.

### Start Fresh with More Context

If stuck, abort and restart with more specific guidance:

```bash
/ralph-abort
/ralph "Fix auth tests - the mock for getUserById needs to return user with 'admin' role" \
  --completion "npm test -- auth passes"
```
