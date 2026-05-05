# Warp Terminal — Parity Assessment

**Issue**: #1097
**Date**: 2026-05-05
**Assessor**: Technical Researcher (automated)
**AIWG version assessed**: 2026.5.0-rc.7 (commit 56b96545)

---

## 1. Repo State

| Item | Detail |
|------|--------|
| Main repo | github.com/warpdotdev/Warp — issues-only tracker; source is closed |
| Skills example repo | github.com/warpdotdev/oz-skills |
| oz-skills commit assessed | `6c08c49fc6c51b8f768bf8c53c041bc06a160765` |
| oz-skills clone path | `/tmp/aiwg-parity-2026-05/oz-skills` |
| OSS status | Closed-source product; oz-skills is MIT-licensed open example catalog |
| Primary info sources | `warp.mjs` provider (tools/agents/providers/warp.mjs), `.aiwg/references/platforms/warp.md`, `docs/providers/skills-paths.md`, oz-skills SKILL.md files |

The Warp product binary is closed-source. All behavioral claims about Warp's discovery mechanism come from official documentation (MODERATE confidence) and the oz-skills repository as a first-party canonical example (HIGH confidence for format conventions). AIWG's own provider implementation (`warp.mjs`) provides additional ground truth on what AIWG currently deploys (HIGH confidence).

---

## 2. Discovery Mechanism

### 2.1 Rules / Project Context File

Warp auto-discovers `WARP.md` or `AGENTS.md` at the project root and in subdirectories. Both filenames are recognized; `WARP.md` takes priority when both exist in the same directory. `AGENTS.md` is now the preferred name per Warp documentation — `WARP.md` is functionally identical but considered the legacy spelling. (MODERATE — doc-sourced)

Discovery scan order:
1. Subdirectory `WARP.md` / `AGENTS.md` (active when working inside that directory)
2. Repository root `WARP.md` / `AGENTS.md` (project-wide baseline)
3. Global Rules via Warp Drive panel (workspace-wide, across all projects)

