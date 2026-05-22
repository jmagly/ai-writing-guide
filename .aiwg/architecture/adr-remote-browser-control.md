# ADR: Remote Browser Control Architecture

## Status

**DRAFT** — awaiting Inception review

## Date

2026-05-22

## Context

### Problem Statement

AIWG agents need a way to drive a real, user-installed browser session with authenticated state (cookies, logins, profile-bound storage) so that scenarios like internal admin walkthroughs, paywalled research access, ops dashboard triage, and post-deploy verification can be agent-assisted. The PoC documented in `.aiwg/working/browser-control-feature-plan.md` proved that `@playwright/mcp` works for this purpose but exposed substantial setup friction and design choices that warrant capture.

This ADR records the architectural decision for **how AIWG drives a Chromium-derived browser**, and the security model that decision imposes. The implementation lives in the proposed `browser-control` addon (intake at `.aiwg/intake/browser-control-intake.md`).

### Forces in tension

| Force | Implication |
|---|---|
| **Reuse the user's existing logged-in sessions** | Pushes toward attaching to a running browser instance, not spawning a fresh one |
| **Avoid credential exfiltration risk** | Modern Chrome refuses `--remote-debugging-port` against the default profile (since M136) for exactly this reason |
| **Cross-platform parity** | Linux, macOS, Windows; Flatpak, snap, native, Web Store install paths all real |
| **Low setup friction** | Wizard-driven, not a manual checklist |
| **Stable contract long-term** | CDP is Chromium-only and version-tied; WebDriver BiDi is the W3C standards-track successor |
| **AIWG-native MCP ecosystem** | Solution should compose with `aiwg mcp` registry/profile/inject; not require sideloaded tooling |
| **Security review-able** | Token handling, allow-list enforcement, activity-log audit |

### Options considered

#### Option 1 — Extension mode (`@playwright/mcp --extension` + Playwright MCP Bridge)

