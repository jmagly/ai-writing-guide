# OpenClaw MCP Sidecar Quick Start

Connect AIWG to OpenClaw as an MCP sidecar for unrestricted workflow access.

> **Why a sidecar?** OpenClaw's native skills handle quick single-step operations. The MCP sidecar (`aiwg mcp serve`) provides the full AIWG workflow engine — artifact management, multi-agent orchestration, template rendering, and staged SDLC execution. Use both together for maximum flexibility.

---

## Architecture

```
OpenClaw (host)
  ├── Conversation flow, tool orchestration, session state
  ├── Native skills (~/.openclaw/skills/)
  ├── Behaviors (~/.openclaw/behaviors/)
  └── MCP connection
        └── AIWG MCP Server (sidecar)
              └── .aiwg/ artifacts, workflows, templates
```

**OpenClaw owns**: conversation flow, tool orchestration, session state, user-facing chat.

**AIWG owns**: workflow execution, artifact output in `.aiwg/`, template rendering, agent definitions.

**MCP is the seam.** OpenClaw calls AIWG tools via the protocol boundary — no filesystem coupling, no context duplication.

---

## Prerequisites

- OpenClaw installed ([docs.openclaw.ai](https://docs.openclaw.ai))
- AIWG installed (`npm install -g aiwg`)
- A project with `aiwg use sdlc --provider openclaw` already deployed

---

## Part 1: Install MCP Configuration

```bash
# Generate MCP config with AIWG server entry
aiwg mcp install openclaw
```

This creates or merges into `~/.openclaw/config.yaml`:

```yaml
mcp_servers:
  aiwg:
    command: "aiwg"
    args: ["mcp", "serve"]
    env: {}
```

> **Note:** OpenClaw supports both user-level (`~/.openclaw/config.yaml`) and workspace-level MCP configuration. The user-level config makes AIWG available across all projects.

---

## Part 2: Configure Tool Whitelist (Recommended)

For optimal context usage, limit the exposed tools. Edit the MCP config:

```yaml
mcp_servers:
  aiwg:
    command: "aiwg"
    args: ["mcp", "serve"]
    tools:
      include:
        - discover
        - command-run
        - artifact-read
        - artifact-write
        - template-render
        - agent-list
```

**Why whitelist?** Each MCP tool adds schema overhead to the context window. The lean whitelist keeps discovery, CLI dispatch, artifact IO, templates, and agents available without enabling every opt-in subsystem.

---

## Part 3: Verify the Connection

1. Restart OpenClaw (or run `openclaw reload`)
2. Ask: "What AIWG tools are available?"
3. OpenClaw should list the whitelisted tools

```bash
# Verify via CLI
openclaw tools list | grep aiwg
```

---

## Part 4: Run Your First Workflow

Ask OpenClaw:

```
Create an architecture decision record for choosing REST over GraphQL for our API. Save it as an AIWG artifact.
```

**What should happen:**

1. OpenClaw calls `command-run`, `template-render`, or `artifact-write` via MCP
2. AIWG creates the artifact in `.aiwg/architecture/`
3. OpenClaw receives the result

**Verify:**

```bash
ls .aiwg/architecture/
```

---

## Part 5: Context Budget

Understanding the token budget helps you configure the whitelist appropriately.

### With 5-tool whitelist (recommended)

| Component | Tokens |
|---|---|
| OpenClaw system prompt | ~2,000 |
| AIWG MCP schema (lean tools) | bounded |
| **Total AIWG overhead** | **~3,000** |

### Without whitelist (full surface)

| Component | Tokens |
|---|---|
| OpenClaw system prompt | ~2,000 |
| AIWG MCP schema (20+ tools) | ~12,000 |
| **Total AIWG overhead** | **~12,000** |

The 5-tool whitelist is a 75% reduction in MCP context overhead.

---

## Part 6: Routing — MCP vs Native Skills

When both modes are active, route requests based on complexity:

| Route to MCP when | Use native skills when |
|---|---|
| SDLC phase work needed | Quick single-step operations |
| Artifact generation required | Skill trigger phrase matches |
| Multi-agent orchestration requested | No artifact persistence needed |
| Template-driven output needed | Voice profile application |
| Agent loops or iterative execution | Content validation |

---

## Validation Checklist

| Check | Action | Expected |
|---|---|---|
| Connectivity | Ask OpenClaw "list AIWG tools" | Configured AIWG tools listed |
| Artifact write | Ask for a requirements doc | File appears in `.aiwg/` |
| Artifact read | Ask to read an artifact | Uses `artifact-read` |
| Failure mode | Stop `aiwg mcp serve`, try again | Graceful error message |

---

## Troubleshooting

**AIWG tools not visible:**

- Verify `aiwg mcp serve` runs successfully standalone
- Check `~/.openclaw/config.yaml` MCP server syntax
- Restart OpenClaw after config changes

**Context filling up:**

- Verify the tool whitelist is configured
- Reduce exposed tools to the 5-tool minimum

**Artifacts not appearing:**

- Ensure AIWG is initialized in the project (`aiwg use sdlc --provider openclaw`)
- Verify the working directory matches the project root
- Check that `artifact-write` is in the tool whitelist

---

## Related Resources

- [OpenClaw Quick Start](openclaw-quickstart.md) - Basic AIWG + OpenClaw integration
- [OpenClaw Guide](../openclaw-guide.md)
- [OpenClaw Integration Guide](../openclaw-guide.md) - Comprehensive guide with routing advice
- [Behaviors Guide](../behaviors-guide.md) - Behaviors format and authoring
- [AIWG MCP server reference](../cli-reference.md#mcp)
