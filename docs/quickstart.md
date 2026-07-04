# Quick Start

## Not sure where to start?

**[→ Start Here if AIWG is new to you](getting-started/start-here.md)**

**[→ Find your scenario in the Getting Started guides](getting-started/README.md)**

These cover the common situations in plain terms: new project, existing code, just trying it out, team setup, writing, auditing, automation.

For a guided first run, use:

```bash
aiwg wizard --dry-run --goal "help me start a project"
aiwg status --probe --json
```

If you can describe the goal but do not know the AIWG term for it, use the [Beginner Language Map](getting-started/language-map.md). Start by asking: "How best can we use AIWG for our situation?"

First-success recipes:

- [Ask the steward to route you](getting-started/first-success-ask-steward.md)
- [Find one AIWG capability](getting-started/first-success-find-capability.md)
- [Verify AIWG is working](getting-started/verify-aiwg-is-working.md)

---

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

On macOS, read [macOS Install Guide](getting-started/macos-install.md) first if
global npm installs fail with `EACCES` or if `aiwg` is not found after install.
The recommended Mac path is Node 24 through `nvm`, then `npm install -g aiwg`.

Deploy to your project:

```bash
cd /path/to/your/project

# New project? Scaffold first:
aiwg -new

# Deploy framework artifacts:
aiwg use sdlc              # Software development
aiwg use marketing         # Marketing campaigns
aiwg use all               # Everything
```

Then ask your AI assistant to set up the project for AIWG:

```
Help me set up this project for AIWG.
```

The agent-led setup conversation should determine the right repository
behavior, issue storage, delivery policy, signing expectations, and provider
choices for your project. The assistant may use `aiwg setup project` behind the
scenes to preview and write the resulting `.aiwg/aiwg.config` policy.

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
| OpenClaw | [Setup Guide](openclaw-guide.md) |
| Factory AI | [Setup Guide](#integrations/factory-quickstart) |
| Warp Terminal | [Setup Guide](#integrations/warp-terminal-quickstart) |
| Cursor | [Setup Guide](#integrations/cursor-quickstart) |
| GitHub Copilot | [Setup Guide](#integrations/copilot-quickstart) |
| OpenCode | [Setup Guide](#integrations/opencode-quickstart) |
| Codex | [Setup Guide](#integrations/codex-quickstart) |
| OpenHuman | [Setup Guide](#integrations/openhuman-quickstart) |

---

## Artifact Types

AIWG deploys five artifact types to every supported platform:

| Type | What It Is | Deploy target |
|------|-----------|---------------|
| **Agents** | Specialized AI personas (Test Engineer, Security Auditor, etc.) | Platform agents dir |
| **Commands** | Slash commands and CLI workflows | Platform commands dir |
| **Skills** | NLP-triggered, single-step capabilities | Platform skills dir |
| **Rules** | Context-loaded constraints and conventions | Platform rules dir |
| **Behaviors** | Reactive capabilities with scripts + event hooks | Platform behaviors dir |

Behaviors are new. They are the layer above skills — they subscribe to system events (file writes, deploys, schedules) and react automatically, in addition to being invocable on demand. [Behaviors Guide](behaviors-guide.md)

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
