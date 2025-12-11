---
name: aiwg-regenerate-claude
description: Regenerate CLAUDE.md for Claude Code with preserved team directives (modular structure)
args: "[--no-backup] [--dry-run] [--show-preserved] [--full] [--legacy]"
---

# Regenerate CLAUDE.md (Modular Structure)

Regenerate the CLAUDE.md file for Claude Code integration using the new **modular structure** with path-scoped rules. This keeps the core CLAUDE.md under 150 lines while loading additional context conditionally based on file paths.

## New Modular Architecture

**Core CLAUDE.md** (~100-150 lines): Essential info only
**.claude/rules/**: Path-scoped rules loaded conditionally
**docs/reference/**: Detailed docs loaded on-demand via @-mentions

The old monolithic 1000+ line CLAUDE.md is deprecated. Use `--legacy` flag if you need the old format.

## Parameters

| Flag | Description |
|------|-------------|
| `--no-backup` | Skip creating backup file |
| `--dry-run` | Preview changes without writing |
| `--show-preserved` | List all detected preserved content and exit |
| `--full` | Full regeneration, preserve nothing (destructive) |
| `--legacy` | Generate old monolithic format (deprecated) |

## Execution Steps

### Step 1: Create Backup

Unless `--no-backup` specified:

1. Check if `CLAUDE.md` exists
2. If exists, copy to `CLAUDE.md.backup-{YYYYMMDD-HHMMSS}`
3. Report: `Backup created: CLAUDE.md.backup-20251206-152233`

If no existing file, skip backup and note: `No existing CLAUDE.md found, generating fresh.`

### Step 2: Extract Preserved Content

If existing CLAUDE.md present (and not `--full`):

**Read the file and identify preserved sections:**

1. **Explicit Preserve Blocks**
   ```markdown
   <!-- PRESERVE -->
   This content is preserved
   <!-- /PRESERVE -->
   ```

2. **Preserved Section Headings**
   Match these patterns (case-insensitive):
   - `## Team *`
   - `## Org *` / `## Organization *`
   - `## Definition of Done`
   - `## Code Quality *`
   - `## Security Requirements` / `## Security Policy`
   - `## Convention*`
   - `## Rules` / `## Guidelines`
   - `## Important *` / `## Critical *`
   - `## NFR*` / `## Non-Functional *`
   - `## *Standards`
   - `## Project-Specific Notes`

3. **Inline Directives**
   Lines containing directive language outside preserved sections:
   - `<!-- PRESERVE: ... -->`
   - Lines starting with: Do not, Don't, Never, Always, Must, Required:, Policy:, Rule:

**If `--show-preserved`:** Display findings and exit.

### Step 3: Analyze Project

**Detect Languages & Package Managers:**

Use Glob to find package files:
```
package.json → Node.js/npm
pyproject.toml / requirements.txt → Python
go.mod → Go
Cargo.toml → Rust
pom.xml / build.gradle → Java
composer.json → PHP
Gemfile → Ruby
```

**Extract Development Commands:**

From `package.json`:
```json
{
  "scripts": {
    "build": "tsc",
    "test": "vitest",
    "lint": "eslint ."
  }
}
```

From `Makefile`:
```makefile
build:
    go build ./...

test:
    go test ./...
```

**Detect Test Framework:**

| File Pattern | Framework |
|--------------|-----------|
| `jest.config.*` | Jest |
| `vitest.config.*` | Vitest |
| `pytest.ini`, `conftest.py` | Pytest |
| `*_test.go` | Go testing |
| `.rspec` | RSpec |
| `phpunit.xml` | PHPUnit |

**Detect CI/CD:**

| Path | Platform |
|------|----------|
| `.github/workflows/*.yml` | GitHub Actions |
| `.gitlab-ci.yml` | GitLab CI |
| `Jenkinsfile` | Jenkins |
| `.circleci/config.yml` | CircleCI |
| `azure-pipelines.yml` | Azure DevOps |

**Extract Project Description:**

Read first meaningful paragraph from `README.md` or `description` from `package.json`.

**Analyze Directory Structure:**

```
src/ or lib/ → Source code
test/ or tests/ or __tests__/ → Tests
docs/ → Documentation
scripts/ or tools/ → Tooling
.github/ → GitHub configuration
```

### Step 4: Detect AIWG State

**Check for installed frameworks:**

1. Read `.aiwg/frameworks/registry.json` if exists
2. Scan `.claude/agents/` for deployed agents
3. Scan `.claude/commands/` for deployed commands
4. Read `~/.local/share/ai-writing-guide/registry.json` for global state

**Identify active frameworks:**
- Count agent files matching sdlc-complete patterns
- Count command files matching sdlc-complete patterns
- Detect aiwg-utils presence
- Detect media-marketing-kit presence

**Check Claude-specific config:**

Read `.claude/settings.local.json` if exists for:
- Allowed read paths
- Allowed write paths
- Allowed bash commands

### Step 5: Generate Modular Structure

**Unless `--legacy` flag is set**, generate the new modular structure:

#### 5a: Generate Core CLAUDE.md (~100-150 lines)

```markdown
# {Project Name}

{First paragraph from README.md or package.json description}

## Quick Start

```bash
# {key development commands}
{test command}
{build command}
{lint command}
```

## Repository Structure

```
{key directories with descriptions}
```

## Context Loading Strategy

**Automatic (via path-scoped rules)**:

| Working in... | Rules loaded |
|---------------|--------------|
| `.aiwg/**` | SDLC orchestration |
| `**/*.md` | Voice framework |
| `src/**`, `test/**` | Development conventions |
| `.claude/agents/**` | Agent deployment |

**On-demand (via @-mentions)**:

Use `@path/to/file.md` to load specific documentation when needed.

## Tech Stack

- **Languages**: {detected languages}
- **Runtime**: {Node.js version, Python version, etc.}
- **Package Manager**: {npm, yarn, pip, etc.}
- **Framework**: {React, FastAPI, etc. if detected}

## Key References

| Topic | Location |
|-------|----------|
| Full reference | `@docs/reference/` |
| AIWG Framework | `@~/.local/share/ai-writing-guide/` |

---

<!-- TEAM DIRECTIVES: Add project-specific guidance below this line -->

{ALL PRESERVED CONTENT FROM STEP 2}
```

#### 5b: Generate .claude/rules/ Files

Create path-scoped rules based on detected frameworks:

**If SDLC framework detected**, generate `.claude/rules/sdlc-orchestration.md`:

```yaml
---
paths:
  - ".aiwg/**"
  - ".claude/commands/flow-*.md"
---

# SDLC Orchestration Rules

{Orchestrator role, natural language translations, available commands}
{From template: ~/.local/share/ai-writing-guide/.claude/rules/sdlc-orchestration.md}
```

**If writing/content detected**, generate `.claude/rules/voice-framework.md`:

```yaml
---
paths:
  - "**/*.md"
  - "docs/**"
