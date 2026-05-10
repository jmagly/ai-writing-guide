---
namespace: aiwg
name: remove
platforms: [all]
description: Remove a deployed framework or addon from the current workspace

---

# AIWG Remove

You remove a deployed framework or addon from the current workspace.

## Triggers

Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "tear down the marketing framework" → remove media-marketing-kit
- "clean up sdlc" → remove sdlc-complete
- "take out the ralph addon" → remove ralph
- "disable the ring methodology" → remove ring-methodology

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| Remove framework | "remove sdlc" | Run `aiwg remove sdlc-complete` |
| Uninstall addon | "uninstall ralph" | Run `aiwg remove ralph` |
| Remove by full id | "remove media-marketing-kit" | Run `aiwg remove media-marketing-kit` |

## Behavior

When triggered:

1. **Extract intent**:
   - Which framework or addon is the target? Resolve shorthands the same way `use` does (e.g., "sdlc" → `sdlc-complete`, "marketing" → `media-marketing-kit`).
   - Confirm the item is currently installed before proceeding (check registry).

2. **Run the command**:

   ```bash
   # Remove a framework
   aiwg remove sdlc-complete

   # Remove an addon
   aiwg remove ralph
   ```

3. **Report the result** inline — confirm what was removed and note that source files are not deleted (only deployed artifacts and the registry entry are affected).

## Examples

### Example 1: Remove a framework

**User**: "remove the sdlc framework"

**Extraction**: Framework `sdlc-complete`

**Action**:
```bash
aiwg remove sdlc-complete
```

**Response**: "Removed sdlc-complete. Deployed artifacts deleted from `.claude/agents/`, `.claude/commands/`, and `.claude/rules/`. Entry removed from `.aiwg/frameworks/registry.json`. Source files were not affected."

### Example 2: Remove an addon

**User**: "uninstall the ralph addon"

**Extraction**: Addon `ralph`

**Action**:
```bash
aiwg remove ralph
```

**Response**: "Removed ralph addon. Deployed artifacts cleared from `.claude/`. Entry removed from registry."

### Example 3: Remove something not installed

**User**: "remove the forensics framework"

**Extraction**: Framework `forensics-complete`, check registry first

**Action**:
```bash
aiwg remove forensics-complete
```

**Response**: "forensics-complete is not currently installed — nothing to remove."

## Clarification Prompts

If the user's intent is ambiguous:

- "Which framework or addon would you like to remove? Installed: sdlc-complete, ralph."
- "Just to confirm: this removes the deployed artifacts but not the AIWG source. Proceed?"

## References

- @$AIWG_ROOT/src/cli/handlers/subcommands.ts — Remove subcommand handler
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference
