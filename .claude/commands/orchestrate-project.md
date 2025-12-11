---
description: Plan iterations, delegate to SDLC agents, and compile iteration status
category: sdlc-management
argument-hint: <docs/sdlc/artifacts/project> [--guidance "text"] [--interactive]
allowed-tools: Read, Write, Grep, Glob
model: opus
---

# Orchestrator Command (SDLC)

## Task

Coordinate lifecycle work for the current phase/iteration:

1. Read the latest phase/iteration plan and key artifacts
2. Select SDLC agents to work in parallel (requirements, architecture, build, test)
3. Synthesize results into a status summary with risks and next actions

## Inputs

- Phase/iteration plan + RACI (if present)
- Security/reliability gate expectations

## Outputs

- `status-assessment.md` with gates, risks, and next iteration goals


## Optional Parameters

### --guidance "text"
Provide strategic context or constraints to guide the command execution:
```
/orchestrate-project --guidance "Focus on security implications"
```

### --interactive
Enable interactive mode for step-by-step confirmation and input:
```
/orchestrate-project --interactive
```

When interactive mode is enabled, the command will:
1. Confirm understanding of the task before proceeding
2. Ask clarifying questions if requirements are ambiguous
3. Present options for user decision at key branch points
4. Summarize changes before applying them

## Notes

- Escalate blockers; log decisions and owners
