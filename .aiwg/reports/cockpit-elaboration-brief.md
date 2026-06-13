# AIWG Cockpit — Elaboration Brief (intake → ABM)

**Date**: 2026-06-13
**Track**: SDLC intake → elaboration (sdlc-accelerate-driven; bounded at the ABM gate)
**Scope boundary**: This engagement produced the artifact track **through elaboration**. Construction prep / iteration planning is explicitly **out-of-track**.

## Product (one line)

AIWG Cockpit — a friendly, simple, local web **control plane** that sits *on top of* (never replaces) the AIWG CLI and the per-provider agentic stacks: it surfaces install/inventory + health, shows deployed & running agents, lets users start/attach to live sessions across **multiple concurrent stacks**, and coordinates those stacks in new ways (cross-stack handoff, unified Mission dispatch, one HITL approval inbox, one audit timeline) — built entirely on AIWG's existing substrate (serve executor-registry/#1546, Mission Control, daemon, MCP, activity-log).

## Gate decision log

| Gate | Verdict | Notes |
|---|---|---|
| **LOM** (Lifecycle Objective) | **PASS** | Intake complete; right-sizing confirmed (≥2 triggers); operator goal authorized the full track. |
| **ABM** (Architecture Baseline) | **CONDITIONAL PASS** | Architecture baselined (SAD + 5 ADRs), requirements + NFRs + threat model + risk register + test strategy + UX design complete. **Condition:** the empirical risk-retirement PoCs/spikes (below) are defined but not yet executed — they are the evidence to gather before Construction entry. |

## Artifacts produced

