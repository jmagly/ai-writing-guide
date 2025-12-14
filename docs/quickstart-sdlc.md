# SDLC Complete Framework - Quick Start

Build software with AI-assisted lifecycle management: Inception → Elaboration → Construction → Transition.

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

# Then deploy framework:
aiwg use sdlc
```

**3. Open in your AI platform**

```bash
claude .                   # Claude Code
cursor .                   # Cursor
droid .                    # Factory AI
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

## Artifacts Location

All documents generated in `.aiwg/`:

```text
.aiwg/
├── intake/        # Project definition
├── requirements/  # User stories, use cases
├── architecture/  # SAD, ADRs
├── testing/       # Test plans, results
├── security/      # Threat models
└── deployment/    # Runbooks
```

---

## Voice Profiles for Documentation

For consistent voice across your SDLC documentation:

```bash
aiwg use writing           # Add Voice Framework
```

**Built-in profiles**: `technical-authority`, `friendly-explainer`, `executive-brief`, `casual-conversational`
