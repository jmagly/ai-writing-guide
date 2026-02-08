# Warp Terminal Quick Start

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
aiwg use sdlc --provider warp
```

**3. Open in Warp Terminal**

```bash
# Warp automatically loads WARP.md
cd /path/to/your/project
```

**4. Regenerate for intelligent integration**

```text
/aiwg-regenerate-warp
```

This step is critical - it enables natural language command mapping ("run security review" → workflow). Without it, advanced features won't work correctly. See the [Regenerate Guide](#regenerate-guide) for details.

**5. You're ready.** See the [Intake Guide](#intake-guide) for starting projects.

---

## What Gets Created

```text
WARP.md              # Aggregated agents + commands (single context file)
.warp/
├── agents/          # Discrete SDLC agents (Requirements Analyst, etc.)
├── commands/        # Discrete workflow commands (/project-status, /security-gate, etc.)
├── skills/          # Skill directories (voice profiles, project awareness, etc.)
└── rules/           # Context rules (token security, citation policy, etc.)

.aiwg/               # SDLC artifacts
```

> **Note:** Warp uses both discrete files (in `.warp/`) and an aggregated `WARP.md` that combines agents and commands for platforms that prefer a single context file.

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
/open-project-rules # Open WARP.md in editor
```

---

## Ralph Iterative Loops

Ralph loops support multi-provider execution. While Warp context is deployed via AIWG, Ralph task loops run through the CLI:

```bash
aiwg ralph "Fix all tests" --completion "npm test passes"
```

See [Ralph Guide](../ralph-guide.md) for full documentation including `--provider` options.

---

## Troubleshooting

**Natural language not working?** Run regenerate:
```text
/aiwg-regenerate-warp
```

**WARP.md not loading?** Re-index:
```bash
/init
```

**Redeploy if needed:**
```bash
aiwg use sdlc --provider warp --force
```
