# AI Writing Guide - Quick Start

Choose your framework based on what you're building.

## Frameworks

| Framework | Purpose | Intake Methods |
|-----------|---------|----------------|
| **[SDLC Complete](quickstart-sdlc.md)** | Software development lifecycle | New project, existing codebase, manual |
| **[Media/Marketing Kit](quickstart-mmk.md)** | Marketing campaign lifecycle | New campaign, existing assets, manual brief |

## Platform Integration

Already know your AI platform? Jump to setup:

| Platform | Setup Guide | Best For |
|----------|-------------|----------|
| **Claude Code** | [Quick Start](integrations/claude-code-quickstart.md) | Full multi-agent orchestration |
| **Factory AI** | [Quick Start](integrations/factory-quickstart.md) | Native droid workflows |
| **Warp Terminal** | [Quick Start](integrations/warp-terminal-quickstart.md) | Terminal-native workflows |

## 60-Second Install

```bash
# Install CLI
curl -fsSL https://raw.githubusercontent.com/jmagly/ai-writing-guide/main/tools/install/install.sh | bash
source ~/.bash_aliases

# Deploy to your project
cd /path/to/project
aiwg use sdlc              # Software projects (54 agents, 42 commands)
aiwg use marketing         # Marketing projects (37 agents)
aiwg use all               # All frameworks

# Open in your AI tool
claude .                   # Claude Code
droid .                    # Factory AI
```

## What `aiwg use` Does

The `aiwg use <framework>` command:

1. Deploys framework agents to `.claude/agents/`
2. Deploys framework commands to `.claude/commands/`
3. Installs **aiwg-utils** addon (regenerate commands, etc.)

To skip aiwg-utils: `aiwg use sdlc --no-utils`

## Platform Integration (Required)

After deploying agents, integrate AIWG with your AI platform's context:

```bash
# In Claude Code
/aiwg-setup-project

# Or regenerate existing CLAUDE.md
/aiwg-regenerate-claude
```

This updates your project's `CLAUDE.md` with AIWG orchestration context, enabling:

- Natural language workflow commands
- Multi-agent coordination
- Phase-aware responses

**Other platforms:** See platform-specific quickstarts for integration commands.

## CLI Commands

### Framework Management

```bash
aiwg use <framework>       # Install and deploy framework
aiwg list                  # List installed frameworks
aiwg remove <id>           # Remove a framework
```

### Project Setup

```bash
aiwg -new                  # Create new project with templates
```

### Maintenance

```bash
aiwg -version              # Show installed version
aiwg -update               # Update installation
aiwg -reinstall            # Force fresh reinstall
aiwg -help                 # Show all commands
```

## In-Platform Commands

After deployment, these commands are available inside Claude Code:

| Command | Description |
|---------|-------------|
| `/aiwg-regenerate` | Regenerate context file (auto-detect platform) |
| `/aiwg-regenerate-claude` | Regenerate CLAUDE.md |
| `/intake-wizard` | Generate project intake forms |
| `/project-status` | Check project phase and status |

## Which Framework?

**Use SDLC Complete if you're:**

- Building software (web apps, APIs, services)
- Managing technical projects with requirements, architecture, testing
- Need traceability from requirements to deployment

**Use Media/Marketing Kit if you're:**

- Running marketing campaigns
- Managing brand content and assets
- Need workflow from strategy to performance analysis

**Use Both if you're:**

- Launching a product (code + marketing)
- Building software with marketing requirements

```bash
# Deploy all frameworks
aiwg use all
```

## Next Steps

1. Pick your framework: [SDLC](quickstart-sdlc.md) or [MMK](quickstart-mmk.md)
2. Pick your platform: [Claude Code](integrations/claude-code-quickstart.md), [Factory](integrations/factory-quickstart.md), or [Warp](integrations/warp-terminal-quickstart.md)
3. Start with intake - the framework guides you from there
