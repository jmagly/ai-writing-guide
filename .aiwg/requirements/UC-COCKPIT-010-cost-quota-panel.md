# UC-COCKPIT-010: Cost & Quota Panel (Surface, Don't Generate)

**Phase**: Inception
**Priority**: P1
**Status**: Draft
**Persona**: Ops/fleet operator, Solo power user
**Related**: @.aiwg/management/cockpit-vision.md, #1187 (per-key/per-bot OpenRouter spend aggregation), @.aiwg/intake/cockpit-intake.md §Budget guardrails

## Reasoning

1. **Problem analysis**: Running several stacks/Missions at once makes spend and rate-limit headroom invisible until a 429 or a bill surprises the operator. They want spend/quota at a glance across stacks.
2. **Constraint identification**: Cockpit must **surface** existing metrics (`aiwg cost-report`, `aiwg metrics-tokens`, #1187 per-key aggregation), not add new billable calls or its own spend. Read-only over existing data.
3. **Alternative consideration**: (a) live-poll provider billing APIs from the UI (adds cost/secrets — rejected); (b) read AIWG's existing cost/metrics surface + #1187 aggregation and render trends (chosen); (c) no panel (loses a key ops value).
4. **Decision rationale**: Surfacing the data AIWG already collects gives the value with zero added spend and no new credential surface.
5. **Risk assessment**: Stale/incomplete data (mitigated: show source + freshness; degrade gracefully when #1187 not configured); credential exposure (mitigated: read aggregated metrics only, never raw provider keys).

## Primary Actor

Operator monitoring cost/quota across running stacks.

## Goal

See aggregated spend and rate-limit/quota headroom per stack/key in one panel, sourced from AIWG's existing cost/metrics surface, with no added spend or stored credentials.

## Preconditions

- Cockpit launched; AIWG cost/metrics surface available (`cost-report`, `metrics-tokens`); optionally #1187 per-key aggregation configured.

## Main Success Scenario

1. Operator opens the Cost & Quota panel.
2. Cockpit reads AIWG's existing cost/metrics data (and #1187 aggregation if present) and renders per-stack/per-key spend + token usage with a freshness timestamp and source label.
3. Where quota/rate-limit headroom is known, Cockpit shows it and flags stacks near a limit.
4. Operator drills into a stack to see its session-level breakdown.

## Alternative Flows

**A1 — #1187 not configured**: panel shows per-session metrics from `metrics-tokens`/`cost-report` and notes that cross-key aggregation needs #1187.

**A2 — Threshold warning**: a stack approaching a configured spend/quota threshold is highlighted (advisory only; no auto-stop in v1).

## Exception Flows

**E1 — Metrics source unavailable**: panel shows last-known values with a clear staleness note; never blocks the rest of Cockpit.

## Postconditions

- No new billable API calls were made; no raw provider credentials were read or stored; the panel reflects existing AIWG metrics.

## Acceptance Criteria

- [ ] Panel renders per-stack/per-key spend + token usage sourced only from existing AIWG metrics (`cost-report`/`metrics-tokens`/#1187) — no new billable calls.
- [ ] Each figure shows its source and freshness; stale data degrades gracefully (E1) without blocking the UI.
- [ ] Stacks near a known quota/threshold are flagged (A2); v1 is advisory (no auto-stop).
- [ ] When #1187 aggregation is absent, the panel still works at session granularity and says so (A1).
- [ ] No raw provider key or bearer token is read into or stored in UI state.
