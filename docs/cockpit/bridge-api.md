# Cockpit Bridge API Reference

The Bridge is a single loopback HTTP server (default `127.0.0.1:8140`). This
page documents its surface as implemented. All `/api/*` routes pass four gates
before dispatch; see [Trust & Security](./trust-and-security.md) for the
model.

| Gate | Failure |
|---|---|
| Loopback, same-port browser origin | 403 `forbidden_origin` |
| Bearer token (`Authorization: Bearer …` or `?token=`), constant-time compare | 401 `unauthorized` |
| CSRF header `x-cockpit-csrf` = token, for mutating verbs with an Origin | 403 `csrf_required` |
| Real-executor assertion (mock refused unless explicitly allowed) | 502 `mock_executor_refused` |

`GET /healthz` is the one unauthenticated route (shell liveness probe).
Unhandled upstream failures return 502 `bridge_upstream_error`. Protected
executor failures preserve 401 `executor_unauthenticated` and 403
`executor_forbidden` instead of degrading to an empty inventory.

## Endpoints

### Health

| Method & path | Purpose |
|---|---|
| `GET /healthz` | Unauthenticated liveness (`{status:'ok'}`) |
| `GET /api/health` | Bridge health + config echo (`executor_url`, `mock_executor_allowed`, boolean `executor_auth_configured`) |
| `GET /api/executor/capabilities` | Deep-probe the executor (`host_runtime_enabled`, raw status; `unreachable` on failure) |

### Events & telemetry

| Method & path | Purpose |
|---|---|
| `GET /api/events` | **Server-Sent Events** stream — `cockpit.refresh` on connect, heartbeat every 5s. |
| `GET /api/events/snapshot` | Unified event model v1 — typed events aggregated from inventory, running, approvals, missions, sessions |
| `GET /api/running` | Running board, derived from per-instance A2A task lists (not an executor admin route) |
| `GET /api/missions` | Mission Control projection — merges durable `aiwg mc` disk state with the live executor task session |

### Inventory & instances

