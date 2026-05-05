# Cross-Provider Capability Matrix

## 1. Header

**Purpose:** Synthesize the 10 per-provider parity assessments (issue #1100) into a single capability grid covering 10 providers × 6 artifact types (agents, commands, skills, rules, hooks, behaviors). Identifies gaps in current AIWG deployment, cross-port candidates, and unique capabilities for downstream prioritization.

**Date:** 2026-05-05

**Source assessments (10):**

- [Claude Code](./claude-code/assessment.md) — issue #1090
- [Codex CLI](./codex/assessment.md) — issue #1091
- [GitHub Copilot / VS Code](./copilot/assessment.md) — issue #1092
- [Factory AI](./factory/assessment.md) — issue #1093
- [Cursor](./cursor/assessment.md) — issue #1094
- [OpenCode](./opencode/assessment.md) — issue #1095
- [OpenClaw](./openclaw/assessment.md) — issue #1096
- [Warp Terminal](./warp/assessment.md) — issue #1097
- [Windsurf](./windsurf/assessment.md) — issue #1098
- [Hermes](./hermes/assessment.md) — issue #1099

**Confidence legend:**

- **HIGH** — claim cited from primary source code (loader/discovery files in vendor repo, or AIWG source)
- **MODERATE** — claim from vendor documentation (no source-code verification possible — closed-source product or docs-only repo)
- **LOW** — inferred from convention or single uncorroborated mention

**Status legend (View A):**

- ✓ — natively discovered/loaded; AIWG deployment lands in scanned path
- ✗ — not supported by provider; no deployment target
- ~ — supported by provider, but AIWG deploys to wrong path / silently dropped / partial only
- ? — convention-only (AIWG writes a path that may or may not be auto-discovered; not source-confirmed)

---

## 2. Master Matrix

### View A — Status Grid (10 providers × 6 artifact types)

| Provider | Agents | Commands | Skills | Rules | Hooks | Behaviors |
|----------|:------:|:--------:|:------:|:-----:|:-----:|:---------:|
| Claude Code | ✓[^cc-a] | ~[^cc-c] | ✓[^cc-s] | ~[^cc-r] | ~[^cc-h] | ~[^cc-b] |
| Codex CLI | ~[^cx-a] | ~[^cx-c] | ~[^cx-s] | ~[^cx-r] | ✗[^cx-h] | ✗[^cx-b] |
| GitHub Copilot | ✓[^gh-a] | ~[^gh-c] | ✓[^gh-s] | ~[^gh-r] | ✗[^gh-h] | ✗[^gh-b] |
| Factory AI | ✓[^f-a] | ✓[^f-c] | ✓[^f-s] | ~[^f-r] | ✗[^f-h] | ✗[^f-b] |
| Cursor | ?[^cr-a] | ?[^cr-c] | ✓[^cr-s] | ✓[^cr-r] | ✗[^cr-h] | ✗[^cr-b] |
| OpenCode | ✓[^oc-a] | ~[^oc-c] | ✓[^oc-s] | ~[^oc-r] | ✗[^oc-h] | ✗[^oc-b] |
| OpenClaw | ✓[^ow-a] | ~[^ow-c] | ✓[^ow-s] | ~[^ow-r] | ~[^ow-h] | ~[^ow-b] |
| Warp | ~[^w-a] | ~[^w-c] | ✓[^w-s] | ~[^w-r] | ✗[^w-h] | ✗[^w-b] |
| Windsurf | ~[^wd-a] | ✓[^wd-c] | ✓[^wd-s] | ✓[^wd-r] | ✗[^wd-h] | ✗[^wd-b] |
| Hermes | ~[^h-a] | ✗[^h-c] | ✓[^h-s] | ✗[^h-r] | ✗[^h-h] | ✗[^h-b] |

[^cc-a]: Claude Code — agents native at `.claude/agents/*.md`. AIWG deploys 191 agents correctly. ([asmt §2,§5](./claude-code/assessment.md#2-discovery-mechanism))
[^cc-c]: Claude Code — commands native at `.claude/commands/*.md`, but AIWG deploys 0 command files (gap B). ([asmt §6](./claude-code/assessment.md#gap-b-slash-commands-directory-is-empty))
[^cc-s]: Claude Code — skills native at `.claude/skills/<name>/SKILL.md`. AIWG deploys 393 skills correctly. ([asmt §2,§5](./claude-code/assessment.md#skills))
[^cc-r]: Claude Code — only `RULES-INDEX.md` deployed; individual rule files missing (gap C). ([asmt §6](./claude-code/assessment.md#gap-c-individual-rule-files-not-deployed))
[^cc-h]: Claude Code — native hook system; aiwg-hooks addon `autoInstall: false` so hooks not wired (gap A). ([asmt §4,§6](./claude-code/assessment.md#gap-a-hook-system-not-auto-wired))
[^cc-b]: Claude Code — behaviors emulated via hooks per capability-matrix.yaml; not natively supported. ([asmt §1 capability-matrix ref](./claude-code/assessment.md))
[^cx-a]: Codex — `.codex/agents/` has no loader in codex-rs (gap 2). ([asmt §6 gap 2](./codex/assessment.md#gap-2-codexagents-path-does-not-exist-in-codex-loader-high))
[^cx-c]: Codex — `.codex/commands/` has no loader; slash commands are built-in static enum (gap 3). ([asmt §6 gap 3](./codex/assessment.md#gap-3-codexcommands-path-has-no-loader-in-codex-rs-high))
[^cx-s]: Codex — primary path is `.agents/skills/`; AIWG writes to `.codex/skills/` (deprecated user path) — not scanned in repo scope (gap 1, tracked #766). ([asmt §6 gap 1](./codex/assessment.md#gap-1-skills-deploy-path-is-wrong-critical--tracked-766))
[^cx-r]: Codex — `.codex/rules/` has no loader; rules go through AGENTS.md or `instructions` config (gap 4). ([asmt §6 gap 4](./codex/assessment.md#gap-4-codexrules-path-has-no-loader-in-codex-rs-medium))
[^cx-h]: Codex — 6 native hook events in `[hooks]` config table; AIWG does not deploy hook config. ([asmt §4](./codex/assessment.md#4-lifecycle-hooks))
[^cx-b]: Codex — no behavior concept in codex-rs.
[^gh-a]: Copilot/VS Code — agents scanned at `.github/agents/`, `.claude/agents/`, plus user-global. AIWG deploys plain `.md` (no `.agent.md` extension; gap medium). ([asmt §2.4,§6](./copilot/assessment.md#24-agents))
[^gh-c]: Copilot — commands at `.github/prompts/*.prompt.md`; AIWG writes `.github/commands/*.md` — invisible (HIGH gap). ([asmt §6](./copilot/assessment.md#6-gaps-vs-latest-provider-mechanism))
[^gh-s]: Copilot — skills natively scanned at `.github/skills`, `.claude/skills`, `.agents/skills`, plus user-global. ([asmt §2.1](./copilot/assessment.md#21-skills))
[^gh-r]: Copilot — rules at `.github/instructions/*.instructions.md`; AIWG writes `.github/copilot-rules/*.md` — invisible (HIGH gap). ([asmt §6](./copilot/assessment.md#6-gaps-vs-latest-provider-mechanism))
[^gh-h]: Copilot — first-class `.github/hooks/*.json` system (8 events); AIWG has no hook deployment. ([asmt §4,§6](./copilot/assessment.md#4-lifecycle-hooks))
[^gh-b]: Copilot — no native behavior concept.
[^f-a]: Factory — droids native at `.factory/droids/` (top-level only). AIWG deploys correctly per #399. ([asmt §2.1,§5](./factory/assessment.md#21-droids-agents))
[^f-c]: Factory — commands native at `.factory/commands/` (top-level only, .md or shebang). ([asmt §2.3](./factory/assessment.md#23-commands))
[^f-s]: Factory — skills at `.factory/skills/<name>/SKILL.md`; also `.agent/skills/` compat alias. ([asmt §2.2](./factory/assessment.md#22-skills))
[^f-r]: Factory — no rules directory; rules must go into AGENTS.md or droid system prompts (gap G1). ([asmt §6 G1](./factory/assessment.md#6-gaps-vs-latest-provider-mechanism))
[^f-h]: Factory — 9 native hook events in settings.json; AIWG does not deploy hooks. ([asmt §4](./factory/assessment.md#4-lifecycle-hooks))
[^f-b]: Factory — no behavior concept.
[^cr-a]: Cursor — `.cursor/agents/` is AIWG convention; no confirmed native auto-discovery. ([asmt §2.4](./cursor/assessment.md#24-agents-and-commands))
[^cr-c]: Cursor — `.cursor/commands/` AIWG convention; no native auto-discovery confirmed. ([asmt §2.4](./cursor/assessment.md#24-agents-and-commands))
[^cr-s]: Cursor — skills native at `.cursor/skills/<name>/SKILL.md` since 2.4. ([asmt §2.3](./cursor/assessment.md#23-skills-24))
[^cr-r]: Cursor — `.cursor/rules/*.mdc` native with 4 trigger modes; AIWG deploys but does not differentiate activation mode (gap 1). ([asmt §2.1,§6](./cursor/assessment.md#gap-1-rule-activation-mode-not-systematically-set))
[^cr-h]: Cursor — no documented file-based lifecycle hook system (Cloud Agent automations exist but UI-driven). ([asmt §4](./cursor/assessment.md#4-lifecycle-hooks))
[^cr-b]: Cursor — no behavior concept.
[^oc-a]: OpenCode — agents file-based at `.opencode/agent/**/*.md` (HIGH; corrected from prior memory). ([asmt §2.2](./opencode/assessment.md#22-agents--file-based-confirmed--prior-memory-was-incorrect))
[^oc-c]: OpenCode — commands at `.opencode/command/**/*.md` ARE scanned, but AIWG sets `commands: ''` and does not deploy (HIGH gap). ([asmt §2.3,§6](./opencode/assessment.md#23-commands--file-based-confirmed--prior-memory-was-partially-incorrect))
[^oc-s]: OpenCode — skills at `.opencode/skill/**/SKILL.md` plus cross-platform `.claude/skills/`, `.agents/skills/`. ([asmt §2.1](./opencode/assessment.md#21-skills--file-based-primary-artifact-type))
[^oc-r]: OpenCode — no `.opencode/rule/` scanner exists; AIWG writes to dead path (HIGH gap). ([asmt §2.4,§6](./opencode/assessment.md#24-rules--no-file-based-discovery-confirmed))
[^oc-h]: OpenCode — no file-based lifecycle hook system (TypeScript plugin only). ([asmt §4](./opencode/assessment.md#4-lifecycle-hooks))
[^oc-b]: OpenCode — no behavior concept.
[^ow-a]: OpenClaw — agents at `~/.openclaw/agents/<id>/agent/`. AIWG deploys to `~/.openclaw/agents/`. ([asmt §2 agent discovery](./openclaw/assessment.md#agent-discovery))
[^ow-c]: OpenClaw — `~/.openclaw/commands/` not natively scanned (MEDIUM gap). ([asmt §6](./openclaw/assessment.md#6-gaps-vs-latest-provider-mechanism))
[^ow-s]: OpenClaw — skills 6-tier stack including `~/.openclaw/skills/` (tier 3); 2-level depth max. ([asmt §2 skill discovery](./openclaw/assessment.md#skill-discovery))
[^ow-r]: OpenClaw — no rules directory; equivalent is SOUL.md/AGENTS.md/TOOLS.md (MEDIUM gap). ([asmt §6](./openclaw/assessment.md#6-gaps-vs-latest-provider-mechanism))
[^ow-h]: OpenClaw — production-grade hook system at `~/.openclaw/hooks/` with 29 events; AIWG does not deploy hooks (HIGH gap). ([asmt §4,§6](./openclaw/assessment.md#hook-discovery))
[^ow-b]: OpenClaw — `~/.openclaw/behaviors/` is AIWG convention; OpenClaw source has NO loader for this path (HIGH gap; silently ignored). ([asmt §3 behaviors not natively loaded](./openclaw/assessment.md#behaviors--not-natively-loaded-by-openclaw))
[^w-a]: Warp — no `.warp/agents/` discovery; agents flow into `WARP.md` aggregation (correct AIWG behavior). ([asmt §2.3,§5](./warp/assessment.md#23-agents))
[^w-c]: Warp — no `.warp/commands/`; commands aggregated into `WARP.md`. Legacy `.warp/workflows/` exists but AIWG does not deploy. ([asmt §2.4](./warp/assessment.md#24-commands))
[^w-s]: Warp — skills native at `.warp/skills/`, `.agents/skills/`, plus 8 cross-platform paths. AIWG deploys to both `.warp/skills/` and `.agents/skills/`. ([asmt §2.2,§5.3](./warp/assessment.md#22-skills))
[^w-r]: Warp — no `.warp/rules/`; rules aggregated into `WARP.md`. ([asmt §2.1](./warp/assessment.md#21-rules--project-context-file))
[^w-h]: Warp — no documented lifecycle hook system. ([asmt §4](./warp/assessment.md#4-lifecycle-hooks))
[^w-b]: Warp — no behavior concept.
[^wd-a]: Windsurf — no `.windsurf/agents/` directory; agents discovered via `AGENTS.md` (case-insensitive, multi-level scoping). AIWG aggregates correctly + writes discrete soul companions. ([asmt §2.1](./windsurf/assessment.md#21-agent-discovery--agentsmd))
[^wd-c]: Windsurf — workflows native at `.windsurf/workflows/*.md` (12k char limit). AIWG deploys correctly. ([asmt §2.3](./windsurf/assessment.md#23-workflows-discovery--windsurfworkflows))
[^wd-s]: Windsurf — skills native at `.windsurf/skills/<name>/SKILL.md` since v1.13.6 (Jan 2026). AIWG deploys correctly. ([asmt §2.4](./windsurf/assessment.md#24-skills-discovery--windsurfskills))
[^wd-r]: Windsurf — rules native at `.windsurf/rules/*.md` with 4 trigger modes; AIWG injects `always_on` for all (gap 1). ([asmt §2.2,§6](./windsurf/assessment.md#22-rules-discovery--windsurfrules))
[^wd-h]: Windsurf — no documented external lifecycle hook system; Cascade Hooks mentioned but not externally accessible. ([asmt §4](./windsurf/assessment.md#4-lifecycle-hooks))
[^wd-b]: Windsurf — no behavior concept; emulated via daemon per capability matrix.
[^h-a]: Hermes — no `.hermes/agents/` directory; agents loaded via `AGENTS.md` (CWD only). `.hermes.md` is higher-priority alternative not used by AIWG (gap 1). ([asmt §2.3,§6](./hermes/assessment.md#23-agents--agentsmd-project-context))
[^h-c]: Hermes — no file-based commands; static `COMMAND_REGISTRY` in Python. ([asmt §2.4](./hermes/assessment.md#24-commands))
[^h-s]: Hermes — skills at `~/.hermes/skills/` with unlimited-depth `os.walk`. AIWG deploys correctly. ([asmt §2.1](./hermes/assessment.md#21-skills--primary-scan-path))
[^h-r]: Hermes — no native rules artifact concept; closest equivalent is project context files. ([asmt §2.5](./hermes/assessment.md#25-rules))
[^h-h]: Hermes — 16 native plugin-hook events plus shell hooks; AIWG does not deploy. ([asmt §4](./hermes/assessment.md#4-lifecycle-hooks))
[^h-b]: Hermes — no behavior concept.

---

### View B — Detail Tables (per artifact type)

#### B.1 Agents

| Provider | Discovery path | Format | Recursion | AIWG status | Citation |
|----------|----------------|--------|-----------|-------------|----------|
| Claude Code | `.claude/agents/` (project) + `~/.claude/agents/` (user) | `.md` + YAML frontmatter | Flat | ✓ deploys 191 agents | [asmt §2](./claude-code/assessment.md#agents) |
| Codex CLI | NONE — no agent loader in codex-rs | — | — | ~ AIWG writes `.codex/agents/` (silently ignored) | [asmt §6 gap 2](./codex/assessment.md#gap-2-codexagents-path-does-not-exist-in-codex-loader-high) |
| Copilot | `.github/agents/`, `.claude/agents/`, `~/.copilot/agents/`, `~/.claude/agents/` | `.agent.md` (canonical) or `.chatmode.md` or any `.md`; flat — no subdirs | Flat (no nesting) | ✓ deploys but uses plain `.md` not `.agent.md` (medium gap) | [asmt §2.4](./copilot/assessment.md#24-agents) |
| Factory | `.factory/droids/` (project) + `~/.factory/droids/` (user) | `.md` + YAML frontmatter | Top-level only | ✓ deploys (assuming flattening) | [asmt §2.1](./factory/assessment.md#21-droids-agents) |
| Cursor | `.cursor/agents/` AIWG convention only | `.md` | Flat | ? convention only — no native auto-discovery confirmed | [asmt §2.4](./cursor/assessment.md#24-agents-and-commands) |
| OpenCode | `.opencode/{agent,agents}/**/*.md` | `.md` + YAML frontmatter | Unlimited (`**`) | ✓ AIWG deploys; comment in platform-paths.ts:54 stale | [asmt §2.2](./opencode/assessment.md#22-agents--file-based-confirmed--prior-memory-was-incorrect) |
| OpenClaw | `~/.openclaw/agents/<id>/agent/` | `.md` | Per-agent dir | ✓ AIWG deploys to `~/.openclaw/agents/` | [asmt §2 agent discovery](./openclaw/assessment.md#agent-discovery) |
| Warp | NONE — no `.warp/agents/` discovery | aggregated only | — | ~ AIWG aggregates into `WARP.md` (correct workaround) | [asmt §2.3](./warp/assessment.md#23-agents) |
| Windsurf | NONE — agents via `AGENTS.md` only | plain markdown | Multi-level scoping (auto-glob) | ~ AIWG aggregates correctly into `AGENTS.md`; also writes discrete `.windsurf/agents/` (no native discovery) | [asmt §2.1](./windsurf/assessment.md#21-agent-discovery--agentsmd) |
| Hermes | NONE — agents via `AGENTS.md` (CWD only) | plain markdown | CWD only (no recursion) | ~ AIWG aggregates into `AGENTS.md`; should consider `.hermes.md` for git-root traversal | [asmt §2.3,§6 gap 1](./hermes/assessment.md#23-agents--agentsmd-project-context) |

#### B.2 Commands

| Provider | Discovery path | Format | Recursion | AIWG status | Citation |
|----------|----------------|--------|-----------|-------------|----------|
| Claude Code | `.claude/commands/*.md` + `~/.claude/commands/` | `.md` | Flat | ~ Directory empty (0 deployed); commands are deployed as skills instead | [asmt §6 gap B](./claude-code/assessment.md#gap-b-slash-commands-directory-is-empty) |
| Codex CLI | NONE — slash commands are built-in static enum | — | — | ~ AIWG writes `.codex/commands/`; ignored | [asmt §6 gap 3](./codex/assessment.md#gap-3-codexcommands-path-has-no-loader-in-codex-rs-high) |
| Copilot | `.github/prompts/*.prompt.md` | `.prompt.md` | (per docs) | ~ AIWG writes `.github/commands/*.md` — invisible (HIGH gap) | [asmt §2.3,§6](./copilot/assessment.md#23-prompt-files-commands) |
| Factory | `.factory/commands/` (project) + `~/.factory/commands/` (user) | `*.md` or shebang-prefixed file | Top-level only | ✓ AIWG deploys | [asmt §2.3](./factory/assessment.md#23-commands) |
| Cursor | `.cursor/commands/` AIWG convention only | `.md` | Flat | ? convention only | [asmt §2.4](./cursor/assessment.md#24-agents-and-commands) |
| OpenCode | `.opencode/{command,commands}/**/*.md` | `.md` + YAML; body becomes `template` | Unlimited (`**`) | ~ AIWG sets `commands: ''` — does NOT deploy (HIGH gap) | [asmt §2.3,§6](./opencode/assessment.md#23-commands--file-based-confirmed--prior-memory-was-partially-incorrect) |
| OpenClaw | NONE — `~/.openclaw/commands/` not scanned | — | — | ~ AIWG writes; ignored | [asmt §6](./openclaw/assessment.md#6-gaps-vs-latest-provider-mechanism) |
| Warp | NONE — `.warp/commands/` not discovered; legacy `.warp/workflows/` exists | YAML legacy | — | ~ AIWG aggregates into `WARP.md` | [asmt §2.4](./warp/assessment.md#24-commands) |
| Windsurf | `.windsurf/workflows/*.md` (manual `/workflow-name` only) | plain markdown, 12k char limit | Flat | ✓ AIWG deploys workflows correctly | [asmt §2.3](./windsurf/assessment.md#23-workflows-discovery--windsurfworkflows) |
| Hermes | NONE — `COMMAND_REGISTRY` static Python; `/skill-name` derived from skills | — | — | ✗ AIWG sets `''` correctly; but comment "Served via MCP" inaccurate | [asmt §2.4,§6 gap 7](./hermes/assessment.md#24-commands) |

#### B.3 Skills

| Provider | Discovery path(s) | Format | Recursion | AIWG status | Citation |
|----------|-------------------|--------|-----------|-------------|----------|
| Claude Code | `.claude/skills/<name>/SKILL.md` + `~/.claude/skills/` | `SKILL.md` + YAML | Subdir per skill (1 level) | ✓ deploys 393 skills | [asmt §2 skills](./claude-code/assessment.md#skills) |
| Codex CLI | `.agents/skills/` (repo) + `~/.agents/skills/` (user); `.system/`, `/etc/codex/skills/` | `SKILL.md` exact + YAML; `agents/openai.yaml` sidecar | BFS, MAX_SCAN_DEPTH=6, MAX_DIRS_PER_ROOT=2000, skips dotfiles | ~ AIWG writes `.codex/skills/` (deprecated user path); not scanned in repo scope (HIGH gap, #766) | [asmt §2.1-2.3,§6 gap 1](./codex/assessment.md#21-skill-loader) |
| Copilot | 6 paths: `.agents/skills`, `.github/skills`, `.claude/skills`, `~/.agents/skills`, `~/.copilot/skills`, `~/.claude/skills` | `SKILL.md` (case-insensitive); folder regex `^[a-z0-9-]+$` | Immediate subdirs only (1 level) | ✓ AIWG deploys to `.github/skills/` | [asmt §2.1](./copilot/assessment.md#21-skills) |
| Factory | `.factory/skills/<name>/SKILL.md` + `~/.factory/skills/`; `.agent/skills/` compat | `SKILL.md` or `skill.mdx` + YAML | Per-skill dir | ✓ AIWG deploys with frontmatter strip (rc.7) | [asmt §2.2](./factory/assessment.md#22-skills) |
| Cursor | `.cursor/skills/<name>/SKILL.md` (since 2.4) | `SKILL.md` + YAML | One dir per skill | ✓ AIWG deploys conventionally | [asmt §2.3](./cursor/assessment.md#23-skills-24) |
| OpenCode | 4-pass discovery: `~/.claude/skills`, `~/.agents/skills`, project walk-up `.claude/`/`.agents/`, `.opencode/{skill,skills}/`, `opencode.jsonc skills.paths`/`.urls` | `SKILL.md` exact (case-sensitive); name+description required | Unlimited `**` | ✓ AIWG deploys to `.opencode/skill/` | [asmt §2.1](./opencode/assessment.md#21-skills--file-based-primary-artifact-type) |
| OpenClaw | 6-tier stack: extra dirs, bundled, `~/.openclaw/skills/` (tier 3), `~/.agents/skills/`, `{ws}/.agents/skills/`, `{ws}/skills/` | `SKILL.md` + frontmatter `Record<string,string>` | 2 levels max from root; max 200/source, 256KB/file | ✓ AIWG deploys to `~/.openclaw/skills/` | [asmt §2 skill discovery](./openclaw/assessment.md#skill-discovery) |
| Warp | `.warp/skills/`, `.agents/skills/`, plus 8 cross-platform `.{claude,codex,cursor,gemini,copilot,factory,github,opencode}/skills/`; `~/.agents/skills/`, `~/.warp/skills/` | `SKILL.md` + YAML; oz-skills two-sentence pattern canonical | Recursive upward walk to repo root | ✓ AIWG dual-deploys to `.warp/skills/` + `.agents/skills/` | [asmt §2.2,§5.3](./warp/assessment.md#22-skills) |
| Windsurf | `.windsurf/skills/<name>/SKILL.md` + `.agents/skills/`; `~/.codeium/windsurf/skills/` global | `SKILL.md` + YAML (name lowercase-hyphen) | One dir per skill | ✓ AIWG dual-deploys (since v1.13.6 native) | [asmt §2.4](./windsurf/assessment.md#24-skills-discovery--windsurfskills) |
| Hermes | `~/.hermes/skills/` primary; `skills.external_dirs` config | `SKILL.md` exact; name max 64, desc max 1024; `.git`/`.github`/`.hub`/`.archive` pruned | Unlimited `os.walk` with `followlinks=True` | ✓ AIWG deploys to `~/.hermes/skills/` | [asmt §2.1](./hermes/assessment.md#21-skills--primary-scan-path) |

#### B.4 Rules

| Provider | Discovery path | Format | Recursion | AIWG status | Citation |
|----------|----------------|--------|-----------|-------------|----------|
| Claude Code | `.claude/rules/*.md` (project) | `.md` | (per docs) | ~ Only `RULES-INDEX.md` deployed; individual rule files missing | [asmt §6 gap C](./claude-code/assessment.md#gap-c-individual-rule-files-not-deployed) |
| Codex CLI | NONE — rules via `instructions` config field or AGENTS.md | — | — | ~ AIWG writes `.codex/rules/`; ignored | [asmt §6 gap 4](./codex/assessment.md#gap-4-codexrules-path-has-no-loader-in-codex-rs-medium) |
| Copilot | `.github/instructions/*.instructions.md` (or `copilot-instructions.md`); also any `.md` in `.claude/rules/**` | `.instructions.md` + YAML (`applyTo` glob) | Up to 5 levels deep (`MAX_INSTRUCTIONS_RECURSION_DEPTH`) | ~ AIWG writes `.github/copilot-rules/*.md` — invisible (HIGH gap) | [asmt §2.2,§6](./copilot/assessment.md#22-instructions-rules) |
| Factory | NONE — rules via AGENTS.md or settings.json | — | — | ~ no deployment for Factory rules (gap G1) | [asmt §6 G1](./factory/assessment.md#6-gaps-vs-latest-provider-mechanism) |
| Cursor | `.cursor/rules/*.mdc` + `.cursor/rules/**` (subdirs supported) + legacy `.cursorrules` | `.mdc` + YAML (4 trigger modes: alwaysApply/auto/glob/manual) | Subdirs supported | ✓ deploys `.mdc`; but no systematic activation mode assignment (HIGH gap 1) | [asmt §2.1,§6 gap 1](./cursor/assessment.md#21-rules) |
| OpenCode | NONE — no `.opencode/rule/` scanner exists | — | — | ~ AIWG writes `.opencode/rule/` — DEAD path (HIGH gap) | [asmt §2.4,§6](./opencode/assessment.md#24-rules--no-file-based-discovery-confirmed) |
| OpenClaw | NONE — uses SOUL.md/AGENTS.md/TOOLS.md instead | — | — | ~ AIWG writes `~/.openclaw/rules/`; not natively read (MEDIUM gap) | [asmt §6](./openclaw/assessment.md#6-gaps-vs-latest-provider-mechanism) |
| Warp | NONE — rules aggregated into WARP.md/AGENTS.md | plain md | — | ~ AIWG aggregates into WARP.md (correct) | [asmt §2.1](./warp/assessment.md#21-rules--project-context-file) |
| Windsurf | `.windsurf/rules/*.md` (12k char limit/file); global `~/.codeium/windsurf/memories/global_rules.md` (6k) | `.md` + YAML (4 triggers: always_on/model_decision/glob/manual) | Flat | ✓ deploys with `trigger: always_on` injected; gap 1 — other modes unused | [asmt §2.2,§6 gap 1](./windsurf/assessment.md#22-rules-discovery--windsurfrules) |
| Hermes | NONE — rules concept does not exist; project context via `.hermes.md`/`AGENTS.md` chain | — | — | ✗ AIWG sets `''` correctly | [asmt §2.5](./hermes/assessment.md#25-rules) |

#### B.5 Hooks

| Provider | Discovery path | Format | Events | AIWG status | Citation |
|----------|----------------|--------|--------|-------------|----------|
| Claude Code | `.claude/settings.json` `hooks` key | JSON; `executable` or `additionalContext` handler types | PreToolUse, PostToolUse, PreBash, PostBash, PreWrite, PostWrite (6+); 10-min timeout (v2.1.3+) | ~ aiwg-hooks addon `autoInstall: false`; SDLC hooks defined but not deployed (HIGH gap A) | [asmt §4,§6 gap A](./claude-code/assessment.md#4-lifecycle-hooks) |
| Codex CLI | `config.toml` `[hooks]` table | TOML | 6 events: pre_tool_use, permission_request, post_tool_use, session_start, user_prompt_submit, stop; `FailedAbort` propagates | ✗ AIWG does not deploy hook config | [asmt §4](./codex/assessment.md#4-lifecycle-hooks) |
| Copilot | `.github/hooks/*.json` (workspace) + `~/.copilot/hooks/` (user); `.claude/settings.json` cross-compat | JSON (PascalCase VS Code or camelCase CLI based on `version` field) | 8+ VS Code events: SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, PreCompact, SubagentStart/Stop, Stop; CLI variants | ✗ no Copilot hook deployment | [asmt §4](./copilot/assessment.md#4-lifecycle-hooks) |
| Factory | `~/.factory/settings.json` or `.factory/settings.json` `hooks` key; plugin `hooks/hooks.json` | JSON; stdin JSON; exit code 2 blocks | 9 events: PreToolUse, PostToolUse, UserPromptSubmit, Notification, Stop, SubagentStop, PreCompact, SessionStart, SessionEnd; uses `$FACTORY_PROJECT_DIR` | ✗ AIWG does not deploy Factory hooks; env-var mismatch (gap G4) | [asmt §4,§6 G4](./factory/assessment.md#4-lifecycle-hooks) |
| Cursor | NONE — no documented file-based lifecycle hook system | — | Cloud Agent automations (Slack/GitHub/Linear/PagerDuty/webhooks); `.cursor/environment.json` for VM setup | ✗ no exploitation | [asmt §4](./cursor/assessment.md#4-lifecycle-hooks) |
| OpenCode | NONE — TS plugin only | TypeScript | Plugin hooks (e.g., `experimental.chat.system.transform`) | ✗ no markdown hook path | [asmt §4](./opencode/assessment.md#4-lifecycle-hooks) |
| OpenClaw | `~/.openclaw/hooks/<name>/HOOK.md` + handler.{ts,js} | `HOOK.md` frontmatter + JS handler | 29 events incl. before_agent_reply, llm_input/output, before_tool_call/after_tool_call, session_start/end, agent_end, before_compaction, etc. | ~ HIGH gap — AIWG deploys nothing here despite production-grade event surface | [asmt §4,§6](./openclaw/assessment.md#hook-discovery) |
| Warp | NONE — no documented lifecycle hooks | — | (cloud-only Oz workflows on paid tiers) | ✗ no exploitation | [asmt §4](./warp/assessment.md#4-lifecycle-hooks) |
| Windsurf | NONE — Cascade Hooks (TypeScript) mentioned but not externally exposed | — | — | ✗ no exploitation | [asmt §4](./windsurf/assessment.md#4-lifecycle-hooks) |
| Hermes | Plugin hooks via `register_hook(event, callback)`; shell hooks in `~/.hermes/cli-config.yaml` `hooks:` key | Python plugin or shell command + JSON stdin/stdout | 16 plugin events incl. pre_tool_call, post_tool_call, pre_llm_call, post_llm_call, on_session_start/end, pre_gateway_dispatch; shell subset | ✗ no exploitation | [asmt §4](./hermes/assessment.md#4-lifecycle-hooks) |

#### B.6 Behaviors

| Provider | Discovery path | Format | AIWG status | Citation |
|----------|----------------|--------|-------------|----------|
| Claude Code | NONE — emulated via hooks per capability-matrix.yaml:35 | (hook-emulated) | ~ emulated | [asmt §1](./claude-code/assessment.md#1-repo-state) |
| Codex CLI | NONE | — | ✗ no concept | [asmt no behavior coverage](./codex/assessment.md) |
| Copilot | NONE | — | ✗ no concept | [asmt no behavior coverage](./copilot/assessment.md) |
| Factory | NONE | — | ✗ no concept (closest equiv: SessionStart/Stop hooks per CP3) | [asmt §8 CP3](./factory/assessment.md#8-cross-port-candidates) |
| Cursor | NONE | — | ✗ no concept | [asmt no behavior coverage](./cursor/assessment.md) |
| OpenCode | NONE | — | ✗ no concept | [asmt no behavior coverage](./opencode/assessment.md) |
| OpenClaw | `~/.openclaw/behaviors/` claimed by AIWG docs | AIWG-defined YAML/`BEHAVIOR.md` | ~ HIGH gap — OpenClaw source has NO loader for this path; AIWG-deployed behaviors silently ignored. AIWG documentation calls this "the native format" but it is aspirational. The actual native reactive mechanism is `~/.openclaw/hooks/`. | [asmt §3 behaviors not natively loaded,§6](./openclaw/assessment.md#behaviors--not-natively-loaded-by-openclaw) |
| Warp | NONE | — | ✗ no concept | [asmt no behavior coverage](./warp/assessment.md) |
| Windsurf | NONE — capability matrix marks "emulated" via daemon | — | ✗ emulated only | [asmt §4](./windsurf/assessment.md#4-lifecycle-hooks) |
| Hermes | NONE | — | ✗ no concept | [asmt no behavior coverage](./hermes/assessment.md) |

---

## 3. Reconciliation Notes

This section records contradictions between assessments and the resolution applied during synthesis.

### R1. Hermes scan: `os.walk` vs `rglob`

- **Hermes assessment** (§2.1): primary hot path uses `os.walk(skills_dir, followlinks=True)`; `rglob("SKILL.md")` is used at secondary sites (gateway, optional-skills hub, telemetry). Both unlimited depth.
- **Stored AIWG memory**: previously claimed "Hermes uses `rglob('SKILL.md')`" — substantively correct (unlimited recursion) but technically imprecise on the call.
- **Resolution**: matrix records the primary `os.walk` mechanism; both are unlimited depth so capability-level claim is unchanged.

### R2. Warp recursion vs Hermes recursion

- **Warp assessment** (§2.2): skills are discovered via "recursive upward walk from CWD to repository root" — bounded by repo, not depth-limited.
- **Hermes assessment** (§2.1): skills scanned downward from `~/.hermes/skills/` with no depth limit.
- **Resolution**: both correct — they describe different scan directions (Warp upward to repo root for skill *roots*; Hermes downward inside the skills root). No conflict.

### R3. OpenCode agent discovery — corrected from prior memory

- **OpenCode assessment** (§2.2): file-based agent discovery at `.opencode/{agent,agents}/**/*.md` is HIGH-confidence from `config/agent.ts:110-140`.
- **AIWG source comment** (`platform-paths.ts:54`): claims "Agents are config-only in OpenCode" — STALE.
- **Resolution**: matrix records the source-code-confirmed file-based discovery; comment correction is itself a deployment gap (LOW; cosmetic).

### R4. OpenCode commands — correction

- **OpenCode assessment** (§2.3): `.opencode/{command,commands}/**/*.md` IS scanned with HIGH confidence.
- **AIWG behavior**: `commands: ''` (no deployment).
- **Resolution**: matrix records the gap as HIGH severity (silent loss of all SDLC commands on OpenCode).

### R5. OpenClaw behaviors — claim vs reality

- **OpenClaw assessment** (§3): exhaustive grep of `src/` confirms OpenClaw has NO loader for `~/.openclaw/behaviors/`. The path is purely an AIWG convention.
- **AIWG documentation** (`deployment-registration.ts:380`): describes `~/.openclaw/behaviors/` as "the native format."
- **Resolution**: matrix records this as a HIGH-severity silent-drop gap. AIWG documentation is aspirational, not factual. Behavior runtime effect requires routing through `~/.openclaw/hooks/`.

### R6. Windsurf MCP capability — internal source conflict

- **Windsurf assessment** (§5): `docs/providers/capability-matrix.md` lists Windsurf MCP as `—` (unsupported); but `.aiwg/references/platforms/windsurf.md` and `docs/integrations/windsurf-mcp-sidecar.md` document full MCP support since v1.12.31.
- **Resolution**: this contradiction is internal to AIWG documentation, not between provider sources. Captured in §4 capability gaps as documentation drift.

### R7. Windsurf skills support level — internal source conflict

- **Windsurf assessment** (§6 gap 3): `windsurf-compat.md` says "Skills not supported"; CLAUDE.md says "conventional"; assessment confirms skills are NATIVE since v1.13.6 (Jan 2026), and `windsurf.mjs` deploys correctly.
- **Resolution**: matrix records skills as ✓ for Windsurf; documentation drift logged as gap.

### R8. Codex `~/.codex/prompts/` for commands — stale CLAUDE.md table

- **Codex assessment** (§6 gap 5): the path `~/.codex/prompts/` exists in neither `codex-rs` nor legacy `codex-cli` source.
- **AIWG CLAUDE.md table**: lists `~/.codex/prompts/` as Codex commands path.
- **Resolution**: matrix records "no file-deployable commands on Codex"; CLAUDE.md is stale.

### R9. Recursion depth — provider variance is genuine, not contradictory

Different providers genuinely have different scan-depth limits:

- Codex: `MAX_SCAN_DEPTH = 6`
- Copilot instructions: `MAX_INSTRUCTIONS_RECURSION_DEPTH = 5`
- OpenClaw skills: 2 levels max
- Hermes: unlimited
- Warp: unlimited (upward to repo root)
- Copilot skills, Cursor skills, Factory skills: 1 level (skill subdir)

All correctly recorded per provider; no contradiction.

---

## 4. Capability Gaps — AIWG vs Latest Provider

Sorted by severity. HIGH = silent artifact drop or wrong path. MEDIUM = deprecated path / stale config. LOW = unexploited capability.

| # | Severity | Provider | Artifact | Gap | Source |
|---|:--------:|----------|----------|-----|--------|
| 1 | HIGH | Codex | Skills | AIWG writes `.codex/skills/` (deprecated user path). Repo-scope path is `.agents/skills/`; user is `~/.agents/skills/`. Skills silently invisible in repo scope. Tracked #766. | [codex §6 gap 1](./codex/assessment.md#gap-1-skills-deploy-path-is-wrong-critical--tracked-766) |
| 2 | HIGH | Codex | Agents | AIWG writes `.codex/agents/`; codex-rs has no agent-directory loader. Files silently ignored. | [codex §6 gap 2](./codex/assessment.md#gap-2-codexagents-path-does-not-exist-in-codex-loader-high) |
| 3 | HIGH | Codex | Commands | AIWG writes `.codex/commands/`; slash commands are static built-in enum. Files ignored. | [codex §6 gap 3](./codex/assessment.md#gap-3-codexcommands-path-has-no-loader-in-codex-rs-high) |
| 4 | HIGH | Copilot | Commands | AIWG writes `.github/commands/*.md`. Native path is `.github/prompts/*.prompt.md`. All commands invisible to Copilot. | [copilot §6](./copilot/assessment.md#6-gaps-vs-latest-provider-mechanism) |
| 5 | HIGH | Copilot | Rules | AIWG writes `.github/copilot-rules/*.md`. Native path is `.github/instructions/*.instructions.md`. All rules invisible. | [copilot §6](./copilot/assessment.md#6-gaps-vs-latest-provider-mechanism) |
| 6 | HIGH | OpenCode | Commands | OpenCode scans `.opencode/{command,commands}/**/*.md` (HIGH confidence). AIWG sets `commands: ''` and deploys nothing. SDLC slash commands absent for OpenCode users. | [opencode §6](./opencode/assessment.md#6-gaps-vs-latest-provider-mechanism) |
| 7 | HIGH | OpenCode | Rules | AIWG writes `.opencode/rule/`. OpenCode source has no rule scanner. Rules silently dropped. | [opencode §6](./opencode/assessment.md#6-gaps-vs-latest-provider-mechanism) |
| 8 | HIGH | OpenClaw | Behaviors | OpenClaw source has no loader for `~/.openclaw/behaviors/`. AIWG-deployed behaviors silently ignored at runtime. | [openclaw §3,§6](./openclaw/assessment.md#behaviors--not-natively-loaded-by-openclaw) |
| 9 | HIGH | OpenClaw | Hooks | OpenClaw production-grade hook system with 29 events at `~/.openclaw/hooks/`. AIWG deploys nothing here. Primary native reactive mechanism unused. | [openclaw §6](./openclaw/assessment.md#6-gaps-vs-latest-provider-mechanism) |
| 10 | HIGH | Claude Code | Hooks | aiwg-hooks addon `autoInstall: false`; SDLC framework hooks not deployed to `.claude/settings.json`. Native enforcement layer unused. | [claude-code §6 gap A](./claude-code/assessment.md#gap-a-hook-system-not-auto-wired) |
| 11 | HIGH | Cursor | Rules | AIWG deploys `.mdc` files but does not differentiate the 4 activation modes (alwaysApply/auto/glob/manual). All rules collapse to a single bucket — context bloat or missed activation. | [cursor §6 gap 1](./cursor/assessment.md#gap-1-rule-activation-mode-not-systematically-set) |
| 12 | MEDIUM | Claude Code | Commands | `.claude/commands/` empty (0 files); flows deployed as skills, missing slash-command tab-completion path. | [claude-code §6 gap B](./claude-code/assessment.md#gap-b-slash-commands-directory-is-empty) |
| 13 | MEDIUM | Claude Code | Rules | Only `RULES-INDEX.md` deployed; individual rule files (15 in aiwg-utils) never copied to `.claude/rules/`. Native rules-loading bypassed. | [claude-code §6 gap C](./claude-code/assessment.md#gap-c-individual-rule-files-not-deployed) |
| 14 | MEDIUM | Codex | Rules | AIWG writes `.codex/rules/`; ignored. Should funnel into AGENTS.md or `~/.codex/config.toml instructions`. | [codex §6 gap 4](./codex/assessment.md#gap-4-codexrules-path-has-no-loader-in-codex-rs-medium) |
| 15 | MEDIUM | Copilot | Agents | AIWG deploys plain `.md`; canonical extension is `.agent.md` (enables editor tooling). | [copilot §6](./copilot/assessment.md#6-gaps-vs-latest-provider-mechanism) |
| 16 | MEDIUM | Copilot | Hooks | First-class `.github/hooks/*.json` system with 8 events; AIWG has no hook deployment. | [copilot §6](./copilot/assessment.md#6-gaps-vs-latest-provider-mechanism) |
| 17 | MEDIUM | Factory | Rules | AIWG does not generate AGENTS.md or droid-system-prompt rules content for Factory; rule content not surfaced (gap G1, G8). | [factory §6 G1,G8](./factory/assessment.md#6-gaps-vs-latest-provider-mechanism) |
| 18 | MEDIUM | Factory | Hooks | 9 native events; AIWG hooks use `$CLAUDE_PROJECT_DIR`; Factory needs `$FACTORY_PROJECT_DIR` (gap G4). | [factory §6 G4](./factory/assessment.md#6-gaps-vs-latest-provider-mechanism) |
| 19 | MEDIUM | Factory | Tool names | Tool ID translation unconfirmed; Factory uses `Execute` (not `Bash`), `FetchUrl` (not `WebFetch`), no `Write` (gap G3). | [factory §6 G3](./factory/assessment.md#6-gaps-vs-latest-provider-mechanism) |
| 20 | MEDIUM | OpenCode | Agents | Stale comment in `platform-paths.ts:54` claims "config-only" — misleads maintainers (deployment path is correct). | [opencode §5,§6](./opencode/assessment.md#5-current-aiwg-deployment-behavior) |
| 21 | MEDIUM | OpenClaw | Commands | `~/.openclaw/commands/` not natively scanned; AIWG writes; ignored. | [openclaw §6](./openclaw/assessment.md#6-gaps-vs-latest-provider-mechanism) |
| 22 | MEDIUM | OpenClaw | Rules | `~/.openclaw/rules/` not natively read; equivalent is SOUL.md/AGENTS.md/TOOLS.md. | [openclaw §6](./openclaw/assessment.md#6-gaps-vs-latest-provider-mechanism) |
| 23 | MEDIUM | Windsurf | Rules | All rules deployed `trigger: always_on`; `model_decision`/`glob`/`manual` modes unused. ~3,500 token overhead per message. | [windsurf §6 gap 1,5](./windsurf/assessment.md#gap-1-rules-trigger-modes-not-fully-exploited) |
| 24 | MEDIUM | Hermes | Agents | `.hermes.md` is priority-1 context (git-root traversal); AIWG aggregates only into `AGENTS.md` (priority 2, CWD-only). | [hermes §6 gap 1](./hermes/assessment.md#gap-1--hermesmd-not-exploited-high-impact) |
| 25 | MEDIUM | Cursor | Cloud Agent env | `templates/cursor/environment.json.aiwg-template` exists but not wired into deploy; blocks Cloud Agent VM workflows. | [cursor §6 gap 4](./cursor/assessment.md#gap-4-cloud-agent-environmentjson-not-provisioned) |
| 26 | MEDIUM | Codex | Skills metadata | `metadata.short-description` and `agents/openai.yaml` sidecar not generated; UI metadata missing in skill picker. | [codex §6 gap 7](./codex/assessment.md#gap-7-metadatashort-description-not-populated-by-aiwg-low) |
| 27 | LOW | Claude Code | Plugin marketplace | `.claude-plugin/marketplace.json` version 2026.4.0 lags codebase 2026.5.0-rc.7. | [claude-code §6 gap D](./claude-code/assessment.md#gap-d-plugin-marketplace-not-integrated-with-aiwg-use) |
| 28 | LOW | Claude Code | User-global scope | `~/.claude/agents`, `~/.claude/skills/` etc. supported; AIWG deploys project-only. | [claude-code §6 gap E](./claude-code/assessment.md#gap-e-user-global-scope-not-exploited) |
| 29 | LOW | Codex | AGENTS.md size | 32 KB cap not enforced/warned by AIWG; large files silently truncated. | [codex §6 gap 6](./codex/assessment.md#gap-6-agentsmd-size-limit-not-enforced-by-aiwg-low) |
| 30 | LOW | Copilot | applyTo glob | Rules deployed without `applyTo` frontmatter; always attached, no filtering. | [copilot §7.1](./copilot/assessment.md#71-applyto-glob-filtering-on-instructions) |
| 31 | LOW | Copilot | User-global | `~/.copilot/agents/skills/instructions/` supported; AIWG deploys project-only. | [copilot §6](./copilot/assessment.md#6-gaps-vs-latest-provider-mechanism) |
| 32 | LOW | Cursor | worktrees.json | `templates/cursor/worktrees.json.aiwg-template` exists but not deployed; parallel agent capability not exploited. | [cursor §7.2](./cursor/assessment.md#72-worktrees-for-parallel-agent-execution-20) |
| 33 | LOW | Cursor | AGENTS.md default | AGENTS.md generation opt-in via `--create-agents-md`; should be default for Cloud Agents. | [cursor §6 gap 3](./cursor/assessment.md#gap-3-agentsmd-not-generated-by-default) |
| 34 | LOW | Cursor | .cursorrules deprecation | Generates deprecated file alongside `.cursor/rules/`; precedence undocumented. | [cursor §6 gap 6](./cursor/assessment.md#gap-6-cursorrules-vs-cursorrules-precedence-undocumented) |
| 35 | LOW | OpenCode | Mode agents | `.opencode/{mode,modes}/*.md` (1-level, primary mode) unused. | [opencode §6,§7.2](./opencode/assessment.md#72-mode-agents-at-opencodemodemd) |
| 36 | LOW | OpenClaw | Project-local | `project-local-remove.ts:160` and `project-local-doctor.ts:82` mark openclaw `null` — project-local bundles skipped. | [openclaw §6](./openclaw/assessment.md#6-gaps-vs-latest-provider-mechanism) |
| 37 | LOW | OpenClaw | Skill namespacing | 2-level recursion enables `~/.openclaw/skills/aiwg/<name>/`; AIWG uses flat layout. | [openclaw §6](./openclaw/assessment.md#6-gaps-vs-latest-provider-mechanism) |
| 38 | LOW | Warp | AGENTS.md naming | `AGENTS.md` is preferred name; AIWG aggregates to `WARP.md` only. | [warp §6 gap 1](./warp/assessment.md#gap-1--warpmd-vs-agentsmd-naming-low-severity) |
| 39 | LOW | Warp | Skill description discipline | oz-skills two-sentence canonical pattern not validated by AIWG. | [warp §6 gap 2](./warp/assessment.md#gap-2--oz-skills-two-sentence-description-convention-not-enforced-medium-severity) |
| 40 | LOW | Warp | User-global | `~/.agents/skills/` and `~/.warp/skills/` supported; AIWG deploys project-only. | [warp §6 gap 3](./warp/assessment.md#gap-3--no-agentsskills-deployment-at-user-global-scope-low-severity) |
| 41 | LOW | Windsurf | Capability matrix MCP | `docs/providers/capability-matrix.md` shows MCP `—` — stale; full MCP support exists since v1.12.31. | [windsurf §6 gap 2](./windsurf/assessment.md#gap-2-capability-matrix-incorrect-for-mcp) |
| 42 | LOW | Windsurf | Global paths | `~/.codeium/windsurf/skills/`, `global_workflows/`, `memories/global_rules.md` supported; AIWG project-only. | [windsurf §6 gap 4](./windsurf/assessment.md#gap-4-global-paths-not-deployed) |
| 43 | LOW | Windsurf | windsurf-compat staleness | `windsurf-compat.md` says "Skills not supported" — stale since v1.13.6 (Jan 2026). | [windsurf §6 gap 3](./windsurf/assessment.md#gap-3-skills-support-level-in-capability-matrix--claudemd) |
| 44 | LOW | Hermes | platform-paths comment | Comment "Served via MCP" inaccurate; commands are static Python registry. | [hermes §6 gap 7](./hermes/assessment.md#gap-7--comment-inaccuracy-in-platform-pathsts25-low-correctness) |
| 45 | LOW | Hermes | ${HERMES_SKILL_DIR} | Template var not used in AIWG skills; supporting-file refs need hardcoded paths. | [hermes §6 gap 3](./hermes/assessment.md#gap-3--template-variable-hermes_skill_dir-not-used-in-aiwg-skills-medium-impact) |
| 46 | LOW | Hermes | metadata.hermes.config | Auto-injection of skill-declared config not used. | [hermes §6 gap 4](./hermes/assessment.md#gap-4--metadatahermesconfig-injection-not-used-medium-impact) |
| 47 | LOW | Hermes | platforms gating | `platforms: [macos\|linux\|windows]` not applied to OS-specific skills. | [hermes §7.3](./hermes/assessment.md#73-platform-gated-skill-deployment) |
| 48 | LOW | Codex | AGENTS.override.md | Overlay path not exploited (machine-generated overlay). | [codex §7.6](./codex/assessment.md#76-agentsoverridemd) |
| 49 | LOW | Cursor | Plugin marketplace | `.cursor-plugin/plugin.json` prototype unconfirmed against unpublished schema. | [cursor §6 gap 5](./cursor/assessment.md#gap-5-plugin-marketplace--manifest-format-unconfirmed) |

---

## 5. Cross-Port Candidates

Capabilities present in 1-2 providers that should be evaluated for mirroring to others.

| # | Source provider(s) | Capability | Target provider(s) | Mechanism | Risk |
|---|--------------------|------------|--------------------|-----------|------|
| CP1 | Codex, OpenClaw, Warp, Copilot | `.agents/skills/` cross-platform skill convention (4 providers natively scan it; OpenCode also via walk-up) | All providers using SKILL.md format | Make `.agents/skills/` a default secondary deploy path; one write covers Codex+OpenClaw+Warp+Copilot+OpenCode | LOW — additive, doesn't replace provider-specific paths |
| CP2 | Claude Code | `additionalContext` PreToolUse hooks (just-in-time context) | Cursor (path-scoped rules), Copilot (`.github/hooks/`) | Path-scoped/conditional context injection per provider's hook system | MEDIUM — translation per-provider; hook semantics differ |
| CP3 | Claude Code | 10-minute hook timeout (test/scan/build in hook) | All providers with native hook support (Codex 6 events, Copilot 8, Factory 9, Hermes 16, OpenClaw 29) | Per-provider hook deployer translating AIWG quality-gate hooks | HIGH — env-var differences (`$CLAUDE_PROJECT_DIR` vs `$FACTORY_PROJECT_DIR`), stdin schemas vary |
| CP4 | Cursor | `.mdc` 4-mode rule activation (alwaysApply/auto/glob/manual) | Windsurf (already has 4 trigger modes parallel), Copilot (`applyTo` glob) | Add activation-mode metadata to AIWG rule source; emit per-provider | LOW — Windsurf already supports it; Copilot has `applyTo` |
| CP5 | OpenClaw | Hook bridge — generate `HOOK.md` + handler from AIWG behavior YAML | Other providers with hook systems where behaviors should run (Claude Code, Codex, Factory, Hermes, Copilot) | Translation layer: behavior YAML → provider-specific hook config | MEDIUM — schema translation per-provider; behavior runtime semantics need normalization |
| CP6 | Hermes | Unlimited-depth `os.walk` with explicit excluded dirs (`.git .github .hub .archive`) and `followlinks=True` | Claude Code skill scanning | AIWG documentation guidance for Claude skill organization | LOW — already happens implicitly in Claude Code |
| CP7 | Hermes | `.hermes.md` git-root traversal pattern (priority-1 context) | Codex (already has `AGENTS.override.md` overlay), Cursor (AGENTS.md), Windsurf (AGENTS.md) | Provider-specific high-priority context file | LOW — additive |
| CP8 | Hermes | `${HERMES_SKILL_DIR}` template variable for self-relative refs | OpenCode (skill bodies), Warp (oz-skills `references/` pattern), Claude Code | Document and tooling-emit per provider | LOW |
| CP9 | Copilot | `applyTo` glob filtering on instructions (5-level recursion supported) | Cursor (`globs` already supported), Windsurf (`glob` trigger) | AIWG rule schema: add `applyTo` field; emit to provider-specific frontmatter | LOW — Cursor and Windsurf already support |
| CP10 | Factory | `disable-model-invocation` skill flag | OpenClaw (already supports), Copilot (already supports), Windsurf (TBD) | Pass-through to provider frontmatter | LOW |
| CP11 | OpenCode | `.opencode/{mode,modes}/*.md` for primary-mode agents | Other providers with mode/profile concepts | Generate mode files for SDLC role agents | LOW — only OpenCode has the concept |
| CP12 | Warp/oz-skills | Two-sentence `description` discipline (sentence 1 imperative + sentence 2 "Use when...") | All providers using SKILL.md (skill auto-activation matchers benefit) | Lint rule in `aiwg validate-metadata` | LOW |
| CP13 | Warp/oz-skills | `references/` subdirectory for supporting docs (lazy-loaded) | All SKILL.md providers (Claude, Codex, OpenCode, OpenClaw, Hermes, Cursor, Windsurf, Copilot, Factory) | Refactor large AIWG skills (security-review, architecture-evolution) | LOW |
| CP14 | Codex | `agents/openai.yaml` UI sidecar (display name, icon, brand color, default prompt) | None — Codex-specific | Generate during Codex deploy only | N/A |
| CP15 | Hermes | `metadata.hermes.config` skill-declared config injection | Other providers' skill systems if equivalent emerges | Hermes-specific for now | N/A |
| CP16 | Claude Code | `tools` field for per-agent tool restriction | OpenCode (config), Factory (droids already use this), Copilot (agents) | Already partially deployed; add validation | LOW |
| CP17 | Cursor | `worktrees.json` parallel-agent isolation (8 agents) | Factory (Missions equivalent) | Wire `templates/cursor/worktrees.json.aiwg-template` into deploy | LOW — template exists |

---

## 6. Unique-to-One Capabilities

Capabilities present in only one provider — for documentation, not cross-port.

| Capability | Provider | Notes |
|-----------|----------|-------|
| Native `behaviors/` directory concept (AIWG-defined, OpenClaw-targeted but not loaded) | OpenClaw (target) | AIWG convention only; OpenClaw source has no loader. Document as AIWG-internal abstraction, not provider-native. |
| `${HERMES_SKILL_DIR}` / `${HERMES_SESSION_ID}` template variables | Hermes | Skill content preprocessing for self-relative paths. |
| `metadata.hermes.config` automatic skill-config injection | Hermes | Skill declares config keys; Hermes prompts user during setup; injected at load. |
| `reasoningEffort: low\|medium\|high` per-droid | Factory | Maps cleanly to AIWG quality tiers. |
| Executable commands via shebang line | Factory | Commands can be shell scripts, not just Markdown prompts. |
| `.factory-plugin/plugin.json` plugin format with `${DROID_PLUGIN_ROOT}` | Factory | Self-contained hook scripts with no path assumptions. |
| `policy.allow_implicit_invocation` skill gating | Codex | Prevents model from auto-selecting skill (explicit-only). |
| `policy.products` product-tier gating | Codex | Enterprise-tier-only skill visibility. |
| `agents/openai.yaml` rich UI sidecar (icon, brand_color, default_prompt) | Codex | Codex skill picker UI metadata. |
| `MAX_SCAN_DEPTH = 6`, `MAX_SKILLS_DIRS_PER_ROOT = 2000` hard limits | Codex | Truncation warning emitted via `tracing::warn`. |
| `disable-model-invocation` skill flag | Multiple (Copilot, Factory, OpenClaw) | Adopted by several providers; not unique anymore — but worth noting AIWG should emit it. |
| Cloud Agent automations (Slack/GitHub/Linear/PagerDuty/webhook triggers) | Cursor | UI-driven; closest cross-platform analog is GitHub Actions integration. |
| `.cursor/worktrees.json` 8-agent Git worktree parallelism | Cursor | Template exists in AIWG; not deployed. |
| Cursor Memories (Beta) per-project agent memory | Cursor | UI-managed; AIWG can guide priming but not write programmatically. |
| 4 trigger modes for rules (`always_on`, `model_decision`, `glob`, `manual`) | Windsurf | Cursor has parallel 4 modes; counts as paired feature, not unique. |
| `MAX_INSTRUCTIONS_RECURSION_DEPTH = 5` for instructions | Copilot/VS Code | Subdirectory recursion explicit limit. |
| `.github/hooks/*.json` with PascalCase/camelCase auto-detection via `version` field | Copilot/VS Code | Hook schema auto-detect between VS Code and Copilot CLI formats. |
| `target` frontmatter field (`vscode`/`github-copilot`/`claude`) | Copilot/VS Code | Cross-platform artifact scoping. |
| Inline `hooks:` YAML in `.agent.md` frontmatter | Copilot/VS Code | Per-agent embedded lifecycle hooks. |
| `15,000 char skill description budget` + 5,000 char overflow names | Copilot/VS Code | Hard context budget for auto-injected skill descriptions. |
| Plugin namespace `plugin-name:skill-name` addressing | Claude Code | Unique to plugin marketplace model. |
| 10-minute hook timeout (v2.1.3+) | Claude Code | Quality gates for full test/scan/build in pre-commit hook. |
| `additionalContext` hook handler type (v2.1.9+) | Claude Code | Just-in-time context injection without bloating CLAUDE.md. |
| 6-tier skill discovery stack (extra/bundled/managed/personal-agents/project-agents/workspace) | OpenClaw | Most-tiered discovery model. |
| 29 lifecycle event types | OpenClaw | Largest hook event surface among assessed providers. |
| 16 plugin-hook events + shell-hook subset | Hermes | Plugin (Python) and shell (config.yaml) hook integration patterns. |
| 4-pass skill discovery (cross-platform external + project walk-up + config dirs + URL-fetched) | OpenCode | Including remote `index.json` fetch via `skills.urls`. |
| `OPENCODE_DISABLE_CLAUDE_CODE_SKILLS` env-var opt-out | OpenCode | Cross-provider skill ingestion is opt-out, not opt-in. |
| Progressive disclosure (only `name` + `description` in default context) | Warp, Windsurf, Cursor (skills) | Now standard across modern providers; document as expected behavior. |

---

*Capability matrix produced for issue #1100 — synthesizes 10 per-provider assessments produced 2026-05-05. Do not modify directly; regenerate by re-running the synthesis pass.*
