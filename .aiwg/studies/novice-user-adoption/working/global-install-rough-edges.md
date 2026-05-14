---
artifact_type: rough_edge_inventory
study: novice-user-adoption
workstream: D
related_adr: ADR-NUA-001
related_uc: UC-NUA-004
related_issue: "#1338"
status: draft
phase: construction
created: 2026-05-14
voice: technical-authority
---

# Global-Install Rough-Edge Inventory

## Scope

Per-provider list of current rough edges in the `aiwg use --scope user` (global install) path. Inherited from ADR-NUA-001 §Implementation Guidance. Each entry feeds a downstream implementation epic; this inventory does NOT fix the rough edges, it names them.

Edges classified by severity:
- **blocking** — global install demonstrably broken on this provider, or actively misleading
- **functional** — works but produces wrong behavior in normal use
- **cosmetic** — works correctly; user-experience irritation

Evidence column follows the evidence-type taxonomy from SAD §5.2.2.

## Inventory

### Claude Code

| # | Description | Severity | Evidence | Proposed remediation |
|---|---|---|---|---|
| 1 | `~/.claude/agents/` deployed by `--scope user` mixes with project-scope `.claude/agents/` at load time. Claude Code merges both directories; an agent the user thought was project-scoped silently inherits global definitions. | functional | scripted: deployment paths in `src/cli/handlers/use.ts` reference both scopes; load-order documented in `agentic/code/frameworks/sdlc-complete/docs/` but not surfaced to the user | Document the merge behavior in `docs/cli-reference.md` global-install section; add `aiwg status --scope` to clarify which artifacts came from which scope |
| 2 | `aiwg refresh` against a globally-installed AIWG redeploys to project scope by default. User who installed globally expects refresh to update the global install. | functional | scripted: `src/cli/handlers/refresh.ts` resolves project-dir first | Add `--scope user` to refresh; document the default vs `--scope user` distinction |
| 3 | Cross-project bleed risk (REF-720): same `~/.claude/agents/` is loaded into every Claude Code session regardless of project. | functional | research: REF-720 (Lost in Multi-Turn Conversation) 39% capability drop | Documentation surface; the Workstream B warning surfaces this at scope-decision time |

### Codex (OpenAI)

| # | Description | Severity | Evidence | Proposed remediation |
|---|---|---|---|---|
| 1 | Codex's `~/.codex/prompts/` is the *only* scope for slash commands — there is no project-scope equivalent that Codex's loader scans. `aiwg use sdlc` writes to `.codex/commands/` for operator visibility but Codex never reads them. This is the inverse of "rough edge in global"; project-scope is the rougher one. | functional | scripted: `src/smiths/platform-paths.ts:23` and `docs/integrations/codex-*.md` | Document the asymmetry plainly; lean into global install as the recommended Codex mode in the cli-reference Codex section |
| 2 | `~/.codex/skills/` deployment writes to home dir but Codex's static command enum doesn't surface skills as commands. AGENTS.md is the discovery bridge per ADR-1. A user who runs `aiwg use --scope user --provider codex` may not realize the skills are reachable only via AGENTS.md. | cosmetic | scripted: src/smiths/platform-paths.ts | Cli-reference call-out box explaining the discovery model for Codex global install |

### GitHub Copilot

| # | Description | Severity | Evidence | Proposed remediation |
|---|---|---|---|---|
| 1 | Copilot's project-scope `.github/` directory is repo-scoped by design. Global install equivalent is unclear — there's no `~/.github/` convention. | blocking | deployment-scripted: project-scope deployment confirmed (`.github/agents/` = 193 files; `.github/instructions/` = 59 files; `.github/skills/` = 19 files). No `~/.github/` user-scope path in `src/smiths/platform-paths.ts`. Global install on Copilot is structurally undefined. | Workstream A field-validation should confirm whether `aiwg use --scope user --provider copilot` produces meaningful output or silent no-op; if undefined, surface error |
| 2 | **`skill-discovery` rule NOT deployed to Copilot.** `.github/instructions/skill-discovery.instructions.md` is missing. Copilot agents will not see the discover-first protocol. | functional | deployment-scripted (this audit cycle): `.github/instructions/` has 59 instruction files; skill-discovery is not among them. | See hookup-matrix.md Finding #1 — coordinate fix across all 8 affected providers |

### Cursor

