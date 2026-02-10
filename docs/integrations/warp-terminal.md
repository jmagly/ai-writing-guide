# Warp Terminal Integration

## Overview

The AI Writing Guide (AIWG) SDLC framework supports **Warp Terminal** through native `WARP.md` file integration. Warp automatically loads AIWG agents and commands as project context.

## Installation

### Prerequisites

- **Warp Terminal** installed (https://www.warp.dev/)
- **AIWG** installed (`aiwg -version` to verify)
- **Node.js 18.20.8+** (for CLI tools)

### Setup

```bash
# Install AIWG (if not already installed)
curl -fsSL https://raw.githubusercontent.com/jmagly/ai-writing-guide/refs/heads/main/tools/install/install.sh | bash

# Verify installation
aiwg -version
```

---

## Quick Start

### For New Projects

```bash
# Navigate to your project
cd /path/to/your/project

# Setup Warp with AIWG SDLC framework
aiwg -setup-warp

# Open in Warp Terminal
# Warp automatically loads WARP.md
```

### For Existing Projects

```bash
# If you already have a WARP.md with custom rules
cd /path/to/existing/project

# Merge AIWG content (preserves your existing rules)
aiwg -setup-warp
```

---

## Usage

### Command Options

#### `aiwg -setup-warp`

Setup Warp Terminal with AIWG SDLC framework (creates or merges WARP.md).

**Syntax**:
```bash
aiwg -setup-warp [options]
```

**Options**:
- `--target <path>` - Target directory (default: current directory)
- `--mode <type>` - Deployment mode: `general`, `sdlc`, or `both` (default: `both`)
- `--dry-run` - Preview changes without writing
- `--force` - Overwrite existing WARP.md (discard user content)

**Examples**:
```bash
# Setup with SDLC agents only
aiwg -setup-warp --mode sdlc

# Preview what will be created
aiwg -setup-warp --dry-run

# Setup in specific directory
aiwg -setup-warp --target /path/to/project

# Force overwrite (use with caution)
aiwg -setup-warp --force
```

#### `aiwg -update-warp`

Update existing WARP.md with latest AIWG content (fails if no WARP.md exists).

**Syntax**:
```bash
aiwg -update-warp [options]
```

**Options**:
- `--target <path>` - Target directory (default: current directory)

**Examples**:
```bash
# Update current project
aiwg -update-warp

# Update specific project
aiwg -update-warp --target /path/to/project
```

---

## What Gets Created

### WARP.md Structure

```markdown
# Project Context

<!-- Your existing rules preserved here -->
## Tech Stack
## Team Conventions
## Project Rules

---

<!-- AIWG SDLC Framework (auto-updated) -->
<!-- Last updated: 2025-10-17T20:42:48.420Z -->

## AIWG (AI Writing Guide) SDLC Framework

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

### 1. Warp Loads WARP.md

When you open a project in Warp Terminal:
1. Warp automatically detects `WARP.md` in project root
2. Loads content as context for AI agents
3. Makes all AIWG agents and commands available

### 2. Intelligent Merge

`aiwg -setup-warp` intelligently merges content:

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

## Deployment Modes

### Mode: `both` (Default)

Deploys both general-purpose and SDLC agents:
- **General agents**: writing-validator, prompt-optimizer, content-diversifier
- **SDLC agents**: Full lifecycle coverage
- **Total**: All agents + commands

```bash
aiwg -setup-warp --mode both
```

### Mode: `sdlc`

Deploys only SDLC framework agents:
- **SDLC agents**: Intake → Inception → Elaboration → Construction → Transition
- **Full commands**: Full SDLC workflow orchestration

```bash
aiwg -setup-warp --mode sdlc
```

### Mode: `general`

Deploys only general-purpose agents:
- **General agents**: Writing quality, prompt optimization, content generation

```bash
aiwg -setup-warp --mode general
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
aiwg -version

# Update AIWG installation
aiwg -update

# Update WARP.md with latest content
aiwg -update-warp
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

**Symptom**: `aiwg -setup-warp: command not found`

**Solution**:
```bash
# Reload shell aliases
source ~/.bash_aliases  # or ~/.zshrc

# Or reinstall AIWG
aiwg -reinstall
```

### User Content Lost

**Symptom**: Custom rules disappeared after update

**Solution**:
```bash
# Restore from automatic backup
ls WARP.md.backup-*  # Find latest backup
cp WARP.md.backup-{timestamp} WARP.md

# Then re-run with merge (not force)
aiwg -setup-warp  # WITHOUT --force flag
```

### File Too Large

**Symptom**: WARP.md is 300KB+ and seems slow

**Solution**:
```bash
# Deploy only what you need
aiwg -setup-warp --mode sdlc  # Skip general agents

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
| **File Format** | Single `WARP.md` | Multiple `.claude/agents/*.md` |
| **Orchestration** | Single AI agent | Multi-agent workflows |
| **Use Case** | Command-line workflows | Full SDLC orchestration |
| **Artifact Generation** | Limited | Full (SAD, test plans, etc.) |
| **Natural Language** | Yes ✅ | Yes ✅ |
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
aiwg -deploy-agents --mode sdlc
aiwg -deploy-commands --mode sdlc

# Deploy to Warp Terminal
aiwg -setup-warp --mode sdlc

# Now use:
# - Claude Code for orchestration, artifact generation
# - Warp Terminal for command-line workflows
```

### Selective Updates

Update only specific modes:

```bash
# Update only SDLC agents (skip general)
aiwg -setup-warp --mode sdlc --force

# Update only general agents (skip SDLC)
aiwg -setup-warp --mode general --force
```

---

## FAQ

### Q: Do I need Claude Code to use Warp integration?

**A**: No. Warp integration works standalone. However, Claude Code provides multi-agent orchestration that Warp cannot match.

### Q: Can I edit WARP.md manually?

**A**: Yes! Add custom sections above the `<!-- AIWG SDLC Framework -->` marker. They'll be preserved on updates.

### Q: How often should I update?

**A**: Update when AIWG releases new versions (`aiwg -update`), then refresh WARP.md (`aiwg -update-warp`).

### Q: Does this work offline?

**A**: WARP.md setup works offline. Warp AI requires internet for LLM access.

### Q: Can I use this in CI/CD?

**A**: Yes. Run `aiwg -setup-warp` in your repository setup scripts to auto-configure new clones.

### Q: What if I use both Warp and Cursor?

**A**: AIWG supports both. Warp uses `WARP.md`, Cursor uses `.cursorrules`. Deploy to both:
```bash
aiwg -setup-warp              # For Warp
# Create .cursorrules manually  # For Cursor
```

---

## Resources

- **Warp Terminal**: https://www.warp.dev/
- **Warp Rules Documentation**: https://docs.warp.dev/knowledge-and-collaboration/rules
- **AIWG Repository**: https://github.com/jmagly/aiwg
- **AIWG SDLC Framework**: `~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/README.md`

---

## Support

- **Issues**: https://github.com/jmagly/aiwg/issues
- **Discussions**: https://github.com/jmagly/aiwg/discussions
- **Warp Support**: https://docs.warp.dev/

---

**Last Updated**: 2025-10-17
**AIWG Version**: 1.4.0+
**Integration Status**: ✅ Production Ready
