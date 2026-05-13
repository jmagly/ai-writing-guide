# Risk Register: Hermes MCP Parity

**Status**: Draft
**Date**: 2026-05-13
**Sources**: @.aiwg/working/issue-planner/research-current-state.md §Risk Inventory

| ID | Risk | Likelihood | Impact | Severity | Mitigation |
|----|------|-----------|--------|----------|------------|
| R1 | **Skill-path migration leaves stale files at old path** — `~/.hermes/.aiwg/skills/` after move to `~/.hermes/skills/.aiwg/`. Old files remain disk-resident and become curator-bait. | High | Medium | High | Add idempotent migration helper to `aiwg refresh --provider hermes`: detect old path, verify new path populated, remove old path. Issue **S5**. |
| R2 | **`findProjectRoot()` failure** on greenfield Hermes sessions without `.aiwg/`. Currently throws; all artifact tools fail. | High | High | Critical | Split tools into project-required vs global-allowed (DD-6). Global-allowed fall back to `$AIWG_ROOT/.aiwg/index/`. Issue **S2**. |
| R3 | **Schema bloat on 8K-context Ollama** — adding 25+ tools could exceed per-turn budget. | Medium | High | High | Toolset opt-in via `AIWG_MCP_TOOLSETS` (DD-3). Default core ≤2.5K tokens. Document expected schema cost per toolset. Issue **S16**. |
| R4 | **Backward compatibility** — existing operators using the 5 current tools see behavior change. | Low | Medium | Medium | Keep 4 working tools unchanged; only `workflow-run` (a stub) gets deprecated. Add `_deprecated: true` flag + redirect to `command-run`. Issue **S3**. |
| R5 | **Hermes Curator archives AIWG skills** after 7-day cycle without "managed" flag. | Medium | Critical | High | Add metadata flag to all SKILL.md frontmatter at deploy time. Exact flag pending PR #20194 verification. Fallback: `aiwg refresh` is idempotent — re-runs restore archived skills. Issue **S6**. |
| R6 | **Cold-start scan cost** — `os.walk` of 385 SKILL.md files on Hermes session start. | Low | Low | Low | Hermes runs scan once per session, not per turn (verified). Within scaling limits. Monitor telemetry; no mitigation pre-emptively. |
| R7 | **Schema-bloat from non-Hermes providers** — `skill-list` MCP tool surfacing skills from ALL providers' deploy roots. | Low | Medium | Low | Enumerate only from canonical AIWG corpus (`agentic/code/frameworks/**/skills/`), not from per-provider deploys. Issue **S2**. |
| R8 | **`command-run` arbitrary execution** — single-dispatch tool routing to 94 commands. If unbounded, allows remote execution. | High | Critical | Critical | Strict allow-list against `definitions.ts`. Argv array, `shell: false`. Destructive commands require `confirmed: true` flag. Issue **S1**. |
| R9 | **Tool name collision** under Hermes mangling — `foo-bar` and `foo.bar` both → `foo_bar`. | Low | High | Medium | Lint check at server startup: enumerate tool names, detect collisions after applying `[^A-Za-z0-9_]` → `_`. Fail-fast on collision. Issue **S2**. |
| R10 | **Hermes upstream API drift** — Hermes is rapidly evolving (v0.4 → v0.13 in months). Our docs target v0.4. | Certain | Medium | High | Doc refresh issue (**S21**). Add upstream version-pin guidance in quickstart. Re-verify file:line refs on each Hermes minor bump. |
| R11 | **`delegate_task` API broken in shipped AGENTS.md** — `(skip_context_files=True, skip_memory=True)` are not real parameters. Every Hermes user hitting AIWG today runs broken code. | Certain | High | Critical | **Hotfix H1** ships independent of larger epic. `hermes.mjs:117` correction. |
| R12 | **`.hermes.md` claimed in CHANGELOG but not implemented** — credibility issue. | Certain | Low | Medium | Either implement (3-line code change) or remove claim from CHANGELOG/docs. Issue **S8**. |
| R13 | **Discover index global fallback semantics** — for Hermes sessions outside a project, which index does `discover` read? | Medium | Medium | Medium | Define: `$AIWG_ROOT/.aiwg/index/` is the global fallback. Document explicitly. Issue **S2**. |
| R14 | **Async operation tracking** — Ralph/MC are long-running; MCP is sync. Session-id pattern requires server-side state. | Medium | Medium | Medium | Use existing `.aiwg/ralph/` and `.aiwg/mc/` state directories. Tools return session-id immediately; status tools poll. Issue **S18**. |
| R15 | **Operator confusion on toolset enablement** — users don't know to set `AIWG_MCP_TOOLSETS`. | Medium | Medium | Medium | Document in quickstart; emit a startup hint when only core toolset is loaded; default profile sets sensible toolsets. Issue **S16, S21**. |

## Critical-severity risks requiring tracked mitigation

- **R2**: Project-root failure — must split tools by scope (S2)
- **R8**: Command-run security — must enforce allow-list (S1)
- **R11**: `delegate_task` broken — **hotfix H1 ships before larger epic**

## Risk-driven sequencing

- H1 ships first (R11 — actively shipping broken code)
- S1 and S2 are gating (R2, R8)
- S5 and S6 land with S4 to prevent migration debt (R1, R5)
