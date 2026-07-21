---
namespace: aiwg
name: orchestrate-project
platforms: [all]
description: Plan iterations, delegate to SDLC agents, and compile iteration status
triggers:
  - "SDLC project orchestration"
  - "project orchestration"
  - "help make this less chaotic"
  - "help me impose a simple operating rhythm on this work"
  - "pick one planning or status workflow"
  - "orchestrate project"
commandHint:
  argumentHint: <docs/sdlc/artifacts/project> [--interactive] [--guidance "text"]
  allowedTools: Read, Write, Grep, Glob
  model: sonnet
  category: sdlc-management
  modelRole: coding
  modelTier: standard
---

# Orchestrate Project (SDLC)

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
- This skill is the canonical workflow source. Generated slash commands are provider adapters or compatibility shims.
- Use provider-native delegation mechanics and configured parallelism caps; do not assume a specific agent tool.

## References

- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/subagent-scoping.md — Each subagent gets ONE focused task; decompose complex work into parallel subagents
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/parallel-then-synthesize.md — Launch independent agents in parallel; synthesize into a single status summary
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/human-authorization.md — Escalate blockers to human; do not autonomously resolve gate failures
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/rules/sdlc-orchestration.md — Phase orchestration patterns this skill implements
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/skills/project-status/SKILL.md — Use for phase detection before dispatching agents
