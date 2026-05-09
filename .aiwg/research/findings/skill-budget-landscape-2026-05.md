---
title: "Agentic Skill-Budget Landscape — May 2026"
created: 2026-05-09
issue: "#1212"
type: research_survey
topics:
  - skill-discovery
  - on-demand-loading
  - context-budgets
  - index-driven-discovery
grade: HIGH (source-code findings) / MODERATE (docs-only platforms)
---

# Agentic Skill-Budget Landscape — May 2026

## Purpose

Survey the skill listing and discovery budget constraints across the 10 platforms AIWG supports
(Claude Code, Codex, GitHub Copilot, Factory AI, Cursor, OpenCode, Warp, Windsurf, OpenClaw,
Hermes) to inform the design of an index-driven on-demand skill-discovery layer for issue #1212.

**AIWG current state as of this survey:** 393 skills deployed (rc.11 of 2026.5.0).

---

## Platform Summaries

### 1. Claude Code

**Source evidence:** MODERATE (no public loader source; docs + AIWG internal)

- **Skill budget:** No hard cap documented. Skills inject lazily — only the relevant skill's
  `SKILL.md` is loaded into context when invoked or auto-selected. Claude Code does NOT inject
  all 393 SKILL.md bodies at session start; descriptors are the lightweight signal.
- **Discovery primitives:** `.claude/skills/<name>/SKILL.md` (project), `~/.claude/skills/` (user),
  plugin namespace `plugin-name:skill-name`. Plugins can provide additional skill roots. Plugin
  marketplace (`marketplace.json`) supports listing/installing skills. No runtime introspection
  API confirmed from docs.
- **Trend:** Claude Code was the originator of the SKILL.md standard (2025). Skills replaced
  slash commands as the canonical format. The platform is the superset reference for all AIWG
  deployments. No cap tightening observed.
- **Skill manifest/capability registry:** Skills have frontmatter (`name`, `description`,
  `commandHint`, `allowedTools`, `model`, `category`). No runtime "list all skills" tool ships
  by default. Plugin marketplace (`/plugin list`) provides browsable catalog at the operator level.
- **Kernel + index compatibility:** CLEAN. Claude Code is the design baseline. A 30-skill kernel
  in `.claude/skills/` plus an index skill that queries `.aiwg/index/` with the MCP/Bash tool
  works without friction. AIWG already ships 393 skills here; kernel approach reduces what is
  always-available but does not eliminate discovery.

**Key paths:** `.claude/skills/<name>/SKILL.md`, `.claude/agents/`, `.claude/rules/`,
`~/.claude/skills/`, `~/.claude/agents/`

---

### 2. OpenAI Codex CLI

**Source evidence:** HIGH (full Rust source at `codex-rs/`, commit `91b73501`)

- **Skill budget:** No per-skill char limit. `AGENTS.md` capped at **32 KB hard**
  (`codex-rs/config_toml.rs:68`: `DEFAULT_PROJECT_DOC_MAX_BYTES = 32 * 1024`).
  Operator-tunable via `project_doc_max_bytes` config field. The hard cap applies only to
  AGENTS.md, not to individual SKILL.md files. Skill bodies are not concatenated into AGENTS.md;
  AGENTS.md is the context bootstrap, not the skill corpus.
  - Skill scan constants: `MAX_SCAN_DEPTH = 6`, `MAX_SKILLS_DIRS_PER_ROOT = 2000`
    (`codex-rs/core-skills/src/loader.rs:122-123`). Truncation emits `tracing::warn`, not error.
  - Skill frontmatter: `name` max 64 chars, `description` max 1024 chars (`loader.rs:111-112`).
- **Discovery primitives:** Hierarchical scope stack — Repo (`.agents/skills/`, BFS up to cwd),
  User (`~/.agents/skills/`), Deprecated-User (`~/.codex/skills/`), System, Admin.
  File `SKILL.md` only. No runtime "list skills" slash command; skills are surfaced in Codex's
  skill-picker UI via `agents/openai.yaml` sidecar metadata.
