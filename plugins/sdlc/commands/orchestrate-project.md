---
description: Plan iterations, delegate to SDLC agents, and compile iteration status
category: sdlc-management
argument-hint: <docs/sdlc/artifacts/project>
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

## Notes

- Escalate blockers; log decisions and owners
