---
artifact_type: architecture_decision_record
adr_id: ADR-NUA-001
study: novice-user-adoption
workstream: D
status: PROPOSED
title: "Global install (`aiwg use --scope user`) status — first-class or escape-hatch"
created: 2026-05-14
voice: technical-authority
---

# ADR-NUA-001: Global Install Status — First-Class Supported Flow

## Status

**PROPOSED** — pending Discord/Telegram comms execution (Week 4 of study sequence) and core-maintainer review.

## Context

AIWG's `aiwg use <framework>` deploys artifacts to project-local paths by default (e.g., `.claude/agents/`, `.codex/skills/`). A `--scope user` flag (and equivalent deploy-to-`~/` behavior) exists today to deploy artifacts to user-scope paths (`~/.claude/agents/`, `~/.codex/skills/`, etc.). The user has named this path "half-baked": rough edges across providers, unclear documentation, ambiguous official status.

Field reports show that non-technical users frequently want AIWG behavior available in every AI session without per-project setup. This is the "AIWG everywhere" use case underlying UC-NUA-004.

The tension (SAD §2.2, Tension 3) is real: global install supports a legitimate user preference, but cross-project context bleed measurably degrades agent performance — REF-720 (Lost in Multi-Turn Conversation, MSR/Salesforce 2025) reports a 39% capability drop FULL→SHARDED with failures appearing at just two task shards. A user with global AIWG running sessions in multiple unrelated projects is the canonical bleed scenario.

Three options have been weighed:

1. **First-class supported flow** — invest to harden across all 10 providers; document tradeoffs explicitly; allow continued use
2. **Discouraged escape-hatch** — keep working but emit clear discouragement; direct users to project-scoped install
3. **Deprecate** — schedule removal; force project scope

## Decision

**Adopt option 1: first-class supported flow.** Global install remains a fully supported deployment mode for AIWG, with explicit documentation of the cross-project context-bleed tradeoff.

The non-blocking project-isolation warning from Workstream B (UC-NUA-002) provides the in-product communication of the tradeoff at the moment the user is making the scope decision. Documentation surfaces it again at the framework-selection step.

## Consequences

### Positive

- **Preserves user choice.** Power users and ad-hoc users keep their preferred mode.
- **Reduces support burden.** No deprecation migration; no breaking change.
- **Aligns with multi-provider reality.** Some providers (Hermes, OpenClaw) have user-scope as their primary discovery model; global install fits naturally.
- **Honors a documented user preference.** Discord/Telegram reports indicate active demand for the global path.

### Negative

- **Hardening cost.** Workstream D inherits a follow-up obligation to fix rough edges across providers (rough-edge inventory must be produced as part of the ADR's implementation guidance).
- **Cross-project context bleed remains a real risk.** REF-720's 39% capability drop applies to users who run global AIWG across many unrelated projects. The non-blocking warning surfaces this; it does not prevent it.
- **Documentation surface grows.** Two scope models must be explained side-by-side.

### Neutral / Required follow-up

- **Continued-support guarantee.** Project-scoped install remains the recommended default. No deprecation of project scope is implied by this decision.
- **One-CalVer-cycle preservation.** If a future decision were to reclassify global install as escape-hatch, the prior mode is preserved for at least one CalVer cycle for migration.
- **Workstream B warning wording.** The wording specified in UC-NUA-002 is neutral toward this decision — it describes what will happen without endorsing or discouraging global install. The wording can remain as specified; this ADR does not require Workstream B to revise.

## Alternatives Considered

### Option 2: Discouraged escape-hatch

**Rejected** because: emitting strong discouragement on every global-install invocation creates friction for users who have legitimately chosen this mode. The non-blocking warning at scope-decision time is sufficient information without the implicit message "you're using AIWG wrong."

Evidence weighing this rejection: the project owner explicitly named the global-install path as half-baked (implying it should be either properly supported or removed, not stuck in middle-ground). Discouragement is the worst of both worlds.

### Option 3: Deprecate

**Rejected** because: would break a legitimate user pattern with no commensurate gain. Cross-project bleed is a real risk but is addressable through documentation and the non-blocking warning, not removal of the capability. Deprecation also conflicts with platforms (Hermes, OpenClaw) whose primary discovery model is user-scope.

## Implementation Guidance

This ADR is a status decision, not an implementation epic. Implementation actions inherited from this decision:

1. **Rough-edge inventory** — Workstream D output must include a per-provider list of current global-install rough edges. The inventory becomes a follow-up issue for a downstream implementation epic.
2. **Documentation update** — `docs/cli-reference.md` and the README must document the two scope models side-by-side, including the REF-720 cross-bleed evidence as the rationale for preferring project scope as default.
3. **No breaking changes.** Existing `aiwg use --scope user` invocations must continue to work identically after this ADR baselines.
4. **Workstream B warning text** — unchanged from UC-NUA-002 specification.

## Comms Plan

Per the SAD's §4.3 Week 4 step:

- Discord announcement summarizing the decision and pointing to this ADR
- Telegram announcement matching
- Discussion window of at least 5 days before merging the ADR baseline
- Specific call for users currently using global install to confirm the decision serves their use case

The comms plan is a precondition for moving this ADR from PROPOSED to ACCEPTED.

## References

- Commissioning epic: `roctinam/aiwg#1334`
- UC-NUA-004 (installs globally)
- SAD §2.2 (design tensions), §4.1.1 (Workstream D rationale), §9 (risk mapping for R-005)
- Risk R-005: ADR conflict with field — mitigated by comms plan and continued-support guarantee
- Research: REF-720 (Lost in Multi-Turn Conversation, MSR/Salesforce 2025)