- **Trend:** The `.agents/skills/` path replaced `~/.codex/skills/` as the primary path
  (deprecated comment confirmed in `loader.rs:296-299`). This happened within the last 12 months.
  AIWG still deploys to the deprecated path (#766 tracked but unresolved as of rc.11).
- **Skill manifest:** `agents/openai.yaml` sidecar (`loader.rs:108-109`) provides UI metadata
  (display name, icon, short description, brand color, default prompt, product gating).
  AIWG does not generate this sidecar yet (Gap 7 in parity assessment).
- **Kernel + index compatibility:** AWKWARD. AIWG's skills currently land in the wrong path.
  After #766 is fixed (`.codex/skills/` → `.agents/skills/`), a kernel + disk-index approach
  works: AGENTS.md links point to the index skill, and Codex resolves those links on demand.
  AGENTS.md 32KB cap is the binding constraint for the discovery bridge file.

**Key paths:** `.agents/skills/<name>/SKILL.md` (correct primary — not yet used by AIWG),
`~/.agents/skills/`, `AGENTS.md` (32KB hard cap), `AGENTS.override.md` (checked first)

---

### 3. GitHub Copilot / VS Code

**Source evidence:** HIGH (VS Code TypeScript source, commit `fdfcb7b4`, `promptFileLocations.ts`)

- **Skill budget:** Maximum **15,000 characters** of skill description content injected into
  context per request. After budget exhaustion, remaining skill names appended up to a further
  **5,000-character name list**. Source: `computeAutomaticInstructions.ts:465-505`.
  Skills with no `description` field are excluded from model-invocable listing (`computeAutomaticInstructions.ts:407-409`).
- **Discovery primitives:** Scans 6 paths simultaneously:
  `.agents/skills/`, `.github/skills/`, `.claude/skills/`, `~/.agents/skills/`,
  `~/.copilot/skills/`, `~/.claude/skills/` (`promptFileLocations.ts:157-164`).
  User-configurable via `chat.agentSkillsLocations` VS Code setting.
  Skills invoked via `@skill-name`. Skill folder names must match `^[a-z0-9-]+$`.
- **Trend:** Copilot added `.claude/skills/` to its scan list — meaning AIWG skills deployed
  for Claude Code are automatically discovered by Copilot without any additional deployment.
  This is a meaningful cross-platform gain. Skills feature is expanding; rules discovery now
  also scans `.claude/rules/`.
- **Skill manifest:** No dedicated registry concept. Skills are discovered from the filesystem.
  `disable-model-invocation: true` frontmatter hides a skill from model auto-selection
  (user-invocable only via `@mention`).
- **Kernel + index compatibility:** CLEAN, with one caveat. The 15K char description budget means
  ~100 skills with 150-char descriptions fit comfortably. With 393 skills, only the kernel's
  descriptions would inject automatically; remaining skills need explicit invocation or the index
  skill to surface them. An index skill that responds to "what skills are available for X?" maps
  well to this model.

**Key paths:** `.agents/skills/`, `.github/skills/`, `.claude/skills/` (auto-scanned),
`~/.copilot/skills/`, `.github/prompts/` (commands, `.prompt.md` extension)

---

### 4. Factory AI

**Source evidence:** MODERATE (docs-only, commit `709b1e3` of docs repo `v0.118.0`)

- **Skill budget:** No confirmed char or token limit on individual SKILL.md files. Droid
  `description` field is capped at ≤500 chars (`custom-droids.mdx:85`). No documented aggregate
  skill listing budget. Factory uses progressive disclosure — Droid evaluates skill descriptions
  at request time (docs: `skills.mdx:§invocation`).
- **Discovery primitives:** `.factory/skills/<name>/SKILL.md` (project), `~/.factory/skills/`
  (personal), `.agent/skills/` (compatibility alias). Droids have `user-invocable` and
  `disable-model-invocation` frontmatter controls identical to Claude Code. Plugin system at
  `.factory-plugin/plugin.json` allows skills to be bundled into distributable packages.
- **Trend:** v0.118.0 added plugin support (last 3 months). Skills appear to be on an upward
  trajectory; no cap tightening observed.
- **Skill manifest/capability registry:** Plugin manifest at `.factory-plugin/plugin.json` is
  a capability registry for distributable skill bundles. No runtime introspection API.
- **Kernel + index compatibility:** CLEAN. Factory's plugin system is the natural delivery
  mechanism for a kernel + index pattern. The `.factory-plugin/` bundle format maps well
  to an AIWG plugin that provides the kernel skills plus an index-query skill.

**Key paths:** `.factory/skills/<name>/SKILL.md`, `~/.factory/skills/`, `.agent/skills/` (compat),
`.factory-plugin/plugin.json` (bundle manifest)

---

### 5. Cursor

**Source evidence:** MODERATE (closed-source; vendor docs + AIWG integration code)

- **Skill budget:** Skills are "loaded on-demand when relevant" (docs). Rules recommended to stay
  under **500 lines** (Cursor docs). No confirmed char limit on skills. The `/migrate-to-skills`
  command in Cursor 2.4 exists precisely to reduce always-on context overhead — suggesting
  on-demand is preferred over always-loading. No aggregate budget figure confirmed from primary
  source.
- **Discovery primitives:** `.cursor/skills/<name>/SKILL.md` since v2.4. `AGENTS.md` at
  project root (additive with `.cursor/rules/`). Invoked via `@skill-name`. `.cursor/rules/`
  MDC files support `alwaysApply`, `model_decision`, `glob`, and `manual` trigger modes.
- **Trend:** Skills support was added in Cursor 2.4 (recent, ~Q1 2026). Cursor is moving from
  always-on rules toward on-demand skills — the same architectural direction as the other
  platforms. No cap tightening on skills observed since launch.
- **Skill manifest:** No formal registry. MDC frontmatter `description` drives agent relevance
  evaluation. `alwaysApply: false` + `description` set = "Apply Intelligently" mode (on-demand).
- **Kernel + index compatibility:** CLEAN. Cursor's on-demand skill model is well-suited to
  a kernel + index pattern. Skills with `alwaysApply: false` and good descriptions let Cursor
  evaluate relevance; the index skill handles "what skills does AIWG have for X?" queries.

**Key paths:** `.cursor/skills/<name>/SKILL.md`, `.cursor/rules/*.mdc`, `AGENTS.md`

---

### 6. OpenCode

**Source evidence:** HIGH (full TypeScript source, commit `25ecf0af`, `packages/opencode/src/skill/index.ts`)

- **Skill budget:** No explicit char/token budget in source. `Glob.scan` is unrestricted; Bun
  reads full file. No aggregated listing injected into system prompt at session start — skills
  are loaded into context only when invoked. Duplicate names logged as warnings but allowed
  (last-write-wins per insertion order). No item count cap in source.
- **Discovery primitives:** Four-pass scan:
  (1) External cross-platform global (`~/.claude/skills/**`, `~/.agents/skills/**`),
  (2) Project walk-up (`.claude/skills/**`, `.agents/skills/**` in any ancestor),
  (3) OpenCode config dirs (`.opencode/skill/`, `.opencode/skills/`),
  (4) Explicit `skills.paths` and `skills.urls` in `opencode.jsonc`.
  Remote URL fetching via `skill/discovery.ts` — can pull an `index.json` and download skills on demand.
- **Trend:** OpenCode natively scans `.claude/skills/` (Pass 2) — AIWG skills deployed for
  Claude Code are automatically discovered by OpenCode. The remote URL fetch capability was
  present at commit `25ecf0af`; this is likely a recent addition enabling index-driven discovery.
- **Skill manifest/capability registry:** `opencode.jsonc` `skills.urls` field is effectively
  a remote skill registry pointer. An index server returning `index.json` + SKILL.md files is
  the native on-demand model for OpenCode.
- **Kernel + index compatibility:** CLEAN, and OpenCode has the best native story for remote
  index-driven discovery. The `skills.urls` config supports exactly the kernel + external-index
  pattern without any additional tooling. `.claude/skills/` auto-discovery means no extra deploy step.

**Key paths:** `~/.claude/skills/**`, `~/.agents/skills/**`, `.opencode/skill/`, `.opencode/skills/`,
`opencode.jsonc` (`skills.paths`, `skills.urls`)

---

### 7. Warp Terminal

**Source evidence:** MODERATE (closed-source; oz-skills examples HIGH for format)

- **Skill budget:** No documented size limit on individual SKILL.md files. No documented
  aggregate listing budget. **Progressive disclosure confirmed** — "only the `name` and
  `description` fields from skill frontmatter are loaded into context by default. Full `SKILL.md`
  content is loaded on demand when the skill is invoked." (Warp docs). This is deliberate design
  for context efficiency.
- **Discovery primitives:** Scans `.agents/skills/` (primary), `.warp/skills/`, and the
  equivalents for all other platforms deployed in the same repo. User-global `~/.agents/skills/`,
  `~/.warp/skills/`. Invocation: automatic (intent-matching against descriptions) or explicit
  `/{skill-name}`. No runtime "list skills" API; Warp Drive panel provides browsable listing.
- **Trend:** `AGENTS.md` is now preferred over `WARP.md` per Warp docs (WARP.md is legacy
  spelling). Skills on `.agents/skills/` path are the preferred cross-platform deployment.
  No cap changes observed.
- **Skill manifest:** Skills are surfaced in the Warp Drive UI panel. No file-based registry.
  Descriptions drive both automatic invocation and UI display.
- **Kernel + index compatibility:** CLEAN. Progressive disclosure (name+description only) means
  Warp can handle a large skill corpus without context pressure. An index skill that responds
  to discovery queries complements the auto-invocation model. Warp Drive UI panel handles the
  browsable listing concern.

**Key paths:** `.agents/skills/<name>/SKILL.md` (primary cross-platform), `.warp/skills/`,
`AGENTS.md` (preferred over `WARP.md`), `~/.agents/skills/`

---

### 8. Windsurf

**Source evidence:** MODERATE (closed-source; AIWG integration code HIGH)

- **Skill budget:** No per-skill size limit documented. Rules capped at **12,000 chars per file**
  (workspace) and **6,000 chars** (global `global_rules.md`). Skills trigger on-demand by default
  — "Only `name` and `description` are in context by default (progressive disclosure of full
  content)." Windsurf 1.13.6 added native skills; progressive disclosure was present at launch.
