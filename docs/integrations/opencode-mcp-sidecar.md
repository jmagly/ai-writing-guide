# OpenCode MCP Sidecar Quick Start

Connect AIWG to OpenCode as an MCP sidecar for unrestricted workflow access.

> **Why a sidecar?** OpenCode has no confirmed dangerous mode flag. The MCP sidecar (`aiwg mcp serve`) is the recommended path to unrestricted AIWG tool access — artifact management, workflow execution, and template rendering — without modifying OpenCode's default permission model.

---

## Architecture

```
OpenCode CLI (host)
  ├── Conversation, code generation
  ├── Built-in tools
  └── MCP connection
        └── AIWG MCP Server (sidecar)
              └── .aiwg/ artifacts, workflows, templates
```

**OpenCode owns**: conversation flow, code editing, session context.

**AIWG owns**: workflow execution, artifact output in `.aiwg/`, template rendering, agent definitions.

**MCP is the seam.** OpenCode calls AIWG tools via the protocol boundary — no filesystem coupling, no context duplication.

---

## Prerequisites

- OpenCode installed (`curl -fsSL https://opencode.ai/install | sh`)
- AIWG installed (`npm install -g aiwg`)
- A project with `aiwg use sdlc --provider opencode` already deployed

---

## Part 1: Install MCP Configuration

```bash
# Generate .opencode.json with AIWG server config
aiwg mcp install opencode
```

This creates or merges into `.opencode.json` in your project root:

```json
{
  "mcpServers": {
    "aiwg": {
      "type": "stdio",
      "command": "aiwg",
      "args": ["mcp", "serve"]
    }
  }
}
```

OpenCode uses the `"mcpServers"` key (matching the MCP spec) and `"type": "stdio"` for process-based servers. The `command` and `args` fields follow standard `stdio` transport format.

---

## Part 2: Configure Tool Whitelist (Recommended)

For optimal context usage, limit the exposed tools. The minimal config template at `agentic/code/frameworks/sdlc-complete/templates/opencode/opencode-mcp-minimal.json` uses the recommended lean whitelist.

OpenCode's MCP whitelist is configured via the AIWG server environment. Edit your `.opencode.json`:

```json
{
  "mcpServers": {
    "aiwg": {
      "type": "stdio",
      "command": "aiwg",
      "args": ["mcp", "serve"],
      "env": ["AIWG_MCP_TOOLSETS=flows"]
    }
  }
}
```

**Why whitelist?** Each MCP tool adds schema overhead to the context window. Keep only the tools you need enabled in OpenCode's MCP settings; use `AIWG_MCP_TOOLSETS=flows` only when first-class Flow tools are needed.

---

## Part 3: Verify the Connection

Start OpenCode in your project directory and ask:

```bash
opencode
```

Then in the OpenCode prompt:

```
What AIWG tools are available?
```

OpenCode should list the configured AIWG tools. If not, run `aiwg mcp serve` independently first to confirm the server starts without error.

---

## Part 4: Run Your First Workflow

Ask OpenCode:

```
Create an architecture decision record for choosing REST over GraphQL for our API. Save it as an AIWG artifact.
```

**What should happen:**

1. OpenCode calls `command-run`, `flow-run`, or `artifact-write` via MCP
2. AIWG creates the artifact in `.aiwg/architecture/`
3. OpenCode receives the result

**Verify:**

```bash
ls .aiwg/architecture/
```

OpenCode also supports non-interactive mode, which works well with the sidecar:

```bash
opencode run "Create an ADR for choosing PostgreSQL over MongoDB for the user service"
```

---

## Part 5: Context Budget

Understanding the token budget helps you configure the whitelist appropriately.

### With lean whitelist (recommended)

| Component | Tokens |
|---|---|
| OpenCode system prompt | ~2,000 |
| AIWG MCP schema (lean tools) | bounded |
| **Total AIWG overhead** | **~3,000** |

### Without whitelist (full surface)

| Component | Tokens |
|---|---|
| OpenCode system prompt | ~2,000 |
| AIWG MCP schema (core + opt-in toolsets) | larger |
| **Total AIWG overhead** | **~12,000** |

The lean whitelist reduces MCP context overhead, leaving more room for code, conversation, and artifact content.

---

## Part 6: Advanced — Full Configuration

After the basic integration is stable, the full configuration template at `agentic/code/frameworks/sdlc-complete/templates/opencode/opencode-mcp-full.jsonc` adds comments and covers all available options:

```jsonc
{
  // OpenCode + AIWG MCP — Full Configuration
  // Includes all tools with prompts and resources enabled
  "mcpServers": {
    "aiwg": {
      "type": "stdio",
      "command": "aiwg",
      "args": ["mcp", "serve"]
    }
  }
}
```

Only expand beyond the minimal config after Part 4 is working reliably.

---

## Validation Checklist

| Check | Action | Expected |
|---|---|---|
| Connectivity | Ask OpenCode "list AIWG tools" | Configured AIWG tools listed |
| Artifact write | Ask for a requirements doc | File appears in `.aiwg/` |
| Artifact read | Ask to read an artifact | Uses `artifact-read` |
| Non-interactive | Run `opencode run "<prompt>"` | Returns artifact path |
| Failure mode | Stop `aiwg mcp serve`, try again | Graceful error message |

---

## Troubleshooting

**AIWG tools not visible:**

- Verify `aiwg mcp serve` runs successfully standalone
- Check `opencode.json` syntax (JSON is whitespace-sensitive; `.jsonc` allows comments)
- Confirm the config file is in the project root or `.opencode/` directory
- Restart OpenCode after config changes

**Context filling up:**

- Verify the tool whitelist environment variable is set
- Confirm you are using the minimal config template, not the full surface

**Artifacts not appearing:**

- Ensure AIWG is initialized in the project (`aiwg use sdlc --provider opencode`)
- Verify the working directory matches the project root
- Check that `artifact-write` is included in the tool list

**Non-interactive mode not working:**

- Confirm the `opencode run` subcommand is available in your installed version
- Test interactively first to confirm the MCP connection before using `opencode run`

---

## Related Resources

- [OpenCode Quick Start](opencode-quickstart.md) — Basic AIWG + OpenCode integration
- [Hermes MCP Sidecar](hermes-quickstart.md) — Reference sidecar implementation
- [AIWG MCP server reference](https://github.com/jmagly/aiwg/blob/main/docs/agents/cli-reference.md#mcp)
