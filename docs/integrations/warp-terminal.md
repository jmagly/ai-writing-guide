# Warp Terminal Integration

## Overview

The AIWG SDLC framework supports **Warp Terminal** through native `WARP.md` file integration. Warp automatically loads AIWG agents and commands as project context.

## Installation

### Prerequisites

- **Warp Terminal** installed (https://www.warp.dev/)
- **AIWG** installed (`aiwg version` to verify)
- **Node.js 20.0.0+** (for CLI tools; Node 24 recommended for new installs)

### Setup

```bash
# Install AIWG (if not already installed)
curl -fsSL https://raw.githubusercontent.com/jmagly/ai-writing-guide/refs/heads/main/tools/install/install.sh | bash

# Verify installation
aiwg version
```

---

## Quick Start

### For New Projects

```bash
# Navigate to your project
cd /path/to/your/project

# Setup Warp with AIWG SDLC framework
aiwg use sdlc --provider warp

# Open in Warp Terminal
# Warp automatically loads WARP.md
```

### For Existing Projects

```bash
# If you already have a WARP.md with custom rules
cd /path/to/existing/project

# Merge AIWG content (preserves your existing rules)
aiwg use sdlc --provider warp
```

---

## Usage

### Command Options

#### `aiwg use sdlc --provider warp`

Deploy the AIWG SDLC framework to Warp Terminal (creates or merges WARP.md).

**Syntax**:
```bash
aiwg use sdlc --provider warp [options]
```

**Options**:
- `--force` - Overwrite existing WARP.md (discard user content)
- `--dry-run` - Preview changes without writing

**Examples**:
```bash
# Deploy SDLC framework to Warp
aiwg use sdlc --provider warp

# Preview what will be created
aiwg use sdlc --provider warp --dry-run

# Force overwrite (use with caution)
aiwg use sdlc --provider warp --force
```

#### Updating / Refreshing

To update WARP.md with the latest AIWG content after an upgrade:

```bash
# Update AIWG installation
aiwg update

# Refresh WARP.md with latest content
aiwg use sdlc --provider warp --force
```

---

## What Gets Created

### WARP.md Structure and File Discovery

Warp's Rules system recognizes two file names: `WARP.md` and `AGENTS.md`. When both exist in the same directory, `WARP.md` takes priority. AIWG continues to generate `WARP.md` for backward compatibility, but you may also encounter `AGENTS.md` in projects configured for other platforms.

Warp also natively discovers `.warp/skills/` directories in your project. See the Skills section below for details.

```markdown
# Project Context

<!-- Your existing rules preserved here -->
## Tech Stack
## Team Conventions
## Project Rules

---

<!-- AIWG SDLC Framework (auto-updated) -->
<!-- Last updated: 2025-10-17T20:42:48.420Z -->

## AIWG SDLC Framework

{AIWG orchestration context}

---

## SDLC Agents (58 Specialized Roles)

### Intake Coordinator
### Requirements Analyst
### Architecture Designer
...
{All agents aggregated}

---

## SDLC Commands (42+ Workflows)

### /intake-wizard
### /flow-inception-to-elaboration
...
{All 42+ commands aggregated}
```

**File Size**: ~300-400KB (all agents + commands in single file)

---

## Using AIWG with Warp

### Natural Language Commands

Warp AI understands natural language based on WARP.md context:

```bash
# In Warp Terminal
"Let's transition to Elaboration"
→ Warp understands this references AIWG phase transition workflow

"Run security review"
→ Warp knows to execute security validation workflow

"Where are we in the project?"
→ Warp can reference AIWG phase and milestone context
```

### Warp Slash Commands

Type `/` in Warp to access commands:

```bash
/init              # Initialize/re-index project
/open-project-rules # Open WARP.md in editor
/add-rule          # Add custom global rule
```

### Accessing SDLC Agents

Agents are embedded in WARP.md as context. Warp AI automatically uses them when relevant:

- **Intake Coordinator** - Project setup and initialization
- **Requirements Analyst** - Requirements gathering
- **Architecture Designer** - System design
- **Security Architect** - Security validation
- **Test Engineer** - Test strategy
- ...and 53 more specialized roles

---

## How It Works

### 1. Warp Loads WARP.md via the Rules System

`WARP.md` is loaded by Warp's **Rules system** — not by Agent Mode or Codebase Context, which are separate features. When you open a project in Warp Terminal:

1. Warp's Rules system detects `WARP.md` (or `AGENTS.md`) and loads it as persistent context
2. Rules follow a hierarchical loading order: subdirectory file overrides root directory file, which overrides Global Rules
3. All AIWG agents and commands defined in the file become available to the AI
4. Warp also recognizes `.cursorrules` and `.clinerules` files when linked from rules files, enabling cross-tool compatibility

### 2. Intelligent Merge

`aiwg use sdlc --provider warp` intelligently merges content:

**User Sections (Preserved)**:
- Tech Stack
- Team Conventions
- Project Rules
- Custom sections

**AIWG Sections (Replaced)**:
- AIWG SDLC Framework
- SDLC Agents
- SDLC Commands
- Platform Compatibility

### 3. Backup Protection

Before any modifications:
```bash
# Automatic backup created
WARP.md.backup-2025-10-17T20-43-24-831Z

# Restore if needed
cp WARP.md.backup-2025-10-17T20-43-24-831Z WARP.md
```

---

## Skills

Warp natively discovers skills in the `.warp/skills/` directory of your project. Each skill is its own subdirectory containing a `SKILL.md` file with YAML frontmatter:

```markdown
---
name: security-review
description: Run AIWG security validation workflow for the current project
---

## Security Review Skill

{skill instructions and workflow steps}
```

Skills are invoked in two ways:

- **Intent matching** — Warp auto-invokes a skill when your request matches its description
- **Explicit invocation** — Type `/{skill-name}` in Warp to invoke a skill directly (e.g., `/security-review`)

AIWG deploys a set of `.warp/skills/` entries alongside `WARP.md` when you run `aiwg use sdlc --provider warp`. You can also add custom skills to `.warp/skills/` — they are version-controlled alongside your project and will not be overwritten by AIWG updates.

---

## Agent Profiles

Warp supports Agent Profiles (Settings > AI > Agents > Profiles) for configuring the model, autonomy levels, and command allow/deny lists used by the AI. These are user-local settings; they are not distributable via project files. Teams wanting consistent AI behavior across members should use `WARP.md` rules and `.warp/skills/` rather than relying on Agent Profile configuration.

---

## Warp Drive

Warp Drive is Warp's team sharing feature. Workflows, prompts, notebooks, and environment variables can be shared via Warp Drive and made available to all team members.

Skills and agent definitions (including AIWG content) cannot be shared via Warp Drive — they must be version-controlled in the project repository and cloned alongside the codebase. Commit `WARP.md` and `.warp/skills/` to your repository to ensure all team members receive the same context.

---

## Deployment Modes

### Mode: `both` (Default)

Deploys both general-purpose and SDLC agents:
- **General agents**: writing-validator, prompt-optimizer, content-diversifier
- **SDLC agents**: Full lifecycle coverage
- **Total**: All agents + commands

```bash
aiwg use sdlc --provider warp
```

### Mode: `sdlc`

Deploys only SDLC framework agents:
- **SDLC agents**: Intake → Inception → Elaboration → Construction → Transition
- **Full commands**: Full SDLC workflow orchestration

```bash
aiwg use sdlc --provider warp
```

### Mode: `general`

Deploys only general-purpose agents:
- **General agents**: Writing quality, prompt optimization, content generation

```bash
aiwg use general --provider warp
```

---

## Updating AIWG Content

### When to Update

Update WARP.md when:
- AIWG releases new agents or commands
- Agent definitions are enhanced
- You want latest orchestration patterns

### Update Process

```bash
# Check current AIWG version
aiwg version

# Update AIWG installation
aiwg update

# Refresh WARP.md with latest content
aiwg use sdlc --provider warp --force
```

**What happens**:
1. Creates backup: `WARP.md.backup-{timestamp}`
2. Preserves all user sections
3. Replaces AIWG sections with latest
4. Validates structure and counts

---

## Troubleshooting

### WARP.md Not Loading

**Symptom**: Warp doesn't seem to use WARP.md context

**Solution**:
```bash
# In Warp Terminal
/init

# Or manually trigger re-index
# Navigate to project root and reopen Warp
```

### Setup Command Not Found

**Symptom**: `aiwg use: command not found`

**Solution**:
```bash
# Reload shell configuration
source ~/.bash_aliases  # or ~/.zshrc

# Or reinstall AIWG
curl -fsSL https://raw.githubusercontent.com/jmagly/ai-writing-guide/refs/heads/main/tools/install/install.sh | bash
```

### User Content Lost

**Symptom**: Custom rules disappeared after update

**Solution**:
```bash
# Restore from automatic backup
ls WARP.md.backup-*  # Find latest backup
cp WARP.md.backup-{timestamp} WARP.md

# Then re-run without --force to merge instead of overwrite
aiwg use sdlc --provider warp
```

### File Too Large

**Symptom**: WARP.md is 300KB+ and seems slow

**Solution**:
```bash
# Deploy only what you need
aiwg use sdlc --provider warp  # Skip general agents

# Or use Claude Code for full agent orchestration
# (Warp is best for terminal-native workflows)
```

### AIWG Installation Not Found

**Symptom**: Error: AIWG installation not found

**Solution**:
```bash
# Set AIWG_ROOT if installed elsewhere
export AIWG_ROOT=/path/to/ai-writing-guide

# Or reinstall to standard location
curl -fsSL https://raw.githubusercontent.com/jmagly/ai-writing-guide/refs/heads/main/tools/install/install.sh | bash
```

---

## Comparison: Warp vs Claude Code

| Feature | Warp Terminal | Claude Code |
|---------|--------------|-------------|
| **Platform** | Terminal-native | IDE-native |
| **File Format** | `WARP.md` (single file) + `.warp/skills/` | Multiple `.claude/agents/*.md` |
| **Orchestration** | Single agent with `/orchestrate` parallel dispatch | Multi-agent workflows |
| **Use Case** | Command-line workflows | Full SDLC orchestration |
| **Artifact Generation** | Limited | Full (SAD, test plans, etc.) |
| **Natural Language** | Yes | Yes |
| **SDLC Workflows** | Context only | Full execution |

**Recommendation**:
- **Use Warp** for terminal-heavy workflows, command suggestions
- **Use Claude Code** for multi-agent orchestration, artifact generation
- **Use Both** for best experience (Warp for terminal, Claude Code for project work)

---

## Advanced Usage

### Custom Sections

Add project-specific rules that won't be overwritten:

```markdown
# Project Context

## Deployment Process

- Stage deploys from `develop` branch
- Production requires 2 approvals
- Rollback procedure documented in wiki

<!-- AIWG sections below will be auto-updated -->
```

### Integration with Claude Code

Use both platforms simultaneously:

```bash
# Deploy to Claude Code
aiwg use sdlc

# Deploy to Warp Terminal
aiwg use sdlc --provider warp

# Now use:
# - Claude Code for orchestration, artifact generation
# - Warp Terminal for command-line workflows
```

### Refreshing Specific Frameworks

```bash
# Refresh SDLC framework in Warp
aiwg use sdlc --provider warp --force

# Deploy general-purpose framework to Warp
aiwg use general --provider warp --force
```

---

## FAQ

### Q: Do I need Claude Code to use Warp integration?

**A**: No. Warp integration works standalone. However, Claude Code provides multi-agent orchestration that Warp cannot match.

### Q: Can I edit WARP.md manually?

**A**: Yes! Add custom sections above the `<!-- AIWG SDLC Framework -->` marker. They'll be preserved on updates.

### Q: How often should I update?

**A**: Update when AIWG releases new versions (`aiwg update`), then refresh WARP.md (`aiwg use sdlc --provider warp --force`).

### Q: Does this work offline?

**A**: WARP.md setup works offline. Warp AI requires internet for LLM access.

### Q: Can I use this in CI/CD?

**A**: Yes. Run `aiwg use sdlc --provider warp` in your repository setup scripts to auto-configure new clones.

### Q: What if I use both Warp and Cursor?

**A**: AIWG supports both. Deploy to each provider independently:
```bash
aiwg use sdlc --provider warp    # For Warp
aiwg use sdlc --provider cursor  # For Cursor
```

---

## Resources

- **Warp Terminal**: https://www.warp.dev/
- **Warp Rules Documentation**: https://docs.warp.dev/agent-platform/capabilities/rules
- **Warp Skills Documentation**: https://docs.warp.dev/agent-platform/capabilities/skills
- **Warp MCP Documentation**: https://docs.warp.dev/agent-platform/capabilities/mcp
- **AIWG Repository**: https://github.com/jmagly/aiwg
- **AIWG SDLC Framework**: `~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/README.md`

---

## Support

- **Issues**: https://github.com/jmagly/aiwg/issues
- **Discussions**: https://github.com/jmagly/aiwg/discussions
- **Warp Support**: https://docs.warp.dev/

---

**Last Updated**: 2026-03-27
**Integration Status**: Production Ready
