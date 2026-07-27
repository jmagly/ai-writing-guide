---
audience: agent-operator
publication: agent-reference
stable_id: aiwg.agent-reference.provider.warp
---

# Warp Operational Reference

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

# Deploy SDLC framework:
aiwg use all --provider warp
```

**3. Open in Warp Terminal**

```bash
# Warp automatically loads WARP.md
cd /path/to/your/project
```

**4. Regenerate for intelligent integration**

```text
/aiwg-regenerate
```

`aiwg use` already wrote the project context, so natural-language command mapping ("run security review" → workflow) works right away via AIWG's Discover-First protocol. On an **existing project**, or to pull in the latest AIWG, run this to re-tailor the context to your codebase — optional on a brand-new project. See the [Regenerate Guide](#regenerate-guide) for details.

**5. You're ready.** See the [Intake Guide](#intake-guide) for starting projects.

---

## What Gets Created

```text
WARP.md              # Project rules file (auto-loaded by Warp)
.warp/
├── skills/          # Skill directories (natively discovered by Warp)
└── workflows/       # Legacy YAML workflows (natively discovered)

.aiwg/               # SDLC artifacts
```

> **Note:** Warp natively discovers `.warp/skills/` and `.warp/workflows/`. Agents, commands, and rules are aggregated into `WARP.md` for single-file context loading — Warp does not natively discover those directories. Warp also supports `AGENTS.md` as an alternative project rules filename; `WARP.md` takes priority when both files exist. AIWG uses `WARP.md`.

---

## Using Warp AI

Natural language works directly:

```text
"Generate intake for an e-commerce platform"
"Transition to Elaboration"
"Run security review"
"Where are we in the project?"
```

---

## Warp Commands

```bash
/init              # Re-index project (reload WARP.md)
/compact           # Summarize conversation to free context window space
/orchestrate       # Dispatch parallel subtasks within a session
```

---

## Agent Loop

Agent loops support multi-provider execution. While Warp context is deployed via AIWG, agent task loops run through the CLI:

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

**WARP.md not loading?** Re-index:
```bash
/init
```

**Still not loading?** Verify the filename is all caps: `WARP.md`. Lowercase `warp.md` is not recognized by Warp.

**Redeploy if needed:**
```bash
aiwg use sdlc --provider warp --force
```

---

## MCP Sidecar (Unrestricted AIWG Access)

Warp Terminal has no dangerous mode flag. The MCP sidecar is the only path to unrestricted AIWG tool access.

MCP servers in Warp are configured via the UI, not via a file. Add AIWG as an MCP server directly in Warp:

```text
/add-mcp
# Then configure:
#   Command: aiwg
#   Args: mcp serve
```

Alternatively, open Settings and add the MCP server from there.

See the [Warp MCP Sidecar Guide](warp-mcp-sidecar.md) for complete setup including tool whitelisting and context optimization.
