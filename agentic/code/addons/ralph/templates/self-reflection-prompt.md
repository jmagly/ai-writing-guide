# Self-Reflection Prompt Template

Use this template to inject past reflections into agent context before each iteration.

## Template

```
## Lessons from Previous Iterations

You have attempted this task {{trial_count}} times. Here are your reflections:

{{#each reflections}}
### Iteration {{this.trial_number}}
- **Outcome**: {{this.outcome}}
- **Reflection**: {{this.reflection}}
- **Strategy Change**: {{this.strategy_change}}
{{/each}}

## Instructions

Based on these reflections:
1. Do NOT repeat actions that previously failed
2. Apply the most recent strategy change
3. If you notice you are stuck in a loop (repeating the same approach), try a fundamentally different approach
4. After this iteration, reflect on what you learned
```

## Usage

The `reflection-injection` skill fills this template with:
- `trial_count`: Current iteration number
- `reflections`: Array of k=5 most recent reflections from `.aiwg/ralph/reflections/`

## Example Rendered Output

```
## Lessons from Previous Iterations

You have attempted this task 3 times. Here are your reflections:

### Iteration 1
- **Outcome**: failure
- **Reflection**: The login function throws when token is null. Need to add null check.
- **Strategy Change**: Add null check at function entry before processing token.

### Iteration 2
- **Outcome**: failure
- **Reflection**: Null check added but refresh token path also fails. Token refresh needs same guard.
- **Strategy Change**: Apply null checks to both access and refresh token paths.

### Iteration 3
- **Outcome**: partial
- **Reflection**: Both token paths now handle null but test expects specific error message format.
- **Strategy Change**: Match error message format to test expectations: "Token required" not "Invalid token".

## Instructions

Based on these reflections:
1. Do NOT repeat actions that previously failed
2. Apply the most recent strategy change
3. If you notice you are stuck in a loop (repeating the same approach), try a fundamentally different approach
4. After this iteration, reflect on what you learned
```

## References

- @.aiwg/ralph/schemas/reflection-memory.json - Reflection schema
- @.aiwg/ralph/docs/reflection-memory-guide.md - Guide
- @.aiwg/research/findings/REF-021-reflexion.md - Research foundation