- **Discovery primitives:** `.windsurf/skills/<name>/SKILL.md` (primary, since v1.13.6),
  `.agents/skills/<name>/SKILL.md` (cross-agent compat), `~/.codeium/windsurf/skills/`.
  `trigger` frontmatter controls loading: `always_on`, `model_decision`, `glob`, `manual`.
  Skills invoked via `@skill-name`.
- **Trend:** Skills were native since January 2026 (v1.13.6). Rules char limit (12K) is a
  specific enforcement that AIWG's `windsurf.mjs` now checks. Rules system has `model_decision`
  trigger (equivalent to Cursor's "Apply Intelligently") — indicating active convergence toward
  on-demand patterns across all closed-source IDEs.
- **Skill manifest:** No formal registry. Frontmatter descriptions drive model decisions.
  Enterprise MDM paths allow system-level skill deployment.
- **Kernel + index compatibility:** CLEAN. Progressive disclosure means a large AIWG corpus
  does not bloat context. The `.agents/skills/` cross-compat path means AIWG skills deployed
  for Claude Code are also available to Windsurf without a separate deploy step.

**Key paths:** `.windsurf/skills/<name>/SKILL.md`, `.agents/skills/` (compat),
`~/.codeium/windsurf/skills/`, `.windsurf/rules/*.md` (12K char/file)

---

### 9. OpenClaw

**Source evidence:** HIGH (full TypeScript source, commit `c37871e7`, `src/agents/skills/workspace.ts`)

- **Skill budget (hard constants in source):**
  - Max file size per SKILL.md: **256 KB** (`DEFAULT_MAX_SKILL_FILE_BYTES`, `workspace.ts:128`)
  - Max skills loaded per source: **200** (`DEFAULT_MAX_SKILLS_LOADED_PER_SOURCE`, `workspace.ts:126`)
  - Max skills in prompt: **150** (`DEFAULT_MAX_SKILLS_IN_PROMPT`, `workspace.ts:127`)
  - Max chars in prompt: **18,000** (`DEFAULT_MAX_SKILLS_PROMPT_CHARS`, `workspace.ts:129`)
  - Compact fallback: when full format exceeds char budget, fallback to name+location only.
    If compact still exceeds budget, binary-search until fit. (`workspace.ts:877-928`)
- **Discovery primitives:** Six-tier stack (ascending precedence):
  `config.skills.load.extraDirs[]` → bundled → `~/.openclaw/skills/` → `~/.agents/skills/` →
  `{workspace}/.agents/skills/` → `{workspace}/skills/`.
  Two-level recursion maximum from each root. `openclaw.*` frontmatter block provides platform
  metadata including `always` (force-include), OS gating, binary requirements.
- **Trend:** No cap changes observed at assessed commit. The 150-skill prompt cap and 18K char
  limit are enforced constants, not defaults — they represent the design intent.
- **Skill manifest/capability registry:** OpenClaw ships a `skill_manager_tool.py` equivalent —
  the `openclaw skills list` CLI command and in-agent skill picker. The `always: true` frontmatter
  field forces skill inclusion regardless of eligibility (relevant for kernel skills).
- **Kernel + index compatibility:** AWKWARD for large deployments. The 150-skill prompt cap is
  the binding constraint: with 393 AIWG skills deployed, only 150 appear in the model's context.
  The remaining 243 are invisible unless explicitly invoked. An index skill that helps the model
  query for skills beyond the 150-cap solves this directly. Use `openclaw.always: true` for the
  kernel skills (≤30) to guarantee their presence; let the index skill handle the rest.

**Key paths:** `~/.openclaw/skills/`, `~/.agents/skills/`, `{workspace}/.agents/skills/`,
`{workspace}/skills/`; 150-skill prompt cap, 18K char cap

---

### 10. Hermes Agent

**Source evidence:** HIGH (full Python source, commit `de9238d3`, `agent/skill_utils.py`,
`tools/skills_tool.py`)

- **Skill budget (source-confirmed):**
  - `name` max 64 chars; `description` max 1024 chars (`tools/skills_tool.py:91-92`)
  - Initial read cap during listing scan: **4,000 chars** per skill (`tools/skills_tool.py:582`)
  - AGENTS.md context cap: **20,000 chars** (`agent/prompt_builder.py`)
  - No confirmed aggregate skill prompt budget (skills are loaded into context on demand per
    session invocation, not as a bulk listing in the system prompt).
- **Discovery primitives:** `~/.hermes/skills/` (primary, `os.walk` with unlimited depth),
  plus `skills.external_dirs` in config for additional directories. `skills.external_dirs`
  supports any filesystem path or `~`-expanded path — this is effectively a registry pointer list.
  Slash commands `/skill-name` are generated at runtime from SKILL.md `name` frontmatter fields.
  The `skill_manager_tool.py` agent-editable skill tool enables in-session skill management.
- **Trend:** `os.walk` unlimited recursion + configurable `external_dirs` means Hermes was
  designed for large, distributed skill corpora from the start. No tightening observed.
- **Skill manifest/capability registry:** No formal manifest file. `skills.external_dirs` config
  is the closest equivalent to a registry pointer. Template vars `${HERMES_SKILL_DIR}` and
  `${HERMES_SESSION_ID}` enable dynamic skill content.
- **Kernel + index compatibility:** CLEAN. `skills.external_dirs` natively supports pointing
  Hermes at an AIWG-managed skill directory. A kernel + index pattern maps well: deploy 30 kernel
  skills to `~/.hermes/skills/`, add the AIWG skill corpus via `skills.external_dirs`, include
  an index skill that answers discovery queries.

**Key paths:** `~/.hermes/skills/`, `skills.external_dirs` config,
`~/.hermes/config.yaml` (`skills.external_dirs`)

---

## Trade-off Table

| Platform | Budget Type | Hard Cap | Default Cap | Operator-Tunable? | Discovery Primitive | Progressive Disclosure | On-Demand Ready? |
|----------|-------------|----------|-------------|-------------------|--------------------|-----------------------|-----------------|
| Claude Code | None confirmed | None | None | N/A | FS scan, plugin marketplace | Not confirmed | Yes (lazy by design) |
| Codex CLI | AGENTS.md 32KB | 32KB | 32KB | Yes (`project_doc_max_bytes`) | FS BFS, scope stack | Not confirmed | Yes (skills not concatenated) |
| GitHub Copilot | Skill description chars | 15K desc + 5K names | Same | Via `chat.agentSkillsLocations` | FS multi-path scan | Yes (name+desc only) | Yes |
| Factory AI | None confirmed | None (≤500 desc for droids) | None | N/A | FS scan, plugin bundle | Not confirmed | Yes (progressive) |
| Cursor | None confirmed (500-line rule guidance) | None | None | N/A | FS scan, AGENTS.md | Yes (on-demand default) | Yes |
| OpenCode | None (unlimited read) | None | None | `skills.paths`, `skills.urls` | 4-pass FS + remote URL | Not confirmed | Yes (remote URL native) |
| Warp | None confirmed | None | None | N/A | FS multi-path, intent matching | Yes (name+desc only) | Yes |
| Windsurf | 12K chars/rule file | None on skills | None | MDM for enterprise | FS scan, trigger modes | Yes (name+desc only) | Yes |
| OpenClaw | 150 skills in prompt, 18K chars | 150 skills | Same | No (hard code) | 6-tier FS stack | Yes (compact fallback) | Awkward |
| Hermes | 4K chars listing scan, 20K AGENTS.md | None | 4K/skill scan | `skills.external_dirs` | os.walk unlimited | Not confirmed (load on invoke) | Yes |

---

## Compatibility Verdict

### Clean — kernel + index works without friction

| Platform | Verdict | Notes |
|----------|---------|-------|
| Claude Code | CLEAN | Native baseline. 393 skills already working. Index skill via Bash/MCP is idiomatic. |
| GitHub Copilot | CLEAN | 15K desc budget handles ~100 kernel skills; index skill handles the rest. `.claude/skills/` auto-scan means zero extra deploy. |
| Factory AI | CLEAN | Plugin manifest is natural delivery for kernel + index bundle. No budget pressure. |
| Cursor | CLEAN | On-demand default is ideal for index pattern. `model_decision` trigger for index skill. |
| OpenCode | CLEAN (best remote story) | `skills.urls` native remote index fetch. `.claude/skills/` auto-scan. Best fit for index-driven discovery. |
| Warp | CLEAN | Progressive disclosure already in place. `.agents/skills/` cross-platform path. |
| Windsurf | CLEAN | Progressive disclosure. `.agents/skills/` compat path. |
| Hermes | CLEAN | `external_dirs` config points directly at AIWG skill trees. Unlimited depth. |

### Awkward — works but requires explicit design accommodation

| Platform | Verdict | Constraint | Mitigation |
|----------|---------|------------|-----------|
| OpenClaw | AWKWARD | 150-skill prompt cap, 18K char limit (hard-coded). 393 AIWG skills exceed cap by 2.6×. | Mark kernel ≤30 skills with `openclaw.always: true`. Deploy index skill. Remaining 243 skills are present on disk but only surfaced via explicit `@mention` or index query. |
| Codex CLI | AWKWARD | AIWG deploys to wrong path (`.codex/skills/` vs `.agents/skills/`). After #766 is fixed, clean. AGENTS.md 32KB cap constrains the discovery bridge. | Fix #766 first. Use AGENTS.md link-index style (ADR-1). Index skill itself stays in `.agents/skills/`. |

### Does not apply — no skill system or special handling required

No platform in the 10 falls into "not at all" — every platform has a skill system or can use
AGENTS.md + link-index as a discovery bridge.

---

## Recommendations for AIWG

### Platforms that drive the design constraints

**OpenClaw (150-skill hard cap)** is the binding constraint that forces explicit kernel design.
With 393 skills, OpenClaw operators silently lose 243 skills today. An index skill with
`openclaw.always: true` solves this, but it means AIWG must define a canonical kernel of ≤30
skills that are always guaranteed to be in context.

**GitHub Copilot (15K char description budget)** is the second binding constraint. At 150 chars
per description, 100 skills fit in the always-injected description budget. An index skill
handles the remaining 293 skills for discovery. Copilot's auto-scan of `.claude/skills/` is
a free win — no extra deployment step needed.

**Codex AGENTS.md 32KB cap** is already handled by ADR-1's link-indexed style. The index skill
itself must be discoverable from `.agents/skills/` once #766 is fixed.

### Platforms that are flexible

OpenCode, Warp, Windsurf, Hermes, Factory AI, Cursor, and Claude Code all have either no hard
cap or graceful progressive disclosure. Designing for OpenClaw + Copilot covers the tightest
constraints; all other platforms get a free improvement.

### The kernel design recommendation

Define a canonical AIWG kernel of **≤30 skills** that satisfies:
1. Always present in OpenClaw's 150-skill prompt (use `openclaw.always: true`).
2. Fits within Copilot's 15K char always-injected description budget (~100 skills, but keep kernel
   comfortable at 30 for explicit guarantee).
