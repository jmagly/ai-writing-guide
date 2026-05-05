# Factory AI Provider Parity Assessment

**Issue:** #1093
**Date assessed:** 2026-05-05
**Analyst:** Technical Researcher agent

---

## 1. Repo State

| Item | Value |
|------|-------|
| **Repo** | https://github.com/Factory-AI/factory |
| **Clone path** | `/tmp/aiwg-parity-2026-05/factory/` |
| **Commit assessed** | `709b1e3` (`docs: add CLI changelog entry for v0.118.0`, merged ~2026-05-04) |
| **OSS status** | **Documentation only.** No loader source code is published. The repo contains exclusively `.mdx` documentation pages. All behavioral findings are derived from docs. |
| **CLI version at assessment** | v0.118.0 (latest as of 2026-05-04) |
| **Docs source** | `docs/cli/configuration/` tree in cloned repo |

GRADE confidence for all findings derived from documentation pages: **MODERATE**. Claims are consistent across multiple doc files but cannot be verified against loader source code.

---

## 2. Discovery Mechanism

### 2.1 Droids (Agents)

- **Project scope:** `.factory/droids/` — top-level `.md` files only; subdirectories are ignored.
- **Personal scope:** `~/.factory/droids/` — same top-level-only constraint.
- **Override rule:** Project definitions override personal when names collide.
- **Scan depth:** Top-level only, explicitly stated. Quote: "The CLI scans these folders (top-level files only)."

Source: `docs/cli/configuration/custom-droids.mdx:13`

### 2.2 Skills

- **Project scope:** `.factory/skills/<skill-name>/SKILL.md` — directory per skill.
- **Personal scope:** `~/.factory/skills/<skill-name>/SKILL.md`
- **Compatibility alias:** `.agent/skills/<skill-name>/` — scanned for backward compatibility with `.agent` folder conventions (no further depth documented).
- **File name variants:** `SKILL.md` or `skill.mdx` both accepted.
- **Monorepo support:** Per-sub-project `.factory/skills/` folders supported, enabling skill co-location with service code.

Source: `docs/cli/configuration/skills.mdx:63–99`

### 2.3 Commands

- **Project scope:** `<repo>/.factory/commands/` — top-level only; nested folders ignored.
- **Personal scope:** `~/.factory/commands/`
- **File types accepted:** `*.md` Markdown files and files with a leading shebang (`#!`).
- **Slug generation:** Lowercase, spaces → `-`, non-URL-safe characters dropped. `.mdx` extension does not appear to be registered (only `*.md` and shebang files confirmed).
- **Override rule:** Workspace commands override personal commands of the same slug.

Source: `docs/cli/configuration/custom-slash-commands.mdx:15–27`

### 2.4 Rules

Factory has **no rules directory** equivalent to `.claude/rules/`. Rules are expressed via two mechanisms:
1. **AGENTS.md** — a project or monorepo-directory-level Markdown briefing read automatically by the Droid at session start.
2. **settings.json** — `commandAllowlist`, `commandDenylist`, and `hooksDisabled` act as behavioral constraints.

AGENTS.md discovery order:
1. Current working directory
2. Nearest parent up to repo root
3. Sub-folder files for monorepo path context
4. Personal override: `~/.factory/AGENTS.md`

Source: `docs/cli/configuration/agents-md.mdx:52–65`

### 2.5 Scan Summary

| Artifact | Path | Depth | Personal path |
|----------|------|-------|---------------|
| Droids (agents) | `.factory/droids/` | Top-level only | `~/.factory/droids/` |
| Skills | `.factory/skills/<name>/SKILL.md` | One-level directory per skill | `~/.factory/skills/<name>/SKILL.md` |
| Commands | `.factory/commands/` | Top-level only | `~/.factory/commands/` |
| Rules | N/A (AGENTS.md + settings) | — | `~/.factory/AGENTS.md` |
| AGENTS.md | Repo root upward walk | Multi-level upward walk | `~/.factory/AGENTS.md` |

---

## 3. Artifact Format

### 3.1 Droids (Agent frontmatter)

```markdown
---
name: droid-identifier         # required; lowercase, digits, hyphens, underscores
description: "What it does"   # optional; ≤500 chars; drives UI + auto-invocation
model: inherit                 # "inherit" or model id; use "custom:<id>" for BYOK
reasoningEffort: medium        # low | medium | high; ignored when model: inherit
tools: read-only               # category string OR array ["Read","Grep","Execute"]
---

System prompt body.
```

