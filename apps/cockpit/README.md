# AIWG Cockpit

A **UX-first control plane** over your AIWG install and the multi-stack agentic
sessions it runs — observe what agents are doing, take the wheel when you want, and
coordinate from one place. It fronts the CLI and the registry; it never replaces them.

> **The model (ADR):** the Cockpit is a *session-control surface, not a CLI runner*.
> **Agents run the CLI — you direct the agents.** An action button injects a command
> into an agentic session; the agent there runs it. The Cockpit only sources read-only
> catalog data for display. See `.aiwg/architecture/adr-cockpit-session-control-not-cli-runner.md`.

> **Opt-in, separately published.** Nothing here ships in the base `aiwg` npm package
> (guarded by `test/smoke/cockpit-base-footprint.test.js`).

## Architecture

```
operator / CLI:  aiwg cockpit
       │  spawns the Bridge; writes ~/.aiwg/cockpit/runtime/bridge.json (token+port, 0600)
       ▼
┌─────────────────────────────────────────────────────────────┐
│ Bridge (127.0.0.1, token-gated /api)                         │
│  · control plane: inventory, lifecycle, running, approvals,  │
│    cost, sessions (create + attach_url), contributions       │
│  · read-only catalog: aiwg discover / show (display only)    │
│  · user asset library: clone/import/delete (never writes AIWG)│
│  · serves the built React app (token-injected)               │
└─────────────────────────────────────────────────────────────┘
       │ proxies / sources              ▲ loads /?token=…
       ▼                                │
  agentic-sandbox executor       ┌──────┴──────┬───────────────┐
                                 browser     VS Code webview   Tauri window
  · A2A v2 + pty-ws/v1           (apps/cockpit/{web,vscode,desktop})
```

- **Control plane** (lifecycle, approvals, actions) goes through the gated Bridge.
- **Data plane** (the pty session stream) connects browser→executor directly via the
  `attach_url` the Bridge issues (WS masking differs per direction).

## Surfaces (tabs)

| Tab | What it does |
|---|---|
| **Home** | Guided first-run: what-is-this, live status, the **Start a session** primary verb, first-run tour. |
| **Inventory** | Instances + lifecycle (Start/Stop/Destroy). |
| **Running** | Running work across stacks + cross-stack spend + per-task Stop. |
| **Sessions** | Live pty terminal — observe/drive, keyframe, non-destructive replay; inline **＋ capability picker**. |
| **Approvals** | Unified HITL inbox (`hitl-prompt/v1`); decisions = operator authorization. |
| **Explore** | Read-only AIWG catalog — Tenor-style capability search (fortemi-react-modeled). |
| **Library** | Your own assets — clone from the catalog / import / remove. AIWG files never overwritten. |
| **Actions** | Contributed buttons that **inject a command into a session** (the agent runs it). |

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

## Run (dev/test, against a real agentic-sandbox executor)

