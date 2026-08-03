---
namespace: aiwg
name: browser-setup
description: Interactive wizard that wires up @playwright/mcp end-to-end — detects the user's browsers, walks through Playwright MCP Bridge extension install, captures the per-install token, registers the MCP server in the AIWG registry with --extension and the env block, injects into the active provider's config, and verifies the connection.
version: 0.1.0-draft
status: draft
platforms: [all]
triggers:
  - "set up browser control"
  - "install playwright mcp"
  - "wire up browser automation"
  - "configure playwright extension"
  - "drive my browser from the agent"
  - "let the agent open my browser"
---

# Browser Setup Skill (DRAFT)

> Status: DRAFT — scaffolded from PoC. Implementation pending Inception outputs.

## Purpose

End-to-end interactive wizard that takes a user from "AIWG agent can't drive a browser" to "AIWG agent is connected to my real, logged-in browser via the Playwright MCP Bridge extension" without the user needing to know the underlying MCP plumbing, token semantics, or AIWG CLI surface.

## When This Skill Applies

- User asks the agent to "open a website" or "log into X for me" and AIWG detects no browser MCP is configured
- User explicitly requests browser-control setup
- `browser-doctor` reports the addon is installed but unwired

## Inputs

| Field | Source | Notes |
|---|---|---|
| Provider | `aiwg runtime-info` | Auto-detect; user can override |
| Target browser | OS-specific detection | Recommend based on `--extension` support |
| Token | Interactive (AskUserQuestion) | Pasted by user after installing extension |

## Walkthrough (planned)

### Step 1: Pre-flight

Confirm AIWG is initialized in the workspace and the active provider supports MCP servers with `env` blocks. Bail with explicit guidance if not.

### Step 2: Detect installed browsers

Linux:
- `which google-chrome google-chrome-stable microsoft-edge microsoft-edge-stable chromium chromium-browser brave-browser vivaldi opera`
- `flatpak list --app 2>/dev/null | grep -iE 'chrome|chromium|edge|brave|vivaldi'`

macOS:
- `mdfind 'kMDItemContentType == "com.apple.application-bundle"'` filtered by known bundle IDs (`com.google.Chrome`, `com.microsoft.edgemac`, `org.chromium.Chromium`, `com.brave.Browser`)

Windows:
- Read `HKLM\SOFTWARE\Clients\StartMenuInternet\` and standard install paths

Classify each detected browser by extension-mode support:
- **Native extension support**: Chrome, Edge
- **CDP fallback only**: Chromium, Brave, Vivaldi, Arc, Opera

### Step 3: Recommend a browser

Present detected browsers ranked by:
1. Already installed AND supports `--extension`
2. Already installed but needs CDP fallback (note caveats)
3. Not installed (provide install URL but don't auto-install)

Recommend the dedicated-agent-browser pattern: keep your daily browser separate. Suggest the apt-installed Chrome (if present) or Edge as the agent's browser; leave Flatpak Chromium etc. for personal use.

### Step 4: Walk through extension install

Print:
- Web Store URL: https://chromewebstore.google.com/detail/playwright-mcp-bridge/mmlmfjhmonkocbjadbfplnigmagldckm
- Optionally open via `xdg-open` / `open` / `start <url>` (with permission)
- Wait for the user to confirm install + pin the extension icon

### Step 5: Capture the token

Use `AskUserQuestion` (or markdown prompt on providers without native UX):
> "Click the Playwright MCP Bridge extension icon in your browser. Copy the token shown there and paste it below."

Validate: non-empty, alphanumeric-with-hyphens-and-underscores, length ≥ 16.

### Step 6: Store the token

```bash
mkdir -p ~/.config/playwright-mcp
chmod 700 ~/.config/playwright-mcp
# Write token to ~/.config/playwright-mcp/token (mode 600)
chmod 600 ~/.config/playwright-mcp/token
```

Per `token-security` rule: never echo, never log, never include in error output.

### Step 7: Register the MCP server

```bash
TOKEN=$(cat ~/.config/playwright-mcp/token)
aiwg mcp add playwright \
  --type stdio \
  --command npx \
  --args '-y,@playwright/mcp@latest,--extension' \
  --env "PLAYWRIGHT_MCP_EXTENSION_TOKEN=${TOKEN}" \
  --description 'Playwright MCP — browser automation via accessibility tree' \
  || aiwg mcp update playwright \
    --command npx \
    --args '-y,@playwright/mcp@latest,--extension' \
    --env "PLAYWRIGHT_MCP_EXTENSION_TOKEN=${TOKEN}"
```

**Known gap**: the token lands in plaintext in `~/.aiwg/mcp-servers.json`. Final addon release depends on AIWG core supporting `${file:...}` substitution. Document this in the setup-complete report.

### Step 8: Inject into provider

```bash
PROVIDER=$(aiwg runtime-info --json | jq -r '.provider')
aiwg mcp inject --provider "$PROVIDER" --servers playwright
```

### Step 9: Verify

Spawn a probe MCP process briefly with env var set, send JSON-RPC `initialize` + `tools/list`, check for `browser_tabs` in the response. Kill the probe.

If probe succeeds: setup-complete report.
If probe fails: collect diagnostics and hand off to `browser-doctor`.

### Step 10: Setup-complete report

| Field | Value |
|---|---|
| Browser | `<binary path>` |
| Token file | `~/.config/playwright-mcp/token` |
| MCP registered | `playwright` |
| Provider injected | `<provider name>` |
| Next | Restart the provider; ask agent to "list browser tabs" |

Reset / rotate instructions: `aiwg run skill browser-reset`
Health check: `aiwg run skill browser-doctor`

## Constraints

- Token never echoed in any output (including error paths)
- Setup wizard prompts for `human-authorization` before:
  - Writing the token file
  - Modifying the AIWG MCP registry
  - Modifying the provider's config file
- Activity log entry after each significant step

## Cross-platform notes

- Linux: most common, fully scripted
- macOS: same shape, different binary detection
- Windows: detection via PowerShell registry queries; path normalization for MCP env strings

## Open implementation questions

1. Should the wizard scaffold `.aiwg/browser-allowlist.yaml` immediately, or defer to first agent use?
2. If user has both Chrome and Edge installed, should we prefer one based on which has the extension already installed?
3. Should the wizard offer to install the extension via load-unpacked from `node_modules/@playwright/mcp/lib/extension/` if Web Store access is blocked?

## References

- `.aiwg/architecture/adr-remote-browser-control.md` — architectural context
- `.aiwg/working/browser-control-feature-plan.md` — full design
- `rules/browser-control-safety.md` — enforcement (this addon)
- `.claude/rules/token-security.md` — token-handling discipline
- `.claude/rules/human-authorization.md` — authorization gates
