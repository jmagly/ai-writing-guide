# Cockpit Architecture

Three tiers: **shells** (browser, VS Code webview, Tauri desktop) in front of a
**Bridge** (local token-gated control plane) in front of the
**agentic-sandbox executor** (the runtime substrate).

```text
operator / CLI:  aiwg cockpit
       │  spawns the Bridge; writes OS-keychain token +
       │  ~/.aiwg/cockpit/runtime/bridge.json (0600)
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Bridge (127.0.0.1:8140, token-gated /api)                     │
│  · control plane: inventory, lifecycle, running, missions,    │
│    approvals, cost, sessions (create + attach_url),           │
│    contributions, artifact index                              │
│  · read-only catalog: aiwg discover / show (display only)     │
│  · user asset library: clone/import/delete (never writes      │
│    AIWG install files)                                        │
│  · audit log: ~/.aiwg/cockpit/audit/events.jsonl (redacted)   │
│  · serves the built React app (token-injected)                │
└──────────────────────────────────────────────────────────────┘
       │ proxies / sources               ▲ loads /?token=…
       ▼                                 │
  agentic-sandbox executor        ┌──────┴──────┬───────────────┐
  (8120 gRPC / 8121 WS /          browser    VS Code webview  Tauri window
   8122 HTTP)                     (apps/cockpit/{web,vscode,desktop})
  · A2A v2 + pty-ws/v1
```

## Control plane vs data plane

- **Control plane** — lifecycle, approvals, session create/list, index,
  library, audit — goes through the gated Bridge (`/api/*`, Bearer token +
  CSRF; see [Trust & Security](./trust-and-security.md)).
- **Data plane** — the live pty byte stream — connects the browser to a
  Bridge-owned WebSocket endpoint. The browser proves the per-launch Cockpit
  token; the Bridge adds the protected executor identity and proxies the
  upstream upgrade. Its separate live-update channel to the UI is Server-Sent
  Events (`/api/events`, a `cockpit.refresh` event plus heartbeat).

The Bridge validates whatever the executor advertises (`attach_url` /
`pty_ws_url`, with `{host}` substitution and `http→ws` scheme mapping), stores
the allowed target in memory, and returns an opaque local proxy URL. The
upstream path segment remains the **instance id**, not the resolved agent name.

## Component map

All components live under `apps/cockpit/` — a private npm workspace root
(`@aiwg/cockpit`, CalVer in lockstep with base AIWG).

| Component | Role |
|---|---|
| `bridge/` | The control-plane server and static host. Single-file Node HTTP server (`createBridge()` factory + CLI entry), env-configured, no framework dependencies |
| `web/` | React 19 + Vite + TypeScript SPA — the 11 operator surfaces ([Surfaces](./surfaces.md)); xterm.js terminals |
| `shell-core/` | The cross-shell handshake contract: runtime-file reading, token resolution, OS-keychain backends |
| `vscode/` | VS Code extension (webview shell over the same Bridge) |
| `desktop/` | Tauri v2 native shell over the same Bridge |
| `mock-executor/` | Wire-faithful agentic-sandbox stand-in — **automated-test-only**, refused for human launches ([Development](./development.md#the-mock-boundary)) |
| `contrib/` | Declarative UI contributions (actions, screens, workflows) + JSON schema; actions inject commands into a session |
| `runtime-docs/` | Specification of the `~/.aiwg/cockpit/runtime/` handshake files |
| `poc/` | Standing risk-gate proofs (bridge kill-isolation, security checks) run in CI via `npm run poc` |
| `scripts/` | Dev launchers (`cockpit-dev.sh`, `cockpit-up.sh`) |

## Executor discovery and admin surfaces

The Bridge resolves the executor from `AIWG_COCKPIT_EXECUTOR_URL` (alias
`EXECUTOR_URL`), defaulting to `http://127.0.0.1:8122`. Liveness is probed at
`/healthz/http` → `/healthz` → `/health`; deep capabilities (e.g.
`host_runtime_enabled`) at `/healthz/deep` first.

Upstream calls use candidate lists so the Bridge tolerates executor-version
skew: inventory tries `/admin/instances` then `/api/v2/admin/instances`;
start/stop try legacy-then-v2; destroy and reconnect prefer the v2 admin
surface. Running work and approvals are **not** admin projections at all —
they are derived from per-instance A2A task lists (`/agents/{id}/tasks`),
which is why they work against any conformant executor. Cost currently rides
the legacy `/admin/cost` route.

Field normalization covers snake_case and camelCase payloads; unknown fields
degrade to opaque posture rather than a broken screen.

## Ports

The agentic-sandbox canonical dev runner binds **8120** (gRPC), **8121**
(pty-ws), **8122** (HTTP). The Bridge therefore defaults to **8140**, off that
range, and **refuses to start on a reserved executor port** rather than
silently squatting on one. Override with `PORT` or
`AIWG_COCKPIT_BRIDGE_PORT`.

## Relationship to `aiwg serve`

They are different servers with different jobs:

| | `aiwg serve` (:7337) | Cockpit Bridge (:8140) |
|---|---|---|
| Role | Serve API + sandbox registry substrate | Merged operator console |
| UI | `apps/web` retained as a compatibility bundle | `apps/cockpit/web`, served by the Bridge itself |
| Consumers | Programmatic + legacy dashboard | Operators (browser / VS Code / desktop) |

New operator-console work happens in Cockpit. The Bridge shells out to the
repo-local AIWG CLI for read-only catalog data (`aiwg discover` / `aiwg show`)
and enriches inventory from the executor's agent registry when admin surfaces
are absent. See the [serve guide](../serve-guide.md) for the substrate.

## See also

- [Bridge API](./bridge-api.md) — the full endpoint and configuration reference
- [Development](./development.md) — bring-up scripts, mock boundary, e2e
