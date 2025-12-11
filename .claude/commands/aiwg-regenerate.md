---
name: aiwg-regenerate
description: Regenerate platform context file with preserved team directives
argument-hint: [--guidance "text"] [--interactive]
args: "[--no-backup] [--dry-run] [--show-preserved] [--full]"
---

# Regenerate Platform Context File

Analyze current project state and regenerate the platform context file (CLAUDE.md, WARP.md, or AGENTS.md) while preserving team directives and organizational requirements.

## Parameters

| Flag | Description |
|------|-------------|
| `--no-backup` | Skip creating backup file |
| `--dry-run` | Preview changes without writing |
| `--show-preserved` | List all detected preserved content and exit |
| `--full` | Full regeneration, preserve nothing (destructive) |

## Platform Detection

Detect current platform automatically:

1. Check environment/runtime context
2. Check existing files:
   - `CLAUDE.md` exists → Claude Code
   - `WARP.md` exists → Warp Terminal
   - `.factory/` exists → Factory AI
3. If ambiguous, ask user

For explicit platform targeting, use:
- `/aiwg-regenerate-claude`
- `/aiwg-regenerate-warp`
- `/aiwg-regenerate-factory`

## Execution Steps

### Step 1: Detect Platform

Determine which context file to regenerate based on platform detection.

Report:
```
Platform detected: Claude Code
Target file: CLAUDE.md
```

### Step 2: Create Backup

Unless `--no-backup` flag is set:

1. Generate timestamp: `YYYYMMDD-HHMMSS`
2. Copy current file to `{filename}.backup-{timestamp}`
3. Report backup location

```
Backup created: CLAUDE.md.backup-20251206-152233
```

### Step 3: Extract Preserved Content

Parse existing file and extract content matching preservation patterns.

**Preservation Patterns:**

1. **Explicit Markers**
   ```markdown
   <!-- PRESERVE -->
   Content here is always preserved
   <!-- /PRESERVE -->

   <!-- PRESERVE: Single line directive -->
   ```

2. **Section Headings** (case-insensitive)
   - `## Team *` - Team rules/conventions
   - `## Org *` / `## Organization *` - Org policies
   - `## Definition of Done` - DoD criteria
   - `## Code Quality *` - Quality standards
   - `## Security Requirements` / `## Security Policy` - Security policies
   - `## Convention*` - Conventions
   - `## Rules` / `## Guidelines` - Rules
   - `## Important *` / `## Critical *` - Important notes
   - `## NFR*` / `## Non-Functional *` - NFRs
   - `## *Standards` - Standards
   - `## Project-Specific Notes` - User notes

3. **Directive Lines** (within non-preserved sections)
   - Lines starting with: "Do not", "Don't", "Never", "Always", "Must", "Required:", "Policy:", "Rule:"
   - Lines containing: `<!-- PRESERVE:`

**If `--show-preserved` flag:**
Display all preserved content and exit without regenerating.

```
Preserved Content Analysis
==========================

## Sections (3 found):

### Team Conventions (lines 45-62, 18 lines)
  - Do not add claude code signature to commit messages
  - All Python commands must run within venv
  - Commits made without attribution
  ... (15 more lines)

### Definition of Done (lines 78-86, 9 lines)
  - All tests passing
  - Code reviewed
  - Documentation updated
  ... (6 more lines)

### Security Requirements (lines 92-98, 7 lines)
  - All API keys via environment variables
  - No secrets in code
  ... (5 more lines)

## Inline Directives (2 found):

  Line 34: <!-- PRESERVE: Use internal npm registry for @company/* -->
  Line 112: Never deploy on Fridays without approval

Total: 36 lines will be preserved
```

### Step 4: Analyze Project

Scan project to extract regenerable content:

**Package Detection:**
```bash
# Check for package files
ls package.json pyproject.toml requirements.txt go.mod Cargo.toml pom.xml build.gradle composer.json Gemfile 2>/dev/null
```

**Extract from package.json:**
- `name`, `description`, `version`
- `scripts` → Development commands
- `dependencies`, `devDependencies` → Tech stack

**Extract from other sources:**
- `Makefile` → Make targets
- `README.md` → Project description (first paragraph)
- Directory structure → Architecture overview

**Detect Test Framework:**
- `jest.config.*` → Jest
- `vitest.config.*` → Vitest
- `pytest.ini`, `conftest.py` → Pytest
- `*_test.go` files → Go testing
- `.rspec` → RSpec

**Detect CI/CD:**
- `.github/workflows/*.yml` → GitHub Actions
- `.gitlab-ci.yml` → GitLab CI
- `Jenkinsfile` → Jenkins
- `.circleci/` → CircleCI

