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
- [ ] 2 — Admin REST: provision/list/lifecycle + async operations.
- [ ] 3 — A2A core: SendMessage/Task, GetTask/List/Subscribe/Cancel, terminals.
- [ ] 4 — Extensions: multi-tenant echo, idempotency 422, hitl-prompt envelope, runtime metadata.
- [ ] 5 — pty-ws + pty-extensions: observe/drive/replay/keyframe/membership.
- [ ] 6 — Run the full conformance subset against the mock.

## Conformance

```bash
# once the relevant surfaces land:
agentic-sandbox-conformance --executor-url http://127.0.0.1:8122/agents/<id> --report-format markdown
```
Stub-skippable tests (forced 5xx, restart durability, INPUT_REQUIRED HITL) skip per the harness's own rules.
