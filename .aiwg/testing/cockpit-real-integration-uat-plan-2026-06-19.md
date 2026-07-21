# Cockpit Real-Integration UAT Configuration Plan

Date: 2026-06-19
Status: Draft for operator review
Related: #1621, #1622, #1529, `.aiwg/testing/cockpit-test-strategy.md`, `apps/cockpit/README.md`

## Purpose

Move Cockpit validation from completed mock-backed UX evidence into a real-data,
real-integration UAT path that proves the operator experience against a live
`agentic-sandbox` executor and real authenticated provider sessions.

Mock evidence remains useful for deterministic CI and UI regression coverage, but
it does not satisfy release UAT for Cockpit control, session, or runtime behavior.

## UAT Principles

1. Real executor evidence is required for release claims.
2. Mock-only evidence is allowed only for harness development and visual regression.
3. Provider workload must run inside the attached session, not beside it.
4. Every skip must name the missing runtime, capability, or upstream blocker.
5. No credentials, bearer tokens, private keys, CSRs, or provider auth material are
   copied into reports.
6. The Bridge is the control surface only. The provider agent runs the AIWG command
   or discovery workload inside the target session.

## Environment Under Test

| Component | Required configuration |
| --- | --- |
| AIWG repo | `/home/roctinam/dev/aiwg` |
| Cockpit UI | Built from `apps/cockpit/web` using `npm --prefix apps/cockpit run build:web` |
| Cockpit Bridge | `node apps/cockpit/bridge/src/server.mjs` |
| Executor | Real `agentic-sandbox`, not bundled `apps/cockpit/mock-executor` |
| Executor URL | `AIWG_COCKPIT_EXECUTOR_URL=http://127.0.0.1:<real-executor-port>` |
| Provider | Start with `codex`; add `claude` after auth propagation is proven |
| Report base | `.aiwg/testing/outputs/cockpit-real-uat-2026-06-19` or dated successor |
| Executor version | `AIWG_COCKPIT_EXECUTOR_VERSION=<agentic-sandbox tag-or-commit>` when not exposed by API |

## Data Set

The UAT should use live AIWG data from this repository rather than canned fixtures:

| Data surface | Real data source | UAT use |
| --- | --- | --- |
| Capability catalog | `aiwg discover` / `aiwg show` from this checkout | Explore tab, action suggestions, provider workload proof |
| Issues / blockers | Gitea `roctinam/aiwg` open issues | Provider workload should identify `issue-audit` or selected release blocker capability |
| Cockpit artifacts | `.aiwg/ux/`, `.aiwg/testing/`, `.aiwg/architecture/` | Operator review, traceability, evidence links |
| Runtime inventory | Real `agentic-sandbox` admin API | Inventory, runtime posture, transport posture |
| Sessions | Real managed session backend, preferably `tmux` first | Sessions tab, observe attach, drive attach |
| Running work | Real executor running/tasks API | Running tab and task projection |
| Approvals | Real or seeded HITL prompt payloads from executor/core | Approvals tab decision workflow |
| Contributions | First-party `apps/cockpit/contrib` plus optional operator extension dir | Actions tab and copy-CLI affordances |

## UAT Tiers

### Tier 0 - Mock Baseline

Purpose: Confirm the currently completed UX and regression suite before real runs.

Command:

```bash
npm --prefix apps/cockpit run check
```

Exit criteria:

- Web build, typecheck, rendered-DOM tests, smokes, and PoCs pass.
- The operator-wall `Topology` and `Handoff` review modes remain accessible.
- No release claims are made from this tier alone.

### Tier 1 - Real Executor Smoke

Purpose: Prove Cockpit can reach a real executor and normalize real inventory.

Command:

```bash
AIWG_COCKPIT_EXECUTOR_URL=http://127.0.0.1:<real-executor-port> \
AIWG_COCKPIT_LIVE_REQUIRED=1 \
AIWG_COCKPIT_EXECUTOR_VERSION=<agentic-sandbox-tag-or-commit> \
AIWG_COCKPIT_LIVE_REPORT=.aiwg/testing/outputs/cockpit-real-uat-2026-06-19 \
npm run uat:cockpit-live
```

Exit criteria:

- Bridge health passes against the real executor URL.
- Inventory returns at least one real instance with runtime posture, transport
  posture, and session backend evidence.
- Session metadata and running task projection are pass or explicitly skipped with
  executor evidence.

### Tier 2 - Host Runtime Provider Session

Purpose: Prove the current known-good path: host runtime, managed session, and
pre-authenticated Codex inside the target session.

Command:

```bash
AIWG_COCKPIT_EXECUTOR_URL=http://127.0.0.1:<real-executor-port> \
AIWG_COCKPIT_LIVE_REQUIRED=1 \
AIWG_COCKPIT_LIVE_MATRIX_REQUIRED=1 \
AIWG_COCKPIT_LIVE_PROVIDER=codex \
AIWG_COCKPIT_LIVE_DISCOVERY_EXPECT=issue-audit \
AIWG_COCKPIT_EXECUTOR_VERSION=<agentic-sandbox-tag-or-commit> \
AIWG_COCKPIT_LIVE_REPORT=.aiwg/testing/outputs/cockpit-real-host-uat-2026-06-19 \
npm run uat:cockpit-live:matrix
```

