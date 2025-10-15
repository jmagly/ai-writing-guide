# AI Writing Guide

A comprehensive framework for improving AI-generated content by avoiding common tropes and maintaining authentic,
professional writing standards.

## Purpose

This repository provides guidelines, validation tools, and context documents to help AI agents produce natural,
professional content that:

- Avoids detection as AI-generated
- Maintains technical accuracy and depth
- Sounds authentically human
- Follows consistent quality standards across projects

## Quick Start

For AI agents, include these files in your context:

1. `CLAUDE.md` - Agent-specific instructions
2. `core/philosophy.md` - Core writing principles
3. `validation/banned-patterns.md` - Patterns to avoid
4. `context/quick-reference.md` - Quick validation checklist

## Structure

### Writing Guide Content
- **`core/`** - Fundamental writing philosophy and principles
- **`validation/`** - Rules, banned phrases, and detection patterns
- **`examples/`** - Good vs. bad writing examples
- **`context/`** - Optimized documents for agent context
- **`patterns/`** - Common AI patterns to avoid

### General-Purpose Agents & Commands
- **`agents/`** - Writing-focused agents (writing-validator, prompt-optimizer, content-diversifier)
- **`commands/`** - General command documentation and examples

### SDLC Complete Framework
- **`agentic/code/frameworks/sdlc-complete/`** - Comprehensive software development lifecycle toolkit
  - `agents/` - 51 specialized SDLC role agents
  - `commands/` - 24 SDLC commands for project management
  - `templates/` - Intake, requirements, architecture, test, security, deployment templates
  - `flows/` - Phase-based workflows (Inception → Transition)
  - `add-ons/` - GDPR compliance, legal frameworks
  - `artifacts/` - Sample projects demonstrating complete lifecycle
  - `metrics/` - Tracking catalogs and health indicators

### Development Tools
- **`tools/`** - Validation scripts, deployment utilities, manifest generators

## Usage

### For Developers

Include relevant documents from this repository in your AI agent's context to improve output quality.

### For AI Agents

Follow the guidelines in `CLAUDE.md` and reference the validation rules before generating content.

### For Content Reviewers

Use the validation checklists and examples to assess AI-generated content quality.

## Agent & Command Deployment

Deploy agents and commands to bootstrap projects quickly:

```bash
# Deploy both general and SDLC agents (default)
node tools/agents/deploy-agents.mjs --target /path/to/project

# Deploy only general-purpose writing agents
node tools/agents/deploy-agents.mjs --mode general --target /path/to/project

# Deploy only SDLC framework agents
node tools/agents/deploy-agents.mjs --mode sdlc --target /path/to/project

# Deploy commands along with agents
node tools/agents/deploy-agents.mjs --deploy-commands --target /path/to/project

# Deploy only commands (no agents)
node tools/agents/deploy-agents.mjs --commands-only --target /path/to/project
```

Options:
- `--mode general|sdlc|both` - Select which agent set to deploy (default: both)
- `--source <path>` - Path to this repo (defaults to this repo)
- `--target <path>` - Project root that will receive `.claude/agents` (defaults to current directory)
- `--deploy-commands` - Also deploy commands to `.claude/commands`
- `--commands-only` - Deploy only commands, skip agents
- `--provider claude|openai` - Target platform (affects model names and directory structure)
- `--dry-run` - Preview copies without writing
- `--force` - Overwrite existing files

## One-Liner Install

Install the framework to `~/.local/share/ai-writing-guide` and register CLI aliases:

```bash
curl -fsSL https://raw.githubusercontent.com/jmagly/ai-writing-guide/refs/heads/main/tools/install/install.sh | bash
```

This adds a unified CLI:

- `aiwg -deploy-agents [--mode general|sdlc|both]` — Deploy agents to current project
- `aiwg -deploy-commands [--mode general|sdlc|both]` — Deploy commands to current project
- `aiwg -new` — Scaffold a new project with SDLC intake templates
  - The CLI auto-updates the installed framework before running
  - `aiwg -new` deploys SDLC agents automatically and initializes git (branch `main`). Use `--no-agents` to skip
  - Use `aiwg -deploy-agents --provider openai` to generate OpenAI/Codex-compatible agents into `.codex/agents`

To customize the install (repo, branch, prefix):

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/jmagly/ai-writing-guide/refs/heads/main/tools/install/install.sh)" -- \
  --repo https://github.com/jmagly/ai-writing-guide.git \
  --branch main \
  --prefix $HOME/.local/share/ai-writing-guide
```

Node.js requirement:

- Node >= 18.20.8 (Latest LTS: Hydrogen).
- Use `--auto-install-node` to let the installer attempt setup via your package manager (NodeSource/Homebrew).
- If installation cannot be automated, the installer prints NVM/NodeSource instructions.

## CLI Quick Reference

```text
aiwg -deploy-agents [--mode general|sdlc|both] [--provider <claude|openai>] [--source <path>] [--target <path>] [--dry-run] [--force]
aiwg -deploy-commands [--mode general|sdlc|both] [--provider <claude|openai>]
aiwg -new [--no-agents] [--provider <claude|openai>]
aiwg -prefill-cards --target agentic/code/frameworks/sdlc-complete/artifacts/<project> --team team-profile.(yml|yaml|json) [--write]
```

Tips:

- Use the Team Profile example at `agentic/code/frameworks/sdlc-complete/templates/management/team-profile-example.yaml` as a starting point
- For OpenAI/Codex projects, `aiwg -new --provider openai` deploys `.codex/AGENTS.md` by default
- Deploy only what you need: `--mode general` for writing tools, `--mode sdlc` for development lifecycle, `--mode both` for everything

## Key Principles

1. **Accuracy First** - Never invent facts or embellish details
2. **Technical Authority** - Write with genuine expertise, not marketing speak
3. **Natural Flow** - Vary structure, avoid formulaic patterns
4. **Specific Details** - Use exact metrics and real examples
5. **Authentic Voice** - Sound like a human expert, not a content generator

## Contributing

When adding new patterns or guidelines:

1. Document specific examples
2. Provide both good and bad alternatives
3. Explain why certain patterns are problematic
4. Test with actual AI outputs

## License

MIT License - See LICENSE file for details
