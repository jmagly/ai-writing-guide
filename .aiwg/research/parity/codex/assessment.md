# Parity Assessment — OpenAI Codex CLI

**Issue:** #1091
**Assessed:** 2026-05-05
**Commit assessed:** `91b73501` (`Add goal lifecycle metrics (#20799)`) — 2026-05-05T09:21:54-07:00
**Clone path:** `/tmp/aiwg-parity-2026-05/codex/`
**Repo:** https://github.com/openai/codex (full Rust source, open)
**Evidence quality:** HIGH for all source-code claims (direct file reads). MODERATE for vendor doc claims (pointer-only docs in repo).

---

## 1. Repo State

| Field | Value |
|-------|-------|
| Repo | https://github.com/openai/codex |
| OSS status | Full source, Apache-2.0/MIT dual, active |
| Language | Rust (codex-rs) + TypeScript (codex-cli legacy) |
| Commit assessed | `91b73501` — 2026-05-05T09:21:54-07:00 |
| Clone path | `/tmp/aiwg-parity-2026-05/codex/` |
| Key loader | `codex-rs/core-skills/src/loader.rs` |

The repository contains two implementations: `codex-rs/` (current Rust implementation, actively developed) and `codex-cli/` (legacy TypeScript, in maintenance). This assessment covers the Rust implementation exclusively, as it is the current runtime.

---

## 2. Discovery Mechanism

### 2.1 Skill Loader

The authoritative loader is `codex-rs/core-skills/src/loader.rs`. It defines four scan roots assembled in priority order (highest first during deduplication):

| Priority | Scope | Path | Source |
|----------|-------|------|--------|
| 1 (highest) | Repo | `.agents/skills/` (from project root up to cwd) | `loader.rs:342-374` |
| 2 | User | `~/.agents/skills/` | `loader.rs:303-310` |
| 3 | User (deprecated) | `$CODEX_HOME/skills/` (default: `~/.codex/skills/`) | `loader.rs:295-300` |
| 4 | System (embedded) | `$CODEX_HOME/skills/.system/` (cache for bundled skills) | `loader.rs:313-320` |
| 5 | Admin | `/etc/codex/skills/` (Unix only) | `loader.rs:322-328` |

**Key constants** (`loader.rs:106-123`):
```rust
const SKILLS_FILENAME: &str = "SKILL.md";
const AGENTS_DIR_NAME: &str = ".agents";
const SKILLS_METADATA_DIR: &str = "agents";
const SKILLS_METADATA_FILENAME: &str = "openai.yaml";
const SKILLS_DIR_NAME: &str = "skills";
const MAX_SCAN_DEPTH: usize = 6;
const MAX_SKILLS_DIRS_PER_ROOT: usize = 2000;
```

### 2.2 Repo-scope Discovery (`.agents/skills/` depth traversal)

Function `repo_agents_skill_roots` (`loader.rs:342-374`) walks from project root to cwd, checking each ancestor directory for `.agents/skills/`. The project root is determined by scanning for `project_root_markers` (default: `.git`). This means:

- A skill in `<project-root>/.agents/skills/my-skill/SKILL.md` is discovered.
- A skill in `<project-root>/src/tools/.agents/skills/niche/SKILL.md` is **also** discovered, because every directory between cwd and project root is checked.

**Scope priority ranking** (`loader.rs:210-225`):
```rust
fn scope_rank(scope: SkillScope) -> u8 {
    match scope {
        SkillScope::Repo => 0,  // highest priority
        SkillScope::User => 1,
        SkillScope::System => 2,
        SkillScope::Admin => 3,
    }
}
```

After collecting all roots, skills are deduplicated by canonical path, then sorted by scope rank, then by name.

### 2.3 Within-root BFS Traversal

Function `discover_skills_under_root` (`loader.rs:456-597`) uses a **BFS queue** over the skill root directory:

- Skips entries starting with `.` (`loader.rs:517`)
- Follows symlinks for Repo, User, and Admin scopes; **does not follow symlinks** for System scope (`loader.rs:494-498`)
- Stops at `MAX_SCAN_DEPTH = 6` directories deep from the root (`loader.rs:122, 482`)
- Stops scanning after `MAX_SKILLS_DIRS_PER_ROOT = 2000` directories (`loader.rs:123, 485-487`)
- Emits a `tracing::warn` if truncation occurs (`loader.rs:590-595`)
- Only processes files named exactly `SKILL.md`; all other files are ignored (`loader.rs:572`)

