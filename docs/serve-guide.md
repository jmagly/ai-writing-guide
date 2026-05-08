# aiwg serve — Operator Dashboard

`aiwg serve` starts a local HTTP server that provides a web dashboard for managing agentic sandbox instances, terminal sessions, and human-in-the-loop (HITL) interactions.

## Quick Start

```bash
# Install optional dependencies (first time only)
npm install hono @hono/node-server

# Start the server
aiwg serve

# Start on a custom port
aiwg serve --port 8080

# Start without auto-opening browser
aiwg serve --no-open

# Start in read-only mode (no PTY sessions)
aiwg serve --read-only
```

The dashboard opens at `http://127.0.0.1:7337` by default.

## CLI Options

| Flag | Default | Description |
|------|---------|-------------|
| `--port <n>` | `7337` | Port to listen on |
| `--bind <host>` | `127.0.0.1` | Network interface to bind |
| `--no-open` | (opens by default) | Skip auto-opening browser |
| `--read-only` | `false` | Disable PTY sessions and session creation |

## Web Dashboard

The dashboard is a React SPA with four tabs:

| Tab | Purpose |
|-----|---------|
| **Missions** | Dispatch, monitor, pause, resume, and abort Mission Control tasks |
| **Sandbox** | Manage registered agentic-sandbox instances — combined Instances panel with runtime badges, lifecycle controls, and a multi-pane terminal stack (#1146) |
| **Telemetry** | Token usage, gate pass/fail rates, iteration counts, scope progress |
| **Memory** | Agent memory inspection |

The standalone **Terminal** tab present in earlier builds was retired in #1146 phase 3. Terminal sessions now live inside the Sandbox tab as per-instance panes in a multi-pane stack — each VM, container, or agent attaches its own pane independently.

A persistent **HITL drawer** slides up from the bottom when any agent is blocked on human input. It polls for pending requests and lets operators respond or dismiss them without leaving the current tab.

### Sandbox tab — Instances panel (#1146)

The Sandbox tab is the single surface for managing every runtime the sandbox tracks. Layout:

- **Header dropdown** — sandbox selector (one entry per registered sandbox). Persists across reloads via `localStorage`.
- **Combined Instances list** — VMs (libvirt), containers (Docker), and orphan agents merged into a single list, sorted by name. Each row carries:
  - Status dot (running / ready / busy / stopped / crashed)
  - Runtime badge: `[VM]` (blue), `[CT]` (green), or `[AG]` (purple, for orphan agents)
  - Instance name + secondary line (loadout for VMs, image for containers)
  - State token (`running`, `stopped`, `paused`, ...)
  - Session-count badge `· N` when the sandbox has pushed a session inventory (#1151, depends on `agent.sessions` event from agentic-sandbox#192)
  - Runtime-aware lifecycle buttons (matrix below)
- **Multi-pane terminal stack** — sits above the agent grid; renders only once at least one pane is open. Click 📺 **Pane** on a row to attach. Multiple panes coexist; switching foreground does not disconnect.

#### Lifecycle button matrix

VMs and containers have different sandbox APIs, so the dashboard renders only the buttons whose endpoints actually exist. No phantom controls.

| Runtime / state | Buttons |
|---|---|
| **VM, running** | ⚡ Deploy *(only when no agent attached)* · ↻ Restart · ⏸ Stop · ⏻ Force off · ✕ Delete |
| **VM, stopped** | ▶ Start · 🗑 Delete |
| **Container, running** | ⏸ Stop · ✕ Delete |
| **Container, stopped** | ▶ Start · 🗑 Delete |
| **Agent (orphan)** | Stop *(or Start)* · ↻ Reprov · ✕ Destroy |

Disk-destroying operations (Force off, Delete) confirm via `window.confirm`.

#### 📺 Pane — explicit attach affordance

Each row has a 📺 **Pane** button that opens (or focuses) a terminal pane in the stack above. The button is always visible; it disables when no agent is attached, with a tooltip explaining the next step (e.g., *"Start the VM and click ⚡ Deploy first"* for a stopped VM).

This split replaces the earlier click-row-to-attach behavior, which conflated two separate actions:

- **Row click** — toggles selection / agent-grid filter only.
- **📺 Pane button** — opens a pane.

#### Pane controls

Every open pane carries:

- **Live status bar** — connection dot, status text, optional CPU% / MEM / DSK chips driven by `agent.latestMetrics` from the existing 3 s sandbox poll
- **⟳ Resync** — drops the cached output buffer for the current session, hard-resets xterm, refits, re-attaches. Use when rendered state has drifted from tmux state (orphaned escape codes, partial replays). Mirrors `resyncPane` from agentic-sandbox#180.
- **↺ Reconnect** — re-lists sessions and re-attaches without resetting xterm. Use when the WS dropped briefly.
- **← Sessions** — back to the picker (visible only when attached)

#### Create Instance dialog (Runtime switch)

Click **+ New Instance** in the panel header. The **Runtime** dropdown at the top drives which fields render below:

- **VM** — Name + Loadout (preset or custom compose) + vCPUs / Memory / Disk + agentshare / autostart toggles. Submits `POST /api/v1/vms`.
- **Container** — Name + Image picker fed by `GET /api/v1/container-images`, with a "Custom…" free-text fallback. Submits `POST /api/v1/containers`. Mounts / env / network UI deliberately not exposed (matches the agentic-sandbox dashboard's #178 deviation).

#### Last-selected persistence

The active sandbox id and per-sandbox selected instance persist to `localStorage`:

| Key | Value |
|---|---|
| `aiwg:sandbox:lastSelectedSandbox` | sandbox id |
| `aiwg:sandbox:<id>:lastSelectedInstance` | instance name |

On reload the previous selection is restored if it still resolves; otherwise the reducer falls back to the first registered sandbox. Failure to read or write `localStorage` (private windows, etc.) is non-fatal.

#### Libvirt-degraded fallback

VMs and containers poll independently every 10 s. When `/api/v1/vms` returns a timeout or 408 (sandbox#187 — libvirt RPC sluggishness after long uptime), the agents + containers list keeps rendering and a yellow `⚠ libvirt degraded — VM list unavailable` banner appears at the top of the sidebar with a **Retry** button. No more empty list when one backend is sick.

#### REST agent-list fallback

The combined sidebar primarily binds rows against the event-driven sandbox registry. When a sandbox isn't pushing `agent.connected` events to this AIWG instance (operator-side `aiwg_serve.enabled` is false, registration race, etc.), the registry's agent list is empty and every Pane button stays disabled. To work around this, `InstancesList` polls `/api/sandboxes/:id/agents/full` every 10 s as a secondary source. Bound-agent lookup tries the registry first, then synthesizes a `SandboxAgent` from the REST `FullSandboxAgent` payload when the registry has nothing — so Pane lights up against the live agent inventory regardless of the event push.

#### Replay-on-attach negotiation (#1144)

When attaching a pane, AIWG sends a `join_session` message after `shell_started` so a late-attaching client sees the existing session history. Negotiation has three states:

- **`advertised`** — sandbox's WS banner explicitly lists `join_session` + `replay_buffer`
- **`probe`** — no banner present (or banner empty). AIWG sends `join_session` anyway and treats an `error` reply with `"unknown message"` / `"unsupported"` / `"session not found"` as the negative signal — demote to `unsupported`, fall back to live-only.
- **`unsupported`** — banner present but explicitly omits the bits we care about

Each attach logs the negotiated state to `aiwg serve` output:

```
[pty-bridge] sandbox WS … (agent=…): replay enabled (banner)
[pty-bridge] sandbox WS … (agent=…): replay enabled (opportunistic — no banner advertised)
[pty-bridge] sandbox declined join_session for agent=… : "…" — demoting to unsupported
```

Replay activates against today's sandboxes without waiting for `agentic-sandbox#190` to ship the server-hello banner.

## Sandbox Registration API

External systems (such as [agentic-sandbox](https://github.com/jmagly/agentic-sandbox)) register with `aiwg serve` to appear in the dashboard and relay events.

### Register a Sandbox

```
POST /api/sandboxes/register
Content-Type: application/json
```

**Request body:**

```json
{
  "name": "my-sandbox",
  "grpc_endpoint": "localhost:50051",
  "ws_endpoint": "ws://localhost:8080/ws",
  "http_endpoint": "http://localhost:8080",
  "capabilities": ["docker", "firecracker"],
  "version": "1.0.0"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Human-readable sandbox name |
| `grpc_endpoint` | Yes | gRPC address for the sandbox |
| `ws_endpoint` | Yes | WebSocket address for the sandbox |
| `http_endpoint` | Yes | HTTP address for the sandbox |
| `capabilities` | No | List of supported runtimes |
| `version` | No | Sandbox software version |

**Response (201):**

```json
{
  "sandbox_id": "sandbox-a1b2c3d4",
  "token": "550e8400-e29b-41d4-a716-446655440000"
}
```

The returned `token` is required for all subsequent authenticated operations (WebSocket connection, deregistration, agent lifecycle).

### Deregister a Sandbox

```
DELETE /api/sandboxes/{id}
Authorization: Bearer <token>
```

Returns `{ "ok": true }` on success. Returns `401` if the token does not match.

### Other Sandbox Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/sandboxes` | List all registered sandboxes |
| `GET` | `/api/sandboxes/:id` | Get a single sandbox summary |
| `GET` | `/api/sandboxes/:id/agents` | List agents for a sandbox |
| `GET` | `/api/agents` | List all agents across all sandboxes |
| `GET` | `/api/sandboxes/:id/loadouts` | Proxy: list available loadouts |
| `POST` | `/api/sandboxes/:id/provision` | Proxy: provision a new agent |
| `POST` | `/api/sandboxes/:id/agents/:aid/{action}` | Proxy: agent lifecycle (`start`, `stop`, `destroy`, `reprovision`) |
| `DELETE` | `/api/sandboxes/:id/agents/:aid` | Proxy: delete an agent |

Proxied endpoints forward requests to the sandbox's own HTTP API.

## WebSocket: Sandbox Event Push

After registration, the sandbox maintains a persistent WebSocket connection to push real-time events:

```
ws://127.0.0.1:7337/ws/sandbox/<sandbox_id>?token=<token>
```

The token (from the registration response) is passed as a query parameter. The server validates it on connection and on every message.

### Event Types

All events conform to the `SandboxEvent` schema:

```json
{
  "type": "agent.connected",
  "sandboxId": "sandbox-a1b2c3d4",
  "agentId": "agent-001",
  "timestamp": "2026-04-06T12:00:00Z",
  "loadout": "sdlc-full",
  "aiwgFrameworks": [
    { "name": "sdlc-complete", "providers": ["claude"] }
  ]
}
```

| Event Type | Description | Key Fields |
|------------|-------------|------------|
| `agent.connected` | Agent has connected to the sandbox | `loadout`, `aiwgFrameworks` |
| `agent.disconnected` | Agent connection lost | — |
| `agent.provisioning` | Agent environment is being set up | `loadout`, `step`, `progress` |
| `agent.ready` | Agent is ready to accept work | — |
| `session.start` | Agent has started a task session | `sessionId`, `task` |
| `session.end` | Agent task session completed | `sessionId` |
| `hitl.input_required` | Agent is blocked waiting for human input | `hitlId`, `prompt`, `context`, `expiresAt` |

### Agent State Machine

Events drive agent status transitions in the registry:

```
  connected ──► ready ──► busy (session.start)
                  ▲          │
                  └──────────┘ (session.end)
                  
  provisioning ──► ready (agent.ready)
  
  any ──► disconnected (agent.disconnected)
```

**Agent statuses:** `starting` | `provisioning` | `ready` | `busy` | `error` | `disconnected`

## WebSocket: PTY Bridge

Terminal sessions use a separate WebSocket endpoint:

```
ws://127.0.0.1:7337/ws/pty/<sessionId>?command=aiwg&args=mc,watch&cwd=/path
```

This bridges the browser's xterm.js terminal to a server-side PTY process. The server buffers up to 64KB of output for replay on reconnection. The client uses exponential backoff (500ms initial, 30s max) for automatic reconnection.

PTY sessions are disabled when `--read-only` is set.

## Human-in-the-Loop (HITL)

When an agent sends a `hitl.input_required` event, the flow is:

1. Sandbox pushes the event over the WebSocket connection
2. The registry stores a `HitlRequest` with `hitlId`, `prompt`, `context`, and `expiresAt`
3. The dashboard polls `GET /api/hitl` every 2 seconds
4. The HITL drawer appears with the agent's prompt
5. The operator types a response and submits via `POST /api/hitl/:id/respond`
6. The server proxies the response to the sandbox's `POST /api/v1/hitl/:id/respond`

Operators can also dismiss requests via `POST /api/hitl/:id/dismiss`.

## Integration with agentic-sandbox

To connect an agentic-sandbox instance to `aiwg serve`:

1. Start the dashboard:
   ```bash
   aiwg serve
   ```

2. Configure the sandbox to point at the dashboard:
   ```bash
   export AIWG_SERVE_ENDPOINT=http://127.0.0.1:7337
   ```

3. Start the sandbox — it will auto-register via `POST /api/sandboxes/register`

4. The sandbox appears in the dashboard's **Sandbox** tab with its agents and lifecycle controls.

## Security

`aiwg serve` is designed for **local operator use**:

- **Loopback binding** — defaults to `127.0.0.1`, not exposed to the network
- **Per-sandbox tokens** — each sandbox receives a unique UUID token at registration; all mutations and WebSocket connections require it
- **No global auth** — the loopback binding is the primary security boundary
- **Same-origin dashboard** — the React SPA is served from the same origin as the API, so no CORS configuration is needed

If you need to expose the server on a network interface (`--bind 0.0.0.0`), place it behind a reverse proxy with authentication.

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  aiwg serve                      │
│                                                  │
│  Hono HTTP Server (port 7337)                    │
│  ├── Static files ── React SPA (apps/web/dist/)  │
│  ├── /api/sandboxes/* ── Sandbox Registry        │
│  ├── /api/hitl/* ── HITL Relay                   │
│  ├── /api/sessions/* ── Session Management       │
│  ├── /ws/sandbox/:id ── Event Push (WebSocket)   │
│  └── /ws/pty/:id ── Terminal Bridge (WebSocket)  │
│                                                  │
│  SandboxRegistry ── agent inventory + events     │
│  PTYRegistry ── terminal session lifecycle       │
└──────────┬───────────────────────┬───────────────┘
           │                       │
     WebSocket push          HTTP proxy
           │                       │
┌──────────▼───────────────────────▼───────────────┐
│            agentic-sandbox instance               │
│  gRPC / HTTP / WebSocket endpoints                │
│  Agent provisioning, execution, lifecycle         │
└──────────────────────────────────────────────────┘
```

## Relationship to aiwg daemon

`aiwg serve` and `aiwg daemon` are separate systems:

| | `aiwg serve` | `aiwg daemon` |
|---|---|---|
| **Default port** | 7337 | 7474 |
| **Purpose** | Operator dashboard for sandbox fleet | Background task supervisor |
| **Manages** | Sandbox instances, agents, HITL | Task queue, scheduled jobs, watches |
| **Start command** | `aiwg serve` | `aiwg daemon start` |

They can run simultaneously and serve complementary roles.

## Building the Dashboard

The React dashboard must be built before `aiwg serve` can serve it:

```bash
cd apps/web
pnpm install
pnpm build
```

If the build output (`apps/web/dist/`) is missing, the server returns a 503 text response instead of the dashboard UI.

For development with hot reload:

```bash
cd apps/web
pnpm dev
```

The Vite dev server proxies `/api` and `/ws` to `http://localhost:7337`, so you need `aiwg serve` running alongside it.

## Troubleshooting

**"Cannot find module 'hono'"** — Install the optional dependencies:
```bash
npm install hono @hono/node-server
```

**Dashboard shows 503** — Build the web app first:
```bash
cd apps/web && pnpm build
```

**Sandbox not appearing** — Check that:
1. `AIWG_SERVE_ENDPOINT` points to the correct host and port
2. The sandbox successfully called `POST /api/sandboxes/register` (check sandbox logs)
3. The WebSocket connection was established (check browser DevTools network tab)

**HITL drawer not appearing** — Verify the sandbox is connected (green status in Sandbox tab) and the `hitl.input_required` event includes a valid `hitlId`.
