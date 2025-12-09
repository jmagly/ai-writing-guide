# AI Writing Guide - Quick Start

Choose your framework based on what you're building.

## Frameworks

| Framework | Purpose | Intake Methods |
|-----------|---------|----------------|
| **[SDLC Complete](quickstart-sdlc.md)** | Software development lifecycle | New project, existing codebase, manual |
| **[Media/Marketing Kit](quickstart-mmk.md)** | Marketing campaign lifecycle | New campaign, existing assets, manual brief |
| **Writing Quality** | Voice profiles for authentic writing | Voice commands, profile creation |

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
aiwg use sdlc              # Software projects (54 agents, 42 commands, 10 skills)
aiwg use marketing         # Marketing projects (37 agents, 8 skills)
aiwg use writing           # Writing quality + Voice Framework (3 agents, 5 skills)
aiwg use all               # All frameworks

# Open in your AI tool
claude .                   # Claude Code
droid .                    # Factory AI
```

## What `aiwg use` Does

The `aiwg use <framework>` command:

1. Deploys framework agents to `.claude/agents/`
2. Deploys framework commands to `.claude/commands/`
3. Deploys framework skills to `.claude/skills/`
4. Installs **aiwg-utils** addon (regenerate commands, etc.)

To skip aiwg-utils: `aiwg use sdlc --no-utils`

## Voice Framework (Writing Quality)

The `writing` framework includes the Voice Framework addon for consistent, authentic writing:

**Built-in Voice Profiles:**

| Profile | Description | Best For |
|---------|-------------|----------|
| `technical-authority` | Direct, precise, confident | API docs, architecture |
| `friendly-explainer` | Approachable, encouraging | Tutorials, onboarding |
| `executive-brief` | Concise, outcome-focused | Business cases, reports |
| `casual-conversational` | Relaxed, personal | Blogs, newsletters |

**Skills included:**
- `voice-apply` - Transform content to match a voice profile
- `voice-create` - Generate new profiles from examples
- `voice-blend` - Combine profiles with weighted ratios
- `voice-analyze` - Analyze content's current voice

**Usage:**
```text
"Write this in technical-authority voice"
"Make this documentation more friendly"
"Create a voice profile for our internal docs"
```

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

**Use Writing Quality if you're:**

- Writing documentation, articles, or content
- Need consistent voice across outputs
- Want to replace pattern-avoidance with positive voice definition

**Use Multiple:**

```bash
# Deploy all frameworks
aiwg use all

# Or combine specific frameworks
aiwg use sdlc
aiwg use writing           # Add voice profiles to SDLC project
```

## Next Steps

1. Pick your framework: [SDLC](quickstart-sdlc.md) or [MMK](quickstart-mmk.md)
2. Pick your platform: [Claude Code](integrations/claude-code-quickstart.md), [Factory](integrations/factory-quickstart.md), or [Warp](integrations/warp-terminal-quickstart.md)
3. Start with intake - the framework guides you from there
