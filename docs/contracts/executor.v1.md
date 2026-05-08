# Executor Contract — `executor.aiwg.io/v1`

**Spec version**: `1.0.0`
**Status**: ACCEPTED (ADR accepted 2026-05-08; see `.aiwg/architecture/adr-executor-contract.md`)
**Last updated**: 2026-05-08

This is the implementer-facing specification for AIWG executors. The architectural rationale lives in `.aiwg/architecture/adr-executor-contract.md`. The JSON Schema for register payloads and event types lives at `schemas/executor-v1.json`.

## What an executor is

An **executor** is any process that conforms to this spec and accepts mission objectives over a stable wire protocol. Executors come in three reference shapes:

| Shape | Example | Isolation |
|---|---|---|
| **Sandbox executor** | `agentic-sandbox` mgmt server | KVM VM or rootless container per agent |
| **Local executor** | extended `tools/ralph-external/daemon-supervisor.mjs` | Host process (no isolation) |
| **Custom executor** | bring-your-own | whatever you want |

`aiwg serve` discovers executors via the registration handshake below and routes missions to them via the dispatch surface. An executor that conforms to this spec is a drop-in replacement for any other.

## Conformance levels

| Level | What's required |
|---|---|
| **Core** | Register, accept dispatch, emit lifecycle events, deregister cleanly |
| **HITL** | Core + emit `mission.hitl_required` events and accept HITL responses |
| **Resumable** | Core + persist mission state across executor restarts and reconcile on reconnect |

An executor declares its level via `capabilities` in the register payload. The conformance test suite (Tier-2 of `.aiwg/testing/test-strategy-daemon-serve-sandbox.md`) exercises each level against recorded fixtures.

## Wire protocol

### Required transport

- **HTTP REST** — `POST/GET/DELETE` for register, dispatch, status, deregister
- **WebSocket** — for the executor → aiwg serve event stream

A conforming executor MUST expose REST and WS. It MAY additionally expose gRPC, JSON-over-stdio, or file-watch surfaces; those are operator concerns and not gated by conformance.

### Versioning

- URLs are pinned: `POST /api/v1/executors/register`, `POST /api/v1/sessions/:id/dispatch`
- Register payload includes `spec_version: "1.0.0"`
- SemVer rules: minor bumps add backward-compatible fields; major bumps may break. `aiwg serve` refuses unknown major versions and emits a warning for unsupported minors.

## Lifecycle

### Mission state machine

```
queued ─► assigned ─► running ─► (paused | hitl-required | suspended)* ─► done | failed | aborted
```

| State | Meaning |
|---|---|
| `queued` | dispatcher has accepted the mission; no executor assigned yet |
| `assigned` | an executor has accepted ownership but not yet begun work |
| `running` | executor is actively processing |
| `paused` | operator-initiated pause; can be resumed |
| `hitl-required` | blocked on human input; drives the dashboard HITL drawer |
| `suspended` | mission is durably persisted but executor is offline; will resume on reconnect (only valid if executor advertises `resumable`) |
| `done` | terminal — completion criteria met |
| `failed` | terminal — non-recoverable failure |
| `aborted` | terminal — operator cancelled |

### Event vocabulary

| Event type | Direction | Required for |
|---|---|---|
| `executor.registered` | aiwg serve → operator | aiwg serve internal (after register handshake) |
| `executor.deregistered` | aiwg serve → operator | aiwg serve internal |
| `executor.resync` | executor → aiwg serve | Resumable (sent on every WS reconnect) |
| `mission.assigned` | executor → aiwg serve | Core |
| `mission.started` | executor → aiwg serve | Core |
| `mission.progress` | executor → aiwg serve | Core (any cadence) |
| `mission.hitl_required` | executor → aiwg serve | HITL |
| `mission.hitl_responded` | aiwg serve → executor | HITL (operator response payload) |
| `mission.paused` | executor → aiwg serve | Optional |
| `mission.resumed` | executor → aiwg serve | Optional (core for Resumable reconnect) |
| `mission.suspended` | executor → aiwg serve | Resumable |
| `mission.reconnected` | executor → aiwg serve | Resumable |
| `mission.completed` | executor → aiwg serve | Core |
| `mission.failed` | executor → aiwg serve | Core |
| `mission.aborted` | executor → aiwg serve | Core |

