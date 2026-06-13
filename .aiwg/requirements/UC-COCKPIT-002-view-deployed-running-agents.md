# UC-COCKPIT-002: View Deployed & Running Agents

**Phase**: Inception
**Priority**: P0
**Status**: Draft
**Persona**: Solo power user, Ops/fleet operator, Researcher
**Related**: @.aiwg/management/cockpit-vision.md (KPI: multi-stack concurrency), @.aiwg/intake/cockpit-intake.md §In-scope (b)

## Reasoning

1. **Problem analysis**: "Deployed" (what AIWG has installed per provider) and "running" (what is actively executing right now — Ralph loops, Mission Control missions, the daemon, serve executors) are two different questions, each answered today by a different CLI command in a different window.
2. **Constraint identification**: Running-state must come from existing status surfaces: `aiwg ralph-status`, `aiwg mc status`, the daemon status, and the `serve` executor-registry. Distinguish *deployed* (static inventory) from *running* (live processes) clearly.
3. **Alternative consideration**: (a) infer running state from log files (brittle, racy); (b) consume the existing status contracts and the executor-registry (chosen — authoritative, `serve/executor-registry.ts` already tracks live executors); (c) poll provider UIs directly (no uniform interface, violates overlay model).
4. **Decision rationale**: The executor-registry plus the per-utility status commands are the authoritative live-state sources AIWG already maintains; mirroring them keeps Cockpit truthful and avoids a parallel tracker.
5. **Risk assessment**: Live-state churn between polls (mitigated: short poll interval + change indicators); misattributing a finished process as running (mitigated: registry/status is source of truth, Cockpit reflects it verbatim).

## Primary Actor

Operator monitoring AIWG activity from the Cockpit running-agents view.

## Goal

See, on one screen, what is *deployed* per provider and what is *actively running* — every Ralph loop, Mission Control mission, daemon, and serve executor — with enough live status to decide what to act on.

## Preconditions

- Cockpit launched; UC-COCKPIT-001 install/inventory available.
- Status surfaces resolvable: `aiwg ralph-status`, `aiwg mc status`, daemon status, serve executor-registry.

## Main Success Scenario

1. Operator opens the running-agents view.
2. Cockpit renders a **Deployed** panel (per-provider deployed agents/skills/commands/rules, from inventory).
3. Cockpit renders a **Running** panel listing live items grouped by kind: Ralph loops (with iteration/cycle and status), MC missions (with conductor status), daemon (running/idle), and serve executors (per-stack, from the executor-registry).
4. Each running item shows: kind, owning stack/provider, status, started-at, and the available control affordances (links into UC-COCKPIT-005 attach, UC-COCKPIT-012 pause/resume/stop).
5. Cockpit polls on an interval and marks items that changed since last poll.
6. Operator reads the consolidated deployed-vs-running picture.

## Alternative Flows

**A1 — Nothing running**: Running panel shows an explicit empty state with a "start a session" affordance (UC-COCKPIT-004), not a blank area.

**A2 — Provider exposes no programmatic running-state**: That provider's running items render as "observe-only" with a note; deployed state still renders. (Ties to the inception flag on attach-capability.)

## Exception Flows

**E1 — A status source is unreachable**: That kind's sub-panel shows "unavailable + retry"; other kinds still render (graceful degradation).

**E2 — Executor-registry reports an executor in an error/abandoned state**: Cockpit surfaces it as an error tile with the registry's status and a link to the audit timeline.

## Postconditions

- The view reflects deployed and running state as of the last poll, with change indicators.
- Read-only (no process is started, paused, or stopped in this UC).

## Acceptance Criteria

- [ ] Deployed and Running are presented as two clearly separated panels; "deployed" ≠ "running" is unambiguous in the UI.
- [ ] Running panel lists Ralph loops, MC missions, daemon, and serve executors, each grouped by kind and tagged with owning provider/stack.
- [ ] Each running item shows status, started-at, and links to its control affordances (attach / pause-resume-stop) without executing them.
- [ ] Poll interval refreshes live state and items changed since last poll are marked.
- [ ] Empty running state (A1) shows an explicit empty state with a start affordance.
- [ ] A single unreachable source (E1) degrades only its sub-panel.
- [ ] Running-state is read from `ralph-status` / `mc status` / daemon status / executor-registry — never inferred from raw logs.
