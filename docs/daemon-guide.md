# Daemon Mode Guide

AIWG daemon mode runs a persistent background process that monitors your project, executes automated tasks, supervises AI agent sessions, and coordinates multi-agent orchestration. It extends the agent loop pattern into always-on autonomous project supervision — from a local background helper to a distributed orchestration node managing sandbox sessions.

## Overview

The daemon provides:

- **File watching** — Trigger actions when project files change
- **Scheduled tasks** — Cron-like scheduling for health checks and audits
- **Agent supervision** — Spawn and manage AI agent subprocesses with governance
- **PTY orchestration** — AI-driven terminal supervision: read screen, assess state, inject input autonomously
- **Multi-session management** — Supervise multiple concurrent agent sessions per daemon
- **Operator override** — Human-in-the-loop handoff: pause the AI, take manual control, resume
- **Task queue** — Persistent task management with priority support
- **Automation rules** — Event-driven trigger→condition→action workflows
- **IPC communication** — CLI↔daemon communication via Unix domain socket
- **Messaging integration** — Slack, Discord, and Telegram notifications and commands
- **2-way AI chat** — Ask questions from messaging platforms
- **Headless operation** — Runs inside agentic-sandbox containers without a display server

## Platform Support

The daemon runs on any CLI-based platform. Platforms are grouped into three tiers:

| Tier | Meaning | Platforms |
|------|---------|-----------|
| **Tier 1 — Native** | Full headless daemon support. `aiwg daemon start/stop/status` work out of the box. Platform has a headless CLI that can be supervised by the daemon's PTY orchestrator. | Claude Code, OpenCode, Warp Terminal, OpenClaw, Codex, Factory AI |
| **Tier 2 — PTY Adapter** | Platform has a TUI that can be bridged over a PTY. Not headless natively, but operable remotely via `aiwg daemon pty`. | Claude Code (secondary), Codex (secondary) |
| **Tier 3 — IDE-hosted** | Runs as an extension inside a desktop IDE process that requires a display server. No standalone CLI process to bridge or supervise. Can *connect to* a daemon over HTTP/WS but cannot *host* one. | Cursor, Windsurf, GitHub Copilot |

Tier 1 platforms receive the full daemon feature set: file watching, cron scheduling, agent supervision, PTY orchestration, IPC, automation rules, and behaviors. Factory AI's `droid exec` provides headless one-shot execution; the AIWG daemon wraps it with persistence, scheduling, and multi-session coordination. Tier 3 platforms still benefit from AIWG's agent loop, Mission Control, and scheduling via AIWG emulation — they connect to a daemon running elsewhere rather than hosting one locally.

See `agentic/code/providers/capability-matrix.yaml` for the authoritative `daemon_tier` field per provider.

### PTY Adapter (Tier 2)

The PTY adapter spawns a Tier 1 platform's TUI process under a pseudo-terminal and relays I/O bidirectionally through the AIWG chat channel. This enables remote operation of interactive TUI tools (e.g. `opencode`, `codex`) from messaging platforms, shell scripts, or agentic LLMs — without requiring a local terminal session.

```bash
# Start an OpenCode TUI session bridged over PTY
aiwg daemon pty start opencode

# Start Codex with a wider terminal
aiwg daemon pty start codex --cols 120 --rows 40

# List active PTY sessions
aiwg daemon pty list

# Stop a session
aiwg daemon pty stop <session-id>
```

The PTY adapter requires `node-pty` (native module) for local mode:

```bash
npm install node-pty   # requires node-gyp + C++ build tools
```

Input from the chat channel is forwarded as keystrokes/stdin to the TUI. Output (screen state, ANSI sequences) flows back out. Both human-in-the-loop (typing in chat) and agentic driving (LLM or script sends input programmatically) are supported. Sessions persist across detaches — reconnect with `aiwg daemon pty list` to find the session ID.

### Execution Modes

The PTY adapter supports three execution modes, selected automatically based on configuration:

| Mode | Transport | Config | When to Use |
|------|-----------|--------|-------------|
| **Local** | `node-pty` on host | Default (no config) | Dev machine, `node-pty` available |
| **Container** | HTTP → sandbox → Docker | `AIWG_SANDBOX_ENDPOINT` | Isolated sandbox, fast spin-up |
| **VM** | HTTP → sandbox → QEMU | `AIWG_SANDBOX_ENDPOINT` | Full isolation, untrusted workloads |

#### Local mode (default)

Spawns the TUI process directly on the host via `node-pty`. Requires native compilation.

#### Sandbox mode (container/VM)

