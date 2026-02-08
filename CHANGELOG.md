# Changelog

All notable changes to the AI Writing Guide (AIWG) project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

**External Ralph Loop - Crash-Resilient Task Execution**:

- **`/ralph-external` command** - External supervisor for long-running sessions (6-8 hours)
  - Wraps Claude Code sessions with crash recovery and cross-session persistence
  - Pre/post session snapshots capture git status, .aiwg state, file hashes
  - Periodic checkpoints during session (configurable interval, default 30 min)
  - Two-phase state assessment: Orient (understand what happened) → Generate (intelligent continuation)
  - Comprehensive output capture: stdout, stderr, session transcript, parsed events
- **`/ralph-external-status`** - Check external loop status
- **`/ralph-external-abort`** - Abort external loop and cleanup
- **Ralph External addon** (`tools/ralph-external/`):
  - `orchestrator.mjs` - Main loop coordination (~450 lines)
  - `session-launcher.mjs` - Claude CLI wrapper with capture (39 tests)
  - `output-analyzer.mjs` - Session output analysis (29 tests)
  - `snapshot-manager.mjs` - Pre/post session snapshots (23 tests)
  - `checkpoint-manager.mjs` - Periodic state checkpoints (22 tests)
  - `state-assessor.mjs` - Two-phase assessment system
  - `recovery-engine.mjs` - Crash detection and recovery (25 tests)
  - **166 passing tests** total
- State directory: `.aiwg/ralph-external/` with full iteration history

**Multi-Provider Support for External Ralph**:

- **`--provider` flag** - Target different CLI providers (claude, codex)
  - Provider adapter pattern with capability-based degradation
  - Model mapping: opus→gpt-5.3-codex, sonnet→codex-mini-latest, haiku→gpt-5-codex-mini
  - Graceful fallback when provider lacks capabilities (e.g., MCP support)

**Research-Backed Options (REF-015, REF-021)**:

- **`--memory <n|preset>`** - Memory capacity Ω with presets: simple(1), moderate(3), complex(5), maximum(10)
- **`--cross-task` / `--no-cross-task`** - Cross-task learning from similar past loops
- **`--no-analytics`** - Disable iteration analytics collection
- **`--no-best-output`** - Disable best output selection (use final iteration instead of peak quality)
- **`--no-early-stopping`** - Disable early stopping on high confidence

**When to Use External vs Internal Ralph**:

| Feature | Internal (`/ralph`) | External (`/ralph-external`) |
|---------|---------------------|------------------------------|
| Session duration | Single session | Multi-session (6-8 hours) |
| Crash recovery | Limited | Full supervisor recovery |
| State capture | Basic | Comprehensive snapshots |
| Context corruption | Risk exists | External state preserved |

**Example Usage**:

```bash
# Long-running migration
/ralph-external "Migrate codebase to TypeScript" \
  --completion "npx tsc --noEmit exits 0" \
  --max-iterations 20 \
  --budget 5.0

# With Codex provider
/ralph-external "Implement feature X" \
  --completion "npm test passes" \
  --provider codex

# With research-backed options
/ralph-external "Fix all tests" \
  --completion "npm test passes" \
  --memory complex \
  --cross-task
```

### Changed

- **AIWG framework context** - Added dogfooding explanation to CLAUDE.md documenting how this repository uses AIWG to develop itself
- **Framework registry tracking** - `.aiwg/frameworks/` now tracked for framework installation state

---

## [2026.1.7] - 2026-01-14 – "Deploy All Commands" Release

| What changed | Why you care |
|--------------|--------------|
| **Removed priority filtering** | ALL commands now deploy (not just a curated subset) |
| **aiwg-utils commands work** | `aiwg-regenerate*`, `devkit-*`, `mention-*` commands now deploy to Codex/Cursor |

### Fixed

**Command Deployment**:

- Removed `PRIORITY_COMMANDS` filtering from `deploy-prompts-codex.mjs`
- Removed `PRIORITY_COMMANDS` filtering from `deploy-rules-cursor.mjs`
- Core addons (with `core: true` or `autoInstall: true`) now deploy ALL commands
- The `aiwg-utils` addon now deploys all 30 commands including:
  - `aiwg-regenerate*` (context regeneration)
  - `devkit-*` (scaffolding)
  - `mention-*` (traceability)
  - `workspace-*` (maintenance)

---

## [2026.1.6] - 2026-01-14 – "Complete Addon Discovery" Release

| What changed | Why you care |
|--------------|--------------|
| **Complete addon discovery** | ALL deployment scripts now discover addons dynamically |
| **Codex commands fixed** | `~/.codex/prompts/` now includes Ralph and all addon commands |
| **Cursor rules fixed** | `.cursor/rules/` now includes addon commands |
| **Warp/Windsurf fixed** | WARP.md and standalone scripts include all addons |
| **Versioning docs** | Clear CalVer documentation prevents npm update failures |

### Fixed

**Complete Addon Discovery Across All Tools**:

- `tools/commands/deploy-prompts-codex.mjs` - Codex prompts now discover addon commands
- `tools/rules/deploy-rules-cursor.mjs` - Cursor rules now discover addon commands
- `tools/warp/setup-warp.mjs` - Warp WARP.md now includes addon agents/commands
- `tools/agents/deploy-windsurf.mjs` - Standalone Windsurf script now discovers addons

### Added

**Versioning Documentation**:

- `docs/contributing/versioning.md` - Comprehensive CalVer guide
- `.claude/rules/versioning.md` - AI agent enforcement rules
- Updated CLAUDE.md with correct version format examples

**CalVer Format**: `YYYY.M.PATCH` (no leading zeros!)
- Correct: `2026.1.6`, `2026.12.0`
- Wrong: `2026.01.6` (npm rejects leading zeros)

---

## [2026.1.5] - 2026-01-14 – "Dynamic Addon Discovery" Release

| What changed | Why you care |
|--------------|--------------|
| **Dynamic addon discovery** | All providers now automatically pick up new addons like Ralph |
| **No more hardcoded paths** | New addons work across all 8 providers without code changes |
| **Ralph addon support** | Ralph loop agents, commands, and skills now deploy everywhere |

### Fixed

