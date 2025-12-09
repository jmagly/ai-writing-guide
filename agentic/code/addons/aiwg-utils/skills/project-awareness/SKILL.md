---
name: project-awareness
description: Provides AIWG project status, phase information, and next steps. Auto-applies when user asks about project status, current phase, what's next, where we are, or needs orientation within an AIWG-managed project.
version: 1.0.0
---

# Project Awareness Skill

## Purpose

Automatically detect when users need project orientation and provide contextual status information. This skill bridges natural language queries to AIWG's project tracking artifacts.

## When This Skill Applies

- User asks "where are we?" or "what's the status?"
- User asks "what's next?" or "what should we do?"
- User mentions "current phase" or "project phase"
- User seems disoriented about project state
- Starting a new conversation in an AIWG project
- User asks about milestones, gates, or transitions

## Trigger Phrases

| Natural Language | Action |
|------------------|--------|
| "Where are we?" | Check phase status, recent activity |
| "What's next?" | Identify pending tasks, next milestone |
| "Project status" | Full status report |
| "Current phase" | Phase name + completion percentage |
| "Ready to transition?" | Gate criteria check |
| "What's blocking us?" | Risk register + blockers |
| "How long until..." | Milestone progress estimate |

## Information Sources

This skill gathers information from:

### Primary Sources (Check First)
- `.aiwg/planning/phase-status.md` - Current phase and progress
- `.aiwg/planning/iteration-plan.md` - Current iteration tasks
- `.aiwg/gates/` - Gate criteria and validation status

### Secondary Sources
- `.aiwg/risks/risk-register.md` - Active risks and blockers
- `.aiwg/team/agent-assignments.md` - Who's working on what
- `.aiwg/requirements/` - Requirements completion status
- `.aiwg/architecture/` - Architecture baseline status

### Context Sources
- `CLAUDE.md` - Project configuration
- `.aiwg/intake/project-intake.md` - Original project scope
- Git log - Recent activity

## Response Format

### Quick Status (Default)
```
Phase: [Current Phase] ([X]% complete)
Iteration: [N] of [Total]
Next Milestone: [Milestone Name] - [Date/Status]
Blockers: [Count] ([List if < 3])
```

### Full Status (On Request)
```
## Project: [Name]
Phase: [Phase] | Iteration: [N]
Started: [Date] | Target: [Date]

### Completion
- Requirements: [X]%
- Architecture: [X]%
- Implementation: [X]%
- Testing: [X]%

### Active Work
- [Task 1] - [Owner] - [Status]
- [Task 2] - [Owner] - [Status]

### Blockers/Risks
- [Risk 1] - [Severity] - [Mitigation]

### Next Steps
1. [Action 1]
2. [Action 2]
```

## Command Bindings

This skill may trigger these commands based on context:

| Context | Command |
|---------|---------|
| User wants full report | `/project-status` |
| User asks about health | `/project-health-check` |
| User asks about gate readiness | `/flow-gate-check [phase]` |
| User seems lost on next steps | Suggest relevant flow command |

## Phase Reference

| Phase | Description | Key Artifacts |
|-------|-------------|---------------|
| Inception | Vision, risks, feasibility | intake forms, business case |
| Elaboration | Architecture baseline | SAD, ADRs, test strategy |
| Construction | Feature implementation | code, tests, reviews |
| Transition | Deployment, handover | runbooks, training |
| Production | Operations, iteration | monitoring, incidents |

## Scripts

### status_check.py
Quick status extraction from .aiwg/ artifacts:
```bash
python scripts/status_check.py [project-dir]
```

Returns JSON with:
- current_phase
- iteration_number
- completion_percentages
- active_blockers
- next_milestone

## Integration

Works with:
- `/project-status` - Explicit status command
- `/flow-gate-check` - Gate validation
- All `flow-*` commands - Phase transitions
- `context-regenerator` agent - Context updates
