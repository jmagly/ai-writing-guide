# Windsurf Parity Assessment — Issue #1098

**Date**: 2026-05-05
**Assessor**: Technical Researcher
**Source availability**: Closed source (Codeium). No repository to clone.
**Strategy**: Docs-only with cross-reference against AIWG internal reference files.
**Evidence grade**: MODERATE throughout (vendor documentation); HIGH for claims derived from AIWG source code (`tools/agents/providers/windsurf.mjs`).

---

## 1. Repo State

| Field | Value |
|-------|-------|
| Vendor | Codeium |
| Open source | No — closed source IDE product |
| Clone path | Not applicable |
| Commit assessed | Not applicable |
| Docs assessed | https://docs.windsurf.com (accessed via internal reference; see Section 9) |
| AIWG reference file | `.aiwg/references/platforms/windsurf.md` (last updated 2026-03-27) |
| AIWG provider module | `tools/agents/providers/windsurf.mjs` |
| AIWG compat agent | `agentic/code/frameworks/sdlc-complete/agents/windsurf-compat.md` |
| Provider status | EXPERIMENTAL (warning displayed on every deploy) |

Windsurf is a closed-source VS Code-based IDE built by Codeium. No public source code is available. All behavioral findings in this assessment are MODERATE-confidence vendor documentation claims cross-referenced with AIWG's internal reference file, which was updated 2026-03-27 against post-v1.13.6 Windsurf behavior.

---

## 2. Discovery Mechanism

### 2.1 Agent Discovery — AGENTS.md

