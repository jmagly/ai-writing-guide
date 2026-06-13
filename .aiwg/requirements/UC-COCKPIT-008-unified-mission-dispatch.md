# UC-COCKPIT-008: Dispatch a Unified Mission Over Heterogeneous Workers

**Phase**: Inception
**Priority**: P0
**Status**: Draft
**Persona**: Ops/fleet operator, Researcher, Solo power user (multi-stack)
**Related**: @.aiwg/management/cockpit-vision.md §Differentiator 3 (coordination action 2), @.aiwg/intake/cockpit-intake.md §Cross-stack coordination layer; AIWG #1546 (cross-stack Mission conductor — `serve/mission-conductor.ts`, `serve/stack-adapters.ts`)

## Reasoning

1. **Problem analysis**: AIWG can already conduct a cross-stack Mission (#1546) — one conductor fanning subtasks to workers on different stacks — but the operator has no single surface to *compose, dispatch, and steer* that heterogeneous fan-out. Mission Control's CLI fans out blind to the operator's eyes.
2. **Constraint identification**: Cockpit must drive the existing cross-stack Mission conductor (not reimplement orchestration), let the operator assign subtasks to workers on *different* stacks, and surface the conductor's live status (per-worker progress, gates, completion). AIWG owns the conductor; native primitives drive worker mechanism.
3. **Alternative consideration**: (a) per-stack separate dispatches the operator manually correlates (the painful status quo); (b) a Cockpit Mission composer that submits one Mission to the conductor with heterogeneous worker assignments and renders the conductor's live fan-out (chosen); (c) a new Cockpit-owned orchestrator (violates no-new-runtime + duplicates #1546).
4. **Decision rationale**: Driving `serve/mission-conductor.ts` through Cockpit is the only design that delivers unified heterogeneous dispatch *and* reuses the substrate, satisfying the differentiator and the no-new-backend constraint.
5. **Risk assessment**: High blast radius (mitigated: dispatch behind an authorization gate + completion-criterion + cost surfacing); a worker stack failing mid-Mission (mitigated: conductor's per-stack status surfaced, Cockpit reflects abort/retry rather than hiding it); audit (mitigated: conductor + Cockpit both write `activity-log`).

## Primary Actor

Operator composing and dispatching a cross-stack Mission.

## Goal

Compose one AIWG Mission whose workers span different stacks, dispatch it through the cross-stack conductor, and watch/steer the heterogeneous fan-out from one screen.

## Preconditions

- Cockpit launched; the serve Mission conductor and stack-adapters (#1546) are reachable.
- The target worker stacks are configured/available.

## Main Success Scenario

1. Operator opens the Mission composer and states the Mission goal + completion criterion (per vague-discretion: measurable, not "good enough").
2. Operator assigns subtasks to workers on chosen stacks (e.g., subtask A → Codex worker, subtask B → Claude Code worker).
3. Cockpit shows a dispatch confirm step (authorization gate) summarizing goal, criterion, worker assignments, and any cost/quota surfacing (#1187).
4. On confirm, Cockpit dispatches the Mission to the conductor; the conductor fans out to the heterogeneous workers via the stack-adapters.
5. Cockpit renders the conductor's live status: per-worker progress, raised gates (route to UC-COCKPIT-009), and overall completion against the criterion.
6. The Mission completes (or pauses at a gate / aborts); Cockpit reflects the conductor's verdict.

## Alternative Flows

**A1 — Single-stack Mission**: All workers on one stack — still composed and dispatched the same way; heterogeneity is optional.

**A2 — Mission raises a HITL gate**: The gate surfaces in the unified approval inbox (UC-COCKPIT-009); the Mission pauses until resolved.

## Exception Flows

**E1 — A worker stack unavailable at dispatch**: Cockpit surfaces the conductor's rejection/partial-dispatch state and lets the operator reassign or abort; it does not silently drop the subtask.

**E2 — Conductor reports a worker error mid-Mission**: Cockpit reflects the error and the conductor's recovery state (retry/abort) rather than masking it.

## Postconditions

- A cross-stack Mission was dispatched through the existing conductor and its live status was visible end-to-end.
- `activity-log` records dispatch, gates, and completion; no new orchestration backend was introduced.

## Acceptance Criteria

- [ ] Operator can compose one Mission with workers assigned to **different** stacks and dispatch it from one surface.
- [ ] Dispatch drives the existing cross-stack Mission conductor (#1546) — Cockpit does not implement its own orchestrator.
- [ ] A measurable completion criterion is required at compose time (vague-discretion); dispatch is behind an authorization gate with cost/quota surfaced (#1187).
- [ ] Cockpit renders per-worker live progress, raised gates, and overall completion against the criterion.
- [ ] Worker unavailability at dispatch (E1) and worker errors mid-Mission (E2) are surfaced from the conductor, never silently dropped/masked.
- [ ] Raised HITL gates route to the unified approval inbox (UC-COCKPIT-009).
- [ ] Dispatch, gates, and completion are recorded in `activity-log`.
