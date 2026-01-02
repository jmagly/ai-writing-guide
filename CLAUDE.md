# AI Writing Guide

Framework for improving AI-generated content quality with voice profiles, validation tools, and specialized agents.

## Quick Start

```bash
# Validate content for voice consistency
/writing-validator "path/to/content.md"

# SDLC workflows (use natural language)
"transition to elaboration"
"run security review"
"where are we?"

# Agent deployment
aiwg use sdlc
```

## Repository Structure

```
agentic/code/
├── frameworks/
│   ├── sdlc-complete/       # 64 SDLC agents, 97 commands
│   └── media-marketing-kit/ # 37 marketing agents
├── addons/
│   └── voice-framework/     # Voice profiles
└── agents/                  # 4 writing agents

src/                         # CLI and MCP server implementation
test/                        # Test suites and fixtures
tools/                       # Build and deployment scripts
```

## Context Loading Strategy

**Automatic (via path-scoped rules)**:

| Working in... | Rules loaded |
|---------------|--------------|
| `.aiwg/**` | SDLC orchestration |
| `**/*.md` | Voice framework |
| `src/**`, `test/**` | Development conventions |
| `.claude/agents/**` | Agent deployment |

**On-demand (via @-mentions)**:

Use `@path/to/file.md` in your message to load specific documentation:
- `@agentic/code/frameworks/sdlc-complete/docs/orchestrator-architecture.md` - Full orchestration details
- `@agentic/code/frameworks/sdlc-complete/agents/manifest.json` - SDLC agent listing
- `@.aiwg/requirements/UC-*.md` - Specific requirements

## Multi-Platform Support

| Platform | Agent Location | Command |
|----------|----------------|---------|
| Claude Code | `.claude/agents/` | `aiwg use sdlc` |
| GitHub Copilot | `.github/agents/` | `aiwg use sdlc --provider copilot` |
| Warp Terminal | `WARP.md` | Symlinked to CLAUDE.md |
| Factory AI | `.factory/droids/` | `aiwg use sdlc --provider factory` |
| OpenCode | `.opencode/agent/` | `aiwg use sdlc --provider opencode` |
| Cursor | `.cursor/rules/` | `aiwg use sdlc --provider cursor` |
| OpenAI/Codex | `~/.codex/skills/` | `aiwg use sdlc --provider codex` |

## Writing Principles

1. **Apply appropriate voice** - Match audience (technical-authority, friendly-explainer, executive-brief, casual-conversational)
2. **Maintain sophistication** - Preserve domain-appropriate vocabulary
3. **Include authenticity markers** - Add opinions, acknowledge trade-offs
4. **Vary structure** - Mix sentence lengths and styles
5. **Be specific** - Exact metrics, concrete examples

## Installation

### Claude Code Plugin (Recommended)

```bash
# Add AIWG marketplace (one-time)
/plugin marketplace add jmagly/ai-writing-guide

# Install plugins
/plugin install sdlc@aiwg        # 64 SDLC agents, 97 commands
/plugin install marketing@aiwg   # 37 marketing agents
/plugin install utils@aiwg       # Core utilities
/plugin install voice@aiwg       # Voice profiles

# Verify
/plugin list
```

### npm Install (CLI + Multi-Platform)

```bash
# Install via npm
npm install -g aiwg

# CLI commands
aiwg -version          # Show version
aiwg use sdlc          # Deploy SDLC framework
aiwg use marketing     # Deploy marketing framework
aiwg use all           # Deploy all frameworks
aiwg -new              # Scaffold new project
aiwg -help             # Show all commands
```

## Project Artifacts (.aiwg/)

All SDLC artifacts stored in `.aiwg/`:

```
.aiwg/
├── intake/        # Project intake forms
├── requirements/  # User stories, use cases
├── architecture/  # SAD, ADRs
├── planning/      # Phase plans
├── risks/         # Risk register
├── testing/       # Test strategy
├── security/      # Threat models
├── deployment/    # Deployment plans
├── working/       # Temporary (safe to delete)
└── reports/       # Generated reports
```

## Key References

| Topic | Location |
|-------|----------|
| SDLC Framework | `@~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/README.md` |
| Voice Profiles | `@agentic/code/addons/voice-framework/voices/templates/` |
| Natural Language Patterns | `@~/.local/share/ai-writing-guide/docs/simple-language-translations.md` |
| Agent Catalog | `@~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/agents/` |
| Templates | `@~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/templates/` |

## Development

```bash
# Run tests
npm test

# Type check
npx tsc --noEmit

# Lint markdown
npm exec markdownlint-cli2 "**/*.md"
```

## Support

- **Website**: https://aiwg.io
- **Repository**: https://github.com/jmagly/ai-writing-guide
- **Issues**: https://github.com/jmagly/ai-writing-guide/issues
- **Discord**: https://discord.gg/BuAusFMxdA
- **Telegram**: https://t.me/+oJg9w2lE6A5lOGFh

---

<!-- TEAM DIRECTIVES: Add project-specific guidance below this line -->