Current harness note: strict matrix mode requires host, container, and VM, so this
command will fail until all three runtime families are present. For a host-only
operator rehearsal, record the host pass from the generated report and preserve
the expected container/VM failures as blockers instead of treating them as a
Cockpit UI regression.

Exit criteria for host readiness:

- Real host instance appears in inventory.
- Host instance maps to a connected agent.
- Session create/list succeeds through the Bridge.
- Observe attach is granted.
- Drive attach is granted when advertised.
- `codex exec -s read-only ...` runs inside the session.
- Provider output includes `AIWG_COCKPIT_LIVE_OK` and the expected discovery result.

### Tier 3 - Strict Runtime Matrix

Purpose: Release-grade UAT for #1621.

Prerequisites:

- Host runtime target registered and session-capable.
- Docker/container target registered and session-capable.
- VM target registered and session-capable.
- All targets expose enough runtime, transport, and backend metadata for Cockpit to
  normalize posture.

Command:

```bash
AIWG_COCKPIT_EXECUTOR_URL=http://127.0.0.1:<real-executor-port> \
AIWG_COCKPIT_LIVE_REQUIRED=1 \
AIWG_COCKPIT_LIVE_MATRIX_REQUIRED=1 \
AIWG_COCKPIT_LIVE_PROVIDER=codex \
AIWG_COCKPIT_LIVE_DISCOVERY_EXPECT=issue-audit \
AIWG_COCKPIT_EXECUTOR_VERSION=<agentic-sandbox-tag-or-commit> \
AIWG_COCKPIT_LIVE_REPORT=.aiwg/testing/outputs/cockpit-real-matrix-uat-2026-06-19 \
npm run uat:cockpit-live:matrix
```

Exit criteria:

- `matrix host`: PASS.
- `matrix container`: PASS.
- `matrix vm`: PASS.
- No `AIWG_COCKPIT_LIVE_ALLOW_MOCK_MATRIX=1`.
- Report includes executor URL, executor identity/version, provider, discovery
  expectation, target family, instance id, runtime family, backend, and exact
  artifact paths.

### Tier 4 - Operator Workflow UAT

Purpose: Validate that the real data is usable by an operator, not only by tests.

Manual scenarios:

1. Open Cockpit against the real Bridge URL.
2. Compare `Topology` and `Handoff` Home modes and select the v1 default for #1622.
3. Inventory: verify host/container/VM posture labels and degraded states are clear.
4. Sessions: create a managed host session, observe first, then explicitly drive.
5. Explore: search for `issue audit`; verify capability results come from real AIWG discovery.
6. Actions: copy a CLI command and inject one safe read-only action into the session.
7. Running: confirm the provider workload appears or is explicitly absent with a clear reason.
8. Approvals: process a real or seeded HITL prompt and confirm decision state.
9. Kill/restart Bridge while a session continues; verify reattach does not perturb the run.

Exit criteria:

- Operator can identify runtime trust and control level without reading logs.
- No visible stale mock data remains in a real run.
- No text overlap or first-viewport regression in the selected operator-wall mode.
- CLI parity remains visible through copy/inject affordances.

## Current Known Blockers

| Blocker | Impact | Tracking |
| --- | --- | --- |
| Docker/container secure transport provisioning | Prevents strict matrix container pass | `roctinam/agentic-sandbox#497` |
| VM guest registration/session target | Prevents strict matrix VM pass | `roctinam/agentic-sandbox#498` |
| Claude auth-state propagation | Blocks Claude as a reliable provider workload | `roctinam/agentic-sandbox#499` |
| Operator design acceptance | Keeps #1622 open until `Topology` vs `Handoff` default is accepted | `roctinam/aiwg#1622` |

## Evidence Artifacts

Each UAT run should preserve:

- Markdown report: `.aiwg/testing/outputs/<run-name>.md`
- JSON report: `.aiwg/testing/outputs/<run-name>.json`
- Browser screenshots for selected operator workflows, stored under `/tmp` during
  rehearsal and written into `.aiwg/testing/outputs/`; attach selected release
  evidence through the release workflow.
- Optional upstream conformance report path via `AIWG_SANDBOX_CONFORMANCE_REPORT`.

Do not preserve secrets or raw provider auth material.

## Acceptance Summary

The UAT configuration is acceptable for release only when:

- Tier 0 passes.
- Tier 1 passes against a real executor.
- Tier 3 passes for host, container, and VM without mock allowance.
- Tier 4 operator workflow signs off on the selected Home review mode.
- Any failed target has a linked upstream issue or AIWG issue with exact evidence.

Until container and VM are ready, the next practical milestone is a documented
Tier 2 host-runtime UAT rehearsal with real Codex session evidence and explicit
container/VM blocker carry-forward.
