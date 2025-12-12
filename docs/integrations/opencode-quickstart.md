# OpenCode Integration Guide

This guide explains how to integrate AIWG with [OpenCode](https://github.com/sst/opencode), the open-source AI coding agent.

## Overview

OpenCode provides a TUI-based AI coding assistant with support for:
- **Agents**: Specialized AI personas with custom tools and permissions
- **Commands**: Slash commands with shell injection and file references
- **Custom Tools**: TypeScript-based tool extensions
- **Plugins**: Event hooks for workflow automation
- **MCP Servers**: Model Context Protocol integration
- **GitHub Integration**: `/opencode` triggers in issues and PRs

AIWG integrates with all of these features for comprehensive SDLC support.

## Quick Start

### 1. Install OpenCode

```bash
# macOS/Linux
curl -fsSL https://opencode.ai/install | sh

# Or via npm
npm install -g opencode
```

### 2. Deploy AIWG Agents

```bash
# Deploy agents, commands, and create AGENTS.md
aiwg -deploy-agents --provider opencode --mode sdlc --deploy-commands --create-agents-md
```

This creates:
- `.opencode/agent/` - AIWG SDLC agents
- `.opencode/command/` - AIWG slash commands
- `AGENTS.md` - Project-specific instructions

### 3. Configure MCP Server (Optional)

```bash
# Add AIWG MCP server to opencode.json
aiwg mcp install opencode
```

## Directory Structure

After deployment:

```
project/
├── .opencode/
│   ├── agent/               # AIWG SDLC agents
│   │   ├── security-architect.md
│   │   ├── test-engineer.md
│   │   ├── code-reviewer.md
│   │   └── ...
│   ├── command/             # AIWG commands
│   │   ├── project-status.md
│   │   ├── flow-gate-check.md
│   │   └── ...
│   ├── tool/                # Custom tools (optional)
│   │   └── aiwg-workflow.ts
│   ├── plugin/              # Event hooks (optional)
│   │   └── aiwg-hooks.ts
│   └── themes/              # AIWG theme (optional)
│       └── aiwg.json
├── opencode.json            # OpenCode configuration
├── AGENTS.md                # Project instructions
└── .aiwg/                   # SDLC artifacts
    ├── requirements/
    ├── architecture/
    └── ...
```

## Using AIWG Agents

### Invoke via @-mention

```
@security-architect Review the authentication implementation
@test-engineer Generate unit tests for the user service
@code-reviewer Review this PR for quality issues
```

### Available Agent Categories

| Category | Agents |
|----------|--------|
| **Planning** | `@requirements-analyst`, `@architecture-designer`, `@api-designer` |
| **Implementation** | `@software-implementer`, `@test-engineer`, `@code-reviewer` |
| **Security** | `@security-architect`, `@security-auditor` |
| **Documentation** | `@technical-writer`, `@documentation-synthesizer` |
| **Operations** | `@deployment-manager`, `@reliability-engineer` |

## Using AIWG Commands

### Invoke via /command

```
/project-status
/flow-gate-check elaboration
/security-gate
/generate-tests
```

### Available Commands

| Command | Description |
|---------|-------------|
| `/project-status` | Current project state and recommendations |
| `/flow-gate-check <phase>` | Validate phase gate criteria |
| `/flow-inception-to-elaboration` | Transition from Inception to Elaboration |
| `/security-gate` | Run security validation |
| `/generate-tests` | Generate test suite |

## Configuration

### opencode.json

```json
{
  "$schema": "https://opencode.ai/config.json",
  "model": "anthropic/claude-sonnet-4-20250514",
  "mcp": {
    "aiwg": {
      "type": "local",
      "command": ["aiwg", "mcp", "serve"]
    }
  },
  "instructions": [
    "AGENTS.md",
    ".aiwg/instructions.md"
  ]
}
```

### Agent Permissions

AIWG agents are configured with appropriate tool restrictions:

```yaml
---
description: Security architecture and threat modeling
mode: subagent
model: anthropic/claude-sonnet-4-20250514
temperature: 0.2
maxSteps: 30
tools:
  write: false
  edit: false
  patch: false
  bash: true
  webfetch: true
permission:
  bash:
    "git *": allow
    "npm audit": allow
    "*": ask
---
```

## Custom Tools

Deploy the AIWG workflow tool for enhanced capabilities:

```bash
# Copy from templates
cp ~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/templates/opencode/tool/aiwg-workflow.ts.aiwg-template .opencode/tool/aiwg-workflow.ts

# Install dependencies
npm install @opencode-ai/plugin zod
```

This provides:
- `aiwg-workflow` - Execute AIWG workflows
- `aiwg-artifact-read` - Read SDLC artifacts
- `aiwg-artifact-list` - List artifacts by category

## Plugins (Event Hooks)

Deploy AIWG hooks for automated quality checks:

```bash
cp ~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/templates/opencode/plugin/aiwg-hooks.ts.aiwg-template .opencode/plugin/aiwg-hooks.ts
```

This provides:
- Session activity tracking
- Destructive command warnings
- SDLC-relevant file change detection
- Session summaries with recommendations

## GitHub Integration

Enable AI-assisted issue/PR handling:

```yaml
# .github/workflows/opencode-aiwg.yml
name: OpenCode AIWG Integration

on:
  issue_comment:
    types: [created]
  pull_request_review_comment:
    types: [created]

jobs:
  opencode:
    if: contains(github.event.comment.body, '/oc') || contains(github.event.comment.body, '/opencode')
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: write
      pull-requests: write
      issues: write
    steps:
      - uses: actions/checkout@v4
      - run: npm install -g ai-writing-guide
      - run: aiwg -deploy-agents --provider opencode --mode sdlc --deploy-commands
      - uses: sst/opencode/github@latest
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        with:
          model: anthropic/claude-sonnet-4-20250514
```

Usage in issues/PRs:
```
/opencode explain this issue
/opencode fix this
/oc review this PR
```

## Themes

Apply the AIWG theme:

```bash
cp ~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/templates/opencode/themes/aiwg.json.aiwg-template .opencode/themes/aiwg.json
```

Then in opencode.json:

```json
{
  "theme": "aiwg"
}
```

## Model Configuration

Override default models:

```bash
aiwg -deploy-agents --provider opencode \
  --reasoning-model anthropic/claude-opus-4-20250514 \
  --coding-model anthropic/claude-sonnet-4-20250514 \
  --efficiency-model anthropic/claude-haiku-4-20250514
```

## Best Practices

1. **Use appropriate agents** - Match agent expertise to the task
2. **Follow SDLC workflows** - Use `/flow-*` commands for phase transitions
3. **Maintain artifacts** - Keep `.aiwg/` directory updated
4. **Enable plugins** - Automated quality checks and tracking
5. **Use MCP** - Full AIWG capabilities via MCP server

## Troubleshooting

### Agents not appearing

```bash
# Verify deployment
ls -la .opencode/agent/

# Redeploy with force
aiwg -deploy-agents --provider opencode --force
```

### MCP server not connecting

```bash
# Test MCP server directly
aiwg mcp serve

# Check opencode.json configuration
cat opencode.json | grep -A5 "mcp"
```

### Permission errors

Review agent permissions in `.opencode/agent/*.md` frontmatter. Adjust `permission:` block as needed.

## References

- [OpenCode Documentation](https://opencode.ai/docs)
- [OpenCode GitHub](https://github.com/sst/opencode)
- [AIWG SDLC Framework](../reference/sdlc-framework.md)
- [AIWG Agent Catalog](../reference/agents.md)
