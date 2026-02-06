# Skills and Commands Unification Guide

**Issue:** #288
**Version:** 2026.2.0
**Status:** Active

## Overview

Claude Code v2.1.3 unified slash commands and skills into a single concept. Both `.claude/commands/` and `.claude/skills/` directories work identically. Additionally, v2.1.19 introduced indexed argument syntax for positional parameters. This guide documents the implications for AIWG distribution.

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
├── commands/          # Legacy location - still works
│   ├── commit-and-push.md
│   └── pr-review.md
└── skills/            # Also works - identical behavior
    ├── ralph.md
    └── intake-wizard.md
```

**Recommendation**: AIWG should standardize on `.claude/commands/` for all deployable command/skill files since this is the more established convention. The distinction is purely organizational.

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

All AIWG commands listed in `@docs/cli-reference.md` work from either directory. The `aiwg use` deployment command places files in `.claude/commands/` by default.

### Cross-Platform Mapping

| Platform | Command Location | Invocation |
|----------|-----------------|------------|
| Claude Code | `.claude/commands/` | `/command-name` or Skill tool |
| GitHub Copilot | `.github/agents/` | `@agent-name` |
| Cursor | `.cursor/rules/` | Rule-based |
| Warp | `WARP.md` commands section | Natural language |

## Migration Checklist

For existing AIWG installations:

- [ ] Commands in `.claude/commands/` continue to work (no change needed)
- [ ] Skills in `.claude/skills/` continue to work (no change needed)
- [ ] Update any docs referencing "commands vs skills" distinction
- [ ] Adopt `$ARGUMENTS[0]` syntax for multi-param commands
- [ ] Test indexed arguments with `aiwg doctor`

## References

- @agentic/code/frameworks/sdlc-complete/agents/agent-template.md - Agent template with skills section
- @docs/cli-reference.md - Full CLI command reference
- @docs/context-management-patterns.md - Skill discovery patterns
