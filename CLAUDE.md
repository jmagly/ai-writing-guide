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
│   ├── sdlc-complete/       # Complete SDLC coverage
│   └── media-marketing-kit/ # Full marketing operations
├── addons/
│   └── voice-framework/     # Voice profiles
└── agents/                  # Writing quality agents

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
/plugin install sdlc@aiwg        # Full SDLC framework
/plugin install marketing@aiwg   # Marketing operations framework
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

## Release Documentation Requirements

**CRITICAL**: Every release MUST be documented in ALL of these locations:

| Location | Purpose | Format |
|----------|---------|--------|
| `CHANGELOG.md` | Technical changelog | Keep a Changelog format with highlights table |
| `docs/releases/vX.X.X-announcement.md` | Release announcement | Full feature documentation with examples |
| `package.json` | Version bump | CalVer: `YYYY.MM.PATCH` |
| GitHub Release | Public release notes | Condensed highlights + install instructions |
| Gitea Release | Internal release notes | Same as GitHub |

### Release Checklist

Before pushing a version tag:

1. **Update `package.json`** - Bump version following CalVer
2. **Update `CHANGELOG.md`** - Add new version section with:
   - Highlights table (What changed | Why you care)
   - Detailed Added/Changed/Fixed sections
   - Link to previous version
3. **Create `docs/releases/vX.X.X-announcement.md`** - Full release document with:
   - Feature highlights
   - Code examples
   - Migration notes (if applicable)
   - Links to relevant documentation
4. **Commit and tag** - `git tag -m "vX.X.X" vX.X.X`
5. **Push to both remotes** - `git push origin main --tags && git push github main --tags`
6. **Update GitHub Release** - Add proper release notes via `gh release edit`
7. **Create Gitea Release** - Via MCP tool or web UI

### Version Format

- **CalVer**: `YYYY.M.PATCH` (e.g., `2026.1.5`, `2026.12.0`)
- **CRITICAL**: No leading zeros! npm semver rejects `01`, `02`, etc.
- PATCH resets each month
- Tag format: `vYYYY.M.PATCH` (e.g., `v2026.1.5`)
- See `@docs/contributing/versioning.md` for full details

