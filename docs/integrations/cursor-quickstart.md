# Cursor Integration Quick Start

This guide covers integrating AIWG with [Cursor IDE](https://cursor.com) and its CLI (`cursor-agent`).

## Overview

Cursor provides native support for `AGENTS.md` and `CLAUDE.md` files at the project root, making AIWG integration straightforward. The integration adds:

- **MDC Rules** - Cursor rules in `.cursor/rules/*.mdc` format
- **MCP Server** - AIWG tools via Model Context Protocol
- **CI/CD Workflows** - GitHub Actions templates for automated reviews

## Quick Setup

### 1. Install AIWG

```bash
curl -fsSL https://raw.githubusercontent.com/jmagly/ai-writing-guide/main/tools/install/install.sh | bash
```

### 2. Deploy Cursor Integration

```bash
# Navigate to your project
cd /path/to/your/project

# Deploy AIWG for Cursor
aiwg -deploy-agents --provider cursor --deploy-commands --create-agents-md
```

This creates:
- `AGENTS.md` - Project context file (Cursor reads this natively)
- `.cursor/rules/*.mdc` - AIWG rules for code review, testing, security

### 3. Configure MCP Server (Optional)

Enable AIWG MCP tools:

```bash
aiwg mcp install cursor
```

Or manually create `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "aiwg": {
      "command": "aiwg",
      "args": ["mcp", "serve"]
    }
  }
}
```

## Using Cursor with AIWG

### Interactive Mode

Start a conversation with Cursor Agent:

```bash
cursor-agent
```

Then use natural language:
- "Review this code for security issues"
- "Generate tests for the auth module"
- "What's the project status?"
- "Create an architecture decision record"

### With Initial Prompt

```bash
cursor-agent "Review the changes in src/auth for security vulnerabilities"
```

### Non-Interactive (CI/Scripting)

```bash
# Text output
cursor-agent -p "Analyze src/api for N+1 queries" --output-format text

# JSON output for parsing
cursor-agent -p "List all TODOs in this project" --output-format json
```

## Cursor Rules (.cursor/rules/)

AIWG deploys rules in MDC format that auto-attach based on file patterns:

| Rule | Auto-attaches to | Purpose |
|------|------------------|---------|
| `aiwg-pr-review.mdc` | `*.ts, *.tsx, *.js, *.py` | Code review standards |
| `aiwg-security-audit.mdc` | `*.ts, *.js, *.py, *.go` | Security analysis |
| `aiwg-generate-tests.mdc` | `*.ts, *.tsx, *.js, *.py` | Test generation |
| `aiwg-security-gate.mdc` | `*.ts, *.js, *.py` | Security validation |

Rules without glob patterns are available for manual reference.

### MDC Format

```yaml
---
description: Code review with AIWG standards
globs:
  - "*.ts"
  - "*.tsx"
---

Review this code for...
```

## CI/CD Integration

### GitHub Actions

Copy templates from the AIWG repository:

```bash
# From your project root
cp ~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/templates/cursor/ci-cd/*.yml .github/workflows/
```

Available workflows:
- `aiwg-cursor-review.yml` - Automated code review on PRs
- `aiwg-cursor-security.yml` - Security scanning
- `aiwg-cursor-tests.yml` - Test generation

### Required Secrets

Add to your GitHub repository:
- `CURSOR_API_KEY` - Your Cursor API key (from dashboard)

## Configuration Files

### CLI Permissions (.cursor/cli.json)

Control what Cursor Agent can do:

```json
{
  "permissions": {
    "allow": [
      "Shell(aiwg)",
      "Shell(git)",
      "Shell(npm)",
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

### Worktree Setup (.cursor/worktrees.json)

For parallel agent execution:

```json
{
  "setup-worktree": [
    "npm ci",
    "cp $ROOT_WORKTREE_PATH/.env .env 2>/dev/null || true"
  ]
}
```

## MCP Tools

When MCP is configured, these tools are available:

| Tool | Description |
|------|-------------|
| `workflow-run` | Execute AIWG workflows |
| `artifact-read` | Read from `.aiwg/` |
| `artifact-write` | Write to `.aiwg/` |
| `template-render` | Render AIWG templates |
| `agent-list` | List available agents |

## File Structure

After setup, your project will have:

```
your-project/
├── AGENTS.md              # Project context (Cursor reads natively)
├── CLAUDE.md              # Also read by Cursor if present
├── .cursor/
│   ├── cli.json           # CLI permissions (optional)
│   ├── mcp.json           # MCP server config (optional)
│   ├── worktrees.json     # Parallel agent setup (optional)
│   └── rules/
│       ├── aiwg-pr-review.mdc
│       ├── aiwg-security-audit.mdc
│       └── ...
└── .aiwg/                 # SDLC artifacts
    ├── intake/
    ├── requirements/
    ├── architecture/
    └── ...
```

## Key Differences from Claude Code

| Feature | Claude Code | Cursor |
|---------|-------------|--------|
| Context file | `CLAUDE.md` only | Both `CLAUDE.md` and `AGENTS.md` |
| Commands | `.claude/commands/*.md` | `.cursor/rules/*.mdc` |
| Skills | `.claude/skills/` | Via MCP server |
| Config format | JSON | JSON |
| CLI | `claude` | `cursor-agent` |

## Troubleshooting

### Rules not loading

- Check file extension is `.mdc` (not `.md`)
- Verify glob patterns match your files
- Restart Cursor to reload rules

### MCP not connecting

```bash
# Test MCP server directly
aiwg mcp serve

# Check config syntax
cat .cursor/mcp.json | jq .
```

### Headless mode issues

```bash
# Verify API key
echo $CURSOR_API_KEY

# Test with verbose output
cursor-agent -p "hello" --output-format json
```

## Resources

- [Cursor CLI Docs](https://cursor.com/docs/cli/overview)
- [Cursor Rules](https://cursor.com/docs/rules)
- [Cursor MCP](https://cursor.com/docs/mcp)
- [AIWG Repository](https://github.com/jmagly/ai-writing-guide)
- [Discord Community](https://discord.gg/BuAusFMxdA)
