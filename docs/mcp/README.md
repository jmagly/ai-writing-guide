# MCP Server (Model Context Protocol)

AIWG includes an MCP server for programmatic integration with AI tools.

## Quick Start

```bash
# Start MCP server (stdio transport)
aiwg mcp serve

# Install config for Claude Desktop
aiwg mcp install claude

# Install config for Cursor
aiwg mcp install cursor

# View MCP info
aiwg mcp info
```

## Available Tools

| Tool | Description |
|------|-------------|
| `workflow-run` | Execute AIWG workflows programmatically |
| `artifact-read` | Read artifacts from .aiwg/ directory |
| `artifact-write` | Write artifacts to .aiwg/ directory |
| `template-render` | Render templates with variables |
| `agent-list` | List available agents |

## Available Prompts

| Prompt | Description |
|--------|-------------|
| `decompose-task` | Break down complex tasks into steps |
| `parallel-execution` | Plan parallel agent workflows |
| `recovery-protocol` | Handle workflow failures |

These prompts are auto-integrated and available in compatible tools.

## Configuration

### Claude Desktop

After running `aiwg mcp install claude`, the config is placed in:
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux:** `~/.config/Claude/claude_desktop_config.json`

### Cursor

After running `aiwg mcp install cursor`, the config is added to your Cursor settings.

## Manual Configuration

If automatic installation doesn't work, add this to your MCP config:

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

## Technical Details

- **Transport:** stdio (standard input/output)
- **Protocol Version:** MCP 2025-11-25
- **Implementation:** TypeScript with @modelcontextprotocol/sdk

## Further Reading

- [MCP Specification Research](../references/REF-003-mcp-specification-2025.md) — Implementation details
- [MCP Official Docs](https://modelcontextprotocol.io/) — Protocol specification
