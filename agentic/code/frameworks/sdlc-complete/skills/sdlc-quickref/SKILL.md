---
name: sdlc-quickref
namespace: aiwg
platforms: [all]
kernel: true
description: SDLC framework quick reference — phase model, key skills index, and how to find more via the AIWG artifact index
---

# SDLC Framework — Quick Reference

You are operating in a project that has the AIWG **SDLC framework** installed. This skill is your always-loaded directory: it gives you the framework's shape and points you at the right skill for a given task. The full skill catalog lives behind the AIWG artifact index — query it on demand instead of asking the user to remember names.

## What this framework is for

End-to-end software-development-lifecycle support. Phase-based workflows (Inception → Elaboration → Construction → Transition → Production) with multi-agent artifact generation, gate criteria, traceability, and 100+ document templates.

## When to reach for which skill

| Need | Skill | How to invoke |
|---|---|---|
| Start a new project from scratch | `intake-wizard`, `intake-start` | "create intake forms" / "start inception" |
| Analyze an existing codebase to scaffold artifacts | `intake-from-codebase` | "scan this repo and generate intake" |
| Transition phases (Inception → Elaboration → ...) | `flow-inception-to-elaboration`, `flow-elaboration-to-construction`, `flow-construction-to-transition` | "transition to elaboration" |
| Generate a specific artifact (SAD, ADR, test plan, ...) | `artifact-orchestration` | "create a SAD" / "draft an ADR for X" |
| Run a phase gate check | `flow-gate-check` | "check inception gate" / "are we ready for X?" |
| Continuous risk management | `flow-risk-management-cycle` | "update risks" |
| Continuous architecture evolution | `flow-architecture-evolution` | "evolve architecture for Y" |
| Continuous test execution | `flow-test-strategy-execution` | "run integration tests" |
| Continuous security review | `flow-security-review-cycle` | "run security review" |
| Project status / where-are-we | `project-status`, `project-health-check` | "where are we?" / "project status" |
| Deploy to production | `flow-deploy-to-production`, `flow-hypercare-monitoring` | "deploy to prod" |
| Incident response | `flow-incident-response` | "production incident" |
| Compliance validation | `flow-compliance-validation` | "validate SOC2 compliance" |
| Onboard a team member | `flow-team-onboarding` | "onboard X" |
| Knowledge transfer | `flow-knowledge-transfer` | "knowledge transfer to X" |
| Retrospective | `flow-retrospective-cycle` | "run retro" |

This is a curated subset (≈25 of the framework's most-reached-for entries). The framework ships **300+ skills** total — the rest are reachable through the index.

## Phase model

```
Inception (4-6w) → Elaboration (4-8w) → Construction (8-16w) → Transition (2-4w) → Production
   │                  │                     │                       │
   LO milestone      LA milestone          IOC milestone           PR milestone
```

- **Inception**: validate problem, vision, risks, business case. Output: project brief, risk register seed.
- **Elaboration**: detailed requirements, architecture baseline, risk retirement (PoCs/spikes), test strategy.
- **Construction**: feature implementation, automated testing, security validation, performance.
- **Transition**: production deployment, UAT, support handover, hypercare (2-4w).
- **Production**: ongoing operations, incident response, feature iteration.

## Artifact directory: `.aiwg/`

All SDLC artifacts live under `.aiwg/`:

```
.aiwg/
├── intake/        # Project intake forms, solution profiles
├── requirements/  # Use cases, user stories, NFRs
├── architecture/  # SAD, ADRs, diagrams
├── planning/      # Phase plans, iteration plans
├── risks/         # Risk register
├── testing/       # Test strategy, test plans
├── security/      # Threat models, security gates
├── deployment/    # Deployment plans, runbooks
├── working/       # Temporary scratch (safe to delete)
└── reports/       # Generated reports
```

## Finding the right skill when this quickref doesn't list it

```bash
aiwg discover "<what you're trying to do>"
```

The index ranks skills by capability/trigger match across the entire installed surface. Use this **before** asking the user to recall a skill name — many SDLC skills are highly specific (e.g., `flow-cross-team-sync`, `risk-cycle`, `artifact-metadata`) and won't surface from a generic phase keyword.

## Common multi-skill flows

- **New feature, full lifecycle**: `intake-wizard` → `flow-concept-to-inception` → `flow-inception-to-elaboration` → `flow-elaboration-to-construction` → `flow-deploy-to-production`
- **Add to in-flight project**: `project-status` → `flow-requirements-evolution` → `flow-test-strategy-execution`
- **Pre-release gate**: `flow-gate-check <phase>` → `flow-security-review-cycle` → `flow-deploy-to-production`

## Don't list from this skill — query the index

If a user asks "what SDLC skills are available?" or "what can the SDLC framework do?", **do not enumerate from memory**. Run `aiwg discover` (or read `.aiwg/index/` directly). This skill exists to orient, not to replace the index.
