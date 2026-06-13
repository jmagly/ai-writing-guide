# ADR: Cockpit Distribution & Packaging — UX-First Front Door, Minimal Ramp, Multi-Target via the Agentic Installer

**Status**: Proposed
**Phase**: Elaboration
**Related**: @.aiwg/management/cockpit-vision.md (Strategic Posture: UX-First, CLI-Always), @.aiwg/requirements/nfr-modules/cockpit-nfrs.md (NFR-09 installability), UC-COCKPIT-013 (minimal-ramp install), @.aiwg/risks/cockpit-risk-register.md (X5, P5), rules: installer-safety, installer-authoring, ci-action-pinning, dependency-source-policy, npm-supply-chain-audit

## Reasoning

1. **Context analysis**: The product posture is UX-first with a minimal onboarding ramp. Today AIWG installs via `npm i -g aiwg`, which assumes Node/npm and a terminal — a real ramp barrier for the newcomer persona Cockpit targets. The operator also flagged needing to publish beyond npm and/or use clever packaging/setup scripts.
2. **Force identification**: minimal ramp / reach the widest audience vs. maintenance cost of N package channels; "front with UX" vs. CLI-always parity; install convenience vs. supply-chain trust.
3. **Option evaluation**: below.
4. **Decision justification**: lead with a single guided installer per platform (built on AIWG's own `agentic-installer` SetupManifest mechanism), back it with native package channels where they materially cut the ramp, and keep `npm i -g aiwg` as the canonical advanced/CI path.
5. **Consequence assessment**: more release surface (mitigated by generating it from one SetupManifest + CI matrix), and a larger supply-chain surface (mitigated by existing AIWG supply-chain rules).

## Context

AIWG already ships the **`agentic-installer`** addon: the `setup.aiwg.io/v1` **SetupManifest** language, the `installer-agent`, and the `setup-generate` / `setup-run` / `setup-validate` skills. It is purpose-built to assemble cross-platform, script-first install flows with platform routing, param collection, and recovery procedures — i.e., exactly the "clever setup scripts" the operator described. Cockpit needs an install story that (a) gets a newcomer into the UI fast, (b) reaches beyond the npm/Node audience, and (c) never compromises the CLI-always posture or supply-chain trust.

## Decision

### 1. UX-first front door, CLI-always underneath
- The **default, advertised install path is a single guided installer per platform** that ends with the Cockpit UI open and a first session reachable (the minimal-ramp KPI / UC-COCKPIT-013).
- `npm i -g aiwg` (+ `aiwg use cockpit`, `aiwg cockpit`) remains the **canonical CLI/CI path**, fully supported and never deprecated. The installer is a friendlier wrapper over the same artifacts — not a divergent build.

### 2. One SetupManifest, generated targets
- Author **one `setup.aiwg.io/v1` SetupManifest** for Cockpit (via `setup-generate`); platform variations live in its `platform-route` steps. `setup-run` / `installer-agent` execute it. This is the single source of truth the per-channel packages are generated from — avoiding N hand-maintained installers (mitigates maintenance risk).
- Honor `installer-safety` (show-before-run, confirm destructive ops, validate before execute, no inline secrets, platform-mismatch = skip) and `installer-authoring` (script-first; agentic steps are exception-handling only; recovery procedure required).

### 3. Multi-target distribution (publish beyond npm)
Prioritize channels by ramp-reduction per platform; all generated from the SetupManifest + CI:

| Channel | Platform | Role |
|---|---|---|
| **npm** (`aiwg@latest`) | all (Node present) | Canonical CLI/CI path; existing |
| **curl \| sh installer** (`setup.aiwg.io`) | Linux/macOS | Lowest-friction guided path; bootstraps Node if absent, runs the SetupManifest |
| **Homebrew** (tap/formula) | macOS/Linux | Native for the mac dev audience |
| **Scoop / winget** | Windows | Native Windows ramp (no manual Node setup) |
| **Docker image** | all | Zero-host-deps trial; `docker run … aiwg cockpit` |
| **AUR / .deb** | Linux distros | Community/native Linux reach (later tier) |

v1 commits to: npm (exists) + the curl-installer + one mac channel (Homebrew) + one Windows channel (winget/Scoop) + Docker. Distro packages (AUR/.deb) are a fast-follow tier.

### 4. Supply-chain trust is non-negotiable
- The curl-installer and every channel pin versions + verify integrity (no unpinned `latest` in the bootstrap; checksum/signature verification) per `ci-action-pinning`, `dependency-source-policy`, and the `npm-supply-chain-audit` discipline. A `curl|sh` script is itself a supply-chain artifact — it is signed/checksummed and reproducible from the SetupManifest, never hand-edited per release.

## Options considered

| Option | Verdict |
|---|---|
| A. npm-only (status quo) | ✗ Ramp barrier for non-Node/newcomer users; contradicts UX-first/minimal-ramp |
| B. Hand-maintain a separate installer per OS/channel | ✗ N× maintenance + drift; supply-chain surface per script |
| C. **One SetupManifest (agentic-installer) → generate guided installer + native channels; keep npm canonical** | ✓ **Chosen** — minimal ramp, broad reach, single source of truth, reuses AIWG's own installer, CLI-always preserved |

## Consequences

- **Positive**: newcomers get a ≤5-min guided ramp on their native platform (NFR-09); reach extends well beyond the npm/Node audience; one SetupManifest keeps channels in sync; dogfoods AIWG's `agentic-installer`; CLI parity and supply-chain trust preserved.
- **Negative / accepted**: more release/CI surface (mitigated: generated from one manifest + CI matrix; tiered rollout); each channel is a supply-chain artifact requiring pinning/signing (risk X5); must continuously verify CLI-parity so the UI-first push never silently erodes the CLI (risk P5).
