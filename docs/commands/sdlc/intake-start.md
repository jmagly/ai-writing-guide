---
description: Ingest the Project Intake Form and kick off Concept → Inception with agent assignments
category: sdlc-management
argument-hint: <path-to-intake-folder-or-form>
allowed-tools: Read, Write, Glob, Grep
model: sonnet
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
