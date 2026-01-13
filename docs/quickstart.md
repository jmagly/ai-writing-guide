# Quick Start

## Claude Code

Get started in seconds with the Claude Code plugin:

```bash
/plugin marketplace add jmagly/ai-writing-guide
/plugin install sdlc@aiwg
```

That's it. You now have the full SDLC framework with agents and workflow commands.

**[Full Claude Code Setup Guide](#integrations/claude-code-quickstart)** - troubleshooting, all plugins, regeneration commands

---

## npm + CLI (Multi-Platform)

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

Open in your AI platform and integrate:

```bash
cursor .                   # Cursor
droid .                    # Factory AI
```

Then run `/aiwg-regenerate` to enable natural language commands. See the [Regenerate Guide](#regenerate-guide) for details.

**You're ready.** See the [Intake Guide](#intake-guide) for starting projects.

---

## Other Platforms

| Platform | Guide |
|----------|-------|
| Factory AI | [Setup Guide](#integrations/factory-quickstart) |
| Warp Terminal | [Setup Guide](#integrations/warp-terminal-quickstart) |
| Cursor | [Setup Guide](#integrations/cursor-quickstart) |
| GitHub Copilot | [Setup Guide](#integrations/copilot-quickstart) |
| OpenCode | [Setup Guide](#integrations/opencode-quickstart) |
| Codex | [Setup Guide](#integrations/codex-quickstart) |

---

## Framework Options (npm install only)

> **Note:** These CLI commands require npm installation (`npm install -g aiwg`). Plugin users get the same agents and commands directly in Claude Code.

| Framework | What It's For |
|-----------|---------------|
| `aiwg use sdlc` | Software development lifecycle |
| `aiwg use marketing` | Marketing campaigns |
| `aiwg use writing` | Voice profiles, authentic content |
| `aiwg use all` | All frameworks |

---

## CLI Reference (npm install only)

> The `aiwg` CLI is only available via npm install. Plugin users access all functionality through Claude Code's native interface.

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
