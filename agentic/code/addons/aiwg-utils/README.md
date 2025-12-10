# AIWG Utilities

Core meta-utilities for AIWG management. This addon is automatically installed with any AIWG framework.

## Commands

### Context Regeneration

#### `/aiwg-regenerate`

Regenerate platform context file (CLAUDE.md, WARP.md, or AGENTS.md) based on current project state while preserving team directives and organizational requirements.

```bash
/aiwg-regenerate                    # Auto-detect platform
/aiwg-regenerate --dry-run          # Preview changes
/aiwg-regenerate --show-preserved   # List preserved content
/aiwg-regenerate --full             # Full regen, no preservation
```

#### Platform-Specific Commands

- `/aiwg-regenerate-claude` - Regenerate CLAUDE.md for Claude Code
- `/aiwg-regenerate-warp` - Regenerate WARP.md for Warp Terminal
- `/aiwg-regenerate-factory` - Regenerate AGENTS.md for Factory AI

### Workspace Maintenance

#### `/workspace-realign`

Reorganize and update `.aiwg/` documentation to reflect current project reality. Uses git commit history to understand changes since documentation was last updated.

```bash
/workspace-realign --dry-run        # Preview what would change
/workspace-realign --archive-stale  # Archive stale docs (default)
/workspace-realign --delete-stale   # Delete stale docs
/workspace-realign --interactive    # Decide each document
/workspace-realign --since abc1234  # Analyze changes since specific commit
```

**What it does:**

- Analyzes git history to find code changes since docs were last aligned
- Identifies stale documents (references deleted code, outdated planning, etc.)
- Identifies missing documentation for new features
- Archives, updates, or deletes documents as appropriate
- Records alignment marker for future reference

#### `/workspace-prune-working`

Clean up the `.aiwg/working/` directory by intelligently handling temporary files.

```bash
/workspace-prune-working --dry-run      # Preview changes
/workspace-prune-working --interactive  # Decide each file
/workspace-prune-working --promote-all  # Promote all promotable files
/workspace-prune-working --archive-all  # Archive all archivable files
/workspace-prune-working --delete-all   # Delete all deletable files
```

**What it does:**

- **Promotes** finalized documents to permanent `.aiwg/` locations
- **Archives** useful historical content to `.aiwg/archive/`
- **Deletes** truly temporary files (scratch notes, intermediate drafts)
- Classifies files based on naming, content, and age

#### `/workspace-reset`

Completely wipe the `.aiwg/` directory to start fresh. Use when requirements changed significantly, framework upgraded, or artifacts became corrupted.

```bash
/workspace-reset --dry-run          # Preview what would be deleted
/workspace-reset --backup           # Create backup before wiping
/workspace-reset --keep-intake      # Preserve intake forms
/workspace-reset --keep-team        # Preserve team profile
/workspace-reset --reinitialize     # Create fresh structure after reset
/workspace-reset --force            # Skip confirmation
```

**Safety features:**

- Requires typing 'RESET' to confirm (unless `--force`)
- Optional backup creation
- Can preserve critical directories (intake, team)
- Shows what will be lost, including untracked files

## CLI Commands (Outside Claude Session)

These commands are also available via the `aiwg` CLI:

```bash
# Wipe .aiwg/working/ directory
aiwg -wipe-working                 # Interactive confirmation
aiwg -wipe-working --force         # Skip confirmation
aiwg -wipe-working --backup        # Backup before wipe

# Reset entire .aiwg/ workspace
aiwg -reset-workspace              # Interactive confirmation
aiwg -reset-workspace --backup     # Create backup first
aiwg -reset-workspace --keep-intake --keep-team  # Preserve key dirs
aiwg -reset-workspace --reinitialize  # Create fresh structure
aiwg -reset-workspace --force --reinit  # Quick reset
```

## Preservation Strategy

The regenerate commands preserve content that cannot be re-derived from the codebase:

### Automatically Preserved

- Sections with headings matching: `Team *`, `Org *`, `Definition of Done`, `Code Quality *`, `Security *` (policy), `Convention*`, `Rules`, `Guidelines`, `NFR*`
- Content within `<!-- PRESERVE -->` ... `<!-- /PRESERVE -->` markers
- Lines with directive keywords: "Never", "Always", "Must", "Do not", "Required"

### Regenerated from Project

- Tech Stack (from package.json, etc.)
- Development Commands (from npm scripts, Makefile)
- Testing (from test framework detection)
- Architecture (from directory structure)
- AIWG Integration (from installed frameworks)

## Agents

### `context-regenerator`

Specialized agent for complex context file regeneration with intelligent content analysis and preservation.

## Installation

This addon is automatically installed when using any AIWG framework:

```bash
aiwg use sdlc              # Installs sdlc + aiwg-utils
aiwg use marketing         # Installs marketing + aiwg-utils
```

To skip auto-installation:

```bash
aiwg use sdlc --no-utils
```

## Recommended Maintenance Workflow

1. **Weekly**: Run `/workspace-prune-working` to clean up temporary files
2. **After major changes**: Run `/workspace-realign` to sync docs with code
3. **Project pivot**: Run `/workspace-reset --backup --reinitialize`

```bash
# Example maintenance session
/workspace-prune-working --interactive  # Clean working dir first
/workspace-realign --archive-stale      # Then realign docs
/aiwg-regenerate                        # Finally, update context file
```
