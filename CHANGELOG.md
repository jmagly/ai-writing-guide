# Changelog

All notable changes to AIWG project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project uses [Calendar Versioning (CalVer)](https://calver.org/) with npm-compatible format (`YYYY.M.PATCH`).

## [Unreleased]

## [2026.5.11] - 2026-05-25 — "Provider detection, local issue sync, and media transcript prep"

This patch release hardens AIWG's cross-provider workflow plumbing, adds local issue-tracker synchronization paths, and documents the current code-to-docs audit before the next stable tag. It also ships the first concrete time-based media primitive while keeping the larger research handoff work explicit as follow-up scope.

### Why this matters to users

| What changed | What it gives you |
|---|---|
| **Codex-aware provider detection** | Mixed Claude/Codex workspaces now prefer the active Codex runtime where appropriate, so refresh and regenerate flows target the right provider files. |
| **Local issue sync workflows** | Projects can import/export local issue stores, run live tracker sync, and document conflict handling without guessing which issue backend is active. |
| **Media transcript sidecars** | Media-curator can now surface a transcript sidecar workflow for acquired audio/video, including source metadata, hashes, timestamps, and degraded plans when local STT tooling is missing. |
| **Security and supply-chain scaffolding** | Security-engineering gained CI emitters, banned-API scaffolds, DFIR readiness routing, and supply-chain audit documentation. |
| **Release and docs hygiene** | Release config now records the broad doc-sync scope for all agentic/code sources plus repository Markdown, and release tags are routed through the dedicated signing wrapper. |

### Added

- Local issue import/export and live sync workflows, plus documentation for migration, conflicts, backups, and credentials.
- `transcribe-media` media-curator skill with a sample transcript sidecar and discovery coverage.
- Security-engineering cycle-1 scaffolds for banned APIs, sanitizer/fuzzing CI emitters, disclosure tracking, DFIR readiness, and external npm supply-chain audit provenance.
- Community, browser-control, and Omnius integrator documentation surfaces.

### Changed

- Codex provider detection now uses runtime/process markers and mixed-workspace regression coverage for `regenerate`, `refresh`, `steward`, and related provider-selection paths.
- Media-curator docs now describe transcript sidecars and research handoff preparation alongside archive curation.
- Release configuration doc-sync guidance now includes all of `agentic/code/` and all repository Markdown files, reflecting where AIWG capabilities actually live.
- Release tagging is configured to use `tools/release/cut-tag.sh` instead of a raw `git tag` command so the release signing key remains separate from the regular commit key.
- The system-wide `cli-secondary` rule now states that raw CLI commands augment skill workflows; skills remain responsible for orchestration, final formatting, presentation, synthesis, gates, and recovery.
- Claude Code external loop launches now default-disable 1M-context model variants unless `CLAUDE_CODE_DISABLE_1M_CONTEXT` is explicitly set, with docs covering the credit-account tradeoff and opt-in path.
- Project signing-key split is documented in `AGENTS.override.md` and `.aiwg/release-process.md`: regular commits use the host commit key, while annotated release tags use the AIWG release key.

### Fixed

- Channel sync and refresh provider-detection tests were stabilized.
- Docsite deployment now normalizes the deploy root and verifies release artifacts more directly.
- Address-issues and agent-loop paths were hardened, including malicious issue-body handling and stale-window closure auditing.
- Media transcript discovery now routes `transcribe media` to the media-curator skill.

### Known follow-up

- The time-based media research epic remains open for REF templates, timestamp citation policy, citation sidecars, `induct-media`, and quickref/generated-guidance discoverability.
- Cargo/Rust crate supply-chain discovery still routes to npm-specific audit guidance first and remains tracked as follow-up work.
- Provider field-validation claims remain limited to sessions already evidenced in the issue tracker; remaining providers still need real session validation.
- A repo-wide audit is open as #1480 to align docs, quickrefs, skill bodies, and generated guidance with the skill-first CLI augmentation rule.

### Tests

Release-prep verification for this line:

```bash
npm run check:versions
npm run typecheck
npm run build:cli
npm test
npm run uat
```

### Migration notes

No breaking changes. Projects using local issue stores should review `docs/local-issues.md` before enabling live sync so tracker direction, conflict handling, and credential sourcing are explicit.

## [2026.5.10] - 2026-05-19 — "Beginner onboarding wizard + docs"

This patch release adds a guided first-run path for new users and restores the literal meaning of `aiwg use all`.

### Why this matters to users

| What changed | What it gives you |
|---|---|
| **`aiwg wizard` walks first-time setup** | Provider choice, profile selection, execution mode, and verification in a single guided flow. JSON output stays plan-only for automation; unattended execution requires `--non-interactive`. |
| **`aiwg use all` deploys the full surface again** | The literal meaning is restored. Workspace-aware filtering moves to `aiwg use --workspace-signals` (preview) and `aiwg use --profile <name>` (deploy filtered). |
| **`aiwg status --probe --json` reports engagement deterministically** | Distinguishes configured, partially configured, and repair-needed workspaces. Malformed local config returns repair guidance instead of raw parse failures. |
| **Full deploy summary separates native vs discoverable skills** | The capability index build prints a discoverable-skill count alongside the platform-native count so the budget story is legible. |
| **Beginner docs refreshed** | Provider handoff, scope and recovery, onboarding validation, share/demo workflows, and current onboarding research. |

### Added

- `aiwg wizard` interactive onboarding flow with provider/profile/mode/verification steps.
- Beginner documentation: `docs/beginner-first-success.md`, `docs/beginner-provider-handoff.md`, `docs/beginner-scope-and-recovery.md`, `docs/beginner-onboarding-validation.md`, `docs/beginner-share-demo-assets.md`, `docs/beginner-research-refresh-2026.md`, and `docs/beginner-aiwg-language-map.md`.
- AIWG.md context finalization includes engagement verification guidance without adding generated attribution footers.

### Changed

- `aiwg use all` deploys every framework, addon, and deployable extension by default.
- `aiwg use --workspace-signals` previews a workspace-aware plan; `aiwg use --profile <name>` deploys a filtered profile.
- Skills/commands unification guide describes provider-specific command mirroring without exposing internal tracker references.
- Release navigation manifest includes the current and immediately previous patch release.
- security-auditor agent discipline tightened; rolling `audit.md` rollup added.

### Fixed

- Windows doctor and skill registration hardened against path-handling edge cases.
- Claude provider command-mirror deduplication so wrapper commands don't double-deploy.
- Docsite release deploy verification covers the v2026.5.10 announcement file.

### Tests

- `npm run typecheck`
- `npm run build:cli`
- `npx vitest run --config config/vitest.config.js test/unit/cli/wizard.test.ts`
- `npx vitest run --config config/vitest.config.js test/unit/cli/handlers/use-workspace-filter.test.ts`
- `npm test`

### Migration notes

If you depended on `aiwg use all` deploying only the workspace-aware subset, switch to `aiwg use --profile <name>` or `aiwg use --workspace-signals` followed by an explicit `aiwg use` invocation for the previewed set.

## [2026.5.9] - 2026-05-18 — "Workspace deploy + command surface parity"

This patch release fixes the workspace-aware `aiwg use all` deployment flow and restores operator workflow discoverability across providers after the skills-first pivot.

### Why this matters to users

| What changed | What it gives you |
|---|---|
| **`aiwg use all` deploys the workspace-aware plan once** | The auto-selected framework/addon plan no longer re-enters the full post-deploy flow for every selected framework. Users avoid repeated capability-index builds, repeated reload messages, and duplicate hook backup lines. |
| **Operator skills are mirrored as provider commands** | Workflows such as `aiwg-setup-project`, `aiwg-update-claude`, and `aiwg-update-agents-md` are copied to each provider's command surface where possible, so slash/command workflows remain locatable even when the canonical artifact is a skill. |
| **Provider command paths were normalized** | OpenCode and Warp now have explicit command directories in the provider deployment map, and fallback command mirroring places command assets in the closest reasonable provider location. |
| **Doctor guidance points at workspace-aware deploy** | `aiwg doctor` and listing guidance steer high-skill-count workspaces toward workspace-aware deployment when provider listing budgets are likely to be exceeded. |

### Changed

- `aiwg use all` now computes the workspace-aware framework/addon/extension plan once and deploys selected source directories directly.
- `aiwg use --workspace-signals --dry-run` reports the same workspace-aware subset that `aiwg use all` uses by default.
- Provider deployment now mirrors command-like operator skills into provider command surfaces across supported providers.
- OpenCode and Warp provider definitions now declare command output directories for mirrored operator workflows.
- The legacy full deployment path remains available with `aiwg use all --no-workspace-signals`.

### Fixed

- Fixed issue #1380: `aiwg use all` appeared to run repeatedly because each selected framework triggered the full framework post-deploy flow.
- Fixed user-reported discoverability gap for `aiwg-setup-project`: the skill is still discoverable via `aiwg discover` / `aiwg show skill`, and the workflow is also mirrored onto command surfaces for command-capable providers.
- Added integration coverage that verifies command mirroring for Codex, OpenCode, Copilot, Warp, and Windsurf provider deployments.

### Tests

- `npm run typecheck`
- `npm run build:cli`
- `npx vitest run --config config/vitest.config.js test/integration/deployment-completeness.test.ts`
- `npx vitest run --config config/vitest.config.js test/integration/use-all-deployment.test.ts`
- `npm test`

### Migration notes

No breaking changes. Existing skills remain the canonical source, and command copies are compatibility mirrors for providers and users that still expect command/slash-command workflows. Use `--no-workspace-signals` to force the pre-existing full deployment behavior.

### Links

- Release announcement: [docs/releases/v2026.5.9-announcement.md](docs/releases/v2026.5.9-announcement.md)

## [2026.5.8] - 2026-05-18 — "Fleet discipline + release hygiene"

This release collects the post-2026.5.7 operational hardening work: fleet behavior policies, provider-aware deployment of behavior artifacts, model-tier routing primitives, repo-access preflight, execution-mode ergonomics, status export, daemon/serve reliability coverage, and install-hygiene fixes that keep optional native dependencies out of the default install tree.

### Why this matters to users

| What changed | What it gives you |
|---|---|
| **Fleet discipline rules and behaviors** | `aiwg-fleet` adds quiet-bot and quiet-business-bot behavior bundles; `aiwg-utils` adds escalation discipline, tool quota, quiet mode, and repo-access rules for small-budget unattended bots. |
| **Fleet status export** | `aiwg status --export json|ndjson` and the documented schema give cockpit tools a stable, pull-based machine/workspace health payload. |
| **Repo-access preflight** | `aiwg repo-access` and the `respect-repo-access-manifest` rule make repository read-scope assumptions explicit before agents rely on paths they may not be able to inspect. |
| **Model-tier routing primitive** | New provider-neutral model routing types/helpers support Tier 0-3 decisions, escalation rationale, and premium confirmation requirements. |
| **Context parallelism caps** | `.aiwg/aiwg.config` can declare provider-scoped max parallel subagent limits; generated `AIWG.md` / `AGENTS.md` surfaces those caps and the RLM CLI respects them. |
| **Serve/daemon reliability** | A2A terminal task observation, PTY bridge resilience coverage, sandbox transport fixtures, and daemon tier-1 tests harden the execution stack without requiring a live sandbox in default CI. |
| **Install hygiene** | `better-sqlite3` and `@xenova/transformers` are optional peers instead of default install dependencies; SQLite implementation tests now skip cleanly when the optional peer is absent. |
| **Docsite release checks** | Notify/deploy workflows now fail on silent release-doc issues and verify the generated SPA section artifact rather than grepping the shell HTML. |

### Added

- `agentic/code/addons/aiwg-fleet/` — new addon with `quiet-bot` and `quiet-business-bot` behavior bundles plus provider activation docs.
- `agentic/code/addons/aiwg-utils/rules/escalation-discipline.md`, `tool-quota.md`, `quiet-mode.md`, and `respect-repo-access-manifest.md`.
- `docs/fleet/status-export-schema.md` for the versioned fleet status export payload.
- `docs/security/repo-access-manifest.md` for explicit repository read-access declarations.
- `docs/providers/behavior-artifacts.md` for provider behavior-artifact support and emulation.
- `src/models/router.ts` and model route decision types for tiered model-routing policy.
- `src/cli/handlers/repo-access.ts` and `src/policy/repo-access.ts`.
- `src/cli/handlers/execution-mode.ts` for execution-mode inspection.
- `src/providers/capability-matrix.ts` and `agentic/code/providers/capability-matrix.yaml`.
- `src/serve/a2a-terminal-observer.ts` and broad serve/daemon contract, unit, and integration fixtures.
- `agentic/code/frameworks/sdlc-complete/skills/issue-audit/` and the `issue-audit` command.
- `agentic/code/frameworks/research-complete/skills/corpus-index-build/build.py`.

### Changed

- Provider deployment now handles behavior artifacts across supported providers, with OpenClaw native support and documented fallback behavior where native lifecycle hooks are unavailable.
- `aiwg status` now supports fleet export modes and expanded status details for installed frameworks, deployments, recent activity, and health flags.
- `aiwg refresh`, `regenerate`, `steward`, plugin commands, writing validation, doctor, and workspace-status paths were tightened for project-local behavior and managed-marker drift.
- `AIWG.md` / `AGENTS.md` generation now surfaces configured parallelism caps and finalization behavior more explicitly.
- `rlm` honors the configured parallelism default, and `rlm-batch` / `rlm-context-management` docs describe the cap-aware behavior.
- Claude model config now defaults standard Sonnet usage to the standard context variant rather than an extended-context default.
- Package install metadata now treats install-heavy native features as opt-in optional peers.

### Fixed

- `discover` indexes canonical framework skills accurately and has regression coverage for framework skill coverage.
- `doctor` tolerates managed-marker hash drift without false-failing normal refresh paths.
- Serve mission accounting and tool resolution were corrected, including A2A terminal task-state observation.
- Context hook finalization now emits the expected provider files.
- `ci.yml` failure after the install-hygiene change is fixed by skipping only the SQLite backend implementation suite when `better-sqlite3` is absent.
- Docsite deploy verification now checks the generated release section file, and notify-site/docsite workflows fail loudly on missing or failed release-doc outputs.

### Tests

- Full local CI-shaped test after the SQLite optional-peer fix: `npm run test:ci` — passed.
- Latest Gitea CI on `main` after the fix: run `2333` — Test and Build passed.
- New/expanded coverage includes model routing, repo access, provider behavior emulation, capability preflight, status/workspace commands, serve/A2A observer paths, PTY bridge resilience, sandbox transport contract fixtures, RLM parallelism resolution, skill-lint companion CLI rules, package metadata install hygiene, and marketplace/package-lock version lockstep.

### Migration notes

No breaking changes for the base CLI. Install-heavy features that depend on `better-sqlite3` or `@xenova/transformers` now require explicit opt-in installation when used directly; graph-backend factory/error-path tests and docs continue to explain that optional setup path.

### Links

- Release announcement: [docs/releases/v2026.5.8-announcement.md](docs/releases/v2026.5.8-announcement.md)

## [2026.5.7] - 2026-05-15 — "RLM search reliability + internal loop routing"

This release tightens two recently updated automation paths: RLM search now preserves the user's query and covers small source files, while `agent-loop` routes to the in-session loop by default unless the user explicitly asks for the external daemon.

### Why this matters to users

| What changed | What it gives you |
|---|---|
| **`rlm-search --max-parallel` is parsed as an option** | `aiwg rlm-search "find all references to loop structures" --source docs --max-parallel 4` now keeps the full query instead of treating `4` as the query. Unknown flags now fail fast rather than allowing nearby positional values to overwrite the search text. |
| **RLM prep indexes single-chunk files** | Small docs and source files are included in the prep manifest and search plan. A source tree with only short files no longer produces an empty or partial RLM search. |
| **Prep reuse is coverage-checked** | Existing prep indexes are validated for source, file, manifest, and chunk coverage before reuse. Incomplete or stale prep from older runs is rebuilt automatically. |
| **`agent-loop` defaults to the internal loop** | Normal `agent-loop` requests stay in the current session. External daemon routing is still available through explicit external-loop commands or explicit user intent. |
| **Build-time version lockstep check** | `npm run build:cli` now fails if `package.json`, `package-lock.json`, or `.claude-plugin/marketplace.json` disagree on the release version. |

### Changed

- `agentic/code/addons/agent-loop/skills/agent-loop/SKILL.md` — bumped to skill version 3.1.0 and updated routing guidance so internal/in-session iteration is the default path.
- `docs/cli-reference.md` — documents `rlm-search --max-parallel` as an accepted alias, and describes the single-chunk prep and prep-index validation behavior.
- `agentic/code/addons/rlm/skills/rlm-search/SKILL.md` — documents coverage-checked prep reuse and single-chunk indexing.
- `package.json` — `build:cli` now runs `check:versions` before compiling, catching release-version drift early.
- `docs/contributing/versioning.md` and `tools/release/cut-tag.sh` — document the Codex/agent-runtime `HOME` vs operator `GNUPGHOME` signing-key gotcha so release agents can find the AIWG release key.

### Fixed

- `src/rlm/cli.ts` — `rlm-search` recognizes `--max-parallel`; unknown flags now produce a CLI error instead of shifting the query positional.
- `src/rlm/cli.ts` — `rlm-prep` writes manifests and chunk files for sources that fit in one chunk, then indexes them for downstream search.
- `src/rlm/cli.ts` — prep index reuse now checks that every expected source file, manifest, and chunk exists before search.
- `tools/workspace/check-marketplace-version.mjs` — now validates `package-lock.json` top-level and root-package versions in addition to marketplace metadata.
- External loop observability from the prior patch line is included in this release train: external session status can surface captured log output when the daemon path is intentionally used.

### Tests

- `test/uat/rlm-cli.uat.ts` adds regressions for single-chunk manifest creation, single-chunk prep indexing, and `rlm-search --max-parallel 4` query preservation.
- `test/unit/workspace/check-marketplace-version.test.ts` adds regressions for package-lock top-level drift, package-lock root-package drift, marketplace drift, and the allowed pre-release marketplace exception.
- Verified locally with `npm run check:versions`, `npm run test -- test/unit/workspace/check-marketplace-version.test.ts`, `npm run uat -- test/uat/rlm-cli.uat.ts`, and `npm run build:cli`.

### Migration notes

No breaking changes. Existing `rlm-search --parallel N` calls continue to work. `--max-parallel N` is now accepted by both the source skill and CLI. Existing `agent-loop` invocations keep working; only the default routing preference changed so external daemon behavior requires explicit external-loop intent.

### Links

- Release announcement: [docs/releases/v2026.5.7-announcement.md](docs/releases/v2026.5.7-announcement.md)

## [2026.5.6] - 2026-05-14 — "Agent-loop completion inference + auto-compact discipline"

Two behavioral upgrades to make long-running and iterative work survive context pressure and reach measurable completion without operator hand-holding, plus a CI workflow ordering fix that prevents v2026.5.5-style stable-publish regressions.

### Why this matters to users

| What changed | What it gives you |
|---|---|
| **`agent-loop` infers `--completion` from project state** | Run `agent-loop "fix the failing tests"` without `--completion`. A new `infer-completion-criteria` skill walks five evidence layers — task verb → `CLAUDE.md`/`AGENTS.md`/`AIWG.md` Development sections → package manifests (`package.json`, `Cargo.toml`, `pyproject.toml`, `go.mod`, `pom.xml`, …) → CI config (`.github/workflows/`, `.gitea/workflows/`, GitLab/CircleCI/Jenkins) → `.aiwg/` artifacts (test-strategy, related use cases by ID match, prior progress files) — and proposes a measurable criterion with rationale and confidence level. High-confidence proposals auto-adopt with `--auto-criteria`; otherwise the proposal is surfaced for confirm/edit/abort. Refusal path is explicit: tasks like "make it better" with no derivable measurable gate get a refusal with concrete rephrasing suggestions. |
| **New `auto-compact-continue` rule (HIGH)** | The answer to "should I keep working?" is always YES — until measurable completion criteria are met or the user redirects. Context pressure, long tool output, and crossing iteration N are not scope questions. The rule codifies the auto-compact-and-continue discipline backed by Anthropic's [Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) and the [Compaction docs](https://platform.claude.com/docs/en/build-with-claude/compaction): write progress files at `.aiwg/working/<task>-progress.md` every 10–15 tool calls (REF-122 aggressive vs passive: 22.7% vs 6% savings), let the platform auto-compact, recover via the AIWG durable substrate (activity log, progress file, git, memory, `CLAUDE.md`/`AGENTS.md`/`AIWG.md`). |
| **CI: build before tests in `npm-publish.yml`** | The v2026.5.5 stable publish failed because tests ran before build, and several tests assert on `dist/` output (regression test for #1001). The Gitea workflow now matches `ci.yml`: typecheck → build → test → publish. Without this, the next stable publish would have hit the same failure mode. |

### Added

- `agentic/code/addons/agent-loop/skills/infer-completion-criteria/` — new skill (~280 lines). Deterministic 5-layer inference pipeline with structured YAML output (criterion, verification command, rationale, confidence, alternatives, max-iterations suggestion). Documents edge cases for monorepos, multi-language projects, broken-test suites, use-case acceptance criteria, and the refusal path. Wired into `agent-loop/manifest.json` skills array.
- `agentic/code/addons/aiwg-utils/rules/auto-compact-continue.md` — new HIGH rule (~250 lines). Codifies the auto-compact-and-continue discipline with 8 mandatory rules, interaction with `vague-discretion`/`anti-laziness`/`human-authorization`/`instruction-comprehension`/`skill-discovery`/`activity-log`/`context-budget`, recovery protocol after compaction, named exceptions, and platform applicability across all 10 supported providers. (Landed in v2026.5.5's incident-fix commit f87ba48c; called out in this release for visibility since the user-facing impact is felt now that the agent-loop changes pair with it.)
- Two new research references in companion `research-papers` repo:
  - **REF-909** — Anthropic, *Effective Harnesses for Long-Running Agents* (Nov 2025). Initializer-agent / coding-agent pattern, `claude-progress.txt`, "failed approaches" as load-bearing artifact across context resets.
  - **REF-910** — Anthropic, *Compaction* (Claude API Documentation, 2026). Auto-compact mechanics, `## Compact Instructions`, what survives compaction.

### Changed

- `agentic/code/addons/agent-loop/skills/agent-loop/SKILL.md` — completion-inference section now delegates to the new `infer-completion-criteria` skill. The previous inline 7-row Node-centric pattern table is demoted to a "last-resort fallback" with explanatory note. Related-skills list adds `infer-completion-criteria` and `agent-loop-ext`.
- `agentic/code/addons/agent-loop/skills/ralph/SKILL.md` — `--completion` is now optional. Phase 1 initialization invokes inference when omitted; high-confidence proposals or `--auto-criteria` adopt silently, otherwise the user is asked via `AskUserQuestion` (per `native-ux-tools`). Loop also writes the resolved criterion and rationale into the loop's progress file per `auto-compact-continue`. New flag: `--no-infer-completion` for explicit-required behavior.
- `agentic/code/addons/agent-loop/skills/agent-loop-ext/SKILL.md` — same `--completion`-optional treatment for the crash-resilient external loop, with TTY-aware confirmation (interactive: confirm; headless/CI: adopt high-confidence proposals, fail fast with diagnostic on low confidence). Proposal persisted to `.aiwg/ralph-external/<run-id>/inferred-completion.yaml` for crash recovery.
- `agentic/code/addons/agent-loop/agents/ralph-verifier.md` — gained a "Companion skill" section documenting that when the criterion was inferred, the verifier can reference the rationale chain from the progress file / inferred-completion.yaml in its verification reports.
- `agentic/code/addons/agent-loop/manifest.json` — added `infer-completion-criteria` to the skills array.
- `agentic/code/addons/aiwg-utils/manifest.json` — added `auto-compact-continue` to the rules array; `RULES-INDEX.md` updated to 21 rules with the new HIGH-tier entry placed at the top of the index.
- `.gitea/workflows/npm-publish.yml` — Build step now runs **before** Run tests, matching `ci.yml`. Several tests assert on `dist/` output (e.g. `test/unit/cli/validate-metadata-import.test.ts` asserts the import path resolves to `dist/src/plugin/metadata-validator.js`); pre-2026.5.6 the workflow ran tests against stale build output and the stable publish at v2026.5.5 hit this. Inline comment cites the v2026.5.5 incident so future contributors understand the ordering constraint.

### Fixed

- Stable npm publish path: tests now run against current `dist/` artifacts. The v2026.5.5 publish failure mode (test references resolving against stale or missing build output) is closed.

### Migration notes

No breaking changes. Existing `agent-loop` / `ralph` / `agent-loop-ext` invocations with explicit `--completion` continue to work unchanged. The new behavior only activates when `--completion` is omitted.

If you want the old hard-error-on-missing-completion behavior, pass `--no-infer-completion`. If you want CI-style fully-automated runs that adopt the inferred criterion without confirmation, pass `--auto-criteria`.

### Companion: research-papers corpus

The AIWG research corpus at `git@git.integrolabs.net:roctinam/research-papers.git` gained REF-909 and REF-910 as the load-bearing citations for the new `auto-compact-continue` rule. Both are GRADE LOW (vendor documentation) but authoritative for Claude-specific patterns and reflect production experience from the Claude Code team.

### Links

- [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) — Anthropic Engineering, Nov 2025
- [Compaction — Claude API Docs](https://platform.claude.com/docs/en/build-with-claude/compaction) — Anthropic, 2026
- REF-122 *Active Context Compression* (Verma, 2026) — already in corpus; the empirical basis for aggressive in-session compression
- Release announcement: [docs/releases/v2026.5.6-announcement.md](docs/releases/v2026.5.6-announcement.md)

## [2026.5.5] - 2026-05-14 — "Cross-provider discover-first parity"

Two user-facing changes plus the deployment-pipeline fix that makes the
discover-first protocol reach all 10 supported providers on every fresh
`aiwg use` invocation. Companion artifact: the Novice-User Adoption study
(Workstreams A-G), landed under `.aiwg/studies/novice-user-adoption/`.

### Why this matters to users

| What changed | What it gives you |
|---|---|
| **`aiwg use` warns when invoked from `$HOME` / `/` / `/tmp`** | First-run protection. When `aiwg use sdlc` runs from a directory with no project signals (`.git`, `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `pom.xml`, `Gemfile`, `build.gradle`, `*.csproj`), AIWG emits a 3-second cancellable warning naming the target directory and pointing at recovery. `AIWG_GLOBAL_INSTALL=1` suppresses the delay; non-cancelled emissions write `warn:no-project-signal` to `.aiwg/activity.log`. Stat-only walk completes in <50ms (CI-enforced). |
| **Discover-first protocol now reaches every provider** | Before this release, the `skill-discovery` rule (mandates `aiwg discover` before declining a request or improvising a workflow) was deployed only to Claude Code and Cursor. Eight other providers had stale leftover copies or no copy at all. After this release, every provider's `aiwg use` invocation deploys the current rule body to its native rules directory, or — for Warp and Hermes — inlines it into the appropriate aggregation surface (WARP.md and AGENTS.md priming). |
| **Documented scope-model trade-off (REF-720)** | `docs/cli-reference.md` and `README.md` now document the project-scope (default) vs user-scope (global install) trade-off side-by-side, citing the REF-720 cross-context-bleed evidence (39% capability drop). ADR-NUA-001 formalizes global install as a first-class supported flow with project-scope remaining the recommended default. |

### Added

- `src/cli/project-isolation/` — new module (signals.ts, detect.ts, warning.ts, index.ts) wiring the project-isolation warning into `UseHandler.execute()`. 29 unit tests covering per-signal positive cases, walk-depth boundary (MAX_PARENT_DEPTH = 3), Ctrl-C cancellation, env-var suppression, activity-log integration, and a CI-enforced performance gate (<50ms median in a project root).
- `agentic/code/frameworks/sdlc-complete/templates/aiwg-sections/02b-discover-first.md` — new template fragment registered in the aiwg-sections manifest. Ready for downstream wiring once the fragment-based AIWG.md generator returns to the live pipeline.
- `.aiwg/studies/novice-user-adoption/` — full study deliverables across Workstreams A-G (10 baselined documents under `working/`): hookup matrix, read-access audit, wizard design + CW, engagement-surface design + Lee & See trust-calibration analysis, global-install rough-edge inventory, comms drafts, three empirical-question instruments.
- Three new follow-up tracking issues filed and resolved during the study: #1343 (rule deployment), #1346 (Warp aggregation), #1347 (Hermes priming).

### Changed

- `agentic/code/addons/aiwg-utils/manifest.json` — `consolidation.deployIndexOnly` changed from `true` to `false`. Individual rule files (skill-discovery, no-attribution, anti-laziness, etc.) now deploy alongside `RULES-INDEX.md` to every provider's rules directory. Per saved-memory `feedback_parity_no_removal`: always-deploy + adapt — no writer was removed; the deploy set was extended. Closes #1343.
- `tools/warp/setup-warp.mjs` — new `transformRuleToSection()` and `collectAiwgRulePaths()` helpers plus a "## AIWG Rules" aggregation block in `generateAIWGContent()`. Regenerated WARP.md inlines the full aiwg-utils rule bodies (skill-discovery first), turning the previous "0 discover-protocol references" into 101. Closes #1346.
- `tools/agents/providers/hermes.mjs` — `CRITICAL_RULE_DIRECTIVES` extended from Top-6 to Top-7. skill-discovery added as the first directive (governs how the agent interacts with AIWG architecturally). ~1KB compressed, well within the 19KB Hermes AGENTS.md hard cap. Closes #1347.
- `src/mcp/tools/discovery.mjs` — `rule-list` MCP tool description updated to reflect the Top-7 inlining.
- `agentic/code/frameworks/sdlc-complete/templates/copilot/copilot-instructions.md.aiwg-template` — new "Discover-First Protocol (CRITICAL)" section inlined under the AIWG SDLC Framework heading. Copilot reads `.github/copilot-instructions.md` natively, so the inline section reaches Copilot agents at session start.
- `docs/cli-reference.md` — new "Scope models: project vs user (global)" section under `aiwg use` with side-by-side comparison, REF-720 trade-off, and per-provider notes.
- `README.md` — scope-model overview added to "What AIWG Is" with project recommendation, global as first-class supported, REF-720 framing.
- `test/unit/consolidated-rules.test.ts` — 2 tests rewritten to verify the new positive contract (aiwg-utils rules included, skill-discovery in returned set). 53/53 pass.

### Fixed

- `.claude-plugin/marketplace.json` — bumped `metadata.version` from 2026.5.2 → 2026.5.5 to satisfy the PUW-038 (#1139) lockstep check with `package.json`. The marketplace version had drifted across 2026.5.3 and 2026.5.4 releases; this release brings it back into lockstep.
- Stale `.claude/rules/skill-discovery.md` (401 lines) and `.cursor/rules/skill-discovery.md` (334 lines) had drifted from the source-of-truth (400 lines, md5 `93a41b...`). Next `aiwg use` invocation overwrites them with the current source.

### Audit / Documentation

- `.aiwg/studies/novice-user-adoption/working/hookup-matrix.md` — full per-platform discovery-hookup matrix; 10/10 providers structurally parity-fixed across cycles 3 and 4. Field-validation gap (behavioral verification per provider) remains as residual work tracked in #1336.
- Evidence-type taxonomy extension: introduces `deployment-scripted` as an intermediate evidence type between `static-flagged` (file:line reference only) and `scripted` (CI-verifiable behavior). Stronger than static-flagged because it confirms deployment delivers right files to right paths; weaker than full scripted because it does not verify agent behavior on the provider.

### Closed Issues

- #1335 — Workstream B: ship `aiwg use` project-isolation warning
- #1337 — Workstream C: wizard design doc + Cognitive Walkthrough
- #1339 — Workstream E: provider read-access audit
- #1340 — Workstream F: engagement-surface design + trust-calibration framework
- #1341 — Workstream G: 3 empirical questions (informal-but-directional)
- #1343 — Deploy skill-discovery rule to all 8 missing providers
- #1346 — Warp: aggregate aiwg-utils rules into WARP.md
- #1347 — Hermes: surface skill-discovery via MCP + AGENTS.md priming

### Open by Design

- #1336 — Workstream A hookup audit (partial-pass; field-validation sprint required)
- #1338 — Workstream D global-install ADR (awaiting 5-day Discord/Telegram comms window)
- #1342 — Citation-validate sweep (dormant per epic; gated on R-010 mitigation)
- #1344 — Inline discover-first protocol into AIWG.md / WARP.md / copilot-instructions.md (template fragment ready; AIWG.md generator wiring deferred)
- #1345 — Investigate OpenClaw skills-count anomaly

[2026.5.5]: https://git.integrolabs.net/roctinam/aiwg/compare/v2026.5.4...v2026.5.5

## [2026.5.4] - 2026-05-13 — "Hermes parity — full MCP surface"

29 issues (5 epics + 18 stories + 1 hotfix + 5 use cases) closing the
Hermes integration gap. Before this release, Hermes users could reach
only a small fraction of AIWG via MCP — five tools, one a stub. After this
release, Hermes users have feature parity with every other AIWG-supported
provider: 12 core MCP tools always-on, 45+ available via opt-in toolsets,
all 385 standard skills natively discoverable, top-6 CRITICAL rules
inlined into AGENTS.md priming.

### Why this matters to users

| What changed | What it gives you |
|---|---|
| **Standard skills (~385) now reachable from Hermes** | Earlier AIWG versions deployed standard skills to `~/.hermes/.aiwg/skills/` — a sibling of Hermes's scanned root, invisible to Hermes's `os.walk()`. Moved to `~/.hermes/skills/.aiwg/` (child of scanned root; recursively discovered). Verified against Hermes v0.13.0 `agent/skill_utils.py:478-489`. |
| **MCP `discover` + `*-list`/`*-show` tool pairs** | The post-#1212 discoverability surface (skills, commands, rules, agents, templates) is now reachable over MCP. Hermes can semantic-search AIWG capabilities and fetch full bodies on demand without project-context preload. |
| **`mcp_aiwg_command_run`** | One tool dispatches to any of the ~94 allow-listed AIWG CLI commands. Replaces the `workflow-run` stub (which returned parsed metadata but never executed). `shell: false` spawn, destructive ops gated behind `confirmed: true`. |
| **8 opt-in subsystem toolsets** | `AIWG_MCP_TOOLSETS=memory,kb,research,activity-log,index,ralph,mc,ops` (or `=all`) exposes 45+ additional tools. Default surface stays lean (~2.5K tokens schema) for small-context local Ollama; toolsets scale on demand. |
| **Top-6 CRITICAL rule priming in AGENTS.md** | The highest-enforcement AIWG rules (no-attribution, anti-laziness, citation-policy, token-security, versioning, ops-safety) are inlined into the generated AGENTS.md as a ~3K-char priming block. The remaining 23 rules reachable on demand via `mcp_aiwg_rule_show`. AGENTS.md stays well under Hermes's 20K cap. |
| **`.hermes.md` thin pointer emitted at project root** | Hermes loads `.hermes.md` first (priority over AGENTS.md per `agent/prompt_builder.py:1417-1456`). The pointer keeps the actual content in AGENTS.md so it stays usable by other providers (Claude Code, Codex, Cursor). Resolves #1239 doc-debt. |
| **Curator-protection for AIWG kernel skills** | Hermes v0.12.0+ Curator archives stale skills on a 7-day cycle. AIWG-deployed kernel skills are now registered in `~/.hermes/skills/.bundled_manifest` so the Curator excludes them (verified at `tools/skill_usage.py:155-176`). Standard skills under `.aiwg/` are already protected by the dot-prefix rule. |
| **`delegate_task` API hotfix** | Earlier versions of the deployer shipped `delegate_task(skip_context_files=True, skip_memory=True)` in the generated AGENTS.md. Those parameters do not exist on Hermes's actual signature — they're hardcoded internally. Replaced with the correct `delegate_task(goal="...", context="...")` form. |
| **Idempotent skill-path migration helper** | Existing operators with skills at the legacy path get them automatically cleaned up on the next `aiwg refresh --provider hermes`. Hash-matches before removal so user-authored files are never touched. |
| **Hermes-quickstart refreshed against v0.13.0** | All `agent/`, `hermes_cli/`, `tools/mcp_tool.py` file:line references in the quickstart re-verified against the current Hermes release (commit `942adf6`). Previous docs targeted v0.4.0; refs were drifted by hundreds of lines. |
| **CI drift verifier** | `tools/verify-hermes-citations.mjs` walks every Hermes citation in AIWG docs and verifies it against the pinned Hermes version. CI runs on every PR touching Hermes docs. Pin: `HERMES_VERIFIED_VERSION = '0.13.0'`. |

### Added

- **MCP discovery toolset** (`src/mcp/tools/discovery.mjs`): `discover`, `skill-list`/`-show`, `command-list`/`-show`, `rule-list`/`-show`, `agent-show`, `template-list`/`-show`. All read-only, global-allowed. Spawns `aiwg discover --json` / `aiwg show --json` subprocess for parity with CLI behavior.
- **MCP `command-run` tool** (`src/mcp/tools/command-run.mjs`): allow-listed dispatch against `src/extensions/commands/definitions.ts`. `spawn(cmd, args, {shell: false})` — never shell-interpreted. Destructive commands require `confirmed: true`.
- **8 opt-in MCP subsystem toolsets** (`src/mcp/tools/subsystems.mjs`): memory + reflections, kb, provenance + research-store, activity-log, index, ralph (session-id async pattern), mc (Mission Control), ops. Enabled via `AIWG_MCP_TOOLSETS=<csv>` env var or `aiwg mcp serve --toolsets=<csv>` flag. `=all` enables every known toolset.
- **`generateHermesMd()`** in Hermes deployer: emits `.hermes.md` thin pointer at project root.
- **`updateBundledManifest()`** in Hermes deployer: registers AIWG kernel skills with the Curator for archival exclusion. Preserves pre-existing manifest entries.
- **`migrateLegacySkillPath()`** in Hermes deployer: idempotent cleanup of the legacy `~/.hermes/.aiwg/skills/` path after the new path is verified populated.
- **`tools/verify-hermes-citations.mjs`**: drift detector for Hermes source citations in AIWG docs.
- **`.gitea/workflows/hermes-citations.yml`**: CI workflow runs the verifier on PRs touching Hermes docs.
- **17 new unit tests** in `test/unit/mcp/helpers.test.ts` and `test/unit/mcp/subsystems.test.ts`. All MCP tests passing (46/46).
- **SDLC corpus** in `.aiwg/`: architecture sketch (`sketch-hermes-mcp-parity.md`), risk register, test strategy, 5 use cases (`UC-HMP-{001..005}`).

### Changed

- **`paths.skills`** in `tools/agents/providers/hermes.mjs` moved from `~/.hermes/.aiwg/skills/` to `~/.hermes/skills/.aiwg/`.
- **`generateAgentsMd()`** expanded to inline top-6 CRITICAL rule directives (~3K-char priming block, well under Hermes's 19K hard cap; soft warn at 15K). Pointer to `mcp_aiwg_rule_show` for the other 23 rules.
- **`docs/integrations/hermes-quickstart.md`** refreshed against Hermes v0.13.0. Replaced "What's New in v0.4.0" with "Version compatibility" table. File:line refs updated.
- **`docs/providers/hermes-skill-fields.md`** adds a "Curator protection" section.
- **`docs/cli-reference.md`** documents `aiwg mcp serve --toolsets=` flag and the new core tool surface.
- **`CLAUDE.md`** multi-platform table updated for Hermes; special-cases footnote added.

### Deprecated

- **`workflow-run` MCP tool**: was always a stub. Response body now carries `{deprecated: true, replacement: 'mcp_aiwg_command_run', ...}`. Tool kept for back-compat; new code should use `command-run`.

### Fixed

- **Broken `delegate_task` API in generated Hermes AGENTS.md** (`tools/agents/providers/hermes.mjs:117`). The example `delegate_task(skip_context_files=True, skip_memory=True)` referenced parameters that do not exist on Hermes's actual signature. Replaced with `delegate_task(goal="...", context="...")` plus a one-line note. Every Hermes user since the integration shipped was getting broken example code.

### Issues closed

H1 #1305, E1 #1306, E2 #1307, E3 #1308, E4 #1309, E5 #1310, S20 #1311, S1 #1312, S2 #1313, S4 #1314, S3 #1315, S5 #1316, S6 #1317, S7 #1318, S8 #1319, S9 #1320, S21 #1321, S10 #1322, S11 #1323, S12 #1324, S13 #1325, S14 #1326, S15 #1327, S17 #1328, S22 #1329, S23 #1330, S16 #1331, S18 #1332, S19 #1333 (deferred — no trigger in static tool surface).

## [2026.5.3] - 2026-05-13 — "Mini Shai-Hulud — supply-chain hardening complete"

The full v2026.5.3 release. Every signed-release control modeled in the Mini Shai-Hulud planning doc (#1278) is now wired into the publish pipeline and verified end-to-end against a real release cycle. The pre-releases earlier in this line (rc.0, rc.1) were internal pipeline checkpoints; this is the public release the audit was leading up to.

### Why this matters to users

| What changed | What it gives you |
|---|---|
| **npmjs.org provenance attestation** | Every published tarball carries a Sigstore-anchored attestation linking it to a specific GitHub Actions workflow run and source commit. Verify with `npm view aiwg@2026.5.3 --json \| jq .dist.attestations` or `npm audit signatures`. |
| **Cosign keyless tarball signature** | Registry-independent signature over the tarball bytes. Works whether you pulled from npmjs.org, Gitea bundled npm, or any mirror. Verify with `cosign verify-blob`. |
| **CycloneDX SBOM (signed)** | Full direct + transitive dep inventory shipped as a release asset and signed with the same Sigstore identity. Feed into Grype/Trivy/Dependency-Track for vulnerability scans. |
| **Signed maintainer git tag** | Tag is gpg-signed by `AIWG Release Signing <release@aiwg.io>` (fingerprint `FE9272F0BC5781E1DE77FAAA719AB63879E84CE8`, ed25519, expires 2031-05-11). CI refuses to publish any release whose tag does not verify. |
| **6 signed assets on both GitHub and Gitea releases** | Tarball + .sigstore, release manifest + .sigstore, SBOM + .sigstore — mirrored across both registries so verification works regardless of where you got AIWG. |
| **Tarball top-level allowlist** | Every release lints what gets included in the published tarball. No surprise files. |
| **`npm audit signatures` gate at publish time** | The publish step itself runs `npm audit signatures` against the dep tree. If a dep's registry signature is invalid, the publish blocks. |
| **7-day release-age gate** | `npm install`/`npm update` against AIWG (and any project that opts in to the same pattern) refuses to resolve dependency versions younger than 7 days. Newly-published malicious versions can no longer enter your lockfile. **Requires npm 11.5+ on your dev machine** — `npm install -g npm@^11.5`. |
| **Dep-source policy lint** | `npm run lint:dep-sources` blocks `git+`, `github:`, tarball-URL, `file:`, `link:` dep sources in `package.json` and `package-lock.json`. Runs every CI build. |
| **Pinned CI containers + actions** | Every CI workflow pins containers by sha256 digest and actions by 40-char commit SHA. The pin manifest lives in `ci/digests.txt`. No `:latest` anywhere in production paths. |

### Adopting the same pattern in your projects

This release ships new skills for downstream users who want to harden their own npm packages the same way:

- `supply-chain-hardening-quickstart` — orchestrates the user-side hardening pass
- `npm-supply-chain-audit` — audits lifecycle scripts, Git dependency sources, publish-token exposure, and verifier docs
- `npm-release-age-gate` — configures and reviews 7-day / 10-day release-age policies
- `supply-chain-trust` — covers signed tags, provenance, tarball signatures, SBOMs, pinning, and broader trust-chain design

See `docs/security/supply-chain-hardening.md` for the end-to-end walkthrough. The release-publisher note is explicit: npm trusted publishing requires npm 11.5.1+ and Node 22.14+; AIWG's release workflow uses Node 24 so the current npm 11.x line is available without a workflow-local npm upgrade.

### Requirements for the supply-chain controls to be effective

- **Consuming AIWG**: Node 20+ stays fine for the CLI. Provenance verification is optional but recommended — `npm install -g npm@^11.5` to enable `npm audit signatures` and the release-age gate to fire on your machine.
- **Contributing to AIWG**: npm 11.5+ on your dev machine. The release-age gate fires on every `npm install`/`npm update` — without it, the protection is missing.
- **Adopting the pattern for your own packages**: Node 22.14+ and npm 11.5.1+ for OIDC trusted publishing on npmjs.org. Or jump straight to Node 24.x, which is what AIWG's CI now runs on.

### References

- `docs/releases/v2026.5.3-announcement.md` — full release announcement
- `docs/security/supply-chain-hardening.md` — apply the same pattern to your own package
- `docs/releases/verifying.md` — verify an AIWG release end-to-end
- `SECURITY.md` — maintainer signing key fingerprint, private reporting channel
- [#1278](https://git.integrolabs.net/roctinam/aiwg/issues/1278) — supply-chain hardening epic (Track A close-out)

## [2026.5.3-rc.1] - 2026-05-12 — "Mini Shai-Hulud — OIDC-only publish path"

Supersedes [2026.5.3-rc.0]. Three CI fixes since rc.0 plus a workflow-deactivation pass to clear the dual-publish race that prevented provenance attestation from landing.

### Fixed in CI

- **Signed-tag verify on tag-push checkout**. `actions/checkout@v4` on tag-push events writes `refs/tags/<tag>` as a commit ref (not the tag object) by default, so `git tag -v` failed with "cannot verify a non-tag object of type commit." Adding `fetch-tags: true` to the checkout produced a refspec collision (both fetches target `refs/tags/<tag>`). Fix: explicit `git fetch +refs/tags/X:refs/tags/X --depth=1` step after checkout (commits `33cf1c77` + `0fa4dd52`).
- **Disabled Gitea-side npmjs.org publish** to clear the race that landed rc.0 without provenance. The Gitea workflow's `NPMJS_TOKEN`-based publish won the race against the GH Actions OIDC path, leaving npmjs.org's `aiwg@2026.5.3-rc.0` without a provenance attestation. rc.1 ships with the four Gitea npmjs.org publish/affirm steps `if: false`-gated and the GH Actions OIDC workflow as the sole publisher. NPMJS_TOKEN stays in Gitea (unused) pending operator revocation after rc.1 verifies clean.

### What rc.1 verifies

Same pipeline as rc.0 plus the fixes above:

- Cryptographically signed git tag (#1299 / A9) — verified
- OIDC trusted publishing on npmjs.org with provenance attestation (#1283 / A5) — **now actually exercised**
- Cosign keyless tarball signing with `.sigstore` bundles (#1287 / A8) — fires from the GH Actions workflow
- CycloneDX SBOM via syft (#1288 / A13) — fires from the GH Actions workflow
- `npm audit signatures` gate (#1288 / A12) — green at publish time
- Tarball top-level allowlist (#1288 / A11) — green
- 7-day release-age gate (#1290 / A15) — enforced via npm 11.5+
- Dep-source policy lint (#1300 / A20) — green

Operator follow-ups (now unblocked): revoke NPMJS_TOKEN on Gitea + npmjs.org once rc.1 lands clean; delete the `if: false`-gated blocks in a future commit.

## [2026.5.3-rc.0] - 2026-05-12 — "Mini Shai-Hulud supply-chain hardening — Track A complete (no provenance)"

First end-to-end pre-release exercising the new supply-chain pipeline. Track A of the Mini Shai-Hulud hardening campaign (#1278) ships complete across this release: 13 issues across 8 waves landed since v2026.5.2. Wave 9 (user-facing capabilities — Track B) ships in v2026.5.3 stable.

This rc.0 is the first AIWG release published under the new flow: cryptographically signed git tag (#1299), CI verify gate before any publish step, OIDC trusted publishing on npmjs.org with provenance attestation (#1283), cosign keyless tarball signing with `.sigstore` bundles attached to both registries (#1287), CycloneDX SBOM generation (#1288 / A13), `npm audit signatures` gate (#1288 / A12), tarball top-level allowlist (#1288 / A11), 7-day release-age gate (#1290), and dep-source policy lint (#1300). The full risk-closure tally is 9 of 10 modeled scenarios fully closed; the remaining one (S9) is deferred to a separate AI-runtime-boundary threat model per planning doc § Out of Scope.

### Highlights

| What changed | Why you care |
|---|---|
| **Signed tags + cosign tarball signatures** | Every release artifact is verifiable offline against a maintainer key + Sigstore transparency log. Consumers verify with `cosign verify-blob` per `docs/releases/verifying.md`. |
| **npm provenance attestation** | npmjs.org publishes carry a provenance attestation linking the tarball to the GitHub Actions workflow run + source commit SHA. Verify with `npm view aiwg@<v> --json \| jq .dist.attestations`. |
| **6 signed release assets per release** | Tarball, tarball .sigstore, release-manifest.json, manifest .sigstore, CycloneDX SBOM, SBOM .sigstore — present on both GitHub and Gitea releases. |
| **Release-age gate** | npm refuses to resolve any dependency version published less than 7 days ago. Newly-published malicious versions can no longer enter the lockfile during contributor `npm install`/`npm update`. Requires npm 11.5+ — `npm install -g npm@^11.5` once on every dev machine. |
| **Dep-source lint** | `npm run lint:dep-sources` blocks `git+`, `github:`, tarball-URL, `file:`, `link:` dependency sources in `package.json` and `package-lock.json` — every CI run, not just at publish time. |
| **Removed postinstall lifecycle hook** | The script was benign, but the *capability* was the Shai-Hulud propagation primitive. `aiwg doctor` now handles the PATH-check UX. |

### Security

- **PR-trigger workflow audit + same-repo guards** (#1289 — Wave 8 of #1278). Audit finding F7 / threat scenario S2 (workflow injection / fork-PR secret extraction) called for an audit of every `.gitea/workflows/` workflow that triggers on `pull_request`. Primary-source review of the Gitea source code at [`models/secret/secret.go` `GetSecretsOfTask`](https://github.com/go-gitea/gitea/blob/main/models/secret/secret.go) lines 160-165 settled the open question from #1284's audit notes: user-defined secrets (`NPM_TOKEN`, `NPMJS_TOKEN`, `GT_ACCESS_TOKEN`) are NOT exposed to fork PRs by default in current Gitea — only the auto-issued `GITHUB_TOKEN`/`GITEA_TOKEN` per-run token is, and that token is further clamped by `models/actions/token_permissions.go` `restrictCrossRepoAccess`. The audit walked the five PR-triggered workflows: `docsite-build.yml` (fork-PR guard from #1284 already in place; comment updated to reference this audit), `skill-lint-pr.yml` (only references the auto-issued per-run token, not a user secret; security analysis documented inline at top of file so future reviewers don't re-litigate it), `metadata-validation.yml` (no secret references; confirmed PR-safe), `ci.yml` (no secret references; install-script surface mitigated by A15 #1290 release-age gate and A20 #1300 dep-source lint), `conformance.yml` (label-gated via `conformance:full` for PR runs; verified working). A new "PR-trigger workflow hardening" section in `.gitea/workflows/README.md` documents the reusable guard snippet (two variants — fork-PR guard `if: ${{ gitea.event.pull_request.head.repo.fork != true }}` and same-repo guard `if: ${{ github.event.pull_request.head.repo.full_name == github.repository }}`), explains why step-level guards are preferred over job-level (preserves fork-PR validation value), and explains why `pull_request_target` is not the right answer here. Per-workflow disposition matrix + alternatives (blanket no-secrets rule, `pull_request_target`, manual `/safe-to-test` label gate, dedicated PR-runner pool) recorded in `.aiwg/architecture/adr-pr-trigger-hardening.md`. Criticality is informational + defense-in-depth: Gitea's runtime already does the right thing; the guard on `docsite-build.yml` survives the runtime-regression scenario, and the documentation makes the secret-handling intent local-and-visible in each workflow rather than implicit-and-global. No workflow logic changed beyond the docsite comment update; the surface of `grep -n "secrets\." .gitea/workflows/*.yml` is unchanged.
- **Release-age gate on dep resolution** (#1290 — Wave 7 of #1278). New `.npmrc` at repo root sets `min-release-age=7`: npm refuses to resolve any dependency version published less than 7 days ago into the lockfile. Closes the brand-new-malicious-publish-window attack class (the same Mini Shai-Hulud pattern that triggered the rest of #1278) — a freshly published malicious version of a transitive dep can no longer enter AIWG's tree during a contributor's `npm install <pkg>` or `npm update`; the gate forces it to survive 7 days of public exposure first, giving npm, the maintainer, and the security community time to notice and yank. The 10-day high-sensitivity profile is documented as an `AIWG_MIN_RELEASE_AGE_HIGH=10` env-var override pattern for publish workflows + major version bumps. `min-release-age` requires npm 11.5+ — earlier versions silently ignore the config — so contributor docs (`docs/contributing/versioning.md` § Release-age policy) make the requirement explicit, and both publish workflows (`.gitea/workflows/npm-publish.yml`, `.github/workflows/npm-publish.yml`) now run `npm install -g npm@^11.5` before `npm ci` as defense-in-depth (CI's `npm ci` against a locked tree is a no-op for the gate, but publish is the most security-sensitive moment AIWG has and the upgrade costs ~5s). The release-age gate is the seventh and final Wave 7 control of the supply-chain hardening campaign; the workspace-migration spike (#1301 / A21) closed as a no-op with the ADR at `.aiwg/architecture/adr-pnpm-workspace-migration.md` recording why `.npmrc` is the right shape over `pnpm-workspace.yaml minimumReleaseAge` given AIWG's current monorepo state. Threat-model effect of either shape is equivalent — both block the same attack class — but the `.npmrc` path costs zero workflow migration and zero refactoring of `src/serve/executor-registry.ts`'s ajv createRequire pattern. Contributors: run `npm install -g npm@^11.5` once on every dev machine. Operators: the gate is silently ignored by older npm but the threat model isn't degraded (existing `npm ci` paths weren't the attack surface — lockfile-regeneration was). Companion docs updated: `docs/contributing/dependency-sources.md` § Lockfile regeneration + the release-age gate notes the interaction with A20.
- **Publish-time evidence — tarball audit, audit signatures, SBOM** (#1288 — Wave 6 of #1278). Three publish-time CI gates land together: A11 (tarball top-level allowlist), A12 (`npm audit signatures` gate), and A13 (CycloneDX SBOM via syft). A11 catches the Mini Shai-Hulud injection class where an attacker pushes a commit that adds a new file at the tarball ROOT (`router_init.js`, `prepare.sh`); without A11, A8's cosign signature would happily sign the tampered artifact because A8 attests "this came from our workflow," not "this matches a known structure." A new scanner at `tools/lint/tarball-audit.mjs` runs `npm pack --dry-run --json`, extracts unique top-level entries, and diffs against `ci/expected-tarball-top-level.txt` (12 entries: `agentic`, `apps`, `bin`, `CLAUDE.md`, `dist`, `LICENSE`, `man`, `package.json`, `plugins`, `README.md`, `templates`, `tools`). A12 closes the upstream-package-compromise gap A20 (#1300) couldn't reach: another scanner at `tools/lint/audit-signatures.mjs` runs `npm audit signatures --json` and cross-references failures against a time-bounded waiver file at `ci/npm-audit-signatures-waivers.yaml` — "invalid" signatures are never waiveable (tampering signal); "missing" signatures are waiveable with a non-expired entry; expired waivers fail. Current state: zero waivers, all 377 packages have verified registry signatures. A13 adds CycloneDX SBOM generation via syft v1.18.0 — chosen over `@cyclonedx/cyclonedx-npm` because it's a single Go binary with zero npm-dep-graph impact (the npm alternative would add a multi-dep build tool to a workflow whose entire point is reducing dep surface). syft is installed from a tag-pinned raw GitHub URL (`raw.githubusercontent.com/anchore/syft/v1.18.0/install.sh`) with the install script's SHA-256 logged on every CI run for drift detection; strict-SHA enforcement is opt-in via a commented `ENFORCE_INSTALL_SHA` block the operator fills after the first verified run. SBOM is signed with the same keyless cosign OIDC identity that signs the tarball and manifest, producing `aiwg-X.Y.Z.cdx.json.sigstore`. All wired into `.gitea/workflows/npm-publish.yml` (both pre-release and stable jobs, before any publish step), `.github/workflows/npm-publish.yml` (same), AND `.gitea/workflows/ci.yml` for A12 only (so signature regressions surface on every push, not just at publish time). `.gitea/workflows/upload-release-sigs.yml` extended to mirror the two new SBOM assets to the Gitea release alongside the existing four — six release assets total per release going forward. Consumer-facing SBOM verification documented in `docs/releases/verifying.md` with the same `cosign verify-blob` invocation pattern as the tarball signature, plus SCA-scanner integration examples (Grype, Trivy, Dependency-Track). ADR at `.aiwg/architecture/adr-publish-time-evidence.md` documents rationale, alternatives (exact-file-list manifest, hard-fail-no-waivers, `@cyclonedx/cyclonedx-npm`, `anchore/sbom-action`), and trade-offs (syft install-script pinning model, A12 waiver expiry semantics, A11 maintenance touch frequency).
- **Cosign keyless tarball signing on every release** (#1287 — Wave 5 of #1278). Audit finding F8 / threat scenario S4 (mid-flight tarball replacement on a mirror) called for an artifact-level, registry-independent signature alongside the npm provenance attestation (#1283 / A5 — which only travels with npmjs.org metadata) and the signed git tag (#1299 / A9 — which proves who tagged, not what was built). Wave 5's A8 closes the gap: after `npm publish --provenance` succeeds, `.github/workflows/npm-publish.yml` now installs cosign v2.6.1 via `sigstore/cosign-installer@v3.10.1` (SHA-pinned `7e8b541eb2…` in `ci/digests.txt`) and runs `cosign sign-blob --bundle` against the published tarball using the workflow's ambient GitHub Actions OIDC token. The bundle format produces a single self-contained `.sigstore` file carrying signature + Fulcio short-lived cert + Rekor transparency-log entry, verifiable offline against the public Sigstore log. A `release-manifest.json` containing tarball SHA-256, version, tag object SHA, commit SHA, and workflow run URL is also signed, providing an audit bridge between the published artifact and this CI run. All four assets (tarball, tarball `.sigstore`, manifest, manifest `.sigstore`) land on the GitHub release via the workflow's ephemeral `GITHUB_TOKEN`. A new manual operator workflow at `.gitea/workflows/upload-release-sigs.yml` (`workflow_dispatch` with a tag input) mirrors the four assets to the Gitea release using `gh release download` against the public GitHub mirror (no GH auth) plus the existing `NPM_TOKEN` for the Gitea release-asset API — no new write token required, deliberately avoiding the token-surface expansion the alternative auto-mirror would have caused. Consumer-facing verification documented in `docs/releases/verifying.md` (now covers all three controls: provenance, signed tag, cosign signature). Release runbook in `docs/contributing/versioning.md` documents the one-command post-release sig-mirror ritual. ADR at `.aiwg/architecture/adr-tarball-cosign-signing.md`. The cosign signature is registry-independent — verifies the same way regardless of which registry the tarball came from, closing the long-standing "Gitea-bundled-npm install has no provenance chain" gap that #1286 (A10) could only address with operator-hygiene controls. Forward-going only: releases before the first A8 publish do not carry `.sigstore` bundles.
- **npmjs.org publishing moves to GitHub Actions with OIDC trusted publishing + provenance** (#1283 / spike #1295 — Wave 4 of #1278). The audit (finding F2, threat-model scenario S1 — release-key compromise) called for retiring the long-lived `NPMJS_TOKEN` in favor of npm trusted publishing. As of 2026-05-12 the [npm trusted-publishers documentation](https://docs.npmjs.com/trusted-publishers) lists GitHub Actions and GitLab CI/CD as supported providers — Gitea Actions is not in the matrix, and the runtime requires Node 22.14.0+ and npm 11.5.1+ regardless of provider. Spike #1295 picked the GH-Actions path on the existing public mirror (`github.com/jmagly/aiwg`); this commit ships the new workflow. New file `.github/workflows/npm-publish.yml` triggers on tag push to the mirror, sets `permissions: id-token: write` to enable OIDC negotiation against npmjs.org, runs `tools/ci/verify-signed-tag.sh` (#1299 / A9) as the same hard cryptographic gate as the Gitea workflows use, builds and tests, runs `npm publish --provenance --access public`, then verifies the provenance attestation actually landed (`npm view aiwg@<v> --json | jq .dist.attestations` must be non-null — catches the failure mode where publish succeeds but provenance silently doesn't emit), and finally verifies the dist-tag points at the new version. The workflow container is `node:22@sha256:62e4daa6…` (22.22.2-bookworm) per the pinning policy; `actions/setup-node@49933ea5…` (v4.4.0) is the new SHA pin. Both pins land in `ci/digests.txt`. The Gitea-side `.gitea/workflows/npm-publish.yml` keeps both legs operational during the transition with deprecation-comment blocks documenting the phase-out. Operator removes the Gitea-side npmjs.org publish steps + revokes `NPMJS_TOKEN` after the first verified OIDC release on the GH mirror. Consumer-facing verification procedure (provenance + signed-tag) at `docs/releases/verifying.md`. ADR at `.aiwg/architecture/adr-npmjs-org-via-github-actions.md`. Pairs with #1286 (A10 — Gitea compensating controls) which governs the Gitea-registry leg that stays on Gitea Actions.
- **Gitea release-gate compensating controls** (#1286 — Wave 4 of #1278). Gitea Actions ignores the `environment:` keyword (see [docs.gitea.com/usage/actions/comparison](https://docs.gitea.com/usage/actions/comparison)) so the GitHub-Actions-style deployment-protection-rule surface is unavailable for the Gitea-side publish flow. Audit finding F6 asked for a bundle of compensating controls. What lands here is the bundle's "release-record + operator hygiene" half: `gitea-release.yml` now embeds a permanent approval record (`Approved by: <github.actor>` + UTC timestamp) into every Gitea release body, sitting next to the artifacts where any consumer can audit it; `.gitea/workflows/README.md` gains a "Release-secret policy" section documenting `NPM_TOKEN` (Gitea API token, `gta_…`) vs `NPMJS_TOKEN` (npmjs.org token, being phased out by #1283) vs `GT_ACCESS_TOKEN` (docsite-only); and `docs/contributing/secret-rotation.md` documents the quarterly Gitea `NPM_TOKEN` rotation procedure with emergency triggers (maintainer offboarding, suspected runner compromise, audit-log anomaly) and a verify-on-pre-release-tag-push pattern that revokes the old token only after the new one succeeds. The bundle's hard gate is A9's signed-tag verify (#1299, already shipped) — that's the cryptographic anchor this layers on top of. A dedicated publish runner was scoped into A10 but deferred to operator scheduling. ADR at `.aiwg/architecture/adr-gitea-release-compensating-controls.md`.
- **Signed-tag verification gate on release-bearing workflows** (#1299 — Wave 3 of #1278). Every release-tag push must now cryptographically verify against a maintainer public key published in the repo before any publish/release-creation step runs. The gate is implemented as `tools/ci/verify-signed-tag.sh` and wired into `.gitea/workflows/npm-publish.yml` (both pre-release and stable publish jobs) and `.gitea/workflows/gitea-release.yml`. Supports both GPG (`.gitea/keys/maintainers.asc`) and SSH allowed-signers (`.gitea/allowed_signers`) — operator picks; both can co-exist. Closes scenario S2 (workflow injection) and provides the cryptographic anchor that #1286 (A10 — compensating controls) and #1283 (A5 — trusted publishing) build on in Wave 4. Operator-side setup (key generation + publication + first signed-tag verification end-to-end) is documented in `docs/contributing/versioning.md` and tracked as the remaining open item on #1299 until the first signed-tag release lands. ADR at `.aiwg/architecture/adr-signed-tag-verify.md`. Historical tags (`v2026.5.2` and earlier) are not retroactively signed — the gate is forward-going only.
- **Dependency source policy lints unexpected git/tarball/exotic deps** (#1300 — Wave 2 of #1278). New CI step (`npm run lint:dep-sources`, wired into `.gitea/workflows/ci.yml` after `npm ci`) scans `package.json` (direct + dev + optional + peer deps) and `package-lock.json` (transitive `resolved` URLs) for six forbidden source patterns — `git+*`, `git://`, `github:owner/repo`, `file:`, `link:`, and non-registry tarball URLs — and fails the build on any match unless the source is on an explicit committed allowlist at `ci/dep-source-allowlist.yaml`. Closes the Mini Shai-Hulud dep-injection vector (control C22, threat-model scenario S5 dep-injection variant) where a single `optionalDependencies` `git+` entry triggers arbitrary `prepare`-script execution at install time with secrets in scope. Implementation is a 250-line standalone Node script (`tools/lint/dep-source.mjs`) with one dep — adding a third-party validator framework to a control whose purpose is reducing dep surface would be self-defeating. Initial allowlist is empty (the survey at implementation time confirmed AIWG has zero exotic dep sources). ADR at `.aiwg/architecture/adr-dep-source-policy.md`; contributor doc at `docs/contributing/dependency-sources.md`. If/when #1301 (A21 pnpm spike) lands, the lockfile scan re-points at `pnpm-lock.yaml` and the lint stays in place as defense-in-depth alongside pnpm's native `blockExoticSubdeps`.
- **Pinned CI containers and actions by immutable digest/SHA** (#1281, #1282 — Wave 2 of #1278). Every `container:` and `uses:` reference in `.gitea/workflows/` now uses `@sha256:<digest>` or `@<40-char-commit-SHA>` with a trailing version comment, eliminating the tag-repointing attack surface (audit findings F3 + F5; threat-model scenario S5 — builder image hijack / action-repo compromise → CI RCE with secrets in scope). Pin manifest at `ci/digests.txt` tracks resolved version, pin date, and update rationale per row; policy + bump procedure documented at `.gitea/workflows/README.md`. Current pins: `node:20@sha256:8f693eaa…` (resolves to 20.20.2), `actions/checkout@34e11487…` (v4.3.1), `actions/upload-artifact@ea165f8d…` (v4.6.2). Closes the `dev-idempotent-builds.md` rule 2 + rule 4 violations.
- **Removed `scripts.postinstall` lifecycle hook from `package.json`** (#1279). The postinstall script body was benign — it printed PATH-setup guidance after `npm install -g aiwg` — but the *capability* is the highest-residual-risk supply-chain primitive in the audit (finding F1, threat scenario S3, Aikido report 2026-05-12). Had AIWG ever been compromised, the hook would have executed arbitrary attacker code on every install machine before any operator interaction, matching the worm-propagation profile that Shai-Hulud used in March 2026. `bin/postinstall.mjs` has been deleted from the published tarball. The PATH-guidance UX migrated to two surfaces: `aiwg doctor` now runs a PATH sub-step on every invocation and prints the same shell-specific `export PATH` guidance when the binary isn't reachable, and `README.md` gains an "Installation Troubleshooting" section near the top documenting `which aiwg`, the `npm config get prefix` line, and the `npx aiwg` fallback. ADR at `.aiwg/architecture/adr-postinstall-removal.md`.
- **Added `SECURITY.md`** with a documented private reporting channel (`security@integrolabs.net`), Gitea-advisory fallback, response SLA (24h ack / 7d assessment / 90d coordinated disclosure), in-scope / out-of-scope clarification, and safe-harbor language for good-faith researchers. Closes a long-standing operational gap surfaced by the May 2026 Mini Shai-Hulud supply-chain hardening audit (#1285). The project-scoped PGP/age key is queued for follow-up — until it's published under `.github/keys/`, reports are accepted in plain text from a maintainer-controlled address that can negotiate encrypted follow-up.
- **Removed `continue-on-error: true` from stable-publish test step** (#1280). Test failures now block stable publish — previously a regression that broke tests would still ship to npmjs.org. Surfaced a real CLI cold-start drift (`aiwg --version` 134ms → 245ms isolated since 2026-04-22) which has been the masked failure under the now-removed suppression; perf budgets in `test/integration/cli-perf.test.ts` raised to accommodate parallel-load measurements (`--version` 150→800ms, `help` 300→750ms) with #1302 tracking the underlying optimization work.
- **Removed `GT_ACCESS_TOKEN`-in-URL antipattern from `docsite-build.yml` and `docsite-deploy.yml`** (#1284). The previous `git clone https://token:${GT_ACCESS_TOKEN}@...` pattern exposed the token in process arguments visible to `ps`, core dumps, and error output. Replaced with the credential-helper pattern — token lives in a transient `mktemp` file (mode 600, `trap`-cleaned on exit) consumed by `git credential.helper=store`. Added defense-in-depth: `docsite-build.yml` skips the dbbuilder clone for fork-PR events, since Gitea's secret-exposure semantics for fork pull_requests are version-dependent and not currently verified for the running instance (#1289 / A14 will close that question).

## [2026.5.2] - 2026-05-11 — Tester-report sweep, kernel issue/PR skills, config-driven release flow

A multi-commit fix sweep driven by an external tester report (sebuh-infsol via jmagly/aiwg#108–#112). What landed: every CLI bug the tester surfaced is fixed; the discovery-kernel surface now has doctor checks; issue/PR filing guidance is both in `docs/` for humans and in always-loaded kernel skills for agents; the release process itself is now config-driven via `.aiwg/release.config` and the `flow-release` skill.

### Highlights

| What changed | Why you care |
|---|---|
| **`aiwg steward` works end-to-end** | Both the path resolution bug (#1261) and the schema mismatch (#1262) are fixed. Capability routing is finally usable. |
| **Kernel skills get Claude command stubs** | `/aiwg-refresh`, `/aiwg-regenerate`, `/aiwg-doctor`, `/aiwg-status`, `/aiwg-help` deploy as `.claude/commands/` entries (#1263). The slash-form is now deterministic instead of churning through agent dialog. |
| **`aiwg regenerate` is a real CLI command** | Context-only regen of `AIWG.md` + `AGENTS.md` without redeploying frameworks. Faster than `aiwg refresh` when you just need to fix context drift (#1266). |
| **`aiwg-issue` + `aiwg-pr` kernel skills** | Filing guidance is always-loaded in your agent context. Templates land in `.gitea/ISSUE_TEMPLATE/` + `.github/ISSUE_TEMPLATE/`. (#1269) |
| **`flow-release` orchestration** | Config-driven release flow consumes `.aiwg/release.config`. Six gates: build/test, CI green, doc-sync, CHANGELOG, README freshness, tag/push, post-release. AIWG itself dogfoods this on 2026.5.2. |
| **Doctor discovery-availability gate** | `aiwg doctor` now smoke-probes `discover`, `show`, `index`, `runtime-info` and warns when any is broken (#1264(g)). |
| **Six other CLI fixes** | `runtime-info --discover` ENOENT, `aiwg new --help` no longer scaffolds as a side effect, `aiwg catalog` JSON files now ship in `dist/`, three import-path fixes across `workspace-migrate`/`optimize-prompt`/`diversify-content`, doctor doesn't recommend the unimplemented `install-skill-seekers` (#1264). |

### Added

- **`src/cli/handlers/regenerate.ts`** — new CLI handler. `aiwg regenerate [--provider <name>] [--dry-run] [--force] [--no-aiwg-md] [--no-agents-md]`. Invokes the canonical context pipeline (`src/smiths/context-pipeline/`) without redeploying frameworks. Registered in `handlers/index.ts` and the command extension catalog.
- **`agentic/code/addons/aiwg-utils/skills/aiwg-issue/SKILL.md`** — kernel skill for filing issues. Covers template selection, environment capture, duplicate detection, the cross-tracker import flow, and anti-patterns.
- **`agentic/code/addons/aiwg-utils/skills/aiwg-pr/SKILL.md`** — kernel skill for opening PRs. Covers delivery-policy compliance (direct vs feature-branch vs pr-required), the no-attribution rule, the verification gate, CI-green-before-done.
- **`agentic/code/addons/aiwg-utils/skills/steward-prep-delivery/`** — non-kernel skill plus `find-duplicates.sh` helper that searches the AIWG capability index AND the configured Gitea tracker for likely duplicates before filing.
- **`agentic/code/frameworks/sdlc-complete/skills/flow-release/SKILL.md`** — config-driven release orchestration skill. Reads `.aiwg/release.config` and walks gates in order with hard-stop semantics. Owned by the Deployment Manager agent.
- **`agentic/code/frameworks/sdlc-complete/schemas/flows/release-config.yaml`** — JSON Schema for `release.config`. Six gate shapes: steps, invoke_skill, tracker, artifacts, review_diff, actions.
- **`.aiwg/release.config`** — AIWG's own release rules. Seven gates: local-build-test, ci-green, doc-sync, changelog-and-announcement, readme-freshness, release, post-release.
- **`.gitea/ISSUE_TEMPLATE/{bug-report,feature-request,tester-report,imported-report}.md`** and **`.gitea/pull_request_template.md`** — Gitea-native templates with delivery-policy and no-attribution callouts. Mirrored to `.github/` for the public mirror.
- **`docs/contributing/filing-issues.md`** and **`docs/contributing/filing-pull-requests.md`** — human-readable guides matching the kernel skills.
- **`src/cli/find-package-root.ts`** — shared helper that walks up to AIWG's `package.json`, fixing path resolution in `steward.ts` and `providers/capability-matrix.ts` regardless of compiled vs source layout (#1261).
- **`agentic/code/addons/aiwg-utils/skills/aiwg-refresh/run.sh`** and **`aiwg-regenerate/run.sh`** — script entrypoints for kernel skills, with matching `script:` frontmatter blocks. `aiwg run skill aiwg-refresh -- <flags>` now works deterministically across platforms.
- **Discovery-availability doctor checks** — four new probes in `tools/cli/doctor.mjs` for `discover`, `show`, `index`, `runtime-info` (#1264(g)).
- **`.aiwg/aiwg.config` `delivery` block** is now read by `flow-release` to determine commit pattern (existing semantics, now documented in `aiwg-pr` skill body).

### Changed

- **`src/cli/handlers/steward.ts`** — rewrote to import canonical types from `src/providers/capability-matrix.ts` and render the actual `native_features` + `emulation` YAML schema. Feature names accept hyphenated and underscored forms (#1262).
- **`src/providers/capability-matrix.ts`** — path resolver now uses `findPackageRoot()` instead of a fixed-depth `..` walk (#1261).
- **`src/cli/handlers/use.ts`** — extended the Claude command translation pass to deploy kernel-skill stubs for `aiwg-issue`, `aiwg-pr`, and the existing kernel set (#1263).
- **`src/smiths/context-pipeline/aiwg-md.ts`** — strips `@AIWG.md` self-include directives when copying CLAUDE.md → AIWG.md. AIWG.md is the destination of that include; the directive must not survive as a self-reference (#1268). Test updated in lockstep.
- **`src/smiths/toolsmith/runtime-discovery.mjs`** — `#writeCatalog` now `mkdir -p`s the parent dir before writing `runtime.json`. Fixes the ENOENT on a fresh project (#1264(b)).
- **`tools/cli/doctor.mjs`** — replaced the `aiwg install-skill-seekers` recommendation (command never existed) with a pointer to the `skill-factory` addon. Underlying integration is intact via the `doc-intelligence` + `skill-factory` addons from `dca02db1` (#1270 audit closed as not-a-regression).
- **`tools/cli/workspace-migrate.mjs`**, **`tools/cli/optimize-prompt.mjs`**, **`tools/cli/diversify-content.mjs`** — fixed `dist/plugin/` and `dist/writing/` import paths to use `dist/src/plugin/` and `dist/src/writing/` per tsc's `rootDir=.` layout (#1264(e)).
- **`tools/install/new-project.mjs`** — `aiwg new <name> --help` is now side-effect-free; previously scaffolded a project as a side effect of help probing (#1264(f)).
- **`package.json`** build script — `build:copy-mjs` now copies `.json` files too, so `aiwg catalog` data ships in `dist/` (#1264(d)).
- **`agentic/code/addons/aiwg-utils/skills/aiwg-refresh/SKILL.md`** and **`aiwg-regenerate/SKILL.md`** — added `script:` frontmatter and a guardrail directive instructing agent-mediated invocations to defer to the deterministic CLI rather than running multi-step probes.
- **`agentic/code/addons/aiwg-utils/skills/aiwg-utils-quickref/SKILL.md`** — kernel-skill list updated to include `aiwg-issue`, `aiwg-pr`, `aiwg-regenerate`.
- **`agentic/code/frameworks/sdlc-complete/agents/deployment-manager.md`** — surfaces `flow-release` as the primary release skill ahead of the broader deployment-readiness procedure.
- **`CLAUDE.md`** — CLI command count corrected (~85 → ~94); self-maintenance kernel-skill count corrected (6 → 9); Release Checklist now points at `flow-release` as the canonical driver.
- **`CONTRIBUTING.md`** — links to the new `docs/contributing/filing-issues.md` and `filing-pull-requests.md` guides.

### Fixed

See "Highlights" above. Eight discrete bugs from the tester report; all fixed with regression tests where applicable.

### Closed

- **#1261** AIWG_ROOT path resolution
- **#1262** steward capability matrix schema mismatch
- **#1263** kernel skills lack Claude command stubs
- **#1264** discovery / runtime-info / install-skill-seekers / catalog / migrate-workspace / aiwg-new sub-bugs (sub-item (g) doctor-invariant moved to a follow-up; #1271 tracks the deferred AIWG.md template-selection audit)
- **#1265** imported steward report — closed as duplicate of #1261 + #1262
- **#1266** aiwg-regenerate CLI subcommand + script entrypoint
- **#1267** interactive /aiwg-refresh churn
- **#1268** AIWG.md self-reference (deferred template-selection half tracked in #1271)
- **#1269** PR + Issue templates and contributor guidance
- **#1270** Skill Seekers regression — closed as not-a-regression (integration is intact as `doc-intelligence` + `skill-factory` addons)

Imported from `jmagly/aiwg`: #108, #109, #110, #111, #112 — all closed on the source tracker with thank-you comments to `@sebuh-infsol`.

[2026.5.2]: https://git.integrolabs.net/roctinam/aiwg/compare/v2026.5.1...v2026.5.2

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
