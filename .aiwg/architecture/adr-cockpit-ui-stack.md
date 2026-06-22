# ADR: Cockpit UI Stack - Multi-Shell Web UI

**Status**: Accepted (amended by #1594 shell-stack spike, 2026-06-22)
**Phase**: Elaboration
**Related**: @.aiwg/architecture/cockpit-sad.md, @.aiwg/requirements/nfr-modules/cockpit-nfrs.md (NFR-04 perf, NFR-05 a11y, NFR-06 portability), @.aiwg/risks/cockpit-risk-register.md (P4), @.aiwg/security/cockpit-threat-model.md (S1)

## Reasoning

1. **Context analysis**: Cockpit needs a friendly, accessible, cross-platform UI that an operator launches locally and that talks to the Bridge.
2. **Force identification**: portability (Linux/macOS/Windows) vs. native feel; a11y (WCAG 2.1 AA) ease; team familiarity/maintenance; security of the local surface (S1); shipping via `aiwg use`.
3. **Option evaluation**: below.
4. **Decision justification**: a shared Bridge-served web UI maximizes portability + a11y tooling + reuse of AIWG's TypeScript core, while Tauri and VS Code shells provide first-class launch surfaces without duplicating core logic.
5. **Consequence assessment**: shell selection is accepted; the remaining #1594 risk is build/package verification for the Tauri desktop bundle.

## Context

The Bridge is a local server already; the UI is its client. Candidates: (a) web app served by the Bridge, opened in the operator's browser; (b) desktop shell (Tauri/Electron) wrapping the web app; (c) native/cross-platform UI toolkits such as React Native desktop or Flutter; (d) a TUI.

## Decision (updated 2026-06-13 per operator; amended 2026-06-22 by #1594 spike)

**v1 ships two shells in parallel: a Tauri (Rust) desktop app + a VS Code extension** - both over the same registry-bound, data-driven core. The **standalone remains a Tauri desktop app** (Rust shell wrapping the web UI, same general approach as the operator's HotM repo), **not a plain browser web app**. A Bridge-served browser build remains as a dev/headless/fallback surface, not the primary. The #1594 implementation spike compared Tauri, React Native desktop, Flutter desktop, and Electron; the conclusion is to keep Tauri for v1 and treat desktop bundle verification, not stack selection, as the remaining risk. See @.aiwg/research/cockpit-shell-stack-spike-2026-06-22.md.

The UI inside the shell is the existing React/Vite SPA with first-class a11y. Rationale:
- **Portability** (NFR-06): one Bridge-served web UI runs across Linux/macOS/Windows; shell packaging differs by host, not by application logic.
- **Accessibility** (NFR-05): mature WCAG 2.1 AA tooling in the web ecosystem.
- **Reuse**: shares AIWG's TypeScript core; Bridge + UI in one language.
- **Security** (S1): `127.0.0.1` bind, Origin allow-list, `SameSite=Strict`, CSRF double-submit, strict CSP (`connect-src 'self'`) — also the sandbox for marketplace UX agents (E3/I5).
- **Distribution**: ships via `aiwg use cockpit` (provisional); `aiwg cockpit` launches the local server.

The Tauri shell is a v1 standalone requirement. The browser app is retained as a fallback and development surface.

### Front-end form factors (multi-shell over one core)

Because the UI is logic-free and data-driven over the Bridge (`adr-cockpit-ui-cli-extension-binding`), the **front-end is a pluggable shell**. The same registry-bound UI runs in multiple shells with no core-logic duplication:

| Shell | Role | Notes |
|---|---|---|
| **Tauri (Rust) desktop app** | **v1 (standalone)** | Rust shell wrapping the web UI (same class of approach as the HotM repo); native launch/OS integration, nimble footprint; the primary standalone. Alternatives were reviewed in the #1594 spike; Tauri remains selected for v1. |
| **VS Code extension** (webview) | **v1 (parallel)** | Meets developers where they live; works in VS Code **and its forks** (Cursor/Windsurf are VS Code-based); reuses the existing `vscode-extension/` surface in this repo; hosts the same data-driven UI in a panel |
| **Browser web app** (Bridge-served) | dev / headless / fallback | Not the primary; useful for remote/headless and development |
| **Custom VS Code fork** (à la Cursor/Windsurf) | **rejected** | AIWG is a control plane, not an editor; forking + maintaining a VS Code distribution is disproportionate. Ship an *extension*, not a fork — "lighter, more nimble" wins |

The shells differ only in host/packaging; all consume the Bridge's registry-driven capability feed + piped stack I/O. This is why "VS Code extension *as well as* standalone" is cheap here — it's shell packaging, not a second app.

## Options considered

| Option | Verdict |
|---|---|
| A. **Local-server web app (browser)** | Retained as dev/headless/fallback - portable, a11y-friendly, shared TS, clean security boundary, but not the primary standalone |
| B. **Tauri desktop shell** | **Chosen for v1 standalone** - wraps the existing web UI with a small Rust shell and no core-logic duplication |
| C. Electron desktop shell | Viable fallback, not selected - web reuse is good, but dependency/security-maintenance surface is larger than Tauri for Cockpit's local-control use case |
| D. React Native desktop | Rejected for v1 - desktop support is out-of-tree across partner/community platforms and would require a second native UI implementation |
| E. Flutter desktop | Rejected for v1 - strong desktop support, but would require rebuilding the Cockpit UI in Dart/Flutter or carrying duplicate UI logic |
| F. TUI | Rejected - conflicts with "friendly, simple, visual" for newcomers |
| G. **VS Code extension shell** | **Adopted as the parallel developer shell** - devs-where-they-live; reuses repo's `vscode-extension/`; same data-driven core |
| H. Custom VS Code fork | Rejected - editor-fork maintenance burden; AIWG isn't an editor; ship an extension, not a fork |

## Consequences

- **Positive**: one UI core serves browser, VS Code, and Tauri; WCAG tooling remains web-native; shells stay thin and packaging-focused.
- **Negative / accepted**: Tauri adds Rust/WebKit platform prerequisites and bundle verification work. This is now a delivery gate for #1594 rather than an open architecture question.
- **Follow-up**: prove `cargo tauri build` in at least one controlled environment, document prerequisites by OS, and decide whether CI owns desktop packaging or records it as release-gated manual verification.