### 2.4 CODEX_HOME Resolution

`codex-rs/utils/home-dir/src/lib.rs:13-63`:
```rust
pub fn find_codex_home() -> std::io::Result<AbsolutePathBuf> {
    // Honors $CODEX_HOME env var; defaults to ~/.codex
}
```
Default is `~/.codex`. The deprecated user-scope path therefore resolves to `~/.codex/skills/`.

### 2.5 Config Layer Stack (Project-local `.codex/`)

`codex-rs/config/src/loader/mod.rs:85-93` (comment block):
```
- user      ${CODEX_HOME}/config.toml   (default: ~/.codex/config.toml)
- tree      parent dirs scanning for ./.codex/config.toml
- repo      $(git rev-parse --show-toplevel)/.codex/config.toml
```

Project config lives in `.codex/` (not `.agents/`). The `.codex/` directory provides `config.toml` only — it is **not** a skill discovery path. Skill discovery for project scope uses `.agents/skills/` exclusively.

---

## 3. Artifact Format

### 3.1 SKILL.md

Every skill is a directory containing a required `SKILL.md` file. The loader enforces:

**Frontmatter** (YAML, delimited by `---`):
```yaml
---
name: "skill-name"          # required; max 64 chars after sanitize
description: "..."          # required; max 1024 chars after sanitize
metadata:
  short-description: "..."  # optional; max 1024 chars
---
```

**Parsing logic** (`loader.rs:599-662`):
- Frontmatter must open with `---` on the first line (trim-checked); missing frontmatter is a fatal parse error.
- YAML is parsed with `serde_yaml`.
- `name` field: if absent or empty after `sanitize_single_line` (collapses whitespace), the parent directory name is used (`loader.rs:664-674`).
- `description` field: if absent, defaults to empty string — **does not fail**. Empty description passes length validation because `validate_len` only rejects empty for `name` (`loader.rs:639`). However, the description being empty would impair skill discovery by the model.
- Multi-line strings in `name` and `description` are collapsed to single lines by `sanitize_single_line` (`loader.rs:894-896`): `raw.split_whitespace().collect::<Vec<_>>().join(" ")`.

**Length limits** (`loader.rs:111-120`):
| Field | Max chars |
|-------|-----------|
| name | 64 |
| description | 1024 |
| metadata.short-description | 1024 |

**No file size limit** on SKILL.md itself — only the extracted frontmatter fields have length limits.

**No TOML support** — frontmatter must be YAML. Attempting TOML-formatted frontmatter will produce a `serde_yaml::Error`.

### 3.2 Optional Metadata Sidecar (`agents/openai.yaml`)

The loader looks for `agents/openai.yaml` alongside `SKILL.md` in the skill directory (`loader.rs:687-750`):

```
skill-name/
├── SKILL.md
└── agents/
    └── openai.yaml
```

`openai.yaml` is a separate file parsed via `serde_yaml` into `SkillMetadataFile`. It supports:
```yaml
interface:
  display_name: "..."        # max 64 chars
  short_description: "..."  # max 1024 chars
  icon_small: "assets/..."  # must be relative path under assets/
  icon_large: "assets/..."
  brand_color: "#RRGGBB"    # strict 7-char hex format
  default_prompt: "..."     # max 1024 chars
dependencies:
  tools:
    - type: "..."
      value: "..."
      description: "..."
      transport: "..."
      command: "..."
      url: "..."
policy:
  allow_implicit_invocation: true
  products: []
```

This file is **optional and fail-open**: if absent or malformed, loading continues without error, and metadata fields default to `None` (`loader.rs:699-712`).

Icon paths must be relative and must start with `assets/`; absolute paths and `..` traversal are rejected (`loader.rs:846-891`).

### 3.3 AGENTS.md (Project Instructions)

`codex-rs/core/src/agents_md.rs` handles AGENTS.md discovery separately from skill discovery:

