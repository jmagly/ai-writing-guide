# ADR: Executor Contract — Pluggable Mission Execution Layer

## Status

**ACCEPTED** (2026-05-08, operator approved with v1.x deferrals as written)

## Date

2026-05-08

## Context

The AIWG runtime stack today consists of three layers that each work in isolation but only loosely connect to each other:

1. **`aiwg mc`** — a Mission Control CLI that writes mission state to `.aiwg/ralph-external/mc/sessions/<id>/session.json`. Pure on-disk queue. No worker reads it.
2. **`aiwg serve`** — an HTTP+WS dashboard at `:7337`. Has `sandbox-registry`, `agent-router`, and `pty-bridge` working in production for live state and lifecycle. Exposes `POST /api/sessions/:id/dispatch` (#715) which is currently a stub: it accepts the request, emits a telemetry event, and returns `{ status: "queued" }` — nothing executes the mission.
3. **`agentic-sandbox`** (`~/dev/agentic-sandbox`) — Rust management server running on `:8120/8121/8122`, supervising KVM VMs or rootless containers per agent, with a Python `agent/grpc_client.py` connecting back from inside each VM. Has a fully-functional internal dispatcher (`management/src/dispatch/dispatcher.rs`) and an opt-in bridge to register with `aiwg serve` (`management/src/aiwg_serve.rs`, gated on `AIWG_SERVE_ENDPOINT` env var).

Verification (2026-05-08, this session): the local `agentic-mgmt` (PID 1771375) is running but `AIWG_SERVE_ENDPOINT` is unset, so it has never registered with `aiwg serve`. `aiwg mc dispatch` was called three times (#1171, #1172, #1173 missions) — all wrote JSON to disk and zero workers picked them up. No errors, no crashes; just missing wiring.

The four gaps observed are all on one architectural seam: **there is no agreed-upon contract between a dispatch surface and the thing that executes a mission**. Today every layer assumes someone else is doing the work.

The right fix is not to wire the existing components tightly together. AIWG's design principle is composable, opt-in layers where each layer can stand alone or compose with neighbors via stable contracts — modeled on git's plumbing-and-porcelain split, where the data formats are fixed and any number of UIs/transports can read or write them. Tight coupling between MC, `aiwg serve`, and a single execution backend would produce the opposite outcome: each component would force adoption of its peers, and an external contributor (e.g., someone bringing their own runtime, or running on hardware that can't host KVM) would have nowhere to plug in.

This ADR establishes an **Executor contract**: a versioned, transport-stable specification for the layer that takes a mission and produces a result, so that:

- The default sandbox-isolated path (the path of least resistance) keeps working unchanged.
- A user who wants to run only the daemon and bootstrap their own executor can do so without touching `aiwg serve` or `agentic-sandbox`.
- Future executors (cloud sandboxes, Firecracker, microVMs, plain process pools, Kubernetes operators) plug in without modifying AIWG core.
- `agentic-sandbox` evolves independently of AIWG by remaining contract-compatible — same opt-in contract that `setup.aiwg.io/v1` uses for installer manifests.

## Decision

Define a versioned **Executor contract** (`executor.aiwg.io/v1`) with the following twelve properties:

### 1. Contract home
The spec lives in AIWG: `docs/contracts/executor.v1.md` plus a JSON Schema at `schemas/executor-v1.json`. AIWG owns the spec. `agentic-sandbox` is **one** conforming implementation; the local executor (extension of `tools/ralph-external/daemon-supervisor.mjs`) is **another**; third-party executors are explicitly first-class.

### 2. Discovery and registration
An executor advertises itself to `aiwg serve` by calling `POST /api/v1/executors/register` (parallel to the existing `POST /api/v1/sandboxes/register` route). The register payload includes:

- `executor_id` (stable across restarts — UUID persisted by the executor)
- `name`, `version`, `spec_version: "1.0.0"`
- `transport_endpoints` — at minimum a REST base URL and a WebSocket URL for events
- `capabilities` — declared array, e.g. `["isolation:vm", "runtime:claude-code", "platform:linux/x64", "resumable", "hitl"]`

A sandbox is treated as a **specialization of an executor**. The existing `sandbox-registry` and `agent-router` continue to work for the agent-inventory case (an agent inside a VM); the new `executor-registry` operates at the dispatch-surface level. They share auth and identity-store machinery (`sandbox-identity-store.ts`) but track different shapes of state.

### 3. Default selection policy
When `aiwg serve` receives a mission dispatch without an explicit `--executor` filter:

1. If any executor with `capability: "isolation:vm"` or `"isolation:container"` is registered → route to it (sandbox-first).
2. Else if a local executor is registered → fall back to it.
3. Else `503` with `{ error: "no_executor_available" }`.

`AgentFilter` (existing) extends with `executor_id` and `executor_capabilities` to allow operator overrides.

### 4. MC ↔ aiwg serve relationship — plumbing-and-porcelain
- MC stays a thin **local file queue** at `.aiwg/ralph-external/mc/sessions/<id>/session.json`. This queue is the AIWG plumbing format — any tool can read or write it.
- When `aiwg serve` is running (the porcelain), MC's queue tail process posts new missions to `POST /api/v1/sessions/:id/dispatch` and aiwg serve's executor router does the work. State is kept in sync via WS events from the executor.
- A user who does not run `aiwg serve` can still dispatch by writing the queue file directly and pointing a custom executor (or a forked supervisor) at it. **MC is usable alone; aiwg serve is usable alone; together they form the default path.**

### 5. Naming
The contract layer is consistently named **executor**: `AIWG_EXECUTOR_ENDPOINT`, `/api/v1/executors/...`, `docs/contracts/executor.v1.md`, `.aiwg/executors/<name>.json`. The word "sandbox" remains for the isolation backend; "executor" is the dispatch layer. `runtime` is reserved for the existing meaning inside `agentic-sandbox` (`runtimes/qemu/`, `runtimes/docker/`), which describes the isolation primitive — narrower than executor.

### 6. Transport
- **Required**: HTTP REST for register/dispatch/status, WebSocket for the event stream. Mirrors `sandbox-registry` shape today; zero new infrastructure.
- **Permitted**: gRPC, JSON-over-stdio (for plumbing-mode local executors), file-watch-based dispatch.

The conformance suite tests REST+WS only. Other transports are operator choices, documented but not gated by the AIWG conformance check.

### 7. Mission lifecycle (5 core states + first-class HITL)
```
queued ─► assigned ─► running ─► (paused | hitl-required | suspended)* ─► done | failed | aborted
```
- `queued`: dispatcher has accepted the mission; no executor assigned yet
- `assigned`: an executor has accepted ownership but not yet begun work
- `running`: executor is actively processing
- `paused`: operator paused, can be resumed
- `hitl-required`: blocked on human input — drives the existing dashboard HITL drawer; first-class because `agentic-sandbox` already emits `HitlInputRequired` events and the dashboard already handles them. Making it a state (not just an event) means clients can query "missions blocked on humans" trivially.
- `suspended`: mission is durably persisted but the executor is offline; will resume on reconnect (only valid for executors that advertise `capability: "resumable"`)
- `done`, `failed`, `aborted`: terminal states

Event vocabulary: `mission.assigned`, `mission.started`, `mission.progress`, `mission.hitl_required`, `mission.paused`, `mission.resumed`, `mission.suspended`, `mission.completed`, `mission.failed`, `mission.aborted`. Existing `SandboxEvent` shape (snake_case Rust serde) is reused where it overlaps; new mission-level events follow the same convention.

### 8. Reference local executor
`tools/ralph-external/daemon-supervisor.mjs` is extended with an executor-conformance shim. It already has a queue, a process supervisor, and the spawn-Claude-Code lifecycle (19 daemon unit suites cover it). The shim adds: `register-on-start` against `aiwg serve`, the executor REST routes (or an `aiwg local-executor serve` subcommand exposing them), and the WS event stream. A user who wants no sandbox runs `aiwg local-executor serve` and dispatches against it; a user who wants the sandbox path lets `agentic-mgmt` register itself.

### 9. Auth / trust model
**Token-on-register**, mirroring `sandbox-registry` (`src/serve/sandbox-identity-store.ts` with atomic writes, #969):

- Executor calls `POST /api/v1/executors/register` from loopback.
- aiwg serve issues an opaque token bound to the `executor_id`.
- Executor includes the token in subsequent calls (`Authorization: Bearer <token>` for REST; `?token=<token>` query param for WS upgrade — same as today's sandbox WS).
- Default bind is `127.0.0.1` only. LAN exposure is an explicit operator choice and triggers a stronger check (token rotation on first non-loopback register).
- Identity is persistent across `aiwg serve` restarts via the existing identity store. An executor that re-registers with the same `executor_id` reclaims its prior identity (and can be required to prove it via challenge-response in v1.1; v1 trusts the loopback bind).

**Out of scope for v1**: mTLS (right answer for cross-host production; deferred to v1.1 when a real cross-host need arises). `security-engineering/skills/auth-factor-design` covers the upgrade path.

### 10. Versioning
- URL pinned: `/api/v1/executors/...`
- Spec version pinned in payload: register includes `spec_version: "1.0.0"`
- SemVer rules: minor adds backward-compatible fields, major breaks. AIWG serve refuses unknown major versions and warns on unsupported minors.
- Mirrors the existing `/api/v1/*` pattern in `agentic-sandbox` so cross-project version negotiation is one mental model.

### 11. Resumability — opt-in capability
Executors advertise `capabilities: ["resumable"]` if they support reconnect-and-replay across crashes. The dispatcher inspects this when routing long-running missions:

- A mission marked `long_running: true` in dispatch payload **must** route to a `resumable` executor (returns `503 no_resumable_executor_available` if none registered).
- Short missions route to any executor regardless.
- `agentic-sandbox` already has session reconciliation, ephemeral per-VM secrets, and crash-loop detection (per its README and `dispatcher.rs`); it advertises `resumable` from day one.
- The local executor v1 omits `resumable`; v1.1 adds it once we settle the durable-queue shape.

### 12. Sequencing
1. **This ADR** captures decisions 1–11.
2. **`docs/contracts/executor.v1.md`** is the implementer-facing spec — derived from the ADR but authoritative for conformance.
3. **`schemas/executor-v1.json`** is the JSON Schema for the register payload and event stream.
4. **Issue tree** under a new parent epic decomposes the implementation: spec doc, executor-registry in aiwg serve, agentic-sandbox executor adapter, local executor extension, MC→serve bridge, conformance suite.
5. The test strategy (`.aiwg/testing/test-strategy-daemon-serve-sandbox.md`) gets a section covering executor-contract conformance.
6. **No code is written until this ADR is approved.**

## Alternatives Considered

1. **Wire MC → aiwg serve → agentic-sandbox tightly in code** — fastest path to working dispatch. Rejected: it forecloses the opt-in/composable design, ties AIWG to a specific runtime, and produces a system where each component requires its peers. Conflicts with the cross-platform-reach goal.

2. **Make `agentic-sandbox` the spec** — pragmatic; agentic-sandbox already has a working REST/WS surface. Rejected: it ties the AIWG contract to a single implementation; alternative executors would be defined by what subset of the sandbox API they reproduce. Hard to evolve without breaking either side.

3. **Co-own the spec in a third repo** — cleanest decoupling. Rejected for now: bootstrapping a third repo for one spec is operational overhead that doesn't pay back until ≥3 implementers exist. Reconsider if/when that happens.

4. **Skip the executor abstraction and build the dispatcher directly into aiwg serve** — also fastest. Rejected: same coupling problem as #1, plus no story for users who don't run `aiwg serve` at all (which is supposed to remain optional per the AIWG opt-in design).

5. **Define a richer state machine (provisioning, draining, recovering, replaying)** — closer to a workflow engine. Rejected for v1: the 5-state + HITL machine matches what the dashboard and `agentic-sandbox` already use; richer states can be added as v1.x non-breaking additions when a real consumer needs them.

6. **Require resumability for all conforming executors** — highest baseline reliability. Rejected: it raises the cost of writing a simple local executor enough to discourage external implementers, which conflicts with the "anyone can build their own" goal. Opt-in capability lets the sandbox advertise it from day one without forcing the local executor v1 to implement it.

7. **mTLS auth from day one** — strongest isolation. Rejected for v1: PKI setup overhead is not justified for the localhost-default deployment. The token model already exists in `sandbox-identity-store`; reusing it ships v1 sooner. mTLS lands in v1.1 when cross-host production becomes a real use case.

## Consequences

### Positive

- **Three components stay independently usable.** MC works without `aiwg serve`. `aiwg serve` works without `agentic-sandbox`. Anyone can write a third executor without modifying AIWG core. The plumbing-and-porcelain split is preserved.
- **Cross-platform reach extends to runtime.** AIWG already deploys to 10 platforms (Claude, Codex, Copilot, Cursor, Warp, Factory, OpenCode, Windsurf, OpenClaw, Hermes); the executor contract extends the same composability to the execution layer.
- **`agentic-sandbox` evolves independently of AIWG** — the same way `setup.aiwg.io/v1` lets installer authors update without touching AIWG core. If a future sandbox release adds new event types, they're additive under SemVer rules.
- **Pre-set "path of least resistance" is preserved.** Default `aiwg use sdlc` + `aiwg serve` + a registered sandbox produces the same UX users get today after the executor router is wired up.
- **Test strategy gains conformance dimension.** Tier-2 contract tests against recorded fixtures (the existing strategy in `.aiwg/testing/test-strategy-daemon-serve-sandbox.md`) extend naturally to test that multiple executor implementations agree on the same wire shape.

### Negative

- **Six new components to coordinate** (spec, schema, registry, dispatcher logic, two adapters, conformance tests). Introduces complexity that a tight wire-up wouldn't.
- **First implementation cost is higher** than directly hard-coding the existing sandbox shape into `aiwg serve`'s dispatch route. Tradeoff is that future implementations are cheap.
- **Sandbox executor adapter requires changes in `agentic-sandbox`** — updates to `management/src/aiwg_serve.rs` to call `/api/v1/executors/register` in addition to (or instead of) `/api/v1/sandboxes/register`. This is contained and version-gated, but it does mean cross-repo coordination.
- **Versioning discipline becomes load-bearing.** SemVer compliance now matters for `aiwg serve ↔ agentic-sandbox` interoperability. Drift detection (tier-2 contract tests) catches accidents but discipline is still required.

### Neutral

- The MC JSON queue format (`session.json`) becomes a stable, externally-observable plumbing format. It already exists, so this is a documentation/commitment change, not new code.
- The HITL state being first-class drives no UI change today (the drawer already works) but documents existing behavior so future executors know to emit the matching event.
- Existing `sandbox-registry` and `agent-router` code is preserved and complemented by the new `executor-registry`. No deletion or breaking change to today's surface.

## Implementation Plan

Filed as a parent epic + six children once this ADR is approved. The decomposition mirrors §12 above:

| # | Deliverable | Depends on |
|---|---|---|
| Spec doc | `docs/contracts/executor.v1.md` + `schemas/executor-v1.json` | This ADR |
| Executor registry | `src/serve/executor-registry.ts` + `/api/v1/executors/*` routes in `serve.ts` | Spec |
| Sandbox executor adapter | Update `~/dev/agentic-sandbox/management/src/aiwg_serve.rs` to register as executor | Spec, registry |
| Local executor | Extend `tools/ralph-external/daemon-supervisor.mjs` with executor-conformance shim | Spec, registry |
| MC → serve bridge | New `tools/mc-bridge/queue-tailer.mjs` that posts queued missions to `POST /api/v1/sessions/:id/dispatch` | Registry, at least one executor adapter |
| Conformance suite | `test/conformance/executor-v1/` exercising each registered executor against the spec | Spec + JSON Schema |

The existing test strategy at `.aiwg/testing/test-strategy-daemon-serve-sandbox.md` gets a new section covering executor-contract conformance, with tier-2 fixtures recording the executor wire shape.

## References

- `.aiwg/architecture/adr-daemon-as-headend.md` — daemon supervisor role; partially covered by the local executor extension here
- `.aiwg/architecture/adr-daemon-docker.md` — sandbox lifecycle
- `.aiwg/architecture/adr-daemon-profile-system.md` — profile-driven daemon configuration
- `.aiwg/architecture/adr-identical-form-portability.md` — same composable-layer principle applied to bundle promotion
- `.aiwg/testing/test-strategy-daemon-serve-sandbox.md` — covers the substrate as it exists today; will be extended for executor conformance
- `docs/serve-guide.md`, `docs/daemon-guide.md` — current operator surface
- `src/serve/sandbox-registry.ts`, `src/serve/agent-router.ts`, `src/serve/sandbox-identity-store.ts` — existing patterns the executor contract mirrors
- `~/dev/agentic-sandbox/management/src/aiwg_serve.rs` — current sandbox→aiwg serve bridge that this ADR extends
- `~/dev/agentic-sandbox/management/src/dispatch/dispatcher.rs` — internal sandbox dispatcher that an executor adapter would expose

## Approvals

| Role | Reviewer | Status |
|---|---|---|
| Architecture Designer | (this ADR) | ACCEPTED |
| Security Architect | TBD | Deferred to v1.1 (mTLS); v1.0 token-on-register approved |
| Reliability Engineer | TBD | Resumability opt-in approved |
| Test Architect | TBD | Conformance suite shape approved |
| Operator | (sign-off in #1177) | ACCEPTED 2026-05-08 |

This ADR is ACCEPTED. Child issues #1178–#1183 are unblocked and may begin work. Cross-repo coordination for #1180 is filed as a companion issue in the agentic-sandbox tracker.
