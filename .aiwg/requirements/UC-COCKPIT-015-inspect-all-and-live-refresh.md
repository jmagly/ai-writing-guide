# UC-COCKPIT-015: Inspect Any AIWG Tool/Utility + Live Capability/Index Refresh (No Restart)

**Phase**: Inception
**Priority**: P0
**Status**: Draft
**Persona**: All (power user, ops, newcomer, dev lead)
**Related**: @.aiwg/architecture/adr-cockpit-ui-cli-extension-binding.md, @.aiwg/architecture/adr-cockpit-ui-extensibility-contribution-model.md, @.aiwg/requirements/nfr-modules/cockpit-nfrs.md (NFR-10), rules: activity-log, post-commit-index-refresh, skill-discovery; CLI: `aiwg discover`/`show`/`index`

## Reasoning

1. **Problem analysis**: AIWG's value is its large, growing corpus of tools/skills/agents/commands/rules/indices. A control plane that only shows a hardcoded subset hides most of that value. Users want everything available, accessible, and inspectable — and they don't want to restart the app every time something changes.
2. **Constraint identification**: Inspectability must come from AIWG's own discovery + index (no parallel catalog to drift); updates must propagate to the running UI **without a restart** (hooks + automation), and inherit the data-driven/contribution architecture.
3. **Alternative consideration**: (a) hardcode a curated capability list (drifts, hides the corpus); (b) bind the UI to `aiwg discover`/`show` + the artifact index and push live updates via hooks (chosen); (c) require restart on change (poor UX, rejected).
4. **Decision rationale**: Binding to discovery+index with hook-driven live refresh makes the whole corpus inspectable and current without restarts.
5. **Risk assessment**: refresh storms / perf (mitigated: debounced, incremental index refresh — post-commit-index-refresh pattern; ≤5s target); stale views (mitigated: event-driven push + freshness indicator); index growth (mitigated: leverage existing index/vector subsystem + resolveStorage).

## Primary Actor

Any operator browsing/inspecting AIWG capabilities and indices in the UI while the system evolves.

## Goal

Browse and inspect *every* AIWG tool/skill/agent/command/rule/addon/framework/extension and index from the UI (sourced from discovery + the artifact index), and have the UI reflect additions/removals/index rebuilds **live, without restarting the app**.

## Preconditions

- Cockpit running; AIWG discovery + index available (`aiwg discover`/`show`/`index`).

## Main Success Scenario

1. Operator opens **Explore** (capability + index browser). Cockpit lists all artifacts from `aiwg discover`/the index with type, capability summary, and a full-body view (`aiwg show`).
2. Operator inspects any item (skill/agent/rule/command/tool) — body, metadata, triggers, and (for executable skills) run affordance.
3. Operator views indices/vectors (project/codebase/framework/user graphs) and can trigger or inspect index builds/queries.
4. Meanwhile, an extension is deployed (UC-COCKPIT-011) or an index is rebuilt elsewhere; a hook/automation pushes the change and the UI **updates live** — the new capability/index appears (stale ones disappear) within the refresh window, **no app restart**.
5. Changes are reflected in the relevant contributed surfaces too (a new SDLC skill shows up on the SDLC board).

## Alternative Flows

**A1 — User-defined index/vector**: operator creates a new index/graph from the UI (leveraging `aiwg index`); it becomes an inspectable surface live.
**A2 — Executable skill**: an executable skill exposes a run affordance (routes through the registry/core, gated).
**A3 — Manual refresh**: operator can force a refresh, but it is not required for correctness.

## Exception Flows

**E1 — Index build fails**: surfaced truthfully with the error; last-good view remains; no crash.
**E2 — Discovery unavailable**: Explore shows last-known list with a staleness note; never blocks the rest of the UI.

## Postconditions

- The UI reflects the live state of AIWG's corpus + indices sourced from discovery/index; no restart was needed; refreshes are audited where they mutate (index build).

## Acceptance Criteria

- [ ] Every AIWG artifact type + every index is inspectable in the UI, sourced from `aiwg discover`/`show` + the artifact index (not a hardcoded subset).
- [ ] Deploying/removing an extension or rebuilding an index while the app runs updates the UI **with 0 restarts**, within the NFR-10 refresh window (≤5 s target), via hooks/automation.
- [ ] New capabilities also appear in their contributed surfaces (e.g., a new SDLC skill on the SDLC board).
- [ ] User-defined indices/vectors can be created/inspected from the UI (A1); executable skills expose a gated run affordance (A2).
- [ ] Index build failures (E1) and discovery-unavailable (E2) degrade gracefully; index mutations are audited.
