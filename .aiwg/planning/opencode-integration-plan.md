# OpenCode Integration Plan

## Overview

This document outlines the integration strategy for AIWG with [OpenCode](https://opencode.ai), the open-source AI coding agent from SST.

**Status**: ✅ COMPLETE
**Priority**: P1 - High
**Completed**: 2025-12-11

## OpenCode Feature Summary

OpenCode is feature-rich with capabilities we should fully leverage:

| Feature | Description | AIWG Integration |
|---------|-------------|------------------|
| **Agents** | Primary + subagent system with @mentions | Deploy SDLC agents as subagents |
| **Commands** | Custom slash commands with templates | Convert AIWG commands to /commands |
| **MCP Servers** | Local and remote MCP support | Deploy AIWG MCP server |
| **Custom Tools** | TypeScript/JavaScript tool definitions | Create AIWG workflow tools |
| **Plugins** | Event hooks and custom behaviors | Create AIWG plugin for automation |
| **GitHub Integration** | /opencode in issues/PRs | Provide GitHub workflow template |
| **LSP Support** | Built-in language servers | Leverage for code quality |
| **Themes** | Custom JSON themes | Provide AIWG theme |
| **Formatters** | Auto-formatting support | Document integration |
| **Permissions** | Granular tool/bash permissions | Configure SDLC-appropriate defaults |
| **instructions** | Multi-file instruction loading | Use for SDLC artifact references |

## Directory Structure

```
.opencode/
├── agent/           # AIWG SDLC agents (subagents)
│   ├── security-architect.md
│   ├── test-engineer.md
│   ├── requirements-analyst.md
│   └── ...
├── command/         # AIWG slash commands
│   ├── security-audit.md
│   ├── generate-tests.md
│   ├── flow-gate-check.md
│   └── ...
├── tool/            # Custom AIWG tools
│   └── aiwg-workflow.ts
├── plugin/          # AIWG plugin for automation
│   └── aiwg-hooks.ts
├── themes/          # Optional AIWG theme
│   └── aiwg.json
└── opencode.jsonc   # Configuration (can also be at project root)

AGENTS.md            # Project context (OpenCode reads natively)
.aiwg/               # SDLC artifacts
```

## Integration Components

### 1. Agent Deployment (`.opencode/agent/`)

**Convert AIWG agents to OpenCode subagent format.**

OpenCode agent features to use:
- `mode: subagent` - All SDLC agents as invokable subagents
- `mode: primary` - Optional primary "sdlc" agent for orchestration
- `description` - For agent discovery and auto-invocation
- `model` - Per-agent model selection
- `temperature` - Task-appropriate settings (low for analysis, medium for generation)
- `tools` - Granular tool enable/disable per agent
- `permission` - Per-agent permission overrides
- `maxSteps` - Limit iterations for cost control

**OpenCode Agent Format:**
```markdown
---
description: Performs security analysis and identifies vulnerabilities
mode: subagent
model: anthropic/claude-sonnet-4-20250514
temperature: 0.2
maxSteps: 50
tools:
  write: false
  edit: false
  bash: true
  webfetch: true
permission:
  bash:
    "git *": allow
    "npm audit": allow
    "*": ask
---

You are a security expert. Focus on identifying potential security issues.

Look for:
- Input validation vulnerabilities
- Authentication and authorization flaws
- Data exposure risks
- Dependency vulnerabilities
- Configuration security issues
```

**Model Mapping:**
| AIWG Model | OpenCode Model ID |
|------------|-------------------|
| `sonnet` | `anthropic/claude-sonnet-4-20250514` |
| `opus` | `anthropic/claude-opus-4-20250514` |
| `haiku` | `anthropic/claude-haiku-4-20250514` |

**Tool Mapping per Agent Type:**
| Agent Category | Tools Enabled | Tools Disabled |
|----------------|---------------|----------------|
| Analysis (security, review) | read, grep, glob, bash, webfetch | write, edit, patch |
| Implementation (software, test) | ALL | - |
| Documentation (writer, archivist) | read, write, edit, grep, glob | bash |
| Planning (requirements, architect) | read, grep, glob, webfetch | write, edit, bash |

### 2. Command Deployment (`.opencode/command/`)

**Convert AIWG commands to OpenCode command format.**

OpenCode command features to use:
- `description` - For command discovery in TUI
- `agent` - Route to specific agent (e.g., security commands → security-architect)
- `model` - Override model for specific commands
- `subtask` - Force subagent execution to avoid context pollution
- `$ARGUMENTS` - Pass user input to command template
- `$1, $2, ...` - Positional arguments
- `` !`command` `` - Inject shell output into prompt
- `@filepath` - Include file references

**OpenCode Command Format:**
```markdown
---
description: Run comprehensive security audit
agent: security-architect
model: anthropic/claude-sonnet-4-20250514
subtask: true
---

Perform a comprehensive security review of this codebase.

Current git status:
!`git status -s`

Focus areas:
1. Injection vulnerabilities (SQL, command, XSS)
2. Authentication and authorization issues
3. Sensitive data exposure
4. Security misconfigurations
5. Cryptographic failures
6. Insecure dependencies

Check NPM audit:
!`npm audit --json 2>/dev/null || echo "No npm project"`

For each finding, provide severity, location, description, and fix.

$ARGUMENTS
```

**Command Categories to Deploy:**
- Flow commands (gate-check, phase transitions)
- Review commands (security-audit, pr-review)
- Generation commands (generate-tests, deploy-gen)
- Analysis commands (project-status, health-check)

### 3. Custom Tools (`.opencode/tool/`)

**Create TypeScript tools for AIWG-specific operations.**

```typescript
// .opencode/tool/aiwg-workflow.ts
import { tool } from "@opencode-ai/plugin"

export const status = tool({
  description: "Get current AIWG project status and phase",
  args: {},
  async execute(args, context) {
    const { $ } = context
    const result = await $`aiwg -status`.text()
    return result
  },
})

export const artifact = tool({
  description: "Read an AIWG artifact from .aiwg/ directory",
  args: {
    path: tool.schema.string().describe("Path relative to .aiwg/"),
  },
  async execute(args, context) {
    const { $ } = context
    const result = await $`cat .aiwg/${args.path}`.text()
    return result
  },
})

export const template = tool({
  description: "Render an AIWG template",
  args: {
    template: tool.schema.string().describe("Template name"),
    variables: tool.schema.record(tool.schema.string()).optional(),
  },
  async execute(args, context) {
    const { $ } = context
    const vars = args.variables
      ? Object.entries(args.variables).map(([k,v]) => `--var ${k}="${v}"`).join(' ')
      : ''
    const result = await $`aiwg template render ${args.template} ${vars}`.text()
    return result
  },
})

export const gate = tool({
  description: "Check SDLC phase gate readiness",
  args: {
    phase: tool.schema.string().describe("Phase to check (inception, elaboration, construction, transition)"),
  },
  async execute(args, context) {
    const { $ } = context
    const result = await $`aiwg gate check ${args.phase}`.text()
    return result
  },
})
```

### 4. Plugin Integration (`.opencode/plugin/`)

**Create AIWG plugin for automation and event hooks.**

```typescript
// .opencode/plugin/aiwg-hooks.ts
import type { Plugin } from "@opencode-ai/plugin"

export const AIWGPlugin: Plugin = async ({ project, client, $, directory }) => {
  console.log("AIWG Plugin initialized for:", directory)

  return {
    // Notify on session completion
    event: async ({ event }) => {
      if (event.type === "session.idle") {
        // Log completed session to .aiwg/logs/
        await $`echo "Session completed: $(date)" >> .aiwg/logs/sessions.log`
      }
    },

    // Track file changes for traceability
    "file.edited": async (input, output) => {
      const { filePath } = output
      if (filePath.startsWith("src/") || filePath.startsWith("test/")) {
        // Could update traceability matrix
        console.log(`AIWG: File edited - ${filePath}`)
      }
    },

    // Protect SDLC artifacts from accidental deletion
    "tool.execute.before": async (input, output) => {
      if (input.tool === "bash") {
        const cmd = output.args.command || ""
        if (cmd.includes("rm -rf .aiwg")) {
          throw new Error("Cannot delete .aiwg directory - use /workspace-reset command instead")
        }
      }
    },
  }
}
```

### 5. MCP Server Configuration

**Configure AIWG MCP server in opencode.json.**

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "aiwg": {
      "type": "local",
      "command": ["aiwg", "mcp", "serve"],
      "enabled": true,
      "timeout": 10000
    }
  }
}
```

### 6. GitHub Integration

**Provide GitHub Actions workflow template.**

```yaml
# .github/workflows/opencode-aiwg.yml
name: OpenCode AIWG

