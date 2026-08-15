# OpenAI Codex MCP Sidecar — AIWG Tooling Layer

Connect the AIWG MCP server to OpenAI Codex for structured artifact management and workflow tools.

> **This is a tooling layer, not a permission workaround.** Codex already supports `--full-auto` (or `--approval-mode full-auto`) for unrestricted execution. The MCP sidecar adds a complementary layer: structured AIWG tools for artifact management, template rendering, and workflow execution.

> **Version note:** Codex's MCP client support is a newer capability. Verify your Codex CLI version supports MCP before proceeding: `codex --version`. If MCP server config is not recognized, update with `npm install -g @openai/codex`.

---

## Two-Layer Model

| Layer | Flag / Tool | Controls |
|---|---|---|
| **Permission** | `--full-auto` / `--approval-mode full-auto` | Execution scope, approval policy |
| **Tooling** | MCP sidecar (`aiwg mcp serve`) | AIWG artifact tools, workflows, templates |

Both layers are independent. You can use either or both:

| Configuration | Use Case |
|---|---|
| Permission only | Full-auto execution with direct file access |
| Sidecar only | AIWG tools with standard Codex approval prompts |
| Both (recommended) | Full AIWG experience — unrestricted execution + structured tooling |

---

## Architecture

```
Codex CLI (host)
  ├── Conversation, code editing, web search
  ├── --full-auto (permission layer)
  └── MCP connection (tooling layer)
        └── AIWG MCP Server (sidecar)
              ├── discover / command-run
              ├── artifact-read / artifact-write
              ├── template-render
              └── agent-list
```

---

## Setup

### Step 1: Install MCP Configuration

```bash
aiwg mcp install codex
```

This creates or merges into `~/.codex/config.toml`:

```toml
[mcp_servers.aiwg]
command = "aiwg"
args = ["mcp", "serve"]
startup_timeout_sec = 10.0
tool_timeout_sec = 60.0
enabled_tools = [
  "discover",
  "command-run",
  "artifact-read",
  "artifact-write",
  "template-render",
  "agent-list"
]
```

### Full MCP Server Config Schema

Codex supports a richer MCP configuration than the AIWG default above. The complete field set:

```toml
[mcp_servers.my_server]
# Process-based (stdio) servers:
command = "/path/to/server"                # required for stdio
args = ["--flag", "value"]                 # optional
cwd = "/working/dir"                       # optional

# HTTP-based servers (alternative to stdio):
url = "https://my-mcp-server.example.com"  # required for HTTP

# Authentication:
bearer_token_env_var = "MY_TOKEN_VAR"      # recommended (load from env)
http_headers = { "X-Custom" = "val" }      # static headers
env_http_headers = { "Authorization" = "MY_AUTH_ENV_VAR" }  # env-backed headers

# OAuth (for OAuth-capable MCP servers):
oauth_resource = "https://resource.example.com"
scopes = ["read", "write"]

# Environment for the server process:
env = { KEY = "value" }                    # set environment variables
env_vars = ["PATH", "HOME"]               # inherit from current env

# Tool filtering:
enabled_tools = ["search", "fetch"]        # allowlist
disabled_tools = ["dangerous_op"]          # denylist

# Timing:
startup_timeout_sec = 5.0
tool_timeout_sec = 30.0

# Lifecycle:
enabled = true                             # disable without removing
required = false                           # if true, Codex fails to start if unavailable

# Per-tool approval overrides:
[mcp_servers.my_server.tools.search]
approval_mode = "auto"                     # "auto" | "prompt" | "approve"
```

### Step 2: Verify

Start a Codex session and ask: "What AIWG MCP tools are available?"

Codex should list the lean whitelisted tools.

### Step 3: Use Both Layers Together

```bash
# Launch with both layers active
aiwg sdlc-accelerate "My project" --provider codex --dangerous
```

Codex runs with `--full-auto` and has AIWG MCP tools available via the sidecar simultaneously.

---

## What the Sidecar Adds

Without the sidecar, Codex can read and write files directly but has no structured interface to AIWG's artifact system. With it:

| Tool | Purpose |
|---|---|
| `discover` | Find AIWG skills, commands, rules, agents, and Flow wrapper skills |
| `command-run` | Invoke allow-listed AIWG CLI commands programmatically |
| `artifact-read` | Structured read from `.aiwg/` with schema validation |
| `artifact-write` | Structured write to `.aiwg/` with schema validation |
| `template-render` | Fill AIWG templates with project context |
| `agent-list` | Discover and invoke specialized agents by role |

