# AIWG Cockpit

**Local control plane for AIWG and multi-stack agentic sessions.**

Cockpit is the operator console for agentic work: observe live agent sessions,
attach to terminals, handle approvals, launch runtime targets (host, container,
VM), recover stale agents, and coordinate AIWG actions — all from one local,
token-gated surface. It fronts the AIWG CLI and the agentic-sandbox executor;
it replaces neither.

```bash
npm i -g aiwg        # install the base AIWG CLI
aiwg use cockpit     # install the opt-in Cockpit package, version-locked to AIWG
aiwg cockpit         # launch the local Bridge + web UI
```

The Bridge serves the UI at `http://127.0.0.1:8140` by default and expects an
agentic-sandbox executor at `http://127.0.0.1:8122`.

## The model in one paragraph

Cockpit is a **session-control surface, not a CLI runner**. Agents run the CLI;
you direct the agents. An action button injects a command into an agentic
session, and the agent in that session runs it. Control-plane requests
(lifecycle, approvals, session create) go through a local token-gated Bridge;
the terminal data plane uses a Bridge-owned attach URL so executor credentials
remain outside browser state. Cockpit is opt-in and separately published —
nothing here ships in the base `aiwg` npm package.

## Section contents

| Page | Covers |
|---|---|
| [Installation](./installation.md) | Install and launch paths (CLI, direct npm, dev workspace, desktop, VS Code), version pinning, troubleshooting |
| [Architecture](./architecture.md) | Shells → Bridge → executor topology, control vs data plane, component map, ports, the serve↔cockpit relationship |
| [Surfaces](./surfaces.md) | All 11 tabs — Home, Inventory, Running, Missions, Sessions, Approvals, Explore, Library, Telemetry, Memory, Actions — plus the launch/start modals |
| [Sessions](./sessions.md) | The observe-first attach model: take control, replay, per-session persistent terminals, backends, response detection |
| [Bridge API](./bridge-api.md) | Every Bridge endpoint, request gating, environment variables, audit events |
| [Trust & Security](./trust-and-security.md) | Token/CSRF/origin gating, OS keychain (strict mode), runtime/transport/daemon posture badges, the audit log, library invariants |
| [Recovery](./recovery.md) | Stale-agent recovery for Docker **and VM** runtimes, destroy fallbacks, host-daemon guidance |
| [Development](./development.md) | Dev/test/mock/release patterns: one-command bring-up, port allocation, the automated-test-only mock boundary, verification tiers |
| [Releases](./releases.md) | How `@aiwg/cockpit` ships: channels, publish leg, pre-tag gates |

## What Cockpit is not

- **Not a replacement for `aiwg`.** The CLI remains the source of truth for
  install, deploy, discovery, and maintenance operations.
- **Not an agent runtime.** Agent execution belongs to the provider stack and
  the agentic-sandbox executor.
- **Not cloud-hosted.** The surface is local-first: loopback Bridge,
  token-gated browser/VS Code/Tauri shells, operator-owned runtime files.

## Quick orientation

- New operator? Start with [Installation](./installation.md), then let the
  Home tab's first-run tour walk you through starting a session.
- Something's stuck? [Recovery](./recovery.md) covers stale agents on every
  runtime family, including the VM path added in 2026.7.
- Building on Cockpit? [Architecture](./architecture.md) and
  [Bridge API](./bridge-api.md) are the contract; the
  [Development](./development.md) page has the one-command dev bring-up.

## See also

- [`aiwg serve` guide](../serve-guide.md) — the serve API / sandbox-registry
  substrate underneath (Cockpit is the maintained operator console on top)
- [Cockpit source](https://github.com/jmagly/aiwg/tree/main/apps/cockpit) —
  `apps/cockpit/` in the repository
- [`@aiwg/cockpit` on npm](https://www.npmjs.com/package/@aiwg/cockpit)