User installs the [Playwright MCP Bridge](https://chromewebstore.google.com/detail/playwright-mcp-bridge/mmlmfjhmonkocbjadbfplnigmagldckm) extension in Chrome or Edge. MCP server connects via the extension; extension authenticates the MCP via a per-install token.

**Pros**:
- Real user profile, real logins, no separate browser instance
- Per-tab consent UX baked into the extension
- No exposed CDP socket on localhost
- Token authentication, not "anything-on-the-box-can-attach"

**Cons**:
- **Chrome and Edge only** — `--extension` mode does not scan Chromium, Brave, Vivaldi, Arc, Opera, or Flatpak Chromium profile directories (confirmed in PoC)
- Requires Web Store install (or load-unpacked in Developer mode)
- Token-handoff UX is interactive (copy from extension UI)
- Tied to the Playwright MCP Bridge extension protocol; not a W3C standard

#### Option 2 — CDP mode (`@playwright/mcp --cdp-endpoint`)

User launches Chromium-derived browser with `--remote-debugging-port=<port> --user-data-dir=<dedicated>`. MCP server connects via Chrome DevTools Protocol over WebSocket on localhost.

**Pros**:
- Works for **any** Chromium-derived browser including Flatpak Chromium, Brave, Vivaldi, etc.
- No browser extension required
- Full CDP surface (network interception, performance, devtools features)

**Cons**:
- Modern Chrome refuses `--remote-debugging-port` against the default profile — must use a dedicated `--user-data-dir`, which means re-logging into sites
- CDP socket on localhost is **unauthenticated**; any process on the box can attach
- User must launch the browser with specific flags every session (or via a wrapper script)
- Flatpak sandbox may not expose `localhost:<port>` to the host MCP process
- Chromium version drift can break CDP version pinning

#### Option 3 — WebDriver BiDi (`@playwright/mcp` BiDi path)

Use Playwright's BiDi protocol against any conforming browser (Chromium, Firefox, WebKit).

**Pros**:
- W3C standards-track, long-term stable contract
- Cross-browser including Firefox/Safari
- Playwright supports it natively as of late 2025

**Cons**:
- BiDi-via-MCP not yet first-class in `@playwright/mcp` as of v0.0.75; the `--extension` and `--cdp-endpoint` paths are what's documented
- "Attach to running browser" UX via BiDi still requires the same kind of port + profile dance as CDP
- Less mature tooling around session reuse with logged-in state

#### Option 4 — `--user-data-dir <copy of real profile>`

Spawn a fresh Chromium with a copy of the user's real profile directory. Playwright owns the browser process; logins persist because they came from the copy.

**Pros**:
- Works for any Chromium browser
- Logins available without re-auth
- No CDP socket exposed (Playwright owns the WS internally)

**Cons**:
- Profile copying is fragile (Chrome locks; copy-during-running corrupts state)
- Disk cost of duplication
- Diverges from user's "live" sessions over time
- Browser must close before re-copy

#### Option 5 — Native messaging / `chrome.debugger` extension API

Build a custom extension that uses Chrome's `chrome.debugger` API to attach to tabs from within the extension itself, then exposes commands over native messaging to a local helper.

**Pros**:
- Most control over UX
- Works against default profile (extension is in-trust-boundary)

**Cons**:
- AIWG ships a custom extension long-term burden
- `chrome.debugger` prompts user on attach (noisy UX)
- Reinvents `@playwright/mcp --extension` for marginal benefit

## Decision

**Primary path: Option 1 (Extension mode)** with **Option 2 (CDP) as documented fallback** for users on unsupported browsers or who explicitly prefer CDP.

Reasoning:

1. **Token-authenticated** beats unauthenticated localhost CDP for the default user
2. **No flag-tinkering at browser-launch time** — user keeps using their normal browser launch flow
3. **Per-tab consent** in the extension is the natural human-authorization boundary, complementing the `human-authorization` rule
4. **Chrome and Edge cover the dominant user base**; users on Brave/Vivaldi/Chromium fall back to CDP with documented caveats
5. **`@playwright/mcp` is upstream-maintained by Microsoft** — protocol drift risk is bounded by playwright project's own discipline

### Long-term migration target

When `@playwright/mcp` exposes a stable WebDriver BiDi path that supports session-reuse against authenticated state, **Option 3 becomes the default** because it offers cross-browser parity (Firefox, WebKit) and W3C-standard stability. This ADR commits to revisiting the primary path when BiDi-via-MCP is documented and stable.

### Security model

The decision imposes the following invariants, captured in the `browser-control-safety.md` rule:

1. **Token storage**: per-install token stored at `~/.config/playwright-mcp/token`, mode `0600`, owner-only.
2. **Token plumbing**: token reaches the MCP server via `env` block in the AIWG MCP registry. Final iteration replaces literal tokens with `${file:...}` substitution to keep `~/.aiwg/mcp-servers.json` free of plaintext secrets (separate AIWG core change; see "Open follow-ups").
3. **Browser separation**: AIWG recommends a dedicated browser (apt-installed Chrome or Edge) for agent use, distinct from the user's personal browser. Documentation, not enforcement.
4. **Allow-list per workspace**: `.aiwg/browser-allowlist.yaml` declares allowed origins. Agent navigates outside the allow-list only after human authorization (per existing `human-authorization` rule).
5. **Sensitive-domain gate**: pattern-matched domains (banking, identity, payment, internal admin) require explicit human-authorization regardless of allow-list state.
6. **Activity log per MCP call**: every `mcp__playwright__*` invocation gets an `.aiwg/activity.log` entry. Already supported by the existing `activity-log` rule.
7. **No `--allow-unrestricted-file-access`**: AIWG-managed setup never enables it. Documented refusal in setup wizard.
8. **No `--caps devtools`** in default config: CVE-2026-8018 (Chrome DevTools policy bypass / sandbox escape) precedent. Opt-in only via separate ADR.
9. **Cookie/storage exfiltration discipline**: `browser_evaluate` and `browser_run_code_unsafe` tools are present but call sites that read `document.cookie`, `localStorage`, or `Network.getAllCookies` trip an authorization gate.

### Token regeneration / rotation

`browser-reset` skill rotates the token by walking the user through extension UI regeneration, then updating the file and re-registering. No silent rotation; the extension owns token issuance.

## Consequences

### Positive

- Normal users get a working setup in one skill invocation instead of ~10 session restarts
- Token never appears in commits (file is in `~/.config/`, not any repo)
- Per-tab consent in the extension means agent's effective access is operator-visible at all times
- Setup is provider-agnostic (works with Claude Code, OpenAI Codex, GitHub Copilot, etc. as long as the provider supports MCP servers with `env` blocks)
- The work-in-progress AIWG `aiwg mcp inject` path is **the** user-facing path — no more dependence on `claude-role`-style wrappers for this specific use case

### Negative

- Users on Chromium-derived non-Chrome/Edge browsers get a worse setup experience until BiDi path matures
- Token remains in plaintext in `~/.aiwg/mcp-servers.json` until `${file:...}` substitution lands (mitigated by file being in user home, not any repo)
- Adds two browsers worth of system surface (the user's daily browser plus the dedicated agent browser) if user follows the recommended separation
- Extension protocol changes upstream could break the addon (mitigated by version pinning + doctor checks)

### Neutral

- Token-leakage risk via conversation logs is the user's responsibility, not the addon's. The addon never echoes the token; setup wizard captures it via `AskUserQuestion` (or markdown prompt fallback) and writes directly to the secure file.
- Cross-platform browser detection complexity goes into a reusable `src/util/browser-detect.ts` module — likely valuable beyond this addon

## Open follow-ups (tracked separately)

1. **AIWG core: `${file:...}` and `${env:...}` substitution in MCP registry env blocks** — required before stable release of `browser-control`
2. **`aiwg mcp profile init-presets` browser preset** — small enhancement to the existing preset list
3. **`aiwg mcp inject` precedence doctor check** — warn when `claude-role`-style wrappers will override the injection
4. **WebDriver BiDi adoption** — revisit primary-path decision when `@playwright/mcp` BiDi support matures

## References

- `.aiwg/working/browser-control-feature-plan.md` — full lessons learned and feature design
- `.aiwg/intake/browser-control-intake.md` — formal intake form
- `.aiwg/working/playwright-mcp-poc.md` — T1–T7 PoC test plan
- [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp)
- [Playwright MCP Bridge — Chrome Web Store](https://chromewebstore.google.com/detail/playwright-mcp-bridge/mmlmfjhmonkocbjadbfplnigmagldckm)
- Chrome DevTools Protocol — https://chromedevtools.github.io/devtools-protocol/
- WebDriver BiDi spec — https://www.w3.org/TR/webdriver-bidi/
- CVE-2026-8018 — Chrome DevTools policy bypass / sandbox escape (May 2026)
- `.claude/rules/human-authorization.md` — authorization gate this ADR layers on
- `.claude/rules/activity-log.md` — audit log this ADR requires per MCP call
- `.claude/rules/token-security.md` — token-handling discipline this ADR conforms to