| Artifact | Path | Status |
|---|---|---|
| Project intake | `.aiwg/intake/cockpit-intake.md` | Complete |
| Solution profile (MVP + Production-security) | `.aiwg/intake/cockpit-solution-profile.md` | Complete |
| Option matrix | `.aiwg/intake/cockpit-option-matrix.md` | Complete |
| Stakeholder register | `.aiwg/intake/cockpit-stakeholders.md` | Complete |
| Vision | `.aiwg/management/cockpit-vision.md` | Complete |
| Use cases UC-COCKPIT-001..014 | `.aiwg/requirements/UC-COCKPIT-*.md` | Complete (14 — incl. UC-013 install, UC-014 registry-contributed domain action) |
| NFR module | `.aiwg/requirements/nfr-modules/cockpit-nfrs.md` | Complete (8 NFRs) |
| Threat model | `.aiwg/security/cockpit-threat-model.md` | Complete (by Security Architect agent) |
| Risk register | `.aiwg/risks/cockpit-risk-register.md` | Complete (12 security + 8 product/technical) |
| Software Architecture Document (C4 + sequence) | `.aiwg/architecture/cockpit-sad.md` | Baseline candidate |
| ADR — overlay integration model | `.aiwg/architecture/adr-cockpit-overlay-integration-model.md` | Proposed |
| ADR — coordination bus (#1546) | `.aiwg/architecture/adr-cockpit-coordination-bus.md` | Proposed |
| ADR — session attach model | `.aiwg/architecture/adr-cockpit-session-attach-model.md` | Proposed |
| ADR — UI stack | `.aiwg/architecture/adr-cockpit-ui-stack.md` | Proposed (final framework pick deferred to spike) |
| ADR — marketplace UX-agent sourcing | `.aiwg/architecture/adr-cockpit-marketplace-ux-agent-sourcing.md` | Proposed |
| ADR — distribution & packaging (UX-first, multi-target) | `.aiwg/architecture/adr-cockpit-distribution-packaging.md` | Proposed |
| ADR — UI↔CLI/extension binding (+ stack I/O piping) | `.aiwg/architecture/adr-cockpit-ui-cli-extension-binding.md` | Proposed |
| ADR — package topology (monorepo, opt-in, base-lean) | `.aiwg/architecture/adr-cockpit-package-topology.md` | Proposed |
| ADR — runtime home + launch context (global `~/`, cwd, runtime docs) | `.aiwg/architecture/adr-cockpit-runtime-home-and-launch-context.md` | Proposed |
| ADR — UI stack now covers multi-shell form factors (web + VS Code ext + Tauri; no fork) | `.aiwg/architecture/adr-cockpit-ui-stack.md` | Proposed (amended) |
| ADR — UI extensibility / contribution model (screens·actions·workflows·hooks) | `.aiwg/architecture/adr-cockpit-ui-extensibility-contribution-model.md` | Proposed |
| ADR — instance-control substrate (agentic-sandbox normalize; daemon decoupled, UI-managed) | `.aiwg/architecture/adr-cockpit-instance-control-substrate.md` | Proposed (resolves Bridge-vs-daemon) |
| Test strategy | `.aiwg/testing/cockpit-test-strategy.md` | Complete |
| UX design | `.aiwg/ux/cockpit-ux-design.md` | Complete |

## Strategic posture (refined 2026-06-13)

**Front with the UX; keep the CLI.** The UI is the default front door (easy-first); the CLI is always supported at full capability for advanced users and never deprecated to favor the UI (CLI-parity is a permanent NFR). **Minimal ramp is a product concern**: distribution goes beyond `npm i -g` — a single guided, platform-native installer generated from one `setup.aiwg.io/v1` SetupManifest (AIWG's own `agentic-installer`), plus native channels (curl-installer, Homebrew, winget/Scoop, Docker; AUR/.deb fast-follow). Captured in `adr-cockpit-distribution-packaging`, UC-COCKPIT-013, NFR-COCKPIT-09, and risks X5 (distribution supply-chain), P5 (CLI-parity erosion), X6 (prereq bootstrap).

## Architecture summary

A **thin overlay control plane**: Cockpit UI → Cockpit Bridge (a `127.0.0.1` client of AIWG's surfaces) → AIWG core/substrate → provider stacks. The Bridge **observes** (registry/MCP/CLI) and **relays** mutating/authorizing actions to AIWG core, which re-validates them. The Bridge owns **no** run persistence, **no** exclusive locks, and **no** provider credentials. The **executor-registry is the single adapter seam**. Two invariants shape everything: **overlay isolation** (a Cockpit crash never affects a running stack) and **non-nerf capability parity** (native capabilities preserved — an ABM gate criterion).

## Top risks + retire-by (the ABM condition)

| Risk | PoC / spike to run before Construction |
|---|---|
| D1 / NFR-01 overlay isolation | T-ISO-01: kill the Bridge mid-Mission per stack → zero perturbation + idempotent reattach |
| P1 / NFR-02 non-nerf parity | T-PAR-01: per-provider capability-parity checklist, 0 regressions |
| E1+S3 approval integrity | T-SEC: forged/minted/expired approvals rejected; only core-validated approvals enforce |
| X1 / X2 attach-capability + #1546 seam | Spikes S-1/S-2: per-provider attach tiers; validate #1546 sufficiency, file upstream gaps, scope v1 |

## Open items at ABM
- Final UI framework pick (implementation spike).
- Per-provider attach-capability tier matrix populated.
- First external UX-agent adoption-gate record (or decision to ship v1 with AIWG's UX team only).
- Product name confirmed (working name "AIWG Cockpit").

## Process note (dogfood finding)
The SDLC-team dispatch pattern was partially blocked: heavy AIWG agent definitions (requirements-analyst 24KB and ≥10 others 32–45KB) overflow the subagent prompt budget ("Prompt is too long") in this rule-heavy repo. The Security Architect (lean, 8.7KB) ran fine and authored the threat model; requirements were routed via `general-purpose`; the rest authored directly. Filed as **#1587** (debloat SDLC agent defs). This is itself an input to Cockpit's value case: a leaner agent corpus makes the SDLC team — and Cockpit's coordination over it — more reliable.

## Locked decisions (operator, 2026-06-13)

- **Name:** AIWG Cockpit.
- **Shells (v1, parallel):** Tauri (Rust) desktop app (standalone; HotM-style — alternatives open) + VS Code extension; browser-web = dev/fallback; no VS Code fork.
- **First-party UI packs:** SDLC + Ops + Forensics + Marketing — plus **all** tools/utilities available + inspectable, with **live capability/index refresh, no restart**.
- **Security:** per-launch token + OS-keychain handshake (strongest tier).
- **Daemon:** decoupled, UI-managed (Bridge ≠ daemon).
- **Instance control:** normalized on the agentic-sandbox interface (screen/zellij/tmux/native; direct + managed).

## Tracked work (issues)

- **Epic #1588** — AIWG Cockpit.
- #1589 — extend agentic-sandbox (direct+managed + multiplexer backends) — *dependency*.
- #1590 — spike: per-stack drive-vs-observe + seam maturity — *gates ABM*.
- #1591 — UI contribution model schema.
- #1592 — full inspectability + live capability/index refresh (no restart).
- #1593 — package topology (workspaces + `@aiwg/cockpit` opt-in + base-footprint guard).
- #1594 — shells (Tauri desktop + VS Code extension).
- #1595 — local control-surface auth (per-launch token + OS-keychain).

## Next steps (Construction — out of this track)
Run the four risk-retirement PoCs/spikes as the first Construction iteration's gate evidence; finalize the UI-stack pick; then implement the Bridge adapter for the first 1–2 attach-capable stacks behind the executor-registry seam. (Not started here — this track ends at the ABM gate per scope.)
