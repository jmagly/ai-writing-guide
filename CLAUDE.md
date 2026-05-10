# AIWG


@AIWG.md

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
│   ├── sdlc-complete/        # Complete SDLC coverage
│   ├── forensics-complete/   # Digital forensics & incident response
│   ├── security-engineering/ # Applied security (crypto, chain-of-trust, factors, degraded modes, supply-chain, physical threats)
│   ├── media-marketing-kit/  # Full marketing operations
│   ├── media-curator/        # Media archive management
│   ├── research-complete/    # Research workflow automation
│   ├── knowledge-base/       # Knowledge base / wiki framework
│   └── ops-complete/         # Operational infrastructure (incident, runbooks, troubleshooting)
├── addons/
│   └── voice-framework/     # Voice profiles (one of 27 addons)
└── agents/                  # Writing quality agents

src/                         # CLI and MCP server implementation
├── extensions/              # Unified extension system
│   ├── types.ts            # Extension type definitions
│   ├── commands/           # Command extension definitions
│   └── registry.ts         # Extension registry
test/                        # Test suites and fixtures
tools/                       # Build and deployment scripts
docs/                        # Documentation
├── cli-reference.md         # All 50 CLI commands
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

All 10 providers receive all 4 artifact types (agents, commands, skills, rules). OpenClaw additionally receives behaviors. Support level indicates how the platform discovers artifacts: **native** (auto-discovered), **conventional** (AIWG directory), **aggregated** (single-file + discrete).

| Platform | Agents | Commands | Skills | Rules | Command |
|----------|--------|----------|--------|-------|---------|
| Claude Code | `.claude/agents/` | `.claude/commands/` | `.claude/skills/` | `.claude/rules/` | `aiwg use sdlc` |
| OpenAI/Codex | `.codex/agents/` | `~/.codex/prompts/` (scanned) + `.codex/commands/` (deployed for visibility; not scanned — Codex commands are a static enum) | `~/.codex/skills/` + `.agents/skills/` | `.codex/rules/` | `aiwg use sdlc --provider codex` |
| GitHub Copilot | `.github/agents/` | `.github/prompts/` | `.github/skills/` + `.agents/skills/` | `.github/instructions/` | `aiwg use sdlc --provider copilot` |
| Factory AI | `.factory/droids/` | `.factory/commands/` | `.factory/skills/` | `.factory/rules/` | `aiwg use sdlc --provider factory` |
| Cursor | `.cursor/agents/` | `.cursor/commands/` | `.cursor/skills/` | `.cursor/rules/` | `aiwg use sdlc --provider cursor` |
| OpenCode | `.opencode/agent/` | `.opencode/command/` | `.opencode/skill/` + `.agents/skills/` | `.opencode/rule/` | `aiwg use sdlc --provider opencode` |
| Warp Terminal | `.warp/agents/` + WARP.md | `.warp/commands/` | `.warp/skills/` + `.agents/skills/` | `.warp/rules/` | `aiwg use sdlc --provider warp` |
| Windsurf | AGENTS.md | `.windsurf/workflows/` | `.windsurf/skills/` + `.agents/skills/` | `.windsurf/rules/` | `aiwg use sdlc --provider windsurf` |
| OpenClaw | `~/.openclaw/agents/` | `~/.openclaw/commands/` | `~/.openclaw/skills/` + `.agents/skills/` | `~/.openclaw/rules/` | `aiwg use sdlc --provider openclaw` |
| Hermes | AGENTS.md | — | `~/.hermes/skills/` | — | `aiwg use sdlc --provider hermes` |

**Special cases:**
- **Codex**: Commands and skills deploy to home directory (`~/.codex/prompts/`, `~/.codex/skills/`) for user-level availability across all projects. `.codex/commands/` also deploys at project scope for operator visibility, but Codex commands are a static built-in enum in codex-rs and these files are not auto-scanned by the loader; AGENTS.md is the discovery bridge per ADR-1. Reference: `src/smiths/platform-paths.ts:23`.
- **Copilot**: Agents use `.agent.md` format (Markdown + YAML frontmatter). Commands deploy as prompt files (`.github/prompts/`). Rules deploy as path-scoped instructions (`.github/instructions/`)
- **Warp**: Agents and commands are also aggregated into `WARP.md` for single-file context loading
- **Windsurf**: Agents are aggregated into `AGENTS.md` at project root
- **OpenClaw**: All artifacts deploy to home directory (`~/.openclaw/`). First provider to support behaviors (`~/.openclaw/behaviors/`)

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

