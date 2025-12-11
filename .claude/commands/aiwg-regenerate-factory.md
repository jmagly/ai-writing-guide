---
name: aiwg-regenerate-factory
description: Regenerate AGENTS.md for Factory AI with preserved team directives
argument-hint: [--guidance "text"] [--interactive]
args: "[--no-backup] [--dry-run] [--show-preserved] [--full]"
---

# Regenerate AGENTS.md

Regenerate the AGENTS.md file for Factory AI integration, analyzing current project state while preserving team directives and organizational requirements.

## Parameters

| Flag | Description |
|------|-------------|
| `--no-backup` | Skip creating backup file |
| `--dry-run` | Preview changes without writing |
| `--show-preserved` | List all detected preserved content and exit |
| `--full` | Full regeneration, preserve nothing (destructive) |

## Factory AI Conventions

AGENTS.md follows Factory AI formatting conventions:

- Droid definitions with model specifications
- Factory-compatible tool names (Execute, Create, Edit, FetchUrl)
- Project commands section at top
- Framework droids section below

## Tool Name Mapping

| Claude Code | Factory AI |
|-------------|------------|
| Bash | Execute |
| Write | Create |
| Edit | Edit |
| Read | Read |
| Grep | Grep |
| Glob | Glob |
| WebFetch | FetchUrl |
| WebSearch | WebSearch |

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

Same project analysis:
- Languages and package managers
- Development commands
- Test framework
- CI/CD configuration
- Directory structure

### Step 4: Detect AIWG State

Check installed frameworks:
- Scan `.factory/droids/` for deployed droids
- Scan `.factory/commands/` for deployed commands
- Read registry for framework versions

### Step 5: Generate AGENTS.md

**Document Structure (Factory Format):**

```markdown
# AGENTS.md

Project configuration for Factory AI assistance.

## Project Commands

Commands detected from this codebase:

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run build` | Build TypeScript to dist/ |
| `npm test` | Run Vitest test suite |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix lint issues |

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

## AIWG Framework Droids

This project uses AIWG SDLC framework. Droids are deployed to `.factory/droids/`.

### architecture-designer

Design system architecture and make technical decisions for software projects.

**Model**: claude-sonnet-4-5-20250929
**Tools**: Read, Edit, Create, Execute, Grep, Glob

### code-reviewer

Perform comprehensive code reviews focusing on quality, security, performance, and maintainability.

**Model**: claude-sonnet-4-5-20250929
**Tools**: Read, Grep, Glob

### test-engineer

Create comprehensive test suites including unit, integration, and end-to-end tests.

**Model**: claude-sonnet-4-5-20250929
**Tools**: Read, Edit, Create, Execute, Grep, Glob

### security-auditor

Review code for vulnerabilities, implement secure patterns, ensure compliance.

**Model**: claude-sonnet-4-5-20250929
**Tools**: Read, Grep, Glob, Execute

### devops-engineer

Automate CI/CD pipelines, infrastructure as code, and deployment strategies.

**Model**: claude-sonnet-4-5-20250929
**Tools**: Read, Edit, Create, Execute, Grep, Glob

### requirements-analyst

Transform user requests into detailed technical requirements and user stories.

**Model**: claude-sonnet-4-5-20250929
**Tools**: Read, Edit, Create, Grep

### technical-writer

Create and maintain documentation with clarity and consistency.

**Model**: claude-haiku-3-5
**Tools**: Read, Edit, Create, Grep

{... additional droids based on deployment ...}

## AIWG Commands

Commands available via `.factory/commands/`:

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

Factory AI acts as Core Orchestrator for SDLC workflows:

1. Interpret natural language workflow requests
2. Map to appropriate flow commands
3. Coordinate multi-droid workflows
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
- **Droid Catalog**: `~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/agents/`

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
Regenerated: Project commands, structure, AIWG droids

Output: AGENTS.md (287 lines)
```

## Factory-Specific Notes

### Droid Definition Format

```markdown
### droid-name

Description of what the droid does.

**Model**: claude-sonnet-4-5-20250929
**Tools**: Tool1, Tool2, Tool3
```

### Model Mapping

| Claude Shorthand | Factory Model |
|------------------|---------------|
| opus | claude-opus-4-1-20250805 |
| sonnet | claude-sonnet-4-5-20250929 |
| haiku | claude-haiku-3-5 |

### Custom Droids Setting

Ensure Factory settings enable custom droids:

```json
// ~/.factory/settings.json
{
  "enableCustomDroids": true
}
```

## Examples

```bash
# Regenerate AGENTS.md
/aiwg-regenerate-factory

# Preview changes
/aiwg-regenerate-factory --dry-run

# Check preserved content
/aiwg-regenerate-factory --show-preserved

# Full regeneration
/aiwg-regenerate-factory --full
```


## Optional Parameters

### --guidance "text"
Provide strategic context or constraints to guide the command execution:
```
/aiwg-regenerate-factory --guidance "Focus on security implications"
```

### --interactive
Enable interactive mode for step-by-step confirmation and input:
```
/aiwg-regenerate-factory --interactive
```

When interactive mode is enabled, the command will:
1. Confirm understanding of the task before proceeding
2. Ask clarifying questions if requirements are ambiguous
3. Present options for user decision at key branch points
4. Summarize changes before applying them

## Notes

- This command is Factory AI specific
- For Claude Code, use `/aiwg-regenerate-claude`
- For Warp Terminal, use `/aiwg-regenerate-warp`
- For auto-detection, use `/aiwg-regenerate`