Event payloads use snake_case field names (matching the existing `SandboxEvent` shape from `agentic-sandbox`'s Rust serde). See `schemas/executor-v1.json` (`$defs/event_envelope` and per-event `$defs/data_*`) for complete shapes, required fields, and discriminated-union definitions.

## REST routes

### `POST /api/v1/executors/register`

Schema: `schemas/executor-v1.json#/$defs/register_payload` (request), `#/$defs/register_response` (response).

Called by the executor at boot. Body:

```json
{
  "executor_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "agentic-sandbox-local",
  "version": "0.1.0",
  "spec_version": "1.0.0",
  "transport_endpoints": {
    "rest": "http://192.168.1.10:8122",
    "ws":   "ws://192.168.1.10:8121"
  },
  "capabilities": [
    "isolation:vm",
    "runtime:claude-code",
    "platform:linux/x64",
    "resumable",
    "hitl"
  ]
}
```

Response (`201 Created`):

```json
{
  "executor_id": "550e8400-e29b-41d4-a716-446655440000",
  "token": "exec_tk_8Hy3...",
  "registered_at": "2026-05-08T19:30:00Z"
}
```

Notes:
- `executor_id` is supplied by the executor and persisted across restarts. Re-registering with the same `executor_id` reclaims the prior identity (same identity store as `sandbox-registry` — `src/serve/sandbox-identity-store.ts`).
- `token` is opaque, returned once. Executor stores it locally and includes it on subsequent calls (`Authorization: Bearer <token>` for REST; `?token=<token>` query param for WS upgrade).
- Loopback bind is the default. LAN exposure is an explicit operator choice and triggers token rotation on first non-loopback register.

### `DELETE /api/v1/executors/:id`

No request body. Response: `204 No Content`. Executor SHOULD also call this on graceful shutdown.

### `GET /api/v1/executors`

Schema: `schemas/executor-v1.json#/$defs/executors_list_response`.

Lists registered executors with current status. Response includes `connected: bool`, `last_event_ts`, current mission count.

### `POST /api/v1/sessions/:id/dispatch`

Schema: `schemas/executor-v1.json#/$defs/dispatch_payload` (request), `#/$defs/dispatch_response` (202 response).

Called by `aiwg serve` (or any client posting through `aiwg serve`) to dispatch a mission. Body:

```json
{
  "mission_id": "m-abc123",
  "objective": "Add JWT validation to /auth/login...",
  "completion": "npm test exits 0; new endpoint returns 401 on invalid token",
  "long_running": false,
  "executor_filter": {
    "executor_id": null,
    "capabilities": ["runtime:claude-code"]
  },
  "metadata": {
    "issue": 1171,
    "session_id": "ws-2026-05-08"
  }
}
```

`aiwg serve` resolves the filter to a specific executor via the agent-router and forwards the mission. The dispatched mission appears in the executor's mission list; the executor emits `mission.assigned` immediately and `mission.started` when work begins.

If `long_running: true`, dispatch routes only to executors advertising `capabilities: ["resumable"]` (returns `503 no_resumable_executor_available` if none).

Response (`202 Accepted`):

```json
{
  "mission_id": "m-abc123",
  "executor_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "assigned",
  "estimated_start": "2026-05-08T19:30:05Z"
}
```

### `GET /api/v1/missions/:id`

Schema: `schemas/executor-v1.json#/$defs/mission_status_response`.

Mission status snapshot. Returns current state, last N events, executor identity, and PTY session reference if applicable.

### `POST /api/v1/missions/:id/hitl_response`

Schema: `schemas/executor-v1.json#/$defs/hitl_response_payload`.

Submit a human response to a `mission.hitl_required` event.

```json
{
  "hitl_id": "hitl-xyz",
  "response": "yes"
}
```

`aiwg serve` forwards as a `mission.hitl_responded` event over the WS to the owning executor.

### `POST /api/v1/missions/:id/pause`, `/resume`, `/abort`

No request body. Response: `202 Accepted`. Each operation emits the corresponding lifecycle event (`mission.paused`, `mission.resumed`, `mission.aborted`).

## WebSocket event stream

### Connection

```
ws://<aiwg-serve-host>/ws/executors/:executor_id?token=<token>
```

The executor MAY initiate the connection to push events, OR aiwg serve MAY initiate to send dispatches. Both directions carry events; both sides authenticate via the token issued at register time.

### Reconnection semantics

- Disconnects are routine. Both sides reconnect with exponential backoff (capped at 30s).
- On reconnect, the executor sends an `executor.resync` event (schema: `#/$defs/data_executor_resync`) with the list of mission IDs it currently owns. `aiwg serve` reconciles and may emit replays of any missed dispatches.
- For resumable executors with `mission.suspended` missions, on reconnect aiwg serve emits `mission.resumed` and the executor continues.
- Required for Resumable conformance; see fixtures at `test/conformance/executor-v1/fixtures/resumable-suspend-resume.json`.

### Event envelope

Schema: `schemas/executor-v1.json#/$defs/event_envelope`. The `event` field discriminates the `data` payload; each per-event data shape is at `#/$defs/data_<event_type>` (dots replaced with underscores, e.g. `#/$defs/data_mission_progress`).

```json
{
  "event": "mission.progress",
  "executor_id": "550e8400-...",
  "mission_id": "m-abc123",
  "ts": "2026-05-08T19:30:30.123Z",
  "data": {
    "phase": "implementation",
    "iteration": 3,
    "tokens_used": 42000,
    "summary": "Added validation; running tests now"
  }
}
```

`event` is one of the 15 event types in the vocabulary table above. `mission_id` is present on all `mission.*` events and omitted on `executor.*` events. `ts` is an RFC 3339 timestamp (UTC, sub-second precision permitted). `data` shape is per-event-type; see the JSON Schema `$defs/data_*` entries for required fields and allowed values.

## Auth and trust model

- **Token-on-register**: aiwg serve issues an opaque token bound to `executor_id`. Reusable across restarts of either side via the identity store.
- **Loopback default**: aiwg serve binds to `127.0.0.1:7337` by default. Operators bind to `0.0.0.0` explicitly when running cross-host.
- **Non-loopback hardening**: when an executor first registers from a non-loopback address, aiwg serve rotates its token and warns. This is fast-fail rather than silent compromise.
- **No mTLS in v1**. Reserved for v1.1 when cross-host production becomes a concrete need. The `security-engineering/skills/auth-factor-design` skill informs the upgrade.

The trust model is **deliberately weaker than internet-facing**: it assumes the operator controls the host (or the LAN, with appropriate care). For untrusted-network deployment, layer mTLS or VPN externally until v1.1 lands.

## Capabilities vocabulary

A registered capability string is `category:specifier`. Categories:

| Category | Example specifiers | Meaning |
|---|---|---|
| `isolation:` | `vm`, `container`, `host`, `microvm`, `none` | Isolation primitive used per-mission |
| `runtime:` | `claude-code`, `codex`, `cursor`, `aider`, `custom:<name>` | What agent runtime the executor supports |
| `platform:` | `linux/x64`, `linux/arm64`, `darwin/arm64`, `wsl/x64` | Host platform the executor runs on |
| `resumable` | (no specifier) | Executor persists mission state across restarts |
| `hitl` | (no specifier) | Executor supports `mission.hitl_required` flow |
| `multi-tenant` | (no specifier) | Executor isolates missions across users |

Custom capabilities are permitted under a `x-` prefix: `x-roko-mode`, `x-fortemi-tenant`. AIWG serve treats unknown capabilities as opaque labels and passes them through to filters.

## Reference implementations

| Implementation | Location | Conformance |
|---|---|---|
| **`agentic-sandbox` adapter** | `~/dev/agentic-sandbox/management/src/aiwg_serve.rs` (extended) | Core + HITL + Resumable; `isolation:vm`, `isolation:container` |
| **Local executor** | `tools/ralph-external/daemon-supervisor.mjs` (extended) | Core + HITL; `isolation:none`, no `resumable` in v1 |

## Conformance suite

Located at `test/conformance/executor-v1/`. Vitest-based, exercises any executor that:

1. Listens on a configurable REST + WS endpoint
2. Implements the routes and events for its declared conformance level

Test categories:

| Category | What it asserts |
|---|---|
| `register/` | Register handshake, token issuance, identity persistence |
| `dispatch/` | Dispatch acceptance, executor selection, filter resolution |
| `lifecycle/` | State transitions: queued→assigned→running→done/failed/aborted |
| `hitl/` | Required for HITL conformance; HITL emit + response round-trip |
| `resumable/` | Required for Resumable conformance; suspend → reconnect → resume |
| `events/` | Event envelope shape, snake_case field names, timestamp ordering |
| `auth/` | Token enforcement, loopback default, non-loopback rotation |

Conformance is run via `npm run test:conformance -- --executor <id>`. The recorder + fixture pattern from the parent test strategy applies: an executor under test can be exercised live (against a real backend) or replayed against captured fixtures.

## Compatibility notes

- **MC queue file** (`.aiwg/ralph-external/mc/sessions/<id>/session.json`) is **not** part of this spec. It is AIWG's plumbing format for local mission queueing and will continue to evolve independently. Executors do not read this file directly.
- **Sandbox-registry** (`POST /api/v1/sandboxes/register`) coexists with executor-registry. A conforming sandbox executor MAY register via both routes during transition; v1.x deprecates the sandbox-only path once all production users have migrated.
- **`agent-router`** continues to operate at the agent-inventory level (an agent inside a VM). Mission routing operates at the executor level. They share auth and identity-store machinery but operate on different shapes.

## Open questions for v1.x

These are intentionally deferred from v1.0. Track in the executor-contract issue thread.

| Question | Likely v1.x landing |
|---|---|
| mTLS for cross-host | v1.1 |
| Multi-tenant isolation guarantees | v1.2 |
| Mission priority and preemption | v1.1 |
| Cost / token budget contract | v1.1 |
| Cross-executor handoff (mission migrates between executors) | v1.2 |
| Executor self-update / live capability changes | v1.2 |

## References

- `.aiwg/architecture/adr-executor-contract.md` — the architectural rationale and decisions
- `schemas/executor-v1.json` — JSON Schema for register payloads, event envelopes, and dispatch bodies
- `.aiwg/testing/test-strategy-daemon-serve-sandbox.md` — parent test strategy; gets a conformance section
- `src/serve/sandbox-registry.ts`, `src/serve/sandbox-identity-store.ts` — existing patterns this spec mirrors
- `~/dev/agentic-sandbox/management/src/aiwg_serve.rs` — current sandbox→aiwg serve bridge
- `~/dev/agentic-sandbox/management/src/dispatch/dispatcher.rs` — sandbox internal dispatcher
- `tools/ralph-external/daemon-supervisor.mjs` — local executor base
- `setup.aiwg.io/v1` — sibling AIWG spec; demonstrates the same opt-in versioned-contract pattern
