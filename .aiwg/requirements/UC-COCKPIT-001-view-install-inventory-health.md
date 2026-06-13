# UC-COCKPIT-001: View Install, Inventory & Health

**Phase**: Inception
**Priority**: P0
**Status**: Draft
**Persona**: Newcomer, Solo power user, Ops/fleet operator
**Related**: @.aiwg/management/cockpit-vision.md (KPI: time-to-first-session), @.aiwg/intake/cockpit-intake.md §In-scope (a)

## Reasoning

1. **Problem analysis**: An operator cannot answer "what is installed, what version, and is it healthy?" without running `aiwg list`, `aiwg status --probe`, and `aiwg doctor` separately and reading three terminal outputs.
2. **Constraint identification**: Cockpit must read this state through existing programmatic surfaces only — `aiwg status --probe --json`, `aiwg doctor`, `aiwg list` — never by re-implementing inventory logic. Read-only; no mutation in this UC.
3. **Alternative consideration**: (a) screen-scrape human CLI output (brittle); (b) consume the `--json` probe/list contracts (chosen — stable schema, already exists, `workspace.ts` handler implements `--probe`); (c) build a parallel inventory store (violates no-new-backend constraint).
4. **Decision rationale**: Reusing the `--json` probe is the lowest-risk path and keeps Cockpit a faithful mirror of CLI truth, satisfying the engagement-verification rule and the maintainability priority.
5. **Risk assessment**: Stale view if probe not refreshed (mitigated: poll interval + manual refresh + last-updated timestamp); doctor failures misread as Cockpit failures (mitigated: surface doctor findings verbatim with remediation, per daemon error-absorption pattern).

## Primary Actor

AIWG operator (any persona) viewing the Cockpit home screen.

## Goal

See, on one screen, the full AIWG install picture — configured providers, installed frameworks/addons, versions, deployment matrix, and health diagnostics — without running any CLI command.

## Preconditions

- Cockpit local server launched (operator has run the Cockpit entry point).
- AIWG installed; `aiwg status --probe --json`, `aiwg doctor`, and `aiwg list` resolvable in the workspace.

## Main Success Scenario

1. Operator opens the Cockpit home screen.
2. Cockpit invokes the engagement probe (`aiwg status --probe --json`) and renders: engaged state, project root, configured providers, deployed provider files.
3. Cockpit invokes `aiwg list` and renders installed frameworks/addons with versions in a deployment matrix (provider × artifact-type).
4. Cockpit invokes `aiwg doctor` and renders health as pass/warn/fail tiles, each with the verbatim finding and remediation text.
5. Cockpit displays a "last refreshed" timestamp and a manual refresh control.
6. Operator reads the complete picture; no terminal required.

## Alternative Flows

**A1 — Not engaged / no project root**: Probe reports not-engaged. Cockpit shows a clear "AIWG is not engaged in this directory" state with the probe's next-action guidance and a button to run guided start (UC-COCKPIT-003).

**A2 — Manual refresh**: Operator clicks refresh; Cockpit re-runs the three reads and updates the timestamp.

## Exception Flows

**E1 — A probe/CLI invocation fails**: Cockpit shows a one-line reframed error (not a raw stack trace), the affected panel marked unavailable, and a retry control. The rest of the screen continues to render from the panels that succeeded (graceful degradation).

**E2 — `aiwg doctor` reports failures**: Findings render as fail tiles with remediation; Cockpit never auto-runs a repair without operator action (human-authorization).

## Postconditions

- The home screen reflects the workspace's actual install/inventory/health state as of the displayed timestamp.
- No workspace state was modified (read-only UC).

## Acceptance Criteria

- [ ] Home screen renders providers, frameworks/addons + versions, and a provider × artifact-type deployment matrix sourced from `aiwg status --probe --json` and `aiwg list`.
- [ ] Health tiles render every `aiwg doctor` finding with its verbatim message and remediation; pass/warn/fail are visually distinct and not color-only (paired with text/icon).
- [ ] A "last refreshed" timestamp is shown and a manual refresh re-runs all three reads.
- [ ] Not-engaged state is handled per A1 with the probe's next-action surfaced.
- [ ] A failed read (E1) degrades that panel only; other panels still render.
- [ ] No Cockpit-initiated mutation occurs in this UC (verified: read-only command set).
- [ ] No AIWG attribution, signature, or generated-by text is added to any workspace file as a side effect (engagement-verification rule).
