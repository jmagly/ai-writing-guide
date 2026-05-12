# MC ↔ aiwg serve queue-tail bridge

**Status**: cycle 1 (design + skeleton) — implementation tracked under [#1182](https://git.integrolabs.net/roctinam/aiwg/issues/1182).

Wires the **Mission Control JSON queue** (`.aiwg/ralph-external/mc/sessions/*/session.json`) to **`aiwg serve`'s executor dispatch endpoint** (`POST /api/v1/sessions/:id/dispatch`), so missions enqueued with `aiwg mc dispatch` actually run end-to-end against a registered executor (local-executor, agentic-sandbox executor, etc.).

## The plumbing-and-porcelain split

MC stays usable standalone (the queue file IS the plumbing). The bridge is a **separate process** that, when running, picks up queued missions and dispatches them. Three operating modes:

| Mode | What's running | What happens |
|------|---------------|--------------|
| **MC alone** | `aiwg mc dispatch` only | Missions queue to `session.json`; nothing executes. Operator drives missions manually. |
| **MC + bridge + serve** | + `aiwg serve` + `aiwg mc bridge` | Bridge tails the queue, posts dispatches to `serve`, writes lifecycle back. No executor registered → dispatch returns 503; bridge marks mission as `failed` with the reason. |
| **MC + bridge + serve + executor** | + a registered executor (local-executor or sandbox) | Full end-to-end. `aiwg mc dispatch foo "objective"` → queued → dispatched → assigned → running → done. |

## Wire flow

```
                            session.json (mission added with status="queued")
                                 ▲                          │
                                 │                          │ (fs.watch tick)
                                 │                          ▼
                          ┌──────┴──────┐           ┌──────────────────┐
   aiwg mc dispatch  ───▶ │             │           │   queue-tailer   │
                          │  MC queue   │           │       .mjs       │
   aiwg mc status   ◀──── │  (jsonl)    │ ◀──────── │                  │
                          └─────────────┘  status   └────────┬─────────┘
                                          update             │
                                                             │  POST /api/v1/sessions/:id/dispatch
                                                             ▼
                                                    ┌──────────────────┐
                                                    │   aiwg serve     │  ◀── /ws/executors/{id}
                                                    │  (dispatcher)    │      events stream
                                                    └────────┬─────────┘
                                                             │  routeDispatch
                                                             ▼
                                                    ┌──────────────────┐
                                                    │  registered      │
                                                    │  executor        │
                                                    │  (local /        │
                                                    │   sandbox)       │
                                                    └──────────────────┘
```

The bridge subscribes to **`/ws/executors/{id}`** for every registered executor and writes mission lifecycle changes (`assigned` / `running` / `hitl_required` / `done` / `failed`) back into the corresponding `session.json` so `aiwg mc status` reflects current reality.

## Configuration

| Setting | Default | Purpose |
|---------|---------|---------|
| `--aiwg-serve` | `http://127.0.0.1:7337` | Base URL of `aiwg serve`. Bridge polls/posts here. |
| `--watch` | `.aiwg/ralph-external/mc` | MC sessions root directory to watch. |
| `--detach` | off | Run in background via daemon supervisor. |
| `--poll-interval-ms` | `1000` | Fallback polling interval when `fs.watch` is unavailable (some filesystems). |
| `--retry-base-ms` | `500` | Initial backoff for failed dispatch posts. Doubles per attempt, capped at 30s. |
| `--max-attempts` | `5` | After this many consecutive dispatch failures, mark the mission `failed` with the last error. |

## Retry & backoff semantics

| Failure | Action |
|---------|--------|
| `aiwg serve` unreachable (ECONNREFUSED, DNS fail) | Exponential backoff, retry forever. Bridge stays alive; missions stay `queued`. |
| `aiwg serve` returns 503 (no executor available) | Retry up to `--max-attempts` with backoff, then mark mission `failed` with `reason: no_executor_available`. |
| `aiwg serve` returns 4xx (other) | No retry; mark mission `failed` with the problem-JSON body as the reason. |
| Executor returns 5xx | One retry, then mark `failed`. |
| WS connection drops | Reconnect with exponential backoff (1s → 30s). Bridge replays event subscription on reconnect. |
| SIGINT / SIGTERM | Drain in-flight dispatches; wait up to 5s for outstanding HTTP POSTs to complete; cleanly close all WS connections; exit 0. Missions still `queued` remain queued. |

## Mission state writeback

Every relevant event from `/ws/executors/{id}` updates the corresponding mission's `status` field in `session.json` and appends an entry to `log.jsonl`:

| Event | Mission status transition |
|-------|--------------------------|
| `mission.assigned` | `queued` → `assigned` |
| `mission.started` | `assigned` → `running` |
| `mission.progress` | (no transition; append to log only) |
| `mission.hitl_required` | `running` → `hitl_required` |
| `mission.hitl_responded` (echo) | `hitl_required` → `running` |
| `mission.suspended` | → `suspended` |
| `mission.reconnected` + `mission.resumed` | `suspended` → `running` |
| `mission.completed` | → `done` |
| `mission.failed` | → `failed` (with reason + error from event payload) |
| `mission.aborted` | → `aborted` |

Writes use atomic-replace (write to `.tmp`, rename) so a crashed bridge never leaves a half-written `session.json`.

## File layout (when fully implemented)

```
tools/mc-bridge/
├── README.md                 # ← this file (cycle 1)
├── queue-tailer.mjs           # Long-running watcher (cycle 1 MVP → cycle 2 full)
├── dispatch-client.mjs        # Thin POST wrapper over aiwg serve dispatch API (cycle 2)
├── executor-ws-client.mjs     # WS subscription per registered executor (cycle 3)
└── status-writer.mjs          # Atomic session.json updates (cycle 2)

src/cli/handlers/mc.ts         # Adds `aiwg mc bridge` subcommand (cycle 3)
test/unit/mc-bridge/
├── queue-tailer.test.mjs      # File watch + dispatch payload shape (cycle 2)
├── status-writer.test.mjs     # Atomic write + concurrent update safety (cycle 2)
└── retry-backoff.test.mjs     # Backoff math + max-attempts (cycle 3)
test/integration/
└── mc-bridge-flow.test.mjs    # End-to-end against a fake executor (cycle 3)

docs/daemon-guide.md           # Plumbing/porcelain model + mode matrix (cycle 4)
```

## Pass plan (3 cycles total per issue body)

- **Cycle 1** (this commit): design + skeleton + smoke test.
- **Cycle 2**: tailer dispatch wiring + atomic status writeback + retry/backoff.
- **Cycle 3**: WS event subscription + event-to-status mapping + CLI `aiwg mc bridge` subcommand + integration test against a fake executor.

Each cycle ends with CI green and an AL CYCLE status comment on #1182.

## Acceptance (from issue body)

- [ ] `aiwg mc dispatch <session> "<task>"` followed by `aiwg mc bridge` → mission reaches `done`/`failed` with the queue file reflecting current state at every transition
- [ ] Bridge survives `aiwg serve` restart (reconnects + replays subscription)
- [ ] Bridge survives executor disconnect — `mission.suspended` propagates for resumable executors; non-resumable → `failed`
- [ ] Multiple concurrent missions dispatched in FIFO from queue file timestamps
- [ ] Clean SIGINT shutdown — no orphan watchers, queue integrity preserved
- [ ] No regression in `aiwg mc dispatch/status/list` when no bridge is running
- [ ] Documentation covers all four operating modes (with the executor variants this means the matrix in §"The plumbing-and-porcelain split" above)