| # | Description | Severity | Evidence | Proposed remediation |
|---|---|---|---|---|
| 1 | Cursor's user-scope MDC rule directory is `~/.cursor/rules/` (per Cursor docs as of 2026-05). Whether `aiwg use --scope user --provider cursor` writes there or to a different path is unverified in this inventory. | functional | deployment-scripted: project-scope confirmed (`.cursor/agents/` = 191; `.cursor/rules/` = 81; `.cursor/skills/` = 15; includes `.cursor/rules/skill-discovery.md` at 334 lines — Cursor is **one of only two providers with the rule deployed**). User-scope behavior pending. | Workstream A scripted-task for global Cursor install |

### Factory AI

| # | Description | Severity | Evidence | Proposed remediation |
|---|---|---|---|---|
| 1 | Factory's `.factory/` directory is project-scoped. Global-install path unclear. | functional | deployment-scripted: project-scope confirmed (`.factory/droids/` = 197; `.factory/skills/` = 17; `.factory/rules/` = 59). Global-install path not defined in `src/smiths/platform-paths.ts`. | Workstream A field-validation |
| 2 | **`skill-discovery` rule NOT deployed to Factory.** | functional | deployment-scripted: `.factory/rules/skill-discovery.md` missing among the 59 deployed rules. | See hookup-matrix.md Finding #1 |

### OpenCode

| # | Description | Severity | Evidence | Proposed remediation |
|---|---|---|---|---|
| 1 | OpenCode supports both `.opencode/agent/` and `.agents/skills/` patterns. User-scope behavior unverified. | functional | deployment-scripted: project-scope confirmed (`.opencode/agent/` = 191; `.opencode/skill/` = 15; `.opencode/rule/` = 59; `.opencode/mode/` = 10). Global-install behavior pending. | Workstream A field-validation |
| 2 | **`skill-discovery` rule NOT deployed to OpenCode.** | functional | deployment-scripted: `.opencode/rule/skill-discovery.md` missing among the 59 deployed rules. | See hookup-matrix.md Finding #1 |

### Warp Terminal

| # | Description | Severity | Evidence | Proposed remediation |
|---|---|---|---|---|
| 1 | Warp aggregates agent context into `WARP.md`. Global vs project-scope precedence behavior unverified. | functional | deployment-scripted: WARP.md = 206KB at project root; `.warp/skills/` = 15 files; `.warp/rules/` directory **does NOT exist** (consistent with platform-paths.ts comment "Not natively discovered — content delivered via WARP.md"). | Workstream A field-validation |
| 2 | `WARP.md.backup-*` files accumulate (one observed at repo root in this session). The backup-on-write isn't cleaned up; long-running globally-installed users may find dozens of these in `$HOME`. | cosmetic | manual: one observed at `/home/roctinam/dev/aiwg/WARP.md.backup-2026-05-09T21-07-52-936Z` during this study session | Add gitignore guidance + a `aiwg doctor` check for stale backups |
| 3 | **`skill-discovery` rule has no deployment channel on Warp.** Warp's only rule-delivery mechanism is WARP.md aggregation, and WARP.md (206KB) has 0 references to `aiwg discover` / `aiwg show` / `skill-discovery`. | functional | deployment-scripted: `grep -c "aiwg discover\|aiwg show\|skill-discovery" WARP.md` = 0 | See hookup-matrix.md Finding #1 — Warp likely needs the discover-protocol inlined into WARP.md, since file-based rules don't exist for this provider |

### Windsurf

| # | Description | Severity | Evidence | Proposed remediation |
|---|---|---|---|---|
| 1 | Windsurf uses `AGENTS.md` at project root for context aggregation. Global install equivalent unclear. | functional | deployment-scripted: AGENTS.md = 2.3MB at project root; `.windsurf/agents/` = 4; `.windsurf/rules/` = 60; `.windsurf/skills/` = 15. `.windsurfrules` is present but deprecated per its own content. | Workstream A field-validation |
| 2 | **`skill-discovery` rule NOT deployed to Windsurf.** Note: `.windsurf/rules/` does have a custom `aiwg-orchestration.md` rule but skill-discovery is absent. | functional | deployment-scripted: `.windsurf/rules/skill-discovery.md` missing among the 60 deployed rules. AGENTS.md (2.3MB) has 0 discover-protocol references. | See hookup-matrix.md Finding #1 |

### OpenClaw