# Install plugins (13 published in marketplace.json)
/plugin install sdlc@aiwg                  # Full SDLC framework
/plugin install marketing@aiwg             # Marketing operations framework
/plugin install forensics@aiwg             # Digital forensics & incident response
/plugin install security-engineering@aiwg  # Applied security (crypto, chain-of-trust, factors)
/plugin install research@aiwg              # Research workflow automation
/plugin install media-curator@aiwg         # Media archive management
/plugin install ops@aiwg                   # Operational infrastructure (incident, runbooks)
/plugin install knowledge-base@aiwg        # Knowledge base / wiki framework
/plugin install utils@aiwg                 # Core utilities
/plugin install voice@aiwg                 # Voice profiles
/plugin install writing@aiwg               # Writing quality and AI-pattern detection
/plugin install training@aiwg              # Fine-tuning dataset curation
/plugin install hooks@aiwg                 # AIWG hooks (context loaders, validators)

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

# See @docs/cli-reference.md for the full CLI reference
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
- **soul** - SOUL.md identity profiles (worldview, values, voice)
- **behavior** - Reactive behavior bundles (OpenClaw native)
- **team** - Multi-agent team compositions

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
- `@src/extensions/commands/definitions.ts` - Canonical CLI command definitions

## CLI Commands

**See `@docs/cli-reference.md` for complete documentation.** The canonical command list lives in `@src/extensions/commands/definitions.ts` (currently ~85 entries — count grows as features land; the categories table below is a curated overview, not an exhaustive enumeration).

### Categories

| Category | Commands |
|----------|----------|
| **Maintenance** (5) | help, version, doctor, update, refresh |
| **Framework** (3) | use, list, remove |
| **Project** (1) | new |
| **Workspace** (3) | status, migrate-workspace, rollback-workspace |
| **MCP** (1) | aiwg-mcp-server (serve, install, info) — alias: aiwg-mcp |
| **Catalog** (1) | catalog (list, info, search) |
| **Toolsmith** (1) | runtime-info |
| **Utility** (3) | prefill-cards, contribute-start, validate-metadata |
| **Plugin** (5) | install-plugin, uninstall-plugin, plugin-status, package-plugin, package-all-plugins |
| **Scaffolding** (7) | add-agent, add-command, add-skill, add-template, scaffold-addon, scaffold-extension, scaffold-framework |
| **Orchestration** (1) | mc (start, dispatch, status, watch, abort, pause, resume, stop, list) |
| **Ralph** (8) | ralph, ralph-status, ralph-abort, ralph-resume, ralph-attach, agent-loop-ext, ralph-memory, ralph-config |
| **Metrics** (3) | cost-report, cost-history, metrics-tokens |
| **Documentation** (1) | doc-sync |
| **SDLC Orchestration** (1) | sdlc-accelerate |
| **Code Analysis** (1) | cleanup-audit |
| **Index** (1) | index (build, query, deps, stats) |
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
aiwg remove my-bundle        # Remove project-local bundle (source preserved; --force, --dry-run supported)

# Project-local bundles (.aiwg/{extensions,addons,frameworks,plugins}/<name>/)
aiwg new-bundle my-rules --type extension --starter rule    # Scaffold project-local bundle
aiwg new-extension my-ext                                   # Alias: --type extension implied
aiwg new-addon my-pack                                      # Alias: --type addon implied
aiwg use my-rules                                           # Deploy a single project-local bundle
aiwg list --project-local                                   # Show project-local inventory
aiwg doctor --project-local                                 # Health check (counts, validation, drift, matrix)
aiwg promote my-rules                                       # Graduate to upstream (hash-verified copy)
aiwg promote my-rules --to corpus ~/my-corpus/              # Graduate to private corpus
aiwg promote my-rules --dry-run                             # Preview without writing
aiwg activity-log show                                      # Audit lifecycle events

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
aiwg mcp add <name> --url <url>  # Register a server
aiwg mcp remove <name>       # Remove a server
aiwg mcp list                # List registered servers
aiwg mcp inject --provider claude --profile dev  # Inject profile servers
aiwg mcp inject --provider claude --profile ops --ephemeral  # Ephemeral inject (temp file, default config unchanged)
aiwg mcp profile init-presets    # Install built-in profiles (minimal/dev/ops/research/incident/full)
aiwg mcp profile add <name> --servers <a,b>  # Create profile
aiwg mcp profile list        # List profiles
aiwg mcp profile show <name> # Inspect a profile

