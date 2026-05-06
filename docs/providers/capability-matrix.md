# Provider Capability Matrix

AIWG runs on nine AI coding platforms. Some features — scheduled tasks, parallel agent teams, behaviors, MCP integration — are available natively on certain platforms and emulated on others. This document explains what that means in practice and shows the full picture across all providers.

**Data source:** `agentic/code/providers/capability-matrix.yaml` (updated 2026.3)

---

## Native vs. Emulated: What it Means in Practice

**Native** means the platform has a built-in mechanism for the feature. AIWG uses it directly. The experience is tightly integrated: the platform knows about the capability, manages its lifecycle, and reports its status through normal platform channels.

**Emulated** means the platform has no built-in equivalent. AIWG provides the same capability through its own infrastructure — typically the daemon, the scheduler, or Mission Control (`aiwg mc`). The end result is the same; the implementation path is different. Emulated features sometimes have practical differences worth knowing about, covered in the per-feature sections below.

When you are on a provider that emulates a feature, the AIWG command is the right tool — not a workaround. Emulation is first-class.

---

## Full Capability Matrix

The baseline provider is Claude Code; all gap reporting in `aiwg doctor` is relative to it.

| Feature | Claude Code | Codex | Copilot | Cursor | Factory AI | OpenCode | Warp | Windsurf | OpenClaw |
|---------|-------------|-------|---------|--------|------------|----------|------|----------|----------|
| **Scheduler** | Native | Emulated | Emulated | Emulated | Emulated | Emulated | Emulated | Emulated | Emulated |
| **Agent Teams** | Native | Emulated | Emulated | Native | Native | Emulated | Emulated | Emulated | Emulated |
| **Mission Control** | Native | Emulated | Emulated | Emulated | Native | Emulated | Emulated | Emulated | Emulated |
| **Behaviors** | Emulated | Emulated | Emulated | Emulated | Emulated | Emulated | Emulated | Emulated | **Native** |
| **MCP** | Native | — | — | Native | Partial | Native | — | Native | — |
| **Daemon** | **T1** + T2 | **T1** + T2 | — | — | — | **T1** | **T1** | — | **T1** |

**Legend:** Native = first-class platform support. Emulated = AIWG emulation via daemon/mc. — = not supported.
**Daemon tiers:** T1 = native headless daemon (`aiwg daemon start`). T2 = PTY adapter (requires `node-pty`). — = requires display server/IDE host, not supported.

---

## Feature Details

### Scheduler

Create and manage recurring agent tasks using cron-like expressions.

| Provider | Support | Native Tool | AIWG Command |
|----------|---------|-------------|--------------|
| Claude Code | Native | `CronCreate / CronList / CronDelete` | `aiwg schedule` |
| Codex | Emulated | — | `aiwg schedule` |
| GitHub Copilot | Emulated | — | `aiwg schedule` |
| Cursor | Emulated | — | `aiwg schedule` |
| Factory AI | Emulated | — | `aiwg schedule` |
| OpenCode | Emulated | — | `aiwg schedule` |
| Warp Terminal | Emulated | — | `aiwg schedule` |
| Windsurf | Emulated | — | `aiwg schedule` |
| OpenClaw | Emulated | — | `aiwg schedule` |

**Claude Code routing note:** `CronCreate` is available inside an agent session but not from the CLI directly. When running from the CLI (outside an agent context), use `aiwg schedule`, which routes through the AIWG daemon.

**Warp note:** System cron (`crontab`) works fine for non-AI shell tasks independently of AIWG. `aiwg schedule` is specifically for agent-integrated recurring tasks that need to submit work to the daemon.

**Emulation difference:** On all non-Claude-Code providers, scheduling is managed by the AIWG daemon's cron subsystem. Scheduled tasks are submitted to the daemon task queue at fire time. The daemon must be running for scheduled tasks to execute.

---

### Agent Teams

Spawn and coordinate multiple agents in parallel within or across sessions.

| Provider | Support | Native Tool | AIWG Command |
|----------|---------|-------------|--------------|
| Claude Code | Native | Agent tool (Task) | `aiwg mc dispatch` |
| Codex | Emulated | — | `aiwg mc dispatch` |
| GitHub Copilot | Emulated | — | `aiwg mc dispatch` |
| Cursor | Native | Background Agents | `aiwg mc dispatch` |
| Factory AI | Native | Droids | `aiwg mc dispatch` |
| OpenCode | Emulated | — | `aiwg mc dispatch` |
| Warp Terminal | Emulated | — | `aiwg mc dispatch` |
| Windsurf | Emulated | — | `aiwg mc dispatch` |
| OpenClaw | Emulated | — | `aiwg mc dispatch` |

