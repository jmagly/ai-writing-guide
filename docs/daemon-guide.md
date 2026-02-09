# Daemon Mode Guide

AIWG daemon mode runs a persistent background process that monitors your project, executes automated tasks, and bridges messaging platforms. It extends the Ralph loop pattern into always-on project supervision.

## Overview

The daemon provides:

- **File watching** — Trigger actions when project files change
- **Scheduled tasks** — Cron-like scheduling for health checks and audits
- **Agent supervision** — Spawn and manage `claude -p` subprocesses
- **Task queue** — Persistent task management with priority support
- **Automation rules** — Event-driven trigger→condition→action workflows
- **IPC communication** — CLI↔daemon communication via Unix domain socket
- **Messaging integration** — Slack, Discord, and Telegram notifications and commands
- **2-way AI chat** — Ask questions from messaging platforms

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

- [Messaging Guide](messaging-guide.md) — Platform integration
- [Ralph Guide](ralph-guide.md) — Iterative task loops via daemon
- `.aiwg/architecture/adrs/ADR-daemon-mode.md` — Architecture decision
- `.aiwg/architecture/adrs/ADR-ipc-protocol.md` — IPC protocol specification
- `tools/daemon/README.md` — Developer documentation
- `tools/daemon/daemon-main.mjs` — Daemon entry point source
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
