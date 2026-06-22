# Cockpit Shell Stack Spike

**Issue**: #1594
**Date**: 2026-06-22
**Decision target**: confirm whether the Cockpit standalone shell should remain Tauri or switch to a lighter/nimbler alternative.

## Decision

Keep **Tauri v2** as the Cockpit standalone desktop shell for v1, alongside the VS Code extension and Bridge-served browser fallback.

Do not switch the standalone shell to React Native, Flutter, or Electron for v1. Revisit only if the Tauri build/toolchain gate becomes the dominant delivery risk after platform prerequisites are documented and CI packaging is exercised.

## Requirements Fit

Cockpit needs a shell that:

- hosts the existing React/Vite Bridge UI with no core logic in the shell;
- runs on Linux, macOS, and Windows;
- keeps the local control surface small and security-auditable;
- preserves WCAG 2.1 AA web testing and DOM-based accessibility workflows;
- can pass the Bridge runtime token into the UI without creating a second app architecture;
- does not expand the base AIWG package footprint.

## Options Compared

| Option | Fit | Rationale |
|---|---:|---|
| **Tauri v2** | **Best v1 fit** | Wraps the existing web UI, uses the system webview, keeps a Rust native boundary, and matches the current shell-core contract. Official docs position Tauri as a way to build small binaries for major desktop and mobile platforms with any HTML/CSS/JS frontend, plus Rust/Swift/Kotlin backend bindings when needed. |
| **Electron** | Viable fallback, not preferred | Also wraps the web UI and is proven for desktop apps, but ships Chromium/Node and carries a larger dependency and security-maintenance surface. Electron's own security guidance emphasizes that app JavaScript can access filesystem and shell capabilities and that framework, Chromium, Node, dependencies, and app code all become part of the security responsibility. |
| **Flutter desktop** | Strong desktop toolkit, poor reuse fit | Official Flutter desktop support covers native Windows, macOS, and Linux builds, but adopting it would require rebuilding Cockpit's UI in Dart/Flutter or maintaining a second UI surface. That violates the no-logic/no-duplication shell constraint unless Cockpit abandons the current React/Vite core. |
| **React Native desktop** | Poor v1 fit | React Native's primary platform remains mobile; desktop is handled through out-of-tree partner/community platforms such as React Native macOS and React Native Windows. Linux support is not a first-party equivalent in the core docs. Using it would add platform fragmentation while still requiring a separate native UI implementation. |

## Evidence

- Tauri v2 docs: https://v2.tauri.app/start/
- React Native out-of-tree platforms docs: https://reactnative.dev/docs/out-of-tree-platforms
- Flutter desktop support docs: https://docs.flutter.dev/platform-integration/desktop
- Electron security docs: https://www.electronjs.org/docs/latest/tutorial/security

## Implications For #1594

- The current `apps/cockpit/desktop/` Tauri scaffold is directionally correct.
- The VS Code extension remains the parallel developer shell; no VS Code fork is needed.
- Browser remains dev/headless/fallback, not primary standalone.
- The remaining risk is not stack selection; it is packaging proof:
  - install and document Linux/macOS/Windows Tauri prerequisites;
  - run `cargo tauri build` in at least one controlled environment;
  - add CI/toolchain strategy or explicitly mark desktop bundle verification as release-gated.

## Non-Goals

- This spike does not claim the Tauri bundle is already build-verified.
- This spike does not replace the shared shell-core contract or move Bridge logic into the desktop shell.
- This spike does not reopen the UI framework decision inside the shell; Cockpit already has a React/Vite web app.