- Default filename: `AGENTS.md`
- Local override: `AGENTS.override.md` (checked first)
- Config-adjustable fallback names: `project_doc_fallback_filenames` in `config.toml`
- Size limit: `project_doc_max_bytes`, default `32 * 1024` bytes (32 KB) (`config_toml.rs:68`)
- Discovery: walks from project root to cwd, concatenating all AGENTS.md files found in order
- User-global: `~/.codex/AGENTS.md` and `~/.codex/AGENTS.override.md` also checked

AGENTS.md is injected into the model's system prompt, **not** into skill loading.

---

## 4. Lifecycle Hooks

### 4.1 Hook Event Types

`codex-rs/config/src/hook_config.rs` defines six hook events:

```rust
pub struct HookEventsToml {
    pub pre_tool_use: Vec<MatcherGroup>,          // "PreToolUse"
    pub permission_request: Vec<MatcherGroup>,    // "PermissionRequest"
    pub post_tool_use: Vec<MatcherGroup>,         // "PostToolUse"
    pub session_start: Vec<MatcherGroup>,         // "SessionStart"
    pub user_prompt_submit: Vec<MatcherGroup>,    // "UserPromptSubmit"
    pub stop: Vec<MatcherGroup>,                  // "Stop"
}
```

`codex-rs/hooks/src/events/` contains one module per event type:
- `session_start.rs` — fires when a session begins
- `pre_tool_use.rs` — fires before a tool call executes
- `post_tool_use.rs` — fires after a tool call returns
- `permission_request.rs` — fires on sandbox permission escalations
- `user_prompt_submit.rs` — fires when the user submits a prompt
- `stop.rs` — fires when the session terminates

### 4.2 Hook Results

`codex-rs/hooks/src/types.rs`:
```rust
pub enum HookResult {
    Success,
    FailedContinue(Box<dyn Error + Send + Sync>),
    FailedAbort(Box<dyn Error + Send + Sync>),
}
```

`FailedAbort` propagates to abort the in-progress operation; `FailedContinue` logs the error and proceeds.

### 4.3 Hook Configuration

Hooks are configured in `config.toml` under a `[hooks]` table. Configuration is **not** skill-driven — hooks are a separate concern from skill discovery. Skills can declare `dependencies.tools` in `openai.yaml` (listing tool types the skill requires), but this is metadata for the UI, not hook registration.

---

## 5. Current AIWG Deployment Behavior

AIWG's current deployment for Codex (as of this assessment):

| Artifact | AIWG deploys to | Source |
|----------|----------------|--------|
| Skills | `.codex/skills/` | `src/smiths/platform-paths.ts:80` |
| Agents | `.codex/agents/` | `src/smiths/platform-paths.ts:51` |
| Commands | `.codex/commands/` | `src/smiths/platform-paths.ts:23` |
| Rules | `.codex/rules/` | `src/smiths/platform-paths.ts:118` |
| Config file | `AGENTS.md` | `src/smiths/platform-paths.ts:154` |

**Skills path confirmed wrong:** `~/.codex/skills/` (the deprecated user-scope path, honoured for backward compat) is what AIWG would write user-scoped skills to, but the primary project-scope path is `.agents/skills/`, not `.codex/skills/`. Project-level deployment to `.codex/skills/` is **not scanned** by the Codex loader at all — `.codex/` contains only `config.toml` and AGENTS.md, not skill directories.

This discrepancy is tracked in issue #766 and documented in `docs/providers/skills-paths.md:43-44`.

**CLAUDE.md multi-platform table** (`~/.codex/prompts/` for commands, `~/.codex/skills/` for skills) reflects the legacy TypeScript CLI paths, not the current Rust implementation. Commands in Codex are handled via slash commands, not a file-based directory (`docs/slash_commands.md` points to vendor docs). The `~/.codex/prompts/` path has no corresponding loader in `codex-rs`.

**Agents** — `.codex/agents/` is not a Codex loader path. The loader scans `.agents/skills/` for skills; there is no separate agents directory loader in the Rust implementation.

**Rules** — `.codex/rules/` has no corresponding loader in `codex-rs`. Rules/config in Codex flow through `~/.codex/config.toml` and `.codex/config.toml`, not a `rules/` directory.

---

## 6. Gaps vs. Latest Provider Mechanism

