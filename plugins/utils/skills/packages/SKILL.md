---
namespace: aiwg
name: packages
platforms: [all]
description: Manage remotely installed AIWG packages sourced from Git repositories via list, info, and remove subcommands
---

# AIWG Packages

You manage remotely installed AIWG packages — those installed via `aiwg install` from Git repositories.

## Triggers

Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "what remote packages are installed" → list packages
- "where did that package come from" → show package info
- "remove the remote package" → remove a specific package
- "show me the git packages" → list packages

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| List packages | "list packages" | Run `aiwg packages list` |
| Package info | "info on aiwg-devtools" | Run `aiwg packages info aiwg-devtools` |
| Remove package | "remove the aiwg-devtools package" | Run `aiwg packages remove aiwg-devtools` |
| Default (no subcommand) | "show packages" | Run `aiwg packages list` |

## Behavior

When triggered:

1. **Extract intent**:
   - Is this a listing, info lookup, or removal request?
   - If info or remove: which package is the target?

2. **Run the appropriate subcommand**:

   ```bash
   # List all remotely installed packages
   aiwg packages list

   # Show details for a specific package
   aiwg packages info <package-name>

   # Remove a remotely installed package
   aiwg packages remove <package-name>
   ```

3. **Report the result** inline — for listings, summarize each package with its source URL and version. For info, show full metadata. For remove, confirm deletion. Note: `packages` tracks only Git-sourced packages; frameworks and addons deployed via `aiwg use` appear in `aiwg list` instead.

## Examples

### Example 1: List all remote packages

**User**: "show me the installed packages"

**Extraction**: List subcommand

**Action**:
```bash
aiwg packages list
```

**Response**: "Installed packages: aiwg-devtools (v1.3.0, from https://github.com/acme/aiwg-devtools, installed 2026-03-28)."

### Example 2: Get details on a specific package

**User**: "what do I know about the aiwg-devtools package?"

**Extraction**: Info subcommand, target `aiwg-devtools`

**Action**:
```bash
aiwg packages info aiwg-devtools
```

**Response**: "aiwg-devtools — source: https://github.com/acme/aiwg-devtools, version: v1.3.0, installed: 2026-03-28, artifacts deployed to `.claude/agents/`, `.claude/commands/`."

### Example 3: Remove a remote package

**User**: "remove the aiwg-devtools package"

**Extraction**: Remove subcommand, target `aiwg-devtools`

**Action**:
```bash
aiwg packages remove aiwg-devtools
```

**Response**: "Removed aiwg-devtools. Deployed artifacts deleted from `.claude/`. Entry removed from packages registry."

### Example 4: No packages installed

**User**: "list packages"

**Extraction**: List subcommand

**Action**:
```bash
aiwg packages list
```

**Response**: "No remote packages are installed. Use `aiwg install <owner/repo>` to install a package from a Git repository."

## Clarification Prompts

If the user's intent is ambiguous:

- "Are you asking about remote packages (installed via `aiwg install`) or built-in frameworks? Built-in frameworks show up under `aiwg list`."
- "Which package would you like info on? Installed: aiwg-devtools."

## References

- @$AIWG_ROOT/src/cli/handlers/packages.ts — Packages command handler
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference
