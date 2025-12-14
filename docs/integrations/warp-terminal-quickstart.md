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
WARP.md          # Project context (58 agents, 42+ commands embedded)
.aiwg/           # SDLC artifacts
```

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
