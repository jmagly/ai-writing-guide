# Warp Terminal MCP Sidecar Guide

Connect AIWG to Warp Terminal AI as an MCP sidecar for structured workflow access.

> **This is not a standard provider deployment.** Warp Terminal is a terminal application with integrated AI features; it cannot be spawned programmatically from the CLI, so it has no dangerous mode flag. The MCP sidecar is the only viable path to unrestricted AIWG tool access from within Warp. The architecture is `Warp Terminal AI → MCP → AIWG Server`.

---

## Architecture

```
Warp Terminal AI (host)
  ├── AI Command Palette and natural language
  ├── WARP.md (aggregated agents + commands)
  ├── .warp/skills/ (natively discovered)
  └── MCP connection
        └── AIWG MCP Server (sidecar)
              └── .aiwg/ artifacts, workflows, templates
```

**Warp owns**: AI Command Palette, WARP.md aggregation, `.warp/` directory, terminal session context.

**AIWG owns**: workflow execution, artifact output in `.aiwg/`, template rendering, agent role definitions.

**MCP is the seam.** Warp already receives AIWG agent and command definitions via `aiwg use sdlc --provider warp`. The MCP sidecar adds structured, callable AIWG tooling on top of that foundation — without replacing it.

---

## Prerequisites

- Warp Terminal installed and running ([warp.dev](https://warp.dev))
- AIWG installed: `npm install -g aiwg`
- A project with AIWG deployed for Warp:

```bash
cd /path/to/your/project
aiwg use sdlc --provider warp
```

If you have not done the base deployment yet, complete the [Warp Terminal Quick Start](warp-terminal-quickstart.md) first, then return here.

---

## Install MCP Configuration

Warp does not use a configuration file for MCP servers. Registration is done through the Warp UI or via a slash command inside Warp.

### Option A: Slash command (fastest)

Open Warp Terminal and run the `/add-mcp` command in the AI input:

```text
/add-mcp
```

When prompted, provide the server details:

- **Name**: `aiwg`
- **Transport**: `stdio`
- **Command**: `aiwg`
- **Args**: `mcp serve`

### Option B: Settings panel

1. Open Warp Terminal
2. Go to **Settings > AI > MCP Servers**
3. Click **Add Server**
4. Fill in the fields:
   - **Name**: `aiwg`
   - **Transport**: `stdio`
   - **Command**: `aiwg`
   - **Args**: `mcp serve`
5. Save and confirm

### Transport types

Warp supports two MCP transport types:

| Transport | When to use | Fields required |
|---|---|---|
| `stdio` | Local process (recommended for AIWG) | Command, args |
| Streamable HTTP / SSE | Remote or hosted MCP server | URL, optional headers |

Use `stdio` with `aiwg mcp serve` for the standard local setup.

### Verify the connection

After adding the server, ask Warp AI to confirm the tools are available:

```text
What AIWG tools are available?
```

Warp AI should list the available tools. No restart is required — Warp picks up MCP servers without restarting.

**Verify AIWG MCP server runs independently:**

```bash
aiwg mcp info    # Show capabilities
aiwg version     # Confirm CLI is in PATH
```

If Warp AI cannot see the tools, confirm that `aiwg` is accessible from the PATH that Warp uses when launching processes.

---

## Configure Tool Permissions

The default connection exposes the full AIWG MCP surface. Restricting to a lean tool set keeps Warp AI's context budget manageable and reduces unintended tool calls.

Warp controls MCP tool access through Agent Profile permissions, not a configuration file.

### Setting tool permissions

1. Open **Settings > AI > Agents > Profiles**
2. Select the profile you use for AIWG work (or create a new one)
3. Under the `aiwg` MCP server entry, configure an **allow list**:
   - `discover`
   - `command-run`
   - `artifact-read`
   - `artifact-write`
   - `template-render`
   - `agent-list`
4. Set any other AIWG tools to **deny**
5. Save the profile

Permissions are set per MCP server within each Agent Profile, so you can have different allow lists for different working contexts.

**Why this allow list:** Each MCP server exposes its tool schemas into the Warp AI context window before any tool is called. A lean allow list reduces that overhead substantially while preserving discovery, CLI dispatch, artifact IO, templates, and agents. Enable `AIWG_MCP_TOOLSETS=flows` only when you need first-class Flow tools.

---

## Run Your First Workflow

Ask Warp AI to create a structured artifact that routes through the AIWG MCP server:

```text
Create an architecture decision record for choosing PostgreSQL over MongoDB
for our user service. Save it as a persistent AIWG artifact.
```

**What should happen:**

1. Warp AI recognizes this as a structured artifact request
2. Warp AI calls `command-run`, `template-render`, or `artifact-write` via MCP
3. AIWG creates the artifact in `.aiwg/architecture/`
4. Warp AI reports the result

**Verify the artifact was written:**

```bash
ls .aiwg/architecture/
```

You should see the new ADR file.

---

## Context Budget

Understanding the token footprint helps you configure tool permissions for your needs.

> **Note:** The token estimates below are approximations. Warp does not publish its context window sizes, and the actual limit depends on the AI model you have selected in Warp settings. The general principle holds regardless of the exact numbers: fewer exposed tools means more context available for actual work.

### With lean allow list (recommended)

| Component | Estimated tokens |
|---|---|
| Warp AI system context | ~1,500 |
| WARP.md (aggregated agents + commands) | ~4,000 |
| AIWG MCP schema (lean tools) | bounded |
| **Total overhead** | **~8,500** |
| **Remaining for work** | larger share of available context |

### Without allow list (full surface)

| Component | Estimated tokens |
|---|---|
| Warp AI system context | ~1,500 |
| WARP.md (aggregated agents + commands) | ~4,000 |
| AIWG MCP schema (core + opt-in toolsets) | larger |
| **Total overhead** | **~17,500** |
| **Remaining for work** | smaller share of available context |

The allow list has a meaningful impact: the full schema overhead roughly doubles compared to the 5-tool configuration, leaving significantly less context available before any conversation begins.

---

## Session Persistence

MCP servers registered in Warp persist across restarts. If the AIWG MCP server was running when Warp closed, Warp will auto-restart it on the next launch. You do not need to re-register or re-start the server manually between sessions.

---

## MCP Logs

If you need to debug MCP server behavior, log files are written to:

**macOS:**
```
~/Library/Group Containers/2BBY89MBSN.dev.warp/Library/Application Support/dev.warp.Warp-Stable/mcp
```

**Linux:**
```
${XDG_STATE_HOME:-$HOME/.local/state}/warp-terminal/mcp
```

Each MCP server gets its own log file within that directory.

---

## Advanced — Enable Prompts

After the basic integration is stable, you can enable AIWG prompt exposure for richer workflow access.

In Warp's MCP server configuration (Settings > AI > MCP Servers), look for the option to expose **prompts** from the `aiwg` server and enable it. This adds AIWG workflow prompts as callable templates from within Warp AI.

Only enable prompts after the base tool integration in the previous sections is working reliably. Adding prompts increases context overhead — monitor your available context if you enable this.

---

## Validation Checklist

Run these checks to confirm the integration is working:

| Check | Action | Expected |
|---|---|---|
| Connectivity | Ask "What AIWG tools are available?" | Tools listed |
| Routing (direct) | Ask a one-off terminal question | Warp answers directly (no MCP call) |
| Routing (artifact) | Ask for a requirements document | Routes to AIWG via MCP |
| Artifact write | Check `.aiwg/` after workflow | New artifact file exists |
| Artifact read | Ask Warp AI to read an existing artifact | Uses `artifact-read` |
| Failure mode | Run `aiwg mcp serve` in isolation, confirm it starts | No errors |

---

## Troubleshooting

**AIWG tools not visible in Warp AI:**

- Verify `aiwg mcp serve` runs successfully on its own
- Ensure `aiwg` is in your PATH (check `which aiwg`)
- Confirm the server is registered in Settings > AI > MCP Servers
- Check MCP logs for startup errors (see [MCP Logs](#mcp-logs) above)

**Artifacts not appearing in `.aiwg/`:**

- Confirm AIWG is initialized in the project (`aiwg use sdlc --provider warp`)
- Check that `artifact-write` is in the tool allow list for your Agent Profile
- Verify Warp's working directory matches the project root

**Context growing too fast:**

- Keep the allow list lean unless you have a specific reason to add more tools or toolsets
- Disable prompts and resources in the MCP server settings if enabled
- Keep WARP.md lean — avoid adding large blocks of project context to the aggregated file

---

## Related Resources

- [Warp Terminal Quick Start](warp-terminal-quickstart.md) — base provider deployment (prerequisite)
- [Hermes MCP Sidecar Guide](hermes-quickstart.md) — reference architecture this guide follows
- [AIWG MCP server reference](https://github.com/jmagly/aiwg/blob/main/docs/agents/cli-reference.md#mcp)
- [Warp Terminal Documentation](https://docs.warp.dev)
