# Ralph Loop Troubleshooting

Solutions for common Ralph issues.

## Common Issues

### "Max iterations reached"

**Symptom**: Loop stops at iteration limit without completing.

**Possible Causes**:
1. Task too broad
2. Criteria impossible to satisfy
3. Underlying issue preventing progress
4. Each fix creates new problems

**Solutions**:

1. **Check if progress was made**:
   ```bash
   /ralph-status --verbose
   ```
   If each iteration fixed something, increase limits:
   ```bash
   /ralph-resume --max-iterations 20
   ```

2. **Split the task**:
   ```bash
   # Instead of
   /ralph "Fix all tests" --completion "npm test passes"

   # Try
   /ralph "Fix auth tests" --completion "npm test -- auth"
   /ralph "Fix utils tests" --completion "npm test -- utils"
   ```

3. **Verify criteria manually**:
   ```bash
   npm test
   # Is it even possible for this to pass?
   ```

4. **Add more context**:
   ```bash
   /ralph "Fix tests - the auth mock needs updating for new API" \
     --completion "npm test passes"
   ```

---

### "Timeout reached"

**Symptom**: Loop stops due to time limit.

**Solutions**:

1. **Resume with longer timeout**:
   ```bash
   /ralph-resume --timeout 120
   ```

2. **Check if task is making progress**:
   ```bash
   /ralph-status --verbose
   ```
   If no progress, the task may need restructuring.

3. **Use faster verification**:
   ```bash
   # Instead of full test suite
   --completion "npm test -- --testPathPattern=specific"
   ```

---

### "Verification command failed to execute"

**Symptom**: Can't run the completion criteria command.

**Causes**:
1. Command doesn't exist
2. Missing dependencies
3. Wrong working directory
4. Syntax error in criteria

**Solutions**:

1. **Test command manually**:
   ```bash
   npm test
   # Does this work?
   ```

2. **Check dependencies**:
   ```bash
   npm install
   ```

3. **Verify path**:
   ```bash
   pwd
   ls package.json
   ```

4. **Fix criteria syntax**:
   ```bash
   # Wrong
   --completion "npm test | grep pass"

   # Right
   --completion "npm test passes"
   ```

---

### "Same error every iteration"

**Symptom**: No progress between iterations - same failure each time.

**Causes**:
1. Error not fixable by code changes
2. External dependency issue
3. Criteria misunderstood
4. Wrong files being modified

**Solutions**:

1. **Check the error carefully**:
   Is it actually something code changes can fix?

2. **Verify external dependencies**:
   ```bash
   # Database running?
   # API accessible?
   # Environment variables set?
   ```

3. **Provide more specific task**:
   ```bash
   /ralph-abort
   /ralph "Fix the specific error: [paste exact error message]" \
     --completion "npm test passes"
   ```

4. **Check file scope**:
   Is Ralph modifying the right files? Check git status.

---

### "Progress then regression"

**Symptom**: Fix one thing, break another. Oscillating.

**Causes**:
1. Incomplete criteria (only tests, not lint)
2. Hidden dependencies between components
3. Incomplete understanding of codebase

**Solutions**:

1. **Use compound criteria**:
   ```bash
   /ralph "Fix all issues" \
     --completion "npm test passes AND npm run lint passes AND npx tsc --noEmit passes"
   ```

2. **Add tests for fixed issues**:
   Include test creation in the task so fixes stick.

3. **Narrow the scope**:
   Work on one module at a time.

---

### "Can't resume" / "No loop to resume"

**Symptom**: `/ralph-resume` fails to find a loop.

**Causes**:
1. State file deleted
2. Loop completed or aborted
3. Wrong directory

**Solutions**:

1. **Check state**:
   ```bash
   cat .aiwg/ralph/current-loop.json
   ```

2. **If state missing, start fresh**:
   ```bash
   /ralph "task" --completion "criteria"
   ```

3. **Check directory**:
   ```bash
   pwd
   ls .aiwg/ralph/
   ```

---

### "Git conflicts during iteration"

**Symptom**: Commit fails due to conflicts.

**Solutions**:

1. **Resolve conflicts manually**:
   ```bash
   git status
   # Fix conflicts
   git add .
   git commit -m "resolve conflicts"
   ```

2. **Resume the loop**:
   ```bash
   /ralph-resume
   ```

3. **Or start fresh on clean branch**:
   ```bash
   git checkout -b ralph-fresh
   /ralph "task" --completion "criteria"
   ```

---

## Debugging Techniques

### View Full Iteration History

```bash
/ralph-status --verbose
```

Or manually:
```bash
cat .aiwg/ralph/current-loop.json | jq
ls .aiwg/ralph/iterations/
cat .aiwg/ralph/iterations/iteration-1.json
```

### Check Git History

```bash
git log --oneline -10
# Look for "ralph: iteration N" commits
```

### Manual Verification

```bash
# Run the verification command yourself
npm test
echo $?  # Should be 0 for success

# Check output for clues
npm test 2>&1 | head -50
```

### Trace Analysis (if aiwg-hooks enabled)

```bash
aiwg trace-view --filter ralph
```

### Examine Learnings

```bash
cat .aiwg/ralph/current-loop.json | jq '.learnings'
cat .aiwg/ralph/current-loop.json | jq '.iterations[].learnings'
```

## Recovery Procedures

### Clean Slate

Delete all Ralph state and start fresh:

```bash
rm -rf .aiwg/ralph/
/ralph "task" --completion "criteria"
```

### Revert All Changes

If Ralph made things worse:

```bash
/ralph-abort --revert
```

Or manually:
```bash
git log --oneline -20  # Find commit before ralph started
git reset --hard <commit>
```

### Partial Recovery

Keep some iterations, undo recent:

```bash
git log --oneline -10
git reset --hard HEAD~3  # Undo last 3 iterations
/ralph-resume
```

## Getting Help

1. Check this troubleshooting guide
2. Review [Best Practices](best-practices.md)
3. Look at [Examples](examples/) for similar tasks
4. Ask in Discord: https://discord.gg/BuAusFMxdA
5. File issue: https://github.com/jmagly/ai-writing-guide/issues

When reporting issues, include:
- Task description
- Completion criteria
- Current iteration count
- Error message or unexpected behavior
- Contents of `.aiwg/ralph/current-loop.json`