on:
  issue_comment:
    types: [created]
  pull_request_review_comment:
    types: [created]

jobs:
  opencode:
    if: |
      contains(github.event.comment.body, '/oc') ||
      contains(github.event.comment.body, '/opencode')
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: write
      pull-requests: write
      issues: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install AIWG
        run: npm install -g aiwg

      - name: Run OpenCode with AIWG
        uses: sst/opencode/github@latest
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        with:
          model: anthropic/claude-sonnet-4-20250514
          prompt: |
            You have access to AIWG SDLC framework.
            Use the aiwg CLI for project management tasks.
            SDLC artifacts are in .aiwg/ directory.
            Follow the project's AGENTS.md guidelines.
```

### 7. Comprehensive Configuration Template

```jsonc
// opencode.json.aiwg-template
{
  "$schema": "https://opencode.ai/config.json",

  // Load SDLC context files
  "instructions": [
    "AGENTS.md",
    ".aiwg/requirements/**/*.md",
    ".aiwg/architecture/*.md"
  ],

  // AIWG MCP server
  "mcp": {
    "aiwg": {
      "type": "local",
      "command": ["aiwg", "mcp", "serve"],
      "enabled": true
    }
  },

  // Global tool configuration
  "tools": {
    "todowrite": true,
    "todoread": true,
    "webfetch": true
  },

  // Default permissions (can be overridden per-agent)
  "permission": {
    "edit": "allow",
    "bash": {
      "aiwg *": "allow",
      "git status": "allow",
      "git diff": "allow",
      "git log*": "allow",
      "npm test": "allow",
      "npm run build": "allow",
      "git push": "ask",
      "rm -rf": "deny",
      "*": "ask"
    },
    "webfetch": "allow",
    "doom_loop": "ask",
    "external_directory": "ask"
  },

  // Primary SDLC orchestrator agent
  "agent": {
    "sdlc": {
      "description": "SDLC orchestrator - coordinates multi-agent workflows",
      "mode": "primary",
      "model": "anthropic/claude-sonnet-4-20250514",
      "temperature": 0.3,
      "prompt": "{file:.opencode/prompts/sdlc-orchestrator.txt}"
    }
  },

  // Optional: AIWG-branded theme
  "theme": "aiwg"
}
```

### 8. AGENTS.md Template

```markdown
# AIWG SDLC Framework