`workflow-run` has been removed. Use `command-run` for general AIWG CLI execution. For first-class YAML Flow tools, start the server with `AIWG_MCP_TOOLSETS=flows` and allow `flow-list`, `flow-show`, and `flow-run`. For Mission tools, use `AIWG_MCP_TOOLSETS=missions` and allow `mission-guide`, `mission-dispatch`, and `mission-status`.

---

## Example Workflows

### SDLC Accelerate with Full Stack

```bash
# Both layers active
aiwg sdlc-accelerate "E-commerce platform" --provider codex --dangerous
```

Codex runs with full execution permissions and can call AIWG MCP tools for structured artifact management.

### Non-Interactive / CI Mode with Sidecar

Because Codex supports non-interactive execution, the sidecar is especially useful in automation pipelines:

```bash
# Non-interactive full-auto with MCP tools available
codex --full-auto "Create an ADR for our database choice and save it to .aiwg/architecture/"
```

Codex calls `template-render` and `artifact-write` via MCP to produce a schema-validated artifact without prompting.

### Agent Loop with Sidecar

```bash
aiwg ralph "Fix all failing tests" --completion "npm test passes" --provider codex --dangerous
```

The agent loop agent can use `artifact-read` to check existing requirements and `artifact-write` to update test documentation alongside its direct file edits.

### Artifact-Driven Workflow (Standard Approval Mode)

Without `--full-auto`, the sidecar still provides structured access:

```bash
# Start Codex normally, with AIWG tools available
codex
```

Then ask Codex to:

```
Create a Software Architecture Document for this project using AIWG templates
and save it to .aiwg/architecture/.
```

Codex calls `template-render` to generate the document and `artifact-write` to persist it with schema validation.

---

## Configuration Reference

The `~/.codex/config.toml` entry installed by `aiwg mcp install codex` fits within the existing Codex config structure. If you have an existing config, the command merges the `[mcp_servers.aiwg]` block without overwriting other settings.

Key fields:

| Field | Description |
|---|---|
| `startup_timeout_sec` | Maximum seconds to wait for MCP server to start |
| `tool_timeout_sec` | Maximum seconds for a single tool call to complete |
| `enabled_tools` | Whitelist of AIWG tools exposed to Codex (5-tool default) |

**Why the 5-tool whitelist:** MCP tool schemas add context overhead for every session. The whitelist keeps AIWG's footprint to the core artifact and workflow tools, leaving more context available for conversation and code.

---

## Verification Checklist

| Check | Action | Expected |
|---|---|---|
| MCP connection | Ask "list AIWG tools" | Lean core tools listed |
| Artifact write | Ask to create an ADR | File appears in `.aiwg/architecture/` |
| Permission layer | Run a command without approval | No prompt (with `--full-auto`) |
| Combined | Run a workflow that reads requirements and writes code | Both layers work together |
| Non-interactive | `codex --full-auto "create a test plan artifact"` | Artifact written, exits cleanly |

---

## Troubleshooting

**AIWG tools not visible in Codex:**
- Verify your Codex version supports MCP: `codex --version` (update if needed: `npm install -g @openai/codex`)
- Check `~/.codex/config.toml` has the `[mcp_servers.aiwg]` block
- Verify `aiwg mcp serve` runs successfully standalone: `aiwg mcp info`
- Restart Codex after config changes

**Permission prompts still appearing with the sidecar:**
- The sidecar does not grant execution permissions — that is the `--full-auto` flag
- Use `--full-auto` or `--approval-mode full-auto` for unrestricted execution

**Artifacts not appearing in `.aiwg/`:**
- Ensure AIWG is initialized in the project: `aiwg use sdlc --provider codex`
- Check that `artifact-write` is in `enabled_tools`
- Verify the working directory matches the project root

**TOML syntax errors:**
- TOML is whitespace-insensitive but bracket-sensitive — verify section headers like `[mcp_servers.aiwg]` are on their own lines
- Use `codex --debug-config` to inspect the effective configuration

---

## Related Resources

- [OpenAI Codex Quick Start](codex-quickstart.md) — Basic AIWG + Codex integration
- [Hermes MCP Sidecar](hermes-quickstart.md) — Reference sidecar implementation
- [AIWG MCP server reference](https://github.com/jmagly/aiwg/blob/main/docs/cli/reference.md#mcp)
