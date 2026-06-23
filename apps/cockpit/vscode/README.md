# AIWG Cockpit — VS Code shell

Hosts the registry-bound Cockpit UI inside a VS Code webview and surfaces
contributed actions as command-palette entries. No build step (CommonJS
`extension.js`); the same Bridge core as the desktop app and browser.

## Commands

| Command | Effect |
|---|---|
| **AIWG Cockpit: Open** | Opens the Cockpit UI in a webview (reads the Bridge runtime handshake, resolves the token, loads `http://127.0.0.1:PORT/?token=…`). |
| **AIWG Cockpit: Audit Issues** | Opens Cockpit on the contributed Actions view; the action injects into an agentic session instead of running from the extension. |

## Run it

1. Launch the Bridge: `aiwg cockpit` (or, in-repo, `node apps/cockpit/bridge/src/server.mjs`). It writes `~/.aiwg/cockpit/runtime/bridge.json` (token reference + port when OS-keychain storage is available, otherwise token + port, mode 600).
2. In VS Code: **F5** (Extension Development Host) from this folder, or install the packaged `.vsix`.
3. Run **AIWG Cockpit: Open** from the command palette.

If the Bridge isn't running, the commands show a hint to start it — the shell
never replaces the CLI; it fronts it.

## Settings

- `aiwg-cockpit.bridgeRuntimeFile` — override the runtime file path (default `~/.aiwg/cockpit/runtime/bridge.json`).