This project uses AIWG for structured SDLC workflow management.

## Available Agents

Use `@agent-name` to invoke specialized agents:

| Agent | Purpose |
|-------|---------|
| @security-architect | Security analysis and threat modeling |
| @test-engineer | Test strategy and generation |
| @requirements-analyst | Requirements refinement |
| @code-reviewer | Code quality analysis |
| @deployment-manager | Release planning |

## Available Commands

Type `/command` in the TUI:

| Command | Description |
|---------|-------------|
| /security-audit | Run comprehensive security review |
| /generate-tests | Generate test suite |
| /flow-gate-check | Check phase gate readiness |
| /project-status | Get current project status |

## AIWG Tools

Custom tools available via MCP:

- `aiwg_status` - Project status
- `aiwg_artifact` - Read SDLC artifacts
- `aiwg_template` - Render templates
- `aiwg_gate` - Check phase gates

## Artifacts Location

SDLC artifacts are in `.aiwg/`:

```
.aiwg/
├── intake/        # Project intake forms
├── requirements/  # User stories, use cases
├── architecture/  # SAD, ADRs
├── planning/      # Phase plans
├── risks/         # Risk register
├── testing/       # Test strategy
├── security/      # Threat models
└── deployment/    # Deployment plans
```

## GitHub Integration

