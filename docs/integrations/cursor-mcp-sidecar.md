# Cursor MCP Sidecar Quick Start

Connect AIWG to Cursor as an MCP sidecar for unrestricted workflow access.

> **Why a sidecar?** Cursor is IDE-integrated and cannot be spawned from the CLI. The MCP sidecar (`aiwg mcp serve`) runs as a user-level shell process with full filesystem permissions. Cursor connects to it via MCP and calls whitelisted AIWG tools — giving you unrestricted artifact management without leaving the IDE.

---

## Architecture

```
Cursor IDE (host)
  ├── AI panel, chat, code generation
  ├── Built-in tools
  └── MCP connection
        └── AIWG MCP Server (sidecar)
              └── .aiwg/ artifacts, workflows, templates
```

**Cursor owns**: conversation, code editing, file management.

**AIWG owns**: workflow execution, artifact output in `.aiwg/`, template rendering, agent definitions.

**MCP is the seam.** Cursor calls AIWG tools via the protocol boundary — no filesystem coupling, no context duplication.

---

## Prerequisites

- Cursor installed (https://cursor.sh)
- AIWG installed (`npm install -g aiwg`)
- A project with `aiwg use sdlc --provider cursor` already deployed

---

## Part 1: Install MCP Configuration

```bash
# Generate .cursor/mcp.json with AIWG server config
aiwg mcp install cursor
```

This creates or merges into `.cursor/mcp.json`:

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

> **Note:** Cursor supports both project-level (`.cursor/mcp.json`) and global (`~/.cursor/mcp.json`) MCP configuration. The project-level config is recommended for AIWG so it's version-controlled with your project. Cursor also supports `${env:NAME}`, `${workspaceFolder}`, and `${userHome}` variable interpolation in config values.
```

---

## Part 2: Configure Tool Whitelist (Recommended)

For optimal context usage, limit the exposed tools. Edit `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "aiwg": {
      "command": "aiwg",
      "args": ["mcp", "serve"],
      "tools": {
        "include": [
          "discover",
          "command-run",
          "artifact-read",
          "artifact-write",
          "template-render",
          "agent-list"
        ],
        "prompts": false,
        "resources": false
      }
    }
  }
}
```

**Why whitelist?** Each MCP tool adds schema overhead to the context window. The lean whitelist keeps AIWG's footprint bounded while preserving discovery, CLI dispatch, artifact IO, templates, and agents.

> **Cursor 2.4+**: Agents now discover and load MCPs only when needed, reducing token usage automatically. The whitelist is still recommended for explicit control.

A pre-configured template is available at `agentic/code/frameworks/sdlc-complete/templates/cursor/cursor-mcp-minimal.json`.

---

## Part 3: Verify the Connection

1. Restart Cursor (or reload the project)
2. Open the AI panel
3. Ask: "What AIWG tools are available?"
4. Cursor should list the lean whitelisted tools

---

## Part 4: Run Your First Workflow

Ask the Cursor AI panel:

```
Create an architecture decision record for choosing REST over GraphQL for our API. Save it as an AIWG artifact.
```

**What should happen:**

1. Cursor calls `command-run`, `template-render`, or `artifact-write` via MCP
2. AIWG creates the artifact in `.aiwg/architecture/`
3. Cursor receives the result

**Verify:**

```bash
ls .aiwg/architecture/
```

---

## Part 5: Context Budget

Understanding the token budget helps you configure the whitelist appropriately.

### With lean whitelist (recommended)

| Component | Tokens |
|---|---|
| Cursor system prompt | ~2,000 |
| AIWG MCP schema (lean tools) | bounded |
| **Total AIWG overhead** | **~3,000** |

### Without whitelist (full surface)

| Component | Tokens |
|---|---|
| Cursor system prompt | ~2,000 |
| AIWG MCP schema (core + opt-in toolsets) | larger |
| **Total AIWG overhead** | **~12,000** |

The lean whitelist materially reduces MCP context overhead, leaving more room for code, conversation, and artifact content. Enable `AIWG_MCP_TOOLSETS=flows` when you need `flow-list`, `flow-show`, and `flow-run`.

---

## Part 6: Advanced — Enable Prompts

After the basic integration is stable, enable AIWG workflow prompts for richer access:

```json
{
  "mcpServers": {
    "aiwg": {
      "command": "aiwg",
      "args": ["mcp", "serve"],
      "tools": {
        "include": [
          "discover",
          "command-run",
          "artifact-read",
          "artifact-write",
          "template-render",
          "agent-list"
        ],
        "prompts": true,
        "resources": false
      }
    }
  }
}
```

A pre-configured template is available at `agentic/code/frameworks/sdlc-complete/templates/cursor/cursor-mcp-full.json`.

Only enable prompts after Part 4 is working reliably.

---

## Validation Checklist

| Check | Action | Expected |
|---|---|---|
| Connectivity | Ask Cursor "list AIWG tools" | Lean tools listed |
| Artifact write | Ask for a requirements doc | File appears in `.aiwg/` |
| Artifact read | Ask to read an artifact | Uses `artifact-read` |
| Failure mode | Stop `aiwg mcp serve`, try again | Graceful error message |

---

## Troubleshooting

**AIWG tools not visible:**

- Verify `aiwg mcp serve` runs successfully standalone
- Check `.cursor/mcp.json` syntax (JSON is whitespace-sensitive)
- Restart Cursor after config changes

**Context filling up:**

- Verify the tool whitelist is configured
- Set `"resources": false` to suppress resource schemas
- Confirm `"prompts": false` until the baseline integration is stable

**Artifacts not appearing:**

- Ensure AIWG is initialized in the project (`aiwg use sdlc --provider cursor`)
- Verify the working directory matches the project root
- Check that `artifact-write` is in the tool whitelist

---

## Cloud Agent MCP Support

Cursor Cloud Agents (formerly Background Agents) **fully support MCP servers**. This means AIWG workflows can run in cloud agent mode:

1. Configure your MCP server in the Cloud Agent environment at cursor.com/dashboard/cloud-agents
2. Both HTTP and stdio transports work in Cloud Agent VMs
3. OAuth is supported for authenticated MCP servers

This enables asynchronous AIWG workflow execution without needing a local terminal session.

---

## MCP Debugging

If MCP tools aren't working:

1. Open Output panel: `Cmd+Shift+U` (Mac) / `Ctrl+Shift+U` (Windows/Linux)
2. Select "MCP Logs" from the dropdown
3. Check for connection errors or tool registration issues
4. Servers can be toggled on/off through Settings without removal

---

## Related Resources

- [Cursor Quick Start](cursor-quickstart.md) — Basic AIWG + Cursor integration
- [Cursor Quickstart](cursor-quickstart.md)
- [Hermes MCP Sidecar](hermes-quickstart.md) — Reference sidecar implementation
- [AIWG MCP server reference](../cli-reference.md#mcp)
