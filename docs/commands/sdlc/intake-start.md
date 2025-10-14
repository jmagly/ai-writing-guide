---
name: Intake Start
description: Ingest the Project Intake Form and kick off Concept → Inception with agent assignments
model: sonnet
tools: ["read", "write", "glob", "grep"]
argument-hint: "path to intake folder or intake form file"
---

# Intake Start (SDLC)

## Task
Given a Project Intake Form and Solution Profile:
1. Validate required fields and note gaps
2. Generate or update phase-plan-inception.md and risk-list.md
3. Recommend initial ADRs and agent assignments
4. Hand off to Executive Orchestrator to start Concept → Inception flow

## Inputs
- `project-intake-template.md` (filled)
- `solution-profile-template.md` (filled)
- `option-matrix-template.md` (optional)

## Outputs
- `phase-plan-inception.md`
- `risk-list.md`
- `agent-assignments.md`

