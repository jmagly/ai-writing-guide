# AIWG Cockpit — Desktop shell (Tauri v2)

A lightweight native window hosting the **same registry-bound Bridge UI** as the
VS Code shell and the browser. The shell does not replace the CLI or reimplement
the control plane — `src-tauri/src/main.rs` waits for the Bridge's per-launch
runtime token file (`~/.aiwg/cockpit/runtime/bridge.json`) and opens a window at
the Bridge UI with the token on the query string.

## Architecture

```
operator/CLI: aiwg cockpit
      │  (spawns the Bridge; writes runtime/bridge.json mode 600)
      ▼
Bridge (127.0.0.1:PORT, token-gated /api) ── proxies ──▶ executor (mock today; agentic-sandbox #460/#461)
      ▲
      │  loads http://127.0.0.1:PORT/?token=…
desktop window  (this app)   ◀── same UI ──▶   VS Code webview  /  browser
```

## Build (toolchain-gated)

Requires the Rust toolchain + Tauri prerequisites. On Linux: `webkit2gtk-4.1`,
`libsoup-3.0`, `libappindicator`. Then:

```bash
cargo install tauri-cli --version '^2'   # once
cd apps/cockpit/desktop
cargo tauri init                          # generates icons/ + capabilities/ boilerplate (one-time)
cargo tauri dev                           # run against a launched Bridge
cargo tauri build                         # produce a bundle
```

> The repo ships the load-the-Bridge logic (`main.rs`), the Tauri config, and the
> frontend splash. `cargo tauri init` fills in the platform boilerplate (icons,
> v2 capabilities) that is environment-specific and not checked in.

## Why a token file (not a socket handshake)

The runtime file is the cross-platform handshake every shell shares (see
`apps/cockpit/shell-core/runtime.mjs`). It is mode `600`; OS-keychain storage is a
per-platform hardening follow-up (roctinam/aiwg#1595).
