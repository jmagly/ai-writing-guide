---
namespace: aiwg
name: plugin-status
platforms: [all]
description: List installed Claude Code plugins with version, install date, and enabled status
---

# Plugin Status

You list all installed Claude Code plugins with their version, install date, and enabled status.

## Triggers

Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "what's installed?" → show all plugins
- "do I have the voice plugin?" → check if specific plugin is installed
- "is the SDLC plugin up to date?" → show installed version vs latest
- "what plugins does this project use?" → show plugin status

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| Status request | "plugin status" | Run `aiwg plugin-status` |
| List request | "show plugins" | Run `aiwg plugin-status` |
| List all | "list plugins" | Run `aiwg plugin-status` |
| What's installed | "what plugins are installed" | Run `aiwg plugin-status` |
| Check specific | "is voice@aiwg installed?" | Run `aiwg plugin-status voice@aiwg` |
| JSON output | "plugin status as JSON" | Run `aiwg plugin-status --json` |
| Outdated check | "are any plugins outdated?" | Run `aiwg plugin-status --check-updates` |

## Behavior

When triggered:

1. **Extract intent**:
   - Is a specific plugin being queried, or is this a full list?
   - Is the user checking for outdated versions?
   - Is machine-readable output needed?

2. **Run the appropriate command**:

   ```bash
   # List all installed plugins
   aiwg plugin-status

   # Check a specific plugin
   aiwg plugin-status sdlc@aiwg

   # Check for available updates
   aiwg plugin-status --check-updates

   # Machine-readable JSON output
   aiwg plugin-status --json
   ```

3. **Report the result** — show plugin name, version, install date, enabled status, and update availability.

## Output Format

```
Installed Plugins (2)

  sdlc@aiwg
    Version:     2026.3.15
    Installed:   2026-03-28
    Status:      enabled
    Update:      none (latest)

  voice@aiwg
    Version:     2026.2.10
    Installed:   2026-02-14
    Status:      enabled
    Update:      2026.3.15 available — run `aiwg install-plugin voice@aiwg --force`
```

## Examples

### Example 1: Check what is installed

**User**: "What plugins do I have installed?"

**Extraction**: Full plugin list

**Action**:
```bash
aiwg plugin-status
```

**Response**: "2 plugins installed: sdlc@aiwg v2026.3.15 (enabled, current), voice@aiwg v2026.2.10 (enabled, update available: v2026.3.15)."

### Example 2: Check a specific plugin

**User**: "Is the voice plugin installed and up to date?"

**Extraction**: Query for voice@aiwg specifically

**Action**:
```bash
aiwg plugin-status voice@aiwg
```

**Response**: "voice@aiwg v2026.2.10 is installed (enabled). Update available: v2026.3.15. Run `aiwg install-plugin voice@aiwg --force` to update."

### Example 3: Nothing installed

**User**: "Show plugins"

**Extraction**: Full plugin list

**Action**:
```bash
aiwg plugin-status
```

**Response**: "No plugins installed. Install one with `aiwg install-plugin <name>@aiwg`. Available: sdlc, voice, marketing, utils."

### Example 4: Check for updates

**User**: "Are any of my plugins out of date?"

**Extraction**: Update check requested

**Action**:
```bash
aiwg plugin-status --check-updates
```

**Response**: "1 update available: voice@aiwg 2026.2.10 → 2026.3.15. Run `aiwg install-plugin voice@aiwg --force` to update."

## References

- @$AIWG_ROOT/src/cli/handlers/utilities.ts — Command handler
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference
