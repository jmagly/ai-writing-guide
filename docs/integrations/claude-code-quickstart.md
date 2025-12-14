# Claude Code Quick Start

---

## Install & Deploy

**1. Install**

```bash
npm install -g aiwg
```

**2. Deploy to your project**

```bash
cd /path/to/your/project

# New project? Scaffold first:
aiwg -new

# Deploy framework:
aiwg use sdlc
```

**3. Open in Claude Code**

```bash
claude .
```

**4. Integrate with platform context**

```text
/aiwg-setup-project
```

**5. Regenerate for intelligent integration**

```text
/aiwg-regenerate-claude
```

This step is critical - it enables natural language command mapping ("run security review" → workflow). Without it, advanced features won't work correctly. See the [Regenerate Guide](#regenerate-guide) for details.

**6. You're ready.** See the [Intake Guide](#intake-guide) for starting projects.

---

## What Gets Created

```text
.claude/
├── agents/      # 58 SDLC agents
├── commands/    # 42+ workflow commands
└── skills/      # Voice and utility skills

CLAUDE.md        # Project context
.aiwg/           # SDLC artifacts
```

---

## Troubleshooting

**Natural language not working?** Run regenerate:
```text
/aiwg-regenerate-claude
```

**Commands/agents missing?** Redeploy:
```bash
aiwg use sdlc
```

**Check installation:**
```bash
aiwg -version
```
