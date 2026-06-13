# UC-COCKPIT-016: Manage the Decoupled Daemon from the UI

**Phase**: Inception
**Priority**: P1
**Status**: Draft
**Persona**: Ops/fleet operator, Solo power user
**Related**: @.aiwg/architecture/adr-cockpit-instance-control-substrate.md (daemon decoupled, UI-managed), @.aiwg/management/cockpit-vision.md, daemon/concierge

## Reasoning

1. **Problem analysis**: The AIWG daemon runs as its own independent process; the Cockpit decision is that the UI *manages* it (not fuses with it). An operator needs to see and control the daemon as a first-class managed entity — start/stop/observe/configure — without a separate tool.
2. **Constraint identification**: Cockpit must not *be* the daemon (overlay isolation — a Cockpit crash must not take down the daemon); it manages the daemon through the daemon's own control surface. Lifecycle actions inherit human-authorization for destructive ops.
3. **Alternative consideration**: (a) fuse the daemon into the Cockpit Bridge (rejected — couples lifecycles, breaks isolation); (b) manage the independent daemon as a managed entity via its control surface (chosen); (c) ignore the daemon in the UI (loses a key managed component).
4. **Decision rationale**: Managing the decoupled daemon keeps isolation intact while giving the operator one place to control it.
5. **Risk assessment**: accidental daemon stop disrupting background work (mitigated: confirm + blast radius); Cockpit/daemon lifecycle coupling (mitigated: separate processes, daemon survives Cockpit restart).

## Primary Actor

Operator viewing/controlling the AIWG daemon.

## Goal

See the daemon's status and start/stop/restart/observe/configure it from Cockpit, as an independent process the UI manages — never fused into the UI.

## Preconditions

- Cockpit running. The daemon may or may not be running.

## Main Success Scenario

1. Operator opens the daemon entity in the Running/Inventory view: status (running/stopped), uptime, active behaviors/missions it hosts.
2. Operator starts/stops/restarts the daemon via its control surface (Cockpit relays; it does not embed the daemon).
3. For stop/restart, Cockpit confirms with blast radius (background work the daemon hosts).
4. Operator inspects daemon logs/config (read; edits via the daemon's config surface).
5. The action + operator + timestamp are written to `activity-log`.

## Alternative Flows

**A1 — Cockpit restart**: the daemon keeps running across a Cockpit restart; Cockpit re-discovers and re-attaches to it (overlay isolation).
**A2 — Daemon not installed/enabled**: Cockpit shows it as available-but-inactive with an enable affordance.

## Exception Flows

**E1 — Daemon unreachable**: surfaced truthfully (status unknown) without blocking the rest of Cockpit.
**E2 — Control action fails**: shows the error + true state; never force-kills.

## Postconditions

- Daemon state reflects the action; daemon and Cockpit remain separate processes; action audited.

## Acceptance Criteria

- [ ] The daemon appears as a first-class managed entity with live status; start/stop/restart relay to its own control surface (Cockpit does not embed it).
- [ ] A Cockpit crash/restart does not stop the daemon (A1, overlay isolation); Cockpit re-attaches.
- [ ] Destructive actions confirm with blast radius (human-authorization); failures (E2) surface true state, never a hard kill.
- [ ] Daemon actions are audited in `activity-log`.