### Gap 1: Skills deploy path is wrong (CRITICAL — tracked #766)

| | AIWG current | Codex actual |
|--|-------------|-------------|
| Project skills | `.codex/skills/` | `.agents/skills/` |
| User skills | `~/.codex/skills/` | `~/.agents/skills/` (primary) |

`loader.rs:295-300` registers `~/.codex/skills/` under a `// Deprecated user skills location` comment, kept for backward compat. `loader.rs:303-310` registers `~/.agents/skills/` as the current primary path. `loader.rs:342-374` registers `.agents/skills/` relative to each ancestor directory for repo-scope.

AIWG writes to `.codex/skills/` — skills land in the deprecated path and will be discovered, but may silently be deprioritized if any skill at the same name exists in `~/.agents/skills/`. More importantly, project-scoped `aiwg use sdlc --provider codex` deploys to `.codex/skills/`, which receives **no scanner call** for repo-scope — it would only be picked up if the user also had it as their `$CODEX_HOME` directory (i.e., if `CODEX_HOME=.codex`, which is non-standard).

**Impact:** Skills deployed with `aiwg use sdlc --provider codex` are not discovered in repo scope. They may be discovered in user scope only if `$CODEX_HOME` happens to resolve to a path containing `.codex/skills/`, which is the deprecated user path, not the repo path.

**Fix:** Change `getSkillsDirectory('codex', ...)` in `src/smiths/platform-paths.ts` from `.codex/skills` to `.agents/skills`. For user-scoped installs, write to `~/.agents/skills/` instead of `~/.codex/skills/`.

### Gap 2: `.codex/agents/` path does not exist in Codex loader (HIGH)

AIWG deploys agents to `.codex/agents/`. The Codex Rust loader has no scanner for this path. Agent-like definitions for Codex flow through skills (`SKILL.md` with appropriate description) or through the plugin/marketplace system. There is no file-based agent discovery directory in `codex-rs`.

**Impact:** Agent markdown files written to `.codex/agents/` are silently ignored by Codex.

**Fix:** AIWG agent definitions for Codex should be converted to SKILL.md format and deployed to `.agents/skills/`, or the AIWG docs should clarify that Codex has no agent-directory loader.

### Gap 3: `.codex/commands/` path has no loader in codex-rs (HIGH)

AIWG deploys commands to `.codex/commands/`. Slash commands in Codex are built-in (`/init`, `/model`, `/bug`, etc.) and defined in `codex-rs/tui/src/slash_command.rs`. There is no user-extensible slash command directory in `codex-rs` (`docs/slash_commands.md` simply links to vendor docs). The legacy TypeScript `codex-cli` had a different interface.

**Impact:** Command files in `.codex/commands/` are ignored by Codex.

**Fix:** Document that commands are not file-deployable on Codex. The AIWG `getCommandsDirectory('codex')` path should either be empty string or redirect to `.agents/skills/` if the intent is to deploy as skills.

### Gap 4: `.codex/rules/` path has no loader in codex-rs (MEDIUM)

Rules content in Codex is provided via `config.toml` (`instructions` field) and AGENTS.md. There is no `rules/` directory scanner. AIWG deploys rules to `.codex/rules/`, which is silently ignored.

**Impact:** Rules are not loaded by Codex when deployed to `.codex/rules/`.

**Fix:** Rules content should be injected into `AGENTS.md` for Codex, or concatenated into `~/.codex/config.toml` under `instructions`. The AIWG `getRulesDirectory('codex')` path should return empty string, with rules funneled into AGENTS.md deployment.

### Gap 5: `~/.codex/prompts/` path does not exist in codex-rs (MEDIUM)

The CLAUDE.md table lists `~/.codex/prompts/` as the Codex CLI commands path. This path exists in neither `codex-rs` nor the `codex-cli` TypeScript source as a scanned directory. The CLAUDE.md table is stale — it describes a path that has never been verified against source.

**Impact:** Anything written to `~/.codex/prompts/` is silently ignored by Codex.

**Fix:** Remove `~/.codex/prompts/` from CLAUDE.md table and set `getCommandsDirectory('codex')` to empty string.

### Gap 6: AGENTS.md size limit not enforced by AIWG (LOW)