# Utilities
aiwg runtime-info            # Show runtime environment
aiwg prefill-cards           # Fill SDLC card metadata
aiwg validate-metadata       # Validate extension metadata

# Ralph (iterative task execution)
aiwg ralph "Fix all tests" --completion "npm test passes"
aiwg ralph-status            # Show loop status
aiwg ralph-abort             # Stop loop
aiwg ralph-resume            # Resume paused loop
aiwg ralph-attach            # Attach to running external loop
aiwg agent-loop-ext "task"   # Crash-resilient external loop (alias: ralph-external)
aiwg ralph-memory list       # Show debug memory entries
aiwg ralph-config show       # Show Ralph configuration

# Metrics
aiwg cost-report             # Show cost report for session
aiwg cost-history            # Show historical cost data
aiwg metrics-tokens          # Show token usage metrics

# Documentation sync
aiwg doc-sync code-to-docs --dry-run  # Audit doc drift
aiwg doc-sync code-to-docs            # Sync docs to match code
aiwg doc-sync full --interactive      # Bidirectional reconciliation

# SDLC accelerate
aiwg sdlc-accelerate "Project description"  # Idea to construction-ready
aiwg sdlc-accelerate --from-codebase .      # From existing code
aiwg sdlc-accelerate --resume               # Resume pipeline

# Discovery — find AIWG skills/agents/commands/rules by capability (#1212)
aiwg discover "create intake"            # ranks intake-* skills, intake-coordinator agent
aiwg discover "deploy production" --limit 3   # flow-deploy-to-production tops at score 0.51
aiwg discover "audit security" --type skill   # narrow to skills only
aiwg discover "<phrase>" --json          # Stable schema for sub-agent consumption

# Show — fetch the full text of a specific artifact by name (#1218)
aiwg show skill intake-wizard            # streams SKILL.md to stdout
aiwg show agent aiwg-steward             # agent definition
aiwg show command discover               # CLI command spec
aiwg show rule no-attribution            # rule body
aiwg show skill <name> --json            # path + content envelope

# Run — execute a script-bearing skill (#1227)
aiwg run skill voice-apply -- --voice technical-authority --input draft.md
aiwg run skill template-engine -- render adr-template.md --vars vars.yaml
aiwg run skill <name> --cwd <path> -- <args...>   # explicit CWD override
# Skills with a `script:` frontmatter block are dispatched through the CLI's
# runtime registry (node/python3/bash/sh/pwsh/ruby/auto) with project-root CWD,
# so relative paths inside the script resolve into the calling project — not
# into AIWG's install. `aiwg discover` flags executable skills as
# `"executable": true` with a `run_hint`; `aiwg show` prepends a one-line
# banner so agents know to use this command instead of running raw paths.

# Most AIWG skills (~385 of 400) are NOT in your context — they stay at
# $AIWG_ROOT (no per-project copy by default, #1217) and are reached via
# `aiwg discover` + `aiwg show`. The kernel set is what's always-loaded:
# 8 framework quickrefs + aiwg-utils-quickref + aiwg-language-map (covers
# addons + extensions) + 6 self-maintenance ops (steward, aiwg-doctor,
# aiwg-refresh, aiwg-status, aiwg-help, use) = 16 skills total.
# The skill-discovery HIGH rule mandates `aiwg discover` before declining
# a user request as out-of-scope.
# To force per-project copies (sandboxed runtimes): pass --copy-all
# (e.g. `aiwg use sdlc --copy-all`). Default is no-copy + index-driven discovery.

# Artifact index — build/query graph indices (project, codebase, framework, user-defined)
aiwg index build                         # Build/rebuild artifact index
aiwg index build --force --verbose       # Full rebuild with progress
aiwg index query "authentication" --json # Search artifacts
aiwg index deps .aiwg/requirements/UC-001.md --json  # Show dependencies
aiwg index stats --json                  # Index statistics

