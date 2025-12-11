---
name: aiwg-regenerate-warp
description: Regenerate WARP.md for Warp Terminal with preserved team directives
argument-hint: [--guidance "text"] [--interactive]
args: "[--no-backup] [--dry-run] [--show-preserved] [--full]"
---

# Regenerate WARP.md

Regenerate the WARP.md file for Warp Terminal integration, analyzing current project state while preserving team directives and organizational requirements.

## Parameters

| Flag | Description |
|------|-------------|
| `--no-backup` | Skip creating backup file |
| `--dry-run` | Preview changes without writing |
| `--show-preserved` | List all detected preserved content and exit |
| `--full` | Full regeneration, preserve nothing (destructive) |

## Warp Terminal Conventions

WARP.md follows Warp Terminal formatting conventions:

- `###` headings for agents and commands (not `##`)
- Inline tool lists with agents
- Terminal-friendly command formatting (easy copy-paste)
- Concise descriptions optimized for terminal display

## Execution Steps

### Step 1: Create Backup

Unless `--no-backup` specified:

1. Check if `WARP.md` exists
2. If exists, copy to `WARP.md.backup-{YYYYMMDD-HHMMSS}`
3. Report backup location

### Step 2: Extract Preserved Content

Same preservation patterns as CLAUDE.md:

1. **Explicit Preserve Blocks**: `<!-- PRESERVE -->` ... `<!-- /PRESERVE -->`
2. **Preserved Section Headings**: Team *, Org *, Definition of Done, etc.
3. **Inline Directives**: Lines with directive keywords

### Step 3: Analyze Project

Same project analysis as CLAUDE.md:
- Languages and package managers
- Development commands
- Test framework
- CI/CD configuration
- Directory structure

### Step 4: Detect AIWG State

Check installed frameworks and deployed assets:
- Scan for WARP-specific formatting in existing files
- Count agents and commands
- Identify active frameworks

### Step 5: Generate WARP.md

**Document Structure (Warp Format):**

```markdown
# WARP.md

Project guidance for Warp Terminal AI assistance.

## Project Overview

{Brief project description from README.md}

**Tech Stack**: {languages} | **Package Manager**: {npm/pip/etc} | **Test Framework**: {framework}

## Quick Commands

Copy-paste ready commands for common tasks:

```bash
# Install dependencies
{install command}

# Run development server
{dev command}

# Run tests
{test command}

# Build for production
{build command}

# Lint code
{lint command}
```

## Project Structure

```
{directory tree with descriptions}
```

---

## Team Directives

<!-- PRESERVED SECTION -->

{ALL PRESERVED CONTENT}

<!-- /PRESERVED SECTION -->

---

## AIWG Framework

This project uses AIWG for development lifecycle management.

### Agents

{For each deployed agent:}

### {Agent Name}
{Description}
**Tools**: {tool list}

### Architecture Designer
Design system architecture and make technical decisions.
**Tools**: Read, Write, Bash, Grep, Glob

### Code Reviewer
Review code for quality, security, and maintainability.
**Tools**: Read, Grep, Glob

### Test Engineer
Create and maintain comprehensive test suites.
**Tools**: Read, Write, Bash, Grep

{... continue for key agents ...}

### Commands

{For each deployed command category:}

#### Intake & Planning
- `/intake-wizard` - Generate project intake forms
- `/intake-from-codebase` - Analyze existing codebase
- `/project-status` - Check current project state

#### Phase Workflows
- `/flow-inception-to-elaboration` - Transition phases
- `/flow-gate-check <phase>` - Validate phase gate

#### Continuous Processes
- `/flow-security-review-cycle` - Security validation
- `/flow-test-strategy-execution` - Test execution
- `/flow-risk-management-cycle` - Risk management

{... continue for key commands ...}

### Natural Language

Common phrases understood by the orchestrator:

| You Say | Executes |
|---------|----------|
| "transition to elaboration" | flow-inception-to-elaboration |
| "run security review" | flow-security-review-cycle |
| "check project status" | project-status |
| "start iteration 5" | flow-iteration-dual-track |

---

<!--
  Add team-specific notes below.
  Content in preserved sections survives regeneration.
-->
```

### Step 6: Write Output

**If `--dry-run`:** Display content, do not write.

**Otherwise:**
1. Write to `WARP.md`
2. Report summary

```
WARP.md Regenerated
===================

Backup: WARP.md.backup-20251206-153045

Preserved: 3 sections, 34 lines
Regenerated: Project info, commands, AIWG integration

Output: WARP.md (312 lines)
```

## Warp-Specific Formatting Notes

### Agent Format
```markdown
### Agent Name
Brief description of what the agent does.
**Tools**: Tool1, Tool2, Tool3
```

### Command Format
```markdown
- `/command-name` - Brief description
```

### Quick Commands
Formatted for easy terminal copy-paste:
```bash
# Description of command
actual_command --with-flags
```

## Examples

```bash
# Regenerate WARP.md
/aiwg-regenerate-warp

# Preview changes
/aiwg-regenerate-warp --dry-run

# Check preserved content
/aiwg-regenerate-warp --show-preserved

# Full regeneration
/aiwg-regenerate-warp --full
```


## Optional Parameters

### --guidance "text"
Provide strategic context or constraints to guide the command execution:
```
/aiwg-regenerate-warp --guidance "Focus on security implications"
```

### --interactive
Enable interactive mode for step-by-step confirmation and input:
```
/aiwg-regenerate-warp --interactive
```

When interactive mode is enabled, the command will:
1. Confirm understanding of the task before proceeding
2. Ask clarifying questions if requirements are ambiguous
3. Present options for user decision at key branch points
4. Summarize changes before applying them

## Notes

- This command is Warp Terminal specific
- For Claude Code, use `/aiwg-regenerate-claude`
- For Factory AI, use `/aiwg-regenerate-factory`
- For auto-detection, use `/aiwg-regenerate`
