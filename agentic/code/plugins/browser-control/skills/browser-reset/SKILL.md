---
namespace: aiwg
name: browser-reset
description: Reconfigure the browser-control wiring. Rotate the Playwright MCP Bridge token, switch the target browser, or fully tear down the AIWG registration and provider injection. Walks the user through extension UI regeneration where needed; respects human-authorization gates for destructive operations.
version: 0.1.0-draft
status: draft
platforms: [all]
triggers:
  - "rotate browser token"
  - "reset browser control"
  - "change agent browser"
  - "tear down playwright mcp"
  - "switch from chrome to edge"
---

# Browser Reset Skill (DRAFT)

> Status: DRAFT — scaffolded from PoC. Implementation pending Inception outputs.

## Purpose

Recover from misconfiguration, rotate the per-install token, switch browsers, or fully tear down. Every destructive operation gated by `human-authorization`.

## When This Skill Applies

- User regenerated the token in the extension UI
- User switching from Chrome to Edge (or vice versa)
- User wants to fully uninstall browser-control wiring
- `browser-doctor` reports irrecoverable state

## Modes

### Mode 1: Rotate token

1. Show current setup (browser, token-file path, registry entry — token redacted)
2. Confirm intent (`AskUserQuestion`)
3. Walk user through extension regeneration:
   - Click extension icon in target browser
   - Click "Regenerate token" (UI label may vary by extension version)
   - Copy new token
4. Capture new token via interactive prompt
5. Atomic write to `~/.config/playwright-mcp/token` (mode preserved)
6. Update AIWG MCP registry env block: `aiwg mcp update playwright --env "PLAYWRIGHT_MCP_EXTENSION_TOKEN=<new>"`
7. Re-inject: `aiwg mcp inject --provider <p> --servers playwright`
8. Probe verify; report pass/fail

### Mode 2: Switch browser

1. Show current browser
2. Detect alternatives (same logic as `browser-setup`)
3. Confirm switch (`AskUserQuestion`)
4. Walk user through extension install in new browser (if not already installed there)
5. Capture token from the new browser's extension
6. Update token file
7. Update AIWG MCP registry (no path changes, just env)
8. Re-inject
9. Probe verify

Note: this mode does **not** remove the old browser's extension or token. User can do that manually; we don't touch user's other browsers without explicit authorization.

### Mode 3: Tear down

1. Show what will be removed (registry entry, provider injection, token file path)
2. Explicit `human-authorization` gate (destructive)
3. `aiwg mcp remove playwright`
4. Provider config: remove `playwright` from `mcpServers` (we wrote it, we own removal)
5. Optionally delete `~/.config/playwright-mcp/token` (prompt)
6. Optionally delete `.aiwg/browser-allowlist.yaml` (prompt)
7. Note: AIWG never uninstalls the browser extension itself — that's a user action in the browser UI

### Mode 4: Just re-inject

For when the AIWG MCP registry is correct but the provider config was overwritten by another tool. Single command, no token capture.

## Constraints

- Destructive operations (tear-down, token rotation, browser switch) require `human-authorization` per rule
- Activity log entry per mode invoked
- Token never echoed; redacted as `<2 chars>…<2 chars>` in any human-readable output
- Atomic writes for token file (write to `.tmp`, rename) to avoid partial-write states

## Open implementation questions

1. Should "switch browser" preserve the old browser's wiring as a fallback?
2. Should "tear down" offer to also delete `~/.config/playwright-mcp/` dir if empty?
3. What's the canonical "reset to factory" command — call this skill, or a separate `aiwg run skill browser-uninstall`?

## References

- `.aiwg/architecture/adr-remote-browser-control.md`
- `skills/browser-setup/SKILL.md` (this addon)
- `skills/browser-doctor/SKILL.md` (this addon)
- `rules/browser-control-safety.md` (this addon)
- `.claude/rules/human-authorization.md`
