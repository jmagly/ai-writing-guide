---
description: Ingest the Project Intake Form and kick off Concept → Inception with agent assignments, accepts optional guidance to tailor process
category: sdlc-management
argument-hint: <path-to-intake-folder-or-form> [--guidance "context"]
allowed-tools: Read, Write, Glob, Grep
model: sonnet
---

# Intake Start (SDLC)

## Task

Given a Project Intake Form and Solution Profile:

1. **Process guidance** from user prompt (if provided) to tailor analysis
2. **Validate** required fields and note gaps
3. **Generate** or update phase-plan-inception.md and risk-list.md
4. **Recommend** initial ADRs and agent assignments
5. **Hand off** to Executive Orchestrator to start Concept → Inception flow

## Parameters

- **`<path-to-intake-folder-or-form>`** (required): Path to intake directory (default: `.aiwg/intake/`)
- **`--guidance "text"`** (optional): User-provided context to guide inception planning

### Guidance Parameter Usage

The `--guidance` parameter accepts free-form text to help tailor the Inception phase planning. Use it for:

**Process Focus**:
```bash
/project:intake-start .aiwg/intake/ --guidance "Focus on security architecture first, compliance is critical path"
```

**Risk Priorities**:
```bash
/project:intake-start .aiwg/intake/ --guidance "Third-party API integration is biggest unknown, needs spike ASAP"
```

**Team Constraints**:
```bash
/project:intake-start .aiwg/intake/ --guidance "Team has limited DevOps experience, need extra support for infrastructure setup"
```

**Stakeholder Expectations**:
```bash
/project:intake-start .aiwg/intake/ --guidance "Executive demo required in 2 weeks, need working prototype for fundraising"
```

**Technical Unknowns**:
```bash
/project:intake-start .aiwg/intake/ --guidance "Performance at scale unproven, need load testing POC before committing to architecture"
```

**How guidance influences planning**:
- **Prioritizes** specific risks based on guidance (e.g., "API integration" → elevate integration risks)
- **Tailors** agent assignments (e.g., "limited DevOps" → assign DevOps Engineer + provide training resources)
- **Adjusts** phase plan (e.g., "demo in 2 weeks" → front-load UI prototype tasks)
- **Highlights** critical path items (e.g., "compliance critical" → security gates moved earlier)
- **Documents** in phase-plan-inception.md (captures strategic focus and constraints)
- **Recommends** spikes/POCs based on unknowns mentioned in guidance

## Inputs

- `project-intake-template.md` (filled)
- `solution-profile-template.md` (filled)
- `option-matrix-template.md` (optional)

## Outputs

- `phase-plan-inception.md`
- `risk-list.md`
- `agent-assignments.md`
