# Cockpit runtime directory — `~/.aiwg/cockpit/runtime/`

The Cockpit installs **globally** (one tool at `~/`), and the operator sets the
working directories that agent instances launch from. Per-launch runtime state for
the local control surface lives here.

## What lands here

| File | Written by | Mode | Contents |
|---|---|---|---|
| `bridge.json` | the Bridge on launch | `0600` | `{ token_ref, port, pid, started_at, keychain_backed }` when OS-keychain storage succeeds; otherwise `{ token, port, pid, started_at, keychain_backed:false, keychain_error }` |

The directory itself is `0700`. The Bridge **rewrites** `bridge.json` on each launch
(the token is per-launch, not persistent).

## How the shells use it

Every shell (browser, VS Code, Tauri) resolves the Bridge the same way — see
`apps/cockpit/shell-core/runtime.mjs`:

1. read `bridge.json` → `{ token_ref, port }` or fallback `{ token, port }`
2. resolve `token_ref` through `apps/cockpit/shell-core/keychain.mjs` when present
3. wait for `http://127.0.0.1:<port>/healthz`
4. load the UI at `http://127.0.0.1:<port>/?token=<token>`

## Security

- The per-launch token is written to the OS credential backend when one is available:
  macOS Keychain (`security`), Windows Credential Manager via PowerShell
  PasswordVault, Linux libsecret (`secret-tool`), or opt-in KDE Wallet
  (`AIWG_COCKPIT_ENABLE_KWALLET=1`).
- `bridge.json` holds **only the overlay's own per-launch token or token reference** —
  never a provider or stack credential (verified by
  `apps/cockpit/poc/security-checks.mjs`, property I1). Set
  `AIWG_COCKPIT_KEYCHAIN_STRICT=1` to omit the inline token when keychain storage
  succeeds; set `AIWG_COCKPIT_REQUIRE_KEYCHAIN=1` to fail Bridge launch if no OS
  credential backend is usable.
- `token` gates every `/api/*` call (constant-time bearer check); `tenant_id` elsewhere
  is a **routing** token, never authentication.
- Browser-origin `/api/*` calls are localhost-origin checked, and state-changing
  browser calls must include the CSRF double-submit header emitted by the web clients.

## Launch-cwd model

The Bridge runs on `127.0.0.1`; agent instances launch from operator-set working
directories (not the install root). Runtime-level operator docs (this directory) are
distinct from the install (`$AIWG_ROOT`) and from project artifacts (`.aiwg/`).