One command (#1634) — checks for a reachable real executor, builds the web UI if
needed, and launches the Bridge on its off-range default port:

```bash
npm --prefix apps/cockpit run dev            # → apps/cockpit/scripts/cockpit-dev.sh
```

It refuses to run against the bundled mock (automated-test-only) and tells you
how to start the executor (`cd <agentic-sandbox>/management && ./dev.sh`) if none
is reachable. Override `AIWG_COCKPIT_EXECUTOR_URL` (default `http://127.0.0.1:8122`)
or `PORT` (default `8140`). Equivalent manual steps:

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

The Bridge keeps legacy admin-surface compatibility (`/admin/instances`,
`/admin/running`) for automated coverage, but dev/test launches should target
real agentic-sandbox v2 admin surfaces (`/api/v2/admin/instances`,
`/api/v2/admin/running`). Field normalization covers snake_case and camelCase
payloads so live sandboxes can evolve without breaking the operator UI; unknown
fields degrade to opaque posture rather than failing the screen.

`aiwg cockpit` (the operator command) will wrap this; the Bridge serves the built
React app token-injected, falling back to a legacy page when no build is present.

## Components

| Path | Role |
|---|---|
| `web/` | React 19 + Vite + TS UI (the surfaces above) |
| `mock-executor/` | **automated-test-only** wire-faithful agentic-sandbox A2A v2 stand-in (conformance 33/0/17). The Bridge refuses it for human launches (needs `AIWG_COCKPIT_ALLOW_MOCK_EXECUTOR=1`); a contract guard (#1636) pins its legacy `/admin/{running,approvals,cost}` divergence from real v2 so new drift fails CI. |
| `bridge/` | the registry-bound control-plane server + static serving |
| `shell-core/` | the cross-shell handshake (runtime token → connect) |
| `vscode/` · `desktop/` | VS Code extension + Tauri shells over the same Bridge |
| `contrib/` | declarative UI contributions + schema (actions inject commands) |
| `poc/` | Iteration-1 risk-gate PoCs (kill-bridge isolation, security) |

## Verify

Tests run **at stages** — committed harnesses, never `/tmp` rigs (#1635):

| Stage | Command | Executor | CI |
|---|---|---|---|
| **Unit / integration** | `npm --prefix apps/cockpit run check` · `npx vitest run test/integration/cockpit-bridge.test.js` | **mock** (automated-test-only) | always |
| **Dev e2e** (full control-plane chain: health→inventory→create session→attach) | `npm run e2e:cockpit-dev` | **real**, safe-skip when absent | non-blocking |
| **Release matrix** (host/docker/vm + provider workload, #1621) | `npm run uat:cockpit-live:matrix` | **real**, all three families | release gate |

```bash
npm --prefix apps/cockpit run check     # build web + typecheck + render/a11y tests + smokes + PoCs
npx vitest run test/integration/cockpit-bridge.test.js   # Bridge contract + mock guard + port defaults (CI)
npx vitest run test/smoke/cockpit-base-footprint.test.js # base-npm guard (CI)
npm run e2e:cockpit-dev                                  # dev full-system e2e — real executor, skips cleanly
npm run uat:cockpit-live                                  # opt-in real sandbox posture gate
npm run uat:cockpit-live:matrix                           # required host/docker/vm live matrix (#1621)
```

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
`AIWG_COCKPIT_LIVE_REPORT=.aiwg/testing/cockpit-live-uat-<date>` when the report
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
AIWG_COCKPIT_LIVE_PROVIDER=codex \
npm run uat:cockpit-live:matrix
```

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
Set `AIWG_COCKPIT_LIVE_MATRIX_TARGETS=host` only for scoped rehearsal/evidence
when Docker/container or VM are intentionally out of scope; the default remains
`host,container,vm` for the release matrix. To prove controller-side PTY command
injection can mutate target data, set
`AIWG_COCKPIT_LIVE_MUTATION_FILE=<absolute-safe-test-path>` and optionally
`AIWG_COCKPIT_LIVE_MUTATION_TEXT=<expected-content>`. The harness opens a fresh
managed PTY session on the same target, observes it, drives a shell command via
`pty.session_input`, waits for `AIWG_COCKPIT_MUTATION_OK`, then reads the file
from the test runner and verifies the exact content.
The matrix report records each target family independently (`matrix host`,
`matrix container`, `matrix vm`) with the instance, runtime family, selected
session backend, provider, discovery expectation, and exact failure reason; the
test aggregates those records and fails only after all three target families have
been attempted. Mock-only success does not satisfy this gate;
`AIWG_COCKPIT_LIVE_ALLOW_MOCK_MATRIX=1` exists only for harness development.

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
  `.aiwg/testing/cockpit-real-codex-matrix-2026-06-19.md/.json`.
- Cockpit also proved direct PTY command injection and mutation on the same real
  host path with `AIWG_COCKPIT_LIVE_MATRIX_TARGETS=host` and
  `AIWG_COCKPIT_LIVE_MUTATION_FILE`; evidence lives at
  `.aiwg/testing/cockpit-real-codex-mutation-2026-06-19.md/.json`, and the
  verified mutation artifact is
  `.aiwg/testing/cockpit-pty-mutation-2026-06-19.txt`.
- Claude launched inside the same real host-session path and also returned
  `AIWG_COCKPIT_LIVE_OK` plus `issue-audit`; evidence lives at
  `.aiwg/testing/cockpit-real-claude-matrix-2026-06-19.md/.json`.
- The previous Claude login-required blocker remains linked as
  roctinam/agentic-sandbox#499 for upstream regression tracking, but it was not
  reproduced by this isolated host proof.
- Docker/container target remains blocked upstream by secure transport material
  provisioning for the post-`AGENT_SECRET` model. Tracked in
  roctinam/agentic-sandbox#497.
- VM target remains blocked upstream because provisioning did not yield a
  registered agent/session target for the matrix. Tracked in
  roctinam/agentic-sandbox#498.

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
host-daemon UX are tracked in roctinam/aiwg#1615, direct/managed PTY negotiation
in #1616, the live real-sandbox gate in #1617, and transport-trust visibility in
#1618. Secure transport details map back to agentic-sandbox#409/#410/#412; local
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
