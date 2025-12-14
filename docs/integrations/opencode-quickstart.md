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

# Deploy agents and commands:
aiwg -deploy-agents --provider opencode --mode sdlc --deploy-commands --create-agents-md
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
├── agent/       # AIWG SDLC agents
└── command/     # AIWG commands

AGENTS.md        # Project context
.aiwg/           # SDLC artifacts
```

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

## Troubleshooting

**Natural language not working?** Run regenerate:
```text
/aiwg-regenerate-agents
```

**Agents not appearing?** Redeploy:
```bash
aiwg -deploy-agents --provider opencode --force
```

**MCP not connecting?** Test directly:
```bash
aiwg mcp serve
```
