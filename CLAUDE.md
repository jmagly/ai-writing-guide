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
├── extensions/              # Unified extension system
│   ├── types.ts            # Extension type definitions
│   ├── commands/           # Command extension definitions
│   └── registry.ts         # Extension registry
test/                        # Test suites and fixtures
tools/                       # Build and deployment scripts
docs/                        # Documentation
├── cli-reference.md         # All 31 CLI commands
├── extensions/              # Extension system docs
│   ├── overview.md
│   ├── creating-extensions.md
│   └── extension-types.md
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
- `@docs/cli-reference.md` - Complete CLI command reference
- `@docs/extensions/overview.md` - Extension system architecture

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
aiwg version           # Show version
aiwg use sdlc          # Deploy SDLC framework
aiwg use marketing     # Deploy marketing framework
aiwg use all           # Deploy all frameworks
aiwg new my-project    # Scaffold new project
aiwg help              # Show all commands
aiwg doctor            # Check installation health

# See @docs/cli-reference.md for all 31 commands
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

## Extension System

AIWG uses a unified extension system for all extension types:

**Extension Types:**
- **agent** - Specialized AI personas (API Designer, Test Engineer)
- **command** - CLI and slash commands (`aiwg use sdlc`, `/mention-wire`)
- **skill** - Natural language workflows (project awareness)
- **hook** - Lifecycle event handlers (pre-session, post-write)
- **tool** - External utilities (git, jq, npm)
- **mcp-server** - MCP protocol servers
- **framework** - Complete workflows (SDLC, Marketing)
- **addon** - Feature bundles (Voice, Testing Quality)
- **template** - Document templates (use case, ADR)
- **prompt** - Reusable prompts

**Key Features:**
- Dynamic discovery and registration
- Capability-based semantic search
- Multi-platform deployment
- Dependency management
- Validation and type safety

**Documentation:**
- `@docs/extensions/overview.md` - Architecture and capabilities
- `@docs/extensions/creating-extensions.md` - Build custom extensions
- `@docs/extensions/extension-types.md` - Complete type reference
- `@src/extensions/types.ts` - TypeScript type definitions
- `@src/extensions/commands/definitions.ts` - All 31 command definitions

## CLI Commands (31 Total)

**See `@docs/cli-reference.md` for complete documentation.**

### Categories

| Category | Commands |
|----------|----------|
| **Maintenance** (4) | help, version, doctor, update |
| **Framework** (3) | use, list, remove |
| **Project** (1) | new |
| **Workspace** (3) | status, migrate-workspace, rollback-workspace |
| **MCP** (1) | mcp (serve, install, info) |
| **Catalog** (1) | catalog (list, info, search) |
| **Toolsmith** (1) | runtime-info |
| **Utility** (3) | prefill-cards, contribute-start, validate-metadata |
| **Plugin** (5) | install-plugin, uninstall-plugin, plugin-status, package-plugin, package-all-plugins |
| **Scaffolding** (7) | add-agent, add-command, add-skill, add-template, scaffold-addon, scaffold-extension, scaffold-framework |
| **Ralph** (4) | ralph, ralph-status, ralph-abort, ralph-resume |

### Quick Reference

```bash
# Maintenance
aiwg help                    # Show all commands
aiwg version                 # Show version and channel
aiwg doctor                  # Check installation health
aiwg update                  # Check for updates

# Framework management
aiwg use sdlc                # Deploy SDLC framework
aiwg use sdlc --provider copilot  # Deploy to GitHub Copilot
aiwg list                    # List installed frameworks
aiwg remove sdlc             # Remove framework

# Project setup
aiwg new my-project          # Create new project with scaffolding

# Workspace
aiwg status                  # Show workspace health
aiwg migrate-workspace       # Migrate to framework-scoped structure
aiwg rollback-workspace      # Rollback migration

# MCP
aiwg mcp serve               # Start MCP server
aiwg mcp install claude      # Configure Claude Desktop
aiwg mcp info                # Show capabilities

# Utilities
aiwg runtime-info            # Show runtime environment
aiwg prefill-cards           # Fill SDLC card metadata
aiwg validate-metadata       # Validate extension metadata

# Ralph (iterative task execution)
aiwg ralph "Fix all tests" --completion "npm test passes"
aiwg ralph-status            # Show loop status
aiwg ralph-abort             # Stop loop
aiwg ralph-resume            # Resume paused loop
```

## Key References

