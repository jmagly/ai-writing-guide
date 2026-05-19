# AIWG CLI Usage Guide

> **Note:** The `aiwg` CLI command is only available when installed via npm (`npm install -g aiwg`). If you installed AIWG using Claude Code plugins (`/plugin install sdlc@aiwg`), you won't have access to the CLI - plugins provide agents, commands, and skills directly within Claude Code without requiring a separate CLI tool.

## Installation

```bash
npm install -g aiwg
```

## Quick Start

```bash
# Check installation health
aiwg doctor

# Preview the guided first-run path without writing files
aiwg wizard --dry-run --goal "help me start a project"

# Deploy SDLC framework to your project
cd your-project
aiwg use sdlc

# Verify AIWG is engaged in this project
aiwg status --probe --json
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

### wizard

Guide first-run provider, project, framework, deploy, and verification choices.

```bash
# Interactive terminal path
aiwg wizard

# No-write preview
aiwg wizard --dry-run --goal "help me start a project"

# Scripted path
aiwg wizard --non-interactive --profile beginner --provider codex
```

**Options:**
- `--goal <text>`: Plain-language goal used to recommend a framework
- `--profile <preset>`: Preset for a common path (`beginner`, `sdlc`, `research`, `marketing`, `forensics`, `ops`, `security`, `knowledge-base`, `writing`)
- `--provider <name>`: Target provider
- `--framework <name>`: Framework to deploy first
- `--non-interactive`: Use selected or inferred defaults without prompting
- `--dry-run`: Print the plan without writing files
- `--json`: Print the plan as JSON

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
aiwg status --probe --json
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

## Support

- **GitHub Issues**: https://github.com/jmagly/aiwg/issues
- **Documentation**: https://docs.aiwg.io
- **Examples**: `.aiwgrc.example.json` in repository