Windsurf does not have a `.windsurf/agents/` directory. Agent definitions are discovered exclusively via `AGENTS.md` files (case-insensitive). [MODERATE — vendor docs, https://docs.windsurf.com/windsurf/getting-started/agents-md]

**Scan behavior:**

| Location | Behavior |
|----------|----------|
| Project root | Always-on; loaded into system prompt every message |
| Subdirectory | Scoped via auto-generated glob (`<directory>/**`) — active only when working in that subtree |
| Parent directories | Scanned up to git root |

**Format**: Plain markdown. No YAML frontmatter required or supported for agent entries.

AIWG handles this correctly: `generateAgentsMd()` in `windsurf.mjs:213` aggregates all agents into a root `AGENTS.md` using plain markdown with `<capabilities>` XML tags (no YAML frontmatter). [HIGH — source code]

### 2.2 Rules Discovery — `.windsurf/rules/`

Available since v1.8.2 (May 2025). [MODERATE — vendor docs]

| Scope | Path | Char limit |
|-------|------|-----------|
| Workspace | `.windsurf/rules/*.md` | 12,000 per file |
| Global | `~/.codeium/windsurf/memories/global_rules.md` | 6,000 |
| System (Enterprise) | OS-specific MDM paths | Not specified |

**Trigger modes** (YAML frontmatter, optional):

| Trigger | Behavior |
|---------|----------|
| `always_on` | Included in system prompt every message |
| `model_decision` | Only description shown; full content loaded on model's demand |
| `glob` | Activated when files matching a glob pattern are edited |
| `manual` | Activated via `@rule-name` explicit mention |

AIWG injects `trigger: always_on` via `transformRule()` in `windsurf.mjs:181-196` for all rules that lack an existing trigger field. Rules with an existing `trigger:` field are passed through unchanged. [HIGH — source code]

### 2.3 Workflows Discovery — `.windsurf/workflows/`

Available since v1.8.2 (May 2025). [MODERATE — vendor docs]

| Scope | Path |
|-------|------|
| Workspace | `.windsurf/workflows/*.md` |
| Global | `~/.codeium/windsurf/global_workflows/*.md` |
| System (Enterprise) | OS-specific MDM paths |

**Triggering**: Manual invocation only via `/workflow-name`. Cascade never auto-invokes workflows. Workflow names derived from filename (kebab-case). Workflows may chain to other workflows via `/other-workflow-name` in their body.

**Character limit**: 12,000 per file. AIWG enforces this with a warning in `deployWorkflows()` at `windsurf.mjs:429`. [HIGH — source code]

**Recursion**: Flat discovery — `*.md` in the directory only. No subdirectory recursion documented. [MODERATE — inferred from docs; no source to confirm]

### 2.4 Skills Discovery — `.windsurf/skills/`

Available natively since v1.13.6 (January 2026). [MODERATE — vendor docs]

| Scope | Path |
|-------|------|
| Workspace (primary) | `.windsurf/skills/<name>/SKILL.md` |
| Cross-agent compat | `.agents/skills/<name>/SKILL.md` |
| Global | `~/.codeium/windsurf/skills/<name>/SKILL.md` |
| System (Enterprise) | OS-specific MDM paths |

**Format**: Directory-per-skill containing `SKILL.md` with required YAML frontmatter:

```yaml
---
name: my-skill        # lowercase, hyphens, numbers
description: What this skill does and when to use it
---
```

**Triggering**: Two mechanisms:
1. Automatic — Cascade evaluates request intent against skill `description` fields. Only `name` and `description` are in context by default (progressive disclosure of full content).
2. Manual — `@skill-name` explicit invocation.

AIWG deploys skills to both `.windsurf/skills/` (primary) and `.agents/skills/` (cross-agent compatibility) via `deploySkills()` in `windsurf.mjs:453-472`. [HIGH — source code]

The AIWG `windsurf-compat.md` agent file (dated earlier than v1.13.6) incorrectly states "Skills not supported." This is stale — skills have been native since v1.13.6. The reference file `.aiwg/references/platforms/windsurf.md` correctly records the v1.13.6 change. The `windsurf.mjs` source confirms active deployment. [HIGH — source code conflict with stale compat doc]

### 2.5 Recursion Depth Summary

| Artifact type | Recursion | Notes |
|--------------|-----------|-------|
| AGENTS.md | Scanned at all directory levels up to git root | Per-directory scope via auto-glob |
| Rules | Flat (`*.md` in `.windsurf/rules/`) | No subdirectory recursion documented |
| Workflows | Flat (`*.md` in `.windsurf/workflows/`) | No subdirectory recursion documented |
| Skills | Flat (`<name>/SKILL.md` in `.windsurf/skills/`) | One level of nesting (skill dir + SKILL.md) |

---

## 3. Artifact Format

### 3.1 AGENTS.md

- Plain markdown, no YAML frontmatter
- Sections delimited by `---` horizontal rules
- Agent entries use `### agent-name` H3 headings
- `<capabilities>` XML block for tool lists
- `**Model**: <name>` line for model metadata
- AIWG-generated TOC with anchor links

AIWG's `transformAgent()` at `windsurf.mjs:96-143` strips YAML frontmatter and converts to this format. [HIGH — source code]

### 3.2 Rules (`.windsurf/rules/*.md`)

- Plain markdown with optional YAML frontmatter
- Frontmatter fields: `trigger` (required for non-default behavior), `globs` (for glob trigger)
- No schema enforcement by AIWG beyond trigger injection
- 12,000 character limit per file

### 3.3 Workflows (`.windsurf/workflows/*.md`)

- Plain markdown, no YAML frontmatter in deployed files
- AIWG's `transformCommand()` at `windsurf.mjs:148-174` strips frontmatter and produces:
  - `# Name` H1 heading
  - `> description` blockquote
  - `## Instructions` section containing body content
- 12,000 character limit per file [HIGH — source code]

### 3.4 Skills (`SKILL.md`)

- YAML frontmatter required; fields: `name` (lowercase-hyphen), `description`
- Remaining content is skill instructions (markdown)
- Additional files (scripts, templates) may coexist in the skill directory

### 3.5 .windsurfrules (root)

AIWG writes a `.windsurfrules` stub at project root (`windsurf.mjs:387-406`). The file is explicitly marked deprecated with a comment noting Windsurf's official docs do not document this path. AIWG retains it for backward compatibility only. [HIGH — source code; MODERATE — Windsurf docs silence confirms it is undocumented]

---

## 4. Lifecycle Hooks

Windsurf has no documented lifecycle hook system equivalent to Claude Code's `pre-session`, `post-write`, or `post-bash` hooks. [MODERATE — absence of documentation; cannot confirm from source]

The capability matrix at `docs/providers/capability-matrix.md` classifies Windsurf as **Tier 3 (IDE-hosted)** for the daemon and **emulated** for behaviors. This means:

- No standalone daemon support (requires IDE display server)
- No native behavior/hook event system
- All behavior execution routed through the AIWG daemon running externally
- Windsurf can connect to an externally-running AIWG daemon via HTTP/WS

**Cascade Hooks** (TypeScript-based hooks mentioned in `windsurf-compat.md`) appear to be a Windsurf-internal mechanism not exposed to external context files. The `windsurf-compat.md` reference to "Cascade Hooks (TypeScript)" is not reflected in any AIWG deployment logic — this is an unexploited capability. [LOW — single doc mention, no deployment code found]

---

## 5. Current AIWG Deployment Behavior

`aiwg use sdlc --provider windsurf` deploys the following (derived from `windsurf.mjs:508-663`): [HIGH — source code]

| Output | Path | Notes |
|--------|------|-------|
| AGENTS.md | `AGENTS.md` (project root) | Aggregated, all agents in plain markdown |
| Orchestration rule | `.windsurf/rules/aiwg-orchestration.md` | trigger: always_on; contains orchestration context, key agent summaries, artifact paths |
| Deprecated stub | `.windsurfrules` | Retained for backward compat; Windsurf may ignore |
| Workflows | `.windsurf/workflows/*.md` | Commands as native workflows; YAML frontmatter stripped |
| Skills (primary) | `.windsurf/skills/<name>/SKILL.md` | Native skill directories |
| Skills (cross-agent) | `.agents/skills/<name>/SKILL.md` | Cross-platform compatibility |
| Rules | `.windsurf/rules/<name>.md` | trigger: always_on injected if missing |
| Soul companions | `.windsurf/agents/` | Discrete mirror alongside AGENTS.md aggregation |

**Capability-matrix entry** (`docs/providers/capability-matrix.md`):
- Scheduler: Emulated
- Agent Teams: Emulated (Cascade is sequential, not parallel)
- Mission Control: Emulated
- Behaviors: Emulated
- MCP: Not supported (listed as `—`)
- Daemon: Tier 3 (IDE-hosted)

**Significant discrepancy**: The capability matrix at `docs/providers/capability-matrix.md` lists MCP as `—` (not supported) for Windsurf. The internal reference file `.aiwg/references/platforms/windsurf.md` (Section 3) documents full MCP support including stdio, Streamable HTTP, and SSE transports with a 100-tool limit. The MCP sidecar guide `docs/integrations/windsurf-mcp-sidecar.md` documents `aiwg mcp install windsurf` as a first-class operation. The capability matrix is stale. [HIGH conflict between source files]

---

## 6. Gaps vs. Latest Provider Mechanism

### Gap 1: Rules Trigger Modes Not Fully Exploited

**Current**: AIWG injects `trigger: always_on` for all rules that lack a trigger field.

**Gap**: The platform supports four trigger modes (`always_on`, `model_decision`, `glob`, `manual`). AIWG does not leverage `model_decision` (lazy loading — only description in context by default), `glob` (language-specific rules activated on file edit), or `manual` (`@rule-name` citation). Deploying all rules as `always_on` inflates the system prompt with content that could instead be loaded on demand.

**Impact**: Token overhead on every message for rules that could be triggered by file type or explicit mention.

### Gap 2: Capability Matrix Incorrect for MCP

**Current**: `docs/providers/capability-matrix.md` shows Windsurf MCP as `—` (not supported).

**Gap**: Windsurf has full MCP support (stdio, Streamable HTTP, SSE transports; 100-tool limit; MCP Prompts since v1.12.31). `aiwg mcp install windsurf` already writes the correct config. The capability matrix document does not reflect this.

**Impact**: Documentation misleads users and any tooling that reads the capability matrix.

### Gap 3: Skills Support Level in Capability Matrix / CLAUDE.md

**Current**: CLAUDE.md Multi-Platform Support table lists Windsurf skills as "conventional." The `windsurf-compat.md` agent file states "Skills not supported."

**Gap**: Skills have been **native** since v1.13.6 (January 2026). The deployment code correctly deploys to `.windsurf/skills/` and `.agents/skills/`, but the matrix and the compat agent doc are stale.

**Impact**: Internal documentation inconsistency; the compat agent may mislead users who read it.

### Gap 4: Global Paths Not Deployed

**Current**: AIWG deploys only to project-local paths.

**Gap**: Windsurf supports global paths (`~/.codeium/windsurf/global_workflows/*.md`, `~/.codeium/windsurf/skills/`, `~/.codeium/windsurf/memories/global_rules.md`) that persist across all projects. AIWG has no mechanism for global Windsurf deployment analogous to the Codex and OpenClaw home-directory deployment strategies.

**Impact**: Agents who work across many projects cannot install AIWG context once and have it apply everywhere.

### Gap 5: `model_decision` Trigger Not Used for Large Reference Rules

**Current**: The orchestration context at `.windsurf/rules/aiwg-orchestration.md` is `trigger: always_on` and contains a large amount of reference content (agent summaries, artifact paths, command mappings).

**Gap**: A significant portion of this content qualifies for `model_decision` trigger — the model could load it on demand rather than consuming context budget on every message. The `always_on` orchestration context adds approximately 3,500 tokens of overhead per the MCP sidecar guide's context budget table.

**Impact**: ~3,500 tokens of constant overhead that could be moved to on-demand loading.

### Gap 6: Workflow Chaining Not Leveraged

**Current**: AIWG deploys workflows as independent files with no inter-workflow references.

**Gap**: Windsurf workflows can call other workflows via `/other-workflow-name` in their instructions. AIWG phase-transition workflows (e.g., `flow-inception-to-elaboration`) involve multiple sub-flows that could be composed via workflow chaining rather than embedding all steps in one file.

**Impact**: Large workflow files approaching the 12,000 character limit could be decomposed and chained.

### Gap 7: `.windsurfrules` Deprecation Not Completed

**Current**: AIWG still writes `.windsurfrules` at project root with a deprecation notice comment.

**Gap**: The platform does not document this file path. AIWG's own comment in the generated file states it "may be silently ignored by Windsurf." The file adds noise and may create confusion.

**Impact**: Low — no functional impact, but creates confusion and wastes a file write.

---

## 7. New Capabilities Not Yet Exploited

### 7.1 Rule Trigger Mode Differentiation

Windsurf's `glob` and `model_decision` triggers enable context-efficient rule loading. AIWG could:
- Deploy language-specific rules (TypeScript conventions, Python style) with `trigger: glob` bound to `src/**/*.ts` or `**/*.py`
- Deploy large reference rules (SDLC templates, agent catalog) with `trigger: model_decision` to reduce always-on token cost

Implementation: extend `transformRule()` in `windsurf.mjs` to accept a trigger hint from rule frontmatter metadata, rather than always defaulting to `always_on`.

### 7.2 Global Windsurf Deployment

Windsurf's `~/.codeium/windsurf/skills/` and `~/.codeium/windsurf/global_workflows/` directories provide cross-project availability. A `--global` flag on `aiwg use sdlc --provider windsurf --global` could deploy skills and utility workflows globally, analogous to the existing Codex home-directory deployment.

### 7.3 MCP Prompts Integration

Since v1.12.31, Windsurf supports MCP Prompts — pre-built instruction templates callable from the MCP protocol. AIWG's MCP server (`aiwg mcp serve`) could expose SDLC workflow prompts as MCP Prompts, making them directly invokable by Cascade without requiring `/workflow-name` invocation.

### 7.4 Cascade Plan Mode (Megaplan) Alignment

Windsurf's Plan Mode (Megaplan) generates detailed plans before code changes. AIWG's phase-gate and architecture workflows could explicitly instruct Cascade to enter Plan Mode before executing multi-step artifact generation, reducing mid-workflow deviation.

Implementation: Add `> Use Windsurf Plan Mode before starting multi-step artifact generation` guidance to SDLC workflows and the orchestration rule.

### 7.5 Memories Bootstrapping via Rules

Windsurf's memory system (`~/.codeium/windsurf/memories/`) has no external write API, but the `global_rules.md` file (6,000 char limit) is a writable plain-markdown file at a known path. AIWG could provide an optional `aiwg inject-windsurf-global-rules` step that writes a compact AIWG context summary to `~/.codeium/windsurf/memories/global_rules.md`, providing always-on cross-project context without requiring `AGENTS.md` to be present in every project.

Note: this path is documented in AIWG's internal reference but its behavior as an externally-writable context source is partially inferred. [LOW — implementation should be validated against actual Windsurf behavior before shipping]

### 7.6 Cascade Context — @-mention Patterns

AIWG's quickstart doc (`docs/integrations/windsurf-quickstart.md`) documents `@requirements-analyst` and similar @-mention patterns. These are not validated against Windsurf's actual @-mention behavior for AGENTS.md sections. If Windsurf supports @-mention of AGENTS.md section anchors, AIWG skills could add @-hint patterns to guide users to the correct invocation syntax.

---

## 8. Cross-Port Candidates

The following mechanisms from other providers could improve the Windsurf integration:

| Source provider | Mechanism | Port opportunity |
|----------------|-----------|-----------------|
| Claude Code | `.claude/rules/` path-scoped rules | Port glob-trigger rule deployment to Windsurf — activate rules only when editing files matching their domain (TypeScript rules → `src/**/*.ts` glob) |
| Codex | Home-directory global deployment (`~/.agents/skills/`) | Port to Windsurf global paths — `~/.codeium/windsurf/skills/` and `~/.codeium/windsurf/global_workflows/` |
| OpenClaw | Behaviors deployed to `~/.openclaw/behaviors/` | When Windsurf exposes Cascade Hooks externally, port AIWG behaviors to hook format |
| Factory AI | Native Droid parallel execution | Windsurf docs note Cascade is sequential — document this limitation explicitly and route parallel work through `aiwg mc dispatch` |
| Cursor | `.cursor/rules/` with glob scoping | Validate Windsurf glob trigger accuracy against AIWG TypeScript/Python rule sets and deploy scoped variants |

The `aiwg-regenerate-windsurfrules` skill (`agentic/code/addons/aiwg-utils/skills/aiwg-regenerate-windsurfrules/SKILL.md`) currently regenerates `.windsurfrules` rather than `.windsurf/rules/aiwg-orchestration.md`. Given the deprecation of `.windsurfrules`, this skill's Step 5 output target should be updated to write the trigger-frontmatter rules directory format. [HIGH — source code]

---

## 9. Citations

All AIWG source file citations are HIGH-confidence (verified from source). Windsurf vendor doc citations are MODERATE-confidence (closed-source platform; docs may not reflect all behavior).

| Claim | Source | Confidence |
|-------|--------|-----------|
| AGENTS.md discovery paths and always-on behavior | https://docs.windsurf.com/windsurf/getting-started/agents-md via `.aiwg/references/platforms/windsurf.md` Section 2.1 | MODERATE |
| Rules `.windsurf/rules/*.md` and four trigger modes | https://docs.windsurf.com/windsurf/cascade/rules via `.aiwg/references/platforms/windsurf.md` Section 2.2 | MODERATE |
| Rules 12,000-char limit per file | `.aiwg/references/platforms/windsurf.md` Section 2.2 | MODERATE |
| Workflows `.windsurf/workflows/*.md`, manual-only invocation | https://docs.windsurf.com/windsurf/cascade/workflows via `.aiwg/references/platforms/windsurf.md` Section 2.3 | MODERATE |
| Skills native since v1.13.6, `.windsurf/skills/` and `.agents/skills/` | https://docs.windsurf.com/windsurf/cascade/skills via `.aiwg/references/platforms/windsurf.md` Section 2.4 | MODERATE |
| MCP support: stdio, Streamable HTTP, SSE; 100-tool limit | https://docs.windsurf.com/windsurf/cascade/mcp via `.aiwg/references/platforms/windsurf.md` Section 3 | MODERATE |
| MCP Prompts since v1.12.31 | `.aiwg/references/platforms/windsurf.md` Section 3.6 changelog | MODERATE |
| Memories stored at `~/.codeium/windsurf/memories/`; no external write API | https://docs.windsurf.com/windsurf/cascade/memories via `.aiwg/references/platforms/windsurf.md` Section 4 | MODERATE |
| AIWG `generateAgentsMd()` aggregation logic | `tools/agents/providers/windsurf.mjs:213-263` | HIGH |
| AIWG `transformAgent()` format (strip frontmatter, capabilities XML) | `tools/agents/providers/windsurf.mjs:96-143` | HIGH |
| AIWG `transformRule()` trigger injection | `tools/agents/providers/windsurf.mjs:181-196` | HIGH |
| AIWG `transformCommand()` workflow format | `tools/agents/providers/windsurf.mjs:148-174` | HIGH |
| AIWG 12,000-char limit warning in `deployWorkflows()` | `tools/agents/providers/windsurf.mjs:429` | HIGH |
| AIWG writes `.windsurfrules` stub with deprecation comment | `tools/agents/providers/windsurf.mjs:387-406` | HIGH |
| AIWG dual-deploys skills to `.windsurf/skills/` and `.agents/skills/` | `tools/agents/providers/windsurf.mjs:453-472` | HIGH |
| Capability matrix MCP entry: `—` (not supported) for Windsurf | `docs/providers/capability-matrix.md` MCP table row | HIGH (source) |
| Capability matrix conflict with MCP sidecar guide | `docs/integrations/windsurf-mcp-sidecar.md` + `docs/providers/capability-matrix.md` | HIGH (source conflict) |
| Skills listed as "conventional" in CLAUDE.md table | `CLAUDE.md` Multi-Platform Support table | HIGH (source) |
| `windsurf-compat.md` states "Skills not supported" (stale) | `agentic/code/frameworks/sdlc-complete/agents/windsurf-compat.md` line 184 | HIGH (source) |
| `aiwg-regenerate-windsurfrules` targets `.windsurfrules` not `.windsurf/rules/` | `agentic/code/addons/aiwg-utils/skills/aiwg-regenerate-windsurfrules/SKILL.md` Step 5 | HIGH (source) |
| Windsurf Cascade is sequential, not parallel agent spawning | `docs/providers/capability-matrix.md` Windsurf note under Agent Teams | HIGH (source) |
| Cascade context window: 128K tokens | `.aiwg/references/platforms/windsurf.md` Section 1.2 | MODERATE |
| Cascade Hooks (TypeScript) mentioned as provider capability | `agentic/code/frameworks/sdlc-complete/agents/windsurf-compat.md` table | HIGH (source mention); LOW (no deployment code found) |
| MCP sidecar context budget (~3,500 tokens for AGENTS.md) | `docs/integrations/windsurf-mcp-sidecar.md` Context Budget table | MODERATE |
| `.aiwg/references/platforms/windsurf.md` last updated 2026-03-27 | File header | HIGH |
| `aiwg mcp install windsurf` writes `~/.codeium/windsurf/mcp_config.json` | `docs/integrations/windsurf-mcp-sidecar.md` | MODERATE |

---

*Assessment scope: issue #1098 — Windsurf parity audit*
*GRADE baseline: MODERATE (vendor docs, closed-source platform). HIGH applied where AIWG source code directly verifiable.*
