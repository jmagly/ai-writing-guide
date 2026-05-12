# Fake agentic-sandbox harness

In-process HTTP + WebSocket fake of the agentic-sandbox management server, for
`aiwg serve` integration tests. Same wire surface, same response shapes, no
real VM. Single-purpose, ~300 LOC, zero new top-level deps (uses `hono`,
`@hono/node-server`, `ws` — all already optional deps for `aiwg serve`).

Tracked under [#1173](https://git.integrolabs.net/roctinam/aiwg/issues/1173).
Companion fixtures (canonical wire shapes) live in
`test/fixtures/sandbox-api/`.

## Usage

```ts
import { startFakeSandbox } from 'test/fixtures/fake-sandbox/server.mjs';
import { happyPath } from 'test/fixtures/fake-sandbox/scenarios/happy-path.mjs';

describe('my serve integration', () => {
  let sb: Awaited<ReturnType<typeof startFakeSandbox>>;

  beforeEach(async () => {
    sb = await startFakeSandbox({ scenario: happyPath() });
    // Spawn aiwg serve pointing at the fake — sb.url is the HTTP base.
    // sb.ws_url is the WS base (ws://127.0.0.1:<port>).
  });

  afterEach(() => sb.stop());

  it('does the thing', async () => {
    const resp = await fetch(`${sb.url}/api/v1/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'echo hi' }),
    });
    expect(resp.status).toBe(201);
  });
});
```

## Returned handle

```ts
{
  url: string;        // http://127.0.0.1:<ephemeral>
  ws_url: string;     // ws://127.0.0.1:<ephemeral>
  port: number;
  stop: () => Promise<void>;
  // Inspection helpers (use sparingly — tests should treat the harness as a black box)
  _state: { tasks: Map<string, Task>, instances: object[] };
  _emit: (event: object, pathPrefix?: string) => void;  // Broadcast to all matching WS
}
```

## HTTP surface

| Route | Notes |
|-------|-------|
| `POST /api/v1/tasks` | Create task. Returns `{ task_id, state }` with `201`. |
| `GET /api/v1/tasks` | List tasks. Filter by `?state=running` etc. |
| `GET /api/v1/tasks/:id` | Status. Honors `scenario.taskAutoState` for state transitions. |
| `PATCH /api/v1/tasks/:id` | Send stdin via `{ stdin: "..." }`. |
| `DELETE /api/v1/tasks/:id` | Cancel. |
| `GET /api/v1/tasks/:id/logs?offset=N` | Log poll. Returns `{ lines, next_offset }`. |
| `GET /api/v1/agents` | Instance list. Default returns one of each kind (vm, container, agent). |
| `POST /api/sandboxes/register` | Legacy sandbox-registry path. Returns `{ sandbox_id, token }`. |
| `GET /api/v1/aiwg/status` | `{ healthy: true, fake: true }`. |

## WebSocket surface

Any `/ws/*` path accepts upgrades. Tests can connect to `/ws/sandbox/<id>` or
`/ws/tasks/<id>` and receive scenario-driven events. The harness uses a
**per-connection event stream** (via `scenario.eventStreamFactory`) so each
new subscriber gets a fresh iterator — late-joining tests still see the full
canned sequence.

## Scenarios

A scenario is a small object describing how the harness behaves. The
[`Scenario`](server.mjs) typedef covers every customizable hook:

| Field | Purpose |
|-------|---------|
| `onTaskCreate({ manifest })` | Override task creation; return a partial task. |
| `taskAutoState(taskId)` | Per-poll state transition (queued → running → completed). |
| `listInstances()` | Override `GET /api/v1/agents`. |
| `eventStreamFactory()` | Per-connection generator/iterator of events (preferred). |
| `eventStream` | Single shared generator (kept for compatibility — see below). |
| `errorRoutes` | Inject 4xx/5xx for specific path patterns. |
| `onPartition(ws)` | Wrap `ws.send` to drop sockets mid-stream. |

### Bundled scenarios

```ts
import { happyPath }     from './scenarios/happy-path.mjs';
import { slowEvents }    from './scenarios/slow-events.mjs';
import { partition }     from './scenarios/partition.mjs';
import { crashRecovery } from './scenarios/crash-recovery.mjs';
```

- **`happyPath()`** — task auto-transitions queued → running → completed,
  WS emits two canned `agent.status` / `agent.sessions` events.
- **`slowEvents({ yields, eventCount })`** — emits `eventCount` events with
  `yields` microtask-yields between each. Deterministic timing; no
  setTimeout-based asserts.
- **`partition({ dropAfter, eventCount })`** — emits some events, then drops
  the WS connection abruptly. Useful for testing client reconnect logic.
- **`crashRecovery({ failPatterns, failFor, status })`** — returns `503` (or
  configured status) for the first N matching requests, then recovers.

### Authoring your own scenario

```ts
// my-scenario.mjs
export function mySpicyScenario() {
  return {
    taskAutoState(taskId) {
      // Stay queued forever
      return 'queued';
    },
    eventStreamFactory: () => (async function* () {
      yield { event: 'my.custom', ts: '2026-...', data: {} };
    })(),
    errorRoutes: [
      { pathPattern: /^\/api\/v1\/tasks$/, status: 422, body: { error: 'nope' } },
    ],
  };
}
```

## Cleanup contract

`stop()` must always be awaited. It:

1. Sets a stream abort flag so any in-flight event generators stop on their next yield.
2. Closes every open WebSocket with code `1000` (normal shutdown).
3. Closes the HTTP server, draining any in-flight requests.

Repeated `startFakeSandbox()` + `stop()` in a loop is leak-free — the OS
allocates a fresh ephemeral port for each instance. See the
`leak detection` block in `test/unit/fake-sandbox-smoke.test.ts` for the
canonical proof.

## What this fake does NOT mimic

- Real VM lifecycle (no qemu, no docker, no actual processes).
- gRPC layer — the real server bridges HTTP→gRPC internally; we mimic the HTTP layer only.
- Authoritative wire shapes — for those, see `test/fixtures/sandbox-api/`
  (recorded fixtures pinned to a specific sandbox release).

When the real sandbox contract changes, update both this harness AND the
canonical fixtures in the same pass.
