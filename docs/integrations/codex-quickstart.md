# OpenAI Codex CLI Quick Start

---

## Install & Deploy

**1. Install**

```bash
npm install -g aiwg
```

**2. Deploy to your project**

```bash
cd /path/to/your/project

# Deploy for Codex:
aiwg -deploy-agents --provider codex --mode sdlc --create-agents-md
```

**3. Install skills (user-level)**

```bash
aiwg -deploy-skills --provider codex
```

**4. Install prompts (user-level)**

```bash
aiwg -deploy-commands --provider codex
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
~/.codex/
├── skills/      # AIWG skills
└── prompts/     # AIWG commands as prompts

AGENTS.md        # Project context
.aiwg/           # SDLC artifacts
```

---

## Using Prompts

```text
/prompts:aiwg-pr-review PR_NUMBER=123
/prompts:aiwg-security-audit
/prompts:aiwg-generate-tests
```

---

## Non-Interactive Mode

```bash
codex exec "Perform AIWG security review" --full-auto --sandbox read-only
```

---

## Troubleshooting

**Natural language not working?** Run regenerate:
```text
/aiwg-regenerate-agents
```

**Skills not loading?** Restart Codex after installing.

**Verify installation:**
```bash
ls ~/.codex/skills/
ls ~/.codex/prompts/
```