Use `/opencode` or `/oc` in issues/PRs to invoke OpenCode with AIWG context.
```

### 9. Theme Template (Optional)

```json
// .opencode/themes/aiwg.json
{
  "$schema": "https://opencode.ai/theme.json",
  "defs": {
    "aiwg-blue": "#2563EB",
    "aiwg-green": "#10B981",
    "aiwg-orange": "#F59E0B",
    "aiwg-red": "#EF4444",
    "aiwg-purple": "#8B5CF6"
  },
  "theme": {
    "primary": { "dark": "aiwg-blue", "light": "aiwg-blue" },
    "success": { "dark": "aiwg-green", "light": "aiwg-green" },
    "warning": { "dark": "aiwg-orange", "light": "aiwg-orange" },
    "error": { "dark": "aiwg-red", "light": "aiwg-red" },
    "accent": { "dark": "aiwg-purple", "light": "aiwg-purple" }
  }
}
```

## Implementation Tasks

### Phase 1: Core Integration ✅ COMPLETE

- [x] Update `tools/agents/deploy-agents.mjs`
  - Added `opencode` provider support
  - Transform agent metadata to OpenCode format
  - Map models, tools, permissions per agent type
  - Generate mode (primary vs subagent) based on agent category

- [x] Create agent transformation function
  - Parse AIWG agent markdown
  - Generate OpenCode-compatible frontmatter
  - Add temperature, maxSteps based on agent type
  - Configure tools/permissions per agent category

- [x] Update `src/mcp/cli.mjs`
  - Add `opencode` provider
  - Merge MCP config into opencode.json format

### Phase 2: Commands and Tools ✅ COMPLETE

- [x] Create command deployment
  - Convert .claude/commands/*.md to .opencode/command/*.md
  - Add agent routing (security commands → security-architect)
  - Add subtask: true for isolation
  - Include shell injection for context (git status, etc.)

- [x] Create custom tool templates
  - `.opencode/tool/aiwg-workflow.ts`
  - Status, artifact, template, gate tools

- [x] Create plugin template
  - `.opencode/plugin/aiwg-hooks.ts`
  - Event hooks for automation

### Phase 3: Templates and Documentation ✅ COMPLETE

- [x] Create OpenCode templates directory
  - `agentic/code/frameworks/sdlc-complete/templates/opencode/`
  - opencode.json.aiwg-template
  - AGENTS.md.aiwg-template
  - tool/aiwg-workflow.ts.aiwg-template
  - plugin/aiwg-hooks.ts.aiwg-template
  - themes/aiwg.json.aiwg-template
  - instructions.md.aiwg-template

- [x] Create GitHub Actions templates
  - `templates/opencode/ci-cd/opencode-aiwg.yml`

- [x] Create quickstart guide
  - `docs/integrations/opencode-quickstart.md`

### Phase 4: Testing ✅ COMPLETE

- [x] Create integration tests
  - `test/integration/opencode-deployment.test.ts`
  - Agent deployment validation
  - Command deployment validation
  - MCP configuration validation
  - AGENTS.md generation validation

## CLI Commands

```bash
# Full OpenCode setup
aiwg -deploy-agents --provider opencode --deploy-commands --create-agents-md

# Deploy only agents
aiwg -deploy-agents --provider opencode

# Deploy only commands
aiwg -deploy-commands --provider opencode

# Install MCP server
aiwg mcp install opencode

# Use SDLC framework with OpenCode
aiwg use sdlc --provider opencode
```

## Success Criteria

1. **Agents work** - All SDLC agents deployable and invokable via @mention
2. **Commands work** - Slash commands executable in TUI
3. **Tools work** - Custom AIWG tools available
4. **Plugin works** - Event hooks functional
5. **MCP works** - AIWG MCP server connected
6. **GitHub works** - /opencode triggers AIWG-aware sessions
7. **Config complete** - Permissions, instructions, theme configured
8. **Tests pass** - Integration tests validate all functionality

## References

- OpenCode Docs: https://opencode.ai/docs
- OpenCode Agents: https://opencode.ai/docs/agents
- OpenCode Commands: https://opencode.ai/docs/commands
- OpenCode Config: https://opencode.ai/docs/config
- OpenCode MCP: https://opencode.ai/docs/mcp-servers
- OpenCode Custom Tools: https://opencode.ai/docs/custom-tools
- OpenCode Plugins: https://opencode.ai/docs/plugins
- OpenCode GitHub: https://opencode.ai/docs/github
- OpenCode Themes: https://opencode.ai/docs/themes
- OpenCode Permissions: https://opencode.ai/docs/permissions
- GitHub: https://github.com/sst/opencode
