# @aiwg/cockpit-mock-executor

Wire-faithful mock of the **agentic-sandbox A2A v2** three-surface executor, so AIWG Cockpit (the Bridge + UI) can be built **in parallel** with the real executor work (agentic-sandbox#460 host target, #461 sessions). Dependency-free (Node built-in `http`/`ws`), validated against [`agentic-sandbox-conformance`](https://git.integrolabs.net/roctinam/agentic-sandbox-conformance).

Contract: `.aiwg/architecture/cockpit-instance-control-interface.md`. Not published in base `aiwg` npm (only `apps/web/dist` is); becomes part of `@aiwg/cockpit` when workspaces land (roctinam/aiwg#1593).

## Run

```bash
node src/server.mjs            # listens on 127.0.0.1:8122
node src/smoke.mjs             # self-contained smoke test
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
