---
audience: agent-operator
publication: agent-reference
stable_id: aiwg.agent-reference.provider.cursor
---

# Cursor Operational Reference

> **First time using AIWG?** Begin with [Install, Connect, and Verify](https://docs.aiwg.io/pages/getting-started--install-connect-verify.html). This guide assumes AIWG is already installed, `all` is deployed for your provider, and `aiwg-regenerate` has connected the agent to this project.

---

## Install & Deploy

**1. Install**

```bash
npm install -g aiwg
```

**2. Deploy to your project**

```bash
cd /path/to/your/project

# Deploy the complete AIWG system for Cursor
aiwg use all --provider cursor
```

**3. Configure MCP (optional)**

```bash
aiwg mcp install cursor
```

**4. Open in Cursor**

```bash
cursor .
```

**5. Regenerate for intelligent integration**

```text
/aiwg-regenerate
```

`aiwg use` already wrote the project context, so natural-language command mapping ("run security review" → workflow) works right away via AIWG's Discover-First protocol. On an **existing project**, or to pull in the latest AIWG, run this to re-tailor the context to your codebase — optional on a brand-new project. See the [Regenerate Guide](#regenerate-guide) for details.

**6. You're ready.** See the [Intake Guide](#intake-guide) for starting projects.

---

## What Gets Created

```text
.cursor/
├── agents/      # SDLC agents (Requirements Analyst, Architecture Designer, etc.)
├── commands/    # Slash commands (/project-status, /security-gate, etc.)
├── skills/      # Skill directories with SKILL.md (voice profiles, project awareness, etc.)
├── rules/       # Context rules in MDC format (.mdc extension)
└── mcp.json     # MCP config (if enabled)

.aiwg/           # SDLC artifacts
```

---

## Rules System

Cursor uses **MDC format** (`.mdc` extension) for rules with YAML frontmatter:

```yaml
---
description: "Enforce token security practices"
globs: ["src/**/*.ts", "src/**/*.js"]
alwaysApply: false
---

# Token Security

Never hard-code tokens...
```

### Rule Types

| Type | Configuration | When It Activates |
|------|---------------|-------------------|
| **Always Apply** | `alwaysApply: true` | Every session |
| **Apply Intelligently** | `description` set, no `globs` | Agent decides based on description |
| **File-Scoped** | `globs` set | When referenced files match pattern |
| **Manual** | No `alwaysApply`, no `globs` | Only when user types `@rule-name` |

### .cursorrules vs .cursor/rules/

`.cursorrules` is a legacy root-level file. Cursor now recommends `.cursor/rules/` with MDC format. AIWG deploys rules to `.cursor/rules/` (native support) and optionally generates `.cursorrules` via the regenerate command for backward compatibility.

---

## Using Agents

Invoke AIWG agents via @-mention in Cursor chat:

```text
@security-architect Review the authentication implementation
@test-engineer Generate unit tests for the user service
```

Cursor 2.0+ supports automatic context gathering — the agent will search your codebase, read files, and run commands without needing explicit @-mentions for context.

---

## Skills

AIWG deploys skills to `.cursor/skills/` in directory format (each skill has a `SKILL.md`). This aligns with Cursor's native skills system (introduced in 2.4). Skills are loaded on-demand when relevant, reducing context overhead.

---

## Cloud Agents

Cursor's Cloud Agents (formerly Background Agents) run in isolated cloud VMs. They fully support MCP servers, making AIWG workflows accessible in cloud agent mode:

1. Configure AIWG MCP server in your Cloud Agent environment
2. Add AIWG instructions to `AGENTS.md` at repo root
3. Cloud Agents clone your repo, work on branches, and push changes

Cloud Agents can be triggered from Cursor Desktop, cursor.com/agents, Slack, GitHub, Linear, or API.

---

## Multi-Agent / Worktrees

Cursor 2.0+ supports up to 8 agents running in parallel via Git worktrees. Configure via `Cursor Settings > Worktrees` or `.cursor/worktrees.json`.

---

## Agent Loop

Agent loops support multi-provider execution. While Cursor agents are deployed via AIWG, agent task loops run through the CLI:

```bash
aiwg ralph "Fix all tests" --completion "npm test passes"
```

See [Al Guide](../ralph-guide.md) for full documentation including `--provider` options.

---

## Troubleshooting

**Natural language not working?** Run regenerate:
```text
/aiwg-regenerate
```

**Rules not loading?** Check file extension is `.mdc`, verify frontmatter syntax, and restart Cursor.

**MCP tools not visible?**
- Verify `aiwg mcp serve` runs successfully standalone
- Check `.cursor/mcp.json` syntax
- View MCP logs: `Cmd+Shift+U` > select "MCP Logs"
- Restart Cursor after config changes

**Redeploy if needed:**
```bash
aiwg use sdlc --provider cursor --force
```

---

## Cursor Cloud Agents

Cursor Cloud Agents run in isolated cloud VMs and can be triggered from GitHub, Slack, Linear, and webhooks. AIWG works in Cloud Agent environments via the `install` step in `.cursor/environment.json`.

**Create `.cursor/environment.json`:**

```json
{
  "install": "npm install -g aiwg && aiwg use sdlc --provider cursor",
  "terminal": {
    "env": {
      "AIWG_PROVIDER": "cursor",
      "AIWG_CONTEXT_WINDOW": "200000"
    }
  }
}
```

This tells the Cloud Agent VM to install AIWG and deploy the SDLC framework before starting work. A pre-configured template is available at:

```text
agentic/code/frameworks/sdlc-complete/templates/cursor/environment.json.aiwg-template
```

**MCP server in Cloud Agents:**

The AIWG MCP server can also run inside the Cloud Agent VM. Add it to `.cursor/mcp.json`:

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

**Automation triggers:**

Cloud Agents can be triggered by commenting `@cursor` on GitHub issues or PRs, or via Slack/Linear. AIWG agent loops pair well with this: trigger a Cloud Agent on an issue, and Al handles the iterative fix cycle automatically.

> **Note:** Test `npm install -g aiwg` in your target environment first — Cloud Agent VMs may have npm available but require `--prefix` or `--location=global` flags depending on the base image.

---

## MCP Sidecar (Unrestricted AIWG Access)

For full unrestricted AIWG tool access (artifact management, workflow execution, template rendering), connect the AIWG MCP server as a sidecar:

```bash
aiwg mcp install cursor
```

See the [Cursor MCP Sidecar Guide](cursor-mcp-sidecar.md) for complete setup including tool whitelisting and context optimization.

---

## Related Resources

- [Cursor MCP Sidecar Guide](cursor-mcp-sidecar.md) - Full MCP integration
- [Cross-Platform Overview](cross-platform-overview.md) - All provider comparison
- [Cursor Quickstart](cursor-quickstart.md)
- [Cursor Official Docs](https://cursor.com/docs) - Upstream documentation
