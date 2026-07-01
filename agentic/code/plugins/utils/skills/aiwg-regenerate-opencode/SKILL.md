---
namespace: aiwg
name: aiwg-regenerate-opencode
platforms: [all]
description: Regenerate OpenCode context file (.opencode/context.md) with AIWG framework content
commandHint:
  argumentHint: "[--no-backup] [--dry-run] [--full-inject] [--migrate]"
  allowedTools: Read, Write, Edit, Bash, Glob
  model: sonnet
  category: context-regeneration
---

# Regenerate OpenCode Context

Regenerate the `.opencode/context.md` file for OpenCode integration. Performs an **intelligent merge** — preserving team-written content while updating AIWG context.

## Core Principle

**Team content is preserved. AIWG content is updated. Hook file approach used when supported.**

## Parameters

| Flag | Description |
|------|-------------|
| `--no-backup` | Skip creating backup file |
| `--dry-run` | Preview changes without writing |
| `--full-inject` | Inject full content directly into context.md (legacy/compatibility mode) |
| `--migrate` | Migrate existing full-injection to hook file approach |

## Hook File Approach (Default)

By default, this command uses the hook file architecture:

1. Generate `AIWG-opencode.md` with AIWG framework content
2. Add `@AIWG-opencode.md` directive to `.opencode/context.md`

**Note**: OpenCode's support for `@file` directives is not yet confirmed. If the `@` directive is not supported, use `--full-inject` as a fallback. See #444 for status.

## Execution Steps

### Step 1: Create Backup

Unless `--no-backup` specified, create `.opencode/context.md.backup-{YYYYMMDD-HHMMSS}`.

### Step 2: Analyze Existing Content

Read `.opencode/context.md` if it exists and categorize:

- **Team content** (PRESERVE): Project rules, conventions, business logic
- **AIWG content** (UPDATE): Framework integration sections

### Step 3: Detect Hook File Support

Check whether existing `.opencode/context.md` uses a hook file directive:

```bash
grep -q "@AIWG-opencode.md" .opencode/context.md && echo "hook approach" || echo "full inject or fresh"
```

### Step 4: Generate AIWG-opencode.md

Generate the hook file content from installed framework manifests (same as `aiwg hook-regenerate --provider opencode`).

**If `--full-inject`**: Skip hook file generation, embed content directly.

### Step 5: Write Output

**Hook approach** (default):
1. Write `AIWG-opencode.md` with generated content
2. Update `.opencode/context.md`: preserve team content + add `@AIWG-opencode.md` directive

**Full inject** (`--full-inject`):
1. Embed full AIWG content in `.opencode/context.md` between markers:
   ```
   <!-- BEGIN AIWG -->
   [content]
   <!-- END AIWG -->
   ```

### Step 6: Report

```
OpenCode Context Regenerated
=============================

Backup: .opencode/context.md.backup-20260322-190000

Hook file:    AIWG-opencode.md (312 lines, written)
Context file: .opencode/context.md updated
  @AIWG-opencode.md directive added

Team content preserved: 14 lines
```

## Note on OpenCode @-Link Support

OpenCode's support for `@file` includes within `.opencode/context.md` is currently unverified (see #444). If you encounter issues with AIWG context not loading:

```bash
# Fall back to full injection
/aiwg-regenerate-opencode --full-inject
```

## Examples

```bash
# Default (hook file approach)
/aiwg-regenerate-opencode

# Full injection (compatibility mode)
/aiwg-regenerate-opencode --full-inject

# Preview without writing
/aiwg-regenerate-opencode --dry-run

# Migrate from full inject to hook file
/aiwg-regenerate-opencode --migrate
```

## Related Commands

| Command | Regenerates |
|---------|-------------|
| `/aiwg-regenerate` | Auto-detect and delegate |
| `/hook-status` | Check hook state |
| `/hook-regenerate --provider opencode` | Rebuild hook file only |
| `/migrate-hook --provider opencode` | Migrate full inject to hook |

## References

- #439 — AIWG.md hook file architecture
- #444 — Multi-provider @-link support research
- #446 — Regenerate command suite update
