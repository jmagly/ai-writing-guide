# Daemon Quickstart

> **First time using AIWG?** Begin with [Install, Connect, and Verify](https://docs.aiwg.io/pages/getting-started--install-connect-verify.html). This guide assumes AIWG is already installed, `all` is deployed for your provider, and `aiwg-regenerate` has connected the agent to this project.

Start the AIWG daemon, enable the Concierge front-end, and access the operator web UI.

## Prerequisites

The daemon is the persistent background process that manages agent sessions, file watching, and scheduled tasks. It requires the AIWG CLI and runs as a Node.js process.

## Installation

```bash
# Deploy the daemon addon
aiwg use daemon

# Verify deployment
aiwg list
# daemon    installed
```

## Initialize Daemon Configuration

```bash
aiwg daemon-init
```

This creates `.aiwg/daemon.json` with sensible defaults for your project. Inspect and adjust the defaults before starting.

## Start the Daemon

```bash
aiwg daemon start
```

The daemon detaches from the terminal and runs in the background. State is stored in `.aiwg/daemon/`.

Check that it started:

```bash
aiwg daemon status
```

Output includes PID, uptime, active subsystems, and connected adapters.

## Access the Web UI

The operator web UI is available at `http://localhost:7474` when enabled. Enable it in `.aiwg/daemon.json`:

```json
{
  "interface": {
    "web": {
      "enabled": true,
      "port": 7474,
      "host": "127.0.0.1"
    }
  }
}
```

Restart the daemon after enabling the web UI:

```bash
aiwg daemon stop
aiwg daemon start
```

Then open `http://localhost:7474` in a browser. The web UI shows active sessions, task queue status, and subsystem health.

## Enable the Concierge

The Concierge is a hotel-concierge-style interaction layer that greets users contextually, routes requests silently to the appropriate skill or agent, and composes responses with consistent tone.

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

Once enabled, the concierge activates at session start and wraps all output before it reaches the user.

## Submit a Task

```bash
aiwg task submit "Fix the failing tests in auth module"
```

The daemon queues the task, spawns a `claude -p` subprocess to execute it, and reports progress. Task output is logged to `.aiwg/daemon/tasks/`.

## Check Daemon Health

From within an agent session, use the daemon-status skill:

```
Show daemon status
```

Output shows:
- Daemon process PID and uptime
- Active agent sessions (count and IDs)
- Task queue depth
- Subsystem health (file watcher, scheduler, IPC socket)
- Circuit breaker state

## Stop the Daemon

```bash
# Graceful shutdown (15 second drain window for running tasks)
aiwg daemon stop

# Immediate stop
aiwg daemon stop --force
```

## Common Configuration

**Set concurrency limit** (default 4):
```json
{
  "supervisor": {
    "max_concurrent": 4,
    "max_queue_depth": 20
  }
}
```

**Set a daily spend cap**:
```json
{
  "supervisor": {
    "daily_budget_usd": 50
  }
}
```

**Enable file watching** (trigger tasks on source changes):
```json
{
  "watch": {
    "enabled": true,
    "paths": ["src/", "test/"],
    "ignore": ["node_modules/", ".git/"],
    "debounce_ms": 1000
  }
}
```

**Add a scheduled job** (run health check every 30 minutes):
```json
{
  "schedule": {
    "enabled": true,
    "jobs": [
      {
        "name": "health-check",
        "cron": "*/30 * * * *",
        "action": "health-check"
      }
    ]
  }
}
```

## Uninstall

```bash
aiwg remove daemon
```

This removes all deployed artifacts. The daemon infrastructure files in `tools/daemon/` are unaffected.

## References

- `@$AIWG_ROOT/agentic/code/addons/daemon/docs/daemon-addon-guide.md` — Full architecture, provider support, and configuration
- `@$AIWG_ROOT/docs/daemon-guide.md` — Daemon infrastructure and supervisor configuration
- `@$AIWG_ROOT/agentic/code/addons/daemon/behaviors/concierge.behavior.md` — Concierge behavior definition
