# Cockpit Instance-Control Interface — Binding to agentic-sandbox A2A v2 (three surfaces)

**Phase**: Construction (Area 1 / SU-1.1)
**Status**: Draft contract — the seam Cockpit binds to and the mock implements. **Verified live 2026-07-09** against a real executor (agentic-sandbox **v2026.7.4**): all three surfaces exercised end-to-end through the Cockpit bridge — Admin API instances now carry `transport` / `transport_posture` / `security_posture` / `host_daemon`; the per-instance A2A task surface and the `pty-ws/v1` session-listing endpoints (#140/#611) return live (no 502). Formal Draft→baseline flip pending operator sign-off. Evidence: `.aiwg/testing/cockpit-7.4-transport-verify-2026-07-09.md`.
**Epic**: roctinam/aiwg#1588 · **Dep**: roctinam/aiwg#1589 → agentic-sandbox#460/#461
**Grounded in** (agentic-sandbox `docs/contracts/`, read 2026-06-13): admin-api.openapi.yaml; extensions/{runtime,hitl-prompt,idempotency,multi-tenant,adapter-command,pty-extensions}/v1; bindings/pty-ws/v1. ADR-022 (three-surface), ADR-018 (A2A base), ADR-019 (extension governance).
**Decisions (operator)**: bind **directly to A2A v2** (no Cockpit abstraction) · **direct for instance-control, serve only for cross-stack coordination** · **multi-tenant from day one** (carry `tenant_id`) · **full three-surface, conformance-checked mock**.

## 1. The three surfaces (ADR-022) and Cockpit's binding

| Plane (Cockpit ADR) | agentic-sandbox surface | Transport | Cockpit operations |
|---|---|---|---|
| **Provision / lifecycle / tier** | **Admin API** (Surface 1, fleet) | REST (OpenAPI) | `provisionInstance` (runtime kind + `loadout`), `listInstances`, `getInstance`, `start/stop/restart/destroy/reprovision`, `getOperation` (async poll), `listLoadouts`, `listContainerImages`, `streamEvents`/`streamLogs` |
| **Task control** | **Per-instance A2A** (Surface 2, `…/agents/<instance_id>`) | A2A v1.0.0 REST | AgentCard discovery (`/.well-known/agent-card.json`, JWS Ed25519); `SendMessage`/`SendStreamingMessage`; `GetTask`/`ListTasks`/`SubscribeToTask`/`CancelTask`; task terminals `completed`/`failed`(+`fail_kind`)/`canceled`/`rejected` |
| **Interactive I/O** | **`pty-ws/v1` + `pty-extensions/v1`** | WebSocket | `pty.join_session` (role + `replay_from`), `pty.session_input`/`session_resize`/`request_keyframe`; server frames `Output`/`Resize`/`RoleAssigned`/`MembershipChanged`/`Keyframe`/`Closed`/`Error` |

Cockpit's Bridge is a **client of all three**. It talks to agentic-sandbox **directly** for instance control + I/O; it uses **serve/#1546 only** for cross-stack Mission coordination (the two-plane model).

### 1.1. Recovery extension for stale container agents (2026-07-11)

Cockpit now treats "runtime running, agent missing" as a first-class degraded
state instead of collapsing the row out of the operator surface. For
Docker/container instances the Bridge exposes:

```
POST /api/instances/:id/reconnect
```

Contract:

- input: instance id from the admin inventory;
- success: the sandbox or container has been asked to re-register its agent;
- failure: returns an explanatory error when no executor route, local Docker
  container, or `agent-reconnect` helper is available;
- non-goal: never destroys, replaces, or reprovisions the runtime.

Resolution order:

1. Call executor-owned reconnect routes when advertised by the sandbox.
2. Fall back to `docker exec <container> agent-reconnect` for local
   Docker/container instances that carry the helper.

The UI derives `agent unreachable` when the instance is still running but no
agent id can be resolved from the agent registry/running projection. Inventory
and Sessions both expose **Reconnect** for that state, preserving operator
context until the agent returns.

## 2. Extension usage (per-instance A2A)

- **`runtime/v1`** (required, data-only): every AgentCard declares `params{ runtime: vm|container|host, loadout, image_ref?, instance_id }`; every Task carries `metadata{ runtime.instance_id, runtime.kind, runtime.host? }`. Cockpit reads these for the inventory/running views + the isolation-tier badge. The upstream `host` target landed in agentic-sandbox#460; Cockpit still treats unknown future `runtime.kind` values as opaque.
- **`hitl-prompt/v1`**: HITL gate envelope + response validation → the unified Approval Inbox (UC-COCKPIT-009; #1565). Cockpit relays the operator decision; **AIWG core re-validates** (threat-model E1/S3) — Cockpit never mints approvals.
- **`idempotency/v1`**: replay header + 422-on-key-reuse + JCS hash → Cockpit attaches idempotency keys on every dispatch (threat-model T2 safe dispatch).
- **`multi-tenant/v1`** (declared until sandbox v2.2): Cockpit **carries `tenant_id` on every `Message.metadata` from day one** (charset `^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$`), echoes it on correlation, and has backoff for the future `429+Retry-After`. Isolation arrives free on the sandbox's v2.2 upgrade. **`tenant_id` is a routing token, not a credential** — auth binds identity→tenant separately (sandbox ADR-015).
- **`adapter-command/v1`** (narrow): bounded `plan`/`assess` wrapper runs via `messages:send`. Not the interactive-drive path; noted for supervised dry-runs.

## 3. Interactive I/O = the Cockpit session UX (de-risked: it's the contract)

`pty-extensions/v1` already implements our session-attach model and the "working alongside agents" UX:

| Cockpit UX (our ADR/UC) | pty-extensions/v1 mechanism |
|---|---|
| Observe-default, non-destructive (UC-005, `adr-cockpit-session-attach-model`) | `role: observer` — MUST NOT send input; `controller` to drive |
| Drive only where capable, explicit | `pty.session_input`/`session_resize`; observer writes rejected `PERMISSION_DENIED` |
| Presence / "alongside" awareness (Dourish & Bellotti #70) | `MembershipChanged` (controllers + observers with labels) |
| Re-enter a running session, coherent state (UC-005 reattach) | `pty.join_session{ replay_from }` → replayed frames + `Keyframe` snapshot |
| Multi-operator + multi-agent on one session | `max_controllers` (4) / `max_observers` (32) |
| Live stream piping (data plane) | `Output{ stream, data(base64) }` frames |
| Lifecycle end | `Closed{ exit_code, reason }` |
| Drive vs observe gating (spike #1590) | bearer scopes `pty:control` vs `pty:observe` |

Security carried over (threat model): observers see everything incl. secrets (no redaction) → audit every attach; per-launch token + OS-keychain at the WS upgrade (#1595); replay is session-scoped (apply per-principal ACLs to replayed frames too).

## 4. Cockpit-facing client shape (what we build)

A typed TS client `@aiwg/cockpit` instance-control module exposing (thin over the wire — no invented abstraction):
- `provision({ runtimeKind, loadout, tenantId }) → instanceId` (admin) · `list/get/start/stop/restart/destroy` · `pollOperation`
- `reconnect(instanceId) → recoveryResult` (Bridge recovery extension; stale Docker/container agents only)
- `discover(instanceId) → AgentCard` · `sendMessage`/`getTask`/`listTasks`/`subscribeToTask`/`cancelTask` (A2A, tenant_id + idempotency-key on every send)
- `attach(instanceId, { role, replayFrom }) → PtySession` with events `output`/`resize`/`membership`/`keyframe`/`roleAssigned`/`closed` and methods `input()/resize()/requestKeyframe()/leave()`
- `approvals()` stream (hitl-prompt) → relay decisions to AIWG core

## 5. The mock (full three-surface, conformance-checked)

`apps/cockpit/mock-executor/` (TS; excluded from base npm — only `apps/web/dist` publishes). Implements all three surfaces wire-faithfully so the Bridge + UI can test the same contract as a real agentic-sandbox executor:
- **Admin REST**: provision/list/get/lifecycle + async `operations` poll; in-memory instances with `runtime` (vm/container/host) + loadout.
- **Per-instance A2A**: AgentCard (with `runtime/v1`+`hitl-prompt/v1`+`idempotency/v1`+`multi-tenant/v1` declared), SendMessage/Task lifecycle, GetTask/List/Subscribe/Cancel, the 4 extensions' wire behavior (incl. `EXTENSION_REQUIRED` 400, tenant_id echo, idempotency 422).
- **pty-ws + pty-extensions**: a WebSocket PTY backed by a real shell (or a scripted fake) emitting Output/Keyframe/MembershipChanged, honoring roles + `replay_from`.
- **Validated** against `roctinam/agentic-sandbox-conformance` (point `--executor-url` at the mock); stub-skippable tests (forced 5xx, restart durability, INPUT_REQUIRED HITL) skip per the harness's own rules.

## 6. Build increments (interactive, one at a time)
1. Mock skeleton + **AgentCard discovery** (+ runtime/v1 declared) → conformance `discovery` tests.
2. Admin **provision/list/lifecycle** + async operations.
3. A2A **SendMessage/Task** + GetTask/List/Subscribe/Cancel + terminals → `registration`/`dispatch`/`state_terminals`.
4. Extensions: **multi-tenant** echo, **idempotency** 422, **hitl-prompt** envelope, runtime metadata.
5. **pty-ws + pty-extensions** session (observe/drive/replay/keyframe/membership).
6. Cockpit instance-control **client** (§4) against the mock; then run the full conformance subset.
