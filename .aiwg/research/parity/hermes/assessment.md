# Hermes Agent — Platform Parity Assessment

**Issue:** #1099
**Date assessed:** 2026-05-05
**Assessor:** Technical Researcher agent
**Confidence:** HIGH (source-code findings) / MODERATE (behavior inferred from composition)

---

## 1. Repo State

| Field | Value |
|-------|-------|
| Repository | `github.com/NousResearch/hermes-agent` |
| Clone path | `/tmp/aiwg-parity-2026-05/hermes-agent/` |
| Clone method | `git clone --depth 1` (shallow) |
| Assessed commit | `de9238d37e778da3654595a49cc7ae5b8a10fa60` |
| Commit date | 2026-05-05T08:06:55-07:00 |
| Commit message | `feat(kanban): hallucination gate + recovery UX for worker-created-card claims (#20232)` |
| OSS status | Open-source (NousResearch, MIT-licensed) |
| Language | Python (agent core) + TypeScript (TUI, web dashboard) |
| Maintainer | NousResearch |
| Test suite | ~17k tests across ~900 files (`tests/`) |

---

## 2. Discovery Mechanism

### 2.1 Skills — primary scan path

**Primary scan root:** `~/.hermes/skills/`  (constant `SKILLS_DIR = HERMES_HOME / "skills"`, `tools/skills_tool.py:89`)

**Scan implementation** — `iter_skill_index_files()` in `agent/skill_utils.py:440–451`:

```python
def iter_skill_index_files(skills_dir: Path, filename: str):
    matches = []
    for root, dirs, files in os.walk(skills_dir, followlinks=True):
        dirs[:] = [d for d in dirs if d not in EXCLUDED_SKILL_DIRS]
        if filename in files:
            matches.append(Path(root) / filename)
    for path in sorted(matches, key=lambda p: str(p.relative_to(skills_dir))):
        yield path
```

Key properties (HIGH — source code):
- Uses `os.walk` with `followlinks=True` — follows symlinks.
- Depth is **unlimited** (no `maxdepth` parameter).
- Prunes `.git`, `.github`, `.hub`, `.archive` directories before descending.
- Yields results sorted lexicographically by relative path within the scan root.
- Called with `filename="SKILL.md"` at every scan site.

**Claim verification:** The prior AIWG memory entry states "Hermes uses `rglob('SKILL.md')`." This is PARTIALLY CORRECT in spirit but INCORRECT on the specific call. The primary scan function `iter_skill_index_files` uses `os.walk`, not `rglob`. However, `rglob("SKILL.md")` is used at several other sites:

| File | Line | Context |
|------|------|---------|
| `gateway/run.py` | 768 | Checking disabled/unavailable skill commands (slash-command error path) |
| `gateway/run.py` | 787 | Scanning `optional-skills/` for install hints |
| `tools/skills_hub.py` | 2431, 2442 | `OptionalSkillSource` — repo-bundled optional skills |
| `tools/skill_manager_tool.py` | 290 | Agent-editable skill discovery |
| `tools/skill_usage.py` | 190, 516 | Usage telemetry scan |
| `agent/curator_backup.py` | 179 | Backup count |
| `hermes_cli/dump.py` | 70 | Config dump |
| `hermes_cli/profiles.py` | 368 | Profile copy |
| `website/scripts/generate-skill-docs.py` | 457 | Docs generation (offline) |

Both `os.walk` and `rglob` are used — the primary hot path for listing and loading is `os.walk` via `iter_skill_index_files`. The recursion in all cases is unlimited depth.

**Scan order** (`agent/skill_commands.py:256–262`):
1. Local `~/.hermes/skills/` first
2. External directories from `skills.external_dirs` config key (in config order)
3. First-name-wins deduplication (`seen_names` set)

### 2.2 External skill directories

Configurable via `skills.external_dirs` in `~/.hermes/config.yaml` (`agent/skill_utils.py:174–232`). Each entry is `~`- and `${VAR}`-expanded; relative paths are resolved against `HERMES_HOME`, not CWD. Non-existent directories are silently skipped. Paths resolving to the local skills dir are deduplicated.

### 2.3 Agents — AGENTS.md (project context)

Loaded by `_load_agents_md()` in `agent/prompt_builder.py:1085–1098`:

