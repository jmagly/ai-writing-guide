# Quick Start

## Install & Deploy

### Option A: Claude Code Plugin (Recommended)

Native Claude Code integration - no npm required:

```bash
# Add AIWG marketplace (one-time)
/plugin marketplace add jmagly/ai-writing-guide --path plugins

# Install the frameworks you need
/plugin install sdlc@aiwg        # SDLC framework (58 agents)
/plugin install marketing@aiwg   # Marketing framework (37 agents)
/plugin install utils@aiwg       # Core utilities
/plugin install voice@aiwg       # Voice profiles
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
aiwg use sdlc              # Software development
aiwg use marketing         # Marketing campaigns
aiwg use all               # Everything
```

**3. Open in your AI platform**

```bash
claude .                   # Claude Code
cursor .                   # Cursor
droid .                    # Factory AI
```

**4. Integrate with platform context** (choose one)

Option A - Quick setup (appends AIWG scaffold):
```text
/aiwg-setup-project
```

Option B - Intelligent integration (recommended):
```text
/aiwg-regenerate
```

**Use `/aiwg-regenerate`** - it analyzes your project, preserves team directives, and enables natural language commands like "run security review". See the [Regenerate Guide](#regenerate-guide) for details.

**5. You're ready.** See the [Intake Guide](#intake-guide) for starting projects.

---

## Platform-Specific Setup

| Platform | Guide |
|----------|-------|
| Claude Code | [Setup Guide](#integrations/claude-code-quickstart) |
| Factory AI | [Setup Guide](#integrations/factory-quickstart) |
| Warp Terminal | [Setup Guide](#integrations/warp-terminal-quickstart) |
| Cursor | [Setup Guide](#integrations/cursor-quickstart) |
| GitHub Copilot | [Setup Guide](#integrations/copilot-quickstart) |
| OpenCode | [Setup Guide](#integrations/opencode-quickstart) |
| Codex | [Setup Guide](#integrations/codex-quickstart) |

---

## Framework Options

| Framework | What It's For |
|-----------|---------------|
| `aiwg use sdlc` | Software development lifecycle (54 agents, 42 commands) |
| `aiwg use marketing` | Marketing campaigns (37 agents) |
| `aiwg use writing` | Voice profiles, authentic content (3 agents, 5 skills) |
| `aiwg use all` | All frameworks |

---

## CLI Reference

```bash
aiwg -new                  # Scaffold new project
aiwg use <framework>       # Deploy framework
aiwg -version              # Show version
aiwg -update               # Update AIWG
aiwg -help                 # All commands
```

---

**Bleeding edge:** Install from HEAD of main (may be experimental):

```bash
curl -fsSL https://raw.githubusercontent.com/jmagly/ai-writing-guide/main/tools/install/install.sh | bash && source ~/.bash_aliases
```
