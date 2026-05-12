---
artifact_type: test-strategy
component: daemon + serve + agentic-sandbox seam
status: DRAFT (awaiting review)
date: 2026-05-08
author: Test Architect
reviewers: [Architecture Designer, Security Architect, Reliability Engineer]
related_adrs:
  - .aiwg/architecture/adr-daemon-as-headend.md
  - .aiwg/architecture/adr-daemon-docker.md
  - .aiwg/architecture/adr-daemon-profile-system.md
related_docs:
  - docs/serve-guide.md
  - docs/daemon-guide.md
parent_plan: .aiwg/testing/master-test-plan.md
---

# Test Strategy — Daemon + `aiwg serve` + agentic-sandbox Seam

## 1. Context and Scope

This strategy covers the **runtime stack** that surfaces AIWG agents to operators: the in-process daemon (`tools/daemon/`), the `aiwg serve` HTTP+WS dashboard layer (`src/serve/`), and the cross-process seam to the **agentic-sandbox** management server (HTTP REST on :8122, gRPC underneath). It is a focused strategy for one component group, scoped under the existing master test plan.

### 1.1 Components Under Test

| Layer | Path | Process | Lifetime |
|-------|------|---------|----------|
| Daemon engine | `tools/daemon/*.mjs` | Long-running daemon | Persistent |
| Serve HTTP+WS | `src/serve/*.ts` | Embedded in daemon or standalone | Persistent |
| CLI handler | `src/cli/handlers/serve.ts` | Spawned per `aiwg serve` invocation | Foreground |
| Sandbox transport | `tools/daemon/sandbox-transport.mjs` | Client of agentic-sandbox HTTP API | Per-PTY-session |
| Sandbox registry | `src/serve/sandbox-registry.ts` | In-memory registry of registered sandboxes | Persistent |
| PTY bridge | `src/serve/pty-bridge.ts` | WS endpoint for browser ↔ PTY | Per-pane |
| Web UI | `tools/daemon/web-ui/` | Browser-side React SPA | Per-tab |

### 1.2 The Cross-Process Seam (Why This Matters)

The seam to **agentic-sandbox** is the load-bearing risk. It is a separate codebase (separate proto repo) reached over HTTP, and its REST shape can drift independently of AIWG. Existing unit tests mock the transport — they prove our code is internally consistent but say nothing about whether we agree with the real backend. The strategy below is structured around closing that gap without making CI dependent on a live VM host.

### 1.3 Out of Scope (covered elsewhere)

- Browser-side React component tests (web UI rendering) — separate strategy
- agentic-sandbox internals (we are a client; their tests cover their server)
- libvirt / Docker / QEMU correctness (sandbox owns those)
- Token / auth flows beyond the registry token issued at register-time (see `sandbox-identity-store` tests)

## 2. Quality Goals

| Goal | Target | Source |
|------|--------|--------|
| Coverage on `src/serve/**` | ≥ 85% lines, ≥ 80% branches | Stricter than global 80/70 — this is the seam |
| Coverage on `tools/daemon/**.mjs` | ≥ 75% lines (mjs harder to instrument) | Best-effort with v8 |
| Sandbox API contract drift detection | 100% of consumed REST endpoints exercised against recorded fixtures | Prevents silent incompatibility |
| Test-to-code ratio for new daemon/serve modules | ≥ 1:1 | Matches existing `serve/` ratio (~2.2k test LoC : ~3k src LoC) |
| Live UAT pass rate against real sandbox | 100% before release tag | Mirrors existing `npm run uat:daemon:claude` policy |
| CI wall-clock budget | ≤ 90 s added by tier 1+2+3 | Keeps `test:ci` under current 15-min CI limit |
| Coverage regression gate | Block PR on >2% drop in `src/serve/**` | Per `anti-laziness` Rule 5 |

## 3. Test Levels

### 3.1 Tier 1 — Unit (existing, extend)

**What it covers**: Pure logic in `src/serve/*` and `tools/daemon/*` modules with mocked transports. The 8 existing serve suites (~2.2k LoC) and 19 daemon suites already establish this tier.

**Tooling**: vitest, run via `npm test`; `pool: threads`, mocks via `vi.mock`.

**Gaps to close**:
- `pty-bridge.ts` — auth path (Phase 2c legacy `AIWG_SANDBOX_ENDPOINT` deprecation)
- `agent-router.ts` — filter precedence and tie-breaking
- `tools/daemon/sandbox-transport.mjs` — error/retry/timeout paths (currently lightly covered)
- `tools/daemon/web-server.mjs` — route dispatch and CORS

