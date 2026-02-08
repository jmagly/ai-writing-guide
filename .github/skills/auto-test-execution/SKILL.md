# auto-test-execution

Automatically execute tests when code-generating agents write to source files, enforcing the execute-before-return pattern.

## Triggers

- Agent writes to `src/**/*.ts`
- Agent writes to `src/**/*.js`
- Agent writes to `src/**/*.py`
- Agent writes to `**/*.go`
- Agent writes to `**/*.rs`
- "run tests"
- "execute feedback"
- "verify my changes"

## Purpose

This skill enforces the MetaGPT executable feedback pattern: code-generating agents must execute tests before returning results to the user. It activates automatically when agents modify source code files.

## Behavior

When triggered, this skill:

1. **Detect modified files**:
   - Track which source files the agent has written to
   - Identify the relevant test framework

2. **Find related tests**:
   - Look for test files matching the modified source
   - Convention: `src/foo/bar.ts` -> `test/unit/foo/bar.test.ts`
   - If no tests exist, prompt agent to generate them

3. **Execute tests**:
   - Run the project's test command focused on relevant tests
   - Capture results: passed, failed, errors

4. **Handle results**:
   - All pass: Allow agent to return results
   - Failures: Trigger debug-and-retry loop (max 3 attempts)
   - Persistent failures: Escalate with debug memory context

5. **Update debug memory**:
   - Record session in `.aiwg/ralph/debug-memory/sessions/`
   - Extract patterns for future reference

## Activation Conditions

```yaml
activation:
  always_active_for:
    - software-implementer
    - debugger
    - test-engineer

  triggered_by:
    - file_write:
        patterns:
          - "src/**/*.ts"
          - "src/**/*.js"
          - "src/**/*.py"
          - "**/*.go"
          - "**/*.rs"

  skip_when:
    - test_files_only: true
    - documentation_only: true
    - configuration_only: true
```

## Integration

This skill uses:
- `project-awareness`: Detect test framework and configuration
- Debug memory at `.aiwg/ralph/debug-memory/` for pattern learning

## References

- @.claude/rules/executable-feedback.md - Feedback rules
- @.aiwg/ralph/docs/executable-feedback-guide.md - Guide
- @agentic/code/addons/ralph/schemas/debug-memory.yaml - Memory schema
- @.aiwg/research/findings/REF-013-metagpt.md - Research foundation