---

# Voice Framework Rules

{Voice profiles, writing principles}
{From template: ~/.local/share/ai-writing-guide/.claude/rules/voice-framework.md}
```

**Always generate** `.claude/rules/development.md`:

```yaml
---
paths:
  - "src/**"
  - "test/**"
---

# Development Rules

{Project-specific conventions from analysis}
```

#### 5c: Generate docs/reference/ (If AIWG Project)

For AIWG-integrated projects, also generate:

- `docs/reference/ORCHESTRATOR_GUIDE.md` - Full orchestration reference
- `docs/reference/AGENTS_CATALOG.md` - Available agents listing
- `docs/reference/COMMANDS_REFERENCE.md` - Command reference

---

### Step 5-Legacy: Generate Monolithic CLAUDE.md (--legacy flag)

**Only if `--legacy` specified**, generate the old format:

```markdown
# CLAUDE.md

This file provides guidance to Claude Code when working with this codebase.

## Repository Purpose

{First paragraph from README.md or package.json description}

## Tech Stack

- **Languages**: {detected languages}
- **Runtime**: {Node.js version, Python version, etc.}
- **Package Manager**: {npm, yarn, pip, etc.}
- **Framework**: {React, FastAPI, etc. if detected}
- **Database**: {if detected from dependencies}

## Development Commands

```bash
# {grouped by purpose}
{extracted commands with descriptions}
```

## Testing

- **Framework**: {detected framework}
- **Run tests**: `{test command}`
- **Coverage**: `{coverage command if found}`
- **Location**: `{test directory}`

## Architecture

{Description based on directory structure}

