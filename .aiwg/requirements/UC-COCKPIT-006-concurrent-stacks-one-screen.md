# UC-COCKPIT-006: Run ≥2 Concurrent Stacks Visible on One Screen

**Phase**: Inception
**Priority**: P0
**Status**: Draft
**Persona**: Solo power user (multi-stack), Ops/fleet operator
**Related**: @.aiwg/management/cockpit-vision.md (KPI: ≥3 concurrent stacks), @.aiwg/intake/cockpit-option-matrix.md §Priorities (3)

## Reasoning

1. **Problem analysis**: The standout multi-stack KPI is monitoring and controlling ≥3 concurrent stacks on one screen. Today that means ≥3 windows with no shared view and no per-stack control surface in one place.
2. **Constraint identification**: Each concurrent stack must remain fully native and isolated — one stack's activity (or Cockpit's view of it) must not perturb another. Cockpit observes/drives each via its own executor-registry entry.
3. **Alternative consideration**: (a) one merged stream (loses per-stack identity); (b) a multi-pane layout, one pane per registered executor, each with its own status + controls (chosen); (c) tab-only (defeats "one screen" simultaneity).
4. **Decision rationale**: A simultaneous multi-pane layout backed by per-stack executor-registry entries is the only design that delivers "one screen, ≥3 stacks, per-stack control" while preserving isolation.
5. **Risk assessment**: Rendering/poll load with many panes (mitigated: per-stack poll, bounded design target ~10, performance NFR); cross-pane interference (mitigated: each pane bound to one executor, isolation NFR); operator confusion (mitigated: clear per-pane stack/provider labeling).

## Primary Actor

Operator running multiple agentic stacks at once.

## Goal

Monitor and control ≥3 concurrent agentic stacks from a single screen, each with its own live status and per-stack pause/resume/attach controls.

## Preconditions

- Cockpit launched; ≥2 (target ≥3) sessions/executors running and registered (started via UC-COCKPIT-004 or external).

## Main Success Scenario

1. Operator opens the multi-stack view.
2. Cockpit renders one pane per running stack/executor, each labeled with its provider/stack identity and showing live status and output.
3. Each pane exposes per-stack controls: attach (UC-COCKPIT-005), pause/resume/stop (UC-COCKPIT-012).
4. Cockpit polls each pane independently; a busy or stalled stack does not freeze the others.
5. Operator watches and acts on ≥3 stacks simultaneously from the one screen.

## Alternative Flows

**A1 — Add a stack live**: Operator starts another session (UC-COCKPIT-004); a new pane appears without disrupting existing panes.

**A2 — High pane count**: Beyond a comfortable density, Cockpit offers a focus/grid toggle while keeping all stacks reachable (design target ~10).

## Exception Flows

**E1 — One stack errors or ends**: Its pane shows the terminal/error state; sibling panes are unaffected (isolation).

**E2 — Cockpit-side render fault in one pane**: The pane degrades to a safe state; it must not crash sibling panes or any underlying stack (overlay isolation invariant).

## Postconditions

- ≥3 concurrent stacks are visible and controllable from one screen; per-stack isolation held.
- Read/observe by default; control actions go through their respective UCs with their own gates.

## Acceptance Criteria

- [ ] A concurrency scenario test demonstrates monitoring + control of **≥3 concurrent stacks** on one screen, each with per-stack pause/resume/attach.
- [ ] Each pane is labeled with its provider/stack identity and bound to a single executor-registry entry.
- [ ] Independent per-stack polling: a stalled/busy stack does not freeze sibling panes.
- [ ] Adding a stack live (A1) inserts a pane without disrupting existing panes.
- [ ] One stack erroring/ending (E1) or a per-pane render fault (E2) does not affect sibling panes or any underlying running stack (overlay isolation).
- [ ] The layout remains usable toward the ~10-stack design target (focus/grid toggle, A2).
