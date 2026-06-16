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

## Run (dev, against the bundled mock)

```bash
npm --prefix apps/cockpit run build:web                 # install + vite build → web/dist
node apps/cockpit/mock-executor/src/server.mjs          # :8122  executor
node apps/cockpit/bridge/src/server.mjs                 # :8120  → open the printed URL
```

## Run (against a real agentic-sandbox executor)

```bash
AIWG_COCKPIT_EXECUTOR_URL=http://127.0.0.1:<executor-port> \
  node apps/cockpit/bridge/src/server.mjs
```

`EXECUTOR_URL` is accepted as a short alias. `MOCK_URL` remains only for older
local scripts; new code should use `AIWG_COCKPIT_EXECUTOR_URL`.

`aiwg cockpit` (the operator command) will wrap this; the Bridge serves the built
React app token-injected, falling back to a legacy page when no build is present.

## Components

| Path | Role |
|---|---|
| `web/` | React 19 + Vite + TS UI (the surfaces above) |
| `mock-executor/` | wire-faithful agentic-sandbox A2A v2 stand-in (conformance 33/0/17) |
| `bridge/` | the registry-bound control-plane server + static serving |
| `shell-core/` | the cross-shell handshake (runtime token → connect) |
| `vscode/` · `desktop/` | VS Code extension + Tauri shells over the same Bridge |
| `contrib/` | declarative UI contributions + schema (actions inject commands) |
| `poc/` | Iteration-1 risk-gate PoCs (kill-bridge isolation, security) |

## Verify

```bash
npm --prefix apps/cockpit run check     # build web + typecheck + render/a11y tests + smokes + PoCs
npx vitest run test/integration/cockpit-bridge.test.js   # Bridge contract (CI)
npx vitest run test/smoke/cockpit-base-footprint.test.js # base-npm guard (CI)
```

The React UI is also browser-verified per surface (see `.playwright-mcp/cockpit-*.png`).
Conformance (`agentic-sandbox-conformance`) was 33 pass / 0 fail / 17 skip; the
Bridge-only additions since (session-create, library) don't touch the conformant
discovery/A2A/pty surfaces — re-run the harness after executor-surface changes.

## Status

Built and browser-verified against the bundled mock and wired for a real
agentic-sandbox executor through `AIWG_COCKPIT_EXECUTOR_URL`. The host target
(agentic-sandbox#460) and direct/managed multiplexer sessions
(agentic-sandbox#461) have landed upstream; the Bridge seam is now the
AIWG-side integration point for #1589.

## See also

- `.aiwg/architecture/adr-cockpit-session-control-not-cli-runner.md` — the core model
- `.aiwg/architecture/cockpit-sad.md` + `cockpit-instance-control-interface.md`
- `.aiwg/ux/cockpit-ux-design.md` · `.aiwg/reports/cockpit-abm-gate.md`
- Epic roctinam/aiwg#1588
