---
kind: status
domain: SDLC
description: Reports SDLC phase, current iteration, open risks, blocking gates from .aiwg/ artifacts
detect:
  glob:
    - ".aiwg/requirements/*.md"
    - ".aiwg/architecture/*.md"
    - ".aiwg/planning/*.md"
    - ".aiwg/intake/*.md"
  minCount: 1
fields:
  intake_complete:
    type: string
    source: ".aiwg/intake/project-intake.md"
    regex: "^# (.+)$"
  phase_plan_present:
    type: string
    source: ".aiwg/planning/phase-plan.md"
    regex: "^# (.+)$"
  open_risks:
    type: number
    source: ".aiwg/risks/risk-list.md"
    count: "^- "
  open_use_cases:
    type: number
    source: ".aiwg/requirements"
    count: "^# UC-"
---

# SDLC Status Contributor

Reports observed state of the SDLC framework's artifacts under `.aiwg/`. Consumed
by `project-status` (and any other `kind: status` aggregator) to produce a
unified cross-framework status block. Descriptive only — no prescriptive
next-action arrays per ADR-023.

## What This Contributor Reports

When the SDLC framework is in use (detected via the presence of any artifact
under `.aiwg/requirements/`, `.aiwg/architecture/`, `.aiwg/planning/`, or
`.aiwg/intake/`), the aggregator should produce an SDLC status block covering:

### 1. Current Phase

Detect SDLC phase using artifact presence (priority order, first match wins):

| Phase | Detection signal |
|-------|------------------|
| Pre-Inception | No `.aiwg/intake/` or empty |
| Inception | Intake present, no `.aiwg/planning/phase-plan*` |
| Elaboration | Phase plan present, no `.aiwg/architecture/software-architecture-doc.md` baselined |
| Construction | SAD baselined, iteration plans active |
| Transition | `.aiwg/deployment/deployment-plan.md` present, hypercare not yet started |
| Production / Operations | `.aiwg/deployment/runbook*.md` present and active |

### 2. Iteration Progress

When in Construction:
- Active iteration number from `.aiwg/planning/iteration-plan-*.md` (highest number wins)
- Iteration goals and completion state from the active plan

### 3. Open Risks

Count and severity breakdown from `.aiwg/risks/risk-list.md` (or `.aiwg/risks/*.md`).
Surface high/critical risks as blockers; medium/low as informational.

### 4. Blocking Gates

Active phase gates with unmet criteria:
- `.aiwg/gates/gate-*.md` with status open or blocked
- Failed handoff checklists in `.aiwg/handoffs/`

### 5. Recent Activity

Last update across SDLC artifacts (file mtime + filename) so users see momentum.

## Output Format Guidance

When the aggregator renders this contributor's block, use the `Domain →
one-line state` shape from #928:

```
├─ SDLC: <phase>, iteration <N>, <K> open risks (<H> high), <G> blocking gates
```

Detail follows under the block in a tree:

```
├─ SDLC
│  ├─ Phase: Construction (entered 2026-04-01)
│  ├─ Iteration: 12 of N planned
│  ├─ Risks: 3 open (1 high, 2 medium)
│  ├─ Gates: 1 blocked (security-gate-elaboration-exit)
│  └─ Last update: .aiwg/architecture/ADR-023-... 2 hours ago
```

## Anti-Pattern Reminders

- Do **not** emit recommended commands ("run /flow-gate-check") in this
  contributor's block. Per ADR-023 §Output voice, contributors are descriptive
  only. The aggregator may render a separate non-prescriptive `Where to look
  next` section if it has cross-cutting context, but each contributor stays
  factual.
- Do **not** read or write outside `.aiwg/` for SDLC state. If a fact requires
  external context (e.g. CI status), surface that in a separate contributor
  rather than expanding this one.
- Do **not** assume the framework is in use just because it's installed.
  The detection globs above gate this — when they don't match, this
  contributor is silently filtered out of the report.
