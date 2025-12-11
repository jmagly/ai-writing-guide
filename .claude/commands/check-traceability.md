---
description: Verify links from use cases and requirements to design, code, tests, and releases
category: documentation-tracking
argument-hint: <path-to-traceability-csv> [--guidance "text"] [--interactive]
allowed-tools: Read, Write, Glob, Grep
model: sonnet
---

# Check Traceability (SDLC)

## Task

Analyze the traceability matrix and report gaps:

- Missing tests for critical use cases
- Requirements without design/code links
- Closed defects not linked back to a requirement/use case


## Optional Parameters

### --guidance "text"
Provide strategic context or constraints to guide the command execution:
```
/check-traceability --guidance "Focus on security implications"
```

### --interactive
Enable interactive mode for step-by-step confirmation and input:
```
/check-traceability --interactive
```

When interactive mode is enabled, the command will:
1. Confirm understanding of the task before proceeding
2. Ask clarifying questions if requirements are ambiguous
3. Present options for user decision at key branch points
4. Summarize changes before applying them

## Output

- `traceability-gap-report.md` with prioritized fixes and owners
