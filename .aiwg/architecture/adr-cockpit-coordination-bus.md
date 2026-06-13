# ADR: Cockpit Cross-Stack Coordination — Build on the serve Executor-Registry / Missions (#1546)

**Status**: Proposed
**Phase**: Elaboration
**Related**: @.aiwg/architecture/cockpit-sad.md, UC-COCKPIT-007 (handoff), UC-COCKPIT-008 (unified Mission dispatch), @.aiwg/risks/cockpit-risk-register.md (X2, X3, E2)

## Reasoning

1. **Context analysis**: The standout value is letting multiple stacks coordinate in new ways (cross-stack handoff, unified Mission dispatch). This needs a coordination mechanism.
2. **Force identification**: new capability vs. don't-build-a-new-runtime; coordination richness vs. #1546 maturity; cross-stack dispatch vs. privilege-escalation risk (E2).
3. **Option evaluation**: below.
4. **Decision justification**: AIWG already shipped a cross-stack Mission conductor + per-stack executor adapters (#1546) — the coordination substrate exists; Cockpit should drive it, not invent a parallel one.
5. **Consequence assessment**: v1 coordination is bounded by #1546; start with operator-mediated handoff before automation.

## Context

Cockpit must support coordination actions that no single stack offers today: (a) hand a result/context from stack A to stack B; (b) dispatch one Mission across heterogeneous workers (e.g., a Claude conductor fanning Codex subagents). AIWG #1546 already provides a Mission conductor + per-stack executor adapters over the serve registry.

## Decision

Cockpit's **Coordination service uses the existing #1546 Mission conductor + executor-registry** as the coordination bus:
- **Unified Mission dispatch** (UC-008): Cockpit composes a Mission and submits it to the conductor; the conductor fans to per-stack executors. The conductor validates per-worker scope at dispatch (mitigates cross-stack privilege escalation E2). Cockpit never dispatches with another stack's credentials.
- **Cross-stack handoff** (UC-007): v1 is **operator-mediated** — Cockpit presents stack A's result and lets the operator hand it to stack B as typed input/context via the attach path; the *handoff contract* (payload shape, provenance) is defined here and tightened over releases. Automated/triggered handoff is deferred.
- All dispatch/handoff actions are HMAC-signed (T2), re-validated by core, and audited with provenance (NFR-08).

## Options considered

| Option | Verdict |
|---|---|
| A. Build a new coordination runtime inside Cockpit | ✗ Reinvents #1546; scope-creep (P2); duplicate persistence |
| B. **Drive the existing #1546 conductor + registry; operator-mediated handoff in v1** | ✓ **Chosen** — reuses substrate; scoped, auditable; escalation-safe |
| C. Fully-automated cross-stack triggers in v1 | ✗ Premature; ambiguous/lossy semantics (X3); higher blast radius |

## Consequences

- **Positive**: real new coordination value with no new runtime; per-worker scope validation contains E2; handoff has an explicit contract + provenance.
- **Negative / accepted**: coordination richness is bounded by #1546 maturity (X2 — validate the seam in an Elaboration spike; if gaps, file upstream and scope v1 to supported stacks); automated handoff deferred (X3).
