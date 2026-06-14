# Cockpit runtime directory — `~/.aiwg/cockpit/runtime/`

The Cockpit installs **globally** (one tool at `~/`), and the operator sets the
working directories that agent instances launch from. Per-launch runtime state for
the local control surface lives here.

## What lands here

| File | Written by | Mode | Contents |
|---|---|---|---|
| `bridge.json` | the Bridge on launch | `0600` | `{ token, port, pid, started_at }` — the per-launch handshake every shell reads |

The directory itself is `0700`. The Bridge **rewrites** `bridge.json` on each launch
(the token is per-launch, not persistent).

## How the shells use it

Every shell (browser, VS Code, Tauri) resolves the Bridge the same way — see
`apps/cockpit/shell-core/runtime.mjs`:

1. read `bridge.json` → `{ token, port }`
2. wait for `http://127.0.0.1:<port>/healthz`
3. load the UI at `http://127.0.0.1:<port>/?token=<token>`

## Security

- `bridge.json` holds **only the overlay's own per-launch token** — never a provider
  or stack credential (verified by `apps/cockpit/poc/security-checks.mjs`, property I1).
- `token` gates every `/api/*` call (constant-time bearer check); `tenant_id` elsewhere
  is a **routing** token, never authentication.
- OS-keychain storage of the token is the platform-specific hardening follow-up
  (roctinam/aiwg#1595); the `0600` file is the cross-platform handshake.

## Launch-cwd model

The Bridge runs on `127.0.0.1`; agent instances launch from operator-set working
directories (not the install root). Runtime-level operator docs (this directory) are
distinct from the install (`$AIWG_ROOT`) and from project artifacts (`.aiwg/`).