Delegates to an [agentic-sandbox](https://github.com/jmagly/agentic-sandbox) management server. The sandbox handles provisioning and PTY allocation inside containers or VMs.

```bash
# Set the sandbox endpoint to enable remote execution
export AIWG_SANDBOX_ENDPOINT=http://sandbox.local:8122
export AIWG_SANDBOX_AGENT_ID=agent-01   # optional, defaults to agent-01

# PTY commands work identically — transport is transparent
aiwg daemon pty start opencode
aiwg daemon pty list
aiwg daemon pty stop <session-id>
```

Or use the programmatic API:

```javascript
import { PTYAdapter } from './tools/daemon/pty-adapter.mjs';

// Auto-select: uses sandbox if AIWG_SANDBOX_ENDPOINT is set, else local
const adapter = PTYAdapter.auto({ platform: 'opencode', cols: 120, rows: 30 });

// Or explicitly use sandbox transport
const adapter = PTYAdapter.fromSandbox({
  httpEndpoint: 'http://sandbox.local:8122',
  agentId: 'agent-01',
  platform: 'opencode',
});

await adapter.start();
adapter.on('data', (chunk) => process.stdout.write(chunk));
```

The sandbox transport uses the management server's REST API (`:8122`) to submit tasks and poll for output. The browser terminal viewer connects directly to the sandbox WebSocket (`:8121`) for real-time PTY streaming with full ANSI color support.

---

## PTY Orchestrator

The PTY Orchestrator is an AI supervisor that attaches to a live PTY session and operates it the way a human operator would: reading the screen, understanding the current state, and injecting input at the right moments. This elevates the daemon from a process manager to an autonomous agent driver.

### Architecture

```
┌─────────────────────────────────────────────────────┐
│  PTY Orchestrator                                   │
│                                                     │
│  ┌──────────┐    ┌───────────────┐    ┌──────────┐  │
│  │ Screen   │───▶│ OrchestratorPTY│───▶│ Session  │  │
│  │ Reader   │    │ (assess loop) │    │ Adapter  │  │
│  └──────────┘    └───────────────┘    └──────────┘  │
│       ▲               │    ▲               │        │
│       │               ▼    │               ▼        │
│   PTY stdout     LLM Assessor    PTY stdin/signals  │
│                                                     │
│  ┌──────────────────┐                               │
│  │ Override Manager  │◄── Operator HITL handoff      │
│  └──────────────────┘                               │
└─────────────────────────────────────────────────────┘
```

**Components** (all in `src/serve/`):

| Component | File | Purpose |
|-----------|------|---------|
| **ScreenReader** | `screen-reader.ts` | Parses raw PTY byte stream into structured `ScreenState` using `@xterm/headless`. Extracts visible text grid, cursor position, scrollback, and detects prompts. |
| **OrchestratorPTY** | `orchestrator-pty.ts` | Runs a continuous read→assess→act loop. Calls an LLM assessor each cycle to decide: `type` (inject text), `wait` (observe), `signal` (SIGINT etc.), or `complete` (mission done). |
| **Orchestrator Adapter** | `orchestrator-adapter.ts` | Wires ScreenReader + OrchestratorPTY to live PTY sessions from the WebSocket bridge. Supports attach, detach, and re-attach without killing the PTY. |
| **Override Manager** | `orchestrator-override.ts` | Enables operator HITL handoff: pause the orchestrator, let a human interact directly, then resume. Maintains an audit trail of override events. |

### Assess Loop

Each cycle of the orchestrator follows this pattern:

```
READ screen state (via ScreenReader.awaitChange)
  → ASSESS: LLM evaluates screen + mission context + recent history
  → PLAN: LLM returns a decision as structured JSON
  → ACT: inject keystrokes, wait, send signal, or signal completion
  → REPEAT (until complete or max cycles reached)
```

The LLM assessment prompt includes:
- Current screen summary (ANSI-stripped, human-readable)
- Whether a prompt was detected and its text
- The mission brief (what the orchestrator is trying to accomplish)
- The last 10 actions taken (to avoid loops)

Decisions are one of:

| Action | Effect | When |
|--------|--------|------|
| `type` | Writes text + newline to PTY stdin | Prompt detected, agent needs input |
| `wait` | No-op, observes next screen change | Agent is running, making progress |
| `signal` | Sends SIGINT/SIGTERM to PTY | Agent is stuck, needs interruption |
| `complete` | Exits the loop | Mission accomplished |

### Screen State Parsing

The `ScreenReader` uses `@xterm/headless` (a headless xterm.js terminal) as its VT100/ANSI state machine. This means all escape sequences — colors, cursor movement, line wrapping, clear screen — are handled correctly without a DOM.

The parsed `ScreenState` exposes:

```typescript
interface ScreenState {
  text: string[][]          // visible text grid (rows × cols)
  cursor: { row, col }     // cursor position
  scrollback: string[]      // lines scrolled past viewport
  summary: string           // human/LLM-readable text
  prompt_detected: boolean  // terminal waiting for input?
  prompt_text?: string      // the detected prompt line
}
```

**Prompt detection** checks the cursor row and last non-empty line against patterns:
- Shell prompts: `$`, `#`, `>`, `%` at end of line
- Interactive prompts: `?` prefix (inquirer-style), `[y/N]`, `(yes/no)`
- Claude Code prompts: `>` prefix at cursor position

### Operator Override (HITL Handoff)

A human operator can take manual control of an orchestrator-supervised session at any time:

```
Orchestrator running
  → operator triggers override
  → OrchestratorPTY.pause() — finishes current cycle, then halts
  → PTY stdin routes to operator input
  → Operator interacts directly with the terminal
  → Operator triggers release
  → OrchestratorPTY.resume() — reads current screen, continues loop
```

Override events are recorded with timestamps for audit. Multiple override/release cycles are supported without state corruption. If the orchestrator has already completed, override is a no-op.

### Mission Control Integration

PTY-orchestrated missions can be dispatched via Mission Control:

```bash
aiwg mc dispatch <session-id> \
  "Supervise agent-01: complete the database migration" \
  --mode pty-orchestrator \
  --target-agent agent-01 \
  --completion "migration complete and tests green"
```

MC treats this as a standard mission, but the executor is `OrchestratorPTY` instead of a direct task runner. Status displays show PTY missions distinctly:

```
  #    Mission                          Mode   Status       Loop     Started
  ────────────────────────────────────────────────────────────────────────
  1    Fix authentication bug           —      ✓ DONE       3/10     14:30
  2    Supervise agent-01: migrate DB   PTY    ⏳ RUNNING   12/50    14:35
       └─ Last: type "npm run test"
```

### MC ↔ aiwg serve dispatch

`aiwg mc dispatch` enqueues missions to `.aiwg/ralph-external/mc/sessions/*/session.json`.
The old `aiwg mc bridge` queue tailer has been removed. For agentic-sandbox
work, use routable A2A instances and verify them through
`GET /api/v2/admin/instances`,
`GET /agents/{instance_id}/.well-known/agent-card.json` or
`GET /agents/{instance_id}/v1/extendedAgentCard`, and
`POST /agents/{instance_id}/v1/messages:send`.

Executor registration and A2A readiness are intentionally separate. The
executor `executor_id` is the management identity; the A2A `instance_id` is the
routable sandbox target. When they differ, dispatch with `a2a_instance_id` and
confirm it appears in the dispatch response.

There are two operating modes depending on what's running:

| Mode | Running | Outcome |
|------|---------|---------|
| **MC alone** | `aiwg mc dispatch` only | Missions queue to `session.json`; operator drives manually. |
| **A2A sandbox route** | Routable agentic-sandbox instance | Dispatch directly through A2A: `messages:send`, task status, and SSE subscribe. |

The A2A task lifecycle now lives on the sandbox route itself: submit with
`messages:send`, poll `tasks/{task_id}`, or subscribe to
`tasks/{task_id}/subscribe`.

---

## Daemon-in-Sandbox Deployment

The primary deployment model for autonomous agent supervision is a **daemon running inside an agentic-sandbox container**. Both the daemon and the sandbox can run fully headless — no display server, no local terminal session required.

### Architecture

```
┌─────────────────────────────────────────────┐
│  AIWG Service (operator interface)          │
│  aiwg serve — dashboard on port 7337        │
└──────────┬────────────────────┬─────────────┘
           │                    │
     ┌─────▼──────┐      ┌─────▼──────┐
     │  Daemon A   │      │  Daemon B   │
     │  (sandbox)  │      │  (sandbox)  │
     ├─────────────┤      ├─────────────┤
     │ Session 1   │      │ Session 3   │
     │ (PTY orch.) │      │ (PTY orch.) │
     ├─────────────┤      ├─────────────┤
     │ Session 2   │      │ Session 4   │
     │ (PTY orch.) │      │ (direct)    │
     └─────────────┘      └─────────────┘
           │                    │
     Mission Control coordinates across daemons
```

**The pattern:** Each daemon runs inside an agentic-sandbox (Docker container or Firecracker VM). Each daemon manages one or more PTY-orchestrated agent sessions. Multiple daemons coordinate through Mission Control. The AIWG service (`aiwg serve`) provides the operator dashboard for the fleet.

### Deployment Topology

| Layer | Component | Role |
|-------|-----------|------|
| **Operator** | `aiwg serve` | Web dashboard, sandbox registry, HITL relay |
| **Control plane** | AIWG daemon (1 per sandbox) | PTY orchestration, agent supervision, task queue |
| **Execution plane** | Agentic sandbox | Container/VM isolation, PTY allocation, process lifecycle |
| **Agent** | Claude Code / OpenCode / Codex | AI coding agent running inside the sandbox |

### How It Works

1. **Sandbox provisioning**: An agentic-sandbox instance starts with the AIWG daemon pre-installed. The daemon starts automatically and registers with the AIWG service.

2. **Session creation**: The operator (or Mission Control) dispatches a task. The daemon spawns an agent session inside the sandbox via the PTY bridge.

3. **PTY orchestration**: The daemon's OrchestratorPTY attaches to the agent's PTY session. The ScreenReader parses terminal output; the LLM assessor decides what to type; the session adapter injects input.

4. **Multi-session**: A single daemon can supervise multiple concurrent agent sessions (up to `max_concurrent` from the supervisor config).

5. **Multi-daemon coordination**: Mission Control dispatches work across daemons. Each daemon reports status back. The AIWG service aggregates the view.

6. **Operator intervention**: At any time, the operator can override a session via the HITL relay — the orchestrator pauses, the operator interacts directly, then the orchestrator resumes.

### Configuration

```json
{
  "supervisor": {
    "max_concurrent": 4,
    "default_mode": "pty-orchestrator"
  },
  "sandbox": {
    "auto_register": true,
    "service_endpoint": "http://aiwg-service:7337"
  }
}
```

Environment variables for sandbox deployment:

| Variable | Purpose |
|----------|---------|
| `AIWG_SANDBOX_ENDPOINT` | Sandbox management server URL |
| `AIWG_SERVE_ENDPOINT` | AIWG service URL for auto-registration |
| `AIWG_DAEMON_HEADLESS` | Set to `1` for headless operation (no TTY required) |

### Capability Levels

With the daemon-in-sandbox deployment, AIWG supports increasingly autonomous operation:

| Level | Capability | Requirements |
|-------|------------|-------------|
| **Level 1** | CLI tool — human drives, AI assists | AIWG CLI + any platform |
| **Level 2** | Agent loop — AI works, human reviews | External Ralph + agent supervisor |
| **Level 3** | PTY orchestration — AI drives terminal sessions | Daemon + ScreenReader + OrchestratorPTY |
| **Level 4** | Multi-session — one daemon supervises multiple agents | Daemon + concurrent PTY sessions |
| **Level 5** | Multi-daemon — fleet of daemons coordinated by MC | Multiple sandboxes + AIWG service + MC |

Level 3 and above require the daemon-in-sandbox deployment. Level 5 is the full distributed orchestration topology.

---

## Quick Start

### Start the daemon

```bash
aiwg daemon start
```

The daemon detaches from the terminal and runs in the background. State is stored in `.aiwg/daemon/`.

### Check status

```bash
aiwg daemon status
```

Output shows PID, uptime, active subsystems, and connected adapters.

### Submit a task

```bash
aiwg task submit "Fix the failing tests in auth module"
```

This queues a task for the agent supervisor, which spawns a `claude -p` process to execute it.

### Stop the daemon

```bash
aiwg daemon stop
```

Sends SIGTERM for graceful shutdown. Running tasks are given 15 seconds to complete.

## Configuration

Configuration is stored in `.aiwg/daemon.json`. Create this file in your project root:

```json
{
  "daemon": {
    "heartbeat_interval_seconds": 30,
    "max_parallel_actions": 3,
    "action_timeout_minutes": 120,
    "log": {
      "max_size_mb": 50,
      "max_files": 5
    }
  },
  "watch": {
    "enabled": true,
    "paths": ["src/", "test/", ".aiwg/"],
    "ignore": ["node_modules/", ".git/", "*.log"],
    "debounce_ms": 1000
  },
  "schedule": {
    "enabled": true,
    "jobs": [
      {
        "name": "health-check",
        "cron": "*/30 * * * *",
        "action": "health-check"
      },
      {
        "name": "daily-audit",
        "cron": "0 9 * * *",
        "action": "security-audit"
      }
    ]
  },
  "rules": [
    {
      "id": "auto-test-on-change",
      "trigger": {
        "type": "file_change",
        "pattern": "src/**/*.ts"
      },
      "condition": {
        "type": "debounce",
        "interval_ms": 5000
      },
      "action": {
        "type": "submit_task",
        "prompt": "Run tests for the changed files"
      }
    }
  ]
}
```

### Configuration Reference

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `daemon.heartbeat_interval_seconds` | number | 30 | Heartbeat write interval |
| `daemon.max_parallel_actions` | number | 3 | Maximum concurrent agent tasks |
| `daemon.action_timeout_minutes` | number | 120 | Task timeout before kill |
| `daemon.log.max_size_mb` | number | 50 | Log file rotation size |
| `daemon.log.max_files` | number | 5 | Number of rotated log files to keep |
| `watch.enabled` | boolean | false | Enable file system monitoring |
| `watch.paths` | string[] | — | Directories to watch |
| `watch.ignore` | string[] | — | Glob patterns to ignore |
| `watch.debounce_ms` | number | 1000 | Debounce interval for rapid changes |
| `schedule.enabled` | boolean | false | Enable cron scheduling |
| `schedule.jobs` | object[] | — | Cron job definitions |
| `rules` | object[] | — | Automation rules |

## Headend Architecture

The daemon acts as the headend supervisor for all External Agent Loop lifecycles. A `DaemonSupervisor` component wraps the existing `AgentSupervisor`, adding process governance without breaking backward compatibility.

### What DaemonSupervisor adds

| Capability | Description |
|------------|-------------|
| **Concurrency cap** | Hard limit on simultaneous agent sessions (`max_concurrent`, default 4). Additional submissions queue in priority order; queue overflow is rejected with a structured error. |
| **Bounded priority queue** | Queue depth cap (`max_queue_depth`, default 20) prevents unbounded memory growth under load. |
| **Process group kill** | Uses `process.kill(-pid, signal)` to terminate entire process trees. Plain PID kill leaves child shells and subprocesses as orphans. |
| **Restart intensity** | Tracks restart count per loop within a sliding time window (Erlang/OTP `max_restarts` pattern). Exceeded threshold marks the task permanently failed rather than entering an infinite restart loop. |
| **Circuit breaker** | Consecutive failures increment a global counter. At `failure_threshold`, the breaker opens and blocks new spawns for `cooldown_ms`. After cooldown, one probe attempt (half-open state) determines whether to close. |
| **Budget aggregation** | Rolls up token cost across all supervised loops. Emits a warning at 90% of the daily limit; blocks new spawns at 100%. Resets at midnight local time. |
| **Zombie reap** | Periodic sweep reconciles PID files against running processes. Stale entries are cleaned up automatically. |

### Relationship to AgentSupervisor

`DaemonSupervisor` is a wrapper, not a replacement. The existing `AgentSupervisor` in `tools/daemon/agent-supervisor.mjs` continues to handle subprocess spawning and the basic task queue. `DaemonSupervisor` sits above it and enforces governance policy. Consumers of `AgentSupervisor` directly are unaffected.

See `.aiwg/architecture/adr-daemon-as-headend.md` for the full architecture decision.

## Headend Configuration Reference

The supervisor configuration lives under the `supervisor` key in `.aiwg/daemon.json`:

```json
{
  "supervisor": {
    "max_concurrent": 4,
    "max_queue_depth": 20,
    "restart_intensity": {
      "max_restarts": 3,
      "window_seconds": 300
    },
    "circuit_breaker": {
      "failure_threshold": 5,
      "cooldown_ms": 120000
    },
    "daily_budget_usd": 50,
    "behaviors": ["ops-toolset"]
  },
  "interface": {
    "web": {
      "enabled": true,
      "port": 7474,
      "host": "127.0.0.1"
    }
  }
}
```

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `supervisor.max_concurrent` | number | 4 | Maximum simultaneous agent sessions |
| `supervisor.max_queue_depth` | number | 20 | Maximum queued submissions before rejection |
| `supervisor.restart_intensity.max_restarts` | number | 3 | Restarts allowed within the window before permanent failure |
| `supervisor.restart_intensity.window_seconds` | number | 300 | Sliding window for restart counting (seconds) |
| `supervisor.circuit_breaker.failure_threshold` | number | 5 | Consecutive failures that open the circuit |
| `supervisor.circuit_breaker.cooldown_ms` | number | 120000 | Time the circuit stays open before half-open probe (ms) |
| `supervisor.daily_budget_usd` | number | 0 | Daily spend cap across all loops. 0 = no cap. |
| `supervisor.behaviors` | string[] | `[]` | Behavior names to attach at initialization |
| `interface.web.enabled` | boolean | false | Enable the operator web UI |
| `interface.web.port` | number | 7474 | Web UI port |
| `interface.web.host` | string | `"127.0.0.1"` | Bind address (localhost by default) |

## Concierge

The **Concierge** is the front-facing interaction layer for the daemon — the first point of contact for users interacting with a live daemon session. It presents a consistently composed, professional interface regardless of what complexity is executing behind it.

Think of it as the reception desk: the guest (user) speaks to the concierge; the concierge routes, delegates, and translates without ever exposing the kitchen.

### Architecture

```
User input
    ↓
[ Concierge ]  ← session context, memory, tone rules
    ↓
[ Router ]  → skill / agent / flow / task
    ↓
[ Concierge ]  ← wraps and composes response
    ↓
User output
```

The concierge intercepts at both ends of each interaction — intake and output. On intake it identifies intent and routes silently. On output it translates raw technical results into composed, appropriately registered responses.

### Enabling the Concierge

Add to `.aiwg/daemon.json`:

```json
{
  "supervisor": {
    "behaviors": ["concierge"]
  },
  "behaviors": {
    "concierge": {
      "enabled": true,
      "memory": {
        "cross_session": true,
        "store": ".aiwg/daemon/concierge-memory.json"
      }
    }
  }
}
```

Or deploy via CLI:

```bash
aiwg add-behavior concierge
```

### Session Start

When the daemon session opens, the concierge reads persisted memory and greets with relevant context:

```
Welcome back. The overnight security scan completed clean. Two automation rules are
active — build-monitor and test-watcher — and the agent loop from yesterday is still
queued.
```

If no prior context exists:

```
Good morning. The daemon is running. What would you like to address?
```

### Tone Register

The concierge operates on five tone principles — the five Ps:

| Principle | Description |
|-----------|-------------|
| **Prompt** | Answers first; never hedges or over-qualifies |
| **Pertinent** | Every word earns its place; no filler |
| **Pleasant** | Warmth without informality |
| **Professional** | Consistent register regardless of topic sensitivity |
| **Discreet** | Sensitive operations handled without amplification |

### Routing

The concierge classifies user intent and routes to the appropriate daemon primitive without exposing the routing decision:

| Intent | Examples | Routes To |
|--------|---------|-----------|
| Status | "How's the build?" | Reads daemon state, summarizes |
| Task | "Fix the failing tests" | `aiwg task submit` |
| Schedule | "Run the audit tonight" | `/schedule` skill or `CronCreate` |
| Behavior | "Start watching tests" | `aiwg behavior run` |
| Information | "What's in the queue?" | Reads state files |
| Meta | "What can you do?" | Answers directly |
| Escalation | "Why is this failing?" | Diagnoses and surfaces cleanly |

### Memory

The concierge persists session context to `.aiwg/daemon/concierge-memory.json`:

- Last 5 completed tasks (type, outcome, timestamp)
- Active automation rules
- User preferences stated during sessions
- Unresolved items from prior sessions

This means the concierge never asks about context it has already been given. On each new session start, relevant prior context is surfaced in the greeting.

### Implementation Reference

The concierge is defined in `agentic/code/behaviors/concierge/BEHAVIOR.md` and is the **reference implementation** for agent-based AIWG behaviors. It introduces:

- `mode: agent` — distinguishes AI-instruction behaviors from shell-script behaviors
- `on_session_start` hook — new hook type for persistent daemon session boundaries
- `memory.cross_session` — explicit opt-in to persistent cross-session memory
- `expose_internals: false` — canonical pattern for user-facing routing

See `docs/behaviors-guide.md` for the full behaviors format specification.

## Operator Web UI

When `interface.web.enabled` is `true`, the daemon serves an operator interface at `http://localhost:7474`.

### Access

```bash
# Start daemon with web UI enabled (configure in daemon.json first)
aiwg daemon start

# Open in browser
open http://localhost:7474
```

Authentication uses a Bearer token. On first start, a token is generated and written to `~/.config/aiwg/daemon-token`. Alternatively, set the `AIWG_WEB_TOKEN` environment variable to supply a token at startup.

The web UI is localhost-only by default. Remote access requires a TLS-terminating reverse proxy; the daemon does not enforce TLS itself.

### Tab reference

| Tab | Purpose |
|-----|---------|
| **Loops** | All active loops — status, elapsed time, iteration count, controls (pause, resume, abort) |
| **Output** | Live SSE stream for a selected loop with ANSI rendering |
| **Submit** | Submit new task prompts with priority and budget override |
| **Resources** | System snapshot: CPU, memory, load average, queue depth, uptime |
| **History** | Completed loop summaries with duration, exit status, and cost rollup |

### Live streaming

Output is delivered via Server-Sent Events (SSE). Each loop has its own SSE endpoint. The browser reconnects automatically on disconnect. No WebSocket or polling required.

See `.aiwg/architecture/adr-native-web-operator-interface.md` for the architecture decision.

## IPC Commands

The daemon communicates via a Unix domain socket at `.aiwg/daemon/daemon.sock` using JSON-RPC 2.0.

### Daemon Management

```bash
# Full daemon status with all subsystems
aiwg daemon status

# Health check (quick ping)
aiwg daemon ping
```

### Task Management

```bash
# Submit a task
aiwg task submit "Refactor the user module to use dependency injection"

# Submit with priority (higher = sooner, default 0)
aiwg task submit "Fix critical security bug" --priority 10

# List tasks
aiwg task list
aiwg task list --state running
aiwg task list --state queued
aiwg task list --state completed

# Get task details
aiwg task get <task-id>

# Cancel a task
aiwg task cancel <task-id>

# Task statistics
aiwg task stats
```

### Automation Management

```bash
# View automation status and rules
aiwg automation status

# Enable/disable all automation
aiwg automation enable
aiwg automation disable

# Enable/disable specific rule
aiwg automation enable --rule auto-test-on-change
aiwg automation disable --rule auto-test-on-change
```

### Chat via IPC

```bash
# Send a chat message through the daemon (submitted as a task)
aiwg chat send "What is our current test coverage?"
```

### Daemon Supervisor IPC Methods

The following `daemon.*` JSON-RPC methods are available on the IPC socket when the `DaemonSupervisor` is active:

| Method | Params | Returns |
|--------|--------|---------|
| `daemon.process.list` | `{ filter }` | Array of loop entries (id, status, pid, elapsed, iterations, cost) |
| `daemon.process.kill` | `{ loopId, signal }` | `{ killed, loopId, signal }` |
| `daemon.resource.snapshot` | `{}` | `{ cpu, memory, loadAvg, queueDepth, uptime }` |
| `daemon.circuit.status` | `{}` | `{ state, consecutiveFailures, cooldownRemainingMs }` |
| `daemon.queue.inspect` | `{}` | `{ depth, maxDepth, oldest, priorityDistribution }` |
| `daemon.loop.history` | `{ limit }` | Array of completed loop summaries |
| `daemon.budget.remaining` | `{}` | `{ dailyLimit, spent, remaining, percentUsed }` |

`filter` values for `daemon.process.list`: `all` (default), `running`, `queued`, `failed`.

`signal` values for `daemon.process.kill`: `SIGTERM` (default), `SIGKILL`, `SIGINT`. The kill is sent to the entire process group (`-pid`), not just the top-level PID.

Circuit breaker `state` values: `closed` (normal operation), `open` (blocking new spawns), `half-open` (one probe in progress).

## Agent Tasks

The daemon's agent supervisor manages `claude -p` subprocesses:

### How Tasks Work

1. A task is submitted (via CLI, automation rule, or messaging command)
2. The task enters the queue with its priority
3. When a slot is available (under `max_parallel_actions`), the supervisor spawns a `claude -p` process
4. The process runs in the project directory with full CLAUDE.md context
5. On completion, the result is stored in the task store
6. Events are emitted: `task:started`, `task:completed`, `task:failed`, `task:timeout`

### Task States

| State | Description |
|-------|-------------|
| `queued` | Waiting for an available slot |
| `running` | `claude -p` process is active |
| `completed` | Process exited successfully |
| `failed` | Process exited with error |
| `cancelled` | Cancelled by user or system |
| `timeout` | Exceeded `action_timeout_minutes` |

### Concurrency

The `max_parallel_actions` setting controls how many tasks run simultaneously. Default is 3. Each running task is a separate Node.js child process running `claude -p`.

## Automation Rules

Automation rules define event-driven workflows that respond to file changes, scheduled events, or other daemon events.

### Rule Structure

```json
{
  "id": "unique-rule-id",
  "trigger": {
    "type": "file_change",
    "pattern": "src/**/*.ts"
  },
  "condition": {
    "type": "debounce",
    "interval_ms": 5000
  },
  "action": {
    "type": "submit_task",
    "prompt": "Run linting on the changed TypeScript files"
  }
}
```

### Trigger Types

| Type | Description | Parameters |
|------|-------------|------------|
| `file_change` | File created, modified, or deleted | `pattern` (glob) |
| `schedule` | Cron schedule fires | `cron` (cron expression) |
| `event` | Internal daemon event | `topic` (event topic string) |

### Condition Types

| Type | Description | Parameters |
|------|-------------|------------|
| `debounce` | Wait for activity to settle | `interval_ms` |
| `always` | Always proceed | — |

### Action Types

| Type | Description | Parameters |
|------|-------------|------------|
| `submit_task` | Submit to agent supervisor | `prompt`, `priority?` |

### Example Rules

**Run tests when source changes**:
```json
{
  "id": "auto-test",
  "trigger": {"type": "file_change", "pattern": "src/**/*.{ts,js}"},
  "condition": {"type": "debounce", "interval_ms": 5000},
  "action": {"type": "submit_task", "prompt": "Run the test suite and report results"}
}
```

**Security scan on config changes**:
```json
{
  "id": "security-scan",
  "trigger": {"type": "file_change", "pattern": "**/.env*"},
  "condition": {"type": "always"},
  "action": {"type": "submit_task", "prompt": "Scan for accidentally committed secrets", "priority": 10}
}
```

## REPL Chat

The daemon includes an interactive REPL for terminal-based chat:

```bash
aiwg daemon chat
```

This connects to the running daemon via IPC and provides an interactive prompt for sending messages. Messages are submitted as high-priority tasks to the agent supervisor.

## Tmux Integration

For projects using tmux, the daemon can manage sessions:

```bash
# Start daemon with tmux session
aiwg daemon start --tmux

# Attach to daemon's tmux session
aiwg daemon attach
```

The tmux manager creates a session named `aiwg-daemon` with panes for:
- Daemon logs
- Task output
- Interactive chat

## Health Monitoring

### Heartbeat

The daemon writes a heartbeat file every `heartbeat_interval_seconds` (default 30s):

```
.aiwg/daemon/heartbeat
```

Contains PID, timestamp, and uptime. External monitoring tools can check this file for daemon health.

### State File

Complete daemon state is written alongside the heartbeat:

```
.aiwg/daemon/state.json
```

Contains:
- PID and start time
- Uptime
- IPC socket path and connected clients
- Agent supervisor status (running/queued tasks)
- Task statistics
- File watcher and scheduler status
- Automation engine state
- Health assessment

### Log Rotation

Daemon logs are written to `.aiwg/daemon/daemon.log` with automatic rotation:
- Rotates when file exceeds `log.max_size_mb` (default 50 MB)
- Keeps `log.max_files` rotated copies (default 5)
- Rotated files named: `daemon.log.1`, `daemon.log.2`, etc.

## Docker and CI Usage

The daemon works in Docker containers and CI environments:

```dockerfile
# Dockerfile
FROM node:20
RUN npm install -g aiwg
WORKDIR /app
COPY . .
RUN aiwg daemon start
```

Key considerations:
- No systemd or launchd required — pure Node.js process management
- PID file at `.aiwg/daemon.pid` for lifecycle tracking
- Lock file at `.aiwg/daemon/.lock` prevents duplicate daemons
- Unix socket at `.aiwg/daemon/daemon.sock` for IPC
- All paths are project-relative (no system-level dependencies)

### Running as a Service

For long-lived deployments, use your system's service manager:

**systemd (Linux)**:
```ini
[Unit]
Description=AIWG Daemon
After=network.target

[Service]
Type=forking
PIDFile=/path/to/project/.aiwg/daemon.pid
ExecStart=/usr/bin/node /path/to/project/tools/daemon/daemon-main.mjs
ExecStop=/bin/kill -TERM $MAINPID
WorkingDirectory=/path/to/project
User=developer
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**launchd (macOS)**:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>io.aiwg.daemon</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/path/to/project/tools/daemon/daemon-main.mjs</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/path/to/project</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/path/to/project/.aiwg/daemon/stdout.log</string>
    <key>StandardErrorPath</key>
    <string>/path/to/project/.aiwg/daemon/stderr.log</string>
</dict>
</plist>
```

## File Structure

```
.aiwg/
├── daemon.pid                 # Daemon process ID
└── daemon/
    ├── .lock                  # Single-instance lock file
    ├── heartbeat              # Health check file (JSON)
    ├── state.json             # Full daemon state
    ├── daemon.log             # Log output
    ├── daemon.log.1           # Rotated logs
    ├── daemon.sock            # Unix domain socket for IPC
    ├── tasks.json             # Persistent task queue
    ├── actions/               # Action output directory
    └── events/                # Event log directory
```

## Troubleshooting

### Daemon won't start

```bash
# Check if already running
aiwg daemon status

# Check for stale lock file
ls -la .aiwg/daemon/.lock

# Remove stale lock and PID (if daemon is confirmed not running)
rm .aiwg/daemon/.lock .aiwg/daemon.pid
aiwg daemon start
```

### Can't connect to daemon

```bash
# Verify socket exists
ls -la .aiwg/daemon/daemon.sock

# Check socket permissions
stat .aiwg/daemon/daemon.sock

# Verify daemon PID is running
cat .aiwg/daemon.pid
ps -p $(cat .aiwg/daemon.pid)
```

### Tasks stuck in queue

```bash
# Check supervisor status
aiwg daemon status

# Check if max_parallel_actions limit is reached
aiwg task list --state running

# Cancel a stuck task
aiwg task cancel <task-id>
```

### Circuit breaker is open

The circuit breaker opens when consecutive loop failures reach `circuit_breaker.failure_threshold`. New submissions are rejected while it is open.

```bash
# Check circuit breaker state via IPC
aiwg daemon status

# Wait for the cooldown period to elapse (default: 120 seconds)
# The breaker enters half-open state and allows one probe attempt.
# If the probe succeeds, the breaker closes automatically.
# If the probe fails, the cooldown timer resets.

# To override cooldown and force-close the circuit (use with caution):
aiwg daemon circuit-reset
```

To reduce sensitivity, increase `failure_threshold` or `cooldown_ms` in `supervisor.circuit_breaker`.

### Restart intensity threshold exceeded

A loop is marked permanently failed when it restarts more than `max_restarts` times within `window_seconds`. This prevents infinite crash-restart cycles.

```bash
# Check a loop's restart count
aiwg task get <task-id>

# Review the loop's error output for root cause before resubmitting
aiwg task get <task-id> --output

# Resubmit after fixing the underlying issue
aiwg task submit "..." --priority 5
```

To allow more restarts before permanent failure, increase `supervisor.restart_intensity.max_restarts`.

### Queue overflow (submission rejected)

Submissions are rejected when the queue reaches `max_queue_depth`. This is a backpressure signal, not an error condition.

```bash
# Check current queue depth
aiwg task list --state queued

# Cancel lower-priority items to free capacity
aiwg task cancel <task-id>

# Or increase max_queue_depth in daemon.json (with caution — unbounded queues
# can exhaust memory under sustained load)
```

### Budget gate blocking submissions

New loops are blocked when cumulative spend reaches `daily_budget_usd`. A warning is emitted at 90%.

```bash
# Check remaining budget
aiwg daemon status  # includes budget line

# Budget resets at midnight local time automatically.
# To raise the limit mid-day, update daemon.json and restart the daemon.
```

Set `daily_budget_usd: 0` to disable the budget gate entirely.

### High memory usage

The daemon accumulates conversation history for AI chat sessions. Clear old conversations by restarting the daemon:

```bash
aiwg daemon stop && aiwg daemon start
```

### Log file too large

Check log rotation settings in `.aiwg/daemon.json`:

```json
{
  "daemon": {
    "log": {
      "max_size_mb": 50,
      "max_files": 5
    }
  }
}
```

## Advanced Configuration

### Custom Event Handlers

Automation rules can respond to custom daemon events:

```json
{
  "id": "on-deployment-complete",
  "trigger": {
    "type": "event",
    "topic": "deployment:complete"
  },
  "condition": {"type": "always"},
  "action": {
    "type": "submit_task",
    "prompt": "Run post-deployment smoke tests"
  }
}
```

Emit custom events from your own scripts using the IPC protocol:

```javascript
import { DaemonClient } from 'aiwg/daemon/ipc-client';

const client = new DaemonClient();
await client.connect();
await client.emit('deployment:complete', { version: '1.2.3' });
await client.disconnect();
```

### Multiple Automation Profiles

Create environment-specific configuration:

```bash
# Development profile with aggressive automation
aiwg daemon start --config .aiwg/daemon.dev.json

# Production profile with conservative automation
aiwg daemon start --config .aiwg/daemon.prod.json
```

### Task Priority Strategies

Tasks are executed in priority order (higher priority first):

| Priority | Use Case | Example |
|----------|----------|---------|
| 10 | Critical security issues | Secret scanning |
| 5 | Important but not urgent | Nightly backups |
| 0 (default) | Normal development tasks | Test runs |
| -5 | Low priority background tasks | Documentation updates |

When multiple tasks have the same priority, they execute in submission order (FIFO).

## Performance Tuning

### File Watching at Scale

For large projects, optimize file watching:

```json
{
  "watch": {
    "enabled": true,
    "paths": ["src/", "test/"],
    "ignore": [
      "node_modules/",
      ".git/",
      "*.log",
      "dist/",
      "build/",
      "coverage/"
    ],
    "debounce_ms": 3000,
    "use_polling": false
  }
}
```

- Increase `debounce_ms` to reduce noise from rapid file changes
- Set `use_polling: true` only if native file watching fails (slower but more compatible)
- Exclude large directories like `node_modules/` and build artifacts

### Concurrency Limits

Adjust `max_parallel_actions` based on system resources:

```json
{
  "daemon": {
    "max_parallel_actions": 5
  }
}
```

Each agent task spawns a separate `claude -p` process. Monitor resource usage:

```bash
# Check daemon and subprocess resource usage
ps aux | grep -E '(daemon|claude)'
```

Recommended limits:
- Development machine: 3-5 concurrent tasks
- CI server: 5-10 concurrent tasks
- Production server: 1-3 concurrent tasks

### Task Timeout Tuning

Set appropriate timeouts for different task types:

```json
{
  "daemon": {
    "action_timeout_minutes": 120
  }
}
```

For specific tasks requiring longer execution:

```bash
# Override timeout for long-running task
aiwg task submit "Comprehensive security audit" --timeout 240
```

## Security Considerations

### Access Control

The daemon runs with the permissions of the user who started it. IPC socket permissions are set to 0600 (owner read/write only).

For multi-user environments, consider:
- Running daemon as dedicated service user
- Setting appropriate file permissions on `.aiwg/daemon/`
- Using OS-level access controls for socket file

### Secrets in Automation

Avoid embedding secrets in automation rules. Use environment variables:

```json
{
  "id": "notify-on-error",
  "trigger": {"type": "event", "topic": "task:failed"},
  "action": {
    "type": "submit_task",
    "prompt": "Send failure notification",
    "env": {
      "SLACK_WEBHOOK_URL": "${SLACK_WEBHOOK_URL}"
    }
  }
}
```

### Network Exposure

The daemon uses local Unix domain sockets by default (no network exposure). For remote access, use SSH tunneling:

```bash
# From remote machine
ssh -L /tmp/aiwg.sock:/path/to/project/.aiwg/daemon/daemon.sock user@host

# Use forwarded socket
export AIWG_DAEMON_SOCKET=/tmp/aiwg.sock
aiwg daemon status
```

## Cross-References

### PTY Orchestrator
- `src/serve/screen-reader.ts` — VT100/ANSI parser using `@xterm/headless`
- `src/serve/orchestrator-pty.ts` — LLM-driven assess loop
- `src/serve/orchestrator-adapter.ts` — Live PTY session wiring (attach/detach)
- `src/serve/orchestrator-override.ts` — Operator HITL handoff manager
- `src/serve/pty-bridge.ts` — WebSocket PTY bridge

### Guides
- [Serve Guide](serve-guide.md) — Operator web dashboard, sandbox registration, HITL relay
- [Messaging Guide](messaging-guide.md) — Platform integration
- [Al Guide](ralph-guide.md) — Iterative task loops via daemon
- [Behaviors Guide](behaviors-guide.md) — Attaching capabilities to daemon and long-running agents
- [HITL Integration](addons/agent-persistence/hitl-integration.md) — HITL gates for agent recovery
- [Provider Capability Matrix](providers/capability-matrix.md) — Per-provider daemon tier and feature support

### Source References
- `agentic/code/providers/capability-matrix.yaml` — Authoritative `daemon_tier` and feature data
- `agentic/code/behaviors/concierge/BEHAVIOR.md` — Concierge behavior definition
- `src/cli/handlers/mc.ts` — Mission Control with `--mode pty-orchestrator`

### Architecture Decisions
- `.aiwg/architecture/adrs/ADR-daemon-mode.md` — Original daemon architecture decision
- `.aiwg/architecture/adrs/ADR-ipc-protocol.md` — IPC protocol specification
- `.aiwg/architecture/adr-daemon-as-headend.md` — DaemonSupervisor headend architecture
- `.aiwg/architecture/adr-native-web-operator-interface.md` — Web UI architecture decision
- `.aiwg/architecture/adr-behaviors-sticky-capabilities.md` — Behaviors primitive design
- `.aiwg/architecture/adr-in-memory-queue-defer-redis.md` — Queue implementation decision
- `tools/daemon/README.md` — Developer documentation
- `tools/daemon/daemon-main.mjs` — Daemon entry point source
- `tools/daemon/pty-adapter.mjs` — PTY adapter for TUI bridging (#656)
- `tools/daemon/agent-supervisor.mjs` — Agent task execution
- `tools/daemon/automation-engine.mjs` — Rule processing
- `tools/daemon/ipc-server.mjs` — IPC server implementation
- `tools/daemon/ipc-client.mjs` — IPC client implementation

## Migration from Manual Workflows

### Before: Manual Testing

```bash
# Developer manually runs tests after changes
npm test
```

### After: Automated Testing

```json
{
  "rules": [
    {
      "id": "auto-test",
      "trigger": {"type": "file_change", "pattern": "src/**/*.ts"},
      "condition": {"type": "debounce", "interval_ms": 5000},
      "action": {"type": "submit_task", "prompt": "Run tests for changed files"}
    }
  ]
}
```

Now tests run automatically after code changes stabilize.

### Before: Scheduled Tasks via Cron

```cron
0 9 * * * cd /path/to/project && npm run audit
```

### After: Daemon Scheduling

```json
{
  "schedule": {
    "enabled": true,
    "jobs": [
      {
        "name": "daily-audit",
        "cron": "0 9 * * *",
        "action": "security-audit"
      }
    ]
  }
}
```

Scheduling is now project-aware and integrated with task management.

## Best Practices

1. **Start small** — Begin with file watching or scheduling, add automation rules incrementally
2. **Use meaningful rule IDs** — Makes debugging and logs clearer
3. **Set appropriate debounce intervals** — Balance responsiveness with noise reduction
4. **Monitor task queue depth** — Adjust `max_parallel_actions` if queue grows
5. **Review logs regularly** — Check `.aiwg/daemon/daemon.log` for issues
6. **Test automation rules** — Manually trigger events to verify behavior
7. **Document custom rules** — Add comments explaining business logic
8. **Version control daemon config** — Track `.aiwg/daemon.json` in git
9. **Set up log rotation** — Prevent disk space issues
10. **Use priorities wisely** — Reserve high priorities for truly urgent tasks

## FAQ

**Q: Can I run multiple daemons in different projects?**

Yes. Each project has its own daemon instance with separate state in `.aiwg/daemon/`.

**Q: Does the daemon survive system reboots?**

No. Use your OS service manager (systemd/launchd) to start the daemon automatically.

**Q: Can I submit tasks while the daemon is stopped?**

No. The daemon must be running to accept tasks. Start it with `aiwg daemon start`.

**Q: How do I upgrade the daemon after updating AIWG?**

Stop the daemon, update AIWG, restart the daemon:

```bash
aiwg daemon stop
npm update -g aiwg
aiwg daemon start
```

**Q: Can automation rules spawn other automation rules?**

Not directly, but tasks submitted by automation can emit events that trigger other rules.

**Q: What happens to running tasks when I stop the daemon?**

Running tasks receive SIGTERM and have 15 seconds to complete. After that, they're killed.

**Q: Can I pause the daemon without stopping it?**

Use automation disable to stop rule processing while keeping the daemon running:

```bash
aiwg automation disable
```

**Q: How do I debug automation rules?**

Check the daemon log for trigger/action events:

```bash
tail -f .aiwg/daemon/daemon.log | grep automation
```

**Q: Can I use the daemon without messaging platforms?**

Yes. Messaging integration is optional. The daemon provides file watching, scheduling, and task management independently.

## Test coverage

The daemon + serve + sandbox seam is covered by a four-tier strategy in [`.aiwg/testing/test-strategy-daemon-serve-sandbox.md`](https://github.com/jmagly/aiwg/blob/main/.aiwg/testing/test-strategy-daemon-serve-sandbox.md):

- **Tier 1 (unit)** — `npm test` runs the mocked-transport unit suites under `test/unit/serve/` and `test/unit/mc-bridge/`.
- **Tier 2 (contract)** — `npm run test:conformance` replays the executor-contract v1 fixtures (#1183).
- **Tier 3 (integration)** — `npm run test:integration:serve` spawns real `aiwg serve` against the in-process fake-sandbox harness and drives full HTTP + WS proxy flows (#1174), including PTY bridge resilience scenarios for reconnect, bounded replay buffering, kill/respawn, write ordering, and resize propagation (#1175).
- **Tier 4 (live UAT)** — `npm run uat:serve-live` runs against a real agentic-sandbox at `AIWG_SANDBOX_ENDPOINT`; skips cleanly when unreachable (#1176).

Tiers 1–3 run in CI. Tier 4 is operator-driven before releases that touch the serve seam.