**Addon Discovery for All Providers** (Issue #22):

- **Dynamic Addon Discovery** - All providers now automatically discover and deploy all addons
  - Previously, providers hardcoded specific addons (writing-quality, aiwg-utils)
  - New addons like Ralph were not deployed because they weren't in the hardcoded list
  - Now uses `getAddonAgentFiles()`, `getAddonCommandFiles()`, `getAddonSkillDirs()` from base.mjs

- **Updated Providers**:
  - `claude.mjs` - Now discovers all addons dynamically
  - `codex.mjs` - Now discovers all addons dynamically
  - `copilot.mjs` - Now discovers all addons dynamically
  - `opencode.mjs` - Now discovers all addons dynamically
  - `factory.mjs` - Now discovers all addons dynamically
  - `windsurf.mjs` - Now discovers all addons dynamically

### Added

**Addon Discovery Functions in base.mjs**:

- `discoverAddons(srcRoot)` - Discovers all addons from `agentic/code/addons/` with manifests
- `getAddonAgentFiles(srcRoot, excludeAddons)` - Gets all agent files from all addons
- `getAddonCommandFiles(srcRoot, excludeAddons)` - Gets all command files from all addons
- `getAddonSkillDirs(srcRoot, excludeAddons)` - Gets all skill directories from all addons
- `getAddonFiles(srcRoot, options)` - Combined function for all addon files

### Addons Now Auto-Discovered

All addons in `agentic/code/addons/` are now automatically deployed:
- aiwg-evals, aiwg-hooks, aiwg-utils
- context-curator, testing-quality, voice-framework, writing-quality
- guided-implementation, ralph, droid-bridge, star-prompt

---

## [2026.01.4] - 2026-01-14 – "Provider File Locations Fix" Release

| What changed | Why you care |
|--------------|--------------|
| **Provider deployment fixes** | `aiwg use --provider X` now correctly places files in provider-specific directories |
| **Codex home directory paths** | Codex prompts/skills deploy to `~/.codex/` (home) not project directory |
| **Cursor rules location** | Cursor rules now deploy to `.cursor/rules/` not project root |
| **CLI addon provider pass-through** | `--provider` flag now correctly propagates to addon deployments |
| **Dead code removal** | Removed 115 lines of unreachable Windsurf code from deploy-agents.mjs |
| **Comprehensive test suite** | New `provider-file-locations.test.ts` validates all 8 providers |

### Fixed

**Provider File Location Issues** (Issue #21):

- **CLI `handleUse()`** - Now passes `--provider` to addon deployments (aiwg-utils, ralph)
  - Previously, addons always deployed to Claude Code format regardless of `--provider`
  - Now correctly creates provider-specific directories (`.codex/`, `.factory/`, etc.)

- **Codex Provider** - Fixed command/skill deployment paths
  - Prompts now deploy to `~/.codex/prompts/` (home directory)
  - Skills now deploy to `~/.codex/skills/` (home directory)
  - Previously incorrectly deployed to project directory

- **Cursor Provider** - Fixed rules deployment path
  - Rules now deploy to `<project>/.cursor/rules/`
  - Previously deployed `.mdc` files directly to project root
  - Script now treats `--target` as project root and appends `.cursor/rules/`

- **Dead Code Removal** - Removed unreachable Windsurf code from `deploy-agents.mjs`
  - 115 lines of code that checked `if (provider === 'windsurf')` never executed
  - Provider was an object, not a string, so condition was always false

### Added

**Provider Deployment Test Suite**:

- New `test/integration/provider-file-locations.test.ts`
  - Tests all 8 providers: claude, codex, factory, copilot, cursor, opencode, warp, windsurf
  - Validates correct directory creation for each provider
  - Validates no forbidden paths (e.g., no `.claude/` when using codex)
  - Validates correct file extensions per provider
  - Tests `aiwg use --provider` CLI integration

### Provider File Locations Reference

| Provider | Project Directories | Home Directories | Root Files |
|----------|---------------------|------------------|------------|
| Claude | `.claude/agents/`, `.claude/commands/`, `.claude/skills/` | - | - |
| Codex | `.codex/agents/` | `~/.codex/prompts/`, `~/.codex/skills/` | - |
| Factory | `.factory/droids/`, `.factory/commands/` | - | - |
| Copilot | `.github/agents/` | - | - |
| Cursor | `.cursor/rules/` | - | - |
| OpenCode | `.opencode/agent/`, `.opencode/command/` | - | - |
| Warp | - | - | `WARP.md` |
| Windsurf | `.windsurf/workflows/` | - | `AGENTS.md`, `.windsurfrules` |

---

## [2026.01.3] - 2026-01-13 – "Ralph Loop & Issue Management" Release

| What changed | Why you care |
|--------------|--------------|
| **Ralph Loop** | Iterative AI task execution - "iteration beats perfection" methodology |
| **--interactive & --guidance** | All commands now support interactive mode and custom guidance |
| Unified issue management | Create, update, list, sync issues across Gitea/GitHub/Jira/Linear or local files |
| Issue auto-sync | Commits with "Fixes #X" automatically update and close issues |
| Token security patterns | Secure token loading via env vars and files, never direct access |
| Vendor-specific regenerate | 30-40% smaller context files, only loads relevant platform commands |
| Man page support | `man aiwg` works after npm global install |

### Added

**Ralph Loop - Iterative AI Task Execution**:

- **`/ralph` command** - Execute tasks iteratively until completion criteria met
  - Parse task definition and verification criteria
  - Execute → Verify → Learn → Iterate cycle
  - Errors become learning data, not session-ending failures
  - Configurable max iterations and timeout
- **`/ralph-status`** - Check status of current or previous Ralph loop
- **`/ralph-resume`** - Resume interrupted loop from last checkpoint
- **`/ralph-abort`** - Abort running loop and optionally revert changes
- **Ralph addon** (`agentic/code/addons/ralph/`):
  - Complete methodology documentation
  - Loop state persistence in `.aiwg/ralph/`
  - Completion reports with iteration history
- **Natural language triggers**: "ralph this", "loop until", "keep trying until"
- Philosophy: "Iteration beats perfection" - inspired by Ralph Wiggum methodology

**Command Enhancements**:

- **`--interactive` flag** - All commands now support interactive mode
  - Asks clarifying questions before execution
  - Validates assumptions with user
  - Gathers preferences for ambiguous choices
- **`--guidance <text>` flag** - Provide custom guidance to tailor command behavior
  - Pass project-specific context
  - Override default behaviors
  - Focus on specific aspects of the task
- **Man page** - `man aiwg` now works after `npm install -g aiwg`

**Gap Analysis & Guided Implementation**:

- **`/gap-analysis` command** - Unified gap analysis with natural language routing
- **Guided implementation addon** (`agentic/code/addons/guided-implementation/`):
  - Iteration control for complex implementations
  - Step-by-step guidance with checkpoints
  - REF-004 MAGIS reference integration

**Droid Bridge MCP Integration**:

- **`droid-bridge` addon** - MCP integration for Claude Desktop and other MCP clients
- Bridge between agentic framework and MCP protocol
- Enables AIWG agents in MCP-compatible environments

**Issue Management System** (Issues #16, #17):

- **`/issue-create`** - Create issues with multi-provider support:
  - Gitea (MCP tools), GitHub (gh CLI), Jira (REST API), Linear (GraphQL)
  - Local fallback to `.aiwg/issues/` when no provider configured
  - Config via `.aiwg/config.yaml` or CLAUDE.md
- **`/issue-update`** - Update issue status, assignee, labels, add comments
- **`/issue-list`** - List and filter issues by status, label, assignee
- **`/issue-sync`** - Detect issue refs in commits ("Fixes #X", "Closes #X")
- **`/issue-close`** - Close issues with completion summary
- **`/issue-comment`** - Add structured comments using templates
- **Issue comment templates**:
  - `task-completed.md` - Completion summary with deliverables
  - `feedback-needed.md` - Request review with specific questions
  - `blocker-found.md` - Blocker notification with impact assessment
  - `progress-update.md` - Status update with metrics
- **`issue-auto-sync` skill** - Post-commit automation for issue updates

**Token Security** (Issue #18):

- **Security addon** (`agentic/code/addons/security/`):
  - `secure-token-load.md` - Patterns for secure token loading
  - Single-line, heredoc, and environment variable patterns
- **Token loading priority**: Environment variables → Secure files → Vault
- **Token security rules** (`.claude/rules/token-security.md`):
  - Never hard-code tokens
  - Never pass tokens as command arguments
  - Use heredoc for multi-line operations
  - Enforce file permissions (mode 600)
- Updated DevOps Engineer and Security Auditor agents with security guidance
- Comprehensive documentation at `docs/token-security.md`

**Vendor-Specific Regenerate** (Issue #19):

- **Vendor detection** (`docs/vendor-detection.md`):
  - Claude Code: CLAUDE.md, .claude/ directory
  - GitHub Copilot: copilot-instructions.md, .github/agents/
  - Cursor: .cursor/ directory
  - Windsurf: WARP.md
- **Regenerate base template** (`templates/regenerate-base.md`):
  - Common structure for all regenerate commands
  - Vendor-specific section placeholders
- **Context reduction**: 30-40% smaller files by platform filtering
- Only inline ~15-20 most-used commands/agents per vendor
- Full catalogs linked instead of inlined

**Star Prompt Addon** (Issue #14):

- **`star-prompt` addon** (`agentic/code/addons/star-prompt/`):
  - Tasteful "Yes, star the repo" / "No thanks" prompt
  - Auto-star via `gh api -X PUT /user/starred/jmagly/ai-writing-guide`
  - Fallback to manual link if gh CLI unavailable
- Integrated into all intake and regenerate commands
- Non-intrusive, shown only once per command

### Changed

- Consolidated `/ticket-*` commands to `/issue-*` for git ecosystem consistency
- Renamed `ticketing-config.md` to `issue-tracking-config.md`
- Changed `.aiwg/tickets/` to `.aiwg/issues/` for local tracking
- Updated command manifests with new issue commands

### Fixed

- Standardized terminology across SDLC framework (issue vs ticket)

---

## [2026.01.0] - 2026-01-07 – "CalVer Migration" Release

| What changed | Why you care |
|--------------|--------------|
| CalVer versioning | Version now reflects release date (YYYY.M.PATCH) |
| Addon directory fix | Claude provider correctly handles addon-style directories |

### Changed

- **CalVer versioning**: Migrated from SemVer (0.x.x, 2024.12.x) to pure CalVer (2026.01.x)
- Version format: `YYYY.M.PATCH` where PATCH resets each month (no leading zeros)

### Fixed

- **Addon directory deployment**: Claude provider now supports addon-style directory structures during deployment

---

## [2024.12.5] - 2025-12-13 – "Flexible Models & Terminal Docs" Release

| What changed | Why you care |
|--------------|--------------|
| Terminal docs site | CLI-style documentation with full-text search and themes |
| Smithing Framework | Create agents, skills, commands, and MCP servers dynamically |
| Windsurf provider | Deploy to Windsurf IDE |
| Flexible model selection | Override models per tier when deploying agents |
| Filter-based deployment | Deploy only specific agents by pattern or role |
| Persistent model config | Save model preferences for future deployments |

### Added

**Terminal Documentation Site**:

- **CLI-style console** - Search and navigate via command input
- **Full-text search** - Search all documentation content with highlighting via dbbuilder integration
- **Log entry format** - Content displayed as categorized terminal log entries
- **Three themes** - Dark, Light (OS/2 Warp inspired cream palette), and Matrix
- **Clickable search results** - All results displayed as navigable links
- **Keyboard shortcuts** - `?` help, `/` search, `t` theme, `gg` top, `G` bottom
- Console commands: `help`, `search <query>`, `theme`, `clear`, `home`

**Smithing Framework** (Preview):

- **ToolSmith** - Create MCP tools from specifications
- **MCPSmith** - Build complete MCP servers with Docker support
- **AgentSmith** - Generate specialized agents from descriptions
- **SkillSmith** - Create Claude Code skills
- **CommandSmith** - Build slash commands
- Located in `agentic/code/frameworks/sdlc-complete/agents/smiths/`

**Windsurf Provider**:

- New experimental provider for Windsurf IDE
- `aiwg use sdlc --provider windsurf`
- Provider modularization refactor for cleaner multi-provider architecture

**Flexible Model Selection** (PR #73):

- **`--reasoning-model <name>`** - Override model for opus-tier agents (architecture, analysis)
- **`--coding-model <name>`** - Override model for sonnet-tier agents (implementation, review)
- **`--efficiency-model <name>`** - Override model for haiku-tier agents (simple tasks)
- Works with `aiwg use` command for all providers

**Filter-Based Deployment**:

- **`--filter <pattern>`** - Deploy only agents matching glob pattern (e.g., `*architect*`)
- **`--filter-role <role>`** - Deploy only agents of specified role: `reasoning`, `coding`, `efficiency`
- Enables surgical updates to specific agent subsets

**Model Persistence**:

- **`--save`** - Save model configuration to project `models.json`
- **`--save-user`** - Save to user-level `~/.config/aiwg/models.json`
- Configurations apply to future deployments automatically

**Documentation Updates**:

- `docs/CLI_USAGE.md` - Full model selection, filter, and save flag documentation
- `docs/configuration/model-configuration.md` - Updated with filter and persistence examples
- `README.md` - Added collapsible model selection section

### Fixed

- **Dry-run flag in ensureDir** - Directory creation now respects `--dry-run` across all providers
- **Skill deployment test** - Fixed test to use Claude provider (Factory doesn't support skills)
- **Search auto-navigation** - Fixed search jumping to first result instead of showing clickable results list
- **Deep linking** - Fixed hash-based navigation requiring missing DOM element

### Changed

- Updated `/aiwg-refresh` command to support model selection and filter flags
- Command syntax standardized to use `aiwg use` instead of legacy `-deploy-agents`

---

## [2024.12.4] - 2025-12-12 – "Universal Providers" Release

| What changed | Why you care |
|--------------|--------------|
| 5 new providers | Deploy to Claude, Factory, OpenAI, Cursor, Copilot, OpenCode |
| `/aiwg-refresh` command | Update frameworks in-session without leaving Claude Code |
| Testing-quality addon | TDD enforcement, mutation testing, flaky detection (6 skills) |
| Live provider tests | All providers validated with real CLI integration tests |
| Testing requirements docs | Clear guidance on when full regression testing is required |

### Added

**Multi-Provider Support** (PRs #62, #63, #64, #65):

- **OpenAI Codex CLI** - Full integration with `.codex/agents/` deployment
- **Cursor IDE** - Native `.cursor/rules/*.mdc` format with AGENTS.md
- **OpenCode** - `.opencode/agent/` structure with AGENTS.md
- **GitHub Copilot** - `.github/agents/*.yaml` with `copilot-instructions.md`
- All providers now deploy agents, commands, and skills consistently
- Platform documentation for each provider in `docs/integrations/`

**In-Session Update Command** (PR #69):

- **`/aiwg-refresh`** - Update AIWG CLI and redeploy frameworks without leaving session
  - `--update-cli` - Update the AIWG CLI itself
  - `--all` / `--sdlc` / `--marketing` / `--utils` - Redeploy specific frameworks
  - `--provider` - Target specific provider
  - `--dry-run` - Preview changes without applying

**Testing-Quality Addon** (PR #68):

- 6 new skills for test enforcement:
  - `tdd-enforce` - Pre-commit hooks + CI coverage gates
  - `mutation-test` - Validate tests beyond coverage (Stryker/PITest)
  - `flaky-detect` - Identify unreliable tests from CI history
  - `flaky-fix` - Pattern-based auto-repair
  - `generate-factory` - Auto-generate test data factories
  - `test-sync` - Detect orphaned tests, missing tests
- Research foundation: Kent Beck (TDD), Google Testing Blog, FlaKat, UTRefactor
- `/setup-tdd` command for project TDD configuration

**Testing Infrastructure** (PRs #66, #67):

- Live CLI integration tests for all providers (Claude, Factory, OpenAI, Cursor, Copilot)
- Factory AI deployment integration tests with real droid validation
- Provider validation matrix in CI

**Documentation**:

- `docs/contributing/testing-requirements.md` - When full regression testing is required
- `docs/development/file-placement-guide.md` - Where to put different file types
- External research references to testing framework
- GitHub Copilot quickstart guide

### Fixed

- **Factory agent mapping** - Correct agent names and tool assignments for Factory droids
- **Codex integration tests** - Resolved test failures in OpenAI provider

### Changed

- Removed `aiwg demo` command in favor of comprehensive documentation
- Testing now enforced as first-class requirement across SDLC framework

---

## [2024.12.3] - 2025-12-11 – "It Just Works" Release

| What changed | Why you care |
|--------------|--------------|
| `aiwg doctor` command | Diagnose installation issues instantly |
| npm discoverability + badges | Actually shows up when you search npm |
| MCP server works from any folder | No more ".aiwg not found" errors |
| PATH warning on install | Know immediately if setup needs fixing |
| Windows + cross-platform fixes | Works on Windows out of the box |
| Team directives preserved | No more lost custom rules on regenerate |
| GitHub Pages docs | Temporary landing page while aiwg.io loads |
| @-mention traceability wiring | Agents navigate codebase via logical paths |
| Workspace cleanup commands | Prune stale files, archive completed plans |

### Added

- **`aiwg doctor`** - Health check command that diagnoses installation issues and provides fix suggestions
- **Postinstall PATH check** - Friendly warning with shell-specific fix instructions if `aiwg` isn't in PATH
- **GitHub Pages** - Temporary documentation at https://jmagly.github.io/ai-writing-guide
- **@-mention traceability** - Wired cross-references in 14 key files (source→test→requirements→architecture)
- **`/workspace-prune-working`** - Clean up `.aiwg/working/` by promoting, archiving, or deleting stale files
- **`/workspace-realign`** - Sync documentation with codebase changes, archive completed plans

### Changed

- **npm keywords** - Added 14 discoverable keywords (aiwg, agentic-ai, mcp-server, claude-skills, etc.)
- **npm description** - Clear, searchable description
- **README hero section** - Install command front and center
- **MCP server** - Auto-finds project root from any subdirectory (walks up looking for `.aiwg/`)

### Fixed

- **Windows paths** - Replaced string concatenation with `path.join()` throughout
- **CI matrix** - Added Windows runner to GitHub Actions
- **Team directives** - `/aiwg-regenerate-claude` preserves content below `<!-- TEAM DIRECTIVES -->`

---

## [2024.12.2] - 2025-12-10

### Skill Seekers Integration & Usability Improvements

This release adds **Skill Seekers community integration** with two new addons, **workspace health guidance** for transition points, and **standardized command usability** across all flow commands.

#### Added

**Skill Seekers Integration** (PRs #206, #207, #208 to Skill Seekers repo):
- **doc-intelligence addon** (`agentic/code/addons/doc-intelligence/`):
  - Intelligent documentation analysis and generation
  - Cross-repository knowledge synthesis
  - Documentation gap detection and remediation
  - Integrates with Skill Seekers community marketplace
- **skill-factory addon** (`agentic/code/addons/skill-factory/`):
  - Automated skill generation from natural language descriptions
  - Skill template scaffolding and validation
  - Multi-platform skill deployment (Claude, Factory, OpenAI)
- **SDLC Extensions for Skill Seekers**:
  - `skill-seekers-integration` extension with 5 specialized agents
  - Community skill discovery and curation workflows
  - Attribution and licensing compliance automation
- Attribution added to README.md and addon.json files

**Workspace Health Skill** (`aiwg-utils/skills/workspace-health/`):
- Natural language triggers: "check workspace health", "workspace status", "is my workspace aligned"
- Assesses `.aiwg/working/` directory health (stale files, large artifacts)
- Validates documentation alignment with codebase
- Checks artifact freshness and completeness
- Provides actionable recommendations without auto-executing
- Designed for use at phase transitions and after intensive processes

**Post-Completion Guidance**:
- Added "Post-Completion" section to 9 major flow commands:
  - `flow-concept-to-inception`
  - `flow-inception-to-elaboration`
  - `flow-elaboration-to-construction`
  - `flow-construction-to-transition`
  - `flow-delivery-track`
  - `flow-iteration-dual-track`
  - `flow-gate-check`
  - `flow-deploy-to-production`
  - `flow-hypercare-monitoring`
- Recommends workspace health check after workflow completion
- Suggests follow-up actions based on workflow context
- Template: `templates/flow-patterns/post-completion-template.md`

#### Changed

**Command Usability Standardization**:
- Added `--interactive` and `--guidance` parameters to 28 commands:
  - All intake commands (intake-wizard, intake-start, intake-from-codebase, etc.)
  - All flow commands (phase transitions, reviews, deployments)
  - Marketing commands (campaign-kickoff, creative-brief, etc.)
  - Gate and validation commands
- Consistent parameter documentation in frontmatter `argument-hint`
- Added "Optional Parameters" section to command bodies

**Multi-Provider Skill Deployment**:
- Skills now deploy successfully to Factory AI (previously Claude-only)
- Updated smoke tests to verify Factory skill deployment
- `--deploy-skills` works with `--provider factory`

#### Fixed

**Test Suite**:
- Fixed `cli-install.test.ts` smoke test for multi-provider skill deployment
- Test now verifies successful Factory deployment instead of expecting warning

---

## [2024.12.1] - 2025-12-10

### Production-Grade Reliability & Extensibility Release

This is a major release introducing **production-grade reliability patterns** based on academic research, the **AIWG Development Kit** for framework extensibility, **MCP Server** for Model Context Protocol integration, and **CLAUDE.md modernization** with path-scoped rules. Context loading is reduced by 87% for base sessions.

#### Added

**Research Integration** (REF-001, REF-002, REF-003):
- **REF-001**: Bandara et al. (2025) "Production-Grade Agentic AI Workflows" - 9 best practices:
  - BP-1: Direct tool calls over MCP for determinism
  - BP-3: One agent, one responsibility principle
  - BP-4: Single-responsibility agents
  - BP-5: Externalized prompts in version control
  - BP-6: Multi-model consortium for high-stakes outputs
- **REF-002**: Roig (2025) "How Do LLMs Fail In Agentic Scenarios?" - 4 failure archetypes:
  - Archetype 1: Premature Action Without Grounding
  - Archetype 2: Over-Helpfulness Under Uncertainty
  - Archetype 3: Distractor-Induced Context Pollution
  - Archetype 4: Fragile Execution Under Load
  - Key finding: Recovery capability > model size for success
- **REF-003**: MCP 2025-11-25 specification research and integration patterns
- Research references in `docs/references/` for traceable guidance

**AIWG Development Kit** (PR #57, #58):
- Three-tier plugin taxonomy: Frameworks (50+ agents) → Extensions (5-20 agents) → Addons (1-10 agents)
- CLI scaffolding commands:
  - `aiwg scaffold-addon <name>` - Create new addon package
  - `aiwg scaffold-extension <name> --for <framework>` - Create framework extension
  - `aiwg scaffold-framework <name>` - Create complete framework
  - `aiwg add-agent|add-command|add-skill|add-template` - Add components to packages
  - `aiwg validate <path> [--fix]` - Validate package structure
- In-session commands with AI guidance:
  - `/devkit-create-addon`, `/devkit-create-extension`, `/devkit-create-framework`
  - `/devkit-create-agent`, `/devkit-create-command`, `/devkit-create-skill`
  - `/devkit-validate`, `/devkit-test`
- Agent templates: simple (sonnet), complex (sonnet+search), orchestrator (opus+Task)
- Command templates: utility, transformation, orchestration
- Comprehensive documentation: `docs/development/devkit-overview.md`

**Production-Grade Reliability Patterns**:
- **Reliability prompts** in `aiwg-utils/prompts/reliability/`:
  - `decomposition.md` - Task breakdown using 7±2 cognitive rule
  - `parallel-hints.md` - Concurrent execution patterns
  - `resilience.md` - PAUSE→DIAGNOSE→ADAPT→RETRY→ESCALATE protocol
- **Core prompts** in `aiwg-utils/prompts/core/`:
  - `orchestrator.md` - Workflow orchestration guidance
  - `multi-agent-pattern.md` - Primary→Reviewers→Synthesizer pattern
  - `consortium-pattern.md` - Multi-model validation for uncertain outputs
- **New agents**:
  - `consortium-coordinator` - Coordinates multi-agent consensus decisions
  - `self-debug` - Diagnoses and recovers from agent failures
  - `aiwg-developer` - AIWG development assistance with taxonomy knowledge
  - `context-curator` - Pre-filters context, removes distractors (Archetype 3)

**New Addons**:
- **aiwg-hooks** - Claude Code hook templates for workflow tracing:
  - `aiwg-trace.js` - Captures SubagentStart/SubagentStop events
  - JSONL trace format for debugging, performance analysis, audit
  - `trace-viewer.mjs` - View traces as tree/timeline/JSON
- **aiwg-evals** - Automated agent quality assessment:
  - Archetype tests: grounding-test, substitution-test, distractor-test, recovery-test
  - Performance tests: parallel-test, latency-test, token-test
  - Quality tests: output-format, tool-usage, scope-adherence
  - CI integration workflow template
  - Quality reports with trend tracking
- **context-curator** - Distractor filtering for Archetype 3 prevention:
  - Context classification: RELEVANT/PERIPHERAL/DISTRACTOR
  - Scope enforcement rules
  - `.claude/rules/` deployment for runtime guidance

**@-Mention Conventions & Wiring**:
- 5 new commands for artifact traceability:
  - `/mention-wire` - Analyze codebase and inject @-mentions
  - `/mention-validate` - Validate all @-mentions resolve to existing files
  - `/mention-report` - Generate traceability report from @-mentions
  - `/mention-lint` - Lint @-mentions for style consistency
  - `/mention-conventions` - Display naming conventions and placement rules
- Standardized mention patterns in `registry.json`:
  - Requirements: `@.aiwg/requirements/UC-{NNN}-{slug}.md`
  - Architecture: `@.aiwg/architecture/adrs/ADR-{NNN}-{slug}.md`
  - Security: `@.aiwg/security/TM-{NNN}.md`
  - Testing: `@.aiwg/testing/test-cases/TC-{NNN}.md`
- Guidelines: `docs/guides/mention-conventions.md`

**Workspace Maintenance Commands** in aiwg-utils:
- `/workspace-realign` - Sync `.aiwg/` docs with code changes:
  - Analyzes git history since last alignment
  - Archives stale documents, flags missing docs
- `/workspace-prune-working` - Clean `.aiwg/working/` directory:
  - Promotes finalized docs to permanent locations
  - Archives useful historical content
  - Deletes truly temporary files
- `/workspace-reset` - Complete `.aiwg/` wipe with safety features:
  - Backup creation, selective preservation (intake, team)
  - Requires confirmation (`RESET`) or `--force`

**Framework-Scoped Workspace Structure** (PR #54):
- Multi-framework coexistence in same project:
  - Marketing can read SDLC artifacts (feature specs) for launch content
  - Each framework maintains isolated write scope
- Target structure:
  ```
  .aiwg/
  ├── frameworks/
  │   ├── sdlc-complete/     # SDLC artifacts
  │   └── media-marketing-kit/  # Marketing artifacts
  └── shared/                 # Cross-framework resources
  ```
- Rollback CLI improvements for finding backups
- Assessment reports and working artifacts

**Skills System Expansion**:
- 6 new skills in aiwg-utils:
  - `claims-validator` - Validates factual claims in content
  - `config-validator` - Validates AIWG configuration files
  - `nl-router` - Natural language command routing
  - `parallel-dispatch` - Parallel agent coordination
  - `project-awareness` - Project context detection
  - `template-engine` - Template rendering and variable substitution
  - `artifact-metadata` - Artifact metadata extraction

**npm Package Distribution** (PR #55):
- Published to npm as `aiwg` package
- Global installation: `npm install -g aiwg`
- Package includes: bin/, src/, tools/, agentic/, docs/, core/
- Semantic versioning: 2024.12.1
- Automated publish workflow via GitHub Actions

**MCP Server Implementation** (Phase 1):
- Complete MCP server following 2025-11-25 specification (`src/mcp/server.mjs`)
- 5 MCP tools:
  - `workflow-run` - Execute AIWG workflows with automatic prompt integration
  - `artifact-read` - Read artifacts from `.aiwg/` directory
  - `artifact-write` - Write artifacts to `.aiwg/` directory
  - `template-render` - Render AIWG templates with variable substitution
  - `agent-list` - List available AIWG agents by framework
- 3 MCP resources:
  - `aiwg://prompts/catalog` - Prompts catalog
  - `aiwg://templates/catalog` - Templates catalog
  - `aiwg://agents/catalog` - Agents catalog
  - Dynamic URI templates for specific items
- 3 MCP prompts (automatically integrated into workflow-run):
  - `decompose-task` - Break complex tasks into manageable subtasks
  - `parallel-execution` - Identify parallelizable work
  - `recovery-protocol` - PAUSE→DIAGNOSE→ADAPT→RETRY→ESCALATE error handling
- Workflow metadata with complexity analysis and step descriptions
- MCP CLI commands: `aiwg mcp serve`, `aiwg mcp install`, `aiwg mcp info`
- Comprehensive test suite: 13 tests covering all MCP functionality
- Test fixture project (`test/fixtures/mcp-test-project/`) for validation

**CLAUDE.md Modernization**:
- New modular CLAUDE.md structure (134 lines vs 1,018 - **87% reduction**)
- Path-scoped rules in `.claude/rules/`:
  - `sdlc-orchestration.md` - Loaded when working in `.aiwg/**`
  - `voice-framework.md` - Loaded when working in `**/*.md`
  - `development.md` - Loaded when working in `src/**`, `test/**`
  - `agent-deployment.md` - Loaded when working in `.claude/agents/**`
- Reference documentation in `docs/reference/`:
  - `ORCHESTRATOR_GUIDE.md` - Full orchestration reference (on-demand via @-mentions)
- Context loading follows Anthropic best practices for token efficiency

**Centralized Registry**:
- `agentic/code/config/registry.json` - Single source of truth for:
  - AIWG path resolution (eliminates duplication across 20+ commands)
  - Natural language pattern mappings (70+ phrases → flow commands)
  - Artifact path definitions
  - Provider-specific configurations (Claude, Factory, OpenAI, Warp)
  - @-mention patterns for traceability

**MCP Research & Documentation**:
- `docs/references/REF-003-mcp-specification-2025.md` - MCP 2025-11-25 research
- Updated platform adapter specification with MCP-first architecture

#### Changed

**Agent Design Philosophy** (from research):
- Agents now follow "10 Golden Rules" from Agent Design Bible:
  - Rule 1: Ground before acting (Archetype 1 prevention)
  - Rule 2: Escalate uncertainty (Archetype 2 prevention)
  - Rule 3: Scope context (Archetype 3 prevention)
  - Rule 4: Decompose tasks (Archetype 4 prevention)
  - Rule 5-10: Single responsibility, external prompts, tool discipline, etc.
- Agent linter validates rules compliance

**Command Updates**:
- `/aiwg-regenerate-claude` now generates modular structure by default
  - `--legacy` flag available for old monolithic format
  - Reports context reduction metrics in output
  - Generates `.claude/rules/` files based on detected frameworks

**Context Loading Strategy**:
- Base context: 134 lines (always loaded)
- SDLC context: +180 lines (loaded only when working in `.aiwg/`)
- Voice context: +75 lines (loaded only when working in `**/*.md`)
- Dev context: +85 lines (loaded only when working in `src/`, `test/`)
- Detailed docs: On-demand via `@docs/reference/` mentions

**Addon Structure Migration** (PR #50):
- Writing Quality migrated to addon structure (`agentic/code/addons/writing-quality/`)
- Clear addon taxonomy established (Frameworks, Addons, Extensions)
- Plugin management CLI commands added

**Dependencies**:
- Added `@modelcontextprotocol/sdk` ^1.24.0 (MCP server)
- Added `zod` ^3.25.0 (schema validation)

#### Fixed

**MCP Server**:
- Prompt argsSchema type handling (MCP passes all args as strings)
- `mcp install --dry-run` flag parsing

**Documentation**:
- Updated CLAUDE.md to follow 100-200 line best practice
- Removed redundant orchestration guidance from multiple locations
- Consolidated natural language translations into registry
- Removed inflated metrics and unimplemented feature claims from README
- Removed internal project status and roadmap from public README

**CLI Tooling**:
- `aiwg -update` now refreshes shell aliases properly
- Rollback CLI finds backups in both workspace and project locations
- Fixed skills not deploying for voice-framework, SDLC, and MMK frameworks
- Fixed metadata-validation workflow to skip gitignored directories

**Tests**:
- Comprehensive test remediation for SDLC framework and writing modules
- TypeScript unused variable errors resolved across codebase
- Added CLI installation smoke tests

### Migration Guide

**For Existing Projects (CLAUDE.md Modernization):**

The new modular CLAUDE.md structure is opt-in. Existing monolithic CLAUDE.md files continue to work. To migrate:

1. Backup your current CLAUDE.md (preserved automatically by regenerate command)
2. Run `/aiwg-regenerate-claude` to generate modular structure
3. Review generated `.claude/rules/` files
4. Add team-specific content below `<!-- TEAM DIRECTIVES -->` marker

**For Production-Grade Patterns:**

1. Update AIWG installation:
   ```bash
   aiwg -update  # Or: aiwg -reinstall for clean install
   ```

2. Deploy new addons:
   ```bash
   aiwg use all  # Deploys all frameworks + new addons
   ```

3. Import reliability prompts in your CLAUDE.md:
   ```markdown
   See @~/.local/share/ai-writing-guide/agentic/code/addons/aiwg-utils/prompts/reliability/resilience.md
   ```

**For Development Kit:**

Use scaffolding commands to create new packages:
```bash
aiwg scaffold-addon my-utils --description "My custom utilities"
aiwg add-agent code-helper --to my-utils --template simple
```

Or in-session with AI guidance:
```bash
/devkit-create-addon my-utils --interactive
```

**For MCP Integration:**

```bash
# Start MCP server
aiwg mcp serve

# Or install config for your client
aiwg mcp install claude  # For Claude Desktop
aiwg mcp install cursor  # For Cursor IDE

# View MCP info
aiwg mcp info
```

**For @-Mention Traceability:**

1. Wire mentions into existing artifacts:
   ```bash
   /mention-wire --target .aiwg/requirements/
   ```

2. Validate all mentions resolve:
   ```bash
   /mention-validate
   ```

---

## [0.9.1] - 2025-12-08

### Voice Framework & Skills System Release

This release introduces the **Voice Framework** addon and comprehensive **Skills system** across all frameworks. The CLI tooling has been updated to deploy skills automatically with framework installations.

#### Added

**Voice Framework Addon** (PR #52):
- 4 built-in voice profiles for consistent, authentic writing:
  - `technical-authority` - Direct, precise, confident (API docs, architecture)
  - `friendly-explainer` - Approachable, encouraging (tutorials, onboarding)
  - `executive-brief` - Concise, outcome-focused (business cases, reports)
  - `casual-conversational` - Relaxed, personal (blogs, newsletters)
- 4 voice skills:
  - `voice-apply` - Transform content to match a specified voice profile
  - `voice-create` - Generate new profiles from descriptions or examples
  - `voice-blend` - Combine multiple profiles with weighted ratios
  - `voice-analyze` - Analyze content's current voice characteristics
- YAML voice profile schema with tone, vocabulary, structure, perspective settings
- Project-specific voice profiles via `.aiwg/voices/`

**Skills System** (PR #51):
- Claude Code Skills support across all frameworks (SKILL.md format)
- 29 total skills deployed with `aiwg use all`:
  - 1 writing-quality skill (ai-pattern-detection)
  - 6 aiwg-utils skills (config-validator, project-awareness, etc.)
  - 4 voice-framework skills (voice-apply, voice-create, voice-blend, voice-analyze)
  - 10 SDLC framework skills (project-health, artifact-indexer, etc.)
  - 8 MMK framework skills (campaign-tracker, content-scheduler, etc.)
- Skills auto-deploy with `aiwg use <framework>`

**CLI Improvements**:
- New `aiwg use writing` command for Writing Quality + Voice Framework
- `--deploy-skills` flag for explicit skill deployment
- Skills deployment by mode: general, writing, sdlc, marketing, both, all
- Dry-run support for skill deployment testing

**Test Coverage**:
- `test/unit/cli/skill-deployer.test.ts` - 20 tests for skill deployment
- `test/unit/writing/voice-profile.test.ts` - 16 tests for voice profiles
- Integration tests for deploy-agents.mjs skill deployment

#### Changed

**Documentation Updates**:
- Updated all quickstart guides with Voice Framework sections
- Added voice profile usage to CLI_USAGE.md
- Updated integration quickstarts (Claude Code, Warp Terminal)
- Added Voice Framework integration to writing-quality addon README

**Deprecations**:
- `validation/banned-patterns.md` deprecated in favor of voice profiles
- Pattern-avoidance approach replaced by positive voice definition

#### Fixed

**CLI Tooling**:
- Fixed skills not deploying for voice-framework, SDLC, and MMK frameworks
- Fixed mode filtering for skill deployment
- Added provider restriction messaging (skills Claude-only currently)

### Migration Guide

**From banned-patterns to Voice Framework:**

1. Deploy the writing framework:
   ```bash
   aiwg use writing
   ```

2. Replace pattern avoidance with voice profiles:
   ```text
   # Before (pattern avoidance)
   "Write this avoiding AI patterns like 'delve into', 'it's important to note'"

   # After (voice definition)
   "Write this in technical-authority voice"
   ```

3. Create custom voice profiles for your project:
   ```yaml
   # .aiwg/voices/my-brand.yaml
   name: my-brand
   description: Our brand voice
   tone:
     formality: 0.5
     confidence: 0.8
   ```

---

## [Unreleased]

### Inception Phase - Plugin System Architecture (2025-10-17 to 2025-10-18)

**Phase Objective**: Document and baseline the AIWG SDLC framework plugin system architecture with complete SDLC artifacts, demonstrating self-application capability through comprehensive planning and multi-agent orchestration.

**Phase Status**: Weeks 1-3 COMPLETE (Oct 17-18), Week 4 IN PROGRESS

#### Added

**Architecture Documentation** (Week 2 - Oct 18):
- Software Architecture Document (SAD) v1.0 (95/100 quality, 12,847 words) - **BASELINED**
  - 10 comprehensive Mermaid.js diagrams (system, logical, deployment, security, component views)
  - Complete plugin system architecture for extensibility (platforms, compliance, verticals, workflows)
  - 100% requirements traceability (intake → SAD → enhancement plans)
  - Multi-agent synthesis (4 parallel reviewers: Security, Test, Requirements, Documentation)
- Architecture Decision Records (6 ADRs, avg 88.3/100 quality):
  - ADR-001: Plugin Manifest Format (YAML with semantic versioning)
  - ADR-002: Plugin Isolation Strategy (filesystem boundaries, no code execution)
  - ADR-003: Traceability Automation Approach
  - ADR-004: Contributor Workspace Isolation
  - ADR-005: Quality Gate Thresholds (80/100 baseline)
  - ADR-006: Plugin Rollback Strategy (transaction-based, <5 second target)

**Enhancement Plans** (Week 2 - Oct 18):
- Security Enhancement Plan (4-week roadmap, 89 hours):
  - Addresses 5 critical vulnerabilities (path traversal, YAML deserialization, CLAUDE.md injection, dependency verification, secret exposure)
  - 68+ security test cases defined
  - Defense-in-depth architecture
- Testability Enhancement Plan (10-week roadmap, 80 hours):
  - Addresses 4 critical testing gaps (no automated tests, no plugin test framework, no performance benchmarks, no cross-platform validation)
  - 200+ test cases defined across 5 test levels
  - 80%+ code coverage target

**Testing Documentation** (Week 3 - Oct 18):
- Framework Testing Documentation (7,800 words):
  - Existing framework testing approach (markdown lint, manifest sync, GitHub Actions CI/CD)
  - 12 markdown linting rules enforced via custom fixers
  - Quality gates operational (9,505 violations detected, 42 manifests validated)
- Quality Gates Validation Report (6,500+ words):
  - All automated quality gates confirmed operational
  - 6 identified gaps with mitigation plans
  - Framework stability validated (zero critical bugs)
- Test Strategy (6,847 words):
  - Comprehensive testing approach for plugin system
  - 200+ test cases (unit, integration, security, performance, usability)
  - Risk-based prioritization (60% effort on security + rollback)
- Framework Dogfooding Assessment (10,500+ words):
  - Self-application success metrics (94,000+ words generated in 48 hours)
  - Multi-agent orchestration validation (+13 point quality improvements)
  - Process learnings and recommendations

**Deployment Documentation** (Week 4 - Oct 18):
- Plugin Deployment Plan (14,500 words):
  - Complete plugin lifecycle (installation, rollback, update, uninstall)
  - Transaction-based rollback (<5 second target)
  - Security validation (path isolation, YAML safety, dependency verification)
  - Operational procedures and troubleshooting guides
  - 3-phase rollout strategy (Internal → Early Adopters → General Availability)

**Planning Artifacts** (Week 1 - Oct 17):
- Inception Phase Plan (12,000+ words):
  - 4-week Inception roadmap (Oct 17 - Nov 14)
  - 6 gate criteria for Lifecycle Objective Milestone
  - Success metrics, deliverables, constraints
- Feature Ideas Backlog (2,500+ words):
  - 23 feature ideas captured for Elaboration phase
  - Research team/flows, backlog management, critical evaluation posture

#### Changed

**Directory Organization** (Week 2 - Oct 18):
- Reorganized `.aiwg/planning/contributor-workflow/` → `.aiwg/planning/sdlc-framework/`
  - Scope clarification: documenting AIWG plugin system (not implementing new contributor workflow)
  - Reality check: framework already operational, Inception documents existing system
- Separated baseline artifacts (`.aiwg/planning/`) from intermediate work (`.aiwg/working/`):
  - Baseline: SAD v1.0, ADRs, test docs
  - Working: SAD drafts, reviews, updates, enhancement plans
- Archived intermediate artifacts for historical reference

**Inception Phase Plan** (Week 2 - Oct 18):
- Updated to reflect plugin system documentation focus
- Clarified scope confusion (documenting existing vs building new)
- Marked "Functional Prototype" gate criterion as **ALREADY MET** (framework operational)
- Updated Week 3-4 activities (framework validation vs new implementation)

**Quality Scores** (Week 2 - Oct 18):
- Vision Document: 98/100 (pre-Inception baseline)
- Software Architecture Document: 82/100 (v0.1) → **95/100** (v1.0 synthesis)
- ADRs: 85-92/100 (avg 88.3/100)
- Enhancement Plans: 89-92/100 (avg 90.5/100)
- **Overall Average**: 91.3/100 (exceeds 80/100 target by +14.1%)

#### Fixed

**Scope Clarity** (Week 2 - Oct 18):
- Resolved confusion about "contributor workflow" vs "plugin system"
- Added explicit scope clarification section to Inception plan
- Confirmed AIWG framework IS the functional prototype (not new features to build)

**Directory Clutter** (Week 2 - Oct 18):
- Moved intermediate artifacts (drafts, reviews, updates) to `.aiwg/working/`
- Kept only baseline documents in `.aiwg/planning/`
- Clear separation improves navigation and artifact findability

**Gate Criteria Assumptions** (Week 2 - Oct 18):
- Validated "Functional Prototype" already met (framework operational)
- Updated gate criteria scoring (3/6 MET, 1/6 at 75%, 2/6 pending)
- Forecast: PASS or CONDITIONAL PASS on November 14 gate decision

### Performance Metrics (Inception Weeks 1-3)

**Velocity**:
- Weeks 1-3 completed in 2 days (Oct 17-18) - **13-19 days ahead of schedule**
- Architecture baseline: 2 days (vs estimated 5-7 days) → **60-70% faster**
- ADR extraction: 1 day (vs estimated 2-3 days) → **50-67% faster**
- Test documentation: 1 day (vs estimated 3-4 days) → **75% faster**
- **Overall**: 2-3x faster artifact generation via multi-agent orchestration

**Quality**:
- 22 documents created, 125,000+ words
- Average quality score: 91.3/100 (exceeds 80/100 target by +14.1%)
- Multi-agent review improvements: +10-15 points average
- Requirements traceability: 100% coverage

**Self-Application**:
- Framework successfully managed its own development (dogfooding successful)
- Multi-agent orchestration proven (4 parallel reviewers + synthesizer)
- Quality gates operational (markdown lint 9,505 violations, manifest sync 42 directories)
- Zero critical bugs blocking framework usage

### Gate Criteria Progress (as of 2025-10-18)

| Criterion | Priority | Status | Score |
|-----------|----------|--------|-------|
| 1. SDLC Artifact Completeness | CRITICAL | ⏳ 75% | 12/16 artifacts |
| 2. Requirements Traceability | CRITICAL | ✅ MET | 100% |
| 3. Functional Prototype | HIGH | ✅ MET | 100% (framework operational) |
| 4. Risk Mitigation | HIGH | ✅ MET | 100% (top 3 risks mitigated) |
| 5. Velocity Validation | MEDIUM | ⏳ Pending | Week 4 retrospective |
| 6. Stakeholder Alignment | MEDIUM | ⏳ Ongoing | Continuous validation |

**Overall**: 🟢 ON TRACK for PASS or CONDITIONAL PASS on November 14

### Multi-Agent Orchestration Pattern (Validated)

**Pattern**: Primary Author → Parallel Reviewers (4) → Documentation Synthesizer

**Evidence** (SAD v1.0 synthesis):
- Primary Draft (v0.1): 82/100 (8,500 words, ~8 hours)
- Security Review: 78→90/100 (+12 points, identified 5 vulnerabilities)
- Testability Review: 86→95/100 (+9 points, identified 4 testing gaps)
- Requirements Review: 92→96/100 (+4 points, validated 100% traceability)
- Documentation Review: 88→92/100 (+4 points, improved clarity)
- **Final Synthesis (v1.0)**: **95/100** (+13 points from v0.1, 12,847 words, ~6 hours)

**Result**: High-quality artifacts in 60-70% less time than manual solo drafting.

### Process Improvements Identified

**From Dogfooding Assessment**:
1. ✅ **Upfront Scope Clarity**: Define "documenting vs building" before drafting artifacts
2. ✅ **Directory Structure Confirmation**: Confirm organization in Week 1 planning
3. ✅ **Baseline vs Working Separation**: Immediate archiving after artifact finalization
4. ✅ **Gate Criteria Validation**: Validate assumptions early ("Is this already done?")
5. ✅ **Multi-Agent Pattern Documentation**: Formalize for reuse across all artifacts
6. ✅ **Feature Backlog Early Creation**: Standard Week 1 deliverable (prevents scope creep)

### Known Issues / Limitations

**Quality Gate Gaps** (acknowledged, addressed in enhancement plans):
1. No automated traceability validation (manual matrices) - Testability Plan Week 6-7
2. No automated link validation (broken cross-references possible) - Testability Plan Week 8
3. No automated template compliance checking - Deferred to Elaboration
4. No security scanning (SAST/DAST for Node.js code) - Security Plan Week 2
5. No performance regression testing - Deferred to Construction
6. No API integration testing (GitHub API) - Testability Plan Week 9-10

**Friction Points** (from dogfooding):
1. Markdown linting violations (9,505 to remediate) - Fixers available, CI/CD prevents new violations
2. Directory reorganization mid-Inception - Resolved, process improvements implemented
3. Agent context limitations (large files >12,000 words) - Use offset/limit, file splitting

### Next Steps (Week 4 - Oct 18 onwards)

**Remaining Inception Deliverables**:
- ✅ Plugin Deployment Plan - **COMPLETE** (Oct 18, 14,500 words)
- ⏳ CHANGELOG Entry - **IN PROGRESS** (this file)
- ⏳ Phase Retrospective (comprehensive reflection on Inception)
- ⏳ Gate Review Report (assess all 6 gate criteria, recommend decision)

**Elaboration Phase Prep**:
- Triage feature backlog (23 ideas → prioritize top 5-10)
- Security Enhancement Plan execution (4 weeks, 89 hours)
- Testability Enhancement Plan execution (10 weeks, 80 hours)
- Requirements elaboration (expand top features into use cases)

**November 14 Gate Decision**: Expected PASS or CONDITIONAL PASS

---

## Project Information

**Repository**: https://github.com/jmagly/ai-writing-guide
**Documentation**: `/home/manitcor/dev/ai-writing-guide/.aiwg/`
**Current Phase**: Inception (Weeks 1-3 complete, Week 4 in progress)
**Next Milestone**: Lifecycle Objective (LO) - November 14, 2025

### Contributing

See `.aiwg/intake/` for project intake documentation and `CLAUDE.md` for development guidance.

### SDLC Framework

This project uses the AIWG SDLC framework for complete lifecycle management:
- 58 specialized agents (Architecture Designer, Test Architect, Security Architect, etc.)
- 42+ commands (phase transitions, quality gates, traceability checks)
- 100+ templates (requirements, architecture, testing, security, deployment)
- Multi-agent orchestration patterns (Primary Author → Reviewers → Synthesizer)

For more information, see `agentic/code/frameworks/sdlc-complete/README.md`

---

**Changelog Started**: 2025-10-18 (Inception Week 4)
**Last Updated**: 2026-01-22 (Unreleased)
