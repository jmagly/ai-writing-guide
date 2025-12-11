# Cursor Integration Plan

## Overview

This document outlines the integration strategy for AIWG with Cursor IDE's CLI (`cursor-agent`).

**Status**: ✅ Complete
**Priority**: P1 - High
**Estimated Effort**: Medium (simpler than Codex - Cursor already reads CLAUDE.md)
**Completed**: 2025-12-11

## Cursor Architecture Summary

### Key Differences from Other Providers

| Feature | Claude Code | Codex | Cursor |
|---------|-------------|-------|--------|
| Context File | `CLAUDE.md` | `AGENTS.md` | Both (`CLAUDE.md` AND `AGENTS.md`) |
| Commands Location | `.claude/commands/` | `~/.codex/prompts/` | `.cursor/rules/` (as MDC) |
| Skills/Tools | `.claude/skills/` | `~/.codex/skills/` | N/A (use MCP tools) |
| MCP Config | `~/.claude/mcp.json` | `~/.codex/config.toml` | `.cursor/mcp.json` |
| CLI Binary | `claude` | `codex` | `cursor-agent` |

### Cursor-Specific Features

1. **Rules System** (`.cursor/rules/*.mdc`)
   - MDC format with YAML frontmatter
   - Supports `globs` for auto-attachment based on file patterns
   - Supports `description` for rule discovery
   - Can be project-specific or global

2. **Context Files**
   - Cursor reads `AGENTS.md` and `CLAUDE.md` at project root automatically
   - No generation needed - AIWG already creates these

3. **CLI Permissions** (`.cursor/cli.json`)
   - Allow/deny patterns for Shell, Read, Write operations
   - Critical for CI/CD and headless mode

4. **Worktrees** (`.cursor/worktrees.json`)
   - Setup scripts for parallel agent execution
   - Supports OS-specific configurations

## Integration Components

### 1. Rules Deployment (`deploy-rules-cursor.mjs`)

Convert AIWG commands to Cursor rules format.

**Source**: `.claude/commands/*.md`
**Target**: `.cursor/rules/*.mdc`

**MDC Format**:
```
---
description: Brief description for rule discovery
globs: ["*.ts", "*.tsx"]  # Optional: auto-attach patterns
---

Rule content here...
```

**Key Considerations**:
- Commands with file-type context should use `globs` for auto-attachment
- General commands become rules without globs (manually invoked)
- Flow commands may be too large for rules - consider summaries

### 2. MCP Configuration (`mcp install cursor`)

Generate MCP server configuration for Cursor.

**Target**: `.cursor/mcp.json` or `~/.cursor/mcp.json`

**Format**:
```json
{
  "mcpServers": {
    "aiwg": {
      "command": "aiwg",
      "args": ["mcp", "serve"],
      "env": {}
    }
  }
}
```

**Tools to expose**:
- `workflow-run` - Execute SDLC workflows
- `artifact-read` - Read SDLC artifacts
- `artifact-write` - Write SDLC artifacts
- `template-render` - Render templates
- `agent-list` - List available agents

### 3. CLI Permissions Template (`cli.json`)

Provide recommended permissions for AIWG workflows.

**Target**: `.cursor/cli.json`

**Template**:
```json
{
  "permissions": {
    "allow": [
      "Shell(aiwg)",
      "Shell(git)",
      "Shell(npm)",
      "Shell(node)",
      "Read(**)",
      "Write(.aiwg/**)",
      "Write(src/**)",
      "Write(test/**)"
    ],
    "deny": [
      "Write(.env*)",
      "Shell(rm -rf)"
    ]
  }
}
```

### 4. Worktree Setup (`worktrees.json`)

Provide setup script for parallel agents.

**Target**: `.cursor/worktrees.json`

**Template**:
```json
{
  "setup-worktree": [
    "npm ci",
    "cp $ROOT_WORKTREE_PATH/.env .env"
  ],
  "setup-worktree-unix": "scripts/setup-worktree.sh",
  "setup-worktree-windows": "scripts/setup-worktree.ps1"
}
```

