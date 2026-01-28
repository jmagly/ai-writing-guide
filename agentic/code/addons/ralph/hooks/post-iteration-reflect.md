# post-iteration-reflect

Generate and store a reflection after each Ralph loop iteration.

## Trigger

- Ralph loop completes an iteration (success or failure)
- External Ralph loop completes a cycle

## Enforcement Level

**REQUIRED** - A reflection must be generated after every iteration.

## Behavior

When triggered:

1. **Collect iteration data**:
   - Actions taken during iteration
   - Outcome (success/failure/partial)
   - Error messages if failure
   - Files modified

2. **Generate reflection**:
   - What was attempted?
   - What was the result?
   - What was learned?
   - What should change for next iteration?

3. **Store reflection**:
   - Save to `.aiwg/ralph/reflections/loops/{loop-id}/iteration-{n}.yaml`
   - Follow @agentic/code/addons/ralph/schemas/reflection-memory.json schema
   - Include timestamp, trial_number, trajectory, outcome, reflection, strategy_change

4. **Check for patterns**:
   - Compare to previous reflections in this loop
   - If same reflection 3+ times: flag stuck loop
   - Extract new patterns to `.aiwg/ralph/reflections/patterns/`

5. **Inject into next iteration**:
   - Prepare reflection summary for next iteration context
   - Apply sliding window (k=5 most recent)

## Reflection Format

```yaml
trial_number: 3
timestamp: "2026-01-26T10:30:00Z"
loop_id: "ralph-001"
trajectory:
  - "Modified src/auth/login.ts"
  - "Ran npm test"
  - "3 tests failed"
outcome: "failure"
reflection: "The token validation function doesn't handle expired tokens. Need to add expiry check before signature verification."
strategy_change: "Add token expiry check as first validation step"
```

## Configuration

```yaml
hook:
  name: post-iteration-reflect
  type: post-iteration
  enforcement: required
  scope:
    - ralph-loop
    - ralph-external
  output_path: ".aiwg/ralph/reflections/loops/"
```

## References

- @agentic/code/addons/ralph/schemas/reflection-memory.json - Schema
- @.aiwg/ralph/docs/reflection-memory-guide.md - Guide
- @.aiwg/research/findings/REF-021-reflexion.md - Research foundation
