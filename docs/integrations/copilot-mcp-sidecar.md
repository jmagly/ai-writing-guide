# GitHub Copilot MCP Integration

Status: **Supported** — MCP is GA in both VS Code agent mode and the Copilot coding agent.

---

## Overview

GitHub Copilot supports MCP (Model Context Protocol) in two distinct contexts:

| Context | Configuration | Capabilities |
|---------|--------------|-------------|
| VS Code (Agent Mode + Chat) | `.vscode/mcp.json` | Tools, prompts, resources |
| Coding Agent (GitHub.com) | GitHub.com Settings UI | Tools only |

---

## VS Code MCP Configuration

### Setup

Add AIWG as an MCP server in `.vscode/mcp.json`:

```json
{
  "servers": {
    "aiwg": {
      "type": "stdio",
      "command": "aiwg",
      "args": ["mcp", "serve"]
    }
  }
}
```

### Server Types

| Type | Use Case | Example |
|------|----------|---------|
| `stdio` | Local process (recommended for AIWG) | `"command": "aiwg", "args": ["mcp", "serve"]` |
| `http` | Remote server with streamable HTTP | `"url": "https://mcp.example.com/mcp"` |
| `sse` | Server-Sent Events (legacy) | `"url": "https://mcp.example.com/sse"` |

### Authentication

For servers requiring authentication, use input variables:

```json
{
  "servers": {
    "authenticated-server": {
      "type": "http",
      "url": "https://api.example.com/mcp",
      "headers": {
        "Authorization": "Bearer ${input:api-key}"
      }
    }
  },
  "inputs": [
    {
      "type": "promptString",
      "id": "api-key",
      "description": "Your API Key",
      "password": true
    }
  ]
}
```

### What MCP Enables

Once configured, Copilot agent mode can:
- Call AIWG tools (`discover`, `command-run`, `artifact-read`, etc.)
- Use MCP prompts (invokable as `/mcp.aiwg.promptname`)
- Access MCP resources for context
- Chain multiple MCP servers together

Tools are auto-invoked based on prompt intent. Non-read-only tools show confirmation dialogs.

### User-Level Configuration

For personal MCP servers across all projects, use the VS Code command:
`MCP: Open User Configuration`

### Agent-Scoped MCP

Custom agents (`.github/agents/*.agent.md`) can declare their own MCP servers:

```yaml
---
name: data-analyst
mcp-servers:
  - type: stdio
    command: npx
    args: ['-y', '@company/data-mcp']
---
```

### Sandbox

On macOS/Linux, MCP servers run with configurable filesystem and network access rules for security isolation.

---

## Coding Agent MCP Configuration

### Setup

Configure via GitHub.com > Settings > Copilot > Coding agent:

```json
{
  "mcpServers": {
    "sentry": {
      "type": "http",
      "url": "https://mcp.sentry.io",
      "tools": ["get_issue_details", "get_issue_summary"]
    },
    "local-tool": {
      "type": "local",
      "command": "npx",
      "args": ["-y", "@company/tool"],
      "tools": "*"
    }
  }
}
```

### Key Differences from VS Code

| Aspect | VS Code MCP | Coding Agent MCP |
|--------|-------------|-----------------|
| Configuration | `.vscode/mcp.json` (committed) | GitHub.com Settings UI |
| Capabilities | Tools + prompts + resources | Tools only |
| Approval | User confirms non-read-only tools | Autonomous (no approval) |
| Scope | Workspace or user-level | Repository or org-level |

### Required Fields

- `type`: `http` or `local`
- `tools`: Array of tool names or `"*"` for all tools from server

---

## AIWG MCP Server

AIWG provides a built-in MCP server exposing SDLC workflow tools:

```bash
# Start the AIWG MCP server
aiwg mcp serve

# Install to Claude Desktop (also works for VS Code via .vscode/mcp.json)
aiwg mcp install claude
aiwg mcp install vscode

# Show capabilities
aiwg mcp info
```

### Exposed Tools

The AIWG MCP server exposes tools for:
- Discovery and CLI dispatch (`discover`, `command-run`)
- Artifact management (`artifact-read`, `artifact-write`)
- Catalog lookup (`skill-*`, `command-*`, `rule-*`, `agent-*`, `template-*`)
- Optional Flow and Mission tools when `AIWG_MCP_TOOLSETS=flows,missions`

---

## Recommended Setup

### For Teams Using VS Code + Copilot

1. Deploy AIWG agents and prompts:
   ```bash
   aiwg use sdlc --provider copilot
   ```

2. Add MCP configuration:
   ```bash
   aiwg mcp install vscode
   ```

3. Commit both `.github/` and `.vscode/mcp.json`

4. Team members get full AIWG integration:
   - Custom agents via @-mention
   - Custom slash commands via /name
   - MCP tools via agent mode

### For Teams Using Copilot Coding Agent

1. Deploy AIWG agents:
   ```bash
   aiwg use sdlc --provider copilot
   ```

2. Configure MCP in GitHub.com Settings (if using external tools)

3. The coding agent reads `.github/copilot-instructions.md` for project context

---

## Related Resources

- [Copilot Quick Start](copilot-quickstart.md) — Full AIWG + Copilot integration
- [Copilot Quickstart](copilot-quickstart.md)
- [Cross-Platform Overview](cross-platform-overview.md) — All supported providers
- [Claude MCP Sidecar](claude-mcp-sidecar.md) — Alternative with full MCP support
