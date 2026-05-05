# Cursor IDE — Provider Parity Assessment

**Issue:** #1094
**Date:** 2026-05-05
**Assessed by:** Technical Researcher agent
**Evidence level:** MODERATE (vendor docs + AIWG internal source code; no direct Cursor source access — closed-source IDE)
**Cursor version baseline:** 2.4 (post-2.4 capabilities included where documented)

---

## 1. Repo State

| Field | Value |
|-------|-------|
| Repository | github.com/cursor/cursor (issues-only mirror) |
| Source status | **Closed-source** — no public implementation available |
| Clone path | Not applicable — do not clone |
| OSS status | Proprietary |
| Analysis basis | Internal AIWG reference file (`.aiwg/references/platforms/cursor.md`, updated 2026-03-27), integration test source (`test/integration/cursor-deployment.test.ts`), provider module (`tools/agents/providers/cursor.mjs`), deployment tool (`tools/rules/deploy-rules-cursor.mjs`), capability matrix YAML, and cross-platform integration docs |

Because Cursor is closed-source, all capability claims are MODERATE evidence (vendor documentation) or sourced from AIWG's own integration code (HIGH evidence for AIWG behavior, but not an independent verification of Cursor internals).

---

## 2. Discovery Mechanism

### 2.1 Rules

**Primary path:** `.cursor/rules/` (project-level, version-controlled)

Rules in `.cursor/rules/` use the **MDC format** (`.mdc` file extension). The platform performs its own discovery scan of this directory. Subdirectories are supported — rules in nested directories are available globally unless scoped by `globs` frontmatter.

**Rule activation modes** (determined by frontmatter):

| Mode | Configuration | Activation |
|------|--------------|------------|
| Always Apply | `alwaysApply: true` | Injected into every session unconditionally |
| Apply Intelligently | `alwaysApply: false`, `description` set, no `globs` | Agent evaluates description to decide relevance |
| File-Scoped | `globs` set | Activates when any open/referenced file matches the glob pattern |
| Manual | No `alwaysApply`, no `globs`, no description (or minimal) | Only when user types `@rule-name` explicitly |

**Legacy path:** `.cursorrules` (root-level file, functionally deprecated) — still loaded by Cursor for backward compatibility but not documented in current Cursor docs. AIWG continues to generate this file via the `/aiwg-regenerate-cursorrules` command for compatibility.

**Team/org rules:** Available via Cursor web dashboard (Team and Enterprise plans). Not file-based — managed through the Cursor UI. Out of scope for AIWG file deployment.

**User rules:** Cursor Settings > Rules. Apply to Agent/Chat modes only — not to Inline Edit or Tab autocomplete. Not file-based.

Source: `.aiwg/references/platforms/cursor.md:§1`, `tools/rules/deploy-rules-cursor.mjs:1-22`

### 2.2 AGENTS.md

`AGENTS.md` at the repo root is read by Cursor as an alternative context source. Key behavior: files in **subdirectories automatically inherit and combine** instructions from parent `AGENTS.md` files, with deeper-level files taking precedence. This is documented as additive with `.cursor/rules/` — both are loaded together, not in competition.

Source: `.aiwg/references/platforms/cursor.md:§5`

### 2.3 Skills (2.4+)

**Path:** `.cursor/skills/*/SKILL.md` — one directory per skill, each containing a `SKILL.md` file.

Skills are loaded on-demand when relevant, unlike always-apply rules. The `/migrate-to-skills` command in Cursor 2.4 assists migration from always-on rules to on-demand skills. This reduces context overhead. Skills are invoked via `@skill-name` in chat.

Source: `.aiwg/references/platforms/cursor.md:§6`

### 2.4 Agents and Commands

**Agents path:** `.cursor/agents/` (conventional — no evidence Cursor natively auto-discovers this directory)
**Commands path:** `.cursor/commands/` (conventional — same caveat)