Codex enforces a 32 KB cap on AGENTS.md (`config_toml.rs:68`: `DEFAULT_PROJECT_DOC_MAX_BYTES = 32 * 1024`). This is configurable. AIWG generates AGENTS.md for Codex but does not warn if the file exceeds this limit.

**Impact:** Large AGENTS.md files will be silently truncated by Codex at 32 KB.

**Fix:** Add a size check in the AIWG Codex deployer that warns when generated AGENTS.md exceeds 32 KB.

### Gap 7: `metadata.short-description` not populated by AIWG (LOW)

The Codex loader supports a `metadata.short-description` field in SKILL.md frontmatter (`loader.rs:50-52`). AIWG-generated SKILL.md files do not include this field. Additionally, the `agents/openai.yaml` sidecar format is not generated by AIWG.

**Impact:** Skills deployed by AIWG will not have UI metadata (display name, icon, short description, default prompt) in Codex's skill picker UI.

**Fix:** Add `metadata.short-description` extraction from AIWG skill frontmatter, and generate `agents/openai.yaml` sidecars during `aiwg use --provider codex` deployment.

---

## 7. New Capabilities Not Yet Exploited

### 7.1 Multi-scope Discovery Architecture

Codex's scope hierarchy (Repo → User → System → Admin) is richer than AIWG currently targets. AIWG could deploy:
- Project skills to `.agents/skills/` (Repo scope, highest priority)
- User-global skills to `~/.agents/skills/` (User scope)

This allows user-level AIWG skills to be overridden by project-level specializations, which maps well to the AIWG intent of per-project customization.

### 7.2 `agents/openai.yaml` Sidecar for UI Metadata

The `openai.yaml` sidecar enables rich UI integration in Codex's skill picker: icons, display names, default prompts, brand colors, and product gating. AIWG skills currently have none of these. Generating minimal sidecars (display_name from skill name, short_description from description) during deployment would improve discoverability.

### 7.3 `policy.allow_implicit_invocation`

`loader.rs:87-93` / `model.rs:37-40` — skills can declare `allow_implicit_invocation: false` to prevent the model from autonomously selecting them; they only activate on explicit user invocation. AIWG skills that should be explicit-only (e.g., deployment skills) should set this.

### 7.4 `policy.products` Product Gating

Skills can gate themselves to specific Codex product tiers (`products: []` means all products). AIWG could use this to make enterprise-only skills invisible to free-tier users.

### 7.5 Plugin Skill Roots

`loader.rs:256-261` — plugins (via the Codex marketplace) can contribute additional skill roots. AIWG could publish as a marketplace plugin, giving skills a namespaced identity (`plugin-id:skill-name`). This is higher effort but would provide official marketplace distribution.

### 7.6 `AGENTS.override.md`

Codex checks for `AGENTS.override.md` before `AGENTS.md` (`agents_md.rs:65`). AIWG could use this for machine-generated content, leaving `AGENTS.md` for human authoring.

### 7.7 `project_doc_fallback_filenames`

`config_toml.rs:232-233` — users can configure a list of fallback filenames when `AGENTS.md` is absent. AIWG could document that setting `project_doc_fallback_filenames = ["CLAUDE.md"]` lets Codex pick up the Claude-targeted instructions file.

---

## 8. Cross-Port Candidates

### 8.1 `.agents/skills/` as Cross-Platform Convention

The `.agents/skills/` path is confirmed as primary for Codex (HIGH evidence). It is also confirmed for OpenClaw (`src/agents/skills/workspace.ts`) and documented for Warp. Deploying AIWG skills to `.agents/skills/` would give portable coverage across three confirmed providers plus Claude Code's `allow_tools` path-based discovery.

**Recommendation:** Make `.agents/skills/` the primary AIWG Codex deployment path and add it as a default cross-platform output alongside provider-specific paths.

### 8.2 `SKILL.md` Format Unification

The Codex `SKILL.md` frontmatter schema (`name`, `description`, `metadata.short-description`) is compatible with Claude Code's schema. AIWG already uses this format. The main unification gap is `agents/openai.yaml` sidecar generation — this is Codex-specific and should be emitted only during Codex deployment.

### 8.3 AGENTS.md as System Instructions Channel

