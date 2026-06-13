# UC-COCKPIT-005: Attach to / Re-enter a Running Session (Non-Destructive)

**Phase**: Inception
**Priority**: P0
**Status**: Draft
**Persona**: Researcher, Solo power user, Ops/fleet operator
**Related**: @.aiwg/management/cockpit-vision.md, @.aiwg/intake/cockpit-intake.md §Reliability (non-destructive attach), §In-scope (c)

## Reasoning

1. **Problem analysis**: A researcher launches a long-running session, walks away, and later wants to re-enter it — but today re-entry depends on the provider, and a careless attach can hijack or disrupt a session that is mid-flight.
2. **Constraint identification**: Attach must be **non-destructive** — it must never hijack, steal input from, or perturb a running session. Detach must leave the session exactly as it was. This is a reliability hard requirement from the solution profile.
3. **Alternative consideration**: (a) take over the session's stdio (hijacks — forbidden); (b) attach as an additional observer/driver through the serve PTY-bridge / screen-reader seam so the session is shared, not stolen (chosen — `serve/pty-bridge.ts`, `serve/screen-reader.ts` exist for exactly this); (c) only show last-known logs (not true re-entry).
4. **Decision rationale**: The PTY-bridge/screen-reader seam lets Cockpit observe and (where the stack permits) drive a session without owning its lifecycle, which is the only model that satisfies non-destructive re-entry.
5. **Risk assessment**: Concurrent driver conflict (mitigated: explicit attach-as-observer default, drive only on explicit operator action + per-stack capability check); detach side effects (mitigated: detach is a no-op on the session; verified by isolation test); provider not attach-capable (mitigated: observe-only fallback, inception flag).

## Primary Actor

Operator re-entering a session that is already running.

## Goal

Re-enter and watch (and, where the stack permits, drive) a running session from Cockpit without hijacking it, and detach later leaving the session untouched.

## Preconditions

- A session is running and registered in the executor-registry (started via UC-COCKPIT-004 or externally).
- Cockpit launched; the session's stack exposes an attach/observe interface (PTY-bridge / screen-reader), else observe-only applies.

## Main Success Scenario

1. Operator selects a running session from the Running panel and clicks "Attach."
2. Cockpit attaches as an **observer** through the PTY-bridge/screen-reader, streaming live output without claiming exclusive input.
3. Cockpit indicates attach mode (observe / drive-capable) and whether another driver is active.
4. If the stack permits and the operator explicitly opts to drive, Cockpit sends input through the shared bridge — the underlying session keeps full native behavior.
5. Operator detaches; the session continues running, unchanged.
6. The session remains in the Running panel throughout.

## Alternative Flows

**A1 — Observe-only stack**: Attach yields a read-only live stream; drive controls are disabled and labeled.

**A2 — Re-attach after Cockpit restart**: Cockpit re-discovers the session from the executor-registry and re-attaches; audit timeline is intact (persisted on disk).

**A3 — Another driver active**: Cockpit indicates a driver is present and offers observe-only to avoid contention.

## Exception Flows

**E1 — Session ended between list and attach**: Cockpit reports "session no longer running," refreshes the Running panel, and offers to start a new one.

**E2 — Bridge unavailable**: Cockpit falls back to observe-only or last-known output with a clear note; no attempt to seize the session.

## Postconditions

- The session is unchanged by the attach/detach lifecycle (non-destructive invariant holds).
- An attach/detach `activity-log` entry is written; no provider credentials stored.

## Acceptance Criteria

- [ ] Attach defaults to **observer** mode and never seizes exclusive input from a running session (non-destructive).
- [ ] Detach leaves the session running and unmodified; an isolation test confirms zero perturbation of session state across attach→detach.
- [ ] Drive is available only where the stack permits and only on explicit operator action; observe-only stacks disable drive controls (A1).
- [ ] After a Cockpit restart, sessions are re-discovered from the executor-registry and re-attachable, with the audit timeline intact (A2).
- [ ] A concurrent driver is detected and surfaced; Cockpit offers observe-only to avoid contention (A3).
- [ ] A session that ended before attach (E1) yields a clear message + refresh, never a hang.
- [ ] Attach/detach are recorded in `activity-log`; no provider bearer token is held in UI state.