| # | Description | Severity | Evidence | Proposed remediation |
|---|---|---|---|---|
| 1 | OpenClaw's primary discovery is `~/.openclaw/` — user-scope is its *natural* mode. Project-scope is rejected (per `src/cli/scope-resolver.ts:rejectOpenClawProjectScope`). For OpenClaw, global install is correct; the rough edge is in messaging that this asymmetry exists. | cosmetic | scripted: src/cli/scope-resolver.ts | Cli-reference should call out that OpenClaw global install is the canonical path, not the alternative |
| 2 | **OpenClaw skills directory has only 1 file** (`~/.openclaw/skills/`) — anomaly. Other providers' skill deployments show 15-20+ files. | functional | deployment-scripted (this audit cycle): `ls ~/.openclaw/skills/` shows 1 entry vs 15-20 expected; `~/.openclaw/agents/` = 114, `~/.openclaw/rules/` = 47, `~/.openclaw/behaviors/` = 6 are healthy by comparison | Investigate via `aiwg use sdlc --provider openclaw --dry-run` — file follow-up issue per hookup-matrix Finding #3 |
| 3 | **`skill-discovery` rule NOT deployed to OpenClaw.** | functional | deployment-scripted: `~/.openclaw/rules/skill-discovery.md` missing among the 47 deployed rules. | See hookup-matrix.md Finding #1 |

### Hermes

| # | Description | Severity | Evidence | Proposed remediation |
|---|---|---|---|---|
| 1 | Hermes uses MCP sidecar architecture with `~/.hermes/skills/` (kernel) + `~/.hermes/skills/.aiwg/` (standard). User-scope is its primary discovery model — similar to OpenClaw. The rough edge is that `aiwg use --scope user --provider hermes` versus the default need to be documented; users may expect project-scope and get confusion. | functional | deployment-scripted: `~/.hermes/skills/` has 7 kernel skills visible at top level (`aiwg-doctor`, `aiwg-help`, `aiwg-language-map`, `aiwg-orchestrate`, `aiwg-refresh`, `aiwg-status`, `aiwg-utils-quickref`). The expected `.aiwg/` subdirectory for standard skills shows 0 files; structure may differ from `docs/integrations/hermes-quickstart.md` spec. | Cli-reference Hermes section + investigation of `~/.hermes/skills/.aiwg/` deployment path |
| 2 | **`skill-discovery` rule has no filesystem deployment channel on Hermes.** Rule access is via MCP `rule-list`/`rule-show`. Whether the MCP server exposes the discover-first rule needs Hermes session confirmation. | functional | deployment-scripted: Hermes uses MCP sidecar; no `.hermes/rules/` or similar deployed by `aiwg use --provider hermes`. | See hookup-matrix.md Finding #1 — Hermes is the MCP outlier; the fix differs from filesystem providers |

## Severity Summary (post-cycle-2 update)

| Severity | Count |
|---|---|
| blocking | 1 (Copilot global install structurally undefined) |
| functional | 13 (includes 8 new entries for the cross-provider skill-discovery rule-deployment gap and OpenClaw / Hermes specifics) |
| cosmetic | 4 |
| **Total** | **18** (was 12; cycle 2 added 6 deployment-evidence entries) |

## Evidence-Type Summary (post-cycle-2)

| Type | Count | Note |
|---|---|---|
| scripted | 6 | Source paths / code references |
| deployment-scripted | 11 | NEW in cycle 2: on-disk artifact verification + path confirmation; stronger than static-flagged |
| manual | 1 | WARP.md backup observed |
| research | 1 | REF-720 cross-bleed citation |
| static-flagged | 0 | All previously static-flagged entries upgraded to deployment-scripted in this audit cycle |

**No entries remain at `static-flagged` after cycle 2.** Every concern is now backed by verifiable on-disk evidence. The next evidence-strength upgrade (deployment-scripted → manual/scripted) requires actual sessions on each non-Claude/non-Cursor provider, which the field-validation sprint covers.

## Notes for the Downstream Implementation Epic

1. Documentation is the highest-leverage fix in this inventory. Several "rough edges" are actually documentation gaps where the behavior is correct but unclear.
2. Workstream A's matrix completion is a precondition for half the entries — five of twelve are pending field validation.
3. The cross-bleed risk (REF-720) is structural, not fixable in code. The Workstream B warning is the in-product remediation; documentation is the out-of-product remediation. This inventory does not propose a third channel.

## References

- ADR-NUA-001: `../architecture/adr-global-install.md`
- UC-NUA-004: `../requirements/UC-NUA-004-installs-globally.md`
- SAD §2.2 Tension 3, §5.2.2 evidence taxonomy
- REF-720 (Lost in Multi-Turn Conversation)
- `feedback_no_platform_generalization` saved-memory rule
