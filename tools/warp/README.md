# Warp Terminal Integration Tools

This directory contains tools for integrating the AIWG SDLC framework with Warp Terminal.

## Overview

Warp Terminal uses a single `WARP.md` file in the project root to provide context and command definitions. The setup-warp.mjs script intelligently merges AIWG SDLC content with existing project documentation.

## setup-warp.mjs

Aggregates all AIWG agents and commands into a single WARP.md file while preserving user-specific content.

### Usage

```bash
# Initial setup (create or merge with existing WARP.md)
node tools/warp/setup-warp.mjs

# Update existing WARP.md (fails if no WARP.md exists)
node tools/warp/setup-warp.mjs --update

# Preview changes without writing
node tools/warp/setup-warp.mjs --dry-run

# Deploy to specific directory
node tools/warp/setup-warp.mjs --target /path/to/project

# Deploy only SDLC agents and commands
node tools/warp/setup-warp.mjs --mode sdlc

# Deploy only general-purpose agents and commands
node tools/warp/setup-warp.mjs --mode general

# Force overwrite (discard user content)
node tools/warp/setup-warp.mjs --force
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--target <path>` | Target directory | Current working directory |
| `--mode <type>` | Deployment mode: general, sdlc, or both | both |
| `--update` | Update mode (fail if no WARP.md) | false (setup mode) |
| `--dry-run` | Preview without writing | false |
| `--force` | Overwrite (discard user content) | false |

### Modes

- **general**: Deploy only general-purpose writing agents and commands
- **sdlc**: Deploy only SDLC Complete framework agents and commands
- **both**: Deploy everything (default)

### Intelligent Merge Strategy

The script preserves user-specific content while replacing AIWG-managed sections:

**User-Managed Sections** (preserved):
- `# Project Context` (custom project documentation)
- `## Tech Stack`
- `## Team Conventions`
- `## Project Rules`
- Any custom `##` headings not matching AIWG patterns

**AIWG-Managed Sections** (replaced on update):
- `## AIWG SDLC Framework`
- `## SDLC Agents`
- `## SDLC Commands`
- `## Natural Language Command Translation`
- `## Resources`

### Three Scenarios

1. **No WARP.md**: Creates new WARP.md from template
2. **WARP.md exists, no AIWG section**: Appends AIWG content, preserves all user content
3. **WARP.md exists with AIWG section**: Replaces AIWG sections, preserves user content

### Backup Strategy

When updating existing WARP.md (not in dry-run mode):
- Automatic backup created: `WARP.md.backup-{timestamp}`
- Original file preserved before modifications
- Timestamp format: ISO 8601 with safe filename characters

### Validation

The script validates WARP.md structure after deployment:
- AIWG section presence
- Agent count (expected 58+ for SDLC mode)
- Command count (expected 42+ for SDLC mode)
- Displays warnings if counts are low

### Example Workflows

**Initial project setup**:
```bash
cd /path/to/project
node /path/to/ai-writing-guide/tools/warp/setup-warp.mjs
# Review WARP.md
# Open project in Warp Terminal
```

**Update to latest AIWG version**:
```bash
cd /path/to/project
node /path/to/ai-writing-guide/tools/warp/setup-warp.mjs --update
# User content preserved, AIWG sections updated
```

**Preview before committing**:
```bash
cd /path/to/project
node /path/to/ai-writing-guide/tools/warp/setup-warp.mjs --dry-run
# Review preview output
# Run without --dry-run when satisfied
```

### CLI Integration

This script will be integrated into the `aiwg` CLI:

```bash
# Setup Warp (initial)
aiwg -setup-warp

# Update Warp (existing)
aiwg -update-warp

# With options
aiwg -setup-warp --mode sdlc --target /path/to/project
```

## Technical Details

### Agent Transformation

Agents are transformed from individual `.md` files to WARP.md sections:

**Input** (`agent-name.md`):
```markdown
---
description: Agent purpose
allowed-tools: Bash, Read, Write
model: sonnet
---

# Agent content...
```

**Output** (in WARP.md):
```markdown
### Agent Name

**Tools**: Bash, Read, Write

**Purpose**: Agent purpose

Agent content...
```

### Command Transformation

Commands are transformed similarly:

**Input** (`command-name.md`):
```markdown
---
description: Command purpose
category: sdlc-setup
---

# Command content...
```

**Output** (in WARP.md):
```markdown
### /command-name

**Purpose**: Command purpose

Command content preview...
```

### AIWG Installation Resolution

The script resolves the AIWG installation path in priority order:

1. `$AIWG_ROOT` environment variable
2. `~/.local/share/ai-writing-guide`
3. `/usr/local/share/ai-writing-guide`
4. Repo root (development fallback)

Validates by checking for `agentic/code/frameworks/sdlc-complete/` subdirectory.

## Warp Terminal Integration

### How Warp Uses WARP.md

Warp Terminal automatically loads `WARP.md` when:
- Opening terminal in project directory
- Running `warp /init` manually
- Editing files in the project

### Natural Language Support

Users can trigger SDLC workflows with natural language:

- "Let's transition to Elaboration" → Orchestrates phase transition
- "Run security review" → Executes security validation
- "Where are we?" → Checks project status

See the generated WARP.md for complete phrase list.

## Development

### Testing

Run manual tests to verify functionality:

```bash
# Test basic setup
cd /tmp/test-warp && node /path/to/setup-warp.mjs

# Test merge with existing content
echo "# My Project" > /tmp/test-warp/WARP.md
node /path/to/setup-warp.mjs --target /tmp/test-warp

# Test update mode
node /path/to/setup-warp.mjs --target /tmp/test-warp --update

# Test force mode
node /path/to/setup-warp.mjs --target /tmp/test-warp --force
```

### Code Reuse

This script follows patterns from `deploy-agents.mjs`:
- Argument parsing
- Directory creation
- File transformation
- Validation reporting
- ~80% code reuse from existing patterns

## Resources

- **Specification**: `.aiwg/features/warp-terminal-integration/WARP-COMMANDS-SPEC.md`
- **Warp Documentation**: https://docs.warp.dev/knowledge-and-collaboration/rules
- **AIWG Framework**: `agentic/code/frameworks/sdlc-complete/README.md`
