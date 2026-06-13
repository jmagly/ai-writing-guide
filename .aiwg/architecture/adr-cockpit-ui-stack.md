# ADR: Cockpit UI Stack — Local-Server Web App

**Status**: Proposed (decision pending final spike)
**Phase**: Elaboration
**Related**: @.aiwg/architecture/cockpit-sad.md, @.aiwg/requirements/nfr-modules/cockpit-nfrs.md (NFR-04 perf, NFR-05 a11y, NFR-06 portability), @.aiwg/risks/cockpit-risk-register.md (P4), @.aiwg/security/cockpit-threat-model.md (S1)

## Reasoning

1. **Context analysis**: Cockpit needs a friendly, accessible, cross-platform UI that an operator launches locally and that talks to the Bridge.
2. **Force identification**: portability (Linux/macOS/Windows) vs. native feel; a11y (WCAG 2.1 AA) ease; team familiarity/maintenance; security of the local surface (S1); shipping via `aiwg use`.
3. **Option evaluation**: below.
4. **Decision justification**: a local-server web app maximizes portability + a11y tooling + reuse of AIWG's TypeScript core, with a clean security boundary (`127.0.0.1` + CSRF).
5. **Consequence assessment**: web is the safe default; a desktop shell (Tauri) is a later packaging option, not a v1 requirement.

## Context

The Bridge is a local server already; the UI is its client. Candidates: (a) web app served by the Bridge, opened in the operator's browser; (b) desktop shell (Tauri/Electron) wrapping the web app; (c) a TUI.

## Decision (updated 2026-06-13 per operator)

**v1 ships two shells in parallel: a Tauri (Rust) desktop app + a VS Code extension** — both over the same registry-bound, data-driven core. The **standalone is a Tauri desktop app** (Rust shell wrapping the web UI — the same approach as the operator's HotM repo), **not a plain browser web app**. A Bridge-served browser build remains as a dev/headless/fallback surface, not the primary. The operator is **open to alternatives to Tauri** (lighter/nimbler desktop shells) — to be confirmed in the implementation spike. The UI framework inside the shell is a mainstream React/Svelte-class SPA (final pick in the spike) with first-class a11y. Rationale:
- **Portability** (NFR-06): browser-based → identical on Linux/macOS/Windows; no per-OS native build for v1.
- **Accessibility** (NFR-05): mature WCAG 2.1 AA tooling in the web ecosystem.
- **Reuse**: shares AIWG's TypeScript core; Bridge + UI in one language.
- **Security** (S1): `127.0.0.1` bind, Origin allow-list, `SameSite=Strict`, CSRF double-submit, strict CSP (`connect-src 'self'`) — also the sandbox for marketplace UX agents (E3/I5).
- **Distribution**: ships via `aiwg use cockpit` (provisional); `aiwg cockpit` launches the local server.

A **Tauri desktop shell** is recorded as a *future* packaging option (nicer launch UX, OS integration) but is **not** a v1 requirement.

### Front-end form factors (multi-shell over one core)

Because the UI is logic-free and data-driven over the Bridge (`adr-cockpit-ui-cli-extension-binding`), the **front-end is a pluggable shell**. The same registry-bound UI runs in multiple shells with no core-logic duplication:

| Shell | Role | Notes |
|---|---|---|
| **Tauri (Rust) desktop app** | **v1 (standalone)** | Rust shell wrapping the web UI (same as the HotM repo); native launch/OS integration, nimble footprint; the primary standalone. *Alternatives to Tauri open for discussion.* |
| **VS Code extension** (webview) | **v1 (parallel)** | Meets developers where they live; works in VS Code **and its forks** (Cursor/Windsurf are VS Code-based); reuses the existing `vscode-extension/` surface in this repo; hosts the same data-driven UI in a panel |
| **Browser web app** (Bridge-served) | dev / headless / fallback | Not the primary; useful for remote/headless and development |
| **Custom VS Code fork** (à la Cursor/Windsurf) | **rejected** | AIWG is a control plane, not an editor; forking + maintaining a VS Code distribution is disproportionate. Ship an *extension*, not a fork — "lighter, more nimble" wins |

The shells differ only in host/packaging; all consume the Bridge's registry-driven capability feed + piped stack I/O. This is why "VS Code extension *as well as* standalone" is cheap here — it's shell packaging, not a second app.

## Options considered

| Option | Verdict |
|---|---|
| A. **Local-server web app (browser)** | ✓ **Chosen for v1** — portable, a11y-friendly, shared TS, clean security boundary |
| B. Tauri/Electron desktop shell | ~ Deferred — better launch UX but adds per-OS build + footprint; revisit post-v1 |
| C. TUI | ✗ Conflicts with "friendly, simple, visual" for newcomers |
| D. **VS Code extension shell** (alongside standalone web) | ✓ **Adopted as a shell** — devs-where-they-live; reuses repo's `vscode-extension/`; same data-driven core |
| E. Custom VS Code fork | ✗ Rejected — editor-fork maintenance burden; AIWG isn't an editor; ship an extension, not a fork |

## Consequences

- **Positive**: lowest portability/maintenance cost (P4 mitigated), strong a11y, reuses core, well-understood local-web security model.
- **Negative / accepted**: browser launch is slightly less "app-like" than a desktop shell (acceptable for v1; Tauri later). Final framework pick deferred to the implementation spike (construction), recorded as an open item at ABM.
