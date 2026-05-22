# Browser Control Safety

**Enforcement Level**: HIGH
**Scope**: All agents using `mcp__playwright__*` tools, all skills in the `browser-control` addon
**Addon**: browser-control
**Status**: DRAFT — scaffolded from PoC; awaiting Inception review

## Overview

`browser-control` connects an AIWG agent to a real, user-installed browser with the user's authenticated sessions. The browser holds cookies, OAuth tokens, payment methods, internal admin access, and message contents that the user has not separately authorized for AIWG access. This rule defines the discipline that keeps that surface safe.

## Mandatory Rules

### Rule 1: Token storage discipline

The Playwright MCP Bridge extension token is a per-install secret. It MUST be stored only at `~/.config/playwright-mcp/token` with mode 600 (owner-only). The parent directory MUST be mode 700.

**FORBIDDEN**:
- Token literal in any committed file
- Token in shell history (`HISTSIZE` doesn't help — use heredoc patterns or env-from-file)
- Token echoed in agent output
- Token in error messages
- Token in screenshot or snapshot artifacts

**REQUIRED**:
- Reading from `~/.config/playwright-mcp/token` at MCP server spawn time
- Final implementation: `${file:...}` substitution in AIWG MCP registry env block

### Rule 2: Allow-list enforcement

Before any `browser_navigate` call, the agent MUST consult `.aiwg/browser-allowlist.yaml` for the active workspace.

- **`mode: allow-list`** — only origins in `allow` may be navigated to without per-call authorization
- **`mode: block-list`** — origins in `deny` are refused; all others permitted
- Off-allow-list navigation requires `human-authorization` per the existing rule

If `.aiwg/browser-allowlist.yaml` does not exist, the agent operates in **strict mode**: every navigation requires explicit per-call authorization. Recommend `aiwg run skill browser-setup` to scaffold a default allow-list, or copy the template manually.

### Rule 3: Sensitive-domain authorization gate

Independent of allow-list state, the following patterns require `human-authorization` per session, per pattern, with the origin named in the authorization request:

- `*.bank*` and known financial-institution domains
- `accounts.google.com`, `login.microsoftonline.com`, `login.live.com`, other identity providers
- Payment processors (stripe.com, paypal.com, square.com)
- `github.com/settings/*` and equivalent (settings/admin paths)
- Email providers (mail.google.com, outlook.com)
- Internal admin patterns matching workspace-defined `sensitive_patterns`

Form submissions and clicks on these origins require a fresh authorization even if read-only navigation was already authorized.

### Rule 4: Activity log per call

Every `mcp__playwright__*` invocation MUST produce an entry in `.aiwg/activity.log` per the existing `activity-log` rule. Required fields:

- Tool name
- Origin only (never full URL with query string — query may contain tokens)
- Authorization basis (allow-list, per-call-authorized, sensitive-gate-authorized)
- Outcome (success / error)

### Rule 5: Cookie and storage exfiltration discipline

`browser_evaluate` and `browser_run_code_unsafe` can execute arbitrary JavaScript in any page the browser has loaded. The following reads require explicit per-call human-authorization with the origin named:

- `document.cookie`
- `localStorage`, `sessionStorage`
- `IndexedDB` databases
- `Network.getAllCookies` (CDP-level)
- POSTing any of the above values to an external URL

The default mode for the `browser-driver` agent denies `browser_run_code_unsafe` entirely; opt-in requires explicit per-session authorization.

### Rule 6: `--allow-unrestricted-file-access` always off

The MCP server MUST never be launched with `--allow-unrestricted-file-access`. The `browser-setup` skill's registration MUST omit it. `browser-doctor` MUST flag if a manually-edited registry contains it.

### Rule 7: `--caps devtools` opt-in only

The `--caps devtools` flag exposes the full DevTools surface (including history, downloads, sensitive panels). CVE-2026-8018 (DevTools policy bypass / sandbox escape, May 2026) is the recent precedent. Default registration omits this cap. Opt-in requires:

- ADR documenting the use case
- Workspace allow-list pre-existing and minimal
- Explicit per-session human-authorization at first use

### Rule 8: Screenshot bytes not returned inline

`browser_take_screenshot` returns image bytes. By default:
- Screenshot saved to `.playwright-mcp/screenshot-<timestamp>.png` (configurable filename)
- Agent reports the path, not the bytes
- User can read the file directly

This reduces token cost and avoids accidental sensitive-content exposure in conversation logs (e.g., a screenshot of an admin panel containing user PII).

### Rule 9: URL logging hygiene

When logging URLs (activity log, error messages, snapshots), include origin only by default. Query strings may contain:
- OAuth state/code values
- Session tokens (e.g., `?token=...` in legacy apps)
- Verification codes
- Internal IDs that are not meant for external sharing

Full URL logging requires either:
- The user explicitly requested the full URL
- The activity entry is gated behind a sensitive-domain authorization

### Rule 10: Probe and shutdown discipline

`browser-doctor`'s probe check MUST kill the MCP server it spawns within 30 seconds. `browser-reset` and other lifecycle skills MUST clean up child processes on success or failure.

Orphaned `npx @playwright/mcp` processes are a leak indicator and a security smell.

## Cross-references

- `.claude/rules/token-security.md` — base token-handling discipline
- `.claude/rules/human-authorization.md` — authorization gate model
- `.claude/rules/activity-log.md` — audit-log mechanics
- `.claude/rules/research-before-decision.md` — read allow-list before acting
- `.aiwg/architecture/adr-remote-browser-control.md` — architectural rationale

## Enforcement

This rule applies to:

- The `browser-driver` agent (this addon)
- Any agent invoking `mcp__playwright__*` tools
- Skills `browser-setup`, `browser-doctor`, `browser-reset` (this addon) that interact with the token file or registry

## Violations

Tier 1 (immediate fail):
- Token committed to any repo
- Token echoed in agent output
- Navigation to sensitive-domain origin without authorization
- Cookie / storage exfiltration without authorization

Tier 2 (warn + remediate):
- Allow-list missing in active workspace
- Full URL with query string logged
- Screenshot bytes returned inline without user request
- Orphaned MCP child processes after probe

## References

- `.aiwg/architecture/adr-remote-browser-control.md`
- `.aiwg/working/browser-control-feature-plan.md`
- `agents/browser-driver.md` (this addon)
- [Playwright MCP Bridge — Chrome Web Store](https://chromewebstore.google.com/detail/playwright-mcp-bridge/mmlmfjhmonkocbjadbfplnigmagldckm)
- CVE-2026-8018 — Chrome DevTools policy bypass / sandbox escape

---

**Rule Status**: DRAFT
**Last Updated**: 2026-05-22
