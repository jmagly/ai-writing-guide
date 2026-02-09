# AIWG Daemon Mode

Implementation of background daemon for AIWG following ADR-daemon-mode.

## Architecture

The daemon implements a Unix-style PID-file based lifecycle with event-driven architecture:

```
CLI (index.mjs)
  ├─ start: Spawns daemon-main.mjs detached
  ├─ stop: Sends SIGTERM to PID
  ├─ status: Reads state.json
  └─ logs: Tails daemon.log

Daemon (daemon-main.mjs)
  ├─ Lifecycle Manager (PID, signals, heartbeat)
  ├─ Event Sources
  │   ├─ FileWatcher (fs.watch with debounce)
  │   └─ CronScheduler (setInterval with cron matching)
  └─ Event Router (pub/sub event bus)
```

## Files

| File | Purpose |
|------|---------|
| `index.mjs` | CLI entry point (start/stop/status/logs) |
| `daemon-main.mjs` | Main daemon process |
| `config.mjs` | Configuration loader and validator |
| `file-watcher.mjs` | File system change detection |
| `cron-scheduler.mjs` | Periodic task scheduling |
| `event-router.mjs` | Event pub/sub with dead letter queue |

## Usage

### Start Daemon

```bash
# Start in background (normal mode)
node tools/daemon/index.mjs start

# Start in foreground (Docker/systemd)
node tools/daemon/index.mjs start --foreground
```

### Stop Daemon

```bash
node tools/daemon/index.mjs stop
```

### Check Status

```bash
node tools/daemon/index.mjs status
```

### View Logs

```bash
# Show last 50 lines
node tools/daemon/index.mjs logs

# Show last 100 lines
node tools/daemon/index.mjs logs --lines 100

# Follow logs in real-time
node tools/daemon/index.mjs logs --follow
```

### Restart Daemon

```bash
node tools/daemon/index.mjs restart
```

## Configuration

Configuration stored in `.aiwg/daemon.yaml` (JSON format). Default configuration created on first start.

### Default Configuration

```json
{
  "daemon": {
    "heartbeat_interval_seconds": 30,
    "max_parallel_actions": 3,
    "action_timeout_minutes": 120,
    "log": {
      "max_size_mb": 50,
      "max_files": 5,
      "level": "info"
    }
  },
  "watch": {
    "enabled": true,
    "paths": [
      {
        "path": ".aiwg/",
        "events": ["create", "modify", "delete"],
        "ignore": ["*.tmp", "working/**", "daemon/**"]
      },
      {
        "path": "src/",
        "events": ["modify"],
        "extensions": [".ts", ".js", ".mjs"]
      }
    ],
    "debounce_ms": 2000
  },
  "schedule": {
    "enabled": true,
    "jobs": [
      {
        "id": "health-check",
        "cron": "0 */6 * * *",
        "action": "doctor"
      }
    ]
  }
}
```

## File System Layout

```
.aiwg/
  daemon.pid                  # PID file (only when running)
  daemon.yaml                 # Configuration
  daemon/
    state.json                # Daemon state
    daemon.log                # Current log
    daemon.log.1              # Rotated log
    heartbeat                 # Liveness indicator
    actions/                  # Action outputs
    events/                   # Event history
    .lock                     # Advisory lock file
```

## Lifecycle

### Startup

1. Check for existing daemon (validate PID file)
2. Create directories (`.aiwg/daemon/`, etc.)
3. Acquire advisory lock (`.aiwg/daemon/.lock`)
4. Spawn detached process (or run in foreground)
5. Write PID file (`.aiwg/daemon.pid`)
6. Install signal handlers (SIGTERM, SIGINT, SIGHUP)
7. Load configuration
8. Initialize subsystems (FileWatcher, CronScheduler)
9. Start heartbeat writer
10. Begin event processing

### Shutdown

1. Receive SIGTERM/SIGINT
2. Set shutdown flag (reject new events)
3. Stop event sources (close watchers, clear intervals)
4. Write final state
5. Remove PID file
6. Release lock file
7. Exit gracefully

### Config Reload

Send SIGHUP to reload configuration:

```bash
kill -HUP $(cat .aiwg/daemon.pid)
```

## Docker Usage

Use `--foreground` flag to run as PID 1 in containers:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
CMD ["node", "tools/daemon/index.mjs", "start", "--foreground"]
```

## Features

### File Watching

- Uses `fs.watch` with recursive support
- Debounce mechanism (500ms default)
- Configurable paths and file extensions
- Automatic ignore patterns (node_modules, .git, working/, daemon/)

### Cron Scheduling

- Standard 5-field cron expressions
- Minute-level granularity
- Supports wildcards, ranges, steps, lists
- Example: `0 */6 * * *` = every 6 hours

### Event Routing

- Pub/sub event bus
- Dead letter queue for failed handlers
- Max 3 retries with exponential backoff
- Event history (last 1000 events)

### Log Rotation

- Size-based rotation (50MB default)
- Keep N rotated files (5 default)
- Automatic cleanup of old logs

### Health Monitoring

- Heartbeat file updated every 30s
- State file with uptime, monitors, actions
- PID validation on status check

## Token Security

Configuration never contains secrets. All sensitive values referenced via environment variables:

```json
{
  "webhook": {
    "secret_env": "AIWG_WEBHOOK_SECRET"
  }
}
```

Secrets loaded from `process.env` at runtime.

## Implementation Notes

### Advisory Locking

Uses `fs.openSync(lockFile, 'wx')` for atomic lock acquisition. Prevents multiple daemon instances.

### PID File Management

Atomic write pattern:
```javascript
fs.writeFileSync(`${pidFile}.tmp`, String(pid));
fs.renameSync(`${pidFile}.tmp`, pidFile);
```

### Detached Process

```javascript
const child = spawn(process.execPath, [daemonScript], {
  detached: true,
  stdio: ['ignore', logFd, logFd],
  env: process.env
});
child.unref();
```

### Signal Handling

Graceful shutdown preserves state:
```javascript
process.on('SIGTERM', () => {
  shutdownInProgress = true;
  stopSubsystems();
  writeState();
  cleanup();
  process.exit(0);
});
```

## Testing

Test daemon lifecycle:

```bash
# Start daemon
node tools/daemon/index.mjs start

# Verify running
node tools/daemon/index.mjs status

# Watch logs
node tools/daemon/index.mjs logs --follow &

# Stop daemon
node tools/daemon/index.mjs stop
```

## Troubleshooting

### Daemon won't start

Check for stale PID file:
```bash
cat .aiwg/daemon.pid
ps -p $(cat .aiwg/daemon.pid)
```

If process is dead, remove PID file:
```bash
rm .aiwg/daemon.pid
```

### Daemon won't stop

Force kill:
```bash
kill -9 $(cat .aiwg/daemon.pid)
rm .aiwg/daemon.pid
```

### Check logs

```bash
tail -f .aiwg/daemon/daemon.log
```

### Verify state

```bash
cat .aiwg/daemon/state.json | jq .
```

## References

- ADR: `.aiwg/architecture/adrs/ADR-daemon-mode.md`
- Issue: #312
- Ralph External: `tools/ralph-external/` (background process pattern)
