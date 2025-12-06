# AIWG Utilities

Core meta-utilities for AIWG management. This addon is automatically installed with any AIWG framework.

## Commands

### `/aiwg-regenerate`

Regenerate platform context file (CLAUDE.md, WARP.md, or AGENTS.md) based on current project state while preserving team directives and organizational requirements.

```bash
/aiwg-regenerate                    # Auto-detect platform
/aiwg-regenerate --dry-run          # Preview changes
/aiwg-regenerate --show-preserved   # List preserved content
/aiwg-regenerate --full             # Full regen, no preservation
```

### Platform-Specific Commands

- `/aiwg-regenerate-claude` - Regenerate CLAUDE.md for Claude Code
- `/aiwg-regenerate-warp` - Regenerate WARP.md for Warp Terminal
- `/aiwg-regenerate-factory` - Regenerate AGENTS.md for Factory AI

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
