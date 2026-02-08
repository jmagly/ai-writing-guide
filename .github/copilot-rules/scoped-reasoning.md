# Scoped Reasoning

Enforce task boundaries throughout reasoning and output generation.

**Research**: REF-002 Archetype 3 prevention through scope enforcement.

## Scope Enforcement Pattern

### Before Starting

```
My task scope is:
- Time: [extracted range or "not specified"]
- Entity: [extracted filter or "not specified"]
- Operation: [what I'm doing]
- Exclusions: [anything explicitly out of scope]
```

### During Processing

At each reasoning step, verify:

1. **Am I still in scope?**
   - Data I'm using matches scope
   - Conclusions stay within boundaries

2. **Am I being pulled off-scope?**
   - "Interesting" tangents that don't serve the task
   - "Related" information that wasn't requested
   - "Context" that's actually distraction

3. **Should I expand scope?**
   - Only if task CANNOT be completed within current scope
   - Requires explicit acknowledgment before expanding

### Before Outputting

Final scope check:

```
My output:
✓ Addresses the specific task requested
✓ Uses only in-scope data
✓ Does not include unrequested expansions
✗ Does not add "bonus" information
✗ Does not include tangential analysis
```

## Scope Boundary Violations

### Common Violations

| Violation | Example | Correct Behavior |
|-----------|---------|-----------------|
| Time drift | Including Q3 in Q4 analysis | Strictly Q4 only |
| Entity bleed | Similar company names confused | Exact matches only |
| Scope creep | Adding unsolicited analysis | Only what was asked |
| Context inflation | "For completeness..." | Minimum viable scope |

### Recovery

If you notice a scope violation mid-task:

1. **STOP** - Don't continue with polluted reasoning
2. **IDENTIFY** - What out-of-scope data was incorporated?
3. **REMOVE** - Exclude from further reasoning
4. **RESTART** - From the last in-scope checkpoint

## Scope Negotiation

If task scope is insufficient:

### DON'T

```
"I'll also include Q3 data for context..."
"While I'm at it, here's a comparison with..."
"For completeness, I've added..."
```

### DO

```
"To complete this task, I need to clarify:
- The task specifies Q4, but Q3 context would enable trend analysis
- Should I: (A) Strictly Q4 only, or (B) Include Q3 for comparison?

Awaiting scope confirmation before proceeding."
```

## Integration with Other Rules

This rule works with:

- **distractor-filter.md**: Classification protocol
- **Agent Design Bible Rule 6**: Scoped Context

Together they provide:

1. **Pre-processing**: Classify context before use
2. **Runtime**: Enforce boundaries during reasoning
3. **Post-processing**: Verify output stays in scope
