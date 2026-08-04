# Daemon Configuration Reference

All daemon configuration lives in `.aiwg/daemon.json`. This file is created by `aiwg daemon-init` with defaults, then customized per project.

## Full Configuration Structure

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
    "daily_budget_usd": 0,
    "behaviors": []
  },
  "interface": {
    "web": {
      "enabled": false,
      "port": 7474,
      "host": "127.0.0.1"
    }
  },
  "watch": {
    "enabled": false,
    "paths": [],
    "ignore": ["node_modules/", ".git/", "*.log"],
    "debounce_ms": 1000
  },
  "schedule": {
    "enabled": false,
    "jobs": []
  },
  "rules": [],
  "behaviors": {}
}
```

---

## daemon

Core process settings.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `daemon.heartbeat_interval_seconds` | number | 30 | How often the daemon writes a heartbeat to `.aiwg/daemon/heartbeat.json` |
| `daemon.max_parallel_actions` | number | 3 | Maximum concurrent actions in the base action runner (not the supervisor) |
| `daemon.action_timeout_minutes` | number | 120 | Kill an action after this many minutes regardless of state |
| `daemon.log.max_size_mb` | number | 50 | Log file size before rotation |
| `daemon.log.max_files` | number | 5 | Number of rotated log files to keep |

---

## supervisor

The DaemonSupervisor wraps the base agent supervisor and adds governance policy.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `supervisor.max_concurrent` | number | 4 | Maximum simultaneous agent sessions |
| `supervisor.max_queue_depth` | number | 20 | Maximum queued tasks; rejections above this threshold |
| `supervisor.restart_intensity.max_restarts` | number | 3 | Restarts allowed within the window before marking a task permanently failed |
| `supervisor.restart_intensity.window_seconds` | number | 300 | Sliding window for restart counting (seconds) |
| `supervisor.circuit_breaker.failure_threshold` | number | 5 | Consecutive failures that open the circuit breaker |
| `supervisor.circuit_breaker.cooldown_ms` | number | 120000 | Time the circuit stays open before a half-open probe (ms) |
| `supervisor.daily_budget_usd` | number | 0 | Daily spend cap across all agent loops. 0 = no cap. Resets at midnight local time. |
| `supervisor.behaviors` | string[] | `[]` | Behavior names to activate at session initialization |

**Circuit breaker states**:
- **Closed** (normal): tasks run normally
- **Open**: new tasks are blocked until `cooldown_ms` elapses
- **Half-open**: one probe task runs; if it succeeds, the circuit closes; if it fails, the cooldown resets

**Budget behavior**: At 90% of `daily_budget_usd`, a warning is emitted. At 100%, new agent spawns are blocked. Token cost is aggregated across all supervised loops.

---

## interface

Web UI settings.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `interface.web.enabled` | boolean | false | Enable the operator web UI |
| `interface.web.port` | number | 7474 | Port to listen on |
| `interface.web.host` | string | `"127.0.0.1"` | Bind address. Keep as `127.0.0.1` unless you need remote access. |

The web UI at `http://localhost:7474` shows: active sessions, task queue, subsystem health, supervisor state, and session logs. It is read-only by default.

---

## watch

File system monitoring. Triggers automation rules when files change.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `watch.enabled` | boolean | false | Enable file system monitoring |
| `watch.paths` | string[] | — | Directories to watch (relative to project root) |
| `watch.ignore` | string[] | — | Glob patterns to exclude from watching |
| `watch.debounce_ms` | number | 1000 | Wait this long after the last change before firing triggers |

**Example**: Watch source and test directories:
```json
{
  "watch": {
    "enabled": true,
    "paths": ["src/", "test/", ".aiwg/requirements/"],
    "ignore": ["node_modules/", ".git/", "*.log", "*.tmp"],
    "debounce_ms": 2000
  }
}
```

---

## schedule

Cron-based job scheduling.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `schedule.enabled` | boolean | false | Enable the scheduler |
| `schedule.jobs` | object[] | — | Array of cron job definitions |

