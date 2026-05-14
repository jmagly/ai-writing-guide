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
| 1 | Copilot's project-scope `.github/` directory is repo-scoped by design. Global install equivalent is unclear — there's no `~/.github/` convention. | blocking | static-flagged: no field validation for global Copilot install | Workstream A audit must confirm whether `--scope user --provider copilot` is meaningful at all; if not, surface that as an error rather than silently doing nothing |

### Cursor

| # | Description | Severity | Evidence | Proposed remediation |
|---|---|---|---|---|
| 1 | Cursor's user-scope MDC rule directory is `~/.cursor/rules/` (per Cursor docs as of 2026-05). Whether `aiwg use --scope user --provider cursor` writes there or to a different path is unverified in this inventory. | functional | static-flagged: needs field validation | Workstream A scripted-task for global Cursor install |

### Factory AI

| # | Description | Severity | Evidence | Proposed remediation |
|---|---|---|---|---|
| 1 | Factory's `.factory/` directory is project-scoped. Global-install path unclear. | functional | static-flagged: needs field validation | Workstream A audit |

### OpenCode

| # | Description | Severity | Evidence | Proposed remediation |
|---|---|---|---|---|
| 1 | OpenCode supports both `.opencode/agent/` and `.agents/skills/` patterns. User-scope behavior unverified. | functional | static-flagged | Workstream A audit |

### Warp Terminal

| # | Description | Severity | Evidence | Proposed remediation |
|---|---|---|---|---|
| 1 | Warp aggregates agent context into `WARP.md`. Global vs project-scope precedence behavior unverified. | functional | static-flagged | Workstream A audit |
| 2 | `WARP.md.backup-*` files accumulate (one observed at repo root in this session). The backup-on-write isn't cleaned up; long-running globally-installed users may find dozens of these in `$HOME`. | cosmetic | manual: one observed at `/home/roctinam/dev/aiwg/WARP.md.backup-2026-05-09T21-07-52-936Z` during this study session | Add gitignore guidance + a `aiwg doctor` check for stale backups |

### Windsurf

| # | Description | Severity | Evidence | Proposed remediation |
|---|---|---|---|---|
| 1 | Windsurf uses `AGENTS.md` at project root for context aggregation. Global install equivalent unclear. | functional | static-flagged | Workstream A audit |

### OpenClaw

| # | Description | Severity | Evidence | Proposed remediation |
|---|---|---|---|---|
| 1 | OpenClaw's primary discovery is `~/.openclaw/` — user-scope is its *natural* mode. Project-scope is rejected (per `src/cli/scope-resolver.ts:rejectOpenClawProjectScope`). For OpenClaw, global install is correct; the rough edge is in messaging that this asymmetry exists. | cosmetic | scripted: src/cli/scope-resolver.ts | Cli-reference should call out that OpenClaw global install is the canonical path, not the alternative |

### Hermes

| # | Description | Severity | Evidence | Proposed remediation |
|---|---|---|---|---|
| 1 | Hermes uses MCP sidecar architecture with `~/.hermes/skills/` (kernel) + `~/.hermes/skills/.aiwg/` (standard). User-scope is its primary discovery model — similar to OpenClaw. The rough edge is that `aiwg use --scope user --provider hermes` versus the default need to be documented; users may expect project-scope and get confusion. | functional | scripted: docs/integrations/hermes-quickstart.md | Cli-reference Hermes section needs an explicit "Hermes is user-scope by design" callout |

## Severity Summary

| Severity | Count |
|---|---|
| blocking | 1 (Copilot — needs A audit to confirm whether global install is meaningful at all) |
| functional | 7 |
| cosmetic | 4 |
| **Total** | **12** |

## Evidence-Type Summary

| Type | Count | Note |
|---|---|---|
| scripted | 6 | Source paths / code references this session can verify |
| manual | 1 | The WARP.md backup observed in this repo today |
| research | 1 | REF-720 cross-bleed citation |
| static-flagged | 5 | Candidates flagged; Workstream A field validation required |

Five of twelve entries are `static-flagged` only — those need Workstream A validation before remediation epics can be filed responsibly. Per the evidence-type taxonomy in SAD §5.2.2, static-flagged is never a conclusion on its own.

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