Report:
```
Project Analysis
================
Languages: TypeScript, Python
Package Manager: npm
Build Commands: 12 scripts detected
Test Framework: Vitest
CI/CD: GitHub Actions (3 workflows)
```

### Step 5: Detect AIWG State

Check installed AIWG frameworks:

1. **Check Registry**
   ```bash
   # Project registry
   cat .aiwg/frameworks/registry.json 2>/dev/null

   # Global registry
   cat ~/.local/share/ai-writing-guide/registry.json 2>/dev/null
   ```

2. **Scan Deployed Assets**
   ```bash
   # Count agents
   ls .claude/agents/*.md 2>/dev/null | wc -l

   # Count commands
   ls .claude/commands/*.md 2>/dev/null | wc -l
   ```

3. **Identify Frameworks**
   - Check for sdlc-complete markers
   - Check for media-marketing-kit markers
   - Check for addon presence

Report:
```
AIWG State
==========
Frameworks:
  - sdlc-complete v1.0.0 (54 agents, 42 commands)
  - aiwg-utils v1.0.0 (1 agent, 4 commands)
```

### Step 6: Generate New Document

**If `--dry-run` flag:**
Display generated content without writing.

**Structure:**

```markdown
# CLAUDE.md

This file provides guidance to Claude Code when working with this codebase.

## Repository Purpose

{Generated from README.md first paragraph or package.json description}

## Tech Stack

{Generated list of detected languages, frameworks, runtimes}

## Development Commands

{Generated from package.json scripts, Makefile targets, etc.}

## Testing

{Generated from detected test framework}

## Architecture

{Generated from directory structure analysis}

## Important Files

{Key files identified during analysis}

---

## Team Directives & Standards

<!-- PRESERVED SECTION - Content maintained across regeneration -->

{ALL PRESERVED CONTENT INSERTED HERE}

<!-- /PRESERVED SECTION -->

---

## AIWG Framework Integration

{Generated from current AIWG installation state}

### Installed Frameworks

{List of installed frameworks with versions}

### Available Agents

{Summary of deployed agents}

### Available Commands

{Summary of deployed commands}

### Orchestration

{Core orchestrator role description}

---

<!--
  USER NOTES
  Add team directives, conventions, or project-specific notes below.
  Content in this file's preserved sections is maintained during regeneration.
  Use <!-- PRESERVE --> markers for content that must be kept.
-->
```

### Step 7: Write File

1. Write generated content to target file
2. Report summary

```
Regeneration Complete
=====================

Backup: CLAUDE.md.backup-20251206-152233

Preserved (36 lines):
  - Team Conventions (18 lines)
  - Definition of Done (9 lines)
  - Security Requirements (7 lines)
  - Inline directives (2)

Regenerated:
  - Repository Purpose
  - Tech Stack (TypeScript, Python)
  - Development Commands (12 scripts)
  - Testing (Vitest)
  - Architecture
  - AIWG Integration (sdlc-complete, aiwg-utils)

Output: CLAUDE.md (428 lines)
```

## Examples

```bash
# Standard regeneration with backup and preservation
/aiwg-regenerate

# Preview what would be generated
/aiwg-regenerate --dry-run

# See what content would be preserved
/aiwg-regenerate --show-preserved

# Full regeneration (loses all user content)
/aiwg-regenerate --full

# Regenerate without backup (use with caution)
/aiwg-regenerate --no-backup
```

## Warning for --full Flag

If `--full` flag is used, display warning:

```
WARNING: Full regeneration will discard ALL existing content.

The following will be LOST:
  - Team Conventions (18 lines)
  - Definition of Done (9 lines)
  - Security Requirements (7 lines)
  - 2 inline directives

This cannot be undone (backup will still be created).

Continue with full regeneration? [y/N]
```


## Optional Parameters

### --guidance "text"
Provide strategic context or constraints to guide the command execution:
```
/aiwg-regenerate --guidance "Focus on security implications"
```

### --interactive
Enable interactive mode for step-by-step confirmation and input:
```
/aiwg-regenerate --interactive
```

When interactive mode is enabled, the command will:
1. Confirm understanding of the task before proceeding
2. Ask clarifying questions if requirements are ambiguous
3. Present options for user decision at key branch points
4. Summarize changes before applying them

## Error Handling

| Condition | Action |
|-----------|--------|
| No existing file | Generate fresh document with empty preserved section |
| File read error | Report error, abort |
| Backup write fails | Abort with error (never overwrite without backup) |
| AIWG not detected | Generate project-only content, warn user |
| Parse error | Warn, offer `--full` as recovery option |