Codex concatenates AGENTS.md files hierarchically and injects them into the system prompt. This is analogous to CLAUDE.md in Claude Code. AIWG's AGENTS.md deployment for Codex is architecturally correct; the gaps are: (a) size awareness, (b) not exploiting `AGENTS.override.md`.

### 8.4 Scope Priority Awareness in AIWG Doctor

AIWG doctor could verify that skills are in the correct scope path (`.agents/skills/` for project, `~/.agents/skills/` for user-global) and warn if they are in the deprecated `~/.codex/skills/` path.

---

## 9. Citations

All source-code citations are from the shallow clone at commit `91b73501` (2026-05-05).

| Claim | Evidence | GRADE |
|-------|----------|-------|
| Primary project skill path is `.agents/skills/` | `codex-rs/core-skills/src/loader.rs:107` (`AGENTS_DIR_NAME = ".agents"`), `355` (`dir.join(AGENTS_DIR_NAME).join(SKILLS_DIR_NAME)`) | HIGH |
| `~/.codex/skills/` is deprecated | `loader.rs:296-299` (comment: "Deprecated user skills location") | HIGH |
| `~/.agents/skills/` is primary user path | `loader.rs:303-310` | HIGH |
| `SKILL.md` is the only recognised filename | `loader.rs:106` (`SKILLS_FILENAME: &str = "SKILL.md"`) | HIGH |
| Max scan depth is 6 | `loader.rs:122` (`MAX_SCAN_DEPTH: usize = 6`) | HIGH |
| Max dirs per root is 2000 | `loader.rs:123` (`MAX_SKILLS_DIRS_PER_ROOT: usize = 2000`) | HIGH |
| Files starting with `.` are skipped | `loader.rs:517` | HIGH |
| Symlinks followed for Repo/User/Admin, not System | `loader.rs:494-498` | HIGH |
| Frontmatter must be YAML delimited by `---` | `loader.rs:957-978` (`extract_frontmatter`) | HIGH |
| `name` max 64 chars | `loader.rs:111` | HIGH |
| `description` max 1024 chars | `loader.rs:112` | HIGH |
| `agents/openai.yaml` sidecar path | `loader.rs:108-109` | HIGH |
| `$CODEX_HOME` defaults to `~/.codex` | `utils/home-dir/src/lib.rs:59` | HIGH |
| AGENTS.md default size limit 32 KB | `config/src/config_toml.rs:68` | HIGH |
| Six hook event types | `config/src/hook_config.rs:32-44` | HIGH |
| Hook event files | `codex-rs/hooks/src/events/mod.rs` | HIGH |
| `FailedAbort` aborts operation | `hooks/src/types.rs:18-26` | HIGH |
| AIWG deploys skills to `.codex/skills/` | `src/smiths/platform-paths.ts:80` | HIGH (AIWG source) |
| AIWG deploys agents to `.codex/agents/` | `src/smiths/platform-paths.ts:51` | HIGH (AIWG source) |
| AIWG deploys commands to `.codex/commands/` | `src/smiths/platform-paths.ts:23` | HIGH (AIWG source) |
| AIWG deploys rules to `.codex/rules/` | `src/smiths/platform-paths.ts:118` | HIGH (AIWG source) |
| skills-paths.md already documents #766 | `docs/providers/skills-paths.md:43-44` | HIGH (AIWG docs) |
| Scope priority: Repo > User > System > Admin | `loader.rs:210-226` | HIGH |
| `policy.allow_implicit_invocation` | `loader.rs:87-93`, `model.rs:37-40` | HIGH |
| AGENTS.override.md checked before AGENTS.md | `core/src/agents_md.rs:65` | HIGH |
| Slash commands not file-deployable | `codex-rs/tui/src/slash_command.rs` (built-in enum, no file loader) | HIGH |
| Sample SKILL.md format | `codex-rs/skills/src/assets/samples/skill-creator/SKILL.md` | HIGH |
| No `.codex/rules/` scanner in codex-rs | grep of codex-rs found no `rules` directory loader | HIGH |
| No `.codex/commands/` scanner in codex-rs | grep of codex-rs found no `commands` directory loader | HIGH |

---

*Assessment produced by AIWG Technical Researcher agent for issue #1091.*
*Do not modify without updating the commit hash and re-verifying against source.*
