---
artifact_type: use_case
id: UC-NUA-004
study: novice-user-adoption
workstream: D
status: baselined
phase: elaboration
created: 2026-05-14
voice: technical-authority
---

# UC-NUA-004: User installs AIWG globally for ad-hoc use

## Reasoning

1. **Problem analysis** — Some users genuinely want AIWG available in any directory without per-project setup. The global-install option exists (`aiwg use --scope user` or deploy-to-`~` equivalent) but is half-baked: rough edges, unclear documentation, ambiguous status.
2. **Constraint identification** — Cross-project context bleed (REF-720) is the largest risk with global install. Must be either first-class with explicit caveats OR explicitly escape-hatch with directing-guidance.
3. **Alternative consideration** — Options: (a) make first-class — invest to harden across providers; (b) make explicit escape-hatch — keep working but document discouragement; (c) deprecate. Chose to defer the final decision to the ADR (Workstream D), with this UC documenting either path.
4. **Decision rationale** — The ADR will decide; the UC describes both possible outcomes so the study captures the user need regardless of resolution.
5. **Risk assessment** — R-005 (decision-disagreement with field) is moderate. Mitigation: ADR comms plan, one-cycle continued support for non-chosen mode.

## Primary Actor

Ad-hoc User (works across many small projects, doesn't want per-project setup)

## Goal

Have AIWG behavior available in any AI session without running `aiwg use` per project, while understanding the tradeoffs.

## Preconditions

- User has read about global-install in AIWG documentation OR has been told about it
- User accepts (or is informed about) the cross-project context bleed tradeoff

## Main Success Scenario (if ADR resolves "first-class")

1. User runs `aiwg use sdlc --scope user` (or `aiwg global-install sdlc`)
2. AIWG deploys artifacts to user-scope paths (`~/.claude/agents/`, `~/.codex/skills/`, etc.)
3. AIWG emits an informational message: "AIWG installed globally. This affects all your AI sessions. Per-project install is recommended for most workflows — see [doc link] for tradeoffs."
4. User opens an AI session in any directory; AIWG behavior is available
5. User receives AIWG-quality output regardless of project context

## Alternative Flow (if ADR resolves "escape-hatch")

1. User runs `aiwg use sdlc --scope user`
2. AIWG emits a clear warning: "Global install is supported but not recommended. AIWG works best when scoped to a project. To install to a project instead: `cd <project>` and run `aiwg use sdlc`. Continue with global install? (y/N)"
3. User confirms or cancels

## Postconditions

- The mode chosen by the ADR is documented in user-facing materials
- The non-chosen mode still works for at least one CalVer cycle to allow migration
- Cross-project context bleed risk is surfaced in either path

## Acceptance Criteria

- [ ] ADR is baselined documenting the decision and rationale
- [ ] User-facing documentation reflects the chosen path
- [ ] Continued-support guidance is documented for the non-chosen path (at least one CalVer cycle)
- [ ] Communication plan executed in Discord/Telegram before the ADR merges

## References

- Workstream D
- Parent: UC-NUA-001
- Related risk: R-005 in risk-screening
- Research: existing corpus REF-720 (cross-context degradation)
