# UC-COCKPIT-012: Pause / Resume / Stop a Running Stack

**Phase**: Inception
**Priority**: P1
**Status**: Draft
**Persona**: Solo power user, Ops/fleet operator
**Related**: @.aiwg/management/cockpit-vision.md, @.aiwg/security/cockpit-threat-model.md (D1 overlay isolation), `aiwg mc` (pause/resume/stop/abort), ralph (abort/resume)

## Reasoning

1. **Problem analysis**: With several stacks/Missions running, an operator needs lifecycle control — pause a loop that's burning budget, resume a held Mission, stop a misbehaving run — without hunting through per-stack UIs.
2. **Constraint identification**: Lifecycle actions are real, sometimes destructive (stop/abort) → `human-authorization` confirm for destructive ones. Overlay isolation: control must go through each stack's own lifecycle interface (`aiwg mc pause/resume/stop`, `ralph-abort/resume`, executor-registry), and the registry — not Cockpit — owns persistence so a Cockpit crash can't strand a run (threat-model D1).
3. **Alternative consideration**: (a) kill processes directly (forbidden — bypasses graceful lifecycle/audit); (b) relay to each stack's native lifecycle command via the registry (chosen); (c) read-only (loses control value).
4. **Decision rationale**: Relaying to native lifecycle controls preserves graceful shutdown, audit, and resumability while giving unified control.
5. **Risk assessment**: Accidental stop (mitigated: confirm for stop/abort with run identity + blast radius); orphaned run on Cockpit crash (mitigated: registry-owned persistence, idempotent reattach — D1); pause not supported by a stack (mitigated: capability check, disable unsupported controls).

## Primary Actor

Operator controlling the lifecycle of a running stack/Mission/loop.

## Goal

Pause, resume, or stop any running stack from Cockpit by relaying to its native lifecycle interface — gracefully, audited, and without Cockpit owning the run's persistence.

## Preconditions

- Cockpit launched; one or more runs registered (ralph loop, mc Mission, serve executor, daemon task).

## Main Success Scenario

1. Operator selects a running item in the Running panel and chooses Pause / Resume / Stop.
2. Cockpit checks the stack's lifecycle capabilities and shows only supported actions.
3. For Stop/Abort, Cockpit shows a confirm with run identity + blast radius (human-authorization).
4. Cockpit relays the action to the native interface (`aiwg mc pause|resume|stop`, `ralph-abort|resume`, executor-registry) — it does not kill processes itself.
5. The run transitions gracefully; the registry owns state; Cockpit reflects the new status.
6. The action + operator + timestamp are written to `activity-log`.

## Alternative Flows

**A1 — Pause unsupported**: control disabled/labeled for stacks without pause semantics; Stop still offered.

**A2 — Resume after Cockpit restart**: paused/held runs are re-discovered from the registry and resumable (overlay isolation).

## Exception Flows

**E1 — Run already terminated**: Cockpit reports the actual state and refreshes; no error cascade.

**E2 — Lifecycle command fails**: Cockpit surfaces the failure and the run's true state; never falls back to a hard kill.

## Postconditions

- The run transitioned via its native lifecycle path; registry state is authoritative; the action is audited; no orphaned/stranded run resulted from Cockpit.

## Acceptance Criteria

- [ ] Pause/Resume/Stop relay to the stack's native lifecycle interface; Cockpit never directly kills a process (overlay isolation / D1).
- [ ] Destructive actions (Stop/Abort) require a confirm naming run identity + blast radius (human-authorization).
- [ ] Unsupported actions are disabled per stack capability (A1); supported set is accurate.
- [ ] After a Cockpit restart, paused/held runs are re-discovered from the registry and controllable (A2) — a Cockpit crash strands nothing.
- [ ] Every lifecycle action is written to `activity-log`; failures (E2) surface true state and never escalate to a hard kill.
