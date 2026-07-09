# Cockpit ↔ agentic-sandbox v2026.7.4 — transport-posture + session verification

**Date:** 2026-07-09
**Executor:** agentic-sandbox `v2026.7.4` (`agentic-mgmt` on 127.0.0.1:8122, built from the 7.4 checkout)
**Cockpit:** repo bridge `apps/cockpit/bridge/src/server.mjs` on 127.0.0.1:8141, `AIWG_COCKPIT_EXECUTOR_URL=http://127.0.0.1:8122`, real `web/dist` UI
**Surface driven:** browser (playwright-secure) → Inventory + Sessions tabs
**Screenshot:** `.aiwg/testing/cockpit-7.4-inventory-2026-07-09.png`

## What was blocked (pre-7.x)

The v2 admin instance object did not surface transport posture or host-daemon
status, so Cockpit Inventory rendered **"Unknown transport (unknown)"** for every
instance (see `.aiwg/working/cockpit-feedback/7-sandbox-transport.md`,
`.aiwg/working/inv-current.md`). Session-list proxying 502'd pending the
`agentic-sandbox#140` endpoints (`src/cli/handlers/serve.ts:1513`).

## What landed in the sandbox (6.24 → 7.4)

- `dd97529 fix(admin-v2): expose instance transport posture` + `b03cb43
  normalize transport posture consumers` — admin-v2 instance now carries
  `transport`, `transport_posture`, `security_posture`, `host_daemon`.
- `#611` host-runtime session listing (7.3) — `GET /api/v1/agents/{id}/sessions`
  returns host/local sessions; 7.2 adds attach metadata + controller/observer
  leases.

The AIWG bridge already mapped these fields (`server.mjs:698-785`,
`normalizeTransport`/`normalizeHostDaemon`), so the fix flows through with no
Cockpit-side code change.

## Observed result (Inventory, 4 instances)

| Instance | Runtime | Transport | Host daemon |
|---|---|---|---|
| `019f436d-b06b-…` | Host / full host access | **Secure transport · mtls** | **available** (detail: "status not reported") |
| `cockpit-mrcjale6s5v2` | Container / shared kernel | **Secure transport · mtls** | n/a for tier |
| `verify-providers-uat2` | VM (enrolled) | **Local transport · vsock** | n/a for tier |
| `cockpit-mrcjasdwj95k` | VM (mid-bootstrap) | Unknown · **bootstrap-pending** | — |

- Runtime target coverage banner: **host ✓ · docker ✓ · vm ✓** (was `host - ·
  docker ✓ · vm -`).
- The single remaining "Unknown transport" is a VM still bootstrapping, now
  labelled with the correct transitional posture `bootstrap-pending` (the sandbox
  `AgentTransportPosture::bootstrap_pending()` path) rather than the prior dead
  `unknown`.
- Sessions tab listed all three running instances and returned **"No sessions
  yet"** (empty list, HTTP 200) — not a 502 — confirming the `#140`/`#611`
  session endpoints are live.

## Verdict

**PASS.** Transport posture and host-daemon status now surface end-to-end
through the Cockpit bridge against v2026.7.4; the "Unknown transport" regression
is resolved. Session-list endpoints are live (no 502).

## Residuals (non-blocking, out of this pass)

- Host `host_daemon` shows `available` but "Host daemon status was not reported"
  — field present, detailed status absent. Minor upstream detail gap.
- Raw `server.mjs` launch logs a `/api/cost` 404 (Telemetry) and `favicon.ico`
  404 — cosmetic, unrelated to transport/session integration.
- SSE agent-output stream (`/api/v1/agent-output/stream`, #600) and Observe/Drive
  controller-lease adoption are separate deferred workstreams.
