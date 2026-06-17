# Factory AI MCP Integration

Status: **Supported** — Factory AI natively supports MCP with both stdio and HTTP transport.

---

## Local Setup (stdio)

The simplest configuration — Factory runs the AIWG MCP server as a local process:

```bash
# Auto-configure
aiwg mcp install factory
```

This creates `~/.factory/mcp.json`:

```json
{
  "mcpServers": {
    "aiwg": {
      "type": "stdio",
      "command": "aiwg",
      "args": ["mcp", "serve"],
      "disabled": false
    }
  }
}
```

### Project-Level Configuration

For team-shared MCP config, create `.factory/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "aiwg": {
      "type": "stdio",
      "command": "aiwg",
      "args": ["mcp", "serve"],
      "disabled": false
    }
  }
}
```

Project-level config is lower priority than user-level — personal overrides apply.

---

## Remote Setup (HTTP)

For environments where Factory droids execute remotely (cloud sessions, CI), use HTTP transport with a tunnel:

### With ngrok

```bash
# 1. Start AIWG MCP server with HTTP transport
aiwg mcp serve --transport http --port 3100

# 2. Expose via tunnel
ngrok http 3100
```

### With Cloudflare Tunnel

```bash
# 1. Start AIWG MCP server
aiwg mcp serve --transport http --port 3100

# 2. Expose via Cloudflare
cloudflared tunnel --url http://localhost:3100
```

### Configure Factory

```json
{
  "mcpServers": {
    "aiwg": {
      "type": "http",
      "url": "https://your-tunnel-url.ngrok.io",
      "headers": {
        "Authorization": "Bearer ${AIWG_MCP_TOKEN}"
      },
      "disabled": false
    }
  }
}
```

---

## Configuration Schema

| Field | Applies To | Description |
|---|---|---|
| `type` | Both | `"stdio"` or `"http"` |
| `disabled` | Both | Boolean toggle (default: `false`) |
| `disabledTools` | Both | Array of specific tool names to exclude |
| `command` | stdio | Executable to run |
| `args` | stdio | Array of arguments |
| `env` | stdio | Environment variable map (supports `${VAR}` expansion) |
| `url` | http | Remote endpoint URL |
| `headers` | http | HTTP headers (e.g., auth tokens) |

---

## Config File Locations

| Level | Path | Priority |
|---|---|---|
| User | `~/.factory/mcp.json` | Higher — personal overrides |
| Project | `.factory/mcp.json` | Lower — team-shared, commit to git |

---

## MCP Registry

Factory includes a built-in registry of 40+ pre-configured MCP servers:

```text
/mcp
```

Browse and install servers for:

| Category | Examples |
|---|---|
| Dev Tools | Sentry, Playwright, Hugging Face |
| Project Mgmt | Notion, Linear, ClickUp, Monday |
| Payments | Stripe, PayPal |
| Design | Figma, Canva |
| Infrastructure | Netlify, Vercel |
| Data | Airtable, HubSpot, MongoDB |

OAuth-based servers use a browser-prompt flow with tokens stored in the system keyring.

---

## AIWG MCP Tools Exposed

When connected, Factory droids gain access to AIWG MCP tools:

| Tool | Purpose |
|---|---|
| `discover` | Find AIWG capabilities |
| `command-run` | Execute allow-listed AIWG CLI commands |
| `artifact-read` | Read from `.aiwg/` artifact directory |
| `artifact-write` | Write to `.aiwg/` artifact directory |
| `template-render` | Render AIWG templates |
| `agent-list` | List available agents |

`workflow-run` remains registered only as a deprecated compatibility stub. Enable `AIWG_MCP_TOOLSETS=flows,missions` for first-class Flow and Mission tools.

---

## Troubleshooting

**MCP not connecting?**
```text
/mcp
# Check AIWG server status — toggle disabled/enabled
```

**Stdio server not starting?**
```bash
# Verify aiwg is in PATH
which aiwg

# Test server manually
aiwg mcp serve
```

**HTTP transport issues?**
```bash
# Test tunnel connectivity
curl https://your-tunnel-url.ngrok.io/health
```

---

## Related Resources

- [Factory Quick Start](factory-quickstart.md) — Full AIWG + Factory integration
- [Cross-Platform Overview](cross-platform-overview.md) — All provider comparison
- [Claude MCP Sidecar](claude-mcp-sidecar.md) — Reference sidecar implementation
