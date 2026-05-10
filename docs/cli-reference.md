# AIWG CLI Reference

Complete reference for all `aiwg` CLI commands.

**Prerequisites:** Node.js ≥18.0.0 and `npm install -g aiwg`

**References:**

- @src/extensions/commands/definitions.ts - Command extension definitions
- @src/extensions/types.ts - Extension type system
- @.aiwg/architecture/unified-extension-schema.md - Extension schema documentation
- @docs/configuration/aiwg-config.md - `.aiwg/aiwg.config` field reference (delivery, remotes, installed)
- @docs/configuration/setup-manifest.md - `setup.aiwg.io/v1` SetupManifest reference
- @docs/configuration/model-configuration.md - `models.json` model role mapping

---

## Table of Contents

- [Maintenance Commands](#maintenance-commands)
- [Framework Management](#framework-management)
- [Project Setup](#project-setup)
- [Workspace Management](#workspace-management)
- [MCP Commands](#mcp-commands)
- [Catalog Commands](#catalog-commands)
- [Toolsmith Commands](#toolsmith-commands)
- [Utility Commands](#utility-commands)
- [Plugin Commands](#plugin-commands)
- [Scaffolding Commands](#scaffolding-commands)
- [Mission Control Commands](#mission-control-commands)
- [Agent Team Commands](#agent-team-commands)
- [Al Commands](#ralph-commands)
- [Documentation Commands](#documentation-commands)
- [SDLC Orchestration Commands](#sdlc-orchestration-commands)
- [Index Commands](#index-commands)
- [Configuration Commands](#configuration-commands)
- [Agentic Tools (RLM)](#agentic-tools-rlm)
- [Addon Commands](#addon-commands)
- [Storage Commands](#storage-commands)
- [Ops Commands](#ops-commands)

---

> **Storage subsystem:** AIWG persists artifacts (memory, kb, activity-log,
> reflections, provenance, research) through a pluggable adapter system.
> See [`docs/storage/`](storage/README.md) for the full guide.
>
> Storage CLIs:
>
> - `aiwg storage` — config inspection, migration, doctor probe
> - `aiwg memory` / `aiwg reflections` / `aiwg kb` / `aiwg activity-log` /
>   `aiwg provenance` / `aiwg research-store` — per-subsystem
>   `path` / `list` / `get` / `put` / `delete` / `append-log`

---

## Maintenance Commands

### help

Display comprehensive CLI help information.

```bash
aiwg help
aiwg -help
aiwg --help
```

**Capabilities:** cli, help, documentation
**Platforms:** All
**Tools:** None required

Shows:

- Available commands grouped by category
- Common usage patterns
- Platform-specific notes
- Links to documentation

---

### version

Show version and channel information.

```bash
aiwg version
aiwg -version
aiwg --version
```

**Capabilities:** cli, version, info
**Platforms:** All
**Tools:** Read

Shows:

- Current AIWG version
- Active channel (stable/main)
- Installation path
- Node.js version

**Example output:**

```
AIWG v2026.1.5 (stable)
Installed: ~/.nvm/versions/node/v20.10.0/lib/node_modules/aiwg
Node.js: v20.10.0
```

---

### doctor

Check installation health and diagnose issues.

```bash
aiwg doctor [--provider <name>] [--all-providers] [--project-local] [--quiet]
```

**Flags:**

- `--provider <name>` — Inspect a specific provider's deployment paths (claude, factory, codex, copilot, cursor, opencode, warp, windsurf, openclaw, hermes). Defaults to auto-detect across deployed providers.
- `--all-providers` — Enumerate every supported provider, including ones with nothing deployed.
- `--project-local` — Show only the project-local artifacts section. Exit code reflects only project-local findings.
- `--quiet` — Suppress informational subsections (counts, shadows). Show only failures.

**Capabilities:** cli, diagnostics, health-check
**Platforms:** All
**Tools:** Read, Bash

**Checks:**

- AIWG installation and version
- Node.js version compatibility
- Project `.aiwg/` directory structure
- Framework registry status
- Deployed agents and commands
- MCP server availability
- System dependencies (git, jq, etc.)
- `memory.topology` contracts — runs `validateMemoryTopology()` against every installed framework/addon manifest; flags missing required fields, invalid `crossRefStyle` values (must be `at-mention | wikilink | markdown-link | yaml-ref`), namespaces not under `.aiwg/`, empty `derivedPages`, and wrong array shapes for `lintRules`/`ingestRequires` (per ADR-021)
- **Project-local artifacts** ([design](https://github.com/jmagly/aiwg/blob/main/.aiwg/architecture/design-doctor-log-promote.md)) — per-type counts, manifest validation, active shadows (informational vs blocking), denylist violations, deploy-state drift (deployed file hash vs registered `artifactHashes`), provider deployment matrix. Section is suppressed entirely when no project-local content exists.

**Doctor exits 0 when:** no validation errors, no denylist violations, no drift. Shadows alone do not fail doctor — they're informational by design.

**Example output:**

```
✓ AIWG installed: v2026.1.5
✓ Node.js version: v20.10.0 (meets requirement ≥18.0.0)
✓ Project directory: /home/user/my-project
✓ Framework registry: 2 frameworks installed
✓ Agents deployed: 15
✓ Commands deployed: 31
⚠ MCP server not configured
ℹ Run 'aiwg mcp install claude' to configure MCP
```

---

### update

Check for and apply updates.

```bash
aiwg update
aiwg -update
```

**Capabilities:** cli, update, maintenance
**Platforms:** All
**Tools:** Bash

**Actions:**

- Checks npm registry for newer version
- Shows changelog highlights
- Prompts for update confirmation
- Runs `npm update -g aiwg`
- Verifies successful update

**Channel switching:**

```bash
# Switch to bleeding edge (main branch)
aiwg --use-main

# Switch back to stable
aiwg --use-stable
```

---

### refresh

Refresh AIWG to the latest version and re-deploy all frameworks to the active provider. **Formerly `aiwg sync`** — `aiwg sync` still works as a deprecated alias (emits a warning, scheduled for removal after the 2026.5.x stable line).

```bash
aiwg refresh
aiwg --refresh
```

**Capabilities:** cli, refresh, sync, maintenance, deploy, self-maintenance
**Platforms:** All
**Tools:** Bash, Read

**Actions:**

- Detects active provider (claude-code, copilot, cursor, etc.)
- Checks current AIWG version
- Updates package to latest (unless `--skip-update`)
- Re-deploys all installed frameworks (or specific ones)
- Runs health check via `aiwg doctor`

**Flags:**

| Flag | Description |
|------|-------------|
| `--dry-run` | Show what would change without making changes |
| `--quiet` | Machine-readable JSON output (for orchestration) |
| `--skip-update` | Skip npm update, only re-deploy frameworks |
| `--provider <name>` | Target specific provider (default: auto-detect) |
| `--channel <name>` | Update channel (stable, main) |
| `--frameworks <list>` | Comma-separated frameworks to re-deploy |

**Examples:**

```bash
# Full refresh (update + re-deploy + verify)
aiwg refresh

# Check what would change
aiwg refresh --dry-run

# Refresh to specific provider
aiwg refresh --provider copilot

# Re-deploy only SDLC framework, skip update
aiwg refresh --skip-update --frameworks sdlc

# Quiet mode for agent orchestration
aiwg refresh --quiet
```

**Example output:**

```
◆ aiwg refresh
──────────────────────────────
ℹ Detecting provider...
✓ Provider: claude
ℹ Checking version...
✓ Version check complete
ℹ Checking for updates...
✓ Package up to date
ℹ Re-deploying frameworks...
✓ Deployed: all
ℹ Running health check...
✓ Health check passed
──────────────────────────────
✓ Refresh complete
```

---

### diagnose

Produce a shareable support bundle (logs + env + config) for bug reports.

```bash
aiwg diagnose [--stdout] [--include-secrets]
```

**Options:**

- `--stdout` - Emit a single-file JSON manifest to stdout instead of writing a tarball
- `--include-secrets` - Skip log sanitization (inspect the bundle before sharing)

**Capabilities:** cli, diagnostics, troubleshooting, support, bundle
**Platforms:** All
**Tools:** Bash

By default writes `aiwg-diagnose-YYYYMMDDHHMMSS.tar.gz` in the current directory
containing logs, environment info, config snapshot, and recent git activity.
Secrets in logs are sanitized unless `--include-secrets` is passed.

---

### steward

Provider capability awareness — answer "what does my provider support?" and "what command should I use?".

```bash
aiwg steward capabilities [--provider <name>] [--feature <name>] [--all]
aiwg steward find --capability <name>
```

**Subcommands:**

- `capabilities` - Show provider/feature capability matrix entries
- `find` - Routing advice for the current provider

**Options:**

- `--provider <name>` - Capabilities for a specific provider (claude, copilot, cursor, ...)
- `--feature <name>` - Provider support matrix for a specific feature
- `--all` - Print the full matrix (all providers x all features)
- `--capability <name>` - (with `find`) feature to look up routing for

**Capabilities:** cli, maintenance, capability-matrix, provider-routing, diagnostics
**Tools:** Bash, Read

**Examples:**

```bash
aiwg steward capabilities --provider claude
aiwg steward capabilities --feature cron
aiwg steward find --capability cron
```

---

## Framework Management

### use

Install and deploy framework or addon to your project. Skills are deployed natively for providers that support them; commands are generated from skill sources for providers that need them. Each provider receives all artifact types (agents, skills, commands, rules) regardless of native platform support.

```bash
aiwg use <framework|addon>
```

**Arguments:**

- `<framework>` - Framework name: `sdlc`, `marketing`, `writing`, `all`
- `<addon>` - Addon name: any addon in `agentic/code/addons/` (e.g., `rlm`, `ralph`, `ring-methodology`)

**Options:**

- `--provider <name>` - Target platform (claude, copilot, factory, cursor, windsurf, warp, codex, opencode, hermes, openclaw, local)
- `--model <name>` - Override model for all tiers (blanket)
- `--reasoning-model <name>` - Override reasoning tier model (alias: `--reasoning`)
- `--coding-model <name>` - Override coding tier model (alias: `--coding`)
- `--efficiency-model <name>` - Override efficiency tier model (alias: `--efficiency`)
- `--save` - Save model overrides to project `models.json`
- `--save-user` - Save model overrides to `~/.config/aiwg/models.json`
- `--no-utils` - Skip aiwg-utils addon installation (frameworks only)
- `--force` - Overwrite existing deployments
- `--dry-run` - Preview without making changes
- `--ci-hooks-enabled` - Also deploy CI workflow files to `.github/workflows/` and/or `.gitea/workflows/` (opt-in; detects forge from `.git/config`). Review deployed files before committing.
- `--skip-commands-migration` - Skip deleting the legacy commands directory (warns about duplicate entries in the command palette)
- `--profile <name>` - Select a topology profile for addons that declare multiple page templates (e.g., `llm-wiki` ships `book-companion | personal | research-deep-dive | business-team | generic`). Without the flag, an interactive prompt appears on TTY. The selection is written to `.aiwg/<namespace>/config.json` so subsequent skill invocations pick the right template.

**Capabilities:** cli, framework, deployment, addon
**Platforms:** All
**Tools:** Read, Write, Bash, Glob

**Examples:**

```bash
# Deploy SDLC framework for Claude Code (default)
aiwg use sdlc

# Deploy to GitHub Copilot
aiwg use sdlc --provider copilot

# Deploy marketing framework
aiwg use marketing

# Deploy all frameworks and addons (auto-discovers all addons in agentic/code/addons/ except those marked devOnly)
aiwg use all

# Deploy RLM addon (recursive context decomposition)
aiwg use rlm

# Deploy RLM addon to Codex
aiwg use rlm --provider codex

# Preview deployment without writing files
aiwg use sdlc --dry-run

# Override model for all tiers
aiwg use sdlc --model sonnet

# Override individual tiers
aiwg use sdlc --reasoning opus --coding sonnet --efficiency haiku

# Use a specific model ID on Factory
aiwg use sdlc --provider factory --coding-model gpt-5.3-codex

# Blanket with per-tier override
aiwg use sdlc --model sonnet --reasoning opus

# Save model overrides for future deployments
aiwg use sdlc --model sonnet --save

# Deploy SDLC with CI workflow files (opt-in; review before committing)
aiwg use sdlc --ci-hooks-enabled

# Preview CI files that would be deployed without writing them
aiwg use sdlc --ci-hooks-enabled --dry-run
```

**Model override precedence:** CLI flags > project `models.json` > user `~/.config/aiwg/models.json` > AIWG defaults

**Shorthand values:** `opus`, `sonnet`, `haiku`, `inherit` — resolved per provider to full model IDs

**Framework options:**

| Framework | ID | Description |
|-----------|-----|------------|
| **SDLC Complete** | `sdlc` | Full software development lifecycle with 90 agents |
| **Marketing Kit** | `marketing` | Complete marketing campaign management |
| **Writing Quality** | `writing` | Voice profiles and content validation |
| **All** | `all` | Deploy all frameworks |

**Addon options:**

| Addon | ID | Description |
|-------|-----|------------|
| **RLM** | `rlm` | Recursive Language Models — recursive context decomposition for 10M+ token processing |

**Platform targets:**

| Platform | `--provider` ID | Artifact dirs | Behaviors |
|----------|-----------------|---------------|-----------|
| Claude Code | `claude` | `.claude/agents/`, `.claude/commands/`, `.claude/skills/`, `.claude/rules/` | — |
| GitHub Copilot | `copilot` | `.github/agents/`, `.github/copilot-rules/`, `.github/skills/` | — |
| Factory AI | `factory` | `.factory/droids/`, `.factory/commands/`, `.factory/skills/`, `.factory/rules/` | — |
| Cursor | `cursor` | `.cursor/agents/`, `.cursor/commands/`, `.cursor/skills/`, `.cursor/rules/` | — |
| Windsurf | `windsurf` | `AGENTS.md` (aggregated), `.windsurf/workflows/`, `.windsurf/skills/`, `.windsurf/rules/` | — |
| Warp Terminal | `warp` | `.warp/agents/`, `.warp/commands/`, `.warp/skills/`, `.warp/rules/`, `WARP.md` (aggregated) | — |
| OpenAI/Codex | `codex` | `.codex/agents/`, `~/.codex/prompts/`, `~/.codex/skills/`, `.codex/rules/` | — |
| OpenCode | `opencode` | `.opencode/agent/`, `.opencode/commands/`, `.opencode/skill/`, `.opencode/rule/` | — |
| Hermes | `hermes` | `~/.hermes/skills/`, `AGENTS.md` (lean) | — |
| OpenClaw | `openclaw` | `~/.openclaw/agents/`, `~/.openclaw/commands/`, `~/.openclaw/skills/`, `~/.openclaw/rules/`, `~/.openclaw/behaviors/` | ✓ |
| Local/Ollama | `local` | Same as `claude` (local model, Claude Code paths) | — |

**Commands → Skills migration:**

On first run after the commands-to-skills migration, `aiwg use` detects an existing commands directory and offers to delete it before deploying skills. Keeping both causes duplicate entries in the provider command palette. The prompt is shown when running interactively; in CI/non-TTY contexts the migration runs silently. Pass `--skip-commands-migration` to opt out (a warning is printed instead). Home-directory providers (codex, openclaw) are excluded from this migration.

**Notes:**

- **Codex**: Commands and skills deploy to `~` (user-level) for availability across all projects; the provider ID is `codex`, not `openai`
- **Windsurf**: Agents aggregated into `AGENTS.md` at project root; no separate agent files
- **Warp**: Agents and commands also aggregated into `WARP.md` for single-file context loading
- **Hermes**: Not a spawnable CLI — access via `ollama run hermes3` or MCP sidecar; deploy sets up skills and a lean AGENTS.md
- **OpenClaw**: Only provider with behaviors support (`~/.openclaw/behaviors/`); all artifacts deploy to home directory
- **Local/Ollama**: Uses Claude Code path layout; specify `--coding-model ollama/<model>` to route coding tasks to the local model

---

### list

List installed frameworks and addons.

```bash
aiwg list
```

**Capabilities:** cli, framework, query
**Platforms:** All
**Tools:** Read

**Output format:**

```
Installed Frameworks:
  sdlc-complete (v1.0.0) - Full SDLC framework
  media-marketing-kit (v1.0.0) - Marketing framework

Installed Addons:
  aiwg-utils (v1.0.0) - Core utilities
  voice-framework (v1.0.0) - Voice profiles

Total: 2 frameworks, 2 addons
```

---

### remove

Remove a framework, addon, or project-local bundle.

```bash
aiwg remove <id> [--force] [--dry-run] [--provider <p>] [--keep-registry]
```

**Arguments:**

- `<id>` — Framework, addon, or project-local bundle id (e.g., `sdlc`, `marketing`, `voice-framework`, `my-team-rules`)

**Flags (project-local bundles):**

- `--force` — Skip the case-2 mutation prompt and revert operator-edited deployed files. Does **not** delete bundle source under `.aiwg/<type>/<name>/`. Does **not** authorize deleting another bundle's deployed file.
- `--dry-run` — Print the revert plan; no filesystem or registry changes.
- `--provider <p>` — Restrict revert to one provider (e.g., `claude`, `cursor`).
- `--keep-registry` — Revert deployed files but leave the `installed` entry in `aiwg.config`.

**Capabilities:** cli, framework, uninstall
**Platforms:** All
**Tools:** Read, Write, Bash

**Examples:**

```bash
# Remove an upstream framework
aiwg remove sdlc

# Remove a project-local bundle (revert deploys, preserve source)
aiwg remove my-team-rules

# Preview without changes
aiwg remove my-team-rules --dry-run

# Override mutation refusal
aiwg remove my-team-rules --force
```

**Routing:**

- If `<id>` matches a project-local entry in `aiwg.config.installed`, routes to the project-local revert handler ([design](https://github.com/jmagly/aiwg/blob/main/.aiwg/architecture/design-aiwg-remove-revert.md)) which uses recorded `artifactHashes` to detect pristine vs mutated vs replaced deployed files.
- Otherwise, falls through to the upstream framework / plugin uninstaller.

**Source preservation invariant:** `aiwg remove` never deletes content under `.aiwg/<type>/<name>/`. To remove the source, use `rm -rf` explicitly.

**Activity log:** Emits `remove`, plus `remove-mutated` / `remove-conflict` per skipped artifact, plus `remove-force` when `--force` is used.

---

### promote

Graduate a project-local bundle to upstream or to a private corpus path.
Implements the identical-form portability invariant ([ADR #1038](https://github.com/jmagly/aiwg/blob/main/.aiwg/architecture/adr-identical-form-portability.md)) — copies `.aiwg/<type>/<name>/` to its destination and re-hashes every file to verify byte-identical correctness.

```bash
aiwg promote <name> [--to upstream|corpus <path>] [--dry-run] [--cleanup] [--force]
```

**Arguments:**

- `<name>` — Project-local bundle id

**Flags:**

- `--to upstream` (default) — Copy to `agentic/code/addons/<name>/` (or `agentic/code/frameworks/<name>/` for `type: framework`)
- `--to corpus <path>` — Copy to `<path>/<name>/`. The path must exist; `<name>` must not pre-exist there.
- `--dry-run` — Print the plan (source, destination, file count, total bytes); no writes.
- `--cleanup` — Remove the `.aiwg/<type>/<name>/` source after a successful copy.
- `--force` — Bypass the `@.aiwg/` reference refusal (those references will dangle in the destination).

**Capabilities:** cli, framework, graduate, project-local
**Platforms:** All
**Tools:** Read, Write, Bash

**Pre-flight checks (in order):**

1. Bundle exists under `.aiwg/{type}/{name}/`
2. Destination doesn't already exist (refuses overwrite — must `aiwg remove` from upstream first)
3. No `@.aiwg/` references that would dangle (refuse without `--force`)

**Operation:**

1. Snapshot SHA-256 of every source file
2. Recursive `cp` to destination
3. Re-hash every destination file; **roll back** (delete dest) on any mismatch
4. Update registry: `source: 'project-local'` → `'bundled'` (or `'corpus'`)
5. Emit `promote` (or `promote-failed`) to the activity log

**Examples:**

```bash
aiwg promote my-team-rules                           # default --to upstream
aiwg promote my-team-rules --to corpus ~/my-corpus/  # private corpus
aiwg promote my-team-rules --dry-run                 # preview
aiwg promote my-team-rules --cleanup                 # remove .aiwg source after copy
```

---

### new-bundle

Scaffold a project-local bundle under `.aiwg/{type}/{name}/` with a valid manifest, a starter artifact, and a README that includes the identical-form portability reminder.

```bash
aiwg new-bundle <name> [--type extension|addon|framework|plugin] [--starter skill|rule|agent|minimal] [--description "..."]
```

**Arguments:**

- `<name>` — Bundle id (kebab-case: `a-z0-9-`, no leading/trailing hyphen)

**Flags:**

- `--type` — Bundle type (default: `extension`). Inferred from invocation when called via aliases (`new-extension`, `new-addon`, `new-framework`, `new-plugin`).
- `--starter` — Which starter artifact to drop in. Default: `skill` for addon/extension; `minimal` for framework/plugin.
- `--description` — Free-text human description for the manifest.

**Aliases:** `new-extension`, `new-addon`, `new-framework`, `new-plugin`

**Capabilities:** cli, scaffolding, project-local
**Platforms:** All
**Tools:** Read, Write, Bash

**Examples:**

```bash
# Default extension with skill starter
aiwg new-bundle my-team-rules

# Addon with rule starter and custom description
aiwg new-bundle pg-helpers --type addon --starter rule --description "Postgres query helpers"

# Framework via alias
aiwg new-framework healthcare-sdlc

# Plugin (minimal starter)
aiwg new-plugin my-distro --starter minimal
```

**What gets created:**

- `manifest.json` — valid against the canonical schema, all required fields filled
- `README.md` — usage, customization tips, identical-form reminder, deploy/remove/promote commands
- Starter artifact: `skills/<name>-skill/SKILL.md`, `rules/<name>.md`, or `agents/<name>.md` depending on `--starter`
- Type-specific stubs: `src/.gitkeep` for framework, `payload/.gitkeep` for plugin

The bundle is immediately deployable: `aiwg use <name>`.

---

### install

Install an AIWG-compatible framework, addon, or extension package from a
remote Git repository into the local registry cache. Distinct from
`install-plugin` (Claude Code plugin format).

```bash
aiwg install <ref> [--deploy] [--provider <name>] [--target <dir>] [--refresh]
```

**Arguments:**

- `<ref>` - Git URL or short reference for a package

**Options:**

- `--deploy` - Deploy immediately after install
- `--provider <name>` - Target provider (claude, copilot, cursor, ...) — default `claude`
- `--target <dir>` - Project directory to deploy into — default cwd
- `--refresh` - Force re-pull even if package is already cached

**Capabilities:** cli, framework, install, git
**Tools:** Read, Write, Bash

---

### marketplace

Search and list packages across configured marketplace adapters (clawhub, openclaw, local).

```bash
aiwg marketplace search <query> [--source <id>] [--json]
aiwg marketplace list [--source <id>] [--json]
```

**Subcommands:**

- `search <query>` - Search marketplace catalogs for matching packages
- `list` - List all packages from configured sources

**Options:**

- `--source <id>` - Limit to a specific source (clawhub, openclaw, local)
- `--json` - Emit structured JSON for programmatic consumption

**Capabilities:** cli, marketplace, search, discovery
**Tools:** Read

**Examples:**

```bash
aiwg marketplace search auth
aiwg marketplace search auth --source clawhub
aiwg marketplace list --json
```

---

### packages

Manage packages installed via `aiwg install` (the remote-package registry).

```bash
aiwg packages list
aiwg packages info <key>
aiwg packages remove <key>
```

**Subcommands:**

- `list` - List all installed remote packages
- `info <key>` - Show metadata, cache state, and deploy hint for a package
- `remove <key>` - Remove a package from the local registry and cache

**Capabilities:** cli, framework, query, uninstall
**Tools:** Read

---

## Project Setup

### new

Create new project with SDLC templates.

```bash
aiwg new <project-name>
aiwg -new <project-name>
```

**Arguments:**

- `<project-name>` - Name of project directory to create

**Capabilities:** cli, project, scaffolding
**Platforms:** All
**Tools:** Read, Write, Bash

**Creates:**

```
my-project/
├── .aiwg/
│   ├── intake/
│   ├── requirements/
│   ├── architecture/
│   ├── planning/
│   ├── risks/
│   ├── testing/
│   ├── security/
│   ├── deployment/
│   └── frameworks/
│       └── registry.json
├── .claude/
│   ├── agents/
│   ├── commands/
│   └── skills/
├── CLAUDE.md
└── README.md
```

**Example:**

```bash
aiwg new customer-portal
cd customer-portal

# Framework already deployed, start working
/intake-wizard "Customer portal with real-time chat"
```

### session

Start an agentic session with pre-flight health checks, auto-repair, optional MCP injection, and provider launch.

```bash
aiwg session                        # default provider, full pre-flight + launch
aiwg session mcp                    # inject configured MCPs first, then launch
aiwg session --provider codex       # explicit provider
aiwg session mcp --provider cursor  # MCP inject for cursor + start instructions
aiwg session --no-repair            # skip auto-repair (still checks and reports)
```

**Options:**

- `mcp` - Inject configured MCP servers into the provider config before launching
- `--provider <p>` - Override provider (default: `providers[0]` from `.aiwg/aiwg.config`, then `claude`)
- `--no-repair` - Skip auto-repair; still runs health checks and reports issues
- `--profile <name>` - Launch with a named MCP profile (ephemeral by default — does not modify your provider's default config). For Claude: passes a temp config via `--mcp-config`. For Codex: sets up a per-profile runtime home via `~/.codex/roles-runtime/<profile>/`
- `--persist` - When combined with `--profile`, writes servers to the provider's default config instead of using an ephemeral temp file

**Pre-flight sequence:**

1. **Version check** — updates aiwg if stale (`npm install -g aiwg@latest`)
2. **Health check** — runs `aiwg doctor`; auto-repairs fixable issues via `aiwg refresh`
3. **Deployment check** — redeploys framework files to the provider if missing or stale
4. **MCP inject** (when `mcp` subcommand or `--profile` used) — runs `aiwg mcp inject --provider <p>`
5. **Launch** — spawns binary (claude, codex, opencode) or prints start instructions (IDE providers: cursor, windsurf, copilot, etc.)

**Auto-repair escalation:**

- Strategy 1: `aiwg refresh` (update + redeploy)
- Strategy 2: `npm install -g aiwg@latest` + redeploy all frameworks
- If unresolvable: surfaces `aiwg feedback --type bug` as escape hatch

**Capabilities:** cli, project
**Platforms:** All
**Tools:** Bash

**Examples:**

```bash
# Default: run pre-flight then launch claude
aiwg session

# With MCP servers injected first
aiwg session mcp

# Launch a specific provider
aiwg session --provider opencode

# Set up Cursor (IDE — prints instructions instead of launching)
aiwg session --provider cursor

# Combine MCP + provider
aiwg session mcp --provider codex

# Skip repair if you just want to check and launch
aiwg session --no-repair

# Launch claude with the 'dev' MCP profile (ephemeral — default config unchanged)
aiwg session --profile dev

# Launch codex with the 'ops' profile (isolated OAuth per profile)
aiwg session --provider codex --profile ops

# Persist profile servers into provider's default config
aiwg session --profile incident --persist
```

---

### serve

Start local HTTP dashboard server for sandbox fleet management and HITL relay.

```bash
aiwg serve
aiwg serve --port 8080 --bind 0.0.0.0
aiwg serve --no-open --read-only
```

**Options:**

- `--port <n>` - Port to listen on (default: `7337`)
- `--bind <host>` - Interface to bind (default: `127.0.0.1`)
- `--no-open` - Skip auto-opening browser
- `--read-only` - Disable PTY sessions and session creation

**Capabilities:** cli, server
**Platforms:** All
**Tools:** Read, Bash

**Requires:** `hono`, `@hono/node-server`, `ws` (auto-installed on first use; or `npm install hono @hono/node-server ws`)

**See also:** [Serve Guide](serve-guide.md) for full API reference, WebSocket protocols, and integration details.

---

### local-executor

Start a no-sandbox host-process executor that boots `DaemonSupervisor` + `ExecutorShim` and registers with `aiwg serve` for mission dispatch. Implements `executor.aiwg.io/v1` Core + HITL conformance with `isolation: none` (#1181).

```bash
aiwg local-executor serve
aiwg local-executor serve --port 7400 --aiwg-serve http://127.0.0.1:7337
aiwg local-executor serve --max-concurrency 4 --executor-id <uuid>
```

**Options:**

- `--port <n>` - Port the executor listens on (default: auto-allocated)
- `--bind <host>` - Interface to bind (default: `127.0.0.1`)
- `--aiwg-serve <url>` - URL of the parent `aiwg serve` to register with (default: `http://127.0.0.1:7337`)
- `--max-concurrency <n>` - Max concurrent missions (default: `2`)
- `--executor-id <uuid>` - Stable executor ID for re-registration (default: generated)

**Conformance:** `executor-contract` v1 — Core + HITL profiles, `isolation: none`.

**Capabilities:** cli, executor, missions, hitl
**Platforms:** All
**Tools:** Bash

**See also:** [Executor Contract ADR](.aiwg/architecture/adr-executor-contract.md), [executor.aiwg.io/v1 spec](.aiwg/architecture/executor.aiwg.io-v1.md).

---

### init

Initialize an AIWG project by creating `.aiwg/aiwg.config` (provider registry,
scripts, delivery policy). Distinct from `aiwg new` (which scaffolds a
brand-new project tree).

```bash
aiwg init [--force] [--non-interactive | --yes]
```

**Options:**

- `--force` - Overwrite an existing `.aiwg/aiwg.config`
- `--non-interactive`, `--yes` - Skip prompts and accept detected defaults

**Capabilities:** cli, project, config, setup
**Tools:** Read, Write

If a config already exists, the command exits without changes unless `--force` is passed.

---

### run

Two routes, dispatched by the first argument:

#### `aiwg run [script-name]` — user scripts from `aiwg.config`

Execute a named script defined in `.aiwg/aiwg.config` (analogous to `npm run`).

```bash
aiwg run [script-name] [project-dir]
```

**Arguments:**

- `[script-name]` - Script entry from `aiwg.config`. Omit to list all scripts.
- `[project-dir]` - Project directory (default cwd)

#### `aiwg run skill <name>` — script-bearing skills (#1227)

Execute a skill's declared script entrypoint via the CLI's runtime registry.
Resolves the skill via the artifact index (the same one `aiwg discover` and
`aiwg show` use), reads its `script:` frontmatter block, and dispatches the
entrypoint with the right interpreter (node, python3, bash, sh, pwsh, ruby,
or `auto` by extension/shebang).

```bash
aiwg run skill <name> [--cwd <path>] [-- <args forwarded to script>]
```

**Examples:**

```bash
aiwg run skill voice-apply -- --voice technical-authority --input draft.md
aiwg run skill template-engine -- render adr-template.md --vars vars.yaml
aiwg run skill ai-pattern-detection -- --path docs/
```

**CWD invariant:** the script runs from the project root the CLI was invoked
from, **not** from the skill's source directory. Skill scripts live at
`$AIWG_ROOT/agentic/code/...` but operate on the user's project, so relative
paths (`.aiwg/`, `src/`, `package.json`) resolve into the user's tree. Override
via `--cwd <path>` for scripted/CI cases. Per-skill manifest can also set
`cwd: skill-dir` (rare) or `cwd: aiwg-root` (escape hatch).

**Env vars exposed to the script:**

| Var | Value |
|---|---|
| `AIWG_PROJECT_ROOT` | absolute path to the calling project's root |
| `AIWG_SKILL_DIR` | absolute path to the skill's source directory |
| `AIWG_ROOT` | AIWG installation root |

**Manifest schema** (in SKILL.md frontmatter):

```yaml
script:
  entrypoint: scripts/voice_loader.py   # required, relative to skill dir
  runtime: python3                       # required: node|python3|bash|sh|pwsh|ruby|auto
  cwd: project-root                      # optional, default
  argsHint: "--voice <name> --input <path>"  # optional UX hint
```

Skills without a `script:` block remain pure-instructional (no behavior change).
Discovery surfaces script-bearing skills with `"executable": true` and a
`run_hint` in `aiwg discover --json`; human output marks them with `[exec]`.

**Capabilities:** cli, utility, scripts, skills
**Tools:** Read, Bash

---

### sandbox

Sandbox agent identity management — alias logical agent names to persistent
identities, resolve aliases, and list known identities.

```bash
aiwg sandbox alias <ref>
aiwg sandbox resolve <ref>
aiwg sandbox identities [--json]
```

**Subcommands:**

- `alias <ref>` - Bind a logical agent name to a persistent identity
- `resolve <ref>` - Resolve a logical name to its identity record
- `identities` - List all known persistent agent identities

**Options:**

- `--json` - (with `identities`) emit structured JSON

**Capabilities:** cli, sandbox, agent-identity, agent-routing
**Tools:** Bash

---

## Workspace Management

### status

Show workspace health and installed frameworks.

```bash
aiwg status
aiwg -status
```

**Capabilities:** cli, workspace, status
**Platforms:** All
**Tools:** Read, Bash

**Shows:**

- Project directory
- Installed frameworks and versions
- Framework health status
- Agent deployment count
- Command deployment count
- Workspace artifact summary
- Git status (if git repo)

**Example output:**

```
Workspace: /home/user/customer-portal
Git: clean (main branch)

Frameworks:
  ✓ sdlc-complete v1.0.0 (90 agents, 42 commands)
  ✓ aiwg-utils v1.0.0

Artifacts:
  Requirements: 12 files
  Architecture: 5 files
  Tests: 8 files

Status: Healthy
```

---

### migrate-workspace

Migrate legacy `.aiwg/` to framework-scoped structure.

```bash
aiwg migrate-workspace
```

**Capabilities:** cli, workspace, migration
**Platforms:** All
**Tools:** Read, Write, Bash

**Migrates:**

From (legacy):

```
.aiwg/
├── intake/
├── requirements/
└── ...
```

To (framework-scoped):

```
.aiwg/
├── frameworks/
│   ├── registry.json
│   └── sdlc-complete/
│       ├── intake/
│       ├── requirements/
│       └── ...
└── shared/
```

**Safety:**

- Creates backup in `.aiwg.backup-<timestamp>/`
- Validates migration before committing
- Preserves all content
- Updates framework registry

---

### rollback-workspace

Rollback workspace migration from backup.

```bash
aiwg rollback-workspace
```

**Capabilities:** cli, workspace, rollback
**Platforms:** All
**Tools:** Read, Write, Bash

**Restores from:**

- `.aiwg.backup-<timestamp>/` directories
- Prompts to select backup if multiple exist
- Validates backup before restoring
- Creates pre-rollback backup

---

## MCP Commands

### mcp

MCP server operations.

```bash
aiwg mcp <subcommand>
```

**Subcommands:**

#### mcp serve

Start the AIWG MCP server.

```bash
aiwg mcp serve
```

**Actions:**

- Starts stdio-based MCP server
- Exposes AIWG tools, resources, and prompts
- Supports Claude Desktop, Cursor, Factory

#### mcp install

Generate MCP client configuration.

```bash
aiwg mcp install <client>
```

**Arguments:**

- `<client>` - Client name: `claude`, `cursor`, `factory`

**Options:**

- `--dry-run` - Preview without writing

**Actions:**

- Generates client-specific config
- Adds to `~/.config/claude/config.json` (Claude Desktop)
- Adds to `.cursor/config.json` (Cursor)
- Shows manual steps if auto-install fails

**Example:**

```bash
# Install for Claude Desktop
aiwg mcp install claude

# Preview config
aiwg mcp install claude --dry-run
```

#### mcp info

Show MCP server capabilities.

```bash
aiwg mcp info
```

**Shows:**

- MCP protocol version
- Available tools
- Available resources
- Available prompts
- Server status

**Capabilities:** cli, mcp, server
**Platforms:** All
**Tools:** Read, Write, Bash

#### mcp add

Register an MCP server in the AIWG server registry (`~/.aiwg/mcp-servers.json`).

```bash
aiwg mcp add <name> --url <url> [--type http|stdio|sse] [--description <text>]
aiwg mcp add <name> --type stdio --command <cmd> [--args <a,b>] [--env KEY=VAL]
```

**Arguments:**

- `<name>` - Unique server name (referenced by profiles and inject)

**Options:**

- `--type <type>` - Server type: `http` (default), `stdio`, `sse`
- `--url <url>` - URL for http/sse servers
- `--command <cmd>` - Executable for stdio servers
- `--args <a,b>` - Comma-separated args for stdio command
- `--env KEY=VAL` - Environment variable(s) for stdio servers
- `--headers KEY=VAL` - HTTP headers for http/sse servers
- `--description <text>` - Human-readable description

**Example:**

```bash
# HTTP server
aiwg mcp add my-api --url http://localhost:3001 --description "Local API server"

# stdio server
aiwg mcp add git-server --type stdio --command npx --args @gitea/mcp-server
```

#### mcp remove

Remove a server from the AIWG registry.

```bash
aiwg mcp remove <name>
```

Note: does not remove the server from already-injected provider configs. Re-run `aiwg mcp inject --all` to propagate removals.

#### mcp update

Update a registered server's properties.

```bash
aiwg mcp update <name> [--url <url>] [--type <type>] [--command <cmd>] [--description <text>]
```

Re-run `aiwg mcp inject --all` after updating to propagate changes to provider configs.

#### mcp list

List all registered MCP servers.

```bash
aiwg mcp list
```

Shows server name, type, URL or command, description, and which providers it has been injected into.

#### mcp inject

Inject registered servers into a provider's config file.

```bash
aiwg mcp inject --provider <name> [options]
aiwg mcp inject --all [--dry-run]
```

**Options:**

- `--provider <name>` - Target provider (`claude`, `codex`, `cursor`, `copilot`, `windsurf`, `opencode`, `warp`, `factory`, `openclaw`, `hermes`)
- `--all` - Inject into all providers that have been configured before
- `--profile <name>` - Resolve server set from a named MCP profile (see `mcp profile`)
- `--ephemeral` - Write a standalone temp config without modifying the provider's default config. Supported for: `claude`, `codex`, `openai`. Not supported for: `warp`
- `--out <path>` - Explicit output path for ephemeral config (default: auto-generated temp file)
- `--servers <a,b>` - Comma-separated server name filter (alternative to `--profile`)
- `--dry-run` - Preview what would be written without modifying any files

**Example:**

```bash
# Inject all registered servers into Claude Code config
aiwg mcp inject --provider claude

# Inject servers from the 'dev' profile only
aiwg mcp inject --provider claude --profile dev

# Ephemeral: write to a temp file, don't touch default config
aiwg mcp inject --provider claude --profile ops --ephemeral

# Ephemeral to a specific path
aiwg mcp inject --provider claude --profile ops --ephemeral --out /tmp/ops-mcp.json

# Propagate updates to all previously configured providers
aiwg mcp inject --all

# Preview without writing
aiwg mcp inject --provider cursor --dry-run
```

#### mcp profile

Manage named MCP profiles — ordered subsets of registered servers stored in `~/.aiwg/mcp-profiles.json`.

Profiles let you launch sessions or inject only the servers relevant to a specific task (e.g., `dev` for code editing, `ops` for infrastructure work).

```bash
aiwg mcp profile <subcommand>
```

**Subcommands:**

| Subcommand | Description |
|-----------|-------------|
| `add <name>` | Create a new profile |
| `list` | List all profiles |
| `show <name>` | Show profile details and resolved servers |
| `edit <name>` | Add/remove servers or update description |
| `remove <name>` | Delete a profile |
| `import <file>` | Import profiles from a JSON file |
| `export [<name>] --out <file>` | Export one or all profiles |
| `init-presets` | Install built-in preset profiles |

**Preset Profiles** (installed via `aiwg mcp profile init-presets`):

| Name | Servers | Description |
|------|---------|-------------|
| `minimal` | (none) | Minimal toolset for smoke tests |
| `dev` | git-gitea, codeindex-codehound, memory-fortemi | Code editing + git + memory |
| `ops` | git-gitea, cmdb-itassets, memory-fortemi | Infra + git + CMDB |
| `research` | memory-fortemi, google-drive, google-calendar | Documentation + memory + calendar |
| `incident` | git-gitea, cmdb-itassets, memory-fortemi, codeindex-codehound | Incident response |
| `full` | `__all__` | All registered servers |

**Profile options:**

```bash
# add
aiwg mcp profile add <name> --servers <a,b> [--description <text>]

# edit
aiwg mcp profile edit <name> --add-server <s> --remove-server <s> [--description <text>]

# export
aiwg mcp profile export <name> --out ./my-profile.json
aiwg mcp profile export --out ./all-profiles.json   # export all
```

**Examples:**

```bash
# Install built-in presets
aiwg mcp profile init-presets

# Create a custom profile
aiwg mcp profile add my-work --servers git-gitea,memory-fortemi --description "Daily work"

# List all profiles
aiwg mcp profile list

# Inspect a profile
aiwg mcp profile show dev

# Add a server to an existing profile
aiwg mcp profile edit my-work --add-server codeindex-codehound

# Use a profile in a session
aiwg session --profile dev

# Use a profile for ephemeral inject
aiwg mcp inject --provider claude --profile ops --ephemeral
```

**Profile storage:** `~/.aiwg/mcp-profiles.json` (apiVersion: `aiwg.io/v1`, kind: `McpProfileRegistry`)

**Codex runtime homes:** When `--provider codex` with `--profile` is used, AIWG creates a per-profile runtime home at `~/.codex/roles-runtime/<profile>/`. Each runtime home has an isolated `config.toml` with only the profile's servers, and OAuth tokens are stored separately per profile. Shared state (history, sessions) is symlinked from `~/.codex/`.

---

## Catalog Commands

### catalog

Model catalog operations.

```bash
aiwg catalog <subcommand>
```

**Subcommands:**

#### catalog list

List available models.

```bash
aiwg catalog list
```

**Options:**

- `--provider <name>` - Filter by provider (anthropic, openai, google)
- `--type <type>` - Filter by type (chat, completion, embedding)

#### catalog info

Show model information.

```bash
aiwg catalog info <model-id>
```

**Arguments:**

- `<model-id>` - Model identifier (e.g., `claude-opus-4-6`)

#### catalog search

Search model catalog.

```bash
aiwg catalog search <query>
```

**Arguments:**

- `<query>` - Search terms

**Capabilities:** cli, catalog, models
**Platforms:** All
**Tools:** Read

---

### skills

Skill registry operations — search, install, and inspect skills from local sources, ClawHub, and OpenClaw.

```bash
aiwg skills <subcommand> [options]
```

**Subcommands:**

- `list` - List skills from configured registries
- `search <query>` - Search the skill registry by keyword
- `info <id>` - Show metadata for a specific skill
- `install <id>` - Install a skill from the registry
- `publish <path>` - Publish a local skill to a registry

**Capabilities:** cli, skills, registry, search, install, publish
**Tools:** Read, Bash

---

## Toolsmith Commands

### runtime-info

Show runtime environment summary with tool discovery.

```bash
aiwg runtime-info
```

**Capabilities:** cli, toolsmith, discovery
**Platforms:** All
**Tools:** Read, Bash

**Shows:**

- Platform detection (Claude Code, Cursor, etc.)
- Available tools (Read, Write, Bash, Glob, Grep)
- System utilities (git, jq, curl, etc.)
- Environment variables
- Tool capabilities and limitations

**Example output:**

```
Platform: Claude Code
AI Model: claude-sonnet-4-6

Available Tools:
  ✓ Read (supports images, PDFs)
  ✓ Write
  ✓ Bash (timeout: 2min)
  ✓ Glob
  ✓ Grep

System Utilities:
  ✓ git v2.39.0
  ✓ jq v1.6
  ✓ node v20.10.0
  ✓ npm v10.2.3
  ✗ gh (GitHub CLI not installed)

Scheduler:
  Backend:  native-cron (CronCreate) / aiwg-cli fallback
  Chrony:   ✓ installed (precise NTP)

Environment: Linux 6.14.0-37-generic
```

---

## Schedule Skill

Cross-provider scheduler that detects native cron capability (Claude Code `CronCreate`) and falls back to the AIWG daemon CLI on all other providers. Checks `chrony` installation for precise timing.

### schedule create

```bash
/schedule create --name <name> --cron "<expr>" --task "<prompt>"
```

**Options:**

- `--name` — Unique task name (required)
- `--cron` — 5-field cron expression (required)
- `--task` — Prompt or command to run (required)
- `--provider native|aiwg-cli` — Override backend detection

**Examples:**

```bash
/schedule create --name daily-refresh --cron "0 9 * * *" --task "aiwg refresh"
/schedule create --name health-check --cron "0 */6 * * *" --task "aiwg doctor"
```

### schedule list

```bash
/schedule list
```

Lists all scheduled tasks, showing name, cron expression, next run time, and backend in use.

### schedule delete

```bash
/schedule delete --name <name>
```

Deletes a scheduled task by name.

### Backend Detection

| Provider | Backend |
|----------|---------|
| Claude Code | `native-cron` (CronCreate/CronList/CronDelete) |
| All others | `aiwg-cli` (AIWG daemon) |

The active backend is reported in `aiwg runtime-info`. Override with `--provider` flag.

### Chrony Recommendation

When scheduling tasks, the skill checks whether `chrony` is installed and recommends it if missing. Chrony provides accurate NTP time synchronization, preventing clock drift that causes tasks to run at unexpected times — especially on servers that sleep or in virtual environments.

```bash
# Ubuntu/Debian
sudo apt install chrony

# RHEL/Fedora
sudo dnf install chrony

# macOS
brew install chrony
```

---

## Utility Commands

### prefill-cards

Prefill SDLC card metadata from team profile.

```bash
aiwg prefill-cards
```

**Capabilities:** cli, sdlc, automation
**Platforms:** All
**Tools:** Read, Write

**Actions:**

- Reads `.aiwg/team-profile.json`
- Finds empty SDLC cards (use cases, architecture docs, etc.)
- Fills in standard metadata (author, date, version)
- Preserves existing content

**Example:**

```bash
# Create team profile first
cat > .aiwg/team-profile.json <<EOF
{
  "project": "Customer Portal",
  "team": "Platform Team",
  "defaultAuthor": "Jane Developer",
  "defaultReviewer": "John Architect"
}
EOF

# Prefill all cards
aiwg prefill-cards
```

---

### contribute-start

Start AIWG contribution workflow.

```bash
aiwg contribute-start
```

**Capabilities:** cli, contribution, workflow
**Platforms:** All
**Tools:** Read, Write, Bash

**Actions:**

- Guides through contribution setup
- Creates feature branch
- Sets up development environment
- Links to contribution guidelines

---

### validate-metadata

Validate plugin/agent metadata.

```bash
aiwg validate-metadata [path]
```

**Arguments:**

- `[path]` - Optional path to validate (defaults to current directory)

**Capabilities:** cli, validation, metadata
**Platforms:** All
**Tools:** Read

**Validates:**

- Extension schema compliance
- Required fields present
- Version format correct
- Platform compatibility declared
- Keywords and capabilities present

**Example:**

```bash
# Validate all extensions in current directory
aiwg validate-metadata

# Validate specific extension
aiwg validate-metadata .claude/agents/api-designer.md
```

### feedback

Submit a bug report, feature request, or feedback to the AIWG GitHub repository. System context (version, OS, Node, provider, installed frameworks) is collected and prefilled automatically.

```bash
aiwg feedback                              # interactive (if TTY)
aiwg feedback --type bug                   # skip type selection
aiwg feedback --type feature               # feature request
aiwg feedback --type doc                   # documentation gap
aiwg feedback --title "X" --body "Y"       # fully non-interactive
aiwg feedback --no-context                 # skip attaching system context
```

**Aliases:** `report`

**Options:**

- `--type <t>` - Feedback type: `bug`, `feature`, `doc`, `other` (interactive prompt if omitted)
- `--title <text>` - Issue title (interactive prompt if omitted)
- `--body <text>` - Issue description (interactive prompt if omitted)
- `--no-context` - Skip collecting and attaching system context

**Submission flow:**

1. If `gh` CLI is available → `gh issue create --repo jmagly/aiwg` with appropriate label
2. Otherwise → opens browser with pre-filled GitHub issue URL
3. If no browser (non-TTY) → prints formatted issue body to stdout for manual filing

**System context collected automatically:**

| Field | Source |
|-------|--------|
| aiwg version | `aiwg version` |
| Node.js | `process.version` |
| OS | `os.type() + os.release()` |
| Arch | `os.arch()` |
| Provider | `.aiwg/aiwg.config` `providers[0]` |
| Frameworks | `.aiwg/aiwg.config` `installed` keys |
| Shell | `$SHELL` / `$COMSPEC` |

**Capabilities:** cli, utility
**Platforms:** All
**Tools:** Bash

**Examples:**

```bash
# Interactive — prompts for type, title, description
aiwg feedback

# File a bug report non-interactively
aiwg feedback --type bug \
  --title "doctor crashes in empty project" \
  --body "Running aiwg doctor in a new directory with no .aiwg causes an unhandled exception."

# Request a feature
aiwg feedback --type feature --title "add --watch flag to aiwg index build"

# Report a doc gap
aiwg feedback --type doc --title "mcp inject workflow not documented"

# Skip system context (for privacy)
aiwg feedback --type bug --title "crash" --body "details" --no-context
```

**Tip:** `aiwg doctor` surfaces `aiwg feedback --type bug` automatically when it finds issues it cannot auto-repair.

---

### lint

Lint AIWG artifacts against declarative rule sets discovered from installed frameworks.

```bash
aiwg lint <target> [--ruleset <name>] [--format full|summary|json]
                   [--ci] [--fail-on error|warn|info] [--dry-run]
aiwg lint --list-rulesets
aiwg lint --list-rules <ruleset>
```

**Arguments:**

- `<target>` - File or directory to lint

**Options:**

- `--ruleset <name>` - Force a specific ruleset (otherwise auto-detected from path)
- `--format full|summary|json` - Output format
- `--ci` - CI-friendly output and exit codes
- `--fail-on error|warn|info` - Severity threshold for non-zero exit
- `--dry-run` - Report what would run without executing rules
- `--list-rulesets` - List all discovered rulesets
- `--list-rules <name>` - List rules contained in a ruleset

**Capabilities:** cli, lint, validation, quality
**Tools:** Bash, Read, Glob, Grep

**Examples:**

```bash
aiwg lint .aiwg/research/ --ruleset research
aiwg lint .aiwg/ --format json --ci --fail-on warn
aiwg lint --list-rulesets
```

---

### skill-lint

Score `SKILL.md` files against a quality rubric (schema, description, discoverability, body).

```bash
aiwg skill-lint <path> [--rubric strict|standard|lenient] [--json]
```

**Arguments:**

- `<path>` - File or directory containing skills (default `agentic/code`)

**Options:**

- `--rubric strict|standard|lenient` - Threshold profile (default `standard`)
- `--json` - Emit structured JSON report

**Capabilities:** cli, validation, metadata, quality
**Tools:** Read

Output reports per-file scores with dimension-level notes for any file
under the rubric threshold, and an aggregate average across all scanned files.

---

## Plugin Commands

**Note:** Plugin commands are specific to Claude Code integration.

### Published plugins

The AIWG marketplace publishes **13 plugins** at `.claude-plugin/marketplace.json`:

| Plugin | Source | Description |
|---|---|---|
| `sdlc` | `frameworks/sdlc-complete` | Full SDLC framework with 220 specialized agents |
| `marketing` | `frameworks/media-marketing-kit` | Marketing operations framework |
| `forensics` | `frameworks/forensics-complete` | Digital forensics & incident response (13 agents, 19 skills) |
| `security-engineering` | `frameworks/security-engineering` | Applied security: crypto, chain-of-trust, factors, supply-chain |
| `research` | `frameworks/research-complete` | Research workflow automation (8 agents, 20 skills) |
| `media-curator` | `frameworks/media-curator` | Media archive management (6 agents, 18 skills) |
| `ops` | `frameworks/ops-complete` | Operational infrastructure: incident, runbooks, troubleshooting |
| `knowledge-base` | `frameworks/knowledge-base` | Knowledge base / wiki framework |
| `utils` | `addons/aiwg-utils` | Core AIWG utilities |
| `voice` | `addons/voice-framework` | Voice profiles for consistent writing |
| `writing` | `addons/writing-quality` | Writing quality and AI-pattern detection |
| `training` | `jmagly/aiwg-training` (separate repo) | Fine-tuning dataset curation |
| `hooks` | `addons/aiwg-hooks` | Workflow tracing and session hooks |

Install any of them with `/plugin install <name>@aiwg` after running `/plugin marketplace add jmagly/ai-writing-guide` once.

### install-plugin

Install Claude Code plugin.

```bash
aiwg install-plugin <name>
```

**Arguments:**

- `<name>` - Plugin name from marketplace

**Capabilities:** cli, plugin, install
**Platform:** Claude Code only
**Tools:** Read, Write, Bash

**Example:**

```bash
aiwg install-plugin sdlc@aiwg
```

---

### uninstall-plugin

Uninstall Claude Code plugin.

```bash
aiwg uninstall-plugin <name>
```

**Arguments:**

- `<name>` - Plugin name

**Capabilities:** cli, plugin, uninstall
**Platform:** Claude Code only
**Tools:** Read, Write, Bash

---

### plugin-status

Show Claude Code plugin status.

```bash
aiwg plugin-status
```

**Capabilities:** cli, plugin, status
**Platform:** Claude Code only
**Tools:** Read

**Shows:**

- Installed plugins
- Plugin versions
- Enabled/disabled status
- Marketplace connection

---

### package-plugin

Package specific plugin for Claude Code marketplace.

```bash
aiwg package-plugin <name>
```

**Arguments:**

- `<name>` - Plugin name to package

**Capabilities:** cli, plugin, packaging
**Platforms:** Claude Code, Generic
**Tools:** Read, Write, Bash

**Creates:**

- `dist/plugins/<name>.plugin.tar.gz`
- Manifest validation
- README and LICENSE inclusion

---

### package-all-plugins

Package all plugins for Claude Code marketplace.

```bash
aiwg package-all-plugins
```

**Capabilities:** cli, plugin, packaging
**Platforms:** Claude Code, Generic
**Tools:** Read, Write, Bash

**Creates:**

- Packages for: sdlc, marketing, utils, voice
- Validates all manifests
- Generates marketplace index

---

## Scaffolding Commands

Commands for creating new extensions within addons/frameworks.

### Skills vs Commands — Provider Support

Skills are the **canonical source type** for agentic workflows. During `aiwg use` deployment:

| Provider support | Behavior |
|-----------------|---------|
| **Native skill support** (Claude Code, OpenCode, Warp, etc.) | Skill deployed as-is to `.{platform}/skills/{id}/SKILL.md` |
| **Generated-command providers** (Copilot, Factory, etc.) | Command file generated from skill source, deployed alongside skill |
| **Legacy direct commands** | Authored command files still supported; not generated from a skill |

**Authoring guidance:**

- New workflow? → `aiwg add-skill` — AIWG handles deployment and command generation
- Modifying an existing workflow? → Edit the `SKILL.md` source, not the generated command files
- Advanced direct command? → `aiwg add-command` (deprecated path, still supported)

### add-agent

Add agent to addon/framework.

```bash
aiwg add-agent <name>
```

**Arguments:**

- `<name>` - Agent name (e.g., "API Designer")

**Capabilities:** cli, scaffolding, agent
**Platforms:** All
**Tools:** Read, Write

**Creates:**

- Agent markdown file with frontmatter
- Extension definition entry
- Platform-specific adaptations

**Example:**

```bash
aiwg add-agent "API Designer"
```

Creates: `agents/api-designer.md`

---

### add-command

> **Deprecated**: Use `aiwg add-skill` instead. Skills are the primary workflow extension type; commands are generated from skills during deployment. `add-command` remains available for direct command authoring in advanced cases.

Add command to addon/framework.

```bash
aiwg add-command <name>
```

**Arguments:**

- `<name>` - Command name (e.g., "validate-api")

**Capabilities:** cli, scaffolding, command
**Platforms:** All
**Tools:** Read, Write

---

### add-skill

Add skill to addon/framework.

```bash
aiwg add-skill <name>
```

**Arguments:**

- `<name>` - Skill name (e.g., "project-awareness")

**Capabilities:** cli, scaffolding, skill
**Platforms:** All
**Tools:** Read, Write

---

### add-behavior

Scaffold a new behavior with BEHAVIOR.md and scripts.

```bash
aiwg add-behavior <name> [options]
```

**Arguments:**

- `<name>` - Behavior name (kebab-case recommended)

**Options:**

- `--description, -d` - Behavior description
- `--hooks` - Comma-separated hook events (default: `on_file_write`). Available: `on_file_write`, `on_tool_complete`, `on_schedule`, `on_commit`, `on_pr_open`, `on_deploy`, `on_session_start`, `on_session_end`
- `--category` - Behavior category (default: `general`)
- `--dry-run, -n` - Preview what would be created

**Capabilities:** cli, scaffolding, behavior
**Platforms:** Claude Code, OpenClaw
**Tools:** Read, Write

**Creates:**

```
agentic/code/behaviors/<name>/
├── BEHAVIOR.md          # Pre-filled with hooks and triggers
└── scripts/
    └── main.sh          # Entry point stub
```

**Examples:**

```bash
aiwg add-behavior security-scanner
aiwg add-behavior test-watcher --hooks on_file_write,on_schedule --category testing
aiwg add-behavior deploy-guard --hooks on_deploy --description "Pre-deploy validation"
```

---

### add-template

Add template to addon/framework.

```bash
aiwg add-template <name>
```

**Arguments:**

- `<name>` - Template name (e.g., "use-case-template")

**Capabilities:** cli, scaffolding, template
**Platforms:** All
**Tools:** Read, Write

---

### scaffold-addon

Create new addon package.

```bash
aiwg scaffold-addon <name>
```

**Arguments:**

- `<name>` - Addon name (e.g., "my-addon")

**Capabilities:** cli, scaffolding, addon
**Platforms:** All
**Tools:** Read, Write

**Creates:**

```
agentic/code/addons/my-addon/
├── manifest.json
├── README.md
├── agents/
├── commands/
├── skills/
└── templates/
```

---

### scaffold-extension

Create new extension package.

```bash
aiwg scaffold-extension <name>
```

**Arguments:**

- `<name>` - Extension name

**Capabilities:** cli, scaffolding, extension
**Platforms:** All
**Tools:** Read, Write

---

### scaffold-framework

Create new framework package.

```bash
aiwg scaffold-framework <name>
```

**Arguments:**

- `<name>` - Framework name (e.g., "security-framework")

**Capabilities:** cli, scaffolding, framework
**Platforms:** All
**Tools:** Read, Write

**Creates:**

```
agentic/code/frameworks/security-framework/
├── manifest.json
├── README.md
├── agents/
├── commands/
├── skills/
├── templates/
└── docs/
```

---

## Daemon Commands

Commands for managing the AIWG daemon and its subsystems.

### behavior

Manage behavior YAML bundles that bind directives and toolsets to agent types.

```bash
aiwg behavior <list|info|apply|remove> [name] [options]
```

**Subcommands:**

- `list` - List all available behaviors
- `info <name>` - Show behavior details (BEHAVIOR.md content)
- `apply <name>` - Apply a behavior to the daemon
- `remove <name>` - Remove a behavior from the daemon

**Capabilities:** cli, behavior, daemon, configuration
**Platforms:** Claude Code
**Tools:** Read, Bash, Write

**Examples:**

```bash
aiwg behavior list
aiwg behavior info security-sentinel
```

---

### daemon-init

Initialize daemon config from a profile template.

```bash
aiwg daemon-init [profile-name] [--force]
```

**Arguments:**

- `[profile-name]` - Profile template to use (default: `manager`)

**Options:**

- `--force` - Overwrite existing config

**Capabilities:** cli, daemon, configuration, scaffolding
**Platforms:** Claude Code
**Tools:** Bash, Read, Write

**Creates:**

- `.aiwg/daemon.yaml` from the selected profile template
- `.env.example` with required environment variables

---

## Mission Control Commands

Mission Control provides multi-loop background orchestration for parallel long-running agents.

### mc

Multi-loop background orchestration dashboard.

```bash
aiwg mc <subcommand> [options]
aiwg mission-control <subcommand> [options]
```

**Capabilities:** cli, orchestration, ralph, background, multi-loop, mission-control
**Platforms:** All
**Tools:** Bash, Read, Write

**Subcommands:**

| Subcommand | Description |
|------------|-------------|
| `start` | Start a new Mission Control session |
| `dispatch <id> "<objective>"` | Add a background mission to session |
| `status [<id>] [--json]` | View mission status dashboard |
| `watch [<id>]` | Live monitor (streaming) |
| `abort <session> <mission>` | Abort a specific mission |
| `pause [<id>]` | Pause active session |
| `resume [<id>]` | Resume paused session |
| `stop [<id>] [--drain]` | Shut down session |
| `list [--json]` | List all sessions |

**Examples:**

```bash
# Start a named session
aiwg mc start --name "Construction Sprint 4"

# Dispatch missions
aiwg mc dispatch mc-abc123 "Fix auth service" --completion "tests pass" --priority high
aiwg mc dispatch mc-abc123 "Add pagination" --completion "paginated responses"

# Monitor
aiwg mc status mc-abc123
aiwg mc status mc-abc123 --json

# Drain and stop (let running missions finish)
aiwg mc stop mc-abc123 --drain
```

**Example output:**

```
◆ MISSION CONTROL — Construction Sprint 4  [mc-abc123]
──────────────────────────────────────────────────────────
  #    Mission                       Status       Loop     Started
──────────────────────────────────────────────────────────
  1    Fix auth service              ✓ DONE       4/10     14:22
  2    Add pagination                ⏳ RUNNING   3/10     14:25
  3    Write integration tests       ⏺ QUEUED     —        —
──────────────────────────────────────────────────────────
  3 missions  |  1 done  |  1 running  |  1 queued  |  0 failed
```

**State persistence:** Session state is stored in `.aiwg/ralph-external/mc/sessions/` and survives context resets.

---

## Agent Team Commands

Agent teams provide a provider-agnostic abstraction for multi-agent collaboration. On Claude Code, teams use native agent dispatch. On all other providers (Copilot, Cursor, Warp, Windsurf, OpenCode, Factory, Codex, OpenClaw), teams are emulated via `aiwg mc` (Mission Control) orchestration.

### team

Multi-agent team orchestration across all providers.

```bash
aiwg team <subcommand> [options]
aiwg teams <subcommand> [options]
```

**Capabilities:** orchestration, agent-teams, multi-provider, mission-control
**Platforms:** All (native on Claude Code, emulated via aiwg mc on others)
**Category:** orchestration

#### Subcommands

| Subcommand | Description |
|-----------|-------------|
| `run <name>` | Execute a team workflow |
| `list` | List available teams |
| `info <name>` | Show team definition and roster |

#### Provider Routing

| Provider | Backend | Behavior |
|----------|---------|----------|
| Claude Code | Native | @agent-name dispatch instructions |
| Warp, Copilot, Cursor, Windsurf, OpenCode, Factory, Codex, OpenClaw | `aiwg mc` emulation | Generates `mc start` + `mc dispatch` commands |

#### Options

| Option | Description |
|--------|-------------|
| `--provider <p>` | Override provider detection |
| `--objective "<text>"` | Objective string passed to mc dispatch agents |
| `--json` | Machine-readable output |

#### Examples

```bash
# Run a team (auto-detects provider)
aiwg team run sdlc-review

# Run with explicit provider override
aiwg team run sdlc-review --provider cursor

# Run with custom objective
aiwg team run security-review --objective "Pre-release audit for SOC2"

# List all available teams
aiwg team list

# Machine-readable team list
aiwg team list --json

# Inspect team definition
aiwg team info sdlc-review
aiwg team info api-development --json
```

#### Built-in Teams (sdlc-complete framework)

| Team | Agents | Dispatch | Best For |
|------|--------|----------|----------|
| `api-development` | 4 | sequential | API design and implementation |
| `full-stack` | 4 | sequential | Full-stack feature delivery |
| `greenfield` | 4 | sequential | New project setup |
| `maintenance` | 4 | sequential | Code review and bug fixing |
| `migration` | 4 | sequential | Technology migrations |
| `sdlc-review` | 4 | parallel | Phase gate validation |
| `security-review` | 3 | sequential | Security audits |

#### Team Definition Format

Teams are defined as JSON files (with an optional `dispatch` field for `parallel | sequential | consensus`):

```json
{
  "name": "SDLC Review Team",
  "slug": "sdlc-review",
  "description": "Full SDLC phase gate review team",
  "dispatch": "parallel",
  "agents": [
    { "agent": "security-architect", "role": "reviewer" },
    { "agent": "test-architect",     "role": "reviewer" },
    { "agent": "requirements-analyst", "role": "reviewer" },
    { "agent": "technical-writer",   "role": "reviewer" }
  ],
  "use_cases": ["Phase gate validation", "Release readiness review"],
  "sdlc_phases": ["inception", "elaboration", "construction", "transition"]
}
```

Custom teams can be placed in `.aiwg/teams/<slug>.json` for project-local overrides.

**Source:** `agentic/code/frameworks/sdlc-complete/teams/`
**Schema:** `agentic/code/frameworks/sdlc-complete/teams/schema.json`

---

## Agent Loop Commands

Al is the iterative task execution loop with advanced control layers (Epic #26).

### ralph

Start Al task execution loop.

```bash
aiwg ralph "<task-description>"
```

**Arguments:**

- `<task-description>` - Natural language task description

**Options:**

**Core Options:**

- `--completion "<criteria>"` - Success criteria (e.g., "npm test passes")
- `--max-iterations <n>` - Maximum iterations (default: 10)
- `--timeout <seconds>` - Per-iteration timeout (default: 300)
- `--provider <name>` - CLI provider: `claude` (default), `codex`, `opencode`, `local`
- `--budget <usd>` - Budget per iteration in USD (default: 2.0)
- `--gitea-issue` - Create/link Gitea issue for tracking
- `--mcp-config <json>` - MCP server configuration JSON

**Research-Backed Options (REF-015, REF-021):**

- `-m, --memory <n|preset>` - Memory capacity Ω: 1-10 or preset (simple, moderate, complex, maximum). Default: 3
- `--cross-task` / `--no-cross-task` - Enable/disable cross-task learning (default: enabled)
- `--no-analytics` - Disable iteration analytics
- `--no-best-output` - Disable best output selection (use final iteration)
- `--no-early-stopping` - Disable early stopping on high confidence

**Epic #26 Control Options:**

- `--enable-pid-control` - Enable PID control layer (default: true)
- `--disable-pid-control` - Disable PID control layer
- `--enable-overseer` - Enable oversight layer (default: true)
- `--disable-overseer` - Disable oversight layer
- `--enable-semantic-memory` - Enable cross-loop memory (default: true)
- `--disable-semantic-memory` - Disable cross-loop memory
- `--gain-profile <name>` - PID gain profile: `conservative`, `standard`, `aggressive`, `recovery`, `cautious` (default: `standard`)
- `--validation-level <level>` - Validation strictness: `minimal`, `standard`, `strict` (default: `standard`)
- `--intervention-mode <mode>` - Oversight intervention mode: `permissive`, `balanced`, `strict` (default: `balanced`)

**Capabilities:** cli, ralph, orchestration
**Platforms:** All
**Tools:** Read, Write, Bash

**Examples:**

```bash
# Basic task execution
aiwg ralph "Fix all failing tests" --completion "npm test passes"

# Conservative run for security fix (Epic #26)
aiwg ralph "Fix SQL injection" \
  --completion "security scan passes" \
  --gain-profile conservative \
  --validation-level strict

# Fast documentation generation (Epic #26)
aiwg ralph "Generate API docs" \
  --completion "docs/ updated" \
  --gain-profile aggressive \
  --disable-overseer

# Leverage cross-loop memory (Epic #26)
aiwg ralph "Fix auth tests" \
  --completion "tests pass" \
  --enable-semantic-memory

# Refactoring with balanced controls
aiwg ralph "Extract common utilities to shared module" \
  --completion "No lint errors" \
  --gain-profile standard \
  --intervention-mode balanced

# Multi-provider: run with Codex
aiwg ralph "Migrate utils to TypeScript" \
  --completion "npx tsc --noEmit exits 0" \
  --provider codex \
  --budget 3.0

# Research-backed: enhanced memory with cross-task learning
aiwg ralph "Fix all integration tests" \
  --completion "npm test passes" \
  --memory complex \
  --cross-task
```

**Iteration pattern:**

1. Analyze current state (with PID control input)
2. Plan next step (informed by semantic memory)
3. Execute step
4. Verify progress (oversight validation)
5. Check completion criteria
6. Repeat or finish

**Control Layers (Epic #26):**

**PID Control Layer:**

- Adjusts agent autonomy based on progress
- Prevents oscillation and runaway behavior
- Gain profiles optimize for different scenarios:
  - `conservative`: Slow, cautious (Kp=0.3, Ki=0.05, Kd=0.1)
  - `standard`: Balanced (Kp=0.5, Ki=0.1, Kd=0.2) - default
  - `aggressive`: Fast, high autonomy (Kp=0.8, Ki=0.2, Kd=0.3)
  - `recovery`: Designed for error recovery (Kp=0.4, Ki=0.15, Kd=0.25)
  - `cautious`: Extra validation (Kp=0.2, Ki=0.03, Kd=0.05)

**Semantic Memory:**

- Remembers learnings across loop runs
- Queries similar past situations
- Prevents repeating mistakes
- Shares insights between tasks

**Oversight Layer:**

- Validates actions before execution
- Flags risky operations
- Requires confirmation for critical changes
- Intervention modes:
  - `permissive`: Minimal intervention, trust agent
  - `balanced`: Standard safety checks - default
  - `strict`: Maximum oversight, confirm everything

**Crash recovery:** State saved in `.aiwg/ralph/current-loop.json`

---

### ralph-status

Show agent loop status.

```bash
aiwg ralph-status
```

**Capabilities:** cli, ralph, status
**Platforms:** All
**Tools:** Read

**Shows:**

- Current loop active/inactive
- Task description
- Iterations completed
- Success criteria
- Last state
- Completion percentage estimate
- **Epic #26 status:**
  - PID control state (current gains, control signal, error metrics)
  - Memory layer stats (entries retrieved, last query, similarity scores)
  - Oversight status (active interventions, warnings issued, health score)

**Example output:**

```
Agent Loop Status: Active

Task: Fix all failing tests
Iterations: 3/10
Success Criteria: npm test passes

Last Action: Fixed auth service test
State: In progress
Progress: ~40%

=== Epic #26 Control Layers ===

PID Control:
  Gain Profile: standard
  Current Gains: Kp=0.5, Ki=0.1, Kd=0.2
  Control Signal: 0.42 (moderate autonomy)
  Error: -0.15 (slightly below target progress)
  Integral: 0.08
  Derivative: -0.03

Semantic Memory:
  Total Entries: 127
  Last Retrieval: 2 similar situations found
  Top Match: "auth-test-fix-2024-01" (similarity: 0.87)
  Applied Learnings: 3

Oversight:
  Intervention Mode: balanced
  Active Interventions: 1 (validation flag on file deletion)
  Warnings Issued: 0
  Health Score: 0.92 (healthy)

Next: Resume with '/ralph-resume'
```

---

### ralph-abort

Abort running agent loop.

```bash
aiwg ralph-abort
```

**Capabilities:** cli, ralph, control
**Platforms:** All
**Tools:** Read, Write

**Actions:**

- Stops current loop
- Saves final state (including Epic #26 control state)
- Archives loop history
- Cleans up temporary files
- Preserves semantic memory learnings

---

### ralph-resume

Resume paused agent loop.

```bash
aiwg ralph-resume
```

**Capabilities:** cli, ralph, control
**Platforms:** All
**Tools:** Read, Write

**Actions:**

- Loads last saved state (including Epic #26 control layers)
- Restores PID controller state
- Reloads semantic memory context
- Continues from last iteration
- Applies same completion criteria
- Respects remaining iteration budget

---

### ralph-attach

Attach to a running agent loop's live output stream.

```bash
aiwg ralph-attach
```

**Capabilities:** cli, ralph, control, monitoring
**Platforms:** All
**Tools:** Read

**Actions:**

- Attaches to a running external agent loop
- Streams live output (press Ctrl+C to detach)
- Shows current iteration progress in real time
- Does not affect the running loop

---

### agent-loop-ext

Start external agent loop with full crash recovery. (Legacy alias: `ralph-external`)

```bash
aiwg agent-loop-ext "<task-description>"
```

**Arguments:**

- `<task-description>` - Natural language task description

**Options:**

All options from `ralph` command plus:

**External-Specific Options:**

- `--checkpoint-interval <n>` - Checkpoint every N iterations (default: 1)
- `--crash-recovery` - Enable crash recovery (default: true)
- `--state-file <path>` - Custom state file location (default: `.aiwg/ralph-external/state.json`)

**Epic #26 Control Options:**

- Same as `ralph` command

**Capabilities:** cli, ralph, orchestration, external
**Platforms:** All
**Tools:** Read, Write, Bash

**Examples:**

```bash
# External loop with crash recovery
aiwg ralph-external "Refactor payment module" \
  --completion "tests pass" \
  --checkpoint-interval 2

# Critical task with strict controls
aiwg ralph-external "Migrate database schema" \
  --completion "migration complete" \
  --gain-profile conservative \
  --validation-level strict \
  --intervention-mode strict \
  --checkpoint-interval 1
```

**Difference from `ralph`:**

- Designed for longer-running tasks
- Full state persistence to disk
- Automatic checkpoint creation
- Recoverable across process restarts
- Ideal for CI/CD integration

---

### ralph-memory

Manage semantic memory (Epic #26).

```bash
aiwg ralph-memory <subcommand>
```

**Subcommands:**

#### ralph-memory list

List all semantic memory learnings.

```bash
aiwg ralph-memory list
```

**Options:**

- `--limit <n>` - Limit results (default: 20)
- `--sort <field>` - Sort by: `date`, `similarity`, `usage_count` (default: `date`)

**Example output:**

```
Semantic Memory Learnings (127 total)

1. auth-test-fix-2024-01 (2024-01-15)
   Situation: Fixing authentication test failures
   Learning: Check token expiration config first
   Used: 5 times

2. sql-injection-fix-2024-02 (2024-01-20)
   Situation: SQL injection vulnerability
   Learning: Use parameterized queries, not string concat
   Used: 3 times

...
```

#### ralph-memory query

Query semantic memory for similar situations.

```bash
aiwg ralph-memory query "<pattern>"
```

**Arguments:**

- `<pattern>` - Query text or pattern

**Options:**

- `--threshold <n>` - Similarity threshold 0-1 (default: 0.7)
- `--limit <n>` - Max results (default: 10)

**Example:**

```bash
aiwg ralph-memory query "authentication failing"
```

#### ralph-memory prune

Clean old or unused memory entries.

```bash
aiwg ralph-memory prune [--older-than <days>]
```

**Options:**

- `--older-than <days>` - Remove entries older than N days (default: 90)
- `--unused` - Remove entries never referenced
- `--dry-run` - Preview without deleting

#### ralph-memory export

Export memory to JSON.

```bash
aiwg ralph-memory export <file>
```

**Arguments:**

- `<file>` - Output file path

**Example:**

```bash
aiwg ralph-memory export memory-backup.json
```

#### ralph-memory import

Import memory from JSON.

```bash
aiwg ralph-memory import <file>
```

**Arguments:**

- `<file>` - Input file path

**Options:**

- `--merge` - Merge with existing (default: replace)

**Capabilities:** cli, ralph, memory
**Platforms:** All
**Tools:** Read, Write

---

### ralph-config

View and configure Epic #26 control layers.

```bash
aiwg ralph-config <subcommand>
```

**Subcommands:**

#### ralph-config show

Show current Al configuration.

```bash
aiwg ralph-config show
```

**Example output:**

```
Al Configuration

PID Control:
  Enabled: true
  Gain Profile: standard
  Gains: Kp=0.5, Ki=0.1, Kd=0.2

Semantic Memory:
  Enabled: true
  Database: .aiwg/ralph/memory.db
  Entry Count: 127

Oversight:
  Enabled: true
  Intervention Mode: balanced
  Validation Level: standard

Checkpoints:
  Enabled: true
  Interval: 1 iteration
  Location: .aiwg/ralph/
```

#### ralph-config set

Set configuration value.

```bash
aiwg ralph-config set <key> <value>
```

**Arguments:**

- `<key>` - Configuration key (dot-notation)
- `<value>` - New value

**Examples:**

```bash
# Change gain profile
aiwg ralph-config set pid.gain_profile aggressive

# Disable overseer
aiwg ralph-config set oversight.enabled false

# Change validation level
aiwg ralph-config set oversight.validation_level strict
```

#### ralph-config reset

Reset to default configuration.

```bash
aiwg ralph-config reset
```

**Options:**

- `--confirm` - Skip confirmation prompt

#### ralph-config preset

Apply configuration preset.

```bash
aiwg ralph-config preset <name>
```

**Arguments:**

- `<name>` - Preset name: `conservative`, `balanced`, `aggressive`

**Presets:**

| Preset | Use Case | Settings |
|--------|----------|----------|
| `conservative` | Security fixes, critical systems | Cautious gains, strict validation, strict oversight |
| `balanced` | General development (default) | Standard gains, standard validation, balanced oversight |
| `aggressive` | Documentation, rapid iteration | Aggressive gains, minimal validation, permissive oversight |

**Example:**

```bash
# Set conservative preset for security work
aiwg ralph-config preset conservative
```

**Capabilities:** cli, ralph, configuration
**Platforms:** All
**Tools:** Read, Write

---

## Documentation Commands

### doc-sync

Synchronize documentation and code to eliminate drift.

```bash
aiwg doc-sync <direction> [options]
```

**Arguments:**

- `<direction>` - Sync direction: `code-to-docs`, `docs-to-code`, `full`

**Options:**

- `--interactive` - Prompt for each sync decision
- `--guidance "text"` - Human guidance for ambiguous cases
- `--scope "path"` - Limit to specific directory (default: `.`)
- `--dry-run` - Audit only, no modifications
- `--parallel N` - Max concurrent audit agents (default: 4)
- `--incremental` - Git-diff since last sync instead of full scan
- `--verbose` - Detailed per-file findings
- `--no-commit` - Skip auto-commit
- `--max-iterations N` - agent loop refinement iterations (default: 3)

**Capabilities:** cli, documentation, synchronization, audit
**Platforms:** All
**Tools:** Task, Read, Write, Bash, Glob, Grep, Edit

**Directions:**

| Direction | Description |
|-----------|-------------|
| `code-to-docs` | Code is truth, update docs to match |
| `docs-to-code` | Docs are truth, generate TODOs/fixes for code |
| `full` | Bidirectional reconciliation |

**Execution phases:**

1. Init and file inventory
2. Parallel domain audit (8 auditors)
3. Cross-reference validation
4. Drift report generation
5. Sync planning (auto-fixable / template-fixable / human-required)
6. Auto-fix application
7. agent loop refinement for complex items
8. Validation of changes
9. Record sync state and commit

**Examples:**

```bash
# Dry-run audit
aiwg doc-sync code-to-docs --dry-run

# Incremental sync after code changes
aiwg doc-sync code-to-docs --incremental --verbose

# Full bidirectional with guidance
aiwg doc-sync full --interactive --guidance "Focus on CLI reference"

# Scoped to specific directory
aiwg doc-sync code-to-docs --scope docs/extensions/
```

**Output locations:**

- Audit report: `.aiwg/reports/doc-sync-audit-{date}.md`
- Sync state: `.aiwg/.last-doc-sync`

---

## SDLC Orchestration Commands

### sdlc-accelerate

End-to-end SDLC ramp-up from idea to construction-ready.

```bash
aiwg sdlc-accelerate <description> [options]
```

**Arguments:**

- `<description>` - Project description (idea entry point)

**Options:**

- `--from-codebase <path>` - Scan existing code instead of starting from idea
- `--interactive` - Full interactive mode at every step
- `--guidance "text"` - Project-level guidance for all phases
- `--auto` - Auto-proceed on CONDITIONAL gates
- `--dry-run` - Show pipeline plan without executing
- `--skip-to <phase>` - Jump to specific phase (validates prereqs)
- `--resume` - Resume from detected current phase

**Capabilities:** cli, sdlc, orchestration, pipeline, accelerate
**Platforms:** All
**Tools:** Task, Read, Write, Glob, TodoWrite

**Pipeline phases:**

```
INTAKE → GATE_LOM → ELABORATION → GATE_ABM → CONSTRUCTION_PREP → BRIEF
```

| Phase | Description | Delegates To |
|-------|-------------|-------------|
| Intake | Project intake and inception | `/intake-wizard` or `/intake-from-codebase` |
| LOM Gate | Lifecycle Objective Milestone | `/flow-gate-check inception` |
| Elaboration | Architecture and requirements | `/flow-inception-to-elaboration` |
| ABM Gate | Architecture Baseline Milestone | `/flow-gate-check elaboration` |
| Construction Prep | Iteration planning | `/flow-elaboration-to-construction` |
| Brief | Construction Ready Brief | Template generation |

**Entry point detection:**

| Condition | Entry |
|-----------|-------|
| No `.aiwg/` + description | `intake-wizard` |
| No `.aiwg/` + `--from-codebase` | `intake-from-codebase` |
| `.aiwg/` exists + `--resume` | Detect and resume |
| `--skip-to` | Jump with prereq validation |

**Examples:**

```bash
# New project from idea
aiwg sdlc-accelerate "Customer portal with real-time chat"

# From existing codebase
aiwg sdlc-accelerate --from-codebase ./src "E-commerce platform"

# Resume interrupted pipeline
aiwg sdlc-accelerate --resume

# Preview pipeline plan
aiwg sdlc-accelerate --dry-run "Mobile banking app"

# Skip to elaboration
aiwg sdlc-accelerate --skip-to elaboration

# Auto-approve everything
aiwg sdlc-accelerate --auto "Quick prototype"
```

**State tracking:** `.aiwg/reports/accelerate-state.json`
**Output:** `.aiwg/reports/construction-ready-brief.md`

---

### best-practices-audit

Research-grounded validation of a target (file, directory, or freeform topic)
against current external best practices, vendor documentation, and
practitioner discussion.

```bash
aiwg best-practices-audit <target> [options]
```

**Arguments:**

- `<target>` - Path or freeform topic to audit

**Options:**

- `--focus <area>` - Focus area (security, performance, accessibility, licensing, ...)
- `--framework <name>` - Bias toward a named stack (React, Kubernetes, ...)
- `--standard <name>` - Align to a standard (OWASP, SOC2, WCAG 2.2, ...)
- `--recency <window>` - Source recency window (default `18m`)
- `--depth quick|standard|deep` - Research effort budget (default `standard`)
- `--sources <list>` - Restrict to source classes (vendor-docs, standards-bodies, ...)
- `--exclude <list>` - Exclude domain classes (e.g., SEO-spam)
- `--cite-threshold <N>` - Minimum distinct sources before reporting a finding (default `2`)
- `--dissent` - Surface practitioner disagreement, not just consensus
- `--validate` - Re-validate existing claims in the target instead of fresh audit
- `--output <path>` - Output path (default `.aiwg/reports/best-practices-audit-<slug>-<date>.md`)
- `--provider <name>` - Agent system to use (default `claude`)
- `--dangerous` - Enable provider's unrestricted mode
- `--params "<args>"` - Pass arbitrary args verbatim to the agent binary

**Capabilities:** cli, research, validation, audit, citations
**Tools:** Read, Write, Glob, Grep, Bash, WebFetch, WebSearch

**Examples:**

```bash
aiwg best-practices-audit ".aiwg/architecture/SAD.md" --focus security --standard OWASP
aiwg best-practices-audit "src/auth/" --focus security --depth deep --dissent
aiwg best-practices-audit "FastAPI request validation patterns" --recency 6m
aiwg best-practices-audit ".aiwg/architecture/" --validate
```

---

## Planning Skills

### issue-planner

Transform a high-level objective into a fully researched, SDLC-gated issue backlog — ready for `address-issues` — without manually researching, writing docs, or deciding priority order.

```bash
/issue-planner "<objective>" [options]
```

**Arguments:**

- `<objective>` — Feature, capability, integration, or initiative to plan. One-liner or multi-paragraph brief.

**Options:**

- `--interactive` — Ask discovery questions before researching (scope constraints, excluded technologies, target phase, priority bias)
- `--dry-run` — Generate full plan and issue list but do not file anything. Outputs a preview table.
- `--guidance "text"` — Upfront direction shaping research focus, prioritization, and scope without interactive prompts
- `--provider gitea|github|local` — Override default issue tracker
- `--skip-research` — Skip parallel research pass, go straight to SDLC doc generation
- `--phase inception|elaboration|construction|transition` — Target SDLC phase for artifact templates
- `--induct-research <target>` — After research synthesis, extract discovered references and file tracking tasks to induct into a research repository

**Capabilities:** planning, research, sdlc, issues, orchestration
**Platforms:** All
**Tools:** Read, Write, Glob, Grep, Bash, Agent, mcp__gitea__issue_write, WebSearch, WebFetch

**Phases:**

| Phase | What Happens |
|-------|-------------|
| 1. Parallel Research | Three agents in parallel: best practices, prior art, vendor docs |
| 2. Synthesis | Consolidated brief written to `.aiwg/working/issue-planner/` |
| 3. SDLC Doc Corpus | Phase-appropriate artifacts generated using sdlc-complete templates |
| 4. Issue Generation | Issues with type, priority (P0–P3), phase, and dependency mapping |
| 5. Human Approval | Full plan table presented — no filing until user approves |
| 6. Filing + Handoff | Issues filed in wave order; `address-issues` invocation output |

**Issue labels generated:**

| Label | Meaning |
|-------|---------|
| `feat`, `docs`, `test`, `infra`, `spike`, `security` | Type |
| `P0`–`P3` | Priority (P0 = gate blockers and security) |
| `elaboration`, `construction`, etc. | Target SDLC phase |

**Examples:**

```bash
# Basic planning run
/issue-planner "Add OAuth2 SSO support"

# Preview without filing
/issue-planner "Refactor auth module" --dry-run

# With guidance — skip Inception artifacts
/issue-planner "Add pagination to list endpoints" \
  --guidance "We're in Construction phase, skip Inception artifacts"

# Interactive with research induction
/issue-planner "Integrate OpenTelemetry" --interactive \
  --induct-research roctinam/research-inbox

# Skip research if already done externally
/issue-planner "Implement rate limiting" --skip-research \
  --phase elaboration
```

**Output:**

```
.aiwg/working/issue-planner/
├── research-brief.md          # Synthesized research findings
├── sdlc-artifacts/            # Generated use cases, risk register, etc.
├── issue-plan.md              # Full issue plan table (approval gate)
└── wave-manifest.json         # Dependency wave ordering
```

**Trigger patterns** (natural language):

- "plan out `<feature>`" → full research + issue filing workflow
- "file issues for `<objective>`" → issue-planner with dry-run preview first
- "create a backlog for `<objective>`" → issue-planner with priority ordering
- "research and plan `<topic>`" → parallel research pass then issue filing
- "using the AIWG research team in parallel... `<objective>`" → canonical trigger

**Skill location:** `agentic/code/frameworks/sdlc-complete/skills/issue-planner/SKILL.md`

---

## Discovery

Top-level capability search across AIWG skills, agents, commands, and rules. **Reach for `aiwg discover` early and often** — it is the first-class operator surface for finding the right AIWG capability for a need, and the kernel skill set deliberately deploys only a small directory of quickrefs to your platform's flat skill listing. Everything else lives at `<provider-dir>/.aiwg/skills/` and is reachable only through this command.

### discover

Find AIWG skills, agents, commands, and rules by capability — index-driven on-demand discovery (#1212).

```bash
aiwg discover "<phrase>" [options]
```

**Options:**

- `--limit <N>` — Max ranked results (default: 10)
- `--type <kinds>` — Comma-separated filter; defaults to `skill,agent,command,rule`. Examples: `--type skill`, `--type skill,agent`
- `--json` — Emit a stable JSON schema (`path`, `type`, `title`, `score`, `triggers`, `capability`, `kernel`) for programmatic agent consumption
- `--graph <name>` — Override the default graph. Defaults to `framework` (the AIWG capability graph), which is rebuilt automatically after every `aiwg use`.

**Examples:**

```bash
aiwg discover "create intake"                       # ranks intake-* skills + intake-coordinator agent
aiwg discover "deploy production" --limit 3         # flow-deploy-to-production tops at score 0.51
aiwg discover "audit security" --type skill         # narrow to skills only
aiwg discover "review code" --type agent --json     # JSON for sub-agent consumption
```

**Output (default):**

Token-tight format optimized for in-context agent consumption — names the path, type, score, the top trigger phrase that earned the match, and the capability description.

```
Discovery results for "deploy production" (3 matches, 16ms):

    score=0.51  skill   .../sdlc-complete/skills/flow-deploy-to-production/SKILL.md
                Orchestrate production deployment with strategy selection, validation,
                automated rollback, and regression gates
    score=0.36  skill   .../aiwg-utils/skills/customize-rebuild/SKILL.md
                Rebuild and redeploy AIWG from local customization source
                trigger: "apply my changes"
    score=0.26  agent   .../media-marketing-kit/agents/production-coordinator.md
                Manages creative production workflows, coordinates timelines

★ = kernel skill (always-loaded). Others are reachable via the index.
```

**How scoring works:**

| Field matched | Weight | Notes |
|---|---|---|
| Trigger phrase, exact match | 4× | The strongest signal — hits a skill's declared `## Triggers` line |
| Trigger phrase, substring | 4× × 0.6 | Partial trigger overlap |
| Capability description | 2× | Frontmatter `description` (or first body paragraph fallback) |
| Title | 3× | Boost for exact title match |
| Tags | 2× | Per-tag |
| Summary | 1× | Body summary |
| Path | 0.5× | Filename / path substring |

Multi-token queries require ≥50% token overlap to surface partial matches — gibberish queries return zero results rather than incidental hits.

### show

Print the full text of a specific AIWG skill, agent, command, or rule by name (#1218). The companion to `discover`: where discover ranks candidates, show fetches the body so consumers don't navigate AIWG's storage paths themselves.

```bash
aiwg show <type> <name> [options]
aiwg index show <type> <name> [options]      # equivalent
```

**Type** is positional and required. Allowed values: `skill`, `agent`, `command`, `rule`.

**Options:**

- `--json` — Emit `{ path, type, title, kernel, content }` envelope. Default mode streams the file unmodified.
- `--first` — On ambiguity, pick the top match instead of erroring with the disambiguation list.
- `--graph <name>` — Override the default graph (defaults to `framework` then `project`).

**Lookup order:**

1. Exact path match against any indexed entry's stored path
2. Basename match (skill directory name like `intake-wizard`, or filename stem for agents)
3. Title match (case-insensitive)

**Examples:**

```bash
aiwg show skill intake-wizard                       # streams SKILL.md to stdout
aiwg show skill flow-deploy-to-production --json    # path + content envelope
aiwg show agent aiwg-steward                        # agent definition
aiwg show command discover                          # CLI command spec
aiwg show rule no-attribution                       # rule body
```

**Errors:**

- Calling `aiwg show <name>` with the type omitted prints a "did you mean: aiwg show skill <name>?" hint and exits 1.
- Ambiguous matches list all candidates and exit 2 unless `--first` is supplied.

**Why a separate command:** the kernel pivot (#1212) intentionally hides ~385 skills from the platform's flat scan; the no-copy default (#1217) leaves them at `$AIWG_ROOT` rather than mirroring per-project. `aiwg show` makes them trivially reachable without the consumer needing to know the storage layout. Pair with `aiwg discover` for find → fetch.

### Best-practice usage guidance

Discovery is the operator surface that makes the **kernel + on-demand model** work across all 10 supported providers (Claude Code, Cursor, Factory, Copilot, OpenCode, Warp, Windsurf, OpenClaw, Hermes, Codex). Each provider deploys a small kernel set of always-loaded quickref skills; everything else sits at `<provider-dir>/.aiwg/skills/` and is reached via `aiwg discover`.

**Lead with discovery, not with memory.** When a user describes a capability, query first:

```bash
aiwg discover "<the user's need, paraphrased>" --limit 3
```

Then surface the top match (or top-3 candidates) — this makes your reasoning auditable and gives the user a chance to redirect.

**Use type filters to tighten results.** When the user wants a workflow, restrict to `--type skill`. When they want to know who handles something, `--type agent`. When they ask about enforcement, `--type rule`.

**Use `--json` from sub-agents.** The JSON schema (`path / type / title / score / triggers / capability / kernel`) is stable and compact enough to forward to a subagent without context-bloat.

**Don't skip discovery before declining or improvising.** The `skill-discovery` HIGH framing rule mandates `aiwg discover` before saying "AIWG can't do that" or writing a custom workflow from scratch. Most AIWG skills (~385 of 400 today) are NOT in your loaded context — the kernel set is just the orientation layer + self-maintenance ops.

**Read skill bodies via `aiwg show`, not via filesystem paths.** When discovery returns a candidate and you need its full body, call `aiwg show skill <name>`. Don't construct paths or `cat` files directly — the CLI is the access point and works the same regardless of where AIWG is installed.

**Skip discovery only when:**
- The user named a specific skill or command (e.g., `/flow-deploy-to-production`)
- The capability is clearly outside AIWG's scope
- You ran the same query in this session and the result is in working memory
- A kernel quickref directly lists the skill — you've already done the lookup

**The framework graph stays fresh automatically.** `aiwg use` rebuilds the framework artifact index post-deploy (best-effort), so `aiwg discover` queries always reflect the current installed surface. You don't need to invoke `aiwg index build --graph framework` manually unless you've edited skill source between deploys.

**Backward compatibility:** `aiwg index discover` still works (same dispatch). The top-level `aiwg discover` is the canonical surface; the index-namespaced form is preserved so older skill bodies and external references don't break.

---

## Index Commands

Commands for building and querying the artifact index. The index provides structured, pre-computed metadata about project artifacts, enabling agents and developers to navigate artifacts without manual file searching.

> **Looking for `aiwg discover`?** It moved to a top-level command (see [Discovery](#discovery) above). The legacy `aiwg index discover` form still works.

The index uses a **multi-graph architecture** with three built-in graph types plus user-defined graphs:

| Graph | Scans | Storage | Built by default |
|-------|-------|---------|-----------------|
| `project` | `.aiwg/` artifacts | `.aiwg/.index/project/` | Yes |
| `codebase` | `src/`, `test/`, `tools/` | `.aiwg/.index/codebase/` | Yes (skipped if dirs absent) |
| `framework` | `agentic/code/`, `docs/` | `.aiwg/.index/framework/` | No (use `--graph framework`) |
| *(user-defined)* | configured in `.aiwg/config.yaml` | `.aiwg/.index/<name>/` | Configurable |

**`defaultBuild` behavior**: When you run `aiwg index build` with no `--graph` flag, every graph with `defaultBuild: true` is built. If a defaultBuild graph's scan directories do not exist (e.g. `codebase` in a docs-only repo), it is skipped with a warning rather than erroring. To require a graph's directories to exist, request it explicitly: `aiwg index build --graph codebase`.

All commands without `--graph` operate across all available project-local graphs (`project` + `codebase`). Use `--graph <name>` to target a specific graph, including user-defined ones.

### index

Artifact index commands (build, query, deps, stats).

```bash
aiwg index <subcommand> [options]
```

**Subcommands:**

- `build` - Build/rebuild the artifact index
- `query` - Search artifacts by keyword, type, phase, tags
- `discover` - Capability search across AIWG skills/agents/commands/rules (canonical form is the top-level [`aiwg discover`](#discover); this subcommand is preserved for backward compatibility)
- `show` - Print the full text of a specific skill/agent/command/rule (canonical form is the top-level [`aiwg show`](#show))
- `deps` - Show artifact dependency graph
- `stats` - Show index statistics
- `neighbors` - Get neighbors of a node in a graph
- `set` - Set operations (intersection, union, difference) on neighbor sets
- `watch` - Filesystem watcher for automatic incremental updates

**Global option (all subcommands):**

- `--graph <name>` - Target a specific graph: built-in (`project`, `codebase`, `framework`) or user-defined

**Capabilities:** cli, index, artifacts, search, dependencies
**Platforms:** All
**Tools:** Read, Glob, Grep

---

### index build

Build or rebuild the artifact index.

```bash
aiwg index build [options]
```

**Options:**

- `--force` - Full rebuild (ignore checksums, re-index everything)
- `--verbose` - Show detailed progress during indexing
- `--all` - Build all known graphs (built-in + user-defined)
- `--scope <dir>` - Limit scan to a specific subdirectory (relative to project root)
- `--graph <name>` - Build a single graph only — built-in (`project`, `codebase`, `framework`) or user-defined

**Default behavior** (no `--graph`): Builds all graphs with `defaultBuild: true`. Built-in defaults: `project` (always) and `codebase` (skipped with a warning if `src/`, `test/`, `tools/` are absent). The `framework` graph covers AIWG framework source (`agentic/code/`, `docs/`) and must be built explicitly with `--graph framework`.

**Incremental mode** (default): Only re-indexes files whose checksum has changed. Use `--force` for a full rebuild.

**User-defined graphs**: Define custom index graphs in `.aiwg/config.yaml` under `index.graphs`. Each graph gets its own named index under `.aiwg/.index/<name>/`.

```yaml
# .aiwg/config.yaml
index:
  graphs:
    references:
      scanDirs:
        - documentation/references
      extensions:
        - .md
      defaultBuild: false   # only built when explicitly requested via --graph references
```

Fields:

- `scanDirs` (required) — directories to scan, relative to project root
- `extensions` — file extensions to index (default: `.md`, `.yaml`, `.json`)
- `defaultBuild` — whether to include in `aiwg index build` with no `--graph` (default: `true`)
- `shared` — whether the graph is shared across projects (default: `false`)

User-defined graph names cannot override built-in names (`project`, `codebase`, `framework`).

**Advanced graph config fields:**

| Field | Type | Description |
|-------|------|-------------|
| `scanDirs` | string[] | Directories to scan (required) |
| `extensions` | string[] | File extensions (default: `.md`, `.yaml`, `.json`) |
| `defaultBuild` | boolean | Include in default `aiwg index build` (default: `true`) |
| `shared` | boolean | Shared across projects (default: `false`) |
| `graphBackend` | `json` \| `graphology` \| `sqlite` | Graph storage backend (default: `json`) |
| `nodeStrategy` | `default` \| `filename-metadata` | How node metadata is derived (default: `default`) |
| `filenamePattern` | string | Regex with named groups for `filename-metadata` strategy |
| `edgeExtraction.parser` | string | Parser for edge extraction (e.g., `citation-sidecar`) |
| `edgeExtraction.edges` | array | Edge type declarations for the parser |

**Graph backends**: The default `json` backend requires no extra packages. For larger corpora or richer traversal, install an optional backend:

```bash
# Graphology — community detection, shortest path, <50k nodes
npm install graphology graphology-operators graphology-traversal

# SQLite — persistent, incremental, SQL set ops, 5k–500k nodes
npm install better-sqlite3
```

Activate per-graph in `.aiwg/config.yaml`:

```yaml
index:
  graphs:
    citation-network:
      graphBackend: sqlite
    summaries:
      graphBackend: graphology
```

**Semantic embedding index**: Orthogonal to graph backends — adds dense vector search to any tier:

```bash
npm install @xenova/transformers hnswlib-node
```

```yaml
index:
  embedding:
    enabled: true
    model: Xenova/all-MiniLM-L6-v2   # ~22MB, cached to ~/.cache/aiwg/models/
    topK: 10
```

See [Graph Backends](extensions/graph-backends.md) for full backend documentation.

**Documentation-only repos**: If your repo has no `src/`, `test/`, or `tools/` directories, `aiwg index build` will skip the `codebase` graph with a warning and still build the `project` graph. To index documentation under a custom path, define a user-defined graph:

```yaml
# .aiwg/config.yaml
index:
  graphs:
    docs:
      scanDirs:
        - documentation
        - guides
      extensions:
        - .md
      defaultBuild: true
```

Then `aiwg index build` will automatically include your `docs` graph.

**Examples:**

```bash
# Build project + codebase (default; codebase skipped if src/test/tools absent)
aiwg index build

# Full rebuild
aiwg index build --force

# Verbose output
aiwg index build --verbose

# Build framework graph (agentic/code/ + docs/)
aiwg index build --graph framework

# Build a single built-in graph
aiwg index build --graph project

# Build a user-defined graph
aiwg index build --graph references

# Build all graphs including user-defined
aiwg index build --all

# Scope to a specific subdirectory
aiwg index build --scope documentation/references
```

**Output structure:**

```
.aiwg/.index/
├── project/          # .aiwg/ artifacts
│   ├── metadata.json
│   ├── tags.json
│   ├── dependencies.json
│   └── stats.json
└── codebase/         # src/, test/, tools/
    ├── metadata.json
    ├── tags.json
    ├── dependencies.json
    └── stats.json
```

---

### index query

Search artifacts by keyword, type, phase, tags, or path pattern.

```bash
aiwg index query [search-text] [options]
```

**Arguments:**

- `[search-text]` - Optional keyword search (weighted: title 3x, tags 2x, summary 1x, path 0.5x)

**Options:**

- `--type <type>` - Filter by artifact type (e.g., `use-case`, `adr`, `test-plan`)
- `--phase <phase>` - Filter by SDLC phase (e.g., `requirements`, `architecture`, `testing`)
- `--tags <tag1,tag2>` - Filter by tags (AND logic — all tags must match)
- `--path <glob>` - Filter by file path glob pattern
- `--updated-after <date>` - Filter by last-modified date
- `--limit <n>` - Maximum number of results (default: 20)
- `--graph <type>` - Search a specific graph only
- `--semantic` - Use semantic similarity search (requires embedding index)
- `--set-query <expr>` - Set-theoretic query, e.g. `"cited_by(REF-008) AND cited_by(REF-016)"` (SQLite backend recommended)
- `--json` - Output as JSON (recommended for agents)

**Default behavior** (no `--graph`): Searches across `project` + `codebase` graphs combined.

**Examples:**

```bash
# Search all project-local graphs
aiwg index query "authentication"

# Search framework source only
aiwg index query "artifact discovery" --graph framework

# Filter by type
aiwg index query --type use-case

# Combined filters
aiwg index query "login" --type use-case --phase requirements

# Semantic similarity search (embedding index required)
aiwg index query "dense retrieval for question answering" --semantic --graph citation-network

# Set-theoretic: papers citing both REF-008 and REF-016
aiwg index query --set-query "cited_by(REF-008) AND cited_by(REF-016)" --graph citation-network

# JSON output for agents
aiwg index query "auth" --json
```

---

### index neighbors

Show graph neighbors of a node — direct dependencies, typed edges, or semantic similarity matches.

```bash
aiwg index neighbors --node <id> [options]
```

**Options:**

- `--node <id>` - Node identifier (e.g., `REF-008`, `.aiwg/requirements/UC-001.md`)
- `--direction <dir>` - `in`, `out`, or `both` (default: `both`)
- `--edge-type <type>` - Filter by edge type (e.g., `cites`, `cited-by`, `implements`, `depends-on`)
- `--depth <n>` - Traversal depth (default: 1)
- `--semantic` - Return semantically similar nodes instead of graph neighbors (embedding index required)
- `--top-k <n>` - Number of semantic results (default: 10, only with `--semantic`)
- `--graph <name>` - Target a specific graph
- `--json` - Output as JSON

**Examples:**

```bash
# All neighbors of a node
aiwg index neighbors --node REF-008

# Papers that cite REF-008 (incoming cites edges)
aiwg index neighbors --node REF-008 --direction in --edge-type cites

# What REF-008 cites (outgoing)
aiwg index neighbors --node REF-008 --direction out --edge-type cites

# Citation neighborhood at depth 2
aiwg index neighbors --node REF-008 --depth 2 --graph citation-network

# 5 semantically similar papers
aiwg index neighbors --node REF-008 --semantic --top-k 5

# Artifacts that implement a use case (SDLC)
aiwg index neighbors --node .aiwg/requirements/UC-001.md --edge-type implements
```

**Typed edge types:**

| Domain | Edge types |
|--------|-----------|
| Research / citation | `cites`, `cited-by`, `summarizes`, `discusses` |
| SDLC | `depends-on` (default), `implements`, `tests`, `supersedes` |

---

### index deps

Show artifact dependency graph based on @-mention references.

```bash
aiwg index deps <path> [options]
```

**Arguments:**

- `<path>` - Path to the artifact (e.g., `.aiwg/requirements/UC-001.md`)

**Options:**

- `--direction <dir>` - Direction: `upstream`, `downstream`, or `both` (default: `both`)
- `--depth <n>` - Maximum traversal depth (default: 3)
- `--graph <type>` - Use a specific graph's dependency data
- `--json` - Output as JSON (recommended for agents)

**Behavior:**

- `upstream` - What this artifact depends on (its @-mentions)
- `downstream` - What depends on this artifact (mentions it)
- `both` - Both directions

**Default behavior** (no `--graph`): Merges dependency data from `project` + `codebase` graphs.

**Examples:**

```bash
# Show all dependencies
aiwg index deps .aiwg/requirements/UC-001.md

# Downstream only (what would break if I change this?)
aiwg index deps .aiwg/requirements/UC-001.md --direction downstream

# JSON output with limited depth
aiwg index deps .aiwg/architecture/adr-001.md --depth 2 --json

# Deps within framework source
aiwg index deps agentic/code/frameworks/sdlc-complete/rules/artifact-discovery.md --graph framework
```

---

### index stats

Show artifact index statistics and project health metrics.

```bash
aiwg index stats [options]
```

**Options:**

- `--graph <type>` - Show stats for a specific graph only
- `--json` - Output as JSON (recommended for agents)

**Default behavior** (no `--graph`):

- Human-readable: shows each available graph with a section header
- JSON: returns an object keyed by graph name with all stats

**Reports:**

- Artifact counts by SDLC phase and type
- Tag distribution
- Dependency graph metrics (edges, orphaned artifacts)
- Index coverage (indexed vs. total files)

**Examples:**

```bash
# Show all project-local graphs
aiwg index stats

# JSON output (aggregated, keyed by graph name)
aiwg index stats --json

# Single graph
aiwg index stats --graph project --json

# Framework graph stats
aiwg index stats --graph framework
```

---

## Storage Commands

AIWG persists artifacts (memory pages, knowledge-base entries, activity log, reflections, provenance records, research corpus, sandbox identities) through a pluggable storage adapter system (#934). By default everything lives on the local filesystem under `.aiwg/`. With `.aiwg/storage.config` you can route any subsystem to Obsidian, Logseq, Fortemi, or a different filesystem location.

**See [`docs/storage/`](storage/README.md) for the full guide** — overview, security model, migration walkthrough, and per-backend pages.

### storage

Inspect and operate on the storage adapter system.

```bash
aiwg storage <subcommand>
```

**Subcommands:**

| Subcommand | Purpose |
|------------|---------|
| `show` | Print effective config + resolved physical paths per subsystem |
| `list-backends` | Inventory of compiled-in adapters with READY/STUB status |
| `test <subsystem>` | Round-trip write/read/list/delete probe through the configured backend |
| `migrate <subsystem>` | Copy entries from one backend to another (#955) |

**Examples:**

```bash
# Inspect what's configured
aiwg storage show

# Which backends are implemented vs planned
aiwg storage list-backends

# Verify connectivity for the activity_log subsystem
aiwg storage test activity_log

# Migrate AIWG memory from local fs to an Obsidian vault
aiwg storage migrate memory \
  --from fs:.aiwg/memory \
  --to obsidian:~/vaults/main \
  --to-folder AIWG/memory \
  --dry-run

# Without --dry-run when the preview looks right
aiwg storage migrate memory \
  --from fs:.aiwg/memory \
  --to obsidian:~/vaults/main \
  --to-folder AIWG/memory
```

**Implemented backends:** `fs`, `obsidian`, `logseq`, `fortemi` (alpha).
**Stub (tracked):** `notion` (#959), `anythingllm` (#960), `s3` (#962), `webdav` (#963).

**Migrate spec format:** `<type>:<location>` (e.g., `fs:./dir`, `obsidian:~/vault`, `logseq:./graph`, `fortemi:server-name`). Use `--from-folder`/`--to-folder` for Obsidian subfolders. See `docs/storage/migration.md` for details.

---

### activity-log

Query and manage `.aiwg/activity.log` — a chronological record of cross-framework operations. Routes through `resolveStorage('activity_log')`.

```bash
aiwg activity-log <subcommand>
```

**Subcommands:**

| Subcommand | Purpose |
|------------|---------|
| `show [--since YYYY-MM-DD] [--operation OP] [--limit N]` | Display entries newest-first |
| `append <operation> "<summary>"` | Append a canonical-format entry (atomic via `O_APPEND`) |
| `stats` | Operation-count breakdown + date range |
| `rotate [--keep-last <Nd\|N>] [--to <path>]` | Archive entries to a sibling file (#977) |

**Operations** (one per entry): `ingest`, `create`, `update`, `delete`, `query`, `lint`, `deploy`, `archive`, `promote`.

**Wire format:** `## [YYYY-MM-DD HH:MM] <operation> | <summary>`

**Environment:**

- `AIWG_SKIP_ACTIVITY_LOG=1` — suppress append (per the activity-log rule)

**Examples:**

```bash
# Recent activity
aiwg activity-log show --limit 10

# Filter
aiwg activity-log show --since 2026-04-01 --operation deploy

# Append (atomic — concurrent agents don't race)
aiwg activity-log append create ".aiwg/requirements/UC-007.md"

# Stats
aiwg activity-log stats

# Rotate: archive everything older than 90 days, keep recent inline
aiwg activity-log rotate --keep-last 90d
```

**Auto-append hook (#978):** A post-command hook auto-logs qualifying CLI commands (`use`, `refresh`, `remove`, `add-{agent,command,skill,template,behavior}`, `validate-metadata`, `index`, `ops`). Honors `AIWG_SKIP_ACTIVITY_LOG=1`. Failures non-fatal.

---

### memory

Storage operations on the AIWG memory subsystem. Routes through `resolveStorage('memory')`. Used by `memory-ingest` / `memory-lint` / `memory-log-append` / `memory-query-capture` skills (#966).

```bash
aiwg memory <subcommand>
```

**Subcommands:** `path` / `list` / `get` / `put` / `delete` / `append-log`.

**Examples:**

```bash
aiwg memory path                                         # resolved root (fs only)
aiwg memory list --prefix research-complete/
aiwg memory get research-complete/index.md
echo "# index" | aiwg memory put research-complete/index.md
echo '{"op":"ingest","summary":"foo"}' \
  | aiwg memory append-log research-complete/.log.jsonl
```

**`append-log` semantics:** reads a single JSON object from stdin, appends as one JSONL line. Atomic via `adapter.append` (#976) on backends that support it.

---

### reflections

Storage operations on the reflections subsystem. Routes through `resolveStorage('reflections')`. Used by `ralph-reflect` and `reflection-injection` skills (#967).

```bash
aiwg reflections <subcommand>
```

Same surface as `aiwg memory`: `path` / `list` / `get` / `put` / `delete` / `append-log`.

```bash
aiwg reflections list --prefix sessions/
aiwg reflections get sessions/2026-04-28.md
echo '{"event":"reflect"}' | aiwg reflections append-log sessions/log.jsonl
```

---

### kb

Storage operations on the knowledge-base subsystem. Routes through `resolveStorage('kb')`. Used by `kb-ingest` and `kb-health` skills (#965).

```bash
aiwg kb <subcommand>
```

**Subcommands:** `path` / `list` / `get` / `put` / `delete`.

```bash
aiwg kb path                          # resolved root
aiwg kb path entities/foo.md          # absolute path to that file
aiwg kb list --prefix entities/
aiwg kb get entities/foo.md
echo "# foo" | aiwg kb put entities/foo.md
aiwg kb delete entities/old.md
```

**Note:** kb-ingest/kb-health skills' `--kb <path>` argument now defaults to whatever `aiwg kb path` resolves — `.aiwg/kb/` on the default `fs` backend, or whatever `roots.kb` / `backends.kb` redirects to.

---

### provenance

Storage operations on the provenance subsystem (W3C PROV records). Routes through `resolveStorage('provenance')`. Used by `provenance-create` / `provenance-query` / `provenance-report` / `provenance-validate` / `auto-provenance` skills (#968).

```bash
aiwg provenance <subcommand>
```

Same surface as `aiwg memory`.

```bash
aiwg provenance list --prefix activities/
aiwg provenance get activities/2026-04-28-deploy.json
```

---

### research-store

Storage operations on the research subsystem. Routes through `resolveStorage('research')`. Used by `research-acquire`, `induct-research`, `corpus-*` skills (#968). Named `research-store` (suffixed) to disambiguate from the many existing `research-*` workflow commands.

```bash
aiwg research-store <subcommand>
```

Same surface as `aiwg memory`.

```bash
aiwg research-store path                            # resolved corpus root
aiwg research-store list --prefix sources/
aiwg research-store get sources/paper-123.md
```

**Heavy artifacts on a secondary drive:** set `roots.research` in `.aiwg/storage.config` — one of the headline #934 use cases.

---

## Ops Commands

Manage AIWG ops ecosystem workspaces (sysops, devops, itops, streamops). See `agentic/code/frameworks/ops-complete/`.

### ops

```bash
aiwg ops <subcommand>
```

**Subcommands:**

| Subcommand | Purpose |
|------------|---------|
| `init` | Bootstrap a new ops workspace |
| `status [--all]` | Show workspace health |
| `use <workspace>` | Switch active workspace |
| `list` (alias `ls`) | List registered workspaces |
| `push [--workspace <n>]` | Push workspace repos to remote |
| `discover [root...]` | Scan filesystem for orphaned ops-workspace clones (#937) |
| `adopt <path>` | Register an existing local clone as a repo entry (#936) |

**`init` flags:**

| Flag | Description |
|------|-------------|
| `--silent` | Skip interactive prompts |
| `--workspace <name>` | Workspace name (default: `default`) |
| `--home <path>` | Parent directory for repos |
| `--mode <mode>` | `single-repo` or `multi-repo` (default: `multi-repo`) |
| `--ext <list>` | Comma-separated extensions: `sys,it,dev,stream` |
| `--prefix <name>` | Repo naming prefix (e.g., `myorg`) |
| `--provider <name>` | Remote provider for auto-push (`github`, `gitea`, or URL) |
| `--from <git-url>` | Clone the URL into the target repo instead of init (#936) |

**Nesting refusal (#935):** `init` walks up from the target home looking for `OpsInventory.yaml`. If an ancestor has one, init refuses with a suggested sibling path — ops workspaces must be siblings, never nested.

**Examples:**

```bash
# Multi-repo workspace under ~/ops/personal/
aiwg ops init --workspace personal --ext sys,dev,it

# Clone an existing remote into the target instead of git init (#936)
aiwg ops init --workspace itops --ext it \
  --from https://git.integrolabs.net/me/itops.git

# Adopt an already-cloned repo (#936)
aiwg ops adopt ~/sysops --workspace home --ext sys

# Scan the filesystem for orphaned ops clones (#937)
aiwg ops discover ~                          # preview only
aiwg ops discover ~ --register --workspace home

# Standard lifecycle
aiwg ops status
aiwg ops list
aiwg ops use client-acme
aiwg ops push --workspace personal
```

**`adopt` flags:**

| Flag | Description |
|------|-------------|
| `--workspace <name>` | Workspace bucket (default: `default`) |
| `--ext <list>` | Comma-separated extensions to record on the repo entry |
| `--name <name>` | Override repo name (default: basename of path) |
| `--silent` | Suppress informational logging |

**`discover` flags:**

| Flag | Description |
|------|-------------|
| `--max-depth <n>` | Walk depth from each root (default: 3) |
| `--register` (alias `--yes`/`-y`) | Write NEW candidates to `ops.json` |
| `--workspace <name>` | Bucket workspace for registered entries (default: `discovered`) |
| `--json` | Machine-readable output |

---

## Code Analysis Commands

### cleanup-audit

Audit codebase for dead code, unused exports, orphaned files, and stale manifests.

```bash
aiwg cleanup-audit [--scope <path>] [--fix] [--verbose]
```

**Capabilities:** cli, analysis, code-quality, dead-code, cleanup
**Platforms:** All
**Tools:** Bash, Glob, Grep, Read, Write, Edit

**Actions:**

- Scans for unused exports, orphaned files, and dead code
- Detects stale manifest entries and broken references
- Reports findings with severity classification
- Optionally applies auto-fixes with `--fix`

---

## Configuration Commands

### config

Manage user-level AIWG configuration (preferences persisted across projects).

```bash
aiwg config <subcommand> [args] [--config-dir <path>]
```

**Subcommands:**

- `get <key>` - Read a configuration value
- `set <key> <value>` - Write a configuration value
- `list` - List all configuration keys and values
- `validate` - Check the config file against the schema
- `reset` - Restore defaults
- `path` - Print the resolved config file path
- `edit` - Open the config in `$EDITOR`

**Options:**

- `--config-dir <path>` - Override the config directory

**Capabilities:** cli, configuration, user-config, preferences
**Tools:** Read, Write, Bash

Resolution order: `$AIWG_CONFIG` env var → `--config-dir` flag → `~/.aiwg/` → `~/.config/aiwg/`.

---

## Agentic Tools (RLM)

Recursive Language Model utilities for processing content larger than a
single context window — chunk, fan out queries, and synthesize results.

### chunk

Split a file into overlapping chunks suitable for parallel fanout processing.

```bash
aiwg chunk <file> [--size N] [--overlap N] [--format json|text] [--output <dir>]
```

**Arguments:**

- `<file>` - Source file to split

**Options:**

- `--size N` - Target chunk size
- `--overlap N` - Overlap between adjacent chunks
- `--format json|text` - Output format
- `--output <dir>` - Destination directory for chunks and manifest

**Capabilities:** rlm, chunking, agentic-tools, context-decomposition
**Tools:** Read, Write, Bash

Writes chunk files plus a JSON manifest describing chunk locations and metadata.

---

### fanout

Dispatch the same query to multiple subagents in parallel across a chunk manifest.

```bash
aiwg fanout <query> --chunks <dir|manifest.json> [--parallel N] [--model haiku|sonnet|opus]
```

**Arguments:**

- `<query>` - Query to dispatch to each chunk

**Options:**

- `--chunks <dir|manifest.json>` - Chunk directory or manifest produced by `aiwg chunk` / `aiwg rlm-prep`
- `--parallel N` - Maximum concurrent subagents
- `--model haiku|sonnet|opus` - Model tier per subagent

**Capabilities:** rlm, fanout, agentic-tools, parallel-search
**Tools:** Read, Bash, Glob, Grep

---

### rlm-prep

Prepare source content for RLM processing — chunk, index, and write a manifest.

```bash
aiwg rlm-prep <file|dir> [--output <dir>]
                         [--strategy semantic-boundary|fixed-count|adaptive]
                         [--size N]
```

**Arguments:**

- `<file|dir>` - Source file or directory

**Options:**

- `--output <dir>` - Destination for chunks + manifest
- `--strategy <name>` - Chunking strategy (default `semantic-boundary`)
- `--size N` - Chunk size hint

**Capabilities:** rlm, prep, agentic-tools, indexing
**Tools:** Read, Write, Glob, Bash

---

### rlm-search

Full recursive search pipeline: prep, fanout, recurse, synthesize.

```bash
aiwg rlm-search <query> --source <file|dir>
                        [--depth N] [--parallel N] [--budget N]
```

**Arguments:**

- `<query>` - Search query

**Options:**

- `--source <file|dir>` - Source content to search
- `--depth N` - Maximum recursion depth
- `--parallel N` - Subagent concurrency cap
- `--budget N` - Token or cost budget ceiling

**Capabilities:** rlm, search, agentic-tools, recursive, synthesis
**Tools:** Read, Write, Glob, Grep, Bash

Runs `rlm-prep` if needed, fans out across all chunks, recurses if results
exceed context, and produces a synthesized answer with provenance and cost
summary.

---

### rlm-status

Show active RLM task tree, progress per node, and cost breakdown.

```bash
aiwg rlm-status [--cost] [--tree] [--json] [--task-id <id>]
```

**Options:**

- `--cost` - Include cost breakdown
- `--tree` - Render the task tree
- `--json` - Emit structured JSON
- `--task-id <id>` - Inspect a specific task

**Capabilities:** rlm, status, agentic-tools, monitoring
**Tools:** Read, Bash

State source: `.aiwg/ralph/rlm-state.json`.

---

## Addon Commands

Commands contributed by installed addons. Available after running `aiwg use <addon>`.

## Extension System

### Unified Extension Schema

All commands are registered as extensions in the unified schema. This enables:

- **Dynamic discovery**: Commands found via semantic search
- **Capability-based routing**: Match commands by what they do
- **Auto-generated help**: Help text always in sync
- **Platform awareness**: Deploy to correct platform paths

**Extension properties:**

- `id`: Unique identifier (kebab-case)
- `type`: Extension type (`command`, `agent`, `skill`, etc.)
- `name`: Human-readable name
- `description`: Brief description
- `capabilities`: What it can do
- `keywords`: Search terms
- `platforms`: Platform compatibility
- `metadata`: Type-specific data

**See also:**

- @src/extensions/types.ts - Full type definitions
- @.aiwg/architecture/unified-extension-schema.md - Schema documentation

---

## Command Categories

| Category | Count | Commands |
|----------|-------|----------|
| **Maintenance** | 5 | help, version, doctor, update, refresh (alias: `sync`, deprecated) |
| **Framework** | 3 | use, list, remove |
| **Project** | 1 | new |
| **Workspace** | 3 | status, migrate-workspace, rollback-workspace |
| **MCP** | 1 | mcp (serve, install, info, add, remove, update, list, inject, profile) |
| **Catalog** | 1 | catalog (3 subcommands) |
| **Toolsmith** | 1 | runtime-info |
| **Utility** | 3 | prefill-cards, contribute-start, validate-metadata |
| **Plugin** | 5 | install-plugin, uninstall-plugin, plugin-status, package-plugin, package-all-plugins |
| **Scaffolding** | 8 | add-agent, add-command, add-skill, add-behavior, add-template, scaffold-addon, scaffold-extension, scaffold-framework |
| **Daemon** | 2 | behavior, daemon-init |
| **Al** | 8 | ralph, ralph-status, ralph-abort, ralph-resume, ralph-attach, agent-loop-ext, ralph-memory, ralph-config |
| **Mission Control** | 1 | mc (9 subcommands) |
| **Agent Teams** | 1 | team (3 subcommands) |
| **Metrics** | 3 | cost-report, cost-history, metrics-tokens |
| **Documentation** | 1 | doc-sync |
| **SDLC Orchestration** | 1 | sdlc-accelerate |
| **Code Analysis** | 1 | cleanup-audit |
| **Index** | 1 | index (4 subcommands) |
| **Reproducibility** | 4 | execution-mode, snapshot, checkpoint, reproducibility-validate |
| **Addon: ring** | 5 | ring check, ring circuit-breaker, ring session-start, ring session-end, ring status |

**Total:** 53 built-in + addon commands (addon commands require `aiwg use <addon>`)

---

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Invalid arguments |
| 3 | Missing dependencies |
| 4 | Configuration error |
| 5 | Network error |
| 10 | Validation error |
| 20 | File system error |

---

## Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `AIWG_HOME` | AIWG installation directory | Auto-detected |
| `AIWG_CHANNEL` | Update channel (stable/main) | `stable` |
| `AIWG_LOG_LEVEL` | Logging level (debug/info/warn/error) | `info` |
| `AIWG_USE_NEW_ROUTER` | Enable experimental router | `false` |
| `AIWG_LEGACY_MODE` | Force legacy routing | `false` |

---

## Configuration File

Optional `.aiwgrc.json` in project root:

```json
{
  "defaultProvider": "claude",
  "autoUpdate": false,
  "frameworks": {
    "sdlc": {
      "agents": "all",
      "commands": ["use", "status", "help"]
    }
  },
  "teamProfile": {
    "project": "My Project",
    "team": "Platform Team",
    "defaultAuthor": "Developer Name"
  },
  "ralph": {
    "pid": {
      "enabled": true,
      "gain_profile": "standard"
    },
    "semantic_memory": {
      "enabled": true,
      "max_entries": 1000
    },
    "oversight": {
      "enabled": true,
      "intervention_mode": "balanced",
      "validation_level": "standard"
    }
  }
}
```

---

## Common Workflows

### Initial Setup

```bash
# Install globally
npm install -g aiwg

# Check installation
aiwg doctor

# Create new project
aiwg new my-project
cd my-project
```

### Deploy to Existing Project

```bash
cd existing-project

# Deploy SDLC framework
aiwg use sdlc

# Check status
aiwg status

# Verify deployment
ls .claude/agents
ls .claude/commands
```

### Multi-Platform Deployment

```bash
# Claude Code (default — auto-detected)
aiwg use sdlc

# GitHub Copilot
aiwg use sdlc --provider copilot

# Cursor
aiwg use sdlc --provider cursor

# Windsurf
aiwg use sdlc --provider windsurf

# Warp Terminal
aiwg use sdlc --provider warp

# Factory AI
aiwg use sdlc --provider factory

# OpenAI / Codex  (commands + skills deploy to ~/.codex/)
aiwg use sdlc --provider codex

# OpenCode
aiwg use sdlc --provider opencode

# Hermes (MCP sidecar — skills + lean AGENTS.md)
aiwg use sdlc --provider hermes

# OpenClaw (includes behaviors in ~/.openclaw/behaviors/)
aiwg use sdlc --provider openclaw

# Local / Ollama  (Claude Code paths, route coding tasks to local model)
aiwg use sdlc --provider local --coding-model ollama/qwen3.5:9b

# All platforms at once
aiwg use sdlc --provider all
```

### Framework Management

```bash
# List installed
aiwg list

# Remove framework
aiwg remove marketing

# Reinstall with force
aiwg use marketing --force
```

### Agent Loop Task Execution (Epic #26)

```bash
# Basic task
aiwg ralph "Fix failing tests" --completion "npm test passes"

# Security-critical with strict controls
aiwg ralph "Fix SQL injection" \
  --completion "security scan passes" \
  --gain-profile conservative \
  --validation-level strict \
  --intervention-mode strict

# Fast doc generation with minimal oversight
aiwg ralph "Update API docs" \
  --completion "docs/ updated" \
  --gain-profile aggressive \
  --disable-overseer

# Leverage past learnings
aiwg ralph "Optimize database queries" \
  --completion "benchmarks pass" \
  --enable-semantic-memory

# Check status mid-run
aiwg ralph-status

# Apply preset for common scenarios
aiwg ralph-config preset conservative
aiwg ralph "Migrate database" --completion "migration complete"
```

---

## Troubleshooting

### Command Not Found

```bash
# Check if installed globally
npm list -g aiwg

# Reinstall if missing
npm install -g aiwg

# Check PATH
echo $PATH
```

### Permission Errors

```bash
# Fix npm permissions (Linux/Mac)
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Reinstall
npm install -g aiwg
```

### Deployment Failures

```bash
# Run doctor
aiwg doctor

# Force reinstall
aiwg use sdlc --force

# Check logs
cat .aiwg/logs/deployment.log
```

### MCP Issues

```bash
# Verify MCP server
aiwg mcp info

# Reinstall config
aiwg mcp install claude --force

# Test manually
aiwg mcp serve
```

### Agent Loop Issues (Epic #26)

```bash
# Check current status
aiwg ralph-status

# View configuration
aiwg ralph-config show

# Reset to defaults
aiwg ralph-config reset

# Inspect semantic memory
aiwg ralph-memory list

# Export state for debugging
aiwg ralph-memory export debug-memory.json

# Try different gain profile
aiwg ralph-config set pid.gain_profile conservative
aiwg ralph-resume
```

---

## Support

- **Documentation**: [https://aiwg.io/docs](https://aiwg.io/docs)
- **GitHub Issues**: [https://github.com/jmagly/aiwg/issues](https://github.com/jmagly/aiwg/issues)
- **Discord**: [https://discord.gg/BuAusFMxdA](https://discord.gg/BuAusFMxdA)
- **Telegram**: [https://t.me/+oJg9w2lE6A5lOGFh](https://t.me/+oJg9w2lE6A5lOGFh)

---

## References

- @src/extensions/commands/definitions.ts - All command definitions
- @src/extensions/types.ts - Extension type system
- @.aiwg/architecture/unified-extension-schema.md - Extension schema
- @.aiwg/architecture/unified-extension-system-implementation-plan.md - Implementation details
- @.aiwg/planning/epic-26-ralph-control-improvements.md - Epic #26 specification
- @tools/ralph-external/ - Al external implementation
- @.aiwg/ralph/ - agent loop state and memory storage
- @CLAUDE.md - Project-level CLI integration
- @README.md - Quick start guide
