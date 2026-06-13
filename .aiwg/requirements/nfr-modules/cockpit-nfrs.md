# Non-Functional Requirements — AIWG Cockpit

**Phase**: Inception
**Status**: Draft
**Related**: @.aiwg/management/cockpit-vision.md, @.aiwg/intake/cockpit-solution-profile.md, @.aiwg/security/cockpit-threat-model.md

## Reasoning

1. **Problem analysis**: Cockpit's value (overlay over many live stacks) is also its risk: it must never destabilize what it observes, never weaken what it wraps, and never become a credential or control-surface liability.
2. **Constraint identification**: Two invariants dominate — **overlay isolation** and **non-nerf capability-parity** — and they are gate criteria, not preferences.
3. **Decision rationale**: NFRs below are written to be measurable so the ABM gate can verify them.

## NFR-COCKPIT-01 — Overlay Isolation (CRITICAL)
- A Cockpit UI/bridge crash MUST NOT crash, corrupt, or alter the state of any running stack/Mission/loop.
- Run persistence is owned by the executor-registry, not Cockpit; attach/detach and Cockpit restart are non-destructive.
- **Measure**: an isolation test kills the Cockpit bridge mid-Mission across each supported stack and asserts zero perturbation + successful idempotent reattach (target: 100% of supported stacks).

## NFR-COCKPIT-02 — Non-Nerf Capability Parity (CRITICAL)
- Every capability available in a provider's native UI/CLI MUST remain available and unaltered while Cockpit is attached.
- **Measure**: a per-provider capability-parity checklist passes with 0 regressions; verified for each integrated stack before GA. This is a hard ABM gate criterion.

## NFR-COCKPIT-03 — Security Posture (Production rigor)
- No provider bearer tokens/credentials stored in UI state (localStorage/cookies/service-worker); only opaque attach-handles. CI lint forbids token-shaped writes to browser storage (threat-model I1).
- All session-start / mission-dispatch / lifecycle / approval actions inherit `human-authorization`, `token-security`, and `hitl-gates`; AIWG core (not the bridge) re-validates approval tokens (E1/S3).
- Local server binds `127.0.0.1`, enforces an `Origin` allow-list + CSRF protection; no CORS wildcard (S1). **v1 auth = strongest tier: per-launch token + an OS-keychain handshake** (operator decision 2026-06-13) — the control surface can start/attach/dispatch across stacks, so it warrants OS-credential-backed auth, not bind-only.
- Marketplace UX agents pass an adoption gate (license + quality + security review) and are sandboxed to display/interaction scope with a strict CSP (`connect-src 'self'`) (E3/I5/T3).
- **Measure**: threat-model mitigations all have a verifying test or gate; 0 criticals open at ABM.

## NFR-COCKPIT-04 — Performance / Responsiveness
- UI interactions (navigate, open a panel) respond p95 < 200 ms against cached state; live status refresh latency p95 < 2 s.
- Monitoring N concurrent stacks (target ≥3, design ~10) does not degrade interaction p95 beyond the above.
- **Measure**: instrumented UI timing under a 10-stack simulated load.

## NFR-COCKPIT-05 — Accessibility (WCAG 2.1 AA)
- This is a "friendly, simple" product; the UI MUST meet WCAG 2.1 AA: keyboard-navigable, screen-reader labelled, sufficient contrast, no color-only signaling.
- **Measure**: automated a11y scan (0 AA violations) + manual keyboard/screen-reader pass on the core flows (home, running, session view, approval inbox).

## NFR-COCKPIT-06 — Portability
- Runs on Linux, macOS, Windows, consistent with AIWG; ships via `aiwg use cockpit` (provisional).
- **Measure**: launch + core-flow smoke passes on all three OSes in CI.

## NFR-COCKPIT-07 — Maintainability / Adapter Seam
- New providers and AIWG CLI evolution MUST be absorbed via a documented adapter seam (the `serve` executor-registry), not Cockpit-internal special-casing.
- **Measure**: adding a hypothetical new stack requires changes only behind the adapter interface (no UI/core edits) in a design walkthrough at ABM.

## NFR-COCKPIT-09 — Installability / Minimal Ramp & CLI Parity (UX-First, CLI-Always)
- **Minimal ramp**: on a clean machine per target platform, "decide to try AIWG" → "Cockpit open + first session live" completes in **≤ 5 minutes** via a single guided, platform-native installer (not just `npm i -g`); the newcomer path requires no pre-installed Node/terminal fluency.
- **Multi-target**: distribution covers npm (canonical CLI/CI) + a guided installer beyond npm (curl-installer + ≥1 mac + ≥1 Windows channel + Docker for v1), all generated from one `setup.aiwg.io/v1` SetupManifest (no hand-maintained per-OS scripts) — per `adr-cockpit-distribution-packaging`.
- **CLI parity (permanent, structural)**: 100% of Cockpit user-actions have a documented CLI equivalent; **0** CLI capabilities are removed to favor the UI. Parity is **structural** — the UI is derived from the AIWG extension+command registry (`adr-cockpit-ui-cli-extension-binding`), so every UI action *is* a CLI command/extension/tool invocation and new extensions surface in the UI automatically. The CLI is never deprecated for UI's sake.
- **Install safety**: installers obey `installer-safety`/`installer-authoring` (show-before-run, confirm destructive/elevated steps, no inline secrets, recovery procedure); integrity is pinned + checksum/signature-verified (supply-chain).
- **Measure**: cold-machine install walkthrough per target (UC-COCKPIT-013) meets the ≤5-min ramp; a CLI-parity checklist passes with 0 removed capabilities; installer supply-chain checks (pinning/signing) green.

## NFR-COCKPIT-10 — Full Inspectability + Live Capability/Index Refresh (No Restart)
- **Everything inspectable**: every AIWG tool, skill, agent, command, rule, addon, framework, extension, and index is **available, accessible, and inspectable** in the UI — surfaced from AIWG's discovery (`aiwg discover`/`show`) and the artifact index, not a hardcoded subset.
- **Index/vector integration**: Cockpit leverages AIWG's discovery + indexing to manage/create as many indices/vectors as needed (project/codebase/framework/user-defined graphs) and renders them as inspectable surfaces.
- **Live update, no restart**: when extensions are added/removed, indices rebuilt, or stacks/sessions change, the UI reflects it **without the user restarting the app**. Driven by hooks + automation (post-deploy / post-commit-index-refresh / registry change events) that push updates to the running UI.
- **Measure**: deploy/remove an extension and rebuild an index while the app runs → the new capability/index appears (and stale ones disappear) in the UI within a target refresh window (e.g. ≤5 s) with **0** app restarts; an automated test exercises add→appear / remove→disappear / index-rebuild→reflect.

## NFR-COCKPIT-08 — Auditability
- Every Cockpit-initiated action writes an `activity-log` entry with operator identity, timestamp, and a provenance tag (`operator` / `agent:<name>@<hash>` / `cli` / `mcp` / `daemon`) (threat-model R2/T1).
- Audit is append-only and survives UI restarts (on disk).
- **Measure**: action→audit coverage is 100% for control-surface actions; tamper test confirms no delete/rewrite path in the bridge.
