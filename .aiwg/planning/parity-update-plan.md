# Cross-Provider Parity Update — Prioritized Plan

**Status**: PROPOSED — pending reviewer signoff
**Created**: 2026-05-05
**Owner**: roctinam
**Tracking epic**: #1089
**Tracking issue**: #1101

## Goal

Bring AIWG's 10 supported provider deployments into demonstrable parity with each provider's latest discovery mechanisms, eliminating silent artifact drops, deprecated paths, and unexploited high-leverage capabilities. This plan converts the 49 capability gaps and 17 cross-port candidates documented in the master capability matrix into a prioritized, source-cited backlog of implementable work units (PUWs), grouped into shippable waves with explicit risk and rollback strategy for each.

## Inputs consulted

- Master synthesis: [`.aiwg/research/parity/capability-matrix.md`](../research/parity/capability-matrix.md) — 49 gaps + 17 cross-port candidates + 10×6 status grid
- Per-provider assessments (10):
  - [Claude Code](../research/parity/claude-code/assessment.md) (#1090)
  - [Codex CLI](../research/parity/codex/assessment.md) (#1091)
  - [GitHub Copilot](../research/parity/copilot/assessment.md) (#1092)
  - [Factory AI](../research/parity/factory/assessment.md) (#1093)
  - [Cursor](../research/parity/cursor/assessment.md) (#1094)
  - [OpenCode](../research/parity/opencode/assessment.md) (#1095)
  - [OpenClaw](../research/parity/openclaw/assessment.md) (#1096)
  - [Warp](../research/parity/warp/assessment.md) (#1097)
  - [Windsurf](../research/parity/windsurf/assessment.md) (#1098)
  - [Hermes](../research/parity/hermes/assessment.md) (#1099)
- Original draft (preserved): [`parity-update-plan-DRAFT.md`](./parity-update-plan-DRAFT.md)

**Effort convention** (per `no-time-estimates` rule): each PUW row reports effort as `S<n>/A<n>/P<level>` where:
- `S<n>` = scope count (atomic deliverables: file edits, schema additions, tests)
- `A<n>` = agent count (distinct roles: implementer, reviewer, etc.)
- `P<level>` = parallelism (`serial` / `pair` / `fan-N`)

---

## 2. Prioritized work items (PUWs)

### P0 — silent-drop fixes (must ship first; users currently lose artifacts)

| ID | Type | Title | Source citations | Affected providers | Effort | Priority | Risk + rollback |
|----|------|-------|------------------|--------------------|--------|----------|-----------------|
| PUW-001 | port | Codex skills: write to `.agents/skills/` (repo) and `~/.agents/skills/` (user) instead of `.codex/skills/` | [matrix gap #1](../research/parity/capability-matrix.md#4-capability-gaps--aiwg-vs-latest-provider), [codex/assessment.md §6 gap 1](../research/parity/codex/assessment.md#gap-1-skills-deploy-path-is-wrong-critical--tracked-766) | Codex | S4/A2/serial | P0 | LOW. Re-confirms #766. Rollback = revert path map; old `.codex/skills/` files remain harmless. |
| PUW-002 | deprecate | Codex agents: stop writing `.codex/agents/`; route role context into `AGENTS.md` | [matrix gap #2](../research/parity/capability-matrix.md#4-capability-gaps--aiwg-vs-latest-provider), [codex/assessment.md §6 gap 2](../research/parity/codex/assessment.md#gap-2-codexagents-path-does-not-exist-in-codex-loader-high) | Codex | S3/A1/serial | P0 | LOW. Path is silently ignored today; removal is no-op for users. Rollback = restore writer. |
| PUW-003 | deprecate | Codex commands: stop writing `.codex/commands/`; document static built-in enum in `platform-paths.ts` | [matrix gap #3](../research/parity/capability-matrix.md#4-capability-gaps--aiwg-vs-latest-provider), [codex/assessment.md §6 gap 3](../research/parity/codex/assessment.md#gap-3-codexcommands-path-has-no-loader-in-codex-rs-high) | Codex | S2/A1/serial | P0 | LOW. Already a dead path. Update CLAUDE.md table simultaneously (per R8). |
| PUW-004 | port | Copilot commands: write `.github/prompts/*.prompt.md` instead of `.github/commands/*.md` | [matrix gap #4](../research/parity/capability-matrix.md#4-capability-gaps--aiwg-vs-latest-provider), [copilot/assessment.md §6](../research/parity/copilot/assessment.md#6-gaps-vs-latest-provider-mechanism) | Copilot | S5/A2/serial | P0 | LOW. Filename suffix change + extension. Rollback = revert path map. Validate via Copilot extension snapshot. |
| PUW-005 | port | Copilot rules: write `.github/instructions/*.instructions.md` (with `applyTo` frontmatter scaffolding) instead of `.github/copilot-rules/*.md` | [matrix gap #5](../research/parity/capability-matrix.md#4-capability-gaps--aiwg-vs-latest-provider), [copilot/assessment.md §6](../research/parity/copilot/assessment.md#6-gaps-vs-latest-provider-mechanism), [copilot/assessment.md §7.1](../research/parity/copilot/assessment.md#71-applyto-glob-filtering-on-instructions) | Copilot | S6/A2/serial | P0 | LOW. Adds `applyTo: "**"` default to preserve current behavior. Rollback = revert path. |
| PUW-006 | port | OpenCode commands: stop emitting `commands: ''`; deploy SDLC commands to `.opencode/command/**/*.md` with `template`-body schema | [matrix gap #6](../research/parity/capability-matrix.md#4-capability-gaps--aiwg-vs-latest-provider), [opencode/assessment.md §2.3](../research/parity/opencode/assessment.md#23-commands--file-based-confirmed--prior-memory-was-partially-incorrect) | OpenCode | S6/A2/serial | P0 | LOW. Additive — restores absent functionality. Rollback = revert deploy registration. |
| PUW-007 | deprecate | OpenCode rules: stop writing `.opencode/rule/`; route rules into AGENTS.md aggregation | [matrix gap #7](../research/parity/capability-matrix.md#4-capability-gaps--aiwg-vs-latest-provider), [opencode/assessment.md §2.4](../research/parity/opencode/assessment.md#24-rules--no-file-based-discovery-confirmed) | OpenCode | S3/A1/serial | P0 | LOW. Dead-path removal + AGENTS.md aggregator wiring. |
| PUW-008 | port | OpenClaw behaviors: route AIWG behavior YAML through `~/.openclaw/hooks/<name>/HOOK.md` translator instead of dead `~/.openclaw/behaviors/` path | [matrix gap #8](../research/parity/capability-matrix.md#4-capability-gaps--aiwg-vs-latest-provider), [openclaw/assessment.md §3](../research/parity/openclaw/assessment.md#behaviors--not-natively-loaded-by-openclaw), matrix R5 reconciliation | OpenClaw | S10/A3/pair | P0 | MEDIUM. Behavior→hook translation is new code (handler.ts emit). Rollback = restore behavior writer; users lose nothing because target was already dead. |
| PUW-009 | expand | OpenClaw hooks: deploy AIWG hook bundle to `~/.openclaw/hooks/<name>/HOOK.md` + handler (29-event surface) | [matrix gap #9](../research/parity/capability-matrix.md#4-capability-gaps--aiwg-vs-latest-provider), [openclaw/assessment.md §4](../research/parity/openclaw/assessment.md#hook-discovery) | OpenClaw | S8/A2/pair | P0 | MEDIUM. Couples to PUW-008. New deploy registration + 29-event mapping table. Rollback = remove hook deployer. |
| PUW-010 | expand | Claude Code hooks: flip `aiwg-hooks` addon `autoInstall: true` and wire SDLC quality-gate hooks to `.claude/settings.json` | [matrix gap #10](../research/parity/capability-matrix.md#4-capability-gaps--aiwg-vs-latest-provider), [claude-code/assessment.md §6 gap A](../research/parity/claude-code/assessment.md#gap-a-hook-system-not-auto-wired) | Claude Code | S4/A2/serial | P0 | MEDIUM. Settings.json merge is invasive. Provide `--no-hooks` opt-out + dry-run preview. Rollback = `aiwg refresh` restores prior settings.json from backup. |
| PUW-011 | expand | Cursor rules: classify each rule with one of 4 activation modes (`alwaysApply`/`auto`/`glob`/`manual`) and emit MDC frontmatter accordingly | [matrix gap #11](../research/parity/capability-matrix.md#4-capability-gaps--aiwg-vs-latest-provider), [cursor/assessment.md §6 gap 1](../research/parity/cursor/assessment.md#gap-1-rule-activation-mode-not-systematically-set), [matrix CP4](../research/parity/capability-matrix.md#5-cross-port-candidates) | Cursor, Windsurf (paired) | S12/A3/fan-3 | P0 | **MODERATE evidence** (Cursor closed-source, vendor-doc taxonomy). Schema addition with safe default (`alwaysApply: true` preserves status quo). Wave 2 gate must include live-Cursor smoke test before non-`alwaysApply` modes ship. Rollback = drop activation field, all rules collapse to default. |

### P1 — high-leverage cross-port + missing primary mechanisms

| ID | Type | Title | Source citations | Affected providers | Effort | Priority | Risk + rollback |
|----|------|-------|------------------|--------------------|--------|----------|-----------------|
| PUW-012 | expand | Add `.agents/skills/` as universal secondary deploy path (one write covers Codex, OpenClaw, Warp, Copilot, OpenCode walk-up) | [matrix CP1](../research/parity/capability-matrix.md#5-cross-port-candidates), [warp/assessment.md §2.2](../research/parity/warp/assessment.md#22-skills), [copilot/assessment.md §2.1](../research/parity/copilot/assessment.md#21-skills) | Codex, OpenClaw, Warp, Copilot, OpenCode | S5/A2/serial | P1 | LOW. Additive write; doesn't replace provider-specific paths. Doubles disk usage for skills (~few MB). |
| PUW-013 | expand | Generate `AGENTS.md` by default for every provider that uses it (Codex, Cursor, Windsurf, Hermes, Warp, Factory, OpenCode); drop `--create-agents-md` opt-in for these | [matrix gap #33](../research/parity/capability-matrix.md#4-capability-gaps--aiwg-vs-latest-provider), [matrix CP7](../research/parity/capability-matrix.md#5-cross-port-candidates), [cursor/assessment.md §6 gap 3](../research/parity/cursor/assessment.md#gap-3-agentsmd-not-generated-by-default), [hermes/assessment.md §6 gap 1](../research/parity/hermes/assessment.md#gap-1--hermesmd-not-exploited-high-impact) | 7 providers | S8/A2/serial | P1 | LOW. Existing aggregator code path; flip default. Add `--no-agents-md` opt-out. |
| PUW-014 | expand | Hermes: emit `.hermes.md` (priority-1, git-root traversal) in addition to AGENTS.md | [matrix gap #24](../research/parity/capability-matrix.md#4-capability-gaps--aiwg-vs-latest-provider), [hermes/assessment.md §6 gap 1](../research/parity/hermes/assessment.md#gap-1--hermesmd-not-exploited-high-impact) | Hermes | S3/A1/serial | P1 | LOW. Additive. Same content as AGENTS.md until divergence needed. |
| PUW-015 | expand | Claude Code commands: deploy SDLC flows as slash commands at `.claude/commands/*.md` (currently 0 deployed) | [matrix gap #12](../research/parity/capability-matrix.md#4-capability-gaps--aiwg-vs-latest-provider), [claude-code/assessment.md §6 gap B](../research/parity/claude-code/assessment.md#gap-b-slash-commands-directory-is-empty) | Claude Code | S6/A2/serial | P1 | LOW. Restores tab-completion path users expect. Rollback = remove deployer. |
| PUW-016 | expand | Claude Code rules: deploy individual rule files (15 from aiwg-utils) to `.claude/rules/*.md` alongside RULES-INDEX.md | [matrix gap #13](../research/parity/capability-matrix.md#4-capability-gaps--aiwg-vs-latest-provider), [claude-code/assessment.md §6 gap C](../research/parity/claude-code/assessment.md#gap-c-individual-rule-files-not-deployed) | Claude Code | S4/A1/serial | P1 | LOW. Index already references files; just deploy them. |
| PUW-017 | expand | Copilot agents: emit `.agent.md` extension (canonical) instead of plain `.md`; preserve discovery via dual extension during deprecation window | [matrix gap #15](../research/parity/capability-matrix.md#4-capability-gaps--aiwg-vs-latest-provider), [copilot/assessment.md §2.4](../research/parity/copilot/assessment.md#24-agents) | Copilot | S5/A2/serial | P1 | LOW. Canonical extension enables editor tooling (frontmatter validation). |
| PUW-018 | port | Cross-provider hook bridge: translate AIWG quality-gate hooks per-provider for Codex (TOML), Copilot (JSON, dual-format), Factory (`$FACTORY_PROJECT_DIR`), Hermes (Python plugin or shell config) | [matrix CP3](../research/parity/capability-matrix.md#5-cross-port-candidates), [matrix gap #16](../research/parity/capability-matrix.md#4-capability-gaps--aiwg-vs-latest-provider), [matrix gap #18](../research/parity/capability-matrix.md#4-capability-gaps--aiwg-vs-latest-provider), [factory/assessment.md §6 G4](../research/parity/factory/assessment.md#6-gaps-vs-latest-provider-mechanism) | Codex, Copilot, Factory, Hermes | S20/A4/fan-4 | P1 | HIGH. Env-var differences (`$CLAUDE_PROJECT_DIR` vs `$FACTORY_PROJECT_DIR`), stdin schema variance, exit-code semantics differ. Stage behind feature flag (`--enable-cross-provider-hooks`). Rollback per provider. |
| PUW-019 | expand | Cursor: wire `templates/cursor/environment.json.aiwg-template` and `worktrees.json.aiwg-template` into deploy pipeline | [matrix gap #25](../research/parity/capability-matrix.md#4-capability-gaps--aiwg-vs-latest-provider), [matrix gap #32](../research/parity/capability-matrix.md#4-capability-gaps--aiwg-vs-latest-provider), [matrix CP17](../research/parity/capability-matrix.md#5-cross-port-candidates), [cursor/assessment.md §6 gap 4](../research/parity/cursor/assessment.md#gap-4-cloud-agent-environmentjson-not-provisioned), [cursor/assessment.md §7.2](../research/parity/cursor/assessment.md#72-worktrees-for-parallel-agent-execution-20) | Cursor | S5/A2/pair | P1 | LOW. Templates exist, just need registration in `cursor.mjs` deployer. |
| PUW-020 | expand | Windsurf rules: classify with 4 trigger modes (`always_on`/`model_decision`/`glob`/`manual`); reuse activation classification from PUW-011 | [matrix gap #23](../research/parity/capability-matrix.md#4-capability-gaps--aiwg-vs-latest-provider), [windsurf/assessment.md §6 gap 1](../research/parity/windsurf/assessment.md#gap-1-rules-trigger-modes-not-fully-exploited) | Windsurf | S6/A2/serial | P1 | LOW. Estimated context-overhead reduction (magnitude unconfirmed — measure in Wave 2 gate). Couples to PUW-011 schema. |
| PUW-021 | expand | Add `applyTo` glob field to AIWG rule schema; emit per-provider (Copilot `applyTo`, Cursor `globs`, Windsurf `glob` trigger) | [matrix CP9](../research/parity/capability-matrix.md#5-cross-port-candidates), [matrix gap #30](../research/parity/capability-matrix.md#4-capability-gaps--aiwg-vs-latest-provider), [copilot/assessment.md §7.1](../research/parity/copilot/assessment.md#71-applyto-glob-filtering-on-instructions) | Copilot, Cursor, Windsurf | S7/A2/serial | P1 | LOW. Default `applyTo: "**"` preserves status quo. |
| PUW-022 | port | Codex rules: drop `.codex/rules/` writer; funnel rule content into AGENTS.md (or `~/.codex/config.toml instructions` for user-global) | [matrix gap #14](../research/parity/capability-matrix.md#4-capability-gaps--aiwg-vs-latest-provider), [codex/assessment.md §6 gap 4](../research/parity/codex/assessment.md#gap-4-codexrules-path-has-no-loader-in-codex-rs-medium) | Codex | S3/A1/serial | P1 | LOW. Couples to PUW-013 AGENTS.md generation. |
| PUW-023 | expand | Factory rules: aggregate rule content into AGENTS.md for Factory deployments (no native rules dir) | [matrix gap #17](../research/parity/capability-matrix.md#4-capability-gaps--aiwg-vs-latest-provider), [factory/assessment.md §6 G1](../research/parity/factory/assessment.md#6-gaps-vs-latest-provider-mechanism) | Factory | S3/A1/serial | P1 | LOW. Reuses PUW-013 aggregator. |
| PUW-024 | expand | Factory tool-name translation table: map `Bash`→`Execute`, `WebFetch`→`FetchUrl`, drop `Write` (Factory has no native equivalent) | [matrix gap #19](../research/parity/capability-matrix.md#4-capability-gaps--aiwg-vs-latest-provider), [factory/assessment.md §6 G3](../research/parity/factory/assessment.md#6-gaps-vs-latest-provider-mechanism) | Factory | S4/A2/serial | P1 | MEDIUM. Per-droid frontmatter rewrite. Test with droid-validation pass. Rollback = revert translator. |
| PUW-025 | expand | OpenClaw skills: use 2-level namespacing `~/.openclaw/skills/aiwg/<name>/` instead of flat (avoids collision with non-AIWG skills) | [matrix gap #37](../research/parity/capability-matrix.md#4-capability-gaps--aiwg-vs-latest-provider), [openclaw/assessment.md §6](../research/parity/openclaw/assessment.md#6-gaps-vs-latest-provider-mechanism) | OpenClaw | S3/A1/serial | P1 | LOW. Within OpenClaw 2-level recursion limit. |
| PUW-026 | expand | OpenClaw project-local: unblock by removing `null` markers in `project-local-remove.ts:160` and `project-local-doctor.ts:82` | [matrix gap #36](../research/parity/capability-matrix.md#4-capability-gaps--aiwg-vs-latest-provider), [openclaw/assessment.md §6](../research/parity/openclaw/assessment.md#6-gaps-vs-latest-provider-mechanism) | OpenClaw | S2/A1/serial | P1 | LOW. Code-comment removal + path map entry. |
| PUW-027 | expand | User-global deployments: support `~/.<provider>/...` for Claude Code, Copilot, Warp, Windsurf via `--scope user` flag | [matrix gap #28](../research/parity/capability-matrix.md#4-capability-gaps--aiwg-vs-latest-provider), [matrix gap #31](../research/parity/capability-matrix.md#4-capability-gaps--aiwg-vs-latest-provider), [matrix gap #40](../research/parity/capability-matrix.md#4-capability-gaps--aiwg-vs-latest-provider), [matrix gap #42](../research/parity/capability-matrix.md#4-capability-gaps--aiwg-vs-latest-provider) | Claude Code, Copilot, Warp, Windsurf | S10/A3/fan-3 | P1 | MEDIUM. Cross-project scope is invasive (changes user-global state). Require explicit `--scope user`. Rollback = `aiwg remove --scope user`. |

### P2 — quality, polish, documentation drift

| ID | Type | Title | Source citations | Affected providers | Effort | Priority | Risk + rollback |
|----|------|-------|------------------|--------------------|--------|----------|-----------------|
| PUW-028 | expand | Generate `agents/openai.yaml` UI sidecar during Codex skill deploy (display name, icon, brand color, default prompt) | [matrix gap #26](../research/parity/capability-matrix.md#4-capability-gaps--aiwg-vs-latest-provider), [matrix CP14](../research/parity/capability-matrix.md#5-cross-port-candidates), [codex/assessment.md §6 gap 7](../research/parity/codex/assessment.md#gap-7-metadatashort-description-not-populated-by-aiwg-low) | Codex | S4/A2/serial | P2 | LOW. Additive sidecar; absence is graceful. |
| PUW-029 | expand | Codex AGENTS.md size validation: warn at 32KB cap during deploy; auto-split into AGENTS.override.md overflow | [matrix gap #29](../research/parity/capability-matrix.md#4-capability-gaps--aiwg-vs-latest-provider), [matrix gap #48](../research/parity/capability-matrix.md#4-capability-gaps--aiwg-vs-latest-provider), [codex/assessment.md §6 gap 6](../research/parity/codex/assessment.md#gap-6-agentsmd-size-limit-not-enforced-by-aiwg-low) | Codex | S4/A2/serial | P2 | LOW. Validator + overflow file. |
| PUW-030 | expand | Two-sentence skill description discipline (oz-skills pattern) — add lint rule to `aiwg validate-metadata` | [matrix gap #39](../research/parity/capability-matrix.md#4-capability-gaps--aiwg-vs-latest-provider), [matrix CP12](../research/parity/capability-matrix.md#5-cross-port-candidates), [warp/assessment.md §6 gap 2](../research/parity/warp/assessment.md#gap-2--oz-skills-two-sentence-description-convention-not-enforced-medium-severity) | All providers using SKILL.md | S3/A1/serial | P2 | LOW. Lint-only; doesn't block deploy. |
| PUW-031 | expand | Refactor large AIWG skills (security-review, architecture-evolution) to use `references/` subdir lazy-load pattern | [matrix CP13](../research/parity/capability-matrix.md#5-cross-port-candidates) | All SKILL.md providers | S6/A2/serial | P2 | LOW. Skill-internal restructure. |
| PUW-032 | expand | Hermes `${HERMES_SKILL_DIR}` template variable: emit in skill bodies that reference supporting files | [matrix gap #45](../research/parity/capability-matrix.md#4-capability-gaps--aiwg-vs-latest-provider), [matrix CP8](../research/parity/capability-matrix.md#5-cross-port-candidates), [hermes/assessment.md §6 gap 3](../research/parity/hermes/assessment.md#gap-3--template-variable-hermes_skill_dir-not-used-in-aiwg-skills-medium-impact) | Hermes (with cross-provider documentation) | S5/A2/serial | P2 | LOW. Templating layer addition. |
| PUW-033 | expand | Hermes `metadata.hermes.config` skill-config injection: emit when AIWG skill declares config keys | [matrix gap #46](../research/parity/capability-matrix.md#4-capability-gaps--aiwg-vs-latest-provider), [hermes/assessment.md §6 gap 4](../research/parity/hermes/assessment.md#gap-4--metadatahermesconfig-injection-not-used-medium-impact) | Hermes | S3/A1/serial | P2 | LOW. Frontmatter pass-through. |
| PUW-034 | expand | `platforms: [macos\|linux\|windows]` gating for OS-specific skills | [matrix gap #47](../research/parity/capability-matrix.md#4-capability-gaps--aiwg-vs-latest-provider), [hermes/assessment.md §7.3](../research/parity/hermes/assessment.md#73-platform-gated-skill-deployment) | Hermes (likely portable) | S3/A1/serial | P2 | LOW. Schema field. |
| PUW-035 | expand | OpenCode mode agents: generate `.opencode/mode/<role>.md` for SDLC primary roles | [matrix gap #35](../research/parity/capability-matrix.md#4-capability-gaps--aiwg-vs-latest-provider), [matrix CP11](../research/parity/capability-matrix.md#5-cross-port-candidates), [opencode/assessment.md §7.2](../research/parity/opencode/assessment.md#72-mode-agents-at-opencodemodemd) | OpenCode | S5/A2/serial | P2 | LOW. Additive; no regression risk. |
| PUW-036 | expand | Warp dual-name: emit `AGENTS.md` in addition to `WARP.md` (Warp prefers AGENTS.md) | [matrix gap #38](../research/parity/capability-matrix.md#4-capability-gaps--aiwg-vs-latest-provider), [warp/assessment.md §6 gap 1](../research/parity/warp/assessment.md#gap-1--warpmd-vs-agentsmd-naming-low-severity) | Warp | S2/A1/serial | P2 | LOW. Symlink or duplicate write. |
| PUW-037 | expand | Cursor `.cursorrules` deprecation: stop emitting legacy file; document precedence in migration notes | [matrix gap #34](../research/parity/capability-matrix.md#4-capability-gaps--aiwg-vs-latest-provider), [cursor/assessment.md §6 gap 6](../research/parity/cursor/assessment.md#gap-6-cursorrules-vs-cursorrules-precedence-undocumented) | Cursor | S2/A1/serial | P2 | LOW. Deprecation removal. |
| PUW-038 | expand | Claude Code plugin marketplace: bump `.claude-plugin/marketplace.json` version in lockstep with package.json (CI gate) | [matrix gap #27](../research/parity/capability-matrix.md#4-capability-gaps--aiwg-vs-latest-provider), [claude-code/assessment.md §6 gap D](../research/parity/claude-code/assessment.md#gap-d-plugin-marketplace-not-integrated-with-aiwg-use) | Claude Code | S3/A1/serial | P2 | LOW. CI version-sync check. |
| PUW-039 | expand | Documentation drift fixes batch: `windsurf-compat.md` (skills), `docs/providers/capability-matrix.md` (Windsurf MCP), `platform-paths.ts:54` comment (OpenCode), `platform-paths.ts:25` comment (Hermes), CLAUDE.md Codex commands path | [matrix gap #20](../research/parity/capability-matrix.md#4-capability-gaps--aiwg-vs-latest-provider), [matrix gap #41](../research/parity/capability-matrix.md#4-capability-gaps--aiwg-vs-latest-provider), [matrix gap #43](../research/parity/capability-matrix.md#4-capability-gaps--aiwg-vs-latest-provider), [matrix gap #44](../research/parity/capability-matrix.md#4-capability-gaps--aiwg-vs-latest-provider), matrix R6, R7, R8 | All (docs) | S5/A1/serial | P2 | LOW. Documentation-only. Authoritative since matrix synthesis is now the source of truth. |

---

## 3. Implementation phasing

PUWs group into four shippable waves. Each wave is releasable independently with its own changelog entry.

### Wave 1 — Stop the silent drops (PUW-001 through PUW-007 + PUW-022)

**Rationale**: every PUW in this wave addresses a path where AIWG actively writes files the provider does not read. Users currently lose artifacts. These are pure path-correction patches with low risk and no schema change. Ship first because they restore expected behavior with minimal blast radius.

**Order**:
1. PUW-001 (Codex skills) — re-confirms #766
2. PUW-002, PUW-003, PUW-022 (Codex deprecations + AGENTS.md route)
3. PUW-004, PUW-005 (Copilot path corrections)
4. PUW-006, PUW-007 (OpenCode commands + rules)

**Gate**: end-to-end smoke test against each provider's loader (where source available) confirming new paths discovered.

### Wave 2 — Native primary mechanisms (PUW-008 through PUW-017, PUW-020, PUW-021, PUW-023, PUW-024, PUW-026)

**Rationale**: this wave deploys to mechanisms each provider treats as primary but AIWG has neglected — OpenClaw hooks, Claude Code hooks/commands/rules, Cursor activation modes, Windsurf trigger modes, Copilot canonical extensions. Larger schema changes (rule activation, `applyTo` glob) land here so downstream waves can rely on them.

**Order**:
1. PUW-011 + PUW-020 + PUW-021 (rule activation schema — foundation for Cursor + Windsurf + Copilot)
2. PUW-008 + PUW-009 (OpenClaw behavior→hook bridge + hook deployment, paired)
3. PUW-010 (Claude Code hook auto-install)
4. PUW-013 + PUW-014 + PUW-022 + PUW-023 (AGENTS.md aggregation rollout across 7 providers)
5. PUW-015, PUW-016, PUW-017, PUW-024, PUW-026 (per-provider polish)

**Gate**: per-provider deployment test (`aiwg use sdlc --provider <p>`), verify discovery via loader/scan or vendor doc compliance.

### Wave 3 — Cross-port leverage (PUW-012, PUW-018, PUW-019, PUW-025, PUW-027)

**Rationale**: highest-leverage cross-provider capabilities. PUW-012 (`.agents/skills/`) covers 5 providers in one write. PUW-018 (cross-provider hook bridge) is the riskiest item in the plan but unlocks quality-gate enforcement on 4 currently hook-less deployments. PUW-027 (user-global scope) is gated behind explicit operator opt-in.

**Order**:
1. PUW-012 (universal `.agents/skills/`)
2. PUW-019, PUW-025, PUW-026 (Cursor templates + OpenClaw namespacing)
3. PUW-018 (cross-provider hook bridge — staged behind `--enable-cross-provider-hooks` feature flag, one provider at a time: Codex → Copilot → Factory → Hermes)
4. PUW-027 (user-global scope, opt-in)

**Gate**: feature-flag rollout for PUW-018; soak test on dogfood project before flag-default flip.

### Wave 4 — Quality, polish, drift (PUW-028 through PUW-039)

**Rationale**: lints, sidecars, documentation drift, deprecation cleanup. None block users; all reduce maintainer confusion and improve UX in skill pickers, validators, and discovery surfaces.

**Order**: any order; group by provider to minimize context-switch cost. PUW-039 (documentation drift batch) ships last to absorb any text changes implied by Waves 1-3.

**Gate**: `npm run uat` + `aiwg doctor` clean across all 10 providers.

---

## 4. Risk register (rollup)

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|-----------|
| R1 | **Cross-provider hook bridge (PUW-018) regresses on env-var or stdin schema differences** | Medium | High — hooks fire on every tool call; misfire blocks user work | Stage behind `--enable-cross-provider-hooks` feature flag; per-provider rollout (one at a time); mandatory dogfood soak per provider before flag-default flip; provide `aiwg refresh --no-hooks` escape hatch. |
| R2 | **Claude Code hook auto-install (PUW-010) corrupts existing user `.claude/settings.json`** | Low | High — settings.json is shared with user customizations | Atomic merge with backup file (`settings.json.aiwg-backup`); dry-run preview; restore on `aiwg refresh` failure; `--no-hooks` opt-out. |
| R3 | **OpenClaw behavior→hook translation (PUW-008) produces non-functional handlers** | Medium | Medium — current `~/.openclaw/behaviors/` is already dead, so failure mode is "still dead" | Pre-flight handler-syntax validation; emit diagnostic warning if translation incomplete; document known gaps. Worst case: parity with status quo. |
| R4 | **AGENTS.md generation by default (PUW-013) collides with user-edited AGENTS.md** | Medium | Medium — overwrite of user content | Detect existing AGENTS.md; emit `AGENTS.aiwg.md` overlay if user-edited (compare against last-deployed checksum); document merge convention. |
| R5 | **Activation-mode classification (PUW-011) misclassifies rules and breaks rule-set behavior on Cursor/Windsurf** | Medium | Medium — wrong activation = either context bloat or missed enforcement | Default all rules to `alwaysApply`/`always_on` (status quo) unless source rule declares mode in YAML; require explicit per-rule classification before flipping any to `auto`/`glob`/`manual`. |

---

## 5. Reviewer signoff

Both reviewers returned **APPROVE-WITH-CONDITIONS** on 2026-05-05. Full reports:
- `.aiwg/working/parity/reviews/architecture-designer-review.md`
- `.aiwg/working/parity/reviews/technical-researcher-review.md`

### Conditions consolidated (must resolve before implementation issues are filed)

**Blocking (architecture-designer):**
1. Author 4 ADRs before dependent PUWs are filed: (a) AGENTS.md aggregation policy (covers PUW-013, PUW-022, PUW-023, PUW-007, PUW-014, PUW-036); (b) rule activation-mode schema (PUW-011, PUW-020, PUW-021); (c) hook deployment generalization (PUW-010, PUW-018, PUW-008, PUW-009); (d) user-global deploy mode `--scope user` (PUW-027, PUW-001 user path).
2. Amend `adr-universal-provider-deployment.md` §1 path table for Wave 1 corrections.
3. Move `adr-skills-canonical-extension-type.md` from PROPOSED to ACCEPTED before Wave 1.
4. Supersede / amend `adr-behaviors-deployable-artifact.md` and `adr-behaviors-format.md` to reflect PUW-008 routing through hooks rather than dead `~/.openclaw/behaviors/`.
5. Add explicit dependency edges: PUW-013 → PUW-022, PUW-023, PUW-007, PUW-029; PUW-027 → user-global ADR; PUW-017 → PUW-013 (deduplication policy).

**Blocking (technical-researcher):**
6. ✅ Applied: PUW-011 risk cell now flags MODERATE evidence (Cursor closed-source) and requires live-Cursor smoke-test gate.
7. ✅ Applied: PUW-007 missing Priority cell corrected to P0.
8. ✅ Applied: PUW-020's "~3.5K-token" claim hedged to "magnitude unconfirmed — measure in Wave 2 gate."

**Advisory (incorporated by reference; address during implementation issue authoring):**
- Add per-PUW evidence-level column (HIGH/MODERATE/LOW) to PUW tables.
- Split Wave 2 gate criteria — open-source providers = loader-confirmed; closed-source = live-integration test.
- Reconcile PUW-009 hook event count (29 in plan vs 30 enumerated in OpenClaw assessment).
- Add GRADE summary noting Claude Code, Cursor, Warp, Windsurf, partial Factory carry MODERATE-evidence baseline.
- Promote PUW-029 (AGENTS.md size validation) from P2 to P1 if it remains tied to PUW-013.
- Reclassify PUW-008 risk from MEDIUM to HIGH (handler dry-run validation required).
- Move CLAUDE.md table edits from PUW-039 into Wave 1 PUWs that change paths.
- Add risks R6–R11 (architecture-designer review §"Risks the Plan Understates") to §4 risk register.

### Signoffs

- [x] **architecture-designer** — system fit + ADR implications
  - Date: 2026-05-05
  - Verdict: APPROVE-WITH-CONDITIONS
  - Notes: Wave ordering and P0 triage are architecturally sound and respect the agentic/.aiwg source-of-truth boundary. However, four implicit architectural decisions (AGENTS.md aggregation policy, rule activation-mode schema, cross-provider hook bridge, user-global deploy mode) must be captured as ADRs before their dependent PUWs are filed. Existing ADRs adr-behaviors-deployable-artifact, adr-behaviors-format, and adr-universal-provider-deployment require amendment or supersession to reflect Wave 1/2 changes. Add risks R6–R11 to the rollup register, promote PUW-008 risk to HIGH, and add explicit cross-PUW dependency edges (notably the AGENTS.md aggregation cluster: 013↔022↔023↔007↔029).

- [x] **technical-researcher** — evidence quality, GRADE compliance, citation completeness
  - Date: 2026-05-05
  - Verdict: APPROVE-WITH-CONDITIONS
  - Notes: P0 items for open-source providers (Codex, OpenCode, OpenClaw) are backed by HIGH-evidence source-code findings with named commits and file:line citations; the plan's evidence chain is real and traceable. Two conditions must be resolved before Wave 2 implementation: (1) PUW-011 must explicitly note its Cursor activation-mode taxonomy is MODERATE evidence (closed-source) and require a live-environment smoke test in the Wave 2 gate before non-alwaysApply modes are enabled — applied; (2) the quantitative "~3.5K-token overhead" claim in PUW-020 must be cited or hedged — applied. PUW-007 missing Priority cell corrected to P0. Advisory: add per-PUW evidence-level column and split Wave 2 gate criteria between source-verifiable and live-integration-verifiable providers.

**Operator approval:** Pending — operator reviews consolidated conditions above and authorizes ADR authorship + downstream implementation issue filing for epic #1089.

---

*Plan version: PROPOSED-1 — 2026-05-05. Replaces parity-update-plan-DRAFT.md (kept in tree for history). Implementation issues will be filed against epic #1089 only after both reviewer signoffs are recorded above.*
