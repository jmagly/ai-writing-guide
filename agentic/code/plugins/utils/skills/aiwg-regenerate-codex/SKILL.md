---
namespace: aiwg
name: aiwg-regenerate-codex
platforms: [all]
description: Regenerate Codex context file (CODEX.md or ~/.codex/instructions.md) with AIWG framework content
commandHint:
  argumentHint: "[--no-backup] [--dry-run] [--user-level] [--migrate]"
  allowedTools: Read, Write, Edit, Bash, Glob
  model: sonnet
  category: context-regeneration
---

# Regenerate Codex Context

Regenerate the Codex context file (`CODEX.md` or `~/.codex/instructions.md`) for OpenAI Codex integration. Performs an **intelligent merge** — preserving team-written content while updating AIWG context.

## Core Principle

**Team content is preserved. AIWG content is updated. Full injection used (Codex does not support @-link directives).**

## Important: No @-Link Support

Codex context files do not support `@filename` style includes. AIWG content is embedded directly using injection markers:

```markdown
<!-- BEGIN AIWG -->
[AIWG content]
<!-- END AIWG -->
```

This is different from other providers that use the hook file approach.

## Parameters

| Flag | Description |
|------|-------------|
| `--no-backup` | Skip creating backup file |
| `--dry-run` | Preview changes without writing |
| `--user-level` | Update `~/.codex/instructions.md` instead of project-level `CODEX.md` |
| `--migrate` | Extract injection to `AIWG-codex.md` and reference from CODEX.md (future-proofing) |

## Context File Locations

| Scope | Path | Use case |
|-------|------|----------|
| Project-level | `CODEX.md` | Project-specific AIWG context |
| User-level | `~/.codex/instructions.md` | User-wide context across all projects |

Default: project-level `CODEX.md`. Use `--user-level` for user-wide context.

## Execution Steps

### Step 1: Create Backup

Unless `--no-backup` specified, create `CODEX.md.backup-{YYYYMMDD-HHMMSS}`.

### Step 2: Analyze Existing Content

Read `CODEX.md` if it exists and categorize:

- **Team content** (PRESERVE): Project rules, conventions, business logic, above or below AIWG block
- **AIWG content** (UPDATE): Content between `<!-- BEGIN AIWG -->` and `<!-- END AIWG -->`

### Step 3: Generate AIWG Content

Generate AIWG content from installed framework manifests. Same content as other providers' hook files, but embedded inline.

Also write `AIWG-codex.md` as a side file for reference and for potential future migration if Codex adds @-link support.

### Step 4: Inject Content

**If AIWG markers found**: Replace content between markers with freshly generated content.

**If no markers found**: Append AIWG block to end of file (before `<!-- TEAM DIRECTIVES -->` marker if present).

```markdown
[team content preserved above]

<!-- BEGIN AIWG -->
<!-- Managed by aiwg — regenerate with: aiwg-regenerate-codex -->
[AIWG content]
<!-- END AIWG -->

<!-- TEAM DIRECTIVES: Add project-specific guidance below -->
```

### Step 5: Report

```
Codex Context Regenerated
==========================

Backup: CODEX.md.backup-20260322-190000

AIWG content: 312 lines (injected between markers)
Side file:    AIWG-codex.md (312 lines, written for reference)

Team content preserved: 22 lines

Note: Codex does not support @-link directives.
      Content embedded directly with <!-- BEGIN/END AIWG --> markers.
      To update: aiwg-regenerate-codex
```

## Examples

```bash
# Default (project-level CODEX.md)
/aiwg-regenerate-codex

# Update user-level instructions
/aiwg-regenerate-codex --user-level

# Preview without writing
/aiwg-regenerate-codex --dry-run

# Skip backup
/aiwg-regenerate-codex --no-backup
```

## Related Commands

| Command | Regenerates |
|---------|-------------|
| `/aiwg-regenerate` | Auto-detect and delegate |
| `/hook-status` | Check hook state (shows "full inject" for Codex) |
| `/hook-regenerate --provider codex` | Rebuild AIWG-codex.md side file |

## References

- #439 — AIWG.md hook file architecture
- #444 — Multi-provider @-link support research (Codex confirmed no @-link support)
- #446 — Regenerate command suite update