3. Includes an **index-query skill** as one of the 30 kernel slots — this skill answers
   "what AIWG skills are available for X?" by querying the on-disk artifact index.

Suggested kernel categories (non-exhaustive, 30-slot target):
- Core SDLC lifecycle skills (phase transitions, status, gate-check) — ~8 skills
- Essential quality gates (security-review, test-execute) — ~4 skills
- Index discovery (index-query, skill-search) — 2 skills
- Core utils (research-before-decision, human-authorization pattern) — ~4 skills
- Most-frequently-invoked aiwg-utils (issue-work, address-issues, acquire) — ~6 skills
- Project management (project-status, retrospective, risk-update) — ~6 skills

### The index layer recommendation

The index skill should:
1. Be in `.agents/skills/` (cross-platform primary path).
2. Accept natural language queries: "find skills for security review", "list deployment skills".
3. Query `.aiwg/index/` (already built by `aiwg index build`) for semantic search.
4. Return a ranked list of skill names + descriptions + paths.
5. On Hermes, leverage `skills.external_dirs` to point at the full AIWG corpus — no index query
   needed for Hermes since unlimited depth scan handles discovery.

For OpenCode specifically, consider publishing an AIWG `index.json` endpoint and registering it
via `skills.urls` in `opencode.jsonc` — this is the native remote index model.

