# ADR: Daemon Mode (`aiwg daemon`)

**Date**: 2026-02-08
**Status**: ACCEPTED
**Author**: Architecture Designer
**Category**: System Architecture
**Issue**: #312

## Reasoning

1. **Problem Analysis**: AIWG is strictly on-demand today. Every action requires a human to invoke a CLI command. This means no proactive monitoring, no automatic responses to CI failures, no scheduled health checks, and no webhook-driven automation. The competitive analysis (G-01, G-07) identifies this as a critical gap: OpenClaw operates 24/7 and proactively manages tasks without prompting. While AIWG should not chase consumer features, a background daemon that monitors development workflows and triggers actions is a natural extension of the existing Ralph loop system.

2. **Constraint Identification**: The daemon must run on Node.js 18+ without native dependencies (preserving AIWG's zero-native-dep guarantee). It must not block the terminal (true background process). It must work inside Docker containers (no systemd, no launchd). It must handle graceful shutdown preserving in-flight state. Token security rules mandate that no secrets appear in configuration files -- environment variables only. Log rotation is required because the daemon runs indefinitely. The daemon must coexist with on-demand CLI usage of the same `.aiwg/` directory without corruption.

3. **Alternative Consideration**: Three architectural approaches were evaluated in depth (see Options below): (A) Node.js `child_process.fork()` with IPC, (B) standalone HTTP microservice, and (C) Unix-style PID-file daemonization via `child_process.spawn({ detached: true })`. Option C was selected because it follows the established pattern from Ralph external, avoids the complexity of IPC channels (which break in Docker), and provides the simplest lifecycle management through standard Unix signals.

4. **Decision Rationale**: The detached-spawn approach mirrors how `ralph-external` already manages long-running processes: PID files, signal handlers, state files, and log capture. It avoids introducing new infrastructure (no HTTP server required for core operation -- the webhook listener is an optional subsystem within the daemon). It degrades cleanly in restricted environments (Docker, CI containers) because it depends only on POSIX signals and the filesystem. The event-action mapping architecture enables extensibility without modifying the daemon core.

5. **Risk Assessment**: The primary risk is orphaned daemon processes if the PID file becomes stale (mitigated by PID validation on startup). A secondary risk is filesystem contention between the daemon and concurrent CLI commands writing to `.aiwg/` (mitigated by using atomic writes and advisory file locks for shared state). A third risk is resource consumption from an always-on file watcher (mitigated by configurable watch paths and debounced event handling). Docker compatibility risk is low because the design avoids systemd, D-Bus, and other OS-specific service managers.

## Context

AIWG is an npm CLI tool (`npm install -g aiwg`) that deploys AI coding agents, manages SDLC workflows, and runs iterative task loops (Ralph). Today, every operation requires explicit user invocation:

```
aiwg use sdlc            # Deploy framework (manual)
aiwg ralph "Fix tests"   # Run loop (manual)
aiwg status              # Check health (manual)
```

There is no mechanism for:
- Watching for file changes and triggering quality checks
- Receiving CI/CD webhooks and responding to build failures
- Running scheduled health audits on a cron-like schedule
- Proactively alerting when `.aiwg/` artifacts drift out of compliance

The competitive analysis identifies "Always-On Agent Mode" (G-01) and "Proactive Agent Behavior" (G-07) as strategic gaps. Ralph external (`tools/ralph-external/`) already demonstrates AIWG's ability to manage long-running background processes with PID tracking, signal handling, state persistence, and crash recovery. The daemon extends this pattern to a persistent monitoring service.

### Existing Background Process Pattern (Ralph External)

Ralph external provides a proven model for background process management in AIWG:

- **PID tracking**: Process identity for lifecycle management
- **Signal handling**: SIGINT/SIGTERM for graceful shutdown with state preservation
- **State persistence**: JSON state files in `.aiwg/ralph-external/` survive crashes
- **Crash recovery**: `--resume` flag restores from persisted state
- **Heartbeat monitoring**: `ProcessMonitor` detects stale processes
- **Multi-loop coordination**: `ExternalMultiLoopStateManager` prevents resource conflicts

The daemon should reuse these patterns rather than inventing new infrastructure.

## Decision

Implement `aiwg daemon` as a **detached Node.js process** using Unix-style PID-file daemonization, with an event-driven architecture that maps file system events, webhook payloads, and cron schedules to configurable actions.

### Architecture Overview

```
                                    .aiwg/daemon.yaml
                                          |
                                    [Configuration]
                                          |
                        +----------------------------------+
                        |         Daemon Process            |
                        |  PID: .aiwg/daemon.pid            |
                        |  Log: .aiwg/daemon/daemon.log     |
                        |                                    |
                        |  +------------------------------+  |
                        |  |       Event Router            |  |
                        |  |  (maps events to actions)     |  |
                        |  +--------+-------+---------+---+  |
                        |           |       |         |       |
                        |    +------+  +----+---+ +---+----+  |
                        |    |      |  |        | |        |  |
                        |  +-v----+ | +v------+ | +v-----+ |  |
                        |  |File  | | |Webhook| | |Cron  | |  |
                        |  |Watch | | |Listen | | |Sched | |  |
                        |  +------+ | +-------+ | +------+ |  |
                        |           |           |           |
                        |  +--------v-----------v--------+  |
                        |  |       Action Executor         |  |
                        |  |  ralph, doctor, status, ...   |  |
                        |  +-------------------------------+  |
                        |                                      |
                        |  +-------------------------------+  |
                        |  |       State Manager            |  |
                        |  |  .aiwg/daemon/state.json       |  |
                        |  +-------------------------------+  |
                        +--------------------------------------+

    CLI Interface:
    +-----------+    +-----------+    +-----------+    +-----------+
    |aiwg daemon|    |aiwg daemon|    |aiwg daemon|    |aiwg daemon|
    |  start    |    |  stop     |    |  status   |    |  logs     |
    +-----------+    +-----------+    +-----------+    +-----------+
         |                |                |                |
         v                v                v                v
    spawn detached   send SIGTERM   read state.json   tail daemon.log
    write daemon.pid  wait for exit  read daemon.pid
```

### Component Diagram

```
+==========================================+
|              aiwg daemon                  |
|==========================================|
|                                          |
|  +------------------------------------+  |
|  |          Lifecycle Manager          |  |
|  |  - PID file: .aiwg/daemon.pid      |  |
|  |  - Signal handlers (SIGTERM/INT)    |  |
|  |  - Heartbeat writer                 |  |
|  |  - Graceful shutdown orchestrator   |  |
|  +------------------------------------+  |
|                                          |
|  +------------------------------------+  |
|  |         Event Sources               |  |
|  |                                    |  |
|  |  [FileWatcher]  watches configurable  |
|  |    paths via fs.watch/chokidar        |
|  |                                    |  |
|  |  [WebhookListener]  HTTP server on    |
|  |    configurable port (optional)       |
|  |                                    |  |
|  |  [CronScheduler]  setInterval-based   |
|  |    scheduling with cron syntax        |  |
|  +------------------------------------+  |
|                                          |
|  +------------------------------------+  |
|  |         Event Router                |  |
|  |  - Pattern matching on events       |  |
|  |  - Route to configured actions      |  |
|  |  - Debounce/throttle support        |  |
|  |  - Event history/dedup             |  |
|  +------------------------------------+  |
|                                          |
|  +------------------------------------+  |
|  |        Action Executor              |  |
|  |  - Spawn aiwg CLI commands          |  |
|  |  - Spawn Ralph loops               |  |
|  |  - Execute shell commands           |  |
|  |  - Send notifications               |  |
|  |  - Queue management (max parallel)  |  |
|  +------------------------------------+  |
|                                          |
|  +------------------------------------+  |
|  |         Logger                      |  |
|  |  - Rotating file logger             |  |
|  |  - Max file size + retention        |  |
|  |  - JSON structured log entries      |  |
|  +------------------------------------+  |
|                                          |
|  +------------------------------------+  |
|  |         State Manager               |  |
|  |  - Daemon uptime, restart count     |  |
|  |  - Recent actions history           |  |
|  |  - Active monitors registry         |  |
|  |  - Health metrics                   |  |
|  +------------------------------------+  |
|                                          |
+==========================================+
```

### CLI Subcommands

| Command | Description | Mechanism |
|---------|-------------|-----------|
| `aiwg daemon start` | Start background daemon | `child_process.spawn({ detached: true, stdio: 'ignore' })`, write `.aiwg/daemon.pid` |
| `aiwg daemon stop` | Graceful shutdown | Read PID from `.aiwg/daemon.pid`, send `SIGTERM`, wait up to 10s, then `SIGKILL` |
| `aiwg daemon status` | Show daemon health | Read `.aiwg/daemon/state.json`, validate PID is alive, display uptime/actions/monitors |
| `aiwg daemon logs` | Tail daemon log | Stream `.aiwg/daemon/daemon.log` (supports `--follow`, `--lines N`) |
| `aiwg daemon restart` | Stop then start | Convenience alias for stop + start |

### Startup Sequence

```
1. Check for existing daemon
   - Read .aiwg/daemon.pid
   - If PID exists AND process is alive: abort with "daemon already running"
   - If PID exists AND process is dead: remove stale PID file, continue

2. Load configuration
   - Read .aiwg/daemon.yaml (or defaults if absent)
   - Validate configuration schema

3. Spawn daemon process
   - child_process.spawn(process.execPath, ['daemon-main.mjs'], {
       detached: true,
       stdio: ['ignore', logFd, logFd],
       env: { ...process.env }  // Inherit env vars (tokens via env)
     })
   - child.unref()  // Allow parent to exit

4. Daemon main process initializes:
   - Write .aiwg/daemon.pid with own PID
   - Install signal handlers (SIGTERM, SIGINT, SIGHUP)
   - Initialize event sources from config
   - Initialize state manager
   - Start heartbeat writer (every 30s)
   - Log "Daemon started" with config summary

5. CLI parent exits, returning to terminal
```

### Shutdown Sequence

```
1. Receive SIGTERM (or SIGINT)
2. Set shutting_down flag (reject new events)
3. Drain action queue (wait for in-flight actions, max 30s)
4. Stop event sources:
   - Close file watchers
   - Close webhook HTTP server
   - Clear cron intervals
5. Persist final state to .aiwg/daemon/state.json
6. Remove .aiwg/daemon.pid
7. Log "Daemon stopped gracefully"
8. process.exit(0)
```

### Configuration Schema (`.aiwg/daemon.yaml`)

```yaml
# .aiwg/daemon.yaml
# All secrets via environment variables - NEVER in this file

daemon:
  # Heartbeat interval for liveness detection
  heartbeat_interval_seconds: 30

  # Maximum parallel actions
  max_parallel_actions: 3

  # Action timeout (prevents runaway processes)
  action_timeout_minutes: 120

  # Log rotation
  log:
    max_size_mb: 50
    max_files: 5
    level: info  # debug, info, warn, error

# File watcher configuration
watch:
  enabled: true
  paths:
    - path: ".aiwg/"
      events: [create, modify, delete]
      ignore: ["*.tmp", "working/**", "daemon/**"]
    - path: "src/"
      events: [modify]
      extensions: [".ts", ".js", ".mjs"]
    - path: "test/"
      events: [modify]
      extensions: [".test.ts", ".test.js"]
  debounce_ms: 2000

# Webhook listener configuration
webhook:
  enabled: false
  port: 9471
  host: "127.0.0.1"
  # Secret for HMAC signature verification
  # Value from: AIWG_WEBHOOK_SECRET env var
  secret_env: "AIWG_WEBHOOK_SECRET"
  endpoints:
    - path: "/ci"
      method: POST
    - path: "/health"
      method: GET

# Scheduled checks
schedule:
  enabled: true
  jobs:
    - id: "health-check"
      cron: "0 */6 * * *"  # Every 6 hours
      action: doctor
    - id: "artifact-audit"
      cron: "0 9 * * 1"    # Monday 9am
      action: validate-metadata

# Event-to-action mapping
rules:
  - id: "ci-failure-ralph"
    description: "Trigger Ralph on CI failure webhook"
    event:
      source: webhook
      path: "/ci"
      match:
        status: "failure"
    action:
      type: ralph
      objective: "Fix CI failure: {{event.payload.message}}"
      completion: "{{event.payload.check_command}}"
      max_iterations: 5
    cooldown_minutes: 30

  - id: "test-change-validate"
    description: "Run tests when test files change"
    event:
      source: watch
      path_pattern: "test/**/*.test.*"
    action:
      type: shell
      command: "npm test"
    cooldown_minutes: 5

  - id: "aiwg-artifact-check"
    description: "Validate artifacts when .aiwg/ changes"
    event:
      source: watch
      path_pattern: ".aiwg/requirements/**"
    action:
      type: cli
      command: "validate-metadata"
    cooldown_minutes: 10

  - id: "scheduled-doctor"
    description: "Periodic health check"
    event:
      source: schedule
      job_id: "health-check"
    action:
      type: cli
      command: "doctor"
```

### Key Interfaces

#### Event Interface

```typescript
interface DaemonEvent {
  id: string;               // Unique event ID (UUID)
  timestamp: string;        // ISO 8601
  source: 'watch' | 'webhook' | 'schedule' | 'manual';
  type: string;             // e.g., "file.modified", "webhook.received", "cron.fired"
  payload: {
    // Source-specific payload
    path?: string;           // File watcher: changed path
    event_type?: string;     // File watcher: create/modify/delete
    method?: string;         // Webhook: HTTP method
    endpoint?: string;       // Webhook: matched endpoint path
    body?: unknown;          // Webhook: request body
    job_id?: string;         // Schedule: cron job ID
    [key: string]: unknown;
  };
}
```

#### Action Interface

```typescript
interface DaemonAction {
  id: string;               // Unique action ID (UUID)
  rule_id: string;          // Rule that triggered this action
  event_id: string;         // Event that triggered this action
  type: 'ralph' | 'cli' | 'shell' | 'notify';
  config: {
    // Type-specific configuration
    command?: string;        // cli/shell: command to execute
    objective?: string;      // ralph: task objective
    completion?: string;     // ralph: completion criteria
    max_iterations?: number; // ralph: iteration limit
    channel?: string;        // notify: notification channel
    message?: string;        // notify: message template
  };
  status: 'queued' | 'running' | 'completed' | 'failed' | 'timeout';
  started_at?: string;
  completed_at?: string;
  exit_code?: number;
  output_path?: string;     // Path to action output log
}
```

#### State Interface

```typescript
interface DaemonState {
  pid: number;
  started_at: string;
  last_heartbeat: string;
  uptime_seconds: number;
  restart_count: number;
  config_hash: string;       // SHA-256 of daemon.yaml for drift detection

  monitors: {
    file_watcher: {
      enabled: boolean;
      paths: string[];
      events_received: number;
    };
    webhook: {
      enabled: boolean;
      port: number;
      requests_received: number;
    };
    scheduler: {
      enabled: boolean;
      jobs: number;
      last_fires: Record<string, string>;  // job_id -> last fire timestamp
    };
  };

  recent_actions: DaemonAction[];  // Last 50 actions (ring buffer)
  active_actions: DaemonAction[];  // Currently running actions

  health: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    last_check: string;
    issues: string[];
  };
}
```

### File System Layout

```
.aiwg/
  daemon.pid                  # PID file (exists only when daemon is running)
  daemon.yaml                 # Configuration (user-editable)
  daemon/
    state.json                # Daemon state (written by daemon)
    daemon.log                # Current log file
    daemon.log.1              # Rotated log
    daemon.log.2              # Rotated log
    actions/                  # Action output logs
      <action-id>.log         # stdout/stderr of each action
    events/                   # Event history (optional, for debugging)
      <date>.jsonl            # JSONL event log per day
```

### File Watcher Implementation

The file watcher uses Node.js `fs.watch` (recursive where supported) with a debounce layer. On platforms where recursive `fs.watch` is not reliable (some Linux configurations), fall back to watching individual directories or optionally use `chokidar` as a peer dependency.

```typescript
// Pseudocode for file watcher with debounce
class FileWatcher {
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private debounceMs: number;

  onRawEvent(eventType: string, filename: string): void {
    const key = `${eventType}:${filename}`;

    // Clear previous timer for this file
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Set new debounced emission
    this.timers.set(key, setTimeout(() => {
      this.emit('event', {
        source: 'watch',
        type: `file.${eventType}`,
        payload: { path: filename, event_type: eventType },
      });
      this.timers.delete(key);
    }, this.debounceMs));
  }
}
```

### Webhook Listener Implementation

The webhook listener uses Node.js built-in `http.createServer` (no Express, no dependencies). It validates HMAC signatures when a secret is configured.

```typescript
// Pseudocode for webhook listener
class WebhookListener {
  start(config: WebhookConfig): void {
    this.server = http.createServer(async (req, res) => {
      // Match endpoint
      const endpoint = config.endpoints.find(
        e => e.path === req.url && e.method === req.method
      );

      if (!endpoint) {
        res.writeHead(404);
        res.end();
        return;
      }

      // Validate HMAC signature if secret configured
      if (config.secret_env) {
        const secret = process.env[config.secret_env];
        if (!secret || !this.validateSignature(req, secret)) {
          res.writeHead(401);
          res.end();
          return;
        }
      }

      // Parse body and emit event
      const body = await this.parseBody(req);
      this.emit('event', {
        source: 'webhook',
        type: 'webhook.received',
        payload: { method: req.method, endpoint: req.url, body },
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ accepted: true }));
    });

    this.server.listen(config.port, config.host);
  }
}
```

### Cron Scheduler Implementation

The scheduler uses `setInterval` with minute-granularity cron expression matching. No external cron library is required; a minimal cron parser handles standard 5-field expressions.

```typescript
// Pseudocode for cron scheduler
class CronScheduler {
  private intervals: Map<string, NodeJS.Timeout> = new Map();

  start(jobs: CronJob[]): void {
    // Check every 60 seconds
    for (const job of jobs) {
      const interval = setInterval(() => {
        if (this.cronMatches(job.cron, new Date())) {
          this.emit('event', {
            source: 'schedule',
            type: 'cron.fired',
            payload: { job_id: job.id },
          });
        }
      }, 60_000);

      this.intervals.set(job.id, interval);
    }
  }
}
```

### Action Executor

The action executor manages a bounded queue of parallel actions. Each action spawns a child process and captures its output.

```typescript
// Pseudocode for action executor
class ActionExecutor {
  private running: Map<string, ChildProcess> = new Map();
  private queue: DaemonAction[] = [];
  private maxParallel: number;

  async execute(action: DaemonAction): Promise<void> {
    if (this.running.size >= this.maxParallel) {
      this.queue.push(action);
      return;
    }

    action.status = 'running';
    action.started_at = new Date().toISOString();

    const outputPath = `.aiwg/daemon/actions/${action.id}.log`;
    const outputFd = fs.openSync(outputPath, 'w');

    let child: ChildProcess;

    switch (action.type) {
      case 'ralph':
        child = spawn('node', [
          'tools/ralph-external/index.mjs',
          action.config.objective,
          '--completion', action.config.completion,
          '--max-iterations', String(action.config.max_iterations || 5),
        ], { stdio: ['ignore', outputFd, outputFd] });
        break;

      case 'cli':
        child = spawn('aiwg', [action.config.command], {
          stdio: ['ignore', outputFd, outputFd],
        });
        break;

      case 'shell':
        child = spawn('sh', ['-c', action.config.command], {
          stdio: ['ignore', outputFd, outputFd],
        });
        break;
    }

    this.running.set(action.id, child);

    // Set timeout
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      action.status = 'timeout';
    }, this.timeoutMs);

    child.on('exit', (code) => {
      clearTimeout(timeout);
      action.status = code === 0 ? 'completed' : 'failed';
      action.exit_code = code;
      action.completed_at = new Date().toISOString();
      action.output_path = outputPath;
      this.running.delete(action.id);
      this.drainQueue();
    });
  }
}
```

### Docker Compatibility

The daemon operates inside Docker containers without modification because it relies only on:

- `process.pid` for PID file management
- POSIX signals (`SIGTERM`, `SIGINT`) for lifecycle management
- `fs.watch` for file monitoring (works in Docker volumes)
- `http.createServer` for webhook listening (requires port mapping)
- `setInterval` for scheduling (no crontab needed)

**Docker usage**:

```dockerfile
# In application Dockerfile
CMD ["aiwg", "daemon", "start", "--foreground"]
```

The `--foreground` flag keeps the daemon in the foreground (does not detach), which is required for Docker's PID 1 management. In foreground mode, the daemon skips the `spawn({ detached: true })` step and runs directly in the main process.

### Token Security

Per the token security rules (`.claude/rules/token-security.md`), the daemon configuration file (`.aiwg/daemon.yaml`) never contains secrets. All sensitive values are referenced via environment variable names:

```yaml
# CORRECT: reference env var name
webhook:
  secret_env: "AIWG_WEBHOOK_SECRET"  # Loaded via process.env at runtime

# FORBIDDEN: hard-coded secret
webhook:
  secret: "my-secret-token"  # NEVER
```

The daemon inherits its parent's environment when spawned, so tokens set in the shell are available to the daemon process. For Docker, secrets are passed via `docker run -e` or Docker secrets.

### Log Rotation

The daemon implements log rotation internally using a simple size-based rotator:

```
When daemon.log exceeds max_size_mb:
  1. Rename daemon.log.{N-1} -> daemon.log.{N} (for N = max_files down to 1)
  2. Rename daemon.log -> daemon.log.1
  3. Create new daemon.log
  4. Delete daemon.log.{max_files+1} if exists
```

This avoids dependency on `logrotate` or other OS-level tools, ensuring Docker compatibility.

### Concurrency with On-Demand CLI

The daemon and on-demand CLI commands operate on the same `.aiwg/` directory. Contention is managed by:

1. **Advisory lock file**: `.aiwg/daemon/.lock` held by daemon during state writes
2. **Atomic writes**: State updates write to `.tmp` then rename (atomic on POSIX)
3. **Read-safe state**: CLI reads state.json which is always a complete snapshot
4. **Action isolation**: Each action writes to its own log file under `actions/`
5. **Ralph coordination**: The daemon uses the existing `ExternalMultiLoopStateManager` to coordinate with any manually-launched Ralph loops

## Consequences

### Positive

- **Proactive automation**: AIWG can respond to events without human invocation, closing the G-01 and G-07 gaps identified in the competitive analysis
- **CI/CD integration**: Webhook listener enables direct integration with Gitea, GitHub, GitLab CI pipelines -- build failures can trigger Ralph loops automatically
- **Scheduled maintenance**: Periodic health checks, metadata validation, and artifact audits run unattended
- **Reuses proven patterns**: The lifecycle management (PID files, signals, state persistence) is already battle-tested in Ralph external
- **No new dependencies**: Uses only Node.js built-ins (`fs.watch`, `http`, `child_process`, `crypto`)
- **Docker-compatible**: Works in containers with `--foreground` mode, no OS-specific service managers
- **Extensible rule system**: New event types and action types can be added without modifying the daemon core
- **Token-secure**: Inherits environment variables; no secrets in config files

### Negative

- **Resource consumption**: An always-on Node.js process consumes memory (~30-60 MB) even when idle; file watchers consume inotify handles on Linux (configurable via `fs.inotify.max_user_watches`)
- **Process management complexity**: Orphan detection, stale PID cleanup, and signal handling add edge cases that must be thoroughly tested
- **Configuration surface area**: `.aiwg/daemon.yaml` introduces a new configuration surface with its own schema, validation, and documentation needs
- **Debugging difficulty**: Background processes are harder to debug than interactive CLI commands; structured logging and `aiwg daemon logs` mitigate this but do not eliminate it
- **Port conflicts**: The webhook listener may conflict with other services on the configured port; defaults to an uncommon port (9471) and is disabled by default
- **Action cascades**: A single event triggering Ralph, which modifies files, which triggers more events, could create feedback loops; cooldown timers mitigate but do not prevent all cases

### Neutral

- The daemon is optional -- AIWG continues to function as a pure CLI tool without it
- Users who do not need background monitoring can ignore `aiwg daemon` entirely
- The `.aiwg/daemon/` directory is safe to delete (daemon recreates it on start)
- Future enhancements (Slack/Discord notifications, browser automation triggers) plug into the existing event/action architecture

## Options Considered

### Option A: Node.js `child_process.fork()` with IPC

**Description**: Use `fork()` to create the daemon, maintaining an IPC channel between the CLI parent and the daemon child. CLI commands communicate with the daemon via IPC messages.

**Pros**:
- Structured communication between CLI and daemon
- No HTTP server needed for internal commands
- Type-safe message passing

**Cons**:
- IPC channel requires the parent process to remain running (defeats the purpose of backgrounding)
- IPC breaks when the parent exits -- the channel is file-descriptor based and does not persist
- Does not work in Docker where the container expects a single foreground process
- More complex than needed -- most CLI-to-daemon communication is simple (start/stop/status)

**Decision**: REJECTED. IPC channels are inherently tied to the parent process lifetime, making true daemonization impossible without additional workarounds (Unix domain sockets, named pipes) that add complexity.

### Option B: Standalone HTTP Microservice

**Description**: Run the daemon as a persistent HTTP server. All CLI commands (`start`, `stop`, `status`, `logs`) communicate via HTTP requests to the daemon.

**Pros**:
- Clean request/response model for all commands
- Remote management possible (status check from another machine)
- Familiar pattern for web developers

**Cons**:
- Requires the HTTP server to always be running for basic lifecycle commands, creating a chicken-and-egg problem (how do you start the daemon if the daemon IS the HTTP server?)
- Port management is complex (conflicts, firewall rules, security implications)
- Overkill for lifecycle management -- `stop` is just `kill(pid, SIGTERM)`
- Security concern: an HTTP server accepting commands is an attack surface
- Does not follow Unix daemon conventions (PID files, signals)

**Decision**: REJECTED. HTTP as the primary control plane is overengineered for a CLI tool. The webhook listener IS included in the selected option, but as an optional event source, not as the lifecycle management mechanism.

### Option C: Unix-Style PID-File Daemonization (Selected)

**Description**: Use `child_process.spawn({ detached: true })` to create a truly backgrounded process. Manage lifecycle via PID file and Unix signals. State communicated via filesystem.

**Pros**:
- Follows established Unix daemon conventions (PID files, signals, log files)
- Matches Ralph external's existing pattern -- proven in AIWG codebase
- True background process -- CLI exits immediately
- Works in Docker with `--foreground` flag
- No port needed for lifecycle management
- Simple to implement, test, and debug

**Cons**:
- Signal-based communication is limited (cannot send structured messages via signals)
- PID file can become stale on crash (mitigated by PID validation)
- Platform differences in `detached` behavior on Windows (mitigated by documenting Linux/macOS support; Windows support via `--foreground` only)

**Decision**: SELECTED. This approach provides true backgrounding, follows Unix conventions familiar to the target audience, reuses patterns already proven in Ralph external, and works in Docker containers.

## Implementation Roadmap

### Phase 1: Core Daemon (Week 1-2)

- Lifecycle manager (start/stop/status/logs)
- PID file management with stale detection
- Signal handler (SIGTERM, SIGINT, SIGHUP for config reload)
- Structured JSON logger with rotation
- State manager with heartbeat
- `--foreground` mode for Docker
- Configuration loader with schema validation
- Extension definitions for daemon commands in `definitions.ts`

### Phase 2: Event Sources (Week 3-4)

- File watcher with debounce and configurable paths
- Cron scheduler with 5-field expression parser
- Webhook listener with HMAC signature validation
- Event router with pattern matching and cooldown

### Phase 3: Action System (Week 5-6)

- Action executor with bounded parallelism
- Action types: `cli`, `shell`, `ralph`, `notify`
- Action timeout and cleanup
- Integration with `ExternalMultiLoopStateManager`
- Action output capture and log management

### Phase 4: Integration & Hardening (Week 7-8)

- Integration tests in Docker
- Orphan process detection and cleanup
- Feedback loop prevention (event cascade detection)
- Documentation (`docs/daemon.md`, `docs/daemon-configuration.md`)
- `aiwg doctor` checks for daemon health

## Related ADRs

- **ADR-002**: Multi-Agent Orchestration Pattern -- daemon can trigger orchestrated workflows
- **ADR-cross-platform-feature-adoption**: Daemon operates at the `.aiwg/` layer (Layer 1), platform-agnostic

## References

- @tools/ralph-external/index.mjs -- Existing background process pattern (PID, signals, state)
- @tools/ralph-external/orchestrator.mjs -- Orchestration loop with graceful shutdown
- @.aiwg/reports/competitive-analysis-openclaw-moltbot-aiwg.md -- G-01 (Always-On) and G-07 (Proactive) gaps
- @src/extensions/commands/definitions.ts -- Command extension pattern for daemon subcommands
- @.claude/rules/token-security.md -- Token security rules (env vars only)
- Issue #312 -- Parent issue for daemon implementation

## Implementation Addendum (2026-02)

**Implemented in**: #312, #315, #316, #317, #318

### Status Change

This ADR was accepted and implemented across PRs #312 (core daemon), #315 (IPC server + agent supervisor), #316 (task store + automation engine), #317 (tmux manager + REPL chat), and #318 (request channel integration). The implementation follows Option C as specified, with the additions documented below.

### Configuration Format Clarification

The original ADR references `.aiwg/daemon.yaml` as the configuration file. The implementation uses `.aiwg/daemon.json` (JSON format) via the existing `Config` class (`tools/daemon/config.mjs`). This change was made for consistency with other AIWG configuration files (e.g., `.aiwg/frameworks/registry.json`, `.aiwg/daemon/state.json`) which all use JSON. The configuration schema and semantics remain as specified in this ADR; only the serialization format differs.

### Option A Reconciliation

The ADR rejects Option A's `child_process.fork()` with built-in IPC channels. The implementation adopts Unix domain socket IPC (`tools/daemon/ipc-server.mjs`), which is a fundamentally different mechanism from Node.js fork IPC channels:

- **Fork IPC** (rejected): Requires parent-child process relationship, channels break in Docker, tight coupling between launcher and daemon
- **Unix socket IPC** (adopted): Independent processes, works in any POSIX environment including Docker, JSON-RPC 2.0 protocol, client-server model

The Unix socket approach is consistent with Option C's philosophy of standard Unix primitives (PID files, signals, filesystem). The socket lives at `.aiwg/daemon/daemon.sock` with permissions `0o600`.

### Subsystems Not in Original ADR

The implementation includes 8 subsystems beyond the original ADR scope. These emerged during construction as natural extensions of the daemon architecture:

| Subsystem | File | Purpose |
|-----------|------|---------|
| IPC Server | `tools/daemon/ipc-server.mjs` | JSON-RPC 2.0 over Unix domain socket for CLI↔daemon communication |
| IPC Client | `tools/daemon/ipc-client.mjs` | Client library for connecting to the daemon socket |
| Agent Supervisor | `tools/daemon/agent-supervisor.mjs` | Spawns and tracks `claude -p` subprocess tasks with concurrency limits |
| Task Store | `tools/daemon/task-store.mjs` | Persistent task queue at `.aiwg/daemon/tasks.json` |
| Automation Engine | `tools/daemon/automation-engine.mjs` | Trigger→condition→action rules evaluated against daemon events |
| Tmux Manager | `tools/daemon/tmux-manager.mjs` | Session management for interactive terminal workflows |
| REPL Chat | `tools/daemon/repl-chat.mjs` | Interactive terminal chat interface to the daemon |
| Request Channel | (integrated in daemon-main.mjs) | Daemon-client protocol for structured request/response |

#### Initialization Order

```
EventRouter → TaskStore → AgentSupervisor → AutomationEngine → IPCServer → FileWatcher → CronScheduler → MessagingHub
```

#### IPC Protocol

The IPC server implements JSON-RPC 2.0 with newline-delimited JSON framing. Registered methods:

| Method | Parameters | Description |
|--------|-----------|-------------|
| `daemon.status` | none | Returns daemon health, uptime, subsystem status |
| `task.submit` | `{prompt, agent?, priority?}` | Submit a task to the agent supervisor |
| `task.cancel` | `{taskId}` | Cancel a queued or running task |
| `task.list` | `{state?, limit?}` | List tasks with optional filtering |
| `task.get` | `{taskId}` | Get detailed task information |
| `task.stats` | none | Aggregate task statistics |
| `automation.status` | none | Automation engine state and rule list |
| `automation.enable` | `{ruleId?}` | Enable automation (globally or per-rule) |
| `automation.disable` | `{ruleId?}` | Disable automation (globally or per-rule) |
| `chat.send` | `{message, priority?}` | Submit a chat message as a task |
| `ping` | none | Health check (returns `{pong: true}`) |

Standard JSON-RPC error codes: `-32700` (parse), `-32600` (invalid request), `-32601` (method not found), `-32602` (invalid params), `-32603` (internal error).

### Updated File Structure

The daemon directory now contains:

```
tools/daemon/
├── daemon-main.mjs          # Main daemon process (entry point)
├── index.mjs                # CLI entry point (start/stop/status)
├── config.mjs               # Configuration loader and validator
├── event-router.mjs         # Event routing and dispatch
├── file-watcher.mjs         # File system monitoring
├── cron-scheduler.mjs       # Cron-like scheduled tasks
├── ipc-server.mjs           # JSON-RPC 2.0 Unix socket server
├── ipc-client.mjs           # Client library for daemon socket
├── agent-supervisor.mjs     # Claude subprocess management
├── task-store.mjs           # Persistent task queue
├── automation-engine.mjs    # Trigger→condition→action rules
├── tmux-manager.mjs         # Tmux session management
├── repl-chat.mjs            # Interactive terminal chat
└── README.md                # Developer documentation
```

### Shutdown Sequence

The implementation follows a staged shutdown for graceful termination:

1. **IPC Server**: Stop accepting new connections
2. **Agent Supervisor**: Drain running tasks (15s timeout), cancel queued tasks
3. **Messaging Hub**: Disconnect all platform adapters
4. **Subsystems**: Stop file watcher and cron scheduler
5. **State**: Write final state to `.aiwg/daemon/state.json`
6. **Cleanup**: Remove PID file and lock file

### Cross-References

- ADR-ipc-protocol.md — Detailed IPC protocol specification
- ADR-messaging-bot-mode.md — Messaging subsystem architecture
- ADR-2way-chat.md — 2-way AI chat architecture
- `docs/daemon-guide.md` — User guide
- `tools/daemon/README.md` — Developer documentation
