# SDLC Complete Framework - Quick Start

Build software with AI-assisted lifecycle management: Inception → Elaboration → Construction → Transition.

---

## Install & Deploy

### Option A: Claude Code Plugin (Recommended)

Native Claude Code integration - no npm required:

```bash
# Add AIWG marketplace (one-time)
/plugin marketplace add jmagly/ai-writing-guide

# Install SDLC framework
/plugin install sdlc@aiwg        # Full SDLC framework
/plugin install utils@aiwg       # Core utilities (recommended)
```

> **No account required** - Plugin distribution is decentralized. No registry signup, no approval process.

### Option B: npm + CLI (Multi-Platform)

For CLI tools and deploying to other platforms:

```bash
npm install -g aiwg
```

Deploy to your project:

```bash
cd /path/to/your/project

# New project? Scaffold first:
aiwg -new

# Then deploy framework:
aiwg use sdlc
```

---

## After Installation

**1. Open in your AI platform**

```bash
claude .                   # Claude Code
cursor .                   # Cursor
droid .                    # Factory AI
```

**2. Integrate with platform context**

```text
/aiwg-setup-project
```

**3. Regenerate for intelligent integration**

```text
/aiwg-regenerate-claude
```

This step is critical - it enables natural language command mapping ("run security review" → workflow). Without it, advanced features won't work correctly. See the [Regenerate Guide](#regenerate-guide) for details.

**4. You're ready.** See the [Intake Guide](#intake-guide) for starting projects.

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
