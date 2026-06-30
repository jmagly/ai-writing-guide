# @aiwg/cockpit-mock-executor

Wire-faithful mock of the **agentic-sandbox A2A v2** three-surface executor for
automated Cockpit tests only. Human dev/test launches must use a real
agentic-sandbox executor through `AIWG_COCKPIT_EXECUTOR_URL`; the Bridge refuses
mock-like executors unless an automated harness explicitly sets
`AIWG_COCKPIT_ALLOW_MOCK_EXECUTOR=1`. Dependency-free (Node built-in `http`/`ws`),
validated against [`agentic-sandbox-conformance`](https://git.integrolabs.net/roctinam/agentic-sandbox-conformance).

Contract: `.aiwg/architecture/cockpit-instance-control-interface.md`. Not published in base `aiwg` npm; it is test support for the opt-in `@aiwg/cockpit` package boundary (roctinam/aiwg#1593, #1654).

## Automated Test Use

```bash
AIWG_COCKPIT_ALLOW_MOCK_EXECUTOR=1 node src/server.mjs  # listens on 127.0.0.1:8122
node src/smoke.mjs                                      # self-contained smoke test
```

AgentCard: `http://127.0.0.1:8122/agents/<instance_id>/.well-known/agent-card.json`

## Surfaces (build increments)

- [x] **1 — Discovery**: per-instance AgentCard with the five declared extensions (runtime/v1 required; hitl-prompt, idempotency, multi-tenant, pty-extensions).
- [x] **2 — Admin REST**: `GET /admin/instances`, `/admin/instances/:id`, `/admin/running` + 3 demo instances.
- [x] **3 — A2A core**: `messages:send` (Task), `tasks`/`tasks/:id`/`:cancel`/`subscribe` (SSE), problem+json errors.
- [x] **4 — Extensions**: multi-tenant tenant_id echo+charset, idempotency replay/422, runtime Task.metadata, A2A-Extensions echo.
- [x] **5 — pty-ws + pty-extensions**: WS at `/agents/:id/sessions/:sid/attach`; binding_hello, A2A-over-WS, controller/observer roles, session_input→output, request_keyframe, replay_from.
- [x] **6 — Conformance**: **33 pass / 0 fail / 17 skip** (skips = JWS/auth/quota/v2.2-reserved/terminal-states the harness can't drive against a stub).

## Conformance

```bash
# once the relevant surfaces land:
agentic-sandbox-conformance --executor-url http://127.0.0.1:8122/agents/<id> --report-format markdown
```
Stub-skippable tests (forced 5xx, restart durability, INPUT_REQUIRED HITL) skip per the harness's own rules.
