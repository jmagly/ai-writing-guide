# AI Writing Guide

A comprehensive framework for improving AI-generated content by avoiding common tropes and maintaining authentic, professional writing standards.

## Purpose

This repository provides guidelines, validation tools, and context documents to help AI agents produce natural, professional content that:
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

- **`core/`** - Fundamental writing philosophy and principles
- **`validation/`** - Rules, banned phrases, and detection patterns
- **`examples/`** - Good vs. bad writing examples
- **`context/`** - Optimized documents for agent context
- **`patterns/`** - Common AI patterns to avoid
- **`tools/`** - Validation scripts and utilities

## Usage

### For Developers
Include relevant documents from this repository in your AI agent's context to improve output quality.

### For AI Agents
Follow the guidelines in `CLAUDE.md` and reference the validation rules before generating content.

### For Content Reviewers
Use the validation checklists and examples to assess AI-generated content quality.

## Agent Deployment

Use the shared agent pool to bootstrap projects quickly by copying agents into a project's `.claude/agents` directory.

- Quick deploy (from this repo root):
  - `node tools/agents/deploy-agents.mjs`

- Options:
  - `--source <path>`: path to this repo (defaults to this repo)
  - `--target <path>`: project root that will receive `.claude/agents` (defaults to current directory)
  - `--dry-run`: preview copies without writing
  - `--force`: overwrite on conflicts (otherwise SDLC agents get a `-sdlc` suffix)

- Behavior:
  - Copies all Markdown agents from `docs/agents/` and `docs/agents/sdlc/` into `.claude/agents` (flat).
  - Creates `.claude/agents` if it does not exist.
  - Filename conflicts are resolved by suffixing SDLC copies unless `--force`.

Tip: add a shell alias for convenience:
`alias deploy_agents='node /path/to/ai-writing-guide/tools/agents/deploy-agents.mjs'`

## One-Liner Install

Install the framework to `~/.local/share/ai-writing-guide` and register CLI aliases:

```bash
curl -fsSL https://raw.githubusercontent.com/manitcor/ai-writing-guide/main/tools/install/install.sh | bash
```

This adds a unified CLI:
- `aiwg -deploy-agents` — copy shared agents into `.claude/agents` (current dir)
- `aiwg -new` — scaffold a new project with intake templates
  - The CLI auto-updates the installed framework before running.
  - `aiwg -new` deploys agents automatically and initializes git (branch `main`). Use `--no-agents` to skip.

To customize the install (repo, branch, prefix):

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/manitcor/ai-writing-guide/main/tools/install/install.sh)" -- \
  --repo https://github.com/manitcor/ai-writing-guide.git \
  --branch main \
  --prefix $HOME/.local/share/ai-writing-guide
```

Node.js requirement:
- Node >= 18.20.8 (Latest LTS: Hydrogen).
- Use `--auto-install-node` to let the installer attempt setup via your package manager (NodeSource/Homebrew).
- If installation cannot be automated, the installer prints NVM/NodeSource instructions.

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
