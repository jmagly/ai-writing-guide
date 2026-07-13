# SDLC Complete Framework - Quick Start

Build software with AI-assisted lifecycle management: Inception → Elaboration → Construction → Transition.

---

## Install & Deploy

### Option A: Claude Code Marketplace (Recommended)

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

**2. Wire the context to your project (existing projects)**

`aiwg use` already wrote the project context (`CLAUDE.md` + `AIWG.md`), so natural-language command mapping ("run security review" → workflow) works right away via AIWG's Discover-First protocol. On an **existing project**, or to pull in the latest AIWG, run this once in the tool to re-tailor that context to your codebase and preserve any edits you've made (optional on a brand-new project):

```text
/aiwg-regenerate
```

See the [Regenerate Guide](#regenerate-guide) for details.

**3. You're ready.** See the [Intake Guide](#intake-guide) for starting projects.

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

---

## Iterative Task Execution with Al

For tasks that need multiple attempts or long-running operations:

```bash
# Fix all failing tests (internal loop)
/ralph "Fix all failing tests" --completion "npm test passes"

# Long-running migration with crash recovery (external loop)
/ralph-external "Migrate to TypeScript" --completion "npx tsc --noEmit exits 0"
```

See the [Al Guide](ralph-guide.md) for detailed documentation.

---

## What's Next?

- [Intake Guide](intake-guide.md) - Starting your first project
- [Al Guide](ralph-guide.md) - Iterative task execution
- [CLI Usage](CLI_USAGE.md) - Full command reference
- [SDLC Framework Docs](https://github.com/jmagly/aiwg/blob/main/agentic/code/frameworks/sdlc-complete/README.md) - Complete agent catalog
