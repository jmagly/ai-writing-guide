# Model Context Protocol (MCP) Reference

> Standard protocol for AI-tool integrations used by Claude Code and other platforms.

**Last Updated**: 2026-01-26
**Status**: Stub - Needs expansion
**Maintainer**: AIWG Team

---

## Quick Reference

| Resource | Link |
|----------|------|
| Official Spec | https://modelcontextprotocol.io |
| GitHub | https://github.com/modelcontextprotocol |
| Server Registry | https://github.com/modelcontextprotocol/servers |
| TypeScript SDK | https://github.com/modelcontextprotocol/typescript-sdk |
| Python SDK | https://github.com/modelcontextprotocol/python-sdk |

---

## Overview

Model Context Protocol (MCP) is an open standard for connecting AI assistants to external tools and data sources. It provides:

- **Standardized tool interface** - Consistent way to expose tools to AI
- **Resource access** - Read data from external sources
- **Prompt templates** - Reusable prompt snippets
- **Sampling** - Let servers request LLM completions

---

## Core Concepts

### Transport Layers

| Transport | Use Case |
|-----------|----------|
| **stdio** | Local processes, CLI tools |
| **HTTP+SSE** | Remote servers, web services |

### Message Types

| Type | Direction | Purpose |
|------|-----------|---------|
| `initialize` | Client → Server | Establish connection |
| `tools/list` | Client → Server | Discover available tools |
| `tools/call` | Client → Server | Execute a tool |
| `resources/list` | Client → Server | List available resources |
| `resources/read` | Client → Server | Read resource content |
| `prompts/list` | Client → Server | List prompt templates |
| `prompts/get` | Client → Server | Get prompt template |

---

## Server Configuration

### Claude Code (.mcp.json)

```json
{
  "mcpServers": {
    "server-name": {
      "command": "node",
      "args": ["./server.js"],
      "env": {
        "API_KEY": "${API_KEY}"
      }
    }
  }
}
```

### Server Types

| Type | Transport | Example |
|------|-----------|---------|
| Local Process | stdio | `node ./server.js` |
| Python Module | stdio | `python -m mcp_server` |
| npx Package | stdio | `npx @org/mcp-server` |

---

## Building MCP Servers

### TypeScript Quickstart

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server({
  name: "my-server",
  version: "1.0.0"
}, {
  capabilities: {
    tools: {}
  }
});

server.setRequestHandler("tools/list", async () => ({
  tools: [{
    name: "my_tool",
    description: "Does something useful",
    inputSchema: {
      type: "object",
      properties: {
        input: { type: "string" }
      }
    }
  }]
}));

server.setRequestHandler("tools/call", async (request) => {
  if (request.params.name === "my_tool") {
    return { content: [{ type: "text", text: "Result" }] };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

### Python Quickstart

```python
from mcp.server import Server
from mcp.server.stdio import stdio_server

server = Server("my-server")

@server.list_tools()
async def list_tools():
    return [{
        "name": "my_tool",
        "description": "Does something useful",
        "inputSchema": {
            "type": "object",
            "properties": {"input": {"type": "string"}}
        }
    }]

@server.call_tool()
async def call_tool(name: str, arguments: dict):
    if name == "my_tool":
        return [{"type": "text", "text": "Result"}]

async def main():
    async with stdio_server() as (read, write):
        await server.run(read, write)
```

---

## Popular MCP Servers

| Server | Package | Purpose |
|--------|---------|---------|
| GitHub | `@modelcontextprotocol/server-github` | GitHub API |
| Gitea | `@anthropics/mcp-server-gitea` | Gitea API |
| Filesystem | `@modelcontextprotocol/server-filesystem` | File operations |
| PostgreSQL | `@modelcontextprotocol/server-postgres` | Database |
| Slack | `@modelcontextprotocol/server-slack` | Messaging |
| Brave Search | `@modelcontextprotocol/server-brave-search` | Web search |

---

## AIWG Integration

### MCPSmith Agent

AIWG includes MCPSmith for creating MCP servers dynamically:

```bash
# Generate MCP server definition
/smith-mcpdef

# Creates Docker-based MCP server
```

See: @.aiwg/architecture/mcpsmith-architecture.md

---

## TODO: Expand This Reference

- [ ] Complete protocol specification details
- [ ] Add error handling patterns
- [ ] Document authentication patterns
- [ ] Add AIWG-specific MCP servers
- [ ] Include testing strategies

---

## References

- @.aiwg/references/platforms/claude-code.md - Claude Code MCP integration
- @.aiwg/architecture/mcpsmith-architecture.md - MCPSmith design
- https://modelcontextprotocol.io/docs - Official documentation
