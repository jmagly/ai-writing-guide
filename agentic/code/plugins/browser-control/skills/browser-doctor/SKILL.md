---
namespace: aiwg
name: browser-doctor
description: Read-only health check on browser-control setup. Verifies browser binary, Playwright MCP Bridge extension presence, token file mode/contents, AIWG MCP registration, provider config injection, and optional workspace allow-list. Outputs pass/fail per check with remediation commands.
version: 0.1.0-draft
status: draft
platforms: [all]
triggers:
  - "check browser control"
  - "browser doctor"
  - "verify playwright setup"
  - "diagnose browser mcp"
  - "is playwright wired up"
---

# Browser Doctor Skill (DRAFT)

> Status: DRAFT — scaffolded from PoC. Implementation pending Inception outputs.

## Purpose

Diagnostic, read-only health check. Tells the user what's wired correctly and what needs `browser-setup` or `browser-reset` to fix.

## When This Skill Applies

- After `browser-setup` to verify the wizard's work
- Before debugging "why isn't the agent driving my browser?"
- In CI / smoke tests to detect drift (extension uninstalled, token rotated, provider config rewritten)

## Checks (planned)

| # | Check | Pass criteria | On fail |
|---|---|---|---|
| 1 | Browser binary present | Configured browser path exists and is executable | `aiwg run skill browser-setup` to re-detect |
| 2 | Browser version | `<binary> --version` returns a known-good version | Update browser or document version mismatch |
| 3 | Extension installed | `<profile>/Extensions/mmlmfjhmonkocbjadbfplnigmagldckm/` exists | Install from Web Store; rerun setup |
| 4 | Token file present | `~/.config/playwright-mcp/token` exists | `aiwg run skill browser-reset` |
| 5 | Token file mode | mode 600, owner-only | `chmod 600 ~/.config/playwright-mcp/token` |
| 6 | Token file non-empty | size > 16 bytes | Re-capture token via reset |
| 7 | AIWG MCP registered | `aiwg mcp list` includes `playwright` | `browser-setup` |
| 8 | MCP args correct | Args include `--extension` | Re-register with correct args |
| 9 | MCP env block | `PLAYWRIGHT_MCP_EXTENSION_TOKEN` in env | Re-register with env block |
| 10 | Provider injected | Active provider config contains `playwright` in `mcpServers` | `aiwg mcp inject --provider <p> --servers playwright` |
| 11 | Provider env passthrough | Provider config's playwright entry preserves env | Re-inject |
| 12 | Probe connect | Spawn MCP, list tools, find `browser_tabs` | See diagnostics; likely token mismatch |
| 13 | Allow-list present (optional) | `.aiwg/browser-allowlist.yaml` exists | `cp templates/browser-allowlist.yaml.tmpl .aiwg/browser-allowlist.yaml` |
| 14 | Conflicting overrides | No `--mcp-config` wrapper detected for the active provider | Document precedence; remove wrapper or add playwright to it |

## Output

Structured JSON suitable for both human display and CI consumption:

```json
{
  "summary": { "passed": 13, "failed": 1, "skipped": 0 },
  "checks": [
    {
      "id": 1,
      "name": "Browser binary present",
      "status": "pass",
      "detail": "/usr/bin/google-chrome (148.0.7778.167)"
    },
    {
      "id": 13,
      "name": "Allow-list present (optional)",
      "status": "warn",
      "detail": ".aiwg/browser-allowlist.yaml not found",
      "remediation": "cp $AIWG_ROOT/${CLAUDE_PLUGIN_ROOT}/templates/browser-allowlist.yaml.tmpl .aiwg/browser-allowlist.yaml"
    }
  ]
}
```

Plain-text rendering for interactive use:

```
Browser Control — Health Check
==============================

[PASS] 1/14  Browser binary present       /usr/bin/google-chrome (148.0.7778.167)
[PASS] 2/14  Browser version              recent enough
[PASS] 3/14  Extension installed          mmlmfjhmonkocbjadbfplnigmagldckm
[PASS] 4/14  Token file present           ~/.config/playwright-mcp/token
…
[WARN] 13/14 Allow-list (optional)        not scaffolded; consider adding

13 PASS, 1 WARN, 0 FAIL
```

## Constraints

- Read-only — never writes, never modifies registry or configs
- Never echoes token value (only checks existence + mode + length)
- Probe check spawns + kills within a few seconds; no persistent side effects

## Open implementation questions

1. Should "probe connect" be opt-in (`--probe`) since it spawns a process?
2. Should we cache last-known-good versions per browser to detect downgrades?
3. How aggressively to flag #14 (conflicting overrides)? In some workspaces (e.g., this one with `claude-role`), the override is intentional.

## References

- `.aiwg/architecture/adr-remote-browser-control.md`
- `skills/browser-setup/SKILL.md` (this addon)
- `skills/browser-reset/SKILL.md` (this addon)
