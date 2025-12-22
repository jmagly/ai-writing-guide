---
name: undefined
description: Verify links from use cases and requirements to design, code, tests, and releases
model: claude-sonnet-4-5-20250929
tools: ["Create","Edit","Glob","Grep","Read"]
---

# Check Traceability (SDLC)

## Task

Analyze the traceability matrix and report gaps:

- Missing tests for critical use cases
- Requirements without design/code links
- Closed defects not linked back to a requirement/use case

## Output

- `traceability-gap-report.md` with prioritized fixes and owners