# Self-maintenance
aiwg refresh                    # Refresh to latest version + re-deploy all frameworks
aiwg refresh --dry-run          # Check what would change (no side effects)
aiwg refresh --provider copilot # Refresh to specific provider
aiwg doctor                     # Health check + diagnostics
# `aiwg sync` is a deprecated alias for `aiwg refresh` — emits a warning,
# scheduled for removal after the 2026.5.x stable line.

# Storage subsystem (#934)
aiwg storage show                   # Effective config + resolved paths per subsystem
aiwg storage list-backends          # READY/STUB inventory of compiled-in adapters
aiwg storage test memory            # Round-trip probe through configured backend
aiwg storage migrate memory \
  --from fs:.aiwg/memory \
  --to obsidian:~/vaults/main \
  --to-folder AIWG/memory --dry-run # Move data between backends
# Per-subsystem CLIs route through resolveStorage(<subsystem>):
aiwg activity-log show              # show / append / stats / rotate
aiwg memory list                    # path / list / get / put / delete / append-log
aiwg reflections list               # same surface as memory
aiwg kb path                        # path / list / get / put / delete
aiwg provenance list                # same surface as memory
aiwg research-store path            # research corpus storage primitives
# See @docs/storage/ for the full guide.

# Ops ecosystem
aiwg ops init --workspace personal --ext sys,dev   # Bootstrap workspace
aiwg ops init --from https://…/repo.git --ext it   # Clone-existing flow (#936)
aiwg ops adopt ~/sysops --workspace home --ext sys # Register a pre-cloned repo (#936)
aiwg ops discover ~ --register                     # Auto-find orphaned clones (#937)
aiwg ops status / list / use / push                # Standard lifecycle

# Background orchestration (Mission Control)
aiwg mc start                # Start Mission Control session
aiwg mc dispatch <id> "..."  # Add background mission
aiwg mc status               # View all missions
aiwg mc watch                # Live monitor (streaming)
aiwg mc stop <id>            # Shut down session

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
| **Discovery & Kernel Skills** | `@docs/discovery-and-kernel-skills.md` |
| **Extension System** | `@docs/extensions/overview.md` |
| **Creating Extensions** | `@docs/extensions/creating-extensions.md` |
| **Extension Types** | `@docs/extensions/extension-types.md` |
| **SDLC Framework** | `@agentic/code/frameworks/sdlc-complete/README.md` |
| **Forensics Complete** | `@agentic/code/frameworks/forensics-complete/README.md` |
| **Media Curator** | `@agentic/code/frameworks/media-curator/README.md` |
| **Research Complete** | `@agentic/code/frameworks/research-complete/README.md` |
| **Security Engineering** | `@agentic/code/frameworks/security-engineering/README.md` |
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

### CI Green Before Done (HIGH)

A commit is not finished until CI passes. After every `git push`, check CI status via Gitea Actions API and wait for results. AIWG builds complete in ~2 minutes — always wait. If CI fails, diagnose and fix before declaring work done. Never leave main in a red state.

### Executable Feedback (HIGH)

Execute tests before returning code. Track execution history. Retry on failure with root cause analysis (max 3 attempts).

### UAT Before Release (HIGH)

Run `npm run uat` before every stable release tag. All 9 UAT tests must pass. UAT validates the external agent loop end-to-end with a stub provider and catches runtime failures that unit tests (which mock the session launcher) cannot detect. See the Release Checklist below for the full gate sequence.

### Failure Mitigation (HIGH)

Apply mitigations for known LLM failure archetypes: hallucination, context loss, instruction drift, consistency violations, and technical errors.

### Rules Reference

Rules are organized in a two-level hierarchy: each component owns its own `RULES-INDEX.md`, and a global index aggregates pointers to all installed components.

- Global index: `agentic/code/RULES-INDEX.md` (assembled during deployment)
- Component indexes:
  - sdlc-complete: `agentic/code/frameworks/sdlc-complete/rules/RULES-INDEX.md`
  - aiwg-utils: `agentic/code/addons/aiwg-utils/rules/RULES-INDEX.md` (includes `delivery-policy` rule for git workflow)
  - security-engineering: `agentic/code/frameworks/security-engineering/rules/RULES-INDEX.md` (4 applied-cryptography rules: `no-unauthenticated-encryption`, `no-key-reuse-across-purposes`, `no-adhoc-kdf`, `crypto-flag-verification`)
