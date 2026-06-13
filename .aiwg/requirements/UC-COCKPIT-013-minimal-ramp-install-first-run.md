# UC-COCKPIT-013: Minimal-Ramp Install & First Run (UX-First Front Door)

**Phase**: Inception
**Priority**: P0
**Status**: Draft
**Persona**: Newcomer (primary), Solo power user
**Related**: @.aiwg/management/cockpit-vision.md (Strategic Posture: UX-First, CLI-Always), @.aiwg/architecture/adr-cockpit-distribution-packaging.md, @.aiwg/requirements/nfr-modules/cockpit-nfrs.md (NFR-09), rules: installer-safety, installer-authoring

## Reasoning

1. **Problem analysis**: A newcomer's first contact today is `npm i -g aiwg` — which assumes Node, npm, and terminal fluency. That ramp loses the exact persona Cockpit is for. "Front with the UX" means the *install itself* lands them in the Cockpit, not at a prompt.
2. **Constraint identification**: The install must be guided and platform-native, must not require pre-existing Node for the newcomer path, must obey `installer-safety` (show-before-run, confirm destructive ops, no inline secrets, recovery procedure), and must keep the CLI path fully available for advanced users.
3. **Alternative consideration**: (a) npm-only (status quo — fails ramp KPI); (b) a per-OS guided installer generated from one `setup.aiwg.io/v1` SetupManifest that bootstraps prerequisites, deploys Cockpit, and opens the UI (chosen); (c) cloud-hosted trial (out of scope — local/single-operator v1).
4. **Decision rationale**: One SetupManifest → native installers (curl-installer, Homebrew, winget/Scoop, Docker) gives the minimal ramp with one source of truth (adr-cockpit-distribution-packaging).
5. **Risk assessment**: supply-chain trust of the installer (mitigated: pinned + signed + reproducible from the manifest — risk X5); CLI-parity erosion (mitigated: CLI path stays first-class — risk P5); failed install leaving partial state (mitigated: SetupManifest recovery procedure).

## Primary Actor

A new user on a clean machine who wants to try AIWG with minimal friction.

## Goal

Go from "I want to try AIWG" to "Cockpit is open and a first session is live" in ≤ 5 minutes via a single guided, platform-native installer — without needing terminal fluency, while the full CLI remains available for those who want it.

## Preconditions

- A supported OS (Linux/macOS/Windows) with network access. No pre-existing Node required on the newcomer path.

## Main Success Scenario

1. User picks the install method for their platform from a single docs page (curl-installer / Homebrew / winget / Scoop / Docker) — or runs the one-line guided installer.
2. The installer (generated from the Cockpit `setup.aiwg.io/v1` SetupManifest) **shows what it will do** before running (installer-safety), confirms any destructive/elevated step, and bootstraps prerequisites (e.g., Node) only if absent.
3. It installs AIWG, deploys Cockpit (`aiwg use cockpit`), and launches the Cockpit UI (`aiwg cockpit`) bound to `127.0.0.1`.
4. Cockpit opens on the Newcomer Guided Start (UC-COCKPIT-003); the user reaches a live session.
5. The installer surfaces the equivalent CLI commands it ran, so an advanced user learns the terminal path.

## Alternative Flows

**A1 — Advanced/CI path**: user runs `npm i -g aiwg && aiwg use cockpit && aiwg cockpit` directly; fully supported, identical artifacts (CLI-always).
**A2 — Docker trial**: `docker run … aiwg cockpit` for a zero-host-deps trial.
**A3 — Prerequisites present**: installer skips bootstrap steps (platform-route/skip per installer-safety).

## Exception Flows

**E1 — Install step fails**: the SetupManifest recovery procedure runs (or is offered); no partial/broken state is left silently; the failure + remediation are shown.
**E2 — Integrity check fails**: a pinned/checksum/signature mismatch aborts the install with a clear supply-chain warning (never proceeds on mismatch).

## Postconditions

- AIWG + Cockpit installed via the same artifacts as the CLI path; Cockpit UI reachable; CLI fully available; install actions auditable; no secrets written into any manifest or log.

## Acceptance Criteria

- [ ] On a clean machine per target platform, "decide to try" → "Cockpit open + first session live" completes in ≤ 5 minutes via a single guided installer (not just `npm i -g`).
- [ ] The newcomer path does not require pre-installed Node/terminal fluency; prerequisites are bootstrapped with show-before-run + confirm (installer-safety).
- [ ] The full CLI path (A1) remains supported and produces identical artifacts; the installer surfaces equivalent CLI commands.
- [ ] Every channel's installer is generated from one `setup.aiwg.io/v1` SetupManifest; no hand-maintained per-OS scripts.
- [ ] Install integrity is verified (pinned + checksum/signature); a mismatch (E2) aborts; a failed step (E1) triggers the recovery procedure — never a silent partial install.
- [ ] No secrets appear in any manifest, script, or install log.
