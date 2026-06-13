# UC-COCKPIT-009: Unified HITL Approval Inbox Across Stacks

**Phase**: Inception
**Priority**: P0
**Status**: Draft
**Persona**: Ops/fleet operator, Solo power user
**Related**: @.aiwg/management/cockpit-vision.md, @.aiwg/security/cockpit-threat-model.md (E1/S3), @.aiwg/intake/cockpit-intake.md §In-scope (cross-stack coordination)

## Reasoning

1. **Problem analysis**: When several stacks run at once, each may pause on a human-in-the-loop gate (destructive op, scope change, escalation). Today those prompts live in separate session UIs, so an operator must watch many windows and approvals stall unseen.
2. **Constraint identification**: Approval is a security-critical action (it authorizes work). Per `human-authorization` and `hitl-gates`, the approval decision and its consequence must be explicit, audited, and non-forgeable. Cockpit must not be able to mint approvals itself.
3. **Alternative consideration**: (a) poll each session UI (status quo, doesn't scale); (b) a single inbox that aggregates pending gates from all stacks via the executor-registry / hitl-prompt/v1 (#1565) and routes the operator's decision back through AIWG core (chosen); (c) auto-approve low-risk gates (rejected for v1 — violates explicit-authorization).
4. **Decision rationale**: A unified inbox is the standout coordination win and the only model that gives one operator timely control over many stacks without losing the explicit-authorization guarantee.
5. **Risk assessment**: Approval forgery / gate bypass (mitigated: AIWG core re-validates a fresh approval token; Cockpit relays, never mints — threat-model E1/S3); mis-attribution (mitigated: per-action provenance tag on every activity-log entry — R2).

## Primary Actor

Operator responding to pending approval gates raised by one or more running stacks.

## Goal

See every pending HITL gate across all stacks in one inbox and approve/deny/defer each, with the decision enforced by AIWG core and recorded in the audit trail.

## Preconditions

- One or more stacks/Missions are running and registered; at least one has raised a `hitl-prompt/v1` gate (#1565).
- Cockpit launched; operator is the authenticated local session.

## Main Success Scenario

1. A running stack hits a HITL gate; the gate appears in Cockpit's Approval Inbox with stack, action, blast-radius summary, and origin.
2. Operator opens the item; Cockpit shows the full prompt and the specific action requiring authorization (no truncation).
3. Operator chooses Approve / Deny / Defer (with optional note).
4. Cockpit relays the decision to AIWG core, which re-validates a fresh approval token and enforces it on the originating stack — Cockpit itself cannot authorize.
5. The stack proceeds (approve) / abandons the action (deny) / remains paused (defer).
6. The decision, operator identity, timestamp, and provenance are written to the unified `activity-log`.

## Alternative Flows

**A1 — Native confirmation surface**: where the stack supports a native-UX confirmation tool, Cockpit uses it rather than a synthetic prompt (`native-ux-tools`).

**A2 — Multiple simultaneous gates**: inbox shows a prioritized list (blast-radius + age); operator handles one at a time (no batch-approve in v1).

## Exception Flows

**E1 — Gate times out before decision**: the stack's configured timeout action applies; Cockpit marks the item expired and logs it.

**E2 — Core rejects the relayed token (tamper/expiry)**: Cockpit shows a clear error, the action stays unauthorized, and the event is logged as a security finding.

## Postconditions

- Every approval decision is enforced by AIWG core and audited; no gate was bypassed or forged via Cockpit.

## Acceptance Criteria

- [ ] Pending HITL gates from all running stacks aggregate into one inbox with stack, action, and blast-radius shown (no truncation of the action).
- [ ] Approve/Deny/Defer is relayed to AIWG core, which re-validates a fresh approval token; Cockpit cannot mint or auto-issue approvals (threat-model E1/S3).
- [ ] Every decision is written to `activity-log` with operator identity, timestamp, and provenance tag (R2).
- [ ] Native confirmation surfaces are used where the stack supports them (A1).
- [ ] A timed-out gate (E1) and a rejected-token gate (E2) both leave the action unauthorized and clearly surfaced — never silently approved.
