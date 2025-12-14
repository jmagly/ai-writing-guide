# AIWG CLI Usage Guide

## Installation

```bash
npm install -g aiwg
```

## Quick Start

```bash
# Check installation health
aiwg doctor

# Deploy SDLC framework to your project
cd your-project
aiwg use sdlc
```

## Core Commands

### doctor

Check AIWG installation health and diagnose issues.

```bash
aiwg doctor
```

Checks:
- AIWG installation location
- Version info
- Project `.aiwg/` directory
- Deployed agents and commands
- Node.js version
- MCP server availability
- Skill Seekers (optional)

### use

Deploy a framework to your project.

```bash
# SDLC framework (software development)
aiwg use sdlc

# Marketing framework
aiwg use marketing

# Writing addon (voice profiles)
aiwg use writing

# All frameworks
aiwg use all
```

**Options:**
- `--provider <name>`: Target platform (claude, factory, openai, warp)
- `--no-utils`: Skip aiwg-utils addon
- `--force`: Overwrite existing deployments

### -new

Create a new project with full SDLC scaffolding.

```bash
aiwg -new my-project
cd my-project
```

### -status

Show workspace health and installed frameworks.

```bash
aiwg -status
```

### list

List installed frameworks and addons.

```bash
aiwg list
```

### remove

Remove a framework or addon.

```bash
aiwg remove <id>
```

## MCP Server

### mcp serve

Start the AIWG MCP server.

```bash
aiwg mcp serve
```

### mcp install

Generate MCP client configuration.

```bash
# For Claude Desktop
aiwg mcp install claude

# For Cursor IDE
aiwg mcp install cursor

# For Factory AI
aiwg mcp install factory

# Preview without writing
aiwg mcp install claude --dry-run
```

### mcp info

Show MCP server capabilities.

```bash
aiwg mcp info
```

## Channel Management

### --use-main

Switch to bleeding edge (tracks main branch).

```bash
aiwg --use-main
```

### --use-stable

Switch back to stable (npm releases).

```bash
aiwg --use-stable
```

## Maintenance

### -version

Show version and channel info.

```bash
aiwg -version
```

### -update

Check for and apply updates.

```bash
aiwg -update
```

### -help

Show all available commands.

```bash
aiwg -help
```

## Voice Framework (Skills)

The Voice Framework provides positive voice definition through voice profiles—the preferred approach for consistent writing.

### Voice Profiles

Built-in profiles in `~/.local/share/ai-writing-guide/agentic/code/addons/voice-framework/voices/templates/`:

| Profile | Description | Best For |
|---------|-------------|----------|
| `technical-authority` | Direct, precise, confident | API docs, architecture |
| `friendly-explainer` | Approachable, encouraging | Tutorials, onboarding |
| `executive-brief` | Concise, outcome-focused | Business cases, reports |
| `casual-conversational` | Relaxed, personal | Blogs, newsletters |

### Voice Skills

**voice-apply**: Transform content to match a voice profile

```text
"Write this in technical-authority voice"
"Make it more casual"
"Use the executive-brief voice"
```

**voice-create**: Generate new profiles from descriptions or examples

```text
"Create a voice for API documentation"
"Make a voice profile from this sample"
```

**voice-blend**: Combine multiple voice profiles with weighted ratios

```text
"Blend 70% technical with 30% friendly"
"Mix executive and casual voices"
```

**voice-analyze**: Analyze content's current voice characteristics

```text
"What voice is this written in?"
"Analyze the tone of this document"
```

### Deploy Voice Framework

```bash
# Deploy writing addon (includes Voice Framework)
aiwg use writing

# Or deploy with all frameworks
aiwg use all
```

### Custom Voice Profiles

Create project-specific profiles in `.aiwg/voices/`:

```yaml
# .aiwg/voices/internal-docs.yaml
name: internal-docs
description: Casual but technically precise

tone:
  formality: 0.4
  confidence: 0.8
  warmth: 0.6
  energy: 0.5

vocabulary:
  prefer:
    - "specifically"
    - "for example"
  avoid:
    - "leverage"
    - "utilize"
```

Profile priority order:
1. Project: `.aiwg/voices/`
2. User: `~/.config/aiwg/voices/`
3. Built-in: Voice Framework templates

## Agent Linting (Slash Command)

Validate agent definitions against the AIWG Agent Design Bible (10 Golden Rules).

Use the `/devkit-test` slash command to validate agent definitions:

```text
/devkit-test
```

**Rules Checked:**
| Rule | Description | Severity |
|------|-------------|----------|
| R001 | Agent must have name field | error |
| R002 | Agent must have description | error |
| R003 | Single responsibility (description length) | warning |
| R004 | Tool count (0-3 optimal) | warning |
| R005 | Model tier appropriate to task | info |
| R006 | Required frontmatter fields | error |
| R007 | Tool naming convention | warning |
| R008 | No circular dependencies | error |
| R009 | Outputs clearly defined | info |
| R010 | Error handling documented | info |

---

## @-Mention Utilities (Slash Commands)

Manage traceability through @-mention references in code and documentation.

| Command | Description |
|---------|-------------|
| `/mention-wire` | Inject @-mentions based on codebase analysis |
| `/mention-validate` | Validate @-mentions resolve to existing files |
| `/mention-lint` | Lint @-mentions for style consistency |
| `/mention-report` | Generate traceability report |
| `/mention-conventions` | Display naming conventions |

---

## Deploy Generators (Slash Command)

Generate production-ready deployment configurations using `/deploy-gen`:

```text
/deploy-gen docker --app-name myapp --port 3000
/deploy-gen k8s --app-name myapp --port 3000
/deploy-gen compose --app-name myapp --port 3000
```

Generates Docker, Kubernetes, or Docker Compose configurations with security best practices.

---

## Support

- **GitHub Issues**: https://github.com/jmagly/ai-writing-guide/issues
- **Documentation**: https://github.com/jmagly/ai-writing-guide/blob/main/README.md
- **Examples**: `.aiwgrc.example.json` in repository
