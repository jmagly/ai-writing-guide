<div align="center">

# AIWG Cockpit

**Local control plane for AIWG and multi-stack agentic sessions**

Observe live agent work, attach to sessions, handle approvals, launch runtime
targets, and coordinate AIWG actions from one local operator surface. Cockpit
fronts the AIWG CLI and the agentic-sandbox executor; it does not replace either.

```bash
npm i -g aiwg        # install the base AIWG CLI
aiwg use cockpit     # install the opt-in Cockpit package, version-locked to AIWG
aiwg cockpit         # launch the local Bridge + web UI
```

[![npm version](https://img.shields.io/npm/v/%40aiwg%2Fcockpit/latest?label=%40aiwg%2Fcockpit&color=CB3837&logo=npm&style=flat-square)](https://www.npmjs.com/package/@aiwg/cockpit)
[![base package](https://img.shields.io/npm/v/aiwg/latest?label=aiwg&color=CB3837&logo=npm&style=flat-square)](https://www.npmjs.com/package/aiwg)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://github.com/jmagly/aiwg/blob/main/LICENSE)
[![Node Version](https://img.shields.io/badge/node-%E2%89%A518.0.0-brightgreen?style=flat-square&logo=node.js)](https://nodejs.org)
[![Repository](https://img.shields.io/badge/source-jmagly%2Faiwg-black?logo=github&style=flat-square)](https://github.com/jmagly/aiwg/tree/main/apps/cockpit)

[**Quick Start**](#quick-start) · [**What You Get**](#what-you-get) · [**Architecture**](#architecture) · [**Verify**](#verify) · [**Release Pattern**](https://github.com/jmagly/aiwg/blob/main/apps/cockpit/RELEASE.md)

</div>

---

## Quick Start

The recommended path is through the base `aiwg` CLI. It installs Cockpit outside
the base package footprint, under `~/.aiwg/cockpit/package`, and pins the Cockpit
version to the installed AIWG version.

```bash
npm i -g aiwg
aiwg use cockpit
aiwg cockpit --status
aiwg cockpit
```

For direct package testing, you can install the scoped package itself:

```bash
npm i -g @aiwg/cockpit
aiwg-cockpit
```

Cockpit expects a reachable agentic-sandbox executor. By default the Bridge looks
for `http://127.0.0.1:8122` and serves the local UI on `127.0.0.1:8140`.

```bash
AIWG_COCKPIT_EXECUTOR_URL=http://127.0.0.1:8122 aiwg cockpit
```

## What You Get

- **Home** — connected-state overview, first-run flow, and a session-first entry point.
- **Inventory** — host, container, Docker, and VM runtime targets with lifecycle controls.
- **Running** — active work across stacks, spend posture, and task stop controls.
- **Missions** — read-only Mission Control projection: sessions, per-mission status, audit tail.
- **Sessions** — observe-first terminal attach, explicit drive/control, replay posture, and stale-agent recovery.
- **Approvals** — unified human-in-the-loop decision inbox.
- **Explore** — live index status/query/rebuild plus read-only AIWG capability catalog.
- **Library** — user-owned assets cloned/imported under `~/.aiwg/cockpit/library`.
- **Telemetry** — unified event feed, Mission/session/task/approval/inventory posture, and spend.
- **Memory** — browser-local operator notes plus Mission completion notes from MC state.
- **Actions** — contributed actions, first-party screens, and workflows; action steps inject commands into an agentic session.

## What Cockpit Is

Cockpit is a **session-control surface, not a CLI runner**. Agents run the CLI;
you direct the agents. An action button injects a command into an agentic
session, and the agent in that session runs it. Cockpit sources read-only catalog
data for display and sends control-plane requests through a local token-gated
Bridge.

Cockpit is also **opt-in and separately published**. Nothing here ships in the
base `aiwg` npm package; `test/smoke/cockpit-base-footprint.test.js` guards that
boundary.

## What Cockpit Is Not

- **Not a replacement for `aiwg`.** The CLI remains the source of truth for AIWG
  install, deploy, discovery, and maintenance operations.
- **Not an agent runtime.** Agent execution belongs to the provider stack and the
  agentic-sandbox executor.
- **Not cloud-hosted.** The current surface is local-first: loopback Bridge,
  token-gated browser/VS Code/Tauri shells, and operator-owned runtime files.

## Installation Troubleshooting

If `aiwg cockpit` reports that Cockpit is not installed, run:

```bash
aiwg use cockpit
```

If the installed Cockpit version does not match the base AIWG version, refresh it
the same way:

```bash
aiwg use cockpit
```

If direct global npm install fails with `EACCES`, use the same npm global-prefix
fix documented in the root AIWG README, or prefer the base CLI path above so the
Cockpit package is installed under `~/.aiwg/cockpit/package`.

## Architecture

```
operator / CLI:  aiwg cockpit
       │  spawns the Bridge; writes OS keychain token + ~/.aiwg/cockpit/runtime/bridge.json (0600)
       ▼
┌─────────────────────────────────────────────────────────────┐
│ Bridge (127.0.0.1, token-gated /api)                         │
│  · control plane: inventory, lifecycle, running, approvals,  │
│    cost, sessions (create + attach_url), contributions       │
│  · read-only catalog: aiwg discover / show (display only)    │
│  · user asset library: clone/import/delete (never writes AIWG)│
│  · serves the built React app (token-injected)               │
└─────────────────────────────────────────────────────────────┘
       │ authenticated proxy            ▲ loads the token-gated shell
       ▼                                │
  agentic-sandbox executor       ┌──────┴──────┬───────────────┐
                                 browser     VS Code webview   Tauri window
  · A2A v2 + pty-ws/v1           (apps/cockpit/{web,vscode,desktop})
```

- **Control plane** (lifecycle, approvals, actions) goes through the gated Bridge.
- **Data plane** (the PTY session stream) also goes through a Bridge-owned
  `attach_url`. The browser presents only its per-launch Cockpit token; the
  Bridge keeps the long-lived executor credential and authenticates the upstream
  WebSocket upgrade.

## Surfaces (tabs)

| Tab | What it does |
|---|---|
| **Home** | Guided first-run: what-is-this, live status, the **Start a session** primary verb, first-run tour. |
| **Inventory** | Instances + lifecycle (Start/Stop/Destroy). |
| **Running** | Running work across stacks + cross-stack spend + per-task Stop. |
| **Missions** | Read-only Mission Control projection — durable `aiwg mc` sessions merged with the live executor task session. |
| **Sessions** | Live pty terminal — observe/drive, keyframe, non-destructive replay, stale-agent recovery; inline **＋ capability picker**. |
| **Approvals** | Unified HITL inbox (`hitl-prompt/v1`); decisions = operator authorization. |
| **Explore** | Live artifact-index status/query/rebuild plus read-only AIWG catalog search. |
| **Library** | Your own assets — clone from the catalog / import / remove. AIWG files never overwritten. |
| **Telemetry** | Unified event model over inventory, sessions, tasks, approvals, Missions, and cost posture. |
| **Memory** | Operator notes and auto-created Mission completion notes from durable `aiwg mc` state. |
| **Actions** | Contributed actions, first-party screens, and workflows. Action steps **inject a command into a session** (the agent runs it). |

## Runtime, Session, and Trust Posture

Cockpit renders the runtime tier reported by agentic-sandbox instead of assuming
only VM/container instances. Known tiers are displayed as:

- `host` — full host access / least isolated. The host runtime daemon status is
  shown separately from the Cockpit Bridge state (`available`, `stopped`,
  `permission_denied`, `degraded`, etc.). Cockpit may show the documented
  operator command to start or reconnect the daemon, but it does not silently
  install or start it.
- `container` / `docker` — shared-kernel isolation.
- `vm` — stronger VM boundary.
- any future kind — opaque/degraded rather than broken UI.

Session creation uses sandbox-advertised backend pairs. Operators choose
direct/native or managed backends such as `tmux`, `screen`, or `zellij` when the
sandbox reports support. Attach remains observe-first; drive/control is explicit
and backend denial reasons stay visible in the session surface.

Transport trust is a separate badge from local Cockpit auth. Cockpit observes and
relays Bridge-to-agentic-sandbox posture (`loopback-rest`, UDS, vsock, mTLS local
CA, bootstrap-token enrollment, legacy shared-secret compatibility) without
storing tokens, private keys, CSRs, or bearer material in UI state, logs, or
activity payloads. Legacy shared-secret and TOFU paths render as compatibility or
degraded, not default-green. Agentic-sandbox owns transport provisioning and peer
identity enforcement; Cockpit owns visibility and audit presentation.

Set `AIWG_COCKPIT_KEYCHAIN_STRICT=1` when shells must refuse plaintext runtime
tokens. In strict mode the Bridge exits if it cannot persist the per-launch token
to the OS keychain, and shell-core refuses runtime files that only contain a
plaintext token. Operator intent is also recorded in a local redacted audit log
under `~/.aiwg/cockpit/audit/events.jsonl` for lifecycle, session, and
approval-response decisions (the web UI additionally records action injections
as operator intents); bearer material and provider credentials are redacted
before write.

For an executor with operator bearer authentication enabled, store the selected
least-privilege token in a mode-600 file and point the Bridge at the file:

```bash
AIWG_COCKPIT_EXECUTOR_TOKEN_FILE=/protected/path/cockpit-executor.token \
AIWG_COCKPIT_EXECUTOR_URL=http://127.0.0.1:8122 \
aiwg cockpit
```

The file contains one token. It is re-read for rotation, never copied into the
browser, argv, URLs, reports, or audit records, and fails closed when its POSIX
permissions allow group/other access.

## Run (dev/test, against a real agentic-sandbox executor)

One command (#1634) — prefers a reachable real executor, builds the web UI if
needed, and launches the Bridge on its off-range default port:

```bash
npm --prefix apps/cockpit run dev            # → apps/cockpit/scripts/cockpit-dev.sh
```

It refuses to run against the bundled mock (automated-test-only). If no executor
is reachable, Bridge startup best-effort launches an installed `agentic-mgmt`
binary before serving Cockpit. Override `AIWG_COCKPIT_EXECUTOR_URL` (default
`http://127.0.0.1:8122`) or `PORT` (default `8140`). Set
`AIWG_COCKPIT_EXECUTOR_COMMAND` to pin the autostart command, or
`AIWG_COCKPIT_AUTOSTART_EXECUTOR=0` to require an already-running executor.

**Bring up both halves at once (#1634).** `npm run cockpit:up` (→
`apps/cockpit/scripts/cockpit-up.sh`) guarantees a real, current executor is
listening *before* the Bridge starts: it launches the agentic-sandbox executor
via its own `management/dev.sh` when one isn't already healthy on
`AIWG_COCKPIT_EXECUTOR_URL` (default `http://127.0.0.1:8122`), then delegates to
`cockpit-dev.sh` for the Bridge + UI. Set `AIWG_COCKPIT_ENSURE_EXECUTOR=0` to
skip the executor-ensure step when a sandbox is already running, or
`AIWG_COCKPIT_START_HOST_DAEMON=1` to also start the optional host-runtime
daemon. `cockpit-dev.sh` stays the Cockpit-only launcher.

Equivalent manual steps:

```bash
npm --prefix apps/cockpit run build:web                 # install + vite build → web/dist
AIWG_COCKPIT_EXECUTOR_URL=http://127.0.0.1:<executor-port> \
  node apps/cockpit/bridge/src/server.mjs
```

**Ports (sane defaults, #1634).** The agentic-sandbox canonical dev runner
(`management/dev.sh`) binds `8120` (gRPC) / `8121` (WS) / `8122` (HTTP). The
Bridge therefore defaults to **`8140`** — off that range — so `node
bridge/src/server.mjs` against a canonical executor on `8122` never collides.
Override with `PORT` (or `AIWG_COCKPIT_BRIDGE_PORT`); the Bridge refuses to start
on a reserved executor port (`8120/8121/8122`) rather than silently squat on it.

`EXECUTOR_URL` is accepted as a short alias, but new launch scripts should use
`AIWG_COCKPIT_EXECUTOR_URL`. Human dev/test launches must point at a real
agentic-sandbox executor. The bundled mock is reserved for automated tests and
PoCs; if a mock-like executor is detected, the Bridge refuses it unless
`AIWG_COCKPIT_ALLOW_MOCK_EXECUTOR=1` is set by an automated harness.

The Bridge probes legacy (`/admin/instances`) and v2 (`/api/v2/admin/instances`)
admin surfaces as fallback candidates for inventory and lifecycle; running work
and approvals are derived from per-instance A2A task lists rather than any
admin `/running` route. Field normalization covers snake_case and camelCase
payloads so live sandboxes can evolve without breaking the operator UI; unknown
fields degrade to opaque posture rather than failing the screen.

The top-bar **Launch instance** command provisions additive runtime targets
through the real executor (`POST /api/v2/admin/instances`) for host, Docker, and
QEMU/VM launches. Cockpit does not replace attached sessions when provisioning;
it refreshes inventory and leaves concurrency and resource admission to
agentic-sandbox.

### Recover stale agents

When a container, Docker, or VM runtime is still running but its agent
registration has disappeared, Cockpit keeps the row visible instead of hiding
it. Inventory and Sessions show `agent unreachable` and expose **Reconnect**
for stale container/Docker **and vm/qemu/kvm** rows (#1778). Use this when an
instance is alive but session attach, running projections, or actions cannot
resolve an agent id.

The Bridge handles recovery through:

1. executor-owned reconnect endpoints when the sandbox exposes one, then
2. local Docker fallback: `docker exec <container> agent-reconnect`, or
3. VM fallback (#1778): the same reconnect SIGHUP delivered through the libvirt
   qemu-guest-agent channel (`virsh qemu-agent-command <domain> guest-exec
   pkill -HUP -x agent-client`). Sessions survive reconnect on agentic-sandbox
   2026.7.8+ agents; older agents preserve only detached tmux sessions
   (agentic-sandbox#634).

The Docker fallback requires sandbox images that include the `agent-reconnect`
helper (agentic-sandbox v2026.7.5+ images); the VM fallback requires virsh
access to the domain from the Bridge host. If **Reconnect** reports that no
reconnect path is available, rebuild or repull the sandbox image, then start the
instance again. For host targets, prefer starting Cockpit with the host daemon:

```bash
AIWG_COCKPIT_START_HOST_DAEMON=1 npm run cockpit:up
```

After a successful reconnect, refresh Inventory, then attach from Sessions. A
Reconnect action never creates a replacement instance and never destroys the
running container; it only attempts to restore the missing agent registration.

`aiwg cockpit` (the operator command) will wrap this; the Bridge serves the built
React app token-injected, falling back to a legacy page when no build is present.

## Components

| Path | Role |
|---|---|
| `web/` | React 19 + Vite + TS UI (the surfaces above) |
| `mock-executor/` | **automated-test-only** wire-faithful agentic-sandbox A2A v2 stand-in (conformance 33/0/17). The Bridge refuses it for human launches (needs `AIWG_COCKPIT_ALLOW_MOCK_EXECUTOR=1`); a contract guard (#1636) pins its legacy `/admin/{running,approvals,cost}` divergence from real v2 so new drift fails CI. |
| `bridge/` | the registry-bound control-plane server + static serving |
| `shell-core/` | the cross-shell handshake (runtime token reference or fallback token → connect) |
| `vscode/` · `desktop/` | VS Code extension + Tauri shells over the same Bridge |
| `contrib/` | declarative UI contributions + schema (actions inject commands) |
| `poc/` | Iteration-1 risk-gate PoCs (kill-bridge isolation, security) |

## Verify

Tests run **at stages** — committed harnesses, never `/tmp` rigs (#1635):

| Stage | Command | Executor | CI |
|---|---|---|---|
| **Unit / integration** | `npm --prefix apps/cockpit run check` · `npx vitest run test/integration/cockpit-bridge.test.js` | **mock** (automated-test-only) | always |
| **Dev e2e** (full control-plane chain: health→inventory→create session→attach) | `npm run e2e:cockpit-dev` | **real**, safe-skip when absent | non-blocking |
| **Daily Linux operator gate** (protected auth + host/container + recovery + upgrade/rollback, #1842) | `npm run uat:cockpit-daily` | **real**, required/fail-closed | operator-scheduled |
| **Release matrix** (host/docker/vm + provider workload, #1621) | `npm run uat:cockpit-live:matrix` | **real**, all three families | release gate |

```bash
npm --prefix apps/cockpit run check     # build web + typecheck + render/a11y tests + smokes + PoCs
npx vitest run test/integration/cockpit-bridge.test.js   # Bridge contract + mock guard + port defaults (CI)
npx vitest run test/smoke/cockpit-base-footprint.test.js # base-npm guard (CI)
npm run e2e:cockpit-dev                                  # dev full-system e2e — real executor, skips cleanly
npm run uat:cockpit-live                                  # opt-in real sandbox posture gate
npm run uat:cockpit-daily                                 # required Linux daily gate (#1842)
npm run uat:cockpit-live:matrix                           # required host/docker/vm live matrix (#1621)
```

The daily gate's approvals, immutable-version inputs, operator hook contract,
host/container working-directory expectations, cleanup boundary, and report
schema are documented in
[Cockpit Daily Linux Operator Gate](../../docs/cockpit/daily-operator-gate.md).
VM and Apple remain reported preview tiers and do not block the first Linux
supported result.

The React UI is also browser-verified per surface (see `.playwright-mcp/cockpit-*.png`).
Conformance (`agentic-sandbox-conformance`) was 33 pass / 0 fail / 17 skip; the
Bridge-only additions since (session-create, library) don't touch the conformant
discovery/A2A/pty surfaces — re-run the harness after executor-surface changes.

`npm run uat:cockpit-live` targets `AIWG_COCKPIT_EXECUTOR_URL`, then
`AIWG_SANDBOX_ENDPOINT`, then `http://127.0.0.1:8122`. It skips with a clear
reason when no live sandbox is reachable so ordinary CI stays deterministic. Set
`AIWG_COCKPIT_LIVE_REQUIRED=1` for release/local validation where the live gate
must be green. The command writes `test-results/cockpit-live-uat.json` and
`test-results/cockpit-live-uat.md` by default; set
`AIWG_COCKPIT_LIVE_REPORT=.aiwg/testing/outputs/cockpit-live-uat-<date>` when the report
should be kept as a project artifact. If the upstream
`agentic-sandbox-conformance` harness is also run, set
`AIWG_SANDBOX_CONFORMANCE_REPORT=<path>` so the Cockpit live report links the
external conformance output. The harness also probes common executor identity
endpoints (`/health`, `/version`, `/api/version`, `/api/v2/version`) and records
safe version/build fields in the report. When the executor build does not expose
that metadata, set `AIWG_COCKPIT_EXECUTOR_VERSION=<tag-or-commit>` so release
evidence still names the tested agentic-sandbox build. A manual run against
agentic-sandbox `v2026.6.15` or newer should attach its markdown/JSON result to
epic roctinam/aiwg#1588 before the epic is considered done-done.

The executable release-validation procedure is
`.aiwg/testing/cockpit-real-integration-uat-runbook.md`. Use that runbook for
real executor smoke, Codex provider evidence (#1631), Claude auth/evidence
(#1632), strict host/container/VM matrix evidence (#1621), artifact naming, and
safe evidence handling. The older
`.aiwg/testing/cockpit-real-integration-uat-plan-2026-06-19.md` is the planning
source, not the operator procedure.

The stricter matrix gate for #1621 is intentionally separate from the mock lane:

```bash
AIWG_COCKPIT_EXECUTOR_URL=http://127.0.0.1:<real-executor-port> \
AIWG_COCKPIT_EXECUTOR_TOKEN_FILE=/protected/path/cockpit-executor.token \
AIWG_COCKPIT_LIVE_PROVIDER=codex \
npm run uat:cockpit-live:matrix
```

The token-file line is required when the executor has operator bearer auth
enabled and may be omitted only for an explicitly unauthenticated local
compatibility executor. The UAT uses the file for its direct readiness probes
and passes the same reference to the Bridge; report output records only whether
auth was configured, never the path or credential.

Use `AIWG_COCKPIT_LIVE_PROVIDER=claude` instead when the live workload should
exercise the pre-authenticated Claude session.

Matrix mode requires real `host`, `docker`/`container`, and `vm` runtime
families in inventory. For each target it verifies inventory normalization,
runtime and transport posture, session backend evidence, session create/list,
observe attach, and a minimal provider-backed workload through a controller
session when control is advertised. The selected provider is invoked through the
attached session (`codex exec -s read-only ...`
or `claude --print --permission-mode dontAsk --output-format text ...`) and must
emit `AIWG_COCKPIT_LIVE_OK` and the expected discovery result (`issue-audit` by
default). This proves a pre-authenticated agentic framework actually launched in
the target session and could use AIWG discovery from that environment, rather
than only proving shell plumbing or provider login. Set
`AIWG_COCKPIT_LIVE_DISCOVERY_EXPECT=<capability-name>` to validate a different
discovered framework capability, or `AIWG_COCKPIT_LIVE_WORKLOAD=<prompt>` to
replace the full prompt while still satisfying the marker and discovery checks.
Custom prompts must request the `AIWG_COCKPIT` and `_LIVE_OK` fragments without
containing the concatenated marker literally; this prevents terminal command
echo from being mistaken for provider output.
Set `AIWG_COCKPIT_LIVE_MATRIX_TARGETS=host` only for scoped rehearsal/evidence
when Docker/container or VM are intentionally out of scope; the default remains
`host,container,vm` for the release matrix. To prove controller-side PTY command
injection can mutate target data, set
`AIWG_COCKPIT_LIVE_MUTATION_FILE=<absolute-safe-test-path>` and optionally
`AIWG_COCKPIT_LIVE_MUTATION_TEXT=<expected-content>`. The harness opens a fresh
managed PTY session on the same target, observes it, drives a shell command via
`pty.session_input`, waits for `AIWG_COCKPIT_MUTATION_OK`, then reads the file
from the test runner and verifies the exact content.
The matrix report records each target family independently (`provision host`,
`matrix host`, `provision container`, `matrix container`, `provision vm`,
`matrix vm`) with the instance, runtime family, selected session backend,
provider, discovery expectation, running-projection count, report artifact paths,
and exact failure reason; the test aggregates those records and fails only after
all requested target families have been attempted. Mock-only success does not satisfy this gate;
`AIWG_COCKPIT_LIVE_ALLOW_MOCK_MATRIX=1` exists only for harness development.

To prove the launch path itself, set `AIWG_COCKPIT_LIVE_PROVISION=1`. In this
mode the matrix harness first calls the real executor admin API
(`POST /api/v2/admin/instances`) for each requested target, waits for the
operation to complete, waits for the instance to appear as running with a
registered agent and session backend, then sends the selected provider command
over the managed PTY interface. Provisioned instances are tracked by exact id so
the workload is driven against the instance created by the UAT run. Optional
overrides:

- `AIWG_COCKPIT_LIVE_PROVISION_NAME_PREFIX` names launched instances; default is
  `cockpit-uat`.
- `AIWG_COCKPIT_LIVE_PROVISION_LOADOUT` overrides the default host or VM loadout.
- `AIWG_COCKPIT_LIVE_PROVISION_IMAGE` overrides the Docker/container image.
- `AIWG_COCKPIT_LIVE_PROVISION_PROFILE` passes an executor profile.
- `AIWG_COCKPIT_LIVE_PROVISION_TIMEOUT_MS` controls operation and boot readiness
  timeout; default is `180000`.

### Live matrix prerequisites (#1621)

Before treating `uat:cockpit-live:matrix` as release evidence, provision all
three runtime families in the same real agentic-sandbox executor:

1. **Host** — a connected host agent must appear in `GET /api/v1/agents` with an
   `instance_id` matching a `host` item from `GET /api/v2/admin/instances`.
   Cockpit resolves this instance-to-agent mapping before session create/list.
2. **Docker/container** — a `docker` or `container` instance must register an
   agent and support managed session creation via
   `POST /api/v1/agents/{agent_id}/sessions`.
3. **VM** — a `vm` instance must register an agent and expose the same managed
   session API.

For each family, the executor must return enough metadata for Cockpit to prove
runtime posture, transport posture, session backend capability, session
create/list, observe attach, and the provider-backed controller workload. Set
`AIWG_COCKPIT_EXECUTOR_VERSION=<tag-or-commit>` when the executor does not expose
version metadata through `/health` or `/version`.

Known state as of the 2026-06-19 host live run:

- Host target passes against the local agentic-sandbox `4cb1c90` build using a
  real mTLS-registered host agent and a managed `tmux` session.
- Codex launched inside that managed host session and returned
  `AIWG_COCKPIT_LIVE_OK` plus `issue-audit`; evidence lives at
  `.aiwg/testing/outputs/cockpit-real-codex-matrix-2026-06-19.md/.json`.
- Cockpit also proved direct PTY command injection and mutation on the same real
  host path with `AIWG_COCKPIT_LIVE_MATRIX_TARGETS=host` and
  `AIWG_COCKPIT_LIVE_MUTATION_FILE`; evidence lives at
  `.aiwg/testing/outputs/cockpit-real-codex-mutation-2026-06-19.md/.json`, and the
  verified mutation artifact is
  `.aiwg/testing/outputs/cockpit-pty-mutation-2026-06-19.txt`.
- Claude launched inside the same real host-session path and also returned
  `AIWG_COCKPIT_LIVE_OK` plus `issue-audit`; evidence lives at
  `.aiwg/testing/outputs/cockpit-real-claude-matrix-2026-06-19.md/.json`.
- The previous Claude login-required blocker remains linked as
  roctinam/agentic-sandbox#499 for upstream regression tracking, but it was not
  reproduced by this isolated host proof.
- Docker/container secure bootstrap is fixed from the agentic-sandbox side in
  `v2026.6.24`; roctinam/agentic-sandbox#497 is closed. Re-validated Cockpit-side
  against `v2026.6.34`: container matrix PASS.
- VM bootstrap/readiness is fixed from the agentic-sandbox side via the vsock
  transport line (`v2026.6.31`–`v2026.6.34`); roctinam/agentic-sandbox#498 and
  the #561 transport regression are closed. Re-validated Cockpit-side against
  `v2026.6.34`: VM matrix PASS — provision → vsock enroll → boot-ready → provider
  workload → clean destroy. Evidence:
  `.aiwg/testing/outputs/cockpit-vm-vsock-2026-06-27.md/.json`.
- Instance **transport posture + host-daemon** now surface from the sandbox side
  (`dd97529 fix(admin-v2): expose instance transport posture`, plus `#611`
  host-runtime session listing). Re-validated Cockpit-side against `v2026.7.4`
  (2026-07-09): Inventory renders real posture per instance — Host + Container
  `Secure transport · mtls` (Host daemon `available`), enrolled VM `Local
  transport · vsock`, a mid-bootstrap VM showing transport `Unknown` with the
  informative posture `bootstrap-pending` (vs the old dead `unknown`; every
  enrolled instance now renders real posture). Session-list returns
  cleanly (no 502 — the `#140`/`#611` endpoints are live). Runtime coverage
  banner `host ✓ · docker ✓ · vm ✓`. Evidence:
  `.aiwg/testing/outputs/cockpit-7.4-transport-verify-2026-07-09.md` +
  `.aiwg/working/cockpit-7.4-inventory-2026-07-09.png`.
- Stale Docker/container agent recovery is wired through the Bridge and UI
  (2026-07-11): stale running instances remain visible as `agent unreachable`,
  Inventory and Sessions expose **Reconnect**, and the Bridge tries executor
  reconnect before Docker `agent-reconnect`. Host-daemon scoped live UAT passed
  against the real executor with `AIWG_COCKPIT_LIVE_PROVISION=1`,
  `AIWG_COCKPIT_LIVE_MATRIX_TARGETS=host`, and Codex provider workload evidence
  at `test-results/cockpit-live-host-daemon-2026-07-11.md/.json`.
- Remaining upstream follow-ups are Claude auth-state propagation
  (roctinam/agentic-sandbox#499) and agent-scoped PTY sessions not appearing in
  the formal/global session registry (roctinam/agentic-sandbox#500).

This gate extends #1617: #1617 proves Cockpit can talk to a reachable real
executor; #1621 proves coverage across the intended base host, container, and VM
runtime families. It also complements #1529 by exercising the operator-ready
provider session path instead of only the mock or shell plumbing.

## Status

Built and browser-verified, with release evidence wired to a real
agentic-sandbox executor through `AIWG_COCKPIT_EXECUTOR_URL`. The host target
(agentic-sandbox#460) and direct/managed multiplexer sessions
(agentic-sandbox#461) have landed upstream; the Bridge seam is now the
AIWG-side integration point for #1589. Runtime-tier provisioning and
host-daemon surfacing (roctinam/aiwg#1615) and transport-trust visibility (#1618)
**landed and are verified against `v2026.7.4`** — transport posture and
host-daemon now render per instance (a host-daemon *detail-status* payload
remains a residual under #1615). Direct/managed PTY negotiation (#1616) and the
live real-sandbox gate (#1617) continue. Secure transport details map back to agentic-sandbox#409/#410/#412; local
Browser/Tauri/VS Code-to-Bridge auth remains roctinam/aiwg#1595.

### Operator-wall review modes (#1622)

Connected Home exposes a `Wall review mode` control for the active design review:

- `Topology` is the default A1-style eleven-stack operator wall.
- `Handoff` emphasizes the A2-style mission route while keeping the same live
  data-bound nodes.
- Open `/?wall=handoff` to load the handoff review layout directly for browser
  capture or operator comparison.

The detailed review script and screenshot commands live in
`.aiwg/ux/cockpit-operator-wall-layout-review.md`.

## See also

- `apps/cockpit/RELEASE.md` — cockpit release pattern (channels, publish leg, config-defaults gate)
- `.aiwg/architecture/adr-cockpit-session-control-not-cli-runner.md` — the core model
- `.aiwg/architecture/cockpit-sad.md` + `cockpit-instance-control-interface.md`
- `.aiwg/ux/cockpit-ux-design.md` · `.aiwg/reports/cockpit-abm-gate.md`
- Epic roctinam/aiwg#1588