```python
def _load_agents_md(cwd_path: Path) -> str:
    """AGENTS.md — top-level only (no recursive walk)."""
    for name in ["AGENTS.md", "agents.md"]:
        candidate = cwd_path / name
        if candidate.exists():
            ...
```

Scan depth: **CWD only** (no recursion). Case-insensitive fallback (`AGENTS.md` then `agents.md`). Content is capped at 20,000 chars (`_truncate_content`).

Priority chain for project context injection (`agent/prompt_builder.py:1147–1174`) — **first match wins**:
1. `.hermes.md` / `HERMES.md` — walks to git root (multi-level traversal)
2. `AGENTS.md` / `agents.md` — CWD only
3. `CLAUDE.md` / `claude.md` — CWD only
4. `.cursorrules` + `.cursor/rules/*.mdc` — CWD only

### 2.4 Commands

No file-based command discovery. All slash commands are statically defined in `COMMAND_REGISTRY` (`hermes_cli/commands.py:64+`) as `CommandDef` objects. Skill-derived `/skill-name` slash commands are generated at runtime by `scan_skill_commands()` from SKILL.md frontmatter `name` fields.

### 2.5 Rules

No native "rules" artifact concept. The closest equivalents are:
- Project-level context via `AGENTS.md`/`.hermes.md`/`CLAUDE.md` (injected as system prompt)
- Shell hooks (`hooks:` block in CLI config) — lifecycle guards, not rules files
- Prompt injection detection patterns (`_INJECTION_PATTERNS` in `tools/skills_tool.py:133–143`)

---

## 3. Artifact Format

### 3.1 SKILL.md frontmatter schema

All fields except `name` and `description` are optional. (HIGH — `tools/skills_tool.py:28–46`, `agent/skill_utils.py`)

```yaml
---
name: skill-name              # Required, max 64 chars (MAX_NAME_LENGTH)
description: Brief description # Required, max 1024 chars (MAX_DESCRIPTION_LENGTH)
version: 1.0.0                # Optional — semver string
author: Someone               # Optional
license: MIT                  # Optional (agentskills.io standard)
platforms: [macos, linux]     # Optional OS gate: macos | linux | windows
                              # Omit for all-platform (default)
prerequisites:                # Optional — legacy advisory checks
  env_vars: [API_KEY]         # Normalized to required_environment_variables on load
  commands: [curl, jq]        # Advisory only (not enforced)
compatibility: Requires X     # Optional (agentskills.io)
metadata:                     # Optional — arbitrary nested YAML
  hermes:
    tags: [fine-tuning, llm]
    category: mlops
    related_skills: [peft, lora]
    config:                   # Skill-declared config vars (injected at load time)
      - key: wiki.path
        description: "Path to knowledge base"
        default: "~/wiki"
        prompt: "Wiki directory path"
    fallback_for_toolsets: [] # Conditional activation — skill loads when toolsets absent
    requires_toolsets: []     # Conditional activation — skill loads when toolsets present
    fallback_for_tools: []
    requires_tools: []
---
```

### 3.2 File extension and directory structure

- Index file: **`SKILL.md`** (exact filename, case-sensitive on Linux)
- Skill directory structure:
  ```
  ~/.hermes/skills/
  └── <category>/           # Optional category grouping
      └── <skill-name>/
          ├── SKILL.md      # Required — main instructions
          ├── references/   # Optional supporting docs (loaded on demand)
          ├── templates/    # Optional output templates
          ├── scripts/      # Optional executable scripts
          └── assets/       # Optional supplementary files
  ```
- Also supports flat `<name>.md` files (legacy, discovered via `rglob` at `tools/skills_tool.py:982`)

### 3.3 Template variables

Hermes performs active preprocessing on SKILL.md content before injection (`agent/skill_preprocessing.py`):

| Token | Replaced with |
|-------|---------------|
| `${HERMES_SKILL_DIR}` | Absolute path to the skill's directory |
| `${HERMES_SESSION_ID}` | Current session UUID (when available) |

