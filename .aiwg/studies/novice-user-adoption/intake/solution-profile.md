---
artifact_type: solution_profile
study: novice-user-adoption
phase: inception
status: baselined
created: 2026-05-14
voice: technical-authority
---

# Solution Profile: AIWG Novice-User Adoption Study

## Solution Class

**Research-and-design study with one tactical implementation deliverable.** The study output is primarily decisions, designs, and per-platform field assessments. One tactical implementation — the `aiwg use` project-isolation warning — ships as a quick win during the study; everything else feeds downstream construction epics.

## Approach Summary

The study attacks both adoption failures through a structured set of seven workstreams (per epic #1334):

| Workstream | Approach | Deliverable type |
|------------|----------|------------------|
| A — Per-platform hookup audit | Scripted tasks on each provider with telemetry | Field-validated assessment matrix |
| B — Project-isolation warning | Add non-blocking warning to `aiwg use` | Shipped code |
| C — Wizard / walkthrough flow | Survey patterns, design with Cognitive Walkthrough | Design doc + walkthrough record |
| D — Global install decision | Audit current state, decide first-class vs. escape-hatch | ADR |
| E — Provider read access | Config audit per provider | Audit report + targeted fixes |
| F — Engagement-surface design | Trust-calibration framing using Lee & See + Co-Audit | Design doc |
| G — Empirical questions | Three data-gathering activities (poll, telemetry, qualitative) | Three data points |

## Architecture Sketch

The "system" being designed is a UX architecture, not software architecture. Major components:

```
                    [ AIWG novice-user adoption ]
                                |
        +-------------+-------------+--------------+
        |             |             |              |
    [ Pre-deploy ] [ Deploy ] [ First session ] [ Engaged session ]
        |             |             |              |
    Wizard flow   isolation     Discovery hooks  Engagement surface
    (Workstream   warning       (Workstreams     (Workstream F)
     C)           (Workstream   A, E)
                  B)
                                                  Trust calibration
                                                  (Workstream F)
```

Cross-cutting:
- Empirical questions (Workstream G) feed back into all stages
- Global install (Workstream D) is a decision affecting Pre-deploy + Deploy

## Technology Sketch

- **Implementation language** (Workstream B): TypeScript (matches AIWG codebase)
- **Wizard implementation surface** (Workstream C): CLI interactive prompts (consistent with current `aiwg new`)
- **Per-platform validation** (Workstream A): test scripts per provider, manual where automation impractical
- **Telemetry** (Workstream G partial): opt-in only; consider adding lightweight invocation logging to `aiwg discover`

## Key Design Tensions

The study must navigate three tensions, each warranting an ADR:

### Tension 1: Discoverability vs. Pollution

Surfacing AIWG engagement helps user trust calibration (Workstream F per Lee & See, REF-159). Too much surfacing becomes branding pollution of user content. Resolution: minimal status surface with explicit anti-pattern guardrails (no commit attribution, no code-comment injection).

### Tension 2: Wizard vs. Default-Path Friction

A wizard reduces novice failure rate but adds friction for power users. Resolution: opt-in wizard (`aiwg wizard` or `aiwg new --interactive`), default `aiwg use` behavior unchanged.

### Tension 3: Global Install Convenience vs. Project Isolation

Global install enables "AIWG everywhere" UX many users want, but undermines project isolation. Resolution: ADR decision; likely first-class with explicit documentation that warns about cross-project context bleed and references REF-720 evidence.

## Feasibility Assessment

| Workstream | Feasibility | Notes |
|------------|-------------|-------|
| A | Medium-High | Per-platform scripted validation requires accounts/access to all 10 platforms |
| B | High | Small change, low risk, no external dependencies |
| C | High | Pattern survey + design doc; implementation deferred |
| D | High | ADR decision; existing code already supports both modes |
| E | Medium | Per-provider config knowledge required; some platforms underdocumented |
| F | High | Design doc grounded in research; implementation deferred |
| G | Medium | Empirical work; depends on Discord/Telegram engagement quality |

No blocking constraints identified.

## Solution Viability

**Viable.** The study scope is bounded, the research foundation is in place (8 inductions filed), and the tactical deliverable (B) is a small, low-risk implementation. The main execution risk is Workstream A — per-platform validation across 10 providers — which is mitigated by treating Claude Code + Codex as already-validated and prioritizing the remaining 8 by user-reported impact.

## References

- Intake form: `.aiwg/studies/novice-user-adoption/intake/intake-form.md`
- Epic: roctinam/aiwg#1334
