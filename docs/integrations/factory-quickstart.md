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

# Deploy all 4 artifact types (Factory calls agents "droids")
aiwg use sdlc --provider factory
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
├── droids/      # SDLC agents (Factory calls them droids)
├── commands/    # Workflow commands (/project-status, /security-gate, etc.)
├── skills/      # Skill directories (voice profiles, project awareness, etc.)
└── rules/       # Context rules (token security, citation policy, etc.)

AGENTS.md        # Project context
.aiwg/           # SDLC artifacts
```

---

## Ralph Iterative Loops

Ralph loops support multi-provider execution. While Factory droids are deployed via AIWG, Ralph task loops run through the CLI:

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

**Droids not found?** Redeploy and reimport:
```bash
aiwg use sdlc --provider factory --force
# Then: droid . → /droids → I → A → Enter
```
