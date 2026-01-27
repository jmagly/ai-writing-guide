# pre-return-execution-gate

Block code-generating agents from returning results without execution evidence.

## Trigger

- Software Implementer completes code generation task
- Debugger completes fix
- Test Engineer generates test code
- Code Reviewer completes review with code changes

## Enforcement Level

**BLOCK** - Agent cannot return code results without execution record.

## Behavior

When triggered:

1. **Check for execution record**:
   - Look for test execution evidence in the current session
   - Check `.aiwg/ralph/debug-memory/sessions/` for recent entry
   - Verify test results are present (passed/failed/error counts)

2. **If execution record found**:
   - Verify tests passed (or failures are documented)
   - Allow agent to return results
   - Log execution evidence in session

3. **If NO execution record found**:
   - **BLOCK** the return
   - Display message: "Execution evidence required before returning code"
   - Suggest running tests: `npm test`, `pytest`, etc.
   - Agent must execute tests before proceeding

4. **Exceptions**:
   - Documentation-only changes (no code modified)
   - Configuration changes (no executable code)
   - Agent explicitly marks `execution_skip: true` with reason
   - Test infrastructure not available (logged as skip)

## Block Format

```
BLOCKED: Execution Evidence Required
======================================
Agent: Software Implementer
Task: Implement user authentication

No test execution record found for this task.
The executable feedback pattern requires tests to be
run before returning code to the user.

Actions:
  1. Run tests: npm test (or project test command)
  2. Fix any failures
  3. Record results in debug memory
  4. Then return your results

Skip (with reason): Set execution_skip: true

Reference: @.claude/rules/executable-feedback.md
======================================
```

## Configuration

```yaml
hook:
  name: pre-return-execution-gate
  type: pre-return
  enforcement: block
  agents:
    - software-implementer
    - debugger
    - test-engineer
    - code-reviewer
  skip_conditions:
    - no_code_modified: true
    - execution_skip_with_reason: true
    - test_infrastructure_unavailable: true
```

## References

- @.claude/rules/executable-feedback.md - Feedback rules
- @.aiwg/ralph/schemas/debug-memory.yaml - Memory schema
- @.aiwg/flows/schemas/executable-feedback.yaml - Workflow schema
- @.aiwg/research/findings/REF-013-metagpt.md - Research foundation
