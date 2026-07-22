# Cockpit Development, Testing & the Mock Boundary

Cockpit formalizes four patterns — **dev / test / mock / release** — so a
developer goes from clone to a working full-system setup in one command,
mocks stay contract-faithful test doubles, and configs are tested sane
defaults (epic roctinam/aiwg#1633).

## One-command bring-up

```bash
npm run cockpit:up          # from the repo root
```

`cockpit:up` guarantees a **real, current executor** is listening before the
Bridge starts: if nothing healthy answers on `AIWG_COCKPIT_EXECUTOR_URL`
(default `http://127.0.0.1:8122`), it launches the agentic-sandbox executor
via that repo's own dev runner, then starts the Bridge + UI.

Knobs:

| Variable | Effect |
|---|---|
| `AIWG_COCKPIT_ENSURE_EXECUTOR=0` | Skip the executor-ensure step (one is already running) |
| `AIWG_COCKPIT_START_HOST_DAEMON=1` | Also start the optional host-runtime daemon |
| `AIWG_COCKPIT_EXECUTOR_TOKEN_FILE=/mode-600/path` | Authenticate Bridge and live-UAT executor calls without placing the bearer in argv, URLs, or browser state |

Cockpit-only launcher (assumes/starts an executor best-effort):

```bash
npm --prefix apps/cockpit run dev
```

Manual equivalent:

```bash
npm --prefix apps/cockpit run build:web
AIWG_COCKPIT_EXECUTOR_URL=http://127.0.0.1:8122 node apps/cockpit/bridge/src/server.mjs
```

## Ports

Sane, non-colliding defaults are enforced, not suggested:

- The agentic-sandbox canonical dev runner binds **8120** (gRPC), **8121**
  (pty-ws), **8122** (HTTP).
- The Bridge defaults to **8140** — off that range — and **throws at startup
  if pointed at a reserved executor port** (8120–8122) instead of silently
  squatting on one. Override with `PORT` or `AIWG_COCKPIT_BRIDGE_PORT`.

## The mock boundary

`apps/cockpit/mock-executor` is a wire-faithful, dependency-free stand-in for
the agentic-sandbox executor (discovery + A2A v2 + pty-ws surfaces;
conformance 33 pass / 0 fail / 17 skip). Its role is strictly bounded:

- **Automated tests and PoCs only.** The Bridge's real-executor assertion
  refuses a mock-like upstream for human launches; only an automated harness
  may set `AIWG_COCKPIT_ALLOW_MOCK_EXECUTOR=1`.
- **Contract parity is guarded.** A CI contract guard pins the mock's known
  legacy divergences from the real v2 executor, so *new* drift fails CI
  rather than silently teaching the UI wrong shapes.
- **Never published.** The mock is excluded from both the base `aiwg` package
  and the `@aiwg/cockpit` files allowlist.

Human dev/test launches always target a real executor.

## Verification tiers

Tests run at committed stages — never ad-hoc `/tmp` rigs:

| Stage | Command | Executor | When |
|---|---|---|---|
| Unit / integration | `npm --prefix apps/cockpit run check` (build:web + typecheck + render/a11y tests + smokes + PoCs) · `npx vitest run test/integration/cockpit-bridge.test.js` | mock | always (CI) |
| Base-footprint guard | `npx vitest run test/smoke/cockpit-base-footprint.test.js` | — | always (CI); proves Cockpit ships nothing into the base `aiwg` tarball |
| Dev full-system e2e | `npm run e2e:cockpit-dev` | **real**, safe-skips when absent (`AIWG_COCKPIT_E2E_REQUIRED=1` to force) | non-blocking |
| Live UAT | `npm run uat:cockpit-live` | **real** (`AIWG_COCKPIT_LIVE_REQUIRED=1` for release) | opt-in |
| Release matrix | `npm run uat:cockpit-live:matrix` | **real** — host, docker/container, and VM families | release gate |

The dev e2e drives the real control-plane chain end to end: health →
inventory → create a managed session → list → verify the attach URL.

The release matrix goes much further: for each runtime family it verifies
inventory normalization, runtime and transport posture, session-backend
evidence, session create/list, observe attach, and a **provider-backed
workload** — a real Codex or Claude invocation inside the attached session
that must prove AIWG discovery works from that environment. Optional modes
prove the provisioning path itself (`AIWG_COCKPIT_LIVE_PROVISION=1`, which
launches instances through the executor's admin API and drives the workload
against exactly those instances) and controller-side PTY mutation. Reports
land in `test-results/` (JSON + markdown), with per-family pass/fail records.

Mock-only success never satisfies the live gates.

## Repository layout for contributors

See [Architecture → Component map](./architecture.md#component-map). The
quick version: the Bridge is a single-file, framework-free Node server; the
web app is React 19 + Vite under `apps/cockpit/web`; `shell-core` is the
shared shell handshake; contributions are declarative JSON validated against
a schema. New operator-console development happens here — not in the legacy
`apps/web` serve dashboard.

## See also

- [Releases](./releases.md) — the pre-tag gate that reuses these tiers
- [Bridge API](./bridge-api.md) — environment variables the launchers set