**Claude Code routing note:** Use the native Agent tool for short-lived focused subagents within the current session. Use `aiwg mc dispatch` for long-running background missions that need to outlast the session.

**Cursor note:** Cursor Background Agents run in isolated containers — they do not share session context with the primary agent. For AIWG-coordinated orchestration with shared state, use `aiwg mc dispatch` instead.

**Windsurf note:** Windsurf Cascade is sequential multi-step execution, not parallel agent spawning. It is not equivalent to agent teams.

**Factory AI note:** Factory Droids provide native parallel execution. Use `aiwg mc dispatch` when you need AIWG lifecycle tracking across Droids.

**Emulation difference:** On emulated providers, `aiwg mc dispatch` submits each agent task to the AIWG daemon, which manages parallelism, state, and lifecycle. The team schema (`aiwg team run`) works identically across all providers — native providers use their spawning mechanism, others use `aiwg mc`.

---

### Mission Control

Background task orchestration with persistence across sessions, status tracking, and a monitoring dashboard.

| Provider | Support | Native Tool | AIWG Command |
|----------|---------|-------------|--------------|
| Claude Code | Native | Agent tool (Task) | `aiwg mc start / aiwg mc dispatch` |
| Codex | Emulated | — | `aiwg mc` |
| GitHub Copilot | Emulated | — | `aiwg mc` |
| Cursor | Emulated | — | `aiwg mc` |
| Factory AI | Native | Droids | `aiwg mc` |
| OpenCode | Emulated | — | `aiwg mc` |
| Warp Terminal | Emulated | — | `aiwg mc` |
| Windsurf | Emulated | — | `aiwg mc` |
| OpenClaw | Emulated | — | `aiwg mc` |

**Claude Code routing note:** `aiwg mc` wraps the native Task/Agent tool with persistence, state tracking, and a monitoring dashboard. Prefer `aiwg mc` for complex multi-loop orchestrations where you need to watch progress or resume across sessions.

**Factory AI note:** Factory Droids handle parallelism natively. `aiwg mc` adds AIWG-specific state tracking, completion criteria, and cross-provider consistency on top.

**Emulation difference:** `aiwg mc` is the same experience everywhere — start a session, dispatch missions, watch status, stop the session. The backend varies (native tool vs. daemon) but the `aiwg mc` interface is identical.

---

### Behaviors

Event-driven reactive capabilities — scripts and hooks triggered by file, time, or API events.

| Provider | Support | Native Tool | AIWG Command |
|----------|---------|-------------|--------------|
| Claude Code | Emulated | — (hooks emulation) | `aiwg add-behavior / aiwg behavior run` |
| Codex | Emulated | — | `aiwg add-behavior --provider codex` |
| GitHub Copilot | Emulated | — | `aiwg behavior run` |
| Cursor | Emulated | — | `aiwg behavior run` |
| Factory AI | Emulated | — | `aiwg behavior run` |
| OpenCode | Emulated | — | `aiwg behavior run` |
| Warp Terminal | Emulated | — | `aiwg behavior run` |
| Windsurf | Emulated | — | `aiwg behavior run` |
| OpenClaw | **Native** | `~/.openclaw/behaviors/` | `aiwg add-behavior --provider openclaw` |

**OpenClaw note:** OpenClaw is the first provider with native behavior support. Behaviors deploy to `~/.openclaw/behaviors/` and are triggered directly by the platform's file, time, and API event system. OpenClaw behaviors are the reference implementation for the AIWG behaviors spec.

**Claude Code emulation note:** Claude Code has lifecycle hooks (`pre-session`, `post-write`, `post-bash`) but not the full behavior event model. AIWG emulates behaviors by mapping behavior hook events to the closest Claude Code hook equivalents and running scripts through the daemon's automation engine.

**All other providers:** Behavior execution is managed entirely by the AIWG daemon. The daemon monitors file events, fires scheduled hooks, and runs the behavior's scripts. NL trigger phrases work identically across all providers — hook-driven execution is the only path where the provider distinction matters.

See `docs/behaviors-guide.md` for the full BEHAVIOR.md format specification.

---

### MCP (Model Context Protocol)

Extend the provider with external tool servers via the Model Context Protocol.