### Directory Structure

```
{key directories with descriptions}
```

## Important Files

- `{file}` - {purpose}
{repeat for key files}

## Configuration

{List of config files and their purpose}

---

## Team Directives & Standards

<!-- PRESERVED SECTION - Content maintained across regeneration -->

{ALL PRESERVED CONTENT FROM STEP 2}

<!-- /PRESERVED SECTION -->

---

## AIWG Framework Integration

This project uses the AI Writing Guide SDLC framework for development lifecycle management.

### Installation

AIWG is installed at: `~/.local/share/ai-writing-guide`

### Installed Frameworks

| Framework | Version | Agents | Commands |
|-----------|---------|--------|----------|
{table of installed frameworks}

### Claude Code Configuration

{Summary of .claude/settings.local.json if exists}

### Available Agents

{List of key agents with brief descriptions}

### Available Commands

{List of key commands organized by category}

### Orchestration Role

You are the Core Orchestrator for SDLC workflows. When users request workflows:

1. Interpret natural language requests
2. Map to appropriate flow commands
3. Coordinate multi-agent workflows
4. Report progress with clear indicators

See `~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/docs/simple-language-translations.md` for natural language mappings.

---

<!--
  USER NOTES
  Add team-specific directives, conventions, or notes below.
  Use <!-- PRESERVE --> markers for content that must survive regeneration.
-->
```

### Step 6: Write Output

**If `--dry-run`:**
Display the generated content, do not write.

**Otherwise (modular structure):**

1. Write core `CLAUDE.md` (~100-150 lines)
2. Create `.claude/rules/` directory if needed
3. Write path-scoped rule files
4. Create `docs/reference/` if needed
5. Write reference documents
6. Verify all writes succeeded
7. Report summary

```
CLAUDE.md Regenerated (Modular Structure)
=========================================

Backup: CLAUDE.md.backup-20251206-152233

Preserved Content:
  [OK] Team Conventions (18 lines)
  [OK] Definition of Done (9 lines)
  [OK] 2 inline directives

Generated Files:
  [OK] CLAUDE.md (134 lines) - Core context
  [OK] .claude/rules/sdlc-orchestration.md (180 lines)
  [OK] .claude/rules/voice-framework.md (75 lines)
  [OK] .claude/rules/development.md (85 lines)
  [OK] docs/reference/ORCHESTRATOR_GUIDE.md (320 lines)

Context Loading:
  - Base load: 134 lines (was 1,018 lines) - 87% reduction
  - Working in .aiwg/: +180 lines (SDLC rules)
  - Working in **/*.md: +75 lines (voice rules)
  - Working in src/: +85 lines (dev rules)

AIWG Integration:
  - sdlc-complete (54 agents, 42 commands)
  - Centralized registry: agentic/code/config/registry.json
```

**Otherwise (legacy structure with --legacy):**

1. Write monolithic `CLAUDE.md`
2. Report summary

```
CLAUDE.md Regenerated (Legacy Format)
=====================================

Backup: CLAUDE.md.backup-20251206-152233

Preserved Content:
  [OK] Team Conventions (18 lines)
  [OK] Definition of Done (9 lines)
  [OK] 2 inline directives

Output: CLAUDE.md (428 lines, 18,234 bytes)

WARNING: Legacy format loads all context on every session.
Consider migrating to modular structure for better performance.
```

## Examples

```bash
# Regenerate CLAUDE.md with defaults
/aiwg-regenerate-claude

# Preview without writing
/aiwg-regenerate-claude --dry-run

# Check what would be preserved
/aiwg-regenerate-claude --show-preserved

# Full regeneration (discards user content)
/aiwg-regenerate-claude --full

# Skip backup (use carefully)
/aiwg-regenerate-claude --no-backup
```

## Error Handling

| Condition | Action |
|-----------|--------|
| No CLAUDE.md exists | Generate fresh document |
| Backup fails | Abort, report error |
| Read error | Report error, suggest --full |
| No AIWG detected | Generate project-only content, warn |
| No package files | Generate minimal structure, warn |

## Notes

- This command is Claude Code specific
- For Warp Terminal, use `/aiwg-regenerate-warp`
- For Factory AI, use `/aiwg-regenerate-factory`
- For auto-detection, use `/aiwg-regenerate`