Inline shell expansion (`!`backtick`cmd`backtick`) is supported but opt-in via `skills.inline_shell: true` in config (default: false). Timeout is configurable via `skills.inline_shell_timeout` (default 10s).

### 3.4 Size limits

| Boundary | Value | Source |
|----------|-------|--------|
| `name` max length | 64 chars | `tools/skills_tool.py:91` |
| `description` max length | 1024 chars | `tools/skills_tool.py:92` |
| Initial read cap (listing scan) | 4000 chars | `tools/skills_tool.py:582` |
| Context file max (AGENTS.md, etc.) | 20,000 chars | `agent/prompt_builder.py` |
| Inline-shell output max | 4000 chars | `agent/skill_preprocessing.py:20` |

### 3.5 AGENTS.md format

Hermes reads `AGENTS.md` as raw Markdown. It also reads `HERMES.md` / `.hermes.md` (walk-to-git-root), `CLAUDE.md`, and `.cursorrules`. No YAML frontmatter is parsed from AGENTS.md; the entire body is injected verbatim (after injection-pattern scanning).

---

## 4. Lifecycle Hooks

Hermes has two complementary hook systems (HIGH — `hermes_cli/plugins.py:78–114`, `agent/shell_hooks.py`).

### 4.1 Python plugin hooks

Registered via `ctx.register_hook(event, callback)` in plugin `register(ctx)` functions. Full event set (`hermes_cli/plugins.py:78–114`):

| Event | Phase | Blocking? |
|-------|-------|-----------|
| `pre_tool_call` | Before any tool invocation | Yes — can return block decision |
| `post_tool_call` | After tool completes | No |
| `transform_terminal_output` | After terminal tool output | Transforms output |
| `transform_tool_result` | After any tool result | Transforms result |
| `pre_llm_call` | Before LLM API call | Can inject context string |
| `post_llm_call` | After LLM response | No |
| `pre_api_request` | Before raw HTTP request | No |
| `post_api_request` | After raw HTTP response | No |
| `on_session_start` | Session initialization | No |
| `on_session_end` | Session teardown | No |
| `on_session_finalize` | Final session cleanup | No |
| `on_session_reset` | Context/history reset | No |
| `subagent_stop` | Subagent termination | No |
| `pre_gateway_dispatch` | Before gateway message dispatch | Can skip/rewrite/allow |
| `pre_approval_request` | Before dangerous-command approval prompt | Observer only |
| `post_approval_response` | After user approves/denies | Observer only |

### 4.2 Shell hooks

Configured in `~/.hermes/cli-config.yaml` under `hooks:` key. Each entry maps an event name to a shell command. Supported events for shell hooks: `pre_tool_call`, `post_tool_call`, `pre_llm_call`, `post_llm_call` (tool matcher only honored for `pre_tool_call`/`post_tool_call`). Input delivered as JSON on stdin; output read as JSON from stdout. Requires first-use allowlist consent.

**No skill-specific hooks exist** — there are no `pre_skill_load` or `post_skill_load` events.

---

## 5. Current AIWG Deployment Behavior

Based on `src/smiths/platform-paths.ts` (HIGH — source code):

| Artifact type | AIWG currently deploys to | Hermes reads from |
|---------------|--------------------------|-------------------|
| Agents | Aggregated into `AGENTS.md` (project root) | `AGENTS.md` at CWD (cwd-only scan) |
| Commands | Empty string `''` — not deployed | N/A (static registry only) |
| Skills | `~/.hermes/skills/` | `~/.hermes/skills/` (unlimited depth) |
| Rules | Empty string `''` — not deployed | N/A (no native rules concept) |
| Config file | `AGENTS.md` | `AGENTS.md` (priority 2 in chain) |

Current comment in `platform-paths.ts`:
- Commands: `'hermes': '', // Served via MCP, not file-deployed` (line 25) — this comment is INACCURATE; Hermes commands are statically registered, not MCP-served
- Agents: `'hermes': '', // Aggregated into AGENTS.md at project root` (line 53)
- Rules: `'hermes': '', // Not applicable — Hermes uses AGENTS.md` (line 120)

AIWG deploys agents to `AGENTS.md` via aggregation. This is confirmed correct: Hermes reads `AGENTS.md` from CWD via `_load_agents_md()` (`agent/prompt_builder.py:1085`). Skills deploy to `~/.hermes/skills/` — also correct.

---

## 6. Gaps vs. Latest Provider Mechanism

### Gap 1 — `.hermes.md` not exploited (HIGH impact)

Hermes has a first-priority context file: `.hermes.md` / `HERMES.md`, which walks up to the git root before falling back to `AGENTS.md`. AIWG does not deploy anything to `.hermes.md`. This path has higher priority than `AGENTS.md` and supports hierarchical lookup. Using `.hermes.md` would give AIWG context more reliable precedence.

Source: `agent/prompt_builder.py:1147–1174` — priority chain is explicit.

### Gap 2 — Skills preloading via `--skill` flag not documented (MEDIUM impact)

`build_preloaded_skills_prompt()` (`agent/skill_commands.py:453–501`) supports loading skills at session start via CLI `--skill <name>` flag. AIWG skills deployed to `~/.hermes/skills/` are already loadable this way, but AIWG documentation does not mention it as a Hermes invocation pattern.

### Gap 3 — Template variable `${HERMES_SKILL_DIR}` not used in AIWG skills (MEDIUM impact)

AIWG skill content deployed to `~/.hermes/skills/` can reference `${HERMES_SKILL_DIR}` to locate bundled scripts, templates, and assets. AIWG's current skill templates do not include this token, meaning any supporting-file references in deployed skills would need to be hardcoded paths.

Source: `agent/skill_preprocessing.py:11–13`, `agent/skill_commands.py:155–159`.

### Gap 4 — `metadata.hermes.config` injection not used (MEDIUM impact)

Hermes automatically reads `metadata.hermes.config` entries from skill frontmatter, resolves their values from `~/.hermes/config.yaml` under `skills.config.<key>`, and injects them as a `[Skill config: ...]` block at skill load time. AIWG skills do not declare `metadata.hermes.config` entries, leaving this auto-injection mechanism unused.

Source: `agent/skill_commands.py:99–135`, `agent/skill_utils.py:269–325`.

### Gap 5 — `skills.external_dirs` not documented as an AIWG delivery path (LOW impact)

Hermes supports `skills.external_dirs` in config.yaml for supplementary skill roots beyond `~/.hermes/skills/`. AIWG could instruct users to add a project-local `skills/` directory here. Not currently used or documented.

Source: `agent/skill_utils.py:174–232`.

### Gap 6 — Conditional skill activation (`fallback_for_toolsets`) not used (LOW impact)

The `metadata.hermes.fallback_for_toolsets` and `requires_toolsets` frontmatter keys allow skills to activate only when specific toolsets are (or are not) available. AIWG skills do not declare these, making all skills unconditionally active regardless of toolset context.

Source: `agent/skill_utils.py:249–263`.

### Gap 7 — Comment inaccuracy in `platform-paths.ts:25` (LOW, correctness)

The comment `// Served via MCP, not file-deployed` for Hermes commands is incorrect. Hermes commands are defined in a static Python `COMMAND_REGISTRY` and are not MCP-deployed. The empty-string deployment is correct behavior (no file deployment needed), but the reason is wrong.

---

## 7. New Capabilities Not Yet Exploited

### 7.1 Inline shell expansion in skills

Hermes supports `!`backtick`cmd`backtick` in SKILL.md content (opt-in via `skills.inline_shell: true`). This allows skills to inject dynamic runtime values — current date, git status, environment state — directly into their instructions at load time. AIWG skills do not use this pattern.

Source: `agent/skill_preprocessing.py:15–112`.

### 7.2 Skill-declared config via `metadata.hermes.config`

Skills can declare named configuration variables that Hermes prompts for during setup and injects at load time. This creates a "skill settings" mechanism — users configure once in `~/.hermes/config.yaml`, and every skill that declares that key gets the value injected automatically. Useful for AIWG skills that reference project-specific paths.

Source: `agent/skill_commands.py:99–135`, `agent/skill_utils.py:266–365`.

### 7.3 Platform-gated skill deployment

The `platforms:` frontmatter key gates skill availability by OS. AIWG could tag skills that are macOS-only (e.g., skills invoking `pbpaste`, `open`) or Linux-only with `platforms: [macos]` / `platforms: [linux]` to prevent confusing "command not found" errors on incompatible systems.

Source: `agent/skill_utils.py:92–115`.

### 7.4 `.hermes.md` as preferred context delivery (priority 1)

By deploying AIWG project context to `.hermes.md` instead of aggregating into `AGENTS.md`, AIWG gains git-root traversal and first-priority injection. A `.hermes.md` placed at the git root is discovered even when `hermes` is invoked from a subdirectory.

Source: `agent/prompt_builder.py:89–110`, `1062–1082`.

### 7.5 Skill curator lifecycle integration

Hermes tracks per-skill `use_count`, `view_count`, `patch_count`, and `last_activity_at` in `~/.hermes/skills/.usage.json`. Skills with `created_by: "agent"` provenance are auto-archived after configurable stale periods. AIWG-deployed skills (which have no provenance tag) are treated as non-agent-created and are exempt from auto-archiving — this is safe behavior, but AIWG could optionally set `created_by` in skill manifests to opt into lifecycle management.

Source: `AGENTS.md:610–638`, `tools/skill_usage.py`.

### 7.6 Namespace-qualified skill references (`namespace:skill-name`)

Hermes supports plugin-provided skills under namespaces, referenced as `namespace:skill-name`. AIWG could structure its skill bundle as a plugin to expose skills under an `aiwg:` namespace, giving clean provenance and avoiding name collisions with user skills.

Source: `agent/skill_utils.py:454–473`, `tools/skills_tool.py:880–932`.

---

## 8. Cross-Port Candidates

### 8.1 Unlimited-depth `os.walk` with symlink support — applicable to AIWG Claude skill scanning

**What Hermes does:** `iter_skill_index_files()` uses `os.walk(skills_dir, followlinks=True)` with no depth limit and explicit `.git`/`.github`/`.hub`/`.archive` pruning. Yields sorted results.

**Port candidate for AIWG:** Claude Code's skill scanning currently uses `rglob("SKILL.md")`. The Hermes approach adds:
- Explicit exclusion list (pruning before traversal is more efficient than post-filter)
- `followlinks=True` for symlink-organized skill libraries
- Stable sort by relative path (deterministic ordering across platforms)

This is already captured in the existing AIWG memory entry about Hermes deep recursion. Confirmed correct, with the clarification that `os.walk` is the primary path (not `rglob`).

### 8.2 Name normalization for slash commands — applicable to AIWG skill command translation

**What Hermes does:** Normalizes skill names to slash-command slugs using two regexes (`agent/skill_commands.py:286–292`):
```python
cmd_name = name.lower().replace(' ', '-').replace('_', '-')
cmd_name = _SKILL_INVALID_CHARS.sub('', cmd_name)   # remove [^a-z0-9-]
cmd_name = _SKILL_MULTI_HYPHEN.sub('-', cmd_name).strip('-')
```
Also resolves `_` ↔ `-` interchangeably in user input (`resolve_skill_command_key()`).

**Port candidate:** AIWG's `skill-command-translator.ts` could adopt the same two-step regex normalization (strip non-alnum, collapse multi-hyphen) to match Hermes behavior and avoid mismatch when users type `_` instead of `-`.

### 8.3 First-priority project context file (`.hermes.md`) — applicable to AIWG Hermes deployment

**What Hermes does:** Reads `.hermes.md` / `HERMES.md` with git-root traversal before falling back to `AGENTS.md`. Strips YAML frontmatter before injection (leaving only the body in the system prompt).

**Port candidate:** AIWG could generate `.hermes.md` for Hermes deployments instead of aggregating into `AGENTS.md`. This gains: (a) git-root traversal — file works from any subdirectory; (b) higher priority than `AGENTS.md` in Hermes's context chain; (c) Hermes-specific frontmatter stripping is already implemented.

### 8.4 Template variable injection pattern — applicable to AIWG skill content

**What Hermes does:** Replaces `${HERMES_SKILL_DIR}` with the skill's absolute directory path and `${HERMES_SESSION_ID}` with the session UUID. This enables skills to reference co-located scripts, templates, and assets using relative paths.

**Port candidate:** AIWG skills with supporting files (scripts, templates) should include `${HERMES_SKILL_DIR}` references rather than hardcoded paths. This makes deployed skills portable across user home directories.

### 8.5 Skill config injection pattern — applicable to AIWG skill design

**What Hermes does:** Skills declare `metadata.hermes.config` entries. At load time Hermes reads current values from `~/.hermes/config.yaml:skills.config.<key>` and appends a `[Skill config: ...]` block to the skill message. The config key is populated either by the setup wizard or by the user manually.

**Port candidate:** AIWG skills that require user-specific paths (e.g., a knowledge-base path, a project root) should declare them via `metadata.hermes.config` rather than documenting "set this in your config." The auto-injection means the agent sees the current value without reading config.yaml itself.

---

## 9. Citations

All citations reference the assessed commit: `de9238d37e778da3654595a49cc7ae5b8a10fa60` (2026-05-05).

| Claim | Source | Confidence |
|-------|--------|------------|
| Primary scan uses `os.walk` with `followlinks=True` | `agent/skill_utils.py:440–451` | HIGH |
| Scan filename is `SKILL.md` | `agent/skill_commands.py:263`, `tools/skills_tool.py:575` | HIGH |
| Excluded dirs: `.git .github .hub .archive` | `agent/skill_utils.py:27`, `agent/skill_commands.py:264` | HIGH |
| `rglob("SKILL.md")` used in gateway/non-hot paths | `gateway/run.py:768,787`, `tools/skills_hub.py:2431,2442` | HIGH |
| `SKILLS_DIR = HERMES_HOME / "skills"` | `tools/skills_tool.py:89` | HIGH |
| External dirs via `skills.external_dirs` config | `agent/skill_utils.py:174–232` | HIGH |
| `AGENTS.md` scan: CWD only, no recursion | `agent/prompt_builder.py:1085–1098` | HIGH |
| Priority chain: `.hermes.md` > `AGENTS.md` > `CLAUDE.md` > `.cursorrules` | `agent/prompt_builder.py:1147–1174` | HIGH |
| `.hermes.md` walks to git root | `agent/prompt_builder.py:92–110` | HIGH |
| `name` max 64 chars, `description` max 1024 chars | `tools/skills_tool.py:91–92` | HIGH |
| Context file truncation at 20,000 chars | `agent/prompt_builder.py:1151` (comment) | MODERATE |
| `platforms:` OS gating | `agent/skill_utils.py:92–115` | HIGH |
| `metadata.hermes.config` injection | `agent/skill_commands.py:99–135` | HIGH |
| Template vars `${HERMES_SKILL_DIR}` / `${HERMES_SESSION_ID}` | `agent/skill_preprocessing.py:11–13` | HIGH |
| Inline shell `!`backtick`cmd`backtick` opt-in | `agent/skill_preprocessing.py:15–112`, `agent/skill_commands.py:158` | HIGH |
| `VALID_HOOKS` set (16 events) | `hermes_cli/plugins.py:78–114` | HIGH |
| Shell hooks: `pre_tool_call`, `post_tool_call`, `pre_llm_call`, `post_llm_call` | `agent/shell_hooks.py:315–319` | HIGH |
| Commands: static `COMMAND_REGISTRY`, not file-deployed | `hermes_cli/commands.py:64+` | HIGH |
| AIWG skills path: `~/.hermes/skills/` | `src/smiths/platform-paths.ts:82` | HIGH |
| AIWG agents: aggregated into `AGENTS.md` | `src/smiths/platform-paths.ts:53,156` | HIGH |
| AIWG commands for Hermes: empty string (not deployed) | `src/smiths/platform-paths.ts:25` | HIGH |
| AIWG rules for Hermes: empty string (not deployed) | `src/smiths/platform-paths.ts:120` | HIGH |
| Skill name normalization regex pair | `agent/skill_commands.py:26–27,289–292` | HIGH |
| `seen_names` deduplication (local-first precedence) | `agent/skill_commands.py:253–286` | HIGH |
| Curator exempt from non-agent-created skills | `AGENTS.md:622–624` | MODERATE (doc) |
| Namespace-qualified skill references | `agent/skill_utils.py:454–473` | HIGH |
| `build_preloaded_skills_prompt()` — `--skill` preload | `agent/skill_commands.py:453–501` | HIGH |

---

## Summary

Hermes's skill system is more capable than AIWG currently exploits. The five material gaps are:

1. **`.hermes.md` not used** — AIWG deploys to `AGENTS.md` (priority 2) when `.hermes.md` (priority 1, walks to git root) is available and superior.
2. **`${HERMES_SKILL_DIR}` not referenced** in AIWG skill content — limits portability of supporting files.
3. **`metadata.hermes.config` not declared** — auto-injection mechanism unused; users must manually configure paths.
4. **`platforms:` gating not applied** — OS-specific skills not tagged, risking invocation errors on wrong OS.
5. **Comment in `platform-paths.ts:25` is inaccurate** — says "Served via MCP" when Hermes commands are static Python, not MCP.

The prior AIWG memory claim that "Hermes uses `rglob('SKILL.md')`" is substantively correct (unlimited recursion confirmed) but technically imprecise: the primary hot path uses `os.walk`, while `rglob` appears in secondary scan sites. Both are unlimited depth.