**Tool categories:** `read-only` (Read, LS, Grep, Glob) | `edit` (Create, Edit, ApplyPatch) | `execute` (Execute) | `web` (WebSearch, FetchUrl) | `mcp` (dynamic). `TodoWrite` always included automatically.

Source: `docs/cli/configuration/custom-droids.mdx:54–114`

### 3.2 Skills (SKILL.md frontmatter)

```markdown
---
name: skill-identifier
description: "What it does and when to use it"
user-invocable: true           # default true; set false to hide from /slash menu
disable-model-invocation: false # default false; set true for user-only invocation
---

Skill instructions.
```

Skills are directory-scoped. The directory name is the slug; the `name` field is display-only. Supporting files (schemas, checklists, reference docs) can be co-located inside the skill directory.

Source: `docs/cli/configuration/skills.mdx:103–139`

### 3.3 Commands (Markdown frontmatter)

```markdown
---
description: "Shown in /suggestions autocomplete"
argument-hint: "<branch-name>"
allowed-tools: []              # reserved; not yet implemented
---

Prompt body using $ARGUMENTS to reference user input.
```

Executable commands: no frontmatter; starts with a shebang line. Receives arguments as `$1`, `$2`, etc.

Source: `docs/cli/configuration/custom-slash-commands.mdx:34–53`

### 3.4 Plugin manifest

```json
{
  "name": "plugin-name",
  "description": "Description shown in plugin manager",
  "version": "1.0.0",
  "author": { "name": "team" }
}
```

Plugin directory structure: root-level `commands/`, `skills/`, `droids/`, `mcp.json`, `hooks/hooks.json`; manifest at `.factory-plugin/plugin.json`. Hooks inside a plugin reference their plugin root via `${DROID_PLUGIN_ROOT}`.

Source: `docs/cli/configuration/plugins.mdx:76–153`

---

## 4. Lifecycle Hooks

Factory's hook system is structurally near-identical to Claude Code's.

### 4.1 Supported Events

| Event | Trigger | Can Block? |
|-------|---------|-----------|
| `PreToolUse` | Before any tool call | Yes (exit code 2) |
| `PostToolUse` | After tool call completes | No |
| `UserPromptSubmit` | On user prompt submission, before model processing | No |
| `Notification` | When Droid sends a notification | No |
| `Stop` | When Droid finishes responding | No |
| `SubagentStop` | When a sub-droid task completes | No |
| `PreCompact` | Before context compaction | No |
| `SessionStart` | On new session creation or resume | No |
| `SessionEnd` | When session terminates | No |

Source: `docs/cli/configuration/hooks-guide.mdx:46–60`

### 4.2 Configuration Format

Hooks are stored in the `hooks` key of `settings.json` (either `~/.factory/settings.json` for global or `.factory/settings.json` for project scope). Matcher syntax: tool name string, pipe-separated OR pattern (`Edit|Create`), or `*` for all tools.

### 4.3 stdin Schema and Exit Contract

Hooks receive JSON via stdin: `tool_name`, `tool_input`, `cwd`. Missing vs Claude Code: `session_id`, `transcript_path`, `hook_event_name`, `tool_response`.

Exit code contract: `0` = continue, `2` = block (with optional `{ "decision": "block", "reason": "..." }` JSON body on stdout), other non-zero = logged error, workflow continues.

