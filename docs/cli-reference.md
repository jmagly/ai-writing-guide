# AIWG CLI Reference

Complete reference for all `aiwg` CLI commands.

**Prerequisites:** Node.js ≥18.0.0 and `npm install -g aiwg`

**References:**
- @src/extensions/commands/definitions.ts - Command extension definitions
- @src/extensions/types.ts - Extension type system
- @.aiwg/architecture/unified-extension-schema.md - Extension schema documentation

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
- [Ralph Commands](#ralph-commands)

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
aiwg doctor
```

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

## Framework Management

### use

Install and deploy framework to your project.

```bash
aiwg use <framework>
```

**Arguments:**
- `<framework>` - Framework name: `sdlc`, `marketing`, `writing`, `all`

**Options:**
- `--provider <name>` - Target platform (claude, copilot, factory, cursor, windsurf, warp, openai, opencode)
- `--no-utils` - Skip aiwg-utils addon installation
- `--force` - Overwrite existing deployments
- `--dry-run` - Preview without making changes

**Capabilities:** cli, framework, deployment
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

# Deploy all frameworks
aiwg use all

# Preview deployment without writing files
aiwg use sdlc --dry-run
```

**Framework options:**

| Framework | ID | Description |
|-----------|-----|------------|
| **SDLC Complete** | `sdlc` | Full software development lifecycle with 35+ agents |
| **Marketing Kit** | `marketing` | Complete marketing campaign management |
| **Writing Quality** | `writing` | Voice profiles and content validation |
| **All** | `all` | Deploy all frameworks |

**Platform targets:**

| Platform | ID | Support Level |
|----------|-----|---------------|
| Claude Code | `claude` | Full |
| GitHub Copilot | `copilot` | Full |
| Factory AI | `factory` | Full |
| Cursor | `cursor` | Full |
| Windsurf | `windsurf` | Experimental |
| Warp Terminal | `warp` | Full |
| OpenAI/Codex | `openai` | Full |
| OpenCode | `opencode` | Full |

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

Remove a framework or addon.

```bash
aiwg remove <id>
```

**Arguments:**
- `<id>` - Framework or addon ID (e.g., `sdlc`, `marketing`, `voice-framework`)

**Capabilities:** cli, framework, uninstall
**Platforms:** All
**Tools:** Read, Write, Bash

**Examples:**

```bash
# Remove SDLC framework
aiwg remove sdlc

# Remove voice framework addon
aiwg remove voice-framework
```

**Actions:**
- Removes deployed files from `.claude/`, `.github/`, etc.
- Updates framework registry
- Removes workspace artifacts (`.aiwg/<framework>/`)
- Preserves user-created content

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
  ✓ sdlc-complete v1.0.0 (35 agents, 40 commands)
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
- `<model-id>` - Model identifier (e.g., `claude-opus-4-5-20251101`)

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
AI Model: claude-sonnet-4-5-20250929

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

Environment: Linux 6.14.0-37-generic
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

---

## Plugin Commands

**Note:** Plugin commands are specific to Claude Code integration.

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

## Ralph Commands

Ralph is the iterative task execution loop with advanced control layers (Epic #26).

### ralph

Start Ralph task execution loop.

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
- `--provider <name>` - CLI provider: claude (default), codex
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

Show Ralph loop status.

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
Ralph Loop Status: Active

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

Abort running Ralph loop.

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

Resume paused Ralph loop.

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

### ralph-external

Start external Ralph loop with full crash recovery.

```bash
aiwg ralph-external "<task-description>"
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

Show current Ralph configuration.

```bash
aiwg ralph-config show
```

**Example output:**
```
Ralph Configuration

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
| **Maintenance** | 4 | help, version, doctor, update |
| **Framework** | 3 | use, list, remove |
| **Project** | 1 | new |
| **Workspace** | 3 | status, migrate-workspace, rollback-workspace |
| **MCP** | 1 | mcp (3 subcommands) |
| **Catalog** | 1 | catalog (3 subcommands) |
| **Toolsmith** | 1 | runtime-info |
| **Utility** | 3 | prefill-cards, contribute-start, validate-metadata |
| **Plugin** | 5 | install-plugin, uninstall-plugin, plugin-status, package-plugin, package-all-plugins |
| **Scaffolding** | 7 | add-agent, add-command, add-skill, add-template, scaffold-addon, scaffold-extension, scaffold-framework |
| **Ralph** | 7 | ralph, ralph-status, ralph-abort, ralph-resume, ralph-external, ralph-memory, ralph-config |

**Total:** 34 commands

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
# Deploy to Claude Code
aiwg use sdlc --provider claude

# Deploy to GitHub Copilot
aiwg use sdlc --provider copilot

# Deploy to Cursor
aiwg use sdlc --provider cursor
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

### Ralph Task Execution (Epic #26)

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

### Ralph Loop Issues (Epic #26)

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
- **GitHub Issues**: [https://github.com/jmagly/ai-writing-guide/issues](https://github.com/jmagly/ai-writing-guide/issues)
- **Discord**: [https://discord.gg/BuAusFMxdA](https://discord.gg/BuAusFMxdA)
- **Telegram**: [https://t.me/+oJg9w2lE6A5lOGFh](https://t.me/+oJg9w2lE6A5lOGFh)

---

## References

- @src/extensions/commands/definitions.ts - All command definitions
- @src/extensions/types.ts - Extension type system
- @.aiwg/architecture/unified-extension-schema.md - Extension schema
- @.aiwg/architecture/unified-extension-system-implementation-plan.md - Implementation details
- @.aiwg/planning/epic-26-ralph-control-improvements.md - Epic #26 specification
- @tools/ralph-external/ - Ralph external implementation
- @.aiwg/ralph/ - Ralph state and memory storage
- @CLAUDE.md - Project-level CLI integration
- @README.md - Quick start guide
