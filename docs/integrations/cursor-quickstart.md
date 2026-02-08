# Cursor Quick Start

---

## Install & Deploy

**1. Install**

```bash
npm install -g aiwg
```

**2. Deploy to your project**

```bash
cd /path/to/your/project

# Deploy all 4 artifact types for Cursor
aiwg use sdlc --provider cursor
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
/aiwg-regenerate-cursorrules
```

This step is critical - it enables natural language command mapping ("run security review" → workflow). Without it, advanced features won't work correctly. See the [Regenerate Guide](#regenerate-guide) for details.

**6. You're ready.** See the [Intake Guide](#intake-guide) for starting projects.

---

## What Gets Created

```text
.cursor/
├── agents/      # SDLC agents (Requirements Analyst, Architecture Designer, etc.)
├── commands/    # Slash commands (/project-status, /security-gate, etc.)
├── skills/      # Skill directories (voice profiles, project awareness, etc.)
├── rules/       # Context rules (token security, citation policy, etc.) — MDC format
└── mcp.json     # MCP config (if enabled)

AGENTS.md        # Project context
.aiwg/           # SDLC artifacts
```

> **Note:** Cursor uses `.mdc` extension for rules (Cursor's MDC format for context rules).

---

## Using Agents

Invoke via @-mention in Cursor:

```text
@security-architect Review the authentication implementation
@test-engineer Generate unit tests for the user service
```

---

## Ralph Iterative Loops

Ralph loops support multi-provider execution. While Cursor agents are deployed via AIWG, Ralph task loops run through the CLI:

```bash
aiwg ralph "Fix all tests" --completion "npm test passes"
```

See [Ralph Guide](../ralph-guide.md) for full documentation including `--provider` options.

---

## Troubleshooting

**Natural language not working?** Run regenerate:
```text
/aiwg-regenerate-cursorrules
```

**Rules not loading?** Check file extension is `.mdc` and restart Cursor.

**Redeploy if needed:**
```bash
aiwg use sdlc --provider cursor --force
```
