# doc-sync audit — serve/sandbox/cockpit integration (code-to-docs)

**Date:** 2026-07-09
**Direction:** code-to-docs (code + verified runtime state are source of truth)
**Scope:** `aiwg serve` + Cockpit bridge + agentic-sandbox integration surface
**Milestone captured:** best-functioning integration reached at **agentic-sandbox v2026.7.4** —
session-listing APIs (#140 sessions, #611 host-runtime listing) live end-to-end
(no more 502), and instance **transport posture** (`transport`,
`transport_posture`, `security_posture`) + **host-daemon status** (`host_daemon`,
mtls / vsock / bootstrap-pending) surface per instance (prior "Unknown transport"
resolved).
**Evidence:** `.aiwg/testing/cockpit-7.4-transport-verify-2026-07-09.md`,
`.aiwg/working/cockpit-7.4-inventory-2026-07-09.png`,
`src/cli/handlers/serve.ts:1510-1560`.
**Auditor evidence:** `.aiwg/working/doc-sync/user-docs-audit.md`,
`.aiwg/working/doc-sync/arch-docs-audit.md`.

## Findings by severity

### High — applied (factual / milestone notes)

| # | Doc | Drift vs. code | Fix |
|---|-----|----------------|-----|
| U1 | `docs/serve-guide.md` "Other Sandbox Endpoints" | Session-listing proxies (`GET`/`POST /api/sandboxes/:id/agents/:aid/sessions`, `DELETE …/sessions/:session`, `GET …/sessions/:sessionId/screen`) live (serve.ts:1516/1527/1545/1665) but undocumented | Added rows + live-since-v2026.7.4 note |
| U2 | `docs/serve-guide.md` | Instance transport posture + host-daemon fields (sandbox-sourced pass-through) never documented | Added "Instance transport posture" subsection |
| A1 | `.aiwg/architecture/adr-executor-contract.md` Context | 2026-05-08 note records wiring as MISSING (`AIWG_SERVE_ENDPOINT` unset, "zero workers picked them up") — now live+verified | Added dated superseding milestone note (history preserved) |
| A2 | `.aiwg/architecture/cockpit-instance-control-interface.md` | Status "Draft contract — the mock implements"; seam now bound + verified against a real executor at v2026.7.4 | Added verified-live note (formal Status flip deferred to operator) |

### Medium — applied

| # | Doc | Drift | Fix |
|---|-----|-------|-----|
| U3 | `docs/contracts/executor.v1.md:297` | Cites `POST /api/v1/sandboxes/register`; real route is `POST /api/sandboxes/register` (serve.ts:1143) — contradicts serve-guide.md:312 | Corrected path |
| A3 | `.aiwg/architecture/adr-cockpit-instance-control-substrate.md` §2/§3 | "MUST be extended to add a local user-host target" + "the upstream extension this product depends on" — host target + session listing have landed (`host ✓ · docker ✓ · vm ✓`, #140/#611) | Added factual "landed" notes (formal Status Proposed→Accepted deferred to operator) |
| A4 | `.aiwg/architecture/cockpit-sad.md` §6 | Cross-cutting concerns omit transport-trust posture surfacing (now live) | Added §6 posture note |

### Deferred to operator (governance decisions — not applied)

- **ADR Status-label flips**: `adr-cockpit-instance-control-substrate.md`
  Proposed→Accepted; `cockpit-sad.md` + `cockpit-instance-control-interface.md`
  Draft→baseline. These are approval events a human owns; factual milestone
  notes were added instead so the live state is unambiguous.
- **Executor-contract Approvals table** (all-TBD): sign-off is governance.

### Not touched (over-claiming guard — residuals still open per evidence)

- `serve-guide.md` "Known gaps as of sandbox `effdb43`" (exit codes,
  in-memory `MissionStore`, resumability events) — transport-verify evidence does
  **not** confirm these resolved; left as-is.
- Open upstream deps: agentic-sandbox #499 (Claude auth-state propagation),
  #500 (agent-scoped PTY sessions in global registry), #501 (controller
  exclusivity), host_daemon detail gap.

## Validation

- Endpoint paths cross-checked against `src/cli/handlers/serve.ts` route table.
- No behavioral/API claims added beyond what the transport-verify artifact and
  route table confirm.
