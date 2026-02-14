# AIWG

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
├── cli-reference.md         # All 40 CLI commands
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

All 8 providers receive all 4 artifact types (agents, commands, skills, rules). Support level indicates how the platform discovers artifacts: **native** (auto-discovered), **conventional** (AIWG directory), **aggregated** (single-file + discrete).

| Platform | Agents | Commands | Skills | Rules | Command |
|----------|--------|----------|--------|-------|---------|
| Claude Code | `.claude/agents/` | `.claude/commands/` | `.claude/skills/` | `.claude/rules/` | `aiwg use sdlc` |
| OpenAI/Codex | `.codex/agents/` | `~/.codex/prompts/` | `~/.codex/skills/` | `.codex/rules/` | `aiwg use sdlc --provider codex` |
| GitHub Copilot | `.github/agents/` | `.github/agents/` | `.github/skills/` | `.github/copilot-rules/` | `aiwg use sdlc --provider copilot` |
| Factory AI | `.factory/droids/` | `.factory/commands/` | `.factory/skills/` | `.factory/rules/` | `aiwg use sdlc --provider factory` |
| Cursor | `.cursor/agents/` | `.cursor/commands/` | `.cursor/skills/` | `.cursor/rules/` | `aiwg use sdlc --provider cursor` |
| OpenCode | `.opencode/agent/` | `.opencode/command/` | `.opencode/skill/` | `.opencode/rule/` | `aiwg use sdlc --provider opencode` |
| Warp Terminal | `.warp/agents/` + WARP.md | `.warp/commands/` | `.warp/skills/` | `.warp/rules/` | `aiwg use sdlc --provider warp` |
| Windsurf | AGENTS.md | `.windsurf/workflows/` | `.windsurf/skills/` | `.windsurf/rules/` | `aiwg use sdlc --provider windsurf` |

**Special cases:**
- **Codex**: Commands and skills deploy to home directory (`~/.codex/prompts/`, `~/.codex/skills/`) for user-level availability across all projects
- **Copilot**: Commands are converted to YAML agent format and deployed alongside agents in `.github/agents/`
- **Warp**: Agents and commands are also aggregated into `WARP.md` for single-file context loading
- **Windsurf**: Agents are aggregated into `AGENTS.md` at project root

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

# See @docs/cli-reference.md for all 40 commands
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
- `@src/extensions/commands/definitions.ts` - All 40 command definitions

## CLI Commands (40 Total)

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
| **Metrics** (3) | cost-report, cost-history, metrics-tokens |
| **Reproducibility** (4) | execution-mode, snapshot, checkpoint, reproducibility-validate |

### Quick Reference

```bash
# Maintenance
aiwg help                    # Show all commands
aiwg version                 # Show version and channel
aiwg doctor                  # Check installation health
aiwg update                  # Check for updates

# Framework and addon management
aiwg use sdlc                # Deploy SDLC framework
aiwg use rlm                 # Deploy RLM addon
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

# Metrics
aiwg cost-report             # Show cost report for session
aiwg cost-history            # Show historical cost data
aiwg metrics-tokens          # Show token usage metrics

# Reproducibility
aiwg execution-mode          # Show/set execution mode
aiwg snapshot                # Create execution snapshot
aiwg checkpoint              # Create workflow checkpoint
aiwg reproducibility-validate  # Validate workflow reproducibility
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
| **RLM Addon** | `@agentic/code/addons/rlm/README.md` |
| **Daemon Mode** | `@docs/daemon-guide.md` |
| **Messaging Integration** | `@docs/messaging-guide.md` |
| **Voice Profiles** | `@agentic/code/addons/voice-framework/voices/templates/` |
| **Natural Language Patterns** | `@docs/simple-language-translations.md` |
| **Agent Catalog** | `@agentic/code/frameworks/sdlc-complete/agents/` |
| **Templates** | `@agentic/code/frameworks/sdlc-complete/templates/` |
| **Command Definitions** | `@src/extensions/commands/definitions.ts` |
| **Extension Types** | `@src/extensions/types.ts` |

## Core Enforcement Rules

<!-- AIWG Core Rules - These 7 rules are non-negotiable defaults deployed to every AIWG installation -->

### No Attribution (CRITICAL)

Never add AI tool attribution to commits, PRs, docs, or code. No `Co-Authored-By`, no "Generated with", no "Written by [AI tool]". The AI is a tool like a compiler - tools don't sign their output. This applies to ALL platforms.

### Token Security (CRITICAL)

Never hard-code tokens, pass tokens as CLI arguments, or log token values. Load tokens from secure files or environment variables. Use scoped operations (heredoc pattern) to limit token lifetime.

### Versioning (CRITICAL)

CalVer format: `YYYY.M.PATCH`. Never use leading zeros (`2026.01.5` is wrong, `2026.1.5` is correct). Tags use `v` prefix.

### Citation Policy (CRITICAL)

Never fabricate citations, DOIs, URLs, or page numbers. Only cite sources that exist in the research corpus. Use quality-appropriate hedging per GRADE methodology.

### Anti-Laziness (HIGH)

Never delete tests to make them pass. Never skip tests. Never remove features instead of fixing them. Never weaken assertions. Escalate to human after 3 failed attempts.

### Executable Feedback (HIGH)

Execute tests before returning code. Track execution history. Retry on failure with root cause analysis (max 3 attempts).

### Failure Mitigation (HIGH)

Apply mitigations for known LLM failure archetypes: hallucination, context loss, instruction drift, consistency violations, and technical errors.

### Rules Reference

Rules deploy as a single consolidated `RULES-INDEX.md` (~200 lines) instead of 31 individual files (~9,321 lines). The index contains summaries with @-links to full rule files for on-demand loading.

- Consolidated index: `agentic/code/frameworks/sdlc-complete/rules/RULES-INDEX.md`
- Full rule files: `agentic/code/frameworks/sdlc-complete/rules/`
- Manifest: `agentic/code/frameworks/sdlc-complete/rules/manifest.json`

## Commit and Output Conventions

- Follow conventional commits: `type(scope): subject`
- Use imperative mood ("add feature" not "added feature")
- **No AI attribution** - covered by Core Enforcement Rules above

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
- **Repository**: https://github.com/jmagly/aiwg
- **Issues**: https://github.com/jmagly/aiwg/issues
- **Discord**: https://discord.gg/BuAusFMxdA
- **Telegram**: https://t.me/+oJg9w2lE6A5lOGFh

---

<!-- TEAM DIRECTIVES: Add project-specific guidance below this line -->

## Context Window Configuration (Optional)

<!-- Uncomment and set if running on a local/GPU system with limited context.
     This guides parallel subagent limits and compaction aggressiveness.
     Leave commented out for Anthropic cloud systems (1M+ context).
     See @.claude/rules/context-budget.md for the full lookup table. -->

<!-- AIWG_CONTEXT_WINDOW: 100000 -->

## What AIWG Is

**AIWG** is a framework that provides AI coding assistants with structured workflows, specialized agents, and artifact management. It's not just documentation - it's an operational system that:

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
| `package.json` | Version bump | CalVer: `YYYY.M.PATCH` |
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