| Topic | Location |
|-------|----------|
| **AIWG Development Guide** | `@docs/development/aiwg-development-guide.md` |
| **CLI Reference** | `@docs/cli-reference.md` |
| **Extension System** | `@docs/extensions/overview.md` |
| **Creating Extensions** | `@docs/extensions/creating-extensions.md` |
| **Extension Types** | `@docs/extensions/extension-types.md` |
| **SDLC Framework** | `@agentic/code/frameworks/sdlc-complete/README.md` |
| **Voice Profiles** | `@agentic/code/addons/voice-framework/voices/templates/` |
| **Natural Language Patterns** | `@docs/simple-language-translations.md` |
| **Agent Catalog** | `@agentic/code/frameworks/sdlc-complete/agents/` |
| **Templates** | `@agentic/code/frameworks/sdlc-complete/templates/` |
| **Command Definitions** | `@src/extensions/commands/definitions.ts` |
| **Extension Types** | `@src/extensions/types.ts` |

## Development

```bash
# Run tests
npm test

# Type check
npx tsc --noEmit

# Lint markdown
npm exec markdownlint-cli2 "**/*.md"

# Validate extension metadata
aiwg validate-metadata

# Check installation health
aiwg doctor
```

## Support

- **Website**: https://aiwg.io
- **Repository**: https://github.com/jmagly/ai-writing-guide
- **Issues**: https://github.com/jmagly/ai-writing-guide/issues
- **Discord**: https://discord.gg/BuAusFMxdA
- **Telegram**: https://t.me/+oJg9w2lE6A5lOGFh

---

<!-- TEAM DIRECTIVES: Add project-specific guidance below this line -->

## What AIWG Is

**AI Writing Guide (AIWG)** is a framework that provides AI coding assistants with structured workflows, specialized agents, and artifact management. It's not just documentation - it's an operational system that:

1. **Deploys agents** - Specialized AI personas (Test Engineer, Security Auditor, etc.) with defined tools and expertise
2. **Manages artifacts** - All project documents (requirements, architecture, tests) live in `.aiwg/`
3. **Orchestrates workflows** - SDLC phases, handoffs, and quality gates
4. **Tracks state** - Framework registry, project status, iteration history

### The `.aiwg/` Directory

This is the **artifact directory** - the heart of AIWG's project management:

```
.aiwg/
├── intake/           # Project intake forms, solution profiles
├── requirements/     # Use cases, user stories, NFRs
├── architecture/     # SAD, ADRs, diagrams
├── planning/         # Phase plans, iteration plans
├── risks/            # Risk register, mitigations
├── testing/          # Test strategy, test plans
├── security/         # Threat models, security gates
├── deployment/       # Deployment plans, runbooks
├── working/          # Temporary files (safe to delete)
├── reports/          # Generated status reports
├── ralph/            # Internal Ralph loop state
├── ralph-external/   # External Ralph loop state
└── frameworks/       # Installed framework registry
    ├── registry.json
    ├── sdlc-complete/
    └── media-marketing-kit/
```

**Whether to commit `.aiwg/` is the developer's choice** - it contains valuable project artifacts but also working state. Many teams commit everything except `working/`.

### Dogfooding Context

**This repository is both the AIWG source code AND a project using AIWG.** We're dogfooding:

- The `.aiwg/` directory here contains real artifacts for developing AIWG itself
- The `tools/ralph-external/` implementation uses AIWG's own patterns
- Agents, commands, and workflows are tested by using them to build more of the system

When working in this repo, you're simultaneously:
1. **Developing AIWG** - Writing code in `src/`, `tools/`, `agentic/`
2. **Using AIWG** - Following workflows, creating artifacts in `.aiwg/`

This is intentional - issues found while dogfooding become improvements to the framework.

> **CRITICAL FOR AGENTS: The `.aiwg/` Boundary**
>
> `.aiwg/` is **project-local output**, not framework source. It stores SDLC artifacts generated during project development (requirements, architecture docs, test plans, schemas, etc.). Nothing from `.aiwg/` is deployed to other systems via `aiwg use`.
>
> **The boundary:**
> - `agentic/code/` = Framework source (editable, deployable, ships to users)
> - `.aiwg/` = Project output (generated at runtime, local to this project)
>
> **Adding files to `.aiwg/` does NOT implement framework features.** Creating a schema in `.aiwg/flows/schemas/` is creating a project artifact, not adding a framework capability. Framework schemas belong in `agentic/code/frameworks/{name}/schemas/`.
>
> **`@.aiwg/` references in agent definitions** point to project-local files that will not exist in user projects. If an agent definition references `@.aiwg/flows/schemas/foo.yaml`, that reference only works in the AIWG repository itself — it is invisible to any other project that installs AIWG.
>
> Because AIWG dogfoods itself, the `.aiwg/` directory here has substantial content that may look like framework source. It is not. See `@docs/development/aiwg-development-guide.md` for the full source vs output distinction.

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
