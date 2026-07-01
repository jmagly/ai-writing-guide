---
namespace: aiwg
name: uninstall-plugin
platforms: [all]
description: Remove a previously installed Claude Code plugin and unregister it from the local plugin registry
---

# Uninstall Plugin

You remove a previously installed Claude Code plugin. You remove deployed plugin files and unregister the plugin from the local plugin registry.

## Triggers

Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "get rid of the voice plugin" → uninstall voice@aiwg
- "I don't need the marketing kit anymore" → uninstall marketing@aiwg
- "clean up the SDLC agents" → uninstall sdlc@aiwg
- "remove everything from that plugin" → uninstall with cleanup

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| Uninstall plugin | "uninstall plugin voice@aiwg" | Run `aiwg uninstall-plugin voice@aiwg` |
| Remove plugin | "remove plugin marketing@aiwg" | Run `aiwg uninstall-plugin marketing@aiwg` |
| Plugin uninstall | "plugin uninstall sdlc@aiwg" | Run `aiwg uninstall-plugin sdlc@aiwg` |
| Dry run | "what would removing the voice plugin delete?" | Run `aiwg uninstall-plugin voice@aiwg --dry-run` |
| Keep artifacts | "remove the plugin but keep my .aiwg/ files" | Run `aiwg uninstall-plugin sdlc@aiwg --keep-artifacts` |

## Behavior

When triggered:

1. **Extract intent**:
   - Which plugin is being removed?
   - Is this a dry run (preview) or should changes be applied?
   - Should project artifacts in `.aiwg/` be preserved? (default: yes, always preserve)

2. **Run the appropriate command**:

   ```bash
   # Uninstall a plugin
   aiwg uninstall-plugin sdlc@aiwg
   aiwg uninstall-plugin voice@aiwg
   aiwg uninstall-plugin marketing@aiwg

   # Preview what would be removed
   aiwg uninstall-plugin sdlc@aiwg --dry-run

   # Keep .aiwg/ project artifacts even if plugin-owned (default behavior)
   aiwg uninstall-plugin sdlc@aiwg --keep-artifacts
   ```

3. **Report the result** — list what was removed (agents, commands, skills, rules) and confirm the plugin is deregistered.

## What Gets Removed

| Removed | Description |
|---------|-------------|
| Agent files | Files in `.claude/agents/` that belong to the plugin |
| Command files | Files in `.claude/commands/` that belong to the plugin |
| Skill files | Files in `.claude/skills/` that belong to the plugin |
| Rule files | Files in `.claude/rules/` that belong to the plugin |
| Registry entry | Plugin entry removed from local plugin registry |

## What Is NOT Removed

| Preserved | Reason |
|-----------|--------|
| `.aiwg/` project artifacts | These are your project output, not plugin files |
| Shared skills used by other plugins | Removed only when last dependent plugin is removed |
| Custom modifications to plugin files | Files modified after install are flagged, not deleted |

## Examples

### Example 1: Remove the voice plugin

**User**: "Uninstall the voice plugin"

**Extraction**: Plugin name is `voice@aiwg`

**Action**:
```bash
aiwg uninstall-plugin voice@aiwg
```

**Response**: "Uninstalled voice@aiwg. Removed 6 voice profiles from .claude/skills/voices/, 4 soul system skills, 2 rules. Plugin deregistered."

### Example 2: Dry run before removing

**User**: "What would removing the SDLC plugin delete?"

**Extraction**: Dry-run for sdlc plugin

**Action**:
```bash
aiwg uninstall-plugin sdlc@aiwg --dry-run
```

**Response**: "Dry run — uninstalling sdlc@aiwg would remove: 58 agents from .claude/agents/, 42 commands from .claude/commands/, 12 skills, 33 rules. Your .aiwg/ project artifacts would NOT be affected. No changes made."

### Example 3: Plugin not found

**User**: "Remove the analytics plugin"

**Extraction**: Plugin name `analytics` — not in registry

**Action**:
```bash
aiwg uninstall-plugin analytics@aiwg
```

**Response**: "Plugin `analytics@aiwg` is not installed. Run `aiwg plugin-status` to see what is currently installed."

## Clarification Prompts

If the plugin name is ambiguous or not clearly installed:

- "Which plugin would you like to remove? Installed plugins: sdlc@aiwg, voice@aiwg. Run `aiwg plugin-status` to confirm."

## References

- @$AIWG_ROOT/src/cli/handlers/utilities.ts — Command handler
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference
