# Skills and Commands Unification Guide

**Version:** 2026.5.10
**Status:** Active

## Overview

Claude Code v2.1.3 unified slash commands and skills into a single concept. Both `.claude/commands/` and `.claude/skills/` directories are visible in the slash-command surface. Additionally, v2.1.19 introduced indexed argument syntax for positional parameters. This guide documents the implications for AIWG distribution across providers.

## What Changed

### Directory Unification

| Before | After |
|--------|-------|
| `.claude/commands/` for slash commands | Both directories work identically |
| `.claude/skills/` for natural language skills | Both are invoked via `/name` or Skill tool |
| Different behavior expectations | Single unified concept |

### Indexed Arguments (v2.1.19)

| Before | After |
|--------|-------|
| `$ARGUMENTS` = full string | `$ARGUMENTS` = full string (unchanged) |
| Manual parsing required | `$ARGUMENTS[0]`, `$ARGUMENTS[1]` for positional |
| Complex argument handling | Clean indexed access |

## AIWG Implications

### Distribution Structure

AIWG deploys skills/commands to platform-specific directories. With unification:

```
.claude/
├── commands/          # Mirrored operator workflows only
│   ├── aiwg-setup-project.md
│   └── flow-concept-to-inception.md
├── skills/            # Kernel skills Claude loads natively
│   ├── aiwg-doctor/SKILL.md
│   └── use/SKILL.md
└── .aiwg/skills/      # Standard skills; index-driven, not flat-listed
    ├── intake-wizard/SKILL.md
    └── sdlc-accelerate/SKILL.md
```

**Current standard**: skills are canonical. AIWG deploys a small kernel to the provider's native skill surface, hides the large standard tier behind `aiwg discover` / `aiwg show`, and mirrors only selected operator workflows into command/prompt surfaces where users expect `/` menu access. Kernel skills that are already visible natively must not also be mirrored as commands on skills-native providers; that causes duplicate slash entries.

### Argument Migration

**Before** (manual parsing):
```markdown
Parse the arguments: $ARGUMENTS
Extract the first word as the target and the rest as options.
```

**After** (indexed):
```markdown
Target: $ARGUMENTS[0]
Options: $ARGUMENTS[1]
Full command: $ARGUMENTS
```

### Updated Skill Patterns

**Simple skill** (single argument):
```markdown
# .claude/commands/validate-file.md
Validate the file at path $ARGUMENTS for AIWG compliance.
Check structure, frontmatter, and cross-references.
```

**Multi-argument skill** (indexed):
```markdown
# .claude/commands/deploy-framework.md
Deploy the $ARGUMENTS[0] framework to the $ARGUMENTS[1] platform.

Framework options: sdlc, marketing, voice
Platform options: claude, copilot, cursor, factory
```

**Skill with defaults**:
```markdown
# .claude/commands/run-gate.md
Run the $ARGUMENTS[0] quality gate.

If no gate specified, run all gates for the current phase.
Use $ARGUMENTS[1] as the verbosity level (default: normal).
```

## AIWG Command Catalog Impact

AIWG command and skill exposure is provider-specific. Do not assume one provider's command behavior generalizes to another.

### Cross-Platform Mapping

| Platform | Native skill surface | Native command / prompt surface | AIWG mirroring policy |
|----------|----------------------|---------------------------------|----------------------|
| Claude Code | `.claude/skills/<name>/SKILL.md` for kernel skills | `.claude/commands/*.md` | Mirror standard operator workflows only. Do not mirror kernel skills already loaded from `.claude/skills/`. |
| OpenCode | `.opencode/skill/<name>/SKILL.md` for kernel skills; `.opencode/.aiwg/skill/` for indexed standard tier | `.opencode/command/*.md` | Generate command wrappers for selected operator workflows so command picker behavior stays deterministic. |
| Factory AI | `.factory/skills/<name>/SKILL.md` | `.factory/commands/*.md` plus skill slash invocation | Mirror selected operator workflows; keep skills canonical. |
| GitHub Copilot | `.github/skills/<name>/SKILL.md` | `.github/prompts/*.prompt.md` | Dual-write prompt wrappers for selected operator workflows because Copilot exposes prompt files through its command/prompt picker. |
| Codex | `.agents/skills/` project path; legacy AIWG entries in `~/.codex/skills/` are pruned | `~/.codex/prompts/` for user-visible prompts | Generate prompt wrappers for operator visibility; skill execution still routes through the indexed corpus. |

### Mirrored-Command Policy

Mirror only workflows that benefit from deterministic user invocation:

- Setup/update/status workflows such as `aiwg-setup-project`, `aiwg-update-claude`, and `aiwg-update-agents-md`
- Phase-flow and intake workflows that users intentionally choose from a command picker
- Provider-specific prompt wrappers where the provider lacks a native skill picker

Do not mirror:

- Kernel skills on skills-native providers, because the native skill surface already exposes them
- Background-only skills (`userInvocable: false`)
- Large standard-tier skill sets whose expected access path is `aiwg discover` / `aiwg show`

## Automatic Migration

`aiwg use` automatically removes the legacy `.claude/commands/` directory before deploying skills and then regenerates the current mirrored operator command set. Without this cleanup, stale command files and newly deployed skills can create duplicate entries in the Claude Code command palette.

**Default behavior (interactive TTY):**

```
⚠  Commands → Skills Migration
   .claude/commands contains 47 legacy command file(s).
   AIWG now serves kernel workflows as skills (.claude/skills/).
   Keeping stale overlapping commands causes duplicate entries in the Claude Code command palette.

   Remove commands directory and migrate? [Y/n]
```

**CI / non-interactive:** migrates silently without prompting.

**Opt out:**

```bash
aiwg use sdlc --skip-commands-migration
```

Skipping prints a reminder about the duplicate entries and the manual fix:

```
Warning: commands migration skipped for .claude/commands
  Duplicate entries may appear in the command palette...
  Remove the directory manually to fix: rm -rf .claude/commands
```

**Excluded providers:** home-directory providers (codex, openclaw) share their commands paths across all projects and are never touched by this migration.

## Migration Checklist

For existing AIWG installations:

- [ ] Mirrored operator commands in `.claude/commands/` continue to work
- [ ] Kernel skills in `.claude/skills/` continue to work and are not duplicated as command files
- [ ] Update any docs referencing "commands vs skills" distinction
- [ ] Adopt `$ARGUMENTS[0]` syntax for multi-param commands
- [ ] Test indexed arguments with `aiwg doctor`

### Trigger Redesign (when migrating commands to skills)

When converting `.claude/commands/` to `.claude/skills/`, the `## Triggers` section must follow the alternate-expression strategy:

1. **Write a strong `description:`** — this is the primary NL signal Claude uses for matching
2. **Do NOT list primary phrases** — Claude matches these automatically from the description
3. **Only include in `## Triggers`**:
   - Domain abbreviations ("SAST", "RTM", "IOC")
   - Colloquial shorthand ("ship it", "we got paged")
   - Tool-specific names ("stryker", "volatility")
   - Auto-trigger file patterns
4. **Remove `triggerPhrases` from frontmatter** — triggers go in the body `## Triggers` section only

See `@docs/extensions/creating-extensions.md` (Creating Skills section) for the full trigger authoring guide.

## References

- @agentic/code/frameworks/sdlc-complete/agents/agent-template.md - Agent template with skills section
- @docs/cli/reference.md - Full CLI command reference
- @docs/context-management-patterns.md - Skill discovery patterns