- Architecture decision: `.aiwg/architecture/adr-rules-index-hierarchy.md`

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

# Test local framework changes (see docs/development/dev-testing.md)
aiwg --use-dev         # Point CLI at this repo
aiwg use all           # Deploy from local source
aiwg --use-stable      # Switch back to npm package
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

**AIWG** is a deployment tool and support utility for AI context. At its core, `aiwg use` copies markdown and YAML source files (agents, skills, commands, rules, templates) into the paths each AI platform reads — `.claude/agents/`, `~/.codex/skills/`, `.cursor/rules/`, `.github/prompts/`, and six more — so one source of truth works across 10 platforms. The deployment layer works standalone as plain text.

Around that core, AIWG ships optional utilities for things the base platforms do not handle on their own:

1. **Deploys agents** - Specialized AI personas (Test Engineer, Security Auditor, etc.) with defined tools and expertise
2. **Manages artifacts** - All project documents (requirements, architecture, tests) live in `.aiwg/`
3. **Orchestrates workflows** - SDLC phases, handoffs, and quality gates
4. **Tracks state** - Framework registry, project status, iteration history

Most utilities (`ralph`, `mc`, `daemon`, `index`, `mcp`) are opt-in. Turn them off and the deployed agents, skills, and rules still work — they are still text files the platform reads natively.

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
├── ralph/            # Internal agent loop state
├── ralph-external/   # External agent loop state
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

### Release Channels — Internal Testing Stages

This is a standard multi-stage release pipeline. Pre-release tags are **internal pipeline checkpoints**, not public releases. They exist to validate the publish workflow and let a small group test before the stable tag is cut.

**Do NOT create release announcements, CHANGELOG entries, or Gitea/GitHub releases for pre-release tags.** The CHANGELOG and `docs/releases/` announcement are written once for the stable release and cover everything that accumulated across all pre-release iterations.

| Stage | Tag format | Example | npm dist-tag | Install via |
|-------|-----------|---------|-------------|-------------|
| Dev/local | (no tag — local source install) | — | — | `npm install -g .` from repo |
| Nightly | `vYYYY.M.PATCH-nightly.YYYYMMDD` | `v2026.5.0-nightly.20260403` | `nightly` | `npm install -g aiwg@nightly` |
| Alpha | `vYYYY.M.PATCH-alpha.N` | `v2026.5.0-alpha.1` | `next` | `npm install -g aiwg@next` |
| Beta | `vYYYY.M.PATCH-beta.N` | `v2026.5.0-beta.1` | `next` | `npm install -g aiwg@next` |
| RC | `vYYYY.M.PATCH-rc.N` | `v2026.5.0-rc.3` | `next` | `npm install -g aiwg@next` |
| Stable | `vYYYY.M.PATCH` | `v2026.5.0` | `latest` | `npm install -g aiwg` (default) |

**Channel commands:**
```bash
npm install -g aiwg              # stable (latest dist-tag)
npm install -g aiwg@next         # latest alpha/beta/RC
npm install -g aiwg@nightly      # latest nightly snapshot
npm install -g aiwg@2026.4.0-rc.3 # specific RC by exact version
aiwg refresh --channel next      # switch installed version to next channel
aiwg refresh --channel latest    # switch back to stable
```

**Pipeline flow:** `dev → nightly → alpha → beta → RC → stable`

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
4. **Run UAT suite** (REQUIRED before tagging):
   ```bash
   npm run uat
   ```
   All 9 tests must pass. UAT validates the external agent loop end-to-end with a stub provider — it catches runtime API mismatches that unit tests cannot (they mock the session launcher). Do not tag if any UAT test fails.
5. **Commit and tag** - `git tag -m "vX.X.X" vX.X.X`
6. **Push tag to Gitea** - `git push origin main --tags` (automatically creates Gitea Release)
7. **Optionally mirror to GitHub** - `git push github main --tags`
8. **Update/Create GitHub Release manually** - via `gh release create|edit`

### Version Format

- **CalVer**: `YYYY.M.PATCH` (e.g., `2026.1.5`, `2026.12.0`)
- **CRITICAL**: No leading zeros! npm semver rejects `01`, `02`, etc.
- PATCH resets each month
- Tag format: `vYYYY.M.PATCH` (e.g., `v2026.1.5`)
- See `@docs/contributing/versioning.md` for full details
