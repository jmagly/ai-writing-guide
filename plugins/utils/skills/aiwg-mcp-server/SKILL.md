---
namespace: aiwg
name: aiwg-mcp-server
platforms: [all]
description: Manage the AIWG MCP server — start it, configure clients, and maintain the registered server registry
---

# AIWG MCP Server

You manage the AIWG MCP (Model Context Protocol) server — starting it, configuring clients, and maintaining the registered server registry.

> **Note**: This skill manages AIWG's own MCP server. For platform-native MCP management, use the platform's built-in `/mcp` command instead.

## Triggers

Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "expose aiwg over mcp" → serve
- "hook up claude desktop" → install claude
- "register external server" → add
- "what does aiwg mcp expose" → info
- "which mcp servers are registered" → list

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| Start server | "start the MCP server" | Run `aiwg mcp serve` |
| Configure client | "configure MCP for Claude Desktop" | Run `aiwg mcp install claude` |
| Add server | "add the filesystem MCP server" | Run `aiwg mcp add <ref>` |
| Remove server | "remove the git MCP server" | Run `aiwg mcp remove git` |
| List servers | "what MCP servers are registered?" | Run `aiwg mcp list` |
| Capabilities | "what can the AIWG MCP server do?" | Run `aiwg mcp info` |

## Behavior

When triggered:

1. **Identify the subcommand**:
   - Is the user starting the server, configuring a client, or managing the registry?
   - Is a specific client or server reference mentioned?

2. **Run the appropriate command**:

   ```bash
   # Start the MCP server (foreground)
   aiwg mcp serve

   # Configure Claude Desktop
   aiwg mcp install claude

   # Configure another client
   aiwg mcp install <client>

   # Add an external MCP server to AIWG's registry
   aiwg mcp add <mcp-server-ref>

   # Remove a registered MCP server
   aiwg mcp remove <name>

   # List all registered MCP servers
   aiwg mcp list

   # Show AIWG MCP server capabilities
   aiwg mcp info
   ```

3. **Report the result** — summarize what was configured or what the server exposes.

## Examples

### Example 1: Start the server

**User**: "Start the MCP server"

**Extraction**: Serve subcommand, no options

**Action**:
```bash
aiwg mcp serve
```

**Response**: "MCP server started. Listening on stdio. Exposes 50 tools mapped from AIWG CLI commands. Connect your MCP client to use AIWG capabilities."

### Example 2: Configure Claude Desktop

**User**: "Configure MCP for Claude Desktop"

**Extraction**: Install for claude client

**Action**:
```bash
aiwg mcp install claude
```

**Response**: "Claude Desktop configured. Added AIWG MCP server entry to ~/Library/Application Support/Claude/claude_desktop_config.json. Restart Claude Desktop to activate."

### Example 3: Add an external server

**User**: "Add the filesystem MCP server from @modelcontextprotocol/server-filesystem"

**Extraction**: Add subcommand, ref = @modelcontextprotocol/server-filesystem

**Action**:
```bash
aiwg mcp add @modelcontextprotocol/server-filesystem
```

**Response**: "Registered filesystem MCP server. It will be available as 'filesystem' in `aiwg mcp list`."

### Example 4: List registered servers

**User**: "Which MCP servers are registered?"

**Extraction**: List subcommand

**Action**:
```bash
aiwg mcp list
```

**Response**: "2 MCP servers registered: aiwg (built-in), filesystem (@modelcontextprotocol/server-filesystem)."

### Example 5: Show capabilities

**User**: "What does the AIWG MCP server expose?"

**Extraction**: Info subcommand

**Action**:
```bash
aiwg mcp info
```

**Response**: "AIWG MCP server exposes 50 tools (one per CLI command), 5 resources (framework artifacts, index, catalog), and 3 prompts (intake-wizard, security-review, architecture-baseline)."

## Clarification Prompts

If the user's intent is ambiguous:

- "Are you trying to start the server locally, or configure an MCP client to connect to it?"
- "Which client should I configure? (e.g., claude, cursor, opencode)"

## References

- @$AIWG_ROOT/src/cli/handlers/subcommands.ts — MCP subcommand handler
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference (mcp section)
