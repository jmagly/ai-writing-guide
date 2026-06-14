# AIWG Cockpit

A **UX-first control plane** over your AIWG install and the multi-stack agentic
sessions it runs — observe, drive, and coordinate agents from one interface. The
Cockpit **fronts** the CLI and the registry; it never replaces them. Every UI action
is a registry capability, and the CLI remains fully supported.

> **Opt-in, separately published.** Nothing here ships in the base `aiwg` npm package
> (guarded by `test/smoke/cockpit-base-footprint.test.js`). Install the base CLI as
> always; add the Cockpit when you want the UI.

## Architecture

```
operator / CLI:  aiwg cockpit
       │  spawns the Bridge; writes ~/.aiwg/cockpit/runtime/bridge.json (token+port, 0600)
       ▼
┌─────────────────────────────────────────────────────────────┐
│ Bridge (127.0.0.1, token-gated /api)                         │
│  · registry-bound core: aiwg discover / show / index (live)  │
│  · control plane: inventory, running, lifecycle, approvals,  │
│    cost, contributions                                       │
│  · issues a direct ws attach_url for the pty data plane      │
└─────────────────────────────────────────────────────────────┘
       │ proxies                          ▲ loads /?token=…
       ▼                                  │
  executor (mock today;          ┌────────┴─────────┬──────────────┐
  agentic-sandbox #460/#461)     browser        VS Code webview   Tauri window
  · A2A v2: discovery, admin,    (apps/cockpit/{vscode,desktop} — one shared core)
    A2A core+extensions, pty-ws
```

- **Control plane** (inventory, lifecycle, approvals, actions) goes through the gated Bridge.
- **Data plane** (the pty session stream) connects browser→executor directly via the
  `attach_url` the Bridge issues — WS masking differs per direction, so the Bridge issues
  the URL rather than proxying frames.

## Run (dev, against the mock)

```bash
node apps/cockpit/mock-executor/src/server.mjs    # :8122  executor (3 surfaces, conformant)
node apps/cockpit/bridge/src/server.mjs            # :8120  → open the printed URL (token injected)
```

Or via the umbrella: `npm --prefix apps/cockpit run start:mock` / `start:bridge`.

## Surfaces (UI tabs)

| Tab | What it does | Backed by |
|---|---|---|
| **Inventory** | instances + lifecycle (Start/Stop/Destroy) | admin REST |
| **Running** | running work across stacks + per-task Stop + spend line | `/admin/running`, `/admin/cost` |
| **Sessions** | live pty terminal — observe/drive, keyframe, non-destructive replay | `pty-ws/v1` + `pty-extensions/v1` |
| **Approvals** | unified HITL inbox (decisions = operator authorization) | `hitl-prompt/v1` |
| **Explore** | live `aiwg discover` + `show` over the capability graph | registry binding |
| **Actions** | contributed buttons (audit-issues, address-issues, …) | contribution model |

## Components

| Path | Role |
|---|---|
| `mock-executor/` | wire-faithful agentic-sandbox A2A v2 stand-in (conformance 33/0/17) |
| `bridge/` | the registry-bound control-plane server + screen |
| `shell-core/` | the cross-shell handshake (read runtime token, connect) |
| `vscode/` | VS Code extension shell (no build) |
| `desktop/` | Tauri v2 desktop shell (build toolchain-gated) |
| `contrib/` | declarative UI contributions + schema |
| `poc/` | Iteration-1 risk-gate PoCs (kill-bridge isolation, security) |

## Verify

```bash
npm --prefix apps/cockpit test          # smokes + risk-gate PoCs
npx vitest run test/integration/cockpit-bridge.test.js   # in-process + a11y (CI)
npx vitest run test/smoke/cockpit-base-footprint.test.js # base-npm guard (CI)
# conformance (needs the agentic-sandbox-conformance harness):
#   asc --executor-url http://127.0.0.1:8122/agents/550e8400-e29b-41d4-a716-446655440000
```

## Status

Built against the mock through the construction increments (A–I). The real
agentic-sandbox swap (#460 host target, #461 sessions, #1589 normalize) is a
contract-preserving substitution validated by the same conformance harness — see
`.aiwg/reports/cockpit-abm-gate.md`.

## See also

- `.aiwg/architecture/cockpit-sad.md` + `cockpit-instance-control-interface.md` — design + seam
- `.aiwg/ux/cockpit-ux-design.md` — HMI foundations
- `.aiwg/reports/cockpit-abm-gate.md` — risk-gate closure
- `.aiwg/planning/cockpit-construction-plan.md` — iteration roadmap
- Epic roctinam/aiwg#1588
