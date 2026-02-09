# ADR: IPC Protocol (JSON-RPC 2.0 over Unix Socket)

**Date**: 2026-02-09
**Status**: ACCEPTED
**Author**: Architecture Designer
**Category**: Communication Protocol
**Issue**: #315
**Depends On**: #312 (Daemon Mode)

## Reasoning

1. **Problem Analysis**: The daemon (#312) runs as a detached background process. CLI commands (`aiwg daemon status`, `aiwg task submit`) and future GUI/web clients need a way to communicate with the running daemon. The communication must support request/response patterns (status queries, task submission) and potentially server-push patterns (event streaming). The protocol must work in Docker containers, across user sessions, and without requiring network ports.

2. **Constraint Identification**: (a) Must work without network ports (Docker containers may not expose ports). (b) Must be accessible only to the local user (security). (c) Must support bidirectional communication. (d) Must be simple to implement without additional dependencies. (e) Must handle concurrent clients. (f) Must survive client disconnections gracefully.

3. **Alternative Consideration**: Four approaches were evaluated:
   - **HTTP REST server**: Well-understood, but requires a port (conflicts in Docker, firewall issues), adds weight for a local-only protocol.
   - **Named pipes / FIFOs**: Simple but unidirectional per pipe, complex lifecycle management, no built-in framing.
   - **stdin/stdout of daemon process**: Requires parent-child relationship, breaks with `detached: true` spawn.
   - **Unix domain socket with JSON-RPC 2.0**: Local-only by nature, file-permission security, bidirectional, well-specified framing protocol. Selected.

4. **Decision Rationale**: Unix domain sockets provide local-only communication with file-permission security (0o600 = owner only). JSON-RPC 2.0 is a minimal, well-specified RPC protocol that maps naturally to the daemon's method-based API surface. Newline-delimited JSON framing is trivial to implement with Node.js streams. No external dependencies are required -- `net.createServer()` handles Unix sockets natively.

5. **Risk Assessment**: (a) Socket file cleanup on crash -- mitigated by checking for stale sockets on startup and unlinking. (b) Concurrent client access -- mitigated by Node.js event loop serialization for state mutations. (c) Message framing errors -- mitigated by newline-delimited JSON with error recovery per connection.

## Context

The AIWG daemon runs as a detached Node.js process with PID-file lifecycle management (ADR-daemon-mode.md). Multiple clients need to communicate with it:

- `aiwg daemon status` -- Query daemon health
- `aiwg task submit "Fix tests"` -- Submit work to the agent supervisor
- `aiwg task list` -- View queued/running tasks
- `aiwg daemon stop` -- Request graceful shutdown
- Future: Web UI, IDE extensions, monitoring tools

Without IPC, the only communication channel is the filesystem (state files, PID files), which is slow, not real-time, and does not support request/response semantics.

The daemon exposes a method-based API surface where each operation maps to a discrete function call with typed parameters and a structured return value. This maps naturally to a remote procedure call protocol rather than a resource-oriented REST pattern.

## Decision

Adopt **JSON-RPC 2.0** over **Unix domain sockets** with **newline-delimited JSON** framing.

### Transport Layer

- **Socket type**: Unix domain socket (AF_UNIX, SOCK_STREAM)
- **Socket path**: `.aiwg/daemon/daemon.sock` (project-relative)
- **Permissions**: `0o600` (owner read/write only)
- **Cleanup**: Socket file unlinked on daemon startup (if stale) and shutdown
- **Backlog**: Default `net.Server` backlog (511 on Linux)

The socket path is relative to the project root, co-located with other daemon state files (PID file, state JSON). This ensures each project has an independent daemon instance with no cross-project interference.

### Protocol Layer

JSON-RPC 2.0 as specified in https://www.jsonrpc.org/specification:

**Request**:
```json
{"jsonrpc": "2.0", "method": "daemon.status", "params": {}, "id": 1}
```

**Response (success)**:
```json
{"jsonrpc": "2.0", "result": {"pid": 12345, "uptime_seconds": 3600}, "id": 1}
```

**Response (error)**:
```json
{"jsonrpc": "2.0", "error": {"code": -32601, "message": "Method not found"}, "id": 1}
```

**Notification (no response expected)**:
```json
{"jsonrpc": "2.0", "method": "event.taskCompleted", "params": {"taskId": "abc123"}}
```

Notifications omit the `id` field and do not receive a response. They are used for server-push events when the daemon broadcasts state changes to connected clients.

### Framing

Newline-delimited JSON (NDJSON): each JSON-RPC message is a single line terminated by `\n`. This allows simple parsing with `data.split('\n')` and handles partial reads by buffering until a complete line arrives.

**Buffer strategy**: Each client connection maintains its own buffer string. Incoming data is appended to the buffer. On each `data` event, the buffer is split by `\n`. Complete lines (all elements except the last) are parsed as JSON-RPC messages. The final element (which may be an incomplete line or empty string) is retained as the new buffer contents.

```javascript
let buffer = '';
socket.on('data', (chunk) => {
  buffer += chunk.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop(); // retain incomplete line
  for (const line of lines) {
    if (line.trim()) {
      handleMessage(JSON.parse(line));
    }
  }
});
```

### Error Codes

Standard JSON-RPC 2.0 error codes:

| Code | Name | Description |
|------|------|-------------|
| `-32700` | Parse Error | Invalid JSON received |
| `-32600` | Invalid Request | JSON is not a valid JSON-RPC request |
| `-32601` | Method Not Found | Requested method does not exist |
| `-32602` | Invalid Params | Invalid method parameters |
| `-32603` | Internal Error | Server-side error during method execution |

Application-specific error codes (reserved range -32000 to -32099):

| Code | Name | Description |
|------|------|-------------|
| `-32000` | Task Not Found | Referenced task ID does not exist |
| `-32001` | Task Not Cancellable | Task is in a terminal state |
| `-32002` | Queue Full | Task queue has reached capacity |
| `-32003` | Subsystem Unavailable | Required subsystem not initialized |

### Registered Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `ping` | none | `{pong: true, timestamp}` | Health check |
| `daemon.status` | none | `{pid, uptime_seconds, health, subsystems}` | Full daemon status |
| `daemon.stop` | `{force?}` | `{stopping: true}` | Request graceful shutdown |
| `task.submit` | `{prompt, agent?, priority?}` | `{taskId, state}` | Submit task to agent supervisor |
| `task.cancel` | `{taskId}` | `{cancelled: boolean}` | Cancel queued/running task |
| `task.list` | `{state?, limit?}` | `[{id, prompt, state, ...}]` | List tasks |
| `task.get` | `{taskId}` | `{id, prompt, state, result, ...}` | Get task details |
| `task.stats` | none | `{total, running, queued, completed, failed}` | Aggregate statistics |
| `automation.status` | none | `{enabled, rules: [...]}` | Automation engine state |
| `automation.enable` | `{ruleId?}` | `{enabled: true}` | Enable automation |
| `automation.disable` | `{ruleId?}` | `{enabled: false}` | Disable automation |
| `chat.send` | `{message, priority?}` | `{taskId}` | Submit chat message as task |

Methods are namespaced by subsystem (`daemon.*`, `task.*`, `automation.*`, `chat.*`). New methods can be registered dynamically as subsystems are added.

### Server Implementation

The IPC server (`tools/daemon/ipc-server.mjs`) provides:

- `registerMethod(name, handler)` -- Register a single RPC method with an async handler function
- `registerMethods(map)` -- Register multiple methods from an object (keys are method names, values are handlers)
- `start()` -- Begin listening on the Unix socket, returns a Promise that resolves when the server is ready
- `stop()` -- Stop accepting connections, close all existing connections, unlink the socket file
- `broadcast(message)` -- Send a JSON-RPC notification to all connected clients
- `clientCount` -- Getter returning the number of currently connected clients

Each registered handler receives `(params, context)` where `params` is the JSON-RPC params object and `context` contains metadata about the connection. Handlers return a value (which becomes the `result` field) or throw an error (which is mapped to a JSON-RPC error response).

### Client Implementation

The IPC client (`tools/daemon/ipc-client.mjs`) provides:

- `connect(socketPath)` -- Connect to the daemon socket, returns a Promise that resolves on successful connection
- `call(method, params, timeout?)` -- Send a JSON-RPC request and await the response, with optional timeout (default 30 seconds)
- `disconnect()` -- Close the connection gracefully
- `on(event, handler)` -- Listen for server-push notifications

The client maintains an internal request ID counter and a pending response map. Each `call()` creates a Promise that resolves when the matching response (by `id`) arrives. Timeouts reject the Promise with a descriptive error.

### Connection Lifecycle

1. Client connects to `.aiwg/daemon/daemon.sock`
2. Server accepts connection, adds socket to the client set
3. Client sends JSON-RPC requests (newline-delimited)
4. Server processes requests sequentially per connection, sends JSON-RPC responses
5. Server may send notifications (broadcast events) to connected clients at any time
6. Either side can close the connection
7. Server removes client from the set on disconnect or error
8. Server handles `EPIPE` and `ECONNRESET` errors gracefully without crashing

### Stale Socket Detection

On daemon startup, the server checks for an existing socket file:

1. If the socket file exists, attempt to connect as a client
2. If the connection succeeds, another daemon is already running -- abort startup with error
3. If the connection fails with `ECONNREFUSED`, the socket is stale -- unlink and proceed
4. If the socket file does not exist, proceed normally

This prevents both duplicate daemon instances and stale socket files from blocking startup after a crash.

### Security

- Socket file permissions `0o600` restrict access to the owning user
- No authentication beyond filesystem permissions (same security model as the PID file and state files)
- Methods validate parameters and return structured errors for invalid input
- No sensitive data (tokens, credentials) is transmitted over the socket -- task prompts and results are the primary payload
- The socket path is inside `.aiwg/daemon/` which should have appropriate directory permissions

### Concurrency Model

The Node.js event loop provides natural serialization for state mutations:

- Incoming requests are processed one at a time per connection
- Multiple concurrent connections are handled via event-driven I/O
- Task state mutations (submit, cancel) go through the TaskStore which provides atomic operations
- Read-only operations (status, list, stats) can run concurrently without issues
- The broadcast mechanism iterates over the client set synchronously, which is safe because sends are buffered by the OS

## Consequences

### Positive

- Local-only communication without network ports -- works in Docker containers, VMs, and restricted environments
- File-permission security without custom authentication or token management
- Simple implementation using Node.js built-in `net` module -- zero external dependencies
- Well-specified protocol (JSON-RPC 2.0) with clear error handling semantics
- Supports concurrent clients naturally through event-driven I/O
- Extensible method registry allows new subsystems to add methods without protocol changes
- Notification support enables real-time event streaming to connected clients
- NDJSON framing is trivial to implement and debug (messages are human-readable)

### Negative

- Unix sockets are not available on Windows (acceptable -- AIWG targets Unix/macOS/WSL)
- Socket cleanup required on crash recovery (mitigated by stale socket detection)
- No built-in encryption (acceptable -- local-only communication between processes owned by the same user)
- No built-in request queuing or backpressure (acceptable for expected client counts)
- JSON serialization overhead for large payloads (acceptable for control-plane traffic)

### Neutral

- JSON-RPC 2.0 batch requests are supported by the specification but not implemented in the initial version. Batch support can be added later if clients need to send multiple requests atomically.
- WebSocket upgrade path exists if a browser-based UI is added. The JSON-RPC protocol layer can be reused over WebSocket transport without changes to method handlers.

## Implementation Notes

### Testing

The IPC server and client have dedicated unit tests:

- `test/unit/daemon/ipc-server.test.js` -- Server lifecycle, method registration, error handling
- `test/unit/daemon/ipc-client.test.js` -- Client connection, request/response matching, timeouts

Tests use temporary socket paths in `/tmp` to avoid polluting the project directory.

### Debugging

Set `AIWG_IPC_DEBUG=1` to enable verbose logging of all JSON-RPC messages sent and received. Messages are logged to stderr to avoid interfering with structured output.

### Future Extensions

- **Batch requests**: Process multiple JSON-RPC requests in a single message
- **Streaming results**: Long-running operations could send progress notifications
- **WebSocket bridge**: Proxy the Unix socket to a WebSocket for browser-based UIs
- **mTLS TCP fallback**: For remote daemon access (requires authentication layer)

## References

- @.aiwg/architecture/adrs/ADR-daemon-mode.md -- Parent daemon architecture decision
- @tools/daemon/ipc-server.mjs -- Server implementation
- @tools/daemon/ipc-client.mjs -- Client implementation
- @tools/daemon/daemon-main.mjs -- Method registration and daemon bootstrap
- @test/unit/daemon/ipc-server.test.js -- Server unit tests
- @test/unit/daemon/ipc-client.test.js -- Client unit tests
- https://www.jsonrpc.org/specification -- JSON-RPC 2.0 specification
- https://nodejs.org/api/net.html -- Node.js net module (Unix socket support)
