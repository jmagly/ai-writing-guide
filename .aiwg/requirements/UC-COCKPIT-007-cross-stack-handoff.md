# UC-COCKPIT-007: Cross-Stack Context / Result Handoff

**Phase**: Inception
**Priority**: P0
**Status**: Draft
**Persona**: Solo power user (multi-stack), Researcher
**Related**: @.aiwg/management/cockpit-vision.md §Differentiator 3 (coordination action 1), @.aiwg/intake/cockpit-intake.md §Cross-stack coordination layer

## Reasoning

1. **Problem analysis**: Today, to use the *result* of one stack's session (a diff, a finding, a generated artifact) as the *input/context* of another stack, the operator copy-pastes between provider windows with no audit link and no structure — error-prone and untraceable.
2. **Constraint identification**: The handoff must be a single operator gesture, must capture the source result as structured context, and must record a *linked* `activity-log` entry connecting source and target sessions. It must not require either stack to be modified.
3. **Alternative consideration**: (a) leave it to manual copy-paste (the status quo this UC eliminates); (b) a Cockpit handoff action that reads the source result via the screen-reader/result surface and injects it as context into the target session through that stack's adapter (chosen); (c) a shared global clipboard with no provenance (loses audit linkage).
4. **Decision rationale**: A first-class handoff backed by the executor-registry (to identify source/target) and the stack-adapters (to inject) is the only approach that is one-gesture, structured, and audited — the differentiator the intake requires.
5. **Risk assessment**: Injecting attacker-influenced content across trust boundaries (mitigated: operator reviews/confirms the handoff payload — authorization gate; no auto-handoff); secret leakage in handed-off content (mitigated: redaction + operator review, token-security); target can't accept injected context (mitigated: fall back to presenting the payload for manual paste with the audit link still recorded).

## Primary Actor

Operator coordinating two running stacks.

## Goal

Take a result/context from one running session and hand it to another running session as input, in a single reviewed gesture, with a linked audit record connecting the two.

## Preconditions

- Two sessions running and registered (source and target), at least the source observable, at least the target drive-capable (else manual-paste fallback).
- Cockpit launched.

## Main Success Scenario

1. Operator selects a result/region in the **source** session (e.g., a generated diff or finding).
2. Operator chooses "Hand off to…" and picks a **target** running session.
3. Cockpit assembles the handoff payload as structured context and shows a review/confirm step (authorization gate) — including any redaction of detected secrets.
4. On confirm, Cockpit injects the payload as context into the target session through its stack-adapter.
5. Cockpit writes a single **linked** `activity-log` entry recording source session, target session, and payload reference.
6. The target session proceeds with the handed-off context; the source session is unchanged.

## Alternative Flows

**A1 — Target not drive-capable**: Cockpit presents the structured payload for manual paste into the target and still records the linked audit entry.

**A2 — Multi-target handoff**: Operator hands the same result to more than one target; each gets its own confirm + linked audit entry.

## Exception Flows

**E1 — Secret detected in payload**: Cockpit redacts/flags before the confirm step; operator cannot proceed with raw secret content unless they explicitly override with awareness (token-security).

**E2 — Injection rejected by target adapter**: Cockpit reports the reason and falls back to manual-paste presentation (A1), preserving the audit linkage.

## Postconditions

- The target session has received the handed-off context (or the operator has it for manual paste).
- A single linked `activity-log` entry connects source and target; the source session is unmodified.

## Acceptance Criteria

- [ ] Handoff from a source session's result to a target session is achievable in one reviewed operator gesture.
- [ ] The payload is captured as structured context, not opaque pasted text.
- [ ] A confirm/authorization step precedes injection; no automatic, unreviewed handoff occurs.
- [ ] A single **linked** `activity-log` entry records source session, target session, and payload reference.
- [ ] Detected secrets are redacted/flagged before confirm (E1, token-security); raw-secret handoff requires explicit override.
- [ ] Non-drive-capable targets (A1) and adapter-rejected injections (E2) fall back to manual-paste presentation with audit linkage intact.
- [ ] Neither stack is modified to enable the handoff (overlay/non-nerf invariant).
