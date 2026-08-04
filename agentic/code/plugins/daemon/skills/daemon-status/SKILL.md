---
namespace: aiwg
name: daemon-status
description: Show daemon health, active sessions, task queue, and subsystem status
version: 2026.3.0
triggers:
  - "daemon status"
  - "daemon health"
  - "is the daemon running"
  - "what's the daemon doing"
  - "show daemon"
  - "check daemon"
  - "daemon info"
platforms: [all]

---

# Daemon Status Skill

You detect when users want to check the AIWG daemon's health and operational status, then gather and present the information.

## Trigger Patterns

| Pattern | Example | Action |
|---------|---------|--------|
| `daemon status` | "daemon status" | Full status report |
| `daemon health` | "check daemon health" | Health-focused report |
| `is the daemon running` | "is the daemon running?" | Quick running/stopped check |
| `what's the daemon doing` | "what's the daemon doing right now?" | Active task focus |
| `show daemon` | "show me the daemon" | Full status report |

## Information Gathered

### 1. Process Status

```bash
# Check if daemon is running
cat .aiwg/daemon/daemon.pid 2>/dev/null
ps -p $(cat .aiwg/daemon/daemon.pid) 2>/dev/null
```

Report: running/stopped, PID, uptime

### 2. Active Sessions

```bash
# Check active agent sessions
ls .aiwg/daemon/sessions/ 2>/dev/null
```

Report: count, age, task descriptions

### 3. Task Queue

```bash
# Check queued tasks
cat .aiwg/daemon/queue.json 2>/dev/null
```

Report: pending count, active count, completed (last hour)

### 4. Subsystem Health

| Subsystem | Check | Status |
|-----------|-------|--------|
| File watcher | `.aiwg/daemon/watcher.pid` | running/stopped |
| Scheduler | `.aiwg/daemon/scheduler.pid` | running/stopped |
| IPC socket | `.aiwg/daemon/aiwg.sock` | listening/down |
| Messaging | `.aiwg/daemon/adapters/` | connected/disconnected |

### 5. Recent Activity

```bash
# Last 5 completed tasks
tail -5 .aiwg/daemon/activity.log 2>/dev/null
```

## Output Format

```
Daemon Status
─────────────────────────────────────
Status:     Running (PID 12345, uptime 2h 15m)
Sessions:   1 active, 0 queued
Tasks:      3 completed (last hour), 1 active

Subsystems:
  File watcher:  running
  Scheduler:     running (next: health-check in 12m)
  IPC socket:    listening
  Messaging:     Slack (connected), Discord (disconnected)

Active Task:
  "Fix auth timeout in user service" — cycle 3/6, started 8m ago

Recent:
  14:32  Completed: "Update README badges"
  14:15  Completed: "Run lint cleanup"
  13:50  Completed: "Sync issue #42"
─────────────────────────────────────
```

## Fallback When Daemon Not Running

```
Daemon is not running.

Start it with: aiwg daemon start

Last run: 2026-03-25 (2 days ago)
Last shutdown: clean (SIGTERM)
```

## References

- @$AIWG_ROOT/docs/daemon-guide.md — Daemon architecture and operations
- @$AIWG_ROOT/tools/daemon/daemon-main.mjs — Daemon implementation
- @$AIWG_ROOT/tools/ralph-external/daemon-supervisor.mjs — Agent supervisor
