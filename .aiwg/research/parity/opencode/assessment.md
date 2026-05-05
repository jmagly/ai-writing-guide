# OpenCode Parity Assessment
**Issue**: #1095
**Date**: 2026-05-05
**Analyst**: Technical Researcher (automated)
**Commit assessed**: `25ecf0af6b8a022d284f9a5a9e9155ced6a37041` (2026-05-05 10:39 CDT — fix: retry server_is_overloaded errors #25888)

---

## 1. Repo State

| Field | Value |
|-------|-------|
| Repository | https://github.com/sst/opencode |
| Clone alias | anomalyco/opencode redirects here (confirmed) |
| License | MIT |
| Primary language | TypeScript (Bun runtime) |
| Monorepo layout | `packages/opencode/` — main CLI/TUI package |
| OSS status | Fully open source — complete loader and runtime source available |
| Last commit assessed | `25ecf0af` 2026-05-05 — fix: retry server_is_overloaded errors (#25888) |
| Clone path | `/tmp/aiwg-parity-2026-05/opencode/` |
| Shallow | yes (`--depth 1`) |

No license ambiguity. All loader code is in `packages/opencode/src/` and is readable without build.

---

## 2. Discovery Mechanism

### 2.1 Skills — File-Based (primary artifact type)

Source: `packages/opencode/src/skill/index.ts`

**Filename required**: `SKILL.md` (exact, case-sensitive — `Glob.scan` on Linux is case-sensitive)

**Discovery runs in four sequential passes** (`discoverSkills`, lines 146–204):

#### Pass 1 — External "cross-platform" paths (global scope)

Pattern: `skills/**/SKILL.md`  
Controlled by: `Flag.OPENCODE_DISABLE_EXTERNAL_SKILLS` (env `OPENCODE_DISABLE_EXTERNAL_SKILLS`)

- `~/.claude/skills/**/SKILL.md` — unless `Flag.OPENCODE_DISABLE_CLAUDE_CODE_SKILLS` is also set
- `~/.agents/skills/**/SKILL.md`

Both are scanned with `dot: true` (hidden directories included). (`index.ts:157–172`)

#### Pass 2 — External "cross-platform" paths (project walk-up)

Pattern: `skills/**/SKILL.md`, `dot: true`

Walks up from `directory` to `worktree` checking for `.claude/` and `.agents/` directories at each level. First discovered set wins per level. (`index.ts:167–173`)

This means `.claude/skills/**/SKILL.md` in *any ancestor directory* up to the git worktree root is picked up automatically — without any opencode-specific configuration.

#### Pass 3 — OpenCode config directories

Pattern: `{skill,skills}/**/SKILL.md` (no `dot` flag — hidden dirs excluded unless file system makes them visible)

`config.directories()` returns (`config/paths.ts:23–41`):
1. `Global.Path.config` (XDG config dir, e.g., `~/.config/opencode/`)
2. Walk up from `directory` to `worktree`: any `.opencode/` directory found at each level
3. Walk up from `$HOME` to `$HOME`: `~/.opencode/`
4. `Flag.OPENCODE_CONFIG_DIR` if set

For a project with `.opencode/` at root, this resolves to `.opencode/`.  
The glob `{skill,skills}/**/SKILL.md` within `.opencode/` matches:
- `.opencode/skill/foo/SKILL.md`
- `.opencode/skills/foo/SKILL.md`

The `**` glob is recursive with no stated depth limit (Bun `Glob.scan` recursion). (`index.ts:176–179`)

#### Pass 4 — `opencode.jsonc` explicit paths

For each path listed under `skills.paths` in config, scan `**/SKILL.md` (full recursive, no constraint).
For each URL under `skills.urls`, fetch remote `index.json`, download referenced SKILL.md files to cache. (`index.ts:181–198`, `skill/discovery.ts`)

#### Deduplication

All passes accumulate into a single `Set<string>`, so cross-path duplicates are silently dropped. A warning is logged if two parsed skills share the same `name` field (line 99–105).

#### Scan options summary

| Option | Pass 1&2 (external) | Pass 3 (config dirs) | Pass 4 (explicit paths) |
|--------|--------------------|--------------------|------------------------|
| `dot` | `true` | not set (false) | not set (false) |
| `symlink` | `true` | `true` | `true` |
| `absolute` | `true` | `true` | `true` |
| Recursion | unlimited (`**`) | unlimited (`**`) | unlimited (`**`) |

### 2.2 Agents — File-Based (confirmed — prior memory was incorrect)

Source: `packages/opencode/src/config/agent.ts:110–140`

**Prior AIWG memory stated**: "agents are config-only (opencode.jsonc) — `.opencode/agent/` does NOT exist as a discovered file path."

**Correction (HIGH confidence — source code)**: `ConfigAgent.load(dir)` is called for every directory returned by `config.directories()` (config.ts:574). This function (`agent.ts:110–140`) runs:

```
Glob.scan("{agent,agents}/**/*.md", { cwd: dir, absolute: true, dot: true, symlink: true })
```

This means `.opencode/agent/**/*.md` files ARE scanned and loaded as agent definitions. Name is derived by stripping path prefix patterns `["/.opencode/agent/", "/.opencode/agents/", "/agent/", "/agents/"]` (`agent.ts:129`).

Additionally, `ConfigAgent.loadMode(dir)` scans `{mode,modes}/*.md` (not recursive — only one level deep, `agent.ts:144`). Files in `.opencode/mode/` and `.opencode/modes/` are loaded as agents with `mode: "primary"` forced.

**AIWG deployment to `.opencode/agent/` is therefore valid and does work.** The comment in `src/smiths/platform-paths.ts:54` ("Agents are config-only in OpenCode") is stale.

### 2.3 Commands — File-Based (confirmed — prior memory was partially incorrect)

Source: `packages/opencode/src/config/command.ts:27–62`

`ConfigCommand.load(dir)` is called for every config directory (config.ts:573). It runs:

```
Glob.scan("{command,commands}/**/*.md", { cwd: dir, absolute: true, dot: true, symlink: true })
```

This means `.opencode/command/**/*.md` and `.opencode/commands/**/*.md` ARE scanned.

Name extraction strips `["/.opencode/command/", "/.opencode/commands/", "/command/", "/commands/"]` (`command.ts:46`).

**AIWG deploying `commands: ''` (empty) for OpenCode is incorrect.** Commands do have a file-based discovery path.

Command schema (`command.ts:17–23`):
```
template: string       (body content — required)
description?: string
agent?: string
model?: ConfigModelID
subtask?: boolean
```

### 2.4 Rules — No File-Based Discovery (confirmed)

There is no code in the opencode source that scans `.opencode/rule/` or any equivalent directory for "rules." The concept does not exist in opencode's model.

AIWG's `rules: '.opencode/rule'` deployment path (`aiwg-config.ts:548`) writes files that are never read by opencode. This is dead deployment.

The closest functional equivalent is the `instructions` config field (config.ts:203), which is a list of file paths or URLs resolved relative to the project. Instructions are loaded into the system prompt by `session/instruction.ts`.

### 2.5 Instructions (AGENTS.md / CLAUDE.md)

Source: `packages/opencode/src/session/instruction.ts`

OpenCode loads instruction files into the system prompt in this priority order:

1. Global: `~/.config/opencode/AGENTS.md`, then `~/.claude/CLAUDE.md` (unless `OPENCODE_DISABLE_CLAUDE_CODE_PROMPT`)
2. Project walk-up (first match only): `AGENTS.md`, `CLAUDE.md` (unless disabled), `CONTEXT.md` (deprecated) — searched from project directory up to worktree (`instruction.ts:14–17, 118–127`)
3. Explicit `instructions` config field (file paths/globs/URLs)

**Key behavior**: Only the first project-level instruction file found halts the walk-up search for that file type (line 118 comment). Multiple matches at the same level are all included.

Sub-directory instruction files are lazily attached during file reads — the `resolve()` function walks upward from the read file and attaches `AGENTS.md`/`CLAUDE.md` found in intermediate directories as the session progresses (lines 173–215).

---

## 3. Artifact Format

### Skills (SKILL.md)

**Required frontmatter fields** (enforced by `z.object` schema at `skill/index.ts:96`):
```yaml
---
name: string        # required — used as identifier
description: string # required — shown in skill listing
---
```

Any additional frontmatter fields are silently ignored (not rejected). The body (after frontmatter) becomes `content` — injected verbatim into the system prompt when the skill is invoked.

**Parsing**: `config/markdown.ts` uses `gray-matter` with a fallback "sanitization" pass that handles invalid YAML (colons in values, etc.) to maintain compatibility with Claude Code SKILL.md files that may use informal YAML.

**File extension**: Must be exactly `SKILL.md` (the constant `"SKILL.md"` is matched by glob patterns). No `.md`, `.markdown`, or other names work.

**Size limit**: No explicit limit in source. Bun reads the whole file; effectively unlimited in practice.

**Duplicate handling**: Last-write-wins by insertion order (skill/index.ts:99–105), with a `log.warn` for duplicate names. Earlier scan passes can be shadowed by later passes.

### Agents (.opencode/agent/*.md or nested)

**Frontmatter fields** (from `config/agent.ts` schema):
```yaml
---
name?: string          # optional override; derived from path otherwise
model?: string         # e.g. "anthropic/claude-opus-4-5"
variant?: string
temperature?: number
top_p?: number
prompt?: string        # inline system prompt (body content takes precedence)
description?: string   # shown in UI
mode?: "subagent" | "primary" | "all"
hidden?: boolean
color?: string         # hex or theme token
steps?: number
permission?: object    # fine-grained tool permissions
disable?: boolean      # remove this agent if true
---
Body becomes `prompt` (system prompt content)
```

Agents loaded from files are merged with the in-memory `agents` record using `mergeDeep` (`config.ts:574`). File-loaded agents take precedence for overlapping names.

### Commands (.opencode/command/*.md or nested)

**Frontmatter fields** (from `config/command.ts` schema):
```yaml
---
description?: string
agent?: string
model?: string
subtask?: boolean
---
Body becomes `template` (required — the command prompt template)
```

Commands support `@file-reference` syntax in template bodies (ConfigMarkdown parses `@path` references) and `!`shell-command`` interpolation.

### Mode agents (.opencode/mode/*.md — one level only)

Same schema as agents. `mode` is forced to `"primary"` regardless of frontmatter. Scan is NOT recursive — only `{mode,modes}/*.md` is matched, not `{mode,modes}/**/*.md`.

---

## 4. Lifecycle Hooks

No pre/post session lifecycle hooks exist for external file artifacts in opencode's source. There is no equivalent to Claude Code's `pre-tool-use` hooks or similar injection points that AIWG could use from deployed files.

**What does exist:**

- **Config hot-reload**: `config.invalidate()` exists and is triggered by file watchers on `.opencode/` directories. Agent/command files are re-loaded on config invalidation. Skills use `InstanceState` with instance-scoped lazy loading — they reload on new session instances, not on hot-reload.
- **Bus events**: Session error events are published when skill/agent parsing fails. No AIWG-accessible hook.
- **Plugin system**: A `plugin/` directory under `.opencode/` is auto-discovered and can load TypeScript plugin files. This is a separate, more powerful extension mechanism — but requires TypeScript code, not markdown.

---

## 5. Current AIWG Deployment Behavior

What `aiwg use sdlc --provider opencode` writes today (from `src/cli/handlers/use.ts:184–188`, `src/config/aiwg-config.ts:548`):

| AIWG Artifact Type | Deployed Path | Actually Scanned? |
|-------------------|--------------|-------------------|
| Agents | `.opencode/agent/` | YES — via `{agent,agents}/**/*.md` glob |
| Skills | `.opencode/skill/` | YES — via `{skill,skills}/**/SKILL.md` glob |
| Commands | `''` (empty — not deployed) | COMMANDS ARE SCANNED at `.opencode/command/` — AIWG skips this |
| Rules | `.opencode/rule/` | NO — opencode has no rule scanner |

**Confirmed bugs in current AIWG deployment:**

1. **Agent path comment is stale** (`src/smiths/platform-paths.ts:54`, `src/agents/types.ts:16`): States agents are "config-only." Source confirms `.opencode/agent/**/*.md` is scanned. The deployment path `.opencode/agent/` is correct, but the explanatory comments mislead maintainers.

2. **Commands not deployed** (`src/smiths/platform-paths.ts:26`, `src/cli/handlers/use.ts:186`): AIWG sets `commands: ''` for opencode because of the "commands derive from skills" misunderstanding. In fact, opencode has a separate command discovery mechanism at `.opencode/command/**/*.md`. AIWG SDLC commands (workflow starters, phase transitions) are not being deployed.

3. **Rules deployed to dead path** (`src/config/aiwg-config.ts:548`, `src/smiths/platform-paths.ts:121`): `.opencode/rule/` is written but never read by opencode. Rules content is silently dropped.

4. **Cross-platform skill paths not leveraged**: AIWG deploys skills to `.opencode/skill/`. OpenCode also automatically picks up `.claude/skills/**/SKILL.md` (pass 1 and pass 2 — global and project walk-up). AIWG could use `.claude/skills/` as a single deployment point that serves both Claude Code AND OpenCode simultaneously.

5. **Mode agents not exploited** (`config/agent.ts:142–175`): OpenCode supports a `{mode,modes}/*.md` discovery path that loads agents as primary modes. This is a clean way to deploy AIWG agent personas without touching `opencode.jsonc`. AIWG has no awareness of this path.

---

## 6. Gaps vs. Latest Provider Mechanism

| Gap | Severity | Description |
|-----|----------|-------------|
| Command deployment missing | HIGH | AIWG does not deploy to `.opencode/command/` — all SDLC slash-command equivalents absent from OpenCode users |
| Rules path is dead | HIGH | `.opencode/rule/` is never read — rule content is silently lost |
| Agent comment stale | MEDIUM | Misleading comments cause maintainers to doubt the agent path is real |
| Mode agents unused | MEDIUM | `.opencode/mode/*.md` is a clean way to add primary agents — not used |
| URL-based skill pulling unknown | LOW | OpenCode can fetch skills from remote `index.json` URLs — AIWG could publish a registry endpoint |
| `skills.paths` in config unused | LOW | AIWG could register `.opencode/skill` via `opencode.jsonc skills.paths` as fallback, but file-based discovery already works |
| Subdirectory instruction files unknown | LOW | OpenCode lazily attaches `AGENTS.md`/`CLAUDE.md` found in subdirectories during file reads — multi-level AGENTS.md hierarchy works automatically |

---

## 7. New Capabilities Not Yet Exploited

### 7.1 Command File Discovery

OpenCode scans `.opencode/command/**/*.md` (recursive) for command definitions. These are prompt templates with optional `agent`, `model`, `subtask` metadata. AIWG SDLC commands (e.g., phase-transition workflows) should be deployed here.

Frontmatter supports `agent: <agent-name>` to route the command to a specific agent — enabling skill-specific dispatch without user input. The `subtask: true` flag runs the command as a subagent task.

### 7.2 Mode Agents at `.opencode/mode/*.md`

The `loadMode` function scans `{mode,modes}/*.md` (one level, not recursive). Files here become selectable primary agents. This is the intended path for user-facing agent personas (not `.opencode/agent/` which is for all agent types including subagents). AIWG role-specialized agents (Security Auditor, Test Engineer, etc.) could be deployed here as named modes.

### 7.3 Remote Skill URL Registry

`skills.urls` in `opencode.jsonc` supports fetching a remote `index.json` and downloading SKILL.md bundles into the local cache. AIWG could publish a well-known endpoint (e.g., `https://aiwg.io/.well-known/skills/`) to allow `opencode.jsonc` registration as an alternative to file-based deployment.

Index format (`skill/discovery.ts:12–19`):
```json
{
  "skills": [
    { "name": "skill-name", "files": ["SKILL.md", "supporting-file.md"] }
  ]
}
```

### 7.4 Cross-Platform Skill Path (`.claude/skills/`)

OpenCode's pass 1 and pass 2 scan `~/.claude/skills/**/SKILL.md` and `<project>/.claude/skills/**/SKILL.md` respectively (unless `OPENCODE_DISABLE_CLAUDE_CODE_SKILLS` is set). Skills deployed by `aiwg use sdlc --provider claude` to `.claude/skills/` are **automatically visible to OpenCode** with no additional deployment step. AIWG could document this zero-cost cross-platform coverage and potentially drop the need for a separate `--provider opencode` skill deployment.

### 7.5 `.agents/skills/` Cross-Platform Path

OpenCode's pass 2 also scans `.agents/skills/**/SKILL.md` in the project tree (walk-up). This is the same "universal" path used by Codex and OpenClaw. Writing skills here once covers OpenCode, Codex, and OpenClaw.

### 7.6 Plugin System (TypeScript)

`.opencode/plugin/` is auto-discovered and supports TypeScript plugins with hooks like `experimental.chat.system.transform`. This is a more powerful (but code-requiring) extension mechanism for AIWG. Not suitable for markdown-based deployment but noted for future SDK integration.

---

## 8. Cross-Port Candidates

| OpenCode Capability | Applicable To | Notes |
|--------------------|---------------|-------|
| `{mode,modes}/*.md` for primary agents | Any provider supporting file-based agent loading | Other providers that separate "modes" from "agents" conceptually |
| Fallback YAML frontmatter sanitization in markdown.ts | Claude Code, Codex | Tolerance for malformed YAML — already in OpenCode, may reveal edge cases in AIWG skill files |
| `skills.urls` remote registry | Any provider with URL-based loading | Only OpenCode and (partially) Hermes support this pattern |
| Walk-up instruction attachment during file reads | Claude Code | OpenCode's per-subdirectory AGENTS.md lazy injection is more granular than Claude Code's root-only approach |
| `symlink: true` in all globs | All providers | OpenCode explicitly supports symlinked skill files — AIWG could leverage symlinks for cross-provider single-source deployment |

---

## 9. Citations

All findings are graded HIGH (direct source code) unless noted.

| Claim | Source | Grade |
|-------|--------|-------|
| Skill filename must be `SKILL.md` | `packages/opencode/src/skill/index.ts:24–26` | HIGH |
| External skill patterns for `.claude/` and `.agents/` | `skill/index.ts:22–24, 157–172` | HIGH |
| `dot: true` on external scans | `skill/index.ts:128–129, 164, 172` | HIGH |
| Config directories include `.opencode/` walk-up | `config/paths.ts:23–41` | HIGH |
| OPENCODE_SKILL_PATTERN is `{skill,skills}/**/SKILL.md` | `skill/index.ts:25` | HIGH |
| Recursive glob with no depth limit | `skill/index.ts:122–143` (Bun Glob.scan `**`) | HIGH |
| Skills.urls remote discovery | `skill/discovery.ts:54–104` | HIGH |
| Agent file-based discovery via `{agent,agents}/**/*.md` | `config/agent.ts:112` | HIGH |
| Agent name stripped from path patterns | `config/agent.ts:129` | HIGH |
| Mode agents via `{mode,modes}/*.md` (non-recursive) | `config/agent.ts:144` | HIGH |
| Command file discovery via `{command,commands}/**/*.md` | `config/command.ts:29` | HIGH |
| Command name stripped from path patterns | `config/command.ts:46` | HIGH |
| `ConfigAgent.load` and `ConfigCommand.load` called for all config dirs | `config/config.ts:573–574` | HIGH |
| No `.opencode/rule` scanner exists | Absence confirmed by exhaustive grep of `packages/opencode/src/` | HIGH |
| `instructions` config field supports file paths/globs | `config/config.ts:203`, `session/instruction.ts:129–143` | HIGH |
| AGENTS.md/CLAUDE.md loaded at global and project level | `session/instruction.ts:13–17, 61–64, 118–127` | HIGH |
| Subdirectory AGENTS.md lazily attached during file reads | `session/instruction.ts:173–215` | HIGH |
| AIWG sets `commands: ''` for OpenCode | `src/smiths/platform-paths.ts:26` | HIGH |
| AIWG deploys `rules` to `.opencode/rule/` | `src/config/aiwg-config.ts:548` | HIGH |
| AIWG comment: "agents are config-only" | `src/smiths/platform-paths.ts:54` | HIGH |
| Duplicate skill warning, last-write-wins | `skill/index.ts:99–105` | HIGH |
| Required frontmatter: `name` + `description` | `skill/index.ts:96` | HIGH |
| Fallback YAML sanitization for Claude Code compat | `config/markdown.ts:18–67` | HIGH |
| Symlink support in all globs | `skill/index.ts:129`, `config/agent.ts:115`, `config/command.ts:31` | HIGH |
| Commit hash and date | `git log -1` on shallow clone 2026-05-05 | HIGH |

---

## Summary for Issue #1095

Five actionable items emerge from this assessment:

1. **Fix command deployment** — add `.opencode/command/` as the commands deploy path for opencode (currently `''`). SDLC workflow commands should be deployed as command template files.

2. **Remove rules deployment** — `.opencode/rule/` is a dead path. AIWG should either (a) not deploy rules for opencode, or (b) convert rules to `instructions`-referenced files by patching `opencode.jsonc`.

3. **Correct stale comments** — `platform-paths.ts:54`, `types.ts:16`, `skill-command-translator.ts:96/111` all claim agents/commands are config-only. Update to reflect file-based discovery is live.

4. **Add mode-agent deployment** — deploy AIWG role agents (Security Auditor, Test Engineer, etc.) to `.opencode/mode/` so they appear as selectable primary modes in the OpenCode TUI tab switcher.

5. **Document cross-provider skill coverage** — skills already deployed to `.claude/skills/` by `aiwg use sdlc --provider claude` are automatically picked up by OpenCode. Users with both Claude Code and OpenCode installed get double coverage for free; AIWG documentation and the capability matrix should reflect this.
