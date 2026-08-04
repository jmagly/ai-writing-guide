# AIWG Cockpit — Desktop shell (Tauri v2)

A lightweight native window hosting the **same registry-bound Bridge UI** as the
VS Code shell and the browser. The shell does not replace the CLI or reimplement
the control plane — `src-tauri/src/main.rs` waits for the Bridge's per-launch
runtime handshake file (`~/.aiwg/cockpit/runtime/bridge.json`), exchanges the
native credential for a one-time nonce, and opens the Bridge UI without a
reusable credential in the URL.

## Architecture

```
operator/CLI: aiwg cockpit
      │  (spawns the Bridge; writes OS keychain token + runtime/bridge.json mode 600)
      ▼
Bridge (127.0.0.1:PORT, token-gated /api) ── proxies ──▶ agentic-sandbox executor
      ▲
      │  loads http://127.0.0.1:PORT/#bootstrap=…
desktop window  (this app)   ◀── same UI ──▶   VS Code webview  /  browser
```

## Build

Requires the Rust toolchain + Tauri prerequisites. On Linux: `webkit2gtk-4.1`,
`libsoup-3.0`, `libappindicator`. Then:

```bash
cargo install tauri-cli --version '^2'   # once
cd apps/cockpit/desktop
cargo tauri dev                           # run against a launched Bridge
cargo tauri build                         # produce a bundle
```

The repo ships the load-the-Bridge logic (`main.rs`), the Tauri config, the
frontend splash, a locked Rust dependency graph, and the generated desktop icon
set needed by Tauri. `cargo tauri build` has been verified on Linux to produce
`.deb`, `.rpm`, and `.AppImage` bundles.

## Why a token file (not a socket handshake)

The runtime file is the cross-platform handshake every shell shares (see
`apps/cockpit/shell-core/runtime.mjs`). The Bridge stores the per-launch token in
the OS credential backend when available and records a `token_ref`; `bridge.json`
is mode `600` and records explicit fallback evidence when no backend is usable.