### 5. GitHub Actions Templates

Provide CI/CD workflow templates using `cursor-agent`.

**Target**: `templates/cursor/ci-cd/`

**Workflows**:
- `aiwg-cursor-review.yml` - Code review with AIWG standards
- `aiwg-cursor-security.yml` - Security review workflow
- `aiwg-cursor-tests.yml` - Test generation workflow

## Implementation Tasks

### Phase 1: Core Integration

- [x] Create `tools/rules/deploy-rules-cursor.mjs`
  - Parse `.claude/commands/*.md` files
  - Convert to MDC format with frontmatter
  - Handle glob patterns based on command context
  - Write to `.cursor/rules/`

- [x] Update `src/mcp/cli.mjs`
  - Add `cursor` provider support
  - Generate `.cursor/mcp.json` format
  - Handle project vs global installation

- [x] Create `tools/agents/deploy-agents.mjs` Cursor support
  - Add `--provider cursor` option
  - Create AGENTS.md for Cursor projects
  - Deploy rules instead of agents

### Phase 2: Templates and Documentation

- [x] Create Cursor CI/CD templates
  - `agentic/code/frameworks/sdlc-complete/templates/cursor/ci-cd/`
  - Code review, security, test generation workflows

- [x] Create CLI permissions template
  - `agentic/code/frameworks/sdlc-complete/templates/cursor/cli.json.aiwg-template`

- [x] Create worktree setup template
  - `agentic/code/frameworks/sdlc-complete/templates/cursor/worktrees.json.aiwg-template`

- [x] Create quickstart guide
  - `docs/integrations/cursor-quickstart.md`

### Phase 3: Testing

- [x] Create integration tests
  - `test/integration/cursor-deployment.test.ts`
  - Rules deployment validation (14 tests passing)
  - MCP configuration validation
  - CLI permissions validation

## CLI Commands

### New Commands

```bash
# Deploy AIWG rules to Cursor
aiwg -deploy-rules --provider cursor [--target .cursor/rules]

# Install MCP server for Cursor
aiwg mcp install cursor [--global]

# Full Cursor setup
aiwg -deploy-agents --provider cursor --deploy-commands
```

### Command Mapping

| AIWG Command | Cursor Action |
|--------------|---------------|
| `aiwg -deploy-agents --provider cursor` | Deploy rules to `.cursor/rules/` |
| `aiwg mcp install cursor` | Configure `.cursor/mcp.json` |
| `aiwg -deploy-commands --provider cursor` | Alias for rules deployment |

## Key Differences from Codex Integration

1. **No AGENTS.md generation** - Cursor reads existing CLAUDE.md/AGENTS.md
2. **Rules instead of skills** - Commands become rules with MDC format
3. **JSON MCP config** - Not TOML like Codex
4. **Simpler integration** - Cursor is more Claude-compatible

## File Structure After Integration

```
.cursor/
├── cli.json              # CLI permissions (optional)
├── mcp.json              # MCP server configuration
├── worktrees.json        # Parallel agent setup (optional)
└── rules/
    ├── pr-review.mdc     # Code review rule
    ├── security-audit.mdc
    ├── generate-tests.mdc
    └── project-status.mdc

~/.cursor/
├── cli-config.json       # Global CLI config
└── mcp.json              # Global MCP servers (fallback)
```

## Success Criteria

1. **Rules work in Cursor CLI** - `cursor-agent` can use AIWG rules
2. **MCP tools available** - AIWG MCP server connects and provides tools
3. **Headless mode works** - CI/CD workflows execute successfully
4. **No duplication** - Integration reuses existing CLAUDE.md/AGENTS.md

## References

- Cursor CLI Docs: https://cursor.com/docs/cli/overview
- Cursor Rules: https://cursor.com/docs/rules
- Cursor MCP: https://cursor.com/docs/mcp
- AIWG Codex Integration: `.aiwg/planning/codex-integration-plan.md`