Both are AIWG-defined conventions. Agents are surfaced to users via `@agent-name` mention; Cursor treats them as rule-like artifacts when structured appropriately.

Source: `tools/agents/providers/cursor.mjs:56-61`, `agentic/code/providers/capability-matrix.yaml:160-171`

### 2.5 MCP

**Project-level config:** `.cursor/mcp.json`
**Global config:** `~/.cursor/mcp.json`

Both coexist. MCP is natively supported (though capability matrix marks Cursor's MCP as MODERATE — confirmed from documentation but not source). Cloud Agents support MCP with full HTTP and stdio transports plus OAuth. All six MCP capability types are supported: Tools, Prompts, Resources, Roots, Elicitation, Apps.

Variable interpolation supported in MCP config values: `${env:NAME}`, `${userHome}`, `${workspaceFolder}`, `${workspaceFolderBasename}`, `${pathSeparator}`.

Source: `.aiwg/references/platforms/cursor.md:§4`, `test/integration/cursor-deployment.test.ts:259-303`

### 2.6 Scan Order and Recursion

- `.cursor/rules/` — flat scan with subdirectory support; recursion depth undocumented but confirmed as supported
- `AGENTS.md` — per-directory inheritance (deepest wins)
- `.cursor/skills/` — one directory per skill; no multi-level recursion documented
- `.cursor/agents/`, `.cursor/commands/` — flat scan (AIWG conventional, not native Cursor)

---

## 3. Artifact Format

### 3.1 Rules — MDC Format

File extension: `.mdc` (Markdown with frontmatter — "MDC")

```yaml
---
description: "Human-readable purpose; presented to Agent for relevance decisions"
globs: ["src/components/**/*.tsx", "**/*.ts"]
alwaysApply: false
---

# Rule Title

Rule body in standard Markdown.
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `description` | string | Required for auto/agent-requested rules | Used by Agent to evaluate rule relevance |
| `globs` | string[] | Required for file-scoped rules | Gitignore-style glob patterns |
| `alwaysApply` | boolean | Optional (default: false) | True = unconditional injection |

The schema is intentionally minimal. Only these three fields are documented. Undocumented fields may exist but are LOW evidence at best.

**Recommended size limit:** Keep rules under 500 lines (Cursor docs guidance). Use `@filename.ts` references rather than inlining file content.

Source: `.aiwg/references/platforms/cursor.md:§1.2–1.3`, `test/integration/cursor-deployment.test.ts:462-486`

### 3.2 Plain Markdown Rules

`.md` extension also supported in `.cursor/rules/`. These function as always-on rules (no frontmatter control). This is the fallback format used by AIWG for `RULES-INDEX.md`.

Source: `test/integration/cursor-deployment.test.ts:231-232`

### 3.3 Agents and Commands

`.md` extension (standard Markdown). No Cursor-native frontmatter schema defined for agents or commands — AIWG deploys them as conventional files. No confirmed native auto-discovery.

### 3.4 Skills

Directory-based: `.cursor/skills/<skill-name>/SKILL.md`. Standard SKILL.md format (same as Claude Code convention).

### 3.5 AGENTS.md

Plain Markdown, no frontmatter. Maximum 32 KB per Cursor's `project_doc_max_bytes` default.

Source: `test/integration/cursor-deployment.test.ts:170-171`

### 3.6 MCP Config

JSON format at `.cursor/mcp.json`. `mcpServers` key at top level with per-server entries supporting `command`, `args`, `env`, `envFile` (stdio) or `url`, `headers`, `auth` (HTTP).

Source: `.aiwg/references/platforms/cursor.md:§4.2`, `test/integration/cursor-deployment.test.ts:420-447`

---

## 4. Lifecycle Hooks

Cursor does not expose a documented pre/post lifecycle hook system for rules or agents in the file-based sense.

**Cloud Agent automations** (March 2026, MODERATE evidence): Cloud Agents can be triggered via Slack, Linear, GitHub, PagerDuty, or webhooks. This is the closest Cursor equivalent to lifecycle hooks — event-driven agent invocation. Automation agents include a memory tool for persisting knowledge across executions.

**`.cursor/environment.json`**: Controls Cloud Agent VM setup (`install` step, `terminal.env` vars). Functionally equivalent to a "pre-session" hook for Cloud Agent environments.

**Plan Mode** (`Shift+Tab`): Agent researches codebase and creates a plan for human review before writing any code. Not a hook in the programmatic sense, but provides a checkpoint before execution.

**Checkpoints**: Agent automatically saves codebase snapshots before significant changes. Users can restore without affecting Git history. Not hook-callable.

AIWG does not currently exploit Cloud Agent automations or environment.json hooks.

Source: `.aiwg/references/platforms/cursor.md:§2.4–2.5`, `§3.3–3.5`

---

## 5. Current AIWG Deployment Behavior

`aiwg use sdlc --provider cursor` deploys the following:

| Artifact Type | Destination | Format | Support Level |
|--------------|-------------|--------|---------------|
| Agents | `.cursor/agents/` | `.md` | Conventional |
| Commands | `.cursor/commands/` | `.md` | Conventional |
| Skills | `.cursor/skills/<name>/SKILL.md` | `.md` (directory-based) | Conventional (aligns with native 2.4+) |
| Rules | `.cursor/rules/` | `.mdc` | Native |

**Key behaviors in current deployment:**

- Rules are transformed to MDC format by `tools/rules/deploy-rules-cursor.mjs`. Each AIWG rule gets `description`, `globs`, and `alwaysApply` frontmatter fields injected.
- `getFileExtension('rule')` returns `.mdc`; all other artifact types return `.md`. Source: `tools/agents/providers/cursor.mjs:254-260`
- Agent and command content is passed through with minimal transformation (`transformAgent`, `transformCommand` are identity functions). Source: `tools/agents/providers/cursor.mjs:87-98`
- AGENTS.md generation is opt-in (`--create-agents-md` flag). Template at `agentic/code/frameworks/sdlc-complete/templates/cursor/AGENTS.md.aiwg-template`. Enforces 32 KB size limit.
- Legacy `.cursorrules` is generated by the separate `/aiwg-regenerate-cursorrules` command (not `aiwg use`). This is documented as a backward-compatibility measure.
- `support.rules = 'native'`, `support.agents = 'conventional'`. Source: `tools/agents/providers/cursor.mjs:63-68`
- Hook wiring: `at_link_support: true`, `hook_file: AIWG-cursor.md`, `hook_directive: "@AIWG-cursor.md"`, `context_file: .cursorrules`. Source: `agentic/code/providers/capability-matrix.yaml:189-192`
- Daemon: **unsupported** — Cursor requires a display server (VS Code extension host); headless mode is not available. Source: `agentic/code/providers/capability-matrix.yaml:163-165`
- MCP: `aiwg mcp install cursor` generates `.cursor/mcp.json` with `aiwg mcp serve` configured. Source: `test/integration/cursor-deployment.test.ts:266-302`
- Plugin bundle: `generatePluginBundle()` in cursor.mjs generates `.cursor-plugin/plugin.json` for potential marketplace distribution. Source: `tools/agents/providers/cursor.mjs:427-487`

---

## 6. Gaps vs. Latest Provider Mechanism

### Gap 1: Rule activation mode not systematically set

**Severity:** HIGH

AIWG deploys rules with frontmatter but does not systematically assign the activation mode (`alwaysApply: true` vs. auto/file-scoped vs. manual) based on the rule's purpose. Cursor now offers four distinct activation modes. AIWG rules would benefit from:

- Core enforcement rules (token security, no-attribution) → `alwaysApply: true`
- Language/domain rules → `globs: ["**/*.ts", "**/*.py"]`
- Framework-specific rules → `globs: [".aiwg/**"]`
- Reference rules → manual (no `alwaysApply`, no `globs`, minimal description)

Without this differentiation, all AIWG rules land in the same activation bucket, causing unnecessary context overhead or missed activation.

### Gap 2: Agents and commands are conventional-only

**Severity:** MEDIUM

`.cursor/agents/` and `.cursor/commands/` are AIWG conventions with no confirmed native Cursor auto-discovery. There is no evidence that Cursor scans these paths the way it scans `.cursor/rules/`. Users must `@agent-name` manually, which is lower friction than Claude Code's native agent discovery but still requires documentation.

**Investigation needed:** Whether Cursor 2.4+ native Skills system (`.cursor/skills/`) supersedes the need for a separate agents directory — skills loaded on-demand via `@skill-name` may serve the same purpose for AIWG.

### Gap 3: AGENTS.md not generated by default

**Severity:** MEDIUM

`AGENTS.md` supports directory-level inheritance — a powerful monorepo capability. AIWG generates AGENTS.md only when `--create-agents-md` is passed. For Cursor, AGENTS.md should be generated by default (or prompted) since it provides context to Cloud Agents and supports subdirectory inheritance that rules alone cannot.

### Gap 4: Cloud Agent environment.json not provisioned

**Severity:** MEDIUM

AIWG has a template (`templates/cursor/environment.json.aiwg-template`) but does not deploy it automatically. Cloud Agents running on isolated VMs will not have AIWG installed unless `environment.json` is present. This blocks Cloud Agent workflows entirely.

### Gap 5: Plugin marketplace — manifest format unconfirmed

**Severity:** LOW (for now)

AIWG has a prototype `.cursor-plugin/plugin.json` manifest and `generatePluginBundle()` implementation, but the Cursor marketplace does not yet have a public schema. The prototype is based on observed patterns. Until Cursor publishes an official schema or the partner program opens, this gap is informational only.

### Gap 6: .cursorrules vs. .cursor/rules/ precedence undocumented

**Severity:** LOW

When both `.cursorrules` (generated by AIWG regenerate command) and `.cursor/rules/` (primary deployment) coexist, the exact Cursor runtime behavior is undocumented. This is flagged in `.aiwg/references/platforms/cursor.md:§11` as "Unverified." AIWG generates both, which may cause duplication or unexpected override behavior.

### Gap 7: No lifecycle hook exploitation

**Severity:** LOW

Cloud Agent automations (Slack, GitHub, Linear triggers) and `.cursor/environment.json` install hooks are not exploited by AIWG. These could enable automatic AIWG setup in Cloud Agent VMs and event-driven workflow triggers.

---

## 7. New Capabilities Not Yet Exploited

### 7.1 Subagents (2.4+)

Cursor 2.4 introduced subagent spawning — agents can spawn independent subagents for discrete tasks with custom prompts, tool access, and configurable models. An "Explore subagent" is auto-invoked for broad codebase searches.

**Opportunity:** AIWG multi-agent patterns (Primary Author → Parallel Reviewers → Synthesizer) could be expressed as Cursor subagent workflows, reducing the need for manual agent orchestration via AIWG mission control.

Source: `.aiwg/references/platforms/cursor.md:§2.7`

### 7.2 Worktrees for Parallel Agent Execution (2.0+)

Up to 8 agents can run in parallel using Git worktrees. Each gets an isolated workspace. Configuration via `.cursor/worktrees.json`.

**Opportunity:** AIWG's parallel review cycles (security architect + test architect + requirements analyst reviewing the same document simultaneously) could be expressed as a Cursor worktree configuration. AIWG has a template at `templates/cursor/worktrees.json.aiwg-template` but this is not yet wired into a deployment flow.

Source: `.aiwg/references/platforms/cursor.md:§2.6`, `test/integration/cursor-deployment.test.ts:374-389`

### 7.3 Cloud Agent Automations (March 2026)

Cloud Agents support event-driven triggers: GitHub comments (`@cursor` on issues/PRs), Slack, Linear, PagerDuty, webhooks. Automation agents include a memory tool for persistence across executions.

**Opportunity:** AIWG SDLC workflows could be triggered by GitHub PR comments — a natural fit for code review agents and test-gate enforcement. This would extend AIWG's reach into CI-adjacent automation without requiring always-on daemon infrastructure.

Source: `.aiwg/references/platforms/cursor.md:§3.5`

### 7.4 Memories (Beta, 1.0+)

Agent remembers facts from conversations and references them in future sessions. Stored per-project at user level. Managed from Settings.

**Opportunity:** AIWG project context (current phase, recent decisions, open risks) could be surfaced via Cursor's memory system without requiring an explicit context file like CLAUDE.md. Low investment; the memory system is user-managed, but AIWG could provide guidance prompts for priming project memories.

Source: `.aiwg/references/platforms/cursor.md:§2.8`

### 7.5 Native Skills for On-Demand Context

Skills (`.cursor/skills/*/SKILL.md`) load on-demand rather than always, reducing context overhead. The `/migrate-to-skills` command assists migration.

**Opportunity:** AIWG currently deploys both always-apply rules and skills, which may create redundancy. A systematic review of which AIWG context is better expressed as skills (on-demand) vs. rules (always/file-scoped) could reduce token overhead significantly.

Source: `.aiwg/references/platforms/cursor.md:§6`

---

## 8. Cross-Port Candidates

The following AIWG capabilities from other platforms warrant evaluation for the Cursor provider:

### From Claude Code

| Capability | Claude Code | Cursor Analog | Effort |
|-----------|-------------|---------------|--------|
| Session pre-flight (`CLAUDE.md` hook loading) | Native via `@AIWG.md` directive | `@AIWG-cursor.md` directive in `.cursorrules` (already wired) | Done |
| Agent team dispatch | Native Task tool | Cloud Agent automations + worktrees | Medium |
| Memory persistence | MEMORY.md system | Cursor Memories (Beta) | Low (guidance doc) |

### From Factory AI

| Capability | Factory | Cursor Analog | Effort |
|-----------|---------|---------------|--------|
| Agent missions (multi-agent) | Native Missions | Cursor worktrees (8 agents parallel) | Medium (worktrees.json template exists) |

### Proposed New Deployments

1. **`worktrees.json` deployment** — Wire `templates/cursor/worktrees.json.aiwg-template` into `aiwg use sdlc --provider cursor` output. Low effort; template already exists.

2. **`environment.json` deployment** — Deploy `templates/cursor/environment.json.aiwg-template` as `.cursor/environment.json` to enable Cloud Agent VM setup. Medium effort; template exists, deployment not wired.

3. **Rule activation classification** — Extend `deploy-rules-cursor.mjs` to assign `alwaysApply`, `globs`, and `description` based on rule metadata (e.g., from rule frontmatter in source, or a classification manifest). Medium effort.

4. **Default AGENTS.md generation** — Make `--create-agents-md` the default for Cursor deployments (or promote it in the quickstart). Low effort; logic exists, just opt-in.

5. **CI/CD workflow deployment** — Wire the CI/CD templates (`templates/cursor/ci-cd/aiwg-cursor-review.yml`, etc.) into a documented GitHub Actions deployment path. Low effort; templates exist.

---

## 9. Citations

All claims graded per GRADE methodology. Closed-source platform means no source-code verification is possible; vendor documentation is the highest available evidence tier.

| Claim | Source | Evidence Level |
|-------|--------|----------------|
| Rules use `.mdc` extension with YAML frontmatter | `.aiwg/references/platforms/cursor.md:§1.2–1.3` (derived from cursor.com/docs/context/rules) | MODERATE |
| Four rule activation modes (alwaysApply, auto, file-scoped, manual) | `.aiwg/references/platforms/cursor.md:§1.4` | MODERATE |
| `.cursor/rules/` supports nested subdirectories | `.aiwg/references/platforms/cursor.md:§1.5` | MODERATE |
| AGENTS.md supports directory inheritance (deeper wins) | `.aiwg/references/platforms/cursor.md:§5` | MODERATE |
| Skills system introduced in 2.4 at `.cursor/skills/*/SKILL.md` | `.aiwg/references/platforms/cursor.md:§6` | MODERATE |
| AGENTS.md max 32 KB (`project_doc_max_bytes`) | `test/integration/cursor-deployment.test.ts:170-171` | HIGH (test assertion) |
| Rules deploy to `.cursor/rules/*.mdc` | `tools/rules/deploy-rules-cursor.mjs:31`, `tools/agents/providers/cursor.mjs:254-260` | HIGH (AIWG source) |
| Agents deploy to `.cursor/agents/`, commands to `.cursor/commands/` | `tools/agents/providers/cursor.mjs:56-61` | HIGH (AIWG source) |
| MCP config at `.cursor/mcp.json` | `.aiwg/references/platforms/cursor.md:§4.1`, `test/integration/cursor-deployment.test.ts:259-303` | MODERATE |
| MCP supports stdio, SSE, Streamable HTTP transports | `.aiwg/references/platforms/cursor.md:§4.3` | MODERATE |
| MCP supports all 6 capability types | `.aiwg/references/platforms/cursor.md:§4.4` | MODERATE |
| Cloud Agents renamed from "Background Agents" in 1.0 | `.aiwg/references/platforms/cursor.md:§3` | MODERATE |
| Cloud Agents support MCP with HTTP and stdio | `.aiwg/references/platforms/cursor.md:§3.4` | MODERATE |
| Cloud Agent automations via Slack/GitHub/Linear (March 2026) | `.aiwg/references/platforms/cursor.md:§3.5` | MODERATE |
| Up to 8 parallel agents via worktrees (2.0+) | `.aiwg/references/platforms/cursor.md:§2.6` | MODERATE |
| Subagents spawnable (2.4+) | `.aiwg/references/platforms/cursor.md:§2.7` | MODERATE |
| `.cursorrules` is functionally deprecated | `.aiwg/references/platforms/cursor.md:§1.6` | MODERATE |
| Hook wiring uses `at_link_support: true`, context file `.cursorrules` | `agentic/code/providers/capability-matrix.yaml:189-192` | HIGH (AIWG source) |
| Daemon unsupported (requires display server) | `agentic/code/providers/capability-matrix.yaml:163-165` | HIGH (AIWG internal classification) |
| Plugin system at `.cursor-plugin/plugin.json` (March 2026) | `.aiwg/research/findings/cursor-plugin-marketplace-feasibility.md` | LOW (inferred from observed patterns; official schema not published) |
| Rule activation mode assignment not systematically applied | `tools/rules/deploy-rules-cursor.mjs` (no mode-selection logic found) | HIGH (code inspection) |
| `support.agents = 'conventional'` (not native auto-discovered) | `tools/agents/providers/cursor.mjs:63-67`, `docs/integrations/cross-platform-overview.md:43` | HIGH (AIWG source) |
| `environment.json` template exists but not wired into deploy | `agentic/code/frameworks/sdlc-complete/templates/cursor/environment.json.aiwg-template` (file exists); `tools/agents/providers/cursor.mjs` (no reference to environment.json) | HIGH (code inspection) |
| `worktrees.json` template exists but not deployed | `agentic/code/frameworks/sdlc-complete/templates/cursor/worktrees.json.aiwg-template` (file exists); `tools/agents/providers/cursor.mjs` (no deploy call) | HIGH (code inspection) |
| AGENTS.md generation is opt-in | `tools/agents/providers/cursor.mjs:245` (`opts.createAgentsMd` guard) | HIGH (AIWG source) |

---

*Assessment scope: Cursor IDE 2.x (post-2.4 capabilities noted). Closed-source platform — all behavioral claims are MODERATE unless independently verifiable from AIWG integration code. Unverified items from `.aiwg/references/platforms/cursor.md:§11` are marked LOW evidence.*