**Pattern**: keep one test file per source module (per the project's "encapsulate validators by artifact type" preference); add cross-cutting gap files where matrix items span modules. Same pattern as `test-strategy-project-local.md`.

### 3.2 Tier 2 — Contract (new, load-bearing)

**Purpose**: prove that our HTTP client (`SandboxTransport`) speaks the same dialect as the real agentic-sandbox management server, without requiring a live server in CI.

**Approach**: **recorded-fixture replay**. A one-time recording session against a real sandbox captures every response we consume; tests replay these recordings against our client. Drift is detected when (a) we record again and the diff is non-empty, or (b) production-side proto changes ship to the sandbox without a corresponding fixture refresh.

**Fixture format**: JSON-per-endpoint, committed to `test/fixtures/sandbox-api/`. Each fixture file pairs a request shape with the captured response. Recording is via a small `tools/scripts/record-sandbox-api.mjs` script gated on `AIWG_SANDBOX_ENDPOINT` (manual run; never in CI).

**What this catches**: the agentic-sandbox team renames a field, changes a status code, alters event payload shape. Without contract tests, we discover this at user-facing runtime; with them, we discover it the next time someone runs the recorder against a new sandbox build.

**Tooling**: vitest unit; `nock` or `msw/node` for HTTP intercept against the fixture; no extra deps if we use node's `undici` mock agent (already transitive).

**Why not Pact**: Pact is the formal answer but adds a broker, a workflow, and another piece of infrastructure for a single cross-process boundary. A recorded fixture suite is 80% of the value at 10% of the operational cost — until we have ≥3 cross-team REST clients, recorded fixtures win.

### 3.3 Tier 3 — Integration (new, the meat)

**Purpose**: exercise `aiwg serve` end-to-end (HTTP routes + WS PTY bridge + sandbox-registry event stream) against an **in-process fake sandbox** that implements the same HTTP+WS surface as the real one.

**Components**:

1. **Fake sandbox harness** (new, reusable): a small Hono server bound to an ephemeral port, plus a WS event stream that emits the same `agent.sessions`, `agent.status`, `pane.attached` shapes as the real backend. Stored at `test/fixtures/fake-sandbox/`. Shared across integration tests.
2. **End-to-end suite**: drives `aiwg serve`'s HTTP API and WS bridge, asserts on the resulting registry state, telemetry events, and pane lifecycle. New file: `test/integration/serve-sandbox-fake.test.mjs`.
3. **WS PTY bridge resilience**: a focused resilience suite covering reconnect-after-disconnect, write back-pressure, child-pty kill/respawn, message ordering under load. New file: `test/integration/serve-pty-bridge.test.mjs`.

**Why a fake server, not mocks**: WebSocket streaming and HTTP+SSE timing behavior cannot be honestly mocked at the function level. Putting a real `hono/node-server` on `127.0.0.1:0` and treating `aiwg serve` as a black box is the only way to catch race conditions in event delivery, pane attach ordering, and reconnect logic. The fake harness is single-purpose and ~300 LoC.

**Tooling**: vitest integration; `pool: forks, singleFork: true` to mirror the daemon UAT config (avoids socket conflicts); `hono` + `@hono/node-server` (already optional deps for `aiwg serve`); `ws` for WS client side.

### 3.4 Tier 4 — Live UAT (new, gated)

**Purpose**: validate against the real agentic-sandbox. Catches everything contract + fake cannot — actual VM lifecycle, real PTY allocation, real telemetry, real failure modes.

**Approach**: a `daemon-live-*` style UAT suite gated on `AIWG_SANDBOX_ENDPOINT`. Skips with a clear message when unset. Mirrors the existing `vitest.uat-daemon.config.js` pattern (single fork, 6 min per test, not in CI).

**Scope**: 5–8 scenarios covering register → list → start VM → attach pane → exec command → stop → deregister, plus failure-injection (kill VM mid-session, network partition, etc.).

**Run cadence**: pre-release gate (already documented in CLAUDE.md release checklist), local manual on demand.

**File**: `test/uat/serve-sandbox-live.uat.mjs`.

### 3.5 Tier Mapping Summary

| Tier | What | Backend | Network | CI? | New work |
|------|------|---------|---------|-----|----------|
| 1 — Unit | Module-level logic | Mocked | None | Yes (`test:ci`) | Gap-fill on 4 modules |
| 2 — Contract | HTTP client vs recorded fixtures | Recorded fixture | None | Yes (`test:ci`) | New suite + fixture set + recorder script |
| 3 — Integration | `aiwg serve` end-to-end | In-process fake (Hono+WS) | localhost only | Yes (`test:ci`) | Fake harness + 2 suites |
| 4 — Live UAT | Real `aiwg serve` against real sandbox | Real backend | Real | No (gated) | New suite + config wiring |

## 4. Test Approach by Risk

Each row of the risk register pulls a test from one of the tiers above:

| Risk | Likelihood | Impact | Tier covering it |
|------|------------|--------|-------------------|
| agentic-sandbox proto/REST drift unnoticed in AIWG | Medium | High | Tier 2 (contract) |
| WS PTY bridge loses messages under load | Medium | High | Tier 3c (resilience) |
| Sandbox registry inconsistency on rapid register/deregister | Medium | Medium | Tier 1 (extend) + Tier 3 |
| Pane attach race conditions in multi-pane stack | Medium | Medium | Tier 3 |
| Auth token leakage via WS handshake | Low | Critical | Tier 1 (focus on `pty-bridge` auth) + Tier 4 |
| Daemon supervisor restarts loop on partial sandbox failure | Low | High | Tier 4 + existing supervisor unit tests |
| HITL drawer drops pending requests after server restart | Low | Medium | Tier 3 (telemetry persistence) |
| Connection leak on `aiwg serve` SIGINT | Medium | Low | Tier 1 + Tier 3 |
| Sandbox identity store corruption on crash | Low | Medium | Already covered by `sandbox-identity-store.test.ts` (#969) |

## 5. Test Data and Fixtures

### 5.1 Fixture Inventory (planned)

```
test/fixtures/
├── sandbox-api/                       # Tier 2 (recorded HTTP)
│   ├── register.json
│   ├── list-instances.json
│   ├── start-vm.json
│   ├── allocate-pty.json
│   ├── attach-pane.json
│   ├── stream-events.json             # WS event recordings (sandbox-level)
│   └── executor-v1/                   # AIWG ↔ sandbox executor contract v1 (#1180)
│       ├── README.md                  # Source-of-truth pointer + recorder workflow
│       ├── registration/
│       │   ├── register-request.json  # POST /api/v1/executors/register
│       │   ├── register-response.json # bearer token issued
│       │   └── deregister-request.json
│       ├── dispatch/
│       │   ├── dispatch-request.json  # POST /api/v1/sessions/:id/dispatch
│       │   ├── dispatch-response.json # 202 Accepted envelope
│       │   └── dispatch-errors.json   # 401 / 404 / 503 / 500 problem-json
│       ├── events/                    # Mission lifecycle wire shapes
│       │   ├── mission-assigned.json
│       │   ├── mission-started.json
│       │   ├── mission-progress.json
│       │   ├── mission-hitl-required.json
│       │   ├── mission-hitl-responded.json   # AIWG → sandbox (inbound)
│       │   ├── mission-suspended.json
│       │   ├── mission-reconnected.json
│       │   ├── mission-resumed.json
│       │   ├── mission-completed.json
│       │   ├── mission-failed.json
│       │   └── mission-aborted.json
│       └── resync/
│           └── executor-resync.json   # First frame on every WS reconnect
├── fake-sandbox/                      # Tier 3 (in-process fake)
│   ├── server.mjs                     # Hono server + WS event emitter
│   ├── scenarios/
│   │   ├── happy-path.mjs
│   │   ├── slow-events.mjs
│   │   ├── partition.mjs
│   │   └── crash-recovery.mjs
│   └── README.md
└── sandbox-events/                    # Shared sample events
    └── agent-sessions-v1.json
```

**Note (2026-05-12 / #1180)**: Sandbox conformance to the executor contract is now exercised through `test/fixtures/sandbox-api/executor-v1/` — these fixtures freeze the wire shapes for registration, dispatch, the 11 mission lifecycle event types, and `executor.resync`. Contract-tier tests assert that AIWG's parsers accept the canonical shapes and reject shape-shifted negatives; integration-tier tests replay them through the fake-sandbox harness without needing a live sandbox. The recorder script (§5.2 below) should refresh both the legacy `sandbox-api/*.json` set **and** `executor-v1/**/*.json` in the same pass.

### 5.2 Recorder Workflow

```bash
# One-time setup (manual)
export AIWG_SANDBOX_ENDPOINT=http://localhost:8122
node tools/scripts/record-sandbox-api.mjs --output test/fixtures/sandbox-api/

# When backend changes ship
node tools/scripts/record-sandbox-api.mjs --diff
```

The recorder is idempotent and overwrites only on `--write`. Fixture diffs are reviewed in the PR that updates them.

## 6. Tooling

| Concern | Tool | Status |
|---------|------|--------|
| Test runner | vitest 2.1 | Existing |
| Coverage | @vitest/coverage-v8 | Existing |
| HTTP intercept (Tier 2) | undici MockAgent | Built-in to Node 20+ |
| Fake server (Tier 3) | hono + @hono/node-server | Already optional dep |
| WS client (Tier 3) | ws | Existing transitive |
| Process control (Tier 4) | child_process.spawn (existing pattern from daemon UAT) | Existing |
| CI wiring | `.gitea/workflows/ci.yml` | Existing — extend `test:ci` script to include new tiers |

No new top-level dependencies are required. This is a deliberate constraint to keep the supply-chain trust surface (per `supply-chain-trust` rule) unchanged.

## 7. CI Integration

Proposed `package.json` script changes:

```json
"test:contract": "vitest run --config config/vitest.config.js test/contract",
"test:integration:serve": "vitest run --config config/vitest.integration.config.js test/integration/serve-*.test.mjs",
"test:ci": "npm test && npm run test:contract && npm run test:integration:serve && npm run uat",
"uat:serve-live": "vitest run --config config/vitest.uat-daemon.config.js test/uat/serve-sandbox-live.uat.mjs"
```

Tier 4 (`uat:serve-live`) is **not** in `test:ci` — it requires `AIWG_SANDBOX_ENDPOINT`. It joins the existing pre-release UAT gate (CLAUDE.md release checklist).

CI wall-clock impact: contract tier ≤ 5s, integration tier ≤ 60s in budget — total `test:ci` increase ≤ 90s.

## 8. Effort and Decomposition

Per the `no-time-estimates` rule, effort is expressed in scope units, agents, parallelism, and pass count — not hours.

### 8.1 Scope Units

| # | Scope unit | Tier | Acceptance |
|---|---|---|---|
| 1 | Tier-1 gap-fill: `pty-bridge` auth, `agent-router` filters, `sandbox-transport` error paths, `web-server` routes | 1 | All four modules ≥ 85% line coverage |
| 2 | Recorder script + fixture set for sandbox HTTP API | 2 | Recorder runs cleanly against a real sandbox; fixtures committed |
| 3 | Tier-2 contract suite (replay against fixtures) | 2 | All consumed endpoints have a contract test; drift produces a failed test |
| 4 | Fake sandbox harness (Hono + WS, scenario-driven) | 3 | Importable from any integration test; 4 scenarios working |
| 5 | Tier-3a integration suite — `aiwg serve` end-to-end against fake | 3 | Register → list → start → attach → exec → stop covered |
| 6 | Tier-3c WS PTY bridge resilience suite | 3 | Reconnect, back-pressure, kill/respawn, message ordering each have ≥ 1 test |
| 7 | Tier-4 live UAT suite | 4 | 5–8 scenarios; gates on `AIWG_SANDBOX_ENDPOINT`; passes against current sandbox release |
| 8 | CI wiring + per-directory coverage thresholds | infra | `test:ci` includes new tiers; PR fails on `src/serve/**` coverage drop > 2% |

### 8.2 Agent Count and Roles

- Test Engineer (primary author of tiers 1, 3, 4)
- Software Implementer (fake sandbox harness — scope unit 4)
- API Designer (contract recorder + fixture format — scope unit 2)
- Test Architect (this document; reviews each scope unit on completion)
- Reliability Engineer (reviews resilience suite — scope unit 6)
- DevOps Engineer (CI wiring — scope unit 8)

### 8.3 Parallelism Map

```
Sequential gate: scope unit 4 (fake harness) blocks scope units 5 and 6
Sequential gate: scope unit 2 (recorder + fixtures) blocks scope unit 3

Parallel batch 1 (no dependencies):
  - 1 (Tier-1 gap-fill)
  - 2 (recorder + fixtures)
  - 4 (fake harness)
  - 7 (Tier-4 live UAT — independent of fake)

Parallel batch 2 (after batch 1):
  - 3 (Tier-2 contract suite — needs 2)
  - 5 (Tier-3 integration — needs 4)
  - 6 (Tier-3 resilience — needs 4)

Sequential tail:
  - 8 (CI wiring — after all suites exist)
```

### 8.4 Pass Estimate

Quality gate: `npm run test:ci` exits 0 with no skipped tests; coverage thresholds met.

Estimated passes per scope unit: 2–3.
- Pass 1: implement
- Pass 2: fix failures revealed when integration meets reality
- Pass 3 (some units): tighten flaky reconnect / timing tests

## 9. Entry and Exit Criteria

### 9.1 Entry (work can begin)

- [ ] This strategy reviewed and approved (parent issue closes review gate)
- [ ] Scope-unit issues filed and assigned (see §11)
- [ ] Test fixture directory structure scaffolded
- [ ] One operator with access to a real agentic-sandbox instance for recording (scope unit 2 only)

### 9.2 Exit (strategy considered executed)

- [ ] All 8 scope units complete
- [ ] `npm run test:ci` passes with new tiers active
- [ ] Coverage thresholds enforced and met for `src/serve/**` and `tools/daemon/**`
- [ ] Tier-4 live UAT passes against the latest agentic-sandbox release
- [ ] Master test plan (`.aiwg/testing/master-test-plan.md`) updated to reference this strategy

## 10. Risks to the Strategy Itself

| Risk | Mitigation |
|------|------------|
| Fake sandbox diverges from real sandbox over time | Tier-2 contract tests catch drift on every recorder refresh; Tier-4 live UAT catches drift on every release |
| Recorded fixtures become stale silently | CI runs Tier 2 on every push; staleness shows up as a contract-violation diff |
| Tier-3 resilience tests become flaky on slow CI | Use deterministic WS event ordering in fake harness; budget tests with explicit ranges, not time-based asserts |
| Tier-4 live UAT cannot run on shared infra | Gate via `AIWG_SANDBOX_ENDPOINT`; document the local-only run path; never block release on infra owned by another team |
| Adding `nock`/`msw` dependency creeps in | Use `undici` MockAgent (Node-builtin) — explicit zero-new-deps constraint in §6 |

## 11. Issue Decomposition (to be filed)

This strategy decomposes into one parent epic + six children, mapped 1:1 to scope units 1–6 (units 7 and 8 fold into the live-UAT and CI issues respectively).

| Issue | Title (proposed) | Scope unit |
|-------|------------------|------------|
| Parent | Test strategy: daemon + `aiwg serve` + agentic-sandbox seam | n/a (epic) |
| Child 1 | Tier-1 gap-fill for serve and daemon modules | 1 |
| Child 2 | Tier-2 contract tests for `SandboxTransport` (recorder + fixtures + replay suite) | 2, 3 |
| Child 3 | Fake agentic-sandbox harness (Hono + WS, scenario-driven) | 4 |
| Child 4 | Tier-3 integration suite for `aiwg serve` against fake sandbox | 5 |
| Child 5 | Tier-3 WS PTY bridge resilience suite | 6 |
| Child 6 | Tier-4 live UAT for `aiwg serve` against real agentic-sandbox + CI wiring | 7, 8 |

Final filing list and IDs land in the parent epic comment after issues are created.

## 12. Approvals

| Role | Reviewer | Status |
|------|----------|--------|
| Test Architect | (this doc) | DRAFT |
| Architecture Designer | TBD | Pending |
| Security Architect | TBD | Pending |
| Reliability Engineer | TBD | Pending |

Strategy moves from DRAFT → BASELINED on parent-epic close.

## 13. References

- `.aiwg/testing/master-test-plan.md` — parent plan
- `.aiwg/testing/test-strategy-project-local.md` — sibling strategy, structural template
- `.aiwg/architecture/adr-daemon-as-headend.md` — daemon role
- `.aiwg/architecture/adr-daemon-docker.md` — sandbox lifecycle
- `docs/serve-guide.md` — current `aiwg serve` user surface
- `docs/daemon-guide.md` — daemon operator guide
- `tools/daemon/sandbox-transport.mjs` — the cross-process seam
- `src/serve/sandbox-registry.ts` — in-memory state of registered sandboxes
- `config/vitest.config.js` — global thresholds and exclusions
- `config/vitest.uat-daemon.config.js` — pattern for Tier-4 UAT
- `agentic/code/frameworks/sdlc-complete/templates/test/test-strategy-template.md` — RUP template (this doc is the populated form)