| Provider | Support | Native Tool | AIWG Command |
|----------|---------|-------------|--------------|
| Claude Code | Native | MCP protocol (built-in) | `aiwg mcp install claude` |
| Codex | Not supported | — | — |
| GitHub Copilot | Not supported | — | — |
| Cursor | Native | MCP protocol (built-in) | `aiwg mcp install cursor` |
| Factory AI | Native | MCP protocol (stdio + HTTP) | `aiwg mcp install factory` |
| OpenCode | Native | MCP protocol (built-in) | `aiwg mcp install opencode` |
| Warp Terminal | Not supported | — | — |
| Windsurf | Native | MCP protocol (built-in) | `aiwg mcp install windsurf` |
| OpenClaw | Not supported | — | — |

**Factory AI:** Native MCP support with both `stdio` (local process) and `http` (remote endpoint) transports. Configuration in `.factory/mcp.json` (project) and `~/.factory/mcp.json` (user). Built-in registry of 40+ pre-configured servers.

**Codex, Copilot, Warp, OpenClaw:** MCP tools must be accessed through the AIWG CLI layer (`aiwg mcp serve`) rather than native platform integration.

---

### Daemon

Persistent background process for headless/unattended operation — file watching, scheduled tasks, agent supervision, automation rules, and behaviors.

Platforms are grouped into three daemon tiers:

| Provider | Tier | Mode | AIWG Command |
|----------|------|------|--------------|
| Claude Code | Tier 1 (native) + Tier 2 (PTY) | Headless + PTY bridge | `aiwg daemon start` |
| Codex | Tier 1 (native) + Tier 2 (PTY) | Headless + PTY bridge | `aiwg daemon start` |
| Factory AI | Tier 1 (native) | Headless via `droid exec` | `aiwg daemon start` |
| OpenCode | Tier 1 (native) | Headless | `aiwg daemon start` |
| Warp Terminal | Tier 1 (native) | Headless | `aiwg daemon start` |
| OpenClaw | Tier 1 (native) | Headless | `aiwg daemon start` |
| Cursor | Tier 3 — IDE-hosted | IDE extension (VS Code host required) | — |
| Windsurf | Tier 3 — IDE-hosted | IDE extension (VS Code host required) | — |
| GitHub Copilot | Tier 3 — IDE-hosted | IDE extension | — |

**Tier 1 (native):** Full daemon support. `aiwg daemon start/stop/status/attach` all work. The daemon manages its own process lifecycle, IPC socket, and state files. Behaviors, automation rules, PTY orchestration, and all daemon subsystems are available. Factory AI's `droid exec` provides headless one-shot execution; the AIWG daemon wraps it with persistence, scheduling, and multi-session coordination.

**Tier 2 (PTY adapter):** Optional secondary mode for Claude Code and Codex. Spawns the platform's TUI under a pseudo-terminal and bridges I/O through the chat channel — enabling remote operation from messaging platforms, shell scripts, or agentic LLMs. Requires `node-pty`:

```bash
npm install node-pty    # requires node-gyp + C++ build tools
aiwg daemon pty start opencode
aiwg daemon pty start codex --cols 120
```

**Tier 3 (IDE-hosted):** These providers run as extensions inside a desktop IDE process that requires a display server. No standalone CLI process to bridge or supervise. The AIWG daemon cannot run within them, but they can *connect to* a daemon running elsewhere via HTTP/WS. All other AIWG features (agents, commands, skills, rules, Mission Control emulation) remain fully available.

See `docs/daemon-guide.md` for full configuration and usage.

---

## Checking Your Provider's Capabilities

### Full capability summary

```bash
aiwg runtime-info --capabilities
```

Shows which features are native vs. emulated for the detected provider, with the correct AIWG command for each.

### Query a specific feature

```bash
aiwg steward capabilities
```

The AIWG Steward agent reads the capability matrix and provides routing advice for your current provider context. Ask it:

```
"How do I schedule a recurring task here?"
"Does this provider support agent teams natively?"
"What's the right way to use behaviors on Cursor?"
```

### Health check

```bash
aiwg doctor
```

The doctor command includes a capabilities section that flags any emulated features and confirms their AIWG fallback command is functional.

---

## See Also

- [Daemon Guide](../daemon-guide.md) — The daemon that powers emulation for most features
- [Daemon Guide](../daemon-guide.md) — Platform tiers, PTY adapter, and daemon configuration
- [Behaviors Guide](../behaviors-guide.md) — Full behavior format and provider details
- [Concierge Guide](../concierge-guide.md) — Concierge behavior for daemon sessions
- `agentic/code/providers/capability-matrix.yaml` — Canonical data source for this document
