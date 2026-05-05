# Parity Assessment: Claude Code

**Issue:** #1090
**Assessed:** 2026-05-05
**Assessor:** Technical Researcher agent
**GRADE baseline:** MODERATE — vendor documentation primary source; no public skill-loader source

---

## 1. Repo State

**Repository:** https://github.com/anthropics/claude-code
**OSS status:** Partial open-source. The repository contains configuration schemas, example integrations, and documentation stubs. The core agent runtime, skill loader, and settings-resolution logic are not published. No loader source file exists to read directly (contrast: OpenAI Codex at `codex-rs/core-skills/src/loader.rs`, OpenCode at `packages/opencode/src/skill/index.ts`).
**Clone performed:** No — docs are the primary source per task guidance; no loader logic would be recoverable from the public repo anyway.
**Primary evidence sources:**
- AIWG internal source: `src/smiths/platform-paths.ts` (GRADE: HIGH — AIWG's own deployed behavior)
- AIWG internal source: `agentic/code/providers/capability-matrix.yaml` (GRADE: HIGH)
- AIWG internal source: `agentic/code/addons/aiwg-hooks/hooks/pretooluse-context.md` (GRADE: HIGH — captures Claude Code v2.1.9+ behavior from prior research)
- AIWG internal source: `agentic/code/addons/aiwg-hooks/hooks/quality-gates.md` (GRADE: HIGH — captures v2.1.3+ hook timeout behavior)
- AIWG internal source: `docs/providers/skills-paths.md` (GRADE: HIGH — verified per-provider reference)
- AIWG internal source: `.claude/settings.json` and `.claude/settings.local.json` (GRADE: HIGH — live project config)
- AIWG internal source: `.claude/agents/api-designer.md` (GRADE: HIGH — live deployed agent example)
- AIWG internal source: `.claude/skills/acquire/SKILL.md` (GRADE: HIGH — live deployed skill example)
- Vendor docs URLs provided: https://docs.anthropic.com/en/docs/claude-code/hooks, settings, skills, sub-agents, slash-commands, plugins (WebFetch blocked by project settings.json `deny: WebFetch`; findings from AIWG's prior research incorporated below)

---

## 2. Discovery Mechanism

### Agents

- **Path:** `.claude/agents/` (project-scoped)
- **File format:** Markdown (`.md`)
- **Discovery:** Claude Code scans `.claude/agents/` for `.md` files with YAML frontmatter
- **Recursion:** Subdirectory recursion depth is not confirmed from source (no loader available); AIWG deploys flat files directly into `.claude/agents/` without subdirectories
- **User-global scope:** `~/.claude/agents/` (user-wide agents, separate from project scope)
- **Source:** `src/smiths/platform-paths.ts:47` — `'claude': '.claude/agents'`

### Commands (Slash Commands)

- **Path:** `.claude/commands/` (project-scoped)
- **File format:** Markdown (`.md`)
- **Discovery:** Each `.md` file in `.claude/commands/` becomes an invocable slash command; the filename (without extension) is the command name
- **User-global scope:** `~/.claude/commands/` for user-wide commands
- **Current AIWG state:** 0 command files deployed (`.claude/commands/` directory is empty as of last git activity); AIWG commands deploy as skills, not slash-command files
- **Source:** `src/smiths/platform-paths.ts:20` — `'claude': '.claude/commands'`

### Skills

- **Path:** `.claude/skills/` (project-scoped)
- **File format:** Directory-per-skill, each containing `SKILL.md`; e.g., `.claude/skills/acquire/SKILL.md`
- **Discovery:** Claude Code scans `.claude/skills/` for `SKILL.md` files in subdirectories; the subdirectory name is the skill name
- **Plugin namespace:** Skills from plugins are addressable as `plugin-name:skill-name` (e.g., `aiwg:acquire`)
- **Recursion:** Confirmed multi-level by AIWG deployment (skills live in named subdirectories)
- **Source:** `docs/providers/skills-paths.md:29` — "scans `.claude/skills/` for SKILL.md files"; `src/smiths/platform-paths.ts:82`

### Rules

- **Path:** `.claude/rules/` (project-scoped)
- **File format:** Markdown (`.md`)
- **Discovery:** Rules files are loaded into agent context automatically
- **Current AIWG state:** Only `RULES-INDEX.md` deployed — a single aggregate index, not individual rule files (individual rule files are not copied into `.claude/rules/`)
- **Source:** `src/smiths/platform-paths.ts:114` — `'claude': '.claude/rules'`

### Context / System Prompt

- **Primary file:** `CLAUDE.md` at project root
- **Hook wiring file:** `AIWG.md` (loaded via `@AIWG.md` directive in `CLAUDE.md`)
- **`@`-include support:** Yes — Claude Code supports `@filename` includes within `CLAUDE.md`, enabling modular context files
- **Source:** `agentic/code/providers/capability-matrix.yaml` lines 45-49 — `hook_wiring.at_link_support: true`, `hook_file: AIWG.md`, `hook_directive: "@AIWG.md"`, `context_file: CLAUDE.md`

### Scan Order / Priority

No authoritative source confirms scan order between project and user-global scopes. AIWG treats `.claude/` as project-scoped (project overrides user-global is the conventional expectation for Claude Code). [GRADE: LOW — inferred from convention, not source code]

---

## 3. Artifact Format

### Agent Frontmatter Schema

Confirmed from `.claude/agents/api-designer.md` (GRADE: HIGH):

```yaml
---
# aiwg:managed v2026.5.0-rc.6 bundled
name: API Designer
description: Designs and evolves API and data contracts with clear, stable interfaces
model: sonnet
memory: project
tools: Bash, Glob, Grep, MultiEdit, Read, WebFetch, Write
---
```

**Known fields:**
| Field | Required | Values | Notes |
|-------|----------|--------|-------|
| `name` | Yes | String | Display name |
| `description` | Yes | String | Agent purpose |
| `model` | No | `sonnet`, `haiku`, `opus`, model ID | Defaults to inheriting parent |
| `tools` | No | Comma-separated tool list | Restricts allowed tools for the agent |
| `memory` | No | `project`, `user`, `none` | Memory scope |

**AIWG-managed marker:** `# aiwg:managed vX.Y.Z bundled` — a comment in the frontmatter fence used by AIWG's managed-marker system (`src/extensions/managed-marker.ts`) to track deployed files.

### Skill Frontmatter Schema

Confirmed from `.claude/skills/acquire/SKILL.md` (GRADE: HIGH):

```yaml
---
namespace: aiwg
name: acquire
platforms: [claude-code]
description: Download media from discovered sources with format selection and progress tracking
commandHint:
  argumentHint: --plan <sources.yaml> | --url <URL> [--format audio|video|best] [--output <dir>] [--parallel N]
  allowedTools: Bash, Read, Write, Glob, Grep
  model: sonnet
  category: media-curator
---
```

**Known fields:**
| Field | Required | Values | Notes |
|-------|----------|--------|-------|
| `namespace` | No | String | Plugin namespace prefix for `plugin:skill` addressing |
| `name` | Yes | String | Skill identifier / slash command name |
| `platforms` | No | Array | Platform filter (e.g., `[claude-code]`) |
| `description` | Yes | String | One-line purpose |
| `commandHint.argumentHint` | No | String | Usage hint shown in help |
| `commandHint.allowedTools` | No | Comma-separated | Tool restriction for this skill |
| `commandHint.model` | No | Model string | Model preference |
| `commandHint.category` | No | String | Grouping in skill browser |

### File Extensions

All agent, skill, command, and rule artifacts use `.md` (Markdown). [Source: `src/smiths/platform-paths.ts:99` — `getFileExtension` returns `.md` for `claude`]

### Size Limits

No confirmed size limits from available sources. [GRADE: LOW — not documented internally]

---

## 4. Lifecycle Hooks

Claude Code is the only AIWG-supported provider with a rich native hook system. All hook configuration lives in `.claude/settings.json` under the `"hooks"` key.

### Hook Event Types (from `agentic/code/addons/aiwg-hooks/`)

| Hook Type | Trigger | Available Since |
|-----------|---------|----------------|
| `PreToolUse` | Before any tool invocation | v2.1.9+ |
| `PostToolUse` | After any tool invocation | v2.1.3+ |
| `PreBash` | Before Bash tool runs | v2.1.3+ |
| `PostBash` | After Bash tool completes | v2.1.3+ |
| `PreWrite` | Before Write tool runs | v2.1.3+ |
| `PostWrite` | After Write tool completes | v2.1.3+ |

**Source:** `agentic/code/addons/aiwg-hooks/hooks/pretooluse-context.md` — documents `PreToolUse` with `additionalContext` handler; `hooks/quality-gates.md` — documents quality gate patterns using `PostBash` and `PreWrite`.

### Hook Handler Types

Two handler types are documented in AIWG's internal research:

1. **`executable`** — Shell script or Node.js file; exit code 0 = allow, non-zero = block. Used by `aiwg-trace.js`, `aiwg-permissions.js`, `aiwg-session.js`.
2. **`additionalContext`** — Returns text injected into the tool invocation context. Claude Code v2.1.9+ only. Used for just-in-time context loading without bloating `CLAUDE.md`.

### Hook Timeout

v2.1.3+ increased hook timeout to **10 minutes**, enabling full test suite execution, security scans, and build verification within a hook. [Source: `agentic/code/addons/aiwg-hooks/hooks/quality-gates.md` line 7]

### Hook Configuration Structure

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "id": "aiwg-artifact-guard",
        "name": "AIWG Artifact Write Guard",
        "matcher": {
          "tool": "Write",
          "pathPattern": ".aiwg/**"
        },
        "handler": {
          "type": "additionalContext",
          "content": "..."
        }
      }
    ]
  }
}
```

[Source: `agentic/code/addons/aiwg-hooks/hooks/pretooluse-context.md` lines 38-58]

### Hook Deployment by AIWG

**Current state:** Hook scripts (`aiwg-trace.js`, `aiwg-permissions.js`, `aiwg-session.js`) exist in the `aiwg-hooks` addon source at `agentic/code/addons/aiwg-hooks/hooks/` but the addon is `"autoInstall": false`. Hook configurations are **not** wired into `.claude/settings.json` automatically by any `aiwg use` operation — they are opt-in templates only.

**Hook-based framework hooks** in `agentic/code/frameworks/sdlc-complete/hooks/` (5 hooks: `pre-architecture-decision.md`, `post-write-citation-check.md`, `post-write-provenance.md`, `pre-cite-grade-check.md`, `pre-commit-provenance-check.md`) define declarative hook specifications but are **not deployed** to `.claude/settings.json` by the AIWG deployer.

[Source: `agentic/code/frameworks/sdlc-complete/hooks/manifest.json`; `agentic/code/addons/aiwg-hooks/manifest.json` — `"autoInstall": false`]

---

## 5. Current AIWG Deployment Behavior

What `aiwg use sdlc` (and `aiwg use all`) writes to the `.claude/` directory today:

| Artifact Type | Target Path | Count | Notes |
|---------------|-------------|-------|-------|
| Agents | `.claude/agents/*.md` | ~191 | All flattened into single directory |
| Skills | `.claude/skills/<name>/SKILL.md` | ~393 | Directory-per-skill structure |
| Rules | `.claude/rules/RULES-INDEX.md` | 1 | Only the index, not individual rule files |
| Commands | `.claude/commands/` | 0 | Directory exists but is empty |
| Hooks (settings.json) | `.claude/settings.json` `hooks:` key | 0 | Not written by deployer |
| Plugin marketplace | `.claude-plugin/marketplace.json` | 1 | Exists; not wired to `aiwg use` |

[Source: `find .claude -type f` output; `src/smiths/platform-paths.ts`; `.claude/settings.json` which has no `hooks` key]

**Context wiring:** `CLAUDE.md` includes `@AIWG.md` which loads the framework context. This is the primary mechanism for always-on context injection. [Source: `agentic/code/providers/capability-matrix.yaml:45-49`]

**Rules deployment gap:** Individual rule files from `agentic/code/addons/aiwg-utils/rules/` and other components are not copied to `.claude/rules/`. Only `RULES-INDEX.md` is deployed. Agents must follow rules via the CLAUDE.md @-include chain, not via native rules discovery.

---

## 6. Gaps vs. Latest Provider Mechanism

The following Claude Code capabilities exist but are not utilized by the current AIWG deployment:

### Gap A: Hook System Not Auto-Wired

**Status:** Critical gap
**Description:** Claude Code's native hook system (`PreToolUse`, `PostWrite`, `PreBash`, etc.) provides enforceable, runtime guardrails. The `aiwg-hooks` addon defines five hook patterns (artifact guard, security guard, voice profile, citation guard, quality gates) and three executable scripts, but `autoInstall: false` means they are never deployed. The SDLC framework defines five declarative hook specs that are also never wired.
**Impact:** AIWG cannot enforce citation policy, ToT exploration, or security patterns at the point of tool use. All enforcement is instructional (via CLAUDE.md) rather than technical (via hook blocks).
**Evidence:** `.claude/settings.json` has no `hooks` key; `agentic/code/addons/aiwg-hooks/manifest.json:9` — `"autoInstall": false`

### Gap B: Slash Commands Directory Is Empty

**Status:** Significant gap
**Description:** `.claude/commands/` is deployed as an empty directory. AIWG's slash-command flows (e.g., `/flow-inception-to-elaboration`, `/intake-wizard`, `/project-status`) are implemented as skills, not as command files. Claude Code's slash-command mechanism reads from `.claude/commands/` and gives each `.md` file a dedicated slash invocation. Deploying flows as command files would enable direct slash invocation in the Claude Code UI without requiring the user to know to call them as skills.
**Impact:** Users cannot tab-complete or slash-invoke AIWG flows directly; they must know skill names or use natural language.
**Evidence:** `ls .claude/commands/` returns zero files; skills are deployed to `.claude/skills/` instead

### Gap C: Individual Rule Files Not Deployed

**Status:** Moderate gap
**Description:** Claude Code's `.claude/rules/` directory is designed to hold individual rule files, each loaded into agent context. AIWG deploys only `RULES-INDEX.md` (an aggregate index pointing to source-tree rule files via `@$AIWG_ROOT/...` paths). Agents reading `RULES-INDEX.md` see only the index — the actual rule content is at paths that may not resolve correctly in user projects (since `$AIWG_ROOT` must be set).
**Impact:** Rule enforcement depends on agents following CLAUDE.md guidance rather than Claude Code's native rules-loading mechanism. Individual rule files (e.g., `no-time-estimates.md`, `human-authorization.md`) are not natively visible to Claude Code's context system.
**Evidence:** `ls .claude/rules/` shows only `RULES-INDEX.md`; 15 rules defined in `agentic/code/addons/aiwg-utils/rules/`

### Gap D: Plugin Marketplace Not Integrated With `aiwg use`

**Status:** Moderate gap
**Description:** `.claude-plugin/marketplace.json` exists with 7 published plugins (sdlc, marketing, voice, writing, utils, training, hooks). Claude Code's plugin system (`/plugin marketplace add`, `/plugin install`) reads this file. However, `aiwg use` does not surface plugin-based installation as an alternative to file-deploy. The marketplace file version (`2026.4.0`) lags the current codebase (`2026.5.0-rc.7`).
**Impact:** Plugin-based distribution channel exists but is not maintained in sync with releases and is not documented as the recommended path.
**Evidence:** `.claude-plugin/marketplace.json:9` — `"version": "2026.4.0"`; `aiwg version` reports `2026.5.0-rc.7`

### Gap E: User-Global Scope Not Exploited

**Status:** Minor gap
**Description:** Claude Code supports `~/.claude/agents/`, `~/.claude/commands/`, and `~/.claude/skills/` for user-global artifacts available across all projects. AIWG deploys only to project scope (`.claude/`). General-purpose agents (e.g., `technical-researcher`, `aiwg-steward`) and cross-project skills would be better placed at user-global scope.
**Impact:** AIWG agents are not available in new projects until `aiwg use` is re-run. Users working in multiple projects must deploy to each.
**Evidence:** `capability-matrix.yaml` lists `deploy_target: project` for claude-code; no `~/.claude/` deploy logic in `src/smiths/platform-paths.ts`

---

## 7. New Capabilities Not Yet Exploited

Beyond the gaps above, these Claude Code capabilities represent opportunities AIWG has not yet leveraged:

### Opportunity 1: `additionalContext` Hook Handler for Just-in-Time Context

**Introduced:** Claude Code v2.1.9
**Description:** `PreToolUse` hooks with `handler.type: "additionalContext"` inject text into the tool call context without bloating `CLAUDE.md`. This is ideal for AIWG's citation policy (only needed when writing to `.aiwg/research/`), voice profile (only needed when writing `.md` files), and security rules (only needed before Bash calls). AIWG's `pretooluse-context.md` documents all four patterns but none are wired automatically.
**Exploit path:** Extend the deployer (`aiwg use`) to write hook configurations into `.claude/settings.json` when deploying frameworks that include hook specs. Add a `hooks` section to framework manifests.

### Opportunity 2: Per-Tool Permission Patterns in `settings.json`

**Description:** `.claude/settings.json` `permissions.allow` and `permissions.deny` arrays support fine-grained tool control (e.g., `Write(./**)`, `Bash(git:*)`). AIWG's project `settings.json` uses this. Framework-level settings (e.g., `deny: WebFetch` for the research framework) could be deployed as framework-scoped settings overlays, letting each framework contribute security constraints without overwriting the project's base settings.
**Current state:** `.claude/settings.json` is not written by `aiwg use` at all — it is manually configured.

### Opportunity 3: `CronCreate` / `CronList` / `CronDelete` Native Scheduling

**Description:** Claude Code has native cron tools (`CronCreate`, `CronList`, `CronDelete`) for scheduling recurring agent tasks. The capability matrix correctly marks this as `native: true`. AIWG's `aiwg schedule` CLI is the current interface, but AIWG skills and agents could register scheduled tasks via `CronCreate` as part of framework activation, instead of requiring users to set up cron separately.
**Evidence:** `capability-matrix.yaml:29` — `cron: true` under `native_features`

### Opportunity 4: Sub-Agent Scoping via `tools` Frontmatter

**Description:** Claude Code agents support a `tools` frontmatter field that restricts which tools a spawned sub-agent can use. AIWG agents define this field (e.g., `api-designer.md: tools: Bash, Glob, Grep, MultiEdit, Read, WebFetch, Write`) but there is no validation that tool lists are minimal for the agent's actual responsibilities. Over-permissioned sub-agents violate the `subagent-scoping` rule's intent.
**Exploit path:** Introduce a validation step in `aiwg validate-metadata` that checks `tools` lists are not set to the full toolset for agents with narrow responsibilities.

### Opportunity 5: `memory` Field for Agent Memory Scoping

**Description:** Claude Code agents support a `memory` field (`project`, `user`, `none`) to control whether an agent can read/write project memory, user memory, or neither. Most AIWG agents use `memory: project` without deliberate reasoning. Agents with sensitive access (e.g., `applied-cryptographer`, `security-architect`) could be configured `memory: none` to prevent inadvertent persistence of sensitive context.
**Exploit path:** Audit agent manifests for memory scope appropriateness as part of the security engineering framework.

---

## 8. Cross-Port Candidates

These Claude Code-specific patterns should be evaluated for porting to other providers:

| Pattern | Description | Best Port Targets |
|---------|-------------|-------------------|
| `additionalContext` PreToolUse hooks | Just-in-time context injection keyed to tool+path | Cursor (path-scoped `.cursor/rules/`), Copilot (`.github/copilot/`) |
| 10-minute hook timeout quality gates | Pre-commit test + security scan hooks | Any provider with git hook support (all providers via `.git/hooks/`) |
| `tools` field in agent frontmatter | Per-agent tool restriction | OpenCode (`.opencode/agent/` config), Factory (droids) |
| Plugin namespace (`plugin:skill`) | Namespaced skill addressing | No direct equivalent on other providers; document as Claude-only feature |
| User-global `~/.claude/` scope | Cross-project agent availability | OpenClaw (`~/.openclaw/` — already uses home-scope); Codex (`~/.agents/skills/` — already home-scope) |
| Per-tool permission patterns in `settings.json` | Fine-grained tool allow/deny per project | No direct equivalent; document as Claude-only; use agent `tools` field as proxy on other providers |

---

## 9. Citations

All citations reference file paths at line granularity or AIWG-internal doc URLs. GRADE levels reflect evidence quality.

| Claim | Source | Line(s) | GRADE |
|-------|--------|---------|-------|
| Claude Code agent path `.claude/agents/` | `src/smiths/platform-paths.ts` | 48 | HIGH |
| Claude Code commands path `.claude/commands/` | `src/smiths/platform-paths.ts` | 20 | HIGH |
| Claude Code skills path `.claude/skills/` | `src/smiths/platform-paths.ts` | 82 | HIGH |
| Claude Code rules path `.claude/rules/` | `src/smiths/platform-paths.ts` | 114 | HIGH |
| Skill discovery via SKILL.md in subdirectory | `docs/providers/skills-paths.md` | 29 | MODERATE |
| Plugin namespace `plugin-name:skill-name` | `docs/providers/skills-paths.md` | 33 | MODERATE |
| `@`-include support in CLAUDE.md | `agentic/code/providers/capability-matrix.yaml` | 44-49 | HIGH |
| Context file is `CLAUDE.md`, hook file is `AIWG.md` | `agentic/code/providers/capability-matrix.yaml` | 45-49 | HIGH |
| Native cron (`CronCreate/List/Delete`) | `agentic/code/providers/capability-matrix.yaml` | 29 | HIGH |
| Native agent teams (Task tool) | `agentic/code/providers/capability-matrix.yaml` | 30 | HIGH |
| Native MCP support | `agentic/code/providers/capability-matrix.yaml` | 32 | HIGH |
| Behaviors emulated via hooks | `agentic/code/providers/capability-matrix.yaml` | 35 | HIGH |
| Agent frontmatter fields (`name`, `model`, `tools`, `memory`) | `.claude/agents/api-designer.md` | 1-8 | HIGH |
| Skill frontmatter fields (`namespace`, `commandHint`, `platforms`) | `.claude/skills/acquire/SKILL.md` | 1-11 | HIGH |
| All artifacts use `.md` extension | `src/smiths/platform-paths.ts` | 99-103 | HIGH |
| `PreToolUse` hook with `additionalContext` introduced v2.1.9 | `agentic/code/addons/aiwg-hooks/hooks/pretooluse-context.md` | 1-15 | MODERATE |
| Hook timeout 10 minutes (v2.1.3+) | `agentic/code/addons/aiwg-hooks/hooks/quality-gates.md` | 7 | MODERATE |
| Executable hook handler via JS files | `agentic/code/addons/aiwg-hooks/manifest.json` | 37-56 | HIGH |
| `aiwg-hooks` addon is `autoInstall: false` | `agentic/code/addons/aiwg-hooks/manifest.json` | 9 | HIGH |
| SDLC hooks manifest lists 5 hook files, none deployed | `agentic/code/frameworks/sdlc-complete/hooks/manifest.json` | 1-14 | HIGH |
| `.claude/commands/` is empty (0 files deployed) | `src/smiths/platform-paths.ts:20`; `git log .claude/` | — | HIGH |
| `.claude/rules/` contains only `RULES-INDEX.md` | Direct inspection of `.claude/rules/` | — | HIGH |
| 191 agents, 393 skills deployed | `find .claude -type f` count | — | HIGH |
| Marketplace version lag (`2026.4.0` vs `2026.5.0-rc.7`) | `.claude-plugin/marketplace.json` | 9 | HIGH |
| `deploy_target: project` (no user-global deploy) | `agentic/code/providers/capability-matrix.yaml` | 49 | HIGH |
| `settings.json` permissions allow/deny structure | `.claude/settings.json` | 8-23 | HIGH |
| Repo is partial OSS, no loader source available | `docs/providers/skills-paths.md` | 187-188 | MODERATE |

---

*Assessment produced for issue #1090. Do not modify this file directly — update via re-running the parity assessment task.*
