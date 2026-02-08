# OpenCode Quick Start

---

## Install & Deploy

**1. Install OpenCode**

```bash
curl -fsSL https://opencode.ai/install | sh
```

**2. Install AIWG**

```bash
npm install -g aiwg
```

**3. Deploy to your project**

```bash
cd /path/to/your/project

# Deploy all 4 artifact types for OpenCode
aiwg use sdlc --provider opencode
```

**4. Configure MCP (optional)**

```bash
aiwg mcp install opencode
```

**5. Regenerate for intelligent integration**

```text
/aiwg-regenerate-agents
```

This step is critical - it enables natural language command mapping ("run security review" → workflow). Without it, advanced features won't work correctly. See the [Regenerate Guide](#regenerate-guide) for details.

**6. You're ready.** See the [Intake Guide](#intake-guide) for starting projects.

---

## What Gets Created

```text
.opencode/
├── agent/       # SDLC agents (Requirements Analyst, Architecture Designer, etc.)
├── command/     # Workflow commands (/project-status, /security-gate, etc.)
├── skill/       # Skill directories (voice profiles, project awareness, etc.)
└── rule/        # Context rules (token security, citation policy, etc.)

AGENTS.md        # Project context
.aiwg/           # SDLC artifacts
```

> **Note:** OpenCode uses singular directory names (`agent/`, `command/`, `skill/`, `rule/`).

---

## Using Agents

Invoke via @-mention:

```text
@security-architect Review the authentication implementation
@test-engineer Generate unit tests for the user service
```

---

## Using Commands

```text
/project-status
/flow-gate-check elaboration
/security-gate
```

---

## Ralph Iterative Loops

Ralph loops support multi-provider execution. While OpenCode agents are deployed via AIWG, Ralph task loops run through the CLI:

```bash
aiwg ralph "Fix all tests" --completion "npm test passes"
```

See [Ralph Guide](../ralph-guide.md) for full documentation including `--provider` options.

---

## Troubleshooting

**Natural language not working?** Run regenerate:
```text
/aiwg-regenerate-agents
```

**Agents not appearing?** Redeploy:
```bash
aiwg use sdlc --provider opencode --force
```

**MCP not connecting?** Test directly:
```bash
aiwg mcp serve
```
