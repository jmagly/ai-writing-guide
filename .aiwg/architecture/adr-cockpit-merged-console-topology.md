# ADR: Merged Cockpit Console Topology

**Status**: Accepted
**Date**: 2026-06-30
**Issue**: roctinam/aiwg#1654
**Related**: @.aiwg/architecture/adr-cockpit-package-topology.md, @.aiwg/architecture/adr-cockpit-ui-stack.md, @.aiwg/architecture/adr-cockpit-instance-control-substrate.md, @.aiwg/architecture/adr-cockpit-coordination-bus.md, @.aiwg/architecture/adr-cockpit-session-control-not-cli-runner.md
**Current-state audit**: @.aiwg/planning/cockpit-current-state-audit-2026-07-04.md

## Context

AIWG currently has two local UI codebases:

- `apps/web` / `@aiwg/web`: the older `aiwg serve` dashboard with richer early
  panels for missions, telemetry, memory, onboarding, and terminal viewing.
- `apps/cockpit/web` / `@aiwg/cockpit-web`: the Cockpit UI served by the Cockpit
  Bridge and bound to the real agentic-sandbox v2 surface through
  `instances`, `operations`, `events`, and PTY attach paths.

The merged console needs one base UI codebase, one backend/control plane, one
package and launch path, and one boundary for durable Mission orchestration.

## Decision

### Base UI codebase

Use `apps/cockpit/web` as the base UI codebase for the merged console.

The Cockpit web app is already paired with the Bridge and the current
agentic-sandbox v2 contract. It also already lives under the separately
published Cockpit package boundary. The richer `apps/web` feature panels are
treated as source material to port into Cockpit, not as the base application to
keep.

### Backend/control plane

Use the Cockpit Bridge as the single backend for the merged console.

The Bridge is the token-gated local control plane for inventory, lifecycle,
running state, approvals, sessions, contributions, catalog display, and user
library operations. It talks to agentic-sandbox and AIWG read-only catalog
surfaces; it does not become a second AIWG implementation and does not run CLI
work on behalf of the operator. Work execution continues through agentic
sessions, per `adr-cockpit-session-control-not-cli-runner.md`.

### Package and launch

Ship the merged console as the existing opt-in `@aiwg/cockpit` package.

The base `aiwg` package remains lean and may keep legacy `apps/web/dist` only as
the `aiwg serve` dashboard until that surface is retired or redirected. Cockpit
itself is acquired with `aiwg use cockpit` and launched with `aiwg cockpit`.
The package contains the Bridge, Cockpit web build, VS Code shell, and desktop
shell assets under `apps/cockpit/`.

### Mission orchestration boundary

Do not put durable Mission orchestration inside the Cockpit Bridge.

Cockpit composes, observes, and controls Missions through the existing
Mission conductor / `aiwg mc` / serve executor-registry boundary described in
`adr-cockpit-coordination-bus.md` and `adr-workflow-routing.md`. The conductor
owns durability, fan-out, per-worker routing, audit/provenance, and lifecycle
state. The Bridge owns local UI mediation: authenticated requests, status
projection, operator authorization, attach/handoff affordances, and display.

## Alternatives Considered

| Option | Verdict |
|---|---|
| Keep `apps/web` as the base and port Bridge bindings into it | Rejected. It preserves more early UI panels, but moves the merged console away from the already implemented Cockpit package, Bridge, shell, and real agentic-sandbox v2 seams. |
| Keep `apps/cockpit/web` as base and port selected `apps/web` panels into it | Chosen. This keeps the current real backend/package/launch path and scopes the remaining work to feature migration. |
| Use the older `apps/web` backend/API shape as the single backend | Rejected. The Cockpit Bridge already owns the current local token, shell, contribution, library, and agentic-sandbox integration story. |
| Add Mission durability to the Bridge | Rejected. It would duplicate `mc` / Mission conductor responsibilities and couple durable orchestration to a UI process. |
| Ship both consoles as separate first-class packages | Rejected. It preserves ambiguity and fails the "single package + launch" goal. |

## Consequences

- Child backend/frontend/mission issues should be re-scoped around hardening
  `apps/cockpit/*`, not extending `apps/web` as a parallel console.
- Feature parity gaps from `apps/web` become explicit porting work into
  `apps/cockpit/web`: missions, telemetry, memory, onboarding, and any terminal
  affordances not already represented in Cockpit.
- `apps/web` remains legacy/supporting surface for `aiwg serve` until a separate
  retirement or redirect decision is made.
- Existing package-footprint guards remain valid: `apps/cockpit/**` must not
  leak into the base `aiwg` tarball, while `@aiwg/cockpit` carries the heavier
  merged-console payload.

## 2026-07-04 Audit Update

The topology decision is now the active baseline, not a pending decision.
agentic-sandbox has advanced to the July `v2026.7.1` release line, and Cockpit
already targets the real v2 executor by default:

- the Bridge refuses mock-like executors unless an automated harness opts in;
- inventory normalizes real admin v2 payloads;
- Running derives from per-instance A2A task surfaces;
- Approvals derive from A2A `input-required` / `hitl-prompt/v1` task surfaces;
- sessions use the real session APIs and direct PTY attach URLs;
- `test/integration/cockpit-bridge.test.js` covers the real-v2-shaped path.

Therefore aiwg#1654 is ready to close. Follow-on work belongs under aiwg#1655
(Bridge backend completion), aiwg#1656 (UI consolidation), and aiwg#1657
(durable Mission surface).