Environment variable: `$FACTORY_PROJECT_DIR` (vs Claude Code's `$CLAUDE_PROJECT_DIR`).

Source: `docs/cli/configuration/hooks-guide.mdx:105–124`; `.aiwg/references/platforms/factory-ai.md:419–456`

### 4.4 Plugin Hooks

Plugins ship hooks in a `hooks/hooks.json` file inside the plugin directory. Hooks reference plugin-local scripts via `${DROID_PLUGIN_ROOT}` (expands to the actual plugin install path at runtime).

Source: `docs/cli/configuration/plugins.mdx:98–131`

---

## 5. Current AIWG Deployment Behavior

What `aiwg use sdlc --provider factory` writes today, based on source and docs:

| Artifact type | Deploy target | Mechanism |
|---------------|---------------|-----------|
| Agents | `.factory/droids/` (top-level `.md` files) | `src/agents/agent-deployer.ts:399` |
| Commands | `.factory/commands/` | Inferred from CLAUDE.md table |
| Skills | `.factory/skills/<name>/SKILL.md` | CLAUDE.md table; directory layout preserved |
| Rules | Not deployed to Factory | No rules path exists; ruled noted as gap in `.aiwg/references/platforms/factory-ai.md:1124` |
| MCP config | Not deployed by default | Separate `aiwg mcp install factory` flow |

The internal reference document (`.aiwg/references/platforms/factory-ai.md`, last updated 2026-03-27) already catalogues known deployment gaps. The `docs/providers/skills-paths.md` flags the Factory skills path as "Unverified" — sourced from docs only.

**Frontmatter strip noted:** Recent commit `4558dd06` (`release(2026.5.0-rc.7): factory skill frontmatter strip`) indicates AIWG performs frontmatter transformation before deploying to Factory, presumably to remove or adapt Claude Code-specific fields.

---

## 6. Gaps vs. Latest Provider Mechanism

| # | Gap | Current AIWG behavior | Factory requirement | Impact |
|---|-----|----------------------|---------------------|--------|
| G1 | **Rules system absent** | `.factory/rules/` path does not exist; rules not deployed | No rules directory; rules content must go into AGENTS.md or droid system prompts | High — AIWG rules are not surfaced to Factory users |
| G2 | **Droids top-level only** | AIWG agent subdirectory layout potentially conflicts | `.factory/droids/` scans top-level `.md` only | Medium — AIWG agents organized in subdirectories will be missed if not flattened |
| G3 | **Tool name translation** | Unconfirmed whether AIWG translates tool names on deploy | Factory tool IDs differ: `Execute` (not `Bash`), `FetchUrl` (not `WebFetch`), no `Write` | High — mismatched tool names cause validation errors |
| G4 | **Hook env var mismatch** | AIWG hooks use `$CLAUDE_PROJECT_DIR` | Factory hooks require `$FACTORY_PROJECT_DIR` | Medium — hooks that reference project dir will fail silently |
| G5 | **stdin field differences** | AIWG hooks that depend on `session_id`, `transcript_path`, or `hook_event_name` | These fields are absent from Factory's hook stdin payload | Low-Medium — only affects hooks that read these specific fields |
| G6 | **Skill compatibility path `.agent/skills/`** | AIWG does not deploy to `.agent/skills/` | Factory scans `.agent/skills/` for backward compatibility | Low — workaround path, not primary; no action needed |
| G7 | **Plugin format not used** | AIWG deploys individual files | Factory's native distribution unit is a plugin bundle (`.factory-plugin/plugin.json` + component dirs) | Medium — AIWG misses plugin-level features (marketplace listing, `${DROID_PLUGIN_ROOT}` hook env var) |
| G8 | **AGENTS.md not generated** | AIWG generates rules; no AGENTS.md generator for Factory | Factory reads AGENTS.md as primary project context | Medium — Factory users lack SDLC-derived project context |
| G9 | **`skill.mdx` extension** | AIWG generates `SKILL.md` only | Factory accepts both `SKILL.md` and `skill.mdx` | Low — no action needed; `SKILL.md` works fine |
| G10 | **Plugin hooks `${DROID_PLUGIN_ROOT}`** | AIWG does not produce plugin-format hooks | Plugin hooks use `${DROID_PLUGIN_ROOT}` expansion, unavailable in standalone mode | Low — only relevant if AIWG ships as a plugin |

---

## 7. New Capabilities Not Yet Exploited

| # | Capability | Description | AIWG Opportunity |
|---|-----------|-------------|-----------------|
| N1 | **`disable-model-invocation` skill flag** | Prevents the Droid from auto-invoking a skill; user-only invocation | AIWG can mark SDLC workflow skills (e.g., `/flow-deploy-to-production`) as user-only to prevent accidental triggering mid-session |
| N2 | **`user-invocable: false` skill flag** | Hides skill from `/slash` menu; model-only background context | AIWG rules content (project context, conventions) can be packaged as non-invocable background skills rather than being dropped |
| N3 | **`reasoningEffort` per-droid** | Assigns reasoning depth per droid | AIWG quality tiers map directly: Elaboration artifact droids → `high`, Construction iteration droids → `low` |
| N4 | **Executable commands (shebang format)** | Factory commands can be shell scripts, not just Markdown prompts | AIWG can ship shell-script commands for CI/pipeline tasks (e.g., SDLC gate checks that invoke `droid exec`) |
| N5 | **`SessionStart` hook event** | Fires when a new session starts or resumes | AIWG pre-flight checks (`aiwg doctor`, `aiwg refresh --dry-run`) can run automatically via a `SessionStart` hook |
| N6 | **`SubagentStop` hook event** | Fires when a sub-droid completes | AIWG can log agent completion events for SDLC audit trails via this hook |
| N7 | **`PreCompact` hook event** | Fires before context compaction | AIWG can checkpoint progress or emit an activity-log entry before compaction loses context |
| N8 | **Personal `~/.factory/AGENTS.md`** | Cross-project personal override for project context | AIWG users can install a personal AGENTS.md from AIWG's SDLC conventions as a global engineering context |
| N9 | **Plugin marketplace hooks (`${DROID_PLUGIN_ROOT}`)** | Hook scripts bundled in a plugin reference their own directory | If AIWG ships as a Factory plugin, hook scripts can be self-contained with no path assumptions |
| N10 | **Monorepo per-service `.factory/skills/`** | Skills can live alongside each sub-project | AIWG can deploy domain-specific skills to service subdirectories in monorepo layouts |

---

## 8. Cross-Port Candidates

Features on other providers that could be back-ported into the Factory deployment:

| # | Source provider | Feature | Factory equivalent / action |
|---|----------------|---------|----------------------------|
| CP1 | Claude Code | Path-scoped rules (CLAUDE.md hierarchy) | Package AIWG rules as `user-invocable: false` background skills using the N2 pattern; this is the closest available equivalent |
| CP2 | Claude Code | `allowed-tools` with glob patterns (`Bash(git log:*)`) | Use Factory's explicit tool array in droid frontmatter; no glob pattern support — enumerate tools explicitly |
| CP3 | OpenClaw | Behaviors (`~/.openclaw/behaviors/`) | Factory has `SessionStart`/`Stop`/`SubagentStop` hooks (N5, N6, N7) that partially cover behavior-like triggers; no file/time event system |
| CP4 | Claude Code | `color`/`icon` fields in agent frontmatter | No Factory equivalent; omit on deploy |
| CP5 | Claude Code / Hermes | Deep recursive skill discovery | Factory is one-level-per-skill-directory; AIWG skills are already one-level, so no action needed for skills; droids require flat layout |
| CP6 | Factory AI | Plugin format for AIWG framework bundles | AIWG currently deploys individual files; adopting plugin format would enable `/plugins` marketplace listing and `${DROID_PLUGIN_ROOT}` hook paths — candidate for a future `aiwg package-plugin --provider factory` command |

---

## 9. Citations

All claims in this document are sourced from:

| Source | Location | GRADE |
|--------|----------|-------|
| `docs/cli/configuration/custom-droids.mdx` | Cloned repo `/tmp/aiwg-parity-2026-05/factory/` at commit `709b1e3` | MODERATE (vendor docs, no source code) |
| `docs/cli/configuration/skills.mdx` | Same clone | MODERATE |
| `docs/cli/configuration/custom-slash-commands.mdx` | Same clone | MODERATE |
| `docs/cli/configuration/hooks-guide.mdx` | Same clone | MODERATE |
| `docs/cli/configuration/agents-md.mdx` | Same clone | MODERATE |
| `docs/cli/configuration/settings.mdx` | Same clone | MODERATE |
| `docs/cli/configuration/plugins.mdx` | Same clone | MODERATE |
| `docs/changelog/release-notes.mdx` | Same clone (v0.118.0 entry) | MODERATE |
| `.aiwg/references/platforms/factory-ai.md` | AIWG repo; last updated 2026-03-27 | HIGH (AIWG-authored reference, internally consistent) |
| `docs/providers/skills-paths.md` | AIWG repo | HIGH |
| `docs/providers/capability-matrix.md` | AIWG repo | HIGH |
| `src/agents/agent-deployer.ts:399` | AIWG repo | HIGH (source code) |
| CLAUDE.md "Multi-Platform Support" table | AIWG repo | HIGH |
| `git log` commit `4558dd04` message | AIWG repo | HIGH |

**Evidence gaps / items requiring live verification:**
- Whether `aiwg use sdlc --provider factory` currently flattens subdirectory agents into `.factory/droids/` (only the path constant is confirmed; flattening logic not inspected).
- Whether tool name translation from Claude Code (`Bash`, `WebFetch`) to Factory (`Execute`, `FetchUrl`) is implemented in the deployment pipeline.
- Whether the `frontmatter strip` in commit `4558dd04` covers all Factory-incompatible fields (`color`, `icon`, `allowed-tools` glob patterns).
- Whether `.agent/skills/` compatibility scanning is still active in Factory CLI v0.118.0 (noted in docs but may be removed without changelog entry).
