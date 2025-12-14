---
name: aiwg-regenerate-windsurfrules
description: Regenerate .windsurfrules for Windsurf with preserved team directives
args: "[--no-backup] [--dry-run] [--show-preserved] [--full]"
---

# Regenerate .windsurfrules

Regenerate the `.windsurfrules` file for Windsurf (Codeium) integration, analyzing current project state while preserving team directives and organizational requirements.

## Parameters

| Flag | Description |
|------|-------------|
| `--no-backup` | Skip creating backup file |
| `--dry-run` | Preview changes without writing |
| `--show-preserved` | List all detected preserved content and exit |
| `--full` | Full regeneration, preserve nothing (destructive) |

## Execution Steps

### Step 1: Create Backup

Unless `--no-backup` specified:

1. Check if `.windsurfrules` exists
2. If exists, copy to `.windsurfrules.backup-{YYYYMMDD-HHMMSS}`
3. Report backup location

### Step 2: Extract Preserved Content

Same preservation patterns as other platforms:

1. **Explicit Preserve Blocks**: `<!-- PRESERVE -->` ... `<!-- /PRESERVE -->`
2. **Preserved Section Headings**: Team *, Org *, Definition of Done, etc.
3. **Inline Directives**: Lines with directive keywords

### Step 3: Analyze Project

- Languages and package managers
- Development commands
- Test framework
- CI/CD configuration
- Directory structure
- Windsurf-specific configuration in `.windsurf/`

### Step 4: Detect AIWG State

Check installed frameworks by scanning:
- `.windsurf/workflows/` for workflows
- `.windsurf/rules/` for rules
- `.windsurf/skills/` for skills
- `AGENTS.md` for aggregated agents

Read registry for framework versions.

### Step 5: Generate .windsurfrules

**Document Structure:**

```markdown
# .windsurfrules

Project rules for Windsurf AI assistance.

## Project Overview

{Description from README.md or package.json}

## Tech Stack

- **Language**: {detected languages}
- **Framework**: {detected frameworks}
- **Package Manager**: {npm/yarn/pnpm/etc.}

## Development Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run build` | Build project |
| `npm test` | Run tests |

## Project Structure

```
src/           → Source code
test/          → Test files
docs/          → Documentation
```

## Code Conventions

{Project-specific conventions}

---

## Team Directives

<!-- PRESERVED SECTION -->

{ALL PRESERVED CONTENT}

<!-- /PRESERVED SECTION -->

---

## AIWG Framework Integration

This project uses AIWG SDLC framework with Windsurf.

### Installed Frameworks

| Framework | Agents | Workflows |
|-----------|--------|-----------|
| sdlc-complete | 54 | 42 |

### Using Agents

Agents are available via AGENTS.md (aggregated format).

### Natural Language Mappings

| Request | Maps To |
|---------|---------|
| "run security review" | flow-security-review-cycle |
| "check status" | project-status |
| "start iteration N" | flow-iteration-dual-track |

## Resources

- **AIWG Installation**: `~/.local/share/ai-writing-guide`
- **Framework Docs**: `~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/README.md`

---

<!--
  Add team-specific notes below.
  Content in preserved sections survives regeneration.
-->
```

### Step 6: Write Output

**If `--dry-run`:** Display content, do not write.

**Otherwise:**
1. Write to `.windsurfrules`
2. Report summary

```
.windsurfrules Regenerated
==========================

Backup: .windsurfrules.backup-20251206-153512

Preserved: 2 sections, 15 lines
Regenerated: Project overview, structure, AIWG integration

Output: .windsurfrules (187 lines)
```

## Examples

```bash
# Regenerate .windsurfrules
/aiwg-regenerate-windsurfrules

# Preview changes
/aiwg-regenerate-windsurfrules --dry-run

# Check preserved content
/aiwg-regenerate-windsurfrules --show-preserved

# Full regeneration
/aiwg-regenerate-windsurfrules --full
```

## Related Commands

| Command | Regenerates |
|---------|-------------|
| `/aiwg-regenerate-claude` | CLAUDE.md |
| `/aiwg-regenerate-warp` | WARP.md |
| `/aiwg-regenerate-agents` | AGENTS.md |
| `/aiwg-regenerate-cursorrules` | .cursorrules |
| `/aiwg-regenerate-windsurfrules` | .windsurfrules |
| `/aiwg-regenerate-copilot` | copilot-instructions.md |
| `/aiwg-regenerate` | Auto-detect |
