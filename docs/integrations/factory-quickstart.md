# Factory AI Quick Start

> **Important:** Factory requires manual droid import after deployment.
> Quick import: `droid . → /droids → I → A → Enter`

---

## Install & Deploy

**1. Install**

```bash
npm install -g aiwg
```

**2. Deploy to your project**

```bash
cd /path/to/your/project

# Deploy droids and commands:
aiwg -deploy-agents --provider factory --mode sdlc --deploy-commands --create-agents-md
```

**3. Import droids (required)**

```bash
droid .
/droids
# Press 'I' → 'A' → Enter
```

**4. Regenerate for intelligent integration**

```text
/aiwg-regenerate-agents
```

This step is critical - it enables natural language command mapping ("run security review" → workflow). Without it, advanced features won't work correctly. See the [Regenerate Guide](#regenerate-guide) for details.

**5. You're ready.** See the [Intake Guide](#intake-guide) for starting projects.

---

## What Gets Created

```text
.factory/
├── droids/      # 53 SDLC droids
└── commands/    # 42+ workflow commands

AGENTS.md        # Project context
.aiwg/           # SDLC artifacts
```

---

## Troubleshooting

**Natural language not working?** Run regenerate:
```text
/aiwg-regenerate-agents
```

**Droids not found?** Redeploy and reimport:
```bash
aiwg -deploy-agents --provider factory --mode sdlc --force
# Then: droid . → /droids → I → A → Enter
```