**Job schema**:

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `name` | string | yes | Unique job identifier |
| `cron` | string | yes | Cron expression (5-field: minute hour day month weekday) |
| `action` | string | yes | Action name to run |
| `timeout_minutes` | number | no | Job-specific timeout (overrides daemon default) |

**Example jobs**:
```json
{
  "schedule": {
    "enabled": true,
    "jobs": [
      {
        "name": "health-check",
        "cron": "*/30 * * * *",
        "action": "health-check"
      },
      {
        "name": "daily-security-audit",
        "cron": "0 9 * * 1-5",
        "action": "security-audit",
        "timeout_minutes": 60
      },
      {
        "name": "weekly-test-run",
        "cron": "0 8 * * 1",
        "action": "run-tests"
      }
    ]
  }
}
```

---

## rules

Automation rules: event-driven trigger → condition → action.

Each rule is an object with:

| Key | Type | Description |
|-----|------|-------------|
| `id` | string | Unique rule identifier |
| `trigger.type` | string | `"file_change"`, `"schedule"`, or `"task_complete"` |
| `trigger.pattern` | string | Glob pattern (for `file_change`) |
| `condition.type` | string | `"debounce"`, `"always"`, or `"on_error"` |
| `condition.interval_ms` | number | Debounce interval (for `debounce` condition) |
| `action.type` | string | `"submit_task"` or `"run_skill"` |
| `action.prompt` | string | Task prompt (for `submit_task`) |
| `action.skill` | string | Skill name (for `run_skill`) |

**Example rule**: Run tests when TypeScript files change:
```json
{
  "rules": [
    {
      "id": "auto-test-on-ts-change",
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
        "prompt": "Run the TypeScript tests for the changed files"
      }
    }
  ]
}
```

---

## behaviors

Per-behavior configuration blocks. Each key corresponds to a behavior name listed in `supervisor.behaviors`.

### concierge

```json
{
  "behaviors": {
    "concierge": {
      "enabled": true,
      "tone": "professional-warm",
      "verbosity": "concise",
      "escalation": "absorb-by-default",
      "memory": {
        "cross_session": true,
        "store": ".aiwg/daemon/concierge-memory.json"
      }
    }
  }
}
```

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `enabled` | boolean | true | Activate the concierge |
| `tone` | string | `"professional-warm"` | `"professional-warm"`, `"technical-authority"`, or `"friendly-explainer"` |
| `verbosity` | string | `"concise"` | `"minimal"`, `"concise"`, or `"detailed"` |
| `escalation` | string | `"absorb-by-default"` | `"absorb-by-default"` (handle errors silently) or `"surface-immediately"` (show all errors) |
| `memory.cross_session` | boolean | true | Persist session context across restarts |
| `memory.store` | string | — | Path to the memory file |

**Tone options**:
- `professional-warm` — Hotel concierge register; the default. Warm but not casual; professional but not cold.
- `technical-authority` — Direct, precise. For teams that prefer unmediated technical communication.
- `friendly-explainer` — Approachable, patient. For less technical users or onboarding contexts.

---

## Minimal Configuration Example

For a development project with file watching and no spend cap:

```json
{
  "daemon": {
    "heartbeat_interval_seconds": 30
  },
  "supervisor": {
    "max_concurrent": 2,
    "behaviors": ["concierge"]
  },
  "interface": {
    "web": {
      "enabled": true,
      "port": 7474
    }
  },
  "watch": {
    "enabled": true,
    "paths": ["src/", "test/"],
    "ignore": ["node_modules/", ".git/"],
    "debounce_ms": 1000
  },
  "behaviors": {
    "concierge": {
      "enabled": true,
      "tone": "technical-authority",
      "verbosity": "concise"
    }
  }
}
```

## References

- `@$AIWG_ROOT/agentic/code/addons/daemon/docs/quickstart.md` — Start and stop the daemon
- `@$AIWG_ROOT/agentic/code/addons/daemon/docs/daemon-addon-guide.md` — Architecture and provider support
- `@$AIWG_ROOT/docs/daemon-guide.md` — Supervisor architecture and headend details
