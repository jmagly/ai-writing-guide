# MCP Role Configurations

Launch Claude Code with different MCP server configurations based on your task.

## Concept

Instead of loading all MCP servers (which consumes context), load only what you need:

| Role | MCPs | Use Case |
|------|------|----------|
| `minimal` | gitea only | Quick fixes, simple tasks |
| `dev` | gitea + code-search + memory | Development work |
| `ops` | gitea + cmdb + memory | Infrastructure operations |
| `research` | gitea + code-search + memory | Code exploration |
| `incident` | gitea + code-search + cmdb + memory | Incident response (all tools) |

## Installation

```bash
# Copy to ~/.claude/roles/
mkdir -p ~/.claude/roles
cp examples/mcp-roles/*.json ~/.claude/roles/

# Source the launcher
echo 'source /path/to/claude-role.sh' >> ~/.bashrc
source ~/.bashrc

# Or set CLAUDE_ROLES_DIR
export CLAUDE_ROLES_DIR="/path/to/examples/mcp-roles"
```

## Usage

```bash
# List available roles
claude-role

# Launch with specific role
claude-role dev
claude-role ops --resume
claude-role minimal -p "fix this bug"
```

## Configuration

Each role is a JSON file with MCP server definitions:

```json
{
  "mcpServers": {
    "gitea": {
      "type": "http",
      "url": "https://your-mcp-server.example.com/mcp"
    }
  }
}
```

### MCP Server Types

**HTTP MCP** (remote server):
```json
{
  "type": "http",
  "url": "https://mcp.example.com/endpoint"
}
```

**Stdio MCP** (local process):
```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"]
}
```

**SSE MCP** (server-sent events):
```json
{
  "type": "sse",
  "url": "https://mcp.example.com/sse"
}
```

## Customization

1. Copy an existing role as a starting point
2. Add/remove MCP servers for your needs
3. Name it descriptively (e.g., `frontend.json`, `database.json`)

## Example MCP Servers

| Server | Purpose | Example URL |
|--------|---------|-------------|
| gitea | Git forge API | `https://mcp-gitea.example.com/mcp` |
| code-search | Code search (Hound) | `https://mcp-hound.example.com/` |
| memory | Knowledge base | `https://mcp-memory.example.com/mcp` |
| cmdb | IT asset management | `https://mcp-cmdb.example.com/` |
| filesystem | Local file access | (stdio, no URL) |

## Security Notes

- MCP configs may contain URLs to internal services
- Don't commit real URLs to public repositories
- Use `.gitignore` for configs with sensitive URLs
- Consider environment variables for dynamic URLs

## Related

- [Claude Code MCP Documentation](https://docs.anthropic.com/en/docs/claude-code/mcp)
- [MCP Specification](https://modelcontextprotocol.io/)