| Method & path | Purpose |
|---|---|
| `GET /api/inventory` | Normalized instance inventory (runtime/transport/daemon posture per instance); agent-registry fallback; degraded envelope instead of hard failure |
| `GET /api/loadouts` | Loadout catalog passthrough |
| `POST /api/instances` | Launch a runtime target via the executor's v2 admin API. `runtime:'qemu'` requires a resolvable SSH public key (400 `ssh_public_key_required` / `ssh_public_key_not_found`) |
| `GET /api/operations/:id` | Poll an async provisioning operation |
| `POST /api/instances/:id/start` · `/stop` | Lifecycle |
| `POST /api/instances/:id/reconnect` | Stale-agent recovery — full semantics in [Recovery](./recovery.md) |
| `DELETE /api/instances/:id` | Destroy, with Docker-CLI reconciliation and already-gone synthesis ([Recovery](./recovery.md#destroy)) |
| `POST /api/tasks/:instanceId/:taskId/cancel` | Cancel an A2A task |

### Sessions

| Method & path | Purpose |
|---|---|
| `GET /api/sessions?instance=` | List sessions; each row carries a Bridge-owned `attach_url`. The Bridge authenticates the upstream PTY upgrade without exposing the executor bearer to the browser. |
| `POST /api/instances/:id/sessions` | Create a session (`mode`, `backend`, `loadout` query params). Recovers an in-flight create by name on timeout; 409 `agent_not_registered` when no agent |
| `DELETE /api/instances/:id/sessions/:sessionId` | End a session |
| `GET /api/instances/:id/sessions/:sessionId/screen` | Screen snapshot (404 `session_screen_unavailable` when the backend has no screen) |

### Approvals

| Method & path | Purpose |
|---|---|
| `GET /api/approvals?status=` | HITL inbox derived from A2A `input-required` / `hitl-prompt/v1` tasks (default `pending`) |
| `POST /api/approvals/:id?decision=approve\|deny` | Decide; `:id` is `instanceId::taskId`; posted via the A2A respond surface |

### Cost

| `GET /api/cost` | Spend passthrough (executor `/admin/cost`) |
|---|---|

### Catalog, index, contributions

These shell out to the AIWG CLI (read-only):

| Method & path | Purpose |
|---|---|
| `GET /api/capabilities?q=&limit=&type=` | `aiwg discover` (limit 1–50; type `all\|skill\|agent\|command\|rule\|flow`) |
| `GET /api/show?path=` or `?type=&name=` | Artifact body; path access is corpus-sandboxed (400 `path_outside_corpus`), name resolution can 409 `ambiguous_artifact` |
| `GET /api/contributions` | Validated declarative UI contribution manifests |
| `GET /api/index/status` · `GET /api/index/query?...` · `POST /api/index/rebuild` | Artifact-index operations (`aiwg index`) |

### Library

| Method & path | Purpose |
|---|---|
| `GET /api/library` | List operator-owned assets under `~/.aiwg/cockpit/library` |
| `POST /api/library/clone?type=&name=&path=` | Clone a catalog asset into the library (201; refuses existing destinations) |
| `DELETE /api/library/:name` | Remove (path-sandboxed; 404 `not_in_library`) |

The library invariant: catalog reads are read-only and **AIWG install files
are never written** — the library holds copies the operator owns.

### Audit

| Method & path | Purpose |
|---|---|
| `GET /api/audit?limit=` | Tail of the redacted audit log (1–200, default 50) |
| `POST /api/audit/intent` | Record an operator intent event (the web UI logs `action.inject.requested` through this) |

### Static

`/` serves the built web app with the per-launch token injected
(`window.__COCKPIT_TOKEN__`) and a `SameSite=Strict` CSRF cookie; other paths
serve hashed, immutable-cached assets from the web build, path-sandboxed. A
legacy fallback page renders when no web build is present.

## Environment variables

The Bridge is configured entirely by environment (no CLI flags):

| Variable | Default | Effect |
|---|---|---|
| `AIWG_COCKPIT_EXECUTOR_URL` (alias `EXECUTOR_URL`) | `http://127.0.0.1:8122` | Upstream executor |
| `AIWG_COCKPIT_EXECUTOR_TOKEN_FILE` | — | Mode-600 file containing one executor bearer token. The Bridge reloads it per upstream request and keeps it out of browser state, URLs, logs, and audit records. |
| `PORT` / `AIWG_COCKPIT_BRIDGE_PORT` | `8140` | Listen port; **refuses** the executor-reserved 8120–8122 |
| `AIWG_COCKPIT_AUTOSTART_EXECUTOR` | on | `0` disables best-effort executor autostart |
| `AIWG_COCKPIT_EXECUTOR_COMMAND` | — | Pin the autostart command (otherwise an installed `agentic-mgmt` is tried) |
| `AIWG_COCKPIT_ALLOW_MOCK_EXECUTOR` | off | `1` permits the automated-test mock ([Development](./development.md#the-mock-boundary)) |
| `AIWG_COCKPIT_AUDIT_DIR` | `~/.aiwg/cockpit/audit` | Audit log location |
| `AIWG_COCKPIT_CONTRIB` | — | Additional contribution-manifest directory, layered after first-party |
| `AIWG_COCKPIT_AGENT_CACHE_TTL_MS` | `5000` | Agent-list cache TTL |
| `AIWG_ROOT` | — | Extra corpus root for `/api/show` path resolution |
| `AIWG_COCKPIT_KEYCHAIN_STRICT` | off | `1`: never persist a plaintext token when a keychain ref exists; fail launch if the keychain fails |
| `AIWG_COCKPIT_REQUIRE_KEYCHAIN` | off | `1`: fail launch if the keychain store fails |
| `AIWG_COCKPIT_KEYCHAIN_DISABLED` | off | `1`: skip OS keychain entirely |
| `AIWG_COCKPIT_ENABLE_KWALLET` / `AIWG_COCKPIT_KWALLET` | off / `kdewallet` | Opt-in KWallet backend and wallet name |

Dev-launcher variables (`AIWG_COCKPIT_ENSURE_EXECUTOR`,
`AIWG_COCKPIT_START_HOST_DAEMON`, e2e/UAT knobs) are covered in
[Development](./development.md).

## Audit events

Written as redacted JSONL to `~/.aiwg/cockpit/audit/events.jsonl` (file 600,
dir 700). Secret-looking keys and values (tokens, API keys, bearer strings)
are redacted before write. Events:

`instance.launch.requested` / `instance.launch.result` ·
`instance.lifecycle.requested` (start/stop) · `instance.reconnect.requested` ·
`instance.destroy.requested` · `task.cancel.requested` ·
`session.start.requested` · `approval.response.submitted` ·
`index.rebuild.requested` / `index.rebuild.completed` · operator intents via
`/api/audit/intent` (the web UI records `action.inject.requested` for every
action injection).

## Executor compatibility

Upstream calls use candidate-list fallbacks to tolerate executor version skew
(legacy `/admin/*` and v2 `/api/v2/admin/*` surfaces both probed; see
[Architecture](./architecture.md#executor-discovery-and-admin-surfaces)).
Snake_case and camelCase payloads are both normalized; unknown fields render
as opaque posture rather than errors.

When `AIWG_COCKPIT_EXECUTOR_TOKEN_FILE` is set, every REST/A2A request uses the
same centralized authenticated fetch path. PTY `attach_url` values are replaced
with an opaque Bridge route. The browser proves possession of the per-launch
Cockpit token through a private WebSocket subprotocol; the Bridge strips that
subprotocol, adds the executor `Authorization` header to the upstream upgrade,
and forwards only the public `pty-ws.v1` protocol. Group/world-accessible token
files fail closed. Replacing the file rotates the upstream identity without a
Bridge restart.
