# Cockpit Installation & Launch

Cockpit is opt-in and separately published as `@aiwg/cockpit`. It is **not**
part of the base `aiwg` npm package (a smoke test guards that boundary), and
its version is kept in lockstep with the base AIWG CalVer version.

## Recommended path: through the base CLI

```bash
npm i -g aiwg
aiwg use cockpit     # installs @aiwg/cockpit under ~/.aiwg/cockpit/package
aiwg cockpit --status
aiwg cockpit
```

`aiwg use cockpit` installs the package **outside the base package footprint**,
under `~/.aiwg/cockpit/package` (override the root with `AIWG_COCKPIT_HOME`),
pinned to the installed AIWG version. `aiwg cockpit` then launches the local
Bridge, which serves the web UI through a one-time bootstrap and HttpOnly
session.

Useful flags on the launcher:

| Flag | Effect |
|---|---|
| `aiwg cockpit --status` | Report install state and version lockstep |
| `aiwg cockpit --install` (or `-y` / `--yes`) | Install/refresh the package, then launch |

## Direct npm install (package testing)

```bash
npm i -g @aiwg/cockpit
aiwg-cockpit          # bin → bridge/src/server.mjs
```

If a direct global install fails with `EACCES`, apply the npm global-prefix fix
from the root AIWG README — or prefer the base-CLI path above, which avoids
global-prefix permissions entirely.

## What launching does

`aiwg cockpit` (or `aiwg-cockpit`) starts the **Bridge** on `127.0.0.1:8140`:

1. Generates a per-launch bearer token and writes
   `~/.aiwg/cockpit/runtime/bridge.json` (file mode 600, directory 700),
   storing the token in the OS keychain when one is available (macOS Keychain,
   Windows Credential Manager, libsecret; KWallet opt-in).
2. Probes the agentic-sandbox executor at `AIWG_COCKPIT_EXECUTOR_URL`
   (default `http://127.0.0.1:8122`); if unreachable, best-effort autostarts an
   installed `agentic-mgmt` binary (disable with
   `AIWG_COCKPIT_AUTOSTART_EXECUTOR=0`, pin the command with
   `AIWG_COCKPIT_EXECUTOR_COMMAND`).
3. Prints a 60-second, one-time browser bootstrap URL whose nonce is in the
   fragment. The reusable bearer never enters the URL.

Point at a different executor:

```bash
AIWG_COCKPIT_EXECUTOR_URL=http://127.0.0.1:8122 aiwg cockpit
```

The full environment-variable reference lives in
[Bridge API → Environment variables](./bridge-api.md#environment-variables).

## Other shells

Every shell resolves the Bridge the same way: read
`~/.aiwg/cockpit/runtime/bridge.json` → `{token | token_ref, port}` → resolve
the token (keychain ref preferred) → poll `/healthz` and the authed
`/api/health` → request an audience-bound nonce → load
`http://127.0.0.1:<port>/#bootstrap=<one-time-nonce>`.

- **Desktop (Tauri)** — a native window hosting the same Bridge UI. Build/run
  from `apps/cockpit/desktop` with `cargo tauri dev` / `cargo tauri build`
  (Linux needs webkit2gtk-4.1, libsoup-3.0, libappindicator; artifacts are
  .deb/.rpm/.AppImage). The window waits for `bridge.json`, then opens the
  one-time bootstrap URL.
- **VS Code** — the `aiwg-cockpit` extension (`apps/cockpit/vscode`) opens the
  UI in a webview via the **AIWG Cockpit: Open** command. Launch the Bridge
  first. The `aiwg-cockpit.bridgeRuntimeFile` setting overrides the runtime
  file location. Note: on Windows the extension cannot yet resolve
  keychain-backed tokens (Credential Manager backend not implemented in the
  extension); use a platform where the runtime file carries the token or track
  the fix in the issue tracker.
- **Dev workspace** — see [Development](./development.md) for
  `npm run cockpit:up` and the Cockpit-only `npm --prefix apps/cockpit run dev`.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `aiwg cockpit` reports Cockpit is not installed | `aiwg use cockpit` |
| Installed version doesn't match base AIWG | `aiwg use cockpit` (reinstalls in lockstep) |
| Bridge refuses to start on port 8120/8121/8122 | Intentional — those are the executor's canonical ports. Use the default `8140` or set `PORT`/`AIWG_COCKPIT_BRIDGE_PORT` to another free port. See [Development → Ports](./development.md#ports) |
| UI shows "No stack connected" | The executor isn't reachable at `AIWG_COCKPIT_EXECUTOR_URL`. Start one (see [Development](./development.md)) or fix the URL. If you pointed at the bundled mock: the Bridge refuses mock executors for human launches by design |
| Shell can't authenticate | Delete `~/.aiwg/cockpit/runtime/bridge.json` and relaunch to mint a fresh token; check keychain availability, or see `AIWG_COCKPIT_KEYCHAIN_*` in [Trust & Security](./trust-and-security.md#token-custody) |

## See also

- [Architecture](./architecture.md) — what the Bridge does once it's running
- [Trust & Security](./trust-and-security.md) — token custody and strict keychain mode
