---
name: Check Traceability
description: Verify links from use cases and requirements to design, code, tests, and releases
model: sonnet
tools: ["read", "write", "glob", "grep"]
argument-hint: "path to traceability CSV"
---

# Check Traceability (SDLC)

## Task

Analyze the traceability matrix and report gaps:

- Missing tests for critical use cases
- Requirements without design/code links
- Closed defects not linked back to a requirement/use case

## Output

- `traceability-gap-report.md` with prioritized fixes and owners
