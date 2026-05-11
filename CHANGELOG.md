# Changelog

All notable changes to AIWG project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project uses [Calendar Versioning (CalVer)](https://calver.org/) with npm-compatible format (`YYYY.M.PATCH`).

## [Unreleased]

_Nothing yet for the next release line._

## [2026.5.1] - 2026-05-11 — Hotfix: `aiwg doctor` cannot find `src/channel/manager.mjs` on installed users

A user-reported bug landed within hours of 2026.5.0 cutting: `aiwg --version` and `aiwg --help` worked, but `aiwg doctor` failed on a fresh `npm install -g aiwg` with `Cannot find module 'src/channel/manager.mjs'`. Root cause: three scripts under `tools/cli/` imported from `../../src/channel/manager.mjs` (the source tree), but the npm package only ships `dist/`, not `src/`. Local dev worked because both directories existed; npm-installed users only had `dist/`.

### Fixed

- **`tools/cli/doctor.mjs`** — import changed from `../../src/channel/manager.mjs` → `../../dist/src/channel/manager.mjs` with a comment explaining the npm-package layout. `aiwg doctor` now works on npm-installed AIWG.
- **`tools/cli/version.mjs`** — same fix. (Not user-facing for `aiwg --version` because that path is special-cased in `bin/aiwg.mjs`, but `aiwg sync` invokes this script.)
- **`tools/cli/update.mjs`** — same fix.
- **`tools/cli/validate-writing.mjs`** — replaced the `NODE_ENV === 'production'` gate (which didn't fire on `npm install -g aiwg` because NODE_ENV isn't set) with an `existsSync(distPath)` check that prefers `dist/` when available and falls back to `src/` for dev. Same class of bug as the three above.

### Audit

Other `tools/` scripts that import from `src/` were audited; the following already have correct fallback logic and were not affected:

- `tools/writing/writing-validator.mjs` — try/catch fallback dist → src
- `tools/plugin/plugin-installer-cli.mjs`, `plugin-uninstaller-cli.mjs`, `plugin-status-cli.mjs` — `existsSync(distPath)` || `srcPath`
- `tools/writing/expand-patterns.mjs` — dev-only script not invoked by the CLI

A `_resolve-impl.mjs` shared helper to standardize this resolution across all `tools/` scripts is queued as a follow-up.

## [2026.5.0] - 2026-05-11 — "Project-Local + Kernel-Pivot Maturity"

The 2026.5.0 stable tag. The 2026.4.0 stable tag was never cut — the rc series stopped at `v2026.4.0-rc.33` and rolled forward to `v2026.5.0-rc.1`. Everything from both rc lines, plus the 41 rc cuts of the 2026.5.0 series, is folded into 2026.5.0 stable. There is no `v2026.4.0` git tag and `npm install aiwg@2026.4.0` will not resolve.

### Highlights

| What changed | Why you care |
|--------------|--------------|
| **Discover-first protocol enforcement** (#1249) — Rule 1.5 in `skill-discovery.md` mandates `aiwg discover` BEFORE filesystem search for any AIWG-keyword query. Top-banner Discover-First Protocol on every provider's deployed `RULES-INDEX.md`. All 9 framework quickref descriptions rewritten with explicit `AUTO-INVOKE when user mentions: <triggers>` phrasing. `aiwg-finder` subagent documented as preferred routing when delegation is available. | The discoverability system stops being an "available option" agents skip in favor of fast grep. Driven by real Factory-droid user feedback. |
| **Hermes integration audit complete** (#1239-#1244, source-verified against Hermes Agent v0.4.0+ at HEAD) — AGENTS.md → 579-byte thin pointer (down from 30 KB+), `.hermes.md` twin gets MCP-specific suffix, `aiwg-orchestrate` skill auto-installs on first deploy, `hermes mcp add` (not `install`), first-match-wins context loading documented, `/reload-skills` / `/reload-mcp` slash commands replace restart guidance, 20K-char `CONTEXT_FILE_MAX_CHARS` cap surfaced. Hermes Capabilities Reference catalogs `/kanban`, `/handoff`, ACP adapter, `/agents`, `/goal`, `/cron`, `/snapshot`, `/background`, gateway platforms, plugins. | Hermes users get an integration that actually matches the upstream code, with every claim citing a Hermes source file/line. |
| **Per-platform session reload notice** (#1240) — Every `aiwg use` ends with a "Session reload required:" section naming action + rationale + symptom per provider. Steward agent's Post-Deploy Session Reload table covers all 10 platforms. | The "Agent type 'X' not found" symptom when a session predates the deploy is now diagnosed at the source — no more chasing imaginary subagent-isolation bugs. |
| **AGENTS.md becomes a thin pointer to AIWG.md** (#1239) — `buildAgentsMd` no longer inlines a 192-entry link-index of every deployed agent. Replaced with a 579-byte thin pointer that references AIWG.md and `aiwg discover` / `aiwg show`. Eliminates four warning classes across all 10 AGENTS.md providers. | Codex's 32 KB AGENTS.md cap stops being a constraint; auto-split and per-entry sanitizer warnings go to zero. |
| **`aiwg-regenerate` promoted to kernel skill** (#1245) — kernel set grows from 9 to 10 self-maintenance ops. Natural-language invocation works for "regenerate my CLAUDE.md" without `aiwg discover` round-trip. | Operational maintenance task gets first-class always-loaded surface, matching the precedent set for `steward`, `aiwg-doctor`, `aiwg-refresh`, etc. |
| **Publish pipeline fixes** (#1246, #1247) — `.gitea/workflows/gitea-release.yml` rewritten with `jq -n` JSON construction + explicit HTTP-code handling (replaces a silently-failing inline-escaped curl that hadn't created a Gitea Release object since rc.27). `.gitea/workflows/npm-publish.yml` gets `set -o pipefail` + `defaults.run.shell: bash` + refined error-pattern allowlist (replaces a silently-failing pipeline that hadn't pushed to npmjs.org since rc.27). Operator's `NPMJS_TOKEN` rotation closed the loop. | Every future rc tag actually creates a Gitea Release and publishes to public npmjs.org. CI no longer reports green for silent failures. |
| **Architecture overview docs with 8 mermaid diagrams** (#1248) — new canonical `docs/architecture-overview.md` (visual entry point), cross-referenced from `docs/how-it-works.md`, `docs/discovery-and-kernel-skills.md`, `docs/integrations/hermes-quickstart.md`, and README. Image placeholders at `docs/architecture-overview/images/` ready for polished Gemini-generated illustrations (three prompt-set aesthetics: illustrated computing iconography, monospace/terminal, editorial). | Visual mental model for AIWG's architecture, deploy flow, kernel-vs-standard model, and discovery system finally exists in the docs. |
| **Index includes `agentic/code/extensions` + nearest-ancestor type detection** (#1221) — `aiwg discover` and `aiwg show` now surface skills/rules/templates from `agentic/code/extensions/{sys,net,it,sec,stream,dev}` alongside frameworks and addons. `inferType()` reclassified ~380 mistyped artifacts (templates 27→393, +14 commands, +9 hooks, +6 behaviors). Top-level `agentic/code/behaviors/` added to scanDirs. | Discovery is honest about what exists. Templates, behaviors, hooks, and the elaboration-stage docs in research-complete are no longer silent `document` entries. |
| **`aiwg use all` deploys frameworks + addons + extensions** (#1222) — extensions are deployed alongside addons; single-extension installs work via `aiwg use <name>`; advisory and unknown-target text honestly describe what `all` does. | Operators get every capability bundle the corpus ships, not just frameworks + addons. |
| **`aiwg discover` / `aiwg show` UX hints on empty results** (#1221) — JSON envelope includes a `hint` field when the framework index is missing or the phrase scores nothing; `aiwg show` falls back to a corpus scan with an "uninstalled" banner. | Agents stop concluding "AIWG doesn't have a skill for that" when the real problem is an unbuilt index. |
| **Test cleanup: ralph→agent-loop module-resolution drift** (#1210) — 2 stranded vitest `.mjs` files renamed to `.ts` (28 tests now run under `npm test`); `npm run test:node` runs the 14 node:test files in `tools/ralph-external/` and `test/unit/ralph/`. | `npx vitest run` no longer trips on misplaced `.mjs` files. Test runners are explicit and contributor-discoverable. |
| **4 colliding agent renames at framework source** (#1211) — forensics+research `acquisition-agent`, ops `deployment-manager`, marketing `project-manager`, media-curator `quality-assessor` — renamed with framework prefixes; SDLC keeps the canonical names. Cross-references, manifests, READMEs, plugin packager output all updated. | Operators with multiple frameworks installed no longer hit "first-installed wins" silent muting. Both forks of `acquisition-agent` coexist. |
| **Sandbox tab tmux cheatsheet** (#1166) — collapsible cheatsheet panel in the `aiwg serve` Sandbox tab's PaneStack with localStorage-persisted toggle. Detach row visually highlighted. | Operators dropped into a tmux session via the sandbox attach flow stop reaching for Ctrl-C when they want to detach. |
| **Cross-provider parity Phase 2 verifications** (#1089, #1159, #1160, #1162, #1163, #1164) — Cursor/Copilot/Warp/Windsurf user-scope deploys documented as **Non-applicable** (in-app settings or cloud-sync mechanisms, not filesystem discovery); Factory verified inline. | Operators get clear disposition per provider: harmless mirror at the documented paths but use the provider-native customization mechanism for cross-project work. |
| **3 closed sweeps: skill listing budget, no-copy standard skills, v2026.4.0 release gap** (#1147, #1217, #1142) — kernel pivot resolved the 425-truncation budget issue (`aiwg doctor` now reports 0.10× budget); no-copy default verified; CHANGELOG honest about 2026.4.0 never cutting as stable. | Loose ends from the kernel-pivot epic tied off. |
| **Claude Code plugin parity for all 8 frameworks** (#1152) — 6 new plugins: `forensics`, `security-engineering`, `research`, `media-curator`, `ops`, `knowledge-base`. Marketplace grew from 7 to 13. | Every framework now installs via `/plugin install <name>@aiwg`, not just `sdlc` and `marketing`. Closes the framework→plugin distribution gap. |
| **Project-local artifact lifecycle (epic #1033)** — full `new-bundle` → `use` → `doctor` → `remove` → `promote` chain | Customize AIWG per project without forking. Bundles graduate to upstream by hash-verified copy (no rewrite) thanks to the identical-form portability invariant ([ADR #1038](.aiwg/architecture/adr-identical-form-portability.md)). |
| **`aiwg new-bundle` scaffolding** (#1050) | One command produces a valid manifest + starter artifact + README under `.aiwg/{type}/{name}/`. Aliases: `new-extension`, `new-addon`, `new-framework`, `new-plugin`. |
| **`aiwg promote` graduation** (#1037) | Move a project-local bundle to upstream or a private corpus path. SHA-256 verified copy with rollback on mismatch. `--dry-run`, `--cleanup`, `--force`. |
| **`aiwg remove` is project-local-aware** (#1037) | Reverts deployed files using artifact-hash detection (pristine / mutated / missing / replaced). Source under `.aiwg/<type>/<name>/` is **never** deleted — `--force` only overrides the case-2 mutation prompt. |
| **`aiwg doctor --project-local`** (#1037) | Per-type counts, validation errors, shadows (informational vs blocking), drift detection, provider deployment matrix. |
| **Activity log for project-local lifecycle** (#1037) | 12 design events emitted across deploy/shadow/remove/promote paths to `.aiwg/activity.log` for post-hoc audit. |
| **Comprehensive customization docs** (#1051, #1052) | New Path A/B/C structure (project-local / fork / corpus), quickstart, lifecycle reference, troubleshooting, from-fork migration, type disambiguation. Old `.aiwg/.project/` docs replaced with redirects. |
| **Corpus architecture & `@$AIWG_ROOT/`** | Skills link into the corpus rather than restating it. Token resolves correctly in dev, npm, and custom installs. 1,400+ broken refs fixed. |
| **Composite skills** | Thin skills = links + minimal framing. Agent follows refs as deep as the task requires. Context efficiency by design. |
| **aiwg-dev addon** | `link-check`, `validate-component`, `dev-doctor` section 4, and `devkit-*` scaffolding skills. |
| **Skills as canonical type** | SKILL.md is the source. Commands generated at deploy time. `aiwg add-command` deprecated. |
| **Daemon — fully operational** | Web UI, YAML profiles, scheduled tasks, Telegram multi-room, autonomous engine, cross-session memory, Docker. |
| **Mission Control** | Parallel agent loops as background missions with live dashboard. |
| **Behaviors — 5th artifact type** | Subscribe to system events, react automatically. Deployed to OpenClaw. |
| **Provider-watcher** | Scheduled provider update detection with automatic PR creation. |
| **SOUL.md agent identity** | Persistent character for agents: worldview, opinions, reasoning traits. |
| **Remote install system** | Install frameworks without cloning the repo. |
| **Project-level `aiwg.config`** | Per-project provider registry, deployment manifest, run scripts. |
| **`aiwg sync`** | Update + redeploy + health check in one command. |
| **OpenClaw (10th platform)** | First with native behaviors support. |
| **Hermes as first-class platform** | Full deployment target, 96 skills, token-optimized templates. |
| **Copilot & Windsurf overhauls** | Copilot: `.agent.md`/`.prompt.md`/`.instructions.md`. Windsurf: `.windsurf/rules/` with `trigger: always_on`. |
| **ops-complete framework** | YAML-native ops framework with `sys`, `it`, `dev`, `stream` extensions. |
| **RLM enhancements** | `quality_gate`, `preferred_model`, `chunking_strategy`, `batch_size`. Three new examples. |
| **Composable RULES-INDEX** | Components own their rules indexes. CLI assembles at deploy time. |
| **15-article getting-started series** | Scenario-based guides in user vocabulary. |
| **aiwg-guide contextual help skill** | Auto-activates when users ask how to use AIWG. |
| **AIWG.md hook file** | AIWG context decoupled from CLAUDE.md. Toggleable without reinstalling. |
| **CLI UI modernization** | Shared display module, brand mark `◆`, quiet/JSON mode. Consistent across all 53 commands. |
| **Quality & metrics modules** | Token tracking, budget management, quality scoring, A/B feedback testing — 4 modules, full unit test coverage. |
| **Model evaluation suite** | Evaluate local/cloud models across 6 dimensions. Backed by `@matric/eval-client`. |
| **`aiwg ralph --attach` / `ralph-attach`** | Stay attached to or re-attach to any running agent loop's output from any terminal. |
| **MCP sidecar docs (all 8 providers)** | Full integration guides, minimal + full config templates, quickstart sections for every provider. |
| **VS Code extension** | `@aiwg` Copilot chat participant, MCP auto-config, status bar, sidebar tree. Phase 1 + 2. (#623) |
| **Daemon platform tiers** | Tier 1 (native headless), Tier 2 (PTY adapter), Tier 3 (unsupported). In capability matrix. |
| **PTY adapter** | `aiwg daemon pty start/list/stop` — bridge Tier 1 TUIs over pseudo-terminal. `node-pty` optional. (#656) |
| **Contract syntax for skills** | `requires:`/`ensures:`/`errors:`/`invariants:` + `contract-manifest` + `contract-validate`. (#644) |
| **`issue-planner` + `induct-research` skills** | Research-grounded backlog generation. Human approval gate. Research routing to Gitea/GitHub/Jira. |
| **`human-authorization` rule** | Recommendation ≠ authorization. Agents confirm before high-stakes implied actions. HIGH. (#655) |
| **5 OpenProse antipattern rules** | `god-session`, `vague-discretion`, `context-bloat`, `parallel-then-synthesize`, `implicit-dependencies`. aiwg-utils: 7 → 13 rules. (#648) |
| **prose-integration addon complete** | `prose-detect` + `prose-install` + `prose-resolution`. 7-skill count. Centralized detection. (#649) |
| **`[all]` platforms token** | `platforms: [all]` replaced at deploy time. No more hardcoded provider lists. (#651–#653) |
| **agentic-installer addon** | `setup.aiwg.io/v1` SetupManifest YAML language. Script-first installation: 11 cross-platform templates, 3 skills, 1 agent, 2 rules. (#663–#667) |
| **`aiwg-ci-safety` rule (aiwg-dev)** | Agents may not touch `.gitea/workflows/` without human authorization. CI templates for users live in `agentic/code/frameworks/*/ci/`, never in forge dirs. HIGH. |
| **Skill namespace strategy** | `aiwg-{name}` slug prefix + `aiwg/` subdirectory + `namespace: aiwg` frontmatter — three-layer collision prevention. Collision detection in `use`, `doctor`, `validate-metadata`. All 10 platforms covered. |
| **`aiwg serve`** | Local HTTP server for the AIWG web dashboard. WebSocket PTY bridge streams live terminal output directly to the browser. |
| **Mission Control Web UI** | React app with xterm.js terminal viewer, telemetry dashboard, and fortemi-react panel. |
| **Artifact index: typed edges & filename-metadata** | Cross-graph set queries (`union`/`intersection`/`difference`), citation sidecar parser, typed edge extraction. Filename-metadata node strategy derives metadata from filename regex without reading file content. |
| **`no-time-estimates` rule** | Agent-oriented estimation: scope count, agent count, parallelism map, pass estimate. No wall-clock figures. HIGH. |
| **Graph backends guide** | Documentation for pluggable graph storage backends in `docs/development/`. |
| **Specification-complete layer (Layer 3 + 4)** | Elaboration now produces behavioral specs (sequence diagrams, state machines, decision tables, interface contracts) and pseudo-code specs — making construction-phase code generation a translation task, not a design task. 6 new templates, deepened gate criteria, new `/flow-use-case-realization` orchestration, 6-layer traceability enforcement. |
| **Semantic memory kernel** | New `semantic-memory` addon (`core: true, autoInstall: true`) with 5 kernel skills (`memory-ingest`, `memory-lint`, `memory-query-capture`, `memory-log-append`, `memory-log-render`) and a JSON Lines event schema. Any consumer declaring a `memory.topology` contract gets durable ingest/lint/log/query-capture for free. Replaces domain-scoped implementations across 4 frameworks. Per ADR-021. |
| **`MemoryTopology` contract** | New `memory.topology` field in `manifest.json` with TypeScript types in `src/extensions/types.ts`. Four `crossRefStyle` values supported: `at-mention`, `wikilink`, `markdown-link`, `yaml-ref`. Declared in sdlc-complete, research-complete, forensics-complete, media-curator. Validated by `aiwg doctor`. |
| **Kernel delegation pattern** | Five existing skills (`induct-research`, `intake-from-codebase`, `workspace-health`, `corpus-health`, `cleanup-audit`) now delegate mechanical work to `memory-ingest`/`memory-lint`. No UX change; adds provenance logging, contradiction detection, graph-native cross-references. Per ADR-021 D5. |
| **`llm-wiki` addon** | Thin topology on top of the semantic memory kernel. 5 page templates (book-companion, personal, research-deep-dive, business-team, generic), Obsidian integration docs, `crossRefStyle: wikilink`. Pick a profile during `aiwg use llm-wiki` via interactive picker or `--profile <name>`. |
| **`aiwg doctor` topology validation** | New `MetadataValidator.validateMemoryTopology()` method validates 6 required fields, `crossRefStyle` enum, `.aiwg/` namespace convention, `derivedPages` shape, and array types for `lintRules`/`ingestRequires`. Flags common addon-author mistakes before deploy. |
| **Training framework → marketplace plugin** | The `training-complete` framework moved out of main aiwg into a standalone repo at [`jmagly/aiwg-training`](https://github.com/jmagly/aiwg-training). Install via `/plugin install training@aiwg` or `aiwg use training`. Optional Python runtime (`aiwg-training` CLI) for batch operations — post-install hook prompts on Python 3.10+ detection. Main aiwg shrinks by ~20K lines. |
| **ADR-021 & ADR-022** | Two architectural decisions accepted: ADR-021 locks the semantic memory kernel architecture (6 decisions), ADR-022 locks the training framework architecture (10 decisions). Open questions resolved on both. |
| **`aiwg session`** | One command launches a fully-prepared agentic session: version check, doctor, auto-repair, deployment verification, optional MCP injection, then provider launch or IDE instructions. Self-healing by default. |
| **`aiwg feedback`** | File GitHub issues from the CLI without leaving the terminal. System context collected automatically. Routes through `gh` CLI → browser URL → stdout. |
| **`aiwg serve` WebSocket fix** | Sandbox connections were silently 404-ing. Fixed with native Node.js upgrade router + `ws` package. `ws` now auto-installs on first use. |
| **ADR template: 5 new sections** | Source verification & claim tracking, implementation sketch, concurrency/shared state model, testing strategy, multi-level Definition of Done. |

### Added

- **Kernel-dir pruning of legacy skill deploys** (steward audit follow-up). The kernel-pivot routing in rc.10 — rc.12 left pre-pivot standard skill directories sitting in the platform-native skills dir (`.claude/skills/` etc.) because the deployer never pruned them. Operators upgrading from rc.10 saw 400+ skills in `.claude/skills/` instead of the intended 9 kernel quickrefs, so the platform's skill-listing budget alarm stayed red. `deploySkillsWithKernelRouting()` now scans the kernel destination after deploying and removes any legacy skill directory whose name now belongs to the standard tier — user-authored skills with names not in either deploy list are preserved untouched. Live verification: `.claude/skills/` 402 → 10 entries; `aiwg doctor` Claude Code Skill Budget went from `EXCEEDS OVERRIDE 1.84×` to `OK 0.07×` (449 tokens vs 6,250 budget — 27× under).
- **Doctor budget check now reads the kernel tier**. `aiwg doctor` was checking `provider.paths.skills` (which since the kernel pivot routes to `<provider>/.aiwg/skills/`, the index-discoverable tier hidden from the platform) and reporting a budget overage that didn't reflect what the platform actually scans. Now reads `provider.kernelSkillsPath` first, falls back to `paths.skills` for providers that don't have a kernel split. All 9 provider modules export `kernelSkillsPath` from their default-export blocks (one provider was missing it from the default export — fixed).
- **Quickref skills standardized as discovery primers, not skill enumerations**. All 9 kernel quickrefs (`sdlc-quickref`, `aiwg-utils-quickref`, and the 7 framework-specific ones) rewritten to a consistent template:

  1. **Capability domains** — categorical buckets explaining the framework's surface
  2. **Curated discovery phrases** — pre-validated `aiwg discover "<phrase>"` commands per domain, each tested to surface the target skill in the top-3 ranked results (with example scores like `→ flow-deploy-to-production (score 0.51)`, `→ verify-citations (score 1.00)`)
  3. **Mental model + artifact directory layout**
  4. **Anti-pattern guard**: explicit "do not enumerate skills from memory; run `aiwg discover --type skill --limit 20 \"<area>\"` instead"

  This flips the quickrefs' role from skill-table reference to discovery primer. The agent learns which phrasings work — phrases curated and validated by AIWG maintainers, encoded directly into the kernel layer. Rather than enumerating ever-growing skill catalogs, the kernel teaches *how to find* them. Phrases were validated against the live discovery scorer; failed phrases were iterated until they surface the correct top result, or omitted when the underlying skill needs richer trigger declarations downstream.

  Net effect: each quickref stays tight even as frameworks grow (no list maintenance), and discovery becomes habit rather than fallback. The pattern induces every agent loop through the index instead of going from memory.
- **`aiwg discover` promoted to a first-class top-level command**. Previously `aiwg index discover` (subcommand of `aiwg index`); the new surface is `aiwg discover "<phrase>" [--limit N] [--type skill,agent,...] [--json]`. Discovery is the operator surface for finding AIWG skills, agents, commands, and rules by capability — it leverages the artifact index machinery but exists as its own verb so agents don't conflate it with the project's general-purpose graph indices (project / codebase / framework / user-defined). Same scoring (4× trigger boost, 2× capability) and same JSON schema as before. The legacy `aiwg index discover` path still works; the kernel quickrefs and the `skill-discovery` rule have been updated to use `aiwg discover`.
- **Skill-only `.aiwg/` path move ported to all 9 remaining providers** (#1216). Kernel-vs-standard skill routing now applies uniformly across the AIWG fleet:

  | Provider | Standard skills | Kernel skills |
  |---|---|---|
  | Claude Code | `.claude/.aiwg/skills/` | `.claude/skills/` |
  | Cursor | `.cursor/.aiwg/skills/` | `.cursor/skills/` |
  | Factory AI | `.factory/.aiwg/skills/` | `.factory/skills/` |
  | GitHub Copilot | `.github/.aiwg/skills/` | `.github/skills/` |
  | OpenCode | `.opencode/.aiwg/skill/` | `.opencode/skill/` |
  | Warp | `.warp/.aiwg/skills/` | `.warp/skills/` |
  | Windsurf | `.windsurf/.aiwg/skills/` | `.windsurf/skills/` |
  | OpenClaw | `~/.openclaw/.aiwg/skills/` | `~/.openclaw/skills/aiwg/` |
  | Hermes | `~/.hermes/.aiwg/skills/` | `~/.hermes/skills/` |
  | Codex | `.codex/.aiwg/skills/` | `.codex/skills/` |

  All 6 standard providers verified live: each ships **9 kernel skills + 391 standard skills** (vs the prior flat 400). OpenClaw's 150-skill hard cap is comfortably cleared regardless of how many frameworks are installed. New `deploySkillsWithKernelRouting()` helper in `base.mjs` factors the partition logic so each provider's `deploySkills` is now ~3 lines. PROVIDER_PATHS in `use.ts` and PROVIDER_DEPLOY_DIRS in `aiwg-config.ts` updated to mirror. 7 integration test files re-pointed at the new layout. Codex's home-dir script-delegated path (per #766) preserves its existing `~/.codex/skills/` deploy unchanged — kernel routing for that surface waits for #766.
- **`skill-discovery` HIGH framing rule** (#1215). Closes the kernel-pivot loop: tells agents that most AIWG skills are NOT in their context (they live at `<provider-dir>/.aiwg/skills/`, reachable only through the artifact index) and **mandates** an `aiwg index discover "<paraphrased need>"` query before declining "AIWG can't do that" or improvising a custom workflow. Names exceptions (user named a specific skill, capability is clearly out of scope, query already done in session) and requires the agent to surface the top match (or top-3) to the user so the discovery is auditable. Layers cleanly with `research-before-decision` (technical research) and `instruction-comprehension` (parsing the actual need). aiwg-utils rule count 19 → 20. Deploys via the standard rules-index pipeline.
- **Kernel quickrefs for the remaining 7 frameworks** (#1213). Each shipped framework now has a `kernel: true` directory skill: `forensics-quickref`, `research-quickref`, `media-curator-quickref`, `marketing-quickref`, `ops-quickref`, `security-engineering-quickref`, `knowledge-base-quickref`. Each lists the framework's high-traffic skills with one-liners, names the artifact-directory layout, sketches the workflow phase model, and ends with a "don't enumerate from memory — query the index" guard. Total kernel-resident skill count after this lands: **9** (8 framework quickrefs + `aiwg-utils-quickref`), well under OpenClaw's 150-skill floor and Claude Code's 25%-of-context budget regardless of how many frameworks are installed. Previously-flat 393-skill listing is now 9 visible kernel skills + 392 index-discoverable skills hidden under `.claude/.aiwg/skills/`.

  Side effects: `forensics-complete/manifest.json` `total_skills` bumped 19 → 20 (the new quickref counts in the framework's metadata). Use-handler's post-deploy `buildIndex` call now pre-flights for `agentic/code/frameworks/` existence so test fixtures and npm-install deploys (no source tree present) don't trip on the index-builder's hard-exit on missing scan dirs.
- **`aiwg index discover` capability-search subcommand** (#1214). Token-tight ranked lookup over the framework artifact index. Default surface targets AIWG kinds (`skill`/`agent`/`command`/`rule`); `--type` narrows it. Output names the top trigger phrase responsible for each match plus the entry's capability description. JSON mode (`--json`) emits a stable schema (path/type/title/score/triggers/capability/kernel) for programmatic agent consumption. Examples: `aiwg index discover "create intake"` → ranks the marketing intake variants and `intake-from-codebase`; `aiwg index discover "deploy production"` → ranks `flow-deploy-to-production` first (score 0.51).

  Wiring: `extractTriggers()` parses the `## Triggers` section into structured phrases; `extractCapability()` pulls the frontmatter `description` (falling back to the first body paragraph); both are filled in for skills/agents/commands/rules during `buildIndex`. `inferType()` now classifies these four AIWG kinds from source path layout, so artifacts under `agentic/code/{frameworks,addons}/<name>/{skills,agents,commands,rules}/` always land with the right type. The scorer adds a 4× weight on trigger phrase matches and 2× on capability matches; multi-token queries require ≥50% token overlap to surface partial matches (gibberish queries return zero results).

  `aiwg use` runs `buildIndex({ graph: 'framework' })` post-deploy as a best-effort rebuild so `discover` always queries fresh data without the operator running anything explicit. Pre-existing query/stats/deps subcommands unchanged. 10 new tests in `test/unit/artifacts/discover.test.ts`.
- **Kernel-skill routing & first two quickrefs** (epic [#1212](https://git.integrolabs.net/roctinam/aiwg/issues/1212)). Pivot from bulk skill deploy to kernel + index-driven discovery, side-stepping the agentic platforms' flat-namespace skill-listing budgets (Claude Code: 25% of context; OpenClaw: 150-skill hard cap; etc.). Skills now route to one of two destinations on `aiwg use --provider claude`:
  - **Standard skills** → `.claude/.aiwg/skills/` (sequestered, discoverable through the artifact index, not the platform's flat listing)
  - **Kernel skills** (`kernel: true` frontmatter) → `.claude/skills/` (platform-native, always-loaded). Reserved for the small set of always-on framing/reference skills.

  Two kernel quickrefs ship in this cut: `sdlc-quickref` (in `sdlc-complete`) and `aiwg-utils-quickref` (in `aiwg-utils` addon). Each acts as a directory + usage quick reference: lists the framework's most-reached-for skills with one-liners, points at the index for the rest, includes anti-pattern guards against enumerating from memory. Remaining 7 framework quickrefs tracked as #1213; `aiwg index discover` capability-search subcommand as #1214; `skill-discovery` framing rule as #1215; port to other 9 providers as #1216.

  New helper `isKernelSkill()` in `tools/agents/providers/base.mjs`. Claude provider's `deploySkills()` partitions and routes via `kernelSkillsPath`. Research backing the design at `.aiwg/research/findings/skill-budget-landscape-2026-05.md` (provider survey), `.aiwg/research/findings/zero-server-index-tech-2026-05.md` (FTS5 / sqlite-vec / hnswlib trade-off table), `.aiwg/architecture/audit-index-subsystem-2026-05.md` (existing index subsystem audit, 450-LOC implementation path).
- **`PROF-*` node IDs in citation-sidecar parser** (#105). `src/artifacts/citation-parser.ts` accepts `PROF-[POFG]-[a-z0-9-]+` (`PROF-P-` people, `PROF-O-` orgs, `PROF-F-` funders, `PROF-G-` groups) alongside `REF-\d+` at all three call sites: `extractRefsFromTable`, `parseCitationSidecar` (frontmatter `ref` validation), and `buildRefToPathMap` (indexer node-id mapping). Centralized into module-level `NODE_ID_PATTERN` (anywhere-match `/g`) and `NODE_ID_FULL` (anchored validator) so the regex can't drift across sites; new `isNodeId(value)` typed predicate exported for downstream consumers. Purely additive — both ID spaces are unambiguous and prefixed, so no fixture or codepath collides. Unblocks research-corpus projects building entity-profile graphs (`profile→REF` edges natively traversable via `aiwg index neighbors`). 7 new unit + integration tests covering all four type codes, malformed-shape rejection, and a `buildIndex` round-trip with a `PROF-P-marks-samuel-edges.md` sidecar producing `cites` edges to `REF-803` / `REF-779`.
- **Claude Code plugin builds for the 6 missing frameworks** (#1152). New plugins: `forensics` (13 agents, 19 skills from `forensics-complete`), `security-engineering` (2 agents, 7 skills), `research` (8 agents, 20 skills from `research-complete`), `media-curator` (6 agents, 18 skills), `ops` (12 agents, 2 flat skills from `ops-complete`), `knowledge-base` (2 skills). Each plugin gets a `PLUGIN_CONFIGS` entry in `tools/plugin/package-plugins.mjs`, a generated `plugins/<name>/` directory with `.claude-plugin/plugin.json` (CalVer `2026.5.0`) and `README.md`, plus a `marketplace.json` entry. Marketplace coverage went from 7 plugins to 13. Plugin name `security-engineering` chosen over `security` to avoid collision with the `addons/security/` addon. Source-to-plugin payload verified 1:1 against `agentic/code/frameworks/<src>/{agents,skills}`.
- **Project-local lifecycle — Phase 1: Activity log** (#1037 Phase 1). New `src/extensions/project-local-activity.ts` emits inline lifecycle events at per-bundle, per-provider granularity that the generic post-command hook can't capture. Wraps the storage adapter; non-blocking writes (failures logged to stderr, never break the underlying op). Encodes 12 design events (`discover`, `deploy`, `deploy-failed`, `conflict`, `shadow-acknowledged`, `shadow-refused`, `remove`, `remove-mutated`, `remove-conflict`, `remove-force`, `promote`, `promote-failed`) using the frozen `ACTIVITY_OPERATIONS` enum (`deploy`/`delete`/`promote`/`query`) with the design event name as the summary prefix — no breaking change to the rule. `emitDiscoverEventsDeduped()` provides noise control for read-only operations: dedupe by `(name, type)` against the recent log tail. Wired into `deployProjectLocalBundles` for shadow resolutions and per-provider deploy success/failure events. 6 new unit tests.
- **Project-local lifecycle — Phase 2: project-local-aware `aiwg remove`** (#1037 Phase 2). New `src/extensions/project-local-remove.ts` implements cases 1–6 from the [#1048 design](.aiwg/architecture/design-aiwg-remove-revert.md): pristine (delete), mutated (refuse + prompt; `--force` overrides), missing (silent success), replaced (refuse — never destroy another bundle's deploy, even with `--force`), permission-denied (partial revert with registry preserved per-provider), source-deleted-before-remove (revert from registry hashes anyway). Source under `.aiwg/<type>/<name>/` is **never** deleted — load-bearing invariant. Detection uses a new `InstalledEntry.artifactHashes` field recorded at deploy time by `hashBundleArtifacts()`; older entries without hashes fall back to "unhashed" (same refuse-by-default behavior as case 2). Routing: `removeHandler` in `subcommands.ts` detects project-local entries in `installed` and routes to the new handler; non-matching ids fall through to the existing plugin-uninstaller path. CLI flags: `--force`, `--dry-run`, `--provider <p>`, `--keep-registry`. 15 new unit tests.
- **Project-local lifecycle — Phase 3: `aiwg doctor` project-local section** (#1037 Phase 3). New `src/extensions/project-local-doctor.ts` builds the section per the [#1049 design](.aiwg/architecture/design-doctor-log-promote.md). Reports: per-type counts with bundle-id listing, validation errors (top 10 inline + "+N more"), active shadows (informational ⚠ for non-safety, !! for acknowledged), denylist violations (✗), drift (hash deployed file vs registered `artifactHashes`), provider deployment matrix from installed entries. New flags: `aiwg doctor --project-local` (this section only), `--quiet` (suppress informational subsections). Section fully suppressed when no project-local content exists. Doctor exits 0 unless validation errors / denylist violations / drift are present — shadows alone do not fail doctor by design. 8 new unit tests.
- **Project-local lifecycle — Phase 4+5: `aiwg promote` graduation** (#1037 Phases 4+5). New `src/extensions/project-local-promote.ts` operationalizes the identical-form portability invariant ([ADR #1038](.aiwg/architecture/adr-identical-form-portability.md)). CLI: `aiwg promote <name> [--to upstream|corpus <path>] [--dry-run] [--cleanup] [--force]`. Pre-flight: bundle exists, destination doesn't already exist (refuses overwrite), no `@.aiwg/` references that would dangle (refuse without `--force`). Operation: SHA-256 snapshot of every source file → recursive copy → re-hash every destination file → roll back (delete dest) on any mismatch → registry source flips from `'project-local'` to `'bundled'` (or `'corpus'`) → emits `promote` (or `promote-failed`) to activity log. `--cleanup` removes the `.aiwg/<type>/<name>/` source after a successful copy. 10 new unit tests. New `promoteHandler` in `subcommands.ts`; new `promoteCommand` in `commands/definitions.ts`.
- **`aiwg new-bundle` scaffolding** (#1050). New `src/extensions/project-local-scaffold.ts` creates a complete `.aiwg/<type>/<name>/` bundle in one command: valid manifest (validates against `BundleManifestSchema` out of the box), starter artifact (`--starter skill|rule|agent|minimal`), and README that includes the identical-form portability reminder + `aiwg promote` walkthrough. Aliases: `new-extension`, `new-addon`, `new-framework`, `new-plugin` infer `--type` from invocation. Type-specific stubs: `src/.gitkeep` for framework, `payload/.gitkeep` for plugin. Refuses to overwrite existing bundles. 11 new unit tests.
- **Test matrix for project-local lifecycle** (#1046). New `.aiwg/testing/test-strategy-project-local.md` maps every #1046 matrix row to its owning test file with status. New `test/unit/extensions/project-local.test.ts` (9 cross-cutting tests: D-8 path-traversal at schema layer, D-9 unicode names, C-2 three-way collision, C-3 cross-type id collision). New `test/integration/project-local-deploy.test.ts` (6 tests against real `deploy-agents.mjs`: per-type provider paths claude+cursor, `--dry-run` no-write, multi-provider sequential, source preservation, idempotent re-run). New `test/uat/project-local-flow.uat.ts` (UAT round-trip + safety-critical shadow refusal). Wired into `config/vitest.uat.config.js`.
- **Design — `aiwg remove` revert semantics** (#1048). New `.aiwg/architecture/design-aiwg-remove-revert.md` specifies the per-case behavior table (cases 1–7) for `aiwg remove` against project-local artifacts when deployed files are not in pristine state. `--force` invariants are narrowly scoped: skip case-2 prompt only; never deletes source under `.aiwg/<type>/<name>/`; does not authorize destroying another bundle's deploy or bypassing OS permission errors. Specifies `artifactHashes` registry shape for hash-based detection. Per-case activity log entries enumerated.
- **Design — Doctor + activity-log + `aiwg promote`** (#1049). New `.aiwg/architecture/design-doctor-log-promote.md` covers three operational concerns: doctor section additions (per-type counts, validation, shadows informational vs blocking, drift detection, provider matrix), activity log schema (12 events with summary shape, non-blocking writes, discover dedupe), and `aiwg promote` CLI surface (hash-verified copy with rollback, `--dry-run`/`--cleanup`/`--force`, registry source-flip).
- **Customization docs — Path A/B/C structure** (#1051). `docs/customization/README.md` restructured: Path A (project-local, recommended for most users), Path B (fork, for upstream contributions), Path C (corpus, cross-project sharing). New `docs/customization/project-local-quickstart.md` (5-minute first bundle), `project-local-lifecycle.md` (full operator surface), `project-local-troubleshooting.md` (manifest validation, shadow warnings, drift detection, remove/promote failures, activity log issues), `from-fork-to-project-local.md` (per-category migration guide for operators currently maintaining a fork). New `examples/project-local/README.md`.
- **Disambiguation doc — extensions vs addons vs frameworks vs plugins** (#1052). New `docs/customization/extensions-vs-addons-vs-frameworks-vs-plugins.md`: one-sentence definitions, comparison table, decision tree, plugin-vs-content distinction, graduation paths, cross-references to ADRs and the manifest schema.
- **CLI reference updates** for new commands. `docs/cli-reference.md` gains full entries for `new-bundle` and `promote`; `remove` rewritten for project-local routing (`--force`/`--dry-run`/`--provider`/`--keep-registry` flags, source preservation invariant, activity log emissions); `doctor` updated with `--project-local` and `--quiet` flags + project-local section description.
- **Project-local artifact discovery — read-only scan + manifest validation** (#1034, epic #1033). New `src/extensions/manifest.ts` ships the unified `BundleManifestSchema` (Zod) per the #1044 design — discriminated nested config (`addonConfig`, `frameworkConfig`, `extensionConfig`, `pluginConfig`), strict validation rejects unknown top-level keys, DoS limits (64 KB manifest, 200 bundles, 50 keywords, 20 overrides), `safety-critical`/`overrides` fields per #1041, forward-compat `manifestVersion: '1'` discriminator. New `src/extensions/project-local-discovery.ts` scans `.aiwg/{extensions,addons,frameworks,plugins}/<name>/manifest.json`, validates each, returns structured bundles + per-manifest errors. Symlinked bundle dirs refused unless `--allow-symlinks` (#1042 T3); legacy `.aiwg/frameworks/registry.json` naturally ignored (only directories with `manifest.json` are bundles); case-insensitive id collisions within a type are refused (NFR-PL-6). Wired into `aiwg list`: project-local bundles surface in the standard output with `[project]` source label; new `aiwg list --project-local` filters to project-local-only with per-type counts and validation-error display. Read-only — no deployment side effects (deploy lands in #1035). 34 new unit tests (manifest schema + scanner). Tests pass; tsc clean; no regressions across 801 suite.
- **Skill quality system — `aiwg skill-lint` + sticky PR comment** (#1015 Phases C–D). New `aiwg skill-lint <path...> [--rubric strict|standard|lenient] [--json]` CLI scores SKILL.md files against a four-dimension rubric (Schema 40%, Description 20%, Discoverability 20%, Body 20%). Three thresholds: lenient ≥40, standard ≥60, strict ≥80. Companion CI workflow `.gitea/workflows/skill-lint-pr.yml` runs the linter on changed SKILL.md files in PRs and posts a single sticky comment with per-dimension scores via the Gitea API directly — no third-party action dependency. Rubric documented in `docs/skills/quality-rubric.md`.
- **SKILL.md frontmatter linter + CI gate** (#1014). New `tools/linters/skill-frontmatter-linter.mjs` validates SKILL.md YAML frontmatter (parse + required `name`/`namespace`/`description`/`platforms`). New `validate-skill-frontmatter` job in `.gitea/workflows/metadata-validation.yml` runs it against the entire `agentic/code/` corpus on every PR. Surfaced and gated 317 pre-existing violations cleaned up under #1015 Phase A.
- **`aiwg validate-metadata` now picks up SKILL.md** (#1015 Phase B). `MetadataValidator.findManifestFiles` extended to match `SKILL.md` alongside `manifest.md`/`BEHAVIOR.md`. Routing dispatches by filename: SKILL.md goes through a new `validateSkillManifest` method using `SkillFrontmatterSchema` (encapsulated per artifact type — no inline `if isFooFile` branching). Adding a new artifact type is now an additive change.
- **Schema additions to `SkillFrontmatterSchema`** (#1015 Phase B): `triggers`, `aliases`, `deprecated_names` are now declared (were silently passing through `passthrough()`).
- **ADR — SKILL.md frontmatter schema policy** (#1015 Phase B). `.aiwg/architecture/adr-skill-md-frontmatter-schema.md` codifies the policy: `name`/`namespace`/`description`/`platforms` required; `user-invocable: true` required for slash-invocable skills; `triggers`/`aliases`/`commandHint` recommended.
- **Project repo topology in `.aiwg/aiwg.config`** (#994). New `remotes` block declares `primary` (CI/issues/PRs), `issue_tracker`, `ci`, and `secondary[]` (mirrors with `push_on_release` flag). `resolveRemotes()` helper applies defaults — when absent, `origin` is treated as primary, fully back-compat. `aiwg doctor` validates that every named remote exists in `git remote`. Closes a class of "agent guessed wrong" failures for projects running on Gitea/GitLab/internal GitHub with a public mirror.
- **`resolveRemoteProvider(url)` helper** (#997). Returns `'github' | 'gitlab' | 'gitea' | 'unknown'` from a remote URL. Self-hosted instances without a tell-tale hostname return `'unknown'` so callers ask the operator instead of guessing.
- **Delivery / repo-control policy in `.aiwg/aiwg.config`** (#995). New `delivery` block declares `mode` (direct / feature-branch / pr-required), `default_branch`, `branch_naming.prefix_by_type`, `merge_style`, `delete_branch_on_merge`, `force_push_policy`, `require_ci_green`, `require_signed_commits`, `auto_close_issues`, `issue_comment_on_cycle`. `resolveDelivery()` applies conservative defaults that match what AIWG agents do today — no regression for existing projects. `aiwg doctor` enum-validates and best-effort checks `default_branch` exists in git.
- **Repo topology emitted into `AIWG.md` / `AGENTS.md`** (#998). `aiwg use` now interpolates a `## Repo Topology` section into the Claude hook file and every template-based provider (codex / cursor / factory / hermes / opencode). Agents see primary/secondary remote URLs at session start without reading `.aiwg/aiwg.config` directly. Empty when no `remotes` block configured.
- **`aiwg config show --project [--json]`** (#999). New CLI surface for inspecting the resolved project config: providers, installed frameworks, and the resolved remotes topology (with URLs resolved via `git remote get-url`). `--json` flag for CI scripts. Errors with `ERR_NO_PROJECT_CONFIG` and a helpful hint when `.aiwg/aiwg.config` is absent.
- **`aiwg config get|set --project <key> [<value>]`** (#1006). Read and write the project config from the CLI without hand-editing JSON. Dotted paths (`delivery.mode`, `remotes.primary`). Enum validation on `set` for `delivery.mode` / `delivery.merge_style` / `delivery.force_push_policy` rejects unknown values with a clear hint listing allowed members. Boolean coercion for the five `delivery.*` boolean fields. Read-modify-write preserves unrelated fields via `writeAiwgConfig()` (atomic, secret-safe).
- **Intake-wizard delivery-policy question** (#1005). `/intake-wizard` now asks "How does your team ship code?" with three preset answers (`direct` / `feature-branch` / `pr-required`) plus an advanced sub-flow for `merge_style`, `force_push_policy`, `require_signed_commits`. `default_branch` derived from `git symbolic-ref HEAD` — handles `master → main` migrations gracefully.
- **`@$AIWG_ROOT/` token system** — install-path token for all AIWG corpus refs; resolves to repo root (dev), `$(npm root -g)/aiwg` (npm), or `$AIWG_ROOT` env var (custom); any env var usable as `@$TOKEN/path`; `.env` support; 1,099 bare refs migrated across corpus
- **`.aiwg/` reference contract** — normalized path allowlist derived from `memory.creates` in manifests; Tier 1 (always present) and Tier 2 (framework-specific) documented; `validate-component` and `dev-doctor` enforce dynamically; `memory` field added to all manifests (#632, #633)
- **aiwg-dev addon** — full developer toolkit: `validate-component` (PASS/WARN/FAIL link classification), `dev-doctor` (Section 4 subchecks for `.aiwg/`, bare refs, `.claude/` refs), `link-check` skill (per-file/corpus/`--fix`/`--report`/`--fail-on-warn`), `devkit-*` scaffolding skills (#634–#636)
- **No-escape rule** — all `@<path>` patterns processed regardless of backtick/code-block context; documented in `aiwg-dir-reference-contract.md` and `corpus-navigation-guide.md` (#635)
- **Corpus navigation guide** (`docs/development/corpus-navigation-guide.md`) — mental model, thin skill principle, composite skill pattern, reference tiers, ordering/grouping, anti-patterns
- **318 `.claude/` refs migrated** — all `.claude/commands/`, `.claude/rules/`, `.claude/agents/` refs in `agentic/code/` replaced with `@$AIWG_ROOT/` corpus paths; skills now compose correctly via links (#638)
- **`aiwg sync`** — update + redeploy + health check; `--dry-run`, `--quiet`, `--skip-update`, `--provider`, `--channel`, `--frameworks` flags (#482)
- **Mission Control (`aiwg mc`)** — 9 subcommands: `start`, `dispatch`, `status`, `watch`, `abort`, `pause`, `resume`, `stop`, `list`; JSONL event log; persistent sessions; `--drain` on stop (#483)
- **AIWG Steward agent** — installation custodian; DETECT→BASELINE→CHECK→PLAN→CONFIRM→EXECUTE→VERIFY→REPORT logic (#481)
- **MC Conductor agent** — live orchestrator inside Mission Control sessions (#483)
- **Provider-watcher** (`tools/daemon/`) — scheduled provider update detection, task execution, automatic PR creation (#615)
- **Cross-session daemon memory** (`#608`) — episodic + semantic + working memory tiers persisting across daemon restarts; `MemoryManager` with TTL-based eviction and cross-session retrieval
- **Daemon — fully operational** — web UI (localhost:7474), YAML profiles, scheduled task runner, multi-room Telegram, autonomous engine with safety constraints, Docker containerization (#520–#534)
- **Behaviors** — BEHAVIOR.md format spec, `hooks:`/`triggers:`/`inputs:`/`scripts/`; framework source dirs; `aiwg add-behavior` scaffolding; OpenClaw deployment (#540–#543)
- **OpenClaw** — 10th platform; agents/commands/skills/rules/behaviors to `~/.openclaw/`; ClawHub publication documented (#535)
- **SOUL.md system** — `soul-create`, `soul-validate`, `soul-enable`, `soul-disable`, `soul-status`, `soul-enhance`, `soul-apply`, `soul-blend`; four pre-built SDLC souls (#437, #438)
- **AIWG.md hook file** — decoupled context injection; `hook-enable`/`hook-disable`/`hook-regenerate`/`migrate-hook`; multi-provider equivalents (#439–#446)
- **Remote install system** — install frameworks, addons, extensions from registry without cloning (#557)
- **Project-level `aiwg.config`** — provider registry, deployment manifest, `aiwg run` scripts; XDG-compliant resolution (#621)
- **aiwg-guide skill** (`agentic/code/addons/aiwg-utils/skills/aiwg-guide/`) — contextual help skill; auto-activates on AIWG usage questions; covers all 50 commands and 9 providers (#616)
- **Concierge agent** (`tools/daemon/`) — persistent front-facing agent for daemon interactions; intent router and response translator
- **Skills as canonical extension type** — `SourceExtensionType`/`DeploymentExtensionType` aliases; `CommandHint` interface; `SkillMetadata` expanded; skill-command translator; 56 command definitions converted; provider classification; `aiwg add-command` deprecation (#546–#552, #555, #538)
- **Hermes as full platform** — `--provider hermes`; 96 skills declare compatibility; token-optimized AGENTS.md; 5-tool MCP whitelist; `hermes-quickstart.md`
- **Copilot provider overhaul** — `.agent.md`, `.prompt.md`, `.instructions.md` with `applyTo` globs; `aiwg mcp install copilot` generates `.vscode/mcp.json` (#577–#580)
- **Windsurf provider update** — `.windsurf/rules/` with `trigger: always_on`; dual skill deploy (#574–#576)
- **ops-complete framework** — Kubernetes-inspired envelope; 6 JSON Schema kinds; 4 rules, 2 agents, 3 templates, 2 skills; `sys`/`it`/`dev`/`stream` extensions (#491)
- **Composable RULES-INDEX hierarchy** — component-owned indexes assembled at deploy time (#496–#500)
- **RLM enhancements** — `quality_gate`, `preferred_model`, `chunking_strategy`, `batch_size`; `rlm-self-refine`, `rlm-divide-conquer`, `rlm-filter-recurse` examples; 6 antipatterns documented (#618–#620)
- **Prose-integration addon** — OpenProse program integration; `prose-setup`, `prose-reader`, `prose-run`, `prose-validate`, `forme-manifest`; `prose-bridge` rule (#619, #620)
- **Getting-started guide series** — 15 scenario-based articles in `docs/getting-started/`
- **CLI shared display module** (`src/cli/ui.ts`) — chalk/ora/cli-table3; brand mark `◆`; TTY/CI-aware degradation; quiet/JSON mode
- **User-level config subsystem** — `aiwg config get|set|list|validate|reset|path`; XDG resolution (#545)
- **Skills CLI subsystem** — `aiwg skills list|search|install|info`; local/clawhub/openclaw adapters (#539)
- **Domain grounding agents** — security, performance, compliance, technology grounding agents; 40% domain accuracy improvement (#184)
- **Agent constraint learning** — persistent domain rules learned from reviewer corrections (#146)
- **Agent-loop rename** — `ralph-loop` → `agent-loop`; loop taxonomy; `al:` shortcut (#558)
- **YAML metalanguage schemas** — flow, agent, rule, skill JSON Schema definitions (#447)
- **Verbalized sampling addon** — diversity-tuning skill, content-diversifier agent, 3 strategies (#20)
- **README overhaul** — 90+ research citations, six-component deep dive, platform entries (#501)
- **Provider alignment audits** — full audits for all 11 platforms (#560–#569)
- **Self-maintenance rule** (`agentic/code/frameworks/sdlc-complete/rules/self-maintenance.md`) — CLI-first maintenance principle; pre-flight trigger table for long orchestration sessions; NL pattern translations; proactive AIWG.md guidance (#484)
- **Hermes MCP sidecar architecture** — MCP sidecar (#449); minimal 5-tool whitelist (~3,000 token schema vs 12,000+ full surface) (#451); `delegate_task` pattern (~200 tokens vs 3,000–8,000 direct) (#452); Hermes platform frontmatter on skills (#453); token-optimized AGENTS.md template (#450)
- **Token metrics modules** — token-per-artifact-line tracking (#173), token budget management with 70/30 split (#144), pattern-based quality scoring with JSON patterns per artifact type (#192), feedback A/B testing infrastructure (#148); unit tests for all four modules
- **Model evaluation suite** (`tools/eval/`) — configurable eval framework for local and cloud models; 6 dimensions, 9 initial test cases; Markdown and JSON reports; backed by `@matric/eval-client` from Gitea npm registry; standard benchmark scores included when `matric-eval` binary is present (#433, #488)
- **`native-ux-tools` rule** — agents must prefer platform-native interaction tools; platform capability matrix for all 8 providers; fallback to formatted markdown (#448)
- **Local/Ollama provider** — first-class provider with local model support documentation and catalog entries (#434)
- **Hybrid artifact addressing** (#187) — hybrid system combining file path and semantic URN addressing; `@path`, `@?"query"`, `@#tags`, `@phase:type`; sub-100ms in-memory index
- **`aiwg index` enhancements** — flexible graph types, deploy next-steps guidance, verbose mode (#426)
- **Community model testing guide** — contribution guide for community model testing (#435)
- **Diagram generation rule elevated** — `diagram-generation` promoted to standard utility rule (#430)
- **Complete docset enforcement** (#429) — rule enforcing full documentation artifact generation per release
- **Claude Code `@`-link best practices** (#427) — guidance for `@`-link usage in agent memory contexts
- **MCP sidecar integration docs for all 8 providers** (#503–#510) — full integration guides at `docs/integrations/{provider}-mcp-sidecar.md`; minimal + full config templates for cursor, opencode, warp, windsurf; sidecar section appended to all 8 provider quickstart guides
- **`aiwg mcp install windsurf` and `aiwg mcp install warp`** — two install targets added; generate `~/.codeium/windsurf/mcp_config.json` and `~/.warp/mcp.json`
- **`aiwg ralph --attach`** — stay attached to an agent loop's output after launch; streams live to stdout; Ctrl+C detaches without stopping the loop
- **`aiwg ralph-attach [--loop-id <id>]`** — re-attach to any running agent loop's output stream from any terminal session
- **`.gitignore` advisory** (#553) — `aiwg use` and `aiwg new` advise `.gitignore` patterns for AIWG runtime directories (`.aiwg/working/`, `.aiwg/ralph/`, `.claude/`, etc.)
- **MCP config injection** (#554) — `aiwg config` can inject MCP server configurations into supported providers
- **Claude Code reference expansion** (#570–#573) — Agent Teams, scheduled agents, remote triggers, and worktree isolation documented in depth; `subagent_type` catalog audited against Claude Code built-in types
- **Test fixtures refactor** (#614) — hardcoded model names extracted into shared fixtures across test suites
- **VS Code extension** — `vscode-extension/` directory; `@aiwg` Copilot chat participant with `/deploy`, `/status`, `/skill`, `/pipeline`, `/eval`, `/productionize` routing; MCP auto-config (idempotent `.vscode/mcp.json` writer); status bar showing installed frameworks + providers; sidebar tree views (Status, Frameworks, Scripts); bundled JSON Schema for `aiwg.config.json` (autocomplete + inline validation); brand assets (favicon, logo, 128×128 marketplace icon, activity bar icon) (#623)
- **Daemon platform tier classification** — Tier 1 (native headless: claude-code, opencode, warp, openclaw, codex), Tier 2 (PTY adapter secondary: claude-code + codex), Tier 3 (unsupported — IDE/display server required: copilot, factory, cursor, windsurf); `daemon_tier` and `daemon_pty_adapter` fields in capability matrix; `getDaemonTier()` and `daemonCapableProviders()` TypeScript helpers (#656)
- **PTY adapter** (`tools/daemon/pty-adapter.mjs`) — bridge any Tier 1 platform TUI over a pseudo-terminal using `node-pty`; `aiwg daemon pty start <platform>`, `pty list`, `pty stop <session-id>`; session state persisted to `.aiwg/daemon/pty/<sessionId>.json`; `node-pty` added as `optionalDependency` with graceful fallback error (#656)
- **Contract syntax for skills** — `requires:`, `ensures:`, `errors:`, `invariants:` contract fields on SKILL.md files; `contract-manifest` skill generates human-readable chain manifests with data-flow wiring analysis and optional Mermaid diagram; `contract-validate` skill gives pass/fail verdict on skill chains at wiring time, catching missing dependencies before runtime; `--strict` and `--external` flags (#644)
- **`issue-planner` skill** (sdlc-complete) — research-grounded SDLC issue planning; dispatches parallel research agents (best practices, current research, vendor docs), generates full SDLC doc corpus with gate checks, produces prioritized dependency-ordered issue backlog, requires human approval before filing, outputs `address-issues` invocation instructions
- **`induct-research` skill** (research-complete) — research analogue of `address-issues`; accepts any target (file, directory, URI, issue reference), classifies and analyzes sources in parallel, routes filing to Gitea MCP / GitHub CLI / Jira REST / Codehound; `--induct-research` flag on `issue-planner` collects references found during parallel research and files structured induction tasks; supports `AIWG_RESEARCH_REPO` env var
- **`human-authorization` rule** (HIGH, aiwg-utils) — agents must seek explicit human authorization before irreversible or high-stakes actions implied by findings; Rule 1: recommendation ≠ authorization; five enforceable rules with agent authoring guidance (#655)
- **OpenProse antipattern rules** (aiwg-utils) — 5 rules derived from OpenProse research (#617): `god-session` (HIGH: >7 responsibilities → decompose), `vague-discretion` (HIGH: gate conditions must be concrete and measurable), `context-bloat` (MEDIUM: pass file paths not contents), `parallel-then-synthesize` (MEDIUM: parallelism is wrong when tasks aren't independent), `implicit-dependencies` (MEDIUM: sub-agents start clean; pass all context explicitly); aiwg-utils grows from 7 to 13 rules (#648)
- **`prose-detect` skill** (prose-integration) — centralized OpenProse installation detector; 7-signal priority chain: env var → AIWG config → AIWG-local install → project plugin manifest → user home → global CLI → not found; `autoDetect: true` in manifest (#649, #650)
- **`prose-install` skill** (prose-integration) — install OpenProse with user confirmation; `npx` → `git clone` fallback
- **`prose-resolution` rule** (prose-integration) — canonical path resolution protocol; all prose skills delegate detection to `prose-detect` rather than hardcoding paths
- **prose-integration addon completion** — `prose-detect` + `prose-install` + `prose-resolution` + `docs/integration-guide.md`; Step 0 detection centralized across all prose skills (`prose-run`, `prose-validate`, `forme-manifest`, `prose-reader`); contract fields on all skills; 7-skill count (#649)
- **`[all]` platforms token** — `platforms: [all]` in agent `.md` files replaced with the target platform at deploy time; `injectPlatform` option in base deployer; 5 grounding/diversifier agents converted from hardcoded lists to `[all]` (#651, #652, #653)
- **OpenProse research review report** (`docs/reports/openprose-review.md`) — basis for 5 new antipattern rules (#617)
- **agentic-installer addon** — `setup.aiwg.io/v1` SetupManifest YAML language for cross-platform, script-first installation workflows; JSON Schema covering all 7 step types (`script`, `detect`, `ask`, `verify`, `agentic`, `platform-route`, `chain`), platform matrix, params, prerequisites, recovery procedures, and briefing; `installer-agent` specialized persona; 3 skills: `setup-generate` (discover project, assemble manifest + scripts), `setup-run` (execute manifest with platform detection, param collection, 6-phase flow, dry-run, recovery confirmation), `setup-validate` (schema + reference + consistency + agentic-step audit); 11 cross-platform script templates (clone, install-deps for ubuntu/fedora/macos/windows, configure, verify, reset, hub-chain); lib helpers (`detect.sh`, `params.sh`, `verify.sh`, `detect.ps1`); rules: `installer-safety` (7 mandatory behaviors) + `installer-authoring` (5 rules); script-first design — `type: agentic` is exception handling only (#663–#667)
- **`aiwg-ci-safety` rule** (HIGH, aiwg-dev) — agents may never modify `.gitea/workflows/` without explicit human authorization; CI templates for user projects live in `agentic/code/frameworks/*/ci/` (inert source data, not AIWG's own CI); Gitea is the authoritative CI forge; GitHub is publish-only mirror; no agentic self-modification of CI pipelines; includes per-action allowed/forbidden table; `skill-placement.md` and `addon-boundaries.md` updated with CI template disambiguation sections
- **Skill namespace strategy** — ADR-driven three-layer system: `aiwg-{name}` slug prefix (universal collision prevention), `aiwg/` subdirectory (structural isolation), `namespace: aiwg` frontmatter (MCP alignment); collision detection wired into `use`, `doctor`, and `validate-metadata`; per-platform deployment adapters for all 10 platforms (#695–#704)
- **`aiwg serve`** — local HTTP server for AIWG web dashboard; WebSocket PTY stream bridge delivers live terminal output to the browser (#serve)
- **Mission Control Web UI** — React app with xterm.js terminal viewer, telemetry dashboard, fortemi-react panel (#web)
- **Artifact index: typed edges & filename-metadata** — cross-graph set queries (`union`, `intersection`, `difference`); citation sidecar parser; typed edge extraction; filename-metadata node strategy derives metadata from filename regex without reading file content; `MetadataSupplementConfig` enriches nodes from sidecar files (#723)
- **`no-time-estimates` rule** (HIGH, aiwg-utils) — agents must express effort in agent-oriented units: scope count (atomic deliverables), agent count and roles, parallelism map (parallel vs sequential batches), pass estimate (iterations to quality gate); wall-clock estimates (`N days/hours/weeks`, "expected duration", "this should be quick") are prohibited (#708)
- **Graph backends guide** (`docs/development/graph-backends.md`) — documentation for pluggable graph storage backends
- **Specification-complete layer (Layer 3 + Layer 4)** — 6 new behavioral specification templates (`state-machine-spec` DES-SM, `decision-table` DES-DT, `activity-diagram-spec` DES-ACT, `method-interface-contract` DES-MIC, `data-flow-spec` DES-DFS, `pseudocode-spec` DES-PSC) in `analysis-design/`; `flow-use-case-realization` orchestration command for multi-agent behavioral spec generation with 4-reviewer parallel review; ABM gate deepened with sections 3a (behavioral specs ≥80% coverage) and 8a (pseudo-code specs for first iteration); `check-traceability` rewritten for 6-layer enforcement (UC ↔ BS ↔ IC ↔ PC ↔ code ↔ tests) with orphan detection, `--fix` mode, and coverage metrics; `sdlc-accelerate` Phase 3 updated; 8 new `.aiwg/` artifact directories in framework manifest (#740–#746)
- **`agentic/code/addons/semantic-memory/`** — kernel addon: `memory-ingest`, `memory-lint`, `memory-query-capture`, `memory-log-append`, `memory-log-render` skills; `memory-log-event` JSON Lines schema with 10 op types (5 kernel + 5 training-specific); `core: true, autoInstall: true` (#823, #826, #827, #828, #829)
- **`agentic/code/addons/llm-wiki/`** — wiki addon with 5 profile templates (book-companion, personal, research-deep-dive, business-team, generic), schemas/page-schema, Obsidian integration docs, and `crossRefStyle: wikilink` topology; depends on semantic-memory kernel (#831)
- **`MemoryTopology` + `CrossRefStyle` TypeScript types** — in `src/extensions/types.ts`; extends `MemoryFootprint` with optional `topology` field; declared in all 4 consumer framework manifests (sdlc-complete, research-complete, forensics-complete, media-curator) (#825)
- **Profile picker for addons with multiple templates** — `aiwg use <addon>` detects `templates[]` array in plugin manifest, prompts user interactively (TTY) or reads `--profile <name>` flag, writes chosen selection to `.aiwg/<namespace>/config.json`
- **`validateMemoryTopology()` method** — in `MetadataValidator` at `src/plugin/metadata-validator.ts`; validates 6 required topology fields, `crossRefStyle` enum membership, `.aiwg/` namespace convention, non-empty `derivedPages`, array types for `lintRules`/`ingestRequires`
- **Kernel delegation sections** — `induct-research`, `intake-from-codebase`, `workspace-health`, `corpus-health`, `cleanup-audit` SKILL.md files gain a "Kernel Delegation" section documenting how they call `memory-ingest`/`memory-lint` under the hood while preserving their public UX (#830)
- **ADR-021** — Semantic Memory Kernel Architecture at `.aiwg/architecture/decisions/ADR-021-semantic-memory-kernel.md`; locks 6 decisions (location, interface, schema location, consumer ID resolution, backward compatibility, log format) (#824)
- **ADR-022** — AI Training Framework at `.aiwg/architecture/decisions/ADR-022-training-framework.md`; locks 10 decisions for the training-data pipeline; framework subsequently extracted to standalone repo (#822)
- **`training` marketplace plugin entry** — in `.claude-plugin/marketplace.json`, external source pointing at `jmagly/aiwg-training`; installable via `/plugin install training@aiwg` or `aiwg use training`
- **`docs/extensions/extension-types.md` MemoryTopology section** — documents the new contract with field table, `CrossRefStyle` enum table, and research-complete example
- **`aiwg session`** — self-healing session launcher; 5-step pre-flight: version check → `aiwg doctor` → deployment check → optional MCP inject → provider launch; `mcp` subcommand injects configured servers first; `--provider <p>` overrides provider; `--no-repair` skips auto-repair; repair escalates sync → npm reinstall → `aiwg feedback` escape hatch; IDE providers (cursor, windsurf, copilot, etc.) receive identical pre-flight then print start instructions instead of spawning a binary (#885)
- **`aiwg feedback`** — GitHub issue submitter; collects system context automatically (aiwg version, Node.js, OS, arch, provider, installed frameworks, shell); `--type bug|feature|doc|other`, `--title`, `--body`, `--no-context` flags; submission via `gh issue create --repo jmagly/aiwg` → browser URL pre-fill → stdout fallback; `report` alias; interactive prompts when TTY; surfaces from `aiwg doctor` on unresolvable issues (#885)
- **Session and feedback skills** — `agentic/code/addons/aiwg-utils/skills/session/SKILL.md` and `agentic/code/addons/aiwg-utils/skills/feedback/SKILL.md`; trigger patterns, examples, and clarification prompts for natural-language invocation across all providers (#885)
- **ADR template: Source Verification & Claim Tracking section** — table of Claim / Source / Verified / Date; unverified claims checklist blocks L2 acceptance (#863)
- **ADR template: Implementation Sketch section** — annotated code block, key integration points, known sharp edges (Phase 3) (#854)
- **ADR template: Concurrency and Shared State Model section** — concurrency model declaration, shared mutable state inventory, race conditions and mitigations, explicit out-of-scope (Phase 3) (#856)
- **ADR template: Testing Strategy section** — 5 layers: unit, integration, contract, performance, regression guard (Phase 3) (#858)
- **ADR template: Definition of Done section** — 5-level table L1 Proposed → L5 Verified; blocking-items checklist (Phase 3) (#860)

### Removed

- **Legacy `.aiwg/frameworks/registry.json` migration plumbing** (supersedes #1047 + #1054). The migration helpers (`migrateLegacyRegistry`, `checkLegacyRegistry`, `cleanupLegacyRegistry`, `hasElapsedMinorVersions`) and the `aiwg doctor` legacy-registry check were added on the assumption of external users with pre-#1040 installs. No such users exist — the only file in the wild was this repo's own dogfooding artifact. Removed: ~150 lines from `src/config/aiwg-config.ts`, the call from `aiwg init`, the wire-up from `aiwg refresh` (added in #1054 then immediately ripped out), the doctor check, the test block in `aiwg-config.test.ts`. Future fresh installs start on the unified `aiwg.config.installed` registry directly.
- **`agentic/code/frameworks/training-complete/`** (91 files, ~18K lines) — extracted to standalone repo at [`jmagly/aiwg-training`](https://github.com/jmagly/aiwg-training). History preserved via `git subtree split` (8 commits). Users on the training workflow install via `/plugin install training@aiwg`. Existing `.aiwg/training/` artifacts remain forward-compatible via the `memory.topology` contract.

### Changed

- **BEHAVIOR.md canonical shape — `metadata.scope` / `metadata.triggers`** (#1025). Three layers (files, daemon loader, validator) had diverged into three different shapes for the same data. Standardized on nested `metadata.*`. Daemon `behavior-loader.mjs` now reads `meta.metadata?.scope` and `meta.metadata?.triggers` (plural); replaced its homegrown YAML parser with `js-yaml` so it can actually represent nested mappings. Validator tightened to require `metadata.triggers` (dropped singular-trigger acceptance). All 7 BEHAVIOR.md files (6 from #1025, 1 lowercase `concierge.behavior.md` caught by #1018's CI run) updated to canonical shape.
- **`aiwg sync` renamed to `aiwg refresh`** (#932). The new name better matches the operation's semantics (re-deploy + health check, not a directional sync). `aiwg sync` continues to work as a deprecated alias and emits a runtime warning. Canonical docs (`CLAUDE.md`, `AIWG.md`, `docs/cli-reference.md`, agent playbooks, self-maintenance rule and templates) now use `aiwg refresh`. Removal target: after the 2026.5.x stable line; the alias will be removed in 2026.6.0.
- **Skill consumers respect resolved remotes** (#997). `commit-and-push`, `issue-create`, `issue-list`, `pr-review` SKILL.md prose updated to consult `resolveRemotes()` / `resolveRemoteProvider()` with explicit precedence: `--provider` flag > resolved `remotes.issue_tracker` URL host > legacy `.aiwg/config.yaml` ticketing > `CLAUDE.md` block > `local`. Self-hosted instances classified as `'unknown'` prompt the operator rather than guessing.
- **Skill consumers respect resolved delivery policy** (#1007). Same skills updated to consult `resolveDelivery()` for `mode` (controls branch creation + PR opening), `force_push_policy`, `require_signed_commits`, `branch_naming`, `merge_style`, `delete_branch_on_merge`, `require_ci_green`, `auto_close_issues`, `issue_comment_on_cycle`. Defaults preserve today's behavior.
- **`aiwg index build --help`** — now shows full usage including `--scope`, `--all`, user-defined graph usage, and `defaultBuild` semantics; `--graph` description updated to mention user-defined names (#660)
- **`docs/cli-reference.md` index section** — documents user-defined graphs (`index.graphs` config schema), `defaultBuild` behavior, doc-only repo example, and `--all` flag (#660)
- **`aiwg add-command`** — deprecated; `aiwg add-skill` is the replacement
- **All CLI commands** — consistent output via shared `ui.ts` module
- **`aiwg use` post-deploy guidance** — `<provider>/<framework>` keys; platform-appropriate next steps
- **Command count** — 50 → 55 (`behavior`, `daemon-init`, `ralph-attach`, `session`, `feedback` added)
- **`aiwg doctor` recovery output** — now surfaces `aiwg session --no-repair`, `aiwg sync`, and `aiwg feedback --type bug` as concrete recovery options when health checks fail
- **`aiwg serve` install hint** — updated to include `ws` (`npm install hono @hono/node-server ws`)
- **`tools/eval` — matric-eval dependency** (#488) — `EvalRunner` renamed to `AiwgEvalRunner` (composes `MatricEvalClient`); `EvalRunner` kept as backward-compat alias; `tools/eval/.npmrc` scopes `@matric` packages to Gitea registry
- **`aiwg use` output** — modern clean progress UI replacing legacy verbose output (#428)
- **`aiwg index stats`** — `--graph` flag now optional; flexible graph type support (#425, #426)
- **`aiwg index`** — deploy next-steps guidance added to post-build output; verbose mode flag
- **`CommandCategory` type** — extended with `'orchestration'` (Mission Control), `'config'`, `'ops'`, and `'daemon'` variants; CLI handler index updated with `skillsHandler`, `configHandler`, `opsHandler`
- **BEHAVIOR.md platform lists** — all 6 behaviors updated to the full Tier 1 daemon set `[claude-code, opencode, warp, openclaw, codex]`; `cursor` removed from concierge (Tier 3 — VS Code extension host required) (#654, #656)
- **aiwg-utils rule count** — 7 → 13 rules (added `human-authorization` + 5 OpenProse antipatterns)
- **aiwg-utils rule count** — 13 → 14 rules (added `no-time-estimates`)
- **CI enforcement** — "CI Green Before Done" added as HIGH enforcement rule in `CLAUDE.md`
- **`test:ci` simplified** — single `vitest run` covering unit + integration + characterization + smoke; UAT config kept separate
- **Framework count** — 6 → 5 locally (training-complete extracted to marketplace). Still 6 total if the marketplace plugin is counted.
- **Addon count** — 21 → 23 (+ `semantic-memory`, + `llm-wiki`)
- **`memory.topology` added to 4 framework manifests** — sdlc-complete, research-complete, forensics-complete, media-curator each declare their topology contract (#825)
- **`memory-log-event` schema extended** — 5 new training-specific op types (`format-convert`, `decontamination-check`, `preference-generate`, `synthetic-generate`, `dataset-version`); no breaking changes to existing kernel ops (#834)
- **Default consumer addon behavior** — when Fortemi is absent, `aiwg index` serves as the graph fallback (ADR-021 D3)
- **`.claude-plugin/marketplace.json` version** — bumped from stale `2024.12.4` to `2026.4.0` across marketplace metadata and all plugin entries

### Fixed

- **Cross-framework agent/command/skill filename collisions no longer overwrite silently** (#1169). When two AIWG frameworks ship a file with the same filename but different content (e.g., `forensics-complete` and `research-complete` both ship `agents/acquisition-agent.md`), the second deploy used to clobber the first with no signal. `tools/agents/providers/base.mjs deployFiles()` now records the framework slug per managed file in the `.aiwg-manifest.json` sidecar and detects two collision modes: **within-batch** (two source files in one deploy call) and **cross-batch** (a new deploy hits an existing sidecar entry from a different framework). Default is skip-with-loud-warning; `--force` is the explicit override (last-wins, sidecar updates owner). Identical-content cases still skip silently as `duplicate-identical`. New `extractFrameworkSlug()` helper exported. ADR at `.aiwg/architecture/adr-cross-framework-collision-guard.md` covers the design and defers source rename of the four documented collisions to [#1211](https://git.integrolabs.net/roctinam/aiwg/issues/1211) for 2026.5.1. 10 new unit tests in `test/unit/agents/cross-framework-collision.test.mjs`.
- **Claude Code `settings.json` hooks field shape** (#107). `aiwg use --provider claude` (and the CLI extension hook auto-registration introduced in #480) wrote the `hooks` field as an array of `{matcher, hooks}` objects. Claude Code requires an object keyed by event name with matcher-group arrays as values — the array shape was silently ignored and surfaced as `"hooks" must be an object mapping event names to matcher arrays; received array. This field was ignored.` from `/doctor`. Fixed in both writers (`src/extensions/claude-hooks-installer.ts` and `src/cli/cli-extension-loader.ts`). Already-broken settings heal in place: a legacy array-shaped `hooks` field is migrated to the object form on read; operator-authored entries are preserved; the AIWG-marker detector recognizes both shapes so backups are not double-created during migration. Run `aiwg refresh` (or any `aiwg use --provider claude`) once after upgrading to convert existing installs. 19 new/updated unit tests across the two installer modules.
- **Managed-marker no longer breaks Claude Code agent discovery** (#1059). `addManagedMarker()` in `tools/agents/providers/base.mjs` prepended `<!-- aiwg:managed v... ... -->` as line 1 of every deployed `.md` file, which shifted YAML frontmatter to line 2 and made all 189 deployed agents invisible to Claude Code's Task tool (`subagent_type` resolver). The marker now lives **inside** the frontmatter as a YAML comment (`# aiwg:managed v... ...`), keeping `---` on line 1 where the parser expects it. Files without frontmatter retain the legacy HTML-comment-at-top form (no parser to break). `MANAGED_MARKER_RE` matches both forms so legacy-marker files are still recognized as already-managed and don't get a second marker. Same fix benefits Codex / Copilot / Cursor / Factory / OpenCode / Warp / Windsurf / OpenClaw — every provider that loads agents from frontmatter. After upgrading, run `aiwg refresh` to redeploy.
- **`aiwg doctor` no longer false-positives on framework workspace dirs** (#1058). `src/extensions/project-local-discovery.ts` treated every directory under `.aiwg/{extensions,addons,frameworks,plugins}/` as a candidate bundle and emitted a "manifest.json absent" error for any directory without one. That tripped on the 7 framework workspace dirs (`archive/`/`projects/`/`repo/`/`working/`) created by `initializeFrameworkWorkspace()` under the same path namespace, producing `Validation: ✗ 7 errors` on every clean project. The scanner now silently skips directories without `manifest.json` — same "absent = not a bundle" semantics already applied to non-directory entries. `loadAndValidateManifest()` keeps its strict semantics for direct callers.
- **Factory provider now transforms SKILL.md frontmatter on deploy** (#1056). `tools/agents/providers/factory.mjs` previously copied `SKILL.md` verbatim, so deployed `.factory/skills/*/SKILL.md` retained Claude-native tool names (`Bash`, `Write`, `MultiEdit`) and bare model shorthand (`opus`/`sonnet`/`haiku`) inside `commandHint`. New `transformSkillFrontmatter()` rewrites indented `commandHint.allowedTools` and `commandHint.model`; new `mapAllowedToolsString()` tokenizer respects allowlist parens (`Bash(git *, gh *)` → `Execute(git *, gh *)`). `deploySkillDir()` in `base.mjs` now accepts an optional `transformSkillMd` callback so other providers can adopt the same pattern. 3 new regression tests in `test/integration/factory-deployment.test.ts`.
- **`aiwg doctor` is now provider-aware** (#1057). Doctor previously hardcoded `.claude/agents` and `.claude/commands`, so projects deployed to Factory/Codex/Cursor/Copilot/etc. saw "No agents deployed" even when their provider directories were fully populated. New `--provider <name>` and `--all-providers` flags; auto-detection scans `.factory/droids`, `.codex/agents`, `.cursor/agents`, `.github/agents`, `.opencode/agent`, `.warp/agents`, `.windsurf/agents`, plus root `AGENTS.md`. Per-provider checks resolve paths from each provider module's exported `paths.{agents,commands}` instead of literal `.claude/*` strings; output now reads "Factory Agents", "Codex Agents", etc. 3 new regression tests in `test/unit/cli/doctor.test.ts`; CLI reference updated.
- **`Test` and `Build` jobs in `ci.yml` no longer fail on sharp native build** (#1018). Both jobs used `npm ci --omit=optional` with a comment claiming the flag skipped sharp. It didn't. Sharp is a hard dep of `@xenova/transformers` (devDep); the flag actually skipped sharp's *own* `optionalDependency` on the prebuilt `@img/sharp-libvips-linux-x64` binary, forcing a from-source gyp build that needed `libvips-dev` headers. Plain `npm ci` resolves sharp's prebuilt cleanly. Other workflows already used plain `npm ci`; only `ci.yml` carried the inherited workaround.
- **Five broken SKILL.md frontmatter files** (#1013). `argumentHint` values in 4 ralph skills (`ralph`, `ralph-status`, `ralph-abort`, `ralph-resume`) contained unquoted brackets and trailing tokens that failed strict YAML parse. Quoted as single-quoted scalars. `eval-report/SKILL.md` was missing the required `name:` field — added.
- **All 59 invalid YAML frontmatter files across SKILL.md corpus** (#1015 Phase A.1). Same bug class as #1013, found by a corpus-wide audit using the new linter. Fixed in three per-component PRs across uat-mcp, prose-integration, rlm, media-curator (9 files), media-marketing-kit (19 files), and sdlc-complete (31 files).
- **All 308 SKILL.md files missing `name:` field** (#1015 Phase A.2). Mechanical backfill from parent directory name across aiwg-utils, aiwg-dev, aiwg-evals, forensics-complete, guided-implementation, nlp-prod, research-complete, voice-framework, and the components from A.1. Source corpus (`agentic/code/`) is now 410/410 clean against the linter.
- **`aiwg validate-metadata`'s recursive walker now sees SKILL.md** (#1014). Previously hardcoded to match only `manifest.md`/`BEHAVIOR.md`, so SKILL.md was invisible to directory-mode validation even though the validator demanded `metadata.*` fields the files didn't have.
- **`aiwg ops init` no longer creates nested ops workspaces** (#935). `initWorkspace()` walks up from the target home looking for `OpsInventory.yaml` and refuses with a clear error and a suggested sibling path if it finds one in an ancestor.
- **`aiwg validate-metadata` no longer crashes with `ERR_MODULE_NOT_FOUND`** (#1001). Import path drift in `tools/cli/validate-metadata.mjs:11` — was importing `../../dist/plugin/metadata-validator.js`, but the TS build emits to `../../dist/src/plugin/metadata-validator.js`. One-line fix plus a regression test that parses the import statement and asserts it resolves to a real file on disk.
- **`aiwg use all` rule count off-by-many** — `countDeployedArtifacts` was counting `.md` files in the rules directory; with `deployIndexOnly: true`, only `RULES-INDEX.md` exists on disk, so it always returned 1; replaced with `countRules()` that parses `(N rules — ...)` section headers in RULES-INDEX files and sums across all indexes
- **`aiwg index build` hard-error on docs-only repos** — `codebase` graph (defaultBuild, scans `src/test/tools`) now skips with a warning when those directories don't exist; only errors when `--graph codebase` is explicitly requested (#658)
- **User-defined graphs not recognized via `--graph`** — `loadUserGraphConfigs` used `require()` which is undefined in ESM; replaced with static `import`; user graphs in `.aiwg/config.yaml` now load and validate correctly (#659)
- **`sdlc-accelerate` handler** — "No handler found" error; `SdlcAccelerateHandler` implemented
- **External agent loop startup crash** — `SemanticMemory` constructors received objects instead of path strings; loops always dead on arrival
- **`--dangerous` flag position** — was appended after prompt; moved before so it is treated as CLI flag
- **Codex model IDs** — `gpt-5.3-codex` aliases now map to gpt-5.4 canonical IDs (#590)
- **OpenCode 1.0.x adapter** — event-stream parsing updated; silent output drop fixed
- **Factory command injection** — `$ARGUMENTS` now injected at deploy time (#454)
- **`aiwg doctor` AIWG_ROOT resolution** — resolved from script location, not hardcoded path
- **`aiwg index` without `--graph`** — multi-graph architecture; stats/query/deps now work without flag (#425)
- **`ralph-external`, `ralph-memory`, `ralph-config` handlers** — three CLI commands had no registered handlers; all implemented
- **`aiwg use sdlc --provider hermes`** — unknown provider error; Hermes provider added
- **`commit-and-push`** — oversized prompt trimmed; local model documentation added (#436)
- **`sync.ts` unused variable warnings** — removed unused `providerResult` and `versionResult` assignments
- **Incorrect provider configs** — Hermes was listed as a spawnable binary (it is not; it is model-series-only accessible via Ollama or MCP); OpenCode's `promptPrefix` was missing `['run']`, causing invocations without the required subcommand
- **`CommandCategory` type** — added `'daemon'` variant; fixed missing categories in help order
- **`new-project` in skills catalog** — was not registered in `skills.manifest.json`; now correctly discoverable via `aiwg skills list`
- **OpenCode deployment** — stop deploying agents and commands to non-existent `.opencode/agent/` and `.opencode/command/` directories (#705)
- **Windsurf skill deployment** — implement native skill deployment; remove experimental label (#703)
- **Platform-resolver stale entries** — Factory, Warp, and Copilot corrected from one-level/unknown to deep-recursion per source-confirmed research (#702, #704)
- **CI test scope** — `test:ci` widened to run all non-inference tests (characterization, integration, smoke); only live inference UATs excluded; removed redundant "Full Test Visibility" CI job; `package-lock.json` synced
- **Manifest skill arrays** — 34 aiwg-utils skills and 7 RLM skills migrated from `commands[]` to `skills[]` in `manifest.json` (#706, #707)
- **Agent-loop addon** — renamed from `ralph/`; 5 missing skills registered; Wiggum terminology removed; `al`/`agent-loop` aliases added (#705)
- **Gitea reference leakage in user-facing docs** — `README.md` + `docs/install/non-interactive.md` + `docs/project-local/overview.md` + `docs/daemon-guide.md` pointed at internal `git.integrolabs.net` URLs; replaced with public `github.com/jmagly/*` equivalents. Internal CI documentation (`docs/contributing/ci-cd-secrets.md`, `docs/frameworks/sdlc-complete/token-security.md`) retains Gitea references as intended — that's where the CI runs.
- **`aiwg serve` WebSocket 404** — `createNodeWebSocket` does not exist in `@hono/node-server` v1.19.14; `try/catch` silently swallowed the import failure leaving `upgradeWebSocket = null`; all `/ws/sandbox/:id` connections returned 404; replaced with `setupWebSockets()` using native Node.js `upgrade` event + `ws` package `WebSocketServer({ noServer: true })` (#851)
- **`ws` package not installed for `aiwg serve`** — `ws` added to `optionalDependencies` and to the auto-install list run on first `aiwg serve` launch

### Internal

- New unit tests: 7 for `aiwg skill-lint` rubric (perfect/stub/no-triggers/agent-only/broken-YAML fixtures + threshold modes). Behavior-loader and concierge integration tests updated for canonical metadata.* shape.
- `.agents/` deployment directory is now gitignored, mirroring `.claude/` and `.codex/` (#949). 395 generated files removed from the index; regenerable via `aiwg use`.

[Unreleased]: https://github.com/jmagly/aiwg/compare/v2026.3.2...HEAD

## [2026.3.2] - 2026-03-04 – Service Release

| What changed | Why you care |
|--------------|--------------|
| **`--use-dev` delegates full CLI** | `aiwg` commands now run from local build — not just framework content, but all subcommands including `aiwg index` |
| **`aiwg index` multi-graph fixes** | `stats`, `query`, `deps` without `--graph` now work correctly across project + codebase graphs |
| **`--graph` flag documented** | CLI reference updated with multi-graph architecture, `framework` graph usage, and new output format |

### Fixed

- **`aiwg index stats` without `--graph`** failed with "No artifact index found" because `indexExists()` checked the legacy `.aiwg/.index/metadata.json` root path; all three stats/query/deps commands now check graph subdirectories first with legacy fallback
- **`aiwg index query` without `--graph`** same legacy-path bug — now searches across `project` + `codebase` graphs combined
- **`aiwg index deps` without `--graph`** same legacy-path bug — now merges dependency graphs from all project-local graphs
- **`--use-dev` only changed framework content source** — CLI commands still ran npm-installed code; now the entry point delegates all subcommands to the dev repo's `src/cli/facade.mjs`
- **`--use-dev` always pointed at npm package root** — now accepts an explicit path argument (`aiwg --use-dev /path/to/repo` or `aiwg --use-dev .`)

### Changed

- `aiwg index stats` without `--graph`: human-readable output shows each graph with a section header; JSON mode returns object keyed by graph name
- `aiwg index query` without `--graph`: searches across all project-local graphs, returns merged results
- `aiwg index deps` without `--graph`: merges dependency graphs from all project-local graphs before traversal
- `switchToDev()` validates that `src/cli/facade.mjs` exists in the target repo and prints CLI source path in confirmation output

### Added

- **Framework graph** (`--graph framework`): `aiwg index build --graph framework` indexes `agentic/code/` + `docs/` (1,625 artifacts); stored in `.aiwg/.index/framework/`
- **Multi-graph architecture documented** in `docs/cli-reference.md` — graph types table, `--graph` flag on all index subcommands, output structure, examples

---

## [2026.3.1] - 2026-03-03 – "Discovery & Durability" Release

| What changed | Why you care |
|--------------|--------------|
| **`aiwg index` subsystem** | Agents can search, query deps, and inspect stats across `.aiwg/` artifacts |
| **Forensics agent gap-fills** | 6 agents and 3 commands rewritten with full operational detail; 660-line integration test suite |
| **Color Palette addon** | Standalone addon for accessible color palette generation with WCAG contrast checking |
| **Ralph external crash resilience** | SnapshotManager API fixed, state cleanup, e2e tests with real process spawning |
| **`.aiwg/` tracked in git** | Project artifacts version-controlled, excluded from npm/edge deploys |
| **Documentation accuracy sweep** | 7 drift items fixed: agent counts, command totals, skill manifest gaps, Copilot path mismatch |
| **`--model` blanket override** | `aiwg use sdlc --model sonnet` overrides all agent model selections |
| **`--use-dev` testing flag** | Point CLI at local repo checkout for framework development |

### Added

- **`aiwg index` subsystem** — `build`, `query`, `deps`, `stats` subcommands for artifact discovery with multi-graph architecture, incremental builds, and JSON output
- **`artifact-discovery` rule** — agents must query the index before phase work and check deps before modifying artifacts
- **`artifact-lookup` skill** — natural language artifact search via `aiwg index` CLI
- **`aiwg cleanup-audit` command** — dead code analysis with `dead-code-analyzer` agent and `cleanup-audit` skill
- **`--model` blanket override** — `aiwg use sdlc --model sonnet` sets all agent model selections in one flag
- **`--use-dev` flag** — `aiwg --use-dev` points CLI at local repo for development testing
- **Color Palette addon** (`agentic/code/addons/color-palette/`) — 3 skills (color-palette, color-accessibility, color-trends), 2 templates, 1 rule
- **`.aiwg/` git tracking** — project artifacts version-controlled with npm/edge exclusion gates
- **Forensics integration tests** — 660-line test suite validating agent structure, manifest integrity, skill completeness, and cross-references
- **Ralph external e2e tests** — real process spawn tests with stub CLI and provider adapter fixtures
- **How AIWG Works guide** (`docs/how-it-works.md`) — plain-language explainer with research-grounded memory section
- **Mobile responsive CSS** for docsite template

### Changed

- **Forensics agents** — 6 agents rewritten with full operational procedures: acquisition-agent, container-analyst, log-analyst, network-analyst, persistence-hunter, triage-agent (#381-391)
- **Forensics commands** — 3 commands expanded: forensics-acquire, forensics-investigate, forensics-triage
- **Forensics skills** — 3 skills updated: container-forensics, evidence-preservation, log-analysis
- **Skills manifest** — added 12 missing entries (code-chunker, decompose-file, issue-driven-ralph, 9 regression-* skills); 20 → 32 total
- **Skill inventory** — SDLC skills 12 → 32 listed, total 53 → 75
- **CLAUDE.md** — command count 44 → 47, Ralph category 4 → 7, added ralph-external/memory/config
- **cli-reference.md** — agent count 35+ → 90, Ralph category 4 → 7, total 44 → 47
- **SDLC README** — agent count 70+ → 90
- **Multi-graph index architecture** — content type graphs, dependency graphs, incremental build support
- **`traceability-check` skill** — updated to use `aiwg index` for artifact lookup

### Fixed

- **`platform-paths.ts`** — Copilot commands path `.github/commands` → `.github/agents` to match JS provider behavior
- **Ralph external SnapshotManager** — API mismatch causing fatal path error during loop execution
- **Agent loop state cleanup** — completed loops now clean up state files automatically
- **Unused `basename` import** in ralph-launcher removed
- **CI `.aiwg/` exclusion** — added gates to build-plugins, ci, and npm-publish workflows

---

## [2026.3.0] - 2026-03-01 – "Model Sync" Service Release

| What changed | Why you care |
|--------------|--------------|
| **Factory provider model IDs fixed** | `aiwg use sdlc --provider factory` now deploys valid model IDs that Factory can resolve |
| **All provider model configs updated to 4.6** | Claude, Factory, Windsurf, and shorthand mappings now reference `claude-opus-4-6`, `claude-sonnet-4-6`, `claude-haiku-4-5-20251001` |
| **Factory shorthand decoupled** | `mapModel()` prefers `factory_shorthand` over shared `shorthand`, preventing future cross-provider drift |

### Fixed

- **`factory.mjs` DEFAULT_FACTORY_MODELS** — removed invalid `anthropic/` prefix and updated stale model IDs (`anthropic/claude-opus-4-20250514` → `claude-opus-4-6`, etc.) (Fixes #410)
- **`base.mjs` loadModelConfig() fallback** — replaced invalid IDs (`claude-opus-4-1-20250805`, `claude-haiku-3-5`) with current Factory-compatible IDs
- **`models.json` factory section** — updated from stale `claude-haiku-3-5` / `claude-opus-4-5-20251101` to current model IDs
- **`models.json` shorthand section** — updated shared shorthand mappings to current model IDs

### Changed

- **`models.json` claude + windsurf sections** — updated to Claude 4.6 model family
- **`factory.mjs` mapModel()** — now prefers `factory_shorthand` config key over shared `shorthand` for Factory-specific model resolution

---

## [2026.2.15] - 2026-02-28 – "Doc Site" Release

| What changed | Why you care |
|--------------|--------------|
| **docs.aiwg.io CI/CD pipeline** | Doc site builds and deploys automatically on every release tag via Gitea Actions |
| **Doc site build validation** | PRs and pushes that touch `docs/` trigger build checks to catch broken links early |
| **Broken link remediation** | 25 doc files fixed — relative links to source files replaced with absolute URLs that resolve on the published site |
| **Welcome page refresh** | Landing page now showcases all 5 frameworks, 5 addons, and 8 platform targets |

### Added

- **`docsite-build.yml` workflow** — validates doc site builds on push/PR to main/develop when `docs/**` changes; uses dbbuilder publisher with `strictLinks: true` for broken link detection
- **`docsite-deploy.yml` workflow** — builds and deploys doc site to docs.aiwg.io on `v*` tag push via SSH/rsync to integro-dev-004; includes build verification, SSH key management, and post-deploy checks
- **Reliability Patterns section** on welcome page — Agent Loop, Ensemble Validation, @-Mention Traceability
- **CLI Reference** quick link on welcome page

### Changed

- **Welcome page** — expanded from 3 pillars to full framework/addon showcase (SDLC Complete, Forensics Complete, Research Complete, Media/Marketing Kit, Media Curator, RLM, Voice Framework, Testing Quality, Writing Quality, UAT-MCP)
- **25 doc files** — replaced broken relative links (`../../agentic/`, `../../tools/`, `../../CHANGELOG.md`) with absolute GitHub URLs and `aiwg.io/changelog`
- **`docs/getting-started/prerequisites.md`** — fixed "Continue to Quick Start" link to point to `docs/quickstart.md`
- **`docs/overrides/index.html`** — converted search shortcut from `<span>` to accessible `<button>` element
- **`docs/overrides/styles.css`** — added `.shortcut-btn` styles for status bar interactivity
- **`docs/config.json`** — updated lead copy, expanded pillars to per-framework descriptions, added CLI Reference quick link

### Fixed

- **Root-level doc pages** — cleaned up and moved legal pages to proper locations

---

## [2026.2.14] - 2026-02-28 – "Forensics & Manageability" Release

| What changed | Why you care |
|--------------|--------------|
| **Forensics-complete DFIR framework** | Full digital forensics lifecycle — 13 agents, 9 commands, 10 skills, Sigma hunting, evidence chain-of-custody |
| **Codebase manageability tooling (#402-#407)** | Rules, commands, and skills to keep agent-generated code within context window limits |
| **17 specialist agents + team compositions** | Cloud platform experts (AWS/Azure/GCP), framework specialists (React, Django, Spring Boot), and 7 pre-built team configs |
| **UAT-MCP toolkit addon** | MCP-powered user acceptance testing with coverage tracking and structured test plans |
| **Model optimization & prompting guides** | 8 new documentation guides covering Claude, GPT, local models, hybrid architectures, and prompting techniques |

### Added

- **Forensics-complete framework** (`agentic/code/frameworks/forensics-complete/`) — 13 DFIR agents (acquisition, memory, network, log, cloud, container, IOC, persistence, timeline, triage, recon, reporting, orchestrator), 9 investigation commands, 10 skills (linux-forensics, cloud-forensics, container-forensics, memory-forensics, evidence-preservation, sigma-hunting, ioc-extraction, log-analysis, supply-chain-forensics, target-profiling), 8 Sigma rule templates, 7 investigation templates, 4 enforcement rules (evidence-integrity, non-destructive, red-flag-escalation, volatility-order), 5 YAML schemas
- **Agent-friendly-code rule** (`rules/agent-friendly-code.md`) — quantitative thresholds (300 LOC warning, 500 error per file; 30/50 lines per function; 3/4 nesting depth) and 6 qualitative patterns for agent-processable code structure (#402)
- **Agent-generation-guardrails rule** (`rules/agent-generation-guardrails.md`) — runtime guardrails preventing agents from creating or enlarging files beyond agent-friendly limits; checks file size before writing (#405)
- **`/codebase-health` command** — scans source code, reports agent-readiness score (0-100), file size distribution, anti-pattern detection, actionable recommendations; supports text/JSON/markdown output and CI mode (#403)
- **`/complexity-gate` command** — CI-friendly pass/fail complexity enforcement with baseline mode for incremental adoption, `--changed-only` for pre-commit hooks, JSON output for pipeline parsing (#406)
- **`/decompose-file` skill** — guided source code splitting with dependency analysis, import rewiring, and test verification; 5-step workflow (Analyze → Plan → Execute → Rewire → Verify) (#404)
- **`/code-chunker` skill** — navigable structural maps of large files with function/class/block depth levels, map/JSON/tree output formats, and section-level navigation (#407)
- **17 specialist agents** — AI/ML Engineer, AWS/Azure/GCP Specialists, Blockchain Developer, Compliance Checker, Cost Optimizer, Data Engineer, Django Expert, Frontend Specialist, Kubernetes Expert, Migration Planner, Mobile Developer, Multi-Cloud Strategist, React Expert, Spring Boot Expert, Technical Debt Analyst
- **7 team compositions** (`teams/`) — pre-built agent team configurations for API development, full-stack, greenfield, maintenance, migration, and security review scenarios with role assignments and coordination patterns
- **UAT-MCP toolkit addon** (`agentic/code/addons/uat-mcp/`) — 2 agents (uat-planner, uat-executor), 3 commands (uat-generate, uat-execute, uat-report), 1 skill (uat-mode), 3 YAML schemas (uat-plan, uat-result, uat-coverage), 4 templates
- **Model optimization guides** (`docs/models/`) — Claude optimization, GPT optimization, local models, hybrid architectures
- **Prompting technique guides** (`docs/prompting/`) — chain-of-thought, context optimization, few-shot learning, role-based prompting

### Changed

- **README.md** — added forensics-complete and UAT-MCP to frameworks/addons tables; updated agent count to 85+; updated command count to 75+; updated CLI reference link to 42 commands; added codebase health examples to "See It In Action"
- **CLAUDE.md** — added forensics-complete to repository structure and key references
- **Rules manifest** — updated to 33 rules total (added agent-friendly-code and agent-generation-guardrails)
- **RULES-INDEX.md** — updated to 33 rules across 3 tiers (added 2 new SDLC HIGH rules)

### Fixed

- **README percentage claims** — removed hard percentage claims that lacked citation backing

---

## [2026.2.13] - 2026-02-26

| What changed | Why you care |
|--------------|--------------|
| **Site deploy on tag push (#355)** | Pushing a version tag now auto-triggers an aiwg.io rebuild so the marketing site stays current |
| **Skill/command name collision fix** | Providers now prefer skills over commands when both share a name, preventing silent overwrites |

### Added

- **`notify-site.yml` workflow** — dispatches `aiwg.io` deploy on `v*` tag push, passing version and tag inputs via `AIWG_IO_DISPATCH_TOKEN`

### Fixed

- **Provider name collisions** — skill definitions now take precedence over commands when names collide during deployment

---

## [2026.2.12] - 2026-02-26 – "Doc Sync & Accelerate" Release

| What changed | Why you care |
|--------------|--------------|
| **`aiwg doc-sync` command (#41)** | Detect and fix documentation-code drift with 8 parallel auditors, cross-reference checks, and auto-fix patterns |
| **`aiwg sdlc-accelerate` command (#42)** | End-to-end SDLC ramp-up from idea to construction-ready with state machine pipeline and resume support |
| **2 new skills** | `doc-sync` and `sdlc-accelerate` registered in skills manifest with trigger phrases |
| **Accelerate state schema** | YAML-defined state machine for pipeline phase tracking with gate results |
| **Construction Ready Brief template** | Handoff artifact template for construction-ready projects |
| **Doc-sync auditor templates** | Task definitions for 8 domain auditors and 4 cross-reference checks |
| **Auto-fix patterns** | Concrete fix patterns for 5 auto-fixable drift categories with safety checks |
| **24 integration tests** | Full test coverage for sdlc-accelerate entry points, phase resume, gate handling, state management, dry-run |
| **HashiCorp references removed** | All vendor-specific HashiCorp/Terraform/Vault references replaced with generic equivalents across 16 files |
| **CLI reference accuracy** | Command counts, categories, and totals corrected to match actual 42-command inventory |

### Added

- **`doc-sync` command** — bidirectional documentation-code synchronization with `code-to-docs`, `docs-to-code`, and `full` directions, parallel auditor dispatch, incremental scanning, and auto-fix with Ralph refinement
- **`sdlc-accelerate` command** — orchestrates intake → LOM gate → elaboration → ABM gate → construction prep → brief generation with `--from-codebase`, `--resume`, `--skip-to`, and `--dry-run` switches
- **`doc-sync` skill** (`agentic/code/frameworks/sdlc-complete/skills/doc-sync/SKILL.md`) — natural language trigger for documentation drift detection
- **`sdlc-accelerate` skill** (`agentic/code/frameworks/sdlc-complete/skills/sdlc-accelerate/SKILL.md`) — natural language trigger for SDLC pipeline acceleration
- **Accelerate state schema** (`agentic/code/frameworks/sdlc-complete/schemas/flows/accelerate-state.yaml`) — defines phase lifecycle, gate results, and decision tracking
- **Construction Ready Brief template** (`agentic/code/frameworks/sdlc-complete/templates/management/construction-ready-brief-template.md`) — structured handoff template with architecture, iteration plan, and risk sections
- **Auditor task templates** (`agentic/code/frameworks/sdlc-complete/templates/doc-sync/auditor-tasks.md`) — 8 Wave 1 domain auditors (cli-ref, extension-type, provider, skill, agent, config, readme, changelog) and 4 Wave 2 cross-reference checks
- **Auto-fix patterns** (`agentic/code/frameworks/sdlc-complete/templates/doc-sync/auto-fix-patterns.md`) — fix patterns for numeric claims, table entries, argument hints, broken links, and broken @-mentions
- **Integration tests** (`test/integration/sdlc-accelerate.test.ts`) — 24 tests covering command definition, entry point detection, phase resume, gate handling, state file management, and dry-run behavior

### Changed

- **Skills manifest** updated with `doc-sync` and `sdlc-accelerate` entries including trigger phrases
- **Skill inventory** (`docs/development/skill-inventory.md`) updated: SDLC Framework Skills count 8→10, total 53→55
- **CLI reference** (`docs/cli-reference.md`) corrected: Ralph commands 7→4, added Metrics (3), Documentation (1), SDLC Orchestration (1), Reproducibility (4) categories, total 36→42
- **CLAUDE.md** updated with doc-sync and sdlc-accelerate in CLI quick reference

### Fixed

- **HashiCorp vendor lock-in** — replaced all HashiCorp-specific references (Terraform, Vault, Consul, Packer) with generic equivalents across 16 files including agent definitions, security templates, deployment templates, legal templates, and toolsmith configs
- **CLI reference command counts** — total command count corrected from stale "40" to actual "42"; Ralph category corrected from 7 non-existent commands to actual 4
- **Duplicate plugin agents** — synced `plugins/sdlc/agents/` with framework source for cloud-architect, devops-engineer, and security-auditor

---

## [2026.2.11] - 2026-02-24 – "Service Verify"

Maintenance release: CI improvements for auto-creating Gitea releases on tag push, Codex SKILL.md YAML fixes.

---

## [2026.2.10] - 2026-02-22 – "Alt Platform Service"

Maintenance release: tracked agent sources for CI, alternative platform service verification.

---

## [2026.2.9] - 2026-02-15 – "Manifest Native" Release

| What changed | Why you care |
|--------------|--------------|
| **Provider normalization complete** | All 8 providers now discover framework artifacts via manifests rather than provider-specific hardcoding |
| **Codex parity for research + media-curator** | Codex prompt and skill deployment now includes new framework components through the same discovery path as other providers |
| **Automatic framework onboarding** | Adding a framework with a valid `manifest.json` is now enough for CLI discovery/deployment in provider flows |
| **Less manual curation** | Provider modules were simplified and centralized around shared manifest-aware utilities |

### Added

- `agentic/code/frameworks/research-complete/manifest.json` for explicit framework metadata and artifact entrypoints
- Manifest-driven framework discovery and mode resolution in shared provider utilities (`discoverFrameworks`, `getFrameworksForMode`, `collectFrameworkArtifacts`)
- Coverage updates in deployment tests to validate new framework/provider artifact paths and install behavior

### Changed

- Provider deployment logic normalized across Claude, Codex, Copilot, Cursor, Factory, OpenCode, Warp, and Windsurf
- Codex command prompt deployment now discovers framework command directories from framework manifests/mode selection
- Codex skill deployment now discovers framework skills from framework manifests/mode selection
- CLI/provider deployment plumbing refactored to reduce duplicated framework routing code

### Fixed

- Missing Codex deployment coverage for newly added framework components (research and media-curator)
- Gaps where framework additions required manual provider-by-provider updates instead of manifest-driven discovery

## [2026.2.8] - 2026-02-14 – "Full Catalog" Release

| What changed | Why you care |
|--------------|--------------|
| **`aiwg use media-curator`** | Media Curator framework now deployable as a standalone CLI target across all 8 providers |
| **`aiwg use research`** | Research Complete framework now deployable as a standalone CLI target across all 8 providers |
| **Complete provider list in help** | All 8 providers (claude, copilot, factory, codex, cursor, opencode, warp, windsurf) shown in `aiwg help` |
| **Documentation audit** | Stale agent counts, deprecated CLI syntax, missing framework references all fixed |

### Added

- **`aiwg use media-curator`** — deploy Media Curator framework (6 agents, 9 commands, 9 skills) to any provider
- **`aiwg use research`** — deploy Research Complete framework (8 agents, 10 commands) to any provider
- Deployment blocks added to all 8 provider modules (claude, codex, copilot, cursor, factory, opencode, warp, windsurf)
- Workspace initialization for media-curator and research-complete in `base.mjs`
- Both frameworks included in `aiwg use all`

### Changed

- **Help text** updated with complete provider list — all 8 providers now shown (previously only 4)
- **`VALID_FRAMEWORKS`** expanded: `sdlc, marketing, media-curator, research, writing, general, all`
- **`help-generator.ts`** synced with `help.ts` for consistent provider display
- Updated `deploy-agents.mjs` mode documentation with new framework entries

### Fixed

- **Documentation audit** — updated README, CLAUDE.md, USAGE_GUIDE, sdlc-complete/README, development guide, and extensions overview:
  - Agent counts corrected from "50+" to "70+"
  - Deprecated `aiwg -deploy-agents` syntax replaced with `aiwg use` commands
  - Added media-curator and research-complete to framework tables and references
  - Platform count updated from 4 to 8
- **CalVer filename** — renamed `v2026.01.3-announcement.md` to `v2026.1.3-announcement.md` (no leading zeros)
- **Characterization test** — updated to match new provider format in help output

---

## [2026.2.7] - 2026-02-14 – "Media Curator" Release

| What changed | Why you care |
|--------------|--------------|
| **New media-curator framework** | Complete framework for AI-powered media archive management — 31 files across agents, commands, and skills |
| **6 specialized agents** | Discography analysis, source discovery, acquisition, quality assessment, metadata curation, completeness tracking |
| **9 commands + 9 skills** | Full pipeline from artist analysis through multi-platform export |
| **Field-tested patterns** | GAP-NOTE.md, opustags preference, production-context classification — proven on 94GB prototype |

### Added

**Media Curator Framework** (`agentic/code/frameworks/media-curator/`) — complete framework for intelligent media archive management:

- **6 agents**: discography-analyst, source-discoverer, acquisition-manager, quality-assessor, metadata-curator, completeness-tracker
- **9 commands**: analyze-artist, find-sources, acquire, tag-collection, check-completeness, assemble, curate, export, verify-archive
- **9 skills**: youtube-acquisition, archive-acquisition, audio-extraction, quality-filtering, metadata-tagging, cover-art-embedding, gap-documentation, integrity-verification, provenance-tracking
- **Config**: `defaults.yaml` with quality thresholds, acquisition settings, and 5 export profiles (Plex, Jellyfin, MPD, mobile, archival)
- **Docs**: overview, standards reference, user guide

Key capabilities:
- Multi-source acquisition (YouTube, Internet Archive, Bandcamp)
- Quality filtering with configurable accept/reject criteria
- MusicBrainz/Discogs metadata integration with opustags
- GAP-NOTE.md pattern for documenting and tracking missing content
- W3C PROV/PREMIS-compliant archive integrity verification
- Completeness scoring with gap analysis
- Multi-platform export for Plex, Jellyfin, MPD, mobile, and archival

Field-tested on Twenty One Pilots discography (1,109 files, 94GB).

Closes #75, #76, #77, #78, #79, #80, #81, #82, #83, #253

---

## [2026.2.6] - 2026-02-14

### Fixed

- Stabilize deployment-registration idempotency test on Node 18 — assertion now checks for no duplicate IDs rather than exact scan order equality

---

## [2026.2.5] - 2026-02-14 – "Lean Rules" Release

| What changed | Why you care |
|--------------|--------------|
| **Consolidated rules deployment** | Single `RULES-INDEX.md` replaces 31 individual rule files — ~95% context reduction |
| **Automatic cleanup** | Old individually-deployed rule files removed on redeploy |
| **All 8 providers** | Claude, Codex, Factory, Copilot, Cursor, OpenCode, Warp, Windsurf all updated |

### Changed

**Consolidated Rules Deployment** (#334, #335-#341):

- Rules now deploy as a single `RULES-INDEX.md` file instead of 31 individual rule files
- ~95% context reduction: ~200-line index replaces ~9,321 lines of bulk content
- Index contains 2-3 sentence summaries per rule with @-links to full rule files
- Rules organized by tier (core/sdlc/research) and enforcement level (critical/high/medium)
- Quick Reference table maps 11 task types to relevant rules
- Old individually-deployed rule files are automatically cleaned up on redeploy
- All 8 providers updated: Claude, Codex, Factory, Copilot, Cursor, OpenCode, Warp, Windsurf
- Rules manifest bumped to v2.0.0 with consolidation metadata
- Fallback: if RULES-INDEX.md is missing, providers fall back to individual file deployment

### Added

- `RULES-INDEX.md` — consolidated rules index with summaries and @-links for all 31 rules
- 6 new functions in `base.mjs`: `loadRulesManifest`, `groupRulesByTier`, `groupByEnforcement`, `getRulesIndexPath`, `generateConsolidatedRulesContent`, `cleanupOldRuleFiles`
- 31 unit tests for consolidated rules functions
- 7 integration tests for consolidated rules deployment and cleanup

**Migration**: Run `aiwg use sdlc` (or your framework) to redeploy. Old individual rule files in target directories are automatically replaced.

---

## [2026.2.4] - 2026-02-09 – "Issue Thread" Release

| What changed | Why you care |
|--------------|--------------|
| **`/address-issues` command** | Issue-thread-driven agent loops with 2-way human-AI collaboration via issue comments |
| **Context window budget** | Configure `AIWG_CONTEXT_WINDOW` to control parallel subagent limits on local/GPU systems |
| **`--interactive` and `--guidance`** | Standard AIWG parameters for discovery prompts and upfront direction |

### Added

**Issue-Driven Agent Loop** (#333):

- New `/address-issues` command for systematically working through open issues using issue threads as the collaboration surface
- 3-step cycle protocol per issue: work → post structured status comment → scan thread for human feedback
- Thread scanning classifies human comments (feedback, question, approval, correction) and responds substantively
- Multi-issue strategies: sequential (default), batched (related issues), parallel (independent)
- `--interactive` mode: discovery questions before starting, pause between issues for go/no-go
- `--guidance` mode: upfront text direction to tailor prioritization without interactive prompts
- `--branch-per-issue`, `--max-cycles`, `--filter`, `--all-open`, `--provider` parameters
- Issue tracker support: Gitea (MCP tools) and GitHub (`gh` CLI)
- New skill at `agentic/code/frameworks/sdlc-complete/skills/issue-driven-ralph/SKILL.md`
- New command at `agentic/code/frameworks/sdlc-complete/commands/address-issues.md`
- Natural language triggers: "address the open issues", "tackle issue 17", "work on the bug backlog", etc.
- 12 NL phrase mappings added to `docs/simple-language-translations.md`
- Design document at `.aiwg/planning/issue-driven-ralph-loop-design.md`

**Context Window Budget Configuration**:

- New `context-budget.md` rule in `agentic/code/addons/aiwg-utils/rules/` (deploys to all 8 platforms)
- Users set `AIWG_CONTEXT_WINDOW: <tokens>` in CLAUDE.md team directives to declare context budget
- Parallel subagent limits auto-scale: `max_parallel = max(1, floor(context_window / 50000))` capped at 20
- Lookup table: ≤64k→1-2 agents, 65-128k→2-4, 129-256k→4-8, 257-512k→8-12, >512k→12-20
- Compaction guidance: tighter budgets prefer sequential batches, smaller subagent tasks
- Updated `subagent-scoping.md` Rule 7 to reference context budget instead of hardcoded values
- Commented-out `AIWG_CONTEXT_WINDOW` directive added to CLAUDE.md team directives section

---

## [2026.2.3] - 2026-02-09 – "Deep Context" Release

| What changed | Why you care |
|--------------|--------------|
| **RLM addon** | Process 10M+ tokens through recursive sub-agent decomposition |
| **Daemon mode** | Background file watching, cron scheduling, IPC, tmux management |
| **Messaging subsystem** | Bidirectional Slack, Discord, and Telegram bot integration |
| **CLI addon support** | `aiwg use rlm` — addons are now first-class CLI targets |
| **Copilot RLM artifacts** | RLM agents, skills, and rules deploy to GitHub Copilot |

### Added

**RLM Addon — Recursive Language Model Processing** (#321, #322-#329, #331):

- New addon at `agentic/code/addons/rlm/` implementing recursive context decomposition based on REF-089 (Zhang et al., 2026)
- 4 RLM agents: `rlm-orchestrator`, `rlm-chunk-processor`, `rlm-aggregator`, `rlm-quality-validator`
- 3 RLM commands: `/rlm-query`, `/rlm-batch`, `/rlm-status`
- 1 RLM skill: `rlm-mode` — detects large-scale operations and routes to RLM processing
- 2 RLM rules: `rlm-context-management`, `rlm-subagent-scoping`
- 5 RLM schemas: `rlm-config.yaml`, `rlm-chunk.yaml`, `rlm-result.yaml`, `rlm-cost.yaml`, `rlm-manifest.yaml`
- 2 RLM docs: `README.md`, `rlm-patterns.md`
- Deploy via `aiwg use rlm` or included automatically with `aiwg use sdlc` bundled addons
- GitHub Copilot deployment: `.github/agents/rlm-*.yaml`, `.github/skills/rlm-mode/`, `.github/copilot-rules/rlm-context-management.md`

**Daemon Mode** (#312):

- Background daemon with file watching and cron-based task scheduling
- IPC client/server for inter-process communication between daemon and CLI
- Agent supervisor for managing long-running agent processes
- Task store for persistent task queue management
- REPL chat for interactive daemon sessions
- Tmux manager for terminal multiplexing integration
- Automation engine for event-driven workflow triggers
- Full documentation at `docs/daemon-guide.md`

**Messaging Subsystem** (#313):

- Bidirectional chat handler supporting two-way conversations with AI agents
- Slack, Discord, and Telegram bot adapters with unified interface
- Base adapter improvements for consistent message handling across platforms
- Hub chat wiring for routing messages between adapters and agents
- Typed message system with structured message types
- Full documentation at `docs/messaging-guide.md`

**CLI Addon Support** (#328):

- `aiwg use rlm` — addons are now first-class targets alongside frameworks
- `VALID_ADDONS` and `ADDON_PATHS` constants in use handler for addon discovery
- Updated CLI help text, command definitions, and extension metadata
- Updated characterization tests for addon-aware error messages

### Fixed

- **Characterization test assertions** — Updated CLI router tests to match addon-aware error messages ("Framework or addon name required", "Unknown target")

---

## [2026.2.2] - 2026-02-08

### Fixed

- **glob dependency** - Updated from 11.x to 13.x to resolve deprecation warning and security vulnerabilities
- **Automated npm publishing** - CI now publishes to both Gitea and public npmjs.org on tag push using separate `NPMJS_TOKEN` secret (granular access token bypasses 2FA)

---

## [2026.2.0] - 2026-02-08 – "Universal Deploy" Release

| What changed | Why you care |
|--------------|--------------|
| **Universal deployment** | All 8 providers now receive all 4 artifact types (agents, commands, skills, rules) |
| **External agent loop** | Crash-resilient iterative task execution across sessions (6-8 hours) |
| **Research framework** | 8 specialized research agents, 10 commands, 8 templates |
| **Rules as artifact type** | Deployable enforcement rules propagate to all platforms |
| **Agent persistence** | Anti-laziness detection, HITL gates, cross-loop learning |
| **Regression testing** | Automated regression detection integrated across SDLC |
| **Unified extension system** | Complete Phase 4 with hooks, dynamic discovery, registry |
| **GitHub Copilot full support** | Rules and skills deploy alongside agents and commands |
| **Test consolidation** | 31.7% test reduction (3,837 → 2,619) with zero coverage loss |
| **Research-first rules** | Agents must research before decisions, parse instructions before acting |

### Added

**Universal Deployment Architecture**:

- All 8 providers (Claude, Codex, Copilot, Cursor, Factory, OpenCode, Warp, Windsurf) now receive all 4 artifact types
- 32 provider × artifact combinations supported with per-provider support levels (`native`, `conventional`, `aggregated`)
- Provider implementations refactored for consistent deploy paths across `tools/agents/providers/*.mjs`
- ADR documented at `.aiwg/architecture/adr-universal-provider-deployment.md`

**Rules as Deployable Artifact Type**:

- Rules are now a first-class deployable artifact alongside agents, commands, and skills
- Core enforcement rules (no-attribution, token-security, versioning, citation-policy, anti-laziness, executable-feedback, failure-mitigation) deploy to all providers
- Content-injection platforms (Copilot, Windsurf) receive rules injected into their context files
- Discrete-file platforms (Claude, Codex, Cursor, Factory, OpenCode, Warp) receive individual rule files

**Zero AI Attribution Enforcement**:

- New `no-attribution.md` rule enforced across all 8 platforms
- No `Co-Authored-By`, `Generated with`, or tool branding in any output
- `aiwg use` and `aiwg regenerate` include no-attribution conventions for every platform

**GitHub Copilot Full Integration**:

- Rules deployed to `.github/copilot-rules/` directory
- Skills deployed to `.github/skills/` directory
- Commands converted to YAML agent format in `.github/agents/`
- Complete parity with other providers

**Research-First and Instruction-Following Rules**:

- `research-before-decision.md` - HIGH enforcement rule requiring research before technical decisions
- `instruction-comprehension.md` - HIGH enforcement rule requiring instruction parsing before acting
- 7th thought type added to thought protocol: Research 🔬
- NL router updated with research, planning, and clarification routing patterns
- Simple language translations document at `docs/simple-language-translations.md`

**External Agent Loop - Crash-Resilient Task Execution**:

- **`/ralph-external` command** - External supervisor for long-running sessions (6-8 hours)
  - Wraps Claude Code sessions with crash recovery and cross-session persistence
  - Pre/post session snapshots capture git status, .aiwg state, file hashes
  - Periodic checkpoints during session (configurable interval, default 30 min)
  - Two-phase state assessment: Orient → Generate continuation prompts
  - Comprehensive output capture: stdout, stderr, session transcript, parsed events
- **`/ralph-external-status`** and **`/ralph-external-abort`** commands
- **4-layer intelligent control system** (Epic #26):
  - Layer 1: Loop Lifecycle (initialization, iteration, termination)
  - Layer 2: Intelligent Control (memory, analytics, early stopping, best output)
  - Layer 3: Cross-Task Learning (similar task detection, strategy transfer)
  - Layer 4: Multi-Loop Management (concurrent loops, dashboard, monitoring)
- **Multi-provider support** with `--provider` flag (claude, codex)
  - Provider adapter pattern with capability-based degradation
  - Model mapping: opus→gpt-5.3-codex, sonnet→codex-mini-latest, haiku→gpt-5-codex-mini
- **Research-backed options** (REF-015, REF-021):
  - `--memory <n|preset>` - Memory capacity with presets: simple(1), moderate(3), complex(5), maximum(10)
  - `--cross-task` / `--no-cross-task` - Cross-task learning from past loops
  - `--no-analytics`, `--no-best-output`, `--no-early-stopping`
- **Multi-loop state management** with monitoring dashboard
- **Security and safety guide** at `docs/ralph-external/security-safety.md`
- State directory: `.aiwg/ralph-external/` with full iteration history

**Research Framework**:

- 8 specialized research agents (Quality Assessor, Citation Verifier, Writing Validator, Prompt Optimizer, Content Diversifier, etc.)
- 10 research commands (`/verify-citations`, `/grade-report`, `/citation-check`, `/corpus-health`, etc.)
- 8 research templates (frontmatter, quality assessment, evidence review)
- GRADE evidence quality assessment workflow
- W3C PROV-compliant provenance tracking with `prov-record.yaml` schema
- Citation verification workflow ensuring no fabricated references
- Research corpus with papers, findings, and topic syntheses

**Agent Persistence and Anti-Laziness**:

- HITL gate integration with comprehensive test suite
- Cross-loop learning between Ralph iterations
- Laziness Detection agent analyzing actions for test deletion, skip patterns, feature removal
- Recovery Orchestrator coordinating PAUSE→DIAGNOSE→ADAPT→RETRY→ESCALATE protocol
- Progress Tracker monitoring iterative task progress with regression detection
- Prompt Reinforcement Agent injecting anti-laziness directives at strategic points
- Avoidance pattern catalog at `agentic/code/addons/persistence/patterns/avoidance-catalog.yaml`

**Regression Testing Capability**:

- Regression Analyst agent for detecting behavioral changes between versions
- Advanced regression detection skills
- Integration across SDLC commands for continuous regression monitoring
- Automation and cross-task learning for regression patterns

**Unified Extension System (Phase 4)**:

- Complete implementation of unified extension registry (`src/extensions/registry.ts`)
- All 10 extension types: agent, command, skill, hook, tool, mcp-server, framework, addon, template, prompt
- Dynamic discovery and capability-based semantic search
- Hooks as first-class extension type with lifecycle event handling
- 40 CLI commands with full TypeScript type definitions
- Legacy router removed in favor of unified command dispatch

**Thought Protocols and Agent Enhancements**:

- 7 thought types standardized: Goal 🎯, Research 🔬, Progress 📊, Extraction 🔍, Reasoning 💭, Exception ⚠️, Synthesis ✅
- Few-shot examples required for all agent definitions (2-3 per agent)
- New specialized agents: Regression Analyst, Laziness Detector, Recovery Orchestrator, Progress Tracker, Prompt Reinforcement Agent
- Memory frontmatter for Claude Code feature adoption
- Agent persistence integration with reflection memory

**Schema and Framework Wiring**:

- 67 schemas moved from `.aiwg/` to `agentic/code/` (framework source, not project output)
- 43/43 schema coverage achieved across all SDLC components
- Cost and reproducibility schemas wired to CLI commands
- Reflexion episodic memory wired into Ralph addon
- Tree-of-Thought architecture pattern implementation
- Executable feedback loop pattern implementation

**Documentation**:

- AIWG Development Guide at `docs/development/aiwg-development-guide.md`
- Claude Code features analysis and reference documentation
- Hook patterns, disk output conventions, and skills unification docs
- Comprehensive Epic #26 Ralph documentation
- Integration guides updated for all 8 providers
- Simple language translations for natural language routing

### Changed

- **Model configurations** updated to latest versions across all providers
- **Framework registry tracking** - `.aiwg/frameworks/` now tracked for installation state
- **AIWG framework context** - Added dogfooding explanation to CLAUDE.md
- **Ralph addon** reorganized: Ralph-specific components moved from `sdlc-complete` to dedicated `ralph` addon
- **NL router** expanded with research, planning, and clarification routing patterns
- **Thought protocol** expanded from 6 to 7 thought types (added Research 🔬)
- **Rules manifest** expanded with 2 new core-tier HIGH-enforcement rules

### Fixed

- **Ralph-external race condition** - Async provider registration now properly awaited before `createProvider()` calls
- **TypeScript compilation errors** - All Platform record types updated with `opencode` and `warp` entries
- **Docker CI compatibility** - Skip tsx-dependent integration tests in Docker environment
- **CLI flag parsing** - Resolved test failures for command-line argument handling
- **Flaky timing tests** - Relaxed duration assertions in workspace-migrator and security-validator tests
- **Agent deduplication** - Check agent IDs instead of registry size for proper dedup detection
- **REF number collisions** - Fixed duplicate research reference numbering
- **`.aiwg/` boundary documentation** - Clarified framework source vs project output distinction

### Removed

- **Markdown lint CI job** - Removed from Gitea CI pipeline (was non-blocking, framework content never conforms to strict lint rules)
- **Legacy CLI router** - Replaced by unified extension system
- **Priority command filtering** - All commands from core addons deploy without filtering

### Refactored

- **Test suite consolidation** - Reduced from ~3,837 to ~2,619 tests (31.7% reduction) with zero coverage loss using `for`/`forEach` inside single `it()` blocks instead of `test.each`/`it.each`
- **158 research issues filed** and classified for tracking implementation work
- **Schema organization** - All schemas now live in framework source (`agentic/code/`) not project output (`.aiwg/`)

---

## [2026.1.7] - 2026-01-14 – "Deploy All Commands" Release

| What changed | Why you care |
|--------------|--------------|
| **Removed priority filtering** | ALL commands now deploy (not just a curated subset) |
| **aiwg-utils commands work** | `aiwg-regenerate*`, `devkit-*`, `mention-*` commands now deploy to Codex/Cursor |

### Fixed

**Command Deployment**:

- Removed `PRIORITY_COMMANDS` filtering from `deploy-prompts-codex.mjs`
- Removed `PRIORITY_COMMANDS` filtering from `deploy-rules-cursor.mjs`
- Core addons (with `core: true` or `autoInstall: true`) now deploy ALL commands
- The `aiwg-utils` addon now deploys all 30 commands including:
  - `aiwg-regenerate*` (context regeneration)
  - `devkit-*` (scaffolding)
  - `mention-*` (traceability)
  - `workspace-*` (maintenance)

---

## [2026.1.6] - 2026-01-14 – "Complete Addon Discovery" Release

| What changed | Why you care |
|--------------|--------------|
| **Complete addon discovery** | ALL deployment scripts now discover addons dynamically |
| **Codex commands fixed** | `~/.codex/prompts/` now includes Ralph and all addon commands |
| **Cursor rules fixed** | `.cursor/rules/` now includes addon commands |
| **Warp/Windsurf fixed** | WARP.md and standalone scripts include all addons |
| **Versioning docs** | Clear CalVer documentation prevents npm update failures |

### Fixed

**Complete Addon Discovery Across All Tools**:

- `tools/commands/deploy-prompts-codex.mjs` - Codex prompts now discover addon commands
- `tools/rules/deploy-rules-cursor.mjs` - Cursor rules now discover addon commands
- `tools/warp/setup-warp.mjs` - Warp WARP.md now includes addon agents/commands
- `tools/agents/deploy-windsurf.mjs` - Standalone Windsurf script now discovers addons

### Added

**Versioning Documentation**:

- `docs/contributing/versioning.md` - Comprehensive CalVer guide
- `.claude/rules/versioning.md` - AI agent enforcement rules
- Updated CLAUDE.md with correct version format examples

**CalVer Format**: `YYYY.M.PATCH` (no leading zeros!)
- Correct: `2026.1.6`, `2026.12.0`
- Wrong: `2026.01.6` (npm rejects leading zeros)

---

## [2026.1.5] - 2026-01-14 – "Dynamic Addon Discovery" Release

| What changed | Why you care |
|--------------|--------------|
| **Dynamic addon discovery** | All providers now automatically pick up new addons like Ralph |
| **No more hardcoded paths** | New addons work across all 8 providers without code changes |
| **Ralph addon support** | Agent loop agents, commands, and skills now deploy everywhere |

### Fixed

**Addon Discovery for All Providers** (Issue #22):

- **Dynamic Addon Discovery** - All providers now automatically discover and deploy all addons
  - Previously, providers hardcoded specific addons (writing-quality, aiwg-utils)
  - New addons like Ralph were not deployed because they weren't in the hardcoded list
  - Now uses `getAddonAgentFiles()`, `getAddonCommandFiles()`, `getAddonSkillDirs()` from base.mjs

- **Updated Providers**:
  - `claude.mjs` - Now discovers all addons dynamically
  - `codex.mjs` - Now discovers all addons dynamically
  - `copilot.mjs` - Now discovers all addons dynamically
  - `opencode.mjs` - Now discovers all addons dynamically
  - `factory.mjs` - Now discovers all addons dynamically
  - `windsurf.mjs` - Now discovers all addons dynamically

### Added

**Addon Discovery Functions in base.mjs**:

- `discoverAddons(srcRoot)` - Discovers all addons from `agentic/code/addons/` with manifests
- `getAddonAgentFiles(srcRoot, excludeAddons)` - Gets all agent files from all addons
- `getAddonCommandFiles(srcRoot, excludeAddons)` - Gets all command files from all addons
- `getAddonSkillDirs(srcRoot, excludeAddons)` - Gets all skill directories from all addons
- `getAddonFiles(srcRoot, options)` - Combined function for all addon files

### Addons Now Auto-Discovered

All addons in `agentic/code/addons/` are now automatically deployed:
- aiwg-evals, aiwg-hooks, aiwg-utils
- context-curator, testing-quality, voice-framework, writing-quality
- guided-implementation, ralph, droid-bridge, star-prompt

---

## [2026.01.4] - 2026-01-14 – "Provider File Locations Fix" Release

| What changed | Why you care |
|--------------|--------------|
| **Provider deployment fixes** | `aiwg use --provider X` now correctly places files in provider-specific directories |
| **Codex home directory paths** | Codex prompts/skills deploy to `~/.codex/` (home) not project directory |
| **Cursor rules location** | Cursor rules now deploy to `.cursor/rules/` not project root |
| **CLI addon provider pass-through** | `--provider` flag now correctly propagates to addon deployments |
| **Dead code removal** | Removed 115 lines of unreachable Windsurf code from deploy-agents.mjs |
| **Comprehensive test suite** | New `provider-file-locations.test.ts` validates all 8 providers |

### Fixed

**Provider File Location Issues** (Issue #21):

- **CLI `handleUse()`** - Now passes `--provider` to addon deployments (aiwg-utils, ralph)
  - Previously, addons always deployed to Claude Code format regardless of `--provider`
  - Now correctly creates provider-specific directories (`.codex/`, `.factory/`, etc.)

- **Codex Provider** - Fixed command/skill deployment paths
  - Prompts now deploy to `~/.codex/prompts/` (home directory)
  - Skills now deploy to `~/.codex/skills/` (home directory)
  - Previously incorrectly deployed to project directory

- **Cursor Provider** - Fixed rules deployment path
  - Rules now deploy to `<project>/.cursor/rules/`
  - Previously deployed `.mdc` files directly to project root
  - Script now treats `--target` as project root and appends `.cursor/rules/`

- **Dead Code Removal** - Removed unreachable Windsurf code from `deploy-agents.mjs`
  - 115 lines of code that checked `if (provider === 'windsurf')` never executed
  - Provider was an object, not a string, so condition was always false

### Added

**Provider Deployment Test Suite**:

- New `test/integration/provider-file-locations.test.ts`
  - Tests all 8 providers: claude, codex, factory, copilot, cursor, opencode, warp, windsurf
  - Validates correct directory creation for each provider
  - Validates no forbidden paths (e.g., no `.claude/` when using codex)
  - Validates correct file extensions per provider
  - Tests `aiwg use --provider` CLI integration

### Provider File Locations Reference

| Provider | Project Directories | Home Directories | Root Files |
|----------|---------------------|------------------|------------|
| Claude | `.claude/agents/`, `.claude/commands/`, `.claude/skills/` | - | - |
| Codex | `.codex/agents/` | `~/.codex/prompts/`, `~/.codex/skills/` | - |
| Factory | `.factory/droids/`, `.factory/commands/` | - | - |
| Copilot | `.github/agents/` | - | - |
| Cursor | `.cursor/rules/` | - | - |
| OpenCode | `.opencode/agent/`, `.opencode/command/` | - | - |
| Warp | - | - | `WARP.md` |
| Windsurf | `.windsurf/workflows/` | - | `AGENTS.md`, `.windsurfrules` |

---

## [2026.01.3] - 2026-01-13 – "Agent Loop & Issue Management" Release

| What changed | Why you care |
|--------------|--------------|
| **Agent Loop** | Iterative AI task execution - "iteration beats perfection" methodology |
| **--interactive & --guidance** | All commands now support interactive mode and custom guidance |
| Unified issue management | Create, update, list, sync issues across Gitea/GitHub/Jira/Linear or local files |
| Issue auto-sync | Commits with "Fixes #X" automatically update and close issues |
| Token security patterns | Secure token loading via env vars and files, never direct access |
| Vendor-specific regenerate | 30-40% smaller context files, only loads relevant platform commands |
| Man page support | `man aiwg` works after npm global install |

### Added

**Agent Loop - Iterative AI Task Execution**:

- **`/ralph` command** - Execute tasks iteratively until completion criteria met
  - Parse task definition and verification criteria
  - Execute → Verify → Learn → Iterate cycle
  - Errors become learning data, not session-ending failures
  - Configurable max iterations and timeout
- **`/ralph-status`** - Check status of current or previous agent loop
- **`/ralph-resume`** - Resume interrupted loop from last checkpoint
- **`/ralph-abort`** - Abort running loop and optionally revert changes
- **Ralph addon** (`agentic/code/addons/ralph/`):
  - Complete methodology documentation
  - Loop state persistence in `.aiwg/ralph/`
  - Completion reports with iteration history
- **Natural language triggers**: "ralph this", "loop until", "keep trying until"
- Philosophy: "Iteration beats perfection" - inspired by iterative agent loop methodology

**Command Enhancements**:

- **`--interactive` flag** - All commands now support interactive mode
  - Asks clarifying questions before execution
  - Validates assumptions with user
  - Gathers preferences for ambiguous choices
- **`--guidance <text>` flag** - Provide custom guidance to tailor command behavior
  - Pass project-specific context
  - Override default behaviors
  - Focus on specific aspects of the task
- **Man page** - `man aiwg` now works after `npm install -g aiwg`

**Gap Analysis & Guided Implementation**:

- **`/gap-analysis` command** - Unified gap analysis with natural language routing
- **Guided implementation addon** (`agentic/code/addons/guided-implementation/`):
  - Iteration control for complex implementations
  - Step-by-step guidance with checkpoints
  - REF-004 MAGIS reference integration

**Droid Bridge MCP Integration**:

- **`droid-bridge` addon** - MCP integration for Claude Desktop and other MCP clients
- Bridge between agentic framework and MCP protocol
- Enables AIWG agents in MCP-compatible environments

**Issue Management System** (Issues #16, #17):

- **`/issue-create`** - Create issues with multi-provider support:
  - Gitea (MCP tools), GitHub (gh CLI), Jira (REST API), Linear (GraphQL)
  - Local fallback to `.aiwg/issues/` when no provider configured
  - Config via `.aiwg/config.yaml` or CLAUDE.md
- **`/issue-update`** - Update issue status, assignee, labels, add comments
- **`/issue-list`** - List and filter issues by status, label, assignee
- **`/issue-sync`** - Detect issue refs in commits ("Fixes #X", "Closes #X")
- **`/issue-close`** - Close issues with completion summary
- **`/issue-comment`** - Add structured comments using templates
- **Issue comment templates**:
  - `task-completed.md` - Completion summary with deliverables
  - `feedback-needed.md` - Request review with specific questions
  - `blocker-found.md` - Blocker notification with impact assessment
  - `progress-update.md` - Status update with metrics
- **`issue-auto-sync` skill** - Post-commit automation for issue updates

**Token Security** (Issue #18):

- **Security addon** (`agentic/code/addons/security/`):
  - `secure-token-load.md` - Patterns for secure token loading
  - Single-line, heredoc, and environment variable patterns
- **Token loading priority**: Environment variables → Secure files → Vault
- **Token security rules** (`.claude/rules/token-security.md`):
  - Never hard-code tokens
  - Never pass tokens as command arguments
  - Use heredoc for multi-line operations
  - Enforce file permissions (mode 600)
- Updated DevOps Engineer and Security Auditor agents with security guidance
- Comprehensive documentation at `docs/token-security.md`

**Vendor-Specific Regenerate** (Issue #19):

- **Vendor detection** (`docs/vendor-detection.md`):
  - Claude Code: CLAUDE.md, .claude/ directory
  - GitHub Copilot: copilot-instructions.md, .github/agents/
  - Cursor: .cursor/ directory
  - Windsurf: WARP.md
- **Regenerate base template** (`templates/regenerate-base.md`):
  - Common structure for all regenerate commands
  - Vendor-specific section placeholders
- **Context reduction**: 30-40% smaller files by platform filtering
- Only inline ~15-20 most-used commands/agents per vendor
- Full catalogs linked instead of inlined

**Star Prompt Addon** (Issue #14):

- **`star-prompt` addon** (`agentic/code/addons/star-prompt/`):
  - Tasteful "Yes, star the repo" / "No thanks" prompt
  - Auto-star via `gh api -X PUT /user/starred/jmagly/ai-writing-guide`
  - Fallback to manual link if gh CLI unavailable
- Integrated into all intake and regenerate commands
- Non-intrusive, shown only once per command

### Changed

- Consolidated `/ticket-*` commands to `/issue-*` for git ecosystem consistency
- Renamed `ticketing-config.md` to `issue-tracking-config.md`
- Changed `.aiwg/tickets/` to `.aiwg/issues/` for local tracking
- Updated command manifests with new issue commands

### Fixed

- Standardized terminology across SDLC framework (issue vs ticket)

---

## [2026.01.0] - 2026-01-07 – "CalVer Migration" Release

| What changed | Why you care |
|--------------|--------------|
| CalVer versioning | Version now reflects release date (YYYY.M.PATCH) |
| Addon directory fix | Claude provider correctly handles addon-style directories |

### Changed

- **CalVer versioning**: Migrated from SemVer (0.x.x, 2024.12.x) to pure CalVer (2026.01.x)
- Version format: `YYYY.M.PATCH` where PATCH resets each month (no leading zeros)

### Fixed

- **Addon directory deployment**: Claude provider now supports addon-style directory structures during deployment

---

## [2024.12.5] - 2025-12-13 – "Flexible Models & Terminal Docs" Release

| What changed | Why you care |
|--------------|--------------|
| Terminal docs site | CLI-style documentation with full-text search and themes |
| Smithing Framework | Create agents, skills, commands, and MCP servers dynamically |
| Windsurf provider | Deploy to Windsurf IDE |
| Flexible model selection | Override models per tier when deploying agents |
| Filter-based deployment | Deploy only specific agents by pattern or role |
| Persistent model config | Save model preferences for future deployments |

### Added

**Terminal Documentation Site**:

- **CLI-style console** - Search and navigate via command input
- **Full-text search** - Search all documentation content with highlighting via dbbuilder integration
- **Log entry format** - Content displayed as categorized terminal log entries
- **Three themes** - Dark, Light (OS/2 Warp inspired cream palette), and Matrix
- **Clickable search results** - All results displayed as navigable links
- **Keyboard shortcuts** - `?` help, `/` search, `t` theme, `gg` top, `G` bottom
- Console commands: `help`, `search <query>`, `theme`, `clear`, `home`

**Smithing Framework** (Preview):

- **ToolSmith** - Create MCP tools from specifications
- **MCPSmith** - Build complete MCP servers with Docker support
- **AgentSmith** - Generate specialized agents from descriptions
- **SkillSmith** - Create Claude Code skills
- **CommandSmith** - Build slash commands
- Located in `agentic/code/frameworks/sdlc-complete/agents/smiths/`

**Windsurf Provider**:

- New experimental provider for Windsurf IDE
- `aiwg use sdlc --provider windsurf`
- Provider modularization refactor for cleaner multi-provider architecture

**Flexible Model Selection** (PR #73):

- **`--reasoning-model <name>`** - Override model for opus-tier agents (architecture, analysis)
- **`--coding-model <name>`** - Override model for sonnet-tier agents (implementation, review)
- **`--efficiency-model <name>`** - Override model for haiku-tier agents (simple tasks)
- Works with `aiwg use` command for all providers

**Filter-Based Deployment**:

- **`--filter <pattern>`** - Deploy only agents matching glob pattern (e.g., `*architect*`)
- **`--filter-role <role>`** - Deploy only agents of specified role: `reasoning`, `coding`, `efficiency`
- Enables surgical updates to specific agent subsets

**Model Persistence**:

- **`--save`** - Save model configuration to project `models.json`
- **`--save-user`** - Save to user-level `~/.config/aiwg/models.json`
- Configurations apply to future deployments automatically

**Documentation Updates**:

- `docs/CLI_USAGE.md` - Full model selection, filter, and save flag documentation
- `docs/configuration/model-configuration.md` - Updated with filter and persistence examples
- `README.md` - Added collapsible model selection section

### Fixed

- **Dry-run flag in ensureDir** - Directory creation now respects `--dry-run` across all providers
- **Skill deployment test** - Fixed test to use Claude provider (Factory doesn't support skills)
- **Search auto-navigation** - Fixed search jumping to first result instead of showing clickable results list
- **Deep linking** - Fixed hash-based navigation requiring missing DOM element

### Changed

- Updated `/aiwg-refresh` command to support model selection and filter flags
- Command syntax standardized to use `aiwg use` instead of legacy `-deploy-agents`

---

## [2024.12.4] - 2025-12-12 – "Universal Providers" Release

| What changed | Why you care |
|--------------|--------------|
| 5 new providers | Deploy to Claude, Factory, OpenAI, Cursor, Copilot, OpenCode |
| `/aiwg-refresh` command | Update frameworks in-session without leaving Claude Code |
| Testing-quality addon | TDD enforcement, mutation testing, flaky detection (6 skills) |
| Live provider tests | All providers validated with real CLI integration tests |
| Testing requirements docs | Clear guidance on when full regression testing is required |

### Added

**Multi-Provider Support** (PRs #62, #63, #64, #65):

- **OpenAI Codex CLI** - Full integration with `.codex/agents/` deployment
- **Cursor IDE** - Native `.cursor/rules/*.mdc` format with AGENTS.md
- **OpenCode** - `.opencode/agent/` structure with AGENTS.md
- **GitHub Copilot** - `.github/agents/*.yaml` with `copilot-instructions.md`
- All providers now deploy agents, commands, and skills consistently
- Platform documentation for each provider in `docs/integrations/`

**In-Session Update Command** (PR #69):

- **`/aiwg-refresh`** - Update AIWG CLI and redeploy frameworks without leaving session
  - `--update-cli` - Update the AIWG CLI itself
  - `--all` / `--sdlc` / `--marketing` / `--utils` - Redeploy specific frameworks
  - `--provider` - Target specific provider
  - `--dry-run` - Preview changes without applying

**Testing-Quality Addon** (PR #68):

- 6 new skills for test enforcement:
  - `tdd-enforce` - Pre-commit hooks + CI coverage gates
  - `mutation-test` - Validate tests beyond coverage (Stryker/PITest)
  - `flaky-detect` - Identify unreliable tests from CI history
  - `flaky-fix` - Pattern-based auto-repair
  - `generate-factory` - Auto-generate test data factories
  - `test-sync` - Detect orphaned tests, missing tests
- Research foundation: Kent Beck (TDD), Google Testing Blog, FlaKat, UTRefactor
- `/setup-tdd` command for project TDD configuration

**Testing Infrastructure** (PRs #66, #67):

- Live CLI integration tests for all providers (Claude, Factory, OpenAI, Cursor, Copilot)
- Factory AI deployment integration tests with real droid validation
- Provider validation matrix in CI

**Documentation**:

- `docs/contributing/testing-requirements.md` - When full regression testing is required
- `docs/development/file-placement-guide.md` - Where to put different file types
- External research references to testing framework
- GitHub Copilot quickstart guide

### Fixed

- **Factory agent mapping** - Correct agent names and tool assignments for Factory droids
- **Codex integration tests** - Resolved test failures in OpenAI provider

### Changed

- Removed `aiwg demo` command in favor of comprehensive documentation
- Testing now enforced as first-class requirement across SDLC framework

---

## [2024.12.3] - 2025-12-11 – "It Just Works" Release

| What changed | Why you care |
|--------------|--------------|
| `aiwg doctor` command | Diagnose installation issues instantly |
| npm discoverability + badges | Actually shows up when you search npm |
| MCP server works from any folder | No more ".aiwg not found" errors |
| PATH warning on install | Know immediately if setup needs fixing |
| Windows + cross-platform fixes | Works on Windows out of the box |
| Team directives preserved | No more lost custom rules on regenerate |
| GitHub Pages docs | Temporary landing page while aiwg.io loads |
| @-mention traceability wiring | Agents navigate codebase via logical paths |
| Workspace cleanup commands | Prune stale files, archive completed plans |

### Added

- **`aiwg doctor`** - Health check command that diagnoses installation issues and provides fix suggestions
- **Postinstall PATH check** - Friendly warning with shell-specific fix instructions if `aiwg` isn't in PATH
- **GitHub Pages** - Temporary documentation at https://jmagly.github.io/ai-writing-guide
- **@-mention traceability** - Wired cross-references in 14 key files (source→test→requirements→architecture)
- **`/workspace-prune-working`** - Clean up `.aiwg/working/` by promoting, archiving, or deleting stale files
- **`/workspace-realign`** - Sync documentation with codebase changes, archive completed plans

### Changed

- **npm keywords** - Added 14 discoverable keywords (aiwg, agentic-ai, mcp-server, claude-skills, etc.)
- **npm description** - Clear, searchable description
- **README hero section** - Install command front and center
- **MCP server** - Auto-finds project root from any subdirectory (walks up looking for `.aiwg/`)

### Fixed

- **Windows paths** - Replaced string concatenation with `path.join()` throughout
- **CI matrix** - Added Windows runner to GitHub Actions
- **Team directives** - `/aiwg-regenerate-claude` preserves content below `<!-- TEAM DIRECTIVES -->`

---

## [2024.12.2] - 2025-12-10

### Skill Seekers Integration & Usability Improvements

This release adds **Skill Seekers community integration** with two new addons, **workspace health guidance** for transition points, and **standardized command usability** across all flow commands.

#### Added

**Skill Seekers Integration** (PRs #206, #207, #208 to Skill Seekers repo):
- **doc-intelligence addon** (`agentic/code/addons/doc-intelligence/`):
  - Intelligent documentation analysis and generation
  - Cross-repository knowledge synthesis
  - Documentation gap detection and remediation
  - Integrates with Skill Seekers community marketplace
- **skill-factory addon** (`agentic/code/addons/skill-factory/`):
  - Automated skill generation from natural language descriptions
  - Skill template scaffolding and validation
  - Multi-platform skill deployment (Claude, Factory, OpenAI)
- **SDLC Extensions for Skill Seekers**:
  - `skill-seekers-integration` extension with 5 specialized agents
  - Community skill discovery and curation workflows
  - Attribution and licensing compliance automation
- Attribution added to README.md and addon.json files

**Workspace Health Skill** (`aiwg-utils/skills/workspace-health/`):
- Natural language triggers: "check workspace health", "workspace status", "is my workspace aligned"
- Assesses `.aiwg/working/` directory health (stale files, large artifacts)
- Validates documentation alignment with codebase
- Checks artifact freshness and completeness
- Provides actionable recommendations without auto-executing
- Designed for use at phase transitions and after intensive processes

**Post-Completion Guidance**:
- Added "Post-Completion" section to 9 major flow commands:
  - `flow-concept-to-inception`
  - `flow-inception-to-elaboration`
  - `flow-elaboration-to-construction`
  - `flow-construction-to-transition`
  - `flow-delivery-track`
  - `flow-iteration-dual-track`
  - `flow-gate-check`
  - `flow-deploy-to-production`
  - `flow-hypercare-monitoring`
- Recommends workspace health check after workflow completion
- Suggests follow-up actions based on workflow context
- Template: `templates/flow-patterns/post-completion-template.md`

#### Changed

**Command Usability Standardization**:
- Added `--interactive` and `--guidance` parameters to 28 commands:
  - All intake commands (intake-wizard, intake-start, intake-from-codebase, etc.)
  - All flow commands (phase transitions, reviews, deployments)
  - Marketing commands (campaign-kickoff, creative-brief, etc.)
  - Gate and validation commands
- Consistent parameter documentation in frontmatter `argument-hint`
- Added "Optional Parameters" section to command bodies

**Multi-Provider Skill Deployment**:
- Skills now deploy successfully to Factory AI (previously Claude-only)
- Updated smoke tests to verify Factory skill deployment
- `--deploy-skills` works with `--provider factory`

#### Fixed

**Test Suite**:
- Fixed `cli-install.test.ts` smoke test for multi-provider skill deployment
- Test now verifies successful Factory deployment instead of expecting warning

---

## [2024.12.1] - 2025-12-10

### Production-Grade Reliability & Extensibility Release

This is a major release introducing **production-grade reliability patterns** based on academic research, the **AIWG Development Kit** for framework extensibility, **MCP Server** for Model Context Protocol integration, and **CLAUDE.md modernization** with path-scoped rules. Context loading is reduced by 87% for base sessions.

#### Added

**Research Integration** (REF-001, REF-002, REF-003):
- **REF-001**: Bandara et al. (2025) "Production-Grade Agentic AI Workflows" - 9 best practices:
  - BP-1: Direct tool calls over MCP for determinism
  - BP-3: One agent, one responsibility principle
  - BP-4: Single-responsibility agents
  - BP-5: Externalized prompts in version control
  - BP-6: Multi-model consortium for high-stakes outputs
- **REF-002**: Roig (2025) "How Do LLMs Fail In Agentic Scenarios?" - 4 failure archetypes:
  - Archetype 1: Premature Action Without Grounding
  - Archetype 2: Over-Helpfulness Under Uncertainty
  - Archetype 3: Distractor-Induced Context Pollution
  - Archetype 4: Fragile Execution Under Load
  - Key finding: Recovery capability > model size for success
- **REF-003**: MCP 2025-11-25 specification research and integration patterns
- Research references in `docs/references/` for traceable guidance

**AIWG Development Kit** (PR #57, #58):
- Three-tier plugin taxonomy: Frameworks (50+ agents) → Extensions (5-20 agents) → Addons (1-10 agents)
- CLI scaffolding commands:
  - `aiwg scaffold-addon <name>` - Create new addon package
  - `aiwg scaffold-extension <name> --for <framework>` - Create framework extension
  - `aiwg scaffold-framework <name>` - Create complete framework
  - `aiwg add-agent|add-command|add-skill|add-template` - Add components to packages
  - `aiwg validate <path> [--fix]` - Validate package structure
- In-session commands with AI guidance:
  - `/devkit-create-addon`, `/devkit-create-extension`, `/devkit-create-framework`
  - `/devkit-create-agent`, `/devkit-create-command`, `/devkit-create-skill`
  - `/devkit-validate`, `/devkit-test`
- Agent templates: simple (sonnet), complex (sonnet+search), orchestrator (opus+Task)
- Command templates: utility, transformation, orchestration
- Comprehensive documentation: `docs/development/devkit-overview.md`

**Production-Grade Reliability Patterns**:
- **Reliability prompts** in `aiwg-utils/prompts/reliability/`:
  - `decomposition.md` - Task breakdown using 7±2 cognitive rule
  - `parallel-hints.md` - Concurrent execution patterns
  - `resilience.md` - PAUSE→DIAGNOSE→ADAPT→RETRY→ESCALATE protocol
- **Core prompts** in `aiwg-utils/prompts/core/`:
  - `orchestrator.md` - Workflow orchestration guidance
  - `multi-agent-pattern.md` - Primary→Reviewers→Synthesizer pattern
  - `consortium-pattern.md` - Multi-model validation for uncertain outputs
- **New agents**:
  - `consortium-coordinator` - Coordinates multi-agent consensus decisions
  - `self-debug` - Diagnoses and recovers from agent failures
  - `aiwg-developer` - AIWG development assistance with taxonomy knowledge
  - `context-curator` - Pre-filters context, removes distractors (Archetype 3)

**New Addons**:
- **aiwg-hooks** - Claude Code hook templates for workflow tracing:
  - `aiwg-trace.js` - Captures SubagentStart/SubagentStop events
  - JSONL trace format for debugging, performance analysis, audit
  - `trace-viewer.mjs` - View traces as tree/timeline/JSON
- **aiwg-evals** - Automated agent quality assessment:
  - Archetype tests: grounding-test, substitution-test, distractor-test, recovery-test
  - Performance tests: parallel-test, latency-test, token-test
  - Quality tests: output-format, tool-usage, scope-adherence
  - CI integration workflow template
  - Quality reports with trend tracking
- **context-curator** - Distractor filtering for Archetype 3 prevention:
  - Context classification: RELEVANT/PERIPHERAL/DISTRACTOR
  - Scope enforcement rules
  - `.claude/rules/` deployment for runtime guidance

**@-Mention Conventions & Wiring**:
- 5 new commands for artifact traceability:
  - `/mention-wire` - Analyze codebase and inject @-mentions
  - `/mention-validate` - Validate all @-mentions resolve to existing files
  - `/mention-report` - Generate traceability report from @-mentions
  - `/mention-lint` - Lint @-mentions for style consistency
  - `/mention-conventions` - Display naming conventions and placement rules
- Standardized mention patterns in `registry.json`:
  - Requirements: `@.aiwg/requirements/UC-{NNN}-{slug}.md`
  - Architecture: `@.aiwg/architecture/adrs/ADR-{NNN}-{slug}.md`
  - Security: `@.aiwg/security/TM-{NNN}.md`
  - Testing: `@.aiwg/testing/test-cases/TC-{NNN}.md`
- Guidelines: `docs/guides/mention-conventions.md`

**Workspace Maintenance Commands** in aiwg-utils:
- `/workspace-realign` - Sync `.aiwg/` docs with code changes:
  - Analyzes git history since last alignment
  - Archives stale documents, flags missing docs
- `/workspace-prune-working` - Clean `.aiwg/working/` directory:
  - Promotes finalized docs to permanent locations
  - Archives useful historical content
  - Deletes truly temporary files
- `/workspace-reset` - Complete `.aiwg/` wipe with safety features:
  - Backup creation, selective preservation (intake, team)
  - Requires confirmation (`RESET`) or `--force`

**Framework-Scoped Workspace Structure** (PR #54):
- Multi-framework coexistence in same project:
  - Marketing can read SDLC artifacts (feature specs) for launch content
  - Each framework maintains isolated write scope
- Target structure:
  ```
  .aiwg/
  ├── frameworks/
  │   ├── sdlc-complete/     # SDLC artifacts
  │   └── media-marketing-kit/  # Marketing artifacts
  └── shared/                 # Cross-framework resources
  ```
- Rollback CLI improvements for finding backups
- Assessment reports and working artifacts

**Skills System Expansion**:
- 6 new skills in aiwg-utils:
  - `claims-validator` - Validates factual claims in content
  - `config-validator` - Validates AIWG configuration files
  - `nl-router` - Natural language command routing
  - `parallel-dispatch` - Parallel agent coordination
  - `project-awareness` - Project context detection
  - `template-engine` - Template rendering and variable substitution
  - `artifact-metadata` - Artifact metadata extraction

**npm Package Distribution** (PR #55):
- Published to npm as `aiwg` package
- Global installation: `npm install -g aiwg`
- Package includes: bin/, src/, tools/, agentic/, docs/, core/
- Semantic versioning: 2024.12.1
- Automated publish workflow via GitHub Actions

**MCP Server Implementation** (Phase 1):
- Complete MCP server following 2025-11-25 specification (`src/mcp/server.mjs`)
- 5 MCP tools:
  - `workflow-run` - Execute AIWG workflows with automatic prompt integration
  - `artifact-read` - Read artifacts from `.aiwg/` directory
  - `artifact-write` - Write artifacts to `.aiwg/` directory
  - `template-render` - Render AIWG templates with variable substitution
  - `agent-list` - List available AIWG agents by framework
- 3 MCP resources:
  - `aiwg://prompts/catalog` - Prompts catalog
  - `aiwg://templates/catalog` - Templates catalog
  - `aiwg://agents/catalog` - Agents catalog
  - Dynamic URI templates for specific items
- 3 MCP prompts (automatically integrated into workflow-run):
  - `decompose-task` - Break complex tasks into manageable subtasks
  - `parallel-execution` - Identify parallelizable work
  - `recovery-protocol` - PAUSE→DIAGNOSE→ADAPT→RETRY→ESCALATE error handling
- Workflow metadata with complexity analysis and step descriptions
- MCP CLI commands: `aiwg mcp serve`, `aiwg mcp install`, `aiwg mcp info`
- Comprehensive test suite: 13 tests covering all MCP functionality
- Test fixture project (`test/fixtures/mcp-test-project/`) for validation

**CLAUDE.md Modernization**:
- New modular CLAUDE.md structure (134 lines vs 1,018 - **87% reduction**)
- Path-scoped rules in `.claude/rules/`:
  - `sdlc-orchestration.md` - Loaded when working in `.aiwg/**`
  - `voice-framework.md` - Loaded when working in `**/*.md`
  - `development.md` - Loaded when working in `src/**`, `test/**`
  - `agent-deployment.md` - Loaded when working in `.claude/agents/**`
- Reference documentation in `docs/reference/`:
  - `ORCHESTRATOR_GUIDE.md` - Full orchestration reference (on-demand via @-mentions)
- Context loading follows Anthropic best practices for token efficiency

**Centralized Registry**:
- `agentic/code/config/registry.json` - Single source of truth for:
  - AIWG path resolution (eliminates duplication across 20+ commands)
  - Natural language pattern mappings (70+ phrases → flow commands)
  - Artifact path definitions
  - Provider-specific configurations (Claude, Factory, OpenAI, Warp)
  - @-mention patterns for traceability

**MCP Research & Documentation**:
- `docs/references/REF-003-mcp-specification-2025.md` - MCP 2025-11-25 research
- Updated platform adapter specification with MCP-first architecture

#### Changed

**Agent Design Philosophy** (from research):
- Agents now follow "10 Golden Rules" from Agent Design Bible:
  - Rule 1: Ground before acting (Archetype 1 prevention)
  - Rule 2: Escalate uncertainty (Archetype 2 prevention)
  - Rule 3: Scope context (Archetype 3 prevention)
  - Rule 4: Decompose tasks (Archetype 4 prevention)
  - Rule 5-10: Single responsibility, external prompts, tool discipline, etc.
- Agent linter validates rules compliance

**Command Updates**:
- `/aiwg-regenerate-claude` now generates modular structure by default
  - `--legacy` flag available for old monolithic format
  - Reports context reduction metrics in output
  - Generates `.claude/rules/` files based on detected frameworks

**Context Loading Strategy**:
- Base context: 134 lines (always loaded)
- SDLC context: +180 lines (loaded only when working in `.aiwg/`)
- Voice context: +75 lines (loaded only when working in `**/*.md`)
- Dev context: +85 lines (loaded only when working in `src/`, `test/`)
- Detailed docs: On-demand via `@docs/reference/` mentions

**Addon Structure Migration** (PR #50):
- Writing Quality migrated to addon structure (`agentic/code/addons/writing-quality/`)
- Clear addon taxonomy established (Frameworks, Addons, Extensions)
- Plugin management CLI commands added

**Dependencies**:
- Added `@modelcontextprotocol/sdk` ^1.24.0 (MCP server)
- Added `zod` ^3.25.0 (schema validation)

#### Fixed

**MCP Server**:
- Prompt argsSchema type handling (MCP passes all args as strings)
- `mcp install --dry-run` flag parsing

**Documentation**:
- Updated CLAUDE.md to follow 100-200 line best practice
- Removed redundant orchestration guidance from multiple locations
- Consolidated natural language translations into registry
- Removed inflated metrics and unimplemented feature claims from README
- Removed internal project status and roadmap from public README

**CLI Tooling**:
- `aiwg -update` now refreshes shell aliases properly
- Rollback CLI finds backups in both workspace and project locations
- Fixed skills not deploying for voice-framework, SDLC, and MMK frameworks
- Fixed metadata-validation workflow to skip gitignored directories

**Tests**:
- Comprehensive test remediation for SDLC framework and writing modules
- TypeScript unused variable errors resolved across codebase
- Added CLI installation smoke tests

### Migration Guide

**For Existing Projects (CLAUDE.md Modernization):**

The new modular CLAUDE.md structure is opt-in. Existing monolithic CLAUDE.md files continue to work. To migrate:

1. Backup your current CLAUDE.md (preserved automatically by regenerate command)
2. Run `/aiwg-regenerate-claude` to generate modular structure
3. Review generated `.claude/rules/` files
4. Add team-specific content below `<!-- TEAM DIRECTIVES -->` marker

**For Production-Grade Patterns:**

1. Update AIWG installation:
   ```bash
   aiwg -update  # Or: aiwg -reinstall for clean install
   ```

2. Deploy new addons:
   ```bash
   aiwg use all  # Deploys all frameworks + new addons
   ```

3. Import reliability prompts in your CLAUDE.md:
   ```markdown
   See @~/.local/share/ai-writing-guide/agentic/code/addons/aiwg-utils/prompts/reliability/resilience.md
   ```

**For Development Kit:**

Use scaffolding commands to create new packages:
```bash
aiwg scaffold-addon my-utils --description "My custom utilities"
aiwg add-agent code-helper --to my-utils --template simple
```

Or in-session with AI guidance:
```bash
/devkit-create-addon my-utils --interactive
```

**For MCP Integration:**

```bash
# Start MCP server
aiwg mcp serve

# Or install config for your client
aiwg mcp install claude  # For Claude Desktop
aiwg mcp install cursor  # For Cursor IDE

# View MCP info
aiwg mcp info
```

**For @-Mention Traceability:**

1. Wire mentions into existing artifacts:
   ```bash
   /mention-wire --target .aiwg/requirements/
   ```

2. Validate all mentions resolve:
   ```bash
   /mention-validate
   ```

---

## [0.9.1] - 2025-12-08

### Voice Framework & Skills System Release

This release introduces the **Voice Framework** addon and comprehensive **Skills system** across all frameworks. The CLI tooling has been updated to deploy skills automatically with framework installations.

#### Added

**Voice Framework Addon** (PR #52):
- 4 built-in voice profiles for consistent, authentic writing:
  - `technical-authority` - Direct, precise, confident (API docs, architecture)
  - `friendly-explainer` - Approachable, encouraging (tutorials, onboarding)
  - `executive-brief` - Concise, outcome-focused (business cases, reports)
  - `casual-conversational` - Relaxed, personal (blogs, newsletters)
- 4 voice skills:
  - `voice-apply` - Transform content to match a specified voice profile
  - `voice-create` - Generate new profiles from descriptions or examples
  - `voice-blend` - Combine multiple profiles with weighted ratios
  - `voice-analyze` - Analyze content's current voice characteristics
- YAML voice profile schema with tone, vocabulary, structure, perspective settings
- Project-specific voice profiles via `.aiwg/voices/`

**Skills System** (PR #51):
- Claude Code Skills support across all frameworks (SKILL.md format)
- 29 total skills deployed with `aiwg use all`:
  - 1 writing-quality skill (ai-pattern-detection)
  - 6 aiwg-utils skills (config-validator, project-awareness, etc.)
  - 4 voice-framework skills (voice-apply, voice-create, voice-blend, voice-analyze)
  - 10 SDLC framework skills (project-health, artifact-indexer, etc.)
  - 8 MMK framework skills (campaign-tracker, content-scheduler, etc.)
- Skills auto-deploy with `aiwg use <framework>`

**CLI Improvements**:
- New `aiwg use writing` command for Writing Quality + Voice Framework
- `--deploy-skills` flag for explicit skill deployment
- Skills deployment by mode: general, writing, sdlc, marketing, both, all
- Dry-run support for skill deployment testing

**Test Coverage**:
- `test/unit/cli/skill-deployer.test.ts` - 20 tests for skill deployment
- `test/unit/writing/voice-profile.test.ts` - 16 tests for voice profiles
- Integration tests for deploy-agents.mjs skill deployment

#### Changed

**Documentation Updates**:
- Updated all quickstart guides with Voice Framework sections
- Added voice profile usage to CLI_USAGE.md
- Updated integration quickstarts (Claude Code, Warp Terminal)
- Added Voice Framework integration to writing-quality addon README

**Deprecations**:
- `validation/banned-patterns.md` deprecated in favor of voice profiles
- Pattern-avoidance approach replaced by positive voice definition

#### Fixed

**CLI Tooling**:
- Fixed skills not deploying for voice-framework, SDLC, and MMK frameworks
- Fixed mode filtering for skill deployment
- Added provider restriction messaging (skills Claude-only currently)

### Migration Guide

**From banned-patterns to Voice Framework:**

1. Deploy the writing framework:
   ```bash
   aiwg use writing
   ```

2. Replace pattern avoidance with voice profiles:
   ```text
   # Before (pattern avoidance)
   "Write this avoiding AI patterns like 'delve into', 'it's important to note'"

   # After (voice definition)
   "Write this in technical-authority voice"
   ```

3. Create custom voice profiles for your project:
   ```yaml
   # .aiwg/voices/my-brand.yaml
   name: my-brand
   description: Our brand voice
   tone:
     formality: 0.5
     confidence: 0.8
   ```

---
