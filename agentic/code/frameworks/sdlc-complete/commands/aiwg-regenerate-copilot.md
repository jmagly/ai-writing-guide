---
name: aiwg-regenerate-copilot
description: Regenerate copilot-instructions.md for GitHub Copilot with preserved team directives
args: "[--no-backup] [--dry-run] [--show-preserved] [--full]"
---

# Regenerate copilot-instructions.md

Regenerate the `.github/copilot-instructions.md` file for GitHub Copilot integration, analyzing current project state while preserving team directives and organizational requirements.

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

1. Check if `.github/copilot-instructions.md` exists
2. If exists, copy to `.github/copilot-instructions.md.backup-{YYYYMMDD-HHMMSS}`
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
- CI/CD configuration (especially `.github/workflows/`)
- Directory structure
- Existing `.github/agents/` configuration

### Step 4: Detect AIWG State

Check installed frameworks by scanning:
- `.github/agents/` for custom agents (YAML format)
- `.github/copilot/` for Copilot configuration
- `.github/workflows/` for CI/CD workflows

Read registry for framework versions.

### Step 5: Generate copilot-instructions.md

**Document Structure:**

```markdown
# GitHub Copilot Instructions

Project instructions for GitHub Copilot AI assistance.

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
.github/       → GitHub configuration
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

This project uses AIWG SDLC framework with GitHub Copilot.

### Custom Agents

Agents are deployed to `.github/agents/` as YAML files.

Invoke via @-mention in Copilot Chat:

```text
@security-architect Review the authentication implementation
@test-engineer Generate unit tests for the user service
```

### Copilot Coding Agent

For automated issue resolution:
1. Navigate to an issue
2. Assign to **Copilot**
3. Copilot analyzes and creates a PR

### Natural Language Mappings

| Request | Maps To |
|---------|---------|
| "run security review" | flow-security-review-cycle |
| "check status" | project-status |
| "start iteration N" | flow-iteration-dual-track |

## Project Artifacts

{If .aiwg/ exists:}

| Category | Location |
|----------|----------|
| Requirements | @.aiwg/requirements/ |
| Architecture | @.aiwg/architecture/ |

## Core References

| Topic | Reference |
|-------|-----------|
| Orchestration | @~/.local/share/ai-writing-guide/agentic/code/addons/aiwg-utils/prompts/core/orchestrator.md |
| Agent Design | @~/.local/share/ai-writing-guide/agentic/code/addons/aiwg-utils/prompts/agents/design-rules.md |

{If SDLC framework installed:}

## SDLC References

| Topic | Reference |
|-------|-----------|
| Natural Language | @~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/docs/simple-language-translations.md |

## Resources

- **AIWG Installation**: `~/.local/share/ai-writing-guide`

---

<!--
  Add team-specific notes below.
  Content in preserved sections survives regeneration.
-->
```

### Step 6: Write Output

**If `--dry-run`:** Display content, do not write.

**Otherwise:**
1. Ensure `.github/` directory exists
2. Write to `.github/copilot-instructions.md`
3. Report summary

```
copilot-instructions.md Regenerated
====================================

Backup: .github/copilot-instructions.md.backup-20251206-153512

Preserved: 2 sections, 15 lines
Regenerated: Project overview, structure, AIWG integration

Output: .github/copilot-instructions.md (187 lines)
```

## Examples

```bash
# Regenerate copilot-instructions.md
/aiwg-regenerate-copilot

# Preview changes
/aiwg-regenerate-copilot --dry-run

# Check preserved content
/aiwg-regenerate-copilot --show-preserved

# Full regeneration
/aiwg-regenerate-copilot --full
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
