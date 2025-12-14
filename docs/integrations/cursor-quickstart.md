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

# Deploy for Cursor:
aiwg -deploy-agents --provider cursor --deploy-commands --create-agents-md
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
├── rules/       # AIWG rules (MDC format)
└── mcp.json     # MCP config (if enabled)

AGENTS.md        # Project context
.aiwg/           # SDLC artifacts
```

---

## Using Agents

Invoke via @-mention in Cursor:

```text
@security-architect Review the authentication implementation
@test-engineer Generate unit tests for the user service
```

---

## Troubleshooting

**Natural language not working?** Run regenerate:
```text
/aiwg-regenerate-cursorrules
```

**Rules not loading?** Check file extension is `.mdc` and restart Cursor.

**Redeploy if needed:**
```bash
aiwg -deploy-agents --provider cursor --force
```
