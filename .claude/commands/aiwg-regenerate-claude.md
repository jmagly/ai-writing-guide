---
name: aiwg-regenerate-claude
description: Regenerate CLAUDE.md for Claude Code with preserved team directives
args: "[--no-backup] [--dry-run] [--show-preserved] [--full]"
---

# Regenerate CLAUDE.md

Regenerate the CLAUDE.md file for Claude Code integration, analyzing current project state while preserving team directives and organizational requirements.

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

### Step 5: Generate CLAUDE.md

**Document Structure:**

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

**Otherwise:**
1. Write generated content to `CLAUDE.md`
2. Verify write succeeded
3. Report summary

```
CLAUDE.md Regenerated
=====================

Backup: CLAUDE.md.backup-20251206-152233

Preserved Content:
  ✓ Team Conventions (18 lines)
  ✓ Definition of Done (9 lines)
  ✓ Security Requirements (7 lines)
  ✓ 2 inline directives

Regenerated Sections:
  ✓ Repository Purpose
  ✓ Tech Stack (TypeScript, Node.js 18+)
  ✓ Development Commands (12 scripts)
  ✓ Testing (Vitest)
  ✓ Architecture
  ✓ Important Files
  ✓ AIWG Integration
    - sdlc-complete (54 agents, 42 commands)
    - aiwg-utils (1 agent, 4 commands)

Output: CLAUDE.md (428 lines, 18,234 bytes)
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
