---
name: aiwg-regenerate-agents
description: Regenerate AGENTS.md with preserved team directives
args: "[--no-backup] [--dry-run] [--show-preserved] [--full]"
---

# Regenerate AGENTS.md

Regenerate the AGENTS.md file, analyzing current project state while preserving team directives and organizational requirements.

**Used by:** Factory AI, Cursor, OpenCode, Codex, and other platforms that use AGENTS.md.

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

1. Check if `AGENTS.md` exists
2. If exists, copy to `AGENTS.md.backup-{YYYYMMDD-HHMMSS}`
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

### Step 4: Detect AIWG State

Check installed frameworks by scanning for deployed agents/droids:
- `.factory/droids/` (Factory AI)
- `.opencode/agent/` (OpenCode)
- `.cursor/rules/` (Cursor)
- `.codex/agents/` (Codex)

Read registry for framework versions.

### Step 5: Generate AGENTS.md

**Document Structure:**

```markdown
# AGENTS.md

Project configuration for AI assistance.

## Project Commands

Commands detected from this codebase:

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run build` | Build TypeScript to dist/ |
| `npm test` | Run Vitest test suite |
| `npm run lint` | Run ESLint |

## Project Structure

```
src/           → TypeScript source code
test/          → Test files (Vitest)
tools/         → CLI tools and scripts
docs/          → Documentation
.github/       → GitHub Actions workflows
```

## Tech Stack

- **Language**: TypeScript
- **Runtime**: Node.js 18+
- **Test Framework**: Vitest
- **Linting**: ESLint
- **CI/CD**: GitHub Actions

---

## Team Directives

<!-- PRESERVED SECTION -->

{ALL PRESERVED CONTENT}

<!-- /PRESERVED SECTION -->

---

## AIWG Framework Agents

This project uses AIWG SDLC framework.

### architecture-designer

Design system architecture and make technical decisions for software projects.

**Model**: claude-sonnet-4-5-20250929
**Tools**: Read, Edit, Write, Bash, Grep, Glob

### code-reviewer

Perform comprehensive code reviews focusing on quality, security, performance, and maintainability.

**Model**: claude-sonnet-4-5-20250929
**Tools**: Read, Grep, Glob

### test-engineer

Create comprehensive test suites including unit, integration, and end-to-end tests.

**Model**: claude-sonnet-4-5-20250929
**Tools**: Read, Edit, Write, Bash, Grep, Glob

{... additional agents based on deployment ...}

## AIWG Commands

### Intake & Planning
- `intake-wizard` - Generate project intake forms interactively
- `intake-from-codebase` - Analyze codebase to generate intake
- `project-status` - Check current project phase and status

### Phase Transitions
- `flow-inception-to-elaboration` - Transition to Elaboration phase
- `flow-elaboration-to-construction` - Transition to Construction phase
- `flow-gate-check` - Validate phase gate criteria

### Continuous Workflows
- `flow-security-review-cycle` - Security validation workflow
- `flow-test-strategy-execution` - Test execution workflow
- `flow-risk-management-cycle` - Risk management workflow

## Orchestration

The AI platform acts as Core Orchestrator for SDLC workflows:

1. Interpret natural language workflow requests
2. Map to appropriate flow commands
3. Coordinate multi-agent workflows
4. Report progress with clear indicators

### Natural Language Mappings

| Request | Maps To |
|---------|---------|
| "transition to elaboration" | flow-inception-to-elaboration |
| "run security review" | flow-security-review-cycle |
| "check status" | project-status |
| "start iteration N" | flow-iteration-dual-track |

## Resources

- **AIWG Installation**: `~/.local/share/ai-writing-guide`
- **Framework Docs**: `~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/README.md`
- **Agent Catalog**: `~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/agents/`

---

<!--
  Add team-specific notes below.
  Content in preserved sections survives regeneration.
-->
```

### Step 6: Write Output

**If `--dry-run`:** Display content, do not write.

**Otherwise:**
1. Write to `AGENTS.md`
2. Report summary

```
AGENTS.md Regenerated
=====================

Backup: AGENTS.md.backup-20251206-153512

Preserved: 2 sections, 21 lines
Regenerated: Project commands, structure, AIWG agents

Output: AGENTS.md (287 lines)
```

## Examples

```bash
# Regenerate AGENTS.md
/aiwg-regenerate-agents

# Preview changes
/aiwg-regenerate-agents --dry-run

# Check preserved content
/aiwg-regenerate-agents --show-preserved

# Full regeneration
/aiwg-regenerate-agents --full
```

## Related Commands

| Command | Regenerates |
|---------|-------------|
| `/aiwg-regenerate-claude` | CLAUDE.md |
| `/aiwg-regenerate-warp` | WARP.md |
| `/aiwg-regenerate-agents` | AGENTS.md |
| `/aiwg-regenerate` | Auto-detect |