There is no per-file rule directory (contrast Windsurf's `.windsurf/rules/*.md`). All rules are always-on; no glob-triggered or manually-triggered variants exist.

### 2.2 Skills

Warp scans for skills at multiple paths simultaneously (MODERATE — doc-sourced; cross-confirmed by oz-skills structure):

**Project-level paths:**
- `.agents/skills/` — cross-agent interoperability convention; used by oz-skills as primary
- `.warp/skills/` — Warp-specific path
- `.claude/skills/`, `.codex/skills/`, `.cursor/skills/`, `.gemini/skills/`, `.copilot/skills/`, `.factory/skills/`, `.github/skills/`, `.opencode/skills/` — all scanned (for projects deploying across multiple platforms)

**User-global paths:**
- `~/.agents/skills/`
- `~/.warp/skills/`

**Scope for Git repos**: skills are discovered from the current working directory up through the repository root — i.e., recursive upward walk, not just the nearest ancestor.

**Progressive disclosure**: Only the `name` and `description` fields from skill frontmatter are loaded into context by default. Full `SKILL.md` content is loaded on demand when the skill is invoked. This is a deliberate design for context efficiency.

**Invocation modes**:
- Automatic: Warp evaluates request intent against skill descriptions and activates relevant skills
- Explicit: `/{skill-name}` slash command invocation

### 2.3 Agents

Warp does not have a file-based agent directory discovery path. Agent configuration is UI-only via Settings > AI > Agents > Profiles. There is no documented `~/.warp/agents/` or `.warp/agents/` path that Warp reads at runtime.

Agent behavior is delivered to Warp through:
- `WARP.md` / `AGENTS.md` — project context file (always-loaded rules)
- Skills — task-specific packages
- Agent Profiles — UI-configured autonomy and model selection

### 2.4 Commands

Warp does not have a `.warp/commands/` native discovery path. The native equivalents are:
- **Skills** for reusable workflow invocation
- **Warp Drive workflows** for parameterized command sequences (primary)
- **Legacy YAML workflows** at `.warp/workflows/` (still supported, not deprecated)
- **Saved prompts** in Warp Drive (appear in slash command menu)

### 2.5 MCP Servers

MCP is natively supported. Configuration is UI-driven via Settings > AI > MCP Servers or `/add-mcp` slash command. No file-based `mcp.json` is documented as a user-editable path (contrast Windsurf's `~/.codeium/windsurf/mcp_config.json`). (MODERATE — doc-sourced)

Supported transports: stdio (local process) and Streamable HTTP (remote with OAuth).

### 2.6 Recursion Depth

- `WARP.md` / `AGENTS.md`: subdirectory wins over root (two levels considered: immediate + root). Not a full recursive scan.
- Skills: recursive upward walk from CWD to repository root. Depth is bounded by the repo boundary, not a fixed number.

---

## 3. Artifact Format

### 3.1 WARP.md / AGENTS.md

- Plain Markdown, no YAML frontmatter
- All-caps filename required
- No documented size limit
- External links to `.cursorrules` and `.clinerules` are resolved by Warp (those files are loaded)
- Content is project-scoped rules and instructions — persists across all conversations in that project

### 3.2 SKILL.md (Skills)

Format confirmed from oz-skills examples (`6c08c49` — HIGH confidence):

```markdown
---
name: skill-name         # kebab-case, must match directory name
description: <sentence>  # Two-sentence canonical form (oz-skills):
                         #   Sentence 1: Imperative verb + what
                         #   Sentence 2: "Use when..."
license: MIT             # Optional; present in oz-skills entries
---

# Skill Title

Markdown body — workflow steps, examples, bash code blocks
```

**Required fields**: `name` and `description`. `license` is optional.

**Directory layout** (HIGH — oz-skills examples):
```
.agents/skills/
  skill-name/
    SKILL.md              # Required
    references/           # Optional supporting docs
    scripts/              # Optional scripts
    examples/             # Optional code examples
    LICENSE.txt           # Optional
```

Supporting files within a skill directory are accessible to the agent when the skill is loaded. The oz-skills `mcp-builder` skill includes `reference/` markdown files explicitly cross-linked from the SKILL.md body (`./reference/mcp_best_practices.md` — HIGH, `mcp-builder/SKILL.md:58`).

**oz-skills description pattern** (canonical — HIGH, `AGENTS.md:44-52`):
- `name` must be kebab-case and exactly match directory name
- `description` must be exactly two sentences
- Sentence 1: imperative verb (`Build`, `Audit`, `Test`, `Optimize`, etc.)
- Sentence 2: starts with `Use when...`

**Parameter passing**: `$ARGUMENTS` for full arg string, `$ARGUMENTS[N]` for positional, `$N` shorthand.

### 3.3 Legacy YAML Workflows (`.warp/workflows/`)

```yaml
name: "Workflow Name"
command: "cmd --flag {{argument}}"
description: "What this workflow does"
tags: ["tag1", "tag2"]
arguments:
  - name: argument
    description: "Description"
    default_value: ""
```

Parameter syntax: `{{argument_name}}` — double curly braces. Same syntax used in Warp Drive workflows and Notebooks.

---

## 4. Lifecycle Hooks

No documented lifecycle hook system for project-level files. There are no `pre-session`, `post-write`, or equivalent event hooks in Warp's published API.

The closest equivalents are:
- Warp Drive workflows triggered by events on the Oz cloud platform (cloud agents only; requires paid plan tier)
- `/init` slash command generates `AGENTS.md` on first use
- MCP server persistence: servers restart automatically on Warp relaunch if they were running when Warp closed

For local agent sessions (the AIWG use case), there are no programmatic lifecycle hooks. (MODERATE — doc-sourced; LOW confidence on completeness given closed source)

---

## 5. Current AIWG Deployment Behavior

Source: `tools/agents/providers/warp.mjs` (HIGH — source code).

### 5.1 What `aiwg use sdlc --provider warp` Deploys Today

| AIWG Artifact Type | Deploy Path | Discovery by Warp | Status |
|--------------------|-------------|-------------------|--------|
| Agents | `WARP.md` (aggregated only) | Yes — via WARP.md auto-discovery | Correct |
| Commands | `WARP.md` (aggregated only) | Yes — via WARP.md auto-discovery | Correct |
| Skills | `.warp/skills/` + `.agents/skills/` | Yes — natively discovered | Correct |
| Rules | `WARP.md` (aggregated only) | Yes — via WARP.md auto-discovery | Correct |

`platform-paths.ts` lines 28, 56, 85, 123 show the path registration. The comments explicitly note which paths are not natively discovered and are convention-only. This is accurate.

### 5.2 WARP.md Aggregation Logic

Implemented in `tools/warp/setup-warp.mjs`. The script:
1. Collects agent `.md` files from addon dirs and framework dirs
2. Collects command `.md` files from the same sources
3. Renders each as a `###`-headed section inside a single `WARP.md`
4. Appends natural language command translation table
5. Intelligently merges with existing `WARP.md`, preserving user-authored sections above the AIWG block
6. Creates timestamped backup before overwriting
7. Validates output (checks for `## AIWG` heading, counts `###` agent and command sections)

### 5.3 Skill Deployment

`deploySkills()` in `warp.mjs:166-186` deploys to both `.warp/skills/` (primary) and `.agents/skills/` (cross-agent compatibility). This is the correct behavior for maximum Warp compatibility.

### 5.4 Capability Flags

From `warp.mjs:58-70`:
```js
support = { agents: 'aggregated', commands: 'aggregated', skills: 'native', rules: 'aggregated' }
capabilities = { skills: true, rules: true, aggregatedOutput: true, yamlFormat: false }
```

These accurately reflect the current implementation.

### 5.5 Historical Issues (Now Resolved)

Earlier versions of AIWG had `supportsSkills: false` for Warp and wrote discrete files to `.warp/agents/`, `.warp/commands/`, `.warp/rules/` which Warp never read. The platform reference document (`.aiwg/references/platforms/warp.md:152,163,176,182`) documents these as "now resolved." The current `warp.mjs` implementation skips discrete agent/command/rule file writing explicitly (lines 356-362: logged as "Skipping discrete X deployment — Warp uses WARP.md").

---

## 6. Gaps vs. Latest Provider Mechanism

### Gap 1 — WARP.md vs. AGENTS.md Naming (Low Severity)

AIWG aggregates into `WARP.md`. Warp documentation now treats `AGENTS.md` as the preferred filename and `WARP.md` as the legacy name. Both work; `WARP.md` takes priority if both exist.

**Impact**: Functionally none. `WARP.md` still works and takes precedence. However, projects that also receive `AGENTS.md` from another tool (e.g., Windsurf's AGENTS.md aggregation) may have a naming collision. (MODERATE — doc-sourced)

**Recommendation**: Consider offering `--filename agents` option in `setup-warp.mjs` to emit `AGENTS.md` instead of `WARP.md` for projects that prefer the current canonical name.

### Gap 2 — oz-skills Two-Sentence `description` Convention Not Enforced (Medium Severity)

AIWG skill `description` fields are not validated against the oz-skills canonical two-sentence pattern (`name` + two-sentence `description` with Sentence 2 starting "Use when..."). The oz-skills spec (`AGENTS.md:44-52` — HIGH) is strict: exactly two sentences, sentence 1 imperative verb, sentence 2 "Use when...".

**Impact**: AIWG skills may have descriptions that are less effective for Warp's automatic skill activation, which matches request intent against the description. Single-sentence or multi-sentence descriptions outside this pattern may reduce auto-invocation accuracy.

**Recommendation**: Add a linter rule in `aiwg validate-metadata` that checks skill descriptions against the two-sentence pattern for Warp deployments.

### Gap 3 — No `.agents/skills/` Deployment at User-Global Scope (Low Severity)

Warp scans `~/.agents/skills/` and `~/.warp/skills/` for user-global skills. AIWG deploys to project-local `.agents/skills/` only. There is no user-global skill deployment path in the current Warp provider.

**Impact**: Skills are per-project only. A user who works across many projects does not get AIWG skills in new projects without running `aiwg use` in each one. (MODERATE — doc-sourced)

**Recommendation**: Document `~/.agents/skills/` as an option. A future `aiwg use sdlc --provider warp --global` flag could deploy the most broadly useful skills to `~/.agents/skills/`.

### Gap 4 — MCP Config Not Deployable (Medium Severity)

The `warp-mcp-full.json` and `warp-mcp-minimal.json` templates exist at `agentic/code/frameworks/sdlc-complete/templates/warp/`. However, Warp does not expose a file-based MCP config path. These templates have no deployment path — they are reference-only.

**Impact**: AIWG cannot programmatically configure MCP servers for Warp. The user must add servers manually via `/add-mcp` or the Settings panel.

**Recommendation**: Update template documentation to clarify these are reference/manual-entry templates, not auto-deployed config. The `capability-matrix.md` row for Warp MCP shows `—` (not supported via AIWG) which is correct.

### Gap 5 — No Skills for Warp-Native Features (Low Severity)

Warp has platform-native features that AIWG has no skills for:
- `/orchestrate` — break task into parallel subtasks
- `/compact` — summarize conversation to free context
- `/plan` — task planning
- Warp Drive workflows — parameterized command sequences
- AI Notebooks — runnable documentation

AIWG's SDLC skills do not teach agents how to leverage these Warp-native features within an SDLC context.

### Gap 6 — Legacy Workflow Directory Not Used (Low Severity)

`.warp/workflows/` (legacy YAML format) is a Warp-native discovery path for parameterized shell command sequences. AIWG does not deploy anything here. Warp Drive has superseded this for new creation, but the format remains supported.

**Impact**: Minimal. AIWG's command content is effectively delivered via WARP.md aggregation, which reaches the agent context. Workflow YAML serves a different purpose (parameterized shell execution, not agent instruction). Not a blocking gap.

---

## 7. New Capabilities Not Yet Exploited

### 7.1 Skill Supporting Files / References Directory

The oz-skills examples demonstrate that skills can include a `references/` subdirectory with supporting Markdown documents that the agent can load on demand (`mcp-builder/SKILL.md:58-65` — HIGH). These files are not in the skill's default context (only `SKILL.md` is loaded automatically), but the SKILL.md body can link to them with relative paths (`./reference/mcp_best_practices.md`).

AIWG skills currently do not use this pattern. Complex SDLC skills (e.g., security-review-cycle, architecture-evolution) could externalize their large reference tables and checklist libraries into `references/` files rather than embedding them in `SKILL.md`, reducing default context footprint while retaining full fidelity on demand.

### 7.2 Cross-Agent `~/.agents/skills/` as a Platform-Agnostic User-Global Path

`~/.agents/skills/` is scanned by Warp, OpenClaw, Codex, and GitHub Copilot. Deploying AIWG's most portable skills here once would make them available across four platforms without per-project `aiwg use` invocations.

### 7.3 Warp Notebooks as SDLC Runbooks

Warp AI Notebooks support Markdown content with embedded executable shell commands and Warp Drive workflow blocks. They are exported as `.md` files. AIWG's SDLC runbook templates (`agentic/code/frameworks/sdlc-complete/templates/`) could be offered in a Notebooks-compatible format, allowing deployment teams to run deployment steps directly inside Warp as native notebook sessions.

### 7.4 Agent Profile Configuration Reference

While Agent Profiles are UI-only, AIWG could ship a documented reference configuration for recommended Warp Agent Profile settings when running AIWG workflows. For example: recommended autonomy levels (auto-run vs. ask) per action type for SDLC orchestration. This would be a documentation artifact, not a deployed config file.

### 7.5 Progressive Description Strategy for Auto-Activation

Warp's automatic skill matching scores `name` + `description` against request intent. Skills with well-crafted two-sentence descriptions that match SDLC vocabulary ("Transition to Elaboration", "Run security review") would be auto-invoked without explicit `/{skill-name}` calls. AIWG could invest in description optimization specifically for Warp's matcher, following the oz-skills canonical pattern.

---

## 8. Cross-Port Candidates

The following oz-skills patterns are directly portable to AIWG:

| Pattern | oz-skills Source | AIWG Application |
|---------|-----------------|-----------------|
| Two-sentence `description` discipline | `AGENTS.md:44-52` (HIGH) | Apply to all AIWG skill `description` fields for Warp deployment |
| `references/` subdirectory for supporting docs | `mcp-builder/SKILL.md` (HIGH) | Refactor large AIWG skills (security-review, architecture-evolution) to use reference files |
| `license` frontmatter field | Multiple skills in oz-skills (HIGH) | Optional addition to AIWG skill metadata for attribution |
| Prerequisite skill chaining | `create-pull-request/SKILL.md:36-47` (HIGH) | AIWG skills could explicitly reference prerequisite skills ("Before creating a PR, check for ci-fix skill") |
| In-skill bash example blocks | All oz-skills entries (HIGH) | AIWG skills should include concrete bash snippets rather than pseudo-commands |
| Safety notes section | `ci-fix/SKILL.md:112-117` (HIGH) | SDLC skills handling deployment or security operations should include a Safety Notes section |

---

## 9. Citations

| Claim | Source | GRADE |
|-------|--------|-------|
| oz-skills canonical skill format (name, description, two-sentence rule) | `oz-skills/AGENTS.md:44-52` (commit 6c08c49) | HIGH |
| ci-fix SKILL.md — frontmatter schema with `license` field | `oz-skills/.agents/skills/ci-fix/SKILL.md:1-5` | HIGH |
| mcp-builder references/ pattern — relative path cross-links | `oz-skills/.agents/skills/mcp-builder/SKILL.md:58-65` | HIGH |
| create-pull-request prerequisite skill chaining | `oz-skills/.agents/skills/create-pull-request/SKILL.md:36-47` | HIGH |
| oz-skills deploy path is `.agents/skills/` | `oz-skills/AGENTS.md:17-23` and `oz-skills/CONTRIBUTING.md:27-28` | HIGH |
| Warp discovers `.warp/skills/` and `.agents/skills/` | `docs/providers/skills-paths.md:97-106` (AIWG internal research) | MODERATE |
| WARP.md vs. AGENTS.md priority and naming preference | `.aiwg/references/platforms/warp.md:79-94` | MODERATE |
| Rules: no `.warp/rules/` discovery; WARP.md only | `.aiwg/references/platforms/warp.md:179-185` | MODERATE |
| Agents: no `.warp/agents/` discovery | `.aiwg/references/platforms/warp.md:165-176` | MODERATE |
| Commands: no `.warp/commands/` discovery | `.aiwg/references/platforms/warp.md:154-163` | MODERATE |
| Progressive disclosure (name+description only in context by default) | `.aiwg/references/platforms/warp.md:146-147` | MODERATE |
| Upward-walk recursion to repo root for skills | `.aiwg/references/platforms/warp.md:115-116` | MODERATE |
| MCP config is UI-only; no file-based path | `.aiwg/references/platforms/warp.md:221-224` | MODERATE |
| AIWG deploys skills to `.warp/skills/` and `.agents/skills/` | `tools/agents/providers/warp.mjs:52-56, 166-186` | HIGH |
| AIWG skips discrete agent/command/rule files for Warp | `tools/agents/providers/warp.mjs:356-362` | HIGH |
| support/capabilities flags in warp.mjs | `tools/agents/providers/warp.mjs:58-70` | HIGH |
| platform-paths.ts Warp entries | `src/smiths/platform-paths.ts:28, 56, 85, 123, 140, 159` | HIGH |
| WARP.md aggregation logic (mergeWarpMd, validation) | `tools/warp/setup-warp.mjs:386-456` | HIGH |
| Warp MCP: `—` (not AIWG-deployed) | `docs/providers/capability-matrix.md:29` | HIGH |
| `.agents/skills/` cross-platform scan (Warp, OpenClaw, Codex, Copilot) | `docs/providers/skills-paths.md:13-20` | MODERATE |
| oz-skills commit hash 6c08c49 | `git rev-parse HEAD` in `/tmp/aiwg-parity-2026-05/oz-skills` | HIGH |
