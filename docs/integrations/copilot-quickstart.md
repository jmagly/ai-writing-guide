# GitHub Copilot Quick Start

---

## Install & Deploy

**1. Install**

```bash
npm install -g aiwg
```

**2. Deploy to your project**

```bash
cd /path/to/your/project

# Deploy all 4 artifact types for Copilot
aiwg use sdlc --provider copilot
```

**3. Commit and push**

```bash
git add .github/
git commit -m "Add AIWG custom agents for GitHub Copilot"
git push
```

**4. Regenerate for intelligent integration**

```text
/aiwg-regenerate-copilot
```

This step is critical - it enables natural language command mapping ("run security review" -> workflow). Without it, advanced features won't work correctly. See the [Regenerate Guide](#regenerate-guide) for details.

**5. You're ready.** See the [Intake Guide](#intake-guide) for starting projects.

---

## What Gets Created

```text
.github/
├── agents/                  # Custom agents (.agent.md format)
│   ├── architecture-designer.agent.md
│   ├── security-architect.agent.md
│   └── ...
├── prompts/                 # Slash commands (.prompt.md format)
│   ├── security-review.prompt.md
│   └── ...
├── instructions/            # Path-scoped rules (.instructions.md format)
│   ├── token-security.instructions.md
│   └── ...
└── copilot-instructions.md  # Repository-wide instructions

.vscode/
└── mcp.json                 # MCP server configuration (optional)

.aiwg/                       # SDLC artifacts
```

### Copilot File Formats

GitHub Copilot uses Markdown files with YAML frontmatter:

| Directory | Extension | Purpose |
|-----------|-----------|---------|
| `.github/agents/` | `.agent.md` | Custom agent definitions |
| `.github/prompts/` | `.prompt.md` | Custom slash commands |
| `.github/instructions/` | `.instructions.md` | Path-scoped conditional rules |
| `.github/copilot-instructions.md` | (single file) | Repository-wide instructions |

---

## Using Agents

Invoke via @-mention in Copilot Chat:

```text
@security-architect Review the authentication implementation
@test-engineer Generate unit tests for the user service
@code-reviewer Review this PR for quality issues
```

### Custom Slash Commands

AIWG commands deploy as prompt files, invokable via `/name`:

```text
/security-review Audit the auth module
/generate-tests Add tests for the API layer
```

---

## Copilot Coding Agent

Assign issues directly to Copilot for autonomous PR creation:

1. Navigate to an issue
2. In Assignees, select **Copilot**
3. Copilot analyzes the codebase, implements changes, runs tests
4. A pull request is created for human review

The coding agent reads `.github/copilot-instructions.md` for project context. It runs in a GitHub Actions sandbox with network access controls.

---

## MCP Integration

GitHub Copilot supports MCP (Model Context Protocol) in two contexts:

### VS Code Agent Mode

MCP is GA in VS Code. Configure servers in `.vscode/mcp.json`:

```json
{
  "servers": {
    "aiwg": {
      "type": "stdio",
      "command": "aiwg",
      "args": ["mcp", "serve"]
    }
  }
}
```

Once configured, Copilot agent mode can call AIWG MCP tools (`discover`, `command-run`, `artifact-read`, etc.) directly.

### Coding Agent

The coding agent supports MCP servers configured via GitHub.com Settings > Copilot > Coding agent. This is a UI-based JSON configuration, not a committed file.

See [Copilot MCP Integration](copilot-mcp-sidecar.md) for full details.

---

## Agent Loop

Agent loops support multi-provider execution. While Copilot agents are deployed via AIWG, agent task loops run through the CLI:

```bash
aiwg ralph "Fix all tests" --completion "npm test passes"
```

See [Al Guide](../ralph-guide.md) for full documentation including `--provider` options.

---

## Path-Scoped Instructions

Copilot supports conditional rules that apply only when working with specific file types:

```markdown
---
name: TypeScript Rules
description: Style rules for TypeScript files
applyTo: '**/*.ts,**/*.tsx'
---

Use strict TypeScript. Prefer interfaces over types.
Always use explicit return types on public functions.
```

Place these in `.github/instructions/`. AIWG deploys rules as path-scoped instructions with appropriate `applyTo` patterns.

---

## Agent Definition Format

AIWG agents deploy as `.agent.md` files with YAML frontmatter:

```markdown
---
name: architecture-designer
description: System architecture and technical decisions
tools: ['search/codebase', 'edit', 'web/fetch', 'agent']
model: gpt-4o
---

You are an Architecture Designer specializing in...
```

### Available Fields

| Field | Purpose |
|-------|---------|
| `name` | Agent name shown in dropdown |
| `description` | Placeholder text in chat |
| `tools` | Available tools (built-in or MCP) |
| `model` | Model or prioritized model list |
| `agents` | Subagent access (`['*']` = all) |
| `target` | `vscode` or `github-copilot` |
| `mcp-servers` | Agent-scoped MCP servers |
| `hooks` | Lifecycle hooks (Preview) |
| `handoffs` | Next-agent transitions |

---

## Troubleshooting

**Natural language not working?** Run regenerate:
```text
/aiwg-regenerate-copilot
```

**Agents not appearing?** Ensure committed and pushed:
```bash
git status
git push
```

**Redeploy if needed:**
```bash
aiwg use sdlc --provider copilot --force
```

**MCP tools not available?** Check `.vscode/mcp.json` exists and the server is running:
```bash
aiwg mcp serve
```

---

## Platform Reference

For the full capability reference including all Copilot features, field schemas, and tool mappings, see the [Copilot Quickstart](copilot-quickstart.md).