### Path correctness prerequisites

Before index-driven discovery can be reliable, the following path bugs must be resolved:
- **#766 (CRITICAL):** Codex skills at `.codex/skills/` → `.agents/skills/`
- **Stale comment in platform-paths.ts:** OpenCode agents are not config-only; `.opencode/agent/`
  is valid. Commands at `.opencode/command/` are not deployed by AIWG (OpenCode assessment §5).

---

## Sources Cited

All evidence is primary source (source code or vendor docs). No third-party blog posts cited.

| Platform | Primary Source | URL / Path | Evidence Grade |
|----------|---------------|------------|----------------|
| Claude Code | AIWG internal source + docs | `.aiwg/research/parity/claude-code/assessment.md` | MODERATE |
| Codex CLI | Rust source code | `codex-rs/core-skills/src/loader.rs` (commit `91b73501`) | HIGH |
| Codex CLI | Rust source code | `codex-rs/config/src/config_toml.rs:68` | HIGH |
| GitHub Copilot | VS Code TypeScript source | `src/vs/workbench/contrib/chat/common/promptSyntax/computeAutomaticInstructions.ts:465-505` (commit `fdfcb7b4`) | HIGH |
| GitHub Copilot | VS Code TypeScript source | `src/vs/workbench/contrib/chat/common/promptSyntax/config/promptFileLocations.ts:157-164` | HIGH |
| Factory AI | Docs-only repo | `docs/cli/configuration/skills.mdx` (commit `709b1e3`) | MODERATE |
| Cursor | AIWG integration code + vendor docs | `.aiwg/references/platforms/cursor.md`, `tools/rules/deploy-rules-cursor.mjs` | MODERATE |
| OpenCode | TypeScript source | `packages/opencode/src/skill/index.ts` (commit `25ecf0af`) | HIGH |
| Warp | oz-skills examples + docs | `github.com/warpdotdev/oz-skills` (commit `6c08c49`) | HIGH (format) / MODERATE (behavior) |
| Windsurf | AIWG integration code + docs | `tools/agents/providers/windsurf.mjs`, `.aiwg/references/platforms/windsurf.md` | HIGH (AIWG code) / MODERATE (behavior) |
| OpenClaw | TypeScript source | `src/agents/skills/workspace.ts:126-129` (commit `c37871e7`) | HIGH |
| Hermes | Python source | `agent/skill_utils.py:440-451`, `tools/skills_tool.py:91-92,582` (commit `de9238d3`) | HIGH |
| AIWG ADR-1 | Internal ADR | `.aiwg/architecture/adr-agents-md-aggregation.md` | HIGH |
| AIWG overflow.ts | Internal source | `src/smiths/context-pipeline/overflow.ts:6-8` | HIGH |

---

*Survey produced for AIWG issue #1212 — index-driven on-demand skill-discovery layer.*
*Date: 2026-05-09. Do not modify without re-verifying cited commits.*
