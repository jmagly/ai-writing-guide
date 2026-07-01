---
name: aiwg-init
namespace: aiwg
platforms: [all]
description: Initialize AIWG configuration for an existing project by creating .aiwg/aiwg.config with provider and script entries
---

# Init

You initialise AIWG configuration for an existing project by creating `.aiwg/aiwg.config` with provider registry entries and custom script definitions.

## Triggers

Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "aiwg init" → run with defaults or interactively
- "add aiwg config" → create `.aiwg/aiwg.config`
- "set up providers" → interactive provider selection
- "register my scripts" → interactive script registration

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| Default init | "aiwg init" | Run `aiwg init` with defaults |
| Interactive | "init aiwg interactively" | Run `aiwg init --interactive` |
| Provider flag | "init aiwg for copilot" | Run `aiwg init --provider copilot` |
| Config check | "do I have an aiwg config?" | Read `.aiwg/aiwg.config` |

## Behavior

When triggered:

1. **Distinguish from `new`**:
   - `init` adds AIWG configuration to an **existing** project — it does not create a new project directory or the full `.aiwg/` subdirectory tree.
   - If the project has no `.aiwg/` directory at all, suggest `aiwg new .` instead.

2. **Extract arguments**:
   - Is `--interactive` requested? If so, ask which providers to configure and which scripts to register.
   - Is a specific `--provider` given? Pre-fill that entry in the registry.
   - Is `--interactive` absent? Write a minimal config with the detected provider.

3. **Run the appropriate command**:

   ```bash
   # Default: write minimal config, auto-detect provider
   aiwg init

   # Interactive: guided wizard for providers and scripts
   aiwg init --interactive

   # Pre-configure a specific provider
   aiwg init --provider copilot
   ```

4. **What the command creates** — `.aiwg/aiwg.config` with:
   - `providers` block: list of configured provider names and their deploy paths
   - `scripts` block: named shell commands for use with `aiwg run`
   - Metadata: version, created timestamp

5. **Report the result** — confirm path written and show the generated config summary.

## Examples

### Example 1: Default init

**User**: "aiwg init"

**Extraction**: No flags, auto-detect provider (claude-code)

**Action**:
```bash
aiwg init
```

**Response**: "Created `.aiwg/aiwg.config` with provider `claude-code` pre-configured. No scripts registered yet. Use `aiwg init --interactive` to add providers or scripts, or edit the file directly."

### Example 2: Interactive init

**User**: "Set up AIWG config interactively"

**Extraction**: Interactive flag required

**Action**:
```bash
aiwg init --interactive
```

**Response**: Wizard prompts for providers to enable and scripts to register, then writes `.aiwg/aiwg.config`. Confirms: "Configured 2 providers (claude-code, copilot) and 3 scripts (test, lint, deploy). Config written to `.aiwg/aiwg.config`."

### Example 3: Single provider

**User**: "Init aiwg config for GitHub Copilot"

**Extraction**: Provider `copilot` specified

**Action**:
```bash
aiwg init --provider copilot
```

**Response**: "Created `.aiwg/aiwg.config` with provider `copilot` configured (deploy path: `.github/`). Run `aiwg use sdlc --provider copilot` to deploy frameworks."

### Example 4: Config already exists

**User**: "aiwg init"

**Extraction**: `.aiwg/aiwg.config` already present

**Action**: Read existing config, report what is configured, and offer `--interactive` to update rather than overwriting.

**Response**: "`.aiwg/aiwg.config` already exists (providers: claude-code; scripts: test, deploy). Run `aiwg init --interactive` to update the configuration."

## Clarification Prompts

If the user's intent is ambiguous:

- "Is this an existing project, or would you like to create a new one? (For a new project, `aiwg new <name>` sets up the full structure.)"
- "Would you like to configure providers and scripts interactively, or should I write defaults?"

## References

- @$AIWG_ROOT/src/cli/handlers/init.ts — `init` command handler
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/skills/run/SKILL.md — Running registered scripts
